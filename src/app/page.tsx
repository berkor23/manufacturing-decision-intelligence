import Link from "next/link";
import {
  METHODOLOGIES,
  METHODOLOGY_META,
  METHODOLOGY_DISCRIMINATION,
  type Methodology,
} from "@/domain/diagnosis/methodologies";
import { showcaseCase } from "@/domain/diagnosis/showcase-cases";
import { ShowcaseDiagnosis } from "@/components/showcase-diagnosis";

/* ═══════════════════════════════════════════════════════════════════════════
   Landing sayfası.

   Buradaki tek iş sistemi ANLATMAK değil GÖSTERMEKtir. Sayfanın omurgası iki
   canlı teşhis bloğudur: biri net bir vaka, diğeri kasten gri bölgede bir vaka.
   Her ikisi de saf karar motoruyla sayfa render edilirken çalıştırılır — ekran
   görüntüsü ya da elle yazılmış örnek çıktı yoktur.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Karar motorunun boru hattı — madde madde, tek yön. */
const PIPELINE = [
  {
    t: "Problemin yapılandırılması",
    d: "Serbest metin okunur ve üç değerli teşhis değişkenlerine (evet / hayır / bilinmiyor) çevrilir. Burada karar verilmez, yalnızca alan doldurulur.",
  },
  {
    t: "Ayırt edici soru seçimi",
    d: "Bilinmeyen her alan için beklenen bilgi kazancı hesaplanır; belirsizliği en çok azaltan soru sorulur. Uzun bir anket değil, hipotezleri ayıran sorular.",
  },
  {
    t: "Kural değerlendirmesi",
    d: "Yalnızca BİLİNEN alanlara bakan açık kurallar çalıştırılır. Her kural hangi yöntemi ne kadar desteklediğini ya da ne kadar geri ittiğini yazılı olarak taşır.",
  },
  {
    t: "Kanıt yeterlilik kapısı",
    d: "Her yöntemin karşılaması gereken bağımsız kanıt boyutları vardır. Boyutlar tamamlanmadan yüksek skor tek başına sonucu doğrulanmış saymaz.",
  },
  {
    t: "Çelişki ve çakışma denetimi",
    d: "Birbiriyle tutarsız yanıtlar ve aynı anda iki yöntemi hak eden kanıt gövdeleri ayrıca işaretlenir.",
  },
  {
    t: "Öneri, gerekçe ve alternatifler",
    d: "Birincil yöntem; onu destekleyen kanıtlar, ona itiraz eden sinyaller ve elenen yöntemlerin gerekçesiyle birlikte sunulur.",
  },
];

/** Yüzeyde benzeyen yöntem çiftleri ve onları ayıran tek soru. */
const DISCRIMINATION_PAIRS: [Methodology, Methodology][] = [
  ["RCA", "DMAIC"],
  ["TPM", "TOC"],
  ["TOC", "LEAN_VSM"],
  ["SPC", "DMAIC"],
  ["SDCA", "PDCA_A3"],
  ["FMEA", "DMADV"],
  ["EIGHT_D", "RCA"],
];

const PAIR_QUESTION: Record<string, string> = {
  "RCA|DMAIC":
    "Sapma belirli bir tarihten sonra mı başladı, yoksa uzun süredir aynı biçimde mi dalgalanıyor?",
  "TPM|TOC":
    "Makine arızalanmadığı zamanlarda da toplam sistem çıktısını sınırlıyor mu?",
  "TOC|LEAN_VSM":
    "Performansı esas olarak tek bir sistem kısıtı mı sınırlıyor, yoksa kayıplar akış boyunca dağınık mı?",
  "SPC|DMAIC":
    "Proses bugün yeterli mi — amaç varyasyonun nedenini bulmak mı, kazanılmış seviyeyi korumak mı?",
  "SDCA|PDCA_A3":
    "Aynı işi herkes aynı şekilde mi yapıyor; iyileştirilecek kararlı bir taban var mı?",
  "FMEA|DMADV":
    "Mevcut bir prosesin riskini mi değerlendiriyoruz, yoksa sıfırdan yeni bir şey mi tasarlıyoruz?",
  "EIGHT_D|RCA":
    "Müşteriyi korumak için şu an geçici bir önlem gerekiyor mu; olay tekrar ediyor mu?",
};

