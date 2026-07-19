import type { DiagnosticFeatureKey, StructuredProblem } from "./features";

export type StabilizationStatus = "READY" | "STABILIZE_FIRST" | "UNKNOWN";

export interface StabilizationGate {
  status: StabilizationStatus;
  blockers: { featureKey: DiagnosticFeatureKey; reason: string }[];
  unknowns: DiagnosticFeatureKey[];
}

const REQUIRED: DiagnosticFeatureKey[] = [
  "standardWorkEstablished",
  "basicConditionsStable",
  "measurementReliable",
  "processStable",
];

export function evaluateStabilizationGate(problem: StructuredProblem): StabilizationGate {
  const blockers: StabilizationGate["blockers"] = [];
  if (problem.features.standardWorkEstablished === false) blockers.push({ featureKey: "standardWorkEstablished", reason: "Standart iş yerleşik değil." });
  if (problem.features.basicConditionsStable === false) blockers.push({ featureKey: "basicConditionsStable", reason: "Temel 4M koşulları düzenli sağlanmıyor." });
  if (problem.features.measurementReliable === false) blockers.push({ featureKey: "measurementReliable", reason: "Ölçüm sistemi karar vermek için güvenilir değil." });
  if (problem.features.processStable === false) blockers.push({ featureKey: "processStable", reason: "Proses kararlılığı doğrulanmadı." });
  const unknowns = REQUIRED.filter((key) => problem.features[key] === null);
  return {
    status: blockers.length > 0 ? "STABILIZE_FIRST" : unknowns.length === 0 ? "READY" : "UNKNOWN",
    blockers,
    unknowns,
  };
}
