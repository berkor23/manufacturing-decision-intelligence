// Workspace Service — bir metodoloji için PROFESYONEL uygulama alanı.
//
// Yapı: adım şablonları domain'deki playbook'tan gelir (statik, saf);
// bu servis (a) alanı playbook'tan tohumlar, (b) AI ile adım taslağı üretir
// (LLM yoksa deterministik rehber düşer), (c) doldurulan adımlardan
// profesyonel kapanış raporu üretir. Karar mantığı burada YOKTUR.

import { Methodology, METHODOLOGY_META } from "@/domain/diagnosis";
import {
  FieldValue,
  Playbook,
  PlaybookField,
  PlaybookStep,
  TableRow,
  emptyStepState,
  fieldFilled,
  getPlaybook,
  isTabular,
  stepIsComplete,
} from "@/domain/playbook";
import type { RecordOwner } from "@/domain/access";
import { IAIProvider } from "./ports/ai-provider";
import { IKnowledgeRepository } from "./ports/knowledge-repository";
import {
  IMethodologyWorkspaceRepository,
  MethodologyWorkspace,
  WorkspacePatch,
  WorkspaceSummary,
} from "./ports/methodology-workspace-repository";
import { canClose, closureChecks, dnaSimilarity, problemDNA } from "@/domain/workspace-intelligence";
import { transferWorkspace } from "./workspace-transfer";
import { contextCompleteness, gembaOpportunityCount, qmsHealthScore } from "@/domain/organization-context";
import { calculateCapacity, calculateLineBalance, calculateSop } from "@/domain/decision-labs";
import { evaluateAdvancedAnalysis } from "@/domain/advanced-analysis";
import { taskTemporalStatus, type UnifiedTask } from "@/domain/production-readiness";
import { EMPTY_FIELD_PILOT, EMPTY_SELECTION_CONTEXT, fieldQualityFindings } from "@/domain/field-readiness";
import { generateWorkspaceReport, type WorkspaceReportKind } from "@/domain/workspace-report";

/**
 * Portföy görünümlerinin (liste, pano, görev merkezi) kiracı kapsamı.
 * `undefined` = kapsam sınırlaması yok (auth kapalı tek-kiracılı kurulum ve
 * /api/health gibi toplam sayaçlar). Verilirse yalnız bu kimlikler görünür.
 */
export type WorkspaceScope = ReadonlySet<string>;

function inScope<T extends { id: string }>(rows: T[], scope?: WorkspaceScope): T[] {
  return scope ? rows.filter((row) => scope.has(row.id)) : rows;
}

export class WorkspaceService {
  constructor(
    private readonly repo: IMethodologyWorkspaceRepository,
    private readonly knowledge: IKnowledgeRepository,
    private readonly ai: IAIProvider,
  ) {}

  /**
   * `owner` verilirse çalışma, sahibiyle birlikte tek yazımda oluşturulur.
   * Route katmanının kaydı oluşturup ardından sahipliği ayrıca yazması
   * (araya giren hatada sahipsiz kayıt) bu yüzden kaldırıldı.
   */
  async create(input: {
    conversationId?: string | null;
    methodology: Methodology;
    problemDescription: string;
    recommendedMethodology?: Methodology;
    diagnosisRationale?: string;
    owner?: RecordOwner;
  }): Promise<MethodologyWorkspace> {
    const meta = METHODOLOGY_META[input.methodology];
    const knowledge = await this.knowledge.getByMethodology(input.methodology);
    const playbook = getPlaybook(input.methodology);

    return this.repo.create({
      conversationId: input.conversationId ?? null,
      methodology: input.methodology,
      methodologyName: meta.name,
      problemDescription: input.problemDescription,
      whenToUse: knowledge?.whenToUse ?? "",
      tools: knowledge?.tools ?? [],
      steps: playbook.steps.map(emptyStepState),
      actions: [],
      report: null,
      evidence: [],
      claims: [],
      metrics: [],
      links: [],
      approvals: [
        { role: "QUALITY", name: "", status: "PENDING", comment: "" },
        { role: "PROCESS_OWNER", name: "", status: "PENDING", comment: "" },
      ],
      monitoring: null,
      closureStatus: "OPEN",
      closedAt: null,
      reopenCount: 0,
      dna: problemDNA(input.problemDescription),
      specialty: {},
      redTeamReviews: [],
      horizontalTargets: [],
      attachments: [],
      systemDocuments: [],
      containmentControls: [],
      learningDecision: { summary: "", decision: "PENDING", documentIds: [], rationale: "", owner: "", approvedBy: "", decidedAt: null },
      weakSignals: [], dailyManagement: [], kaizenExperiments: [], oplLessons: [], controlBurden: [],
      contextContract: { purpose:"",scope:"",outOfScope:"",successMetric:"",methodRole:"",pivotCondition:"",misuseRisk:"",undesiredBehavior:"",owner:"",approvedBy:"" },
      systemBehaviorAnalyses: [], qmsHealth: [], gembaBehaviorMap: [],
      benchmarkReferences: [], capacityScenarios: [], sopScenarios: [], lineBalanceStudies: [],
      advancedAnalyses: [],
      recommendationFeedback: {decision:"PENDING",recommendedMethodology:input.recommendedMethodology ?? input.methodology,selectedMethodology:input.methodology,reason:input.diagnosisRationale?.trim() ?? "",reviewedAt:null,outcome:"PENDING",outcomeNote:"",outcomeAt:null},
      methodSelectionContext: { ...EMPTY_SELECTION_CONTEXT }, fieldPilot: { ...EMPTY_FIELD_PILOT }, externalSystemLinks: [],
      auditTrail: [{ id: `audit_${Date.now().toString(36)}`, type: "CREATED", summary: "Çalışma alanı oluşturuldu", changedFields: [], occurredAt: new Date().toISOString() }],
    }, input.owner);
  }

