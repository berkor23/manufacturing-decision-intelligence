// ReportService — dizi (tamamlayıcı yaklaşımlar + sonraki adımlar) bölümünün
// deterministik olarak rapora eklendiğini doğrular.

import { describe, it, expect } from "vitest";
import { ReportService } from "./report-service";
import type { IConversationRepository, Conversation } from "./ports/conversation-repository";
import type { IKnowledgeRepository } from "./ports/knowledge-repository";
import type { IAIProvider } from "./ports/ai-provider";
import { createEmptyProblem, zeroScores, computeConfidence, composeMethodologyPlan, evaluateStabilizationGate } from "@/domain/diagnosis";

const noneAI: IAIProvider = {
  name: "none",
  available: false,
  async complete() {
    throw new Error("LLM yok");
  },
};

const knowledgeStub: IKnowledgeRepository = {
  async getByMethodology() {
    return null;
  },
};

function concludedConversation(): Conversation {
  // 8D lider, TOC yakın rakip olacak şekilde bir skor kur.
  const scores = zeroScores();
  scores.EIGHT_D = 4;
  scores.TOC = 4; // berabere → TOC yakın alternatif olmalı
  const ranking = computeConfidence(scores);
  return {
    id: "c1",
    status: "CONCLUDED",
    structuredProblem: { ...createEmptyProblem(), problemDescription: "Müşteri şikayeti + darboğaz." },
    questionsAsked: 3,
    askedFeatures: [],
    pendingFeature: null,
    messages: [],
    informationTasks: [],
    recommendationChanges: [],
    result: {
      methodology: "EIGHT_D",
      confidence: ranking.find((r) => r.methodology === "EIGHT_D")!.confidence,
      ranking,
      trace: { steps: [{ featureKey: "customerAffected", value: true, because: "Müşteri etkilendi", delta: 3 }], conclusion: { methodology: "EIGHT_D", confidence: 0.4 } },
      evidenceStatus: "CONFIRMED",
      methodPlan: composeMethodologyPlan(ranking),
      stabilization: evaluateStabilizationGate(createEmptyProblem()),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function repoWith(conv: Conversation): IConversationRepository {
  return {
    async create() {
      throw new Error("kullanılmıyor");
    },
    async get() {
      return conv;
    },
    async save(c) {
      return c;
    },
  };
}

describe("ReportService — dizi bölümü", () => {
  it("deterministik rapora yakın alternatif + sonraki adımları ekler", async () => {
    const svc = new ReportService(repoWith(concludedConversation()), knowledgeStub, noneAI);
    const report = await svc.generate("c1");

    expect(report).toContain("## Tamamlayıcı Yaklaşımlar ve Sonraki Adımlar");
    // 8D ile berabere olan TOC yakın alternatif olarak görünmeli:
    expect(report).toContain("Yakın alternatifler");
    expect(report).toMatch(/TOC/);
    // 8D'nin doğal takipçilerinden biri (FMEA) sonraki adımlarda olmalı:
    expect(report).toContain("Sonraki / tamamlayıcı adımlar");
    expect(report).toMatch(/FMEA/);
  });
});
