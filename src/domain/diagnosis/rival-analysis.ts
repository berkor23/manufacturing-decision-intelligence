// Rival Analysis — "neden diğer yöntemler değil" gerekçesini deterministik üretir. SAF.
//
// İlke: açıklama LLM çıktısı DEĞİLDİR. Her açıklama iki statik kaynaktan kurulur:
//   1) METHODOLOGY_IDENTITY — yöntemin cevapladığı soru ve varlık nedeni (makale sesi),
//   2) FEATURE_META — problemin şu anki gerçek durumu (kararı tetikleyen alanlardan).
// Yani metin, makaledeki gibi "bu yöntem şunun içindir; oysa bu problemde şu var"
// biçiminde okunur — bir kalite mühendisinin gerekçesi gibi, üretilmiş prosa gibi değil.
//
// İki durum ayrılır:
//  - SUPPRESSED: yöntem en az bir kuralca AKTİF olarak cezalandırıldı. Yöntemin özü +
//    onu geri iten alanların şu anki gerçeği ("Bu problemde ise …") birleştirilir.
//  - WEAKER: yönteme itiraz eden kural yok; kısmen geçerli ama lider daha güçlü kanıta
//    dayanıyor.

import {
  StructuredProblem,
  FEATURE_META,
  DiagnosticFeatureKey,
} from "./features";
import { Methodology, METHODOLOGY_IDENTITY } from "./methodologies";
import { RuleEvaluation, RuleFiring } from "./rule-engine";
import { MethodologyConfidence } from "./confidence-engine";

export type RivalReasonKind = "SUPPRESSED" | "WEAKER";

export interface RivalExplanation {
  methodology: Methodology;
  kind: RivalReasonKind;
  /** Yöntemin net skoru. */
  score: number;
  /** Lider ile arasındaki ham puan farkı (pozitif = lider önde). */
  scoreGapToLeader: number;
  /** Yöntemin cevapladığı temel soru (makale sesi). */
  question: string;
  /** Tam gerekçe: yöntemin özü + bu problemde neden yeri olmadığı. */
  reason: string;
}

/** Türkçe: bir cümlenin ortasına yerleştirmek için ilk harfi küçült. */
function lowerFirst(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toLocaleLowerCase("tr-TR") + text.slice(1);
}

/** Bir kural tetiklemesinin gösterdiği şu anki gerçek(ler)i FEATURE_META'dan üretir. */
function factsForFiring(firing: RuleFiring, p: StructuredProblem): string[] {
  const keys: DiagnosticFeatureKey[] = firing.rule.traceFeature
    ? [firing.rule.traceFeature]
    : firing.rule.reads;
  const facts: string[] = [];
  for (const key of keys) {
    const v = p.features[key];
    if (v === null) continue;
    facts.push(v ? FEATURE_META[key].traceWhenTrue : FEATURE_META[key].traceWhenFalse);
  }
  return facts;
}

function joinFacts(facts: string[]): string {
  const parts = facts.map(lowerFirst);
  if (parts.length <= 1) return parts.join("");
  return parts.slice(0, -1).join(", ") + " ve " + parts[parts.length - 1];
}

/**
 * Önerilen (lider) yöntem dışındaki, kararla GERÇEKTEN etkileşen yöntemler için
 * "neden değil" gerekçelerini üretir. Problemle hiç etkileşmeyen (hiç kural
 * tetiklemeyen) yöntemler bilinçli olarak listelenmez — onlar için söylenecek
 * anlamlı bir şey yoktur ve listeyi gürültüye boğar.
 *
 * @param limit En fazla kaç yöntem açıklansın (varsayılan 4).
 */
export function explainRivals(
  p: StructuredProblem,
  evaluation: RuleEvaluation,
  ranking: MethodologyConfidence[],
  limit = 4,
): RivalExplanation[] {
  const leader = ranking[0];
  if (!leader) return [];

  const out: RivalExplanation[] = [];

  for (const candidate of ranking) {
    if (candidate.methodology === leader.methodology) continue;

    const positive: RuleFiring[] = [];
    const negative: RuleFiring[] = [];
    for (const firing of evaluation.firings) {
      const delta = firing.effect[candidate.methodology];
      if (delta === undefined || delta === 0) continue;
      (delta > 0 ? positive : negative).push(firing);
    }

    // Yöntem kararla hiç etkileşmediyse (ne destek ne itiraz) — atla.
    if (positive.length === 0 && negative.length === 0) continue;

    const identity = METHODOLOGY_IDENTITY[candidate.methodology];
    const kind: RivalReasonKind = negative.length > 0 ? "SUPPRESSED" : "WEAKER";

    let reason: string;
    if (kind === "SUPPRESSED") {
      // Aktif itiraz varsa: yöntemin özü + bu problemdeki gerçeği karşılaştır.
      const facts = [...new Set(negative.flatMap((f) => factsForFiring(f, p)))];
      reason = facts.length > 0
        ? `${identity.essence} Bu problemde ise ${joinFacts(facts)}; bu yüzden burada yeri yok.`
        : `${identity.essence} Bu problemin doğası bu yönteme uymuyor.`;
    } else {
      // İtiraz yok ama lider daha güçlü: yöntemin KENDİ sorusunu öne alıp, bu
      // problemde neden ikincil kaldığını söyle — her yöntemde farklı okunur.
      reason = `${identity.essence} “${identity.question}” burada geçerli bir soru, ama vakanın asıl sorusu değil; öne çıkan yöntem bu probleme daha güçlü ve daha çok kanıtla yanıt veriyor.`;
    }

    out.push({
      methodology: candidate.methodology,
      kind,
      score: candidate.score,
      scoreGapToLeader: leader.score - candidate.score,
      question: identity.question,
      reason,
    });

    if (out.length >= limit) break;
  }

  return out;
}
