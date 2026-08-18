// Çakışan sinyaller — bir problemin AYNI ANDA birden fazla yöntemi hak
// etmesini gizlemek yerine görünür kılar. SAF/deterministik.
//
// Neden gerekli: sıralama tek bir kazanan ilan eder, ama sahadaki bazı
// problemler gerçekten iki karakter taşır. Klasik örnek: "makine kronik
// arızalı" (TPM) + "aynı makine sistemin darboğazı" (TOC). Bu durumda tek
// yöntemi seçip ötekini elemek karar kalitesini düşürür; doğru cevap ikisinin
// SIRASINI kurmaktır — kısıt önceliklendirmesi içinde güvenilirlik çalışması.
//
// Bu modül bir yöntemi seçmez, skorları DEĞİŞTİRMEZ. Yalnızca kural
// tetiklemelerini okuyup "burada iki bağımsız kanıt gövdesi var" der.

import { StructuredProblem, FEATURE_META, DiagnosticFeatureKey } from "./features";
import { Methodology, METHODOLOGY_META, METHODOLOGY_IDENTITY } from "./methodologies";
import { RuleEvaluation, RuleFiring } from "./rule-engine";
import { METHOD_EVIDENCE_PROFILES } from "./evidence-profiles";
import { MethodologyConfidence } from "./confidence-engine";

export interface ContestedSide {
  methodology: Methodology;
  /** Bu yöntemi destekleyen pozitif ham puan toplamı. */
  support: number;
  /** Desteği üreten, kullanıcı yanıtlarından okunan somut gerçekler. */
  facts: string[];
}

export interface ContestedSignal {
  sides: [ContestedSide, ContestedSide];
  /** İki karakterin nasıl birlikte yürütüleceği — sıra önerisi. */
  integration: string;
}

/** İki bağımsız kanıt gövdesi sayılması için gereken asgari pozitif puan. */
const MIN_SUPPORT = 4;
/**
 * Rakibin KENDİ kanıt profilinden bağımsız olarak karşılaması gereken asgari
 * boyut sayısı. Tek boyut yeterli değildir: "henüz hata yok" gibi liderin de
 * içinde bulunduğu bağlamdan doğan tek bir eşleşme, ayrı bir problem karakteri
 * anlamına gelmez — yalnız aynı bağlamın yan ürünüdür.
 */
const MIN_INDEPENDENT_DIMENSIONS = 2;
/**
 * Rakip desteğinin lidere oranı bu eşiğin üstündeyse "çakışma" sayılır.
 * 0.5 = "rakip, liderin bağımsız desteğinin en az yarısına KENDİ BAŞINA sahip".
 * Daha yükseği gerçek çift-karakterli vakaları (kronik arızalı darboğaz gibi)
 * gözden kaçırır; daha düşüğü her ikinci adayı çakışma ilan eder.
 */
const CONTEST_RATIO = 0.5;

/**
 * Bilinen çift reçeteleri. Sıra rastgele değildir: her metin hangi yöntemin
 * ÖNCE, hangisinin onun içinde çalışacağını söyler. Anahtar, iki yöntem kodunun
 * alfabetik sırayla birleşimidir.
 */
const INTEGRATIONS: Record<string, string> = {
  "TOC|TPM":
    "Önce kısıtı yönetin: güvenilirlik çalışmasını sistemin tümüne değil, çıktıyı belirleyen ekipmana odaklayın. TPM araçları (kayıp analizi, otonom bakım, temel koşullar) burada TOC'nin “kısıtı sömür” adımının içeriğini oluşturur. Kısıt dışındaki ekipmanda aynı yatırımı yapmak toplam çıktıyı artırmaz.",
  "LEAN_VSM|TOC":
    "Değer akışını uçtan uca haritalayın, ancak iyileştirme sırasını kısıta göre kurun: kısıt öncesi israfın giderilmesi yalnız ara stoğu büyütür. VSM görünürlüğü verir, TOC önceliği belirler.",
  "DMAIC|RCA":
    "Problem hem kronik varyasyon hem de belirli bir sapma karakteri taşıyor. Önce sapmanın zaman çizelgesini netleştirin: değişiklik tarihinden önceki ve sonraki veri ayrı ayrı değerlendirilmezse istatistiksel analiz iki farklı prosesi tek dağılım sanır.",
  "EIGHT_D|RCA":
    "8D yönetim çerçevesini, RCA ise onun D4 (kök neden) adımını taşır. İkisi rakip değildir: müşteri iletişimi ve koruma 8D disipliniyle, nedenin kanıtlanması RCA araçlarıyla yürütülür.",
  "DMAIC|SPC":
    "Önce nedenleri bulup varyasyonu düşürün, sonra kazanılan seviyeyi kontrol kartıyla sabitleyin. Kontrol kartını iyileştirme öncesinde kurmak, kararsız bir prosese sınır çizmek olur.",
  "PDCA_A3|SDCA":
    "Önce SDCA ile standardı ve temel koşulları oturtun; PDCA döngüsü ancak kararlı bir taban üzerinde ölçülebilir sonuç üretir. Aksi hâlde iyileştirmenin etkisi ile standartsızlığın gürültüsü birbirinden ayrılamaz.",
  "FMEA|POKA_YOKE":
    "FMEA riskleri önceliklendirir, Poka-Yoke en yüksek öncelikli hata modunu yapısal olarak imkânsız kılar. Poka-Yoke bir aksiyondur; FMEA onun nereye uygulanacağını belirler.",
  "DMADV|FMEA":
    "Yeni tasarım akışı ana omurgadır; FMEA bu akışın içinde tasarım ve proses risklerini değerlendiren adımdır. İkisini ayrı proje gibi yürütmeyin.",
  "KEPNER_TREGOE|RCA":
    "Önce Kepner-Tregoe ile sapmanın sınırlarını (IS / IS-NOT) çizin; daraltılmış alan RCA'nın hipotez havuzunu küçültür. Sınır çizilmeden yapılan kök neden analizi tüm fabrikayı arar.",
  "FIVE_S|SDCA":
    "5S fiziksel düzeni, SDCA yöntem standardını kurar. Aynı işin iki yüzüdür; tek bir stabilizasyon çalışması altında birlikte yürütün.",
};

