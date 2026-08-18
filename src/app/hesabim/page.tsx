import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/account-auth";
import { prisma } from "@/lib/prisma";
import { AccountMetric } from "@/components/account-metrics";
import { PasswordChangeForm } from "@/components/password-change-form";
import { LocalWorkspaceMigration } from "@/components/local-workspace-migration";
import { stepIsComplete } from "@/domain/playbook";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hesabım · MDE" };

export default async function AccountPage() {
  const account = await currentAccount();
  if (!account) redirect("/giris?next=/hesabim");
  if (account.organizationId && account.role && ["OWNER", "ADMIN", "MANAGER"].includes(account.role)) redirect("/sirket");
  const records = await prisma.workspaceRecord.findMany({ where: { ownerUserId: account.userId, archivedAt: null }, orderBy: { updatedAt: "desc" } });
  const rows = records.map((record) => {
    const data = record.data as Record<string, unknown>;
    const steps = Array.isArray(data.steps) ? data.steps as { status?: string }[] : [];
    return { id: record.id, title: String(data.problemDescription ?? "Adsız çalışma"), method: String(data.methodologyName ?? record.methodology), status: String(data.closureStatus ?? "OPEN"), progress: steps.length ? Math.round(steps.filter((step) => stepIsComplete(step.status)).length / steps.length * 100) : 0, updatedAt: record.updatedAt };
  });
  const closed = rows.filter((row) => row.status === "CLOSED").length;
  return <main className="page-shell">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Kişisel çalışma alanı</p><h1 className="page-heading mt-1">Merhaba, {account.name}</h1><p className="mt-2 text-sm text-[var(--muted)]">Başlattığınız çalışmaları, ilerlemenizi ve tamamlanmayı bekleyen işleri tek yerden izleyin.</p></div><Link href="/diagnoz" className="btn btn-primary">+ Yeni çalışma başlat</Link></div>
    <LocalWorkspaceMigration targetLabel="kişisel hesabınız" />
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><AccountMetric label="Toplam çalışma" value={rows.length} detail="Hesabınızda kayıtlı" /><AccountMetric label="Devam eden" value={rows.length - closed} detail="Üzerinde çalışmanız gereken" tone="amber" /><AccountMetric label="Tamamlanan" value={closed} detail="Doğrulama sonrası kapanan" tone="green" /><AccountMetric label="Ortalama ilerleme" value={rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) : 0} detail="Tüm çalışmalarınızda %" /></section>
    <section className="card mt-6 overflow-hidden"><div className="border-b border-[var(--rule)] px-5 py-4"><h2 className="section-heading">Son çalışmalarınız</h2><p className="text-xs text-[var(--muted-2)]">En son güncellediğiniz kayıtlar önce gösterilir.</p></div><div className="divide-y divide-[var(--rule)]">{rows.slice(0, 20).map((row) => <Link key={row.id} href={`/workspace/${row.id}`} className="grid gap-2 px-5 py-4 hover:bg-[var(--surface-mark)] sm:grid-cols-[1fr_auto]"><div><strong className="block text-sm">{row.title}</strong><span className="text-xs text-[var(--muted-2)]">{row.method} · %{row.progress} tamamlandı</span></div><span className="text-xs text-[var(--muted-2)]">{row.updatedAt.toLocaleDateString("tr-TR")}</span></Link>)}{!rows.length && <div className="p-10 text-center"><p className="text-sm text-[var(--muted)]">Henüz bir çalışma başlatmadınız.</p><Link href="/diagnoz" className="btn btn-primary mt-4">İlk teşhisi başlat</Link></div>}</div></section>
    <PasswordChangeForm />
  </main>;
}
