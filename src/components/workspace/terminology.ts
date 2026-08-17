const STEP_LABELS: Record<string, string> = {
  define: "Problemi ve hedefi tanımla",
  measure: "Mevcut durumu ölç",
  analyze: "Kök nedenleri analiz et",
  improve: "Çözümü geliştir ve uygula",
  control: "Sonucu kontrol altında tut",
  frame: "Kararın kapsamını tanımla",
  musts: "Zorunlu kriterleri belirle",
  wants: "Tercih kriterlerini ağırlıklandır",
  score: "Alternatifleri puanla",
  risk: "Seçimin olumsuz sonuçlarını değerlendir",
  d0: "D0 · Acil müdahaleyi değerlendir",
  d1: "D1 · Ekibi oluştur",
  d2: "D2 · Problemi tanımla",
  d3: "D3 · Geçici korumayı uygula",
  d4: "D4 · Kök nedeni doğrula",
  d5: "D5 · Kalıcı düzeltici aksiyonu seç",
  d6: "D6 · Aksiyonu uygula ve doğrula",
  d7: "D7 · Tekrarı önle ve yaygınlaştır",
  d8: "D8 · Ekibi ve öğrenimi kapat",
  plan: "Planla",
  do: "Uygula",
  check: "Sonucu kontrol et",
  act: "Öğrenimi standartlaştır",
  scope: "Kapsamı ve sınırları belirle",
  functions: "İşlevleri tanımla",
  modes: "Hata türlerini belirle",
  assess: "Riskleri değerlendir",
  actions: "Risk azaltıcı aksiyonları planla",
  reassess: "Aksiyon sonrası riski yeniden değerlendir",
  prepare: "Çalışmayı hazırla",
  current: "Mevcut durumu ortaya çıkar",
  future: "Hedef durumu tasarla",
  implement: "Uygulama planını yürüt",
  sustain: "Sonucu sürdür",
  identify: "Kayıpları ve öncelikleri belirle",
  autonomous: "Operatör bakımını yapılandır",
  planned: "Planlı bakımı geliştir",
  kaizen: "Odaklı iyileştirmeyi uygula",
  standardize: "Standartlaştır ve sürdür",
  seiri: "Ayıkla",
  seiton: "Düzenle",
  seiso: "Temizle",
  seiketsu: "Standartlaştır",
  shitsuke: "Disiplini sürdür",
  characteristic: "İzlenecek özelliği belirle",
  msa: "Ölçüm sistemini doğrula",
  chart: "Kontrol grafiğini kur",
  limits: "Kontrol sınırlarını hesapla",
  reaction: "Sapma tepki planını uygula",
  monitor: "Sürekli izle",
  constraint: "Sistem kısıtını belirle",
  exploit: "Kısıttan en iyi şekilde yararlan",
  subordinate: "Diğer işleri kısıta göre hizala",
  elevate: "Kısıt kapasitesini artır",
  repeat: "Yeni kısıtı yeniden değerlendir",
  background: "Arka planı ve iş ihtiyacını açıkla",
  statement: "Problem ifadesini netleştir",
  target: "Hedef durumu tanımla",
  rootcause: "Kök nedeni doğrula",
  countermeasure: "Karşı önlemleri seç",
  implementation: "Uygulama planını oluştur",
  evidence: "Sonuç kanıtını kaydet",
  futureScenarios: "Gelecek koşullarını sorgula",
  concept: "Çözüm kavramını oluştur",
  design: "Ayrıntılı tasarımı geliştir",
  verify: "Tasarımı doğrula",
  analysis: "Ayrıştırıcı analizi yürüt",
  changes: "Değişiklikleri karşılaştır",
  hypotheses: "Olası nedenleri sınamaya hazırla",
  capability: "Proses yeterliliğini değerlendir",
  standard: "Standardı yerleştir",
  audit: "Sürdürme denetimini kur",
  error: "Önlenecek hatayı tanımla",
  prevention: "Hata önleme çözümünü tasarla",
  detection: "Algılama ve durdurmayı tasarla",
  test: "Çözümü test et",
  deployment: "Çözümü devreye al",
};

export function friendlyStepName(key: string, fallback?: string) {
  return STEP_LABELS[key.toLocaleLowerCase("tr-TR")] ?? fallback?.replace(/^\d+\s*[—.-]\s*/, "") ?? key;
}

export interface TerminologyEntry {
  term: string;
  meaning: string;
}

/**
 * Sahada sık kullanılan kısaltmaları, kullanıcıyı ayrı bir sözlüğe göndermeden
 * ilgili alanın hemen yanında açıklar. Uzun ad özellikle Türkçe tutulur;
 * kısaltma yalnız ekip içi ortak dil gerektiğinde korunur.
 */
const TERMINOLOGY: TerminologyEntry[] = [
  { term: "CTQ", meaning: "Müşteri açısından kritik kalite özelliği; müşterinin kabul veya memnuniyet kararını doğrudan etkileyen ölçüt." },
  { term: "MSA", meaning: "Ölçüm Sistemi Analizi; ölçümün tekrarlanabilir, yeniden üretilebilir ve karar vermeye yeterli olup olmadığının kontrolü." },
  { term: "OEE", meaning: "Toplam Ekipman Etkinliği; kullanılabilirlik, performans ve kalite kayıplarını birlikte gösteren ekipman göstergesi." },
  { term: "MTBF", meaning: "Arızalar arası ortalama çalışma süresi; ekipmanın ne sıklıkta arızalandığını anlamaya yardım eder." },
  { term: "MTTR", meaning: "Ortalama onarım süresi; bir arıza sonrasında ekipmanı tekrar çalışır hâle getirme hızını gösterir." },
  { term: "ERA", meaning: "Acil müdahale aksiyonu; müşteri veya proses etkisini kalıcı çözüm bulunana kadar hemen sınırlayan kısa vadeli önlem." },
  { term: "containment", meaning: "Geçici koruma; şüpheli ürünün müşteriye ya da sonraki prosese kaçmasını önleyen, kök neden çözümü olmayan ara kontrol." },
  { term: "baseline", meaning: "Başlangıç seviyesi; iyileştirme öncesindeki ölçülmüş durum ve sonraki sonuçların karşılaştırma noktası." },
  { term: "throughput", meaning: "Sistem çıktısı; hattın belirli sürede gerçekten tamamlayıp aktarabildiği iyi ürün veya iş miktarı." },
  { term: "takt", meaning: "Müşteri talebini karşılamak için bir ürünün tamamlanması gereken hedef ritim." },
  { term: "RPN", meaning: "Risk öncelik sayısı; FMEA'da şiddet, oluşma ve tespit puanlarının birlikte değerlendirilmesinden oluşan öncelik göstergesi." },
  { term: "SIPOC", meaning: "Tedarikçi, girdi, proses, çıktı ve müşteriyi üst düzeyde gösteren süreç kapsam haritası." },
  { term: "Gage R&R", meaning: "Ölçüm değişkenliğinin cihazdan ve ölçümü yapan kişilerden gelen bölümünü inceleyen MSA çalışması." },
];

export function terminologyFor(text: string): TerminologyEntry[] {
  const normalized = text.toLocaleLowerCase("tr-TR");
  return TERMINOLOGY.filter(({ term }) =>
    normalized.includes(term.toLocaleLowerCase("tr-TR")),
  );
}
