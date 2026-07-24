# Problem Sınıflandırma Mantığı, Metodoloji Seçim Kriterleri ve Test Vakaları

Sorunuz üç başlıktı: sınıflandırma mantığı, metodoloji seçim kriterleri ve hangi
vakalarla test ettiğim. Aşağıda üçünü de anlattım. Vakalardaki öneriler ve yüzdeler
uydurma değil; her birini motoru koşarak aldım.

## Önce sınıflandır, sonra seç

Sistem bir sohbet botu değil. Kararı bir dil modeli vermiyor. Metodolojiyi seçen şey,
LLM'den bağımsız çalışan bir kural motoru. Dil modelinin işi sadece anlama: serbest
metni yapılandırılmış sinyallere çevirmek, bir de sonucu düzgün Türkçeye dökmek.

Bunu bilerek böyle kurdum. Karar mantığı LLM'de olsaydı ne tekrar üretilebilir olurdu
ne de test edebilirdim. Şu an aynı problem her zaman aynı sonucu veriyor ve neden verdiğini
adım adım gösterebiliyorum.

## Sınıflandırma nasıl çalışıyor

Motor problemi 30 teşhis değişkeni üzerinden okuyor. Her değişkenin üç değeri var:
evet, hayır, bilinmiyor. "Bilinmiyor" burada önemli. Metinde bir şeyin kanıtı yoksa
değer boş kalıyor ve o boşluk otomatik bir soruya dönüşüyor. Yani dil modeli emin
olmadığı bir alanı doldurmuyor; onun yerine kullanıcıya soruyor. Halüsinasyonu karar
sürecinin dışında tutmanın yolu bu.

Değişkenlere örnek: gerçekleşmiş bir hata mı var yoksa henüz sadece risk mi, müşteri
etkilendi mi, kök neden doğrulandı mı, problem yeni mi başladı, bir değişiklikle mi
çakışıyor, tekrar ediyor mu, ölçüm verisi var mı ve güvenilir mi, varyasyon yüksek mi,
proses kararlı mı, ekipman kaybı kronik mi, bu bir hata mı yoksa alternatifler arası
bir seçim mi.

Sorular rastgele sorulmuyor. Sistem her turda mevcut belirsizliği Shannon entropisiyle
ölçüyor ve sıradaki soruyu, bu belirsizliği en çok azaltacak değişken olacak şekilde
seçiyor. Bir de durma ölçütü var: lider yöntem yeterli güvene ulaşıp en az üç bağımsız
sinyalle desteklendiğinde soru sormayı bırakıyor. Amaç en az soruyla en çok bilgiyi almak.

## Seçim kriterleri

Karar mantığının tek kaynağı, koddaki kural seti (`src/domain/diagnosis/rules.ts`):
40'tan fazla kural, her biri bir koşul ve bir ya da birkaç metodolojiye ağırlıklı bir
katkı. Katkı pozitif de olabilir (destekler) negatif de (cezalandırır). Yani bir yöntem
sadece öne çıkmıyor; rakipleri de aktif olarak geriye itiliyor.

Temel ayırt edici sorular şunlar:

| Ayırt edici soru | Sinyal | Yönlendirme |
|---|---|---|
| Hata gerçekleşti mi, yoksa yalnızca risk mi? | risk var, hata yok | FMEA; reaktif yöntemler bastırılır |
| Müşteri etkilendi / uygunsuzluk ona ulaştı mı? | evet | 8D |
| Kök neden doğrulandı mı? | hayır | RCA |
| Problem yeni mi ve bir değişiklikle mi çakışıyor? | evet + değişiklik | Kepner-Tregoe problem analizi |
| Ölçüm var ve varyasyon yüksek mi? | evet + evet | DMAIC |
| Ekipman kaybı kronik/tekrar eden mi? | evet | TPM |
| Düzensizlik mi, akış-israf mı, darboğaz mı? | — | 5S / Yalın-VSM / TOC |
| Hata mı, yoksa alternatifler arası seçim mi? | seçim | Kepner-Tregoe Karar Analizi |

Sistemi basit bir "koşul-yöntem eşleştiricisinden" ayıran birkaç nokta var.

Birincisi, teşhis önceliği. Kök neden bilinmiyorken Poka-Yoke, SPC ya da 5S gibi çözüm
yöntemlerini bilerek geri planda tutuyor. Önce nedeni bul, sonra çöz.

İkincisi, stabilizasyon kapısı. Standart iş yerleşmemişse ya da temel çalışma koşulları
sağlanmıyorsa, doğrudan iyileştirmeye (PDCA, DMAIC) geçmek yerine önce SDCA ile durumu
sabitlemeyi öneriyor.