/** Mimarî katmanlar — teknik olmayan okur için de anlaşılır kalmalı. */
const ARCHITECTURE = [
  {
    t: "Saf karar çekirdeği",
    d: "Kurallar, skorlama, soru seçimi ve karar izi tek bir bağımsız katmanda toplanır. Bu katmanda ne dil modeli ne veritabanı vardır; aynı girdi her zaman aynı çıktıyı verir.",
  },
  {
    t: "Dil modelinin sınırlı görevi",
    d: "Doğal dil yalnızca problemi yapılandırmak, soruyu doğal biçimde sormak ve raporu yazmak için kullanılır. Metodoloji seçimi dil modeline sorulmaz.",
  },
  {
    t: "Kanıt profilleri",
    d: "Her yöntemin doğrulanmış sayılmadan önce karşılaması gereken bağımsız kanıt boyutları tanımlıdır. Aynı tanım hem soru rotasını hem sonuçlandırma kapısını besler.",
  },
  {
    t: "Karar izi ve karşı-olgusal test",
    d: "Kararın hangi yanıtlardan doğduğu adım adım saklanır; “şu cevap tersine dönseydi ne olurdu?” senaryoları aynı motorla yeniden hesaplanır.",
  },
  {
    t: "Uygulama ve doğrulama",
    d: "Seçilen yöntem, kendi adımlarını taşıyan bir çalışma alanına devredilir; aksiyonun uygulanması ile etkili olduğunun doğrulanması ayrı durumlarda tutulur.",
  },
  {
    t: "Regresyon kalkanı",
    d: "Kural ağırlıkları vaka testleriyle sabitlenir. Testler yalnız doğru yöntemin seçilmesini değil, yanlış yöntemin tetiklenmemesini de kontrol eder.",
  },
];

const TEST_PRINCIPLES = [
  "Müşteri etkisi tek başına 8D seçtirmemeli.",
  "Tekil makine arızası TPM’i kesinleştirmemeli.",
  "Kararlı ve yeterli proseste DMAIC gereksiz yere öne çıkmamalı.",
  "Kuyruk ve açlık kanıtı yokken TOC otomatik seçilmemeli.",
  "Standart iş fiilen uygulanmıyorsa ‘doküman var’ SDCA’yı bastırmamalı.",
  "Yeterli ayırt edici kanıt yoksa sistem kesin sonuç üretmemeli.",
  "Kurallarca reddedilmiş bir yöntem ‘eş geçerli ikinci yaklaşım’ diye sunulmamalı.",
  "Tek bir kanıt değiştiğinde karar da değişmeli — değişmiyorsa o kanıt okunmuyor demektir.",
];

/* Uygulama tarafı — teşhisten sonra çalışma alanının tuttuğu yapılar. Aşağıdaki
   satırlar ürünün gerçek veri modelinden alınmış ÖRNEK kayıtlardır: iddia/kanıt/
   karşı-olgusal test zinciri, aksiyonun uygulanması ile etkinliğinin ayrılması ve
   kapanışta üretilen öğrenim kaydı. */
const CAUSE_EVIDENCE = [
  { k: "İddia", v: "Kaynak akımındaki artış çatlak oranını yükseltiyor.", kind: "HİPOTEZ" },
  { k: "Saha kanıtı", v: "185 A üzerinde üretilen partilerde çatlak oranı anlamlı biçimde yükseliyor.", kind: "ÖLÇÜM" },
  { k: "Karşı-olgusal test", v: "Akım normal aralığa çekildiğinde çatlak devam ediyor mu?", kind: "SINAMA" },
  { k: "Durum", v: "Henüz doğrulanmadı — test sonucu beklenirken kök neden ilan edilmez.", kind: "AÇIK" },
];

const ACTION_EFFECTIVENESS = [
  { k: "Aksiyon", v: "Kaynak fikstürü değiştirildi" },
  { k: "Uygulama durumu", v: "Tamamlandı" },
  { k: "Beklenen etki", v: "Parça pozisyon varyasyonu azalacak" },
  { k: "Başlangıç (baseline)", v: "%6,3 çatlak oranı" },
  { k: "Hedef", v: "%2 altı" },
  { k: "Doğrulama dönemi", v: "14 gün" },
  { k: "Sonuç", v: "%1,1" },
  { k: "Etkinlik durumu", v: "Doğrulandı" },
];

