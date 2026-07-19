# MAKALELER1 — Sistem Uyum Analizi ve Uygulama Yol Haritası

## 1. Amaç

Bu belge, `MAKALELER1.docx` içindeki 20 içerikten çıkarılan bütün ürün ve sistem
önerilerini tek bir uygulanabilir programa dönüştürür. Hedef yalnızca yeni özellik
eklemek değil; platformu aşağıdaki kapalı çevrime ulaştırmaktır:

`Zayıf sinyal → günlük yönetim → teşhis → yöntem bileşimi → kanıt/deney → karşı önlem → etkinlik → standart/öğrenme → erken uyarı`

Belgedeki ikinci `13. makale`, kaynak dosyadaki numaralandırma hatası nedeniyle bu
yol haritasında `14. makale` olarak değerlendirilmiştir.

## 2. Tasarım ilkeleri

1. LLM karar vermez; kararlar deterministik domain kurallarıyla üretilir.
2. Tek sinyal kesin yöntem seçtirmez; çoklu ve bağımsız kanıt aranır.
3. Metodolojiler aynı seviyede yarışmaz; ana çerçeve, analiz, karşı önlem, kontrol,
   risk ve işletim sistemi rolleri ayrılır.
4. Hipotez kanıt değildir; sezgi araştırılacak sinyal olarak saklanabilir.
5. Bir formun doldurulması kapanış değildir; etkinlik ve sistem güncellemesi gerekir.
6. Geçici containment ile kalıcı çözüm birbirine karıştırılmaz.
7. İnsan hatası kök neden sayılmaz; hatayı mümkün kılan sistem koşulu araştırılır.
8. Yeni sistem nesneleri mevcut kanıt, iddia, aksiyon, audit ve bağlı çalışma
   omurgasını yeniden kullanır.
9. Makalelerdeki evrensel olmayan sayısal veya retorik iddialar doğrudan yazılım
   kuralına çevrilmez; bağlama göre yapılandırılır.

## 3. Mevcut güçlü temel

- 27 özellikli adaptif teşhis ve bağlamsal soru seçimi
- En az dört soru, dört bilinen cevap ve üç bağımsız destek koşulu
- Çelişki kontrolü ve `PROVISIONAL / CONFIRMED` ayrımı
- 13 metodoloji için playbook ve uzman çalışma alanları
- Kanıt, doğrulanabilir iddia, aksiyon etkinliği ve karar izi
- `OPEN → CLOSURE_CANDIDATE → MONITORING → CLOSED / REOPENED` yaşam döngüsü
- Bilgi görevleri, kırmızı takım, karşı-olgusal teşhis ve audit izi
- Metodolojiler arası veri aktarımı
- Problem DNA, tekrar vakası ve yatay yayılım
- SPC, FMEA, 8D ve Kepner–Tregoe uzman araçları

## 4. Uygulama programı

### Faz 1 — Mevcut karar çekirdeğini tamamlama

#### P1.1 Katmanlı metodoloji bileşim motoru

**Kaynak:** Makale 4, 5, 7, 10 ve 17.

**Problem:** Yönetim çerçevesi, analiz yöntemi, karşı önlem ve kontrol aracı tek
sıralamada aynı seviyede yarışıyor.

**Çözüm:** Teşhis sonucu aşağıdaki katmanları ayrı üretir:

- Ana yönetim/tasarım/iyileştirme çerçevesi
- Problem ve neden analizi
- Karşı önlem
- Risk analizi
- Kontrol ve izleme
- İşletim sistemi/standartlaştırma

**Kabul kriterleri:**

- Tek bir `winner` korunurken ayrıca deterministik `methodPlan` üretilir.
- Yalnız pozitif kanıt taşıyan yöntemler plana girebilir.
- Her öneride rol, gerekçe, skor ve güven gösterilir.
- 8D+RCA+Poka-Yoke+SPC gibi karma vaka testleri bulunur.
- Arayüz tek yöntem reçetesi yerine uygulama mimarisini gösterir.

#### P1.2 FMEA gelecek senaryosu ve varsayım analizi

**Kaynak:** Makale 6 ve önceki FMEA değerlendirmesi.

**Yeni adım:** `Değişim, Varsayım ve Gelecek Senaryoları`.

**Alanlar:**

- Değişebilecek unsur
- Mevcut varsayım
- Değişim senaryosu
- Sistemin beklenen tepkisi
- Olası hata modu
- Mevcut kontrol
- Kontrolün kırılma koşulu
- Dayanıklılık kanıtı
- İlgili FMEA satırı

**Ek düzenlemeler:**

