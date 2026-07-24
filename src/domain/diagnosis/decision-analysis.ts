// Decision Analysis — Kepner-Tregoe Karar Analizi'nin SAF/deterministik motoru.
//
// İlke (mimariyle uyumlu): kararı LLM değil, bu motor verir. Girdi tanımlı
// alternatifler ve kriterlerdir; çıktı gerekçeli bir sıralamadır.
//
// KT Karar Analizi mantığı:
//   1) MUST kriterleri go/no-go'dur: birini bile karşılamayan alternatif ELENİR
//      (WANT puanı ne kadar yüksek olursa olsun).
//   2) Elenmeyen alternatifler WANT kriterleriyle puanlanır: Σ (ağırlık × skor).
//   3) En yüksek normalize WANT puanı önerilir; ikinciyle arası dar ise "riskli/
//      yakın" olarak işaretlenir (kör güven verilmez).
// Tüm adımlar açıklanabilir (trace); hiçbir yerde LLM yoktur.

export type CriterionKind = "MUST" | "WANT";

export interface DecisionCriterion {
  id: string;
  label: string;
  kind: CriterionKind;
  /** WANT için önem ağırlığı (1..10). MUST için yok sayılır. */
  weight?: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  /**
   * Kriter kimliği → değer.
   *  - MUST kriteri için: boolean (karşılıyor mu). null/undefined = bilinmiyor → eleme
   *    yapılmaz ama "doğrulanmamış" sayılır.
   *  - WANT kriteri için: 0..10 puan. null/undefined = 0 sayılır.
   */
  scores: Record<string, number | boolean | null | undefined>;
}

export interface WantContribution {
  criterionId: string;
  label: string;
  weight: number;
  score: number;
  contribution: number; // weight * score
}

export interface OptionEvaluation {
  option: DecisionOption;
  eliminated: boolean;
  /** Karşılanmayan MUST kriterlerinin etiketleri (eleme gerekçesi). */
  failedMusts: string[];
  /** Değeri bilinmeyen MUST kriterleri (doğrulanması gereken). */
  unverifiedMusts: string[];
  weightedTotal: number;
  maxPossible: number;
  /** 0..1 — weightedTotal / maxPossible. */
  normalized: number;
  wantBreakdown: WantContribution[];
}

export interface DecisionAnalysisResult {
  ranked: OptionEvaluation[];
  recommended: OptionEvaluation | null;
  /** Öneri ile ikinci arasındaki normalize fark (0..1). null = tek/sıfır aday. */
  margin: number | null;
  /** Öneri kırılgan mı (dar fark). */
  close: boolean;
  /** İnsan-okur gerekçe zinciri (deterministik). */
  trace: string[];
}

/** Öneri ile ikinci sıradaki arasındaki fark bu eşiğin altındaysa "yakın/kırılgan". */
export const CLOSE_MARGIN_THRESHOLD = 0.1;

function clampScore(v: number | boolean | null | undefined): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(10, v));
}

function evaluateOption(
  option: DecisionOption,
  musts: DecisionCriterion[],
  wants: DecisionCriterion[],
): OptionEvaluation {
  const failedMusts: string[] = [];
  const unverifiedMusts: string[] = [];
  for (const m of musts) {
    const v = option.scores[m.id];
    if (v === true) continue;
    if (v === false) failedMusts.push(m.label);
    else unverifiedMusts.push(m.label); // null/undefined/sayısal → doğrulanmamış
  }

  const wantBreakdown: WantContribution[] = wants.map((w) => {
    const weight = Math.max(1, Math.min(10, w.weight ?? 1));
    const score = clampScore(option.scores[w.id]);
    return { criterionId: w.id, label: w.label, weight, score, contribution: weight * score };
  });

  const weightedTotal = wantBreakdown.reduce((a, b) => a + b.contribution, 0);
  const maxPossible = wants.reduce((a, w) => a + Math.max(1, Math.min(10, w.weight ?? 1)) * 10, 0);
  const normalized = maxPossible > 0 ? weightedTotal / maxPossible : 0;

  return {
    option,
    eliminated: failedMusts.length > 0,
    failedMusts,
    unverifiedMusts,
    weightedTotal,
    maxPossible,
    normalized,
    wantBreakdown,
  };
}

/**
 * Alternatifleri KT Karar Analizi'yle değerlendirir. Deterministik ve açıklanabilir.
 * Eşit puanlarda option dizisindeki sıra korunur (kararlı sıralama).
 */
export function analyzeDecision(
  criteria: DecisionCriterion[],
  options: DecisionOption[],
): DecisionAnalysisResult {
  const musts = criteria.filter((c) => c.kind === "MUST");
  const wants = criteria.filter((c) => c.kind === "WANT");

  const evaluations = options.map((o) => evaluateOption(o, musts, wants));

  // Sıralama: önce elenmeyenler (normalize azalan), sonra elenenler.
  const ranked = evaluations
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      if (a.e.eliminated !== b.e.eliminated) return a.e.eliminated ? 1 : -1;
      return b.e.normalized - a.e.normalized || a.i - b.i;
    })
    .map(({ e }) => e);

  const survivors = ranked.filter((e) => !e.eliminated);
  const recommended = survivors[0] ?? null;
  const runnerUp = survivors[1] ?? null;
  const margin = recommended && runnerUp ? recommended.normalized - runnerUp.normalized : null;
  const close = margin !== null && margin < CLOSE_MARGIN_THRESHOLD;

  const trace: string[] = [];
  for (const e of ranked) {
    if (e.eliminated) {
      trace.push(`${e.option.label} elendi: zorunlu (MUST) kriter karşılanmadı — ${e.failedMusts.join(", ")}.`);
    }
  }
  if (recommended) {
    const pct = Math.round(recommended.normalized * 100);
    trace.push(`Önerilen: ${recommended.option.label} (ağırlıklı WANT skoru ${pct}/100).`);
    if (recommended.unverifiedMusts.length > 0) {
      trace.push(`Dikkat: ${recommended.option.label} için doğrulanmamış zorunlu kriter var — ${recommended.unverifiedMusts.join(", ")}.`);
    }
    if (close && runnerUp) {
      trace.push(`Karar kırılgan: ${runnerUp.option.label} ile fark dar; seçileni olası olumsuz sonuçlar açısından da tartın.`);
    }
  } else {
    trace.push("Hiçbir alternatif tüm zorunlu (MUST) kriterleri karşılamadı; kriterleri veya alternatifleri gözden geçirin.");
  }

  return { ranked, recommended, margin, close, trace };
}
