# MDI Canlıya Çıkış ve Misafir Kullanım Planı

## 1. Amaç

LinkedIn veya başka bir bağlantı üzerinden gelen üretim ve kalite profesyoneli,
hesap açmadan sistemi anlayabilmeli ve gerçek bir teşhis çalışması
başlatabilmelidir. Kullanıcı üyelik kararı verene kadar çalışmaları yalnızca
kullandığı tarayıcıda saklanmalı; üyelik sonrasında ise açık izniyle bulut
hesabına aktarılmalıdır.

Bu plan aynı zamanda ilk kullanıcı incelemesinde görülen form, mobil kullanım,
terminoloji, sonuç yoğunluğu ve uygulama alanı gezinme sorunlarını giderir.

## 2. Temel ürün ilkeleri

1. **Önce değer, sonra üyelik:** Kullanıcı ürünü denemeden hesap açmaya
   zorlanmaz.
2. **Sessiz değil, açık yerel kayıt:** Sistem yerel kaydı açıkça anlatır; veri
   kaybı ihtimalini saklamaz.
3. **Kullanıcı izni olmadan buluta taşıma yok:** Üyelik açılması tek başına
   aktarımı başlatmaz. Kullanıcı hangi çalışmaların aktarılacağını seçer.
4. **Karar motoru kullanıcıyı yönlendirir, hüküm vermez:** Sonuç dili kesinlik
   değil kanıt düzeyi ifade eder.
5. **İç teknik metrikler varsayılan arayüzde gösterilmez:** Teknik ayrıntılar
   gerektiğinde açılan gelişmiş görünümde bulunur.
6. **Mobil birincil senaryodur:** LinkedIn trafiği nedeniyle tüm ana akışlar
   390 px ekran genişliğinde kullanılabilir olmalıdır.
7. **Her aşamada tek açık sonraki iş:** Kullanıcı ekrana baktığında ne yapması
   gerektiğini anlayabilmelidir.

## 3. Hedef ilk kullanıcı yolculuğu

### 3.1 Ziyaretçi

1. Kullanıcı herkese açık tanıtım sayfasına gelir.
2. Sağ üstte yalnızca `Giriş yap` ve `Üye ol` seçeneklerini görür.
3. Sayfada ürünün ne çözdüğünü, kimler için olduğunu ve kısa bir örnek sonucu
   görür.
4. `Üye olmadan dene` düğmesiyle teşhise başlar.
5. İlk veri girişinden önce yerel kayıt bildirimi gösterilir.
6. Problem, yanıtlar, teşhis sonucu ve çalışma alanı tarayıcıda otomatik
   kaydedilir.
7. Kullanıcı dilediği kadar misafir çalışma oluşturabilir; makul bir kapasite
   sınırına yaklaşınca bilgilendirilir.

### 3.2 Üyeliğe geçiş

1. Kullanıcı istediği zaman `Çalışmalarımı buluta taşı` veya `Üye ol` seçeneğine
   basar.
2. Bireysel ya da şirket hesabını seçer ve üyeliğini doğrular.
3. Sistem tarayıcıdaki yerel çalışmaları listeler.
4. Kullanıcı aktarılacak kayıtları ve hedefi seçer:
   - bireysel hesap,
   - yetkisi varsa şirket çalışma alanı.
5. Sistem kayıtları doğrular, yeni sunucu kimlikleri üretir ve aktarır.
6. Aktarım sonucu kayıt bazında gösterilir: aktarıldı, zaten mevcut, hatalı veya
   kullanıcı tarafından atlandı.
7. Başarılı aktarım doğrulandıktan sonra kullanıcıya yerel kopyayı tutma veya
   kaldırma seçeneği sunulur. Varsayılan davranış yerel kopyayı hemen silmemektir.

## 4. Misafir veri mimarisi

### 4.1 Saklama teknolojisi

Misafir çalışma verileri `localStorage` yerine **IndexedDB** üzerinde
saklanacaktır. `localStorage` senkron çalışır, yaklaşık kapasitesi düşüktür ve
ek/kanıt dosyaları için uygun değildir.

Yerel depo aşağıdaki kayıtları kapsar:

- problem tanımı ve teşhis oturumu,
- soru ve cevaplar,
- teşhis sonucu ve açıklamaları,
- metodoloji çalışma alanı,
- aksiyonlar, iddialar, kanıtlar ve kapanış bilgileri,
- kullanıcı tercihleri ve ilk kullanım rehberi durumu,
- desteklenen boyutlarda yerel ek dosyaları,
- şema sürümü, oluşturulma ve son güncellenme zamanı,
- bulut aktarım durumu ve aktarım parmak izi.

### 4.2 Yerel veri servis katmanı

Arayüz doğrudan IndexedDB çağırmamalıdır. Ortak bir istemci veri kapısı
oluşturulacaktır:

- `GuestDiagnosisRepository`
- `GuestWorkspaceRepository`
- `GuestAttachmentRepository`
- `GuestMigrationService`

Bu katman şunları sağlamalıdır:

- şema sürümleme ve geriye uyumlu yükseltme,
- atomik kayıt,
- bozuk/yarım kayda karşı kurtarma,
- kayıt başına güncelleme zamanı,
- kota ve kapasite hatalarının anlaşılır karşılığı,
- JSON yedek alma ve geri yükleme,
- testlerde bellek içi taklit depo kullanımı.

### 4.3 Gizlilik sınırı

Arayüzde “verileriniz hiçbir zaman sunucuya gitmez” denmeyecektir; teşhis
hesaplaması veya isteğe bağlı yapay zekâ açıklaması sunucuda çalışıyorsa bu ifade
yanlış olur.

Doğru bilgilendirme:

