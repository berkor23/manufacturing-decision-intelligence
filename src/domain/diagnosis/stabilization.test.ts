import { describe, expect, it } from "vitest";
import { diagnose } from "./diagnose";
import { problemWith } from "./features";
import { evaluateStabilizationGate } from "./stabilization";

describe("stabilizasyon kapısı", () => {
  it("dört önkoşul kanıtlandığında iyileştirmeye hazırdır", () => {
    const gate = evaluateStabilizationGate(problemWith({
      standardWorkEstablished: true,
      basicConditionsStable: true,
      measurementReliable: true,
      processStable: true,
    }));

    expect(gate).toEqual({ status: "READY", blockers: [], unknowns: [] });
  });

  it("tek bir olumsuz önkoşul bile önce stabilizasyon gerektirir", () => {
    const gate = evaluateStabilizationGate(problemWith({
      standardWorkEstablished: false,
      basicConditionsStable: true,
      measurementReliable: true,
      processStable: false,
    }));

    expect(gate.status).toBe("STABILIZE_FIRST");
    expect(gate.blockers.map((item) => item.featureKey)).toEqual([
      "standardWorkEstablished",
      "processStable",
    ]);
    expect(gate.unknowns).toEqual([]);
  });

  it("olumsuz kanıt yok ama eksik bilgi varsa hazır varsaymaz", () => {
    const gate = evaluateStabilizationGate(problemWith({
      standardWorkEstablished: true,
      basicConditionsStable: true,
    }));

    expect(gate.status).toBe("UNKNOWN");
    expect(gate.blockers).toEqual([]);
    expect(gate.unknowns).toEqual(["measurementReliable", "processStable"]);
  });

  it("standart ve temel koşullar yoksa SDCA liderliğini üç bağımsız sinyalle kurar", () => {
    const snapshot = diagnose(problemWith({
      isImprovementInitiative: true,
      standardWorkEstablished: false,
      basicConditionsStable: false,
      processStable: false,
      measurementReliable: true,
    }), 4);

    expect(snapshot.ranking[0].methodology).toBe("SDCA");
    expect(snapshot.evidence.supportingSignals).toBeGreaterThanOrEqual(3);
    expect(snapshot.stabilization.status).toBe("STABILIZE_FIRST");
  });

  it("kararlı baz hatta SDCA'yı zorlamaz ve planlı iyileştirmeyi PDCA'ya bırakır", () => {
    const snapshot = diagnose(problemWith({
      isImprovementInitiative: true,
      defectOccurred: false,
      standardWorkEstablished: true,
      basicConditionsStable: true,
      measurementReliable: true,
      processStable: true,
    }), 4);

    expect(snapshot.stabilization.status).toBe("READY");
    expect(snapshot.ranking[0].methodology).toBe("PDCA_A3");
  });
});
