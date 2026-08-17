import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkspaceService } from "@/application/wiring";
import { accountAuthEnabled, allowedWorkspaceIds, currentAccount } from "@/lib/account-auth";
import { ReadoutBand, type ReadoutItem } from "@/components/readout";
import type { UnifiedTask, UnifiedTaskKind } from "@/domain/production-readiness";

export const dynamic = "force-dynamic";
export const metadata = { title: "Görev Merkezi · MDI" };

/** Hesap modunda görev merkezi yalnız erişilebilen çalışmaları toplar. */
async function tenantScope() {
  if (!accountAuthEnabled()) return undefined;
  const account = await currentAccount();
  if (!account) redirect("/giris?next=/gorevler");
  return allowedWorkspaceIds(account);
}

const KIND: Record<UnifiedTaskKind, string> = {
  INFORMATION: "Bilgi",
  ACTION: "Aksiyon",
  CONTAINMENT: "Geçici kontrol",
  WEAK_SIGNAL: "Zayıf sinyal",
  QMS: "QMS",
  MONITORING: "İzleme",
  OPL: "OPL",
};

const STATUS: Record<UnifiedTask["status"], { label: string; tone: string }> = {
  OVERDUE: { label: "Gecikmiş", tone: "state-risk" },
  DUE_SOON: { label: "Yaklaşıyor", tone: "state-warn" },
  OPEN: { label: "Açık", tone: "state-idle" },
  DONE: { label: "Tamam", tone: "state-ok" },
};

export default async function TasksPage() {
  const scope = await tenantScope();
  const tasks = await getWorkspaceService().taskCenter(scope);
  const open = tasks.filter((task) => task.status !== "DONE");

  const summary: ReadoutItem[] = [
    { label: "Geciken", value: open.filter((t) => t.status === "OVERDUE").length, tone: "risk" },
    { label: "3 gün içinde", value: open.filter((t) => t.status === "DUE_SOON").length, tone: "warn" },
    { label: "Tarihsiz açık", value: open.filter((t) => t.status === "OPEN").length, tone: "info" },
    { label: "Tamamlanan", value: tasks.filter((t) => t.status === "DONE").length, tone: "ok" },
  ];

  return (
    <main className="page-shell">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rule-strong)] pb-5">
        <div>
          <p className="eyebrow">Portföy iş listesi</p>
          <h1 className="page-heading mt-1.5">Görev ve takip merkezi</h1>
          <p className="page-lead">
            Farklı çalışmalardaki aksiyon, containment, sinyal, QMS, OPL ve izleme yükümlülüklerini
            termin önceliğiyle bir araya getirir.
          </p>
        </div>
        <Link href="/calismalar" className="btn btn-secondary">Çalışmalara git</Link>
      </div>

      <div className="mt-7" aria-label="Görev özeti">
        <ReadoutBand items={summary} />
      </div>

      <section className="mt-9">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule-strong)] pb-2">
          <div>
            <h2 className="section-heading">Öncelikli iş listesi</h2>
            <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
              Geciken ve yaklaşan işler otomatik olarak üstte gösterilir.
            </p>
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
            {String(open.length).padStart(2, "0")} açık
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state mt-4">
            <div>
              <p className="text-[13px] text-[var(--ink-soft)]">Takip edilecek görev yok</p>
              <p className="mt-1.5 text-[12px] text-[var(--muted-2)]">
                Çalışmalardaki aksiyonlar ve izleme işleri burada otomatik görünür.
              </p>
            </div>
          </div>
        ) : (
          /* Satır kolonları bütün listede hizalı: tür · iş · sahip/termin · durum.
             Göz tek sütunda aşağı tarayarak önceliği görebilir. */
          <ul>
            {tasks.map((task, index) => {
              const status = STATUS[task.status];
              return (
                <li
                  key={`${task.workspaceId}-${task.kind}-${task.id}-${index}`}
                  className="border-b border-[var(--rule)]"
                >
                  <Link
                    href={task.href}
                    className="grid gap-x-4 gap-y-2 py-3 transition-colors hover:bg-[var(--surface-sunk)] sm:grid-cols-[7.5rem_1fr_11rem_6rem] sm:items-center"
                  >
                    <span className="eyebrow">{KIND[task.kind]}</span>

                    <span className="min-w-0">
                      <strong className="block truncate text-[13px] font-medium">
                        {task.title || "Başlıksız görev"}
                      </strong>
                      <small className="mt-0.5 block truncate text-[11px] text-[var(--muted-2)]">
                        {task.workspaceTitle}
                      </small>
                    </span>

                    <span
                      className={`text-[11px] ${task.owner ? "text-[var(--ink-soft)]" : "text-[var(--st-warn)]"}`}
                    >
                      {task.owner || "Sahip atanmadı"}
                      {task.dueDate && (
                        <small className="mt-0.5 block font-mono tabular-nums text-[var(--muted-2)]">
                          {new Date(task.dueDate).toLocaleDateString("tr-TR")}
                        </small>
                      )}
                    </span>

                    <span className={`tag w-fit ${status.tone}`}>{status.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
