// Deklaratif kural seti — KARARIN TEK DOĞRULUK KAYNAĞI.
// Her kural yalnızca BİLİNEN alanlara bakar (=== true / === false); null alan
// hiçbir kuralı tetiklemez (bu yüzden onları sorarız).
//
// Ağırlıklar (1 zayıf, 2 orta, 3 güçlü) birer KONFİGÜRASYONdur; golden-case
// suiti kalkanı altında ileride kalibre edilecektir (bkz. docs/ARCHITECTURE.md §17).

import {
  StructuredProblem,
  DiagnosticFeatureKey,
  anyChange,
} from "./features";
import { Methodology } from "./methodologies";

export interface Rule {
  id: string;
  /** İnsan-okur gerekçe — decision trace'te kullanılır. */
  because: string;
  /** Bu kuralın okuduğu alanlar (ilgi kapısı + trace için). */
  reads: DiagnosticFeatureKey[];
  /** Trace'te değer gösterilecek alan (tekil kurallarda). Bileşik kurallarda undefined. */
  traceFeature?: DiagnosticFeatureKey;
  when: (p: StructuredProblem) => boolean;
  effect: Partial<Record<Methodology, number>>;
}

export const RULES: Rule[] = [
  {
    id: "R1",
    because: "Henüz gerçekleşmiş bir hata yok, yalnızca risk var; bu proaktif risk analizi alanıdır",
    reads: ["defectOccurred"],
    traceFeature: "defectOccurred",
    when: (p) => p.features.defectOccurred === false,
    effect: { FMEA: 3, RCA: -2, EIGHT_D: -2 },
  },
  {
    id: "R1b",
    because: "Henüz hata yok ve koşul değişikliği planlanıyor; değişiklik kaynaklı riskler önceden öngörülmeli",
    // Yeni tasarımda tetiklenmez: sıfırdan kurulan bir şey MEVCUT koşulun
    // değişmesi değildir. Aksi hâlde "değişiklik" sinyali tasarım vakasında
    // ikinci kez sayılır ve risk analizi, tasarım çerçevesinin önüne geçer.
    reads: ["defectOccurred", "processChanged", "operatorChanged", "supplierChanged", "isNewDesign"],
    when: (p) =>
      p.features.defectOccurred === false &&
      p.features.isNewDesign !== true &&
      anyChange(p) === true,
    effect: { FMEA: 3, SDCA: -1 },
  },
  {
    id: "R1c",
    because: "Potansiyel etki tanımlı ve mevcut kontrollerin yeni koşuldaki yeterliliği belirsiz; önleme ve yakalama kontrolleri sınanmalı",
    reads: ["potentialEffectKnown", "controlAdequacyUncertain"],
    when: (p) => p.features.potentialEffectKnown === true && p.features.controlAdequacyUncertain === true,
    effect: { FMEA: 3 },
  },
  {
    id: "R2",
    because: "Gerçek bir hata oluştu; reaktif analiz gerekir",
    reads: ["defectOccurred"],
    traceFeature: "defectOccurred",
    when: (p) => p.features.defectOccurred === true,
    effect: { RCA: 1, EIGHT_D: 1, FMEA: -2 },
  },
  {
    id: "R3",
    because: "Müşteri etkisi var; müşteri yönetimi öncelik kazanır",
    reads: ["customerAffected"],
    traceFeature: "customerAffected",
    when: (p) => p.features.customerAffected === true,
    effect: { EIGHT_D: 1, RCA: 1 },
  },
  {
    id: "R4",
    because: "Müşteri etkilenmedi; 8D'nin önceliği düşer",
    reads: ["customerAffected"],
    traceFeature: "customerAffected",
    when: (p) => p.features.customerAffected === false,
    effect: { EIGHT_D: -2 },
  },
  {
    id: "R5",
    because: "Kök neden bilinmiyor; önce nedenin bulunması gerekir",
    reads: ["rootCauseKnown"],
    traceFeature: "rootCauseKnown",
    when: (p) => p.features.rootCauseKnown === false,
    effect: { RCA: 2, EIGHT_D: 1 },
  },
  {
    id: "R6",
    because: "Kök neden biliniyor; kalan iş analiz değil uygulamadır",
    reads: ["rootCauseKnown"],
    traceFeature: "rootCauseKnown",
    when: (p) => p.features.rootCauseKnown === true,
    effect: { RCA: -2 },
  },
  {
    // TEŞHİS ÖNCELİĞİ: Kök neden bilinmezken saf karşı-önlem/uygulama yöntemleri
    // ERKENDİR (makalenin "araç seçmeyin, önce problemi sınıflandırın" ilkesi).
    // Poka-Yoke bilinen bir hata modunu kilitler, SPC karakterize stabil bir süreci
    // izler, 5S düzeni bir çözüm olarak uygular — üçü de nedeni bilmeyi varsayar.
    // Bu yüzden kök neden bilinmezken RCA'nın (R5: +2) önüne geçmelerini engelliyoruz.
    // Yalnızca rootCauseKnown === false iken tetiklenir → tekil arketipler (bu alanı
    // null bırakan) etkilenmez; sadece "neden bilinmiyor" DENEN vakalarda devreye girer.
    id: "R6b",
    because: "Kök neden bilinmiyor; önce teşhis gerekir, saf karşı-önlem yöntemleri bu aşamada erkendir",
    reads: ["rootCauseKnown"],
    when: (p) => p.features.rootCauseKnown === false,
    effect: { POKA_YOKE: -3, SPC: -2, FIVE_S: -2 },
  },
  {
    id: "R7",
    because: "Problem yeni başladı ve yakın zamanda bir değişiklik oldu; sapma IS / IS-NOT ile sınırlandırılabilir",
    reads: ["startedRecently", "processChanged", "operatorChanged", "supplierChanged"],
    when: (p) => p.features.startedRecently === true && anyChange(p) === true,
    effect: { KEPNER_TREGOE: 3 },
  },
  {
    id: "R7b",
    because: "Problem yeni başladı",
    reads: ["startedRecently"],
    traceFeature: "startedRecently",
    when: (p) => p.features.startedRecently === true,
    effect: { KEPNER_TREGOE: 1 },
  },
  {
    id: "R7c",
    because: "Problemli ve problemsiz koşullar karşılaştırılabiliyor; ayırıcı sapma analizi uygulanabilir",
    reads: ["comparisonAvailable"],
    traceFeature: "comparisonAvailable",
    when: (p) => p.features.comparisonAvailable === true,
    effect: { KEPNER_TREGOE: 2, RCA: 1 },
  },
  {
    id: "R8",
    because: "Problem tekrar ediyor; yüzeysel düzeltme değil daha derin kök neden analizi gerekir",
    reads: ["previouslyOccurred"],
    traceFeature: "previouslyOccurred",
    when: (p) => p.features.previouslyOccurred === true,
    effect: { RCA: 2, KEPNER_TREGOE: -1 },
  },
  {
    id: "R9",
    because: "Ölçüm verisi var ve varyasyon yüksek; ilişkiler sezgiyle değil istatistikle doğrulanabilir",
    reads: ["hasMeasurementData", "highVariation"],
    when: (p) =>
      p.features.hasMeasurementData === true && p.features.highVariation === true,
    effect: { DMAIC: 4 },
  },
  {
    id: "R9b",
    because: "Ölçüm sistemi güvenilir; istatistiksel karar altyapısı kurulabilir",
    reads: ["measurementReliable"],
    traceFeature: "measurementReliable",
    when: (p) => p.features.measurementReliable === true,
    effect: { DMAIC: 1, SPC: 1 },
  },
  {
    id: "R9c",
    because: "Ölçüm sistemi güvenilir değil; önce ölçüm sisteminin doğrulanması gerekir",
    reads: ["measurementReliable"],
    traceFeature: "measurementReliable",
    when: (p) => p.features.measurementReliable === false,
    effect: { DMAIC: -2, SPC: -3 },
  },
  {
    id: "R10",
    because: "Varyasyon yüksek ve sürekli; istatistiksel yaklaşım gerekir",
    reads: ["highVariation"],
    traceFeature: "highVariation",
    when: (p) => p.features.highVariation === true,
    effect: { DMAIC: 2 },
  },
  {
    id: "R11",
    because: "Ortada akut bir hata yok, sürekli iyileştirme çalışması var; döngüsel öğrenme çerçevesi uygundur",
    reads: ["isImprovementInitiative"],
    traceFeature: "isImprovementInitiative",
    when: (p) => p.features.isImprovementInitiative === true,
    effect: { PDCA_A3: 3, FMEA: -2, RCA: -1, EIGHT_D: -1 },
  },

  // --- Genişletilmiş metodolojiler ---
  {
    id: "N1",
    because: "Kayıpların kaynağı çalışma alanının düzensizliği; önce düzen ve standart kurulmalı",
    reads: ["workplaceDisorganized"],
    traceFeature: "workplaceDisorganized",
    when: (p) => p.features.workplaceDisorganized === true,
    effect: { FIVE_S: 4, RCA: -1 },
  },
  {
    id: "N1b",
    because: "Çalışma alanı düzensiz ve standart iş yerleşik değil; standardın görünür kılınması gerekir",
    reads: ["workplaceDisorganized", "standardWorkEstablished"],
    when: (p) => p.features.workplaceDisorganized === true && p.features.standardWorkEstablished === false,
    effect: { FIVE_S: 2 },
  },
  {
    id: "N1c",
    because: "Çalışma alanı düzensiz ve temel koşullar sağlanmıyor; başlangıç koşulları eksik",
    reads: ["workplaceDisorganized", "basicConditionsStable"],
    when: (p) => p.features.workplaceDisorganized === true && p.features.basicConditionsStable === false,
    effect: { FIVE_S: 2 },
  },
  {
    id: "N2",
    because: "Ekipman arızası veya duruşu var; analiz ekipmana odaklanmalı",
    reads: ["equipmentBreakdown"],
    traceFeature: "equipmentBreakdown",
    when: (p) => p.features.equipmentBreakdown === true,
    effect: { TPM: 1, RCA: 1 },
  },
  {
    id: "N2b",
    because: "Ekipman arızası tekrar ediyor; tekil müdahale yerine bakım sistemi gerekir",
    reads: ["equipmentBreakdown", "previouslyOccurred"],
    when: (p) =>
      p.features.equipmentBreakdown === true && p.features.previouslyOccurred === true,
    effect: { TPM: 2 },
  },
  {
    id: "N2c",
    because: "Ekipman kaybı kronik; bakımın bir yönetim sistemine dönüşmesi gerekir",
    reads: ["chronicEquipmentLoss"],
    traceFeature: "chronicEquipmentLoss",
    when: (p) => p.features.chronicEquipmentLoss === true,
    effect: { TPM: 4 },
  },
  {
    id: "N3",
    because: "Sorun akış, israf ve temin süresinde; uçtan uca değer akışı görünür kılınmalı",
    reads: ["flowOrWaste"],
    traceFeature: "flowOrWaste",
    when: (p) => p.features.flowOrWaste === true,
    effect: { LEAN_VSM: 4 },
  },
  {
    id: "N3b",
    because: "Akış kaybı ölçüm verisiyle görünür; mevcut durum haritası veriye dayanabilir",
    reads: ["flowOrWaste", "hasMeasurementData"],
    when: (p) => p.features.flowOrWaste === true && p.features.hasMeasurementData === true,
    effect: { LEAN_VSM: 2 },
  },
  {
    id: "N3c",
    because: "Akış kaybı var ama tek bir sistem kısıtı doğrulanmadı; uçtan uca haritalama kısıt yönetiminden daha uygun",
    reads: ["flowOrWaste", "bottleneckThroughput"],
    when: (p) => p.features.flowOrWaste === true && p.features.bottleneckThroughput === false,
    effect: { LEAN_VSM: 2, TOC: -1 },
  },
  {
    id: "N3d",
    because: "Akış kaybını iyileştirme amacı açık; gelecek durum tasarımına bağlanabilir",
    reads: ["flowOrWaste", "isImprovementInitiative"],
    when: (p) => p.features.flowOrWaste === true && p.features.isImprovementInitiative === true,
    effect: { LEAN_VSM: 1 },
  },
  {
    id: "N4",
    because: "Mevcut bir hata değil, yeni ürün veya süreç tasarımı söz konusu; iş düzeltme değil tasarımdır",
    reads: ["isNewDesign"],
    traceFeature: "isNewDesign",
    when: (p) => p.features.isNewDesign === true,
    effect: { DMADV: 5, RCA: -2, EIGHT_D: -3, FMEA: -1 },
  },
  {
    id: "N4b",
    because: "Yeni tasarımda gerçekleşmiş hata yok; reaktif düzeltme yerine tasarım doğrulaması gerekir",
    reads: ["isNewDesign", "defectOccurred"],
    when: (p) => p.features.isNewDesign === true && p.features.defectOccurred === false,
    effect: { DMADV: 2 },
  },
  {
    id: "N4c",
    because: "Yeni tasarım için ölçülebilir gereksinim veya kritik risk tanımlı; tasarım doğrulama altyapısı kurulabilir",
    reads: ["isNewDesign", "hasMeasurementData", "safetyOrRegulatory", "failureModeKnown"],
    when: (p) => p.features.isNewDesign === true && (
      p.features.hasMeasurementData === true ||
      p.features.safetyOrRegulatory === true ||
      p.features.failureModeKnown === true
    ),
    effect: { DMADV: 2 },
  },
  {
    id: "N5",
    because: "İhtiyaç, kararlı süreci sürekli izleyip sapmaları erken yakalamak",
    reads: ["monitoringNeed"],
    traceFeature: "monitoringNeed",
    when: (p) => p.features.monitoringNeed === true,
    effect: { SPC: 4, DMAIC: -1 },
  },
  {
    id: "N5b",
    because: "Proses kararlı ve izleme ihtiyacı var; kontrol kartı uygulanabilir",
    reads: ["processStable", "monitoringNeed"],
    when: (p) => p.features.processStable === true && p.features.monitoringNeed === true,
    effect: { SPC: 3 },
  },
  {
    id: "N5c",
    because: "Proses kararlı değil; kontrol kartından önce özel nedenlerin çözülmesi gerekir",
    reads: ["processStable"],
    traceFeature: "processStable",
    when: (p) => p.features.processStable === false,
    effect: { SPC: -3, DMAIC: 1, RCA: 1 },
  },
  {
    id: "N6",
    because: "Yanlış işlem sistem tarafından durdurulmuyor; yapısal hata önleme gerekir",
    reads: ["humanErrorProne"],
    traceFeature: "humanErrorProne",
    when: (p) => p.features.humanErrorProne === true,
    effect: { POKA_YOKE: 4, FMEA: 1 },
  },
  {
    id: "N6b",
    because: "Önlenecek hata modu açıkça tanımlı; hata önleme çözümü tasarlanabilir",
    reads: ["failureModeKnown"],
    traceFeature: "failureModeKnown",
    when: (p) => p.features.failureModeKnown === true,
    effect: { POKA_YOKE: 2, FMEA: 1 },
  },
  {
    id: "N6c",
    because: "Hata modu ve nedeni doğrulanmış; önlem varsayıma değil bilinen mekanizmaya dayanır",
    reads: ["humanErrorProne", "failureModeKnown", "rootCauseKnown"],
    when: (p) => p.features.humanErrorProne === true && p.features.failureModeKnown === true && p.features.rootCauseKnown === true,
    effect: { POKA_YOKE: 2 },
  },
  {
    id: "N7",
    because: "Sistemin çıktısını bir kapasite kısıtı sınırlıyor; önce kısıt yönetilmeli",
    reads: ["bottleneckThroughput"],
    traceFeature: "bottleneckThroughput",
    when: (p) => p.features.bottleneckThroughput === true,
    effect: { TOC: 4 },
  },
  {
    id: "N7b",
    because: "Akış kaybı açıkça tanımlanmış bir sistem kısıtından kaynaklanıyor; önce kısıt yönetilmeli",
    reads: ["bottleneckThroughput", "flowOrWaste"],
    when: (p) => p.features.bottleneckThroughput === true && p.features.flowOrWaste === true,
    effect: { TOC: 3, LEAN_VSM: -1 },
  },
  {
    id: "N7c",
    because: "Kısıt önünde düzenli kuyruk veya ara stok oluşuyor",
    reads: ["constraintQueue"],
    traceFeature: "constraintQueue",
    when: (p) => p.features.constraintQueue === true,
    effect: { TOC: 2, LEAN_VSM: 1 },
  },
  {
    id: "N7d",
    because: "Kısıt sonrasında istasyonlar aç kalıyor; sistem çıktısını tek nokta sınırlıyor",
    reads: ["downstreamStarvation"],
    traceFeature: "downstreamStarvation",
    when: (p) => p.features.downstreamStarvation === true,
    effect: { TOC: 2 },
  },
  {
    id: "N7e",
    because: "Kısıt kapasite-talep karşılaştırmasıyla sayısal olarak doğrulandı",
    reads: ["constraintMeasured"],
    traceFeature: "constraintMeasured",
    when: (p) => p.features.constraintMeasured === true,
    effect: { TOC: 2 },
  },
  {
    id: "N7f",
    because: "Kısıt iyileştirmesinin toplam sistem çıktısını artırması bekleniyor; kaldıraç noktası doğrulandı",
    reads: ["constraintLeverageExpected"],
    traceFeature: "constraintLeverageExpected",
    when: (p) => p.features.constraintLeverageExpected === true,
    effect: { TOC: 2 },
  },
  {
    id: "N8",
    because: "Güvenlik veya regülasyon riski var ama henüz gerçekleşmemiş; proaktif risk analizi gerekir",
    reads: ["safetyOrRegulatory", "defectOccurred"],
    when: (p) => p.features.safetyOrRegulatory === true && p.features.defectOccurred === false,
    effect: { FMEA: 3 },
  },
  {
    id: "N8b",
    because: "Güvenlik olayı gerçekleşmiş; yapılandırılmış olay ve kök neden analizi gerekir",
    reads: ["safetyOrRegulatory", "defectOccurred"],
    when: (p) => p.features.safetyOrRegulatory === true && p.features.defectOccurred === true,
    effect: { RCA: 2, EIGHT_D: 1 },
  },
  {
    id: "N8c",
    because: "Doğrulanmış uygunsuzluk müşteriye ulaşmış; koruma ve kalıcı düzeltici faaliyet bir arada yürütülmeli",
    reads: ["externalNonconformance"],
    traceFeature: "externalNonconformance",
    when: (p) => p.features.externalNonconformance === true,
    effect: { EIGHT_D: 4 },
  },
  {
    id: "N8d",
    because: "Acil containment ihtiyacı var; disiplinli bir koruma akışı gerekir",
    reads: ["containmentNeeded"],
    traceFeature: "containmentNeeded",
    when: (p) => p.features.containmentNeeded === true,
    effect: { EIGHT_D: 3 },
  },
  {
    id: "N9",
    because: "Problem aralıklı ve sporadik ortaya çıkıyor; sapma analizi gerekir",
    reads: ["intermittent"],
    traceFeature: "intermittent",
    when: (p) => p.features.intermittent === true,
    effect: { KEPNER_TREGOE: 1, RCA: 1 },
  },
  {
    id: "S1",
    because: "Proses kararlı değil; iyileştirmeden önce stabilizasyon gerekir",
    reads: ["processStable"],
    traceFeature: "processStable",
    when: (p) => p.features.processStable === false,
    effect: { SDCA: 2 },
  },
  {
    id: "S2",
    because: "Standart iş yerleşik değil; önce mevcut en iyi yöntem sabitlenmeli",
    reads: ["standardWorkEstablished"],
    traceFeature: "standardWorkEstablished",
    when: (p) => p.features.standardWorkEstablished === false,
    effect: { SDCA: 4, PDCA_A3: -2, DMAIC: -1 },
  },
  {
    id: "S3",
    because: "Temel çalışma koşulları sağlanmıyor; önce 4M baz hattı kurulmalı",
    reads: ["basicConditionsStable"],
    traceFeature: "basicConditionsStable",
    when: (p) => p.features.basicConditionsStable === false,
    effect: { SDCA: 3, PDCA_A3: -1 },
  },
  {
    // KARAR EKSENİ: Bu bir hata teşhisi değil, tanımlı alternatifler arasından
    // seçimdir. Reaktif/teşhis yöntemleri (RCA/8D/DMAIC/FMEA) burada yanlış kapıdır;
    // doğru araç Kepner-Tregoe Karar Analizi'dir (ağırlıklı MUST/WANT).
    id: "KD1",
    because: "Bu bir hata teşhisi değil, tanımlı alternatifler arasından yapılacak bir seçim; araç karar analizidir",
    reads: ["decisionBetweenOptions"],
    traceFeature: "decisionBetweenOptions",
    when: (p) => p.features.decisionBetweenOptions === true,
    effect: { KT_DECISION: 6, RCA: -3, EIGHT_D: -3, DMAIC: -2, FMEA: -2 },
  },
  {
    id: "KD1b",
    because: "Tanımlı seçenekler arasında bir seçim yapılmıyor; karar analizi problem çözme yönteminin yerini alamaz",
    reads: ["decisionBetweenOptions"],
    traceFeature: "decisionBetweenOptions",
    when: (p) => p.features.decisionBetweenOptions === false,
    effect: { KT_DECISION: -4 },
  },
  {
    id: "KD2",
    because: "Alternatifleri eleyen zorunlu kriterler tanımlı",
    reads: ["mandatoryCriteriaDefined"],
    traceFeature: "mandatoryCriteriaDefined",
    when: (p) => p.features.mandatoryCriteriaDefined === true,
    effect: { KT_DECISION: 2 },
  },
  {
    id: "KD3",
    because: "Alternatifleri karşılaştıracak ağırlıklı tercih kriterleri tanımlı",
    reads: ["preferenceCriteriaDefined"],
    traceFeature: "preferenceCriteriaDefined",
    when: (p) => p.features.preferenceCriteriaDefined === true,
    effect: { KT_DECISION: 2 },
  },
  {
    id: "KD4",
    because: "Karar sahibi ve karar zamanı belli",
    reads: ["decisionOwnerKnown"],
    traceFeature: "decisionOwnerKnown",
    when: (p) => p.features.decisionOwnerKnown === true,
    effect: { KT_DECISION: 1 },
  },
  {
    id: "KD5",
    because: "Karşılaştırılabilir en az iki uygulanabilir alternatif tanımlı",
    reads: ["multipleAlternativesDefined"],
    traceFeature: "multipleAlternativesDefined",
    when: (p) => p.features.multipleAlternativesDefined === true,
    effect: { KT_DECISION: 2 },
  },
  {
    id: "KD6",
    because: "Seçimden önce çözülmesi gereken, nedeni bilinmeyen bir problem var; karar puanlamasından önce teşhis gerekir",
    reads: ["unresolvedCauseBeforeDecision"],
    traceFeature: "unresolvedCauseBeforeDecision",
    when: (p) => p.features.unresolvedCauseBeforeDecision === true,
    effect: { KT_DECISION: -6, RCA: 3, KEPNER_TREGOE: 1 },
  },
  {
    id: "KD7",
    because: "Kararı engelleyen ayrı bir bilinmeyen nedenli problem yok; alternatif seçimi doğrudan yürütülebilir",
    reads: ["unresolvedCauseBeforeDecision"],
    traceFeature: "unresolvedCauseBeforeDecision",
    when: (p) => p.features.unresolvedCauseBeforeDecision === false,
    effect: { KT_DECISION: 1 },
  },
  {
    id: "S4",
    because: "Standart, temel koşullar ve proses kararlılığı doğrulandı; stabilizasyon kapısı geçildi",
    reads: ["standardWorkEstablished", "basicConditionsStable", "processStable"],
    when: (p) => p.features.standardWorkEstablished === true && p.features.basicConditionsStable === true && p.features.processStable === true,
    effect: { SDCA: -3, PDCA_A3: 1, DMAIC: 1 },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AYRIM KURALLARI (D*) — bu blok "doğru yöntemi seç"ten çok "yanlış yöntemin
  // kolayca tetiklenmesini engelle" işini yapar. Yüzeyde benzer görünen iki
  // yöntem arasındaki farkı tek bir sinyal değil, sinyal BİLEŞİMİ belirler.
  // Her kural bir çift içindir ve karşılığı discrimination.test.ts'te sabittir.
  // ─────────────────────────────────────────────────────────────────────────
  {
    // 8D ↔ RCA/PDCA. Müşteri etkisi TEK BAŞINA 8D demek değildir. 8D'nin varlık
    // nedeni koruma + bilinmeyen nedeni disiplinle kapatma + tekrarı önlemedir.
    // Kök neden zaten biliniyor, koruma gerekmiyor ve olay tekrar etmiyorsa
    // geriye kalan iş sekiz disiplinli bir yönetim akışı değil, bilinen karşı
    // önlemi uygulayıp etkinliğini doğrulamaktır.
    id: "D1",
    because: "Müşteriye ulaşmış hata var ama kök neden biliniyor, koruma gerekmiyor ve olay tekrar etmiyor; 8D'nin disiplin yükü karşılıksız kalır",
    reads: ["externalNonconformance", "rootCauseKnown", "containmentNeeded", "previouslyOccurred"],
    when: (p) =>
      p.features.externalNonconformance === true &&
      p.features.rootCauseKnown === true &&
      p.features.containmentNeeded === false &&
      p.features.previouslyOccurred === false,
    effect: { EIGHT_D: -5, PDCA_A3: 2 },
  },
  {
    id: "D1b",
    because: "Müşteri etkisi var fakat ne koruma ihtiyacı ne de tekrar söz konusu; 8D tek sinyalle tetiklenmemeli",
    reads: ["customerAffected", "containmentNeeded", "previouslyOccurred", "externalNonconformance"],
    when: (p) =>
      p.features.customerAffected === true &&
      p.features.containmentNeeded === false &&
      p.features.previouslyOccurred === false &&
      p.features.externalNonconformance !== true,
    effect: { EIGHT_D: -3 },
  },
  {
    id: "D2",
    // TPM ↔ RCA/KT. TPM bir bakım YÖNETİM SİSTEMİdir; tekil bir arıza onu
    // gerektirmez. Tekil arızanın doğru cevabı o arızanın nedenini bulmaktır.
    because: "Ekipman arızası tekil: ne tekrar ediyor ne de kronik kayıp var; bir bakım sistemi kurmak için erken",
    reads: ["equipmentBreakdown", "chronicEquipmentLoss", "previouslyOccurred"],
    when: (p) =>
      p.features.equipmentBreakdown === true &&
      p.features.chronicEquipmentLoss === false &&
      p.features.previouslyOccurred === false,
    effect: { TPM: -3, RCA: 1 },
  },
  {
    id: "D3",
    // TOC ↔ Lean/VSM. Kısıt kapasite-talep karşılaştırmasıyla SAYISAL olarak
    // doğrulandıysa kayıp akış boyunca dağınık değildir; uçtan uca haritalama
    // yerine kısıt yönetimi öncelenir.
    because: "Kısıt sayısal olarak doğrulandı; kayıp akışa dağılmış değil, tek noktada toplanıyor",
    reads: ["bottleneckThroughput", "constraintMeasured"],
    when: (p) =>
      p.features.bottleneckThroughput === true && p.features.constraintMeasured === true,
    effect: { LEAN_VSM: -2 },
  },
  {
    id: "D4",
    because: "Akış kaybı var ama ne kısıt önünde kuyruk ne de sonrasında açlık görülüyor; baskın tek kısıt kanıtı yok",
    reads: ["flowOrWaste", "constraintQueue", "downstreamStarvation"],
    when: (p) =>
      p.features.flowOrWaste === true &&
      p.features.constraintQueue === false &&
      p.features.downstreamStarvation === false,
    effect: { TOC: -3, LEAN_VSM: 2 },
  },
  {
    id: "D5",
    // SPC ↔ DMAIC. Kararlı ve varyasyonu sorun olmayan bir süreçte yapılacak iş
    // iyileştirme projesi açmak değil, kazanılmış performansı kontrol altında
    // tutmaktır.
    because: "Proses kararlı, varyasyon sorun değil ve ihtiyaç izleme; iyileştirme projesi değil kontrol gerekir",
    reads: ["processStable", "monitoringNeed", "highVariation"],
    when: (p) =>
      p.features.processStable === true &&
      p.features.monitoringNeed === true &&
      p.features.highVariation === false,
    effect: { DMAIC: -3, SPC: 2 },
  },
  {
    id: "D6",
    because: "Ölçülebilir yüksek varyasyon var ve nedeni bilinmiyor; kontrol kartı izler ama nedeni bulmaz",
    reads: ["hasMeasurementData", "highVariation", "rootCauseKnown"],
    when: (p) =>
      p.features.hasMeasurementData === true &&
      p.features.highVariation === true &&
      p.features.rootCauseKnown === false,
    effect: { DMAIC: 2, SPC: -2 },
  },
  {
    id: "D7",
    // FMEA ↔ DMADV. İkisi de "hata henüz yok" tarafındadır; ayrım tasarımın
    // yeni olup olmadığıdır. Mevcut proses için DMADV, sıfırdan tasarım
    // projesi açmak demektir — kanıt yokken pahalı bir yanlış yönlendirme.
    because: "Mevcut proses riski değerlendiriliyor, yeni bir tasarım projesi yok; risk analizi yeterlidir",
    reads: ["isNewDesign", "defectOccurred"],
    when: (p) => p.features.isNewDesign === false && p.features.defectOccurred === false,
    effect: { FMEA: 2, DMADV: -4 },
  },
  {
    id: "D9",
    // SDCA ↔ DMAIC. Operatörden operatöre değişen sonuç ölçülebilir olsa bile
    // istatistiksel bir varyasyon problemi DEĞİLDİR: kaynağı yöntem farkıdır.
    // Standart yerleşmeden açılan bir iyileştirme projesi, olmayan bir tabanın
    // üzerine kurulur ve ölçtüğü dağılım prosesin değil uygulamanın dağılımıdır.
    because: "Yayılım standardı yerleşmemiş bir işten geliyor; bu proses varyasyonu değil yöntem farkı",
    reads: ["standardWorkEstablished", "highVariation"],
    when: (p) =>
      p.features.standardWorkEstablished === false && p.features.highVariation === true,
    effect: { DMAIC: -3, SDCA: 2, SPC: -1 },
  },
  {
    id: "D8",
    // PDCA ↔ SDCA. İyileştirme niyeti varken standart yoksa iyileştirilecek bir
    // taban yoktur: PDCA'nın "Plan" adımı ölçülemeyen bir başlangıca dayanır.
    because: "İyileştirme isteniyor fakat standart iş yerleşik değil; iyileştirilecek kararlı bir taban yok",
    reads: ["isImprovementInitiative", "standardWorkEstablished"],
    when: (p) =>
      p.features.isImprovementInitiative === true &&
      p.features.standardWorkEstablished === false,
    effect: { SDCA: 2, PDCA_A3: -1 },
  },
];

/** Kural setinin okuduğu tüm alanların birleşimi (ilgi kapısı için). */
export function referencedFeatures(rules: Rule[] = RULES): Set<DiagnosticFeatureKey> {
  const set = new Set<DiagnosticFeatureKey>();
  for (const r of rules) for (const f of r.reads) set.add(f);
  return set;
}
