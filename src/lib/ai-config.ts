/**
 * AI sağlayıcının bu kurulumda açık olup olmadığı.
 *
 * Sunucu tarafında env'den okunur ve arayüze prop olarak geçirilir; istemci
 * bunu kendisi öğrenemez. Amaç, kapalı bir sağlayıcıya "AI ile …" diyen düğme
 * göstermemek — sistem bu durumda deterministik şablona düşer ve kullanıcı
 * ne aldığını baştan bilmelidir.
 *
 * `provider-factory.ts` ile aynı kuralı okur; oradaki fabrikayı import etmek
 * sunucu bileşenine tüm sağlayıcı zincirini taşıyacağı için ayrı tutuldu.
 */
export function aiEnabled(): boolean {
  return (process.env.AI_PROVIDER ?? "ollama").toLowerCase() !== "none";
}
