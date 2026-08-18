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

/* ─────────────────────────────────────────────────────────────────────────────
   Karşıtlıklı karar izi (contrastive trace)
   ─────────────────────────────────────────────────────────────────────────────
   Yukarıdaki buildDecisionTrace yalnız KAZANANIN lehindeki nedenleri toplar.
   Bu, kararın neden verildiğini anlatır ama neden ÖTEKİ olmadığını anlatmaz.
   Aşağıdaki yapı her aday için iki listeyi birlikte tutar: onu destekleyen (+)
   ve ona itiraz eden (−) kural tetiklemeleri. Böylece kullanıcı iki sütunu yan
   yana okuyup kararı kendi kafasında yeniden kurabilir.

   Not: burada da hiçbir metin üretilmez; her satır ya kuralın kendi gerekçesi
   ya da FEATURE_META'daki alan gerçeğidir. */

export interface ContrastiveSignal {
  because: string;
  delta: number;
  featureKey: DiagnosticFeatureKey | null;
}

export interface ContrastiveEntry {
  methodology: Methodology;
  score: number;
  /** Bu yöntemi ileri iten kural tetiklemeleri (katkıya göre azalan). */
  supporting: ContrastiveSignal[];
  /** Bu yönteme itiraz eden kural tetiklemeleri (itiraz gücüne göre azalan). */
  opposing: ContrastiveSignal[];
}

function signalsFor(
  methodology: Methodology,
  p: StructuredProblem,
  evaluation: RuleEvaluation,
  sign: 1 | -1,
): ContrastiveSignal[] {
  const out: ContrastiveSignal[] = [];
  for (const firing of evaluation.firings) {
    const delta = firing.effect[methodology];
    if (delta === undefined || delta === 0) continue;
    if (sign > 0 ? delta < 0 : delta > 0) continue;

    const tf = firing.rule.traceFeature;
    let because = firing.because;
    let featureKey: DiagnosticFeatureKey | null = null;
    if (tf) {
      const value = p.features[tf];
      featureKey = tf;
      const meta = FEATURE_META[tf];
      because = value === true ? meta.traceWhenTrue : value === false ? meta.traceWhenFalse : because;
    }
    out.push({ because, delta, featureKey });
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Sıralamanın ilk `count` adayı için destek/itiraz çiftini üretir.
 * Varsayılan 2: karar her zaman bir ikili karşılaştırmayla okunur.
 */
export function buildContrastiveTrace(
  p: StructuredProblem,
  evaluation: RuleEvaluation,
  ranking: MethodologyConfidence[],
  count = 2,
): ContrastiveEntry[] {
  return ranking.slice(0, count).map((entry) => ({
    methodology: entry.methodology,
    score: entry.score,
    supporting: signalsFor(entry.methodology, p, evaluation, 1),
    opposing: signalsFor(entry.methodology, p, evaluation, -1),
  }));
}
