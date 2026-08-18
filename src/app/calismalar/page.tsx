// Açık çalışmalar — "benim açık 8D'lerim" ekranı.
// Sunucu bileşeni: servisi doğrudan çağırır.

import Link from "next/link";
import { getWorkspaceService } from "@/application/wiring";
import type { WorkspaceSummary } from "@/application/ports/methodology-workspace-repository";
import { METHODOLOGY_META } from "@/domain/diagnosis";
import { accountAuthEnabled, allowedWorkspaceIds, currentAccount } from "@/lib/account-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Çalışmalar · MDE" };

export default async function WorkspacesPage() {
  let scope: Awaited<ReturnType<typeof allowedWorkspaceIds>> | undefined;
  if (accountAuthEnabled()) {
    const account = await currentAccount();
    if (!account) redirect("/giris?next=/calismalar");
    scope = await allowedWorkspaceIds(account);
  }
  const items = await getWorkspaceService().list(scope);
  const open = items.filter((w) => w.doneSteps < w.totalSteps);
  const done = items.filter((w) => w.doneSteps === w.totalSteps);

  return (
    <main className="page-shell flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--rule-strong)] pb-5">
        <div>
          <p className="eyebrow">Çalışma alanları</p>
          <h1 className="page-heading mt-1.5">Çalışmalar</h1>
          <p className="page-lead">
            Başlattığın metodoloji uygulamaları — kaldığın yerden devam et.
          </p>
        </div>
        <Link href="/diagnoz" className="btn btn-primary">Yeni teşhis</Link>
      </div>

      {items.length === 0 ? (
        <div className="empty-state mt-8">
          <div>
            <p className="text-[13px] text-[var(--ink-soft)]">Henüz bir çalışma alanı açılmamış.</p>
            <p className="mt-1.5 text-[12px] text-[var(--muted-2)]">
              Bir teşhisle başla; önerilen metodolojinin çalışma alanı buraya düşer.
            </p>
            <Link href="/diagnoz" className="btn btn-primary mt-5">Teşhise başla</Link>
          </div>
        </div>
      ) : (
        <>
          <Group title="Devam eden" items={open} />
          <Group title="Tamamlanan" items={done} />
        </>
      )}
    </main>
  );
}

function Group({ title, items }: { title: string; items: WorkspaceSummary[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-9">
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
        <h2 className="eyebrow">{title}</h2>
        <span className="font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
          {String(items.length).padStart(2, "0")}
        </span>
      </div>
      <ul>
        {items.map((w) => (
          <WorkspaceRow key={w.id} ws={w} />
        ))}
      </ul>
    </section>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

/**
 * Kart değil satır. Kolonlar bütün listede hizalıdır (kod · başlık · ilerleme ·
 * durum), böylece göz tek sütunda aşağı tarayarak karşılaştırma yapabilir.
 * Renk yalnız gerçek bir uyarı olduğunda görünür.
 */
function WorkspaceRow({ ws }: { ws: WorkspaceSummary }) {
  const meta = METHODOLOGY_META[ws.methodology];
  const pct = ws.totalSteps === 0 ? 0 : Math.round((ws.doneSteps / ws.totalSteps) * 100);
  const complete = ws.doneSteps === ws.totalSteps;
  // Kapanış riski: yeniden açılmış vaka veya doğrulama zincirinde açık kalan iddia.
  const risk = ws.closureStatus === "REOPENED" || ws.unverifiedClaims > 0;
  const warn = !risk && ws.effectivenessDue > 0;

  return (
    <li className="flex items-stretch border-b border-[var(--rule)]">
      <Link
        href={`/workspace/${ws.id}`}
        className="group flex min-w-0 flex-1 items-start gap-4 py-3.5 transition-colors hover:bg-[var(--surface-sunk)]"
      >
        <span className="code-tag mt-px min-w-[6.5rem] shrink-0 justify-center">{meta.shortName}</span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{ws.problemDescription}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="meter w-28 shrink-0">
              <div
                className={`meter-fill ${complete ? "meter-fill-ok" : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
              {ws.doneSteps}/{ws.totalSteps} adım
            </span>
            <span className="text-[11px] text-[var(--muted-2)]">
              {ws.openActions > 0 ? `${ws.openActions} açık aksiyon` : "açık aksiyon yok"}
            </span>
            <time
              dateTime={ws.updatedAt}
              className="font-mono text-[11px] tabular-nums text-[var(--muted-2)]"
            >
              {new Date(ws.updatedAt).toLocaleDateString("tr-TR")}
            </time>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-center">
          {risk && <span className="tag state-risk">Risk</span>}
          {warn && <span className="tag state-warn">Etkinlik</span>}
          <span className="text-[var(--muted-2)] transition-colors group-hover:text-[var(--ink)]">
            <Chevron />
          </span>
        </div>
      </Link>

      {ws.hasReport && (
        <Link
          href={`/workspace/${ws.id}/rapor`}
          title="Raporu görüntüle veya yazdır"
          className="flex shrink-0 items-center border-l border-[var(--rule)] px-3 text-[11px] text-[var(--muted-2)] transition-colors hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
        >
          Rapor
        </Link>
      )}
    </li>
  );
}
