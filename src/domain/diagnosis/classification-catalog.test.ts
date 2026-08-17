import { describe, expect, it } from "vitest";
import { createEmptyProblem, type DiagnosticFeatureKey, withFeature } from "./features";
import { diagnose, METHOD_EVIDENCE_CATEGORIES, METHOD_EVIDENCE_PROFILES } from "./diagnose";
import { METHODOLOGIES, type Methodology } from "./methodologies";

type FeatureSet = Partial<Record<DiagnosticFeatureKey, boolean>>;
type GoldenCase = { name: string; expected: Methodology; features: FeatureSet };

const archetypes: Array<{ expected: Methodology; first: FeatureSet; second: FeatureSet }> = [
  { expected: "FMEA", first: { defectOccurred:false, supplierChanged:true, failureModeKnown:true }, second: { defectOccurred:false, processChanged:true, safetyOrRegulatory:true } },
  { expected: "KEPNER_TREGOE", first: { defectOccurred:true, startedRecently:true, processChanged:true, comparisonAvailable:true }, second: { defectOccurred:true, startedRecently:true, operatorChanged:true, intermittent:true, comparisonAvailable:true } },
  { expected: "RCA", first: { defectOccurred:true, rootCauseKnown:false, previouslyOccurred:true }, second: { defectOccurred:true, rootCauseKnown:false, safetyOrRegulatory:true, customerAffected:false } },
  { expected: "EIGHT_D", first: { defectOccurred:true, externalNonconformance:true, containmentNeeded:true }, second: { defectOccurred:true, customerAffected:true, rootCauseKnown:false, externalNonconformance:true, containmentNeeded:true } },
  { expected: "PDCA_A3", first: { isImprovementInitiative:true, standardWorkEstablished:true, basicConditionsStable:true, processStable:true }, second: { isImprovementInitiative:true, customerAffected:false, standardWorkEstablished:true, basicConditionsStable:true, processStable:true } },
  { expected: "DMAIC", first: { defectOccurred:true, hasMeasurementData:true, highVariation:true, measurementReliable:true, processStable:false }, second: { hasMeasurementData:true, highVariation:true, measurementReliable:true, processStable:false, customerAffected:false } },
  { expected: "FIVE_S", first: { workplaceDisorganized:true, rootCauseKnown:true }, second: { workplaceDisorganized:true, customerAffected:false, equipmentBreakdown:false } },
  { expected: "TPM", first: { equipmentBreakdown:true, chronicEquipmentLoss:true, previouslyOccurred:true }, second: { equipmentBreakdown:true, chronicEquipmentLoss:true, customerAffected:false } },
  { expected: "LEAN_VSM", first: { flowOrWaste:true, bottleneckThroughput:false }, second: { flowOrWaste:true, customerAffected:false, equipmentBreakdown:false } },
  { expected: "DMADV", first: { isNewDesign:true, defectOccurred:false }, second: { isNewDesign:true, hasMeasurementData:true, customerAffected:false } },
  { expected: "SPC", first: { monitoringNeed:true, processStable:true, measurementReliable:true }, second: { monitoringNeed:true, processStable:true, measurementReliable:true, hasMeasurementData:true } },
  { expected: "POKA_YOKE", first: { humanErrorProne:true, failureModeKnown:true, rootCauseKnown:true }, second: { humanErrorProne:true, failureModeKnown:true, defectOccurred:true, rootCauseKnown:true } },
  { expected: "TOC", first: { bottleneckThroughput:true, constraintQueue:true, constraintMeasured:true }, second: { bottleneckThroughput:true, downstreamStarvation:true, constraintMeasured:true, flowOrWaste:true } },
  { expected: "SDCA", first: { standardWorkEstablished:false, basicConditionsStable:false, processStable:false }, second: { standardWorkEstablished:false, basicConditionsStable:false, customerAffected:false } },
  { expected: "KT_DECISION", first: { decisionBetweenOptions:true, mandatoryCriteriaDefined:true, preferenceCriteriaDefined:true, decisionOwnerKnown:true }, second: { decisionBetweenOptions:true, mandatoryCriteriaDefined:true, preferenceCriteriaDefined:true, hasMeasurementData:true } },
];

const cases: GoldenCase[] = archetypes.flatMap((archetype, index) => [
  { name: `${index + 1}A`, expected: archetype.expected, features: archetype.first },
  { name: `${index + 1}B`, expected: archetype.expected, features: archetype.second },
]);

describe("30 vakalık metodoloji sınıflandırma kataloğu", () => {
  it("15 metodolojinin tamamında açık ve en az üç boyutlu kanıt profili vardır", () => {
    expect(Object.keys(METHOD_EVIDENCE_PROFILES).sort()).toEqual([...METHODOLOGIES].sort());
    for (const profile of Object.values(METHOD_EVIDENCE_PROFILES)) {
      expect(profile.requiredDimensions.length).toBeGreaterThanOrEqual(3);
      expect(profile.minimumSupportingSignals).toBeGreaterThanOrEqual(3);
    }
    for (const method of METHODOLOGIES) {
      const categories = METHOD_EVIDENCE_CATEGORIES[method];
      expect(categories.required.length).toBeGreaterThanOrEqual(3);
      expect(categories.strengthening.length).toBeGreaterThanOrEqual(categories.required.length);
      expect(categories.conflicting.length).toBe(categories.strengthening.length);
      expect(categories.applicability.length).toBeGreaterThan(0);
    }
  });
  it("her desteklenen yöntem için iki bağımsız arketip içerir", () => {
    expect(cases).toHaveLength(30);
    expect(new Set(cases.map((item) => item.expected)).size).toBe(15);
  });

  it("30 golden vakanın pozitif, ters-polarite ve bilinmiyor varyantlarını kesinlik açısından ayırır", () => {
    for (const golden of cases) {
      let positive = createEmptyProblem();
      let negative = createEmptyProblem();
      for (const [key, value] of Object.entries(golden.features)) {
        positive = withFeature(positive, key as DiagnosticFeatureKey, value);
        negative = withFeature(negative, key as DiagnosticFeatureKey, !value);
      }
      expect(diagnose(positive, 3).ranking[0].methodology).toBe(golden.expected);
      const negativeResult = diagnose(negative, 3);
      expect(negativeResult.evidence.status === "PROVISIONAL" || negativeResult.ranking[0].methodology !== golden.expected).toBe(true);
      expect(diagnose(createEmptyProblem(), 3).evidence.status).toBe("PROVISIONAL");
    }
  });

  for (const golden of cases) {
    it(`${golden.name} → ${golden.expected}`, () => {
      let problem = createEmptyProblem();
      for (const [key, value] of Object.entries(golden.features)) {
        problem = withFeature(problem, key as DiagnosticFeatureKey, value);
      }
      expect(diagnose(problem, 4).ranking[0].methodology).toBe(golden.expected);
    });
  }
});
