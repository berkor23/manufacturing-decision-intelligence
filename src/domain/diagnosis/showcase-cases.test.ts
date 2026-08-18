// Vitrin kalkanı.
//
// Landing sayfası bu vakaları gerçek motorla çalıştırıp sonucunu basar. Kural
// ağırlıkları değiştiğinde vitrin sessizce yanlış bir iddiaya dönüşebilir; bu
// dosya bunu imkânsız kılar. Vitrindeki her cümle burada sabittir.

import { describe, it, expect } from "vitest";
import { SHOWCASE_CASES } from "./showcase-cases";
import { problemWith } from "./features";
import { diagnose } from "./diagnose";

describe("vitrin vakaları — landing sayfasında gösterilen çıktı", () => {
  for (const showcase of SHOWCASE_CASES) {
    it(`${showcase.title} → ${showcase.expected}`, () => {
      const snapshot = diagnose(
        problemWith(showcase.answers, { problemDescription: showcase.problemText }),
        6,
      );
      expect(snapshot.ranking[0].methodology).toBe(showcase.expected);
    });
  }

  it("her vaka kendi gerekçe zincirini üretir — boş vitrin olmaz", () => {
    for (const showcase of SHOWCASE_CASES) {
      const snapshot = diagnose(problemWith(showcase.answers), 6);
      expect(snapshot.trace.steps.length).toBeGreaterThan(0);
      expect(snapshot.rivalAnalysis.length).toBeGreaterThan(0);
    }
  });

  it("gri bölge vakası iki karakteri birden görünür kılar", () => {
    const gray = SHOWCASE_CASES.find((c) => c.id === "machine-stoppage")!;
    const snapshot = diagnose(problemWith(gray.answers), 6);
    expect(snapshot.contested).not.toBeNull();
    const codes = snapshot.contested!.sides.map((s) => s.methodology).sort();
    expect(codes).toEqual(["TOC", "TPM"]);
  });

  it("problem metinleri gerçekten denenebilecek uzunlukta", () => {
    for (const showcase of SHOWCASE_CASES) {
      expect(showcase.problemText.length).toBeGreaterThan(80);
    }
  });
});