> Çalışmanız bu tarayıcıda saklanır ve hesabınız olmadan diğer cihazlarla
> eşitlenmez. Teşhis için gönderdiğiniz içerik sonuç üretmek amacıyla işlenebilir;
> misafir çalışması olarak hesabınıza kaydedilmez.

Sunucu tarafındaki anonim teşhis uçları:

- oturum veya çalışma kaydı oluşturmamalı,
- problem metnini uygulama loglarına yazmamalı,
- kısa süreli işlem dışında içerik tutmamalı,
- hız sınırı ve kötüye kullanım koruması uygulamalı,
- yalnız gerekli alanları kabul etmeli,
- hata cevaplarında içerik veya iç sistem ayrıntısı sızdırmamalıdır.

Mümkün olan deterministik hesaplamalar istemcide çalıştırılacak; sunucu veya AI
gerektiren özellikler ayrıca işaretlenecektir.

### 4.4 Veri kaybı ve kapasite davranışı

Misafir kullanıcıya sürekli kırmızı uyarı göstermek yerine sakin bir durum bandı
gösterilir:

> Bu çalışma bu tarayıcıda otomatik kaydediliyor.

Bandın ayrıntısında:

- tarayıcı verileri temizlenirse kayıtların silinebileceği,
- gizli/özel sekmenin uygun olmadığı,
- başka cihazda görünmeyeceği,
- üyelik veya JSON yedeğiyle korunabileceği,
- son başarılı kayıt zamanı

yer alır.

Tarayıcı destekliyorsa `navigator.storage.persist()` talep edilir. Kota
yaklaşınca kullanıcıya ekleri küçültme, JSON yedeği alma veya buluta taşıma
önerilir. Kayıt başarısız olduğunda arayüz “Kaydedildi” göstermemelidir.

## 5. Anonimden buluta güvenli aktarım

### 5.1 Aktarım kuralları

- Yerel kayıt güvenilmez istemci girdisi kabul edilir.
- Bütün kayıtlar sunucu şemasıyla yeniden doğrulanır.
- İstemciden gelen sahiplik, kullanıcı veya şirket kimlikleri dikkate alınmaz.
- Sunucu her çalışma için yeni kimlik üretir.
- Kullanıcının şirket hedefi seçme yetkisi sunucuda doğrulanır.
- Aktarım tekil ve tekrar çalıştırılabilir olmalıdır.
- Aynı kayıt ikinci kez gönderilirse parmak iziyle çoğaltma önlenir.
- Ek dosyaları tip, boyut ve içerik politikasından geçirilir.
- Kısmi hata diğer başarılı kayıtları belirsiz bırakmamalıdır.
- Aktarım bir denetim olayına kaydedilir; problem metni denetim özetine yazılmaz.

### 5.2 Üyelik sonrası deneyim

Üyelik doğrulamasından sonra şu ekran açılır:

> Bu tarayıcıda 3 yerel çalışmanız var. Hesabınıza taşımak ister misiniz?

Her kayıt için problem başlığı, yöntem, ilerleme, son güncelleme ve hedef alan
gösterilir. Kullanıcı seçim yapmadan aktarım başlamaz.

Başarılı aktarım sonrasında bağlantılar yeni bulut çalışma adreslerine
yönlendirilir. Yerel ve bulut kopyasının çakışmaması için yerel kayıt
`aktarılmış` olarak işaretlenir ve salt okunur tutulabilir.

## 6. Herkese açık ilk ekran

Yeni kök sayfa hesap gerektirmeyen bir ürün sayfası olacaktır.

### Zorunlu bölümler

1. Tek cümlelik değer önerisi.
2. `Üye olmadan dene` ana eylemi.
3. `Giriş yap` ve `Üye ol` sağ üst eylemleri.
4. Üç adımda çalışma biçimi:
   - problemi anlat,
   - yönlendirici soruları cevapla,
   - öneriyi uygulama ve doğrulamaya taşı.
5. Problem türü örnekleri:
   - müşteri şikâyeti,
   - kronik hata veya duruş,
   - özel nedenli sapma,
   - yeni proses/FMEA riski,
   - kapasite veya yatırım kararı.
6. Örnek metodoloji önerisi ve gerekçe özeti.
7. Kimler için olduğu.
8. Veri saklama ve karar desteği hakkında kısa güven bölümü.
9. Geri bildirim/iletişim bağlantısı.
10. Ürünün sürüm veya beta durumu.

### Üst menü durumları

**Misafir:** Ürün adı, Nasıl çalışır, Örnek vaka, Giriş yap, Üye ol.

**Yerel çalışma yapan misafir:** Çalışmalarım, Yeni teşhis, Yerel kayıt durumu,
Giriş yap, Üye ol.

**Üye:** Pano, Görevler, Çalışmalar, Yeni teşhis, hesap menüsü.

`Aktarım`, `JSON` ve `CSV` birincil gezinmeden çıkarılıp ilgili ikincil menülere
taşınacaktır.

## 7. Giriş, kayıt ve mobil arayüz düzeltmeleri

1. Form etiketi ile yer tutucu metinlerinin üst üste binmesi düzeltilecek.
2. Kayıt/giriş sayfaları uygulama içi menüden ayrılacak.
3. Form hata metinleri ilgili alanın altında gösterilecek.
4. Parola kuralları kullanıcı yazarken anlaşılır biçimde belirtilecek.
5. Mobilde sıkıştırılmış masaüstü navigasyonu yerine açılır menü kullanılacak.
6. Tüm ana eylemler en az 44 px dokunma alanına sahip olacak.
7. 320, 390, 768, 1024 ve 1440 px genişlikleri görsel olarak test edilecek.
8. Klavye, odak sırası, ekran okuyucu etiketi ve renk kontrastı kontrol edilecek.

