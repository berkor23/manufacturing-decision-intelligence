# Engineering Validation Suite

Bu doküman, Manufacturing Decision Engine'in karar motorunun **neyi kanıtlamaya
çalıştığını** ve bunu **nasıl ölçtüğünü** anlatır.

Kaynak: `src/domain/diagnosis/validation/`

---

## Amaç

Karar motoru için tek soru şudur:

> Benzer görünen metodolojiler arasında gerçekten ayrım yapıyor mu, yoksa
> anahtar kelimelerden yönteme mi atlıyor?

Suite bu soruyu dört başlıkta sınar:

| Alan | Sorulan soru | Dosya |
|---|---|---|
| Gri bölge ayrımı | İki-üç yöntemin makul aday olduğu vakada doğru olan öne çıkıyor mu? | `manufacturing-cases.ts` |
| Genelleme | Kurallar yalnız yazılmış örneklere mi uyuyor? | `holdout-cases.ts` |
| Nedensellik | Karar gerçekten kanıta mı tepki veriyor? | `mutation-families.ts` |
| Anlama | Cümlenin mühendislik anlamı doğru okunuyor mu? | `semantic-edge-cases.ts` |

Ek olarak `anti-patterns.test.ts`, motorun **asla yapmaması gereken**
kısayolları ayrı bir suite altında sabitler.

---

## Test felsefesi: pozitif seçim kadar reddetme

Bir karar destek sisteminin en kolay düştüğü tuzak tek sinyalden yönteme
atlamaktır:

```
müşteri etkisi  → 8D
makine arızası  → TPM
varyasyon       → DMAIC
ara stok        → VSM
yeni proses     → DMADV
iyileştirme     → PDCA
```

Bu kısayollar tek tek makul görünür ve sahada sürekli yapılır. Sistemin değeri
tam olarak bunları **yapmamasında**. Bu yüzden her metodoloji çifti için iki
yönlü vaka çifti tutulur:

- yöntemi **hak eden** vaka (pozitif),
- yöntemi **hak etmeyen** ama yüzeyde ona benzeyen vaka (negatif).

Bir yöntemin ağırlığını yükseltmek, ikizinin negatif vakasını bozmadan
yapılmak zorundadır. Suite bu yüzden bir kalkandır: kalibrasyon yaparken
"doğruyu buldurmak" kadar "yanlışı tetiklememek" de kırılabilir hâle gelir.

### Üç seviyeli ölçüt

Testler bilinçli olarak tek bir katı beklentiye bağlanmaz:

| Seviye | Anlamı | Sertlik |
|---|---|---|
| `mustNotLead` | Bu yöntemler asla lider olamaz | **Sert** — ihlal testi düşürür |
| `mustLead` / `acceptableSecondary` | Lider, beklenen birincil ya da savunulabilir alternatiflerden biri olmalı | Sert |
| `shouldBeTop3` | Beklenen birincil ilk üçte kalmalı | Sert |
| Birincil eşleşme oranı | Tam isabet | **Metrik** — iddiaya dönüşmez |

Gerçekten çift-karakterli bir vakada alternatifin öne geçmesi başarısızlık
değildir; asıl hata, kanıtın açıkça reddettiği bir yöntemin lidere geçmesidir.

---

## Gri bölge vakaları neden tek-cevaplı benchmark'tan iyidir

Tek cevabı açık vakalar ("müşteri şikâyeti geldi, kök neden bilinmiyor")
motorun ayrım kalitesi hakkında bilgi vermez — anahtar kelime eşlemesi de
onları geçer. Suite bu yüzden kasten belirsiz vakalar kullanır:

- Kronik arızalı bir makine **aynı zamanda** sistem kısıtıysa? (TPM × TOC)
- 9 aylık kronik varyasyonun üstüne iki hafta önceki tedarikçi değişimi
  bindiyse? (DMAIC × RCA)
- Standart doküman **var** ama fiilen uygulanmıyorsa? (SDCA × PDCA)

Bu vakalarda doğru cevap çoğu zaman "birini seç" değil, **iki geçerli
yaklaşımın sırasını kurmak**tır. Motor bunu `contested signals` çıktısıyla
yapar ve birleştirme sırasını yazılı olarak verir.

### Çakışma ne zaman ilan edilir

Yalnız skorlar birbirine yakın diye çakışma ilan edilmez. Rakip yöntem üç
koşulu birden karşılamalıdır:

1. **Kendi başına anlamlı pozitif kanıt** — asgari destek eşiğini geçmeli.
2. **Kurallarca bastırılmamış olmalı** — net puanı çökmüş bir yöntem,
   verilen kararla çelişeceği için "eş geçerli ikinci yaklaşım" sayılamaz.
