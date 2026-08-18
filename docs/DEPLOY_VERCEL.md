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

### 2. Şemayı uygula — ATLAMAYIN

**Vercel build'i migration çalıştırmaz.** Şemayı siz ilerletirsiniz, ve bu adım atlanırsa
arıza sinsidir: `/api/health` yalnız `SELECT 1` koştuğu için **yeşil kalır**, ama veritabanına
gerçek sorgu atan her sayfa (`/admin`, `/dashboard`, `/calismalar`, teşhis akışı) 500 verir.
Health'in yeşil olması şemanın güncel olduğu anlamına gelmez.

Migration'ları **kodu deploy etmeden önce** uygulayın. Eklemeli migration'larda eski kod yeni
sütunları görmezden gelir, yani önce şemayı ilerletmek güvenlidir; tersi yukarıdaki 500'leri
üretir.

```bash
# Pooled DEĞİL, doğrudan bağlantı: Prisma'nın advisory lock'ları pgbouncer'da takılabiliyor.
DATABASE_URL="<neon-direct-url>" npx prisma migrate deploy
DATABASE_URL="<neon-direct-url>" npx prisma migrate status   # "up to date" demeli
```

Production verisi varsa önce migration'ların ne yapacağını denetleyin:

```bash
grep -rniE "^\s*(DROP|DELETE|TRUNCATE)" prisma/migrations/*/migration.sql
grep -rniE "SET NOT NULL|ADD COLUMN.*NOT NULL" prisma/migrations/*/migration.sql
```

Çıktı boşsa migration'lar tamamen eklemelidir ve mevcut satırlar korunur.

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
| `ATTACHMENT_STORAGE` | `postgres` | **Şart.** Varsayılan `disk`, Vercel'de salt-okunur FS yüzünden sessizce bozulur |
| `PARSER` | `keyword` | LLM'siz deterministik parser |
| `AI_PROVIDER` | `none` | Ollama yok; servisler deterministik yola düşer |
| `NEXT_PUBLIC_DEMO` | `1` | "Canlı demo" bilgi bandını gösterir |
| `ADMIN_PASSWORD` | `<güçlü-parola>` | **Şart.** Aşağıdaki uyarıya bakın |

Değişkenleri **Production ve Preview** ortamlarının ikisine de ekleyin; yalnız birine
eklemek diğer ortamı yarım bırakır.

> **Ortam değişkeni eklemek çalışan dağıtımı değiştirmez.** Yeni değerler ancak bir sonraki
> dağıtımda devreye girer. `NEXT_PUBLIC_` önekliler için daha da katı: değer derleme anında
> istemci paketine gömülür, yani mutlaka yeniden derleme ister.

> **Vercel'de "Sensitive" işaretli değişkenin değeri geri OKUNAMAZ** — ne panelden ne
> `vercel env pull` ile (`[SENSITIVE]` döner), yalnız üzerine yazılabilir. `DATABASE_URL`'i
> Sensitive işaretlerseniz bağlantı dizesini **veritabanı sağlayıcısından** almanız gerekir;
> Vercel size bir daha göstermez.

#### `ADMIN_PASSWORD` neden zorunlu

`APP_PASSWORD` set edilmez — demo herkese açık olsun diye. Ama `ADMIN_PASSWORD` de
tanımlanmazsa `src/proxy.ts`'teki şu satır devreye girer:

```ts
if (!authEnabled() && !adminPassword()) return NextResponse.next();
```

İkisi de yoksa proxy **hiçbir kontrol yapmadan** her isteği geçirir — `/admin` ve
`/api/admin/*` dahil, çalışma silme yetkisiyle birlikte. Yani yönetici paneli herkese açılır.

Yalnız `ADMIN_PASSWORD` tanımlamak doğru dengeyi kurar: bu erken çıkış devre dışı kalır,
`/admin` yönetici oturumu ister, ama demo sayfaları açık kalır — çünkü `isValidSession()`
`APP_PASSWORD` yokken `true` döner.

`ACCOUNT_AUTH_ENABLED` ve `ALLOW_EMAIL_PREVIEW` **set edilmez** (ikincisi doğrulama ve
parola sıfırlama jetonunu API yanıtında gösterir).

### 5. Deploy

**Deploy** de. Bitince Vercel bir `https://<proje>.vercel.app` verir.

> **Derleme başarısız olursa ve yerelde temiz geçiyorsa**, ilk şüpheli `.gitignore`'un
> elediği bir kaynak dosyasıdır: dosya sizin diskinizde vardır ama repoda yoktur, o yüzden
> yerel derleme geçer, Vercel klonlayınca import çözülemez. Kontrol:
> `git ls-files --others --ignored --exclude-standard src/` — çıktı **boş olmalı**.
> Kesin doğrulama için repoyu ayrı bir klasöre klonlayıp orada `npm install && npm run build`
> çalıştırın; Vercel'in gördüğü tam olarak commit'li dosyalardır.
>
> Panele erişemiyorsanız dağıtımın sonucunu GitHub commit status'ünden okuyabilirsiniz:
> `api.github.com/repos/<kullanıcı>/<repo>/commits/<sha>/status` → `state` alanı.

### 6. Kendi alan adını bağla (isteğe bağlı)

Vercel → **Settings → Domains** → alan adını ekle; apex ile `www`'den birini ana seçip
diğerini ona yönlendir. Vercel ekranda **projeye özel** DNS değerlerini gösterir — panelde
yazan neyse onu girin, sabit bir IP varsayımı yapmayın.

Alan adı **Cloudflare**'deyse kayıtların proxy durumu **DNS only (gri bulut)** olmalı.
Turuncu bulut üç şeyi birden bozar: Vercel sertifika doğrulamasını tamamlayamaz, SSL modu
*Flexible* ise sonsuz yönlendirme döngüsü (`ERR_TOO_MANY_REDIRECTS`) oluşur ve iki CDN üst
üste biner. Gri bulutta Cloudflare saf DNS'tir; TLS'i Vercel yapar, dolayısıyla Cloudflare'in
SSL/WAF ayarları bu kurulumda etkisizdir. Apex için CNAME verilmişse Cloudflare bunu
**CNAME flattening** ile çözer (varsayılan açık).

Alan adını bağladıktan sonra README'deki demo linkini güncelleyin.

## Demo'nun bilinen sınırları (ziyaretçiye normaldir)

- **AI taslak / AI rapor cilası kapalı** — yerel Ollama gerektirir; demo bandı bunu belirtir.
- Deterministik motor, kural tabanı, güven/entropi, playbook'lar ve deterministik markdown
  raporlar **tam** çalışır — demonun anlatmak istediği çekirdek değer budur.

## Tam sürümü (LLM'li) çalıştırmak

AI taslak/rapor ve LLM parser'ı görmek isteyen için yerel kurulum README'de: Ollama + Postgres ile
`PARSER=llm`, `AI_PROVIDER=ollama`, `PERSISTENCE=prisma`.
