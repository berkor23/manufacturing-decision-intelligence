// Engineering Validation Suite — geliştirme (development) vakaları.
//
// Bunlar showcase/demo vakalarından BAĞIMSIZDIR. Hepsi bilinçli olarak gri
// bölgededir: en az iki metodoloji makul aday. Amaç motorun "kolay" vakaları
// bilmesi değil, benzer yöntemleri ayıran pozitif ve negatif kanıtı gerçekten
// değerlendirip değerlendirmediğini görmek.
//
// `answers` alanı doldurulurken tek kural: ANLATIMIN SÖYLEDİĞİ kadarını yaz.
// Beklenen sonucu getirecek ek alan eklemek ground truth'u çürütür; bir alan
// anlatımda geçmiyorsa null kalır (motor onu sormak zorundadır).

import type { ValidationCase } from "./types";

export const DEVELOPMENT_CASES: ValidationCase[] = [
  // ───────────────────────────────────────────────────────── A · TPM × TOC
  {
    id: "A-cnc-constraint-reliability",
    title: "Darboğaz CNC'de bozulan güvenilirlik",
    problem:
      "Bir CNC hücresinde son 8 haftada plansız duruş oranı %6'dan %18'e yükseldi. Aynı CNC, hattın en düşük teorik kapasiteye sahip prosesi. CNC önünde düzenli WIP birikiyor. Makine arızalanmadığı günlerde de sistem çıktısı talebi karşılamakta zorlanıyor.",
    answers: {
      defectOccurred: false,
      equipmentBreakdown: true,
      chronicEquipmentLoss: true,
      previouslyOccurred: true,
      bottleneckThroughput: true,
      constraintQueue: true,
      constraintMeasured: true,
      constraintLeverageExpected: true,
      hasMeasurementData: true,
    },
    expectedPrimary: "TOC",
    acceptableSecondary: ["TPM"],
    shouldNotLead: ["FMEA", "DMADV", "KT_DECISION", "FIVE_S", "SPC"],
    expectedSignals: ["bottleneckThroughput", "constraintQueue", "chronicEquipmentLoss"],
    discriminatingEvidence: [
      "Makine arızalanmadığı günlerde de çıktı yetersiz — kayıp yalnız güvenilirlikten gelmiyor, yapısal bir kapasite kısıtı var.",
      "Aynı ekipmanda kronik plansız duruş var — güvenilirlik kaybı da bağımsız bir kanıt gövdesi.",
    ],
    rationale:
      "İki karakter birden gerçek: yapısal kısıt (TOC) ve kronik güvenilirlik kaybı (TPM). Doğru mühendislik cevabı birini elemek değil, sırayı kurmak — güvenilirlik çalışmasını sistemin tümüne değil kısıta odaklamak.",
    pair: ["TPM", "TOC"],
    expectContested: ["TPM", "TOC"],
  },

  // ─────────────────────────────────────────────────────── B · RCA × DMAIC
  {
    id: "B-injection-flash-chronic-plus-change",
    title: "Kronik çapak üstüne binen tedarikçi değişikliği",
    problem:
      "Enjeksiyon prosesinde çapak oranı yaklaşık 9 aydır %3–6 arasında değişiyor. Son iki haftada %8'e çıktı. Tam iki hafta önce hammadde tedarikçisi değiştirildi. Kök neden bilinmiyor.",
    answers: {
      defectOccurred: true,
      highVariation: true,
      hasMeasurementData: true,
      measurementReliable: true,
      startedRecently: false,
      previouslyOccurred: true,
      supplierChanged: true,
      rootCauseKnown: false,
      processStable: false,
    },
    expectedPrimary: "DMAIC",
    acceptableSecondary: ["RCA", "KEPNER_TREGOE"],
    shouldNotLead: ["SPC", "FMEA", "DMADV", "KT_DECISION", "FIVE_S"],
    expectedSignals: ["highVariation", "hasMeasurementData", "supplierChanged", "rootCauseKnown"],
    discriminatingEvidence: [
      "Problem 9 aydır var — taban karakter kronik varyasyon.",
      "Sıçrama tam tedarikçi değişimiyle aynı tarihte — üstüne binen ayrı bir özel neden.",
    ],
    rationale:
      "Kronik taban DMAIC'i, değişiklikle örtüşen sıçrama özel neden analizini destekler. Motor tek yöntemi aşırı özgüvenle kesinleştirmemeli; iki kanıt gövdesini de göstermeli. Pratikte veri değişiklik tarihinden önce/sonra ayrılmadan analiz edilirse iki farklı proses tek dağılım sanılır.",
    pair: ["RCA", "DMAIC"],
    // İki kanıt gövdesinin de görünür kalması bu vakanın ASIL gereğidir:
    // birincil öneri DMAIC olsa bile RCA yok sayılmamalı.
    expectContested: ["DMAIC", "RCA"],
  },

  // ───────────────────────────────────────────────────────── C · 8D × RCA
  {
    id: "C-single-wrong-component",
    title: "Tekil yanlış komponent — kök neden zaten biliniyor",
    problem:
      "Müşteride tek bir ürün kırıldı. Aynı hata daha önce hiç görülmedi. İncelemede yanlış komponent kullanıldığı kesin olarak bulundu. Etkilenen lot tamamen izlenebilir ve diğer ürünlerde aynı hata görülmedi, dolayısıyla ayıklama gerekmiyor. Yanlış komponent takıldığında sistem bunu durdurmuyor.",
    answers: {
      defectOccurred: true,
      customerAffected: true,
      externalNonconformance: true,
      rootCauseKnown: true,
      failureModeKnown: true,
      humanErrorProne: true,
      previouslyOccurred: false,
      containmentNeeded: false,
    },
    expectedPrimary: "POKA_YOKE",
    acceptableSecondary: ["PDCA_A3", "RCA"],
    shouldNotLead: ["EIGHT_D", "DMAIC", "TPM", "DMADV"],
    expectedSignals: ["rootCauseKnown", "failureModeKnown", "humanErrorProne", "containmentNeeded"],
    discriminatingEvidence: [
      "Kök neden zaten kanıtlanmış — analiz yöntemi değil, karşı önlem gerekiyor.",
      "Koruma ihtiyacı yok ve olay tekil — 8D'nin disiplin yükünü haklı çıkaracak sinyal yok.",
    ],
    rationale:
      "‘Müşteriye ulaştı’ tek başına 8D demek değildir. Kök neden bilinen, tekrar etmeyen ve koruma gerektirmeyen tekil olayda kalan iş, bilinen hata modunu yapısal olarak imkânsız kılmaktır.",
    pair: ["EIGHT_D", "RCA"],
    expectContested: false,
  },

  // ─────────────────────────────────────────────── D · 8D gerçekten gerekli
  {
    id: "D-recurring-field-failures",
    title: "Tekrar eden saha hatası, koruma gerekiyor",
    problem:
      "Müşterilerden son üç ayda aynı failure mode için birden fazla şikâyet geliyor. Farklı lotlar etkilenmiş. Kök neden bilinmiyor. Şüpheli ürünler hâlâ müşterilere sevk ediliyor olabilir; ayıklama gerekiyor. Üretim, kalite, tedarikçi ve tasarım ekiplerinin birlikte çalışması gerekiyor.",
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
    shouldNotLead: ["FMEA", "DMADV", "SPC", "KT_DECISION", "PDCA_A3", "POKA_YOKE"],
    expectedSignals: ["externalNonconformance", "containmentNeeded", "previouslyOccurred", "rootCauseKnown"],
    discriminatingEvidence: [
      "Koruma ihtiyacı açık — sevkiyat sürüyor olabilir.",
      "Aynı hata modu tekrar ediyor ve kök neden bilinmiyor.",
    ],
    rationale:
      "C vakasının karşı testi. Aynı 'müşteri etkilendi' sinyali burada koruma ihtiyacı, tekrar ve bilinmeyen kök nedenle birleşiyor — 8D'nin varlık nedeni tam olarak bu bileşim.",
    pair: ["EIGHT_D", "RCA"],
  },

  // ──────────────────────────────────────────────────────── E · SDCA × PDCA
  {
    id: "E-standard-exists-but-unused",
    title: "Talimat var ama kimse uygulamıyor",
    problem:
      "Montaj hattında çevrim süreleri operatörler arasında %35 değişiyor. Resmî standart iş talimatı var ancak üç yıldır güncellenmemiş ve operatörlerin hiçbiri fiilen talimattaki yöntemi kullanmıyor. Çevrim süreleri kayıt altında.",
    answers: {
      standardWorkEstablished: false,
      processStable: false,
      highVariation: true,
      hasMeasurementData: true,
      defectOccurred: false,
    },
    expectedPrimary: "SDCA",
    acceptableSecondary: ["FIVE_S"],
    shouldNotLead: ["DMAIC", "PDCA_A3", "SPC", "EIGHT_D", "TOC"],
    expectedSignals: ["standardWorkEstablished", "processStable"],
    discriminatingEvidence: [
      "Dokümanın varlığı değil, fiilî uygulama belirleyici — standart pratikte yok.",
      "Çevrim süresi farkı istatistiksel varyasyon değil, yöntem farkı.",
    ],
    rationale:
      "Operatörden operatöre değişen çevrim süresi, ölçülebilir olsa bile istatistiksel bir varyasyon problemi değildir; kaynağı standartsızlıktır. Bu vakada DMAIC açmak, olmayan bir tabanın üzerine proje kurmaktır.",
    pair: ["SDCA", "PDCA_A3"],
  },

  // ────────────────────────────────────────────── F · PDCA gerçekten uygun
  {
    id: "F-stable-process-small-experiment",
    title: "Kararlı proseste kontrollü küçük deney",
    problem:
      "Proses standardize edilmiş ve standart çalışma fiilen uygulanıyor. Performans kararlı, temel koşullar sağlanıyor. Ergonomiyi iyileştirerek çevrim süresini %8 azaltmak için kontrollü küçük bir deney yapılmak isteniyor.",
    answers: {
      standardWorkEstablished: true,
      basicConditionsStable: true,
      processStable: true,
      isImprovementInitiative: true,
      defectOccurred: false,
    },
    expectedPrimary: "PDCA_A3",
    acceptableSecondary: ["DMAIC"],
    shouldNotLead: ["SDCA", "EIGHT_D", "RCA", "FIVE_S", "TPM"],
    expectedSignals: ["isImprovementInitiative", "standardWorkEstablished", "processStable"],
    discriminatingEvidence: [
      "Standart fiilen uygulanıyor ve proses kararlı — stabilizasyon kapısı geçilmiş.",
      "Hedef küçük ölçekli, deneysel bir iyileştirme.",
    ],
    rationale:
      "E vakasının karşı testi. Aynı 'iyileştirme isteniyor' sinyali, kararlı bir taban üzerinde PDCA'ya; taban yokken SDCA'ya gitmeli.",
    pair: ["SDCA", "PDCA_A3"],
  },

  // ─────────────────────────────────────────────────────── G · FMEA × DMADV
  {
    id: "G-new-welding-process-design",
    title: "Sıfırdan yeni otomatik kaynak prosesi",
    problem:
      "Mevcut ürün ailesi için sıfırdan yeni bir otomatik kaynak prosesi tasarlanıyor. Ürün tasarımı değişmiyor. Yeni proses için ekipman, proses parametreleri, kontrol planı ve layout henüz tasarım aşamasında. Henüz üretim yok, dolayısıyla oluşmuş bir hata da yok.",
    // GROUND TRUTH DÜZELTMESİ: burada processChanged işaretlemek hataydı.
    // Sıfırdan kurulan bir proseste "mevcut süreç değişti" diye bir olgu yok;
    // yetkin bir mühendis o soruya "ortada değişecek bir süreç yok" der.
    answers: {
      isNewDesign: true,
      defectOccurred: false,
    },
    expectedPrimary: "DMADV",
    acceptableSecondary: ["FMEA"],
    shouldNotLead: ["RCA", "EIGHT_D", "TPM", "DMAIC", "SPC"],
    expectedSignals: ["isNewDesign", "defectOccurred"],
    discriminatingEvidence: [
      "Proses sıfırdan tasarlanıyor — düzeltilecek mevcut bir proses yok.",
      "Tasarım kararları henüz açık; risk değerlendirmesi tasarımın İÇİNDE bir adım.",
    ],
    rationale:
      "FMEA ile DMADV birbirinin alternatifi DEĞİLDİR: DMADV tasarım çerçevesini taşır, FMEA o çerçeve içindeki risk analizi adımıdır. Bu yüzden doğru çıktı 'çakışan iki karakter' değil, ana omurga + risk katmanı ilişkisidir — uygulama mimarisinde FMEA destekleyici katman olarak görünmelidir (aşağıdaki testte denetlenir).",
    pair: ["FMEA", "DMADV"],
    expectContested: false,
  },

  // ────────────────────────────────────────────── H · FMEA gerçekten uygun
  {
    id: "H-new-variant-existing-process",
    title: "Mevcut proseste yeni ürün varyantı",
    problem:
      "Mevcut ve kararlı bir proses için yeni bir ürün varyantı devreye alınacak. Proses mimarisi değişmiyor, sıfırdan bir tasarım yok. Yeni varyantın olası hata modları ve mevcut kontrollerin bu varyantta yeterli olup olmadığı değerlendirilmek isteniyor. Henüz hata oluşmadı.",
    answers: {
      isNewDesign: false,
      defectOccurred: false,
      processStable: true,
      controlAdequacyUncertain: true,
    },
    expectedPrimary: "FMEA",
    acceptableSecondary: [],
    shouldNotLead: ["DMADV", "RCA", "EIGHT_D", "DMAIC", "TPM"],
    expectedSignals: ["defectOccurred", "isNewDesign", "controlAdequacyUncertain"],
    discriminatingEvidence: [
      "Tasarım serbestliği yok — mevcut proses mimarisi korunuyor.",
      "Belirsiz olan, mevcut kontrollerin yeni koşuldaki yeterliliği.",
    ],
    rationale:
      "G vakasının karşı testi. Aynı 'hata henüz yok' sinyali, tasarım serbestliği varken DMADV'ye, mevcut proses korunuyorken FMEA'ya gitmeli. Mevcut proses düzeltilebilirken tasarım projesi açmak pahalı bir yanlış yönlendirmedir.",
    pair: ["FMEA", "DMADV"],
    expectContested: false,
  },

  // ───────────────────────────────────────────────────────── I · SPC × DMAIC
  {
    id: "I-capable-stable-monitoring",
    title: "Yeterli ve kararlı prosesi kontrol altında tutma",
    problem:
      "Kritik çap prosesi kararlı ve yeterli; Cpk 1,67. Son 12 ayda müşteri hatası yok, varyasyon şu an bir sorun değil. Ölçüm sistemi doğrulandı. İhtiyaç, prosesin kontrol altında kaldığını sürekli takip edip bozulma başladığında erken görmek.",
    answers: {
      processStable: true,
      monitoringNeed: true,
      measurementReliable: true,
      highVariation: false,
      defectOccurred: false,
      customerAffected: false,
      isNewDesign: false,
    },
    expectedPrimary: "SPC",
    acceptableSecondary: [],
    shouldNotLead: ["DMAIC", "RCA", "EIGHT_D", "SDCA", "TOC", "TPM"],
    expectedSignals: ["processStable", "monitoringNeed", "measurementReliable"],
    discriminatingEvidence: [
      "Proses bugün yeterli — kapatılacak bir performans açığı yok.",
      "Amaç kazanılmış seviyeyi korumak, nedeni bulmak değil.",
    ],
    rationale:
      "Yeterli ve kararlı bir proseste iyileştirme projesi açmak kaynağı boşa harcamaktır. Doğru iş, kontrol altında tutmaktır.",
    pair: ["SPC", "DMAIC"],
    expectContested: false,
  },

  // ───────────────────────────────────────────── J · DMAIC gerçekten uygun
  {
    id: "J-chronic-variation-unknown-drivers",
    title: "Kronik yüksek varyasyon, sürücüleri bilinmiyor",
    problem:
      "Kritik çap ölçüsünde son 8 aydır yüksek varyasyon var; Cpk 0,82. Problem kronik, belirli bir olayla başlamadı. Hangi proses parametrelerinin varyasyonu sürüklediği bilinmiyor. Yeterli ölçüm verisi mevcut ve ölçüm sistemi doğrulandı.",
    answers: {
      highVariation: true,
      hasMeasurementData: true,
      measurementReliable: true,
      rootCauseKnown: false,
      startedRecently: false,
      defectOccurred: true,
      processStable: false,
    },
    expectedPrimary: "DMAIC",
    acceptableSecondary: ["RCA"],
    shouldNotLead: ["SPC", "EIGHT_D", "TPM", "FIVE_S", "KT_DECISION", "POKA_YOKE"],
    expectedSignals: ["highVariation", "hasMeasurementData", "rootCauseKnown", "processStable"],
    discriminatingEvidence: [
      "Kronik ve ölçülebilir; belirli bir değişiklikle örtüşmüyor.",
      "Neden-etki ilişkisi istatistiksel olarak araştırılmalı.",
    ],
    rationale:
      "I vakasının karşı testi. SPC burada birincil değildir: kararsız bir prosese kontrol limiti çizmek anlamsızdır. SPC ancak varyasyon düşürüldükten sonra Control aşamasında devreye girer.",
    pair: ["SPC", "DMAIC"],
  },

  // ─────────────────────────────────────────────────────── K · TOC × VSM
  {
    id: "K-measured-capacity-constraint",
    title: "Sayısal doğrulanmış kapasite kısıtı",
    problem:
      "Bir üretim hattında talep 800 adet/gün. Proses A 950, proses B 540, proses C 920 adet/gün kapasitede. B prosesi önünde sürekli WIP var ve B sonrası prosesler sık sık malzeme bekliyor. Ekipmanda kronik arıza sorunu yok.",
    answers: {
      bottleneckThroughput: true,
      constraintQueue: true,
      downstreamStarvation: true,
      constraintMeasured: true,
      constraintLeverageExpected: true,
      hasMeasurementData: true,
      flowOrWaste: true,
      equipmentBreakdown: false,
    },
    expectedPrimary: "TOC",
    acceptableSecondary: [],
    shouldNotLead: ["LEAN_VSM", "TPM", "DMAIC", "FIVE_S", "SPC"],
    expectedSignals: ["bottleneckThroughput", "constraintQueue", "downstreamStarvation", "constraintMeasured"],
    discriminatingEvidence: [
      "Kapasite ile talep aynı birimde karşılaştırıldı; kısıt sayısal olarak gösterildi.",
      "Kısıt önünde kuyruk, sonrasında açlık — klasik kısıt imzası.",
    ],
    rationale:
      "Kısıt kanıtlandığında kayıp akışa dağılmış değildir. Kısıt öncesindeki israfı gidermek yalnız ara stoğu büyütür; VSM görünürlük verse de baskın yöntem olmamalı.",
    pair: ["TOC", "LEAN_VSM"],
    expectContested: false,
  },

  // ────────────────────────────────────────────── L · VSM gerçekten uygun
  {
    id: "L-dispersed-flow-waste",
    title: "Dağınık akış kaybı, baskın kısıt yok",
    problem:
      "Toplam üretim temin süresi 21 gün, toplam gerçek değer katan işlem süresi 5 saat. WIP birçok proses arasında dağınık. Taşıma, bekleme, parti üretimi ve bilgi akışı problemleri var. Tek bir belirgin kapasite kısıtı kanıtlanmamış; hiçbir noktanın önünde düzenli kuyruk yok ve sonraki istasyonlar aç kalmıyor.",
    answers: {
      flowOrWaste: true,
      hasMeasurementData: true,
      isImprovementInitiative: true,
      constraintQueue: false,
      downstreamStarvation: false,
      bottleneckThroughput: false,
    },
    expectedPrimary: "LEAN_VSM",
    acceptableSecondary: [],
    shouldNotLead: ["TOC", "TPM", "DMAIC", "EIGHT_D", "SPC"],
    expectedSignals: ["flowOrWaste", "bottleneckThroughput", "constraintQueue"],
    discriminatingEvidence: [
      "Kuyruk ve açlık imzası yok — baskın tek kısıt kanıtı bulunmuyor.",
      "Temin süresinin neredeyse tamamı bekleme; kayıp akış boyunca dağınık.",
    ],
    rationale:
      "K vakasının karşı testi. Aynı 'akış problemi' ailesi, kısıt kanıtlandığında TOC'ye, dağınık israfta VSM'ye gitmeli. Kanıt yokken kısıt teorisine atlamak yanlış yönlendirmedir.",
    pair: ["TOC", "LEAN_VSM"],
    expectContested: false,
  },

  // ────────────────────────────────────────── M · TPM yanlış pozitif testi
  {
    id: "M-single-sensor-cable-failure",
    title: "İki yılda ilk arıza — kırık sensör kablosu",
    problem:
      "Bir makine son iki yılda ilk kez arızalandı. Arıza nedeni kırılmış bir sensör kablosu olarak kesin belirlendi. Kablo değiştirildi ve makine normale döndü. Bakım geçmişinde tekrarlayan güvenilirlik problemi yok. Müşteriye yansımadı.",
    answers: {
      defectOccurred: true,
      equipmentBreakdown: true,
      chronicEquipmentLoss: false,
      previouslyOccurred: false,
      rootCauseKnown: true,
      customerAffected: false,
    },
    expectedPrimary: "PDCA_A3",
    acceptableSecondary: ["RCA", "POKA_YOKE"],
    shouldNotLead: ["TPM", "DMAIC", "TOC", "EIGHT_D", "LEAN_VSM"],
    expectedSignals: ["equipmentBreakdown", "chronicEquipmentLoss", "previouslyOccurred", "rootCauseKnown"],
    discriminatingEvidence: [
      "Tekil olay: ne tekrar ediyor ne de kronik kayıp var.",
      "Kök neden zaten belirlendi — kurulacak bir bakım yönetim sistemi gerekçesi yok.",
    ],
    rationale:
      "Tekil bir arıza TPM gerektirmez; TPM bir bakım YÖNETİM SİSTEMİdir. Bu vakada motorun düşük destekle bir çalışma hipotezi vermesi ve TPM'i öne çıkarmaması beklenir.",
    pair: ["TPM", "RCA"],
    expectContested: false,
  },

  // ───────────────────────────────────────── N · TPM güçlü pozitif testi
  {
    id: "N-chronic-unplanned-stops",
    title: "Kronik plansız duruş ve çöken temel koşullar",
    problem:
      "Aynı makinede son üç ay boyunca haftada ortalama dört plansız duruş oluyor ve MTBF sürekli düşüyor. Yağlama ve temel bakım standartları uygulanmıyor, operatör günlük kontrolleri yapmıyor. Bu makine hattın kısıtı değil, önünde kuyruk oluşmuyor.",
    answers: {
      equipmentBreakdown: true,
      chronicEquipmentLoss: true,
      previouslyOccurred: true,
      basicConditionsStable: false,
      standardWorkEstablished: false,
      bottleneckThroughput: false,
      constraintQueue: false,
    },
    expectedPrimary: "TPM",
    acceptableSecondary: ["SDCA"],
    shouldNotLead: ["TOC", "DMAIC", "EIGHT_D", "SPC", "LEAN_VSM", "KT_DECISION"],
    expectedSignals: ["chronicEquipmentLoss", "previouslyOccurred", "basicConditionsStable"],
    discriminatingEvidence: [
      "Kayıp aynı ekipmanda tekrar ediyor ve MTBF düşüyor — sistemik güvenilirlik problemi.",
      "Kısıt değil: önünde kuyruk yok, yani TOC'nin kaldıraç gerekçesi yok.",
    ],
    rationale:
      "M vakasının karşı testi. Ekipman temel koşullarının bozulması TPM'in kendi alanıdır; SDCA'nın yakın ikinci olması doğrudur çünkü 'temel koşulları geri getir' TPM'in de ilk adımıdır.",
    pair: ["TPM", "TOC"],
  },

  // ──────────────────────────────────────────────────────── O · TPM × RCA
  {
    id: "O-repeating-single-failure-mode",
    title: "Aynı hata modu tekrar ediyor, mekanizması bilinmiyor",
    problem:
      "Aynı pompa son altı ayda dört kez aynı şekilde arızalandı; her seferinde salmastra sızdırdı. Salmastranın neden sızdırdığı bilinmiyor. Bakım sistemi genel olarak çalışıyor: standart bakım planı uygulanıyor ve temel koşullar sağlanıyor. Diğer ekipmanlarda kronik kayıp yok.",
    answers: {
      defectOccurred: true,
      equipmentBreakdown: true,
      previouslyOccurred: true,
      chronicEquipmentLoss: false,
      rootCauseKnown: false,
      failureModeKnown: true,
      standardWorkEstablished: true,
      basicConditionsStable: true,
    },
    expectedPrimary: "RCA",
    acceptableSecondary: ["TPM", "KEPNER_TREGOE"],
    shouldNotLead: ["DMAIC", "TOC", "SPC", "FIVE_S", "KT_DECISION", "POKA_YOKE"],
    expectedSignals: ["previouslyOccurred", "rootCauseKnown", "chronicEquipmentLoss"],
    discriminatingEvidence: [
      "Bakım sistemi ve temel koşullar sağlam — kurulacak bir yönetim sistemi boşluğu yok.",
      "Tekrar eden tek bir hata modu var ve mekanizması bilinmiyor.",
    ],
    rationale:
      "Tekrar TPM'i çağırır gibi görünür; ama sorun bakım sisteminin zayıflığı değil, tek bir mekanizmanın çözülmemiş olmasıdır. Ayrım: sistemik kayıp mı, spesifik mekanizma mı?",
    pair: ["TPM", "RCA"],
  },

  // ─────────────────────────────────────────────── P · FMEA × Poka-Yoke
  {
    id: "P-symmetric-connector-misassembly",
    title: "Simetrik konnektör ters takılabiliyor",
    problem:
      "Montajda bir konnektör ters takılabiliyor; son üç ayda 11 kez oldu. Ters takıldığında hat sonu testinde yakalanıyor, müşteriye gitmiyor, ama zaman kaybı büyük. Ters takılmanın nedeni konnektörün simetrik olması — bu doğrulandı. Yanlış işlem montaj anında durdurulmuyor.",
    answers: {
      defectOccurred: true,
      previouslyOccurred: true,
      humanErrorProne: true,
      failureModeKnown: true,
      rootCauseKnown: true,
      customerAffected: false,
      containmentNeeded: false,
    },
    expectedPrimary: "POKA_YOKE",
    acceptableSecondary: [],
    shouldNotLead: ["FMEA", "EIGHT_D", "DMAIC", "DMADV", "RCA", "TPM"],
    expectedSignals: ["humanErrorProne", "failureModeKnown", "rootCauseKnown"],
    discriminatingEvidence: [
      "Hata modu ve mekanizması doğrulanmış — engellenecek şey belli.",
      "Değerlendirilecek bir risk havuzu değil, kilitlenecek tek bir hata var.",
    ],
    rationale:
      "FMEA riskleri önceliklendirir; Poka-Yoke bilinen bir hata modunu yapısal olarak imkânsız kılar. Neden doğrulanmışken risk analizi açmak gecikmedir.",
    pair: ["FMEA", "POKA_YOKE"],
    expectContested: false,
  },

  // ──────────────────────────────────────── Q · FMEA (Poka-Yoke'nin tersi)
  {
    id: "Q-new-adhesive-unknown-failure-modes",
    title: "Yeni yapıştırıcı, hata modları henüz bilinmiyor",
    problem:
      "Mevcut hatta yeni bir yapıştırıcıya geçilecek. Henüz hata oluşmadı. Yeni yapıştırıcının kür süresi ve yüzey hazırlığı gereksinimleri farklı; hangi hata modlarının çıkabileceğini bilmiyoruz. Mevcut kontrollerin yeni malzemede çalışacağından emin değiliz. Hata çıkarsa müşteri sahasında yapışma ayrılması olur.",
    answers: {
      defectOccurred: false,
      supplierChanged: true,
      isNewDesign: false,
      failureModeKnown: false,
      controlAdequacyUncertain: true,
      potentialEffectKnown: true,
    },
    expectedPrimary: "FMEA",
    acceptableSecondary: [],
    shouldNotLead: ["POKA_YOKE", "DMADV", "RCA", "EIGHT_D", "DMAIC", "SPC"],
    expectedSignals: ["defectOccurred", "supplierChanged", "controlAdequacyUncertain", "potentialEffectKnown"],
    discriminatingEvidence: [
      "Hangi hata modunun çıkacağı bilinmiyor — kilitlenecek tek bir hata yok.",
      "Değişen koşulda mevcut kontrollerin yeterliliği doğrulanmamış.",
    ],
    rationale:
      "P vakasının karşı testi. Poka-Yoke bilinen bir hata modunu gerektirir; hata modu henüz belirsizken yapılacak iş riskleri öngörüp önceliklendirmektir.",
    pair: ["FMEA", "POKA_YOKE"],
  },

  // ─────────────────────────────────────────────────────── R · RCA × PDCA
  {
    id: "R-known-cause-improvement",
    title: "Nedeni bilinen performans açığı",
    problem:
      "Boya hattında ilk geçiş kalitesi %92. Nedeni biliniyor: kurutma fırınının sıcaklık profili hattın sonunda düşüyor; bu ölçümle doğrulandı. Süreç standardize, standart uygulanıyor ve proses kararlı. Fırın profilini iyileştirerek %97'ye çıkarmak istiyoruz.",
    answers: {
      defectOccurred: true,
      rootCauseKnown: true,
      isImprovementInitiative: true,
      standardWorkEstablished: true,
      basicConditionsStable: true,
      processStable: true,
      hasMeasurementData: true,
      customerAffected: false,
    },
    expectedPrimary: "PDCA_A3",
    acceptableSecondary: ["DMAIC"],
    shouldNotLead: ["RCA", "EIGHT_D", "SDCA", "FMEA", "TPM", "FIVE_S"],
    expectedSignals: ["rootCauseKnown", "isImprovementInitiative", "processStable"],
    discriminatingEvidence: [
      "Kök neden zaten doğrulandı — arayacak bir neden yok.",
      "Kararlı bir taban üzerinde ölçülebilir bir hedef var.",
    ],
    rationale:
      "Hata oluşmuş olması tek başına RCA demek değildir. Neden biliniyorsa kalan iş karşı önlemi planlayıp uygulamak ve etkisini ölçmektir.",
    pair: ["RCA", "PDCA_A3"],
  },

  // ────────────────────────── S · KT Karar × problem çözme (teşhis öncelikli)
  {
    id: "S-supplier-choice-blocked-by-defect",
    title: "Tedarikçi seçimi ama açıklanamayan sapma var",
    problem:
      "Üç tedarikçi arasından seçim yapacağız. Ancak mevcut tedarikçiden gelen partilerde açıklanamayan bir boyut sapması var ve nedeni bilinmiyor. Bu sapmanın malzemeden mi prosesten mi geldiğini bilmeden seçim yapmak riskli.",
    answers: {
      decisionBetweenOptions: true,
      multipleAlternativesDefined: true,
      unresolvedCauseBeforeDecision: true,
      rootCauseKnown: false,
      defectOccurred: true,
    },
    expectedPrimary: "RCA",
    acceptableSecondary: ["KEPNER_TREGOE"],
    shouldNotLead: ["KT_DECISION", "EIGHT_D", "DMAIC", "FMEA", "DMADV"],
    expectedSignals: ["decisionBetweenOptions", "unresolvedCauseBeforeDecision", "rootCauseKnown"],
    discriminatingEvidence: [
      "Seçimden bağımsız, çözülmemiş ve nedeni bilinmeyen bir problem var.",
      "Sapmanın kaynağı bilinmeden kriter puanlaması yanlış girdiyle yapılır.",
    ],
    rationale:
      "Karar analizi güçlü bir araçtır ama teşhisin yerini alamaz. Seçimi engelleyen bir bilinmeyen varken önce onu çözmek gerekir.",
    pair: ["KT_DECISION", "RCA"],
  },

  // ─────────────────────────────────────── T · KT Karar gerçekten uygun
  {
    id: "T-layout-alternative-selection",
    title: "İki layout alternatifi arasında seçim",
    problem:
      "İki layout alternatifi arasında seçim yapacağız. Zorunlu koşullar: mevcut bina alanına sığmalı ve yatırım 400 bin altında kalmalı. Ağırlıklandırmak istediğimiz kriterler: malzeme taşıma mesafesi, esneklik ve devreye alma süresi. Kararı üretim direktörü verecek. Seçimi engelleyen çözülmemiş bir arıza yok.",
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
    shouldNotLead: ["RCA", "EIGHT_D", "DMAIC", "FMEA", "LEAN_VSM", "TOC"],
    expectedSignals: ["decisionBetweenOptions", "multipleAlternativesDefined", "mandatoryCriteriaDefined"],
    discriminatingEvidence: [
      "Ortada çözülecek bir hata yok; tanımlı alternatifler arasında seçim var.",
      "Zorunlu ve ağırlıklı kriterler tanımlı, karar sahibi belli.",
    ],
    rationale:
      "S vakasının karşı testi. 'Bir arızanın nedenini bulmak' ile 'alternatiflerden en iyisini seçmek' aynı problem tipi değildir; motorun bu iki ekseni ayırması gerekir.",
    pair: ["KT_DECISION", "RCA"],
  },

  // ────────────────────────────────── U · TOC × VSM (yavaş ama kısıt değil)
  {
    id: "U-slow-step-without-constraint-signature",
    title: "En yavaş adım var ama kısıt imzası yok",
    problem:
      "Hattaki boya prosesi en yavaş görünen adım. Ancak önünde düzenli kuyruk oluşmuyor ve sonraki istasyonlar malzeme beklemiyor. Toplam temin süresi 12 gün, gerçek işlem süresi 3 saat. Ara stoklar hattın birçok noktasında dağınık biçimde duruyor.",
    answers: {
      flowOrWaste: true,
      constraintQueue: false,
      downstreamStarvation: false,
      bottleneckThroughput: false,
      hasMeasurementData: true,
    },
    expectedPrimary: "LEAN_VSM",
    acceptableSecondary: [],
    shouldNotLead: ["TOC", "TPM", "DMAIC", "SPC", "EIGHT_D"],
    expectedSignals: ["flowOrWaste", "constraintQueue", "downstreamStarvation"],
    discriminatingEvidence: [
      "‘En yavaş adım’ olmak kısıt olmak demek değildir — kuyruk ve açlık imzası yok.",
      "Stok tek noktada değil, akış boyunca dağınık.",
    ],
    rationale:
      "Kısıt teorisinin tetikleyicisi düşük hız değil, sistem çıktısını sınırlayan kanıtlanmış bir noktadır. Bu ayrımı kaçırmak yanlış yerde kapasite yatırımına yol açar.",
    pair: ["TOC", "LEAN_VSM"],
  },
];
