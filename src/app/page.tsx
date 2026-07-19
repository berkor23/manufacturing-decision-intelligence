import Link from "next/link";
import { METHODOLOGIES, METHODOLOGY_META, type Methodology } from "@/domain/diagnosis/methodologies";

const STEPS = [
  { n: "1", t: "Problemi anlat", d: "Kendi cümlelerinle yaz. Sistem metni yapılandırır." },
  { n: "2", t: "Soruları yanıtla", d: "Belirsizliği en çok azaltan, probleme özel sorular sorulur." },
  { n: "3", t: "Öneri + uygulama", d: "Gerekçeli metodoloji önerisi, rapor ve adım adım uygulama alanı." },
];

const OUTCOMES = [
  { icon: "◎", title: "Doğru yöntemi seç", detail: `${METHODOLOGIES.length} metodoloji aynı deterministik motorla karşılaştırılır.` },
  { icon: "◇", title: "Kök nedeni kanıtla", detail: "İddia, saha kanıtı ve karşı-olgusal test birbirine bağlanır." },
  { icon: "✓", title: "Etkinliği ölç", detail: "Uygulanan iş ile sonuç üreten aksiyon birbirinden ayrılır." },
  { icon: "↗", title: "Öğrenimi yay", detail: "Yatay yayılım, bağlı vakalar ve kurumsal öğrenim kaydı oluşturulur." },
];

function methodologyCategory(methodology: Methodology) {
  if (["RCA","EIGHT_D","KEPNER_TREGOE"].includes(methodology)) return "Problem çözme";
  if (["FMEA","POKA_YOKE","DMADV"].includes(methodology)) return "Risk & önleme";
  if (["DMAIC","SPC"].includes(methodology)) return "İstatistik & kontrol";
  if (["TPM","LEAN_VSM","TOC"].includes(methodology)) return "Akış & güvenilirlik";
  return "Sürekli iyileştirme";
}

export default function Home() {
  return (
    <main className="page-shell flex-1 py-12 sm:py-16">
      {/* Hero */}
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">AI destekli üretim problemi teşhisi</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
          Önce problemi teşhis et,
          <br className="hidden sm:block" />{" "}
          <span className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">
            sonra doğru metodolojiyi seç.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
          Problemini doğal dille anlat; sistem açıklayıcı sorular sorsun, problem tipini
          belirlesin ve en uygun metodolojiyi <strong>gerekçesiyle</strong> önersin.
          Kararı bir sohbet değil, deterministik bir karar motoru verir.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/diagnoz" className="btn btn-primary btn-lg">
            Yeni problem başlat →
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OUTCOMES.map((outcome) => <div key={outcome.title} className="card p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-100 to-emerald-100 font-bold text-indigo-700 dark:from-indigo-950 dark:to-emerald-950 dark:text-indigo-300">{outcome.icon}</span><h2 className="mt-3 text-sm font-semibold">{outcome.title}</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">{outcome.detail}</p></div>)}
      </section>

      {/* Nasıl çalışır */}
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="card card-interactive p-5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              {s.n}
            </span>
            <h3 className="mt-3 font-semibold">{s.t}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.d}</p>
          </div>
        ))}
      </section>

      {/* Metodolojiler */}
      <section className="mt-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Desteklenen metodolojiler</h2>
          <span className="text-sm text-slate-400">{METHODOLOGIES.length} yöntem</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METHODOLOGIES.map((m) => {
            const meta = METHODOLOGY_META[m];
            return (
              <div key={m} className="card p-4 transition hover:border-indigo-300 dark:hover:border-indigo-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500" />
                  <span className="font-semibold">{meta.shortName}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">{methodologyCategory(m)}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{meta.description}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Sistem, doğru olanı sana seçtirir — en çok yöntem bileni değil, doğru yöntemi seçeni ödüllendirir.
        </p>
      </section>
    </main>
  );
}