  /** Getir + eski (playbook öncesi) kayıtları yeni yapıya taşı. */
  async get(id: string): Promise<MethodologyWorkspace | null> {
    const ws = await this.repo.get(id);
    if (!ws) return null;
    return this.migrateLegacy(ws);
  }

  async update(id: string, patch: WorkspacePatch) {
    return this.persist(id, patch, "UPDATED", "Çalışma alanı güncellendi");
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async addAttachment(id: string, attachment: MethodologyWorkspace["attachments"][number]) {
    const ws = await this.get(id); if (!ws) throw new Error("Çalışma alanı bulunamadı.");
    const updated = await this.persist(id,{attachments:[...ws.attachments,attachment]}, "ATTACHMENT", "Dosya kanıtı eklendi");
    if (!updated) throw new Error("Dosya metadata kaydedilemedi."); return updated;
  }

  async getAttachment(id:string, attachmentId:string) {
    const ws=await this.get(id); if(!ws)return null;
    return ws.attachments.find(a=>a.id===attachmentId)??null;
  }

  /** Açık çalışmalar listesi (en son güncellenen önce). */
  async list(scope?: WorkspaceScope): Promise<WorkspaceSummary[]> {
    const all = inScope(await this.repo.list(), scope);
    return all.map((raw) => {
      const ws = this.migrateLegacy(raw);
      return {
        id: ws.id,
        methodology: ws.methodology,
        methodologyName: ws.methodologyName,
        problemDescription: ws.problemDescription,
        doneSteps: ws.steps.filter((s) => stepIsComplete(s.status)).length,
        totalSteps: ws.steps.length,
        openActions: ws.actions.filter((a) => a.status !== "DONE").length,
        hasReport: Boolean(ws.report),
        closureStatus: ws.closureStatus,
        effectivenessDue: ws.actions.filter((a) => a.status === "IMPLEMENTED" || a.status === "EFFECTIVENESS_DUE").length,
        unverifiedClaims: ws.claims.filter((c) => c.kind !== "HYPOTHESIS" && c.status !== "VERIFIED").length,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      };
    });
  }

  async intelligence(id: string) {
    const ws = await this.get(id);
    if (!ws) throw new Error(`Çalışma alanı bulunamadı: ${id}`);
    const all = (await this.repo.list()).map((x) => this.migrateLegacy(x));
    const similar = all
      .filter((x) => x.id !== id)
      .map((x) => ({ id: x.id, methodology: x.methodology, problemDescription: x.problemDescription, score: dnaSimilarity(ws.dna, x.dna) }))
      .filter((x) => x.score >= 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const findings = await this.redTeam(id);
    const openCritical = findings.filter((f) => f.severity === "HIGH" && (!f.review || ["OPEN","ACCEPTED"].includes(f.review.status) || (f.review.status === "REJECTED_WITH_EVIDENCE" && f.review.evidenceIds.length === 0)));
    const checks = [...closureChecks(ws), { key:"critical-red-team", label:"Kritik kırmızı takım itirazı açık değil", passed:openCritical.length===0, detail:`${openCritical.length} açık kritik itiraz` }];
    return { checks, canClose: canClose(ws) && openCritical.length === 0, similar };
  }

  async createLinked(input: { sourceWorkspaceId: string; methodology: Methodology; reason: string; relation?: "COMPLEMENTARY" | "FOLLOW_UP" | "RECURRENCE" | "HORIZONTAL_DEPLOYMENT"; targetDescription?: string; horizontalTargetId?: string; owner?: RecordOwner }) {
    const source = await this.get(input.sourceWorkspaceId);
    if (!source) throw new Error("Kaynak çalışma bulunamadı.");
    const relation = input.relation ?? "COMPLEMENTARY";
    // Bağlı çalışma kaynağın verisini taşır; sahipliği de baştan almalıdır,
    // yoksa kaynağa erişebilen kullanıcı türettiği çalışmayı göremez.
    const target = await this.create({ conversationId: source.conversationId, methodology: input.methodology, problemDescription: input.targetDescription ?? source.problemDescription, owner: input.owner });
    const transferred = transferWorkspace(source, target);
    const hydrated = await this.persist(target.id, {
      steps: transferred.steps, evidence: transferred.evidence, claims: transferred.claims,
      actions: transferred.actions, metrics: transferred.metrics, attachments: transferred.attachments, specialty: { ...transferred.specialty, relation, recurrenceOf: relation === "RECURRENCE" ? source.id : undefined },
    }, "LINKED", "Kaynak çalışmadan veriler aktarıldı");
    if (!hydrated) throw new Error("Hedef çalışma aktarılamadı.");
    const link = { id: `link_${Date.now().toString(36)}`, targetWorkspaceId: target.id, methodology: input.methodology, relation, reason: input.reason } as const;
    const horizontalTargets = input.horizontalTargetId ? source.horizontalTargets.map((t)=>t.id===input.horizontalTargetId?{...t,childWorkspaceId:target.id}:t) : source.horizontalTargets;
    await this.persist(source.id, {
      links: [...source.links, link], horizontalTargets,
      ...(relation === "RECURRENCE" ? { closureStatus:"REOPENED" as const, closedAt:null, reopenCount:source.reopenCount+1 } : {}),
    }, "LINKED", "Bağlı çalışma oluşturuldu");
    return hydrated;
  }

  async transferPreview(sourceWorkspaceId: string, methodology: Methodology) {
    const source = await this.get(sourceWorkspaceId);
    if (!source) throw new Error("Kaynak çalışma bulunamadı.");
    const meta = METHODOLOGY_META[methodology]; const knowledge = await this.knowledge.getByMethodology(methodology); const playbook = getPlaybook(methodology);
    const now = new Date().toISOString();
    const target = { ...source, id: "preview", methodology, methodologyName: meta.name, whenToUse: knowledge?.whenToUse ?? "", tools: knowledge?.tools ?? [], steps: playbook.steps.map(emptyStepState), actions: [], evidence: [], claims: [], metrics: [], links: [], specialty: {}, report: null, createdAt: now, updatedAt: now };
    return transferWorkspace(source, target).summary;
  }

  async redTeam(id: string) {
    const ws = await this.get(id);
    if (!ws) throw new Error("Çalışma bulunamadı.");
    const findings: { id:string; severity: "HIGH" | "MEDIUM"; title: string; detail: string }[] = [];
    if (ws.claims.some((c) => c.kind === "ROOT_CAUSE" && /operatör|insan hatası/i.test(c.statement))) findings.push({ id:"human-error-root", severity: "HIGH", title: "İnsan hatası son neden olarak bırakılmış", detail: "Sistemin neden hataya izin verdiğini derinleştirin." });
    if (ws.claims.some((c) => c.status === "VERIFIED" && (!c.evidenceIds.length || !c.counterfactual?.trim()))) findings.push({ id:"verification-chain", severity: "HIGH", title: "Doğrulama zinciri eksik", detail: "Kanıt ve karşı-olgusal test birlikte bulunmalı." });
    if (ws.actions.some((a) => (a.status === "EFFECTIVE" || a.status === "DONE") && (!a.successMetric || !a.actual))) findings.push({ id:"action-without-metric", severity: "HIGH", title: "Etkili denilen aksiyonda ölçüm yok", detail: "Başarı metriği ve gerçekleşen değer girilmeli." });
    if (!ws.links.some((l) => l.relation === "HORIZONTAL_DEPLOYMENT")) findings.push({ id:"horizontal-deployment", severity: "MEDIUM", title: "Yatay yayılım değerlendirilmedi", detail: "Benzer proses ve ekipmanları bağlı çalışma olarak kontrol edin." });
    return findings.map(f=>({...f,review:ws.redTeamReviews.find(r=>r.findingId===f.id)??null}));
  }

  async close(id: string): Promise<MethodologyWorkspace> {
    const ws = await this.get(id);
    if (!ws) throw new Error(`Çalışma alanı bulunamadı: ${id}`);
    const critical = (await this.redTeam(id)).filter((f) => f.severity === "HIGH" && (!f.review || ["OPEN","ACCEPTED"].includes(f.review.status) || (f.review.status === "REJECTED_WITH_EVIDENCE" && f.review.evidenceIds.length === 0)));
    if (!canClose(ws) || critical.length) throw new Error("Kapanış kapıları ve kritik itirazlar tamamlanmadan çalışma kapatılamaz.");
    const updated = await this.persist(id, { closureStatus: "MONITORING", closedAt: new Date().toISOString() }, "LIFECYCLE", "Çalışma izleme aşamasına alındı");
    if (!updated) throw new Error(`Çalışma alanı bulunamadı: ${id}`);
    return updated;
  }

  async monitor(id: string, result: "PASSED" | "FAILED"): Promise<MethodologyWorkspace> {
    const ws = await this.get(id);
    if (!ws || !ws.monitoring) throw new Error("İzleme planı bulunamadı.");
    const failed = result === "FAILED";
    const updated = await this.persist(id, {
      monitoring: { ...ws.monitoring, result },
      closureStatus: failed ? "REOPENED" : "CLOSED",
      reopenCount: ws.reopenCount + (failed ? 1 : 0),
      closedAt: failed ? null : new Date().toISOString(),
    }, "LIFECYCLE", failed ? "İzleme başarısız; çalışma yeniden açıldı" : "İzleme başarılı; çalışma kapatıldı");
    if (!updated) throw new Error(`Çalışma alanı bulunamadı: ${id}`);
    return updated;
  }

  async dashboard(scope?: WorkspaceScope) {
    const all = inScope(await this.repo.list(), scope).map((x) => this.migrateLegacy(x));
    return {
      total: all.length,
      open: all.filter((x) => x.closureStatus !== "CLOSED").length,
      reopened: all.filter((x) => x.closureStatus === "REOPENED").length,
      effectivenessDue: all.flatMap((x) => x.actions).filter((a) => a.status === "IMPLEMENTED" || a.status === "EFFECTIVENESS_DUE").length,
      unverifiedClaims: all.flatMap((x) => x.claims).filter((c) => c.kind !== "HYPOTHESIS" && c.status !== "VERIFIED").length,
      evidenceCount: all.flatMap((x) => x.evidence).length,
      weakSignalsOpen: all.flatMap((x) => x.weakSignals).filter((x) => !["DISMISSED","CASE_OPENED"].includes(x.status)).length,
      kaizenActive: all.flatMap((x) => x.kaizenExperiments).filter((x) => !["STANDARDIZED","YOKOTEN","ESCALATED"].includes(x.status)).length,
      oplCompetencyDue: all.flatMap((x) => x.oplLessons).filter((x) => x.competency === "PENDING").length,
      temporaryControls: all.flatMap((x) => x.controlBurden).filter((x) => x.temporary && x.status !== "REMOVED").length,
      contextContractsReady: all.filter((x) => contextCompleteness(x.contextContract).ready).length,
      qmsCritical: all.filter((x) => qmsHealthScore(x.qmsHealth).level === "CRITICAL").length,
      gembaOpportunities: all.reduce((sum,x)=>sum+gembaOpportunityCount(x.gembaBehaviorMap),0),
      infeasibleCapacityScenarios: all.flatMap(x=>x.capacityScenarios).filter(x=>!calculateCapacity(x).feasible).length,
      sopTargetMisses: all.flatMap(x=>x.sopScenarios).filter(x=>!calculateSop(x).meetsTarget).length,
      overloadedLineStudies: all.flatMap(x=>x.lineBalanceStudies).filter(x=>calculateLineBalance(x).overloaded.length>0).length,
      advancedReviewsDue: all.flatMap(x=>x.advancedAnalyses).filter(x=>x.status!=="COMPLETED"||!evaluateAdvancedAnalysis(x).ready).length,
      feedbackReviewed: all.filter(x=>x.recommendationFeedback.decision!=="PENDING").length,
      feedbackAccepted: all.filter(x=>x.recommendationFeedback.decision==="ACCEPTED").length,
      feedbackOverridden: all.filter(x=>x.recommendationFeedback.decision==="OVERRIDDEN").length,
      outcomeSuccess: all.filter(x=>x.recommendationFeedback.outcome==="SUCCESS").length,
      outcomePartial: all.filter(x=>x.recommendationFeedback.outcome==="PARTIAL").length,
      outcomeFailed: all.filter(x=>x.recommendationFeedback.outcome==="FAILED").length,
      pilotsRunning: all.filter(x=>x.fieldPilot.status==="RUNNING").length,
      pilotsCompleted: all.filter(x=>x.fieldPilot.status==="COMPLETED").length,
      fieldValidated: all.filter(x=>x.fieldPilot.status==="COMPLETED"&&x.fieldPilot.result!=="PENDING").length,
      integrationLinks: all.flatMap(x=>x.externalSystemLinks).length,
      integrationErrors: all.flatMap(x=>x.externalSystemLinks).filter(x=>x.syncStatus==="ERROR").length,
      blockingQualityFindings: all.reduce((sum,x)=>sum+fieldQualityFindings(x).filter(f=>f.severity==="BLOCKING").length,0),
      workspaces: all,
    };
  }

  async taskCenter(scope?: WorkspaceScope):Promise<UnifiedTask[]> {
    const all=inScope(await this.repo.list(),scope).map(x=>this.migrateLegacy(x));const tasks:UnifiedTask[]=[];
    for(const ws of all){const href=`/workspace/${ws.id}`;
      ws.actions.forEach((x,i)=>tasks.push({id:x.id??`action_${i}`,workspaceId:ws.id,workspaceTitle:ws.problemDescription,kind:"ACTION",title:x.action,owner:x.owner??"",dueDate:x.dueDate??null,status:taskTemporalStatus(["DONE","EFFECTIVE"].includes(x.status),x.dueDate??null),href:`${href}?tab=actions`}));
      ws.containmentControls.forEach(x=>tasks.push({id:x.id,workspaceId:ws.id,workspaceTitle:ws.problemDescription,kind:"CONTAINMENT",title:x.purpose||"Containment",owner:x.owner,dueDate:null,status:taskTemporalStatus(["REMOVED","TRANSFERRED"].includes(x.status),null),href:`${href}?tab=validation`}));
      ws.weakSignals.forEach(x=>tasks.push({id:x.id,workspaceId:ws.id,workspaceTitle:ws.problemDescription,kind:"WEAK_SIGNAL",title:x.description||"Zayıf sinyal",owner:x.owner,dueDate:x.dueDate,status:taskTemporalStatus(["DISMISSED","CASE_OPENED"].includes(x.status),x.dueDate),href:`${href}?tab=operations`}));
      ws.qmsHealth.filter(x=>x.action.trim()).forEach((x,i)=>tasks.push({id:`qms_${i}_${ws.id}`,workspaceId:ws.id,workspaceTitle:ws.problemDescription,kind:"QMS",title:x.action,owner:x.owner,dueDate:null,status:taskTemporalStatus(false,null),href:`${href}?tab=organization`}));
      ws.oplLessons.forEach(x=>tasks.push({id:x.id,workspaceId:ws.id,workspaceTitle:ws.problemDescription,kind:"OPL",title:x.title||"OPL yetkinliği",owner:x.trainee,dueDate:x.reviewDate,status:taskTemporalStatus(x.competency==="PASSED",x.reviewDate),href:`${href}?tab=operations`}));
      if(ws.monitoring)tasks.push({id:`monitor_${ws.id}`,workspaceId:ws.id,workspaceTitle:ws.problemDescription,kind:"MONITORING",title:`İzleme: ${ws.monitoring.metric}`,owner:ws.monitoring.owner,dueDate:ws.monitoring.reviewDate,status:taskTemporalStatus(ws.monitoring.result!=="PENDING",ws.monitoring.reviewDate),href:`${href}?tab=validation`});
    }return tasks.sort((a,b)=>({OVERDUE:0,DUE_SOON:1,OPEN:2,DONE:3}[a.status]-{OVERDUE:0,DUE_SOON:1,OPEN:2,DONE:3}[b.status]));
  }

  /**
   * Bir playbook adımı için AI taslağı üretir ve adımın alanlarına yazar.
   * LLM varsa: problem + önceki adımlar + adım rehberine dayalı JSON taslak.
   * LLM yoksa: adım rehberi ilk metin alanına şablon olarak düşer.
   */
  async draftStep(id: string, stepKey: string): Promise<MethodologyWorkspace> {
    const ws = await this.get(id);
    if (!ws) throw new Error(`Çalışma alanı bulunamadı: ${id}`);
    const playbook = getPlaybook(ws.methodology);
    const step = playbook.steps.find((s) => s.key === stepKey);
    const state = ws.steps.find((s) => s.key === stepKey);
    if (!step || !state) throw new Error(`Adım bulunamadı: ${stepKey}`);

    let drafted: Record<string, FieldValue>;
    // Taslağı gerçekte hangi yolun ürettiğini izle: denetim izi ve arayüz
    // "AI yazdı" ile "şablon yerleştirildi"yi ayırt edebilmeli.
    let usedAi = false;
    if (this.ai.available) {
      try {
        drafted = await this.llmDraft(ws, playbook, step);
        usedAi = true;
      } catch {
        // Yerel model ara sıra bozuk JSON döndürür (tek/çift tırnak, kesik çıktı).
        // Tek bir taslak isteği bu yüzden 500 ile ÇÖKMEMELİ — generateReport ile
        // aynı dayanıklılık: deterministik şablona düş, kullanıcı emeği korunur.
        drafted = this.deterministicDraft(step);
      }
    } else {
      drafted = this.deterministicDraft(step);
    }

    // Taslağı mevcut değerlerin ÜZERİNE değil, boş alanlara yaz;
    // kullanıcı emeği asla silinmez.
    for (const f of step.fields) {
      const v = drafted[f.key];
      if (v !== undefined && !fieldFilled(state.values[f.key])) {
        state.values[f.key] = v;
      }
    }
    if (state.status === "PENDING") state.status = "IN_PROGRESS";

    const updated = await this.persist(
      id,
      { steps: ws.steps },
      usedAi ? "AI_DRAFT" : "TEMPLATE_DRAFT",
      usedAi
        ? `${step.name} için AI taslağı üretildi`
        : `${step.name} için şablon taslağı yerleştirildi (AI kullanılmadı)`,
    );
    if (!updated) throw new Error(`Çalışma alanı bulunamadı: ${id}`);
    return updated;
  }

  /** Doldurulan adımlardan profesyonel kapanış/durum raporu üretir. */
  async generateReport(id: string, kind: WorkspaceReportKind = "INTERIM"): Promise<MethodologyWorkspace> {
    const ws = await this.get(id);
    if (!ws) throw new Error(`Çalışma alanı bulunamadı: ${id}`);
    const report = generateWorkspaceReport(ws, kind) + this.renderLearningRecord(ws) + this.renderGovernanceOutputs(ws);
    const updated = await this.persist(id, { report }, "REPORT", `${kind === "OFFICIAL" ? "Resmî kapanış" : "Ara durum"} raporu üretildi`);
    if (!updated) throw new Error(`Çalışma alanı bulunamadı: ${id}`);
    return updated;
  }

  // ── iç yardımcılar ──────────────────────────────────────────────

  /**
   * Kayıtlı workspace'i GÜNCEL playbook'a uyumlar. İki durumu kapsar:
   *  (a) Eski kayıt (steps yok) → playbook'tan tohumla, faz notlarını taşı.
   *  (b) Playbook evrildi (adım eklen/çıkarıldı) → her playbook adımı için state
   *      GARANTİ et, playbook sırasına diz, kullanıcı verisini koru.
   * (b) olmadan, playbook'a yeni adım eklenince (ör. 8D'ye D0) eski kayıtlarda o
   * adımın state'i olmuyor ve UI `state.values`'ta çöküyordu.
   */
  private migrateLegacy(ws: MethodologyWorkspace): MethodologyWorkspace {
    const playbook = getPlaybook(ws.methodology);
    const stored = Array.isArray(ws.steps) ? ws.steps : [];

    // (a) Playbook öncesi kayıt: hiç adım yok → tohumla + faz notlarını taşı.
    if (stored.length === 0) {
      const steps = playbook.steps.map(emptyStepState);
      const legacyNotes = (ws.phases ?? [])
        .filter((p) => p.notes.trim())
        .map((p) => `${p.name}: ${p.notes}`)
        .join("\n\n");
      if (legacyNotes) {
        const firstStep = playbook.steps[0];
        const firstText = firstStep.fields.find((f) => !isTabular(f));
        if (firstText) {
          steps[0].values[firstText.key] = legacyNotes;
          steps[0].status = "IN_PROGRESS";
        }
      }
      return this.withIntelligenceDefaults({ ...ws, steps, report: ws.report ?? null });
    }

    // (b) Playbook sırasına göre uyumla: varsa kayıtlı state, yoksa boş tohum.
    const byKey = new Map(stored.map((s) => [s.key, s]));
    const steps = playbook.steps.map((step) => byKey.get(step.key) ?? emptyStepState(step));
    return this.withIntelligenceDefaults({ ...ws, steps, report: ws.report ?? null });
  }

  private withIntelligenceDefaults(ws: MethodologyWorkspace): MethodologyWorkspace {
    return {
      ...ws,
      actions: (ws.actions ?? []).map((a, i) => ({ ...a, id: a.id ?? `act_${i}_${ws.id}` })),
      evidence: ws.evidence ?? [], claims: ws.claims ?? [], metrics: ws.metrics ?? [], links: ws.links ?? [],
      approvals: ws.approvals ?? [
        { role: "QUALITY", name: "", status: "PENDING", comment: "" },
        { role: "PROCESS_OWNER", name: "", status: "PENDING", comment: "" },
      ],
      monitoring: ws.monitoring ?? null, closureStatus: ws.closureStatus ?? "OPEN",
      closedAt: ws.closedAt ?? null, reopenCount: ws.reopenCount ?? 0,
      dna: ws.dna ?? problemDNA(ws.problemDescription),
      specialty: ws.specialty ?? {},
      redTeamReviews: ws.redTeamReviews ?? [],
      horizontalTargets: ws.horizontalTargets ?? [],
      attachments: ws.attachments ?? [],
      systemDocuments: ws.systemDocuments ?? [],
      containmentControls: ws.containmentControls ?? [],
      learningDecision: ws.learningDecision ?? { summary: "", decision: "PENDING", documentIds: [], rationale: "", owner: "", approvedBy: "", decidedAt: null },
      weakSignals: ws.weakSignals ?? [], dailyManagement: ws.dailyManagement ?? [], kaizenExperiments: ws.kaizenExperiments ?? [], oplLessons: ws.oplLessons ?? [], controlBurden: ws.controlBurden ?? [],
      contextContract: ws.contextContract ?? { purpose:"",scope:"",outOfScope:"",successMetric:"",methodRole:"",pivotCondition:"",misuseRisk:"",undesiredBehavior:"",owner:"",approvedBy:"" },
      systemBehaviorAnalyses: ws.systemBehaviorAnalyses ?? [], qmsHealth: ws.qmsHealth ?? [], gembaBehaviorMap: ws.gembaBehaviorMap ?? [],
      benchmarkReferences: ws.benchmarkReferences ?? [], capacityScenarios: ws.capacityScenarios ?? [], sopScenarios: ws.sopScenarios ?? [], lineBalanceStudies: ws.lineBalanceStudies ?? [],
      advancedAnalyses: ws.advancedAnalyses ?? [],
      recommendationFeedback: ws.recommendationFeedback ?? {decision:"PENDING",recommendedMethodology:ws.methodology,selectedMethodology:ws.methodology,reason:"",reviewedAt:null,outcome:"PENDING",outcomeNote:"",outcomeAt:null},
      methodSelectionContext: ws.methodSelectionContext ?? { ...EMPTY_SELECTION_CONTEXT }, fieldPilot: ws.fieldPilot ?? { ...EMPTY_FIELD_PILOT }, externalSystemLinks: ws.externalSystemLinks ?? [],
      auditTrail: ws.auditTrail ?? [],
    };
  }

  private async persist(
    id: string,
    patch: WorkspacePatch,
    type: MethodologyWorkspace["auditTrail"][number]["type"] = "UPDATED",
    summary = "Çalışma alanı güncellendi",
  ): Promise<MethodologyWorkspace | null> {
    const current = await this.repo.get(id);
    if (!current) return null;
    const changedFields = Object.keys(patch).filter((key) => key !== "auditTrail");
    const event = {
      id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      summary,
      changedFields,
      occurredAt: new Date().toISOString(),
    } as MethodologyWorkspace["auditTrail"][number];
    return this.repo.update(id, { ...patch, auditTrail: [...(current.auditTrail ?? []), event] });
  }

  private async llmDraft(
    ws: MethodologyWorkspace,
    playbook: Playbook,
    step: PlaybookStep,
  ): Promise<Record<string, FieldValue>> {
    const schema = step.fields
      .map((f) =>
        isTabular(f)
          ? `"${f.key}": [{ ${f.columns!.map((c) => `"${c.key}": "..."  /* ${c.label} */`).join(", ")} }, ...]  // ${f.label}`
          : `"${f.key}": "..."  // ${f.label}`,
      )
      .join(",\n  ");

    const previous = this.renderFilledSteps(ws, playbook, step.key);

    const system = [
      `Sen deneyimli bir kalite/üretim mühendisisin ve '${ws.methodologyName}' metodolojisini uyguluyorsun.`,
      `Görev: '${step.name}' adımı için, verilen probleme özel PROFESYONEL bir taslak üret.`,
      "Kurallar:",
      "- YALNIZCA geçerli bir JSON nesnesi döndür; JSON içinde // veya /* */ yorumu YAZMA.",
      "- SADECE Türkçe ve Latin alfabesi kullan; İngilizce, Çince veya Latin-dışı",
      "  karakter (汉字, かな vb.) ASLA yazma. Kısa ve somut ol.",
      "- İsim, sorumlu kişi, termin/tarih gibi saha verilerini ASLA uydurma;",
      "  bu alanları/sütunları BOŞ string (\"\") bırak — bunları saha ekibi dolduracak.",
      "- Elinde olmayan ölçüm/sayıyı da uydurma; gerekiyorsa '(saha ekibi dolduracak)' yaz.",
      "- Bir metriği bileşenlerinden hesaplarken (ör. OEE = Kullanılabilirlik×Performans×Kalite)",
      "  sonucu bileşenlerle TUTARLI ver; emin değilsen sonucu boş bırak.",
      "- Tablolara 2-5 gerçekçi, probleme özgü satır öner.",
    ].join("\n");

    const prompt = [
      `Problem: ${ws.problemDescription}`,
      previous ? `Önceki adımlarda girilenler:\n${previous}` : "",
      `Adımın amacı: ${step.objective}`,
      `Profesyonel rehber: ${step.guidance}`,
      "",
      "Şu şemada bir JSON döndür:",
      `{\n  ${schema}\n}`,
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await this.ai.complete({ system, prompt, temperature: 0.4, maxTokens: 1200 });
    const parsed = extractJson(raw);
    return coerceDraft(step, parsed);
  }

  private deterministicDraft(step: PlaybookStep): Record<string, FieldValue> {
    // LLM yok: rehberi ilk metin alanına çalışma şablonu olarak koy.
    const firstText = step.fields.find((f) => !isTabular(f));
    if (!firstText) return {};
    return {
      [firstText.key]: `(Şablon) ${step.guidance}\n\n(Daha zengin, probleme özel taslak için AI sağlayıcı (Ollama) gerekir.)`,
    };
  }

  /** Doldurulmuş adımları markdown olarak döker (rapor + AI bağlamı için). */
  private renderFilledSteps(
    ws: MethodologyWorkspace,
    playbook: Playbook,
    untilStepKey?: string,
  ): string {
    const out: string[] = [];
    for (const step of playbook.steps) {
      if (untilStepKey && step.key === untilStepKey) break;
      const state = ws.steps.find((s) => s.key === step.key);
      if (!state) continue;
      const filled = step.fields.filter((f) => fieldFilled(state.values[f.key]));
      if (filled.length === 0) {
        if (!untilStepKey) out.push(`## ${step.name}\n_(henüz doldurulmadı)_\n`);
        continue;
      }
      out.push(`## ${step.name}`);
      for (const f of filled) {
        const v = state.values[f.key];
        if (typeof v === "string") {
          out.push(`**${f.label}:** ${v}`);
        } else {
          out.push(`**${f.label}:**`, renderTable(f, v));
        }
      }
      out.push("");
    }
    return out.join("\n");
  }

  private renderLearningRecord(ws: MethodologyWorkspace): string {
    const raw = ws.specialty?.learningRecord;
    if (typeof raw !== "object" || raw === null) return "";
    const record = raw as Record<string, unknown>;
    const fields = [
      ["Doğrulanmış kök neden", record.rootCause],
      ["Etkili karşı önlem", record.effectiveCountermeasure],
      ["Etkinlik doğrulaması", record.verification],
      ["Standardizasyon", record.standardization],
      ["Yeniden kullanım kapsamı", record.reuseScope],
      ["Etiketler", record.tags],
    ].filter(([, value]) => typeof value === "string" && value.trim());
    if (fields.length === 0) return "";
    return `\n## Kurumsal Öğrenim Kaydı\n${fields.map(([label, value]) => `**${label}:** ${value}`).join("\n\n")}\n`;
  }

  private renderGovernanceOutputs(ws: MethodologyWorkspace): string {
    const docs = ws.systemDocuments ?? [];
    const containment = ws.containmentControls ?? [];
    const decision = ws.learningDecision;
    const parts: string[] = [];
    if (docs.length) parts.push(`\n## Sistem Dokümanları\n${docs.map((doc) => `- **${doc.type} · ${doc.title || "İsimsiz"}** — Rev. ${doc.revision}, ${doc.status}, sahip: ${doc.owner || "atanmadı"}`).join("\n")}\n`);
    if (containment.length) parts.push(`\n## Containment Yaşam Döngüsü\n${containment.map((item) => `- **${item.purpose || "Geçici kontrol"}** — ${item.status}; kapsam: ${item.scope || "tanımsız"}; kaldırma kriteri: ${item.removalCriteria || "tanımsız"}`).join("\n")}\n`);
    if (decision && decision.decision !== "PENDING") parts.push(`\n## Lessons Learned Sistem Kararı\n**Karar:** ${decision.decision}\n\n**Öğrenim:** ${decision.summary || "—"}\n\n**Gerekçe:** ${decision.rationale || "—"}\n`);
    if (ws.weakSignals.length || ws.dailyManagement.length || ws.kaizenExperiments.length || ws.oplLessons.length || ws.controlBurden.length) parts.push(`\n## Proaktif Operasyon Özeti\n- Zayıf sinyal: ${ws.weakSignals.length}\n- Günlük yönetim kaydı: ${ws.dailyManagement.length}\n- Kaizen deneyi: ${ws.kaizenExperiments.length}\n- OPL / yetkinlik: ${ws.oplLessons.length}\n- Kontrol yükü noktası: ${ws.controlBurden.length}\n`);
    const context=contextCompleteness(ws.contextContract); const qms=qmsHealthScore(ws.qmsHealth);
    if(context.complete||ws.systemBehaviorAnalyses.length||ws.qmsHealth.length||ws.gembaBehaviorMap.length) parts.push(`\n## Organizasyon ve Bağlam Özeti\n- Bağlam sözleşmesi: ${context.complete}/${context.total}\n- Sistem davranışı analizi: ${ws.systemBehaviorAnalyses.length}\n- QMS sağlık seviyesi: ${qms.level}${qms.score?` (${qms.score.toFixed(1)}/5)`:""}\n- Gemba davranış satırı: ${ws.gembaBehaviorMap.length}\n`);
    if(ws.benchmarkReferences.length||ws.capacityScenarios.length||ws.sopScenarios.length||ws.lineBalanceStudies.length) parts.push(`\n## Karar Laboratuvarları Özeti\n- Benchmark referansı: ${ws.benchmarkReferences.length}\n- Kapasite senaryosu: ${ws.capacityScenarios.length}\n- S&OP senaryosu: ${ws.sopScenarios.length}\n- Hat dengeleme çalışması: ${ws.lineBalanceStudies.length}\n`);
    if(ws.advancedAnalyses.length) parts.push(`\n## Gelişmiş Destek Analizleri\n${ws.advancedAnalyses.map(a=>{const result=evaluateAdvancedAnalysis(a);return `- **${a.tool} · ${a.title||"İsimsiz"}** — ${a.status}; ${result.metric}${result.warning?`; ⚠ ${result.warning}`:""}`}).join("\n")}\n`);
    const fieldFindings=fieldQualityFindings(ws);parts.push(`\n## Saha Geçerliliği ve Veri Kalitesi\n- Pilot durumu: ${ws.fieldPilot.status}; sonuç: ${ws.fieldPilot.result}\n- Tesis / hat: ${ws.fieldPilot.site||"tanımsız"} / ${ws.fieldPilot.line||"tanımsız"}\n- Gerçek kullanıcı geri bildirimi: ${ws.fieldPilot.userFeedback||"henüz kaydedilmedi"}\n- Dış sistem bağlantısı: ${ws.externalSystemLinks.length}\n- Engelleyici veri kalitesi bulgusu: ${fieldFindings.filter(x=>x.severity==="BLOCKING").length}\n- Uyarı: ${fieldFindings.filter(x=>x.severity==="WARNING").length}\n`);
    return parts.join("");
  }
}

// ── saf yardımcılar ───────────────────────────────────────────────

function renderTable(field: PlaybookField, rows: TableRow[]): string {
  const cols = field.columns ?? [];
  const header = `| ${cols.map((c) => c.label).join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${cols.map((c) => (r[c.key] ?? "").replaceAll("|", "/")).join(" | ")} |`);
  return [header, sep, ...body].join("\n");
}

/**
 * JSON string'i içindeki // satır ve /* *​/ blok yorumlarını temizler — string
 * içi metne DOKUNMADAN (ör. "http://x" bozulmaz). Yerel model, şemadaki alan
 * açıklamalarını (`// etiket`) çıktısına kopyalayıp geçersiz JSON üretebiliyor
 * (özellikle SPC kart adımı tutarlı tetikliyordu); bu yüzden parse öncesi ayıklıyoruz.
 */
function stripJsonComments(s: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
    } else if (c === "/" && s[i + 1] === "/") {
      while (i < s.length && s[i] !== "\n") i++;
    } else if (c === "/" && s[i + 1] === "*") {
      i += 2;
      while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++;
      i++; // kapanış '/' atla
    } else {
      out += c;
    }
  }
  // Yorum ayıklandıktan sonra kalabilecek son virgülleri de temizle.
  return out.replace(/,(\s*[}\]])/g, "$1");
}

