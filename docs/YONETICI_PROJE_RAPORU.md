# Manufacturing Decision Intelligence Platform

## Kapsamlı Yönetici Proje Raporu

**Rapor tarihi:** 19 Temmuz 2026  
**Proje durumu:** Çalışan iç araç / ileri prototip  
**Ana kullanım alanı:** Üretim, kalite, bakım ve sürekli iyileştirme problemlerinin doğru metodolojiyle teşhis edilmesi, yürütülmesi, doğrulanması ve kurumsal öğrenime dönüştürülmesi

---

## 1. Yönetici özeti

Manufacturing Decision Intelligence Platform, üretim problemlerini yalnızca kaydeden veya kullanıcıya boş kalite formları sunan bir yazılım değildir. Platformun temel görevi, bir problemin niteliğini sistematik biçimde teşhis etmek, o problem için en uygun çözüm metodolojisini gerekçeli biçimde seçmek, seçilen metodolojiyi profesyonel bir çalışma alanında uygulatmak ve çalışmanın yalnızca “form dolduruldu” denilerek kapatılmasını engellemektir.

Platformun ana ilkesi şudur:

> Önce problemi teşhis et. Sonra doğru metodolojiyi seç. Ardından metodolojiyi kanıtla uygula, etkinliğini doğrula ve öğrenimi kuruma geri kazandır.

Bu yaklaşım, işletmelerde sık görülen “müşteri şikâyeti varsa her şeyi 8D yapalım”, “neden bilinmiyorsa hemen 5 Why açalım”, “risk çalışması ile gerçekleşmiş hata analizini aynı formda yürütelim” gibi yöntem seçimi problemlerini azaltmayı hedefler. FMEA, 8D, RCA, Kepner–Tregoe, DMAIC veya PDCA birbirinin alternatifi olan formlar değildir; farklı problem sınıflarına cevap veren yönetim sistemleridir. Platform bu farkı yazılımın karar merkezine yerleştirir.

Bugünkü durumda sistem:

- Doğal dilde yazılan problemi yapılandırır.
- Belirsiz kalan noktalar için en fazla bilgi kazandıracak soruyu seçer.
- SDCA dahil 14 metodolojiyi aynı anda puanlayan deterministik bir karar motoru çalıştırır.
- Tek yöntem etiketi yerine birincil yöntem ile analiz, risk, kontrol, karşı önlem ve işletim sistemi katmanlarından oluşan yöntem bileşimi üretir.
- İyileştirme öncesinde standart iş, temel koşullar, ölçüm güvenilirliği ve proses kararlılığını denetleyen stabilizasyon kapısı uygular.
- Öneriyi güven dağılımı ve açık karar zinciriyle gösterir.
- “Bilmiyorum” cevaplarını kaybetmez; saha bilgi görevine dönüştürür.
- Her metodoloji için profesyonel, adım tabanlı uygulama alanı açar.
- İddia, kanıt, aksiyon, metrik, onay, izleme ve kapanış ilişkisini yönetir.
- Kritik iddiaların kanıtsız, aksiyonların etkisiz veya yatay yayılımın incelenmemiş olduğu vakaları kapattırmaz.
- Tekrar eden problemleri eski CAPA ile ilişkilendirir ve eski vakayı yeniden açar.
- Kurumsal öğrenim kaydı ve değişiklik zaman çizelgesi oluşturur.
- Çalışmayı profesyonel rapora ve yazdırılabilir A4 çıktısına dönüştürür.

Projenin en önemli farklılaştırıcısı AI kullanması değil, **karar ve doğrulama disiplinini yazılım davranışına dönüştürmesidir**. AI yardımcıdır; kararın tek sahibi değildir.

---

## 2. Projenin tanımı

Platform, bir **Manufacturing Decision Engine**, yani üretim karar destek ve problem çözme yürütme motorudur. Üç ana sistemi tek ürün içinde birleştirir:

1. **Teşhis sistemi:** Problemin ne tür bir problem olduğunu belirler.
2. **Metodoloji yürütme sistemi:** Doğru yöntemin adımlarını, profesyonel araçlarını ve kayıtlarını yönetir.
3. **Doğrulama ve kapanış sistemi:** Sonucun kanıtlanmadan, etkinliği görülmeden ve kurumsal önleme dönüşmeden kapatılmasını engeller.

Bu nedenle ürün klasik bir chatbot, doküman yönetim sistemi, görev listesi veya dijital 8D formu olarak değerlendirilmemelidir. Bunların bazı işlevlerini kapsasa da ürünün esas değeri, aralarındaki karar bağını kurmasıdır.

---

## 3. İş problemi ve neden bu projeye ihtiyaç duyulduğu

### 3.1 Yanlış metodoloji seçimi

Bir işletmede aynı problem için kalite ekibi 8D, proses mühendisi DMAIC, bakım ekibi RCA önerebilir. Her biri kendi bakış açısından haklı olabilir; fakat problem henüz sınıflandırılmadıysa yöntem seçimi alışkanlığa, kişiye veya müşterinin istediği forma göre yapılır. Yanlış metodoloji:

- Gereksiz bürokrasi üretir.
- Ekibin zamanını yanlış analizlere harcar.
- Kök nedeni bulmadan aksiyona geçilmesine neden olur.
- Risk analizi ile gerçekleşmiş hata analizini karıştırır.
- Müşteri korumasını geciktirebilir.
- İyileştirme projesini basit bir arıza çözümü gibi ele alabilir.

Platform önce problem sınıfını belirleyerek bu kaybı azaltır.

### 3.2 Form tamamlamanın problem çözme sanılması

Birçok dijital kalite sistemi “D1–D8 alanları doldu mu?”, “aksiyon satırı var mı?” veya “rapor yüklendi mi?” düzeyinde kontrol yapar. Ancak aşağıdaki sorular cevapsız kalabilir:

- Kök neden gerçekten kanıtlandı mı?
- Kök neden iddiasına bağlı saha kanıtı var mı?
- Alternatif açıklama kontrollü deneyle elendi mi?
- Aksiyon yalnızca uygulandı mı, yoksa etkili olduğu ölçüldü mü?
- Problem benzer makine ve proseslerde araştırıldı mı?
- İzleme döneminde problem tekrar etti mi?
- Kontrol planı, FMEA veya iş talimatı değişti mi?

Bu proje, form ilerlemesi yerine doğrulama ilerlemesini izler.

### 3.3 Bilginin kişilerde ve dosyalarda kalması

Problem çözüldükten sonra öğrenim çoğu zaman bir PDF içinde, ortak klasörde veya ekip üyelerinin hafızasında kalır. Benzer problem tekrarlandığında çalışma sıfırdan başlar. Platform; problem DNA’sı, bağlı vakalar, aktarılabilir kanıtlar ve kurumsal öğrenim kartıyla bu bilgiyi yeniden kullanılabilir hale getirmek için zemin oluşturur.

---

## 4. Projenin amaçları

### 4.1 Stratejik amaçlar

- Doğru probleme doğru metodolojiyi seçmek.
- Problem çözme kalitesini kişisel deneyime bağımlı olmaktan çıkarmak.
- Kararların gerekçesini görünür ve denetlenebilir yapmak.
- Kalite, üretim, bakım ve mühendislik ekiplerine ortak bir çalışma dili sağlamak.
- Tekrar eden problemlerde önceki kurumsal bilgiyi yeniden kullanmak.
- “Aksiyon tamamlandı” ile “problem kalıcı olarak çözüldü” arasındaki farkı kurumsallaştırmak.

### 4.2 Operasyonel amaçlar

- Teşhis süresini kısaltmak.
- Gereksiz soru ve form sayısını azaltmak.
- Eksik saha bilgisini görev olarak takip etmek.
- Kök neden–kanıt–aksiyon–metrik bağını korumak.
- Geciken etkinlik kontrollerini ve yeniden açılan vakaları görünür yapmak.
- Standart rapor üretimini hızlandırmak.

### 4.3 Teknik amaçlar

- Karar mekanizmasını AI sağlayıcısından bağımsız tutmak.
- Yerel ve çevrimdışı çalışabilmek.
- Eski kayıtları yeni playbook ve veri alanlarıyla uyumlu açabilmek.
- Saf domain mantığını testlerle korumak.
- PostgreSQL ve bellek içi çalışma seçeneklerini birlikte desteklemek.

---

## 5. Uçtan uca kullanıcı yolculuğu

### Aşama 1 — Problem girişi

Kullanıcı problemi doğal Türkçe ile yazar. Örneğin: “Müşteriden gelen üründe kaynak çatlağı var, geçen haftaki fikstür değişiminden sonra başladı ve kök neden bilinmiyor.”

### Aşama 2 — Problemin yapılandırılması

Parser metni 29 üç-değerli teşhis değişkenine dönüştürür. Her değişken `evet`, `hayır` veya `bilinmiyor` olabilir. Sistem metinde olmayan bir olguyu varmış gibi kabul etmez. Bu pozitif kanıt yaklaşımı yanlış çıkarımları sınırlar.