- Hata modu kaynağı: geçmiş olay, benzer proses, yeni senaryo, uzman görüşü,
  test/simülasyon
- Önleyici ve tespit kontrollerinin ayrılması
- Yeni tasarımda DMADV ana çerçeve olsa da DFMEA/PFMEA destek katmanına eklenmesi
- Proses değişikliğinde FMEA yeniden değerlendirme tetikleyicisi

#### P1.3 SDCA stabilizasyon kapısı

**Durum:** ✅ Tamamlandı — teşhis kuralları, SDCA playbook'u, hazırlık kapısı,
kalıcı sonuç modeli, rapor ve kullanıcı arayüzü birlikte devreye alındı.

**Kaynak:** Makale 19.

**Problem:** Kararsız ve standartlaşmamış bir sistem doğrudan PDCA/DMAIC projesine
alınabiliyor.

**Çözüm:** SDCA çalışma alanı ve iyileştirmeye hazırlık kapısı.

**Kontroller:** standart iş, eğitim uyumu, ekipman temel koşulları, malzeme
kararlılığı, güvenilir ölçüm, veri standardı ve proses kararlılığı.

#### P1.4 Gerçek sistem dokümanları

**Durum:** ✅ Tamamlandı — sekiz doküman türü için revizyon, sahiplik, onay,
yürürlük, kanıt ve vaka bağlantısı olan sürümlü nesneler eklendi.

**Kaynak:** Makale 8, 9 ve 20.

Serbest metin “güncellendi” alanları yerine sürümlü nesneler:

- Standart İş
- Control Plan
- PFMEA/DFMEA
- Bakım planı
- Kontrol talimatı
- OPL
- Eğitim/yetkinlik kaydı

Her nesne revizyon, sahip, onay, geçerlilik, ilgili vaka ve kanıt bağlarını taşır.

#### P1.5 Containment yaşam döngüsü

**Durum:** ✅ Tamamlandı — kapsam, süre, etkinlik, yük, kaldırma kriteri,
onay ve kalıcı aksiyon bağlantısı kapanış kapısına bağlandı.

**Kaynak:** Makale 4 ve 9.

- Geçici kontrolün amacı
- Kapsadığı stok/müşteri/proses
- Başlangıç zamanı
- Etkinlik metriği
- Maliyet/yük
- Kaldırma kriteri
- Kaldırma onayı
- Kalıcı çözüm bağı

Containment kaldırılmadan veya gerekçeli biçimde devredilmeden vaka kapanmaz.

#### P1.6 Lessons Learned → sistem güncellemesi kapısı

**Durum:** ✅ Tamamlandı — öğrenimin onaylı sistem dokümanına bağlanması veya
onaylı ve gerekçeli “güncelleme gerekmiyor” kararı zorunlu hale getirildi.

**Kaynak:** Makale 8 ve 20.

Kapanışta öğrenme, en az bir gerçek çıktıya bağlanır: standart, FMEA, Control Plan,
bakım planı, OPL veya gerekçeli `güncelleme gerekmiyor` kararı.

### Faz 2 — Proaktif operasyon katmanı

#### P2.1 Zayıf sinyal ve erken uyarı merkezi

**Durum:** ✅ Tamamlandı — kontrollü durum akışı, doğrulama görevi, hipotez,
sorumluluk ve tek tık problem vakasına yükseltme eklendi.

**Kaynak:** Makale 1.

Sinyal türleri: insan gözlemi, proses ölçümü, mikro duruş, geçici müdahale,
yeniden ölçüm, ayıklama, WIP, program değişikliği, fazla mesai, bakım ertelemesi ve
psikolojik güvenlik sinyali.

Akış: `NEW → TRIAGED → VERIFYING → DISMISSED / WATCHING / CASE_OPENED`.

Sezgi kök neden olarak değil, doğrulama görevi ve araştırma hipotezi olarak saklanır.

#### P2.2 Katmanlı günlük yönetim

**Durum:** ✅ Tamamlandı — Tier 1–3, SQDCP, sapma/risk, Gemba, vardiya devri ve
eskalasyon kayıtları çalışma alanına eklendi.

**Kaynak:** Makale 3.

- Tier 1 hat/vardiya
- Tier 2 bölüm
- Tier 3 fabrika
- SQDCP göstergeleri
- Dünkü sapma, bugünkü risk, aksiyon ve eskalasyon
- Gemba görevi
- Vardiya devri
- Problem vakasına tek tık yükseltme

#### P2.3 Hafif Kaizen ve deney panosu

