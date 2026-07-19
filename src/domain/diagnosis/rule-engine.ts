// Rule Engine — kuralları çalıştırıp metodoloji skorlarını üretir. SAF/deterministik.

import { StructuredProblem } from "./features";
import { Methodology, zeroScores } from "./methodologies";
import { Rule, RULES } from "./rules";

export interface RuleFiring {
  ruleId: string;
  because: string;
  effect: Partial<Record<Methodology, number>>;
  rule: Rule;
}

export interface RuleEvaluation {
  scores: Record<Methodology, number>;
  firings: RuleFiring[];
}

export function evaluateRules(
  p: StructuredProblem,
  rules: Rule[] = RULES,
): RuleEvaluation {
  const scores = zeroScores();
  const firings: RuleFiring[] = [];

  for (const rule of rules) {
    if (!rule.when(p)) continue;
    for (const [methodology, delta] of Object.entries(rule.effect)) {
      scores[methodology as Methodology] += delta as number;
    }
    firings.push({
      ruleId: rule.id,
      because: rule.because,
      effect: rule.effect,
      rule,
    });
  }

  return { scores, firings };
}
