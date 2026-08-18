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
import { buildDecisionTrace, buildContrastiveTrace, DecisionTrace, ContrastiveEntry } from "./decision-trace";
import { detectContestedSignals, ContestedSignal } from "./contested-signals";
import { composeMethodologyPlan, MethodologyPlan } from "./methodology-composition";
import { explainRivals, RivalExplanation } from "./rival-analysis";
import { evaluateStabilizationGate, StabilizationGate } from "./stabilization";
import type { Methodology } from "./methodologies";
import { METHOD_EVIDENCE_PROFILES } from "./evidence-profiles";
import { evaluateRecommendation, RecommendationVerdict } from "./recommendation";

// Geriye dönük uyumluluk: profiller bir zamanlar burada tanımlıydı.
export * from "./evidence-profiles";

export interface DiagnosisConfig {
  temperature?: number;
  stop?: Partial<StopPolicy>;
  /** Daha önce sorulmuş ama belirsiz kalan alanlar — tekrar sorulmaz. */
  excludedFeatures?: DiagnosticFeatureKey[];
  /** Parserdan gelip henüz kullanıcıca teyit edilmemiş alanlar sıralamayı etkiler,
   * fakat sonucu "doğrulanmış" ilan eden kanıt sayısına girmez. */
  unconfirmedFeatures?: DiagnosticFeatureKey[];
}

export interface NextQuestion {
  featureKey: DiagnosticFeatureKey;
  /** LLM'in doğal soruya çevirmesi için tema; UI fallback olarak da kullanılabilir. */
  theme: string;
  informationGain: number;
  /** Bu sorunun ayırdığı yöntem çifti — yoksa null. */
  separates: { ifYes: Methodology; ifNo: Methodology } | null;
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
  /** Lider ve en yakın rakip için destek/itiraz sinyalleri yan yana. */
  contrastive: ContrastiveEntry[];
  /** İki bağımsız kanıt gövdesi birden varsa çakışma ve birleştirme sırası. */
  contested: ContestedSignal | null;
  /**
   * SIRALAMA LİDERİ ≠ ÖNERİ. Bu hüküm, öne çıkan adayın gerçekten önerilecek
   * kadar kanıta dayanıp dayanmadığını söyler; dayanmıyorsa `recommended` null
   * olur ve adaylar arka planda saklanır.
   */
  recommendation: RecommendationVerdict;
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
  const contrastive = buildContrastiveTrace(p, evaluation, ranking);
  const contested = detectContestedSignals(p, evaluation, ranking);
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

  const recommendation = evaluateRecommendation({
    problem: p,
    ranking,
    contested,
    knownAnswers: evidence.knownAnswers,
    contradictionLoad: conflicts.length,
    evidenceReady: evidence.ready,
  });

  const nextQuestion: NextQuestion | null =
    stop || !candidate
      ? null
      : {
          featureKey: candidate.featureKey,
          theme: FEATURE_META[candidate.featureKey].questionTheme,
          informationGain: candidate.informationGain,
          separates: candidate.separates,
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
    contrastive,
    contested,
    recommendation,
  };
}
