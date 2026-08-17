import { describe, it, expect } from "vitest";
import { DiagnosisService } from "./diagnosis-service";
import { InMemoryConversationRepository } from "@/infrastructure/persistence/in-memory-conversation-repository";
import { KeywordProblemParser } from "@/infrastructure/parser/keyword-problem-parser";
import type { DiagnosticFeatureKey, Methodology } from "@/domain/diagnosis";

function makeService() {
  return new DiagnosisService(
    new InMemoryConversationRepository(),
    new KeywordProblemParser(),
  );
}

async function runToConclusion(
  service: DiagnosisService,
  text: string,
  answer: string,
) {
  let view = await service.start(text);
  let guard = 0;
  while (view.status === "ASKING" && guard++ < 25) {
    view = await service.answer(view.conversationId, answer);
  }
  return view;
}

async function runReviewedCase(
  text: string,
  expected: Methodology,
  answers: Partial<Record<DiagnosticFeatureKey, boolean>>,
  maxQuestions: number,
) {
  const service = makeService();
  let view = await service.start(text);
  const parserConfirmations = Object.fromEntries(
    Object.entries(view.featureSources)
      .filter(([, source]) => source === "PARSER")
      .map(([key]) => [key, view.structuredProblem.features[key as DiagnosticFeatureKey]]),
  ) as Partial<Record<DiagnosticFeatureKey, boolean | null>>;
  view = await service.reviewFeatures(view.conversationId, parserConfirmations);
  const asked: DiagnosticFeatureKey[] = [];
  while (view.status === "ASKING" && asked.length < 20) {
    const feature = view.nextQuestion!.featureKey;
    asked.push(feature);
    view = await service.answer(view.conversationId, answers[feature] === true ? "evet" : "hayır");
  }
  expect(view.result?.methodology).toBe(expected);
  expect(asked.length).toBeGreaterThanOrEqual(3);
  expect(asked.length).toBeLessThanOrEqual(maxQuestions);
  expect(new Set(asked).size).toBe(asked.length);
  return { view, asked };
}