**Durum:** ✅ Tamamlandı — risk kontrolü, hipotez, önce/sonra ölçümü,
standardizasyon, Yokoten ve ağır yönteme yükseltme akışı eklendi.

**Kaynak:** Makale 2 ve 15.

Küçük öneri → risk kontrolü → kısa deney → önce/sonra ölçümü → standartlaştırma →
Yokoten. Riskli veya kapsamı büyüyen öneri A3/DMAIC/FMEA çalışmasına yükseltilir.

#### P2.4 Dijital OPL ve yetkinlik akademisi

**Durum:** ✅ Tamamlandı — OPL türü, tek hedef, görseller, limit, medya/istasyon,
mikro sınav, revizyon ve yetkinlik doğrulaması eklendi.

**Kaynak:** Makale 20.

- Temel bilgi, iyileştirme ve güvenlik OPL türleri
- Tek öğrenme hedefi
- Doğru/yanlış görsel
- Net limit/değer
- Mikro video
- QR/istasyon erişimi
- FMEA/vaka/standart bağlantısı
- Mikro sınav ve yetkinlik doğrulaması
- Revizyon ve gözden geçirme tarihi

#### P2.5 Kontrol yükü ve kaynakta kalite

**Durum:** ✅ Tamamlandı — maliyet, sıklık, kaçış, yanlış karar, geçici kontrol,
kaynakta önleme sorusu, alternatif ve kaldırma portföyü eklendi.

**Kaynak:** Makale 9 ve 15.

Kontrol noktası, türü, maliyeti, sıklığı, kaçış riski, yanlış kabul/ret, geçici
durumu, kaldırma kriteri ve önleyici alternatifi izlenir. Ek kontrol önerisinde
“neden kaynakta önleyemiyoruz?” sorusu zorunlu olur.

### Faz 3 — Organizasyon ve bağlam zekâsı

#### P3.1 Bağlam sözleşmesi

**Durum:** ✅ Tamamlandı — amaç, kapsam, başarı, yöntem rolü, pivot koşulu,
yanlış kullanım ve istenmeyen davranış için onaylı bağlam sözleşmesi eklendi.

**Kaynak:** Makale 17.

Her çalışma için amaç, kapsam, kapsam dışı, başarı ölçütü, yöntem rolü, bırakma/
değiştirme koşulu, yanlış kullanım riski ve istenmeyen davranış kaydedilir.

#### P3.2 Organizasyonel sistem ve zihinsel model analizi

**Durum:** ✅ Tamamlandı — davranışı sistem koşulu, varsayım, KPI, teşvik,
gecikme, geri besleme ve müdahale hipoteziyle izleyen analiz eklendi.

**Kaynak:** Makale 11 ve 12.

Davranış → sistem koşulu → yönetim varsayımı → yerel KPI → teşvik çatışması →
gecikmeli etki → geri besleme döngüsü → müdahale hipotezi.

Kişi suçlayan açıklamalar yerine sistem koşullarını görünür kılar.

#### P3.3 Kalite yönetim sistemi sağlık taraması

**Durum:** ✅ Tamamlandı — sekiz QMS boyutu için 1–5 sağlık skoru, kritik alan,
kanıt, sahip ve iyileştirme aksiyonu eklendi.

**Kaynak:** Makale 11.

Kalite kaynak kapasitesi, üretim baskısı, standart kapsamı, veri güvenilirliği,
kalite maliyeti, tekrar oranı, CAPA yükü ve yönetim öncelik çelişkileri ölçülür.

#### P3.4 Gemba süreç davranışı haritası

**Durum:** ✅ Tamamlandı — standart/gerçek davranış boşluğu, karar, arama,
hata fırsatı, telafi, fiziksel kısıt ve Poka-Yoke fikri haritası eklendi.

**Kaynak:** Makale 1 ve 15.

Beklenen standart, gerçek davranış, insan karar noktası, tekrarlanan soru,
arama/hareket, hata fırsatı, telafi davranışı, fiziksel kısıt ve Poka-Yoke fikri.

### Faz 4 — Operasyonel karar laboratuvarları

#### P4.1 Benchmarking ve referans seçimi

**Durum:** ✅ Tamamlandı — referans türü, ölçek normalizasyonu,
karşılaştırılabilirlik, uygulama farkı, uyarlama ve kör kopyalama riski eklendi.

**Kaynak:** Makale 13.

Amaç, kıyaslanacak yetkinlik, referans türü, karşılaştırılabilirlik, gösterge
normalizasyonu, performans/uygulama farkı, bağlama uyarlama ve kör kopyalama riski.