## 8. İlk kullanım ve pano

Misafir için ayrı bir `Yerel çalışmalarım` ekranı oluşturulacaktır. Bu ekran:

- son çalışmaları,
- devam edilmesi gereken işi,
- son kayıt zamanını,
- yerel yedek alma seçeneğini,
- isteğe bağlı üyelik/bulut aktarımını

gösterecektir.

Boş ekranda ürün akışı anlatılacak:

> Problemi tanımla → Soruları cevapla → Öneriyi incele → Uygula → Kanıtla →
> Kapat

`Yeni çalışma başlat` ve `İlk teşhisi başlat` gibi yinelenen eylemler tek bir ana
eylemde birleştirilecektir.

## 9. Teşhis başlangıcı ve soru deneyimi

1. Problem örnekleri kesilmiş etiketler yerine okunabilir kartlar olacaktır.
2. Örnekler role/problem türüne göre gruplanacaktır.
3. Otomatik kayıt durumu görünür olacaktır.
4. Soru sırasında metodoloji yüzdeleri varsayılan olarak gösterilmeyecektir.
5. `bit`, `4/3`, `7/4`, “nitelik yüzdesi” gibi iç motor göstergeleri kullanıcı
   görünümünden kaldırılacaktır.
6. Bunların yerine şu durumlar gösterilecektir:
   - değerlendirme sürüyor,
   - problem tipi henüz net değil,
   - birkaç yaklaşım birbirine yakın,
   - doğrulayıcı bilgi gerekiyor.
7. Kullanıcı önceki soruya dönebilecek ve cevabını değiştirebilecektir.
8. `Bilmiyorum` cevabı olumsuz cevap olarak yorumlanmayacak; eksik kanıt olarak
   ele alınacaktır.
9. Sorunun neden sorulduğu kısa ve sade bir açıklamayla açılabilir olacaktır.

## 10. Sonuç ekranı

İlk görünüm yalnız şu bilgileri içerecektir:

1. Önerilen yaklaşım ve tek cümlelik açıklaması.
2. Önerinin üç temel gerekçesi.
3. Kanıt düzeyi: ilk yönlendirme, güçlenen aday, iyi desteklenen öneri veya
   doğrulama bekleyen öneri.
4. Eksik kritik bilgiler.
5. Sonraki en doğru eylem.

Aşağıdaki ayrıntılar kapalı ve isteğe bağlı bölümlerde tutulacaktır:

- diğer yaklaşımlar neden öncelikli değil,
- kararı hangi cevapların değiştireceği,
- destekleyici yöntemler,
- kurumsal zorunluluk ile teknik öneri farkı,
- gelişmiş puan ve sinyal ayrıntıları.

Dil değişiklikleri:

- “uygun değil” yerine “mevcut kanıta göre birincil yaklaşım değil”,
- “güçlü sonuç” yerine kanıt düzeyi,
- “Rapor oluştur” yerine “Teşhis özetini oluştur”,
- yüzdeler olasılık değilse yüzde işareti kullanılmaması.

Kullanıcı `Bu öneri problemime uyuyor / uymuyor / emin değilim` geri bildirimi
verebilecektir.

## 11. Çalışma alanı

### Gezinme

Mevcut uzun sekme dizisi şu üst gruplara indirilecektir:

1. **Uygula:** Genel bakış, metodoloji adımları, aksiyonlar.
2. **Takip et:** Proaktif operasyon, organizasyon ve saha.
3. **Doğrula:** Kanıtlar, etkinlik, kapanış ve onaylar.
4. **Öğren:** Yatay yayılım, kurumsal öğrenme.
5. **Diğer:** Karar laboratuvarı, ileri analiz, rapor ve geçmiş.

Sekmeler masaüstü ve mobilde taşmamalı; kullanıcının erişemediği gizli sekme
olmamalıdır.

### Yönlendirme

İç metodoloji kodları tek başına kullanılmayacaktır:

- `FRAME adımını ilerlet` yerine `Kararın kapsamını tanımlayın (FRAME)`,
- `MUST` yerine `Zorunlu kriter (MUST)`,
- `WANT` yerine `Tercih kriteri (WANT)`,
- `Containment` yerine `Geçici koruma (containment)`.

Her bölümde:

- bu bölüm ne için var,
- ne zaman kullanılmalı,
- buraya ne yazılmalı,
- kısa bir üretim örneği,
- tamamlanma ölçütü

gösterilecektir.

Yeni çalışmada on kapanış kapısının tamamı baskın biçimde gösterilmeyecek.
Kullanıcı önce sıradaki işi görür; kapanış hazırlığı ikincil ve açılabilir olur.

`Kaydedildi` ve `Kaydet` aynı anda belirsiz biçimde görünmeyecek. Durumlar açıkça
ayrılacaktır:

- Kaydediliyor…
- Bu tarayıcıya kaydedildi · 14:32
- Buluta kaydedildi · 14:32
- Kaydetme başarısız · Yeniden dene

## 12. Güven, yardım ve ürün şeffaflığı

Canlı üründe ulaşılabilir kısa sayfalar bulunacaktır:

- Veri ve gizlilik,
- Sistem nasıl öneri üretir?,
- Karar desteğinin sınırları,
- Hesap ve veri silme,
- Sürüm/beta bilgisi,
- Geri bildirim ve hata bildirme,
- Ürünü geliştiren kişi/ekip.

Her metodoloji için kısa, alan içi açıklamalar bulunacak; kullanıcı ayrı bir PDF
okumaya mecbur bırakılmayacaktır.

## 13. Uygulama fazları

### Faz 0 — Ölçüm ve mevcut davranışın sabitlenmesi

