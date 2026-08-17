// Domain fasadı — bir teşhis adımını (tur) birleştirir. SAF/deterministik.
// application katmanı her turda bunu çağırır; LLM/DB burada YOKtur.

import { StructuredProblem, DiagnosticFeatureKey, FEATURE_META, knownFeatures } from "./features";
import { evaluateRules } from "./rule-engine";
import {
  computeConfidence,
  rankingEntropy,
  MethodologyConfidence,
  DEFAULT_TEMPERATURE,
} from "./confidence-engine";
import {
  selectNextQuestion,
  shouldStop,
  StopPolicy,
  DEFAULT_STOP_POLICY,
} from "./question-engine";
import { buildDecisionTrace, DecisionTrace } from "./decision-trace";
import { composeMethodologyPlan, MethodologyPlan } from "./methodology-composition";
import { explainRivals, RivalExplanation } from "./rival-analysis";
import { evaluateStabilizationGate, StabilizationGate } from "./stabilization";
import type { Methodology } from "./methodologies";

export interface DiagnosisConfig {
  temperature?: number;
  stop?: Partial<StopPolicy>;
  /** Daha önce sorulmuş ama belirsiz kalan alanlar — tekrar sorulmaz. */
  excludedFeatures?: DiagnosticFeatureKey[];
  /** Parserdan gelip henüz kullanıcıca teyit edilmemiş alanlar sıralamayı etkiler,
   * fakat sonucu "doğrulanmış" ilan eden kanıt sayısına girmez. */
  unconfirmedFeatures?: DiagnosticFeatureKey[];
}

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

export interface NextQuestion {
  featureKey: DiagnosticFeatureKey;
  /** LLM'in doğal soruya çevirmesi için tema; UI fallback olarak da kullanılabilir. */
  theme: string;
  informationGain: number;
}

export interface DiagnosisSnapshot {
  ranking: MethodologyConfidence[];
  entropy: number;
  /** Durma ölçütü sağlandıysa null. */
  nextQuestion: NextQuestion | null;
  concluded: boolean;
  /** Mevcut lider için gerekçe zinciri. */
  trace: DecisionTrace;
  evidence: DiagnosisEvidence;
  methodPlan: MethodologyPlan;
  /** Önerilmeyen yöntemler için "neden değil" gerekçeleri (deterministik). */
  rivalAnalysis: RivalExplanation[];
  stabilization: StabilizationGate;
}

export interface DiagnosisEvidence {
  knownAnswers: number;
  supportingSignals: number;
  supportingFeatures: DiagnosticFeatureKey[];
  scoreMargin: number;
  conflicts: string[];
  ready: boolean;
  status: "PROVISIONAL" | "CONFIRMED" | "INCONCLUSIVE";
}

/**
 * Verilen StructuredProblem ve şimdiye dek sorulan soru sayısı için tam bir
 * teşhis anlık görüntüsü üretir: sıralama, entropi, sonraki soru (ya da sonuç), trace.
 */
export function diagnose(
  p: StructuredProblem,
  questionsAsked: number = 0,
  config: DiagnosisConfig = {},
): DiagnosisSnapshot {
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  const policy: StopPolicy = { ...DEFAULT_STOP_POLICY, ...config.stop };

  const evaluation = evaluateRules(p);
  const ranking = computeConfidence(evaluation.scores, temperature);
  const entropy = rankingEntropy(ranking);
  const trace = buildDecisionTrace(p, evaluation, ranking);
  const methodPlan = composeMethodologyPlan(ranking);
  const rivalAnalysis = explainRivals(p, evaluation, ranking);
  const stabilization = evaluateStabilizationGate(p);
  const leader = ranking[0];
  const unconfirmed = new Set(config.unconfirmedFeatures ?? []);
  const profile = METHOD_EVIDENCE_PROFILES[leader.methodology];
  // "Bağımsız destek" kuralın okuduğu her dolu alan değildir. Her requiredDimension
  // tek bir kanıt boyutudur; boyut içindeki alternatiflerden en az biri beklenen
  // değerde ve kullanıcı tarafından doğrulanmışsa yalnız bir destek sayılır.
  const matchedDimensions = profile.requiredDimensions.map((dimension) =>
    dimension.filter(({ feature, value }) =>
      !unconfirmed.has(feature) && p.features[feature] === value,
    ),
  );
  const supportingFeatures = new Set<DiagnosticFeatureKey>(
    matchedDimensions.flat().map(({ feature }) => feature),
  );
  const confirmedKnownAnswers = knownFeatures(p)
    .filter((feature) => !unconfirmed.has(feature)).length;
  const evidenceBase = {
    knownAnswers: confirmedKnownAnswers,
    supportingSignals: matchedDimensions.filter((matches) => matches.length > 0).length,
    supportingFeatures: [...supportingFeatures],
    scoreMargin: leader.score - (ranking[1]?.score ?? 0),
  };
  const conflicts: string[] = [];
  if (p.features.externalNonconformance === true && p.features.defectOccurred === false) {
    conflicts.push("Müşteriye ulaşmış uygunsuzluk belirtilirken gerçekleşmiş hata olmadığı bildirildi.");
  }
  if (p.features.chronicEquipmentLoss === true && p.features.equipmentBreakdown === false) {
    conflicts.push("Kronik ekipman kaybı belirtilirken ekipman sorunu olmadığı bildirildi.");
  }
  if (p.features.monitoringNeed === true && p.features.processStable === false) {
    conflicts.push("Sürekli izleme istenirken proses kararlılığı doğrulanmadı.");
  }
  const dimensionsReady = matchedDimensions.every((matches) => matches.length > 0);
  const ready =
    evidenceBase.knownAnswers >= profile.minimumKnownAnswers &&
    evidenceBase.supportingSignals >= profile.minimumSupportingSignals &&
    evidenceBase.scoreMargin >= profile.minimumScoreMargin &&
    dimensionsReady &&
    conflicts.length === 0;
  let evidence: DiagnosisEvidence = {
    ...evidenceBase,
    conflicts,
    ready,
    status: ready ? "CONFIRMED" : "PROVISIONAL",
  };

  const candidate = selectNextQuestion(p, {
    temperature,
    excludedFeatures: config.excludedFeatures,
  });
  const bestGain = candidate ? candidate.informationGain : null;

  const stop = shouldStop(ranking, questionsAsked, bestGain, policy, evidence);

  if (stop && !ready) {
    evidence = { ...evidence, status: "INCONCLUSIVE" };
  }

  const nextQuestion: NextQuestion | null =
    stop || !candidate
      ? null
      : {
          featureKey: candidate.featureKey,
          theme: FEATURE_META[candidate.featureKey].questionTheme,
          informationGain: candidate.informationGain,
        };

  return {
    ranking,
    entropy,
    nextQuestion,
    concluded: nextQuestion === null,
    trace,
    evidence,
    methodPlan,
    rivalAnalysis,
    stabilization,
  };
}
