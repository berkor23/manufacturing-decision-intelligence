// Kanıt profilleri — her metodolojinin doğrulanmış sayılmadan önce karşılaması
// gereken BAĞIMSIZ kanıt boyutları. Ayrı modül olmasının nedeni: hem sonuçlandırma
// kapısı (diagnose) hem çakışma denetimi (contested-signals) aynı tanımı okur;
// tek dosyada dursaydı iki yön arasında döngüsel bağımlılık oluşurdu.

import type { DiagnosticFeatureKey } from "./features";
import type { Methodology } from "./methodologies";

export interface EvidenceExpectation {
  feature: DiagnosticFeatureKey;
  value: boolean;
}

export interface MethodEvidenceProfile {
  minimumKnownAnswers: number;
  minimumSupportingSignals: number;
  minimumScoreMargin: number;
  /** Her iç dizi bir bağımsız kanıt boyutudur; gruptan beklenen değerlerden en az biri gerekir. */
  requiredDimensions: EvidenceExpectation[][];
}

const yes = (feature: DiagnosticFeatureKey): EvidenceExpectation => ({ feature, value: true });
const no = (feature: DiagnosticFeatureKey): EvidenceExpectation => ({ feature, value: false });

/** Her metodolojinin doğrulanmadan önce karşılaması gereken bağımsız kanıt omurgası. */
export const METHOD_EVIDENCE_PROFILES: Record<Methodology, MethodEvidenceProfile> = {
  FMEA: {
    minimumKnownAnswers: 4,
    minimumSupportingSignals: 5,
    minimumScoreMargin: 2,
    requiredDimensions: [
      [no("defectOccurred")],
      [yes("processChanged"), yes("operatorChanged"), yes("supplierChanged"), yes("isNewDesign")],
      [yes("failureModeKnown"), yes("humanErrorProne"), yes("safetyOrRegulatory")],
      [yes("potentialEffectKnown")],
      [yes("controlAdequacyUncertain")],
    ],
  },
  KEPNER_TREGOE: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("startedRecently")],
      [yes("processChanged"), yes("operatorChanged"), yes("supplierChanged")],
      [yes("comparisonAvailable"), yes("intermittent")],
    ],
  },
  RCA: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("defectOccurred")],
      [no("rootCauseKnown")],
      [yes("previouslyOccurred"), yes("intermittent"), yes("safetyOrRegulatory")],
    ],
  },
  EIGHT_D: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("defectOccurred")],
      [yes("externalNonconformance"), yes("customerAffected")],
      [yes("containmentNeeded"), no("rootCauseKnown")],
    ],
  },
  PDCA_A3: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("isImprovementInitiative")],
      [yes("standardWorkEstablished")],
      [yes("basicConditionsStable"), yes("processStable")],
    ],
  },
  DMAIC: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("hasMeasurementData")],
      [yes("highVariation")],
      [yes("measurementReliable"), no("processStable")],
    ],
  },
  FIVE_S: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("workplaceDisorganized")],
      [no("standardWorkEstablished")],
      [no("basicConditionsStable")],
    ],
  },
  TPM: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("equipmentBreakdown")],
      [yes("chronicEquipmentLoss")],
      [yes("previouslyOccurred")],
    ],
  },
  LEAN_VSM: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("flowOrWaste")],
      [yes("hasMeasurementData"), yes("isImprovementInitiative")],
      [no("bottleneckThroughput")],
    ],
  },
  DMADV: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("isNewDesign")],
      [no("defectOccurred")],
      [yes("hasMeasurementData"), yes("safetyOrRegulatory"), yes("failureModeKnown")],
    ],
  },
  SPC: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("monitoringNeed")],
      [yes("processStable")],
      [yes("measurementReliable")],
    ],
  },
  POKA_YOKE: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("humanErrorProne")],
      [yes("failureModeKnown")],
      [yes("rootCauseKnown")],
    ],
  },
  TOC: {
    minimumKnownAnswers: 4,
    minimumSupportingSignals: 4,
    minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("bottleneckThroughput")],
      [yes("constraintQueue"), yes("downstreamStarvation"), yes("flowOrWaste")],
      [yes("constraintMeasured"), yes("hasMeasurementData")],
      [yes("constraintLeverageExpected")],
    ],
  },
  SDCA: {
    minimumKnownAnswers: 4, minimumSupportingSignals: 3, minimumScoreMargin: 2,
    requiredDimensions: [
      [no("standardWorkEstablished")],
      [no("basicConditionsStable")],
      [no("processStable")],
    ],
  },
  KT_DECISION: {
    minimumKnownAnswers: 4,
    minimumSupportingSignals: 5,
    minimumScoreMargin: 2,
    requiredDimensions: [
      [yes("decisionBetweenOptions")],
      [yes("multipleAlternativesDefined")],
      [yes("mandatoryCriteriaDefined"), yes("preferenceCriteriaDefined")],
      [yes("decisionOwnerKnown"), yes("hasMeasurementData")],
      [no("unresolvedCauseBeforeDecision")],
    ],
  },
};

export interface MethodEvidenceCategories {
  required: EvidenceExpectation[];
  strengthening: EvidenceExpectation[];
  conflicting: EvidenceExpectation[];
  applicability: EvidenceExpectation[];
}

/**
 * Profildeki boyutları denetlenebilir dört kategoriye açar. Aynı kaynak kullanıldığı
 * için soru rotası ile sonuçlandırma kapısı birbirinden kopuk iki listeye dönüşmez.
 */
export const METHOD_EVIDENCE_CATEGORIES = Object.fromEntries(
  Object.entries(METHOD_EVIDENCE_PROFILES).map(([methodology, profile]) => {
    const all = profile.requiredDimensions.flat();
    return [methodology, {
      required: profile.requiredDimensions.map((dimension) => dimension[0]),
      strengthening: all,
      conflicting: all.map((expectation) => ({ ...expectation, value: !expectation.value })),
      applicability: profile.requiredDimensions[0] ?? [],
    }];
  }),
) as Record<Methodology, MethodEvidenceCategories>;