#### P4.2 Kapasite ve büyüme karar laboratuvarı

**Durum:** ✅ Tamamlandı — talep, darboğaz çevrimi, verim, karma, stok,
kanal katkısı, yatırım ve kapasite what-if hesapları eklendi.

**Kaynak:** Kaynak dosyada ikinci kez 13 olarak numaralanan 14. makale.

Talep, kapasite, darboğaz, ürün karması, throughput, kanal kârlılığı, raf ömrü,
stok, yatırım ve what-if senaryoları.

#### P4.3 S&OP / toplam üretim planlama

**Durum:** ✅ Tamamlandı — talep güven aralığı, kapasite kaynakları, stok,
backlog, hizmet seviyesi, maliyet ve chase/level/hybrid senaryoları eklendi.

**Kaynak:** Makale 16.

Talep güven aralığı, kapasite, iş gücü, fazla mesai, taşeron, stok, backlog,
hizmet seviyesi ve chase/level/hybrid senaryoları.

#### P4.4 Hat dengeleme ve iş tasarımı simülatörü

**Durum:** ✅ Tamamlandı — takt, istasyon yükü, kapasite, denge kaybı,
ergonomi, iş modeli ve kalite sahipliği simülasyonu eklendi.

**Kaynak:** Makale 18.

Operasyon süreleri, takt, istasyon, denge kaybı, WIP, beceri matrisi, hücresel
üretim, tam montaj, ergonomi, monotonluk, kalite sahipliği ve kapasite senaryosu.

### Faz 5 — Gelişmiş analiz yöntemleri

**Durum:** ✅ Tamamlandı — sekiz yöntem, ana metodolojiyi değiştirmeyen;
karar noktası, hipotez, yapılandırılmış veri, kanıt ve sonuç isteyen destek modülleri
olarak eklendi.

**Kaynak:** Makale 4.

Sırayla eklenecek destekleyici çalışma alanları:

1. MSA
2. DOE
3. Fault Tree Analysis
4. Bowtie bariyer analizi
5. Reliability-Centered Maintenance
6. TRIZ
7. Toyota Kata
8. Sistem düşüncesi / nedensel döngü

Bu araçlar ana metodoloji olarak değil, problem yaşam döngüsündeki belirli karar
noktalarında çağrılan destekleyici modüller olarak modellenir.

## 5. Ortak teknik gereksinimler

- Her yeni modül saf domain modeli ve servis portlarıyla başlamalıdır.
- Karar kuralları golden-case testleriyle korunmalıdır.
- Her harici metin/AI önerisi `DRAFT` olarak işaretlenmelidir.
- Her önemli karar audit izine yazılmalıdır.
- Kanıt ve dosya bağlantıları mevcut güvenli attachment altyapısını kullanmalıdır.
- Yetki sınırları organizasyon/rol bazlı genişletilmeden yeni yönetim modülleri
  üretime alınmamalıdır.
- Eski JSON kayıtları normalize edilerek geriye dönük uyumluluk korunmalıdır.
- Dashboard, yeni modüllerin yalnız sayısını değil gecikme, tekrar ve etkinlik
  göstergelerini göstermelidir.

## 6. Başarı ölçütleri

- Tekrarlayan problem oranı
- Problem fark edilme süresi
- Sinyalden vakaya dönüşme süresi
- Kök neden doğrulama süresi
- Containment süresi ve maliyeti
- Etkin aksiyon oranı
- Yeniden açılan vaka oranı
- Gerçek sistem dokümanına dönüşen öğrenme oranı
- Yatay yayılım tamamlama oranı
- Kontrol yükü azalırken kaçış oranının artmaması
- Kaizen deney çevrim süresi
- OPL yetkinlik doğrulama oranı
- Tahmin/kapasite kararlarının plan sapması

## 7. Uygulama sırası

1. P1.1 Katmanlı metodoloji bileşimi
2. P1.2 FMEA gelecek senaryosu
3. P1.3 SDCA stabilizasyon kapısı ✅
4. P1.4 Gerçek sistem dokümanları ✅
5. P1.5 Containment yaşam döngüsü ✅
6. P1.6 Lessons Learned kapısı ✅
7. P2.1–P2.5 proaktif operasyon katmanı ✅
8. P3.1–P3.4 organizasyon ve bağlam zekâsı ✅
9. P4.1–P4.4 karar laboratuvarları ✅
10. P5 gelişmiş analiz yöntemleri ✅

Her madde test, tür denetimi, ilgili lint ve profesyonel uçtan uca vaka doğrulaması
geçmeden tamamlanmış sayılmaz.
