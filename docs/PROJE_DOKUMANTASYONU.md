# Manufacturing Decision Engine — Kapsamlı Proje Dokümantasyonu

> Bu doküman projeyi sıfırdan anlamak isteyen biri için yazıldı. "Ne yapılıyor,
> nasıl yapılıyor, ne kullanılıyor, neden bu şekilde, sonuç ne, arkasındaki
> mantık ne ve o mantık nasıl kullanıldı?" sorularının tamamını yanıtlar.
>
> İlgili belgeler: mimari sözleşme `ARCHITECTURE.md`, çalışma planı `PLAN.md`,
> özgün vizyon `Manufacturing_Decision_Intelligence_Platform.md`, ajan notları `CLAUDE.md`.

---

## İçindekiler

1. [Tek bakışta proje](#1-tek-bakışta-proje)
2. [Amaç ve çözülen problem](#2-amaç-ve-çözülen-problem)
3. [Temel felsefe: "LLM anlar, motor karar verir"](#3-temel-felsefe-llm-anlar-motor-karar-verir)
4. [Uçtan uca ne oluyor? (kullanıcı yolculuğu)](#4-uçtan-uca-ne-oluyor-kullanıcı-yolculuğu)
5. [Katmanlı mimari ve neden böyle](#5-katmanlı-mimari-ve-neden-böyle)
6. [Karar motorunun mantığı (çekirdek)](#6-karar-motorunun-mantığı-çekirdek)
7. [Adaptif soru motoru (bilgi kazancı)](#7-adaptif-soru-motoru-bilgi-kazancı)
8. [Karar zinciri (decision trace)](#8-karar-zinciri-decision-trace)
9. [LLM (Ollama) tam olarak nerede ve nasıl kullanılıyor](#9-llm-ollama-tam-olarak-nerede-ve-nasıl-kullanılıyor)
10. [Parser: serbest metni anlama](#10-parser-serbest-metni-anlama)
11. [Bağlam enjeksiyonu: soruları doğallaştırma](#11-bağlam-enjeksiyonu-soruları-doğallaştırma)
12. [Rapor üretimi](#12-rapor-üretimi)
13. [Seçim sonrası: uygulama alanı ve AI rehber](#13-seçim-sonrası-uygulama-alanı-ve-ai-rehber)
14. [Veri modeli ve kalıcılık](#14-veri-modeli-ve-kalıcılık)
15. [API referansı](#15-api-referansı)
16. [Teknoloji yığını ve her seçimin gerekçesi](#16-teknoloji-yığını-ve-her-seçimin-gerekçesi)
17. [Test stratejisi](#17-test-stratejisi)
18. [Kurulum ve çalıştırma](#18-kurulum-ve-çalıştırma)
19. [Uçtan uca örnek: adım adım bir teşhis](#19-uçtan-uca-örnek-adım-adım-bir-teşhis)
20. [Alınan önemli tasarım kararları ve gerekçeleri](#20-alınan-önemli-tasarım-kararları-ve-gerekçeleri)
21. [Bilinen sınırlar ve açık işler](#21-bilinen-sınırlar-ve-açık-işler)
22. [Sözlük](#22-sözlük)

---

## 1. Tek bakışta proje

**Manufacturing Decision Engine**, üretim/kalite ekiplerinin bir problemi doğal
dille anlattığında; problemi **yapılandıran**, belirsizliği **ölçen**, en çok
bilgi kazandıran **soruları sorarak** belirsizliği azaltan ve sonunda **hangi
problem çözme metodolojisinin** kullanılması gerektiğini **gerekçesi ve güven
skoruyla** öneren bir karar destek sistemidir. Metodoloji seçildikten sonra onu
**uçtan uca uygulatan** çalışma alanları ve **AI destekli bir rehber** de sunar.

Desteklenen **13 metodoloji**: FMEA, Kepner-Tregoe, RCA, 8D, PDCA/A3, DMAIC,
5S, TPM, Yalın/VSM, DMADV, SPC, Poka-Yoke, TOC.

- **Bu bir SaaS ürünü değildir.** Tek kiracılı, yerelde çalışan bir iç araçtır.
- **Ücretli hiçbir API kullanmaz.** Yapay zekâ tarafı yerel **Ollama** ile çalışır.
- **Bu bir chatbot değildir.** Kararı bir sohbet modeli değil, **deterministik bir
  kural motoru** verir; LLM yalnızca "anlama" ve "yazma" için kullanılır.

Durum: çekirdek + genişletmeler uçtan uca çalışıyor. **37 otomatik test** geçiyor,
tip kontrolü ve üretim derlemesi temiz.

---

## 2. Amaç ve çözülen problem

**Problem:** Kuruluşlar çoğu zaman problemi sınıflandırmadan araç seçer. "Elimizde
bir 8D formatı var, her şeyi 8D'ye sokalım" gibi. Oysa yanlış metodoloji, yanlış
soruları sordurur ve zaman kaybettirir.

**İlke:**

> Önce problemi teşhis et. Sonra doğru metodolojiyi öner. Ardından metodolojiyi
> uçtan uca uygulat.

> **Not (akademik dayanak):** Bu yaklaşım, proje kökündeki `makale.txt`'te
> özetlenen "yanlış problem için doğru metodoloji yoktur; önce problemi sınıflandır"
> teziyle birebir örtüşür. Motorun çekirdek 6 sınıfı (FMEA/KT/RCA/8D/PDCA-A3/DMAIC)
> o makaledeki sınıflandırmanın çalışan uygulamasıdır; kalan 7 metodoloji ise
> kapsamı genişletir.

**Sonuç (ne elde ediliyor):** Kullanıcı bir paragraf yazar; sistem birkaç hedefli
soru sorar; çıktı olarak "bu problem için **X metodolojisi** (güven %N), çünkü:
şu → şu → şu" diye **açıklanabilir** bir öneri; ardından yazılı rapor, adım adım
uygulama alanı ve o metodolojiye özel AI rehber verir.

---

## 3. Temel felsefe: "LLM anlar, motor karar verir"

Bu, projenin en önemli mimari kararıdır ve her şeyi şekillendirir. Bir LLM'e "hangi
metodoloji uygun?" deyip cevabına güvenmek kolay olurdu; **ama bunu bilinçli olarak
YAPMIYORUZ**, çünkü LLM halüsinasyon görebilir, deterministik değildir, test edilemez
ve küçük yerel modeller (7B) özellikle güvenilmezdir.

| Görev | Kim yapıyor |
|-------|-------------|
| Serbest metni anlama (→ hangi olgular doğru) | 🤖 LLM (opsiyonel; keyword de olur) |
| Hangi sorunun sorulacağına karar | ⚙️ Deterministik motor |
| Metodoloji seçimi + güven + gerekçe | ⚙️ Deterministik motor |
| Serbest cevabı yorumlama (evet/hayır) | 🤖 LLM (opsiyonel) |
| Rapor yazımı ve uygulama rehberi | 🤖 LLM (opsiyonel; deterministik yedeği var) |

Bu ayrım mimariye **yapısal olarak** dayatıldı: karar mantığı LLM'e, DB'ye veya
arayüze **hiç bağımlı olmayan** saf bir çekirdekte yaşar. LLM'i kapatsan
(`AI_PROVIDER=none`), karar motoru aynı kararı verir.

---

## 4. Uçtan uca ne oluyor? (kullanıcı yolculuğu)

```
1. Kullanıcı problemi serbest metinle yazar.
2. Parser metni yapılandırır → hangi teşhis alanları biliniyor (true), gerisi bilinmiyor (null).
3. Rule Engine bilinen alanlardan metodoloji skorları üretir.
4. Confidence Engine skorları güven yüzdesine (softmax) çevirir; belirsizliği (entropi) hesaplar.
5. Durma ölçütü sağlanmadıysa: Question Engine "en çok bilgi kazandıran" bilinmeyen alanı seçer.
6. O alan doğal Türkçe bir soruya çevrilir (bağlamıyla) ve kullanıcıya sorulur.
7. Kullanıcı cevaplar → Parser cevabı true/false/bilinmiyor'a çevirir → (3)'e dön.
8. Yeterince eminken (ya da soru bittiğinde): Öneri + güven sıralaması + Decision Trace.
9. İsteğe bağlı: LLM rapor üretir; uygulama alanı açılır; AI rehber ile "nasıl uygularım" sorulur.
```

Bu döngü "teşhis yapan doktor" gibidir: her soru bir öncekinin cevabına göre seçilir
ve amacı belirsizliği azaltmaktır — sabit bir anket değildir.

---

## 5. Katmanlı mimari ve neden böyle

Kod dört katmana ayrılır ve **bağımlılıklar daima içeriye, çekirdeğe doğrudur.**

```
src/
  domain/          ← SAF ÇEKİRDEK. Framework/LLM/DB YOK. %100 test edilebilir. KARAR BURADA.
    diagnosis/
      features.ts            Teşhis değişkenleri kataloğu (20 alan) + StructuredProblem
      methodologies.ts       13 metodoloji + metadata
      rules.ts               Deklaratif kural seti — KARARIN TEK DOĞRULUK KAYNAĞI
      rule-engine.ts         Kuralları çalıştırır → skorlar + tetikleme kaydı
      confidence-engine.ts   Skor → softmax güven + Shannon entropi
      question-engine.ts     Bilgi kazancı ile sıradaki soruyu seçer + durma politikası
      decision-trace.ts      Kararın nedenini zincire döker
      context.ts             Soruları deterministik bağlamla sarar
      diagnose.ts            Tek-tur fasadı (dışarı açılan tek kapı)
      index.ts               Public API (barrel)
  application/     ← ORKESTRASYON. domain'i LLM/DB ile birleştirir. Arayüzler (port) burada.
    diagnosis-service.ts     Teşhis döngüsü orkestrasyonu
    report-service.ts        Rapor üretimi
    workspace-service.ts     Uygulama alanı oluşturma (fazları knowledge'tan tohumlar)
    guide-service.ts         Seçim sonrası AI rehber (grounded)
    wiring.ts                Composition root (bağımlılıkları birleştiren tek yer)
    ports/                   IAIProvider, IProblemParser, IConversationRepository,
                             IKnowledgeRepository, IRcaRepository,
                             IMethodologyWorkspaceRepository
  infrastructure/  ← DEĞİŞTİRİLEBİLİR DETAYLAR. Port'ların somut uygulamaları.
    ai/            ollama-provider, none-provider, provider-factory
    parser/        keyword-problem-parser, llm-problem-parser, parser-factory
    persistence/   in-memory-* (conversation, rca, workspace)
    knowledge/     file-knowledge-repository (knowledge/*.md okur)
  app/             ← ARAYÜZ (Next.js). İnce route handler'lar + React sayfaları.
    api/diagnosis/…  api/rca/…  api/workspace/…  api/guide/…
    diagnoz/  rca/[id]/  workspace/[id]/
knowledge/         ← 13 metodoloji bilgi tabanı (rapor/rehber için; KARAR için değil)
prisma/            ← Postgres şeması (kalıcılık ileride bağlanacak)
```

**Neden bu ayrım?** `domain` hiçbir dış şeye bağlı olmadığı için milisaniyede, LLM
olmadan test edilebilir — sistemin kanıtlanabilir kalbidir. LLM ve DB birer
"detaydır"; port üzerinden takılır. Bağımlılık yönü içeri olduğu için
infrastructure'daki bir hata asla karar mantığını bozamaz.

---

## 6. Karar motorunun mantığı (çekirdek)

### 6.1 Teşhis değişkenleri (features) — 20 alan

Motor 20 adet üç-değerli (true / false / **null = bilinmiyor**) değişken üzerinde
akıl yürütür (`features.ts`). null önemlidir: "bilmiyoruz" ile "hayır" farklıdır;
null alan **sorulabilir**. Bilgi ancak açık delil varsa doldurulur ("delil yoksa sor").

**Çekirdek (makaledeki 6 sınıfı ayırt eden) alanlar:**

| Alan | Anlam | Ana sinyal |
|------|-------|-----------|
| `defectOccurred` | Gerçek bir hata mı oluştu, yoksa sadece risk mi? | false → FMEA |
| `customerAffected` | Müşteri etkilendi mi? | true → 8D |
| `rootCauseKnown` | Kök neden biliniyor mu? | false → RCA |
| `startedRecently` | Problem yeni mi başladı? | true → Kepner-Tregoe |
| `previouslyOccurred` | Daha önce de yaşandı mı (tekrar eden)? | true → RCA |
| `processChanged` | Süreç yakın zamanda değişti mi? | KT/RCA |
| `operatorChanged` | Operatör/vardiya değişti mi? | KT/RCA |
| `supplierChanged` | Tedarikçi/malzeme değişti mi? | KT/RCA |
| `hasMeasurementData` | Ölçüm/sayısal veri var mı? | true → DMAIC |
| `highVariation` | Varyasyon yüksek/sürekli mi? | true → DMAIC |
| `isImprovementInitiative` | Akut hata değil, iyileştirme mi? | true → PDCA/A3 |

**Genişletilmiş (yeni 7 metodolojiyi ayırt eden) alanlar:**

| Alan | Anlam | Ana sinyal |
|------|-------|-----------|
| `workplaceDisorganized` | İş yeri düzensiz/organizasyonsuz mu? | true → 5S |
| `equipmentBreakdown` | Ekipman arızası/duruşu var mı? | true → TPM |
| `flowOrWaste` | Akış/israf/temin süresi sorunu mu? | true → Yalın/VSM |
| `isNewDesign` | Yeni ürün/süreç mi tasarlanıyor? | true → DMADV |
| `monitoringNeed` | Süreci sürekli izleme ihtiyacı mı? | true → SPC |
| `humanErrorProne` | İnsan hatası; hata-önleme mi gerekli? | true → Poka-Yoke |
| `bottleneckThroughput` | Dar boğaz/kapasite/çıktı kısıtı mı? | true → TOC |
| `safetyOrRegulatory` | Güvenlik/regülasyon etkisi var mı? | 8D/FMEA'yı yükseltir |
| `intermittent` | Aralıklı/sporadik mi, sürekli mi? | aralıklı→KT/RCA, sürekli→DMAIC/SPC |

Türetilmiş: `anyChange` = süreç/operatör/tedarikçi değişikliklerinden herhangi biri.

### 6.2 Metodolojiler (13)

| Kod | Ad | Ne zaman |
|-----|----|----|
| `FMEA` | Failure Mode and Effects Analysis | Risk var, hata yok — proaktif |
| `KEPNER_TREGOE` | Kepner-Tregoe | Yeni başlayan sapma; genelde bir değişiklik |
| `RCA` | Root Cause Analysis | Kök neden bilinmiyor |
| `EIGHT_D` | 8D | Müşteri etkilendi — containment + kalıcı önlem |
| `PDCA_A3` | PDCA / A3 | Sürekli iyileştirme |
| `DMAIC` | Define-Measure-Analyze-Improve-Control | Veri yoğun, varyasyon yüksek |
| `FIVE_S` | 5S | İş yeri düzensizliği/organizasyon |
| `TPM` | Total Productive Maintenance | Ekipman arızası, makine güvenilirliği |
| `LEAN_VSM` | Yalın / Value Stream Mapping | Akış, temin süresi, israf |
| `DMADV` | Design for Six Sigma | Yeni ürün/süreç tasarımı |
| `SPC` | Statistical Process Control | Stabil süreci izleme/kontrol |
| `POKA_YOKE` | Poka-Yoke | İnsan hatası → hata-önleme |
| `TOC` | Theory of Constraints | Dar boğaz/kapasite/çıktı |

### 6.3 Kural motoru (Rule Engine) — kararın tek kaynağı

Kararı **deklaratif kurallar** verir (`rules.ts`). Her kural bir koşul + bir/birkaç
metodolojiye ağırlıklı skor katkısıdır. Kurallar **yalnızca bilinen** alanlara
bakar; `null` alan hiçbir kuralı tetiklemez. Ağırlıklar birer **konfigürasyondur**
(golden-case testleri kalkanı altında kalibre edilebilir).

**Çekirdek kurallar (makaledeki sınıflandırma):**

| Kural | Koşul | Etki |
|-------|-------|------|
| R1 | `defectOccurred=false` | FMEA +3, RCA −2, 8D −2 |
| R2 | `defectOccurred=true` | RCA +1, 8D +1, FMEA −2 |
| R3 | `customerAffected=true` | 8D +3, RCA +1 |
| R4 | `customerAffected=false` | 8D −2 |
| R5 | `rootCauseKnown=false` | RCA +2, 8D +1 |
| R6 | `rootCauseKnown=true` | RCA −2 |
| R7 | `startedRecently` **ve** `anyChange` | KT +3 |
| R7b | `startedRecently=true` | KT +1 |
| R8 | `previouslyOccurred=true` | RCA +2, KT −1 |
| R9 | `hasMeasurementData` **ve** `highVariation` | DMAIC +4 |
| R10 | `highVariation=true` | DMAIC +2 |
| R11 | `isImprovementInitiative=true` | PDCA/A3 +3, FMEA −2, RCA −1, 8D −1 |

**Genişletilmiş kurallar:**

| Kural | Koşul | Etki |
|-------|-------|------|
| N1 | `workplaceDisorganized=true` | 5S +4, RCA −1 |
| N2 | `equipmentBreakdown=true` | TPM +4 |
| N2b | `equipmentBreakdown` **ve** `previouslyOccurred` | TPM +2 |
| N3 | `flowOrWaste=true` | Yalın/VSM +4 |
| N4 | `isNewDesign=true` | DMADV +5, RCA −2, 8D −3, FMEA −1 |
| N5 | `monitoringNeed=true` | SPC +4, DMAIC −1 |
| N6 | `humanErrorProne=true` | Poka-Yoke +4, FMEA +1 |
| N7 | `bottleneckThroughput=true` | TOC +4 |
| N8 | `safetyOrRegulatory=true` | 8D +2, FMEA +1 |
| N9 | `intermittent=true` | KT +1, RCA +1 |
| N10 | `intermittent=false` | DMAIC +1, SPC +1 |

`evaluateRules(problem)` skorları üretir ve tetiklenen kuralları (`RuleFiring[]`)
kaydeder; bu kayıtlar güven ve karar zinciri için kullanılır.

### 6.4 Güven motoru (Confidence Engine)

Skorlar **softmax** ile güven dağılımına çevrilir (`confidence-engine.ts`):

```
güven_i = exp(skor_i / T) / Σ_j exp(skor_j / T)
```

- `T` (sıcaklık) = **1.2**. 13 metodoloji ile softmax seyreldiği için (daha çok
  sınıf → payda büyür) lider daha net olsun diye 1.5'ten 1.2'ye çekildi.
- Softmax negatifleri de işler ve toplamı 1 olan bir dağılım verir.

**Belirsizlik ölçüsü — entropi:** `H = −Σ p_i·log₂(p_i)` (bit). Hiçbir şey
bilinmiyorken maksimumdur (`log₂13 ≈ 3.70 bit`); dağılım keskinleştikçe düşer.

**Dürüst uyarı — kalibrasyon:** Bu yüzdeler *göreli güven*tir, kalibre olasılık
değil. Kullanıcıya "göreli uygunluk" olarak sunulur; gerçek veri biriktiğinde
(Faz 6) kalibre edilecektir.

---

## 7. Adaptif soru motoru (bilgi kazancı)

Amaç: **en az soruyla en çok belirsizlik azaltmak** (`question-engine.ts`).

### 7.1 Sıradaki soru — beklenen bilgi kazancı

Her bilinmeyen alan `f` için:
```
IG(f) = H(mevcut) − [ P(f=true)·H(f=true iken) + P(f=false)·H(f=false iken) ]
```
Her alan iki değer için "sanki cevaplanmış" gibi yeniden sınıflandırılıp entropi
hesaplanır (değer önseli 0.5/0.5). En yüksek IG'li alan sorulur.

### 7.2 Miyopi platosu ve statik öncelik yedeği

Tek-adım IG miyoptur: bir metodolojiyi ancak İKİ alan birlikte tetikliyorsa
(DMAIC = veri **ve** varyasyon), hiçbiri tek başına bilgilendirici görünmez; hatta
yeni bir rakip hipotez ekleyip entropiyi artırıp **negatif IG** verebilir. Çözüm:
IG platosunda (hepsi ~0) **statik teşhis önceliğine** (bir alanın kurallardaki en
büyük mutlak ağırlığı) düşülür. Sıralama:
```
1) max(IG,0) azalan  2) statik öncelik azalan  3) sabit alan sırası
```

### 7.3 Durma politikası

Şu koşullardan **biri** sağlanınca soru biter:
- Lider **mutlak** güven ≥ **0.72** (13 metodolojiyle seyrelen dağılıma göre), **veya**
- Sorulacak (bilinmeyen, ilgili, dışlanmamış) alan kalmadı, **veya**
- Soru bütçesi doldu: en fazla **12** soru (zengin havuza izin verir).

*Saf marj* ve *düşük-IG ile durma* bilinçli olarak kullanılmaz (yanıltıcı / erken
kapatıcı). Cevabı "bilinmiyor" gelen alan `askedFeatures`'a eklenir, bir daha
sorulmaz (sonsuz döngü önlenir).

> **"Daha çeşitli soru" bunun sonucudur:** 20 değişken + 13 metodoloji → dağılım
> daha geç keskinleşir → probleme özgü, birbirinden farklı sorular sorulur.

---

## 8. Karar zinciri (decision trace)

Karar deterministik üretildiği için nedeni de otomatik üretilir
(`decision-trace.ts`). Kazanan metodolojiye pozitif katkı yapan kurallar, katkı
büyüklüğüne göre sıralanıp gerekçe zincirine dönüştürülür:

```
Müşteri etkilendi (+3) → Gerçek bir hata oluştu (+1) → Kök neden bilinmiyor (+1)
   → Bu nedenle: 8D (güven %63)
```

Kaynağı domain'dir, LLM değil. Sistem kara kutu değildir; "neden bu metodoloji?"
her zaman görülür.

---

## 9. LLM (Ollama) tam olarak nerede ve nasıl kullanılıyor

**Model:** yerel **Ollama** + **`qwen2.5:7b`** (4.7 GB, RTX 3060'da ~9 sn/istek).
Ücret yok, veri bilgisayardan çıkmaz. LLM bir **port** (`IAIProvider`) arkasındadır;
provider "aptaldır" (metin girer, metin çıkar), promptlar servislerdedir.

LLM yalnızca karar-dışı görevlerde kullanılır:
1. **Başlangıç parse'ı** — serbest metni yapılandırılmış alanlara çevirme.
2. **Cevap yorumlama** — serbest cevabı true/false/bilinmiyor'a çevirme.
3. **Rapor yazımı** — karar zinciri + knowledge'tan Türkçe rapor.
4. **AI rehber** — seçilen metodoloji hakkında "nasıl uygularım" sorularını yanıtlama.

Hepsinde LLM yoksa **deterministik yedek** vardır. `AI_PROVIDER=none` ile sistem
tamamen LLM'siz çalışır (keyword parser + deterministik rapor/rehber).

---

## 10. Parser: serbest metni anlama

Parser bir **port**tur (`IProblemParser`), iki uygulaması vardır:

- **Keyword parser (deterministik, varsayılan):** Türkçe anahtar kelime/regex
  eşlemesi (`keyword-problem-parser.ts`). 20 değişkenin tamamı için sinyaller içerir.
  Ollama'sız çalışır, testlerde deterministiktir, her zaman güvenli yedektir.
- **LLM parser (Ollama):** metni modele verir; çıktı **zod** ile doğrulanır.
  **Kritik ilke — sadece pozitif kanıt:** zayıf model bahsedilmeyen alanlar için
  güvenilmez `false` üretebildiğinden, ilk parse'ta yalnızca `true` değerler kabul
  edilir; gerisi `null` kalıp sorulur. Bu, yanlış negatifleri eler ve adaptif akışı
  korur.

`PARSER=keyword | llm | auto`. Cevap yorumlama her iki parserda da vardır.

---

## 11. Bağlam enjeksiyonu: soruları doğallaştırma

Sorular şablondur (sabit, uzman-onaylı Türkçe temalar) ama doğallık için problem
bağlamı **deterministik** (LLM'siz) enjekte edilir (`context.ts`):
`detectProcessName` metinden süreci saptar; `contextualizeQuestion` soruyu sarar:
`"kaynak hattı" konusundaki bu problem için — Müşteri etkilendi mi?`

**Neden LLM'e yazdırmıyoruz?** Her soru belirli bir alana bağlıdır; LLM serbest
üretirse anlamı kayabilir ve cevap-eşlemesi sessizce bozulur. Anlamı asla LLM'e
bırakmayız; yalnızca sunumu zenginleştiririz.

---

## 12. Rapor üretimi

`ReportService` sonuçlanmış teşhisten Türkçe rapor üretir. LLM varsa problem +
metodoloji + karar zinciri + knowledge'tan akıcı rapor; yoksa aynı bilgilerden
deterministik rapor. Bölümler: Problem Özeti, Önerilen Metodoloji ve Gerekçe,
Önerilen İlk Adımlar.

**Knowledge katmanı:** `knowledge/*.md` (13 dosya) her metodoloji için frontmatter
(kod, ad, whenToUse, tools, phases) + gövde içerir. `FileKnowledgeRepository` okur.
Karar mantığı **koddaki** `rules.ts`'te yaşar; knowledge yalnızca insan/rapor/rehber
içindir (aynanın kendisi karar vermez).

---

## 13. Seçim sonrası: uygulama alanı ve AI rehber

Metodoloji seçildikten sonra iki tamamlayıcı yetenek devreye girer.

### 13.1 Genel uygulama alanı (`/workspace/{id}`)
- `WorkspaceService` bir çalışma alanı oluşturur; **fazlar, o metodolojinin
  knowledge dosyasından otomatik tohumlanır** (ör. TPM → Mevcut durum/OEE →
  Otonom bakım → Planlı bakım → İyileştirme → Standart).
- Her faz için not alanı + **✨ AI öneri al** (o faza özel somut adımlar üretir).
- Aksiyon listesi (sorumlu + durum). Tüm 13 metodoloji için çalışır.

### 13.2 RCA özel araçları (`/rca/{id}`)
RCA seçildiğinde ek olarak özel araçlar: **5 Neden** (kök neden işaretleme),
**Balık Kılçığı (6M)**, **Aksiyonlar**.

### 13.3 AI Rehber (`GuideService`, `/api/guide`)
Uygulama alanının içinde bir panel: "nasıl uygularım, ne kullanırım, ilk adım ne,
en sık hata ne?" gibi soruları **o metodolojinin knowledge'ına dayanarak** (grounded,
uydurmasız) yanıtlar. LLM yoksa knowledge özetini döndürür.

---

## 14. Veri modeli ve kalıcılık

**Kalıcılık bir porttur** (`IConversationRepository`, `IRcaRepository`,
`IMethodologyWorkspaceRepository`). İki uygulama vardır ve `PERSISTENCE` env ile
seçilir: **`prisma`** (PostgreSQL — kalıcı) veya **`memory`** (in-memory — Ollama/
Postgres gerektirmez). Postgres yolu kuruldu ve doğrulandı: veriler sunucu yeniden
başlatıldığında kalır. Şema **jsonb-kayıt** tabanlıdır: her aggregate tek satırda
`data: Json` olarak (`ConversationRecord`, `RcaRecord`, `WorkspaceRecord`) —
repository get/save desenine birebir uyar, ilişkisel eşleme riski olmadan kalıcılık.

**Conversation aggregate:** `Conversation` (güncel `structuredProblem`, `status`,
`questionsAsked`, `askedFeatures`, `pendingFeature`, `messages`, `result`),
`ConversationMessage`, `DiagnosisResultRecord`.

**Prisma şeması (`prisma/schema.prisma`):** `Problem`, `DiagnosisConversation`,
`Message`, `ProblemSnapshot` (öğrenmeye zemin), `DiagnosisResult`, ve RCA tabloları.
Evrilen yapılar (structuredProblem, ranking, trace) `Json`/`jsonb`; uygulama sınırında
zod ile tiplenir.

---

## 15. API referansı

| Metot | Yol | Görev |
|-------|-----|------|
| `POST` | `/api/diagnosis` | Teşhis başlat. Body `{text}`. |
| `POST` | `/api/diagnosis/{id}/answer` | Soruya cevap. Body `{text}`. |
| `GET` | `/api/diagnosis/{id}` | Durumu getir. |
| `POST` | `/api/diagnosis/{id}/report` | Rapor üret. |
| `POST` | `/api/rca` | RCA özel çalışma alanı oluştur. |
| `GET/PATCH` | `/api/rca/{id}` | RCA getir/güncelle. |
| `POST` | `/api/workspace` | Genel uygulama alanı oluştur. Body `{methodology, problemDescription, conversationId?}`. |
| `GET/PATCH` | `/api/workspace/{id}` | Uygulama alanı getir/güncelle (fazlar + aksiyonlar). |
| `POST` | `/api/guide` | AI rehber. Body `{methodology, question, problemDescription?}`. |

**Arayüz sayfaları:** `/` (tanıtım), `/diagnoz` (teşhis), `/rca/{id}` (RCA araçları),
`/workspace/{id}` (uygulama alanı + AI rehber).

---

## 16. Teknoloji yığını ve her seçimin gerekçesi

| Katman | Seçim | Neden |
|--------|-------|-------|
| Uygulama | **Next.js 16 + TypeScript** | Frontend + backend tek dil; iç araçta en hızlı yol. |
| UI | **Tailwind CSS v4** | Hazır, tema-duyarlı arayüz. |
| Doğrulama | **zod** | API sınırında ve LLM çıktısında katı şema. |
| AI | **Ollama** + `qwen2.5:7b` | Yerel, ücretsiz, veri gizli. Ücretli API yok. |
| DB | **PostgreSQL + Prisma v6** | Şema hazır; kalıcılık sırada. v6 çünkü v7 Node 22.12+ ister. |
| Test | **Vitest v2** | Hızlı, TS-native. v2 çünkü v3 (rolldown) Node 21.7+ ister. |
| Çalışma zamanı | **Node.js 21** | Mevcut ortam; Prisma/Vitest sürümleri buna göre sabitlendi. |

Kasıtlı dışarıda bırakılanlar (bu aşamada): çok-kiracılık, faturalandırma, Redis,
S3, ERP/MES/QMS entegrasyonları, harici embedding/vektör DB (RAG), auth.

---

## 17. Test stratejisi

Domain saf ve deterministik olduğu için **golden-case regresyon suiti** kuruldu.
Toplam **37 test** (LLM/DB olmadan, saniyeler içinde):

- **Karar motoru (`diagnose.test.ts`):** softmax toplamı 1, entropi maksimumu
  (log₂13), ve **her metodoloji için etiketli senaryo → beklenen sonuç** (6 çekirdek
  + 7 yeni: 5S, TPM, Yalın/VSM, DMADV, SPC, Poka-Yoke, TOC); adaptif döngü yakınsaması.
- **Bağlam (`context.test.ts`):** süreç adı saptama, yanlış pozitif olmaması,
  bağlamsallaştırmanın anlamı koruması.
- **Servis (`diagnosis-service.test.ts`):** uçtan uca başlat→soru→cevap→sonuç;
  belirsiz cevapta sonsuz döngü olmaması; kalıcılık; soruların bağlamla sarılması.

Bu suit, kural ağırlıklarını değiştirirken **regresyon kalkanıdır.** `npm test` koşar.

---

## 18. Kurulum ve çalıştırma

```bash
npm install

# (Opsiyonel) yerel LLM
ollama pull qwen2.5:7b        # Ollama kurulu olmalı

# (Opsiyonel) .env: PARSER=keyword|llm|auto · AI_PROVIDER=ollama|none · PERSISTENCE=memory

npm run dev                   # http://localhost:3000/diagnoz
npm test                      # Vitest (37 test)
npm run build                 # üretim derlemesi + tip kontrolü
```

Sistem **kutudan çıktığı gibi Ollama ve Postgres olmadan çalışır** (keyword parser +
in-memory). Ollama kurulunca `PARSER=llm` ile gerçek doğal dil anlama devreye girer.

**Ortam notları:** Geliştirme sunucusu D: sürücüsünde yavaş olabilir (soğuk başlangıç
~50 sn). Servisler `globalThis` singleton olduğundan, kod değişince HMR yetmez — dev
sunucusunu tam yeniden başlatmak gerekir.

---

## 19. Uçtan uca örnek: adım adım bir teşhis

**Girdi:** "Müşteriden şikayet geldi, üründe çatlak var ve kök neden bilinmiyor."

**1) Parse →** yalnızca doğrulanan olgular: `defectOccurred=true`,
`customerAffected=true`, `rootCauseKnown=false`. (Diğer 17 alan `null`.)

**2) Rule Engine — tetiklenen kurallar:**
- R2 (`defectOccurred=true`): RCA +1, 8D +1, FMEA −2
- R3 (`customerAffected=true`): 8D +3, RCA +1
- R5 (`rootCauseKnown=false`): RCA +2, 8D +1

**Skorlar:** 8D = **5**, RCA = **4**, FMEA = **−2**, diğer 10 metodoloji = **0**.

**3) Confidence (softmax, T=1.2, 13 sınıf):**
```
exp(5/1.2)=64.6  exp(4/1.2)=28.0  exp(0)=1 (×10)  exp(−2/1.2)=0.19
toplam ≈ 102.8
8D  = 64.6/102.8 ≈ %63
RCA = 28.0/102.8 ≈ %27
diğerleri ≈ %1  ·  FMEA ≈ %0.2
```

**4) Karar:** Lider **8D %63**.

**5) Karar zinciri:**
`Müşteri etkilendi (+3) → Gerçek bir hata oluştu (+1) → Kök neden bilinmiyor (+1) →
Bu nedenle: 8D (%63)`

**6) Devam:** Güven %63 < %72 eşiği olduğundan motor en bilgilendirici soruyu sorar.
Sonuçlanınca: rapor üretilebilir, **uygulama alanı** açılabilir (8D fazları) ve
**AI rehber**e "8D'yi nasıl uygularım?" sorulabilir.

---

## 20. Alınan önemli tasarım kararları ve gerekçeleri

1. **SaaS değil, iç araç.** Odak çekirdek değer.
2. **Ücretli API yok → yerel Ollama.** Sağlayıcı-bağımsız port ile değiştirilebilir.
3. **Decision-Engine merkezli.** Karar saf domain'de; LLM'i söksen bile çalışır.
4. **Kararı ağırlıklı skor + softmax verir** (rijit if/else değil). Örtüşmeleri güvenle
   yönetir ve doğal güven skoru üretir.
5. **Adaptif sorular bilgi kazancıyla seçilir**; miyopi için statik öncelik yedeği.
6. **Durmada saf marj ve düşük-IG kullanılmadı** (yanıltıcı/erken kapatıcı).
7. **Sorular şablon + deterministik bağlam** (LLM'e yazdırılmadı) — anlam kaymasını önlemek.
8. **LLM parser yalnızca pozitif kanıt kabul eder** — yanlış negatifleri elemek için.
9. **Knowledge karar vermez** — tek doğruluk kaynağı koddaki kurallar.
10. **13 metodolojiye genişleme** — makaledeki 6 çekirdeği koruyup 7 tamamlayıcı ekledik;
    softmax seyrelmesi için T=1.2, eşik %72, maks 12 soru olarak ayarlandı.
11. **Prisma v6 ve Vitest v2 sabitlendi** — Node 21 uyumu için.
12. **Faz 6 (öğrenme/RAG) ertelendi** — gerçek veri yokken kalibrasyon anlamsız.

---

## 21. Bilinen sınırlar ve açık işler

**Sınırlar:**
- Güven yüzdeleri kalibre değil (göreli).
- LLM parser (7B) bazen dilbilgisi/çıkarımda kusurlu olabilir; karar bundan etkilenmez.

**Açık işler (öncelik sırasına yakın):**
- Dashboard (açık problemler, metodoloji dağılımı, çözüm süresi) — jsonb üzerinde sorgulanabilir.
- Rapor PDF/Excel export.
- Diğer metodolojilere özel çalışma alanları (8D → D1-D8, FMEA → RPN); genel alan
  hepsini işlevsel karşılıyor, bunlar iyileştirmedir.
- `knowledge/*.md` içeriklerinin zenginleştirilmesi; apaçık evet/hayır'da LLM'i atlama.
- **Faz 6:** saklanan konuşmalardan ağırlık/T kalibrasyonu + yerel embedding ile hafif RAG.

---

## 22. Sözlük

- **StructuredProblem:** 20 teşhis alanının true/false/null değerleri + açıklama + süreç adı.
- **Feature:** Motorun akıl yürüttüğü üç-değerli olgu (ör. `equipmentBreakdown`).
- **Rule Engine:** Kuralları çalıştırıp metodoloji skorları üreten saf motor.
- **Confidence:** Skorların softmax ile 0–1 olasılığa çevrilmiş hali.
- **Entropi:** Güven dağılımının belirsizliği (bit).
- **Information Gain:** Bir sorunun ortalamada entropiyi ne kadar düşüreceği.
- **Decision Trace:** Kural tetiklemelerinden üretilen gerekçe zinciri.
- **Port / Adapter:** Arayüz + somut uygulama. LLM, DB, parser, knowledge birer porttur.
- **Composition Root (`wiring.ts`):** Bağımlılıkların birleştiği tek yer.
- **Golden case:** Beklenen sonucu bilinen, regresyon kalkanı test senaryosu.

---

*Bu doküman projenin mevcut durumunu (13 metodoloji, 20 değişken, AI rehber +
uygulama alanları dahil) yansıtır. Kod değiştikçe güncellenmelidir.*
