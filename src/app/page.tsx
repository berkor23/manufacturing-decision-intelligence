import Link from "next/link";
import { METHODOLOGIES, METHODOLOGY_META, type Methodology } from "@/domain/diagnosis/methodologies";

const STEPS = [
  { t: "Problemi anlat", d: "Kendi cümlelerinle yaz. Sistem metni yapılandırır." },
  { t: "Soruları yanıtla", d: "Belirsizliği en çok azaltan, probleme özel sorular sorulur." },
  { t: "Öneri ve uygulama", d: "Gerekçeli metodoloji önerisi, rapor ve adım adım uygulama alanı." },
];

const OUTCOMES = [
  {
    title: "Yöntem seçimi",
    detail: `${METHODOLOGIES.length} metodoloji aynı açıklanabilir karar yapısıyla karşılaştırılır.`,
  },
  {
    title: "Kök neden kanıtı",
    detail: "İddia, saha kanıtı ve karşı-olgusal test birbirine bağlanır.",
  },
  {
    title: "Etkinlik doğrulaması",
    detail: "Uygulanan iş ile gerçekten sonuç üreten aksiyon birbirinden ayrılır.",
  },
  {
    title: "Kurumsal öğrenim",
    detail: "Yatay yayılım, bağlı vakalar ve öğrenim kaydı oluşturulur.",
  },
];

const EXAMPLE_CASES = [
  {
    title: "Tekrarlayan kaynak hatası",
    context:
      "Aynı ürün ailesinde hata aralıklı biçimde geri geliyor; ölçüm var fakat neden henüz kanıtlanmış değil.",
    direction:
      "Sistem, doğrudan bir yönteme atlamak yerine değişkenlik, tekrar ve veri yeterliliğini sorgular; RCA ile DMAIC arasındaki ayrımı gerekçelendirir.",
  },
  {
    title: "Yeni proses devreye alma riski",
    context:
      "Arıza henüz yaşanmadı; yeni ekipman, yeni operatör ve değişen kontrol planı nedeniyle gelecekteki riskler değerlendirilecek.",
    direction:
      "Geçmiş hata aramakla yetinmez; değişen koşulları ve kontrol zayıflıklarını sorgulayarak FMEA gibi önleyici düşünme biçimlerini öne çıkarır.",
  },
  {
    title: "Kapasite yatırımı kararı",
    context:
      "Birden fazla yatırım alternatifi var; teknik yeterlilik, maliyet, teslim süresi ve zorunlu koşullar birlikte değerlendirilecek.",
    direction:
      "Problemi kök neden vakası gibi ele almak yerine karar kriterlerini ayırır ve yapılandırılmış alternatif karşılaştırmasına yönlendirir.",
  },
];

const CATEGORY_ORDER = [
  "Problem çözme",
  "Risk ve önleme",
  "İstatistik ve kontrol",
  "Akış ve güvenilirlik",
  "Sürekli iyileştirme",
] as const;

function methodologyCategory(methodology: Methodology): (typeof CATEGORY_ORDER)[number] {
  if (["RCA", "EIGHT_D", "KEPNER_TREGOE"].includes(methodology)) return "Problem çözme";
  if (["FMEA", "POKA_YOKE", "DMADV"].includes(methodology)) return "Risk ve önleme";
  if (["DMAIC", "SPC"].includes(methodology)) return "İstatistik ve kontrol";
  if (["TPM", "LEAN_VSM", "TOC"].includes(methodology)) return "Akış ve güvenilirlik";
  return "Sürekli iyileştirme";
}