function pairKey(a: Methodology, b: Methodology): string {
  return [a, b].sort().join("|");
}

/** Bir kural tetiklemesinin dayandığı, kullanıcı yanıtlarından okunan gerçekler. */
function factsForFiring(firing: RuleFiring, p: StructuredProblem): string[] {
  const keys: DiagnosticFeatureKey[] = firing.rule.traceFeature
    ? [firing.rule.traceFeature]
    : firing.rule.reads;
  const facts: string[] = [];
  for (const key of keys) {
    const value = p.features[key];
    if (value === null) continue;
    facts.push(value ? FEATURE_META[key].traceWhenTrue : FEATURE_META[key].traceWhenFalse);
  }
  return facts;
}

/**
 * Rakip, kendi kanıt profilinin kaç bağımsız boyutunu karşılıyor?
 * Aynı tanım sonuçlandırma kapısında da kullanılır; çakışma ilanı ile
 * "doğrulanmış" ilanı böylece tek kaynaktan beslenir.
 */
function satisfiedDimensions(methodology: Methodology, p: StructuredProblem): number {
  const profile = METHOD_EVIDENCE_PROFILES[methodology];
  return profile.requiredDimensions.filter((dimension) =>
    dimension.some(({ feature, value }) => p.features[feature] === value),
  ).length;
}

function sideFor(
  methodology: Methodology,
  p: StructuredProblem,
  evaluation: RuleEvaluation,
): ContestedSide {
  let support = 0;
  const facts = new Set<string>();
  for (const firing of evaluation.firings) {
    const delta = firing.effect[methodology];
    if (delta === undefined || delta <= 0) continue;
    support += delta;
    for (const fact of factsForFiring(firing, p)) facts.add(fact);
  }
  return { methodology, support, facts: [...facts] };
}

/**
 * Lider ile ona en yakın rakip GERÇEKTEN iki ayrı kanıt gövdesine mi dayanıyor?
 * Öyleyse çakışmayı ve birleştirme sırasını döndürür; değilse null.
 *
 * Ölçüt bilerek ham POZİTİF puandır, softmax değil: softmax farkı, negatif
 * kurallar rakibi bastırdığında da büyür — oysa burada sorulan soru
 * "rakibin kendi lehine bağımsız kanıtı var mı?"dır.
 */
export function detectContestedSignals(
  p: StructuredProblem,
  evaluation: RuleEvaluation,
  ranking: MethodologyConfidence[],
): ContestedSignal | null {
  const leader = ranking[0];
  if (!leader) return null;

  const leaderSide = sideFor(leader.methodology, p, evaluation);
  if (leaderSide.support < MIN_SUPPORT) return null;

  let best: ContestedSide | null = null;
  for (const candidate of ranking) {
    if (candidate.methodology === leader.methodology) continue;
    const side = sideFor(candidate.methodology, p, evaluation);

    // (1) Kendi başına anlamlı bir pozitif kanıt gövdesi olmalı.
    if (side.support < MIN_SUPPORT) continue;
    if (side.support < leaderSide.support * CONTEST_RATIO) continue;

    // (2) Kurallarca AKTİF olarak bastırılmış bir yöntem çakışma sayılmaz.
    //     Pozitif puanı yüksek olsa bile net puanı çökmüşse, motor onu zaten
    //     reddetmiştir; onu "eş geçerli ikinci yaklaşım" diye sunmak, verilen
    //     kararla çelişen bir mesaj üretir.
    if (candidate.score <= 0) continue;
    if (candidate.score < leader.score * CONTEST_RATIO) continue;

    // (3) Kanıt gövdesi BAĞIMSIZ olmalı: rakibin kendi profilinden en az iki
    //     boyut karşılanmalı. Tek boyut, liderle paylaşılan bağlamın yan
    //     ürünü olabilir ve ayrı bir problem karakteri göstermez.
    if (satisfiedDimensions(candidate.methodology, p) < MIN_INDEPENDENT_DIMENSIONS) continue;

    if (!best || side.support > best.support) best = side;
  }
  if (!best) return null;

  const known = INTEGRATIONS[pairKey(leaderSide.methodology, best.methodology)];
  const integration =
    known && known.length > 0
      ? known
      : `Ana omurga ${METHODOLOGY_META[leaderSide.methodology].shortName} kalır; ` +
        `${METHODOLOGY_META[best.methodology].shortName} ise onun içinde ayrı bir soruyu ` +
        `(“${METHODOLOGY_IDENTITY[best.methodology].question}”) yanıtlayan bir adım olarak ` +
        `yürütülür. İki ayrı çalışma açmak kanıtı böler.`;

  return { sides: [leaderSide, best], integration };
}
