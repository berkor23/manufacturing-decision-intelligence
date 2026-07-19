import { diagnose, type DiagnosisConfig } from "./diagnose";
import { FEATURE_KEYS, FEATURE_META, withFeature, type DiagnosticFeatureKey, type StructuredProblem } from "./features";
import type { Methodology } from "./methodologies";

export interface DiagnosisCounterfactual {
  featureKey: DiagnosticFeatureKey;
  assumedValue: boolean;
  from: Methodology;
  to: Methodology;
  confidence: number;
  explanation: string;
}

export function diagnosisCounterfactuals(problem: StructuredProblem, questionsAsked = 0, config: DiagnosisConfig = {}): DiagnosisCounterfactual[] {
  const baseline = diagnose(problem, questionsAsked, config).ranking[0];
  if (!baseline) return [];
  const results: DiagnosisCounterfactual[] = [];
  for (const key of FEATURE_KEYS) {
    const current = problem.features[key];
    const values = current === null ? [true, false] : [!current];
    for (const value of values) {
      const leader = diagnose(withFeature(problem, key, value), questionsAsked, config).ranking[0];
      if (!leader || leader.methodology === baseline.methodology) continue;
      results.push({
        featureKey: key, assumedValue: value, from: baseline.methodology, to: leader.methodology,
        confidence: leader.confidence,
        explanation: value ? FEATURE_META[key].traceWhenTrue : FEATURE_META[key].traceWhenFalse,
      });
    }
  }
  return results.sort((a,b)=>b.confidence-a.confidence).slice(0,8);
}
