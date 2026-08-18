// Kanıt yeterliliği ve adaptif soru kalitesi vakaları.
//
// İki ayrı iddiayı sınar:
//  1. Motor yeterli ayırt edici kanıt yokken kesin karar VERMEZ (madde 7).
//  2. Sorduğu soru rastgele değil, adaylar arasındaki belirsizliği azaltır (madde 8).
//
// İkincisi kritik: "Bu problem önemli mi?" gibi bir soru bilgi üretmez.
// İyi bir soru, iki hipotezin ayrıldığı yeri hedefler — örneğin TPM ile TOC
// arasında: "Makine arızalanmadığı zamanlarda da çıktıyı sınırlıyor mu?"

import type { InsufficientEvidenceCase, QuestionQualityCase } from "./types";

export const INSUFFICIENT_EVIDENCE_CASES: InsufficientEvidenceCase[] = [
  {
    id: "IE1-vague-productivity-drop",
    title: "Üretimde sorun var, verim düştü",
    problem: "Üretim hattında sorunlar var ve verim düştü.",
    answers: {},
    ambiguousBetween: ["TPM", "TOC", "LEAN_VSM", "DMAIC"],
    rationale:
      "Bu cümle bir problem karakteri taşımıyor: kayıp güvenilirlikten mi, kısıttan mı, akıştan mı, varyasyondan mı geliyor belli değil. Kesin öneri üretmek uydurmaktır.",
  },
  {
    id: "IE2-quality-problem-only",
    title: "Kalitede problem yaşıyoruz",
    problem: "Kalitede problem yaşıyoruz, red oranımız yükseldi.",
    answers: { defectOccurred: true },
    ambiguousBetween: ["RCA", "DMAIC", "EIGHT_D", "KEPNER_TREGOE"],
    rationale:
      "Tek başına 'hata var' sinyali reaktif ailesini açar ama içinden birini seçtirmez: kronik mi, değişiklik sonrası mı, müşteriye ulaştı mı bilinmiyor.",
  },
  {
    id: "IE3-machine-trouble",
    title: "Makinede sıkıntı var",
    problem: "Makinede sıkıntı var, sık sık duruyor.",
    answers: { equipmentBreakdown: true },
    ambiguousBetween: ["TPM", "RCA", "TOC"],
    rationale:
      "Duruşun kronik mi tekil mi olduğu, makinenin kısıt olup olmadığı bilinmeden TPM ile tekil neden analizi ayrılamaz.",
  },
  {
    id: "IE4-cost-pressure",
    title: "Maliyetleri düşürmemiz gerekiyor",
    problem: "Maliyetleri düşürmemiz gerekiyor.",
    answers: { isImprovementInitiative: true },
    ambiguousBetween: ["PDCA_A3", "LEAN_VSM", "DMAIC", "SDCA"],
    rationale:
      "İyileştirme niyeti bir problem karakteri değildir. Taban kararlı mı, kayıp nerede birikiyor, ölçüm var mı — hiçbiri bilinmiyor.",
  },
  {
    id: "IE5-line-not-efficient",
    title: "Hat verimli çalışmıyor",
    problem: "Hat verimli çalışmıyor, hedeflerin altındayız.",
    answers: {},
    ambiguousBetween: ["TOC", "LEAN_VSM", "TPM", "SDCA"],
    rationale:
      "Hedefin altında kalmak bir sonuçtur, karakter değil. Kayıp kaynağı ayrıştırılmadan yöntem seçmek araç ezberidir.",
  },
];

