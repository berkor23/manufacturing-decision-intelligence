// Metodoloji playbook tipleri — SAF domain. LLM/DB/Next YOK.
//
// Playbook = bir metodolojinin PROFESYONEL uygulama şablonu: adımlar,
// her adımın amacı/rehberi ve doldurulacak YAPILANDIRILMIŞ alanlar
// (serbest not değil; gerçek bir 8D/FMEA/KT formu gibi).
//
// Playbook ŞABLONdur (statik); doldurulan değerler workspace'te (state) yaşar.

import type { Methodology } from "../diagnosis";

/**
 * Alan tipleri. `fivewhy` ve `fishbone`, `table` ile AYNI veri şeklini
 * (TableRow[]) kullanan ÖZEL araçlardır — yalnızca sunum ve sütun sözleşmesi
 * farklıdır. Böylece kalıcılık/doğrulama/AI taslağı tek yoldan akar.
 */
export type PlaybookFieldType = "text" | "textarea" | "table" | "fivewhy" | "fishbone";
export type PlaybookFieldImportance = "REQUIRED" | "CONDITIONAL" | "OPTIONAL";

export interface PlaybookColumn {
  key: string;
  label: string;
  /** Hücre içinde gösterilecek kısa örnek veya biçim ipucu. */
  help?: string;
}

export interface PlaybookField {
  key: string;
  label: string;
  type: PlaybookFieldType;
  /** Placeholder / kısa doldurma ipucu. */
  help?: string;
  /** Alanın karar sürecindeki işlevi. Yoksa arayüz alan tipinden üretir. */
  rationale?: string;
  /** İyi bir kaydın nasıl yazılacağını gösteren kısa örnek. */
  example?: string;
  /** Alanın yeterli sayılması için kullanıcıya gösterilen kontrol ölçütü. */
  acceptance?: string;
  /** Alanın kapanış kapısındaki ağırlığı. Belirtilmezse ana çıktı olduğu için zorunlu kabul edilir. */
  importance?: PlaybookFieldImportance;
  /** Koşullu alanın hangi durumda doldurulacağını açıklar. */
  condition?: string;
  /** Serbest metnin anlamlı kabul edilmesi için gereken en düşük karakter sayısı. */
  minimumLength?: number;
  /** table/fivewhy/fishbone için: sütunlar. */
  columns?: PlaybookColumn[];
}

export interface PlaybookStep {
  key: string;
  /** Adım adı (ör. "D3 — Geçici Önlem (Containment)"). */
  name: string;
  /** Bu adımın amacı — tek cümle. */
  objective: string;
  /** Profesyonelin bu adımda nasıl çalıştığı — kısa rehber metin. */
  guidance: string;
  /** Adım sonunda ortaya çıkması beklenen somut çıktı. */
  expectedOutput?: string;
  /** Adımı tamamlamadan önce gözden geçirilecek kalite ölçütleri. */
  completionCriteria?: string[];
  fields: PlaybookField[];
}

export interface Playbook {
  methodology: Methodology;
  /** Uygulama alanının üstünde gösterilen kısa tanıtım. */
  intro: string;
  steps: PlaybookStep[];
}

/** Tablo satırı: sütun anahtarı -> hücre metni. */
export type TableRow = Record<string, string>;
export type FieldValue = string | TableRow[];

export type StepStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY"
  | "VERIFIED"
  | "SKIPPED"
  | "DONE"; // eski kayıt uyumluluğu

/** Bir adımın doldurulmuş durumu (workspace'te saklanır). */
export interface StepState {
  key: string;
  status: StepStatus;
  values: Record<string, FieldValue>;
}

/** Adım şablonundan boş durum üretir. */
export function emptyStepState(step: PlaybookStep): StepState {
  const values: Record<string, FieldValue> = {};
  for (const f of step.fields) values[f.key] = isTabular(f) ? [] : "";
  return { key: step.key, status: "PENDING", values };
}

/** Alan satır-tabanlı mı (table/fivewhy/fishbone)? */
export function isTabular(field: PlaybookField): boolean {
  return field.type === "table" || field.type === "fivewhy" || field.type === "fishbone";
}

/** Bir alanın "dolu" sayılıp sayılmadığı. */
export function fieldFilled(v: FieldValue | undefined): boolean {
  if (v == null) return false;
  return typeof v === "string" ? v.trim().length > 0 : v.length > 0;
}

/** Eski playbook kayıtlarını da kapsayan tek ve görünür önem sınıflandırması. */
export function fieldImportance(field: PlaybookField): PlaybookFieldImportance {
  if (field.importance) return field.importance;
  if (/(not|notes|observation|comment|additional|ek_|notlar|gözlem)/i.test(field.key)) return "OPTIONAL";
  if (/(contain|customer|regulat|fallback|alternative|escalat|tedarik|müşteri)/i.test(`${field.key} ${field.label}`)) return "CONDITIONAL";
  return "REQUIRED";
}

const THIN_GENERIC_ANSWERS = new Set([
  "tamam", "yapıldı", "kontrol edildi", "uygun", "ok", "evet", "hayır", "yok", "var",
]);

