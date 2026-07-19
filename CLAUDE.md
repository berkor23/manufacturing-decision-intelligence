# Manufacturing Decision Intelligence

Üretim/kalite ekipleri için AI destekli karar destek aracı. İlke:
**önce problemi teşhis et, doğru metodolojiyi öner (FMEA/KT/RCA/8D/PDCA/DMAIC),
sonra uçtan uca uygulat.** SaaS değil; tek kiracılı iç araç.

Mimari sözleşme: `docs/ARCHITECTURE.md` · Plan ve fazlar: `docs/PLAN.md` · Vizyon: `docs/Manufacturing_Decision_Intelligence_Platform.md`

**Kimlik:** AI chatbot değil, **Decision-Engine merkezli** bir teşhis motoru. Kararı LLM değil, saf/deterministik domain motoru verir. LLM yalnızca anlama/soru/rapor.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind v4
- PostgreSQL + Prisma **v6** (Node 21 ile uyumlu; v7'ye geçme — Node 22.12+ ister)
- Test: **Vitest v2** (`npm test`; v3 rolldown Node 21'de çalışmaz)
- AI: sağlayıcı-bağımsız (`IAIProvider`). Varsayılan Ollama (yerel, ücretsiz). Ücretli API yok.

## Katmanlı yapı (bağımlılık içeri doğru)
- `src/domain/diagnosis/` — SAF çekirdek: features, rules, rule-engine, confidence-engine, question-engine, decision-trace, diagnose (fasad). LLM/DB YOK. `index.ts` barrel.
- `src/domain/playbook/` — SAF playbook kataloğu: 13 metodolojinin profesyonel uygulama şablonu (adımlar + yapılandırılmış alanlar). Workspace bu şablondan tohumlanır; AI taslağı ve rapor buna dayanır.
- `src/application/` — orkestrasyon: `diagnosis-service.ts`, `wiring.ts` (composition root), `ports/` (IAIProvider, IProblemParser, IConversationRepository)
- `src/infrastructure/` — port uygulamaları: `ai/` (ollama/none), `parser/` (keyword/llm), `persistence/` (in-memory; prisma sonra)
- `src/app/api/diagnosis/` — route handler'lar (ince)
- `src/proxy.ts` — auth kapısı (Next 16'da `middleware` DEĞİL, `proxy`; Node runtime, `runtime` seçeneği yok)
- `knowledge/*.md` — metodoloji bilgi tabanı (RAG/rapor için, karar için DEĞİL)

## Çalıştırma / kalıcılık
- Out-of-box (Ollama/Postgres'siz): `PARSER=keyword` + `PERSISTENCE=memory`.
- Bu makinede kurulu: `PARSER=llm` (Ollama qwen2.5:7b) + `PERSISTENCE=prisma` (Postgres, db `mdi`).
- Kalıcılık şeması jsonb-kayıt (ConversationRecord/RcaRecord/WorkspaceRecord). Migration: `npx prisma migrate dev`.

## Komutlar
- `npm run dev` · `npm run build` · `npm test` (Vitest) · `npx prisma generate`

## Auth (iç araç)
- `APP_PASSWORD` **yoksa auth tamamen kapalıdır** (out-of-box kurulum bozulmaz); varsa
  `/giris` üzerinden oturum istenir. Oturum çerezi HMAC(APP_PASSWORD) — parola çereze yazılmaz.
- **Auth durumunu okuyan sayfa asla statik olmamalı** (`force-dynamic`): statik prerender
  build anındaki durumu dondurur → `/giris → / → /giris` sonsuz döngüsü.

## Kurallar
- Arayüz metinleri Türkçe. Karar mantığının tek kaynağı `src/domain/diagnosis/rules.ts`.
- Yeni kural/ağırlık değişikliğinde golden-case testleri (`diagnose.test.ts`) kalkandır.
- Playbook alan tipleri (`table`/`fivewhy`/`fishbone`) AYNI veri şeklini (TableRow[]) paylaşır;
  yeni araç eklerken bunu koru — kalıcılık, zod ve AI taslağı tek yoldan akar.