3. **Bağımsız kanıt gövdesi** — kendi kanıt profilinden en az iki boyut
   karşılanmalı. Tek boyut, liderle paylaşılan bağlamın yan ürünü olabilir
   ve ayrı bir problem karakteri göstermez.

---

## Mutation testing: karar neden değişmeli

Bir vakadan **tek bir kanıt** değiştirilir ve kararın gerçekten o kanıta tepki
verdiği gösterilir. Örnek zincir:

| Durum | Kanıt | Beklenen |
|---|---|---|
| Zemin | Makine kronik arızalanıyor, darboğaz değil | TPM |
| Mutasyon 1 | Aynı makine doğrulanmış sistem kısıtı | TOC + TPM çakışması |
| Mutasyon 2 | Arızalar giderildi, kısıt sürüyor | TOC |

Bu, "motor anahtar kelime eşlemiyor, kanıt okuyor" iddiasının en doğrudan
kanıtıdır: cümlelerin çoğu sabitken kararın dönmesi, dönmenin sebebinin o tek
sinyal olduğunu söyler. Ters yönde de kalkandır — bir kural ağırlığı
şişirildiğinde zincir kırılır, çünkü karar artık kanıta değil ağırlığa
bağlanmıştır.

---

## Kanıt yeterliliği: "yeterli kanıt yok" geçerli bir sonuçtur

> "Üretim hattında sorunlar var ve verim düştü."

Bu cümle bir problem karakteri taşımaz: kayıp güvenilirlikten mi, kısıttan mı,
akıştan mı, varyasyondan mı geliyor belli değildir. Motorun buradan kesin bir
metodoloji üretmesi, bilmediğini biliyormuş gibi göstermesi olurdu.

Suite bu vakalarda üç şeyi zorunlu tutar:

- sonuç **doğrulanmış** sayılmaz,
- ayırt edici bir **takip sorusu** sorulur,
- bağımsız destek sayacı düşük kalır.

Ayrıca sorulan sorunun **gerçekten bilgi ürettiği** sınanır: aynı soruya evet
ve hayır yanıtları farklı tablolar bırakmalıdır. Bırakmıyorsa soru boştur.

### Adaptif soru kalitesi

Ölçüt bilinçli olarak "ilk soru tam olarak şu olmalı" değildir; motorun önce
problem ailesini daraltması meşru bir teşhis stratejisidir. Aranan şey, ayırt
edici sorunun motorun **en iyi adayları arasında gerçekten bulunması**:
erişilemeyen bir soru hiçbir turda sorulmaz ve o ayrım hiçbir zaman yapılamaz.

---

## Overfitting kontrolü

Vakalar ikiye ayrılır:

- **Development** — kural düzeltmelerinde bakılan set.
- **Holdout** — düzeltmelerde **hedef alınmayan** set.

Holdout testlerinde yalnız sert kural (yasaklı lider) zorunludur; birincil
eşleşme metrik olarak ayrıca raporlanır. Böylece holdout bir tuning hedefine
dönüşmez ama genelleme kaybı da sessizce gizlenmez.

Bu bir ML benchmark'ı değildir; amaç kuralların yalnız yazılmış örneklere
ezberlenmediğini göstermektir.

---

## Düzeltme disiplini

Bir vaka başarısız olduğunda **doğrudan puan eklenmez**. Önce kök neden
sınıflandırılır:

1. Ayrıştırma (feature extraction) hatası mı?
2. Kanıt eksik mi?
3. Pozitif kural eksik mi?
4. Negatif kural eksik mi?
5. Ağırlık problemi mi?
6. Soru seçimi problemi mi?
7. **Ground truth yanlış mı?**

Yedinci madde gerçek bir seçenektir ve kullanılmıştır: bazı vakalarda motorun
davranışı doğru, beklentinin kendisi gerçekçi değildi. Her düzeltme
genellenebilir olmalıdır; bir vakayı düzeltirken başkasını bozarsa regresyon
suite'i bunu yakalar.

---

## Limitations — bu suite ne DEĞİLDİR

> Validation suite, karar kurallarının tanımlanmış mühendislik vakalarında
> beklenen ayrımları koruyup korumadığını ölçer; **gerçek dünya başarı
> olasılığını temsil etmez.**

Somut olarak:

- **Kalibrasyon değildir.** Oranlar saha sonuçlarıyla karşılaştırılmamıştır.
- **Ground truth mutlak değildir.** Vakalar mühendislik açısından
  savunulabilir biçimde yazılmıştır; başka bir uzman bazı vakalarda farklı
  ama yine savunulabilir bir cevap verebilir. Bu yüzden `acceptableSecondary`
  vardır.
- **Örneklem küçüktür ve seçilidir.** Vakalar gerçek üretim verisinden
  rastgele çekilmemiştir.
