// KÖR HOLDOUT — Phase 2 için yeni genelleme seti.
//
// HO1–HO8 artık saf holdout sayılmaz: Phase 1'de sonuçları görüldü ve HO6
// üzerinden bir genelleme tartışması yapıldı. Bu dosya, Phase 2 kural
// değişikliklerinden SONRA bir kez çalıştırılmak üzere yazılmıştır.
//
// DİSİPLİN: bu vakalar kural geliştirirken hedef alınmaz. Başarısız olanlar
// yalnızca metriği yükseltmek için tune EDİLMEZ; sonuç olduğu gibi raporlanır.
// Amaç bir puan değil, kuralların yazılmış örneklere ezberlenip ezberlenmediğini
// görmek.

import type { ValidationCase } from "./types";

export const BLIND_HOLDOUT_CASES: ValidationCase[] = [
  {
    id: "BH1-paint-booth-throughput",
    title: "Boya kabini çıktıyı sınırlıyor",
    problem:
      "Talebimiz günde 700 adet ama sevk edebildiğimiz 480 adet. Boya kabininin ölçülen kapasitesi 480; diğer tüm prosesler 900'ün üzerinde. Kabinin önünde sürekli ara stok var, sonrasındaki paketleme sık sık boş bekliyor. Kabinde arıza sorunu yok.",
    answers: {
      bottleneckThroughput: true,
      constraintQueue: true,
      downstreamStarvation: true,
      constraintMeasured: true,
      constraintLeverageExpected: true,
      equipmentBreakdown: false,
      hasMeasurementData: true,
    },
    expectedPrimary: "TOC",
    acceptableSecondary: [],
    shouldNotLead: ["TPM", "LEAN_VSM", "DMAIC", "SPC", "EIGHT_D", "FIVE_S"],
    expectedSignals: ["bottleneckThroughput", "constraintQueue", "downstreamStarvation"],
    discriminatingEvidence: ["Kapasite ile talep aynı birimde ölçüldü; kısıt sayısal olarak gösterildi."],
    rationale: "Kısıt imzasının tamamı mevcut ve güvenilirlik tarafında kanıt yok.",
    pair: ["TOC", "TPM"],
  },
  {
    id: "BH2-torque-drift-chronic",
    title: "Kronik tork sapması, sürücüler bilinmiyor",
    problem:
      "Vidalama torku iki yıldır spesifikasyonun alt sınırına yakın seyrediyor; belirli bir olayla başlamadı. Hangi parametrelerin bunu sürüklediğini bilmiyoruz. Ölçüm sistemi doğrulandı ve iki yıllık veri var. Standart iş uygulanıyor, temel koşullar sağlanıyor.",
    answers: {
      defectOccurred: true,
      chronicPerformanceGap: true,
      hasMeasurementData: true,
      measurementReliable: true,
      rootCauseKnown: false,
      startedRecently: false,
      standardWorkEstablished: true,
      basicConditionsStable: true,
    },
    expectedPrimary: "DMAIC",
    acceptableSecondary: ["RCA"],
    shouldNotLead: ["SDCA", "FIVE_S", "TPM", "TOC", "EIGHT_D", "KT_DECISION"],
    expectedSignals: ["chronicPerformanceGap", "hasMeasurementData", "rootCauseKnown"],
    discriminatingEvidence: ["Kronik, ölçülebilir ve belirli bir değişiklikle örtüşmüyor."],
    rationale: "Kronik performans yolu üzerinden DMAIC; stabilizasyon boşluğu yok.",
    pair: ["RCA", "DMAIC"],
  },
  {
    id: "BH3-conveyor-single-jam",
    title: "Konveyörde tek seferlik sıkışma",
    problem:
      "Konveyör bir kez sıkıştı; nedeni gevşemiş bir cıvata olarak bulundu ve sıkıldı. Daha önce yaşanmamıştı, o günden beri tekrar etmedi. Müşteriye yansımadı, ayıklama gerekmedi.",
    answers: {
      defectOccurred: true,
      equipmentBreakdown: true,
      rootCauseKnown: true,
      previouslyOccurred: false,
      chronicEquipmentLoss: false,
      customerAffected: false,
      containmentNeeded: false,
    },
    expectedPrimary: "PDCA_A3",
    acceptableSecondary: ["RCA", "POKA_YOKE"],
    shouldNotLead: ["TPM", "DMAIC", "EIGHT_D", "TOC", "LEAN_VSM"],
    expectedSignals: ["rootCauseKnown", "previouslyOccurred", "chronicEquipmentLoss"],
    discriminatingEvidence: ["Tekil, nedeni doğrulanmış ve kapanmış olay."],
    rationale: "Kapsamlı metodoloji gerektirmeyen kapanmış olay; motorun çekimser kalması beklenir.",
    pair: ["TPM", "RCA"],
  },
  {
    id: "BH4-packaging-line-waiting",
    title: "Paketleme hattında dağınık bekleme",
    problem:
      "Siparişten sevkiyata toplam süre 24 gün; gerçek işlem süresi toplamda 7 saat. Yarı mamul birçok noktada bekliyor, malzeme taşımaları uzun. Hiçbir adımın önünde düzenli kuyruk oluşmuyor, sonraki istasyonlar da aç kalmıyor. Ekipman güvenilirliği iyi.",
    answers: {
      flowOrWaste: true,
      hasMeasurementData: true,
      constraintQueue: false,
      downstreamStarvation: false,
      bottleneckThroughput: false,
      equipmentBreakdown: false,
      isImprovementInitiative: true,
    },
    expectedPrimary: "LEAN_VSM",
    acceptableSecondary: [],
    shouldNotLead: ["TOC", "TPM", "DMAIC", "EIGHT_D", "SPC"],
    expectedSignals: ["flowOrWaste", "constraintQueue", "bottleneckThroughput"],
    discriminatingEvidence: ["Kısıt imzası yok; kayıp akış boyunca dağınık."],
    rationale: "Baskın tek kısıt kanıtlanmadan kısıt teorisine geçilmez.",
    pair: ["TOC", "LEAN_VSM"],
  },
  {
    id: "BH5-field-returns-multiple-lots",
    title: "Sahadan çok sayıda iade, neden bilinmiyor",
    problem:
      "Son iki ayda farklı lotlardan çok sayıda saha iadesi geldi; hepsinde aynı hata modu var. Kök neden bilinmiyor. Sahadaki ve depodaki ürünlerde ayıklama yapmamız gerekiyor. Kalite, üretim ve tedarikçi birlikte çalışacak.",
    answers: {
      defectOccurred: true,
      customerAffected: true,
      externalNonconformance: true,
      containmentNeeded: true,
      previouslyOccurred: true,
      rootCauseKnown: false,
    },
    expectedPrimary: "EIGHT_D",
    acceptableSecondary: ["RCA"],
    shouldNotLead: ["FMEA", "DMADV", "SPC", "PDCA_A3", "KT_DECISION", "TOC"],
    expectedSignals: ["externalNonconformance", "containmentNeeded", "previouslyOccurred"],
    discriminatingEvidence: ["Koruma ihtiyacı, tekrar ve bilinmeyen kök neden bir arada."],
    rationale: "8D'nin varlık nedeni olan sinyal bileşimi eksiksiz.",
    pair: ["EIGHT_D", "RCA"],
  },
  {
    id: "BH6-new-line-operators-differ",
    title: "Yeni hatta operatörler farklı çalışıyor",
    problem:
      "Devreye aldığımız hatta her operatör kendi yöntemini kullanıyor; yazılı bir standart yok. Temel çalışma koşulları vardiyadan vardiyaya değişiyor ve proses kararlı değil. Çalışma alanı düzenli. Bu hattı iyileştirmek istiyoruz.",
    answers: {
      standardWorkEstablished: false,
      basicConditionsStable: false,
      processStable: false,
      workplaceDisorganized: false,
      isImprovementInitiative: true,
      defectOccurred: false,
    },
    expectedPrimary: "SDCA",
    acceptableSecondary: [],
    shouldNotLead: ["PDCA_A3", "DMAIC", "FIVE_S", "RCA", "SPC", "TOC"],
    expectedSignals: ["standardWorkEstablished", "basicConditionsStable", "processStable"],
    discriminatingEvidence: ["İyileştirme niyeti var ama iyileştirilecek kararlı bir taban yok."],
    rationale: "Stabilizasyon kapısı geçilmeden iyileştirme döngüsü ölçüm üretemez.",
    pair: ["SDCA", "PDCA_A3"],
  },
  {
    id: "BH7-new-sealing-process-design",
    title: "Sıfırdan yeni sızdırmazlık prosesi",
    problem:
      "Mevcut ürün için sıfırdan yeni bir sızdırmazlık prosesi tasarlıyoruz. Ekipman, parametreler ve kontrol planı henüz tasarım aşamasında. Ölçülebilir müşteri gereksinimleri tanımlı. Henüz üretim ve dolayısıyla hata yok.",
    answers: {
      isNewDesign: true,
      defectOccurred: false,
      hasMeasurementData: true,
    },
    expectedPrimary: "DMADV",
    acceptableSecondary: ["FMEA"],
    shouldNotLead: ["RCA", "EIGHT_D", "DMAIC", "TPM", "SPC", "SDCA"],
    expectedSignals: ["isNewDesign", "defectOccurred"],
    discriminatingEvidence: ["Tasarım serbestliği var; düzeltilecek mevcut proses yok."],
    rationale: "Yeni tasarım çerçevesi ana omurga; risk analizi onun içinde bir adım.",
    pair: ["FMEA", "DMADV"],
  },
  {
    id: "BH8-press-chronic-stops-and-constraint",
    title: "Kronik duran pres aynı zamanda kısıt",
    problem:
      "Pres son dört ayda haftada ortalama üç kez plansız duruyor ve MTBF düşüyor. Aynı pres hattın en düşük kapasiteli adımı; önünde sürekli yarı mamul birikiyor, sonrasındaki istasyonlar bekliyor. Kapasitesini talebe göre ölçtük, altında kalıyor.",
    answers: {
      equipmentBreakdown: true,
      chronicEquipmentLoss: true,
      previouslyOccurred: true,
      bottleneckThroughput: true,
      constraintQueue: true,
      downstreamStarvation: true,
      constraintMeasured: true,
      constraintLeverageExpected: true,
    },
    expectedPrimary: "TOC",
    acceptableSecondary: ["TPM"],
    shouldNotLead: ["DMAIC", "SPC", "FMEA", "DMADV", "KT_DECISION", "FIVE_S"],
    expectedSignals: ["chronicEquipmentLoss", "bottleneckThroughput", "constraintQueue"],
    discriminatingEvidence: [
      "Hem güvenilirlik kaybı hem yapısal kısıt kanıtlı — iki bağımsız kanıt gövdesi.",
    ],
    rationale: "Çift karakterli vaka: doğru cevap birini elemek değil, sırayı kurmak.",
    pair: ["TPM", "TOC"],
    expectContested: ["TPM", "TOC"],
  },
];
