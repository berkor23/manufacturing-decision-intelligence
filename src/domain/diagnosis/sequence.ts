// Metodoloji dizisi / tamamlayıcılık — SAF domain. LLM/DB YOK.
//
// İlke (makale): "Bu araçlar birbirinin alternatifi değil; bir operasyonun yaşam
// döngüsünü BİRLİKTE yönetir." Motor tek bir lider metodoloji seçer; bu modül
// o karara iki bağlam ekler:
//   1) closeAlternatives — ranking'ten liderle YARIŞAN yakın rakipler (veri).
//   2) COMPLEMENTARY     — liderden SONRA gelen doğal/tamamlayıcı yöntemler (bilgi).
// İkisi de deterministiktir; karar mantığını DEĞİŞTİRMEZ (rules.ts tek kaynak).

import { Methodology } from "./methodologies";
import { MethodologyConfidence } from "./confidence-engine";

export interface MethodologyLink {
  code: Methodology;
  /** Bu yöntemin liderden sonra neden geldiği — tek cümle Türkçe gerekçe. */
  reason: string;
}

/**
 * Her metodoloji için doğal takip/tamamlayıcı yöntemler (yaşam döngüsü grafiği).
 * Kaynak: makaledeki FMEA→KT→RCA→8D→PDCA→DMAIC döngüsü + kalite mühendisliği pratiği
 * (ör. 8D-D7 öğrenmeyi FMEA'ya işler; DMAIC-Control SPC'ye devreder).
 */
export const COMPLEMENTARY: Record<Methodology, MethodologyLink[]> = {
  FMEA: [
    { code: "RCA", reason: "Öngörülen hata modu gerçekten oluşursa kök nedeni bul." },
    { code: "SPC", reason: "Yüksek riskli karakteristikleri kontrol kartıyla izle." },
    { code: "POKA_YOKE", reason: "En kritik hata modlarını tasarımla imkânsız kıl." },
  ],
  KEPNER_TREGOE: [
    { code: "RCA", reason: "Değişiklik bulunduysa kalıcı kök nedeni derinleştir." },
    { code: "EIGHT_D", reason: "Sapma müşteriyi etkilediyse disiplinli kapatmaya geç." },
  ],
  RCA: [
    { code: "POKA_YOKE", reason: "Kök nedeni hata-önlemeyle kalıcı olarak kilitle." },
    { code: "FMEA", reason: "Bulunan hatayı FMEA'ya işleyip riski güncelle." },
    { code: "SPC", reason: "Çözümü kontrol kartıyla izleyerek kazanımı koru." },
  ],
  EIGHT_D: [
    { code: "FMEA", reason: "D7: öğrenilen kök nedeni FMEA ve kontrol planına yansıt." },
    { code: "POKA_YOKE", reason: "Kalıcı düzeltici aksiyon olarak hata-önleme kur." },
    { code: "SPC", reason: "Düzeltmenin kalıcılığını süreç kontrolüyle doğrula." },
  ],
  PDCA_A3: [
    { code: "DMAIC", reason: "Sorun veri yoğun ve varyasyon ağırlıklıysa istatistiğe geç." },
    { code: "SPC", reason: "Başarılı önlemi standartlaştırıp kontrol altında tut." },
  ],
  DMAIC: [
    { code: "SPC", reason: "Control fazı: iyileşmeyi kontrol kartıyla sürdür." },
    { code: "POKA_YOKE", reason: "Çözümü hata-önlemeyle geri dönülmez kıl." },
  ],
  FIVE_S: [
    { code: "TPM", reason: "Düzenli iş yeri, otonom bakımın (TPM) temelidir." },
    { code: "POKA_YOKE", reason: "Görsel standartları hata-önleyici kontrollere taşı." },
  ],
  TPM: [
    { code: "RCA", reason: "Kronik/tekrar eden arızalar için kök neden analizi yap." },
    { code: "SPC", reason: "Ekipman durumunu/parametreleri sürekli izle." },
    { code: "FIVE_S", reason: "Otonom bakımı 5S düzeni üstüne kur." },
  ],
  LEAN_VSM: [
    { code: "TOC", reason: "Akıştaki darboğaza (kısıt) odaklanıp çıktıyı artır." },
    { code: "DMAIC", reason: "Kalan varyasyon problemini veriyle çöz." },
    { code: "PDCA_A3", reason: "Gelecek durumu kaizen döngüleriyle hayata geçir." },
  ],
  DMADV: [
    { code: "FMEA", reason: "Tasarım FMEA ile riskleri devreye almadan önce düşür." },
    { code: "SPC", reason: "Devreye almada süreç yeteneğini izleyerek doğrula." },
    { code: "POKA_YOKE", reason: "Kritik hataları tasarımdan hata-önlemeyle engelle." },
  ],
  SPC: [
    { code: "DMAIC", reason: "Süreç yeteneği (Cp/Cpk) yetersizse iyileştirme başlat." },
    { code: "RCA", reason: "Kart özel neden sinyali verdiğinde kök nedeni araştır." },
  ],
  POKA_YOKE: [
    { code: "FMEA", reason: "Eklenen önleme/tespidi FMEA tespit puanına yansıt." },
    { code: "RCA", reason: "Hata tekrar ederse kök nedeni yeniden değerlendir." },
  ],
  TOC: [
    { code: "LEAN_VSM", reason: "Kısıt çevresindeki akışı ve israfı iyileştir." },
    { code: "DMAIC", reason: "Kısıttaki varyasyon/kaliteyi veriyle azalt." },
  ],
  SDCA: [
    { code: "PDCA_A3", reason: "Standart ve kararlı baz hat kurulduğunda kontrollü iyileştirme döngüsüne geç." },
    { code: "DMAIC", reason: "Baz hat kararlı olduktan sonra kalan varyasyonu istatistiksel yöntemlerle azalt." },
    { code: "SPC", reason: "Yerleşen standardın kararlılığını kontrol kartlarıyla izle." },
  ],
  KT_DECISION: [
    { code: "FMEA", reason: "Seçilen alternatifin olası hata modlarını devreye almadan önce proaktif değerlendir." },
    { code: "PDCA_A3", reason: "Kararı önce küçük ölçekte dene, öğren, sonra yaygınlaştır." },
  ],
};

/** Bir metodolojinin doğal takip/tamamlayıcı yöntemleri. */
export function nextMethodologies(m: Methodology): MethodologyLink[] {
  return COMPLEMENTARY[m] ?? [];
}

export interface CloseAlternativesOptions {
  /** Liderin güvenine göre eşik (0..1). Rakip conf/lider ≥ eşik ise "yakın". */
  relativeThreshold?: number;
  /** En fazla kaç alternatif döndürülsün. */
  limit?: number;
}

/**
 * Ranking'ten, lidere GÜÇLÜ şekilde rakip olan yakın alternatifleri döndürür.
 * Lider baskınsa (rakipler geride) boş döner — sadece gerçekten yarışan
 * (ör. beraberlik/az fark) yöntemleri "asıl mesele buysa şunu düşün" diye sunmak için.
 */
export function closeAlternatives(
  ranking: MethodologyConfidence[],
  opts: CloseAlternativesOptions = {},
): MethodologyConfidence[] {
  const relativeThreshold = opts.relativeThreshold ?? 0.6;
  const limit = opts.limit ?? 2;
  if (ranking.length < 2) return [];
  const leader = ranking[0].confidence;
  if (leader <= 0) return [];
  return ranking
    .slice(1)
    .filter((r) => r.confidence / leader >= relativeThreshold && r.confidence > 0)
    .slice(0, limit);
}