Üçüncüsü, tek sinyalle karar vermiyor. Bir sonuç ancak lideri en az üç bağımsız özellik
destekliyorsa ve ortada mantıksal çelişki yoksa "doğrulanmış" sayılıyor; yoksa "geçici"
kalıyor. "Müşteri teslimatı etkilendi" tek başına 8D seçtirmiyor mesela.

Dördüncüsü, çelişki tespiti. "Hata yok ama uygunsuzluk müşteriye ulaştı" gibi tutarsız
bir girdide sistem kör karar vermiyor; çelişkiyi işaretleyip sonucu geçici tutuyor.

Her sonucun yanında üç açıklama geliyor: kazanan yöntemin neden seçildiği (karar zinciri),
elenen yöntemlerin neden uygun olmadığı, ve hangi cevabın değişmesi durumunda kararın
değişeceği. Bu açıklamaların hiçbiri sonradan yazılmış LLM metni değil; kararı veren
kuralların kendi gerekçelerinden üretiliyor.

## Test vakaları

Aşağıdaki vakalar kurgusal ama sahada karşılığı olan senaryolar. Her birinin altındaki
öneri ve yüzde, sistemin gerçek çıktısı. (Yüzde göreli kural desteğidir, kalibre bir
olasılık değil.) Vakaları, birbirine benzeyip farklı düşünme gerektiren durumları
kapsayacak şekilde seçtim.

**Vaka 1 — Henüz hata yok, risk var.**
"Yeni dolum hattını devreye aldık. Şu an bir hata yok ama gıda güvenliği açısından
ciddi bir risk görüyoruz."
Sistem bunu risk (hata değil) + yeni devreye alma + güvenlik riski olarak okuyor.
Öneri: FMEA (%92). RCA ya da 8D geçmişteki bir hatayı çözer; burada henüz çözülecek bir
hata yok, önlenecek bir risk var.

**Vaka 2 — Değişim kaynaklı problem.**
"İki haftadır kaynak hattında çatlak çıkıyor, geçen ay kaynak parametreleri revize
edilmişti."
Okunan sinyaller: gerçekleşmiş hata, yeni başladı, süreç değişti. Öneri: Kepner-Tregoe
problem analizi (%67), yakın rakip RCA. Öne çıkan soru "ne değişti"; sistem önce
değişikliği izole etmeyi öneriyor. Sinyaller henüz üç bağımsız desteğe ulaşmadığı için
sonuç geçici, birkaç soruyla derinleşir.

**Vaka 3 — Müşteriyi etkileyen, kök nedeni bilinmeyen problem.**
"Müşteriden şikâyet geldi, sahadan iade var, kök neden bilinmiyor ve stoğu acilen
ayıklamamız lazım."
Sinyaller: hata, müşteri etkilendi, uygunsuzluk müşteriye ulaştı, kök neden yok, acil
containment. Öneri: 8D (%99, beş bağımsız sinyalle doğrulanmış). RCA yakın rakip ama tek
başına yetmez: müşteri etkilendiği için koruma, kalıcı düzeltici aksiyon ve standart
güncellemeyi içeren bir yönetim akışı gerekiyor. RCA zaten 8D'nin içinde D4 adımı olarak
yürüyor.

**Vaka 4 — Tekrar eden, kök nedeni bilinmeyen problem.**
"Aynı yüzey kusuru daha önce de defalarca oldu, müşteriye gitmiyor ama nedenini hâlâ
bulamadık."
Sinyaller: hata, müşteri etkilenmedi, tekrar eden, kök neden yok. Öneri: RCA (%86,
doğrulanmış). Müşteri etkilenmediği için 8D'nin containment ve yönetim ağırlığı gereksiz;
tekrar eden ve nedeni bilinmeyen bir problem doğrudan kök neden analizi istiyor.

**Vaka 5 — Kronik ekipman kaybı.**
"Dolum makinesi altı aydır tekrar tekrar duruyor, OEE sürekli düşük, aynı arıza geri
geliyor."
Sinyaller: ekipman arızası, kronik kayıp, tekrar eden. Öneri: TPM (%89, doğrulanmış),
yakın rakip RCA. Tek bir arıza olsa RCA yeterdi. Ama kronik ve tekrar eden bir ekipman
kaybı, tekil kök neden analizini aşıyor ve bir bakım sistemi (TPM) gerektiriyor. RCA
burada TPM'in içinde bir araç olarak kalıyor.

**Vaka 6 — Veri yoğun, yüksek varyasyonlu problem.**
"Ölçüm verimiz var ve güvenilir, çıktıdaki varyasyon sürekli yüksek, proses de
istatistiksel olarak kararsız."
Sinyaller: hata, güvenilir ölçüm, yüksek varyasyon, proses kararsız. Öneri: DMAIC (%97,
doğrulanmış), yakın rakipler RCA ve SDCA. Güvenilir veri ve yüksek varyasyon birlikteyken
istatistiksel iyileştirme mantıklı. Not: ölçüm güvenilir olmasaydı sistem "önce ölçümü
doğrula" deyip DMAIC'i geri iterdi. Veri yeterliliği ayrı bir eksen olarak
değerlendiriliyor.

