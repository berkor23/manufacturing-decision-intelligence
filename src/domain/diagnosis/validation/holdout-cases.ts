// Engineering Validation Suite — holdout vakaları.
//
// AMAÇ: kuralların yalnızca yazılmış örneklere ezberlenmediğini göstermek.
// Bu vakalar kural düzeltmelerinde HEDEF ALINMAZ. Bir düzeltme yapılırken
// development vakalarına bakılır; holdout yalnızca sonuçta ayrıca raporlanır.
//
// Bu yüzden holdout testleri yalnız SERT kuralı (yasaklı lider) zorunlu tutar;
// birincil eşleşme ve ilk-üç metrik olarak ölçülür. Böylece holdout bir tuning
// hedefine dönüşmez ama genelleme kaybı sessizce gizlenmez de.

import type { ValidationCase } from "./types";

export const HOLDOUT_CASES: ValidationCase[] = [
  {
    id: "HO1-shift-change-deviation",
    title: "İki yıl sorunsuz hatta vardiya değişimiyle başlayan kusur",
    problem:
      "Hat iki yıldır sorunsuz çalışıyordu. Geçen salı gece vardiyasından itibaren yüzey kusuru başladı; o gün yeni bir operatör grubu devreye girdi. Sorunlu ve sorunsuz vardiyaları aynı ölçütlerle karşılaştırabiliyoruz. Kök neden bilinmiyor.",
    answers: {
      defectOccurred: true,
      startedRecently: true,
      operatorChanged: true,
      comparisonAvailable: true,
      rootCauseKnown: false,
      previouslyOccurred: false,
    },
    expectedPrimary: "KEPNER_TREGOE",
    acceptableSecondary: ["RCA"],
    shouldNotLead: ["DMAIC", "TPM", "TOC", "FMEA", "SPC", "KT_DECISION"],
    expectedSignals: ["startedRecently", "operatorChanged", "comparisonAvailable"],
    discriminatingEvidence: [
      "Uzun süre sorunsuz çalışan sistem belirli bir tarihte bozuldu.",
      "Problemli ve problemsiz koşullar karşılaştırılabiliyor.",
    ],
    rationale: "Klasik 'ne değişti' vakası: sapmanın sınırlarını çizmek, hipotez havuzunu daraltır.",
    pair: ["KEPNER_TREGOE", "RCA"],
  },
  {
    id: "HO2-tool-search-waste",
    title: "Alet arama kaybı",
    problem:
      "Montaj alanında aletler ve fikstürler belirli bir yerde durmuyor; operatörler vardiyada ortalama 40 dakikayı arama ile geçiriyor. Kalite problemi yok, ekipman arızası yok. İşin tanımlı bir standart yerleşimi de yok.",
    answers: {
      workplaceDisorganized: true,
      standardWorkEstablished: false,
      defectOccurred: false,
      equipmentBreakdown: false,
    },
    expectedPrimary: "FIVE_S",
    acceptableSecondary: ["SDCA"],
    shouldNotLead: ["RCA", "DMAIC", "TPM", "TOC", "EIGHT_D", "SPC"],
    expectedSignals: ["workplaceDisorganized", "standardWorkEstablished"],
    discriminatingEvidence: ["Kaybın kaynağı teknik bir proses sapması değil, fiziksel düzenin olmaması."],
    rationale: "Kayıp doğrudan malzeme/alet yerleşiminden geliyorsa önce düzen kurulur.",
    pair: ["FIVE_S", "SDCA"],
  },
  {
    id: "HO3-new-line-three-methods",
    title: "Yeni hatta üç vardiya üç yöntem",
    problem:
      "Yeni açılan hatta üç vardiyada üç farklı çalışma yöntemi uygulanıyor. Temel koşullar (malzeme besleme, alet hazırlığı) her vardiyada aynı sağlanmıyor ve proses kararlı değil. Çalışma alanı düzenli. Henüz kalite problemi yok.",
    answers: {
      standardWorkEstablished: false,
      basicConditionsStable: false,
      processStable: false,
      workplaceDisorganized: false,
      defectOccurred: false,
    },
    expectedPrimary: "SDCA",
    acceptableSecondary: [],
    shouldNotLead: ["FIVE_S", "PDCA_A3", "DMAIC", "RCA", "EIGHT_D", "SPC"],
    expectedSignals: ["standardWorkEstablished", "basicConditionsStable", "processStable"],
    discriminatingEvidence: ["Eksik olan fiziksel düzen değil, yöntem standardı ve temel koşullar."],
    rationale: "Fiziksel düzen sağlamken standardizasyon boşluğu varsa 5S değil SDCA gerekir.",
    pair: ["SDCA", "FIVE_S"],
  },
  {
    id: "HO4-new-product-family-ctq",
    title: "Sıfırdan yeni ürün ailesi, CTQ'lar tanımlı",
    problem:
      "Tamamen yeni bir ürün ailesi tasarlıyoruz. Müşteri gereksinimleri (CTQ) tanımlı ve ölçülebilir. Mevcut ürünlerimiz bu gereksinimleri karşılayamıyor. Güvenlik açısından kritik bir uygulama. Henüz üretim ve dolayısıyla hata yok.",
    answers: {
      isNewDesign: true,
      defectOccurred: false,
      hasMeasurementData: true,
      safetyOrRegulatory: true,
    },
    expectedPrimary: "DMADV",
    acceptableSecondary: ["FMEA"],
    shouldNotLead: ["RCA", "EIGHT_D", "DMAIC", "TPM", "TOC", "SPC"],
    expectedSignals: ["isNewDesign", "defectOccurred", "safetyOrRegulatory"],
    discriminatingEvidence: ["Mevcut çözüm gereksinimi karşılayamıyor ve tasarım serbestliği var."],
    rationale: "Mevcut prosesin düzeltilemeyeceği, CTQ merkezli yeni bir yapı gerektiği durum.",
    pair: ["FMEA", "DMADV"],
  },
  {
    id: "HO5-known-cause-but-containment-needed",
    title: "Kök neden biliniyor ama koruma ve tekrar var",
    problem:
      "Müşteriden üçüncü kez aynı şikâyet geldi. Kök nedeni biliyoruz: tedarikçinin kaplama kalınlığı spesifikasyon dışı. Ancak sahada ve stokta hâlâ şüpheli ürün var, ayıklama gerekiyor. Farklı lotlar etkilenmiş.",
    answers: {
      defectOccurred: true,
      customerAffected: true,
      externalNonconformance: true,
      containmentNeeded: true,
      previouslyOccurred: true,
      rootCauseKnown: true,
    },
    expectedPrimary: "EIGHT_D",
    acceptableSecondary: [],
    shouldNotLead: ["FMEA", "DMADV", "SPC", "KT_DECISION", "TOC", "LEAN_VSM"],
    expectedSignals: ["externalNonconformance", "containmentNeeded", "previouslyOccurred"],
    discriminatingEvidence: [
      "Kök neden bilinmesine rağmen koruma ihtiyacı ve tekrar sürüyor.",
      "C vakasının aksine burada 8D'nin disiplin yükü karşılığını buluyor.",
    ],
    rationale:
      "8D'nin bastırılması 'kök neden biliniyor' tek sinyaline bağlanmamalı; koruma ve tekrar varsa disiplin hâlâ gerekli.",
    pair: ["EIGHT_D", "RCA"],
  },
  {
    id: "HO6-chronic-scrap-unknown-drivers",
    title: "Standardize proseste kronik fire, sürücüleri bilinmiyor",
    problem:
      "Proses standardize ve standart fiilen uygulanıyor, temel koşullar sağlanıyor. Fire oranı %4 ve son 18 aydır bu seviyede; belirli bir olayla başlamadı. Hangi proses parametrelerinin fireyi sürüklediği bilinmiyor. 18 aylık ölçüm verisi var ve ölçüm sistemi doğrulandı.",
    answers: {
      defectOccurred: true,
      standardWorkEstablished: true,
      basicConditionsStable: true,
      hasMeasurementData: true,
      measurementReliable: true,
      rootCauseKnown: false,
      startedRecently: false,
      previouslyOccurred: true,
    },
    expectedPrimary: "DMAIC",
    acceptableSecondary: ["RCA"],
    shouldNotLead: ["SDCA", "FIVE_S", "EIGHT_D", "TOC", "KT_DECISION", "DMADV"],
    expectedSignals: ["hasMeasurementData", "rootCauseKnown", "startedRecently"],
    discriminatingEvidence: [
      "Kronik ve belirli bir değişiklikle örtüşmüyor.",
      "Standart ve temel koşullar sağlam — stabilizasyon boşluğu yok.",
    ],
    rationale:
      "Kronik, ölçülebilir ve çok değişkenli bir performans açığında sürücüleri istatistikle ayırmak gerekir.",
    pair: ["RCA", "DMAIC"],
  },
  {
    id: "HO7-dispersed-inventory-occasional-breakdown",
    title: "Dağınık ara stok, ara sıra arıza",
    problem:
      "Temin süremiz 15 gün, gerçek işlem süresi 6 saat. Ara stoklar hattın birçok noktasında dağınık. Makinelerde ara sıra arıza oluyor ama kronik değil ve ekip arızayı ana sorun olarak görmüyor. Belirgin bir kısıt noktası yok: hiçbir adımın önünde düzenli kuyruk oluşmuyor.",
    answers: {
      flowOrWaste: true,
      constraintQueue: false,
      downstreamStarvation: false,
      bottleneckThroughput: false,
      equipmentBreakdown: true,
      chronicEquipmentLoss: false,
      previouslyOccurred: false,
    },
    expectedPrimary: "LEAN_VSM",
    acceptableSecondary: [],
    shouldNotLead: ["TPM", "TOC", "EIGHT_D", "SPC", "DMADV"],
    expectedSignals: ["flowOrWaste", "chronicEquipmentLoss", "bottleneckThroughput"],
    discriminatingEvidence: [
      "Arıza var ama kronik değil — güvenilirlik sistemi gerekçesi yok.",
      "Kısıt imzası da yok — kayıp akış boyunca dağınık.",
    ],
    rationale: "Birden fazla zayıf sinyal varken baskın karakteri seçmek gerekir; burada baskın karakter akış israfı.",
    pair: ["TPM", "LEAN_VSM"],
  },
  {
    id: "HO8-similar-labels-mixed-up",
    title: "Birbirine benzeyen etiketler karışıyor",
    problem:
      "Etiketleme istasyonunda yanlış etiket yapıştırılıyor; ayda üç dört kez oluyor. Nedeni doğrulandı: iki ürün etiketi görsel olarak neredeyse aynı ve aynı rafta yan yana duruyor. Standart iş tanımlı ve uygulanıyor. Yanlış etiket yapıştırıldığında sistem bunu durdurmuyor.",
    answers: {
      defectOccurred: true,
      previouslyOccurred: true,
      humanErrorProne: true,
      failureModeKnown: true,
      rootCauseKnown: true,
      standardWorkEstablished: true,
    },
    expectedPrimary: "POKA_YOKE",
    acceptableSecondary: ["FIVE_S"],
    shouldNotLead: ["EIGHT_D", "DMAIC", "DMADV", "TOC", "SPC", "KT_DECISION"],
    expectedSignals: ["humanErrorProne", "failureModeKnown", "rootCauseKnown"],
    discriminatingEvidence: [
      "Mekanizma doğrulanmış ve tekil bir hata modu var.",
      "Standart uygulanıyor — eksik olan disiplin değil, yapısal engel.",
    ],
    rationale: "Neden doğrulanmışken analiz yöntemi değil, hatayı imkânsız kılan karşı önlem gerekir.",
    pair: ["FMEA", "POKA_YOKE"],
  },
];