### Aşama 3 — Deterministik sınıflandırma

Deklaratif kurallar 14 metodolojinin tamamına pozitif veya negatif skor katkısı yapar. Skorlar softmax ile göreli güven dağılımına çevrilir. Böylece tek bir katı karar ağacı yerine örtüşen problem sinyalleri birlikte değerlendirilir.

### Aşama 4 — Adaptif soru

Motor yeterince emin değilse her bilinmeyen alanın olası cevaplarda belirsizliği ne kadar azaltacağını hesaplar. En yüksek bilgi kazancına sahip soru seçilir. Kullanıcıya aynı sabit anketin tamamı sorulmaz.

### Aşama 5 — Öneri ve açıklama

Sistem birincil metodolojiyi, yakın alternatifleri, güven sıralamasını ve karar zincirini gösterir. Örneğin:

`Müşteri etkilendi → gerçek hata oluştu → kök neden bilinmiyor → öneri: 8D`

### Aşama 6 — Uygulama alanı

Seçilen metodoloji için ilgili profesyonel playbook açılır. 8D için D0–D8, FMEA için risk tablosu, RCA için 5 Why ve balık kılçığı, Kepner–Tregoe için IS/IS NOT ve değişiklik analizi gibi özgün yapılar kullanılır.

### Aşama 7 — Doğrulama

Ekip hipotezleri, kök neden iddialarını, saha kanıtlarını, karşı-olgusal testleri, aksiyonları ve etkinlik metriklerini kaydeder. Sistem bunlar arasındaki ilişkiyi korur.

### Aşama 8 — Kapanış ve izleme

Kapanış kapıları geçilmeden çalışma kapatılamaz. Uygun vaka önce izleme durumuna alınır. İzleme başarısızsa vaka yeniden açılır; başarılıysa kapanır.

### Aşama 9 — Kurumsal öğrenim

Doğrulanmış kök neden, etkili karşı önlem, standardizasyon kararı, yeniden kullanım kapsamı ve etiketler öğrenim kaydına aktarılır. Böylece vaka yalnızca arşivlenmez; gelecekte kullanılabilecek kurumsal bilgiye dönüşür.

---

## 6. Teşhis ve karar motoru

### 6.1 Neden karar AI’a bırakılmadı?

Bir LLM akıcı ve ikna edici cevap üretebilir; fakat aynı probleme farklı zamanlarda farklı metodoloji önerebilir, gerekçe uydurabilir veya eğitim verisindeki genel kalıplara aşırı güvenebilir. Üretim ve kalite kararlarında açıklanabilirlik, tekrarlanabilirlik ve regresyon kontrolü gerekir.

Bu nedenle:

- Metodoloji seçimi saf TypeScript domain kodunda yapılır.
- AI yalnızca metni anlamaya, soruyu doğal ifade etmeye, taslak ve rapor üretmeye yardım eder.
- AI kapalı olsa bile sistem keyword parser ve deterministik motorla çalışır.
- Knowledge dosyaları rehberlik ve rapor bağlamı sağlar; kararın doğruluk kaynağı değildir.

Bu ayrım projenin en kritik mimari kararıdır.

### 6.2 Desteklenen 14 metodoloji

| Metodoloji | Temel kullanım amacı |
|---|---|
| FMEA | Hata oluşmadan riskleri öngörme ve önceliklendirme |
| Kepner–Tregoe | Yeni sapma, değişiklik ve IS/IS NOT karşılaştırması |
| RCA | Gerçekleşmiş problemin bilinmeyen kök nedenini bulma |
| 8D | Müşteri etkisi, containment ve disiplinli problem çözme |
| PDCA / A3 | Sürekli iyileştirme ve yönetim hikâyesi |
| DMAIC | Veri yoğun varyasyon azaltma ve istatistiksel doğrulama |
| 5S | İş yeri düzeni, görsel standart ve sürdürülebilir disiplin |
| TPM | Ekipman kaybı, plansız duruş ve güvenilirlik |
| Lean / VSM | Akış, bekleme ve israf azaltma |
| DMADV | Yeni ürün veya proses tasarlama |
| SPC | Süreç kararlılığı ve özel neden izleme |
| Poka-Yoke | Hatanın oluşmasını veya kaçmasını fiziksel olarak önleme |
| TOC | Sistem kısıtını bulma ve toplam akışı artırma |
| SDCA | İyileştirme öncesinde standart işi, temel koşulları ve kararlı baz hattı kurma |

### 6.3 Güven skoru ne anlama gelir?

Güven yüzdesi bugün istatistiksel olarak kalibre edilmiş “başarı olasılığı” değildir. Mevcut kanıtlara göre metodolojilerin göreli uygunluk dağılımıdır. Bu ayrım yönetim açısından önemlidir: yüzde, sistemin ne kadar ayrıştığını gösterir; gelecekte gerçek sonuç verisi biriktiğinde kalibrasyon yapılacaktır.

### 6.4 Decision Trace neden var?

Kullanıcı yalnızca “8D önerildi” sonucunu görürse sistem kara kutu olur. Decision Trace hangi bilginin hangi kurala katkı yaptığını ve sonuca nasıl gidildiğini gösterir. Bu:

- Kullanıcı güvenini artırır.
- Yanlış parse edilen bilgiyi fark etmeyi sağlar.
- Kural değişikliklerini denetlenebilir yapar.
- Eğitim amacı taşır; ekip metodoloji ayrımını öğrenir.

### 6.5 Karşı-olgusal analiz neden var?

Sistem her teşhis değişkenini alternatif değeriyle tekrar çalıştırır ve yalnız metodoloji liderini gerçekten değiştiren senaryoları gösterir. “Müşteri etkilenmemiş olsaydı 8D yerine RCA öne çıkacaktı” gibi açıklamalar, kararın hangi varsayıma hassas olduğunu görünür kılar. Bu özellik karar kalitesinin yanı sıra yöneticinin hangi bilgiyi önce doğrulatması gerektiğini anlamasına yardımcı olur.

---

## 7. “Bilmiyorum” cevabı ve bilgi görevi kapalı döngüsü

Geleneksel soru formlarında “bilmiyorum” cevabı çoğu zaman boş alan olarak kalır. Oysa üretim probleminde bilinmeyen bir olgu, sahada yapılması gereken bir ölçüm veya doğrulama işidir.

Platform bu cevabı:

- İlgili teşhis değişkenine bağlı bilgi görevine dönüştürür.
- Sorumlu ve termin atanmasına izin verir.
- Aynı sorunun tekrar tekrar sorulmasını engeller.
- Saha cevabı geldiğinde teşhisi yeniden hesaplar.
- Metodoloji lideri değişirse eski ve yeni öneriyi değişim kaydı olarak gösterir.

Bu mekanizma, teşhisi tek seferlik ankete değil yaşayan bir öğrenme döngüsüne dönüştürür.

---

## 8. Playbook tabanlı profesyonel çalışma alanları

Her metodolojinin gerçek endüstriyel kullanımına yakın adım ve alan şemaları vardır. Alanlar serbest metin, yapılandırılmış tablo, 5 Why veya balık kılçığı gibi tiplerde tanımlanır. Bu tasarımın nedenleri:

- Her yöntemi aynı genel not ekranına indirgememek.
- Kullanıcının metodolojinin gerektirdiği düşünme sırasını izlemesini sağlamak.
- Raporlama ve AI taslağında tutarlı veri üretmek.
- Playbook geliştiğinde eski kayıtları otomatik uyarlamak.

Her adım `PENDING`, `IN_PROGRESS` veya `DONE` durumundadır. Uygulama, güncel playbook’ta sonradan eklenen adımların eski kayıtlarda eksik olması halinde boş state tohumlayarak kayıtları geriye dönük uyumlu açar.

### AI adım taslağı

AI, probleme ve önceki adımlara göre adım taslağı üretebilir. Ancak kullanıcı emeğini ezmemesi için yalnız boş alanları doldurur. İsim, sorumlu ve tarih gibi saha verilerini uydurmaması için bu alanlar deterministik olarak temizlenir. Yerel model geçersiz JSON veya yabancı karakter üretirse çıktı şemaya zorlanır ya da güvenli deterministik taslağa düşülür.

---

## 9. Doğrulama omurgası: neden eklendi, neden var?

### 9.1 Temel gerekçe

Doğrulama omurgası, platformun “dijital form uygulaması” olmaktan çıkıp gerçek bir karar ve kapanış sistemi olmasını sağlayan katmandır. Eklenme nedeni, metodoloji adımlarının tamamlanmasının problemin çözüldüğü anlamına gelmemesidir.

Bir ekip bütün D adımlarını doldurabilir fakat yanlış kök nedeni seçmiş olabilir. Bir aksiyon tamamlanmış olabilir fakat hata oranını değiştirmemiş olabilir. Bir problem ilgili hatta çözülmüş olabilir fakat aynı fikstürü kullanan diğer üç hatta yaşamaya devam edebilir. Doğrulama omurgası bu sahte tamamlanma durumlarını engeller.