/** Boş olmanın ötesinde, alanın karar verilebilir içerik taşıyıp taşımadığını denetler. */
export function fieldQualityIssue(field: PlaybookField, value: FieldValue | undefined): string | null {
  const importance = fieldImportance(field);
  if (!fieldFilled(value)) return importance === "OPTIONAL" ? null : "Alan boş.";
  if (typeof value === "string") {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (THIN_GENERIC_ANSWERS.has(normalized.toLocaleLowerCase("tr-TR"))) return "Tek kelimelik genel ifade kanıt veya karar gerekçesi taşımıyor.";
    const minimum = field.minimumLength ?? (field.type === "textarea" ? 20 : 3);
    if (normalized.length < minimum) return `En az ${minimum} karakterlik somut açıklama gerekli.`;
    return null;
  }
  if (!Array.isArray(value)) return "Alan biçimi geçersiz.";
  const meaningfulRows = value.filter((row) => Object.values(row).some((cell) => cell.trim().length > 0));
  if (meaningfulRows.length === 0) return "En az bir dolu satır gerekli.";
  if ((field.columns?.length ?? 0) > 1 && !meaningfulRows.some((row) => Object.values(row).filter((cell) => cell.trim().length > 0).length >= 2)) {
    return "En az bir satırda iki ilişkili hücreyi doldurun.";
  }
  return null;
}

export function stepIsComplete(status: StepStatus | string | undefined): boolean {
  return status === "VERIFIED" || status === "SKIPPED" || status === "DONE";
}

// ── 5 Neden aracı ─────────────────────────────────────────────────

/** 5 Neden alanının sözleşmesi (fivewhy tipindeki her alan bu sütunları taşır). */
export const FIVE_WHY_COLUMNS: PlaybookColumn[] = [
  { key: "level", label: "Seviye" },
  { key: "why", label: "Neden?" },
  { key: "evidence", label: "Kanıt" },
  { key: "isRoot", label: "Kök neden mi?" },
];

const TRUTHY_CELLS = new Set(["evet", "true", "1", "yes", "x", "✓", "var", "kök neden"]);

/** Serbest metin bir hücreyi "işaretli" olarak yorumlar (AI çıktısı toleranslı). */
export function isCellMarked(v: string | undefined): boolean {
  return v != null && TRUTHY_CELLS.has(v.trim().toLowerCase());
}

// ── Balık kılçığı (6M) aracı ──────────────────────────────────────

export type FishboneCategoryKey =
  | "MAN"
  | "MACHINE"
  | "METHOD"
  | "MATERIAL"
  | "MEASUREMENT"
  | "ENVIRONMENT";

export const FISHBONE_CATEGORIES: { key: FishboneCategoryKey; label: string }[] = [
  { key: "MAN", label: "İnsan" },
  { key: "MACHINE", label: "Makine" },
  { key: "METHOD", label: "Metot" },
  { key: "MATERIAL", label: "Malzeme" },
  { key: "MEASUREMENT", label: "Ölçüm" },
  { key: "ENVIRONMENT", label: "Çevre" },
];

/** Balık kılçığı alanının sözleşmesi. */
export const FISHBONE_COLUMNS: PlaybookColumn[] = [
  { key: "category", label: "Kategori (6M)" },
  { key: "cause", label: "Olası neden" },
  { key: "assessment", label: "Değerlendirme (kanıtla)" },
];

/** 6M eş anlamlıları — AI ya da kullanıcı serbest metin yazabilir. */
const FISHBONE_ALIASES: Record<string, FishboneCategoryKey> = {
  man: "MAN",
  insan: "MAN",
  "i̇nsan": "MAN",
  operator: "MAN",
  operatör: "MAN",
  machine: "MACHINE",
  makine: "MACHINE",
  makina: "MACHINE",
  ekipman: "MACHINE",
  method: "METHOD",
  metot: "METHOD",
  metod: "METHOD",
  yöntem: "METHOD",
  yontem: "METHOD",
  süreç: "METHOD",
  surec: "METHOD",
  material: "MATERIAL",
  malzeme: "MATERIAL",
  hammadde: "MATERIAL",
  measurement: "MEASUREMENT",
  ölçüm: "MEASUREMENT",
  olcum: "MEASUREMENT",
  ölçme: "MEASUREMENT",
  environment: "ENVIRONMENT",
  çevre: "ENVIRONMENT",
  cevre: "ENVIRONMENT",
  ortam: "ENVIRONMENT",
};

/** Serbest metin kategoriyi 6M anahtarına çevirir; tanınmazsa null. */
export function normalizeFishboneCategory(raw: string | undefined): FishboneCategoryKey | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const direct = FISHBONE_ALIASES[s];
  if (direct) return direct;
  // "Makine / Ekipman" gibi bileşik yazımlar için parça parça dene.
  for (const token of s.split(/[^\p{L}]+/u)) {
    const hit = FISHBONE_ALIASES[token];
    if (hit) return hit;
  }
  return null;
}
