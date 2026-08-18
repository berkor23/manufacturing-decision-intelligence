# MDE Saha Kullanıcı Testi ve Canlıya Çıkış Protokolü

## Amaç

Bu protokol, sistemin yalnız geliştirici tarafından hazırlanmış verilerle çalıştığını değil; gerçek üretim ve kalite profesyonellerinin, doküman okumadan ve yönlendirilmeden problemden rapora ilerleyebildiğini doğrular. Test bir ürün demosu değildir. Kolaylaştırıcı yalnız gözlem yapar; kullanıcıya hangi yöntemi seçmesi, hangi cevabı vermesi veya hangi alana ne yazması gerektiğini söylemez.

## Katılımcı profili

En az üç farklı kişiyle ayrı oturum yapılır:

1. Üretim veya yalın üretim mühendisi.
2. Kalite mühendisi veya kalite sistemleri uzmanı.
3. Operasyonel mükemmellik, bakım ya da proses geliştirme uzmanı.

Katılımcıların daha önce MDE kullanmamış olması tercih edilir. Her katılımcıdan görev öncesi; rolü, sektör deneyimi ve bildiği problem çözme yöntemleri alınır. İsim yerine katılımcı kodu kullanılabilir.

## Test verisi ve gizlilik

- Gerçek vaka kullanılacaksa şirket, müşteri, ürün ve kişi adları anonimleştirilir.
- Ticari sır, kişisel veri ve müşteriye ait dosya test sistemine yüklenmez.
- Ekran/ses kaydı alınacaksa önceden açık izin alınır.
- Problem metni veya kanıt içeriği analitik olaylara gönderilmez.
- Test sonunda yerel ve bulut deneme kayıtlarının nasıl silineceği katılımcıya gösterilir.

## Görevler

### Görev 1 — İlk temas ve teşhis

Katılımcıya yalnız şu yönerge verilir:

> Günlük işinizden bildiğiniz bir üretim, kalite, bakım, akış, yatırım veya ileriye dönük risk problemini bu bağlantı üzerinden değerlendirin. Size uygun görünen noktaya kadar ilerleyin.

Başarı ölçütleri:

- Üye olmadan denemeyi bulur.
- Yerel kaydın ne anlama geldiğini doğru açıklar.
- Problemi neden içermeyen, anlaşılır bir cümleyle girebilir.
- Sorularda “evet / hayır / bilmiyorum” ayrımını doğru kullanır.
- Çıkarım onayında yanlış bir bilgiyi düzeltebilir.
- Sonuçta önerilen yöntemi, üç ana gerekçeyi ve önerinin kesinlik değil kanıt desteği olduğunu kendi cümleleriyle anlatır.

### Görev 2 — Uygulama alanında ilk somut çıktı

Katılımcı önerilen çalışma alanını açar ve yardım almadan:

- başlaması gereken adımı bulur,
- en az bir metin alanı ve bir yapılandırılmış tablo/aracı doldurur,
- alanın zorunlu, koşullu veya isteğe bağlı olduğunu yorumlar,
- iyi kayıt ölçütünü ve örneği kullanır,
- uygun olmayan bir adımı denetlenebilir gerekçeyle kapatmayı dener,
- sayfayı yenileyip verisinin korunduğunu doğrular.

### Görev 3 — Kanıt, takip ve rapor

Katılımcı:

- bir aksiyona sorumlu, başarı ölçütü ve sonuç girer,
- bir iddiayı kanıtla ilişkilendirmeye çalışır,
- çalışma sürerken ara rapor üretir,
- resmî raporun neden henüz üretilemediğini açıklar,
- önerilen teknik yöntem ile zorunlu müşteri/OEM formatı farkını raporda bulur.

## Gözlem kaydı

Her kritik davranış için aşağıdakiler kaydedilir:

