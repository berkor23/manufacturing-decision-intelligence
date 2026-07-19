// Metodoloji tanımları ve statik metadata. SAF.

export const METHODOLOGIES = [
  "FMEA",
  "KEPNER_TREGOE",
  "RCA",
  "EIGHT_D",
  "PDCA_A3",
  "DMAIC",
  "FIVE_S",
  "TPM",
  "LEAN_VSM",
  "DMADV",
  "SPC",
  "POKA_YOKE",
  "TOC",
  "SDCA",
] as const;

export type Methodology = (typeof METHODOLOGIES)[number];

export type MethodologyRole = "GOVERNANCE" | "ANALYSIS" | "IMPROVEMENT" | "RISK" | "DESIGN" | "COUNTERMEASURE" | "CONTROL" | "OPERATING_SYSTEM";

export const METHODOLOGY_ROLES: Record<Methodology, { role: MethodologyRole; label: string }> = {
  FMEA: { role: "RISK", label: "Proaktif risk analizi" },
  KEPNER_TREGOE: { role: "ANALYSIS", label: "Ayırıcı problem analizi" },
  RCA: { role: "ANALYSIS", label: "Kök neden analizi" },
  EIGHT_D: { role: "GOVERNANCE", label: "Problem ve müşteri yönetimi" },
  PDCA_A3: { role: "IMPROVEMENT", label: "İyileştirme çerçevesi" },
  DMAIC: { role: "IMPROVEMENT", label: "Veri temelli iyileştirme" },
  FIVE_S: { role: "OPERATING_SYSTEM", label: "Çalışma alanı standardı" },
  TPM: { role: "OPERATING_SYSTEM", label: "Ekipman yönetim sistemi" },
  LEAN_VSM: { role: "ANALYSIS", label: "Uçtan uca akış analizi" },
  DMADV: { role: "DESIGN", label: "Yeni çözüm tasarımı" },
  SPC: { role: "CONTROL", label: "İstatistiksel kontrol" },
  POKA_YOKE: { role: "COUNTERMEASURE", label: "Hata önleyici karşı önlem" },
  TOC: { role: "IMPROVEMENT", label: "Sistem kısıtı iyileştirmesi" },
  SDCA: { role: "OPERATING_SYSTEM", label: "Stabilizasyon ve standartlaştırma" },
};

export interface MethodologyMeta {
  code: Methodology;
  name: string;
  shortName: string;
  description: string;
  /** knowledge/ altındaki bilgi dosyası. */
  knowledgeFile: string;
}

export const METHODOLOGY_META: Record<Methodology, MethodologyMeta> = {
  FMEA: {
    code: "FMEA",
    name: "Failure Mode and Effects Analysis",
    shortName: "FMEA",
    description: "Risk var, hata yok — proaktif risk değerlendirmesi.",
    knowledgeFile: "FMEA.md",
  },
  KEPNER_TREGOE: {
    code: "KEPNER_TREGOE",
    name: "Kepner-Tregoe Problem Analysis",
    shortName: "Kepner-Tregoe",
    description: "Yeni başlayan, iyi tanımlı sapma; genelde bir değişiklikle ilişkili.",
    knowledgeFile: "KepnerTregoe.md",
  },
  RCA: {
    code: "RCA",
    name: "Root Cause Analysis",
    shortName: "RCA",
    description: "Kök neden bilinmiyor — kalıcı hatanın kök nedenini bul.",
    knowledgeFile: "RCA.md",
  },
  EIGHT_D: {
    code: "EIGHT_D",
    name: "8D (Eight Disciplines)",
    shortName: "8D",
    description: "Müşteri etkilendi — containment + kalıcı düzeltici aksiyon.",
    knowledgeFile: "8D.md",
  },
  PDCA_A3: {
    code: "PDCA_A3",
    name: "PDCA / A3",
    shortName: "PDCA/A3",
    description: "Sürekli iyileştirme ve döngüsel öğrenme.",
    knowledgeFile: "PDCA.md",
  },
  DMAIC: {
    code: "DMAIC",
    name: "Define-Measure-Analyze-Improve-Control",
    shortName: "DMAIC",
    description: "Veri yoğun, varyasyon yüksek — istatistiksel iyileştirme.",
    knowledgeFile: "DMAIC.md",
  },
  FIVE_S: {
    code: "FIVE_S",
    name: "5S (Sınıflandır-Düzenle-Temizle-Standartlaştır-Sürdür)",
    shortName: "5S",
    description: "İş yeri düzensizliği/organizasyon kaynaklı kayıplar.",
    knowledgeFile: "5S.md",
  },
  TPM: {
    code: "TPM",
    name: "Total Productive Maintenance",
    shortName: "TPM",
    description: "Ekipman arızası/duruşu; makine güvenilirliği ve bakım.",
    knowledgeFile: "TPM.md",
  },
  LEAN_VSM: {
    code: "LEAN_VSM",
    name: "Yalın / Value Stream Mapping",
    shortName: "Yalın/VSM",
    description: "Akış, temin süresi ve israf; değer akışı optimizasyonu.",
    knowledgeFile: "LeanVSM.md",
  },
  DMADV: {
    code: "DMADV",
    name: "DMADV / Design for Six Sigma",
    shortName: "DMADV",
    description: "Mevcut hatayı düzeltme değil; yeni ürün/süreç tasarımı.",
    knowledgeFile: "DMADV.md",
  },
  SPC: {
    code: "SPC",
    name: "Statistical Process Control",
    shortName: "SPC",
    description: "Stabil süreci kontrol kartlarıyla sürekli izleme/kontrol.",
    knowledgeFile: "SPC.md",
  },
  POKA_YOKE: {
    code: "POKA_YOKE",
    name: "Poka-Yoke (Hata Önleme)",
    shortName: "Poka-Yoke",
    description: "İnsan hatasını engelleyen hata-önleme tasarımı.",
    knowledgeFile: "PokaYoke.md",
  },
  TOC: {
    code: "TOC",
    name: "Theory of Constraints (Kısıtlar Teorisi)",
    shortName: "TOC",
    description: "Dar boğaz/kapasite kısıtı; çıktı (throughput) problemleri.",
    knowledgeFile: "TOC.md",
  },
  SDCA: {
    code: "SDCA",
    name: "Standardize-Do-Check-Act",
    shortName: "SDCA",
    description: "Kararsız veya standardı yerleşmemiş süreci iyileştirmeden önce temel koşulları sabitle.",
    knowledgeFile: "SDCA.md",
  },
};

/** Tüm metodolojiler için 0 ile başlatılmış skor kaydı. */
export function zeroScores(): Record<Methodology, number> {
  const s = {} as Record<Methodology, number>;
  for (const m of METHODOLOGIES) s[m] = 0;
  return s;
}
