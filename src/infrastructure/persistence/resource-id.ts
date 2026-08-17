import { randomBytes } from "node:crypto";

/**
 * Kaynak kimlikleri.
 *
 * Ön ekler (`ws_`, `conv_`, `rca_`) korunur: proxy'deki yetki desenleri ve
 * mevcut kayıtlar bunlara dayanır.
 *
 * Rastgele kısım kriptografik olmalıdır. Önceki üretim
 * `Date.now().toString(36) + Math.random().toString(36).slice(2, 8)` idi:
 * zaman damgası tahmin edilebilir, `Math.random` kriptografik değil ve rastgele
 * pay yalnız ~6 base36 karakterdi. Kimliklerin sızdığı veya numaralandırıldığı
 * durumlarda bu, erişim kontrolünün üzerine binen gereksiz bir risktir.
 */
export function newResourceId(prefix: "ws" | "conv" | "rca"): string {
  return `${prefix}_${randomBytes(16).toString("base64url")}`;
}
