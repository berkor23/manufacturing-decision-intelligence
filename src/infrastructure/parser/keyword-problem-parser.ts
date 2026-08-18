// Deterministik, LLM'siz parser — Türkçe anahtar kelime eşlemesi.
// Amaç: Ollama olmadan da tüm hattı uçtan uca çalıştırabilmek + testlerde
// deterministik davranış. LLM parser (llm-problem-parser) devreye girince
// bunun yerini alır; ama bu her zaman güvenli bir yedek (fallback) kalır.

import {
  IProblemParser,
  InitialParse,
  InterpretAnswerInput,
} from "@/application/ports/problem-parser";
import { DiagnosticFeatureKey, Ternary } from "@/domain/diagnosis";

type Signal = { key: DiagnosticFeatureKey; value: boolean; patterns: RegExp[] };

// Not: Sıra önemlidir; daha spesifik (false) kalıplar önce denenmelidir.
const SIGNALS: Signal[] = [
  // rootCauseKnown — önce açık "bilinmiyor", sonra "biliniyor"
  { key: "rootCauseKnown", value: false, patterns: [/kök neden.*(bilinmiyor|belirsiz|yok)/, /neden(i|ini)? bilinmiyor/, /sebeb(i|ini)? belirsiz/] },
  { key: "rootCauseKnown", value: true, patterns: [
    /kök neden.*(biliniyor|belli|biliyoruz|bulundu|bulduk|belirlendi|tespit edildi|doğrulandı)/,
    /neden(i|ini)? (?:belli|biliyoruz|bulduk|belirledik|tespit ettik)/,
    /kök neden.*(?:tespit|teşhis) edil/,
  ] },

  { key: "customerAffected", value: false, patterns: [/müşteri.*etkilenmed/, /müşteri (?:şikâyeti|şikayeti|şikâyet|şikayet).*(?:yok|gelmed)/, /şikâyet yok/, /şikayet yok/] },
  { key: "customerAffected", value: true, patterns: [/müşteri/, /şikayet/, /şikâyet/, /iade/, /sahadan/, /sevkiyat/] },
  { key: "defectOccurred", value: false, patterns: [
    /(?:hata|arıza|kusur|uygunsuzluk).*(?:yok|oluşmad|yaşanmad|görülmed|gerçekleşmed)/,
    /henüz.*(?:hata|arıza|kusur|uygunsuzluk).*(?:yok|oluşmad|yaşanmad|görülmed|gerçekleşmed)/,
    /(?:henüz|şu ana kadar).*(?:oluşan|yaşanan|görülen|gerçekleşen).*(?:hata|arıza|kusur).*(?:yok)/,
    /sadece risk/, /yalnızca risk/, /risk var.*hata yok/,
  ] },
  { key: "defectOccurred", value: true, patterns: [/hata/, /kusur/, /çatlak/, /arıza/, /hurda/, /\bred\b/, /kırıl/, /kaçak/, /deform/] },

  { key: "isImprovementInitiative", value: true, patterns: [/iyileştir/, /kaizen/, /optimize/, /geliştir(mek|me)/, /verimlilik/] },

  { key: "previouslyOccurred", value: true, patterns: [/tekrar/, /yine/, /daha önce.*(yaşan|old)/, /geçmişte de/, /sürekli.*(oluyor|yaşan)/] },
  { key: "startedRecently", value: true, patterns: [/yeni başla/, /son.*(hafta|gün|ay)/, /geçen hafta/, /bu hafta/, /aniden/, /\dgün(dür)?/, /haftadır/, /başladı/] },

  { key: "processChanged", value: true, patterns: [/süreç değiş/, /parametre değiş/, /ayar değiş/, /yeni makine/, /revizyon/, /proses değiş/, /proses.*(?:geçilecek|devreye alınacak|değiştirilecek)/] },
  { key: "operatorChanged", value: true, patterns: [/operatör değiş/, /vardiya değiş/, /yeni personel/, /yeni operatör/] },
  { key: "supplierChanged", value: true, patterns: [
    /tedarikçi.*(?:değiş|geçiş|geçilecek|değiştirilecek)/,
    /(?:yeni|alternatif).*(?:tedarikçi|malzeme|hammadde)/,
    /(?:malzeme|hammadde|yapıştırıcı).*(?:değiş|geçiş|geçilecek|kullanılacak)/,
    /yeni parti/,
  ] },

  { key: "hasMeasurementData", value: true, patterns: [/ölçüm/, /veri var/, /\bdata\b/, /kayıt(lar)?/, /\bspc\b/, /grafik/, /trend/] },
  { key: "highVariation", value: true, patterns: [/varyasyon/, /değişkenlik/, /salınım/, /dağılım geniş/, /stabil değil/, /oynak/] },

  // Genişletilmiş metodoloji sinyalleri
  { key: "isNewDesign", value: false, patterns: [/yeni (ürün|süreç|proses|tasarım).*(değil|değildir)/, /mevcut (ürün|süreç|proses)/, /seri üretimdeki/] },
  { key: "isNewDesign", value: true, patterns: [/yeni ürün/, /yeni tasarım/, /sıfırdan tasarl/, /tasarl(ıyoruz|anıyor|amak)/, /\bdfss\b/, /\bdmadv\b/] },
  { key: "equipmentBreakdown", value: false, patterns: [
    /(?:makine|ekipman|tezg[aâ]h|arıza|duruş).*(?:yok|oluşmad|yaşanmad|görülmed)/,
    /henüz.*(?:arıza|duruş).*(?:yok|oluşmad|yaşanmad|görülmed)/,
    /(?:makine|ekipman|tezg[aâ]h).*(?:seçim|alternatif|teklif|satın al|yatırım)/,
  ] },
  { key: "equipmentBreakdown", value: true, patterns: [/arıza/, /makine durd/, /ekipman.*(?:durd|arıza|bozul)/, /duruş/, /\bbakım\b/, /motor yan/, /rulman/, /tezg[aâ]h durd/] },
  { key: "workplaceDisorganized", value: true, patterns: [/dağınık/, /düzensiz/, /karışık/, /aletler yerinde değil/, /\b5s\b/, /temiz değil/, /organize değil/] },
  { key: "bottleneckThroughput", value: true, patterns: [/dar boğaz/, /darboğaz/, /kapasite/, /throughput/, /çıktı yetersiz/, /yetişmiyor/, /\bkısıt\b/] },
  { key: "flowOrWaste", value: false, patterns: [
    /açık bekleme süresi/, /kürlenme süresi/, /kuruma süresi/, /proses bekleme (?:süresi|limiti)/,
    /reaksiyon süresi/, /çevrim içi bekletme limiti/,
  ] },
  { key: "flowOrWaste", value: true, patterns: [/israf/, /istasyon.*bekle/, /malzeme.*bekle/, /operatör.*bekle/, /kuyruk/, /\bw(?:i|ı)p\b/, /ara stok/, /taşıma/, /temin süresi/, /teslim süresi/, /akış (sorun|problem)/, /lead time/] },
  { key: "humanErrorProne", value: true, patterns: [/insan hatası/, /operatör hatası/, /yanlış montaj/, /ters tak/, /unut/, /karıştır/, /poka/] },
  { key: "monitoringNeed", value: true, patterns: [/kontrol kartı/, /sürekli izle/, /sürekli takip/, /monitör/, /kontrol altında tut/] },
  { key: "safetyOrRegulatory", value: true, patterns: [/güvenlik/, /iş güvenliği/, /yaralanma/, /regülasyon/, /yasal/, /\bce\b/, /geri çağır/, /recall/] },
  { key: "intermittent", value: true, patterns: [/ara ara/, /bazen/, /sporadik/, /zaman zaman/, /aralıklı/, /kesintili/] },
  { key: "externalNonconformance", value: true, patterns: [/müşteriye.*(ulaşt|gitti)/, /sahadan iade/, /müşteride.*(hata|kusur|uygunsuz)/] },
  { key: "containmentNeeded", value: true, patterns: [/ayıklama/, /blokaj/, /karantina/, /geçici önlem/, /containment/] },
  { key: "measurementReliable", value: true, patterns: [/ölçüm sistemi.*(güvenilir|doğruland)/, /gage r&r/, /msa.*(uygun|geçti)/, /tekrarlanabilir ölçüm/] },
  { key: "processStable", value: true, patterns: [/istatistiksel.*kararlı/, /proses.*stabil/, /kontrol altında/] },
  { key: "comparisonAvailable", value: true, patterns: [/karşılaştır/, /olan.*olmayan/, /is.?is.not/] },
  { key: "chronicEquipmentLoss", value: true, patterns: [/kronik.*(arıza|duruş|kayıp)/, /tekrar eden.*(arıza|duruş)/, /oee.*düş/] },
  { key: "failureModeKnown", value: true, patterns: [/hata modu.*(belli|biliniyor|tanımlı)/, /yanlış işlem.*tanımlı/] },
  // Standardın "var" olması YERLEŞİK olduğu anlamına gelmez. Dokümanın varlığını
  // fiilî uygulamadan ayıran kalıplar önce denenir; aksi hâlde "talimat var ama
  // kimse uygulamıyor" cümlesi standardı yerleşik sayar ve SDCA'yı bastırır.
  { key: "standardWorkEstablished", value: false, patterns: [
    /standart iş.*(yok|eksik|uygulanmıyor)/,
    /standart.*(?:uygulanmıyor|uygulamıyor|uyulmuyor|takip edilmiyor|geçerli değil)/,
    /(?:kimse|hiçbiri|hiç kimse).*uygulam(?:ıyor|az)/,
    /talimat.*(?:uygulanmıyor|uygulamıyor|dikkate alınmıyor)/,
    /k[aâ]ğıt üzerinde/,
    /vardiya.*farklı yöntem/, /herkes.*farklı yap/,
  ] },
  { key: "standardWorkEstablished", value: true, patterns: [/standart iş.*(var|tanımlı|uygulanıyor)/, /standart operasyon.*tanımlı/] },
  { key: "basicConditionsStable", value: false, patterns: [/temel koşul.*(sağlanmıyor|eksik)/, /4m.*(değişken|kararsız)/] },
  { key: "basicConditionsStable", value: true, patterns: [/temel koşul.*(sağlanıyor|kararlı)/, /4m.*(kararlı|kontrol altında)/] },

  { key: "decisionBetweenOptions", value: true, patterns: [/hangisini seç/, /hangisini tercih/, /alternatifler? aras/, /seçenekler? aras/, /iki (seçenek|alternatif|tedarikçi|makine|yöntem|teklif)/, /iki .*teklif.*arasında/, /teklif.*arasında.*(?:seçim|karar)/, /karar ver(memiz|ilmesi|eceğiz)/, /kıyasl(a|ıyoruz)/, /hangi (tedarikçi|makine|yöntem|teklif|opsiyon)/] },
  { key: "mandatoryCriteriaDefined", value: true, patterns: [/zorunlu kriter/, /olmazsa olmaz/, /mutlaka karşıla/, /eleme kriter/] },
  { key: "preferenceCriteriaDefined", value: true, patterns: [/tercih kriter/, /ağırlıklı kriter/, /ağırlıklandır/, /maliyet.*servis.*(?:çevrim|teslim)/] },
  { key: "decisionOwnerKnown", value: true, patterns: [/karar sahibi/, /son kararı .* verecek/, /karar mercii/] },
  { key: "multipleAlternativesDefined", value: true, patterns: [/iki (?:somut |gerçek )?(?:seçenek|alternatif|tedarikçi|makine|tezg[aâ]h|yöntem|teklif)/, /en az iki alternatif/, /alternatifler (?:belli|tanımlı|hazır)/] },
  { key: "unresolvedCauseBeforeDecision", value: false, patterns: [/kök neden problemi yok/, /önce çözülmesi gereken (?:arıza|problem) yok/, /seçimi engelleyen (?:arıza|problem) yok/] },
  { key: "unresolvedCauseBeforeDecision", value: true, patterns: [/seçimden önce.*kök neden/, /önce.*(?:arıza|sapma|problem).*(?:çöz|nedenini bul)/] },
  { key: "constraintQueue", value: true, patterns: [/(?:önünde|öncesinde).*(?:kuyruk|ara stok|birik)/, /(?:kuyruk|ara stok).*(?:önünde|öncesinde)/] },
  { key: "downstreamStarvation", value: true, patterns: [/(?:sonraki|diğer|aşağı akış).*(?:boş kal|malzeme bekle|aç kal)/, /kısıt sonrası.*(?:boş|bekle)/] },
  { key: "constraintMeasured", value: true, patterns: [/(?:kapasite|saatlik çıktı).*(?:talep|ihtiyaç).*(?:veri|karşılaştır)/, /kapasite ve talep ver/] },
  { key: "constraintLeverageExpected", value: true, patterns: [/kısıt.*(?:iyileş|kapasite).*(?:toplam|sistem).*(?:çıktı|throughput).*(?:artar|artacak)/, /toplam çıktı.*kısıt.*(?:artar|artacak)/] },
  { key: "potentialEffectKnown", value: true, patterns: [/potansiyel (?:etki|sonuç).*(?:belli|tanımlı|biliniyor)/, /hata gerçekleşirse.*(?:müşteri|güvenlik|kalite|proses).*(?:etki|sonuç)/] },
  { key: "controlAdequacyUncertain", value: true, patterns: [/(?:önleme|yakalama|mevcut) kontrol.*(?:belirsiz|doğrulanmad|yeterli mi)/, /kontrol.*yeni koşul.*(?:çalışır mı|belirsiz)/] },
];