- **Ayrıştırma katmanı sınırlıdır.** Semantik testler deterministik yedek
  ayrıştırıcıyı hedefler; dil modeli devredeyken davranış farklılaşabilir.

Bu nedenle sayılar arayüzde bir başarı yüzdesi olarak sunulmaz.

---

## Suite'i çalıştırma

```bash
npx vitest run src/domain/diagnosis/validation
```

Metrikler test çıktısına künye olarak basılır: vaka sayısı, birincil eşleşme,
kabul edilebilir birincil, ilk üçte, yasaklı lider ihlali, çakışma doğruluğu —
development ve holdout için ayrı ayrı.

---

# Phase 2 — Calibration & Abstention

Phase 1 motorun **ayrım** yeteneğini ölçtü. Phase 2 farklı bir soru sorar:

> Motor ne zaman karar vermemesi gerektiğini biliyor mu?

## Ranking neden recommendation değildir

Softmax her zaman bir birinci üretir. Bütün skorlar sıfıra yakınken bile bir
yöntem öne çıkar — bu matematiğin zorunlu sonucudur, kanıtın değil.

Phase 1'de M vakasında (iki yılda ilk kez kırılan sensör kablosu) RCA **net 1
puanla** lider oluyordu. Sıralama doğruydu; ama onu "önerilen metodoloji" diye
sunmak, sistemin bilmediğini biliyormuş gibi göstermesiydi.

Phase 2'de öneri ayrı bir katmandan geliyor (`recommendation.ts`). Hüküm altı
bileşenden türer:

| Bileşen | Sorduğu soru |
|---|---|
| net destek | Liderin ham puanı anlamlı mı? |
| bağımsız kanıt boyutları | Yöntemin KENDİ profilinden kaç boyut karşılandı? |
| kanıt tamamlanma oranı | Gövde ne kadar tam? |
| doğrulanmış cevap sayısı | Yeterince soru yanıtlandı mı? |
| ayrım payı | İkinci adayla arasında fark var mı? |
| çelişki yükü | Yanıtlar birbiriyle tutarlı mı? |

Eşikler kör sabit **değildir**: her yöntemin "anlamlı ayrım" eşiği kendi kanıt
profilinden (`METHOD_EVIDENCE_PROFILES`) okunur. `if (score < 3)` gibi bir
sayı yoktur.

## Abstention neden güvenilir sistem davranışıdır

Beş durum ayrılır:

| Durum | Anlamı |
|---|---|
| `RECOMMENDED` | Yeterli ayırt edici kanıt var |
| `CONTESTED` | İki yaklaşımın da bağımsız güçlü kanıtı var; sıra kurulur |
| `PROVISIONAL` | Aday önde ama kanıt gövdesi tamamlanmadı |
| `INSUFFICIENT_EVIDENCE` | Sıralama var, öneri anlamsız |
| `NO_FORMAL_METHOD_NEEDED` | Bilgi TAM; kapsamlı çalışma gerekmiyor |

Son ikisinin ayrılması kritiktir ve yüzeyde birbirine benzerler:

- **"Hattın performansı düştü."** → bilgi EKSİK. Problem olabilir, seçemeyiz.
- **"Sensör kablosu kırıldı, neden doğrulandı, tekrar yok."** → bilgi TAM.
  Kapsamlı bir metodoloji projesi açmak kaynak israfıdır.

İkisini aynı kefeye koymak, kullanıcıyı ya gereksiz bir projeye sokar ya da
gerçekten eksik olan bilgiyi görmezden gelmesine yol açar.

## DMAIC için kronik performans yolu neden eklendi

Phase 1'de holdout HO6 kaybediliyordu: 18 aydır %4 seviyesinde duran,
ölçülebilir, sürücüleri bilinmeyen bir fire problemi RCA'ya gidiyordu. Sebep,
DMAIC'in tek kanıt yolunun **"yüksek varyasyon"** olmasıydı.

Oysa bu iki ifade aynı şey değildir:

| İfade | Olgu |
|---|---|
| "Son 18 aydır fire %4 civarında." | kronik performans açığı |
| "Fire %1 ile %9 arasında düzensiz değişiyor." | varyasyon davranışı |

Phase 2'de bunlar ayrı alanlar (`chronicPerformanceGap` / `highVariation`) ve
DMAIC'e iki farklı yoldan bağlanır. **Bu, HO6'ya özel bir düzeltme değildir**;
"kronik + ölçülebilir + bilinmeyen sürücü" sahadaki en yaygın Six Sigma
vakasıdır ve motor bunu hiç modellemiyordu.

Yol her kronik vakayı DMAIC'e çevirmesin diye üç kapı vardır:

- adım değişimi / yakın başlangıç varsa → özel neden alanı (RCA / KT),
- kronik kayıp ekipmandaysa → güvenilirlik sistemi (TPM),
- kayıp sistem kısıtından geliyorsa → kısıt yönetimi (TOC).

