// Deklaratif kural seti — KARARIN TEK DOĞRULUK KAYNAĞI.
// Her kural yalnızca BİLİNEN alanlara bakar (=== true / === false); null alan
// hiçbir kuralı tetiklemez (bu yüzden onları sorarız).
//
// Ağırlıklar (1 zayıf, 2 orta, 3 güçlü) birer KONFİGÜRASYONdur; golden-case
// suiti kalkanı altında ileride kalibre edilecektir (bkz. ARCHITECTURE.md §16).

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
    because: "Henüz hata yok, yalnızca risk → proaktif risk analizi",
    reads: ["defectOccurred"],
    traceFeature: "defectOccurred",
    when: (p) => p.features.defectOccurred === false,
    effect: { FMEA: 3, RCA: -2, EIGHT_D: -2 },
  },
  {
    id: "R2",
    because: "Gerçek bir hata oluştu → reaktif analiz",
    reads: ["defectOccurred"],
    traceFeature: "defectOccurred",
    when: (p) => p.features.defectOccurred === true,
    effect: { RCA: 1, EIGHT_D: 1, FMEA: -2 },
  },
  {
    id: "R3",
    because: "Müşteri etkisi var → müşteri yönetimi önceliği",
    reads: ["customerAffected"],
    traceFeature: "customerAffected",
    when: (p) => p.features.customerAffected === true,
    effect: { EIGHT_D: 1, RCA: 1 },
  },
  {
    id: "R4",
    because: "Müşteri etkilenmedi → 8D önceliği düşer",
    reads: ["customerAffected"],
    traceFeature: "customerAffected",
    when: (p) => p.features.customerAffected === false,
    effect: { EIGHT_D: -2 },
  },
  {
    id: "R5",
    because: "Kök neden bilinmiyor → kök neden analizi",
    reads: ["rootCauseKnown"],
    traceFeature: "rootCauseKnown",
    when: (p) => p.features.rootCauseKnown === false,
    effect: { RCA: 2, EIGHT_D: 1 },
  },
  {
    id: "R6",
    because: "Kök neden biliniyor → analiz değil, uygulama gerekir",
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
    because: "Kök neden bilinmiyor → önce teşhis; saf karşı-önlem yöntemleri henüz erken",
    reads: ["rootCauseKnown"],
    when: (p) => p.features.rootCauseKnown === false,
    effect: { POKA_YOKE: -3, SPC: -2, FIVE_S: -2 },
  },
  {
    id: "R7",
    because: "Problem yeni başladı ve yakın zamanda bir değişiklik oldu → IS/IS-NOT (Kepner-Tregoe)",
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
    because: "Problemli ve problemsiz koşullar karşılaştırılabiliyor → ayırıcı sapma analizi uygulanabilir",
    reads: ["comparisonAvailable"],
    traceFeature: "comparisonAvailable",
    when: (p) => p.features.comparisonAvailable === true,
    effect: { KEPNER_TREGOE: 2, RCA: 1 },
  },
  {
    id: "R8",
    because: "Tekrar eden problem → daha derin kök neden analizi",
    reads: ["previouslyOccurred"],
    traceFeature: "previouslyOccurred",
    when: (p) => p.features.previouslyOccurred === true,
    effect: { RCA: 2, KEPNER_TREGOE: -1 },
  },
  {
    id: "R9",
    because: "Ölçüm verisi var ve varyasyon yüksek → istatistiksel analiz (DMAIC)",
    reads: ["hasMeasurementData", "highVariation"],
    when: (p) =>
      p.features.hasMeasurementData === true && p.features.highVariation === true,
    effect: { DMAIC: 4 },
  },
  {
    id: "R9b",
    because: "Ölçüm sistemi güvenilir → istatistiksel karar altyapısı uygun",
    reads: ["measurementReliable"],
    traceFeature: "measurementReliable",
    when: (p) => p.features.measurementReliable === true,
    effect: { DMAIC: 1, SPC: 1 },
  },
  {
    id: "R9c",
    because: "Ölçüm sistemi güvenilir değil → önce ölçüm sistemini doğrula",
    reads: ["measurementReliable"],
    traceFeature: "measurementReliable",
    when: (p) => p.features.measurementReliable === false,
    effect: { DMAIC: -2, SPC: -3 },
  },
  {
    id: "R10",
    because: "Varyasyon yüksek/sürekli → istatistiksel yaklaşım",
    reads: ["highVariation"],
    traceFeature: "highVariation",
    when: (p) => p.features.highVariation === true,
    effect: { DMAIC: 2 },
  },
  {
    id: "R11",
    because: "Akut hata değil, sürekli iyileştirme → PDCA/A3",
    reads: ["isImprovementInitiative"],
    traceFeature: "isImprovementInitiative",
    when: (p) => p.features.isImprovementInitiative === true,
    effect: { PDCA_A3: 3, FMEA: -2, RCA: -1, EIGHT_D: -1 },
  },

  // --- Genişletilmiş metodolojiler ---
  {
    id: "N1",
    because: "İş yeri düzensiz/organizasyonsuz → 5S",
    reads: ["workplaceDisorganized"],
    traceFeature: "workplaceDisorganized",
    when: (p) => p.features.workplaceDisorganized === true,
    effect: { FIVE_S: 4, RCA: -1 },
  },
  {
    id: "N2",
    because: "Ekipman arızası/duruşu → ekipman odaklı analiz",
    reads: ["equipmentBreakdown"],
    traceFeature: "equipmentBreakdown",
    when: (p) => p.features.equipmentBreakdown === true,
    effect: { TPM: 1, RCA: 1 },
  },
  {
    id: "N2b",
    because: "Tekrar eden ekipman arızası → TPM güçlenir",
    reads: ["equipmentBreakdown", "previouslyOccurred"],
    when: (p) =>
      p.features.equipmentBreakdown === true && p.features.previouslyOccurred === true,
    effect: { TPM: 2 },
  },
  {
    id: "N2c",
    because: "Kronik ekipman kaybı → TPM sistemi gerekir",
    reads: ["chronicEquipmentLoss"],
    traceFeature: "chronicEquipmentLoss",
    when: (p) => p.features.chronicEquipmentLoss === true,
    effect: { TPM: 4 },
  },
  {
    id: "N3",
    because: "Akış/israf/temin süresi sorunu → Yalın / VSM",
    reads: ["flowOrWaste"],
    traceFeature: "flowOrWaste",
    when: (p) => p.features.flowOrWaste === true,
    effect: { LEAN_VSM: 4 },
  },
  {
    id: "N4",
    because: "Mevcut hata değil, yeni ürün/süreç tasarımı → DMADV (DFSS)",
    reads: ["isNewDesign"],
    traceFeature: "isNewDesign",
    when: (p) => p.features.isNewDesign === true,
    effect: { DMADV: 5, RCA: -2, EIGHT_D: -3, FMEA: -1 },
  },
  {
    id: "N5",
    because: "Stabil süreci sürekli izleme/kontrol ihtiyacı → SPC",
    reads: ["monitoringNeed"],
    traceFeature: "monitoringNeed",
    when: (p) => p.features.monitoringNeed === true,
    effect: { SPC: 4, DMAIC: -1 },
  },
  {
    id: "N5b",
    because: "Kararlı proses ve izleme ihtiyacı birlikte → SPC uygulanabilir",
    reads: ["processStable", "monitoringNeed"],
    when: (p) => p.features.processStable === true && p.features.monitoringNeed === true,
    effect: { SPC: 3 },
  },
  {
    id: "N5c",
    because: "Proses kararlı değil → kontrol kartından önce özel nedenleri çöz",
    reads: ["processStable"],
    traceFeature: "processStable",
    when: (p) => p.features.processStable === false,
    effect: { SPC: -3, DMAIC: 1, RCA: 1 },
  },
  {
    id: "N6",
    because: "İnsan hatasına açık; hata-önleme gerekli → Poka-Yoke",
    reads: ["humanErrorProne"],
    traceFeature: "humanErrorProne",
    when: (p) => p.features.humanErrorProne === true,
    effect: { POKA_YOKE: 4, FMEA: 1 },
  },
  {
    id: "N6b",
    because: "Hata modu açıkça tanımlı → hata önleme çözümü tasarlanabilir",
    reads: ["failureModeKnown"],
    traceFeature: "failureModeKnown",
    when: (p) => p.features.failureModeKnown === true,
    effect: { POKA_YOKE: 2, FMEA: 1 },
  },
  {
    id: "N7",
    because: "Dar boğaz/kapasite/çıktı kısıtı → Kısıtlar Teorisi (TOC)",
    reads: ["bottleneckThroughput"],
    traceFeature: "bottleneckThroughput",
    when: (p) => p.features.bottleneckThroughput === true,
    effect: { TOC: 4 },
  },
  {
    id: "N7b",
    because: "Akış kaybının açıkça tanımlanmış sistem kısıtından kaynaklanması → önce TOC ile kısıtı yönet",
    reads: ["bottleneckThroughput", "flowOrWaste"],
    when: (p) => p.features.bottleneckThroughput === true && p.features.flowOrWaste === true,
    effect: { TOC: 3, LEAN_VSM: -1 },
  },
  {
    id: "N8",
    because: "Gerçekleşmemiş güvenlik/regülasyon riski → proaktif risk analizi",
    reads: ["safetyOrRegulatory", "defectOccurred"],
    when: (p) => p.features.safetyOrRegulatory === true && p.features.defectOccurred === false,
    effect: { FMEA: 3 },
  },
  {
    id: "N8b",
    because: "Gerçekleşmiş güvenlik olayı → yapılandırılmış olay ve kök neden analizi",
    reads: ["safetyOrRegulatory", "defectOccurred"],
    when: (p) => p.features.safetyOrRegulatory === true && p.features.defectOccurred === true,
    effect: { RCA: 2, EIGHT_D: 1 },
  },
  {
    id: "N8c",
    because: "Müşteriye ulaşmış doğrulanmış uygunsuzluk → 8D",
    reads: ["externalNonconformance"],
    traceFeature: "externalNonconformance",
    when: (p) => p.features.externalNonconformance === true,
    effect: { EIGHT_D: 4 },
  },
  {
    id: "N8d",
    because: "Acil containment ihtiyacı → 8D disiplinli koruma akışı",
    reads: ["containmentNeeded"],
    traceFeature: "containmentNeeded",
    when: (p) => p.features.containmentNeeded === true,
    effect: { EIGHT_D: 3 },
  },
  {
    id: "N9",
    because: "Aralıklı/sporadik ortaya çıkıyor → sapma analizi (KT/RCA)",
    reads: ["intermittent"],
    traceFeature: "intermittent",
    when: (p) => p.features.intermittent === true,
    effect: { KEPNER_TREGOE: 1, RCA: 1 },
  },
  {
    id: "S1",
    because: "Proses kararlı değil → iyileştirmeden önce stabilizasyon gerekir",
    reads: ["processStable"],
    traceFeature: "processStable",
    when: (p) => p.features.processStable === false,
    effect: { SDCA: 2 },
  },
  {
    id: "S2",
    because: "Standart iş yerleşik değil → önce mevcut en iyi yöntem sabitlenmeli",
    reads: ["standardWorkEstablished"],
    traceFeature: "standardWorkEstablished",
    when: (p) => p.features.standardWorkEstablished === false,
    effect: { SDCA: 4, PDCA_A3: -2, DMAIC: -1 },
  },
  {
    id: "S3",
    because: "Temel çalışma koşulları sağlanmıyor → önce 4M baz hattı kurulmalı",
    reads: ["basicConditionsStable"],
    traceFeature: "basicConditionsStable",
    when: (p) => p.features.basicConditionsStable === false,
    effect: { SDCA: 3, PDCA_A3: -1 },
  },
  {
    id: "S4",
    because: "Standart, temel koşullar ve proses kararlılığı doğrulandı → stabilizasyon kapısı geçildi",
    reads: ["standardWorkEstablished", "basicConditionsStable", "processStable"],
    when: (p) => p.features.standardWorkEstablished === true && p.features.basicConditionsStable === true && p.features.processStable === true,
    effect: { SDCA: -3, PDCA_A3: 1, DMAIC: 1 },
  },
];

/** Kural setinin okuduğu tüm alanların birleşimi (ilgi kapısı için). */
export function referencedFeatures(rules: Rule[] = RULES): Set<DiagnosticFeatureKey> {
  const set = new Set<DiagnosticFeatureKey>();
  for (const r of rules) for (const f of r.reads) set.add(f);
  return set;
}
