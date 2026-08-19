// RCA × KT Problem Analizi × KT Karar Analizi sınır vakaları.
//
// Üç ayrı soru, üç ayrı düşünme biçimi:
//
//   RCA          → "Bu sapma NEDEN meydana geldi?"
//   KT Problem   → "NE DEĞİŞTİ? Nerede var, nerede yok? Farklardan nedeni izole et."
//   KT Karar     → "Tanımlı alternatiflerden HANGİSİNİ seçmeliyiz?"
//
// İlk ikisi sık karıştırılır: ikisi de neden arar. Ayrım, elde AYIRICI bir
// karşılaştırma (IS / IS-NOT) olup olmadığıdır. Üçüncüsü ise bambaşka bir
// eksendir ve teşhis vakalarında yükselmemelidir.

import type { ValidationCase } from "./types";

export const KT_BOUNDARY_CASES: ValidationCase[] = [
  {
    id: "KT1-scratch-localized-change",
    title: "Yalnız gece vardiyasında ve yalnız Makine 3'te çizik",
    problem:
      "Aynı modelde çizik oluşuyor ama yalnızca gece vardiyasında ve yalnız Makine 3'te. Gündüz vardiyasında ve diğer makinelerde yok. Problem salı günü başladı; aynı gün Makine 3'e yeni bir fikstür takıldı. Sorunlu ve sorunsuz koşulları aynı ölçütlerle karşılaştırabiliyoruz. Kök neden bilinmiyor.",
    answers: {
      defectOccurred: true,
      startedRecently: true,
      processChanged: true,
      comparisonAvailable: true,
      rootCauseKnown: false,
      previouslyOccurred: false,
      chronicPerformanceGap: false,
    },
    expectedPrimary: "KEPNER_TREGOE",
    acceptableSecondary: ["RCA"],
    shouldNotLead: ["KT_DECISION", "DMAIC", "TPM", "TOC", "FMEA", "SPC"],
    expectedSignals: ["startedRecently", "processChanged", "comparisonAvailable"],
    discriminatingEvidence: [
      "Problem keskin biçimde lokalize: bir vardiya, bir makine, bir tarih.",
      "Sorunlu ve sorunsuz koşullar yan yana konabiliyor — IS / IS-NOT kurulabilir.",
      "Sapma bir değişiklikle aynı güne denk geliyor.",
    ],
    rationale:
      "Ayırıcı karşılaştırma mevcut olduğunda hipotez havuzunu daraltmak, geniş kök neden aramasından hızlı ve ucuzdur. KT Problem Analizi tam olarak bu bilgi için vardır.",
    pair: ["KEPNER_TREGOE", "RCA"],
    expectContested: false,
  },
  {
    id: "KT2-recurring-crack-no-contrast",
    title: "Tekrar eden kaynak çatlağı, ayırıcı karşılaştırma yok",
    problem:
      "Uzun süredir tekrar eden bir kaynak çatlağımız var. Bütün vardiyalarda, bütün makinelerde ve bütün partilerde görülüyor; problemli ve problemsiz koşulları ayıracak net bir karşılaştırma yapamıyoruz. Belirli bir tarihte başlamadı. Temel fiziksel nedeni doğrulamamız gerekiyor.",
    answers: {
      defectOccurred: true,
      previouslyOccurred: true,
      rootCauseKnown: false,
      comparisonAvailable: false,
      startedRecently: false,
      intermittent: false,
    },
    expectedPrimary: "RCA",
    acceptableSecondary: [],
    shouldNotLead: ["KEPNER_TREGOE", "KT_DECISION", "DMAIC", "TPM", "SPC", "FIVE_S"],
    expectedSignals: ["previouslyOccurred", "rootCauseKnown", "comparisonAvailable"],
    discriminatingEvidence: [
      "Ayırıcı karşılaştırma YOK — IS / IS-NOT matrisi kurulamaz.",
      "Belirli bir değişiklik tarihi yok; 'ne değişti' sorusunun cevabı bulunmuyor.",
    ],
    rationale:
      "KT1'in karşı testi. KT Problem Analizi ayırıcı fark üzerine kuruludur; fark gösterilemiyorsa yöntem çalışmaz ve mekanizmayı doğrulayan genel kök neden analizi gerekir.",
    pair: ["KEPNER_TREGOE", "RCA"],
  },
  {
    id: "KT3-robot-investment-choice",
    title: "Üç robot yatırım alternatifi",
    problem:
      "Üç farklı robot yatırım alternatifi arasından seçim yapacağız. Zorunlu kriterler: hücreye fiziksel olarak sığmalı ve mevcut PLC ile haberleşebilmeli. Ağırlıklandıracağımız kriterler: çevrim süresi, bakım maliyeti ve devreye alma süresi. Kararı üretim direktörü verecek. Seçimi engelleyen çözülmemiş bir arıza yok.",
    answers: {
      decisionBetweenOptions: true,
      multipleAlternativesDefined: true,
      mandatoryCriteriaDefined: true,
      preferenceCriteriaDefined: true,
      decisionOwnerKnown: true,
      unresolvedCauseBeforeDecision: false,
      defectOccurred: false,
    },
    expectedPrimary: "KT_DECISION",
    acceptableSecondary: [],
    shouldNotLead: ["RCA", "KEPNER_TREGOE", "EIGHT_D", "DMAIC", "FMEA", "TPM", "TOC"],
    expectedSignals: ["decisionBetweenOptions", "mandatoryCriteriaDefined", "preferenceCriteriaDefined"],
    discriminatingEvidence: [
      "Ortada bir sapma yok; tanımlı alternatifler var.",
      "Zorunlu (MUST) ve ağırlıklı (WANT) kriterler ayrılabiliyor.",
    ],
    rationale:
      "Karar analizi bir teşhis yöntemi değildir. Hem RCA hem KT Problem Analizi burada bastırılmalı: arayacak bir neden yok.",
    pair: ["KT_DECISION", "KEPNER_TREGOE"],
    expectContested: false,
  },
  {
    id: "KT4-intermittent-with-contrast",
    title: "Aralıklı hata ama koşul farkı gösterilebiliyor",
    problem:
      "Hata ara ara ortaya çıkıp kayboluyor. Hangi partilerde çıktığını ve hangilerinde çıkmadığını kayıtlardan ayırabiliyoruz; iki grup arasında malzeme tedarikçisi farkı var. Sorun geçen ay başladı. Kök neden bilinmiyor.",
    answers: {
      defectOccurred: true,
      intermittent: true,
      comparisonAvailable: true,
      startedRecently: true,
      supplierChanged: true,
      rootCauseKnown: false,
    },
    expectedPrimary: "KEPNER_TREGOE",
    acceptableSecondary: ["RCA"],
    shouldNotLead: ["KT_DECISION", "DMAIC", "SPC", "TPM", "TOC"],
    expectedSignals: ["intermittent", "comparisonAvailable", "startedRecently", "supplierChanged"],
    discriminatingEvidence: [
      "Aralıklı davranış tek başına yöntem seçtirmez; belirleyici olan koşul farkının gösterilebilmesi.",
      "İki grup arasında somut bir değişiklik farkı var.",
    ],
    rationale:
      "Aralıklı problemler KT'nin klasik alanıdır ÇÜNKÜ 'çıktığı' ve 'çıkmadığı' koşullar doğal bir IS / IS-NOT çifti verir.",
    pair: ["KEPNER_TREGOE", "RCA"],
  },
  {
    id: "KT5-decision-blocked-by-unknown",
    title: "Seçim var ama önce çözülmesi gereken bilinmeyen de var",
    problem:
      "İki tedarikçi arasında seçim yapacağız. Ancak mevcut partilerde açıklanamayan bir yüzey kusuru var ve nedenini bilmiyoruz; bunun malzemeden mi prosesten mi geldiğini bilmeden seçim yapmak riskli.",
    answers: {
      decisionBetweenOptions: true,
      multipleAlternativesDefined: true,
      unresolvedCauseBeforeDecision: true,
      rootCauseKnown: false,
      defectOccurred: true,
    },
    expectedPrimary: "RCA",
    acceptableSecondary: ["KEPNER_TREGOE"],
    shouldNotLead: ["KT_DECISION", "EIGHT_D", "DMAIC", "FMEA"],
    expectedSignals: ["decisionBetweenOptions", "unresolvedCauseBeforeDecision", "rootCauseKnown"],
    discriminatingEvidence: [
      "Karar ekseni gerçek ama önünde bağımsız, çözülmemiş bir teşhis problemi var.",
      "Bilinmeyen kaynak, kriter puanlamasının girdisini bozar.",
    ],
    rationale:
      "KT3'ün karşı testi. Karar analizi güçlü bir araçtır ama teşhisin yerini alamaz; seçimi engelleyen bilinmeyen önce çözülür.",
    pair: ["KT_DECISION", "RCA"],
  },
  {
    id: "KT6-known-cause-no-contrast-needed",
    title: "Neden doğrulanmış, ayırıcı analize gerek yok",
    problem:
      "Yüzey kusurunun nedeni doğrulandı: fikstür bağlama kuvveti spesifikasyonun altındaydı, ölçümle gösterildi. Problem tekrar ediyor ve kalıcı bir çözüm istiyoruz. Süreç standardize ve kararlı.",
    answers: {
      defectOccurred: true,
      rootCauseKnown: true,
      previouslyOccurred: true,
      standardWorkEstablished: true,
      basicConditionsStable: true,
      processStable: true,
      isImprovementInitiative: true,
      comparisonAvailable: false,
    },
    expectedPrimary: "PDCA_A3",
    acceptableSecondary: ["POKA_YOKE", "DMAIC"],
    shouldNotLead: ["KEPNER_TREGOE", "RCA", "KT_DECISION", "EIGHT_D", "SDCA"],
    expectedSignals: ["rootCauseKnown", "isImprovementInitiative", "comparisonAvailable"],
    discriminatingEvidence: [
      "Neden doğrulanmış — ne 'ne değişti' ne de 'neden oldu' sorusu açık.",
      "Kalan iş karşı önlemi uygulayıp etkisini doğrulamak.",
    ],
    rationale:
      "Her üç KT/RCA ekseninin de kapandığı durum: neden biliniyorsa teşhis yöntemleri boşta çalışır.",
    pair: ["KEPNER_TREGOE", "RCA"],
  },
];
