// WorkspaceService testleri — playbook tohumlama, AI taslağı (LLM'li/LLM'siz),
// kullanıcı verisini koruma, eski kayıt taşıma ve rapor üretimi.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceService } from "./workspace-service";
import { InMemoryMethodologyWorkspaceRepository } from "@/infrastructure/persistence/in-memory-methodology-workspace-repository";
import type { IAIProvider } from "./ports/ai-provider";
import type { IKnowledgeRepository } from "./ports/knowledge-repository";
import type { IMethodologyWorkspaceRepository, MethodologyWorkspace } from "./ports/methodology-workspace-repository";
import type { RecordOwner } from "@/domain/access";
import { PLAYBOOKS } from "@/domain/playbook";

const knowledgeStub: IKnowledgeRepository = {
  async getByMethodology() {
    return {
      code: "EIGHT_D",
      name: "8D",
      whenToUse: "Müşteri etkilendi.",
      tools: ["D1-D8"],
      phases: ["D1", "D2"],
      body: "",
    };
  },
};

const noneAI: IAIProvider = {
  name: "none",
  available: false,
  async complete() {
    throw new Error("LLM yok");
  },
};

function fakeAI(response: string): IAIProvider {
  return { name: "fake", available: true, complete: async () => response };
}

function makeService(ai: IAIProvider) {
  const repo = new InMemoryMethodologyWorkspaceRepository();
  return { repo, service: new WorkspaceService(repo, knowledgeStub, ai) };
}