/** Katalog: 13 yöntemin tamamı kategori altında tek listede — "diğerlerini
 *  göster" katlaması yok. Kart yerine satır; göz tek sütunda aşağı tarar. */
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
              return (
                <li
                  key={methodology}
                  className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <span className="code-tag shrink-0 sm:w-24 sm:justify-center">{meta.shortName}</span>
                  <p className="min-w-0 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                    {meta.description}
                  </p>
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
  return (
    <main className="page-shell flex-1">
      {/* ── Giriş ─────────────────────────────────────────────────────────
          Ortalanmış, gradyanlı "landing" bloğu yerine sola hizalı künye:
          okuma soldan başlar, başlık vurgusu renkle değil kontrastla kurulur. */}
      <section className="max-w-3xl">
        <p className="eyebrow">Üretim problemleri için açıklanabilir karar desteği</p>
        <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[2.25rem] lg:text-[2.625rem]">
          <span className="text-[var(--muted)]">Önce problemi teşhis et,</span>
          <br />
          sonra doğru metodolojiyi seç.
        </h1>
        <p className="mt-5 max-w-2xl text-[14px] leading-[1.7] text-[var(--ink-soft)]">
          Problemini doğal dille anlat; sistem açıklayıcı sorular sorsun, problem tipini
          belirlesin ve en uygun metodolojiyi <strong className="font-semibold text-[var(--ink)]">gerekçesiyle</strong>{" "}
          önersin. Öneri, verdiğin cevapların açık ve izlenebilir karar kurallarıyla
          değerlendirilmesiyle oluşur.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <Link href="/diagnoz" className="btn btn-primary btn-lg">Üye olmadan dene</Link>
          <Link href="/kayit" className="btn btn-secondary btn-lg">Üye ol</Link>
        </div>
        <p className="mt-3 text-[11px] text-[var(--muted-2)]">
          Kredi kartı ve üyelik gerekmez. Misafir çalışmalarınız bu tarayıcıda saklanır.
        </p>
      </section>

      {/* ── Ne üretir ──────────────────────────────────────────────────────
          İkon kutusu yok. Sıralı numara + dikey cetvel: ölçek şeridi gibi. */}
      <section className="mt-14 grid gap-px border-y border-[var(--rule-strong)] bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-4">
        {OUTCOMES.map((outcome, index) => (
          <div key={outcome.title} className="bg-[var(--paper)] px-4 py-5 first:pl-0 lg:last:pr-0">
            <span className="font-mono text-[11px] font-medium text-[var(--muted-2)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="mt-2 text-[13px] font-semibold">{outcome.title}</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{outcome.detail}</p>
          </div>
        ))}
      </section>

      {/* ── Nasıl çalışır ─────────────────────────────────────────────────── */}
      <section id="nasil-calisir" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Nasıl çalışır</h2>
          <span className="eyebrow">Üç adım</span>
        </div>
        <ol className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-0">
          {STEPS.map((step, index) => (
            <li
              key={step.t}
              className="sm:border-l sm:border-[var(--rule)] sm:px-6 sm:first:border-l-0 sm:first:pl-0"
            >
              <span className="font-mono text-[11px] font-medium text-[var(--muted-2)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[14px] font-semibold">{step.t}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Örnek vakalar ─────────────────────────────────────────────────── */}
      <section id="ornek-vakalar" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Sistem hangi ayrımı yapmaya çalışır?</h2>
          <span className="eyebrow">Örnek vakalar</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          Aşağıdakiler hazır cevap değildir. Sistem, probleminizi anlattıktan sonra yeterli
          sayıda ayırt edici yanıt toplamadan kesin bir yöntem önermez.
        </p>
        <div className="mt-6 grid gap-px bg-[var(--rule)] lg:grid-cols-3">
          {EXAMPLE_CASES.map((example) => (
            <article key={example.title} className="flex flex-col bg-[var(--paper)] lg:px-5 lg:first:pl-0 lg:last:pr-0">
              <h3 className="text-[14px] font-semibold">{example.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">{example.context}</p>
              <div className="mt-4 border-l-2 border-[var(--rule-strong)] pl-3.5">
                <p className="eyebrow">Nasıl ayrıştırır?</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{example.direction}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Metodoloji kataloğu ───────────────────────────────────────────── */}
      <section id="yontemler" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 pb-2">
          <h2 className="section-heading">Desteklenen metodolojiler</h2>
          <span className="font-mono text-[11px] text-[var(--muted-2)]">
            {String(METHODOLOGIES.length).padStart(2, "0")} yöntem
          </span>
        </div>
        <MethodologyCatalog />
        <p className="mt-4 text-[12px] text-[var(--muted-2)]">
          Amaç en fazla yöntemi kullanmak değil, problemin gerektirdiği düşünme biçimini seçmektir.
        </p>
      </section>

      {/* ── Kapanış ───────────────────────────────────────────────────────── */}
      <section className="mt-14 grid gap-px border-t border-[var(--rule-strong)] bg-[var(--rule)] lg:grid-cols-[1.35fr_1fr]">
        <div className="bg-[var(--paper)] py-7 lg:pr-8">
          <p className="eyebrow">Önce deneyin</p>
          <h2 className="mt-2 text-[1.125rem] font-semibold tracking-[-0.012em]">
            Çalışmanız siz istemeden buluta taşınmaz
          </h2>
          <p className="mt-3 max-w-xl text-[13px] leading-[1.7] text-[var(--ink-soft)]">
            Misafir olarak başladığınız teşhis ve uygulama alanı kullandığınız tarayıcıda otomatik
            kaydedilir. Tarayıcı verilerini temizlerseniz kayıt kaybolabilir; dilediğiniz zaman yedek
            alabilir veya üyelik açtıktan sonra seçerek hesabınıza taşıyabilirsiniz.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/diagnoz" className="btn btn-primary">İlk teşhisi başlat</Link>
            <Link href="/gizlilik" className="btn btn-secondary">Veri kullanımını incele</Link>
          </div>
        </div>
        <div className="bg-[var(--paper)] py-7 lg:pl-8">
          <p className="eyebrow">Karar desteği</p>
          <h2 className="mt-2 text-[14px] font-semibold">Sistem uzman görüşünün yerine geçmez</h2>
          <p className="mt-2.5 text-[13px] leading-[1.7] text-[var(--muted)]">
            Öneri; verdiğiniz bilgiler ve tanımlı karar kurallarıyla üretilir. Sonuç, başarı
            olasılığı değil mevcut kanıtın hangi düşünme biçimini desteklediğini gösterir.
          </p>
        </div>
      </section>
    </main>
  );
}
