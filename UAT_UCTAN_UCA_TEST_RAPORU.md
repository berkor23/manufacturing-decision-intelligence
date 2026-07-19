# Uçtan Uca Profesyonel Vaka Kabul Testi

**Tarih:** 18 Temmuz 2026  
**Ortam:** Yerel Next.js 16.2.10 + PostgreSQL/Prisma + deterministik keyword parser  
**Sonuç:** Koşullu başarılı; testte bulunan iki karar boşluğu düzeltilip yeniden doğrulandı.

## Test edilen vakalar

| Vaka | Profesyonel beklenti | İlk sonuç | Nihai değerlendirme |
|---|---|---|---|
| Müşteride kaynak çatlağı, riskli stok, containment | 8D | 8D %64 | Doğru; 12 soruluk bütçe sonunda sonuçlandı |
| Yeni batarya montaj hattı ve güvenlik riski | DMADV + FMEA tamamlayıcı | DMADV %84 | Savunulabilir; yeni tasarım odağı baskın |
| Sekiz haftalık çap varyasyonu ve 2400 ölçüm | DMAIC | DMAIC %76 | Doğru ve güçlü ayrışma |
| Kronik pres plansız duruşu ve düşük OEE | TPM | TPM %56 | Doğru lider; güven orta, saha soruları gerekli |
| Boya fırını darboğazı, WIP ve düşük throughput | TOC | İlk testte LEAN/SPC/TOC eşit | N7b kuralıyla düzeltildi; canlı tekrar TOC %94 |
| Mevcut fren kaliperi prosesinde hata oluşmadan risk | FMEA | İlk metinde olumsuzluk belirsizliği | Parser düzeltildi; canlı tekrar FMEA %72 |

## Tam 8D yaşam döngüsü testi

Canlı UAT çalışma alanı: `ws_mrqnrrs6_vdll51`

- 9/9 playbook adımı tamamlandı.
- A/B fikstür deneyi saha kanıtı kaydedildi.
- Kök neden iddiası kanıta ve karşı-olgusal deneye bağlandı.
- Karşı önlem başarı metriği, başlangıç, hedef ve gerçekleşen değerle `EFFECTIVE` yapıldı.
- Kalite ve proses sahibi onayları tamamlandı.
- Erken uyarı metriği, yeniden açma eşiği, sorumlu ve değerlendirme tarihi girildi.
- Hat 4 yatay yayılım hedefi değerlendirildi.
- Metin dosyası iddiaya bağlı kanıt olarak yüklendi ve güvenli indirme rotasından geri okundu.
- Kurumsal öğrenim kaydı oluşturuldu.
- Profesyonel uygulama raporu üretildi.
- 9/9 intelligence/kapanış kontrolü geçti.
- Çalışma önce `MONITORING`, başarılı izleme sonucu sonra `CLOSED` oldu.
- Yaşam döngüsü audit olaylarına işlendi.

## Canlı rota doğrulamaları

| Rota | Sonuç |
|---|---|
| Çalışma alanı | HTTP 200 |
| Yazdırılabilir uygulama raporu | HTTP 200 |
| Güvenli kanıt indirme | HTTP 200, `text/plain` |
| Dashboard | HTTP 200 |
| Çalışmalar listesi | HTTP 200 |

## Testte bulunan ve düzeltilen kusurlar

### 1. Açık darboğazda TOC ayrışması

`bottleneckThroughput` ve `flowOrWaste` birlikte olduğunda TOC ile Lean eşitlenebiliyordu. Açıkça tanımlanmış sistem kısıtının önce TOC ile yönetilmesi için birleşik `N7b` kuralı eklendi. SPC/Lean/TOC %27 eşitliği, temiz yeniden başlatma sonrası TOC %94 sonucuna dönüştü.

### 2. Türkçe olumsuzluk

“Yeni ürün tasarımı değildir” ifadesi içindeki “yeni ürün tasarımı” parçası pozitif sinyal oluşturabiliyordu. Negatif kalıplar pozitif kalıplardan önce değerlendirilecek şekilde eklendi. İki parser regresyon testiyle gerçek yeni tasarım ve olumsuz ifade ayrımı kilitlendi.

### 3. Geliştirme ortamında singleton yenileme

Karar servisleri `globalThis` singleton olduğundan kural/parser değişikliği HMR ile çalışan örneğe her zaman yansımıyor. Kabul testinde kod testi geçmesine rağmen canlı servisin eski sonucu vermesi bu nedenle gözlendi. Tam yeniden başlatma sonrası yeni kurallar doğru çalıştı. Üretim dağıtımında süreç zaten yeniden başladığı için bu bir production karar hatası değil, geliştirme operasyonu notudur.

## Otomatik test durumu

- 14 test dosyası
- 89/89 test başarılı
- Yeni darboğaz kombinasyon regresyonu eklendi
- Yeni Türkçe olumsuzluk parser testleri eklendi

## Nihai kabul kararı

Sistem ana değer zincirinde uçtan uca çalışmaktadır:

`Doğal dil problem → yapılandırma → adaptif teşhis → metodoloji önerisi → çalışma alanı → kanıtlı kök neden → etkili aksiyon → onay → yatay yayılım → rapor → izleme → kapanış`

Pilot üretim kullanımına geçilebilir. Ancak güven yüzdelerinin başarı olasılığı olmadığı, gerçek vaka verisi biriktikçe kalibrasyon gerektiği ve düşük güvenli sonuçlarda uzman onayının korunması gerektiği kabul kriterine not edilmiştir.