const YES = [/\bevet\b/, /\bvar\b/, /oldu/, /etkilendi/, /değişti/, /biliniyor/, /yüksek/, /\bdoğru\b/, /geçti/, /mevcut/, /\baynen\b/];
const NO = [/\bhayır\b/, /\byok\b/, /olmadı/, /etkilenmedi/, /değişmedi/, /bilinmiyor/, /düşük/, /stabil/, /\bdeğil\b/, /\byanlış\b/];
const UNKNOWN = [/bilmiyorum/, /emin değil/, /belirsiz/, /fikrim yok/];

function normalize(s: string): string {
  return s.toLocaleLowerCase("tr");
}

function scopedOccurrence(
  text: string,
  positive: RegExp[],
  negative: RegExp[],
): boolean | undefined {
  const clauses = text.split(/[.!?;\n]+|\b(?:ancak|fakat|ama)\b/).map((item) => item.trim()).filter(Boolean);
  let explicitNegative = false;
  let hypotheticalOnly = false;
  for (const clause of clauses) {
    const negated = negative.some((pattern) => pattern.test(clause));
    if (negated) {
      explicitNegative = true;
      continue;
    }
    // Karşı-olgusal kip: "arızalar olmasa da yetmiyor" cümlesi bir arıza
    // BİLDİRMEZ; tersine, olgunun yokluğunda bile sonucun sürdüğünü söyler.
    // TPM ile TOC'yi ayıran cümleler tam olarak bu kalıptadır ve yüzeysel
    // okuma burada güvenilirlik kaybı ile yapısal kısıtı birbirine karıştırır.
    const hypothetical =
      /(?:oluşabilir|olabilir|yaşanabilir|görülebilir|gerçekleşebilir|riski|ihtimali|olasılığı)/.test(clause) ||
      /(?:olmasa|olmadığı (?:zaman|günlerde|halde|durumda)|olmadan|yaşanmadığı)/.test(clause);
    const positiveHere = positive.some((pattern) => pattern.test(clause));
    if (!hypothetical && positiveHere) return true;
    if (hypothetical && positiveHere) hypotheticalOnly = true;
  }
  // Olgu YALNIZCA karşı-olgusal ya da olasılık kipinde geçtiyse bildirilmiş bir
  // olay yoktur; alanı "hayır" olarak okumak doğru cevaptır.
  if (hypotheticalOnly) return false;
  return explicitNegative ? false : undefined;
}