### 9.2 İddia–kanıt ilişkisi

Platform üç tür iddiayı ayırır:

- Hipotez
- Kök neden
- Sonuç

İddialar `CLAIMED`, `VERIFIED` veya `REJECTED` durumundadır. Kritik iddia doğrulanmış sayılmak için kanıt bağlantısı taşımalıdır. Bu sayede bir cümlenin rapora yazılması ile bilimsel olarak desteklenmesi ayrılır.

### 9.3 Karşı-olgusal doğrulama

Kök neden için yalnız korelasyon yeterli değildir. “Bu neden ortadan kaldırılırsa problem de ortadan kalkıyor mu?” veya “neden yeniden oluşturulduğunda problem geri geliyor mu?” soruları önemlidir. Platform iddialarda karşı-olgusal test kaydı tutar ve kırmızı takım mekanizması eksik doğrulama zincirini eleştirir.

### 9.4 Aksiyon etkinliği

Aksiyon durumları yalnız açık/kapalı değildir:

`OPEN → IN_PROGRESS → IMPLEMENTED → EFFECTIVENESS_DUE → EFFECTIVE / INEFFECTIVE → DONE`

Bu ayrım bilinçlidir. “Uygulandı” işi yapan ekibin faaliyetini, “etkili” ise problem sonucundaki değişimi ifade eder. Başarı metriği, başlangıç, hedef, gerçekleşen değer ve doğrulama tarihi olmadan etkili aksiyon iddiası zayıftır.

### 9.5 Kapanış kapıları

Bir çalışmanın kapanabilmesi için sistem aşağıdakileri kontrol eder:

1. Tüm metodoloji adımları tamamlanmış olmalı.
2. Kritik iddialar doğrulanmış ve kanıta bağlı olmalı.
3. Kritik aksiyonların etkinliği doğrulanmış olmalı.
4. Erken uyarı ve izleme planı tanımlanmış olmalı.
5. Gerekli kalite ve proses sahibi onayları tamamlanmış olmalı.
6. En az bir saha kanıtı bulunmalı.
7. Kritik kırmızı takım itirazları kapanmış olmalı.
8. Yatay yayılım hedefleri değerlendirilmiş olmalı; risk bulunan hedef alt vakaya dönüştürülmüş olmalı.

Bu kapılar kullanıcıyı cezalandırmak için değil, yönetimin “kapandı” durumuna güvenebilmesi için vardır.

### 9.6 İzleme dönemi

Kapanış tek adımda `CLOSED` yapılmaz. Akış şöyledir:

`OPEN → CLOSURE_CANDIDATE → MONITORING → CLOSED veya REOPENED`

Kapanış koşulları sağlandığında çalışma izlemeye alınır. Seçilen metrik, tetik seviyesi, sorumlu ve değerlendirme tarihi kaydedilir. İzleme başarısızsa vaka yeniden açılır ve tekrar sayısı artar. Bu yapı çözümün zamana dayanıklılığını ölçer.

### 9.7 Yönetimsel değeri

Doğrulama omurgası sayesinde yönetim:

- Kaç form tamamlandığını değil, kaç problemin kanıtla kapandığını görür.
- Uygulanmış fakat etkinliği bekleyen aksiyonları ayırır.
- Kanıtsız kök neden iddialarını görünür kılar.
- Tekrar eden problemlerde eski kapanışın başarısızlığını izler.
- Denetimlerde kapanış kararının dayanaklarını gösterebilir.

---

## 10. Kırmızı takım mekanizması

Kırmızı takım, ekibin kendi çözümüne aşırı bağlanmasını engelleyen sistematik itiraz katmanıdır. Sistem örneğin:

- “İnsan hatası”nın nihai kök neden olarak bırakılmasını,
- Kanıtsız veya karşı-olgusal testsiz doğrulama iddiasını,
- Metriksiz “etkili aksiyon” durumunu,
- Yatay yayılımın değerlendirilmemesini

bulguya dönüştürür. Bulgular açık, kabul edilmiş, kanıtla reddedilmiş, ilgisiz veya çözülmüş olabilir. Kanıtla ret seçeneği gerçekten kanıt bağlantısı ister. Açık kritik itirazlar kapanışı engeller.

Bu özellik, kalite güvencenin sonradan belge kontrolü yapması yerine eleştirel düşünmenin çalışma akışına gömülmesini sağlar.

---

## 11. Problem DNA’sı, benzer vakalar ve tekrar yönetimi

Problem açıklamasından ayırt edici kelimeler çıkarılarak bir Problem DNA kaydı oluşturulur. Mevcut sürüm hafif, deterministik token benzerliği kullanır. Amaç ağır bir yapay zekâ altyapısı kurmadan geçmişteki benzer vakaları görünür kılmaktır.

Benzer problem tekrar ettiğinde:

- Yeni vaka eski çalışmaya `RECURRENCE` ilişkisiyle bağlanır.
- Eski çalışma yeniden açılır.
- Tekrar sayısı artırılır.
- Yeni vaka eski CAPA ve kanıt zincirinden yararlanabilir.

Bu davranış önemlidir; tekrar eden problem yeni ve bağımsız bir başarı hikâyesi gibi kapatılamaz. Eski çözümün kalıcılığı sorgulanır.

---

## 12. Metodoloji zinciri ve veri aktarımı

Gerçek problem çözme çoğu zaman tek metodolojiyle bitmez. Örneğin:

- RCA ile neden bulunur, Poka-Yoke ile hata önlenir.
- 8D D7 öğrenimi FMEA’ya aktarılır.
- FMEA’daki yüksek risk SPC ile izlenir.
- DMAIC Control aşaması SPC’ye bağlanır.

Platform doğal takip ve tamamlayıcı metodolojileri önerir. Bağlı çalışma boş açılmaz; kanıtlar, doğrulanmış iddialar, aksiyonlar, metrikler ve ekler hedefe aktarılır. Belirli metodoloji çiftlerinde playbook alanları deterministik eşlenir. Kullanıcı çalışma açılmadan önce kaç kaydın ve kaç hazır adımın aktarılacağını görür.

Bu yaklaşım kopyala-yapıştır rapor üretimini azaltır ve metodolojiler arasında izlenebilir süreklilik kurar.

---

## 13. Yatay yayılım sihirbazı

Bir düzeltmenin yalnız problemin görüldüğü noktada uygulanması sistemik riski ortadan kaldırmayabilir. Bu nedenle kullanıcı proses, makine, hat, lokasyon veya tedarikçi hedefleri ekler. Her hedef için:

- Durum
- Risk seviyesi
- Sorumlu
- Termin
- Bulgu
- Kanıt bağlantısı
- Alt vaka bağlantısı

tutulur. Risk bulunan hedef alt vakaya dönüştürülmeden kapanış kapısı geçilemez. Böylece “diğer hatlara bilgi verildi” gibi doğrulanamayan genel ifadeler yerine hedef bazlı takip yapılır.

---

## 14. Dosya kanıtları

JPEG, PNG, WebP, PDF, CSV, metin ve Excel dosyaları 10 MB sınırıyla yüklenebilir. Dosya:

- Genel çalışmaya
- Kanıta
- İddiaya
- Aksiyona
- Playbook adımına

bağlanabilir. Güvenlik amacıyla kullanıcı dosya adı doğrudan disk yolu olarak kullanılmaz; rastgele depolama anahtarı üretilir. İndirme rotası path traversal ve MIME sniffing risklerine karşı sınırlandırılmıştır. Ekler bağlı çalışmalara aktarılabilir.

---

## 15. Uzman metodoloji araçları

### SPC çalışma tezgâhı

- CSV/Excel’den ölçüm yapıştırma
- I-MR kontrol limitleri
- Ortalama, LCL, UCL ve sigma
- LSL/USL ile Cp ve Cpk
- 3 sigma dışı nokta
- Aynı tarafta sekiz nokta
- Altı noktalı trend gibi özel neden sinyalleri

Amaç yalnız grafik çizmek değil, kontrol kartı sinyallerini aksiyon ve izleme planına bağlamaktır.

### FMEA risk motoru

- Şiddet, oluşma ve keşfedilebilirlik için 1–10 doğrulaması
- Otomatik S×O×D / RPN
- Şiddet 9 ve üzerindeyse RPN düşük olsa dahi kritik öncelik

Bu, yalnız RPN sıralamasına güvenmenin oluşturduğu güvenlik riskini azaltır.

### 8D olay komuta merkezi

- Olay başlangıç ve containment süresi
- Şüpheli, müşteri ve transit stok kapsamı
- D3 tamamlanmadan D4’e geçiş kilidi
- Doğrulanmamış kök nedeni müşteriye kesin gerçek gibi yazmayı engelleyen kontrollü metin

### Kepner–Tregoe değişiklik radarı

- İlk sapma tarihi etrafında değişiklik zaman çizgisi
- Değişikliklerin sapmaya zamansal mesafesi
- Geri alma veya A/B deneyi
- Beklenen sonuç ve doğrulama kararı

