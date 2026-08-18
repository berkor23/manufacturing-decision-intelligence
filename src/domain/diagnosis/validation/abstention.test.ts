// Abstention testleri — motorun ne zaman karar VERMEMESİ gerektiği.

import { describe, it, expect } from "vitest";
import { problemWith } from "../features";
import { diagnose } from "../diagnose";
import { isRecommendable } from "../recommendation";
import { ABSTENTION_CASES } from "./abstention-cases";
import { DEVELOPMENT_CASES } from "./manufacturing-cases";

describe("abstention — sıralama lideri ile öneri ayrı şeylerdir", () => {
  for (const testCase of ABSTENTION_CASES) {
    it(`${testCase.id} · ${testCase.title}`, () => {
      const problem = problemWith(testCase.answers, { problemDescription: testCase.problem });
      const snapshot = diagnose(problem, 8);
      const verdict = snapshot.recommendation;

      expect(
        verdict.status,
        `${testCase.id}: beklenen ${testCase.expectedStatus}, gelen ${verdict.status}. ${testCase.rationale}`,
      ).toBe(testCase.expectedStatus);

      if (testCase.mustNotRecommend) {
        expect(
          verdict.recommended,
          `${testCase.id}: bu vakada bir yöntem dayatılmamalı (lider: ${snapshot.ranking[0].methodology})`,
        ).toBeNull();
      }

      // Abstention'da bile sıralama arka planda durmalı: kullanıcı "hiçbir şey
      // bilmiyorum" cevabı almamalı, "henüz seçemiyorum, adaylar bunlar" almalı.
      expect(snapshot.ranking.length).toBeGreaterThan(0);
      expect(verdict.reason.length).toBeGreaterThan(30);
    });
  }

  it("kanıt yetersizliği ile ‘yöntem gerekmiyor’ birbirine karışmaz", () => {
    const insufficient = ABSTENTION_CASES.filter((c) => c.expectedStatus === "INSUFFICIENT_EVIDENCE");
    const noMethod = ABSTENTION_CASES.filter((c) => c.expectedStatus === "NO_FORMAL_METHOD_NEEDED");
    expect(insufficient.length).toBeGreaterThan(0);
    expect(noMethod.length).toBeGreaterThan(0);

    for (const testCase of noMethod) {
      const snapshot = diagnose(problemWith(testCase.answers), 8);
      // Ayrımın somut işareti: burada kök neden BİLİNİYOR. Kanıt eksik değil.
      expect(snapshot.recommendation.reason).toContain("Kök neden doğrulanmış");
    }
    for (const testCase of insufficient) {
      const snapshot = diagnose(problemWith(testCase.answers), 8);
      expect(snapshot.recommendation.reason).not.toContain("Kök neden doğrulanmış");
    }
  });

  it("abstention durumunda bile ayırt edici soru üretilir", () => {
    for (const testCase of ABSTENTION_CASES) {
      if (testCase.expectedStatus !== "INSUFFICIENT_EVIDENCE") continue;
      const snapshot = diagnose(problemWith(testCase.answers), 0);
      expect(snapshot.nextQuestion, `${testCase.id}: kararı netleştirecek soru yok`).not.toBeNull();
    }
  });
});

describe("öneri kalibrasyonu — güçlü vakalar hâlâ öneriliyor", () => {
  it("development vakalarının çoğunda öneri üretilebiliyor", () => {
    // Abstention eklemek, motoru her şeyden kaçınan bir sisteme çevirmemeli.
    const results = DEVELOPMENT_CASES.map((testCase) => {
      const snapshot = diagnose(problemWith(testCase.answers), 8);
      return { id: testCase.id, status: snapshot.recommendation.status };
    });
    const recommendable = results.filter((r) => isRecommendable(r.status));
    const abstained = results.filter((r) => !isRecommendable(r.status));

    console.log(
      `\n── Öneri kalibrasyonu (development) ──\n` +
        `  öneri üretilen              ${recommendable.length}/${results.length}\n` +
        `  bilinçli çekimser           ${abstained.map((r) => `${r.id}=${r.status}`).join(", ") || "—"}`,
    );

    // Kanıtı güçlü gri bölge vakalarında motor susmamalı.
    expect(recommendable.length).toBeGreaterThanOrEqual(results.length - 2);
  });

  it("çelişkili kanıt gövdeleri CONTESTED olarak sınıflanır", () => {
    const contestedCases = DEVELOPMENT_CASES.filter((c) => Array.isArray(c.expectContested));
    expect(contestedCases.length).toBeGreaterThan(0);
    for (const testCase of contestedCases) {
      const snapshot = diagnose(problemWith(testCase.answers), 8);
      expect(snapshot.recommendation.status, `${testCase.id}`).toBe("CONTESTED");
    }
  });

  it("öneri hükmü bileşenlerden türer, kör eşikten değil", () => {
    const snapshot = diagnose(
      problemWith({ defectOccurred: true, equipmentBreakdown: true, rootCauseKnown: true, previouslyOccurred: false }),
      8,
    );
    const c = snapshot.recommendation.components;
    // Eşik, yöntemin KENDİ profilinden gelir; sabit bir sayı değildir.
    expect(c.meaningfulSupport).toBeGreaterThan(0);
    expect(c.requiredDimensions).toBeGreaterThan(0);
    expect(c.evidenceCompleteness).toBeGreaterThanOrEqual(0);
    expect(c.evidenceCompleteness).toBeLessThanOrEqual(1);
  });
});
