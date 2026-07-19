// Metodoloji playbook kataloğu — SAF domain verisi.
//
// Her metodoloji için endüstride kullanılan GERÇEK form yapısını yansıtan
// adımlar ve yapılandırılmış alanlar. Bu katalog uygulama alanının (workspace)
// tohumudur; AI taslak üretimi ve profesyonel rapor da bu şablona dayanır.
//
// Not: knowledge/*.md insan-okur bilgi tabanıdır (rehber/rapor bağlamı);
// buradaki playbook ise UYGULAMANIN yapısal şablonudur. Karar mantığı
// (hangi metodoloji?) her zaman rules.ts'tedir — burada karar YOKTUR.

import type { Methodology } from "../diagnosis";
import type { Playbook, PlaybookColumn } from "./types";
import { FISHBONE_COLUMNS, FIVE_WHY_COLUMNS } from "./types";

// Sık kullanılan sütun setleri
const ACTION_COLS: PlaybookColumn[] = [
  { key: "action", label: "Aksiyon" },
  { key: "owner", label: "Sorumlu" },
  { key: "due", label: "Termin" },
  { key: "status", label: "Durum" },
];

const TEAM_COLS: PlaybookColumn[] = [
  { key: "name", label: "İsim" },
  { key: "role", label: "Rol" },
  { key: "dept", label: "Bölüm" },
];

