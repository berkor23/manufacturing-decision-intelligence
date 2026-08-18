// Öneri uygunluğu (recommendation eligibility) — SAF.
//
// ÇEKİRDEK AYRIM: sıralamanın bir lideri olması, o yöntemi ÖNERMEK için yeterli
// kanıt olduğu anlamına gelmez.
//
// Softmax her zaman bir birinci üretir; skorların hepsi sıfıra yakınken bile
// biri öne çıkar. Bunu "önerilen metodoloji" diye sunmak, sistemin bilmediğini
// biliyormuş gibi göstermesidir — bir karar destek sisteminin yapabileceği en
// pahalı hata budur.
//
// Bu modül dört girdi ailesinden bir KARARA VARILABİLİRLİK hükmü üretir:
//   net destek · bağımsız kanıt boyutları · çelişki yükü · ayrım payı
//
// Eşikler kör sabit DEĞİLDİR: her yöntemin kendi kanıt profilinden
// (METHOD_EVIDENCE_PROFILES) türetilir. Bir yöntem için "anlamlı ayrım" ne
// kadarsa, önerilebilirlik eşiği de odur.

import type { StructuredProblem } from "./features";
import type { Methodology } from "./methodologies";
import type { MethodologyConfidence } from "./confidence-engine";
import { METHOD_EVIDENCE_PROFILES } from "./evidence-profiles";
import type { ContestedSignal } from "./contested-signals";

export type RecommendationStatus =
  /** Yeterli ayırt edici kanıt var; yöntem önerilebilir. */
  | "RECOMMENDED"
  /** İki yaklaşımın da bağımsız güçlü kanıt gövdesi var; sıra kurulur, biri elenmez. */
  | "CONTESTED"
  /** Bir aday önde ama önemli kanıt eksik; çalışma hipotezi olarak kullanılır. */
  | "PROVISIONAL"
  /** Sıralama oluşmuş olsa bile metodoloji önermek anlamsız. */
  | "INSUFFICIENT_EVIDENCE"
  /** Olay kapanmış: neden doğrulanmış, tekrar yok, koruma gerekmiyor. */
  | "NO_FORMAL_METHOD_NEEDED";

export interface EligibilityComponents {
  /** Liderin ham net puanı. */
  netSupport: number;
  /** Liderin KENDİ profilinden karşılanan bağımsız kanıt boyutu sayısı. */
  independentDimensions: number;
  /** Liderin profilinin toplam boyut sayısı. */
  requiredDimensions: number;
  /** 0..1 — kanıt gövdesinin tamamlanma oranı. */
  evidenceCompleteness: number;
  /** Kullanıcı tarafından doğrulanmış cevap sayısı. */
  knownAnswers: number;
  /** İkinci adayla arasındaki ham puan farkı. */
  scoreMargin: number;
  /** Birbiriyle tutarsız yanıt sayısı. */
  contradictionLoad: number;
  /** Bu yöntem için "anlamlı ayrım" sayılan eşik (profilden gelir). */
  meaningfulSupport: number;
}

export interface RecommendationVerdict {
  status: RecommendationStatus;
  /** Önerilebiliyorsa yöntem; abstention durumlarında null. */
  recommended: Methodology | null;
  /** Abstention'da bile arka planda saklanan öne çıkan adaylar. */
  candidates: Methodology[];
  components: EligibilityComponents;
  /** Kullanıcıya gösterilecek tek cümlelik gerekçe. */
  reason: string;
}

/** Liderin profilinden kaç bağımsız boyut karşılanıyor? */
function satisfiedDimensions(methodology: Methodology, p: StructuredProblem): number {
  return METHOD_EVIDENCE_PROFILES[methodology].requiredDimensions.filter((dimension) =>
    dimension.some(({ feature, value }) => p.features[feature] === value),
  ).length;
}

/**
 * "Kapanmış olay" örüntüsü: neden doğrulanmış, olay tekrar etmiyor, koruma
 * gerekmiyor, sistemik bir kayıp yok ve ortada bir iyileştirme hedefi de yok.
 *
 * Bu, kanıt YETERSİZLİĞİNDEN farklıdır: burada bilgi eksik değil — bilgi tam
 * ve kapsamlı bir metodoloji projesine gerek olmadığını söylüyor.
 */
function isClosedIncident(p: StructuredProblem): boolean {
  const f = p.features;
  return (
    f.rootCauseKnown === true &&
    f.previouslyOccurred === false &&
    f.chronicEquipmentLoss !== true &&
    f.chronicPerformanceGap !== true &&
    f.containmentNeeded !== true &&
    f.externalNonconformance !== true &&
    f.isImprovementInitiative !== true &&
    f.bottleneckThroughput !== true &&
    f.isNewDesign !== true
  );
}

export interface EligibilityInput {
  problem: StructuredProblem;
  ranking: MethodologyConfidence[];
  contested: ContestedSignal | null;
  knownAnswers: number;
  contradictionLoad: number;
  /** diagnose()'un kendi kanıt kapısı: zorunlu boyutlar + çelişki denetimi. */
  evidenceReady: boolean;
}

