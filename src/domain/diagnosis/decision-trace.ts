// Decision Trace — kararın nedenini deterministik olarak zincire döker. SAF.
// Kaynak: kural tetiklemeleri (RuleFiring). LLM değil.

import { StructuredProblem, FEATURE_META, DiagnosticFeatureKey } from "./features";
import { Methodology } from "./methodologies";
import { RuleEvaluation } from "./rule-engine";
import { MethodologyConfidence } from "./confidence-engine";

export interface DecisionTraceStep {
  /** Tekil kurallarda ilgili alan; bileşik kurallarda null. */
  featureKey: DiagnosticFeatureKey | null;
  value: boolean | null;
  because: string;
  /** Kazanan metodolojiye bu adımın katkısı. */
  delta: number;
}

export interface DecisionTrace {
  steps: DecisionTraceStep[];
  conclusion: { methodology: Methodology; confidence: number };
}

/**
 * Kazanan metodolojiye POZİTİF katkı yapan kural tetiklemelerini, katkı
 * büyüklüğüne göre sıralayıp bir gerekçe zinciri üretir.
 */
export function buildDecisionTrace(
  p: StructuredProblem,
  evaluation: RuleEvaluation,
  ranking: MethodologyConfidence[],
): DecisionTrace {
  const winner = ranking[0];

  const steps: DecisionTraceStep[] = [];
  for (const firing of evaluation.firings) {
    const delta = firing.effect[winner.methodology];
    if (delta === undefined || delta <= 0) continue; // yalnızca lehteki nedenler

    const tf = firing.rule.traceFeature;
    let featureKey: DiagnosticFeatureKey | null = null;
    let value: boolean | null = null;
    let because = firing.because;

    if (tf) {
      const v = p.features[tf];
      featureKey = tf;
      value = v === null ? null : v;
      const meta = FEATURE_META[tf];
      because = v === true ? meta.traceWhenTrue : v === false ? meta.traceWhenFalse : because;
    }

    steps.push({ featureKey, value, because, delta });
  }

  steps.sort((a, b) => b.delta - a.delta);

  return {
    steps,
    conclusion: { methodology: winner.methodology, confidence: winner.confidence },
  };
}
