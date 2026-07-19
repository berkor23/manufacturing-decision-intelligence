// Confidence Engine — skorları güven dağılımına (softmax) çevirir. SAF.
//
// UYARI: Bu yüzdeler başta *göreli güven*tir, kalibre olasılık değil
// (bkz. docs/ARCHITECTURE.md §6). Kalibrasyon Faz 6'da yapılacaktır.

import { Methodology, METHODOLOGIES } from "./methodologies";

/** Softmax sıcaklığı. Küçük T → keskin, büyük T → temkinli dağılım.
 *  Geniş metodoloji havuzunda softmax seyreldiği için 1.2'ye çekildi (lider daha net). */
export const DEFAULT_TEMPERATURE = 1.2;

export interface MethodologyConfidence {
  methodology: Methodology;
  score: number;
  confidence: number; // 0..1
}

/**
 * Skorları softmax ile güven dağılımına çevirir, güvene göre azalan sıralı döner.
 * Eşit skorlarda METHODOLOGIES sırasıyla deterministik.
 */
export function computeConfidence(
  scores: Record<Methodology, number>,
  temperature: number = DEFAULT_TEMPERATURE,
): MethodologyConfidence[] {
  const T = temperature > 0 ? temperature : DEFAULT_TEMPERATURE;

  // Sayısal kararlılık için maksimumu çıkararak üstel al.
  const raw = METHODOLOGIES.map((m) => scores[m] / T);
  const max = Math.max(...raw);
  const exps = raw.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);

  const result: MethodologyConfidence[] = METHODOLOGIES.map((m, i) => ({
    methodology: m,
    score: scores[m],
    confidence: exps[i] / sum,
  }));

  // Güvene göre azalan; eşitlikte METHODOLOGIES sırası (indeks) korunur.
  return result
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.confidence - a.r.confidence || a.i - b.i)
    .map(({ r }) => r);
}

/** Olasılık dağılımının Shannon entropisi (bit). Belirsizlik ölçüsü. */
export function entropy(probabilities: number[]): number {
  let h = 0;
  for (const p of probabilities) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

/** Güven dağılımının entropisi (kısa yol). */
export function rankingEntropy(ranking: MethodologyConfidence[]): number {
  return entropy(ranking.map((r) => r.confidence));
}
