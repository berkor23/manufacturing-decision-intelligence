# Manufacturing Decision Intelligence — Proje Planı

> Bu doküman, vizyon belgesini (`Manufacturing_Decision_Intelligence_Platform.md`)
> **gerçekten bitirilebilir bir iç araç projesine** indirgeyen çalışma planıdır.
> Amaç bir SaaS ürünü değil; çekirdek değeri (doğru metodolojiyi seçtirme) kanıtlayan,
> tek kiracılı, çalışan bir uygulama.
>
> **Mimari sözleşme: `ARCHITECTURE.md`.** Bu proje bir AI chatbot değil,
> **Decision-Engine merkezli bir Manufacturing Diagnosis Engine**'dir. Karar saf/
> deterministik karar motorunda verilir; LLM yalnızca anlama, soru sorma ve rapor yazar.

## Karar Özeti

| Konu | Karar | Not |
|------|-------|-----|
| Amaç | Gerçek kullanılacak iç araç | Tek kiracı, gerçek veriyle |
| Mimari ilke | **Decision-Engine merkezli** | Kararı LLM değil, saf/deterministik karar motoru verir |
| MVP çekirdeği | Teşhis + öneri motoru | Parser → Rule Engine → Adaptive Question → Recommendation + Decision Trace |
| İlk tam modül | RCA (5 Why + Balık kılçığı) | Diğer metodolojiler önce "önerilir" olarak görünür |
| Stack | Next.js + TypeScript | Tek dil, frontend+backend tek projede |
| DB | PostgreSQL + Prisma | Şema/migration hızlı |
| AI | **Ollama (yerel, ücretsiz)** + kural motoru | SaaS değil, ücretli API yok. Sağlayıcı-bağımsız arayüz; ileride Gemini/Claude eklenebilir |
| UI | Tailwind (+ ileride shadcn/ui) | Hazır bileşenler |
| Auth | Yok (başta) | İç araç; ileride basit auth |

**Kapsam dışı (şimdilik):** çok-kiracılık, faturalandırma/planlar, Redis, S3,
ERP/MES/QMS entegrasyonları, dijital ikiz. Bunlar SaaS'a geçiş kararı verilirse eklenir.

## MVP Akışı (Adaptive Diagnosis Loop)

```
1. Problem girişi (serbest metin)
2. Problem Parser (LLM) → StructuredProblem (bilinen alanlar + null'lar)
3. Rule Engine (saf) → metodoloji skorları + güven dağılımı
4. Durma ölçütü değilse → Question Engine en çok bilgi kazandıran alanı seçer
   → LLM alanı doğal Türkçe soruya çevirir → kullanıcı cevabı → parser → (3)'e dön
5. Recommendation + Decision Trace + güven sıralaması
6. (Faz 5) Seçilen metodoloji çalışma alanı — önce RCA
```

Ayrıntı ve gerekçeler: `ARCHITECTURE.md`.

## Fazlar (mimariye göre revize)

### Faz 0 — İskele  *(tamam)*
- [x] Next.js + TS + Tailwind + ESLint kurulumu
- [x] Prisma + zod bağımlılıkları
- [x] Sağlayıcı-bağımsız AI katmanı (Ollama varsayılan)
- [x] `.env.example` ve temel layout/sayfa
- [x] Mimari sözleşme (`ARCHITECTURE.md`) + knowledge iskelesi

### Faz 1 — Domain Çekirdeği (LLM'siz, kalp) ✅
- [x] `features.ts` — DiagnosticFeature kataloğu + StructuredProblem tipi
- [x] `methodologies.ts` — Methodology metadata
- [x] `rules.ts` — deklaratif kural seti (kararın tek doğruluk kaynağı)
- [x] `rule-engine.ts` + `confidence-engine.ts` (softmax + entropi)
- [x] `question-engine.ts` — bilgi kazancı + statik öncelik platosu + durma politikası
- [x] `decision-trace.ts` + `diagnose.ts` fasadı + `index.ts` barrel
- [x] Golden-case regresyon testleri (16/16 geçiyor, `npm test`)

