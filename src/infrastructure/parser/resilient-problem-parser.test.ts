import { beforeEach, describe, expect, it } from "vitest";
import type { IProblemParser } from "@/application/ports/problem-parser";
import { KeywordProblemParser } from "./keyword-problem-parser";
import { parserFallbackMetrics, resetParserFallbackMetrics, ResilientProblemParser } from "./resilient-problem-parser";

const unavailableParser: IProblemParser = {
  name: "unavailable",
  async parseInitial() {
    throw new TypeError("fetch failed");
  },
  async interpretAnswer() {
    throw new TypeError("fetch failed");
  },
};

describe("ResilientProblemParser", () => {
  beforeEach(() => resetParserFallbackMetrics());
  it("birincil sağlayıcı erişilemezse ilk metni deterministik parser ile işler", async () => {
    const parser = new ResilientProblemParser(unavailableParser, new KeywordProblemParser());
    const result = await parser.parseInitial("Müşteri şikayetiyle gelen çatlak hatası tekrar ediyor.");

    expect(result.problemDescription).toContain("çatlak");
    expect(result.features.customerAffected).toBe(true);
    expect(result.features.defectOccurred).toBe(true);
    expect(parserFallbackMetrics()).toMatchObject({ initialFallbacks: 1, answerFallbacks: 0 });
    expect(parserFallbackMetrics().lastFallbackAt).not.toBeNull();
  });

  it("birincil sağlayıcı erişilemezse cevabın polaritesini yedek parser ile yorumlar", async () => {
    const parser = new ResilientProblemParser(unavailableParser, new KeywordProblemParser());
    const result = await parser.interpretAnswer({
      featureKey: "customerAffected",
      questionTheme: "Müşteri etkilendi mi?",
      answerText: "Hayır, müşteri etkilenmedi.",
    });

    expect(result).toBe(false);
    expect(parserFallbackMetrics()).toMatchObject({ initialFallbacks: 0, answerFallbacks: 1 });
  });

  it("LLM açık negasyonu yanlış pozitif yorumlasa bile deterministik sözleşmeyi korur", async () => {
    const optimisticParser: IProblemParser = {
      name: "optimistic-llm",
      async parseInitial(text) {
        return { processName: null, problemDescription: text, features: { defectOccurred: true, equipmentBreakdown: true } };
      },
      async interpretAnswer() { return true; },
    };
    const parser = new ResilientProblemParser(optimisticParser, new KeywordProblemParser());
    const result = await parser.parseInitial(
      "Yeni CNC tezgâhı alacağız; henüz hata yaşanmadı ve ekipman arızası yok.",
    );

    expect(result.features.defectOccurred).toBe(false);
    expect(result.features.equipmentBreakdown).toBe(false);
  });
});