**Vaka 7 — Özel nedenli (assignable cause) problem.**
"Problem ara ara çıkıp kayboluyor, olduğu ve olmadığı vardiyaları karşılaştırabiliyoruz,
proses kararlı değil ve kök neden bilinmiyor."
Sinyaller: aralıklı, karşılaştırma yapılabilir, proses kararsız, kök neden yok. Öneri:
RCA (%82, doğrulanmış), yakın rakip Kepner-Tregoe. Aralıklı ve karşılaştırılabilir bir
özel neden söz konusu. Proses kararsız olduğu için sistem SPC gibi kontrol yöntemlerini
bastırıp önce nedenin bulunmasını öneriyor.

**Vaka 8 — Karar gerektiren problem.**
"Ortada bir hata yok, iki tedarikçiden hangisiyle devam edeceğimize karar vereceğiz,
kıyaslıyoruz."
Sinyal: alternatifler arası bir seçim kararı. Öneri: Kepner-Tregoe Karar Analizi (%93).
RCA, 8D, DMAIC, FMEA hepsi bir hatayı çözer; burada çözülecek hata değil, seçilecek
alternatif var. Sistem bu vakada MUST/WANT kriterleriyle çalışan bir karar motoruna
geçiyor: zorunlu bir kriteri karşılamayan alternatif eleniyor, kalanlar ağırlıklı skora
göre sıralanıyor, seçilen alternatif olası olumsuz sonuçlarıyla sınanıyor. Bu hesap da
LLM değil, deterministik.

**Vaka 9 — Kriz değil, iyileştirme.**
"Büyük bir sorun yok ama mevcut performansı adım adım iyileştirmek istiyoruz."
Sinyaller: iyileştirme çalışması, akut hata yok. Öneri: PDCA/A3 (%47). Akut hata olmadığı
için reaktif yöntemler bastırılıyor. Düşük yüzde bilinçli; birkaç soruyla netleşecek
temkinli bir başlangıç.

**Vaka 10 — Önce stabilizasyon.**
"Varyasyon yüksek ama standart iş yerleşmemiş, her vardiya farklı yapıyor."
Sinyaller: hata, yüksek varyasyon, standart iş yok. Öneri: SDCA (%63). Standart yokken
doğrudan iyileştirmeye geçmek boşuna; sistem önce standardı ve temel koşulları sabitlemeyi
öneriyor. Stabilizasyon kapısının somut sonucu bu.

## Testin tarafı

vakalar tek seferlik denemeler değil. Kalıcı regresyon testlerinin içinde tutuluyor. Şu an
160'tan fazla otomatik test var ve tamamı geçiyor. Testler sadece "doğru cevabı buldu mu"
diye bakmıyor. Yanlış ya da erken kararı reddediyor mu ("tek başına müşteri etkisi 8D
seçtirmemeli", "tekil arıza TPM'i doğrulamamalı"), yeterli kanıt yokken "kesin" demiyor
mu, çelişkili girdide uyarıyor mu, birbirine benzeyen eksenler karışmıyor mu, bunları da
kontrol ediyor.

Kural ağırlıklarında yaptığım değişikliklerde bu testler kontrol mekanizması görevi görüyor.
Bir vakayı düzeltmek için yaptığım değişiklik başka bir vakayı bozuyorsa 
bunu doğrudan görebiliyorum.

## Bilerek eksik bıraktıklarım

Güven yüzdeleri kalibre değil. Şu an "göreli kural desteği" olarak sunuluyor, mutlak bir
başarı olasılığı iddia etmiyorum. Saklanan konuşmalar etiketli veriye dönüştükçe ağırlıkları
kalibre etmeyi planlıyorum.

Kural ağırlıkları da şu aşamada benim belirlediğim uzman ağırlıkları. 
Dolayısıyla belli ölçüde öznellik içeriyor;
Test vakaları bunun kontrolünü sağlıyor; yeterli etiketli veri 
oluştuğunda bu ağırlıkları veriye göre yeniden kalibre etmek istiyorum.

Son olarak, sistem şu an ekibe muhakemesini gösteren bir araç. Kendi kendine öğrenen,
sahadan gelen veriyle ayarlarını güncelleyen hale gelmesi bir sonraki adım. Bunları
saklamak yerine açıkça yazıyorum, çünkü sistemin nerede güçlü nerede temkinli olduğunu
bilmek de değerlendirmenin bir parçası.