### RCA araçları

- Kök neden işaretli 5 Why zinciri
- 6M kategorili balık kılçığı
- Neden ve kanıt değerlendirmesini aynı veri yapısında tutma

---

## 16. Raporlama

Platform iki raporlama düzeyi sunar:

1. Teşhis raporu: problem özeti, önerilen metodoloji, karar gerekçesi, alternatifler ve ilk adımlar.
2. Uygulama raporu: doldurulan playbook adımları, yönetici özeti, aksiyon tablosu ve kurumsal öğrenim kaydı.

AI varsa metni profesyonel Türkçe ile cilalayabilir; AI başarısızsa deterministik rapor her zaman üretilir. Rapor Markdown olarak güvenli React bileşenleriyle gösterilir; ham HTML enjeksiyonuna izin verilmez. Ayrı A4 yazdırma sayfası ve print stili bulunur.

---

## 17. Kurumsal öğrenim kaydı

Kapanan vakanın kurumsal hafızaya dönüşmesi için şu alanlar tutulur:

- Doğrulanmış kök neden
- Etkili olduğu doğrulanmış karşı önlem
- Etkinlik metriği ve doğrulama sonucu
- Değiştirilen talimat, kontrol planı, FMEA veya bakım standardı
- Yeniden kullanım kapsamı
- Aranabilir etiketler

“Doğrulanmış veriden getir” işlemi, onaylanmış kök nedenleri ve etkili aksiyonları karta taşır. Kayıt profesyonel rapora otomatik eklenir. Bu modül, gelecekteki öğrenim kütüphanesi ve benzer vaka önerisinin veri temelidir.

---

## 18. Denetim izi ve zaman çizelgesi

Çalışma alanında aşağıdaki olaylar kaydedilir:

- Oluşturma
- Genel güncelleme
- AI taslağı
- Rapor üretimi
- Dosya ekleme
- Bağlı çalışma oluşturma/veri aktarımı
- Kapanış ve izleme yaşam döngüsü

Her olay zaman, tür, özet ve değişen ana alanları taşır. Eski kayıtlar boş zaman çizelgesiyle uyumlu açılır. Bu katman “kim, hangi değeri neye çevirdi?” düzeyindeki tam regülasyon audit’i değildir; ancak olay temelli denetim altyapısını kurar. Sonraki aşamada aktör ve önceki/yeni değer ayrıntısı eklenebilir.

---

## 19. Dashboard ve çalışma listesi

Dashboard form sayısını değil operasyonel riski gösterir:

- Açık çalışma
- Etkinlik doğrulaması bekleyen aksiyon
- Kanıtsız kritik iddia
- Yeniden açılan vaka
- Toplam saha kanıtı
- Kapanış riski taşıyan çalışmalar

Çalışmalar ekranı devam eden ve tamamlanan uygulamaları, adım ilerlemesini, açık aksiyon sayısını, güncellenme tarihini ve rapor bağlantısını gösterir.

---

## 20. Güvenlik ve erişim

Uygulama iç araç yaklaşımına uygun basit parola korumasına sahiptir:

- `APP_PASSWORD` tanımlı değilse auth kapalıdır.
- Tanımlıysa sayfa ve API’ler korunur.
- Parola çereze yazılmaz; HMAC tabanlı oturum değeri kullanılır.
- API yetkisiz isteğe 401, sayfa isteği giriş ekranına yönlendirme verir.
- Karşılaştırma sabit zamanlıdır.

Bu yapı MVP/iç araç için yeterlidir; kullanıcı bazlı rol, yetki ve kurumsal SSO henüz yoktur.

---

## 21. Teknik mimari ve nasıl geliştirildiği

### Teknoloji yığını

- Next.js 16.2.10 ve Turbopack
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma 6
- Zod 4
- Vitest
- Opsiyonel yerel Ollama LLM

### Katmanlar

- **Domain:** Teşhis değişkenleri, kurallar, güven, soru seçimi, decision trace, playbook ve doğrulama kuralları.
- **Application:** Teşhis, rapor, rehber, workspace ve veri aktarım servisleri.
- **Ports:** AI, parser, repository ve knowledge arayüzleri.
- **Infrastructure:** Prisma/bellek repository, keyword/LLM parser, Ollama ve dosya knowledge okuyucu.
- **Presentation:** Next.js App Router sayfaları, route handler API’leri ve React bileşenleri.

Bu katman ayrımı, Next.js veya Prisma’nın karar mantığına sızmasını engeller. Karar motoru saf fonksiyonlarla test edilebilir.

### Kalıcılık

Conversation, RCA ve Workspace aggregate’leri PostgreSQL’de JSONB veri olarak saklanır. Bu seçim hızlı ürün evrimine ve playbook alanlarının değişmesine esneklik sağlar. Uygulama sınırında Zod doğrulaması kullanılır. PostgreSQL olmadan bellek içi repository ile çalışma seçeneği vardır.

### Çevrimdışı çalışma

Ücretli bulut AI zorunlu değildir. Yerel Ollama kullanılabilir; AI kapalıyken keyword parser ve deterministik taslak/rapor yolları çalışır. Google font indirme bağımlılığı kaldırılmış, production build çevrimdışı hale getirilmiştir.

### Geriye dönük uyumluluk

Proje hızlı evrildiği için eski kayıtların yeni alanları taşımaması önemli bir risk olmuştur. Servis ve istemci katmanlarında actions, evidence, claims, metrics, attachments, auditTrail ve diğer koleksiyonlar varsayılanlarla normalize edilir. Playbook’a yeni adım eklendiğinde eksik adım state’i otomatik tohumlanır. Bu yaklaşım kullanıcı verisini silmeden şema evrimini yönetir.

---

## 22. Test ve kalite güvencesi

Mevcut otomatik test paketi **86 testten** oluşur ve şunları kapsar:

- 14 metodoloji için golden-case teşhis regresyonları
- Kural, güven, bağlam ve soru seçimi
- Karşı-olgusal analiz
- Bilgi görevi ve teşhisin yeniden hesaplanması
- Playbook yapısal bütünlüğü
- Workspace oluşturma, taslak, rapor ve legacy migration
- Metodolojiler arası veri aktarımı
- Kurumsal öğrenim raporu
- Audit zaman çizelgesi
- Auth davranışı
- Dosya ek güvenlik politikası
- Üretim analitiği ve SPC/FMEA yardımcıları

Son doğrulamada 137/137 test geçmiş, TypeScript kontrolü ve production build başarıyla tamamlanmıştır. Bu testler özellikle kural ağırlıkları, playbook evrimi, karar laboratuvarları, ileri analizler ve eski kayıt uyumluluğu için regresyon kalkanıdır.

---

## 23. Uygulanan önemli tasarım kararları ve gerekçeleri

1. **Önce iç araç:** Çok kiracılı SaaS karmaşıklığı yerine çekirdek problem çözme değeri kanıtlandı.
2. **Decision Engine merkezli mimari:** AI’ın değişkenliği karar katmanından ayrıldı.
3. **Ağırlıklı skor + softmax:** Problem sınıflarının örtüşmesi ve göreli güven görünür hale geldi.
4. **Bilgi kazançlı adaptif soru:** Sabit uzun anket yerine en değerli soru soruldu.
5. **Pozitif kanıt parser’ı:** Metinde olmayan olgunun uydurulması sınırlandı.
6. **Knowledge karar vermez:** Bilgi tabanı ve LLM’in kuralları sessizce değiştirmesi engellendi.
7. **Playbook tabanlı workspace:** 14 yöntemin aynı genel forma indirgenmesi önlendi.
8. **Uygulandı ≠ etkili:** Aksiyon faaliyetinin sonuç başarısından ayrılması sağlandı.
9. **Kapanıştan önce izleme:** Anlık iyileşmenin kalıcı çözüm sanılması engellendi.
10. **Kırmızı takım kapısı:** Ekiplerin kendi hipotezine aşırı bağlanması sistematik olarak sorgulandı.
11. **Yatay yayılım kapısı:** Yerel çözümün sistemik önlem sanılması engellendi.
12. **Metodoloji zinciri:** Problem çözme yaşam döngüsünün tek forma hapsedilmesi önlendi.
13. **Yerel AI ve deterministik fallback:** Maliyet, gizlilik ve erişilebilirlik riski azaltıldı.
14. **JSONB aggregate:** Hızlı gelişen profesyonel formlarda şema esnekliği sağlandı.
15. **Kurumsal öğrenim:** Kapanan vakanın rapor mezarlığına dönüşmesi engellenmeye başlandı.

---

## 24. İşletmeye beklenen katkılar

### Kalite

- Kanıtsız kök neden ve etkisiz aksiyon kapanışlarının azalması
- Müşteri raporlarında daha kontrollü dil
- Denetim izlenebilirliği
- FMEA, kontrol planı ve yatay yayılım bağlantısının güçlenmesi

### Üretim

- Daha kısa teşhis döngüsü
- Tekrarlayan analiz toplantılarının azalması
- Sorumlu, termin ve etkinlik kontrolünün tek yerde toplanması

