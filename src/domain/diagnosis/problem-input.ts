// Problem metninin kabul sınırları — teşhisin tek girdisi olduğu için burada
// tanımlanır ve üç katman da (istemci, misafir rotası, üye rotası) bunu okur.
//
// Neden domain'de: eşik bir sunum veya taşıma detayı değil, motorun anlamlı
// çalışabilmesi için gereken asgari bilgi miktarı. Eskiden üç ayrı yerde üç
// farklı değer vardı (istemci > 0, misafir ≥ 10, üye ≥ 1); pratikte üye "ab"
// yazıp çöp teşhis üretebiliyor, misafir ise sunucudan şema hatası alıyordu.

export const PROBLEM_TEXT_MIN = 10;
export const PROBLEM_TEXT_MAX = 8_000;

/** Serbest cevap metni — sorunun yanıtı, problem tanımından çok daha kısa olabilir. */
export const ANSWER_TEXT_MIN = 1;
export const ANSWER_TEXT_MAX = 4_000;

export const PROBLEM_TEXT_TOO_SHORT =
  `Problemi en az ${PROBLEM_TEXT_MIN} karakterle anlatın; sistem bundan kısa bir metinden ayırt edici soru üretemez.`;
export const PROBLEM_TEXT_TOO_LONG =
  `Problem metni en fazla ${PROBLEM_TEXT_MAX} karakter olabilir.`;

/** Metin teşhis başlatmaya yeterli mi? Boşluklar sayılmaz. */
export function problemTextAcceptable(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= PROBLEM_TEXT_MIN && trimmed.length <= PROBLEM_TEXT_MAX;
}
