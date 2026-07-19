# Vercel'de Canlı Demo Kurulumu

Bu kılavuz, projeyi **herkese açık, tıklanabilir bir portföy demosu** olarak Vercel'de
yayınlar. Demo modu:

- **LLM gerektirmez** — `AI_PROVIDER=none`, `PARSER=keyword`. Kararlar zaten deterministik
  motordan gelir; teşhis akışı, güven sıralaması, karar zinciri, playbook çalışma alanları ve
  deterministik raporlar tam çalışır. Yalnızca *AI taslak* ve *rapor cilası* (Ollama gerektiren)
  kapalıdır — sayfa başındaki demo bandı bunu ziyaretçiye söyler.
- **Auth kapalıdır** — `APP_PASSWORD` set edilmez, ziyaretçi doğrudan girer.

## Neden in-memory değil de Postgres?

`PERSISTENCE=memory` yerel geliştirmede mükemmeldir ama **Vercel'in serverless modelinde
güvenilir değildir**: her API rotası ayrı bir lambda örneğinde, ayrı bellekte çalışabilir ve
soğuk başlangıçta bellek sıfırlanır. Bu yüzden "teşhis başlat → soru cevapla → çalışma alanı aç"
akışı state kaybedebilir. Demo tıklanınca çalışsın diye **ücretsiz bir Postgres (Neon)** + mevcut
Prisma kalıcılık yolunu kullanıyoruz. Ek maliyet yok; kod zaten `PERSISTENCE=prisma`'yı destekler.

## Adımlar

### 1. Ücretsiz Postgres oluştur (Neon)

1. [neon.tech](https://neon.tech) → ücretsiz proje aç.
2. **Pooled** connection string'i kopyala (serverless için havuzlanmış uç nokta önemlidir),
   biçim: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`.

> Alternatif: Vercel panelinden **Storage → Postgres** (Neon tabanlı) tek tıkla da eklenebilir;
> `DATABASE_URL` otomatik enjekte edilir.

### 2. Şemayı bir kez uygula

Yerel makinenden, Neon URL'sini vererek migration'ları uygula:

```bash
DATABASE_URL="<neon-pooled-url>" npx prisma migrate deploy
```

(Vercel build'i şemaya bağlanmaz — liste sayfaları `force-dynamic`, çalışma sayfaları dinamik
route'tur — bu yüzden migration'ı önce sen çalıştırırsın.)

### 3. Vercel'e projeyi bağla

1. Repoyu GitHub'a push et (bkz. kök README).
2. [vercel.com](https://vercel.com) → **Add New → Project** → repoyu içe aktar.
3. Framework otomatik **Next.js** algılanır. Build/Install ayarına dokunmana gerek yok:
   `npm install` sırasında `postinstall: prisma generate` Prisma client'ı üretir.

### 4. Environment Variables (Vercel → Project → Settings → Environment Variables)

| Değişken | Değer | Not |
|----------|-------|-----|
| `DATABASE_URL` | `<neon-pooled-url>` | Storage entegrasyonu kullandıysan otomatik gelir |
| `PERSISTENCE` | `prisma` | Serverless'ta kalıcı state |
| `PARSER` | `keyword` | LLM'siz deterministik parser |
| `AI_PROVIDER` | `none` | Ollama yok; servisler deterministik yola düşer |
| `NEXT_PUBLIC_DEMO` | `1` | "Canlı demo" bilgi bandını gösterir |

`APP_PASSWORD` ve `ADMIN_PASSWORD` **set edilmez** → auth kapalı, ziyaretçi doğrudan girer.

### 5. Deploy

**Deploy** de. Bitince Vercel bir `https://<proje>.vercel.app` verir. README'nin en üstündeki
demo linki olarak bunu koy.

## Demo'nun bilinen sınırları (ziyaretçiye normaldir)

- **Dosya kanıtı yükleme çalışmaz** — Vercel'in dosya sistemi salt-okunurdur (`storage/` yazılamaz).
  Teşhis, çalışma alanları, rapor ve export bundan etkilenmez.
- **AI taslak / AI rapor cilası kapalı** — yerel Ollama gerektirir; demo bandı bunu belirtir.
- Deterministik motor, kural tabanı, güven/entropi, playbook'lar ve deterministik markdown
  raporlar **tam** çalışır — demonun anlatmak istediği çekirdek değer budur.

## Tam sürümü (LLM'li) çalıştırmak

AI taslak/rapor ve LLM parser'ı görmek isteyen için yerel kurulum README'de: Ollama + Postgres ile
`PARSER=llm`, `AI_PROVIDER=ollama`, `PERSISTENCE=prisma`.
