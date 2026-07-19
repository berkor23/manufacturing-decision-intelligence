// Açık çalışmalar — "benim açık 8D'lerim" ekranı.
// Sunucu bileşeni: servisi doğrudan çağırır.

import Link from "next/link";
import { getWorkspaceService } from "@/application/wiring";
import type { WorkspaceSummary } from "@/application/ports/methodology-workspace-repository";
import { METHODOLOGY_META } from "@/domain/diagnosis";

export const dynamic = "force-dynamic";
export const metadata = { title: "Çalışmalar · Manufacturing Diagnosis Engine" };

export default async function WorkspacesPage() {
  const items = await getWorkspaceService().list();
  const open = items.filter((w) => w.doneSteps < w.totalSteps);
  const done = items.filter((w) => w.doneSteps === w.totalSteps);

  return (
    <main className="page-shell flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Uygulama alanları</p>
          <h1 className="page-heading mt-1">Çalışmalar</h1>
          <p className="page-lead">
            Başlattığın metodoloji uygulamaları — kaldığın yerden devam et.
          </p>
        </div>
        <Link href="/diagnoz" className="btn btn-primary">Yeni teşhis →</Link>
      </div>

      {items.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-slate-600 dark:text-slate-400">Henüz bir çalışma alanı açılmamış.</p>
          <p className="mt-1 text-sm text-slate-400">
            Bir teşhisle başla; önerilen metodolojinin uygulama alanı buraya düşer.
          </p>
          <Link href="/diagnoz" className="btn btn-primary mt-5 inline-flex">Teşhise başla →</Link>
        </div>
      ) : (
        <>
          <Group title="Devam eden" count={open.length} items={open} />
          <Group title="Tamamlanan" count={done.length} items={done} />
        </>
      )}
    </main>
  );
}

function Group({ title, count, items }: { title: string; count: number; items: WorkspaceSummary[] }) {
  if (count === 0) return null;
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {count}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((w) => (
          <WorkspaceCard key={w.id} ws={w} />
        ))}
      </div>
    </section>
  );
}

function WorkspaceCard({ ws }: { ws: WorkspaceSummary }) {
  const meta = METHODOLOGY_META[ws.methodology];
  const pct = ws.totalSteps === 0 ? 0 : Math.round((ws.doneSteps / ws.totalSteps) * 100);
  const complete = ws.doneSteps === ws.totalSteps;

  return (
    <div className="card card-interactive flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/workspace/${ws.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {meta.shortName}
            </span>
            {complete && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Tamamlandı
              </span>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
            {ws.problemDescription}
          </p>
        </Link>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>{ws.doneSteps}/{ws.totalSteps} adım</span>
          <span>%{pct}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800/60">
        <span className="text-slate-400">
          {ws.openActions > 0 ? `${ws.openActions} açık aksiyon` : "Açık aksiyon yok"}
          {" · "}
          {new Date(ws.updatedAt).toLocaleDateString("tr-TR")}
        </span>
        <div className="flex shrink-0 gap-2">
          {ws.hasReport && (
            <Link href={`/workspace/${ws.id}/rapor`} className="text-slate-400 hover:text-indigo-600" title="Raporu yazdır">
              🖨 Rapor
            </Link>
          )}
          <Link href={`/workspace/${ws.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Devam et →
          </Link>
        </div>
      </div>
    </div>
  );
}
