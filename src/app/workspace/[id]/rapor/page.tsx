// Yazdırılabilir rapor sayfası — müşteriye/yönetime gidecek çıktı.
// Sunucu bileşeni: servisi doğrudan çağırır (ekstra HTTP turu yok).
// Ekranda sade bir A4 sayfası; @media print ile temiz PDF çıkar.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceService } from "@/application/wiring";
import { getPlaybook, stepIsComplete } from "@/domain/playbook";
import { Markdown } from "@/components/markdown";
import { PrintButton } from "@/components/print-button";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await getWorkspaceService().get(id);
  if (!ws) notFound();

  const playbook = getPlaybook(ws.methodology);
  const done = ws.steps.filter((s) => stepIsComplete(s.status)).length;
  const openActions = ws.actions.filter((a) => a.status !== "DONE").length;

  return (
    <main className="print-sheet mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      {/* Ekran kontrolleri — baskıda gizlenir */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/workspace/${id}`} className="text-[12px] text-[var(--muted)] underline decoration-[var(--rule-strong)] underline-offset-[3px] hover:text-[var(--ink)] hover:decoration-[var(--ink)]">
          Çalışma alanına dön
        </Link>
        <PrintButton />
      </div>

      {ws.report ? (
        <article className="card p-8">
          {/* Rapor başlığı (antet) */}
          <header className="mb-6 border-b border-[var(--rule-strong)] pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{playbook.methodology} · Uygulama Raporu</p>
                <h1 className="mt-1.5 text-[1.375rem] font-semibold tracking-[-0.018em]">{ws.methodologyName}</h1>
              </div>
              <div className="shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--muted)]">
                <div>
                  {new Date(ws.updatedAt).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--muted-2)]">{ws.id}</div>
              </div>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
              <Meta label="Problem" value={ws.problemDescription} span />
              <Meta label="İlerleme" value={`${done}/${ws.steps.length} adım tamamlandı`} />
              <Meta label="Açık aksiyon" value={openActions === 0 ? "Yok" : `${openActions} adet`} />
              <Meta
                label="Durum"
                value={done === ws.steps.length ? "Tamamlandı" : "Devam ediyor (ara rapor)"}
              />
            </dl>
          </header>

          <Markdown>{ws.report}</Markdown>

          {ws.actions.length > 0 && (
            <section className="mt-8">
              <h2 className="md-h md-h2">Aksiyon Listesi</h2>
              <div className="md-table-wrap">
                <table className="md-table">
                  <thead>
                    <tr>
                      <th>Aksiyon</th>
                      <th>Sorumlu</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ws.actions.map((a, i) => (
                      <tr key={i}>
                        <td>{a.action}</td>
                        <td>{a.owner ?? "—"}</td>
                        <td>
                          {a.status === "DONE" ? "Tamam" : a.status === "IN_PROGRESS" ? "Devam" : "Açık"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <footer className="mt-8 border-t border-[var(--rule)] pt-4 text-[10px] text-[var(--muted-2)]">
            Manufacturing Decision Engine · Bu rapor, çalışma alanına girilen verilerden üretilmiştir.
          </footer>
        </article>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-[var(--ink-soft)]">Bu çalışma alanı için henüz rapor üretilmemiş.</p>
          <Link href={`/workspace/${id}`} className="btn btn-primary mt-4 inline-flex">
            Çalışma alanında rapor oluştur
          </Link>
        </div>
      )}
    </main>
  );
}

function Meta({ label, value, span = false }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-3" : ""}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 text-[12px] leading-relaxed text-[var(--ink-soft)]">{value}</dd>
    </div>
  );
}