/** LLM çıktısından ilk JSON nesnesini çıkarır (code fence + yorum toleranslı). */
function extractJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("AI geçerli bir taslak üretemedi (JSON yok).");
  const parsed: unknown = JSON.parse(stripJsonComments(cleaned.slice(start, end + 1)));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("AI geçerli bir taslak üretemedi (nesne değil).");
  }
  return parsed as Record<string, unknown>;
}

// Saha ekibinin doldurması gereken KİMLİK/TARİH alanları. Yerel model bu alanlara
// isim/sorumlu/termin UYDURUYOR ve prompt'taki yumuşak "uydurma" talimatını yok
// sayıyor (gözlemlendi: D1'de sahte ekip isimleri, D3'te sahte sorumlu + geçmiş
// yıllı termin). Bu yüzden bu alanları deterministik olarak BOŞ bırakıp insana
// havale ediyoruz — parser'daki "yalnızca pozitif kanıt" filtresiyle aynı ilke.
const FIELD_DATA_KEYS = new Set(["name", "owner", "due", "date", "leader"]);

// Latin-dışı CJK (Çince/Japonca/Korece) + tam-genişlik karakter aralıkları.
// qwen2.5:7b (Çin menşeli) ara sıra Türkçe yerine Çince üretiyor (gözlem: DMADV
// CTQ hedef sütunu tamamen Çince çıktı). Prompt talimatı tek başına yetmediği için
// bu karakterleri içeren metni deterministik olarak REDDEDİP boş bırakıyoruz.
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/;