- Kritik kullanıcı yollarını otomatik testle kayıt altına al.
- Masaüstü ve mobil ekran görüntüsü tabanı oluştur.
- Misafir, bireysel, şirket üyesi ve yönetici yetki matrisini netleştir.
- Mevcut kayıt/import şemalarını sürümle.

**Kabul:** Değişiklik öncesi ana akışlar tekrarlanabilir testlere sahip.

### Faz 1 — Herkese açık giriş ve anonim teşhis

- Herkese açık tanıtım sayfası.
- Proxy/yönlendirme kurallarında misafir erişimi.
- Misafir üst menüsü.
- Üye olmadan teşhis başlatma.
- Anonim uçlarda kayıtsız/stateless hesaplama.
- Kötüye kullanım ve hız sınırı.

**Kabul:** Çerez veya hesap olmadan kullanıcı sonuç ekranına ulaşabilir; sunucuda
misafir conversation/workspace kaydı oluşmaz.

### Faz 2 — IndexedDB yerel çalışma katmanı

- Sürümlü yerel veri şeması.
- Teşhis ve çalışma depoları.
- Otomatik kayıt, geri yükleme ve hata durumu.
- Yerel çalışmalar ekranı.
- JSON yedekleme/geri yükleme.
- Kota ve kalıcı depolama yönetimi.

**Kabul:** Sayfa yenileme ve tarayıcı yeniden açma sonrasında çalışma kaldığı
yerden devam eder; ağ kesikken mevcut yerel çalışma açılır ve düzenlenebilir.

### Faz 3 — Üyelik ve buluta aktarım

- Yerel çalışma algılama.
- Seçimli aktarım ekranı.
- Güvenli ve tekrar çalıştırılabilir aktarım API'si.
- Bireysel/şirket hedef seçimi ve yetki kontrolü.
- Aktarım raporu ve yerel kopya yönetimi.

**Kabul:** Aynı çalışma iki kez aktarılmaz; başarısız aktarım yerel veriyi
silmez; başka şirkete yetkisiz aktarım yapılamaz.

### Faz 4 — İlk temas, mobil ve erişilebilirlik

- Form çakışmalarının düzeltilmesi.
- Duruma göre üst menü.
- Mobil menü.
- İlk kullanım rehberi ve boş durumlar.
- Dokunma hedefleri, klavye ve ekran okuyucu kontrolleri.

**Kabul:** Ana yollar 320–1440 px arasında yatay taşma olmadan tamamlanabilir;
formlar yalnız klavyeyle kullanılabilir.

### Faz 5 — Teşhis ve sonuç sadeleştirmesi

- Teknik iç metriklerin gizlenmesi.
- Yanıt yanlılığını azaltan soru görünümü.
- Okunabilir örnek vakalar.
- Katmanlı sonuç ekranı ve yeni kanıt dili.
- Sonuç geri bildirimi.

**Kabul:** İlk kez kullanan bir üretim/kalite profesyoneli önerilen yöntemi,
gerekçesini, eksik kanıtı ve sonraki işi yardım almadan açıklayabilir.

### Faz 6 — Çalışma alanı bilgi mimarisi

- Sekme gruplama ve mobil gezinme.
- Türkçe öncelikli terminoloji.
- Alan içi rehberler ve örnekler.
- Kapanış koşullarının aşamalı gösterimi.
- Yerel/bulut kayıt durumunun ayrıştırılması.

**Kabul:** Kullanıcı ilk çalışmada nereden başlayacağını ve her alana ne
yazacağını anlayabilir; hiçbir sekme ekran dışına taşmaz.

### Faz 7 — Güven, saha pilotu ve canlıya çıkış

- Gizlilik ve karar desteği sayfaları.
- Ürün içi geri bildirim.
- Hata izleme ve anonim kullanım metrikleri; içerik değil olay ölçümü.
- Gerçek kullanıcılarla görev bazlı test.
- Kontrollü beta, ardından LinkedIn duyurusu.

**Kabul:** En az bir kalite, bir üretim ve bir yalın/operasyonel mükemmellik
uzmanı aşağıdaki senaryoları tamamlar; kritik kullanılabilirlik engeli kalmaz.

## 14. Test matrisi

### Fonksiyonel

- Misafir teşhis başlatır ve yenilemeden sonra devam eder.
- Ağ kesilirken yerel düzenleme korunur.
- Kayıt kotası dolduğunda doğru uyarı gösterilir.
- Üyelik oluşturulunca seçilen çalışmalar aktarılır.
- Aktarım tekrarlanırsa çoğaltma oluşmaz.
- Şirket üyesi yetkisiz hedefe aktarım yapamaz.
- Yerel şema eski sürümden yeni sürüme yükselir.
- Bozuk yerel kayıt diğer çalışmaların açılmasını engellemez.

### Kullanılabilirlik

- Kullanıcı hesap açmadan ilk teşhisi tamamlar.
- Yerel saklamanın anlamını kendi cümlesiyle açıklayabilir.
- Sonuç ekranında öneri, gerekçe, eksik kanıt ve sonraki işi bulabilir.
- Çalışma alanında ilk metodoloji adımını yardım almadan başlatabilir.
- Buluta aktarımın isteğe bağlı olduğunu anlayabilir.

### Güvenlik ve gizlilik

- Misafir girdisi sunucu kalıcı deposuna yazılmaz.
- Anonim uçlar hız sınırlıdır.
- Problem metni log/telemetriye düşmez.
- Yerel aktarım paketi sunucuda tam doğrulanır.
- Sahiplik alanları istemciden kabul edilmez.
- Ek dosyası tip ve boyut sınırları uygulanır.
- XSS içerikleri yerel kayıt ve bulut aktarımında çalıştırılamaz.

