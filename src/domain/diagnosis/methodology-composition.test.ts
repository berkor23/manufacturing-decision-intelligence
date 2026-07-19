import { describe, expect, it } from "vitest";
import { problemWith } from "./features";
import { evaluateRules } from "./rule-engine";
import { computeConfidence } from "./confidence-engine";
import { composeMethodologyPlan } from "./methodology-composition";

function planFor(features: Parameters<typeof problemWith>[0]) {
  return composeMethodologyPlan(computeConfidence(evaluateRules(problemWith(features)).scores));
}

describe("katmanlı metodoloji bileşimi", () => {
  it("müşteri uygunsuzluğu vakasında 8D omurgasına RCA analizini ekler", () => {
    const plan = planFor({
      defectOccurred: true,
      customerAffected: true,
      externalNonconformance: true,
      containmentNeeded: true,
      rootCauseKnown: false,
    });

    expect(plan.primary.methodology).toBe("EIGHT_D");
    expect(plan.primary.layer).toBe("PRIMARY");
    expect(plan.supporting).toContainEqual(expect.objectContaining({
      layer: "ANALYSIS",
      methodology: "RCA",
    }));
  });

  it("karma vakada analiz, karşı önlem ve kontrol yöntemlerini ayrı katmanlarda sunar", () => {
    const plan = planFor({
      defectOccurred: true,
      customerAffected: true,
      externalNonconformance: true,
      containmentNeeded: true,
      rootCauseKnown: false,
      humanErrorProne: true,
      failureModeKnown: true,
      hasMeasurementData: true,
      measurementReliable: true,
      monitoringNeed: true,
      processStable: true,
    });

    expect(plan.primary.methodology).toBe("EIGHT_D");
    expect(plan.supporting).toEqual(expect.arrayContaining([
      expect.objectContaining({ layer: "ANALYSIS", methodology: "RCA" }),
      expect.objectContaining({ layer: "COUNTERMEASURE", methodology: "POKA_YOKE" }),
      expect.objectContaining({ layer: "CONTROL", methodology: "SPC" }),
    ]));
  });

  it("sıfır veya negatif kanıtlı yöntemleri destek planına almaz", () => {
    const plan = planFor({
      defectOccurred: false,
      safetyOrRegulatory: true,
    });

    expect(plan.primary.methodology).toBe("FMEA");
    expect(plan.supporting.every((entry) => entry.score > 0)).toBe(true);
    expect(plan.supporting.map((entry) => entry.methodology)).not.toContain("EIGHT_D");
    expect(plan.supporting.map((entry) => entry.methodology)).not.toContain("RCA");
  });
});
