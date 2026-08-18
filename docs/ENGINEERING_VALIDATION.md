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