/** Metin Türkçe/Latin dışı (CJK) karakter içeriyor mu? */
function hasCJK(s: string): boolean {
  return CJK_RE.test(s);
}

/** Taslağı alan şemasına ZORLA uydurur: bilinmeyen alan/sütun atılır. */
function coerceDraft(
  step: PlaybookStep,
  parsed: Record<string, unknown>,
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of step.fields) {
    const v = parsed[f.key];
    if (v === undefined || v === null) continue;
    if (isTabular(f)) {
      if (!Array.isArray(v)) continue;
      const rows: TableRow[] = [];
      for (const raw of v) {
        if (typeof raw !== "object" || raw === null) continue;
        const row: TableRow = {};
        for (const c of f.columns ?? []) {
          // Kimlik/tarih sütunu: LLM ne yazarsa yazsın boşalt (uydurma engeli).
          if (FIELD_DATA_KEYS.has(c.key)) {
            row[c.key] = "";
            continue;
          }
          const cell = (raw as Record<string, unknown>)[c.key];
          const text = cell == null ? "" : String(cell);
          // CJK (Çince vb.) hücreyi boşalt — kullanıcıya yabancı dil gösterme.
          row[c.key] = hasCJK(text) ? "" : text;
        }
        if (Object.values(row).some((s) => s.trim())) rows.push(row);
      }
      if (rows.length) out[f.key] = rows;
    } else {
      // Kimlik/tarih text alanı (ör. "leader"): AI doldurmasın, insan atasın.
      if (FIELD_DATA_KEYS.has(f.key)) continue;
      const s = typeof v === "string" ? v : JSON.stringify(v);
      // CJK (Çince vb.) içeren alanı reddet — kullanıcıya yabancı dil gösterme.
      if (s.trim() && !hasCJK(s)) out[f.key] = s;
    }
  }
  return out;
}