### Gerçek saha senaryoları

- Müşteri şikâyeti ve zorunlu 8D.
- Vardiyalar arasında değişen kronik kaynak hatası.
- Özel nedenli proses sapması.
- Yeni hat/yeni proses için ileriye dönük FMEA riski.
- Kapasite veya yatırım alternatifi kararı.

## 15. Canlıya çıkış kapıları

LinkedIn paylaşımından önce aşağıdakilerin tamamı sağlanmalıdır:

- [x] Üyelik zorunluluğu olmadan deneme çalışıyor.
- [x] Yerel kayıt ve veri kaybı uyarısı doğru ve görünür.
- [x] Kayıt/giriş formunda görsel çakışma yok.
- [x] Mobil üst menü ve çalışma alanı taşmıyor.
- [x] Teknik iç skorlar varsayılan görünümde yok.
- [x] Sonuç ekranı kısa özetle açılıyor.
- [x] Üyelik sonrası aktarım veri kaybetmeden çalışıyor.
- [x] Gizlilik ve karar desteği sınırları yayınlanmış.
- [ ] Gerçek kullanıcılarla en az üç görev testi yapılmış.
- [x] Kritik ve yüksek öncelikli teknik hata açık değil. Önceki denetimde bulunan
  FMEA ayrıştırma ve yöntem-özel kanıt eşiği sorunları §17–§25 paketleriyle giderildi;
  otomatik kalite kapıları yeniden başarıyla çalıştırıldı.

## 16. Başarı ölçütleri

İçerik kaydetmeden yalnız olay bazında şu göstergeler izlenebilir:

- tanıtım sayfasından denemeye başlama oranı,
- ilk problem girişini tamamlama oranı,
- teşhis sorularını tamamlama oranı,
- sonuçtan çalışma alanına geçiş oranı,
- yerel çalışmaya ertesi gün dönüş oranı,
- üyelik ve buluta aktarım oranı,
- teşhis önerisi faydalı/faydasız geri bildirimi,
- ilk metodoloji adımını tamamlama süresi,
- mobil ve masaüstü terk noktaları.

Bu ölçütler kullanıcı problem metni, cevap içeriği veya şirket verisi toplanmadan
hesaplanmalıdır.

---

## 17. Altı Vakalık Son Kullanıcı Denetimi — Başlangıç Durumu

Bu bölüm, 4 Ağustos 2026 tarihinde sistemin dokümansız ve misafir kullanıcı gibi
denendiği turun bulgularını uygulanabilir işlere dönüştürür. Denetimde altı farklı
problem teşhisten çalışma raporuna kadar yürütüldü; ortaya çıkan altı metodolojide
toplam 36 uygulama adımı açıldı ve dolduruldu.

| Vaka | Beklenen | Gerçek sonuç | Soru | Durum |
|---|---|---|---:|---|
| Müşteriye ulaşmış kaynak çatlağı | 8D | 8D | 4 | Doğru ve güçlü |
| Kronik dolum varyasyonu | DMAIC | DMAIC | 4 | Doğru ve güçlü |
| Yeni tedarikçi / gelecekteki risk | FMEA | Lean VSM | 13 | Kritik yanlış sınıflandırma |
| Kronik ekipman kaybı | TPM | TPM | 4 | Doğru ve güçlü |
| Açık sistem kısıtı | TOC | TOC | 18 | Doğru fakat gereksiz uzun ve geçici |
| CNC yatırım alternatifi | KT Decision | KT Decision | 18 | Doğru fakat gereksiz uzun ve geçici |

Doğrulanan olumlu davranışlar:

- 36 metodoloji adımının tamamı açılabildi ve farklı alan tiplerine veri girilebildi.
- Her adımda amaç, yürütme açıklaması, beklenen çıktı, kalite kontrolü ve alan örneği vardı.
- Yerel kayıt sayfa yenilemesinden sonra geri geldi; 5/5 DMAIC ilerlemesi ve rapor korundu.
- 1440 px ve 390 px genişlikte yatay sayfa taşması görülmedi.
- Teşhis özeti, rakip yöntem açıklaması ve kalibrasyon uyarısı üretildi.
- Soru tekrarı ve istemci çalışma zamanı hatası görülmedi.

Bu olumlu sonuçlar aşağıdaki sorunları geçersiz kılmaz. Özellikle yanlış FMEA
sınıflandırması canlıya çıkış engelidir.

## 18. P0 — Metin Ayrıştırma Doğruluğu ve Kullanıcı Onayı

### 18.1 Negasyon ve zaman bağlamı

- [x] `hata yaşanmadı`, `arıza görülmedi`, `henüz oluşmadı`, `gerçekleşmedi`,
  `şikâyet yok` ve benzeri ifadeler pozitif hata sinyali üretmemeli.
- [x] `arıza yok` ifadesi `equipmentBreakdown=true` sonucuna dönüşmemeli.
- [x] Gelecek zaman ifadeleri gerçekleşmiş olaydan ayrılmalı: `geçeceğiz`,
  `devreye alınacak`, `değiştirilecek`, `kullanılacak`, `planlanıyor`.
- [x] Bir cümlede hem anahtar sözcük hem açık negasyon varsa negasyon öncelikli olmalı.
- [x] Negasyon, yalnız aynı cümle/ifade kapsamındaki kavramı etkilemeli; metnin
  tamamındaki diğer gerçek hataları yanlışlıkla sıfırlamamalı.

### 18.2 Üretim terimlerinde bağlam ayrımı

- [x] `açık bekleme süresi`, `kürlenme süresi`, `proses bekleme limiti` gibi teknik
  süreler otomatik olarak Lean akış israfı sayılmamalı.
