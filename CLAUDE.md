# Manufacturing Decision Engine (MDE)

Üretim/kalite ekipleri için AI destekli karar destek aracı. İlke:
**önce problemi teşhis et, doğru metodolojiyi öner (FMEA/KT/RCA/8D/PDCA/DMAIC),
sonra uçtan uca uygulat.**

**Kapsam (güncel):** Proje tek kiracılı bir iç araç olarak başladı ve **çok kiracılı
bir SaaS'a evriliyor.** Hesap sistemi (bireysel + şirket hesapları, roller, davet,
e-posta doğrulama) kurulmuş durumdadır; her kayıt bir hesaba/şirkete aittir.
Tek-kiracılı `APP_PASSWORD` modu ve hesapsız out-of-box kurulum **korunur** —
hesap sistemi `ACCOUNT_AUTH_ENABLED=1` ile açılan bir katmandır, zorunlu değildir.

Mimari sözleşme: `docs/ARCHITECTURE.md` · Plan ve fazlar: `docs/PLAN.md` · Vizyon: `docs/Manufacturing_Decision_Intelligence_Platform.md`

**Kimlik:** AI chatbot değil, **Decision-Engine merkezli** bir teşhis motoru. Kararı LLM değil, saf/deterministik domain motoru verir. LLM yalnızca anlama/soru/rapor.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind v4
- PostgreSQL + Prisma **v6** (Node 21 ile uyumlu; v7'ye geçme — Node 22.12+ ister)
- Test: **Vitest v2** (`npm test`; v3 rolldown Node 21'de çalışmaz)
- AI: sağlayıcı-bağımsız (`IAIProvider`). Varsayılan Ollama (yerel, ücretsiz). Ücretli API yok.

## Katmanlı yapı (bağımlılık içeri doğru)
- `src/domain/diagnosis/` — SAF çekirdek: features, rules, rule-engine, confidence-engine, question-engine, decision-trace, diagnose (fasad). LLM/DB YOK. `index.ts` barrel.
  - `contested-signals.ts` — iki bağımsız kanıt gövdesi aynı anda varsa (ör. kronik arızalı
    darboğaz: TPM × TOC) çakışmayı ve birleştirme SIRASINI üretir. Skoru DEĞİŞTİRMEZ.
  - `decision-trace.ts` → `buildContrastiveTrace` — lider ve en yakın rakip için destek (+)
    ve itiraz (−) sinyalleri yan yana. "Neden bu" kadar "neden öteki değil" de kanıta dayanır.
  - `showcase-cases.ts` — landing vitrini ve /diagnoz vaka kütüphanesinin TEK kaynağı.
    Landing bu vakaları gerçek `diagnose()` ile çalıştırıp basar; `showcase-cases.test.ts`
    her vakanın beklenen yöntemini sabitler — vitrin sessizce yanlış iddiaya dönüşemez.
  - `methodologies.ts` → `METHODOLOGY_DISCRIMINATION` — her yöntem için ne zaman uygun,
    ne zaman DEĞİL, en çok hangisiyle karıştırılır ve ikisini ayıran soru.
- `src/domain/playbook/` — SAF playbook kataloğu: desteklenen her metodolojinin profesyonel uygulama şablonu (adımlar + yapılandırılmış alanlar). Workspace bu şablondan tohumlanır; AI taslağı ve rapor buna dayanır.
- `src/domain/access/` — SAF erişim çekirdeği. `ownership.ts`: kim hangi kaydı okur/yazar (girdi yalnız `AccessIdentity` + `RecordOwner`). `account-policy.ts`: giriş kararı, jeton geçerliliği/TTL, koltuk limiti, davet ve üyelik kuralları. DB/oturum/e-posta YOK; `lib/account-auth.ts` ve route'lar yalnız uygular.
- `src/application/` — orkestrasyon: `diagnosis-service.ts`, `account-service.ts`, `wiring.ts` (composition root), `ports/` (IAIProvider, IProblemParser, IConversationRepository, IAccountRepository, IPasswordHasher, IEmailSender, IAttachmentStorage)
- `src/infrastructure/` — port uygulamaları: `ai/` (ollama/none), `parser/` (keyword/llm), `persistence/` (in-memory; prisma sonra)
- `src/app/api/diagnosis/` — route handler'lar (ince)
- `src/components/methodology-workspace.tsx` — çalışma alanının **orkestratörü**: yükleme, otomatik kayıt, sekme durumu. Paneller `src/components/workspace/panels/*` altında dosya başına bir bileşendir; paylaşılan parçalar `workspace/panel-kit.tsx`'te. **Yeni panel eklerken ana dosyayı büyütme**, panels/ altına yeni dosya aç.
- `src/proxy.ts` — auth kapısı (Next 16'da `middleware` DEĞİL, `proxy`; Node runtime, `runtime` seçeneği yok)
- `knowledge/*.md` — metodoloji bilgi tabanı (RAG/rapor için, karar için DEĞİL)

## Çalıştırma / kalıcılık
- Out-of-box (Ollama/Postgres'siz): `PARSER=keyword` + `PERSISTENCE=memory`.
- Bu makinede kurulu: `PARSER=llm` (Ollama qwen2.5:7b) + `PERSISTENCE=prisma` (Postgres, db `mdi`).
- Kalıcılık şeması jsonb-kayıt (ConversationRecord/RcaRecord/WorkspaceRecord). Migration: `npx prisma migrate dev`.
- Ek dosya baytları ayrı bir portta: `ATTACHMENT_STORAGE=disk` (varsayılan, tek makine) |
  `postgres` (AttachmentBlob/bytea). **Serverless veya çok örnekli dağıtımda `postgres` şart** —
  yerel disk örnekler arasında paylaşılmaz ve dağıtımda silinir.

## Komutlar
- `npm run dev` · `npm run build` · `npm test` (Vitest) · `npx prisma generate`

## Auth — üç mod
1. **Kapalı:** `APP_PASSWORD` ve `ACCOUNT_AUTH_ENABLED` yoksa auth tamamen kapalıdır
   (out-of-box kurulum bozulmaz).
2. **Tek parola (iç araç):** `APP_PASSWORD` varsa `/giris` üzerinden oturum istenir.
   Oturum çerezi HMAC(APP_PASSWORD) — parola çereze yazılmaz.
3. **Hesap sistemi (SaaS):** `ACCOUNT_AUTH_ENABLED=1`. Kayıt/giriş/doğrulama/davet
   akışları devreye girer; oturum DB'de (`UserSession`, token'ın sha256'sı saklanır).

- **Auth durumunu okuyan sayfa asla statik olmamalı** (`force-dynamic`): statik prerender
  build anındaki durumu dondurur → `/giris → / → /giris` sonsuz döngüsü.

## Kiracılık (hesap sistemi açıkken)
- Roller: `OWNER`/`ADMIN`/`MANAGER` şirketin tümünü görür · `MEMBER` yalnız kendi kaydını ·
  `VIEWER` şirket geneli **salt-okunur**. Bireysel hesap yalnız kişisel kaydını görür.
- Kural `src/domain/access/ownership.ts`'te SAFtır; `ownership.test.ts` rol × sahiplik
  matrisini sabitler — **kiracılık kuralı değişirse önce bu testi güncelle.**
- **Sahiplik kayıt oluşturulurken verilir** (`repo.create(seed, owner)`), sonradan ikinci
  bir yazımla DEĞİL: araya giren hata sahipsiz, kimseye görünmeyen kayıt bırakır.
- `ACCOUNT_AUTH_ENABLED=1` **PERSISTENCE=prisma gerektirir** (sahiplik sütunları yalnız
  Postgres'te). Bellek kalıcılığıyla birlikte kullanılırsa `wiring.ts` açık hata verir.
- Hesap akışları (kayıt/doğrulama/giriş/parola/davet) `application/account-service.ts`'tedir.
  Route'lar incedir: HTTP, çerez ve hız sınırı. **Yeni hesap akışını route'a yazma**, servise ekle —
  `account-service.test.ts` bellek içi depo ile uçtan uca koşar.

## Kurallar
- Arayüz metinleri Türkçe. Karar mantığının tek kaynağı `src/domain/diagnosis/rules.ts`.
- **Marka tek biçimdir: `MDE` — Manufacturing Decision Engine** (domain: manufacturingdecisionengine.com).
  Header, başlık, metadata, e-posta konusu ve dokümanlar bunu kullanır. `MDI_MASTER` ve
  `MDI_GUEST_WORKSPACE` KALICI VERİ DEĞERLERİdir; onları değiştirme, yalnız etiketlerini.
- **Skor terminolojisi:** gösterilen yüzde "güven" ya da başarı olasılığı DEĞİL,
  **karar desteği skoru**dur (kural desteğinin göreli ölçüsü). Arayüzde bu adla anılır.
- `/en` İngilizce genel bakış sayfasıdır (konumlandırma, mimari, ayrım tablosu, TR↔EN sözlük).
  Uygulamanın kendisi Türkçedir; tam i18n yapılmadı — `/en` bunu açıkça söyler.
- Yeni kural/ağırlık değişikliğinde golden-case testleri (`diagnose.test.ts`) kalkandır.
- **SIRALAMA LİDERİ ≠ ÖNERİ.** `recommendation.ts` öneri uygunluğunu ayrı türetir
  (`RECOMMENDED` / `CONTESTED` / `PROVISIONAL` / `INSUFFICIENT_EVIDENCE` /
  `NO_FORMAL_METHOD_NEEDED`). Eşikler sabit değil, yöntemin kendi kanıt profilinden
  gelir. Arayüzde öneri yapılamıyorsa yöntem adı büyük puntoyla BASILMAZ.
- **Kroniklik ≠ varyasyon.** `chronicPerformanceGap` (uzun süre aynı seviyede duran
  ölçülebilir açık) ile `highVariation` (aralıkta oynama) ayrı alanlardır; DMAIC'e
  iki farklı kanıt yolundan bağlanır, SPC varyasyon tarafına duyarlı kalır.
- **Çıkarım sözleşmesi:** `extraction-contract.ts`. Karar motoru serbest metni GÖRMEZ.
  Şüphe kipindeki okumalar (`SUSPECTED`) değer olarak YAZILMAZ — "kök nedenin X
  olduğunu düşünüyoruz" ≠ `rootCauseKnown=true`. Sert kural: bir alanı yanlış
  değerle doldurmak yasak; çıkaramamak güvenlidir.
- **Engineering Validation Suite: `src/domain/diagnosis/validation/`.** Gri bölge üretim
  vakalarıyla motorun ayrım kalitesini ölçer. Vakalar test kodundan AYRI fixture
  dosyalarındadır (bir kalite mühendisi kod bilmeden okuyabilmeli).
  `manufacturing-cases.ts` (development) · `holdout-cases.ts` (**tuning hedefi DEĞİL**) ·
  `mutation-families.ts` · `semantic-edge-cases.ts` · `evidence-cases.ts` ·
  `anti-patterns.test.ts`. Felsefe ve sınırlar: `docs/ENGINEERING_VALIDATION.md`.
  - Bir vaka başarısız olduğunda **puan ekleyerek düzeltme**. Önce kök nedeni sınıflandır
    (ayrıştırma / eksik kural / ağırlık / soru seçimi / **ground truth yanlış olabilir**),
    sonra genellenebilir düzeltme yap.
  - Sert kural tektir: `shouldNotLead` listesindeki bir yöntem lidere geçemez. Birincil
    eşleşme oranı bir METRİKtir, iddia değil — arayüzde başarı yüzdesi olarak sunma.
- **Ayrım kuralları (`D*`) çift yönlüdür.** `discrimination.test.ts` her benzer yöntem çifti
  için iki vaka tutar: yöntemi hak eden VE hak etmeyen. Bir yöntemin ağırlığını yükseltmek,
  ikizinin negatif vakasını bozmadan yapılmalıdır — "doğru seçildi mi" kadar "yanlış olan
  gereksiz tetiklendi mi" de sabitlenir.
- **Kural `because` metinleri arayüzde birinci sınıf içeriktir** (landing vitrini + sonuç
  ekranı). Düz Türkçe cümle yaz; metne gömülü `→` oku kullanma.
- Kiracılık kararının tek kaynağı `src/domain/access/ownership.ts`; erişim kuralını
  route veya sayfa içine kopyalama.
- Playbook alan tipleri (`table`/`fivewhy`/`fishbone`) AYNI veri şeklini (TableRow[]) paylaşır;
  yeni araç eklerken bunu koru — kalıcılık, zod ve AI taslağı tek yoldan akar.

## Arayüz — endüstriyel enstrüman
Bu bir pazarlama sayfası değil, **ölçüm aleti**. Tasarım sözleşmesi `src/app/globals.css`
başındaki blokta; oradaki token'lar renk/çizgi/yüzeyin **tek kaynağıdır**.

- **Ham Tailwind renk sınıfı yazma** (`text-slate-500`, `bg-indigo-50`, `border-red-200`…).
  Token kullan: `text-[var(--muted)]`, `bg-[var(--surface-sunk)]`, `border-[var(--rule)]`.
  Bu sıfıra indirildi; `grep -rE "(text|bg|border)-(slate|indigo|emerald|amber|red)-[0-9]"`
  sonucu **0 kalmalı**.
- **`dark:` varyantı yazma.** Token'lar `prefers-color-scheme` ile zaten iki temayı taşır;
  `dark:` yazmak ikinci bir tema sistemi kurar ve ikisi ayrışır.
- **Arayüz monokromdur; renk yalnız DURUM taşır** (`--st-risk/warn/ok/watch/idle`).
  Vurgu renkle değil kontrastla kurulur. Nötr-vurgu için `.state-ink`.
- **Gösterge rengi değere bağlıdır, etiketine değil**: sıfır olan risk sayacı sessizleşir.
  Sayısal gösterge için `src/components/readout.tsx` (`Readout`/`ReadoutBand`/`ReadoutGroup`);
  ekran başına kendi metrik kartını yazma.
- Yasak: gradyan, `backdrop-filter`, yumuşak gölge, hover'da yükselme (`-translate-y`),
  dekoratif emoji/geometrik glif, metne gömülü `→` oku, pastel hap rozet.
- Rozet `.tag` + `.state-*`; ilerleme `.meter`/`.meter-fill`; yöntem kodu `.code-tag`.
  Uyarı kutusu `.alert` + `.alert-warn|ok|risk|idle`.
- Sayılar mono ve `tabular-nums` — sütun hâlinde hizalanmalı.
