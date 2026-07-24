import { describe, it, expect } from "vitest";
import { problemWith } from "./features";
import { evaluateRules } from "./rule-engine";
import { computeConfidence } from "./confidence-engine";
import { explainRivals } from "./rival-analysis";
import { METHODOLOGY_IDENTITY } from "./methodologies";

function analyze(p: Parameters<typeof evaluateRules>[0]) {
  const evaluation = evaluateRules(p);
  const ranking = computeConfidence(evaluation.scores);
  return { rivals: explainRivals(p, evaluation, ranking), leader: ranking[0].methodology };
}

describe("rival-analysis — neden diğer yöntemler değil", () => {
  it("lider yöntemi kendi listesinde açıklamaz", () => {
    const { rivals, leader } = analyze(problemWith({ hasMeasurementData: true, highVariation: true }));
    expect(rivals.every((r) => r.methodology !== leader)).toBe(true);
  });

  it("gerçekleşmiş hata varken FMEA, yöntemin özü + problemin gerçeğiyle elenir", () => {
    const { rivals } = analyze(problemWith({
      defectOccurred: true,
      customerAffected: true,
      rootCauseKnown: false,
      externalNonconformance: true,
      containmentNeeded: true,
    }));
    const fmea = rivals.find((r) => r.methodology === "FMEA");
    expect(fmea).toBeDefined();
    expect(fmea!.kind).toBe("SUPPRESSED");
    // Makale sesi: yöntemin özü var + problemin şu anki gerçeği ("Bu problemde ise …")
    expect(fmea!.reason).toContain(METHODOLOGY_IDENTITY.FMEA.essence);
    expect(fmea!.reason).toContain("Bu problemde ise");
    expect(fmea!.reason.toLocaleLowerCase("tr-TR")).toContain("gerçek bir hata oluştu");
    expect(fmea!.question).toBe(METHODOLOGY_IDENTITY.FMEA.question);
  });

  it("kök neden bilinmezken Poka-Yoke, kuru kural metniyle değil kimlik+gerçekle açıklanır", () => {
    const { rivals, leader } = analyze(problemWith({
      defectOccurred: true,
      customerAffected: false,
      rootCauseKnown: false,
      humanErrorProne: true,
    }));
    expect(leader).toBe("RCA");
    const poka = rivals.find((r) => r.methodology === "POKA_YOKE");
    expect(poka).toBeDefined();
    expect(poka!.kind).toBe("SUPPRESSED");
    expect(poka!.reason).toContain(METHODOLOGY_IDENTITY.POKA_YOKE.essence);
    // Eski kuru gerekçe ("önce teşhis") artık kullanılmaz.
    expect(poka!.reason).not.toContain("önce teşhis");
    expect(poka!.reason.toLocaleLowerCase("tr-TR")).toContain("kök neden bilinmiyor");
  });

  it("her açıklama statik katalogtan (kimlik özü) kurulur — üretilmiş metin değildir", () => {
    const { rivals } = analyze(problemWith({
      defectOccurred: true,
      customerAffected: true,
      rootCauseKnown: false,
      externalNonconformance: true,
      containmentNeeded: true,
    }));
    expect(rivals.length).toBeGreaterThan(0);
    for (const rival of rivals) {
      expect(rival.reason).toContain(METHODOLOGY_IDENTITY[rival.methodology].essence);
    }
  });

  it("kararla hiç etkileşmeyen yöntemler listelenmez ve liste sınırlıdır", () => {
    const { rivals } = analyze(problemWith({ hasMeasurementData: true, highVariation: true }));
    expect(rivals.length).toBeLessThanOrEqual(4);
    expect(rivals.every((r) => r.reason.length > 0)).toBe(true);
  });
});