- [x] `kuyruk`, `ara stok`, `istasyon beklemesi`, `malzeme beklemesi` gibi gerçek
  akış kayıpları ayrı kalıplarla yakalanmalı.
- [x] `yeni tedarikçi`, `tedarikçiye geçiş`, `malzeme kaynağı değişimi`, `yeni
  hammadde partisi` ifadeleri tedarikçi/malzeme değişikliği olarak yakalanmalı.
- [x] Ekipman satın alma kararı içindeki `tezgâh` veya `makine` sözcüğü, arıza
  belirtilmedikçe ekipman arızası üretmemeli.

### 18.3 Çıkarım onay ekranı

- [x] İlk serbest metinden sonra kısa bir `Sizi doğru anladım mı?` ekranı gösterilmeli.
- [x] Yalnız metodolojiyi ciddi biçimde değiştirebilecek 3–6 kritik çıkarım
  kullanıcıya doğal Türkçeyle sunulmalı.
- [x] Kullanıcı her çıkarımı `Doğru`, `Yanlış`, `Emin değilim` olarak düzeltebilmeli.
- [x] Her alanın kaynağı tutulmalı: `metinden çıkarıldı`, `kullanıcı doğruladı`,
  `soruyla yanıtlandı` veya `bilinmiyor`.
- [x] Parser tarafından doldurulmuş fakat kullanıcıca doğrulanmamış kritik alan,
  tek başına doğrulanmış sonuç üretmemeli.

### 18.4 Kabul testleri

- [x] Doğal dille yazılmış yeni yapıştırıcı/tedarikçi vakası FMEA ailesini lider yapmalı.
- [x] Aynı metindeki `açık bekleme süresi` Lean VSM sinyali oluşturmamalı.
- [x] Metindeki `henüz hata yaşanmadı` ifadesi `defectOccurred=false` olmalı.
- [x] Kullanıcı çıkarımı düzelttiğinde sıralama ve gerekçe zinciri anında yeniden hesaplanmalı.
- [x] Keyword, LLM ve LLM-fallback yolları aynı kritik alan sözleşmesini sağlamalı.

## 19. P0 — Yönteme Özel Kanıt ve Soru Durdurma Modeli

### 19.1 Genel eşik sorunu

Mevcut `en az üç destek işareti` kuralı tüm yöntemlere aynen uygulanmaktadır.
KT Decision yalnız `decisionBetweenOptions`, TOC ise çoğu vakada yalnız
`bottleneckThroughput` ve `flowOrWaste` üzerinden desteklenebildiği için bu
yöntemler mevcut modelle doğrulanmış duruma ulaşamamakta ve 18 soruluk üst sınıra
kadar devam etmektedir.

- [x] Tek küresel destek eşiği yerine yöntem ailesi bazlı kanıt profilleri tanımlanmalı.
- [x] Destek sayısı yalnız kural satırı sayısı değil, birbirinden bağımsız anlamlı
  kanıt boyutları üzerinden hesaplanmalı.
- [x] Her yöntem için `gerekli`, `güçlendirici`, `çelişen` ve `uygulanabilirlik`
  sinyalleri açıkça tanımlanmalı.
- [x] Sonuç `doğrulandı` denmeden önce gereken sinyal seti yöntem özelinde sağlanmalı.
- [x] Yeterli kanıt yoksa sistem doğru biçimde `ön aday` demeli; fakat alakasız
  yöntem ailelerinden soru sorarak kanıt sayısını yapay biçimde yükseltmemeli.

### 19.2 Yeni ayırt edici kanıt boyutları

KT Decision için:

- [x] Tanımlı en az iki alternatif var mı?
- [x] Eleme yapan zorunlu kriterler var mı?
- [x] Ağırlıklandırılabilir tercih kriterleri var mı?
- [x] Kararın kapsamı ve karar sahibi belli mi?
- [x] Bu gerçekten bir seçim mi, yoksa önce çözülmesi gereken bilinmeyen nedenli
  bir problem mi?

TOC için:

- [x] Tek bir nokta toplam çıktıyı sınırlıyor mu?
- [x] Kısıt önünde kuyruk/ara stok oluşuyor mu?
- [x] Kısıt sonrasında açlık veya boş kapasite görülüyor mu?
- [x] Kısıt kapasitesi ile talep sayısal olarak karşılaştırılabiliyor mu?
- [x] Kısıtı iyileştirmek sistem throughput'unu gerçekten artıracak mı?

FMEA için:

- [x] Hata henüz gerçekleşmemiş mi veya yeni koşul için ileriye dönük risk mi aranıyor?
- [x] Ürün, proses, malzeme, tedarikçi, insan veya kontrol koşulu değişiyor mu?
- [x] Potansiyel hata modu ve etkisi tarif edilebiliyor mu?
- [x] Mevcut önleme/yakalama kontrollerinin yeterliliği belirsiz mi?

### 19.3 Soru rotası ve durma hedefleri

- [x] Karar, risk, reaktif problem, varyasyon, ekipman ve akış eksenleri ilk
  sorularda ayrılmalı.
- [x] Lider aile belirginleştikten sonra sorular o ailenin kanıt profilinden seçilmeli.
- [x] Rakip aile sorusu yalnız lideri gerçekten değiştirebilecek bilgi kazancı
  taşıyorsa sorulmalı.
- [x] Çift anlamlı sorular bölünmeli; kullanıcı iki durumu da işaretleyebilmeli.
- [x] Kullanıcı istediğinde cevaplarını ve parser çıkarımlarını sonuçtan önce
  gözden geçirip değiştirebilmeli.
- [x] Normal, tutarlı vakalarda hedef soru aralığı 4–8 olmalı.
- [x] Belirsiz/çelişkili vakalarda üst sınır 12 olmalı; 12'de sonuç hâlâ zayıfsa
  kesin öneri yerine eksik bilgi planı verilmelidir.