### Mühendislik

- Metodolojiye özel profesyonel araçlar
- Benzer vakaların ve önceki kanıtların yeniden kullanılması
- İstatistiksel ve karşı-olgusal doğrulamanın teşvik edilmesi

### Yönetim

- Form ilerlemesi yerine kapanış riskinin görülmesi
- Açık, yeniden açılan ve etkinliği bekleyen çalışmaların ayrılması
- Problem çözme sürecinin kişilerden bağımsızlaştırılması
- Kurumsal öğrenim için yapılandırılmış veri birikmesi

---

## 25. Başarı göstergeleri için önerilen KPI’lar

Gerçek kullanıma geçildiğinde aşağıdaki göstergeler izlenmelidir:

- İlk teşhisten metodoloji seçimine geçen ortalama süre
- Önerilen metodolojinin uzman tarafından kabul oranı
- Kapanışa kadar geçen medyan süre
- Uygulandı durumundan etkili durumuna geçiş süresi
- İzleme sonrası yeniden açılma oranı
- Kanıta bağlı doğrulanmış kök neden oranı
- Yatay yayılımda ek risk bulunan vaka oranı
- Benzer vaka bilgisinin yeniden kullanım oranı
- Aynı Problem DNA ailesinde tekrar oranı
- Kurumsal öğrenim kartı tamlık oranı
- Geciken etkinlik doğrulaması ve bilgi görevi sayısı
- Standart işe ve temel koşullara dönmeden başlatılan iyileştirme oranı
- `STABILIZE_FIRST` sonucundan `READY` durumuna geçiş süresi
- Aktif containment süresi ve containment başına operasyon yükü
- Onaylı sistem dokümanına dönüşen kapanmış vaka oranı
- Zayıf sinyalden triyaja ve problem vakasına dönüşme süresi
- Kaizen deney çevrim süresi ve standardizasyona dönüşme oranı
- OPL yetkinlik doğrulama ve tekrar değerlendirme oranı
- Kaynakta önleme sonrası azaltılan geçici kontrol maliyeti
- Kritik ve kırılgan QMS boyutlarının kapanma süresi
- Gemba fırsatından Poka-Yoke veya standart iş çıktısına dönüşüm oranı
- Kapasite ve S&OP senaryolarında plan–gerçekleşen sapması
- Taktı aşan istasyonların giderilme ve ergonomi riskinin düşürülme oranı
- İleri destek analizlerinin kanıtlı tamamlanma ve karar kullanım oranı

Bu KPI’lar olmadan yalnız kullanım sayısını ölçmek ürünün gerçek değerini göstermez.

---

## 26. Mevcut sınırlar ve riskler

- Güven yüzdeleri gerçek sonuç verisiyle henüz kalibre edilmemiştir.
- Problem DNA benzerliği bugün hafif token benzerliğidir; semantik arama değildir.
- Basit parola koruması kullanıcı bazlı yetkilendirme ve SSO sağlamaz.
- Audit izi olay seviyesindedir; tam aktör ve alan bazlı önce/sonra farkı yoktur.
- Dashboard temel operasyonel göstergeleri sunar; trend ve süre analitiği sınırlıdır.
- LLM küçük yerel model kullanıldığında bozuk JSON veya zayıf dil üretebilir; fallback mekanizması olsa da içerik insan kontrolü gerektirir.
- JSONB hızlı evrim sağlar ancak ileri ölçekli analitik için seçili alanların ilişkisel modele çıkarılması gerekebilir.
- Tarayıcı tabanlı uçtan uca test paketi henüz yoktur.
- Üretim ortamı, yedekleme, gözlemlenebilirlik ve felaket kurtarma süreçleri ayrıca tasarlanmalıdır.

---

## 27. Tamamlanan genişleme yol haritası ve kalan kurumsallaşma işleri

Faz 1–5 kapsamındaki ürün genişletmeleri tamamlanmıştır. Aşağıdaki maddeler artık
çekirdek fonksiyon geliştirmesinden çok pilot kullanım, kurumsal yaygınlaştırma,
entegrasyon ve gerçek saha verisiyle kalibrasyon işleridir.

### Yakın dönem

1. Kurumsal öğrenim kütüphanesi ve etiketli arama
2. Yeni problemde benzer kapanmış vaka ve etkili aksiyon önerisi
3. Tek sayfalık yönetici kapanış özeti
4. Görev/termin merkezi
5. Gelişmiş dashboard trendleri
6. CSV/Excel ve denetim paketi dışa aktarma

### Orta dönem

7. Kullanıcı, rol ve yetki modeli
8. E-posta/Teams/Slack bildirimleri
9. Tarayıcı tabanlı uçtan uca testler
10. Kurumsal SSO ve ortam sertleştirmesi
11. ERP/MES/QMS entegrasyonları

### Gerçek veri biriktiğinde

12. Kural ağırlıkları ve softmax sıcaklığının sonuç verisiyle kalibrasyonu
13. Yerel embedding tabanlı hafif RAG
14. Metodoloji öneri doğruluk ve sonuç başarısı analitiği

Faz 6’nın veri birikmeden yapılmaması bilinçli bir karardır. Geçmiş vaka sayısı az olduğunda öğrenen sistem doğruluk değil gürültü öğrenir.

---

## 28. Yönetim için sonuç ve öneri

Proje, başlangıçtaki “doğru metodolojiyi öneren AI destekli araç” hedefini aşarak teşhis, yürütme, doğrulama, kapanış, tekrar yönetimi ve kurumsal öğrenimi birleştiren kapsamlı bir üretim karar destek platformuna dönüşmüştür.

Bugün en güçlü tarafları:

- Kararın AI’a bırakılmaması
- Açıklanabilir metodoloji seçimi
- 14 yöntemin profesyonel çalışma alanları
- Kanıt ve etkinlik temelli kapanış
- Kırmızı takım ve yatay yayılım kapıları
- Bağlı metodoloji zincirleri
- Eski kayıtlarla uyumluluk
- Yerel/çevrimdışı çalışabilme
- Güçlü otomatik regresyon paketi

Bir sonraki yönetim önceliği yeni özellik eklemekten önce pilot kullanım ve veri kalitesidir. Seçilecek bir üretim alanında gerçek vakalarla kontrollü pilot yapılmalı; kullanıcıların metodoloji önerisini kabul/ret gerekçeleri, kapanış süreleri, yeniden açılma ve etkili aksiyon oranları ölçülmelidir. Bu veri, daha sonra yapılacak kalibrasyon ve kurumsal öğrenim aramasının temelini oluşturacaktır.

Nihai değer önerisi şöyledir:

> Platform yalnızca “hangi yöntemi kullanalım?” sorusunu cevaplamaz. Doğru yöntemi seçer, ekibi doğru düşünme sırasından geçirir, kanıtsız kapanışı engeller, çözümün kalıcı olup olmadığını izler ve öğrenileni bir sonraki probleme taşır.

---

## 29. Makale analizi sonrasında eklenen bütünleşik sistemler

Bu bölüm, raporun ilk sürümünden sonra `MAKALELER1.docx` içindeki yirmi makalenin
değerlendirilmesiyle oluşturulan Faz 1–5 yol haritası kapsamında tamamlanan ve önceki
bölümlerde bulunmayan yetenekleri açıklar. Genişleme yalnızca yeni formlar eklememiş;
platformu reaktif problem çözme aracından, önleme, günlük yönetim, organizasyonel
öğrenme ve operasyonel karar desteğini birlikte yürüten bir üretim yönetim sistemine
dönüştürmüştür.

### 29.1 Katmanlı metodoloji bileşimi

#### Neden eklendi?

Gerçek üretim problemleri çoğu zaman tek bir yönteme sığmaz. Örneğin müşteri kaçağını
8D yönetebilir, kök nedeni RCA veya Kepner–Tregoe analiz edebilir, gelecekteki riski
FMEA değerlendirebilir, özel nedenleri SPC izleyebilir ve bilinen hata modunu
Poka-Yoke önleyebilir. Önceki yaklaşım yalnızca en yüksek puanlı yöntemi gösterdiğinde,
doğru birincil yöntemi seçse bile tamamlayıcı çalışma rollerini görünmez bırakıyordu.

#### Nasıl çalışıyor?

Teşhis sonucu artık iki ayrı karar üretir:

1. **Birincil yöntem:** Vakanın yönetim omurgasıdır.
2. **Yöntem bileşimi:** Pozitif skorlu adaylar rollerine göre katmanlara ayrılır.

Katmanlar; koordinasyon, analiz, tasarım, iyileştirme, karşı önlem, risk, kontrol ve
işletim sistemi rollerini kapsar. Her katmana aynı rol grubundaki en güçlü pozitif
aday alınır. Böylece sistem “sekiz yöntemi birden kullanın” gibi kontrolsüz bir araç
kalabalığı üretmez; yalnızca vakaya kanıtla katkı veren tamamlayıcı yöntemleri gösterir.