export class KeywordProblemParser implements IProblemParser {
  readonly name = "keyword";

  async parseInitial(text: string): Promise<InitialParse> {
    const t = normalize(text);
    const features: Partial<Record<DiagnosticFeatureKey, Ternary>> = {};

    for (const sig of SIGNALS) {
      if (features[sig.key] !== undefined) continue; // ilk (en spesifik) eşleşme kazanır
      if (sig.patterns.some((re) => re.test(t))) {
        features[sig.key] = sig.value;
      }
    }

    const scopedDefect = scopedOccurrence(
      t,
      [/\bhata\b/, /kusur/, /çatlak/, /\barıza\b/, /hurda/, /kırıl/, /kaçak/, /deform/, /uygunsuzluk/],
      [/(?:hata|arıza|kusur|uygunsuzluk).*(?:yok|oluşmad|yaşanmad|görülmed|gerçekleşmed)/, /henüz.*(?:hata|arıza|kusur|uygunsuzluk).*(?:yok|oluşmad|yaşanmad|görülmed|gerçekleşmed)/],
    );
    if (scopedDefect !== undefined) features.defectOccurred = scopedDefect;

    const scopedEquipment = scopedOccurrence(
      t,
      // "arıza / arızalar / arızası" çekimlerini görür, ama "arızalanmadığı"
      // gibi olumsuz çekimlere takılmaz — karşı-olgusal cümlelerin doğru
      // sınıflanması buna bağlıdır.
      [/arıza(?:lar|sı|ları)?\b/, /makine durd/, /ekipman.*(?:durd|arıza|bozul)/, /\bduruş\b/, /motor yan/, /rulman/, /tezg[aâ]h durd/],
      [/(?:makine|ekipman|tezg[aâ]h|arıza|duruş).*(?:yok|oluşmad|yaşanmad|görülmed)/, /(?:makine|ekipman|tezg[aâ]h).*(?:seçim|alternatif|teklif|satın al|yatırım)/],
    );
    if (scopedEquipment !== undefined) features.equipmentBreakdown = scopedEquipment;

    return {
      processName: null,
      problemDescription: text.trim() || null,
      features,
    };
  }

  async interpretAnswer(input: InterpretAnswerInput): Promise<Ternary> {
    const t = normalize(input.answerText);
    if (UNKNOWN.some((re) => re.test(t))) return null;
    const yes = YES.some((re) => re.test(t));
    const no = NO.some((re) => re.test(t));
    if (yes && !no) return true;
    if (no && !yes) return false;
    return null; // belirsiz -> alan null kalır, tekrar sorulmaz (dışlanır)
  }
}