Kabul:

- [x] 8D, DMAIC ve TPM golden vakaları 4–8 soruda doğru ve doğrulanmış sonuçlanır.
- [x] KT Decision vakası 4–7 ilgili soruda doğru sonuçlanır; 5S, müşteri hatası
  ve ekipman arızası gibi ilgisiz sorular sorulmaz.
- [x] TOC vakası 5–8 ilgili soruda doğru sonuçlanır; `ön aday` olarak 18 soruya
  kadar sürmez.
- [x] FMEA vakası 5–8 soruda doğru sonuçlanır ve gelecekteki koşul değişimini
  gerekçesinde gösterir.
- [x] Hiçbir yöntem yalnız 1–2 cevaptan sonra kesin sonuç olarak sunulmaz.

## 20. P1 — Temel ve Gelişmiş Çalışma Deneyimi

- [x] Yeni kullanıcı için varsayılan `Temel çalışma` görünümü oluşturulmalı.
- [x] Temel görünüm yalnız `Genel bakış`, `Metodoloji adımları`, `Aksiyonlar`,
  `Doğrulama` ve `Rapor` bölümlerini göstermeli.
- [x] Proaktif operasyon, organizasyon, karar laboratuvarı, ileri analiz, yatay
  yayılım ve kurumsal öğrenme `Gelişmiş araçlar` altında açılmalı.
- [x] Kullanılan metodoloji ve çalışma olgunluğuna göre ilgisiz paneller
  varsayılan görünümde saklanmalı; veri silinmemeli.
- [x] Rapor, `Diğer` altında aranmak zorunda kalmadan temel gezinmede görünmeli.
- [x] Genel bakış her zaman tek bir önerilen sonraki işi göstermeli.
- [x] Kullanıcının temel/gelişmiş görünüm tercihi yerel veya hesap ayarında korunmalı.

Kabul:

- [x] İlk kez gelen kullanıcı dokümansız olarak ilk metodoloji adımını bulabilir.
- [x] Temel akışta bir adımı doldurmak için en fazla iki gezinme kararı gerekir.
- [x] Gelişmiş görünüm açılmadıkça kullanıcı 12 bölümün tamamıyla karşılaşmaz.
- [x] 390 px görünümde grup ve sekme gezinmesi yatay sayfa taşması üretmez.

## 21. P1 — Terim, Adlandırma ve Anlatım Tutarlılığı

- [x] ERA, CTQ, MSA, OEE, MTBF, MTTR, throughput, containment ve baseline ilk
  kullanımda Türkçe açıklamasıyla gösterilmeli.
- [x] Yaygın uzman kısaltmaları korunabilir; ancak hover/focus ve mobil dokunuşla
  açılan kısa sözlük tanımı bulunmalı.
- [x] Alan örnekleri kullanılan metodolojinin vakasına göre özelleştirilmeli.
- [x] Adım numaraları tek biçime getirilmeli; yalnız bazı adımlarda `1 —`, `2 —`
  veya `3 —` görünmemeli.
- [x] `Sömürme`, `tabi kılma` gibi TOC terimleri teknik karşılığını korurken günlük
  dille açıklanmalı.
- [x] İngilizce teknik ifade tek başına alan etiketi olarak bırakılmamalı.

Kabul:

- [x] Hedef kullanıcı kısaltmaya tıklamadan da alanın ne istediğini anlayabilir.
- [x] Ekran okuyucu sözlük açıklamasına erişebilir.
- [x] Tüm playbook'larda adım adlandırma biçimi otomatik testle tutarlı bulunur.

## 22. P1 — Metodoloji Adımı Kalite Kapıları

- [x] Her adım için zorunlu, koşullu ve isteğe bağlı alanlar tanımlanmalı.
- [x] Kritik alanlar boşken doğrudan `Tamamlandı` yerine eksik alan özeti gösterilmeli.
- [x] Uygulanmayan adım `Atlandı` olarak işaretlenebilmeli; gerekçe ve onu karşılayan
  alternatif kanıt zorunlu olmalı.
- [x] Durumlar en az `Başlanmadı`, `Devam ediyor`, `İncelemeye hazır`, `Doğrulandı`
  ve `Gerekçeli atlandı` olarak ayrılmalı.
- [x] Kök neden, doğrulama kanıtı olmadan `Doğrulandı` durumuna geçmemeli.
- [x] Aksiyon, etkinlik ölçümü ve sonuç verisi olmadan etkili kabul edilmemeli.
- [x] Metodoloji adımlarının tamamlanması ile vakanın resmi kapanışı ayrı tutulmalı.
- [x] Misafir kullanıcının çok kullanıcılı onay eksikliği açıkça gösterilmeli;
  buna rağmen kendi kanıt ve doğrulama kayıtlarını girmesi engellenmemeli.

Kabul:

- [x] Boş veya yalnız genel bir cümle içeren kritik adım yanlışlıkla doğrulanamaz.
- [x] Geçerli gerekçeli istisna, kullanıcıyı gereksiz alan doldurmaya zorlamaz.
- [x] 8D D3→D4 kapısı korunur ve benzer bağımlılıklar diğer playbook'larda tanımlanır.

## 23. P1 — Profesyonel Rapor ve Çıktı Paketi

- [x] Yerel rapor yalnız adım sayısı göstermemeli; doldurulan metodoloji alanlarını
  yapılandırılmış biçimde içermeli.
- [x] Metin, tablo, 5 Neden, balık kılçığı, kök neden, aksiyon, kontrol planı,
  etkinlik sonucu, kanıt ve kapanış kararları rapora taşınmalı.