const LEARNING_RECORD = [
  { k: "Doğrulanan kök neden", v: "Fikstür aşınması" },
  { k: "Etkili aksiyon", v: "Fikstür kontrol standardı ve değişim periyodu" },
  { k: "Benzer prosesler", v: "Hat B, Hat C, X ürün ailesi" },
  { k: "Yatay yayılım", v: "Aynı fikstür tipini kullanan hatlarda kontrol planı güncellemesi" },
];

const CATEGORY_ORDER = [
  "Problem çözme",
  "Risk ve önleme",
  "İstatistik ve kontrol",
  "Akış ve güvenilirlik",
  "Sürekli iyileştirme",
] as const;

function methodologyCategory(methodology: Methodology): (typeof CATEGORY_ORDER)[number] {
  if (["RCA", "EIGHT_D", "KEPNER_TREGOE", "KT_DECISION"].includes(methodology)) return "Problem çözme";
  if (["FMEA", "POKA_YOKE", "DMADV"].includes(methodology)) return "Risk ve önleme";
  if (["DMAIC", "SPC"].includes(methodology)) return "İstatistik ve kontrol";
  if (["TPM", "LEAN_VSM", "TOC"].includes(methodology)) return "Akış ve güvenilirlik";
  return "Sürekli iyileştirme";
}