### Faz 2 — Parser + Adaptive Loop + Persistence ✅
- [x] `IProblemParser` portu + keyword (deterministik) + LLM (Ollama, katı zod) uygulamaları
- [x] `IAIProvider` portu + Ollama/None infrastructure (ai.ts port+infra'ya ayrıştı)
- [x] `diagnosis-service.ts` — parse→classify→soru→cevap orkestrasyonu + karar zinciri özeti
- [x] `IConversationRepository` portu + in-memory uygulaması (Postgres'siz çalışır)
- [x] Prisma şeması yeni Conversation modeline güncellendi (migration Postgres'te)
- [x] API: `POST /api/diagnosis`, `POST /api/diagnosis/{id}/answer`, `GET /api/diagnosis/{id}`
- [x] Uçtan uca testler (22/22) + canlı API doğrulaması (8D senaryosu)
- [x] **Prisma repository (Postgres) + kalıcılık** — PERSISTENCE=prisma; jsonb-kayıt
      şeması; veri restart'ta kalıyor (canlı doğrulandı). LLM parser da canlı çalışıyor.

### Faz 3 — UI ✅
- [x] Problem giriş sayfası (`/diagnoz`) + örnek problemler
- [x] Adaptif soru-cevap akışı (Evet/Hayır/Bilmiyorum + serbest metin)
- [x] Canlı güven sıralaması (bar) + entropi göstergesi
- [x] Sonuç ekranı: öneri + **karar zinciri görselleştirme** + güven sıralaması
- [x] Ana sayfa → `/diagnoz` bağlantısı; build + canlı render doğrulandı

### Faz 4 — Knowledge + Rapor ✅
- [x] `IKnowledgeRepository` + `knowledge/*.md` okuyucu (frontmatter parser)
- [x] `ReportService`: LLM raporu (Ollama) + LLM yoksa deterministik rapor
- [x] `POST /api/diagnosis/{id}/report` + sonuç ekranında "Rapor oluştur"
- [x] Canlı doğrulandı (RCA %88 → gerçek Türkçe rapor)

### Genişletme (istek üzerine) ✅
- [x] **13 metodoloji** (yeni: 5S, TPM, Yalın/VSM, DMADV, SPC, Poka-Yoke, TOC)
- [x] **20 teşhis değişkeni** (yeni 9 alan) → soru havuzu ve çeşitliliği büyüdü
- [x] Güven parametreleri 13 metodolojiye ayarlandı (T=1.2, eşik %72, maks 12 soru)
- [x] **Part B — AI Rehber** (`GuideService`, `/api/guide`): seçilen metodolojiyi
      "nasıl uygularım" sorularını knowledge'a dayanarak yanıtlar
- [x] **Part C — Genel uygulama alanı** (`/workspace/{id}`): fazlar knowledge'tan
      tohumlanır, notlar + aksiyonlar + faz başına "AI öneri al" + AI rehber paneli
- [x] Sonuç ekranı: tüm metodolojiler için "Uygulama alanını aç"; RCA'da ek olarak
      özel araçlar (5 Why, balık kılçığı)
- [x] 37 test geçiyor, build/tsc temiz, canlı doğrulandı

### Faz 5 — Metodoloji Çalışma Alanı (RCA) ✅
- [x] `IRcaRepository` + in-memory uygulaması
- [x] `POST /api/rca`, `GET/PATCH /api/rca/{id}`
- [x] `/rca/{id}` UI: 5 Why (kök neden işareti) + Balık kılçığı (6M) + Aksiyonlar
- [x] Sonuç ekranından "RCA çalışma alanını aç" + canlı CRUD doğrulandı

### Faz 5.5 — Playbook Tabanlı Profesyonel Uygulama Alanı ✅
- [x] `src/domain/playbook/` — SAF playbook kataloğu: 13 metodolojinin her biri için
      endüstri formlarını yansıtan adımlar (amaç + profesyonel rehber + yapılandırılmış
      alanlar: metin/tablo). 8D→D1-D8, KT→IS/IS-NOT matrisi, FMEA→S·O·D tablosu vb.
- [x] Workspace modeli `steps` (StepState: values + PENDING/IN_PROGRESS/DONE) +
      `report` alanına geçti; eski `phases` kayıtları otomatik taşınır (migrateLegacy)
- [x] `WorkspaceService.draftStep` — adım başına AI taslağı (LLM: JSON → şemaya zorla
      uydurma, boş alanlara yazar, kullanıcı verisini EZMEZ; LLM'siz: rehber şablonu)
- [x] `WorkspaceService.generateReport` — doldurulan adımlardan profesyonel rapor
      (deterministik markdown + LLM cilası; yönetici özeti)
- [x] API: `POST /api/workspace/{id}/draft`, `POST /api/workspace/{id}/report`
- [x] UI: adım haritası (ilerleme çubuğu + durum rozetleri) · aktif adım formu
      (tablo editörü, profesyonel yaklaşım kutusu, AI taslak) · aksiyon takibi · rapor
- [x] 46 test geçiyor (playbook yapısal + servis davranış testleri), build temiz,
      canlı doğrulandı (DMAIC %84 → 5 adım AI taslağı → tam uygulama raporu)

### Faz 5.6 — Rapor Çıktısı · RCA Araçlarının Birleşmesi · Auth + Liste ✅
- [x] **Rapor dışa aktarma**: bağımlılıksız Markdown→React renderer (`components/markdown.tsx`,
      HTML enjeksiyonu YOK) + `/workspace/{id}/rapor` yazdırılabilir A4 sayfası
      (antet: problem/ilerleme/açık aksiyon + aksiyon tablosu) + `@media print` (`.no-print`)
- [x] **RCA araçları playbook'a gömüldü**: `fivewhy` / `fishbone` alan tipleri —
      `table` ile AYNI veri şeklini (TableRow[]) kullanır, yalnızca sunum farklıdır;
      böylece kalıcılık/zod/AI taslağı tek yoldan akar. 5 Neden zinciri kök-neden
      işaretli, balık kılçığı 6M sütunlu (`normalizeFishboneCategory` TR/EN eş anlamlı).
      Sonuç ekranındaki ayrı "RCA araçları" butonu kaldırıldı (tek dünya).
- [x] **Basit auth**: `APP_PASSWORD` yoksa auth TAMAMEN KAPALI (out-of-box korunur).
      Varsa `src/proxy.ts` (Next 16'da middleware→proxy; Node runtime, `runtime`
      seçeneği Proxy'de kullanılamaz) tüm sayfa/API'yi korur; API'de 401, sayfada
      `/giris`. Oturum çerezi = HMAC(APP_PASSWORD) — parola çereze yazılmaz.
- [x] **Çalışmalar listesi** (`/calismalar`): repo `list()` + devam eden/tamamlanan
      ayrımı, ilerleme çubuğu, açık aksiyon sayısı, rapor kısayolu
- [x] 56 test (yeni: auth 5, playbook araçları 4, list 1), build temiz
- [x] Canlı doğrulandı: RCA %83 → 6M + 5 Neden AI taslağı (kök neden işaretli) →
      rapor → yazdırma sayfası; auth 12/12 kontrol (parola yalnız çalışma anında)
- [x] **Yakalanan hata**: `/giris` statik prerender edilince build anındaki auth
      durumu donuyor → parola build'de yokken çalışırken varsa `/giris → / → /giris`
      sonsuz döngüsü (kimse giriş yapamaz). Çözüm: `force-dynamic` + header'ın
      çerez varlığına bakması. Regresyon riski: auth durumunu okuyan sayfa ASLA statik olmamalı.

### Faz 6 — Öğrenme  ⏸️ (bilinçli ertelendi)
- Neden: kalibrasyon **gerçek kullanım verisi** ister (yok); RAG ağır embedding/vektör
  altyapısı getirir (yalın-yerel ruha aykırı, erken).
- Zemin HAZIR: Conversation/ProblemSnapshot/DiagnosisResult kaydı mevcut.
- [ ] (Veri biriktiğinde) saklanan konuşmalardan ağırlık/T kalibrasyonu
- [ ] (Karar verilince) yerel embedding ile hafif RAG (knowledge → rapor zenginleştirme)

### Backlog
- Diğer metodoloji modülleri · Dashboard · Basit auth → (istenirse) SaaS

## Veri Modeli (özet)

- **Problem** — serbest metin problem, durum, zaman
- **Conversation** — teşhis oturumu + güncel `structuredProblem` (Json)
- **Message** — USER/ASSISTANT/SYSTEM · FREE_TEXT/QUESTION/ANSWER/REPORT · `featureKey?`
- **ProblemSnapshot** — her turun StructuredProblem + ranking anlık görüntüsü (öğrenme için)
- **DiagnosisResult** — chosen + ranking + decisionTrace (Json)
- **RcaAnalysis** vd. — metodoloji çalışma alanı (Faz 5)

Ayrıntı: `ARCHITECTURE.md` §12, `prisma/schema.prisma`.

## Çalıştırma

```bash
npm install
cp .env.example .env    # DATABASE_URL doldur (AI için Ollama varsayılan)
npx prisma migrate dev  # şemayı DB'ye uygula

# AI (yerel, ücretsiz): Ollama kur, sonra:
ollama pull qwen2.5:7b

npm run dev
```
