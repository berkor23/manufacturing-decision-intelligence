# Yarın Devam Notu

Son güncelleme: **19 Temmuz 2026, 05:30 (Europe/Istanbul)**

## Yarın başlangıç cümlesi

Yeni oturumda şu cümle yeterlidir:

> `YARIN_DEVAM_NOTU.md dosyasını okuyup kaldığımız yerden devam et.`

## Son tamamlanan çalışma

Frontend kullanıcı dokümantasyonu ilk ekran-seviyesi sürümden alan ve alt-panel seviyesinde ayrıntılı kullanıcı el kitabına dönüştürüldü.

Güncel ana çıktılar:

- `dokumantasyon/FRONTEND_DETAYLI_KULLANIM_KILAVUZU.pdf`
- `dokumantasyon/FRONTEND_DETAYLI_KULLANIM_KILAVUZU.html`
- `dokumantasyon/detayli-ekran-goruntuleri/` — 25 alt-panel görseli
- `e2e/frontend-detailed-guide.spec.ts` — ayrıntılı belge üreticisi
- `playwright.guide.config.ts` — belge üretim yapılandırması

Belge şu başlıkları her alt sistem için içerir:

- Alt sistemin görevi ve sistemde bulunma nedeni
- Alan sözlüğü: alanın adı, neden istendiği ve beklenen veri/örnek
- İyi ve zayıf kayıt örneği
- İş akışı ve karar mantığı
- Diğer ekranlarla bağlantılar
- Tamamlanma kontrol listesi
- Sık yapılan kullanıcı hataları

Detaylandırılan 25 alt sistem; Proaktif Operasyon, Organizasyon ve Bağlam, Karar Laboratuvarları, İleri Analizler, Kanıt ve Kapanış, Aksiyonlar, Yayılım ve Öğrenim alanlarını kapsar.

## Belgeyi yeniden üretme

```powershell
npx playwright test --config=playwright.guide.config.ts
```

Bu komut:

1. Gerçekçi bir FMEA örnek vakası oluşturur.
2. Alt panelleri açar ve gerekli örnek satırları ekler.
3. 25 ayrı ekran görüntüsü alır.
4. HTML ve PDF kullanıcı kitabını yeniden üretir.

Eski, daha kısa belge korunmaktadır:

- `dokumantasyon/FRONTEND_KULLANIM_KILAVUZU.pdf`
- `dokumantasyon/FRONTEND_KULLANIM_KILAVUZU.html`

## Projenin genel durumu

Üretime hazırlık paketi tamamlandı:

- Sıkı Zod API doğrulaması
- Çalışma ekranı veri erişimi/normalizasyon modülleri
- Uzman ve saha sonucu kalibrasyonu
- Merkezi görev ve termin görünümü
- JSON/CSV dışa aktarma ve JSON içe aktarma
- `/api/health`
- PostgreSQL yedekleme/geri yükleme betikleri
- Operasyon runbook'u
- Playwright kritik E2E turu

Son doğrulamalar:

- **142/142** birim ve entegrasyon testi geçti.
- **5/5** kritik E2E testi geçti.
- Ayrıntılı kılavuz üretim testi geçti.
- TypeScript tip kontrolü geçti.
- Next.js production build geçti.

## Bilinçli olarak ertelenen işler

Aşağıdaki iki madde kullanıcı kararıyla gelecekteki admin paneli kapsamına bırakıldı:

1. Kullanıcı/rol/yetki modeli
2. Aktör bazlı ayrıntılı denetim izi

Bunlar mevcut pakette yanlışlıkla uygulanmamalı; admin paneli tasarımıyla birlikte ele alınmalıdır.

## Yarın önerilen ilk kontrol

Ayrıntılı PDF kullanıcı tarafından gözden geçirilmeli. Özellikle:

1. Her görselin gerçekten ilgili alt paneli yeterince yakın gösterip göstermediği,
2. Organizasyon ve QMS gibi uzun ekranlarda kırpmanın uygun olup olmadığı,
3. Teşhis ekranındaki soru/sonuç adımlarının da aynı alan seviyesinde ayrı bir eğitim bölümü gerektirip gerektirmediği,
4. Metodolojiye özel FMEA, 8D, RCA, KT, PDCA/A3, DMAIC ve SPC formlarının her biri için ayrı kitap hazırlanıp hazırlanmayacağı

değerlendirilebilir.

En doğal sonraki paket: **Teşhis akışını ve her metodolojiye özel uygulama adımlarını da aynı ayrıntı seviyesinde belgelemek.**

## Yerel çalıştırma

```powershell
npm run dev
```

Uygulama: `http://localhost:3000`

Tüm temel doğrulama:

```powershell
npm run verify
npm run test:e2e
```

Node.js LTS 20 veya 22 önerilir. Node.js 21 destek dışı uyarılar üretebilir.

## Oturum kapanış durumu

- Port 3000 üzerinde açık geliştirme sunucusu yoktur.
- Bilgisayar güvenle kapatılabilir.
- Çalışmaya devam etmek için özel bir arka plan sürecinin korunması gerekmiyor.