#### Yönetim değeri

- Yöntemler arasındaki görev ve sorumluluk karışıklığını azaltır.
- Birincil problem yönetimi ile destek analizini birbirinden ayırır.
- Çalışmanın hangi aşamada başka bir yönteme devredileceğini görünür kılar.
- Tek forma aşırı yük bindirilmesini engeller.

### 29.2 FMEA gelecek senaryosu ve varsayım analizi

#### Neden eklendi?

Klasik FMEA uygulamalarının önemli riski, geçmiş hata listelerinin geleceğe aynen
taşınmasıdır. Oysa yeni operatör, malzeme, tedarikçi, teknoloji, kapasite baskısı veya
bakım stratejisi geçmişte hiç yaşanmamış bir hata koşulu oluşturabilir. Bu nedenle
FMEA, “ne olmuştu?” listesinden “koşullar değişirse sistem nasıl başarısız olabilir?”
disiplinine genişletilmiştir.

#### Yeni yapı

FMEA playbook’una analizden önce bir **Değişim, Varsayım ve Gelecek Senaryoları**
adımı eklenmiştir. Her senaryoda aşağıdakiler tutulur:

- Değişebilecek unsur
- Bugünkü varsayım
- Olası gelecek koşulu
- Sistemin beklenen tepkisi
- Ortaya çıkabilecek hata modu
- Mevcut kontrol
- Kontrolün kırılma koşulu
- Dayanıklılık kanıtı

Ana FMEA tablosunda risk kaynağı, senaryo, önleme kontrolü, tespit kontrolü ve kontrol
kanıtı ayrı alanlara dönüştürülmüştür. “Kontrol var” ifadesi artık yeterli değildir;
kontrolün hatayı önleyip önlemediği, yalnızca tespit edip etmediği ve çalıştığının hangi
kanıtla gösterildiği ayrıştırılır. Proses, ürün, tedarikçi, kapasite veya bakım koşulu
değiştiğinde yaşayan FMEA yeniden değerlendirme tetikleyicileri kaydedilir.

#### Sonuç

FMEA geçmiş kayıt deposu değil, değişen koşullar karşısında sistem dayanıklılığını
sorgulayan proaktif bir tasarım ve risk yönetim aracı haline getirilmiştir.

### 29.3 SDCA stabilizasyon kapısı

#### Neden eklendi?

Standart işi bulunmayan, temel insan–makine–malzeme–yöntem koşulları sürekli değişen,
ölçüm sistemi güvenilmez veya prosesi kararsız bir ortamda doğrudan PDCA/DMAIC
başlatmak hatalı baz hattı iyileştirmeye çalışmak anlamına gelir. Proje faaliyeti
başlayabilir; ancak sonuç yeniden üretilemez ve kazanım kalıcı olmaz.

#### Teşhis değişkenleri ve karar

Sisteme `standardWorkEstablished` ve `basicConditionsStable` sinyalleri eklenmiş;
SDCA on dördüncü metodoloji olarak karar motoruna alınmıştır. Stabilizasyon kapısı dört
ön koşulu birlikte değerlendirir:

- Standart işin yerleşik olması
- Temel 4M koşullarının düzenli sağlanması
- Ölçüm sisteminin güvenilir olması
- Proses kararlılığının doğrulanması

Kapı üç sonuç üretir:

- `READY`: İyileştirme için baz hat hazırdır.
- `STABILIZE_FIRST`: En az bir açık engel vardır; önce SDCA gerekir.
- `UNKNOWN`: Olumsuz kanıt yoktur fakat hazır demek için bilgi eksiktir.

#### SDCA çalışma alanı

Beş aşamalı playbook; stabilizasyon ihtiyacını değerlendirme, mevcut en iyi yöntemi
standardize etme, vardiyalarda uygulama ve yetkinliği doğrulama, standart uyumu ile
proses kararlılığını ölçme ve çalışan baz hattı sabitleme adımlarını içerir.

Bu yapı PDCA ve DMAIC’i değersizleştirmez. Tam tersine bu yöntemlerin güvenilir bir
başlangıç koşulunda kullanılmasını sağlar.

### 29.4 Gerçek sistem dokümanları, containment ve Lessons Learned kapıları

#### Gerçek sistem dokümanları

“Kontrol planı güncellendi” veya “talimat revize edildi” gibi doğrulanamayan serbest
notlar yerine aşağıdaki çıktılar sürümlü nesnelere dönüştürülmüştür:

- Standart İş
- Control Plan
- PFMEA ve DFMEA
- Bakım planı
- Kontrol talimatı
- OPL
- Eğitim/yetkinlik kaydı

Her nesne; doküman türü, ad/numara, revizyon, taslak–inceleme–onay–eski revizyon
durumu, sahip, onaylayan, yürürlük tarihi, değişiklik özeti, vaka bağlantısı ve kanıt
bağlarını taşır. Böylece sistem, bir öğrenmenin gerçekten işletim sistemine girip
girmediğini denetleyebilir.

#### Containment yaşam döngüsü

Geçici kontroller kalıcı çözümmüş gibi unutulmasın diye containment ayrı bir yaşam
döngüsüne alınmıştır. Amaç, stok/müşteri/proses kapsamı, başlangıç, sorumlu, etkinlik
metriği, güncel sonuç, maliyet veya iş yükü, kaldırma kriteri, kaldırma onayı, kalıcı
aksiyon bağlantısı ve kanıtlar birlikte tutulur.

Durumlar `ACTIVE`, `VERIFYING`, `REMOVED` ve `TRANSFERRED` olarak yönetilir. Aktif veya
etkinliği doğrulanan bir geçici kontrol kaldırılmadan ya da kalıcı kontrole gerekçeli
biçimde devredilmeden çalışma kapanamaz. Böylece yüzde yüz ayıklama, ek operatör veya
geçici ölçüm gibi maliyetli kontrollerin görünmez kalıcılaşması önlenir.

#### Lessons Learned sistem güncelleme kapısı

Kapanışta öğrenimin serbest metin olarak yazılması yeterli değildir. Sistem iki kabul
edilebilir karar tanır:

1. Öğrenim en az bir onaylı sistem dokümanına bağlanmıştır.
2. Güncelleme gerekmiyorsa gerekçe ve onaylayan kişi kaydedilmiştir.

Bu iki koşuldan biri sağlanmadığında “öğrendik” denilerek vaka kapatılamaz. Kapanış
kapısı toplamda metodoloji, kanıt, aksiyon etkinliği, izleme, onay, kırmızı takım,
yatay yayılım, containment ve sistem öğrenimini birlikte değerlendirir.

### 29.5 Faz 2 — Proaktif operasyon katmanı

#### Zayıf sinyal ve erken uyarı merkezi

Platform artık yalnız gerçekleşmiş problemlerle başlamaz. İnsan gözlemi, proses
ölçümü, mikro duruş, geçici müdahale, yeniden ölçüm, ayıklama, WIP, program değişimi,
fazla mesai, bakım ertelemesi ve psikolojik güvenlik sinyalleri kaydedilebilir.

Sinyal akışı kontrollüdür:

`NEW → TRIAGED → VERIFYING → DISMISSED / WATCHING / CASE_OPENED`

Yeni bir sinyal doğrudan reddedilemez; önce triyaj gerekir. Sezgi kök neden olarak
değil, araştırma hipotezi ve doğrulama görevi olarak tutulur. Sorumlu ve doğrulama
işi tanımlanan sinyal tek tıkla bağlı PDCA/A3 problem vakasına yükseltilebilir.

#### Katmanlı günlük yönetim

Tier 1 hat/vardiya, Tier 2 bölüm ve Tier 3 fabrika seviyeleri için SQDCP kayıtları
oluşturulmuştur. Güvenlik, kalite, teslimat, maliyet ve insan göstergelerinin yanında
dünkü sapma, bugünkü risk, aksiyon sahibi, Gemba görevi, vardiya devri ve üst katmana
veya problem vakasına eskalasyon bilgisi saklanır.

Bu modül günlük toplantıyı ayrı bir sunum faaliyeti olmaktan çıkarıp problem çözme
sistemiyle bağlar.

#### Hafif Kaizen deney panosu

Küçük iyileştirme fikirleri; fikir, risk inceleme, deney, ölçüm, standardizasyon,
Yokoten veya ağır yönteme yükseltme durumlarından geçer. Her deneyde hipotez, metrik,
önceki değer, sonuç, standart doküman bağlantısı ve yayılım kapsamı tutulur. Yüksek
riskli fikirler basit Kaizen olarak yürütülmez; FMEA, DMAIC veya PDCA/A3’e yükseltilir.

#### Dijital OPL ve yetkinlik akademisi

Temel bilgi, iyileştirme ve güvenlik OPL türleri desteklenir. Tek öğrenme hedefi,
doğru/yanlış görsel bağlantıları, net limit, mikro video/QR, istasyon, revizyon,
gözden geçirme tarihi, doküman bağlantıları, mikro sınav ve katılımcı tutulur. Hedef,
limit, soru, doğru cevap ve katılımcı bulunmadan yetkinlik sonucu verilemez.

