// Çıkarım (extraction) sözleşmesi — SAF.
//
// Karar motoru serbest metni HİÇ görmez; yalnız normalize edilmiş alan
// sözleşmesine bakar:
//
//     ham metin → çıkarıcı → normalize alanlar → karar motoru
//
// Bu ayrım iki şey sağlar:
//   1. Çıkarıcı değişse de (anahtar kelime ↔ dil modeli) karar davranışı sabit
//      kalır; ikisini AYRI doğrulayabiliriz.
//   2. Epistemik fark kaybolmaz.
//
// EPİSTEMİK FARK, bu katmanın asıl varlık nedenidir:
//
//     "Kök nedenin yanlış hammadde olduğu doğrulandı."   → CONFIRMED
//     "Sorunun büyük ihtimalle hammaddeden olduğunu düşünüyoruz."  → SUSPECTED
//
// İkisi aynı şey değildir. Şüpheli bir ifadeyi `rootCauseKnown = true` diye
// okumak, henüz kanıtlanmamış bir nedeni kanıtlanmış saymaktır — ve motorun
// tüm "önce teşhis" mantığını sessizce devre dışı bırakır. Bu yüzden şüpheli
// okumalar DEĞER OLARAK YAZILMAZ; alan boş bırakılır ve kullanıcıya sorulur.

import type { DiagnosticFeatureKey, Ternary } from "./features";

export type EpistemicStatus = "CONFIRMED" | "SUSPECTED";

/** Bir çıkarıcının (parser) ürettiği ham sonuç. */
export interface RawExtraction {
  features: Partial<Record<DiagnosticFeatureKey, Ternary>>;
  /**
   * Alan başına epistemik durum. Belirtilmeyen alanlar CONFIRMED sayılır —
   * çıkarıcılar yalnız şüpheli okumaları işaretlemek zorundadır.
   */
  epistemic?: Partial<Record<DiagnosticFeatureKey, EpistemicStatus>>;
}

export interface NormalizedExtraction {
  /** Karar motoruna verilecek alanlar. Şüpheli okumalar burada YOKtur. */
  features: Partial<Record<DiagnosticFeatureKey, Ternary>>;
  /**
   * Metinde şüpheli kipte geçtiği için değer olarak yazılmayan alanlar.
   * Kaybolmazlar: soru sırasında öncelikli olarak kullanıcıya doğrulatılırlar.
   */
  withheld: DiagnosticFeatureKey[];
}

/** Şüpheli okumaları değere çevirmeden ayıklar. */
export function normalizeExtraction(raw: RawExtraction): NormalizedExtraction {
  const features: Partial<Record<DiagnosticFeatureKey, Ternary>> = {};
  const withheld: DiagnosticFeatureKey[] = [];

  for (const [key, value] of Object.entries(raw.features)) {
    const featureKey = key as DiagnosticFeatureKey;
    if (value === undefined || value === null) continue;
    if (raw.epistemic?.[featureKey] === "SUSPECTED") {
      withheld.push(featureKey);
      continue;
    }
    features[featureKey] = value;
  }

  return { features, withheld };
}

/**
 * Sözleşme ihlali denetimi: bir çıkarım, beklenen okumanın TERSİNİ üretmiş mi?
 *
 * Bu, çıkarıcılar için tek SERT kuraldır. Bir alanı hiç çıkaramamak kabul
 * edilebilir (motor onu sorar); ama YANLIŞ değerle doldurmak kullanıcının
 * söylemediğini söylemiş gibi göstermektir ve sessizce yanlış karara götürür.
 */
export function contractViolations(
  actual: Partial<Record<DiagnosticFeatureKey, Ternary>>,
  expected: Partial<Record<DiagnosticFeatureKey, Ternary>>,
): { feature: DiagnosticFeatureKey; expected: Ternary; actual: Ternary }[] {
  const out: { feature: DiagnosticFeatureKey; expected: Ternary; actual: Ternary }[] = [];
  for (const [key, want] of Object.entries(expected)) {
    const featureKey = key as DiagnosticFeatureKey;
    const got = actual[featureKey];
    if (got === undefined || got === null) continue; // çıkaramamak ihlal değil
    if (got !== want) out.push({ feature: featureKey, expected: want as Ternary, actual: got });
  }
  return out;
}

/** Beklenen okumalardan kaçı gerçekten çıkarıldı? (kapsam ölçüsü) */
export function extractionCoverage(
  actual: Partial<Record<DiagnosticFeatureKey, Ternary>>,
  expected: Partial<Record<DiagnosticFeatureKey, Ternary>>,
): { hit: number; total: number } {
  const entries = Object.entries(expected);
  const hit = entries.filter(([key, want]) => actual[key as DiagnosticFeatureKey] === want).length;
  return { hit, total: entries.length };
}
