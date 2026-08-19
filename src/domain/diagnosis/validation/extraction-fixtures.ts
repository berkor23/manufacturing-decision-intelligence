// Çıkarım (extraction) sözleşme fixture'ları.
//
// Aynı fixture seti İKİ yolu birden doğrular:
//   · deterministik anahtar kelime çıkarıcısı  → CI'da her koşuda
//   · gerçek dil modeli                        → opsiyonel `npm run validate:llm`
//
// Sözleşmenin tek SERT kuralı: bir alanı YANLIŞ değerle doldurmak yasaktır.
// Çıkaramamak kabul edilebilir (motor o alanı sorar); yanlış doldurmak
// kullanıcının söylemediğini söylemiş gibi göstermektir.
//
// Metinler bilinçli olarak semantik açıdan zordur: olumsuzlama, karşı-olgusal
// kip, "var ama uygulanmıyor" ve şüphe kipi.

import type { DiagnosticFeatureKey, Ternary } from "../features";

export interface ExtractionFixture {
  id: string;
  /** Hangi dilsel zorluğu sınadığı. */
  challenge:
    | "negation"
    | "counterfactual"
    | "exists-but-unpracticed"
    | "confirmed-cause"
    | "suspected-cause"
    | "hypothetical"
    | "decision-not-defect"
    | "plain";
  text: string;
  /** Doğru okuma. Çıkarıcı bunların TERSİNİ üretmemeli. */
  expected: Partial<Record<DiagnosticFeatureKey, Ternary>>;
  /**
   * Metinde şüpheli kipte geçtiği için DEĞER OLARAK yazılmaması gereken alanlar.
   * Bunların `expected` içinde bulunmaması yetmez; aktif olarak boş kalmalıdır.
   */
  mustStayUnknown?: DiagnosticFeatureKey[];
  note: string;
}

export const EXTRACTION_FIXTURES: ExtractionFixture[] = [
  {
    id: "EX01-negation-breakdown-vs-capacity",
    challenge: "negation",
    text: "Makine arızalanmıyor ama kapasitesi talebe yetmiyor.",
    expected: { equipmentBreakdown: false, bottleneckThroughput: true },
    note: "Olumsuzlama: 'arızalanmıyor' bildirilmiş arıza değildir. Güvenilirlik ile yapısal kapasite ayrılmalı.",
  },
  {
    id: "EX02-counterfactual-target-miss",
    challenge: "counterfactual",
    text: "Arızalar olmasa bile hedefi yakalayamıyoruz.",
    expected: { equipmentBreakdown: false },
    note: "Karşı-olgusal kip: olgunun yokluğunda bile sonucun sürdüğünü söyler; arıza bildirimi değildir.",
  },
  {
    id: "EX03-standard-exists-not-practiced",
    challenge: "exists-but-unpracticed",
    text: "Talimat var fakat operatörlerin hiçbiri uygulamıyor.",
    expected: { standardWorkEstablished: false },
    note: "Dokümanın varlığı standardın yerleşik olduğu anlamına gelmez.",
  },
  {
    id: "EX04-confirmed-root-cause",
    challenge: "confirmed-cause",
    text: "Kök nedenin yanlış hammadde olduğu doğrulandı.",
    expected: { rootCauseKnown: true },
    note: "Doğrulanmış neden: analiz bitmiştir, sıra karşı önlemdedir.",
  },
  {
    id: "EX05-suspected-root-cause",
    challenge: "suspected-cause",
    text: "Sorunun büyük ihtimalle hammadde kaynaklı olduğunu düşünüyoruz.",
    expected: {},
    mustStayUnknown: ["rootCauseKnown"],
    note:
      "ŞÜPHE KİPİ: 'düşünüyoruz' bir kanıt değildir. rootCauseKnown=true okunursa motor teşhis aşamasını atlar.",
  },
  {
    id: "EX06-suspected-supplier",
    challenge: "suspected-cause",
    text: "Muhtemelen tedarikçi değişikliğinden kaynaklanıyor ama henüz doğrulamadık.",
    expected: {},
    mustStayUnknown: ["rootCauseKnown"],
    note: "Şüpheli neden atfı, kök nedeni bilinir yapmaz.",
  },
  {
    id: "EX07-hypothetical-risk",
    challenge: "hypothetical",
    text: "Bu değişiklikten sonra çatlak oluşabilir; henüz bir hata gerçekleşmedi.",
    expected: { defectOccurred: false },
    note: "Olasılık kipi gerçekleşmiş olay değildir; reaktif yöntemler boşta çalışır.",
  },
  {
    id: "EX08-no-customer-complaint",
    challenge: "negation",
    text: "İç kontrolde yakaladık, müşteri şikâyeti gelmedi.",
    expected: { customerAffected: false },
    note: "'Müşteri' kelimesinin geçmesi müşterinin etkilendiği anlamına gelmez.",
  },
  {
    id: "EX09-investment-choice",
    challenge: "decision-not-defect",
    text: "Yeni tezgâh yatırımı için üç teklif arasından seçim yapacağız; hangi tezgâhı alacağımıza karar vereceğiz.",
    expected: { decisionBetweenOptions: true, equipmentBreakdown: false },
    note: "'Tezgâh' geçtiği için arıza, 'yatırım' geçtiği için problem sanılmamalı.",
  },
  {
    id: "EX10-chronic-not-variation",
    challenge: "plain",
    text: "Son 18 aydır fire oranımız %4 civarında sabit; belirli bir olayla başlamadı.",
    expected: { chronicPerformanceGap: true, startedRecently: false },
    note: "Kronik performans açığı, varyasyon davranışından farklıdır.",
  },
  {
    id: "EX11-variation-not-chronic-level",
    challenge: "plain",
    text: "Fire oranı %1 ile %9 arasında düzensiz değişiyor.",
    expected: { highVariation: true },
    note: "Bu bir varyasyon davranışıdır; sabit bir seviye açığı değil.",
  },
  {
    id: "EX12-constraint-signature",
    challenge: "plain",
    text: "Boya prosesinin önünde sürekli ara stok birikiyor, sonrasındaki istasyonlar malzeme bekliyor.",
    expected: { constraintQueue: true, downstreamStarvation: true },
    note: "Kısıt imzası: önünde kuyruk, sonrasında açlık.",
  },
  {
    id: "EX13-containment-needed",
    challenge: "plain",
    text: "Sahadaki ve stoktaki ürünlerde ayıklama yapmamız gerekiyor.",
    expected: { containmentNeeded: true },
    note: "Koruma ihtiyacı 8D'nin ayırt edici sinyallerinden biridir.",
  },
  {
    id: "EX14-new-design-not-existing",
    challenge: "plain",
    text: "Sıfırdan yeni bir ürün tasarlıyoruz; mevcut bir prosesi düzeltmiyoruz.",
    expected: { isNewDesign: true },
    note: "Tasarım serbestliği DMADV ile FMEA'yı ayırır.",
  },
  {
    id: "EX15-monitoring-stable",
    challenge: "plain",
    text: "Proses stabil ve yeterli; kritik ölçüyü sürekli kontrol altında tutmak istiyoruz.",
    expected: { monitoringNeed: true, processStable: true },
    note: "Kararlı ve yeterli proseste iş, iyileştirme değil kontrol altında tutmaktır.",
  },
];
