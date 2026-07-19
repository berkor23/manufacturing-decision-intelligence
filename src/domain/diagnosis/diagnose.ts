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
import { evaluateStabilizationGate, StabilizationGate } from "./stabilization";

export interface DiagnosisConfig {
  temperature?: number;
  stop?: Partial<StopPolicy>;
  /** Daha önce sorulmuş ama belirsiz kalan alanlar — tekrar sorulmaz. */
  excludedFeatures?: DiagnosticFeatureKey[];
}

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
  stabilization: StabilizationGate;
}

export interface DiagnosisEvidence {
  knownAnswers: number;
  supportingSignals: number;
  supportingFeatures: DiagnosticFeatureKey[];
  scoreMargin: number;
  conflicts: string[];
  ready: boolean;
  status: "PROVISIONAL" | "CONFIRMED";
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
  const stabilization = evaluateStabilizationGate(p);
  const leader = ranking[0];
  const supportingFeatures = new Set<DiagnosticFeatureKey>();
  for (const firing of evaluation.firings) {
    if ((firing.effect[leader.methodology] ?? 0) <= 0) continue;
    for (const key of firing.rule.reads) {
      if (p.features[key] !== null) supportingFeatures.add(key);
    }
  }
  const evidenceBase = {
    knownAnswers: knownFeatures(p).length,
    supportingSignals: supportingFeatures.size,
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
  const ready =
    evidenceBase.knownAnswers >= policy.minimumKnownAnswers &&
    evidenceBase.supportingSignals >= policy.minimumSupportingSignals &&
    evidenceBase.scoreMargin >= policy.minimumScoreMargin &&
    conflicts.length === 0;
  const evidence: DiagnosisEvidence = {
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
    stabilization,
  };
}