describe("WorkspaceService (playbook tabanlı)", () => {
  let service: WorkspaceService;
  let repo: InMemoryMethodologyWorkspaceRepository;

  beforeEach(() => {
    ({ repo, service } = makeService(noneAI));
  });

  it("create: adımları playbook'tan tohumlar (8D → D0–D8)", async () => {
    const ws = await service.create({
      methodology: "EIGHT_D",
      problemDescription: "Müşteriye çapaklı parça gitti.",
    });
    expect(ws.steps.map((s) => s.key)).toEqual(PLAYBOOKS.EIGHT_D.steps.map((s) => s.key));
    expect(ws.steps.every((s) => s.status === "PENDING")).toBe(true);
    expect(ws.report).toBeNull();
  });

  it("draftStep (LLM'siz): rehberi ilk metin alanına şablon olarak koyar", async () => {
    const ws = await service.create({ methodology: "RCA", problemDescription: "Çatlak var." });
    const updated = await service.draftStep(ws.id, "define");
    const step = updated.steps.find((s) => s.key === "define")!;
    expect(step.status).toBe("IN_PROGRESS");
    expect(step.values.statement).toContain("(Şablon)");
  });

  it("draftStep (LLM'li): şemaya uydurur, dolu alanı EZMEZ, kimlik alanını UYDURMAZ", async () => {
    const json = JSON.stringify({
      team: [
        { name: "Ali", role: "Kalite", dept: "QA", uydurma: "atılmalı" },
        { name: "Ayşe", role: "Üretim", dept: "Hat 2" },
      ],
      leader: "AI önerisi lider",
      bilinmeyenAlan: "atılmalı",
    });
    const { service: svc } = makeService(fakeAI("```json\n" + json + "\n```"));
    const ws = await svc.create({ methodology: "EIGHT_D", problemDescription: "Şikayet." });

    const updated = await svc.draftStep(ws.id, "d1");
    const d1 = updated.steps.find((s) => s.key === "d1")!;
    // Kimlik text alanı (leader): AI ismi YAZILMAZ, insana bırakılır.
    expect(d1.values.leader ?? "").toBe("");
    // Kimlik sütunu (name): boşaltılır; betimleyici sütunlar (role/dept) kalır.
    expect(d1.values.team).toEqual([
      { name: "", role: "Kalite", dept: "QA" },
      { name: "", role: "Üretim", dept: "Hat 2" },
    ]);
  });

  it("draftStep (LLM'li): JSON içindeki // yorumlarını temizler (SPC kart çökmesin)", async () => {
    // Model şemadaki `// etiket` açıklamalarını çıktıya kopyalayınca JSON bozuluyordu.
    const { service: svc } = makeService(
      fakeAI('{\n  "chartType": "X̄-R",  // Kart tipi ve gerekçe\n  "subgroup": "5"  // Alt grup\n}'),
    );
    const ws = await svc.create({ methodology: "SPC", problemDescription: "Mil çapı." });
    const updated = await svc.draftStep(ws.id, "chart");
    const step = updated.steps.find((s) => s.key === "chart")!;
    expect(step.values.chartType).toBe("X̄-R");
    expect(step.values.subgroup).toBe("5");
  });

  it("draftStep (LLM'li): Çince (CJK) içerik reddedilir, Türkçe alanlar kalır", async () => {
    const { service: svc } = makeService(
      fakeAI('{"statement": "95%以上的用户能正确使用", "scope": "Hat 3, gece vardiyası"}'),
    );
    const ws = await svc.create({ methodology: "RCA", problemDescription: "Sızıntı." });
    const updated = await svc.draftStep(ws.id, "define");
    const step = updated.steps.find((s) => s.key === "define")!;
    expect(step.values.statement ?? "").toBe(""); // CJK reddedildi → boş
    expect(step.values.scope).toBe("Hat 3, gece vardiyası"); // Türkçe korundu
  });

  it("draftStep (LLM'li): bozuk JSON'da ÇÖKMEZ, deterministik şablona düşer", async () => {
    // Yerel model ara sıra geçersiz JSON döndürür (tek tırnak, kesik çıktı).
    const { service: svc } = makeService(fakeAI("İşte taslak: {statement: 'tırnaksız', bozuk,}"));
    const ws = await svc.create({ methodology: "RCA", problemDescription: "Sızıntı." });
    const updated = await svc.draftStep(ws.id, "define"); // fırlatmamalı
    const step = updated.steps.find((s) => s.key === "define")!;
    expect(step.values.statement).toContain("(Şablon)");
    expect(step.status).toBe("IN_PROGRESS");
  });

  it("draftStep (LLM'li): kullanıcının doldurduğu alanı EZMEZ", async () => {
    const { service: svc } = makeService(fakeAI(JSON.stringify({ leader: "AI önerisi lider" })));
    const ws = await svc.create({ methodology: "EIGHT_D", problemDescription: "Şikayet." });

    // Kullanıcı lideri elle doldurmuş olsun (kimlik alanı olsa da kullanıcı girer):
    ws.steps.find((s) => s.key === "d1")!.values.leader = "Mehmet (kullanıcı girdi)";
    await svc.update(ws.id, { steps: ws.steps });

    const updated = await svc.draftStep(ws.id, "d1");
    const d1 = updated.steps.find((s) => s.key === "d1")!;
    expect(d1.values.leader).toBe("Mehmet (kullanıcı girdi)"); // korunur
  });

  it("generateReport (LLM'siz): doldurulan adımları profesyonel rapora döker", async () => {
    const ws = await service.create({ methodology: "RCA", problemDescription: "Sızıntı." });
    ws.steps[0].values.statement = "Contada sızıntı, hat 3.";
    ws.steps[0].status = "DONE";
    await service.update(ws.id, { steps: ws.steps });

    const updated = await service.generateReport(ws.id);
    expect(updated.report).toContain("Uygulama Raporu");
    expect(updated.report).toContain("Contada sızıntı, hat 3.");
    expect(updated.report).toContain("1/6 adım tamamlandı");
  });

  it("list: özetleri en son güncellenen önce döner", async () => {
    // Sıralama updatedAt'e dayanır; aynı ms'te oluşan kayıtlar berabere kalır.
    // Zamanı sahteleyerek testi gerçek kullanımdaki gibi (ayrık anlar) kurgula.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T08:00:00Z"));
    const a = await service.create({ methodology: "RCA", problemDescription: "Birinci." });

    vi.setSystemTime(new Date("2026-01-01T08:00:01Z"));
    const b = await service.create({ methodology: "EIGHT_D", problemDescription: "İkinci." });

    // b'yi güncelle → listede öne geçmeli.
    vi.setSystemTime(new Date("2026-01-01T08:00:02Z"));
    b.steps[0].status = "DONE";
    await service.update(b.id, {
      steps: b.steps,
      actions: [{ action: "Ayıklama", owner: "Ali", status: "OPEN" }],
    });
    vi.useRealTimers();

    const list = await service.list();
    expect(list.map((w) => w.id)).toEqual([b.id, a.id]);
    expect(list[0]).toMatchObject({
      methodology: "EIGHT_D",
      doneSteps: 1,
      totalSteps: PLAYBOOKS.EIGHT_D.steps.length,
      openActions: 1,
      hasReport: false,
    });
    expect(list[1]).toMatchObject({ methodology: "RCA", doneSteps: 0, openActions: 0 });
  });

  it("playbook evrildiğinde eksik adım state'i tohumlanır (reconcile)", async () => {
    const ws = await service.create({ methodology: "EIGHT_D", problemDescription: "Şikayet." });
    // Eski kayıt simülasyonu: D0 eklenmeden ÖNCE kaydedilmiş → d0'ı sök, d2'ye veri koy.
    const stripped = ws.steps.filter((s) => s.key !== "d0");
    stripped.find((s) => s.key === "d2")!.values.what = "Kaynak çatlağı";
    await repo.update(ws.id, { steps: stripped });

    const migrated = await service.get(ws.id);
    // Tüm playbook adımları, playbook sırasında mevcut (d0 dahil):
    expect(migrated!.steps.map((s) => s.key)).toEqual(PLAYBOOKS.EIGHT_D.steps.map((s) => s.key));
    // Eksik adım (d0) boş tohumlandı:
    expect(migrated!.steps.find((s) => s.key === "d0")!.status).toBe("PENDING");
    // Kullanıcı verisi korundu:
    expect(migrated!.steps.find((s) => s.key === "d2")!.values.what).toBe("Kaynak çatlağı");
  });

  it("eski kayıt (phases'li, steps'siz) playbook yapısına taşınır", async () => {
    const legacy = (await service.create({
      methodology: "RCA",
      problemDescription: "Eski kayıt.",
    })) as MethodologyWorkspace & { phases?: { name: string; notes: string }[] };
    // Eski şekli simüle et: steps'i söküp phases koy.
    await repo.update(legacy.id, {
      steps: undefined as unknown as MethodologyWorkspace["steps"],
    });
    const raw = (await repo.get(legacy.id))!;
    delete (raw as Partial<MethodologyWorkspace>).steps;
    raw.phases = [{ name: "Tanım", notes: "eski notlarım" }];
    await repo.update(raw.id, raw as MethodologyWorkspace);

    const migrated = await service.get(legacy.id);
    expect(migrated!.steps.length).toBe(PLAYBOOKS.RCA.steps.length);
    const firstTextValue = migrated!.steps[0].values.statement;
    expect(firstTextValue).toContain("eski notlarım");
  });

  it("recurrence yeni vaka açar ve eski CAPA'yı yeniden açar", async () => {
    const source = await service.create({ methodology:"RCA", problemDescription:"Tekrar eden çatlak" });
    await service.update(source.id,{closureStatus:"CLOSED",closedAt:"2026-01-01T00:00:00Z"});
    const target = await service.createLinked({sourceWorkspaceId:source.id,methodology:"RCA",reason:"Problem tekrar etti",relation:"RECURRENCE"});
    const reopened = await service.get(source.id);
    expect(reopened).toMatchObject({closureStatus:"REOPENED",reopenCount:1,closedAt:null});
    expect(target.specialty.recurrenceOf).toBe(source.id);
  });

  it("yatay yayılım riskinden alt vaka açınca hedefe geri bağlar", async () => {
    const source = await service.create({methodology:"FMEA",problemDescription:"Çapak riski"});
    source.horizontalTargets=[{id:"h1",name:"Hat 4",kind:"LINE",status:"RISK_FOUND",riskLevel:"HIGH",owner:"Kalite",dueDate:null,finding:"Aynı fikstür",evidenceIds:[],childWorkspaceId:null}];
    await service.update(source.id,{horizontalTargets:source.horizontalTargets});
    const child=await service.createLinked({sourceWorkspaceId:source.id,methodology:"FMEA",reason:"Hat 4 riski",relation:"HORIZONTAL_DEPLOYMENT",horizontalTargetId:"h1"});
    expect((await service.get(source.id))!.horizontalTargets[0].childWorkspaceId).toBe(child.id);
  });

  it("kritik islemleri denetim zaman cizelgesine kaydeder", async () => {
    const ws = await service.create({ methodology: "RCA", problemDescription: "Denetim izi." });
    expect(ws.auditTrail[0]).toMatchObject({ type: "CREATED" });

    await service.update(ws.id, { specialty: { shift: "Gece" } });
    const updated = await service.get(ws.id);
    expect(updated!.auditTrail.at(-1)).toMatchObject({
      type: "UPDATED",
      changedFields: ["specialty"],
    });
  });

  it("kurumsal ogrenim kaydini uygulama raporuna ekler", async () => {
    const ws = await service.create({ methodology: "RCA", problemDescription: "Tekrarlı kaçak." });
    await service.update(ws.id, { specialty: { learningRecord: {
      rootCause: "Conta yuvası toleransı yanlış.",
      effectiveCountermeasure: "Fikstür mastarı eklendi.",
      verification: "Kaçak oranı yüzde 2'den sıfıra indi.",
      standardization: "Kontrol planı revize edildi.",
      reuseScope: "Aynı ürün ailesi",
      tags: "kaçak, conta",
    } } });

    const reported = await service.generateReport(ws.id);
    expect(reported.report).toContain("Kurumsal Öğrenim Kaydı");
    expect(reported.report).toContain("Kontrol planı revize edildi.");
  });

  it("sürümlü sistem dokümanı, containment ve öğrenim kararını kalıcılaştırır", async () => {
    const ws = await service.create({ methodology: "EIGHT_D", problemDescription: "Müşteriye kaçan çapak." });
    const document = { id: "doc_1", type: "CONTROL_PLAN" as const, title: "CP-042 Final Kontrol", revision: "03", status: "APPROVED" as const, owner: "Kalite", approver: "Üretim Müdürü", effectiveDate: "2026-07-19", changeSummary: "Çapak kontrol frekansı artırıldı.", evidenceIds: [], relatedWorkspaceId: ws.id };
    const containment = { id: "cnt_1", purpose: "Müşteriye kaçışı önle", scope: "Hat ve sevk stoku", startedAt: "2026-07-19T08:00:00Z", owner: "Kalite", effectivenessMetric: "Kaçış adedi", currentResult: "0", costOrBurden: "2 kişi/vardiya", removalCriteria: "Kalıcı kontrol 3 vardiya başarılı", status: "TRANSFERRED" as const, removalApprovedBy: "Kalite Müdürü", removedAt: "2026-07-20T08:00:00Z", permanentActionId: null, evidenceIds: [] };
    await service.update(ws.id, { systemDocuments: [document], containmentControls: [containment], learningDecision: { summary: "Kontrol planı frekansı riskle bağlanmalı.", decision: "DOCUMENT_UPDATED", documentIds: [document.id], rationale: "PFMEA aksiyonu", owner: "Kalite", approvedBy: "Kalite Müdürü", decidedAt: "2026-07-20T09:00:00Z" } });

    const updated = await service.get(ws.id);
    expect(updated?.systemDocuments[0]).toMatchObject({ revision: "03", status: "APPROVED" });
    expect(updated?.containmentControls[0]).toMatchObject({ status: "TRANSFERRED" });
    expect(updated?.learningDecision.documentIds).toEqual([document.id]);
  });

  it("rapora gerçek sistem çıktıları ve containment yaşam döngüsünü ekler", async () => {
    const ws = await service.create({ methodology: "RCA", problemDescription: "Tekrarlı kaçak." });
    await service.update(ws.id, {
      systemDocuments: [{ id: "doc_1", type: "STANDARD_WORK", title: "Montaj standardı", revision: "02", status: "APPROVED", owner: "Üretim", approver: "Kalite", effectiveDate: "2026-07-19", changeSummary: "Tork sırası", evidenceIds: [], relatedWorkspaceId: ws.id }],
      containmentControls: [{ id: "cnt_1", purpose: "Yüzde 100 kontrol", scope: "Sevkiyat", startedAt: "2026-07-18T08:00:00Z", owner: "Kalite", effectivenessMetric: "Kaçış", currentResult: "0", costOrBurden: "8 saat", removalCriteria: "Kalıcı aksiyon", status: "REMOVED", removalApprovedBy: "Kalite", removedAt: "2026-07-19T08:00:00Z", permanentActionId: null, evidenceIds: [] }],
      learningDecision: { summary: "Tork sırası görselleştirilmeli.", decision: "DOCUMENT_UPDATED", documentIds: ["doc_1"], rationale: "Tekrarı önler", owner: "Üretim", approvedBy: "Kalite", decidedAt: "2026-07-19T09:00:00Z" },
    });
    const reported = await service.generateReport(ws.id);
    expect(reported.report).toContain("Sistem Dokümanları");
    expect(reported.report).toContain("Containment Yaşam Döngüsü");
    expect(reported.report).toContain("Lessons Learned Sistem Kararı");
  });

  it("Faz 2 proaktif operasyon kayıtlarını saklar ve panoda toplar", async () => {
    const ws = await service.create({ methodology: "PDCA_A3", problemDescription: "Mikro duruş artışı." });
    await service.update(ws.id, {
      weakSignals: [{ id:"sig_1",type:"MICRO_STOP",description:"Duruşlar artıyor",source:"Hat 2",detectedAt:"2026-07-19T08:00:00Z",status:"VERIFYING",hypothesis:"Sensör kirlenmesi",verificationTask:"Gemba gözlemi",owner:"Bakım",dueDate:null,evidenceIds:[],linkedWorkspaceId:null }],
      dailyManagement: [],
      kaizenExperiments: [{ id:"k_1",idea:"Sensör hava üfleme",owner:"Bakım",risk:"LOW",status:"EXPERIMENT",hypothesis:"Kirlenmeyi azaltır",measure:"Duruş/gün",baseline:"12",result:"",standardDocumentId:null,yokotenScope:"",escalationMethod:null }],
      oplLessons: [{ id:"o_1",type:"BASIC",title:"Sensör temizliği",objective:"Doğru temizle",correctVisual:"",wrongVisual:"",limit:"Her vardiya",mediaUrl:"",station:"Hat 2",revision:"00",reviewDate:null,linkedDocumentIds:[],quizQuestion:"Sıklık?",quizAnswer:"Vardiya",trainee:"",competency:"PENDING" }],
      controlBurden: [{ id:"c_1",controlPoint:"Final göz kontrol",type:"SORTING",frequency:"%100",cost:"2 kişi",escapeRisk:"Orta",falseAcceptReject:"Bilinmiyor",temporary:true,sourcePreventionQuestion:"Sensörde önlenebilir mi?",preventionAlternative:"Sensör",removalCriteria:"3 vardiya sıfır kaçış",status:"ACTIVE" }],
    });
    const dashboard = await service.dashboard();
    expect(dashboard).toMatchObject({ weakSignalsOpen:1, kaizenActive:1, oplCompetencyDue:1, temporaryControls:1 });
  });

  it("Faz 3 bağlam, QMS ve Gemba verilerini saklar ve yönetim panosunda özetler", async () => {
    const ws=await service.create({methodology:"RCA",problemDescription:"Tekrarlı kalite kaçağı."});
    await service.update(ws.id,{
      contextContract:{purpose:"Tekrarı önle",scope:"Hat 1",outOfScope:"Tasarım",successMetric:"0 kaçış",methodRole:"Kök neden",pivotCondition:"Neden doğrulanmazsa KT",misuseRisk:"Kişi suçlama",undesiredBehavior:"Ek kontrol",owner:"Kalite",approvedBy:"Üretim"},
      systemBehaviorAnalyses:[{id:"s1",observedBehavior:"Kontrol atlanıyor",systemCondition:"Çevrim hedefi",managementAssumption:"Hız kalite getirir",localKpi:"Adet",incentiveConflict:"Kalite-hız",delayedEffect:"Müşteri kaçağı",feedbackLoop:"Baskı-kaçış",interventionHypothesis:"Dengeli KPI",evidenceIds:[]}],
      qmsHealth:[{dimension:"QUALITY_CAPACITY",score:1,observation:"Tek kişi",evidenceIds:[],owner:"Müdür",action:"Kaynak planı"}],
      gembaBehaviorMap:[{id:"g1",processStep:"Kontrol",expectedStandard:"Mastar",actualBehavior:"Gözle",humanDecisionPoint:"Kabul",repeatedQuestion:"Limit ne?",searchOrMotion:"Mastar arama",errorOpportunity:"Yanlış kabul",compensationBehavior:"Tekrar ölçüm",physicalConstraint:"Mastar uzakta",pokaYokeIdea:"Sabit mastar",evidenceIds:[]}],
    });
    const dashboard=await service.dashboard();
    expect(dashboard).toMatchObject({contextContractsReady:1,qmsCritical:1,gembaOpportunities:1});
  });

  it("Faz 4 karar senaryolarını saklar ve riskli sonuçları panoya taşır",async()=>{
    const ws=await service.create({methodology:"TOC",problemDescription:"Büyüme kapasitesi kararı."});
    await service.update(ws.id,{
      benchmarkReferences:[],
      capacityScenarios:[{id:"cap1",name:"Baz",demand:1200,availableMinutes:480,bottleneckCycleSeconds:30,yieldRate:90,mixFactor:1,channelMargin:2,shelfLifeDays:null,inventory:0,investment:0}],
      sopScenarios:[{id:"sop1",name:"Level",strategy:"LEVEL",demandLow:900,demandExpected:1000,demandHigh:1100,regularCapacity:800,overtimeCapacity:0,subcontractCapacity:0,openingInventory:0,serviceTarget:95,unitRegularCost:1,unitOvertimeCost:2,unitSubcontractCost:3,unitInventoryCost:1,unitBacklogCost:5}],
      lineBalanceStudies:[{demand:100,availableSeconds:1000,mode:"LINE",operations:[{id:"op1",name:"Montaj",seconds:12,station:1,skill:"Montaj",ergonomicRisk:"LOW",monotonyRisk:"MEDIUM",qualityOwnership:"Operatör"}]}],
    });
    const dashboard=await service.dashboard();
    expect(dashboard).toMatchObject({infeasibleCapacityScenarios:1,sopTargetMisses:1,overloadedLineStudies:1});
  });

  it("Faz 5 destek analizlerini kalıcılaştırır ve eksik incelemeyi panoya taşır",async()=>{
    const ws=await service.create({methodology:"DMAIC",problemDescription:"Ölçüm ve deney kararı."});
    await service.update(ws.id,{advancedAnalyses:[{id:"msa1",tool:"MSA",title:"Çap ölçüm MSA",status:"IN_PROGRESS",decisionPoint:"Veriye güvenebilir miyiz?",hypothesis:"Ölçüm payı düşük",fields:{tolerance:"1",acceptance:"10"},rows:[{part:"1",appraiser:"A",trial:"1",value:"10"},{part:"1",appraiser:"A",trial:"2",value:"11"}],conclusion:"Tekrar edilebilirlik geliştirilmeli",evidenceIds:[]}]});
    const dashboard=await service.dashboard();expect(dashboard.advancedReviewsDue).toBe(1);
    expect((await service.get(ws.id))?.advancedAnalyses[0].tool).toBe("MSA");
  });

  it("admin silme akışı çalışma kaydını kalıcı olarak kaldırır", async () => {
    const ws = await service.create({ methodology: "FMEA", problemDescription: "Silinecek deneme" });
    expect(await service.delete(ws.id)).toBe(true);
    expect(await service.get(ws.id)).toBeNull();
    expect(await service.delete(ws.id)).toBe(false);
  });
});

