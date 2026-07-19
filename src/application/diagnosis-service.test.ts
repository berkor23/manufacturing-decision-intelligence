import { describe, it, expect } from "vitest";
import { DiagnosisService } from "./diagnosis-service";
import { InMemoryConversationRepository } from "@/infrastructure/persistence/in-memory-conversation-repository";
import { KeywordProblemParser } from "@/infrastructure/parser/keyword-problem-parser";

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
});