export const QUESTION_QUALITY_CASES: QuestionQualityCase[] = [
  {
    id: "QQ1-tpm-vs-toc",
    title: "Kronik arıza — kısıt mı, güvenilirlik mi?",
    answers: { equipmentBreakdown: true, chronicEquipmentLoss: true, previouslyOccurred: true },
    shouldDiscriminate: ["TPM", "TOC"],
    acceptableFeatures: [
      "bottleneckThroughput",
      "constraintQueue",
      "downstreamStarvation",
      "constraintMeasured",
      "constraintLeverageExpected",
    ],
    rationale:
      "İyi soru: 'Makine arızalanmadığı zamanlarda da toplam çıktıyı sınırlıyor mu?' Bu soru sorulamıyorsa motor bu iki karakteri hiç ayıramaz.",
  },
  {
    id: "QQ2-rca-vs-dmaic",
    title: "Ölçülebilir hata — kronik mi, değişiklik sonrası mı?",
    answers: { defectOccurred: true, hasMeasurementData: true, rootCauseKnown: false },
    shouldDiscriminate: ["RCA", "DMAIC"],
    acceptableFeatures: ["startedRecently", "highVariation", "processChanged", "supplierChanged", "previouslyOccurred"],
    rationale:
      "Sapmanın belirli bir tarihte mi başladığı yoksa uzun süredir mi dalgalandığı, bu iki yöntemi ayıran tek ayrımdır.",
  },
  {
    id: "QQ3-eightd-vs-rca",
    title: "Müşteri etkilendi — koruma gerekiyor mu?",
    answers: { defectOccurred: true, customerAffected: true, rootCauseKnown: false },
    shouldDiscriminate: ["EIGHT_D", "RCA"],
    acceptableFeatures: ["containmentNeeded", "externalNonconformance", "previouslyOccurred"],
    rationale:
      "8D'yi haklı çıkaran şey müşteri etkisi değil, koruma ihtiyacı ve tekrardır. Soru oraya gitmeli.",
  },
  {
    id: "QQ4-toc-vs-vsm",
    title: "Akış kaybı — tek kısıt mı, dağınık israf mı?",
    answers: { flowOrWaste: true, hasMeasurementData: true },
    shouldDiscriminate: ["TOC", "LEAN_VSM"],
    acceptableFeatures: ["bottleneckThroughput", "constraintQueue", "downstreamStarvation", "constraintMeasured"],
    rationale: "Kısıt önünde düzenli kuyruk oluşup oluşmadığı, bu iki yöntemi ayıran imzadır.",
  },
  {
    id: "QQ5-spc-vs-dmaic",
    title: "Ölçüm var — proses yeterli mi?",
    answers: { hasMeasurementData: true, measurementReliable: true, defectOccurred: false },
    shouldDiscriminate: ["SPC", "DMAIC"],
    acceptableFeatures: ["processStable", "highVariation", "monitoringNeed", "isImprovementInitiative"],
    rationale: "Prosesin bugün yeterli olup olmadığı, izleme ile iyileştirme arasındaki ayrımı belirler.",
  },
  {
    id: "QQ6-sdca-vs-pdca",
    title: "İyileştirme isteniyor — taban kararlı mı?",
    answers: { isImprovementInitiative: true, defectOccurred: false },
    shouldDiscriminate: ["SDCA", "PDCA_A3"],
    acceptableFeatures: ["standardWorkEstablished", "basicConditionsStable", "processStable"],
    rationale: "İyileştirilecek kararlı bir taban olup olmadığı sorulmadan PDCA'ya geçmek yaygın bir hatadır.",
  },
  {
    id: "QQ7-fmea-vs-dmadv",
    title: "Hata yok — tasarım serbestliği var mı?",
    answers: { defectOccurred: false, processChanged: true },
    shouldDiscriminate: ["FMEA", "DMADV"],
    acceptableFeatures: ["isNewDesign", "failureModeKnown", "controlAdequacyUncertain", "potentialEffectKnown"],
    rationale: "Mevcut prosesin riski mi değerlendiriliyor, yoksa sıfırdan tasarım mı — ayrım burada.",
  },
  {
    id: "QQ8-rca-vs-pdca",
    title: "Hata var — kök neden biliniyor mu?",
    // Varyasyon ve müşteri kaçağı çatalları kapatılmış durumda; geriye kalan
    // canlı gerilim, nedeni arayıp aramayacağımız. Ground truth'un bir çifti
    // "canlı" varsayması gerekir: henüz açık büyük çatallar varken motorun
    // onları önce sorması doğrudur.
    answers: {
      defectOccurred: true,
      previouslyOccurred: true,
      hasMeasurementData: true,
      highVariation: false,
      customerAffected: false,
      equipmentBreakdown: false,
      flowOrWaste: false,
    },
    shouldDiscriminate: ["RCA", "PDCA_A3"],
    acceptableFeatures: ["rootCauseKnown", "isImprovementInitiative", "previouslyOccurred", "startedRecently"],
    rationale: "Kök nedenin bilinip bilinmediği, analiz ile uygulama arasındaki kapıdır.",
  },
  {
    id: "QQ9-ktdecision-vs-diagnosis",
    title: "Alternatif seçimi — engelleyen bilinmeyen var mı?",
    answers: { decisionBetweenOptions: true, multipleAlternativesDefined: true },
    shouldDiscriminate: ["KT_DECISION", "RCA"],
    acceptableFeatures: [
      "unresolvedCauseBeforeDecision",
      "mandatoryCriteriaDefined",
      "preferenceCriteriaDefined",
      "decisionOwnerKnown",
    ],
    rationale: "Seçimi engelleyen çözülmemiş bir problem varsa karar analizi erkendir; soru oraya gitmeli.",
  },
  {
    id: "QQ10-tpm-vs-rca",
    title: "Ekipman arızası — kronik mi, tekil mi?",
    answers: { equipmentBreakdown: true, defectOccurred: true },
    shouldDiscriminate: ["TPM", "RCA"],
    acceptableFeatures: ["chronicEquipmentLoss", "previouslyOccurred", "rootCauseKnown", "basicConditionsStable"],
    rationale: "Tekrar ve kroniklik, bakım sistemi ile tekil mekanizma analizini ayırır.",
  },
];
