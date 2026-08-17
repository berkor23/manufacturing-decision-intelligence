import { describe, expect, it } from "vitest";
import { DiagnosisService } from "@/application/diagnosis-service";
import { KeywordProblemParser } from "@/infrastructure/parser/keyword-problem-parser";
import { TransientConversationRepository } from "./transient-conversation-repository";

describe("TransientConversationRepository", () => {
  it("misafir teşhisini yalnız istek ömründeki depoda yürütür ve geri yükler", async () => {
    const firstRepository = new TransientConversationRepository();
    const firstService = new DiagnosisService(firstRepository, new KeywordProblemParser());
    const started = await firstService.start("Kaynak hattında iki aydır tekrar eden çatlak var ve kök neden bilinmiyor.");

    expect(started.conversationId).toMatch(/^local_conv_/);
    const state = firstRepository.snapshot();
    expect(state.messages.length).toBeGreaterThan(1);

    const restoredRepository = new TransientConversationRepository(state);
    const restoredService = new DiagnosisService(restoredRepository, new KeywordProblemParser());
    const answered = await restoredService.answer(state.id, "evet");

    expect(answered.conversationId).toBe(state.id);
    expect(restoredRepository.snapshot().messages.some((message) => message.kind === "ANSWER")).toBe(true);
    expect(await firstRepository.get(state.id)).not.toBeNull();
  });

  it("dışarı verilen kopyanın değiştirilmesi depodaki durumu bozmaz", async () => {
    const repository = new TransientConversationRepository();
    const service = new DiagnosisService(repository, new KeywordProblemParser());
    await service.start("Makine tekrar arıza yapıyor ve üretim duruyor.");
    const copy = repository.snapshot();
    copy.messages.length = 0;
    expect(repository.snapshot().messages.length).toBeGreaterThan(0);
  });
});