/**
 * Sıralamadan bir ÖNERİ hükmü türetir.
 *
 * Sıra bilinçlidir: önce "önermeye değer mi?" sorulur, sonra "hangisi?".
 * Bu, düşük kanıtlı bir liderin kesin öneri gibi görünmesini yapısal olarak
 * imkânsız kılar.
 */
export function evaluateRecommendation(input: EligibilityInput): RecommendationVerdict {
  const { problem, ranking, contested, knownAnswers, contradictionLoad, evidenceReady } = input;
  const leader = ranking[0];
  const profile = METHOD_EVIDENCE_PROFILES[leader.methodology];

  const independentDimensions = satisfiedDimensions(leader.methodology, problem);
  const requiredDimensions = profile.requiredDimensions.length;
  const scoreMargin = leader.score - (ranking[1]?.score ?? 0);

  const components: EligibilityComponents = {
    netSupport: leader.score,
    independentDimensions,
    requiredDimensions,
    evidenceCompleteness: requiredDimensions === 0 ? 0 : independentDimensions / requiredDimensions,
    knownAnswers,
    scoreMargin,
    contradictionLoad,
    // Yöntemin kendi "anlamlı ayrım" eşiği. Sabit bir sayı seçmiyoruz: her
    // yöntem kaç puanlık farkı anlamlı saydığını kendi profilinde söylüyor.
    meaningfulSupport: profile.minimumScoreMargin,
  };

  // Arka planda saklanan adaylar: pozitif kanıtı olan ilk üç yöntem.
  const candidates = ranking
    .filter((entry) => entry.score > 0)
    .slice(0, 3)
    .map((entry) => entry.methodology);

  // ── 1. Önermeye değer bir kanıt gövdesi var mı? ─────────────────────────
  const supportTooThin =
    leader.score < components.meaningfulSupport || independentDimensions === 0;

  if (supportTooThin) {
    if (isClosedIncident(problem)) {
      return {
        status: "NO_FORMAL_METHOD_NEEDED",
        recommended: null,
        candidates,
        components,
        reason:
          "Kök neden doğrulanmış, olay tekrar etmiyor ve koruma gerekmiyor. Bu vaka kapsamlı bir metodoloji çalışması gerektirmiyor; bilinen karşı önlemi uygulayıp etkisini doğrulamak yeterli.",
      };
    }
    return {
      status: "INSUFFICIENT_EVIDENCE",
      recommended: null,
      candidates,
      components,
      reason:
        "Şu aşamada belirli bir metodolojiyi önermek için yeterli ayırt edici kanıt yok. Sıralamada bir aday öne çıkmış olabilir, ancak dayandığı kanıt gövdesi bir öneriyi taşıyacak kadar güçlü değil.",
    };
  }

  // ── 2. Yeterli sayıda doğrulanmış cevap var mı? ─────────────────────────
  if (knownAnswers < profile.minimumKnownAnswers) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      recommended: null,
      candidates,
      components,
      reason: `Bu yöntemin doğrulanması için en az ${profile.minimumKnownAnswers} ayırt edici cevap gerekiyor; şu an ${knownAnswers} cevap var.`,
    };
  }

  // ── 3. İki karakter birden mi var? ──────────────────────────────────────
  if (contested) {
    const [first, second] = contested.sides;
    return {
      status: "CONTESTED",
      recommended: leader.methodology,
      candidates,
      components,
      reason: `Problem tek bir karakter taşımıyor: hem ${first.methodology} hem ${second.methodology} kendi bağımsız kanıtına dayanıyor. Doğru cevap birini elemek değil, aralarındaki sırayı kurmak.`,
    };
  }

  // ── 4. Zorunlu kanıt kapısı geçildi mi? ─────────────────────────────────
  if (evidenceReady) {
    return {
      status: "RECOMMENDED",
      recommended: leader.methodology,
      candidates,
      components,
      reason:
        "Yöntemin gerektirdiği bağımsız kanıt boyutlarının tamamı karşılandı ve en yakın alternatifle arasında anlamlı bir fark var.",
    };
  }

  const missing = requiredDimensions - independentDimensions;
  return {
    status: "PROVISIONAL",
    recommended: leader.methodology,
    candidates,
    components,
    reason:
      contradictionLoad > 0
        ? "Bir aday öne çıktı ancak yanıtlar arasında doğrulanması gereken çelişki var; sonucu kesin seçim değil çalışma hipotezi olarak kullanın."
        : `Bir aday öne çıktı ancak kanıt gövdesi tamamlanmadı (${missing} boyut eksik); sonucu çalışma hipotezi olarak kullanın.`,
  };
}

/** Öneri yapılabiliyor mu? (UI ve raporlar için kısa yol) */
export function isRecommendable(status: RecommendationStatus): boolean {
  return status === "RECOMMENDED" || status === "CONTESTED" || status === "PROVISIONAL";
}
