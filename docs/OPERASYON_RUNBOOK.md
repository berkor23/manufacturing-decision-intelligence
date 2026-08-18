# MDE Operasyon Runbook

## Sağlık ve gözlemlenebilirlik

- Liveness/readiness: `GET /api/health`; `200 status=ok` beklenir.
- Uygulama ve ters proxy günlükleri merkezi, erişim kontrollü ve döndürülen log alanına gönderilmelidir.
- Alarm: health 503, beş dakikada yüksek 5xx, yedek başarısızlığı veya disk eşiği.

## Yedekleme

Prisma/PostgreSQL ortamında günlük `scripts/backup-postgres.ps1 -OutputDirectory <onaylı-yedek-dizini>` çalıştırılır. Yedekler uygulama sunucusundan ayrı, şifreli ortamda saklanır. Saklama önerisi: 7 günlük, 4 haftalık, 12 aylık.

## Geri yükleme

Önce izole bir veritabanı oluşturulur ve `scripts/restore-postgres.ps1 -BackupFile <dump>` çalıştırılır. `/api/health`, kayıt sayısı ve örnek workspace açılışı doğrulanmadan trafik verilmez. En az üç ayda bir geri yükleme tatbikatı yapılır.

## Olay yönetimi

Değişiklik durdurulur, etki zamanı ve kapsamı kaydedilir, son sağlıklı yedek korunur. Veri kaybı şüphesinde canlı veritabanına doğrudan düzeltme uygulanmaz; kopya üzerinde inceleme yapılır.

## Üretim kontrol listesi

- `PERSISTENCE=prisma`, güçlü `DATABASE_URL` ve TLS
- APP_PASSWORD yalnız pilot içindir; kurumsal kullanım admin panelindeki kimlik/rol fazını beklemelidir
- HTTPS, güvenli çerez, ters proxy limitleri
- Günlük otomatik yedek ve geri yükleme tatbikatı
- Health alarmı ve hata izleme
- Bağımlılık güvenlik taraması ve desteklenen LTS Node.js (20 veya 22)