#### Kontrol yükü ve kaynakta kalite

Her kontrol noktası için önleme/tespit/ayıklama türü, sıklık, maliyet, kaçış riski,
yanlış kabul/ret, geçici durum, önleyici alternatif ve kaldırma kriteri izlenir. Ek
kontrol eklenirken “neden kaynakta önleyemiyoruz?” sorusunun cevaplanması beklenir.
Dashboard aktif geçici kontrolleri ve kaynakta önleme sorusu eksik kayıtları görünür
kılar.

### 29.6 Faz 3 — Organizasyon ve bağlam zekâsı

#### Bağlam sözleşmesi

Her çalışma için amaç, kapsam, kapsam dışı, başarı ölçütü, yöntemin rolü, bırakma veya
yöntem değiştirme koşulu, yanlış kullanım riski, istenmeyen davranış, sahip ve
onaylayan kaydedilir. Sözleşme tamlık sayacı, ekibin kapsam ve başarı tanımı üzerinde
anlaşmadan analize başlamasını görünür hale getirir.

#### Organizasyonel sistem ve zihinsel model analizi

Gözlenen davranış; davranışa izin veren sistem koşulu, yönetim varsayımı, yerel KPI,
teşvik çatışması, gecikmeli etki, geri besleme döngüsü ve sistem müdahalesi hipotezi
ile ilişkilendirilir. “Operatör dikkatsiz”, “insan hatası” veya “disiplinsiz” gibi
çıplak kişi suçlayan ifadeler, sistem koşulu açıklanmadan girildiğinde arayüz uyarı
verir. Amaç sorumluluğu ortadan kaldırmak değil, davranışı yeniden üreten sistemi
görünür kılmaktır.

#### QMS sağlık taraması

Kalite kaynak kapasitesi, üretim baskısı, standart kapsamı, veri güvenilirliği, kalite
maliyeti, tekrar oranı, CAPA yükü ve yönetim öncelik uyumu 1–5 arasında değerlendirilir.
Her boyut saha gözlemi, kanıt, sahip ve iyileştirme aksiyonu taşır. Ortalama sonuç
`CRITICAL`, `FRAGILE` veya `HEALTHY` olarak sınıflandırılır; kritik QMS çalışmaları
dashboard’da yönetim riski olarak gösterilir.

#### Gemba süreç davranışı haritası

Beklenen standart ile gerçek davranış aynı satırda karşılaştırılır. İnsan karar
noktası, tekrarlanan soru, arama/hareket, hata fırsatı, telafi davranışı, fiziksel
kısıt ve Poka-Yoke fikri kaydedilir. Böylece görünmeyen “işi yürütme hileleri” ve
operatörün sistemi ayakta tutmak için yaptığı telafiler iyileştirme girdisine dönüşür.

### 29.7 Faz 4 — Operasyonel karar laboratuvarları

#### Benchmarking ve referans seçimi

İç, rakip, fonksiyonel ve genel referanslar desteklenir. Yerel ve referans değerleri
kendi ölçeklerine bölünerek normalize edilir; ham büyüklüklerin yanıltıcı kıyas
üretmesi engellenir. Kıyaslanan yetkinlik, uygulama farkı, bağlama uyarlama ve kör
kopyalama riski zorunlu düşünme alanlarıdır.

#### Kapasite ve büyüme laboratuvarı

Talep, kullanılabilir dakika, darboğaz çevrim süresi, verim, ürün karması, stok,
kanal katkısı ve yatırım aynı senaryoda değerlendirilir. Motor teorik kapasiteyi,
verim ve karma etkili throughput’u, talep açığını/fazlasını, kullanım oranını ve
tahmini katkıyı hesaplar. Yönetim farklı yatırım ve büyüme varsayımlarını mevcut
senaryoyu bozmadan yan yana deneyebilir.

#### S&OP toplam üretim planlama

Talebin alt, beklenen ve üst sınırı; normal kapasite, fazla mesai, taşeron, açılış
stoku, hizmet hedefi ve birim maliyetlerle birlikte modellenir. Chase, level ve
hybrid stratejilerinde toplam arz, backlog, kapanış stoku, hizmet seviyesi ve maliyet
hesaplanır. Yalnız beklenen talebi karşılayan fakat üst güven sınırında çöken planlar
“hedefi karşıladı” sayılmaz.

#### Hat dengeleme ve iş tasarımı simülatörü

Talep ve kullanılabilir süreden takt hesaplanır. Operasyon süreleri istasyonlara
toplanarak darboğaz yük, kapasite, denge verimi, denge kaybı ve taktı aşan istasyonlar
bulunur. Hat, hücresel üretim ve tam montaj modelleri; beceri, ergonomi, monotonluk
ve kalite sahipliğiyle birlikte değerlendirilebilir. Böylece yalnız saniye toplamına
dayalı, insan ve kalite riskini görmeyen dengeleme önlenir.

### 29.8 Faz 5 — Gelişmiş destekleyici analiz yöntemleri

Bu araçlar on beşinci veya daha fazla ana metodoloji olarak teşhis motoruna
eklenmemiştir. Her biri ana yöntemin içindeki belirli bir karar noktasında çağrılan
destek modülüdür. Ortak sözleşmeleri; somut karar noktası, hipotez/soru, yönteme özel
yapılandırılmış veri, saha kanıtı, sonuç, durum ve sonraki adımdır. Kanıt ve sonuç
olmadan `COMPLETED` durumuna geçemezler.

| Destek modülü | Sistem içindeki karar görevi |
|---|---|
| MSA | Ölçüm varyasyonunu proses varyasyonundan ayırır; tekrar edilebilirlik payını kabul sınırıyla karşılaştırır. |
| DOE | İki seviyeli kontrollü deneylerde faktörlerin ana etkilerini hesaplar. |
| Fault Tree Analysis | Tepe olayı AND/OR mantığıyla alt olaylara ayırır ve olay olasılığını hesaplar. |
| Bowtie | Önleyici ve azaltıcı bariyerleri etkili, zayıf veya eksik olarak değerlendirir. |
| RCM | Arıza modu risk puanını bakım görevi ve periyot kararıyla ilişkilendirir. |
| TRIZ | Teknik çelişkiyi ideal nihai sonuç, prensip, çözüm kavramı ve deney haline getirir. |
| Toyota Kata | Mevcut durumdan hedef koşula kısa deney ve öğrenme çevrimleriyle ilerler. |
| Nedensel döngü | Pozitif/negatif bağları, gecikmeleri ve sistem sınırını görünür kılar. |

### 29.9 Ortak kalıcılık, raporlama ve geriye dönük uyumluluk

Faz 1–5 ile eklenen bütün nesneler mevcut workspace aggregate’ında kalıcıdır. API
güncelleme sözleşmesi yeni koleksiyonları kabul eder; bellek içi ve Prisma/PostgreSQL
repository yolları aynı domain modelini kullanır. Eski JSON kayıtları açılırken eksik
koleksiyonlar boş liste, eksik tekil sözleşmeler güvenli varsayılanlarla tamamlanır.
Bu yaklaşım, yeni modül eklendiğinde eski vakaların arayüzde `undefined` alan hatasıyla
çökmesini engeller.

Profesyonel çalışma raporu artık metodoloji adımlarının yanında aşağıdaki özetleri de
üretebilir:

- Stabilizasyon ve yöntem bileşimi
- Sürümlü sistem dokümanları
- Containment yaşam döngüsü
- Lessons Learned sistem kararı
- Proaktif operasyon kayıtları
- Organizasyon ve bağlam sağlığı
- Karar laboratuvarı senaryoları
- Gelişmiş destek analizleri ve yöntem özel uyarıları

Dashboard; yalnız toplam çalışma sayısını değil açık zayıf sinyal, aktif Kaizen,
yetkinlik bekleyen OPL, geçici kontrol, hazır bağlam sözleşmesi, kritik QMS, Gemba
fırsatı, kapasite açığı, S&OP hedef sapması, aşırı yüklü hat ve inceleme bekleyen ileri
analiz sayılarını da gösterir.

### 29.10 Güncel kalite güvencesi

Son doğrulama paketi 20 test dosyasında 137 otomatik testi kapsamaktadır. Testler;
teşhis ve soru motoruna ek olarak SDCA kapısını, yöntem bileşimini, FMEA gelecek
senaryolarını, sistem dokümanı/containment/öğrenim kalıcılığını, proaktif operasyon
kurallarını, organizasyon sağlık hesaplarını, karar laboratuvarlarını ve ileri analiz
motorlarını korur. TypeScript denetimi ve Next.js 16.2.10 Turbopack üretim derlemesi
başarıyla tamamlanmıştır.

Bu sayı yalnız test adedini ifade eder; esas güvence, yeni iş kurallarının golden-case
senaryolarına dönüştürülmüş olması ve eski kayıt uyumluluğunun regresyon altında
tutulmasıdır.

---

## Ek A — Ana ekran ve işlevler