// Sahiplik, kayıt oluşturmanın AYNI yazımında verilmelidir. Önceki tasarımda
// route katmanı kaydı oluşturup sahibini ikinci bir yazımla ekliyordu; araya
// giren bir hata, hiçbir hesaba bağlı olmayan (ve kimseye görünmeyen) çalışma
// bırakıyordu. Bu testler o desenin geri gelmesini engeller.
describe("sahiplik oluşturma anında verilir", () => {
  /** repo.create'e geçen `owner` argümanını yakalayan casus repo. */
  function spyRepo() {
    const inner = new InMemoryMethodologyWorkspaceRepository();
    const owners: (RecordOwner | undefined)[] = [];
    const repo: IMethodologyWorkspaceRepository = {
      create: (seed, owner) => {
        owners.push(owner);
        return inner.create(seed, owner);
      },
      get: (id) => inner.get(id),
      update: (id, patch) => inner.update(id, patch),
      list: () => inner.list(),
      delete: (id) => inner.delete(id),
    };
    return { repo, owners };
  }

  const sahip: RecordOwner = { ownerUserId: "user_ali", organizationId: "org_acme" };

  it("create: sahibi repository'ye ilk yazımda iletir", async () => {
    const { repo, owners } = spyRepo();
    const service = new WorkspaceService(repo, knowledgeStub, noneAI);
    await service.create({ methodology: "RCA", problemDescription: "Çapak", owner: sahip });
    expect(owners).toEqual([sahip]);
  });

  it("createLinked: türetilen çalışma da sahibi baştan alır", async () => {
    const { repo, owners } = spyRepo();
    const service = new WorkspaceService(repo, knowledgeStub, noneAI);
    const source = await service.create({ methodology: "RCA", problemDescription: "Kaynak", owner: sahip });
    await service.createLinked({
      sourceWorkspaceId: source.id,
      methodology: "EIGHT_D",
      reason: "Müşteri etkilendi",
      owner: sahip,
    });
    // Hem kaynak hem hedef sahiplikle oluşturulmuş olmalı.
    expect(owners).toEqual([sahip, sahip]);
  });

  it("hesap sistemi kapalıyken sahiplik verilmez (out-of-box kurulum)", async () => {
    const { repo, owners } = spyRepo();
    const service = new WorkspaceService(repo, knowledgeStub, noneAI);
    await service.create({ methodology: "FMEA", problemDescription: "Sahipsiz" });
    expect(owners).toEqual([undefined]);
  });
});