/** Katalog: yöntemin ne olduğu kadar NE ZAMAN OLMADIĞI da yazılır. */
function MethodologyCatalog() {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: METHODOLOGIES.filter((m) => methodologyCategory(m) === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="border-t border-[var(--rule-strong)]">
      {grouped.map((group) => (
        <section key={group.category} className="border-b border-[var(--rule)] py-5 sm:flex sm:gap-8">
          <h3 className="eyebrow shrink-0 pt-1 sm:w-44">{group.category}</h3>
          <ul className="mt-3 min-w-0 flex-1 sm:mt-0">
            {group.items.map((methodology) => {
              const meta = METHODOLOGY_META[methodology];
              const disc = METHODOLOGY_DISCRIMINATION[methodology];
              return (
                <li key={methodology} className="border-b border-[var(--rule-faint)] py-3 last:border-b-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                    <span className="code-tag shrink-0 sm:w-24 sm:justify-center">{meta.shortName}</span>
                    <p className="min-w-0 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                      {disc.fitsWhen}
                    </p>
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:ml-28 sm:grid-cols-2">
                    <div>
                      <dt className="eyebrow">Ne zaman kullanılmamalı</dt>
                      <dd className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]">
                        {disc.avoidWhen}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow">
                        En çok karıştırıldığı · {METHODOLOGY_META[disc.confusedWith].shortName}
                      </dt>
                      <dd className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]">
                        Ayırt edici soru: {disc.discriminator}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function Home() {
  const primaryShowcase = showcaseCase("welding-crack")!;
  const grayZoneShowcase = showcaseCase("machine-stoppage")!;

  return (
    <main className="page-shell flex-1">
      {/* ── Giriş ───────────────────────────────────────────────────────── */}
      <section className="max-w-3xl">
        <p className="eyebrow">Üretim problemleri için açıklanabilir karar desteği</p>
        <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[2.25rem] lg:text-[2.625rem]">
          <span className="text-[var(--muted)]">Önce problemi teşhis et,</span>
          <br />
          sonra doğru metodolojiyi seç.
        </h1>
        <p className="mt-5 max-w-2xl text-[14px] leading-[1.7] text-[var(--ink-soft)]">
          Üretim problemleri yüzeyde birbirine benzer; farklı problem{" "}
          <strong className="font-semibold text-[var(--ink)]">karakterleri</strong> ise farklı
          düşünme biçimleri gerektirir. Manufacturing Decision Engine problemin adını değil
          yapısını ayırt etmeye çalışır ve hangi metodolojinin neden daha uygun olduğunu
          açıklar.
        </p>
        <p className="mt-4 max-w-2xl border-l-2 border-[var(--rule-strong)] pl-3.5 text-[13px] leading-[1.7] text-[var(--muted)]">
          Doğal dil, problemi yapılandırmak için kullanılır; metodoloji seçimi ise açık ve test
          edilebilir karar kurallarıyla yürütülür.
        </p>
        <div className="mt-7">
          <Link href="/diagnoz" className="btn btn-primary btn-lg">Problemi teşhis et</Link>
          <p className="mt-3 text-[12px] text-[var(--muted)]">
            Üyelik gerekmez.{" "}
            <span className="text-[var(--muted-2)]">
              Misafir çalışmalarınız yalnızca bu tarayıcıda saklanır.
            </span>
          </p>
        </div>
      </section>

      {/* ── Canlı örnek teşhis ──────────────────────────────────────────── */}
      <section id="ornek-teshis" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Örnek teşhis</h2>
          <span className="eyebrow">Canlı motor çıktısı</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          Aşağıdaki blok bir tanıtım görseli değil. Vaka, ürünün kullandığı karar motoruyla bu
          sayfa açılırken çalıştırıldı; öneri, gerekçe, alternatifler ve puanlar motorun o an
          ürettiği çıktıdır.
        </p>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted-2)]">
          {primaryShowcase.demonstrates}
        </p>
        <div className="mt-5">
          <ShowcaseDiagnosis showcase={primaryShowcase} />
        </div>
      </section>

      {/* ── Karar motoru nasıl çalışır ──────────────────────────────────── */}
      <section id="nasil-calisir" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Karar nasıl oluşuyor</h2>
          <span className="eyebrow">Altı adım</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          Sistem, yazdığınız metni bir dil modeline gönderip “hangi metodolojiyi seçmeliyim?”
          diye sormaz. Metin yalnızca problemi yapılandırmak için okunur; seçim, yazılı ve
          sınanabilir kurallarla yapılır.
        </p>
        <ol className="mt-6 grid gap-px bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((step, index) => (
            <li key={step.t} className="bg-[var(--paper)] p-4">
              <span className="font-mono text-[11px] font-medium text-[var(--muted-2)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[13px] font-semibold">{step.t}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Gri bölge vakası ────────────────────────────────────────────── */}
      <section id="gri-bolge" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Gri bölgede ne olur?</h2>
          <span className="eyebrow">İkinci canlı vaka</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          {grayZoneShowcase.demonstrates}
        </p>
        <div className="mt-5">
          <ShowcaseDiagnosis showcase={grayZoneShowcase} compact />
        </div>
      </section>

      {/* ── Yöntem ayrımları ────────────────────────────────────────────── */}
      <section id="ayrimlar" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Benzer görünen yöntemler nasıl ayrılıyor?</h2>
          <span className="eyebrow">Ayırt edici sorular</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          Sistemin değeri kaç yöntem tanıdığında değil, hangi koşulda hangisinin ayrıldığını
          modelleyebilmesinde. Aşağıdaki her satır bir kural çiftine ve bir regresyon testine
          karşılık gelir.
        </p>
        <ul className="mt-5 border-t border-[var(--rule-strong)]">
          {DISCRIMINATION_PAIRS.map(([a, b]) => (
            <li
              key={`${a}-${b}`}
              className="flex flex-col gap-2 border-b border-[var(--rule)] py-3 sm:flex-row sm:items-baseline sm:gap-5"
            >
              <span className="flex shrink-0 items-baseline gap-2 sm:w-48">
                <span className="code-tag">{METHODOLOGY_META[a].shortName}</span>
                <span className="text-[11px] text-[var(--muted-2)]">mi</span>
                <span className="code-tag">{METHODOLOGY_META[b].shortName}</span>
                <span className="text-[11px] text-[var(--muted-2)]">mi</span>
              </span>
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                {PAIR_QUESTION[`${a}|${b}`]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Mimari ──────────────────────────────────────────────────────── */}
      <section id="mimari" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Karar motoru mimarisi</h2>
          <span className="eyebrow">Decision engine architecture</span>
        </div>
        <div className="mt-6 grid gap-px bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-3">
          {ARCHITECTURE.map((layer, index) => (
            <div key={layer.t} className="bg-[var(--paper)] p-4">
              <span className="font-mono text-[11px] font-medium text-[var(--muted-2)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[13px] font-semibold">{layer.t}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{layer.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Regresyon testli motor ──────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Kararın sınandığı yer</h2>
          <span className="eyebrow">Regresyon testleri</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          Karar motoru yalnızca doğru metodolojiyi seçmesine göre değil,{" "}
          <strong className="font-semibold text-[var(--ink)]">
            benzer fakat yanlış yaklaşımları reddedebilmesine
          </strong>{" "}
          göre de regresyon testli. Her yöntem çifti için iki yönlü vaka tutulur: yöntemi hak
          eden ve yüzeyde ona benzeyip hak etmeyen. Bir yöntemin ağırlığını yükseltmek,
          ikizinin negatif vakasını bozmadan yapılmak zorunda.
        </p>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted-2)]">
          Vakalar kasten gri bölgede seçilir; ayrıca tek bir kanıt değiştirilerek kararın
          gerçekten o kanıta tepki verdiği sınanır. Bu ölçümler karar kurallarının beklenen
          ayrımları koruyup korumadığını gösterir, gerçek dünya başarı olasılığını değil.
        </p>
        <ul className="mt-5 grid gap-px bg-[var(--rule)] sm:grid-cols-2">
          {TEST_PRINCIPLES.map((principle) => (
            <li key={principle} className="bg-[var(--paper)] px-4 py-3 text-[12px] leading-relaxed text-[var(--ink-soft)]">
              {principle}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Metodoloji kataloğu ─────────────────────────────────────────── */}
      <section id="yontemler" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 pb-2">
          <h2 className="section-heading">Desteklenen metodolojiler</h2>
          <span className="font-mono text-[11px] text-[var(--muted-2)]">
            {String(METHODOLOGIES.length).padStart(2, "0")} yöntem
          </span>
        </div>
        <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          Amaç en fazla yöntemi listelemek değil. Her yöntem için ne zaman uygun olduğu kadar ne
          zaman uygun OLMADIĞI ve en çok karıştırıldığı komşusundan onu ayıran soru da tutulur.
        </p>
        <MethodologyCatalog />
      </section>

      {/* ── Teşhisten sonrası ──────────────────────────────────────────── */}
      <section id="uygulama" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Teşhisten sonra ne oluyor?</h2>
          <span className="eyebrow">Uygulama ve doğrulama</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          Yöntem seçimi işin yarısı. Seçilen yöntem, kendi adımlarını taşıyan bir çalışma alanına
          devredilir; orada iddia kanıta, aksiyon ise etkinlik doğrulamasına bağlanır. Aşağıdakiler
          çalışma alanının gerçek kayıt yapısından örnek satırlardır.
        </p>

        <div className="mt-6 grid gap-px bg-[var(--rule)] lg:grid-cols-3">
          <article className="bg-[var(--paper)] p-4 lg:pl-0">
            <p className="eyebrow">Kök neden kanıtı</p>
            <h3 className="mt-1.5 text-[13px] font-semibold">
              İddia, saha kanıtı ve karşı-olgusal test birbirine bağlanır
            </h3>
            <dl className="mt-3 border-t border-[var(--rule)]">
              {CAUSE_EVIDENCE.map((row) => (
                <div key={row.k} className="border-b border-[var(--rule-faint)] py-2 last:border-b-0">
                  <dt className="flex items-baseline justify-between gap-2">
                    <span className="eyebrow">{row.k}</span>
                    <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--muted-2)]">
                      {row.kind}
                    </span>
                  </dt>
                  <dd className="mt-0.5 text-[12px] leading-relaxed text-[var(--ink-soft)]">{row.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--muted-2)]">
              Doğrulanmamış bir neden kök neden olarak ilan edilmez.
            </p>
          </article>

          <article className="bg-[var(--paper)] p-4">
            <p className="eyebrow">Etkinlik doğrulaması</p>
            <h3 className="mt-1.5 text-[13px] font-semibold">
              Bir aksiyonun uygulanmış olması, problemin çözüldüğünü göstermez
            </h3>
            <dl className="mt-3 border-t border-[var(--rule)]">
              {ACTION_EFFECTIVENESS.map((row) => (
                <div
                  key={row.k}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-[var(--rule-faint)] py-1.5 last:border-b-0"
                >
                  <dt className="eyebrow">{row.k}</dt>
                  <dd className="font-mono text-[12px] tabular-nums text-[var(--ink-soft)]">{row.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--muted-2)]">
              Uygulama durumu ile etkinlik durumu ayrı alanlardır; ikincisi ölçümle kapanır.
            </p>
          </article>

          <article className="bg-[var(--paper)] p-4 lg:pr-0">
            <p className="eyebrow">Kurumsal öğrenim</p>
            <h3 className="mt-1.5 text-[13px] font-semibold">
              Problem kapandığında öğrenim kayıt altına alınır
            </h3>
            <dl className="mt-3 border-t border-[var(--rule)]">
              {LEARNING_RECORD.map((row) => (
                <div key={row.k} className="border-b border-[var(--rule-faint)] py-2 last:border-b-0">
                  <dt className="eyebrow">{row.k}</dt>
                  <dd className="mt-0.5 text-[12px] leading-relaxed text-[var(--ink-soft)]">{row.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--muted-2)]">
              Aynı hatanın başka bir hatta yeniden keşfedilmesi bir öğrenme değil, tekrar maliyetidir.
            </p>
          </article>
        </div>
      </section>

      {/* ── Neden bu proje ──────────────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Neden bu projeyi yaptım</h2>
          <span className="eyebrow">Not</span>
        </div>
        <p className="mt-5 max-w-3xl text-[13px] leading-[1.75] text-[var(--ink-soft)]">
          Üretimde problem çözme çalışmalarında sık karşılaşılan sorunlardan biri, metodolojinin
          problem anlaşılmadan seçilmesidir. 8D, DMAIC, RCA, TPM, TOC ve VSM güçlü yöntemlerdir;
          ancak farklı problem yapılarına hizmet ederler. Yanlış eşleşme, doğru araçla yanlış
          soruyu sormaya yol açar.
        </p>
        <p className="mt-3 max-w-3xl text-[13px] leading-[1.75] text-[var(--muted)]">
          Manufacturing Decision Engine’i, metodoloji seçimini daha sistematik, açıklanabilir ve
          test edilebilir hâle getirmek için geliştirdim.
        </p>
      </section>

      {/* ── Kapanış ─────────────────────────────────────────────────────── */}
      <section className="mt-14 grid gap-px border-t border-[var(--rule-strong)] bg-[var(--rule)] lg:grid-cols-[1.35fr_1fr]">
        <div className="bg-[var(--paper)] py-7 lg:pr-8">
          <p className="eyebrow">Önce deneyin</p>
          <h2 className="mt-2 text-[1.125rem] font-semibold tracking-[-0.012em]">
            Çalışmanız siz istemeden buluta taşınmaz
          </h2>
          <p className="mt-3 max-w-xl text-[13px] leading-[1.7] text-[var(--ink-soft)]">
            Misafir olarak başladığınız teşhis ve çalışma alanı kullandığınız tarayıcıda otomatik
            kaydedilir. Tarayıcı verilerini temizlerseniz kayıt kaybolabilir; dilediğiniz zaman
            yedek alabilir veya üyelik açtıktan sonra seçerek hesabınıza taşıyabilirsiniz.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/diagnoz" className="btn btn-primary">İlk teşhisi başlat</Link>
            <Link href="/gizlilik" className="btn btn-secondary">Veri kullanımını incele</Link>
          </div>
        </div>
        <div className="bg-[var(--paper)] py-7 lg:pl-8">
          <p className="eyebrow">Karar desteğinin sınırı</p>
          <h2 className="mt-2 text-[14px] font-semibold">Uzman kararının yerine geçmez</h2>
          <p className="mt-2.5 text-[13px] leading-[1.7] text-[var(--muted)]">
            Sistem uzman kararını otomatikleştirmek yerine problem sinyallerini yapılandırır,
            metodoloji alternatiflerini karşılaştırır ve karar gerekçesini görünür kılar. Yeterli
            ayırt edici kanıt yoksa bunu söyler. Gösterilen puanlar başarı olasılığı değil, kural
            desteğidir.
          </p>
        </div>
      </section>
    </main>
  );
}
