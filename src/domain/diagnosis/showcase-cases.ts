// Vitrin vakaları — sistemin ne yaptığını ANLATMAK yerine GÖSTERMEK için.
//
// Buradaki her vaka, kullanıcının yazabileceği türden serbest bir metin ve o
// metnin teşhis turunda alacağı yanıtlardan oluşur. Landing sayfası bu vakaları
// gerçek `diagnose()` motoruyla çalıştırıp çıktısını olduğu gibi basar: ekran
// görüntüsü, elle yazılmış örnek çıktı ya da pazarlama metni değil — ziyaretçi
// motorun o an ürettiği sonucu görür.
//
// Aynı katalog /diagnoz ekranındaki "örnek vakayı yükle" listesini de besler;
// böylece vitrindeki vaka ile denenebilen vaka aynı kaynaktan gelir.
//
// showcase-cases.test.ts her vakanın beklenen yöntemini sabitler: kural
// ağırlıkları değişip vitrin yanlış bir iddiaya dönüşürse test kırılır.

import type { DiagnosticFeatureKey, Ternary } from "./features";
import type { Methodology } from "./methodologies";

export interface ShowcaseCase {
  id: string;
  /** Kısa vaka adı (liste görünümü). */
  title: string;
  /** Kullanıcının kendi cümleleriyle yazacağı türden problem metni. */
  problemText: string;
  /** Teşhis turunda verilmiş sayılan yanıtlar. */
  answers: Partial<Record<DiagnosticFeatureKey, Ternary>>;
  /** Bu vakanın hangi ayrımı gösterdiği — vitrinde başlık altı not. */
  demonstrates: string;
  /** Beklenen birincil yöntem (test kalkanı). */
  expected: Methodology;
}