SPC ise varyasyon ve kontrol-durumu tarafına duyarlı kalır.

## Pair-aware questioning neden gerekli

Bazı yöntemler tek cevaptan değil **kanıt bileşiminden** doğar. TOC için kısıt,
kuyruk, açlık ve kaldıraç sinyalleri birlikte gerekir. Bu yüzden tek-adım bilgi
kazancı miyoptur: ilk kısıt sorusunun anlık etkisi sıfıra yakındır, ama soru
stratejik olarak çok ayırt edicidir.

Soru motoru artık iki modda çalışır:

- **Lider oturmamışsa** → belirsizliği azalt: bilgi kazancı, sonra ilk iki
  adayın puan farkını en çok oynatan soru.
- **Lider oturmuşsa** (kendi kanıt profili tamam ve ayrım payı rahat) → gözden
  kaçan ikinci karakteri ara: henüz hiç kanıtı olmayan bir yöntemin uygunluk
  kapısını açan soru öne geçer.

İkinci modda hangi gizli rakibin öncelikli olduğu, çakışma kataloğundaki
**birlikte görülen yöntem çiftlerinden** okunur — aynı alan bilgisi iki yerde
ayrı ayrı kodlanmaz. Kronik arızalı bir makinenin aynı zamanda kısıt olması
bilinen bir örüntü olduğu için, TPM oturduğunda motor kısıt sorusunu sorar.

## Deterministic parser ve LLM extraction neden ayrı doğrulanıyor

Karar motoru serbest metni hiç görmez:

```
ham metin → çıkarıcı → normalize alanlar → karar motoru
```

Bu ayrım (`extraction-contract.ts`) çıkarıcı değişse de karar davranışının sabit
kalmasını sağlar ve iki yolu ayrı ayrı doğrulanabilir kılar. Aynı 15 fixture:

- her koşuda **deterministik** çıkarıcıya uygulanır (CI),
- `npm run validate:llm` ile **gerçek dil modeline** uygulanır (opsiyonel).

CI'nın başarısı dış bir modele bağlanmaz: model erişilemezse betik nötr sonuç
verir. Ölçüt her iki yolda aynıdır ve kelimesi kelimesine eşleşme değildir:

> **Sert kural:** hiçbir alan YANLIŞ değerle doldurulmamalı.
> **Metrik:** beklenen okumaların kaçı çıkarılabildi.

Çıkaramamak güvenlidir — motor o alanı sorar. Yanlış çıkarmak, kullanıcının
söylemediğini söylemiş gibi göstermektir.

### Epistemik fark korunur

```
"Kök nedenin yanlış hammadde olduğu doğrulandı."          → CONFIRMED
"Sorunun büyük ihtimalle hammaddeden olduğunu düşünüyoruz." → SUSPECTED
```

Şüpheli okumalar **değer olarak yazılmaz**; alan boş bırakılır ve kullanıcıya
sorulur. Kaybolmazlar da: normalizasyon katmanı bunları `withheld` olarak
kaydeder. Şüpheli bir ifadeyi `rootCauseKnown = true` diye okumak, motorun tüm
"önce teşhis" mantığını sessizce devre dışı bırakırdı.

## RCA × KT Problem × KT Karar

Üç ayrı soru, üç ayrı düşünme biçimi:

| Yöntem | Sorduğu soru |
|---|---|
| RCA | Bu sapma **neden** meydana geldi? |
| KT Problem Analizi | **Ne değişti?** Nerede var, nerede yok? |
| KT Karar Analizi | Tanımlı alternatiflerden **hangisini** seçmeliyiz? |

İlk ikisi sık karıştırılır çünkü ikisi de neden arar. Ayrım, elde **ayırıcı bir
karşılaştırma** (IS / IS-NOT) olup olmadığıdır: fark gösterilebiliyorsa hipotez
havuzunu daraltmak, geniş kök neden aramasından hızlı ve ucuzdur; fark
gösterilemiyorsa KT'nin yöntemi çalışmaz.

Üçüncüsü bambaşka bir eksendir ve teşhis vakalarında yükselmemelidir. Arayüzde
`KT Problem` ve `KT Karar` ayrı adlandırılır — bunlar yeni metodolojiler değil,
aynı Kepner-Tregoe çerçevesinin iki alt düşünme biçimidir.

## Holdout disiplini

HO1–HO8 artık saf holdout sayılmaz (Phase 1'de sonuçları görüldü). Phase 2 için
ayrı bir **kör holdout** seti (`blind-holdout-cases.ts`) yazıldı ve kural
geliştirme sırasında hedef alınmadı; sonuç bir kez çalıştırılıp raporlandı.
Başarısız vakalar metriği yükseltmek için tune edilmedi.