| Alan | Kayıt biçimi |
|---|---|
| Görev sonucu | Başardı / yardımla başardı / başaramadı |
| Süre | Başlangıç ve bitiş zamanı |
| Yanlış tıklama | Sayı ve ekran adı |
| Geri dönüş | Kullanıcının geri dönüp düzelttiği adım |
| Tereddüt | 10 saniyeden uzun duraksama ve ekrandaki alan |
| Hata | Teknik hata metni veya beklenmeyen sonuç |
| Kullanıcı sözü | En fazla kısa, izinli ve anonim alıntı |
| Geçici çözüm | Kullanıcının sistemi aşmak için yaptığı işlem |
| Beklenti farkı | Kullanıcının olmasını beklediği davranış |

Kolaylaştırıcı gözlemi yorumdan ayırır. “Kullanıcı alanı anlamadı” yerine “alanı 28 saniye inceledi, iki kez geri döndü ve ‘buraya ölçüm mü karar mı yazacağım?’ dedi” yazılır.

## Oturum sonu soruları

1. Sistem size ne yapmanızı sağlıyor?
2. Önerilen yönteme neden güvendiniz veya güvenmediniz?
3. Hangi sorular gereksiz, yönlendirici ya da eksik geldi?
4. İlk uygulama adımında ne yazmanız beklendiği açık mıydı?
5. Hangi noktada işi bırakmayı düşündünüz?
6. Bu sistemi vardiyada, gemba'da veya müşteri baskısı altında kullanır mıydınız?
7. Mevcut SAP QM, MES veya CAPA kaydınızla nerede çift veri girişi oluşur?
8. Bir sonraki kullanımda geri dönmenizi sağlayacak en önemli değer nedir?

## Sayısal kabul eşikleri

Canlıya çıkış kapısının geçmesi için:

- Üç katılımcının üçü de problem → teşhis → ilk metodoloji adımı → ara rapor yolunu kritik yardım almadan tamamlar.
- İlk ana eylemi bulma süresi 30 saniyenin altında olur.
- Katılımcıların tamamı önerinin başarı olasılığı olmadığını doğru ifade eder.
- Katılımcıların tamamı en az bir cevabı gözden geçirip değiştirebilir.
- Veri kaybı, yetkisiz erişim, yanlış resmî rapor veya kullanıcıyı tehlikeli aksiyona yönlendiren sonuç oluşmaz.
- Hiçbir P0 ve P1 bulgu açık bırakılmaz.

## Bulgu önceliği

- **P0 — yayın engelleyici:** veri kaybı, yetki ihlali, yanlış kesin yöntem iddiası, resmî rapor kapısının aşılması, ana akışın tamamlanamaması.
- **P1 — yüksek:** kullanıcıyı yanlış yönteme götüren soru, doldurulması anlaşılamayan kritik alan, mobilde erişilemeyen ana eylem, raporda kritik veri kaybı.
- **P2 — orta:** gereksiz gezinme, açıklama eksikliği, belirgin terminoloji sürtünmesi.
- **P3 — düşük:** kozmetik tutarsızlık veya akışı engellemeyen metin iyileştirmesi.

## Canlı izleme ve geri dönüş

İlk yayın sınırlı pilot olarak yapılır. İçerik kaydetmeden; teşhis başlangıcı, sonuç, çalışma alanına geçiş, rapor üretimi, 4xx/5xx hata ve parser fallback olayı sayılır. İlk 24 saat ve ilk hafta ayrı incelenir. P0 görülürse yeni misafir teşhisi kapatılır veya önceki kararlı sürüme dönülür; mevcut yerel kayıtlar silinmez. P1 oranı ana akışların %5'ini aşarsa yayılım durdurulur ve sorun giderilmeden yeni kullanıcı daveti yapılmaz.

## Sonuç tutanağı

Her oturumdan sonra `fieldPilot` kaydına tesis/hat, katılımcı kodları, başlangıç ve gerçekleşen çevrim süresi, sürtünme noktaları, geçici çözümler, kullanıcı geri bildirimi ve sonuç girilir. Üç oturumun özetinde her bulgu için sahibi, hedef tarihi, düzeltme sürümü ve tekrar test sonucu bulunur.

> Bu protokolün hazırlanmış olması saha doğrulamasının tamamlandığı anlamına gelmez. Canlıya çıkış kapısı ancak üç gerçek hedef kullanıcıyla yapılan oturumların sonuçları kaydedildiğinde kapatılır.