export const SHOWCASE_CASES: ShowcaseCase[] = [
  {
    id: "welding-crack",
    title: "Tekrarlayan kaynak hatası",
    problemText:
      "Kaynak hattındaki çatlak oranı son iki haftada %1,8'den %6,4'e yükseldi. Bu dönemde fikstür değiştirildi ve kaynak akım parametrelerinde ayar yapıldı. Hatalı parçaların bir kısmı müşteriye gitmedi, ayıklamayla yakalandı. Kök nedeni henüz bilmiyoruz.",
    answers: {
      defectOccurred: true,
      startedRecently: true,
      processChanged: true,
      rootCauseKnown: false,
      hasMeasurementData: true,
      comparisonAvailable: true,
      customerAffected: false,
      previouslyOccurred: false,
    },
    demonstrates:
      "Belirli bir tarihten sonra başlayan sapma ile kronik varyasyon aynı şey değildir: sistem burada istatistiksel iyileştirme yerine değişiklik odaklı sapma analizini öne alır.",
    expected: "KEPNER_TREGOE",
  },
  {
    id: "chronic-variation",
    title: "Kronik ölçü varyasyonu",
    problemText:
      "Talaşlı imalatta kritik çap ölçüsünün varyasyonu altı aydır yüksek; Cpk 0,85 seviyesinde. Belirli bir olay ya da değişiklikle başlamadı, hep böyleydi. Ölçüm sistemimiz doğrulandı ve elimizde düzenli veri var. Hangi proses parametrelerinin varyasyona yol açtığını bilmiyoruz.",
    answers: {
      hasMeasurementData: true,
      highVariation: true,
      measurementReliable: true,
      rootCauseKnown: false,
      startedRecently: false,
      defectOccurred: true,
      processStable: false,
    },
    demonstrates:
      "Uzun dönemli, ölçülebilir ve nedeni bilinmeyen varyasyon istatistiksel iyileştirme alanıdır; kontrol kartı bu aşamada izler ama nedeni bulmaz.",
    expected: "DMAIC",
  },
  {
    id: "machine-stoppage",
    title: "Sık duran ana makine (gri bölge)",
    problemText:
      "Ana üretim makinemiz sık sık duruyor ve teslimatlar gecikiyor. Son üç ayda aynı ekipmanda haftada ortalama dört plansız duruş var, MTBF düşüyor. Bu makinenin önünde sürekli yarı mamul birikiyor, sonrasındaki istasyonlar ise zaman zaman boş kalıyor. Kapasitesini talebe göre ölçtük, altında kalıyor.",
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
    demonstrates:
      "İlk bakışta TPM, TOC, VSM ve RCA'nın hepsi uygun görünür. Problem gerçekten iki karakter taşıdığında sistem birini seçip ötekini gizlemez; ikisini de gösterip aralarındaki sırayı kurar.",
    expected: "TOC",
  },
  {
    id: "bottleneck",
    title: "Sistem darboğazı",
    problemText:
      "Kaynak 900 adet/gün, boya 550 adet/gün, montaj 1.000 adet/gün kapasiteye sahip. Talep 800 adet/gün. WIP boya önünde birikiyor ve tamamlanmış ürün çıkışımız 550 civarında takılı kaldı. Ekipmanda kronik bir arıza sorunu yok.",
    answers: {
      bottleneckThroughput: true,
      constraintQueue: true,
      downstreamStarvation: true,
      constraintMeasured: true,
      constraintLeverageExpected: true,
      hasMeasurementData: true,
      equipmentBreakdown: false,
      flowOrWaste: true,
    },
    demonstrates:
      "Kapasite kısıtı sayısal olarak doğrulandığında kayıp akışa dağılmış değildir; uçtan uca haritalama yerine kısıt yönetimi öncelenir.",
    expected: "TOC",
  },
  {
    id: "flow-waste",
    title: "Yüksek temin süresi ve ara stok",
    problemText:
      "Toplam temin süremiz 18 gün ama gerçek işlem süresi toplamda 4 saat. Prosesler arasında yüksek ara stok, çok sayıda taşıma ve bekleme var. Akış kopuk. Belirli tek bir tezgâhın önünde düzenli kuyruk oluştuğunu söyleyemem; sıkışma her yerde biraz.",
    answers: {
      flowOrWaste: true,
      hasMeasurementData: true,
      isImprovementInitiative: true,
      constraintQueue: false,
      downstreamStarvation: false,
      bottleneckThroughput: false,
    },
    demonstrates:
      "Baskın tek kısıt kanıtı yokken kısıt teorisine atlamak yanlış yönlendirmedir; kayıp akış boyunca dağınıksa uçtan uca değer akışı haritalanır.",
    expected: "LEAN_VSM",
  },
  {
    id: "new-process-risk",
    title: "Yeni proses devreye alma riski",
    problemText:
      "Mevcut hattımızda fikstür ve kaynak parametrelerini değiştireceğiz. Henüz bir hata oluşmadı. Hata oluşursa müşteri tarafında sızdırmazlık problemine yol açacağını biliyoruz. Mevcut kontrollerin yeni koşulda bu hatayı yakalayıp yakalamayacağından emin değiliz. Sıfırdan yeni bir ürün tasarlamıyoruz.",
    answers: {
      defectOccurred: false,
      isNewDesign: false,
      processChanged: true,
      potentialEffectKnown: true,
      controlAdequacyUncertain: true,
      safetyOrRegulatory: false,
    },
    demonstrates:
      "Hata henüz yokken reaktif analiz araçları boşta çalışır. Mevcut proses riski ile sıfırdan tasarım da aynı şey değildir — ikinci bir ayrım daha yapılır.",
    expected: "FMEA",
  },
  {
    id: "capex-decision",
    title: "Yeni makine yatırımı kararı",
    problemText:
      "Üç farklı tezgâh alternatifi arasından seçim yapacağız. Bütçe üst sınırı ve teslim tarihi zorunlu koşul; çevrim süresi, bakım maliyeti ve operatör eğitim yükü ise ağırlıklandırmak istediğimiz kriterler. Kararı üretim müdürü verecek. Ortada çözülmemiş bir arıza problemi yok.",
    answers: {
      decisionBetweenOptions: true,
      multipleAlternativesDefined: true,
      mandatoryCriteriaDefined: true,
      preferenceCriteriaDefined: true,
      decisionOwnerKnown: true,
      unresolvedCauseBeforeDecision: false,
    },
    demonstrates:
      "Bir arızanın nedenini bulmak ile üç alternatiften en iyisini seçmek aynı problem tipi değildir. Sistem burada teşhis araçlarını değil karar analizini önerir.",
    expected: "KT_DECISION",
  },
  {
    id: "no-standard-work",
    title: "Standartsız manuel operasyon",
    problemText:
      "Aynı montaj işini üç operatör üç farklı yöntemle yapıyor ve çevrim süreleri aralarında %40 değişiyor. Yazılı bir standart var ama uygulanmıyor, temel çalışma koşulları da her vardiyada aynı sağlanmıyor. Bu işi iyileştirmek istiyoruz.",
    answers: {
      isImprovementInitiative: true,
      standardWorkEstablished: false,
      basicConditionsStable: false,
      processStable: false,
      defectOccurred: false,
    },
    demonstrates:
      "İyileştirme niyeti tek başına PDCA demek değildir: iyileştirilecek kararlı bir taban yoksa önce standart ve temel koşullar sabitlenir.",
    expected: "SDCA",
  },
  {
    id: "customer-complaint",
    title: "Müşteri şikâyeti ve saha etkisi",
    problemText:
      "Müşteriden şikâyet geldi; hatalı parçalar sahaya ulaşmış durumda. Aynı hata daha önce de yaşanmıştı. Şu an müşteriyi korumak için stokta ve yoldaki ürünlerde ayıklama yapmamız gerekiyor. Kök nedeni bilmiyoruz.",
    answers: {
      defectOccurred: true,
      customerAffected: true,
      externalNonconformance: true,
      containmentNeeded: true,
      previouslyOccurred: true,
      rootCauseKnown: false,
    },
    demonstrates:
      "Müşteri etkisi tek başına 8D seçtirmez. 8D burada koruma ihtiyacı, tekrar ve bilinmeyen kök neden birlikte bulunduğu için öne çıkar.",
    expected: "EIGHT_D",
  },
  {
    id: "stable-monitoring",
    title: "Kararlı prosesi kontrol altında tutma",
    problemText:
      "Proses kararlı ve yeterli; ölçüm sistemimiz doğrulandı. Varyasyon şu an bir sorun değil. İstediğimiz, kritik çap ölçüsünü sürekli kontrol altında tutup bozulma başladığında erken görmek.",
    answers: {
      processStable: true,
      monitoringNeed: true,
      measurementReliable: true,
      highVariation: false,
      defectOccurred: false,
      isNewDesign: false,
    },
    demonstrates:
      "Kararlı ve yeterli bir proseste yapılacak iş iyileştirme projesi açmak değil, kazanılmış performansı korumaktır.",
    expected: "SPC",
  },
];

export function showcaseCase(id: string): ShowcaseCase | undefined {
  return SHOWCASE_CASES.find((c) => c.id === id);
}