- [x] Boş bölümler raporda gizlenmeli; eksik kritik bölüm ayrı uyarı olarak görünmeli.
- [x] Teşhis gerekçesi ile uygulama sonucu aynı raporda birbirinden ayrılmalı.
- [x] `Önerilen yöntem`, `uygulanan yöntem` ve varsa `kurumsal/müşteri formatı`
  ayrı alanlar olmalı.
- [x] Ara durum raporu ile resmi kapanış raporu açıkça ayrılmalı.
- [x] Yazdır/PDF görünümü tablo taşmalarına karşı 390 px ve A4 ölçüsünde test edilmeli.
- [x] JSON yedeği tüm alanları kayıpsız geri yüklemeli.

Kabul:

- [x] Tamamlanan DMAIC raporunda problem, baseline, MSA, hipotez/test, doğrulanmış
  neden, çözüm ve kontrol planı görünür.
- [x] 8D raporunda D0–D8 içeriği, containment kaldırma ve müşteri kapanışı bulunur.
- [x] KT Decision raporunda zorunlu kriterler, ağırlıklar, alternatif puanları ve
  olumsuz sonuç analizi bulunur.
- [x] TOC raporunda kapasite/talep, kısıt, yararlanma, hizalama ve kapasite artırma
  kararları bulunur.

## 24. P1 — Kayıt, Dayanıklılık ve Hata Deneyimi

- [x] Otomatik kaydetme sırasında sekme kapatılırsa bekleyen değişiklik için uyarı
  veya son senkron yazımı uygulanmalı.
- [x] `Kaydediliyor`, `Bu tarayıcıya kaydedildi`, `Buluta kaydedildi` ve `Kayıt
  hatası` durumları görsel ve erişilebilir biçimde ayrılmalı.
- [x] Sayfa yenileme testleri metin, tablo, adım durumu ve raporu birlikte doğrulamalı.
- [x] 429 yanıtında mevcut cevap kaybolmamalı; kullanıcıya kalan bekleme süresi ve
  yeniden deneme sunulmalı.
- [x] Misafir hız sınırı yalnız ortak NAT/IP'ye dayanarak fabrikadaki birden fazla
  kullanıcıyı birlikte engellememeli; IP + anonim istemci/konuşma anahtarı ve
  kötüye kullanım sınırı birlikte tasarlanmalı.
- [x] LLM erişilemediğinde fallback çalışmaya devam etmeli; sağlayıcı hatası
  kullanıcıya teknik 500 olarak yansımamalı.
- [x] Fallback kullanım oranı içerik kaydetmeden operasyonel metrik olarak izlenmeli.
- [x] Tarayıcı depolama kotasına yaklaşınca yedekleme/buluta taşıma uyarısı verilmeli.

## 25. Test, Yayın Sırası ve Kapanış Kapıları

### Paket A — Sınıflandırma güvenliği (yayın engelleyici)

1. Negasyon ve bağlam ayrıştırması.
2. Kritik çıkarım onayı ve düzenleme ekranı.
3. FMEA, TOC ve yatırım kararı regresyon vakaları.
4. Keyword/LLM/fallback sözleşme testleri.

### Paket B — Soru motoru ve kanıt profilleri (yayın engelleyici)

1. Yönteme özel kanıt profilleri.
2. Aile bazlı soru rotası.
3. Yönteme özel durma koşulları.
4. İlgisiz soru ve maksimum soru testleri.

### Paket C — Uygulama kalitesi ve rapor

1. Adım zorunlulukları ve gerekçeli atlama.
2. Kanıt/etkinlik bağlantıları.
3. Tam içerikli yerel ve bulut raporları.
4. Yenileme ve dışa/içe aktarma doğrulaması.

### Paket D — Kullanım konforu

1. Temel/gelişmiş görünüm.
2. Metodolojiye göre bağlamsal paneller.
3. Terim sözlüğü ve adlandırma standardı.
4. Mobil ve erişilebilirlik denetimi.

### Otomatik test matrisi

- [x] En az 30 golden sınıflandırma vakası.
- [x] Her golden vakanın pozitif, negatif ve `bilmiyorum` varyantı.
- [x] En az 15 negasyon/gelecek zaman metamorfik testi.
- [x] `bekleme`, `arıza`, `yeni`, `değişim`, `karar` gibi çok anlamlı terimler
  için bağlam testi.
- [x] Altı kullanıcı denetimi vakasının kalıcı E2E regresyon testi.
- [x] Her desteklenen metodoloji için en az bir uygulama ve rapor testi.
- [x] Yerel kayıt, yenileme, yedek, bulut aktarımı ve tekrar deneme testi.
- [x] 390, 768, 1024 ve 1440 px görünüm/taşma testi.

### Yeniden canlıya çıkış kapıları

- [x] FMEA gelecek-risk vakası doğru yönteme gider.
- [x] Hiçbir kesin karar 3 bağımsız yöntem-özel kanıttan azıyla verilmez.
- [x] Normal vakaların en az %90'ı 4–8 soruda sonuçlanır.
- [x] Hiçbir tutarlı vaka 12 soruyu aşmaz.
- [x] Altı denetim vakasının altısı beklenen yöntem ailesine gider.
- [x] Yerel rapor girilen temel metodoloji verilerini eksiksiz taşır.
- [x] Yenileme sonrasında çalışma ve rapor kaybı olmaz.
- [x] Mobilde yatay sayfa taşması ve erişilemeyen ana eylem yoktur.
- [ ] Üç gerçek hedef kullanıcı, yardım almadan problem → teşhis → ilk adım →
  rapor görevini tamamlar.
- [x] Açık P0/P1 hata kalmaz; §15'teki teknik kapı ancak bundan sonra yeniden `[x]`
  yapılır.