describe("DiagnosisService — uçtan uca (keyword parser + in-memory)", () => {
  it("start bir soru sorar ve conversation oluşturur", async () => {
    const service = makeService();
    const view = await service.start("Kaynak hattında bir sorun var.");
    expect(view.conversationId).toBeTruthy();
    expect(view.status).toBe("ASKING");
    expect(view.nextQuestion).toBeDefined();
    expect(view.messages.length).toBeGreaterThanOrEqual(2); // USER + ASSISTANT
  });

  it("müşteri şikayeti senaryosu → 8D ile sonuçlanır", async () => {
    const service = makeService();
    const view = await runToConclusion(
      service,
      "Müşteriye çatlak ürün ulaştı, ayıklama gerekiyor ve kök neden bilinmiyor.",
      "hayır",
    );
    expect(view.status).toBe("CONCLUDED");
    expect(view.result?.methodology).toBe("EIGHT_D");
    expect(view.result?.trace.steps.length).toBeGreaterThan(0);
  });

  it("veri + varyasyon senaryosu → DMAIC ile sonuçlanır", async () => {
    const service = makeService();
    const view = await runToConclusion(
      service,
      "Ölçüm verilerinde varyasyon sürekli yüksek. Standart iş tanımlı, temel koşullar sağlanıyor ve ölçüm sistemi güvenilir.",
      "hayır",
    );
    expect(view.status).toBe("CONCLUDED");
    expect(view.result?.methodology).toBe("DMAIC");
  });

  it("belirsiz cevaplar sonsuz döngüye girmez, sonuca varır", async () => {
    const service = makeService();
    const view = await runToConclusion(
      service,
      "Hatın birinde bir problem yaşanıyor.",
      "bilmiyorum",
    );
    expect(view.status).toBe("CONCLUDED");
    expect(view.informationTasks.length).toBeGreaterThan(0);
  });

  it("bilmiyorum görevi atanır ve kesin cevapla teşhis yeniden hesaplanır", async () => {
    const service = makeService();
    const concluded = await runToConclusion(service, "Hatın birinde problem yaşanıyor.", "bilmiyorum");
    const task = concluded.informationTasks[0];
    const assigned = await service.updateInformationTask(concluded.conversationId, task.id, { owner: "Kalite", dueDate: "2026-08-01" });
    expect(assigned.informationTasks[0]).toMatchObject({ owner: "Kalite", dueDate: "2026-08-01", status: "OPEN" });
    const refreshed = await service.resolveInformationTask(concluded.conversationId, task.id, "evet");
    expect(refreshed.informationTasks[0]).toMatchObject({ status: "RESOLVED", answer: "evet" });
    expect(refreshed.structuredProblem.features[task.featureKey]).toBe(true);
  });

  it("parser başlangıç metninden alanları çıkarır (müşteri etkilendi)", async () => {
    const service = makeService();
    const view = await service.start("Müşteri etkilendi, sahadan iade geldi.");
    expect(view.structuredProblem.features.customerAffected).toBe(true);
  });

  it("parser çıkarımlarını kullanıcı teyidiyle düzeltir ve kaynağını izler", async () => {
    const service = makeService();
    const started = await service.start(
      "Yeni tedarikçiye geçeceğiz, henüz hata yaşanmadı fakat gelecekte kalite riski oluşabilir.",
    );

    expect(started.structuredProblem.features.supplierChanged).toBe(true);
    expect(started.structuredProblem.features.defectOccurred).toBe(false);
    expect(started.featureSources.supplierChanged).toBe("PARSER");

    const reviewed = await service.reviewFeatures(started.conversationId, {
      supplierChanged: false,
      defectOccurred: false,
    });

    expect(reviewed.structuredProblem.features.supplierChanged).toBe(false);
    expect(reviewed.featureSources.supplierChanged).toBe("USER_CONFIRMED");
    expect(reviewed.featureSources.defectOccurred).toBe("USER_CONFIRMED");
    expect(reviewed.questionsAsked).toBe(started.questionsAsked);
  });

  it("süreç bağlamı soru anlamından ayrı taşınır", async () => {
    const service = makeService();
    const view = await service.start("Kaynak hattında çatlak oluştu.");
    expect(view.structuredProblem.processName).toBe("kaynak hattı");
    expect(view.nextQuestion?.context).toBe("kaynak hattı");
    expect(view.nextQuestion?.text).not.toContain("kaynak hattı");
  });

  it("kullanıcı istediğinde mevcut kanıtlarla sonucu gösterir", async () => {
    const service = makeService();
    let view = await service.start("Montaj hattında açıklanamayan bir problem var.");
    view = await service.answer(view.conversationId, "bilmiyorum");
    view = await service.answer(view.conversationId, "bilmiyorum");
    view = await service.answer(view.conversationId, "bilmiyorum");

    view = await service.answer(view.conversationId, "__SHOW_CURRENT_RESULT__");

    expect(view.status).toBe("CONCLUDED");
    expect(view.result).toBeDefined();
    expect(view.nextQuestion).toBeUndefined();
    expect(view.informationTasks.length).toBeGreaterThanOrEqual(3);
  });

  it("cevaplar kalıcıdır: getState aynı durumu döndürür", async () => {
    const service = makeService();
    const started = await service.start("Kaynak hattında çatlak oluştu.");
    const fetched = await service.getState(started.conversationId);
    expect(fetched).not.toBeNull();
    expect(fetched!.conversationId).toBe(started.conversationId);
    expect(fetched!.structuredProblem.features.defectOccurred).toBe(true);
  });

  it("gerçek servis akışında TPM sinyalleri doğrulanır ve ilgisiz dallara sapılmaz", async () => {
    const { view, asked } = await runReviewedCase(
      "Paketleme makinesindeki kısa duruşlar aylardır tekrarlıyor; OEE ve bakım kayıtları mevcut.",
      "TPM",
      { equipmentBreakdown: true, chronicEquipmentLoss: true, previouslyOccurred: true, hasMeasurementData: true, standardWorkEstablished: false, isImprovementInitiative: false },
      8,
    );
    expect(asked).not.toContain("decisionBetweenOptions");
    expect(asked).not.toContain("isNewDesign");
    expect(asked).not.toContain("workplaceDisorganized");
    expect(asked).not.toContain("externalNonconformance");
    expect(view.evidence.status).not.toBe("INCONCLUSIVE");
  });

  it("gerçek servis akışında müşteri uygunsuzluğu çelişkisiz 8D'ye gider", async () => {
    const { view } = await runReviewedCase(
      "Otomotiv müşterisine ulaşan kaynak çatlağı tekrar etti; kök neden bilinmiyor ve acil ayıklama gerekiyor.",
      "EIGHT_D",
      { defectOccurred: true, customerAffected: true, rootCauseKnown: false, externalNonconformance: true, containmentNeeded: true, hasMeasurementData: true },
      8,
    );
    expect(view.evidence.conflicts).toEqual([]);
    expect(view.evidence.scoreMargin).toBeGreaterThanOrEqual(2);
  });
});