| Ekran | İşlev |
|---|---|
| `/` | Ürün tanıtımı ve başlangıç |
| `/diagnoz` | Problem girişi, adaptif teşhis ve öneri |
| `/calismalar` | Devam eden/tamamlanan çalışma alanları |
| `/dashboard` | Kapanış ve doğrulama risk panosu |
| `/workspace/{id}` | Metodoloji uygulama; proaktif operasyon, organizasyon/bağlam, karar laboratuvarları, ileri analizler, kanıt, aksiyon ve kapanış |
| `/workspace/{id}/rapor` | Yazdırılabilir profesyonel rapor |
| `/giris` | Opsiyonel parola korumalı erişim |

## Ek B — Ana yaşam döngüleri

**Teşhis:**  
`Problem → Parse → Kural Motoru → Adaptif Soru → Öneri → Decision Trace`

**İddia:**  
`Hipotez → Kanıt Toplama → Doğrulandı / Reddedildi`

**Aksiyon:**  
`Açık → Devam → Uygulandı → Etkinlik Bekliyor → Etkili / Etkisiz → Tamam`

**Çalışma kapanışı:**  
`Açık → Kapanış Adayı → İzleme → Kapalı / Yeniden Açıldı`

**Kurumsal öğrenim:**  
`Doğrulanmış Neden → Etkili Önlem → Standardizasyon → Yatay Yayılım → Öğrenim Kaydı → Benzer Vaka Kullanımı`

**Stabilizasyon:**  
`Hazırlık Değerlendirmesi → Standardize → Uygula/Yetkinlik → Kararlılığı Kontrol Et → Baz Hattı Sabitle → PDCA/DMAIC`

**Zayıf sinyal:**  
`Yeni → Triyaj → Doğrulama → Reddet / İzle / Problem Vakası Aç`

**Hafif Kaizen:**  
`Fikir → Risk Kontrolü → Deney → Ölçüm → Standardizasyon → Yokoten / Ağır Yönteme Yükseltme`

**Containment:**  
`Aktif → Etkinlik Doğrulaması → Kaldırıldı / Kalıcı Kontrole Devredildi`

**Sistem dokümanı:**  
`Taslak → İnceleme → Onaylı/Yürürlükte → Eski Revizyon`

**İleri destek analizi:**  
`Taslak → Devam Ediyor → İnceleme → Kanıtlı Sonuç → Tamamlandı`

---

## Ek C — Üretime Hazırlık ve Operasyonel Dayanıklılık

Sistemin yalnızca fonksiyon üreten bir prototip olarak kalmaması için üretime hazırlık paketi tamamlanmıştır. API yazma uçları sıkı ve merkezi Zod şemasıyla doğrulanır; böylece bozuk durum değerleri, beklenmeyen üst alanlar ve eksik kritik yapılar kalıcı veriye ulaşmadan reddedilir. İçe aktarma aynı doğrulama omurgasını kullandığından, taşınan bir paketin normal kullanıcı güncellemesinden daha ayrıcalıklı davranması engellenmiştir.

Uzman kalibrasyon döngüsü, teşhis motorunun önerdiği yöntem ile uzmanın fiilen seçtiği yöntemi ve sahadaki gerçek sonucu ayrı alanlarda tutar. Bunun nedeni “öneri kabul edildi” bilgisinin “öneri başarılı oldu” anlamına gelmemesidir. Kabul, ret, uzman değişikliği, başarılı, kısmi ve başarısız sonuç metrikleri panoda toplulaştırılır. Böylece ileride soru ağırlıkları ve yöntem eşikleri varsayımla değil, gerçek pilot verisiyle ayarlanabilir.

Merkezi görev alanı; aksiyonları, containment kontrollerini, zayıf sinyalleri, QMS iyileştirmelerini, OPL yetkinlik kontrollerini ve izleme planlarını tek termin görünümünde birleştirir. İşler geciken, yaklaşan, açık ve tamam durumlarına ayrılır; her kayıt ilgili çalışmanın doğru sekmesine derin bağlantı verir. Bu yapı, farklı metodoloji ekranlarında saklı kalan yükümlülüklerin gözden kaçmasını önler.

Taşınabilirlik katmanında çalışma paketleri sürümlü JSON olarak dışa ve yeni kayıt olarak içe aktarılır. Orijinal kimliklerin ve sunucu tarafından yönetilen meta verilerin taşınmaması, kaynak kaydın yanlışlıkla ezilmesini önler. CSV çıktısı ise aksiyon, containment ve zayıf sinyal listesini denetim/toplantı kullanımına açar.

Operasyonel süreklilik için `/api/health` sağlık ucu, PostgreSQL yedekleme ve geri yükleme betikleri ile olay müdahalesi, geri dönüş ve üretim kontrol listesini içeren `OPERASYON_RUNBOOK.md` oluşturulmuştur. Kritik kullanıcı yolları Playwright tarayıcı testleriyle; alan kuralları Vitest ile; derlenebilirlik TypeScript ve Next.js production build ile doğrulanmaktadır.

Bu pakette kullanıcı/rol/yetki modeli ve aktör bazlı ayrıntılı denetim izi bilinçli biçimde uygulanmamıştır. Yönetim kararı doğrultusunda ikisi de ileride kurulacak admin paneliyle beraber tasarlanacaktır. Güncel teknik sonuç ve işletim notları `URETIME_HAZIRLIK_PAKETI.md` dosyasında tutulur.
## 31. Saha geçerliliği, kalibrasyon ve entegrasyon paketi

### 31.1 Ürün iddiasının sınırı

Sistem teknik ve kontrollü senaryolarla uçtan uca doğrulanmıştır; gerçek üretim hattında gerçek kullanıcılarla tamamlanmış vaka bulunmadan “sahada kanıtlandı” iddiası kullanılmaz. Doğru ifade “uçtan uca çalışacak şekilde tasarlandı ve senaryo tabanlı doğrulandı”dır. Saha Pilot Protokolü; tesis, hat, katılımcı, önce/sonra çevrim süresi, tekrar oranı, izleme günü, çift veri girişi, kullanıcı sürtünmesi ve atlatma yollarını kaydeder. Gerçek kullanıcı bulunmadan bu alanlar sentetik veriyle başarılı gösterilmez.

### 31.2 Öneri destek seviyesi

Softmax çıktısı istatistiksel başarı olasılığı değildir. Arayüzde “güven yüzdesi” yerine zayıf, sınırlı, orta, güçlü ve çok güçlü öneri destek seviyesi kullanılır. Açıklama, değerin yalnız girilen yanıtların sürümlü kural tabanıyla göreli uyumunu gösterdiğini ve saha sonuçlarıyla henüz kalibre edilmediğini belirtir. Kalibrasyon için motor önerisi, uzman seçimi, kabul/ret gerekçesi, gerçek sonuç ve tekrar ayrı tutulur.

### 31.3 Gerçek dünya yöntem bağlamı

Teknik yöntem önerisi; müşteri/OEM zorunluluğu, standart veya regülasyon şartı, zorunlu çıktı formatı, mevcut CAPA kaydı, ekip yetkinliği, kolaylaştırıcı erişimi, containment süresi, çözüm süresi, kişi kapasitesi, yönetim beklentisi ve kaynak kısıtından ayrıştırılır. Böylece örneğin teknik RCA analizi ile müşterinin zorunlu 8D formatı birlikte yürütülebilir; sistem tek bir “doğru” yöntemi organizasyona dayatmaz.

### 31.4 Atlatma ve veri kalitesi denetimi

Form doluluğu kapanış için yeterli değildir. Kanıtsız doğrulanmış kritik iddia, sahibi olmayan ilerletilmiş aksiyon ve başarı metriği/gerçek sonucu bulunmayan “etkili” aksiyon engelleyici bulgudur. Çok kısa aksiyon, tekrarlanan iddia metni ve tamamlanmamış saha pilotu ayrıca uyarılır. Engelleyici bulgular kapanış omurgasına dahil edilmiştir.

### 31.5 Kurumsal entegrasyon omurgası

Her vaka SAP QM, SAP PM, MES, QMS/CAPA, ERP, veri ambarı veya başka bir dış kayda bağlanabilir. Dış kayıt numarası, kaynak bağlantısı, ana veri sahipliği, senkronizasyon durumu, son senkronizasyon ve not tutulur. Bu sürüm gerçek kurumsal uç noktalar bilinmeden sahte bir SAP bağlantısı kurmaz; fakat REST/webhook adaptörlerine temel olacak veri sözleşmesini ve “tek doğru veri kaynağı” kararını hazırlar.

### 31.6 Yönetim görünürlüğü

Admin paneli yürüyen/tamamlanan pilotları, gerçek sonuçla doğrulanan vakaları, entegrasyon bağlantılarını, senkronizasyon hatalarını ve kapanışı durduran veri kalitesi bulgularını portföy seviyesinde gösterir. Böylece yönetim yazılımın yalnız kullanımını değil, saha geçerliliğini ve veri disiplinini izler.