export const PLAYBOOKS: Record<Methodology, Playbook> = {
  // ────────────────────────────────────────────────────────── 8D
  EIGHT_D: {
    methodology: "EIGHT_D",
    intro:
      "8D, müşteriyi etkileyen problemlerde ekip temelli, disiplinli bir çözüm sürecidir: önce müşteriyi koru (D3), sonra kök nedeni bul ve kalıcı olarak kapat (D4–D7).",
    steps: [
      {
        key: "d0",
        name: "D0 — Acil Müdahale ve Hazırlık",
        objective: "8D'nin gerekli olduğunu doğrula; müşteriyi/süreci korumak için acil müdahale (ERA) al.",
        guidance:
          "Kök nedeni beklemeden acil müdahaleyi (ERA) uygula: gerekiyorsa hattı durdur, şüpheli stoğu bloke et, müşteriyi bilgilendir. Sonra 8D ölçütlerini kontrol et: problem tanımlı ve önemli mi, nedeni bilinmiyor mu, tekrar ediyor mu? Ölçütler karşılanmıyorsa daha basit bir yöntem (KT/tekil düzeltici aksiyon) yeterli olabilir.",
        fields: [
          { key: "warrant", label: "8D gerekçesi (neden 8D?)", type: "textarea", help: "Önem, tekrar, bilinmeyen neden ölçütleri" },
          {
            key: "era",
            label: "Acil müdahale (ERA) aksiyonları",
            type: "table",
            columns: [
              { key: "action", label: "Acil aksiyon" },
              { key: "owner", label: "Sorumlu" },
              { key: "status", label: "Durum" },
            ],
          },
        ],
      },
      {
        key: "d1",
        name: "D1 — Ekibi Kur",
        objective: "Problemi çözecek çok disiplinli ekibi ve lideri belirle.",
        guidance:
          "Süreci tanıyan, karar yetkisi olan 3-6 kişilik bir ekip kur: kalite, üretim, süreç/ürün mühendisliği ve gerekiyorsa tedarikçi temsilcisi. Bir şampiyon (sponsor) ve bir ekip lideri ata.",
        fields: [
          { key: "team", label: "Ekip üyeleri", type: "table", columns: TEAM_COLS },
          { key: "leader", label: "Ekip lideri / şampiyon", type: "text", help: "Lider ve sponsor" },
        ],
      },
      {
        key: "d2",
        name: "D2 — Problemi Tanımla",
        objective: "Problemi veriyle, 5N2K (5W2H) ile nesnel olarak tanımla.",
        guidance:
          "Belirti değil, ölçülebilir sapma yaz: Ne, Nerede, Ne zaman, Kim fark etti, Ne kadar (adet/oran), Nasıl tespit edildi. 'Operatör hatası' gibi erken neden atfetme — sadece gözlemlenen gerçekler.",
        fields: [
          { key: "what", label: "Ne / Hangi ürün-süreç", type: "text" },
          { key: "whereWhen", label: "Nerede ve ne zaman", type: "text" },
          { key: "magnitude", label: "Ne kadar (adet, oran, trend)", type: "text" },
          {
            key: "statement",
            label: "Problem cümlesi",
            type: "textarea",
            help: "Tek paragraf, ölçülebilir, neden içermeyen tanım",
          },
        ],
      },
      {
        key: "d3",
        name: "D3 — Geçici Önlem (Containment)",
        objective: "Kök neden bulunana kadar müşteriyi kusurdan izole et.",
        guidance:
          "Stok, hat, transit ve müşterideki ürünü kapsayacak şekilde ayıklama/karantina planla. Her önlemin ETKİNLİĞİNİ doğrula (ör. ayıklama sonrası kaçak 0 mu?). Containment maliyetlidir; geçici olduğunu unutma.",
        fields: [
          {
            key: "containmentActions",
            label: "Containment aksiyonları",
            type: "table",
            columns: [
              { key: "action", label: "Önlem" },
              { key: "scope", label: "Kapsam (stok/hat/müşteri)" },
              { key: "owner", label: "Sorumlu" },
              { key: "verification", label: "Etkinlik doğrulaması" },
            ],
          },
          { key: "effectiveness", label: "Etkinlik değerlendirmesi", type: "textarea", help: "Kaçak devam ediyor mu? Kanıt?" },
        ],
      },
      {
        key: "d4",
        name: "D4 — Kök Nedeni Belirle",
        objective: "Oluşma VE kaçış kök nedenlerini kanıtla doğrula.",
        guidance:
          "İki soru birden: kusur neden OLUŞTU ve kontrol sisteminden neden KAÇTI? 5 Neden / balık kılçığı kullan; her hipotezi veriyle test et. Kök neden, 'kaldırınca problem tekrarlanamıyor' olduğunda doğrulanmıştır.",
        fields: [
          { key: "fiveWhy", label: "5 Neden zinciri", type: "fivewhy", columns: FIVE_WHY_COLUMNS },
          { key: "occurrenceRoot", label: "Oluşma kök nedeni", type: "textarea" },
          { key: "escapeRoot", label: "Kaçış kök nedeni (neden yakalanamadı?)", type: "textarea" },
        ],
      },
      {
        key: "d5",
        name: "D5 — Kalıcı Düzeltici Aksiyonları Seç",
        objective: "Kök nedeni ortadan kaldıran kalıcı çözümü seç ve doğrula.",
        guidance:
          "Her kök neden için en az bir kalıcı aksiyon tanımla; yan etkilerini değerlendir. Mümkünse pilotla küçük ölçekte kanıtla. 'Operatöre eğitim ver' tek başına zayıf bir D5'tir — süreci/tasarımı değiştir.",
        fields: [
          {
            key: "correctiveActions",
            label: "Kalıcı düzeltici aksiyonlar",
            type: "table",
            columns: [
              { key: "rootCause", label: "Hedeflenen kök neden" },
              { key: "action", label: "Aksiyon" },
              { key: "owner", label: "Sorumlu" },
              { key: "due", label: "Termin" },
              { key: "status", label: "Durum" },
            ],
          },
        ],
      },
      {
        key: "d6",
        name: "D6 — Uygula ve Doğrula",
        objective: "Kalıcı aksiyonları devreye al, etkinliği veriyle kanıtla.",
        guidance:
          "Uygulama sonrası aynı metrikle izle (ör. 30/60/90 gün hata oranı). Etkinlik kanıtlanınca D3 geçici önlemlerini kontrollü şekilde kaldır.",
        fields: [
          { key: "implementation", label: "Uygulama kaydı", type: "textarea", help: "Ne, ne zaman devreye alındı?" },
          { key: "verification", label: "Etkinlik doğrulaması (veri)", type: "textarea", help: "Önce/sonra metrikleri" },
          { key: "containmentRemoval", label: "Containment kaldırma kararı", type: "text" },
        ],
      },
      {
        key: "d7",
        name: "D7 — Tekrarı Önle (Sistemik)",
        objective: "Aynı hatanın benzer süreç/ürünlerde oluşmasını sistemik olarak engelle.",
        guidance:
          "Öğrenmeyi sisteme göm: FMEA, kontrol planı, iş talimatı, bakım planı ve eğitim dokümanlarını güncelle; benzer hat/ürünlere yaygınlaştır (yatay yayılım).",
        fields: [
          {
            key: "systemUpdates",
            label: "Güncellenen dokümanlar / sistemler",
            type: "table",
            columns: [
              { key: "document", label: "Doküman/Sistem" },
              { key: "change", label: "Değişiklik" },
              { key: "owner", label: "Sorumlu" },
            ],
          },
          { key: "horizontal", label: "Yatay yayılım (benzer süreçler)", type: "textarea" },
        ],
      },
      {
        key: "d8",
        name: "D8 — Ekibi Takdir Et ve Kapat",
        objective: "Sonuçları müşteriyle paylaş, ekibi takdir et, dosyayı kapat.",
        guidance:
          "Müşteriye özet rapor hazırla (problem → kök neden → kalıcı önlem → kanıt). Öğrenilen dersleri kaydet ve ekibin katkısını görünür kıl.",
        fields: [
          { key: "customerReport", label: "Müşteri kapanış özeti", type: "textarea" },
          { key: "lessons", label: "Öğrenilen dersler", type: "textarea" },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── RCA
  RCA: {
    methodology: "RCA",
    intro:
      "Kök Neden Analizi: belirtiyi değil nedeni tedavi et. Kanıt topla, neden zincirini kur, kök nedeni doğrula, kalıcı önlem al ve etkinliği kontrol et.",
    steps: [
      {
        key: "define",
        name: "1 — Problemi Tanımla",
        objective: "Sapmayı ölçülebilir ve nesnel biçimde tanımla.",
        guidance:
          "Ne olması gerekiyordu, ne oluyor? Farkı sayıyla ifade et. Kapsamı netleştir: hangi ürün, hangi hat, hangi vardiya, ne zamandan beri.",
        fields: [
          { key: "statement", label: "Problem cümlesi", type: "textarea", help: "Ölçülebilir, neden içermeyen tanım" },
          { key: "scope", label: "Kapsam (ürün/hat/vardiya/dönem)", type: "text" },
        ],
      },
      {
        key: "evidence",
        name: "2 — Kanıt Topla",
        objective: "Fikir değil veri: fiziksel kanıt, kayıt ve gözlem topla.",
        guidance:
          "Gemba'ya git (olay yerinde gözlem yap). Kusurlu parçaları, süreç parametre kayıtlarını, vardiya/parti dağılımını topla. Kanıt olmadan yapılan analiz tahmindir.",
        fields: [
          {
            key: "evidenceTable",
            label: "Kanıtlar",
            type: "table",
            columns: [
              { key: "evidence", label: "Kanıt / Veri" },
              { key: "source", label: "Kaynak" },
              { key: "finding", label: "Bulgu" },
            ],
          },
        ],
      },
      {
        key: "analyze",
        name: "3 — Neden Analizi (5 Neden + Balık Kılçığı)",
        objective: "Olası nedenleri sistematik üret, zinciri kök nedene kadar derinleştir.",
        guidance:
          "Balık kılçığı (6M: Makine, Malzeme, Metot, İnsan, Ölçüm, Çevre) ile olası nedenleri tara; en güçlü adayları 5 Neden ile derinleştir. Her 'neden'i kanıta bağla.",
        fields: [
          {
            key: "fishbone",
            label: "Balık kılçığı (6M) adayları",
            type: "fishbone",
            columns: FISHBONE_COLUMNS,
          },
          { key: "fiveWhy", label: "5 Neden zinciri", type: "fivewhy", columns: FIVE_WHY_COLUMNS },
        ],
      },
      {
        key: "rootcause",
        name: "4 — Kök Nedeni Doğrula",
        objective: "Kök nedeni kanıtla; 'kaldır → problem yok' testini uygula.",
        guidance:
          "Kök neden hipotezini tersine test et: bu neden ortadan kalktığında problem tekrarlanabiliyor mu? Mümkünse kontrollü deneme yap. Doğrulanmamış kök neden, yanlış yatırım demektir.",
        fields: [
          { key: "rootCause", label: "Doğrulanmış kök neden", type: "textarea" },
          { key: "verification", label: "Doğrulama yöntemi ve kanıtı", type: "textarea" },
        ],
      },
      {
        key: "prevent",
        name: "5 — Kalıcı Önlem Al",
        objective: "Kök nedeni ortadan kaldıran önlemleri planla ve uygula.",
        guidance:
          "Önlem hiyerarşisini gözet: tasarımla engelle (poka-yoke) > süreci değiştir > kontrol ekle > eğit. Önlemleri standartlara (talimat, kontrol planı) işle.",
        fields: [{ key: "actions", label: "Önlemler", type: "table", columns: ACTION_COLS }],
      },
      {
        key: "verify",
        name: "6 — Etkinliği Kontrol Et",
        objective: "Önlem sonrası problemi veriyle izle; tekrar yoksa kapat.",
        guidance:
          "Aynı metrikle önce/sonra karşılaştır (ör. 30-90 gün). Tekrar görülürse analiz eksik demektir — 3. adıma dön.",
        fields: [
          { key: "monitoring", label: "İzleme sonucu (önce/sonra verisi)", type: "textarea" },
          { key: "closure", label: "Kapanış kararı", type: "text" },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────── Kepner-Tregoe
  KEPNER_TREGOE: {
    methodology: "KEPNER_TREGOE",
    intro:
      "Kepner-Tregoe Problem Analizi: yeni başlayan sapmalarda IS / IS-NOT karşılaştırması ve değişiklik analiziyle nedeni mantıksal olarak daralt.",
    steps: [
      {
        key: "statement",
        name: "1 — Sapma Cümlesi",
        objective: "Neyin, hangi standarttan saptığını tek cümlede tanımla.",
        guidance:
          "'Nesne + kusur' formatı kullan: 'X ürününde Y hattında çapak var' gibi. Standart neydi, gözlenen ne? Sapmanın başlangıç anını mümkün olduğunca kesin belirle.",
        fields: [
          { key: "deviation", label: "Sapma cümlesi (nesne + kusur)", type: "text" },
          { key: "since", label: "Ne zamandan beri", type: "text" },
        ],
      },
      {
        key: "isisnot",
        name: "2 — IS / IS-NOT Matrisi",
        objective: "Problemin sınırlarını çiz: nerede VAR, nerede mantıken olabilirdi ama YOK?",
        guidance:
          "Her boyut için hem IS hem IS-NOT doldur: Ne (hangi ürün/kusur — hangileri değil), Nerede (hangi hat/istasyon/bölge — nereler değil), Ne zaman (ne zaman görülüyor — ne zaman değil), Ne kadar (boyut/trend). IS-NOT tarafı, nedenleri eleyecek en güçlü bilgidir.",
        fields: [
          {
            key: "matrix",
            label: "IS / IS-NOT matrisi",
            type: "table",
            columns: [
              { key: "dimension", label: "Boyut (Ne/Nerede/Ne zaman/Ne kadar)" },
              { key: "is", label: "IS (var)" },
              { key: "isnot", label: "IS-NOT (yok ama olabilirdi)" },
              { key: "distinction", label: "Fark / Tuhaflık" },
            ],
          },
        ],
      },
      {
        key: "changes",
        name: "3 — Değişiklik Analizi",
        objective: "Sapmanın başladığı ana yakın tüm değişiklikleri listele.",
        guidance:
          "Farklara bağlı değişiklikleri ara: malzeme partisi, takım/kalıp, operatör, parametre, bakım, tedarikçi, çevre. Tarihleri sapma başlangıcıyla yan yana koy — zaman uyumu olmayan değişiklik neden olamaz.",
        fields: [
          {
            key: "changeList",
            label: "Değişiklikler",
            type: "table",
            columns: [
              { key: "change", label: "Değişiklik" },
              { key: "date", label: "Tarih" },
              { key: "relation", label: "Sapma ile zaman ilişkisi" },
            ],
          },
        ],
      },
      {
        key: "hypotheses",
        name: "4 — Olası Nedenleri Test Et",
        objective: "Her hipotezi IS/IS-NOT gerçekleriyle mantıksal olarak sına.",
        guidance:
          "Her aday neden için sor: 'Bu neden, IS tarafını açıklarken IS-NOT tarafını da açıklıyor mu?' Tek bir IS-NOT gerçeğini açıklayamayan hipotez elenir veya varsayım gerektirir. En az varsayımla ayakta kalan hipotez en olası nedendir.",
        fields: [
          {
            key: "tests",
            label: "Hipotez testleri",
            type: "table",
            columns: [
              { key: "hypothesis", label: "Olası neden" },
              { key: "fit", label: "IS/IS-NOT'a uyum" },
              { key: "verdict", label: "Sonuç (elendi / aday)" },
            ],
          },
        ],
      },
      {
        key: "verify",
        name: "5 — Doğrula ve Düzelt",
        objective: "En olası nedeni sahada doğrula, düzeltici aksiyonu uygula.",
        guidance:
          "Doğrulamayı mümkünse tersinir bir deneyle yap (değişikliği geri al → sapma kayboluyor mu?). Doğrulanınca düzeltici aksiyonu planla ve tekrarı önlemek için standardı güncelle.",
        fields: [
          { key: "verification", label: "Doğrulama (deney/kanıt)", type: "textarea" },
          { key: "actions", label: "Düzeltici aksiyonlar", type: "table", columns: ACTION_COLS },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── FMEA
  FMEA: {
    methodology: "FMEA",
    intro:
      "FMEA: hata henüz oluşmadan riskleri sistematik değerlendir. Hata modlarını, etkilerini ve nedenlerini puanla (S×O×D), yüksek riskleri aksiyonla düşür.",
    steps: [
      {
        key: "scope",
        name: "1 — Kapsam ve Ekip",
        objective: "Analiz sınırını (süreç/ürün) ve çok disiplinli ekibi belirle.",
        guidance:
          "Süreç FMEA mı, tasarım FMEA mı? Süreç akış şemasını çıkar ve analiz edilecek adımları sınırla. Ekipte süreci fiilen yürüten kişiler mutlaka olmalı.",
        fields: [
          { key: "scope", label: "Kapsam (süreç/ürün ve sınırlar)", type: "textarea" },
          { key: "team", label: "Ekip", type: "table", columns: TEAM_COLS },
        ],
      },
      {
        key: "functions",
        name: "2 — Fonksiyonlar ve Gereksinimler",
        objective: "Her süreç adımının fonksiyonunu ve gereksinimini tanımla.",
        guidance:
          "Her adım için 'bu adım ne yapmalı, hangi spesifikasyonu sağlamalı?' sorusuna cevap yaz. Hata modu, bu gereksinimin karşılanmama biçimidir — gereksinim net değilse FMEA temelsiz kalır.",
        fields: [
          {
            key: "functionTable",
            label: "Adım / fonksiyon / gereksinim",
            type: "table",
            columns: [
              { key: "step", label: "Süreç adımı" },
              { key: "function", label: "Fonksiyon" },
              { key: "requirement", label: "Gereksinim / Spek" },
            ],
          },
        ],
      },
      {
        key: "futureScenarios",
        name: "3 — Değişim, Varsayım ve Gelecek Senaryoları",
        objective: "Geçmiş hata kayıtlarıyla sınırlı kalmadan sistemin gelecekte hangi koşullarda başarısız olabileceğini araştır.",
        guidance:
          "Yeni operatör, malzeme, tedarikçi, kapasite, bakım, yazılım, ürün varyantı veya çevre koşulunu düşün. Her senaryoda mevcut varsayımın ve kontrolün hangi koşulda kırılacağını yaz; sezgiyi kanıt sayma, doğrulama ihtiyacını ayrıca kaydet.",
        fields: [
          {
            key: "scenarioTable",
            label: "Gelecek senaryoları ve varsayım kırılmaları",
            type: "table",
            columns: [
              { key: "changingElement", label: "Değişebilecek unsur" },
              { key: "assumption", label: "Mevcut varsayım" },
              { key: "scenario", label: "Değişim senaryosu" },
              { key: "systemResponse", label: "Sistemin olası tepkisi" },
              { key: "failureMode", label: "Olası hata modu" },
              { key: "control", label: "Mevcut kontrol" },
              { key: "breakCondition", label: "Kontrolün kırılma koşulu" },
              { key: "evidence", label: "Dayanıklılık kanıtı / doğrulama ihtiyacı" },
            ],
          },
        ],
      },
      {
        key: "analysis",
        name: "4 — Hata Modu Analizi (S·O·D)",
        objective: "Hata modlarını, etki-neden-kontrolleriyle puanla.",
        guidance:
          "Her hata modu için: Etki → Şiddet (S 1-10), Neden → Olasılık (O 1-10), Mevcut kontrol → Tespit (D 1-10; yüksek D = zor tespit). RPN = S×O×D. Puanlamada ekip mutabakatı ara; S=9-10 (güvenlik/regülasyon) RPN'den bağımsız önceliklidir.",
        fields: [
          {
            key: "fmeaTable",
            label: "FMEA tablosu",
            type: "table",
            columns: [
              { key: "step", label: "Süreç adımı" },
              { key: "riskSource", label: "Risk kaynağı" },
              { key: "scenario", label: "Değişim senaryosu" },
              { key: "failureMode", label: "Hata modu" },
              { key: "effect", label: "Etki" },
              { key: "s", label: "S" },
              { key: "cause", label: "Neden" },
              { key: "o", label: "O" },
              { key: "preventionControl", label: "Önleyici kontrol" },
              { key: "detectionControl", label: "Tespit kontrolü" },
              { key: "controlEvidence", label: "Kontrol etkinliği kanıtı" },
              { key: "d", label: "D" },
              { key: "rpn", label: "RPN" },
            ],
          },
        ],
      },
      {
        key: "actions",
        name: "5 — Riskleri Düşür",
        objective: "Yüksek riskli maddelere önleme/tespit aksiyonu planla.",
        guidance:
          "Önce S'yi (tasarım değişikliği), sonra O'yu (nedeni engelle — poka-yoke), en son D'yi (kontrol ekle) düşürmeye çalış. Kontrol eklemek en zayıf iyileştirmedir.",
        fields: [
          {
            key: "riskActions",
            label: "Risk azaltma aksiyonları",
            type: "table",
            columns: [
              { key: "item", label: "Hata modu (yüksek risk)" },
              { key: "action", label: "Aksiyon" },
              { key: "owner", label: "Sorumlu" },
              { key: "due", label: "Termin" },
              { key: "status", label: "Durum" },
            ],
          },
        ],
      },
      {
        key: "reassess",
        name: "6 — Yeniden Puanla ve Yaşat",
        objective: "Aksiyon sonrası S·O·D'yi güncelle; FMEA'yı canlı doküman yap.",
        guidance:
          "Aksiyon tamamlanınca ilgili satırların S/O/D'sini yeniden puanla ve yeni RPN'i kaydet. FMEA'yı süreç değişikliklerinde ve yeni hata olaylarında güncellenecek şekilde sahiplendir.",
        fields: [
          {
            key: "newScores",
            label: "Aksiyon sonrası puanlar",
            type: "table",
            columns: [
              { key: "item", label: "Hata modu" },
              { key: "newS", label: "Yeni S" },
              { key: "newO", label: "Yeni O" },
              { key: "newD", label: "Yeni D" },
              { key: "newRpn", label: "Yeni RPN" },
            ],
          },
          {
            key: "livingTriggers",
            label: "FMEA yeniden değerlendirme tetikleyicileri",
            type: "table",
            columns: [
              { key: "trigger", label: "Değişiklik / tetikleyici" },
              { key: "owner", label: "İzleme sahibi" },
              { key: "reviewRule", label: "Gözden geçirme kuralı" },
              { key: "lastReview", label: "Son gözden geçirme" },
            ],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────── PDCA / A3
  PDCA_A3: {
    methodology: "PDCA_A3",
    intro:
      "PDCA/A3: iyileştirmeyi bilimsel döngüyle yürüt — mevcut durumu anla, hedef koy, kök nedene karşı önlem planla, dene, ölç, standartlaştır.",
    steps: [
      {
        key: "background",
        name: "1 — Arka Plan ve Mevcut Durum",
        objective: "Neden bu konu? Mevcut durumu veriyle görünür kıl.",
        guidance:
          "İş hedefiyle bağını kur (kalite, maliyet, termin). Mevcut durumu gidip yerinde gözle ve sayılarla anlat: mevcut performans, kayıplar, trend.",
        fields: [
          { key: "background", label: "Arka plan (neden önemli)", type: "textarea" },
          { key: "current", label: "Mevcut durum (veriyle)", type: "textarea" },
        ],
      },
      {
        key: "target",
        name: "2 — Hedef",
        objective: "Ölçülebilir ve süreli hedef tanımla.",
        guidance:
          "'Neyi, ne kadardan ne kadara, ne zamana kadar' formatında yaz. Hedef, mevcut durum verisiyle aynı metrikte olmalı.",
        fields: [{ key: "target", label: "Hedef cümlesi", type: "textarea" }],
      },
      {
        key: "analysis",
        name: "3 — Analiz (Kök Neden)",
        objective: "Mevcut durum ile hedef arasındaki farkın nedenlerini bul.",
        guidance:
          "Farkı doğuran ana nedenleri 5 Neden / Pareto ile daralt. En büyük katkıyı yapan az sayıda nedene odaklan.",
        fields: [
          {
            key: "causes",
            label: "Neden analizi",
            type: "table",
            columns: [
              { key: "gap", label: "Fark / kayıp" },
              { key: "cause", label: "Kök neden" },
              { key: "evidence", label: "Kanıt" },
            ],
          },
        ],
      },
      {
        key: "plan",
        name: "4 — Plan (Karşı Önlemler)",
        objective: "Her kök nedene karşı önlem, sorumlu ve termin planla.",
        guidance:
          "Karşı önlem, kök nedenle birebir eşleşmeli. Küçük ve hızlı denenebilir adımları tercih et — büyük tek hamle yerine kısa döngüler.",
        fields: [
          {
            key: "countermeasures",
            label: "Karşı önlem planı",
            type: "table",
            columns: [
              { key: "cause", label: "Kök neden" },
              { key: "countermeasure", label: "Karşı önlem" },
              { key: "owner", label: "Sorumlu" },
              { key: "due", label: "Termin" },
              { key: "status", label: "Durum" },
            ],
          },
        ],
      },
      {
        key: "do",
        name: "5 — Do (Uygula)",
        objective: "Planı uygula; sapmaları ve gözlemleri kaydet.",
        guidance:
          "Uygulama sırasında ne planlandığı gibi gitti, ne gitmedi — ikisini de not al. Bu notlar Check adımının hammaddesidir.",
        fields: [{ key: "execution", label: "Uygulama kaydı", type: "textarea" }],
      },
      {
        key: "check",
        name: "6 — Check (Sonucu Ölç)",
        objective: "Sonucu hedef metriğiyle karşılaştır.",
        guidance:
          "Hedefteki metrikle önce/sonra karşılaştır. Kısmi başarı da öğrenmedir: hangi önlem çalıştı, hangisi çalışmadı?",
        fields: [{ key: "results", label: "Sonuçlar (önce/sonra)", type: "textarea" }],
      },
      {
        key: "act",
        name: "7 — Act (Standartlaştır / Döngüye Devam)",
        objective: "Çalışanı standartlaştır, çalışmayanı yeni döngüye taşı.",
        guidance:
          "Başarılı önlemleri standarda (talimat, eğitim, kontrol planı) göm ve yaygınlaştır. Hedefe ulaşılmadıysa öğrenilenlerle yeni PDCA döngüsü başlat.",
        fields: [
          { key: "standardize", label: "Standartlaştırma", type: "textarea" },
          { key: "next", label: "Sonraki döngü / kalan konular", type: "textarea" },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── DMAIC
  DMAIC: {
    methodology: "DMAIC",
    intro:
      "DMAIC: veri yoğun, varyasyon problemi için istatistiksel iyileştirme döngüsü — tanımla, ölç, analiz et, iyileştir, kontrol altına al.",
    steps: [
      {
        key: "define",
        name: "1 — Define (Tanımla)",
        objective: "Problemi, kapsamı, hedefi ve müşteri kritiklerini (CTQ) netleştir.",
        guidance:
          "Kısa bir proje bildirisi yaz: problem cümlesi (veriyle), kapsam (dahil/hariç), hedef (ölçülebilir) ve CTQ karakteristikleri. Sponsor ve ekip belirle.",
        fields: [
          { key: "problem", label: "Problem cümlesi", type: "textarea" },
          { key: "scope", label: "Kapsam (dahil / hariç)", type: "text" },
          { key: "goal", label: "Hedef", type: "text" },
          { key: "ctq", label: "CTQ (müşteri için kritik özellikler)", type: "text" },
        ],
      },
      {
        key: "measure",
        name: "2 — Measure (Ölç)",
        objective: "Mevcut performansı güvenilir veriyle temelle (baseline).",
        guidance:
          "Önce ölçüm sistemini doğrula (MSA/Gage R&R) — ölçüm güvenilir değilse analiz anlamsızdır. Sonra veri toplama planı yap ve baseline'ı hesapla (ör. hata oranı, Cp/Cpk, sigma seviyesi).",
        fields: [
          {
            key: "metrics",
            label: "Metrikler ve baseline",
            type: "table",
            columns: [
              { key: "metric", label: "Metrik" },
              { key: "method", label: "Ölçüm yöntemi" },
              { key: "baseline", label: "Mevcut değer" },
            ],
          },
          { key: "msa", label: "Ölçüm sistemi değerlendirmesi (MSA)", type: "textarea" },
        ],
      },
      {
        key: "analyze",
        name: "3 — Analyze (Analiz Et)",
        objective: "Varyasyonun köklerini istatistiksel olarak doğrula.",
        guidance:
          "Katmanlandır (vardiya, makine, parti, operatör) ve farkları test et. Grafik analizle başla (pareto, kutu grafiği, dağılım), hipotez testleriyle doğrula. 'Kanıtlanmış kök neden' listesi çıkar.",
        fields: [
          {
            key: "hypotheses",
            label: "Hipotezler ve testler",
            type: "table",
            columns: [
              { key: "hypothesis", label: "Hipotez (X → Y)" },
              { key: "test", label: "Analiz / test" },
              { key: "result", label: "Sonuç (doğrulandı mı?)" },
            ],
          },
          { key: "rootCauses", label: "Doğrulanmış kök nedenler", type: "textarea" },
        ],
      },
      {
        key: "improve",
        name: "4 — Improve (İyileştir)",
        objective: "Doğrulanmış nedenlere çözüm geliştir, pilotla kanıtla.",
        guidance:
          "Çözümleri etki/uygulanabilirlik matrisiyle önceliklendir. Tam yaygınlaştırmadan önce pilot çalışma yap ve iyileşmeyi istatistiksel olarak göster.",
        fields: [
          {
            key: "solutions",
            label: "Çözümler",
            type: "table",
            columns: [
              { key: "rootCause", label: "Kök neden" },
              { key: "solution", label: "Çözüm" },
              { key: "owner", label: "Sorumlu" },
              { key: "pilot", label: "Pilot sonucu" },
            ],
          },
        ],
      },
      {
        key: "control",
        name: "5 — Control (Kontrol Altına Al)",
        objective: "Kazanımı kontrol planı ve SPC ile kalıcı kıl.",
        guidance:
          "Kontrol planı hazırla: hangi metrik, hangi sıklıkta, hangi limitlerle izlenecek ve limit aşımında kim ne yapacak (tepki planı). Süreci sahibine devret.",
        fields: [
          {
            key: "controlPlan",
            label: "Kontrol planı",
            type: "table",
            columns: [
              { key: "metric", label: "Metrik" },
              { key: "limit", label: "Limit / hedef" },
              { key: "frequency", label: "İzleme sıklığı" },
              { key: "reaction", label: "Tepki planı" },
            ],
          },
          { key: "handover", label: "Süreç sahibine devir", type: "text" },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── 5S
  FIVE_S: {
    methodology: "FIVE_S",
    intro:
      "5S: düzensizlikten doğan kayıpları kaldır — sınıflandır, düzenle, temizle, standartlaştır, sürdür. Amaç görsellik ve anormalliğin anında görünmesi.",
    steps: [
      {
        key: "prepare",
        name: "0 — Hazırlık ve Alan Seçimi",
        objective: "Pilot alanı seç, mevcut durumu fotoğrafla, ekibi belirle.",
        guidance:
          "Küçük ve görünür bir pilot alanla başla. 'Önce' fotoğrafları çek — ilerlemenin en güçlü kanıtı olacak. Alan sahibini ata.",
        fields: [
          { key: "area", label: "Pilot alan ve sahibi", type: "text" },
          { key: "baseline", label: "Mevcut durum gözlemleri", type: "textarea" },
        ],
      },
      {
        key: "seiri",
        name: "1 — Seiri (Sınıflandır)",
        objective: "Gerekli ile gereksizi ayır; gereksizi alandan çıkar.",
        guidance:
          "Kırmızı etiket tekniği: kullanım sıklığı belirsiz her şeye etiket yapıştır, karantina alanına taşı, süre sonunda karar ver (at / depola / geri getir).",
        fields: [
          {
            key: "redTags",
            label: "Kırmızı etiket listesi",
            type: "table",
            columns: [
              { key: "item", label: "Eşya / malzeme" },
              { key: "reason", label: "Neden gereksiz olabilir" },
              { key: "decision", label: "Karar (at/depola/kalsın)" },
            ],
          },
        ],
      },
      {
        key: "seiton",
        name: "2 — Seiton (Düzenle)",
        objective: "Her şeyin yeri belli, yeri işaretli, erişim kolay olsun.",
        guidance:
          "Kullanım sıklığına göre yerleştir: sık kullanılan el altında. Gölge panoları, zemin çizgileri ve etiketlerle 'yerinde olmayan şey' bir bakışta görünsün.",
        fields: [{ key: "layout", label: "Yerleşim düzenlemeleri", type: "table", columns: ACTION_COLS }],
      },
      {
        key: "seiso",
        name: "3 — Seiso (Temizle)",
        objective: "Temizlik yaparken kaynağındaki kirlilik/anormallik nedenlerini bul.",
        guidance:
          "Temizlik = muayene. Sızıntı, gevşek bağlantı, aşınma gibi anormallikleri temizlerken tespit et ve listele. Kirlilik kaynağını kapatmak, temizlemekten değerlidir.",
        fields: [
          {
            key: "findings",
            label: "Temizlik bulguları / kirlilik kaynakları",
            type: "table",
            columns: [
              { key: "finding", label: "Bulgu / kaynak" },
              { key: "action", label: "Aksiyon" },
              { key: "owner", label: "Sorumlu" },
            ],
          },
        ],
      },
      {
        key: "seiketsu",
        name: "4 — Seiketsu (Standartlaştır)",
        objective: "İlk 3S'i görsel standartlara bağla.",
        guidance:
          "Kim, neyi, hangi sıklıkta yapacak — tek sayfalık görsel standart hazırla. Fotoğraflı 'olması gereken durum' referansları as.",
        fields: [{ key: "standards", label: "Standartlar (görev/sıklık/sorumlu)", type: "textarea" }],
      },
      {
        key: "shitsuke",
        name: "5 — Shitsuke (Sürdür)",
        objective: "Denetim ve alışkanlıkla sistemi yaşat.",
        guidance:
          "Kısa bir denetim formu (5-10 soru) ve skorlama ile periyodik denetim planla. Skorları görünür panoda paylaş; iyileşmeyi takdir et.",
        fields: [
          { key: "auditPlan", label: "Denetim planı (sıklık, denetçi)", type: "text" },
          { key: "auditItems", label: "Denetim soruları", type: "textarea" },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── TPM
  TPM: {
    methodology: "TPM",
    intro:
      "TPM: ekipman güvenilirliğini operatör-bakım iş birliğiyle yükselt — kayıpları ölç (OEE), otonom ve planlı bakımı kur, arızayı oluşmadan yakala.",
    steps: [
      {
        key: "baseline",
        name: "1 — Ekipman ve Kayıp Analizi",
        objective: "Hedef ekipmanı seç, OEE ve ana kayıpları ölç.",
        guidance:
          "Darboğaz veya en çok duruş yapan ekipmanla başla. OEE'yi (Kullanılabilirlik × Performans × Kalite) hesapla ve 6 büyük kaybı (arıza, setup, küçük duruş, hız, hata, başlangıç kaybı) sınıflandır.",
        fields: [
          { key: "equipment", label: "Hedef ekipman", type: "text" },
          { key: "oee", label: "Mevcut OEE ve bileşenleri", type: "text" },
          {
            key: "losses",
            label: "Kayıp analizi",
            type: "table",
            columns: [
              { key: "loss", label: "Kayıp türü" },
              { key: "magnitude", label: "Büyüklük (saat/adet)" },
              { key: "note", label: "Not" },
            ],
          },
        ],
      },
      {
        key: "history",
        name: "2 — Arıza Geçmişi ve Kök Nedenler",
        objective: "Tekrarlayan arızaları analiz et, kronikleri ayıkla.",
        guidance:
          "Son 6-12 ayın arıza kayıtlarını pareto yap. Kronik arızalar için hızlı kök neden analizi (5 Neden) uygula — TPM'de kronik arıza 'normal' kabul edilmez.",
        fields: [
          {
            key: "failures",
            label: "Arıza geçmişi",
            type: "table",
            columns: [
              { key: "failure", label: "Arıza" },
              { key: "frequency", label: "Sıklık" },
              { key: "rootCause", label: "Kök neden" },
            ],
          },
        ],
      },
      {
        key: "autonomous",
        name: "3 — Otonom Bakım",
        objective: "Operatörün günlük temizlik-yağlama-kontrol rutinini kur.",
        guidance:
          "İlk temizlikle başla (temizlik = muayene), anormallikleri etiketle. Operatörün yapacağı günlük/haftalık kontrol listesini görsel tek sayfa olarak hazırla.",
        fields: [
          { key: "cilStandard", label: "Temizlik-Yağlama-Kontrol standardı", type: "textarea" },
          {
            key: "abnormalities",
            label: "Tespit edilen anormallikler",
            type: "table",
            columns: [
              { key: "finding", label: "Anormallik" },
              { key: "action", label: "Aksiyon" },
              { key: "owner", label: "Sorumlu" },
            ],
          },
        ],
      },
      {
        key: "planned",
        name: "4 — Planlı Bakım",
        objective: "Kritik parçalar için periyodik bakım planını kur.",
        guidance:
          "Arıza geçmişine göre kritik bileşenleri belirle; her biri için bakım görevi, periyot ve sorumlu tanımla. Yedek parça kritik stoklarını gözden geçir.",
        fields: [
          {
            key: "pmPlan",
            label: "Planlı bakım planı",
            type: "table",
            columns: [
              { key: "component", label: "Bileşen" },
              { key: "task", label: "Bakım görevi" },
              { key: "interval", label: "Periyot" },
              { key: "owner", label: "Sorumlu" },
            ],
          },
        ],
      },
      {
        key: "capability",
        name: "5 — Eğitim ve Yetkinlik",
        objective: "Operatör ve bakımcının gereken becerilerini geliştir.",
        guidance:
          "Otonom bakım görevleri için beceri matrisi çıkar: kim neyi yapabiliyor, kim eğitilecek? Tek nokta dersleri (OPL) ile bilgiyi standartlaştır.",
        fields: [{ key: "training", label: "Eğitim planı / beceri matrisi", type: "textarea" }],
      },
      {
        key: "monitor",
        name: "6 — İzleme ve Hedef",
        objective: "OEE ve arıza metriklerini panoda izle, hedefe yürü.",
        guidance:
          "OEE, MTBF (arıza arası süre) ve MTTR (tamir süresi) hedefleri koy; haftalık gözden geçirme rutini kur. İyileşmeyi 'önce/sonra' ile görünür yap.",
        fields: [
          { key: "targets", label: "Hedefler (OEE/MTBF/MTTR)", type: "text" },
          { key: "review", label: "Gözden geçirme rutini", type: "text" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────── Yalın / VSM
  LEAN_VSM: {
    methodology: "LEAN_VSM",
    intro:
      "Yalın/VSM: değer akışını uçtan uca haritala, israfı ve bekleme sürelerini görünür kıl, gelecek durum tasarımıyla akışı hızlandır.",
    steps: [
      {
        key: "scope",
        name: "1 — Ürün Ailesi ve Kapsam",
        objective: "Haritalanacak ürün ailesini ve akış sınırlarını seç.",
        guidance:
          "Benzer süreç adımlarından geçen ürünleri tek aile olarak grupla. Kapsamı belirle: hangi noktadan (hammadde/sipariş) hangi noktaya (sevkiyat)?",
        fields: [
          { key: "family", label: "Ürün ailesi", type: "text" },
          { key: "boundaries", label: "Akış sınırları (başlangıç → bitiş)", type: "text" },
        ],
      },
      {
        key: "current",
        name: "2 — Mevcut Durum Haritası",
        objective: "Akışı kapıdan kapıya yürüyerek veriyle haritala.",
        guidance:
          "Akışı fiziksel olarak yürü (sevkiyattan geriye doğru). Her adım için çevrim süresi, hazırlık süresi, operatör sayısı, ara stok ve bekleme kaydet. Toplam temin süresi ile katma değerli süreyi karşılaştır.",
        fields: [
          {
            key: "steps",
            label: "Süreç adımları",
            type: "table",
            columns: [
              { key: "step", label: "Adım" },
              { key: "ct", label: "Çevrim süresi" },
              { key: "wait", label: "Bekleme / stok" },
              { key: "note", label: "Gözlem" },
            ],
          },
          { key: "leadTime", label: "Toplam temin süresi vs katma değerli süre", type: "text" },
        ],
      },
      {
        key: "waste",
        name: "3 — İsraf Analizi",
        objective: "7 israfı (taşıma, stok, hareket, bekleme, aşırı üretim, aşırı işlem, hata) tespit et.",
        guidance:
          "Haritadaki her bekleme ve stok noktasını sorgula: neden var? En büyük israf genelde aşırı üretim ve beklemedir — akışı kesen noktaları önceliklendir.",
        fields: [
          {
            key: "wastes",
            label: "İsraf listesi",
            type: "table",
            columns: [
              { key: "type", label: "İsraf türü" },
              { key: "where", label: "Nerede" },
              { key: "impact", label: "Etki" },
            ],
          },
        ],
      },
      {
        key: "future",
        name: "4 — Gelecek Durum Tasarımı",
        objective: "Takt'a göre akan, çekme esaslı gelecek durumu tasarla.",
        guidance:
          "Takt süresini hesapla (çalışma süresi / müşteri talebi). Nerede sürekli akış kurulabilir, nerede süpermarket/çekme gerekir, akışı tek noktadan planla (pacemaker). Hedef temin süresini belirle.",
        fields: [
          { key: "takt", label: "Takt süresi ve hedef temin süresi", type: "text" },
          { key: "design", label: "Gelecek durum tasarım kararları", type: "textarea" },
        ],
      },
      {
        key: "kaizen",
        name: "5 — Kaizen Planı ve Uygulama",
        objective: "Gelecek duruma götürecek kaizen çalışmalarını planla.",
        guidance:
          "Gelecek durum haritasındaki her 'kaizen şimşeği' için çalışma planla: hedef, sorumlu, termin. Küçük döngülerle ilerle ve temin süresini periyodik yeniden ölç.",
        fields: [{ key: "kaizens", label: "Kaizen planı", type: "table", columns: ACTION_COLS }],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── DMADV
  DMADV: {
    methodology: "DMADV",
    intro:
      "DMADV (DFSS): yeni ürün/süreci daha tasarım aşamasında müşteri kritiklerine ve hedef kaliteye göre kur — düzeltme değil, doğru tasarım.",
    steps: [
      {
        key: "define",
        name: "1 — Define (Tasarım Hedefi)",
        objective: "Tasarım projesinin hedefini ve kapsamını netleştir.",
        guidance:
          "Ne tasarlanıyor, kim için, hangi iş hedefiyle? Kapsam, kısıtlar (maliyet, süre, regülasyon) ve başarı ölçütlerini yaz.",
        fields: [
          { key: "goal", label: "Tasarım hedefi", type: "textarea" },
          { key: "constraints", label: "Kısıtlar", type: "text" },
        ],
      },
      {
        key: "measure",
        name: "2 — Measure (Müşteri Sesi → CTQ)",
        objective: "Müşteri ihtiyaçlarını ölçülebilir CTQ'lara çevir.",
        guidance:
          "Müşteri sesini (VOC) topla ve her ihtiyacı ölçülebilir bir karakteristiğe (CTQ) + hedef/spek değerine çevir. Önceliklendir — her şey kritik olamaz.",
        fields: [
          {
            key: "ctqs",
            label: "VOC → CTQ tablosu",
            type: "table",
            columns: [
              { key: "voc", label: "Müşteri ihtiyacı" },
              { key: "ctq", label: "CTQ karakteristiği" },
              { key: "target", label: "Hedef / spek" },
              { key: "priority", label: "Öncelik" },
            ],
          },
        ],
      },
      {
        key: "analyze",
        name: "3 — Analyze (Kavram Seçimi)",
        objective: "Alternatif tasarım kavramlarını üret ve sistematik seç.",
        guidance:
          "En az 2-3 kavram alternatifi geliştir; CTQ'lara göre puanla (Pugh matrisi). Seçimi sezgiyle değil kriter matriste yap.",
        fields: [
          {
            key: "concepts",
            label: "Kavram karşılaştırması",
            type: "table",
            columns: [
              { key: "concept", label: "Kavram" },
              { key: "strengths", label: "Güçlü yönler" },
              { key: "weaknesses", label: "Zayıf yönler" },
              { key: "score", label: "Puan" },
            ],
          },
          { key: "selected", label: "Seçilen kavram ve gerekçe", type: "textarea" },
        ],
      },
      {
        key: "design",
        name: "4 — Design (Detay Tasarım)",
        objective: "Seçilen kavramı detaylandır; riskleri tasarım FMEA ile ele al.",
        guidance:
          "CTQ'ları alt sistem/parametre hedeflerine indir. Tasarım FMEA ile riskleri erken yakala; kritik parametreler için tolerans ve kontrol yöntemi belirle.",
        fields: [
          { key: "detail", label: "Detay tasarım kararları", type: "textarea" },
          {
            key: "risks",
            label: "Tasarım riskleri (mini FMEA)",
            type: "table",
            columns: [
              { key: "risk", label: "Risk / hata modu" },
              { key: "severity", label: "Etki" },
              { key: "mitigation", label: "Önlem" },
            ],
          },
        ],
      },
      {
        key: "verify",
        name: "5 — Verify (Doğrula)",
        objective: "Pilot/prototiple tasarımın CTQ'ları karşıladığını kanıtla.",
        guidance:
          "Pilot üretim veya prototip testiyle her CTQ'yu ölç ve hedefle karşılaştır. Süreç yeteneğini (Cp/Cpk) göster; devreye alma ve kontrol planıyla teslim et.",
        fields: [
          { key: "pilotResults", label: "Pilot / doğrulama sonuçları", type: "textarea" },
          { key: "launch", label: "Devreye alma planı", type: "textarea" },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── SPC
  SPC: {
    methodology: "SPC",
    intro:
      "SPC: süreci kontrol kartlarıyla izle; özel neden sinyallerini erken yakala, sürece gereksiz müdahaleyi (tampering) önle.",
    steps: [
      {
        key: "characteristic",
        name: "1 — Kritik Karakteristiği Seç",
        objective: "İzlenecek karakteristiği ve ölçüm noktasını belirle.",
        guidance:
          "Müşteri/fonksiyon için kritik, süreçte erken ölçülebilen bir karakteristik seç. Değişken veri (ölçüm) nitel veriden (kusur sayısı) daha bilgilendiricidir.",
        fields: [
          { key: "characteristic", label: "Karakteristik ve spek limitleri", type: "text" },
          { key: "point", label: "Ölçüm noktası ve sıklığı", type: "text" },
        ],
      },
      {
        key: "msa",
        name: "2 — Ölçüm Sistemini Doğrula",
        objective: "Ölçüm sisteminin güvenilirliğini (MSA) göster.",
        guidance:
          "Gage R&R ile ölçüm varyasyonunun süreç varyasyonuna oranını değerlendir. Güvenilmez ölçümle çizilen kontrol kartı yanlış alarma veya körlüğe yol açar.",
        fields: [{ key: "msaResult", label: "MSA sonucu / değerlendirme", type: "textarea" }],
      },
      {
        key: "chart",
        name: "3 — Kart Tipini Seç ve Veri Planla",
        objective: "Veri tipine uygun kontrol kartını ve alt grup planını seç.",
        guidance:
          "Değişken veri: X̄-R (alt grup) veya I-MR (tekil). Nitel veri: p/np/c/u. Alt gruplar 'rasyonel' olmalı — grup içi yalnızca doğal varyasyon kalacak şekilde.",
        fields: [
          { key: "chartType", label: "Kart tipi ve gerekçe", type: "text" },
          { key: "subgroup", label: "Alt grup planı (boyut, sıklık)", type: "text" },
        ],
      },
      {
        key: "limits",
        name: "4 — Kontrol Limitleri ve İlk Çalışma",
        objective: "Süreç verisinden kontrol limitlerini hesapla, stabiliteyi değerlendir.",
        guidance:
          "En az 20-25 alt grupla limitleri hesapla. Kontrol limiti ≠ spek limiti: limitler sürecin sesidir. Kural dışı noktaları (Western Electric kuralları) araştır; özel nedenler çözülmeden limitler sabitlenmez.",
        fields: [
          { key: "limitsCalc", label: "Hesaplanan limitler", type: "text" },
          { key: "stability", label: "Stabilite değerlendirmesi / özel nedenler", type: "textarea" },
        ],
      },
      {
        key: "reaction",
        name: "5 — Tepki Planı (OCAP)",
        objective: "Sinyal görülünce kimin ne yapacağını önceden tanımla.",
        guidance:
          "Her sinyal türü için net tepki tanımla: durdur/ayıkla/ayar yapma-önce araştır. Tepki planı olmayan kontrol kartı duvar süsüdür.",
        fields: [
          {
            key: "ocap",
            label: "Tepki planı",
            type: "table",
            columns: [
              { key: "signal", label: "Sinyal" },
              { key: "response", label: "Tepki" },
              { key: "owner", label: "Sorumlu" },
            ],
          },
        ],
      },
      {
        key: "sustain",
        name: "6 — Yaşat ve Yetenek İzle",
        objective: "Kartı rutine bağla; süreç yeteneğini (Cp/Cpk) periyodik raporla.",
        guidance:
          "Kart doldurma ve yorumlama sorumluluğunu operatöre ver, periyodik gözden geçirme kur. Stabil süreçte Cp/Cpk raporla; yetersizse iyileştirme (DMAIC) başlat.",
        fields: [
          { key: "routine", label: "Rutin (kim çizer, kim gözden geçirir)", type: "text" },
          { key: "capability", label: "Süreç yeteneği (Cp/Cpk) ve değerlendirme", type: "text" },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────── Poka-Yoke
  POKA_YOKE: {
    methodology: "POKA_YOKE",
    intro:
      "Poka-Yoke: insan hatasını eğitimle değil tasarımla engelle — hatayı imkânsız kıl (önleme) ya da anında yakala (tespit).",
    steps: [
      {
        key: "analyze",
        name: "1 — Hata Analizi",
        objective: "Hatanın (error) ve kusurun (defect) oluşma-yakalanma noktalarını ayır.",
        guidance:
          "Hata operatör eylemidir, kusur onun üründe bıraktığı izdir. Hatanın OLUŞTUĞU noktayı bul — kusurun yakalandığı nokta değil. İş adımını yerinde gözle.",
        fields: [
          { key: "errorPoint", label: "Hatanın oluştuğu adım", type: "text" },
          { key: "defectPoint", label: "Kusurun yakalandığı nokta", type: "text" },
          { key: "observation", label: "Yerinde gözlem notları", type: "textarea" },
        ],
      },
      {
        key: "modes",
        name: "2 — Hata Modları",
        objective: "Olası insan hatası modlarını listele ve önceliklendir.",
        guidance:
          "Tipik modlar: unutma, yanlış parça, yanlış yön, atlanan adım, yanlış ayar. Sıklık ve etkiye göre önceliklendir. Operatörü suçlamadan dinle — hatayı kolaylaştıran koşulları o bilir.",
        fields: [
          {
            key: "errorModes",
            label: "Hata modları",
            type: "table",
            columns: [
              { key: "mode", label: "Hata modu" },
              { key: "condition", label: "Kolaylaştıran koşul" },
              { key: "frequency", label: "Sıklık / etki" },
            ],
          },
        ],
      },
      {
        key: "concept",
        name: "3 — Çözüm Konsepti",
        objective: "Önleme mi tespit mi; hangi poka-yoke tipiyle?",
        guidance:
          "Önce ÖNLEMEYİ dene (hata fiziksel olarak yapılamasın: asimetrik geometri, kılavuz pim, fikstür). Olmuyorsa TESPİT: temas sensörü, sayaç, sıralama kontrolü — kusur bir sonraki adıma geçmeden dursun.",
        fields: [
          { key: "approach", label: "Yaklaşım (önleme / tespit) ve tip", type: "text" },
          {
            key: "concepts",
            label: "Çözüm alternatifleri",
            type: "table",
            columns: [
              { key: "concept", label: "Konsept" },
              { key: "type", label: "Tip (temas/sabit değer/adım)" },
              { key: "cost", label: "Maliyet/karmaşıklık" },
            ],
          },
        ],
      },
      {
        key: "implement",
        name: "4 — Tasarla ve Uygula",
        objective: "Seçilen çözümü tasarla, sahada devreye al.",
        guidance:
          "Basit ve ucuz olanı tercih et — en iyi poka-yoke operatörün fark etmediği kadar doğal olandır. Cihazın kendisinin arızasını da düşün (fail-safe).",
        fields: [
          { key: "design", label: "Tasarım / uygulama detayı", type: "textarea" },
          { key: "actions", label: "Uygulama aksiyonları", type: "table", columns: ACTION_COLS },
        ],
      },
      {
        key: "verify",
        name: "5 — Doğrula ve Standartlaştır",
        objective: "Hatanın artık oluşamadığını/yakalandığını kanıtla; standarda bağla.",
        guidance:
          "Kasıtlı hata denemesiyle test et: hatayı bilerek yapmayı dene — sistem engelliyor/yakalıyor mu? Cihaz kontrolünü günlük başlangıç rutinine ekle ve benzer istasyonlara yaygınlaştır.",
        fields: [
          { key: "test", label: "Doğrulama testi ve sonucu", type: "textarea" },
          { key: "standard", label: "Standart / günlük kontrol", type: "text" },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── TOC
  TOC: {
    methodology: "TOC",
    intro:
      "Kısıtlar Teorisi: sistemin çıktısını kısıt belirler. Kısıtı bul, ondan azami yararlan, her şeyi ona tabi kıl, gerekiyorsa yükselt — ve tekrarla.",
    steps: [
      {
        key: "goal",
        name: "1 — Hedef ve Akışı Tanımla",
        objective: "Sistemin hedefini ve ana akışını netleştir.",
        guidance:
          "Çıktı (throughput) neyle ölçülüyor: adet/gün, ciro? Ana ürün akışını adım adım çiz — kısıt bu akışın üzerinde aranacak.",
        fields: [
          { key: "goal", label: "Hedef metrik (throughput)", type: "text" },
          { key: "flow", label: "Ana akış adımları", type: "textarea" },
        ],
      },
      {
        key: "identify",
        name: "2 — Kısıtı Belirle",
        objective: "Akışı sınırlayan adımı veriyle bul.",
        guidance:
          "İpuçları: önünde en çok stok biriken, sürekli dolu çalışan, herkesi bekleten adım. Kapasite ile talebi adım adım karşılaştır — en dar olan kısıttır.",
        fields: [
          {
            key: "capacity",
            label: "Kapasite / talep karşılaştırması",
            type: "table",
            columns: [
              { key: "step", label: "Adım" },
              { key: "capacity", label: "Kapasite" },
              { key: "demand", label: "Talep" },
              { key: "queue", label: "Önündeki birikim" },
            ],
          },
          { key: "constraint", label: "Belirlenen kısıt", type: "text" },
        ],
      },
      {
        key: "exploit",
        name: "3 — Kısıtı Sömür",
        objective: "Yatırım yapmadan kısıttan azami çıktı al.",
        guidance:
          "Kısıtta kayıp dakika sistem kaybıdır: molalarda çalıştır, setup'ı kısalt (SMED), kısıta yalnız kusursuz parça gönder, kısıtı bekleten nedenleri kaldır.",
        fields: [{ key: "exploitActions", label: "Sömürme aksiyonları", type: "table", columns: ACTION_COLS }],
      },
      {
        key: "subordinate",
        name: "4 — Her Şeyi Kısıta Tabi Kıl",
        objective: "Diğer adımları kısıtın ritmine göre çalıştır.",
        guidance:
          "Kısıt öncesi tampon kur (kısıt asla aç kalmasın), kısıt olmayanları %100 doluluk için değil kısıtı beslemek için çalıştır (drum-buffer-rope). Fazla üretim = stok israfı.",
        fields: [{ key: "subordination", label: "Tabi kılma kararları (tampon, tempo)", type: "textarea" }],
      },
      {
        key: "elevate",
        name: "5 — Kısıtı Yükselt",
        objective: "Sömürme yetmezse kapasite artışına yatırım yap.",
        guidance:
          "Ek vardiya, ek ekipman, dış kaynak gibi seçenekleri throughput kazancına göre değerlendir. Yatırım kararını kısıt olmayan bir adıma yapma — para çöpe gider.",
        fields: [
          {
            key: "options",
            label: "Yükseltme seçenekleri",
            type: "table",
            columns: [
              { key: "option", label: "Seçenek" },
              { key: "gain", label: "Beklenen kazanç" },
              { key: "cost", label: "Maliyet" },
            ],
          },
        ],
      },
      {
        key: "repeat",
        name: "6 — Tekrarla",
        objective: "Kısıt kırıldıysa yeni kısıtı bul; ataletin kısıt olmasına izin verme.",
        guidance:
          "Kısıt çözülünce başka bir adım kısıt olur — 2. adıma dön. Eski kısıta göre konmuş kuralları (tamponlar, parti büyüklükleri) gözden geçir.",
        fields: [{ key: "next", label: "Yeni durum değerlendirmesi", type: "textarea" }],
      },
    ],
  },
  SDCA: {
    methodology: "SDCA",
    intro:
      "SDCA: iyileştirmeye başlamadan önce mevcut en iyi yöntemi standartlaştır, temel 4M koşullarını kur, uygulamayı doğrula ve kararlı baz hattı sabitle.",
    steps: [
      {
        key: "assess",
        name: "1 — Stabilizasyon İhtiyacını Değerlendir",
        objective: "Kararsızlığın standart, insan, makine, malzeme, yöntem veya ölçüm boşluğundan gelip gelmediğini kanıtla.",
        guidance:
          "Semptomu kişiye yükleme. Vardiyalar arası yöntem farkı, ekipman temel koşulu, malzeme değişkenliği, ölçüm güvenilirliği ve zaman içindeki proses davranışını aynı baz hatta değerlendir.",
        fields: [
          {
            key: "readiness",
            label: "Stabilizasyon hazırlık değerlendirmesi",
            type: "table",
            columns: [
              { key: "dimension", label: "Boyut" },
              { key: "currentCondition", label: "Mevcut koşul" },
              { key: "standard", label: "Beklenen standart" },
              { key: "evidence", label: "Kanıt" },
              { key: "gap", label: "Boşluk" },
            ],
          },
          { key: "baselineMetric", label: "Baz hat metriği ve mevcut değer", type: "textarea" },
        ],
      },
      {
        key: "standardize",
        name: "2 — Standardize",
        objective: "Bugün bilinen en iyi güvenli çalışma yöntemini görünür ve uygulanabilir standart haline getir.",
        guidance:
          "Tek doğru yöntem iddiası yerine mevcut en iyi yöntemi tanımla. Kritik adım, değer/limit, görsel referans, hata noktası ve reaksiyon planı üç saniyede anlaşılabilir olmalıdır.",
        fields: [
          {
            key: "standardWork",
            label: "Standart iş öğeleri",
            type: "table",
            columns: [
              { key: "step", label: "İş adımı" },
              { key: "method", label: "Standart yöntem" },
              { key: "criticalPoint", label: "Kritik nokta / limit" },
              { key: "reason", label: "Neden önemli" },
              { key: "reaction", label: "Sapmada reaksiyon" },
            ],
          },
          { key: "revisionOwner", label: "Standart sahibi ve revizyon", type: "text" },
        ],
      },
      {
        key: "do",
        name: "3 — Do: Uygula ve Yetkinliği Doğrula",
        objective: "Standardı bütün ilgili vardiyalarda uygula ve yalnız eğitim katılımını değil yapabilme yetkinliğini doğrula.",
        guidance:
          "Operatörlere aynı yöntem öğretilmeli; gözlemle uygulama doğrulanmalı. Sapmalar disiplin etiketiyle kapatılmadan önce standardın uygulanabilirliği ve sistem engelleri araştırılmalıdır.",
        fields: [
          {
            key: "deployment",
            label: "Uygulama ve yetkinlik kaydı",
            type: "table",
            columns: [
              { key: "team", label: "Vardiya / ekip" },
              { key: "training", label: "Eğitim / uygulama" },
              { key: "competenceEvidence", label: "Yetkinlik kanıtı" },
              { key: "barrier", label: "Uygulama engeli" },
              { key: "status", label: "Durum" },
            ],
          },
        ],
      },
      {
        key: "check",
        name: "4 — Check: Uygulama ve Kararlılığı Ölç",
        objective: "Standarda uyumu ve proses çıktısının zaman içindeki kararlılığını birlikte doğrula.",
        guidance:
          "Yalnız ürün uygunluğuna bakma. Standart uygulama oranını, temel koşul kontrollerini, ölçüm sistemi yeterliliğini ve zaman serisindeki özel neden sinyallerini gözden geçir.",
        fields: [
          {
            key: "checks",
            label: "Kararlılık kontrolleri",
            type: "table",
            columns: [
              { key: "metric", label: "Metrik / kontrol" },
              { key: "method", label: "Ölçüm yöntemi" },
              { key: "target", label: "Kabul kriteri" },
              { key: "actual", label: "Gerçekleşen" },
              { key: "evidence", label: "Kanıt" },
            ],
          },
          { key: "stabilityConclusion", label: "Kararlılık sonucu ve özel nedenler", type: "textarea" },
        ],
      },
      {
        key: "act",
        name: "5 — Act: Sapmayı Düzelt ve Baz Hattı Sabitle",
        objective: "Standart veya temel koşul sapmalarını gider, çalışan yöntemi yeni baz hat olarak sabitle.",
        guidance:
          "Çalışmayan standardı zorla uygulatma; nedeni kanıtla ve standardı güncelle. Kararlılık doğrulanmadan PDCA/DMAIC iyileştirme aşamasına geçme.",
        fields: [
          { key: "corrections", label: "Stabilizasyon aksiyonları", type: "table", columns: ACTION_COLS },
          {
            key: "gate",
            label: "İyileştirmeye geçiş kapısı",
            type: "table",
            columns: [
              { key: "criterion", label: "Kriter" },
              { key: "result", label: "Sonuç" },
              { key: "evidence", label: "Kanıt" },
              { key: "approvedBy", label: "Onaylayan" },
            ],
          },
          { key: "nextMethod", label: "Sonraki yöntem ve gerekçe", type: "textarea" },
        ],
      },
    ],
  },
};

/** Bir metodolojinin playbook'u (hepsi tanımlı; tip güvence altında). */
export function getPlaybook(m: Methodology): Playbook {
  return PLAYBOOKS[m];
}
