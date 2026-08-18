import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMetric } from "@/components/account-metrics";
import { CompanyMembersPanel } from "@/components/company-members-panel";
import { CompanySettings } from "@/components/company-settings";
import { PasswordChangeForm } from "@/components/password-change-form";
import { CompanyTrendChart } from "@/components/company-trend-chart";
import { LocalWorkspaceMigration } from "@/components/local-workspace-migration";
import { canManageMembers, canViewOrganization, currentAccount } from "@/lib/account-auth";
import { prisma } from "@/lib/prisma";
import { stepIsComplete } from "@/domain/playbook";

export const dynamic = "force-dynamic";
export const metadata = { title: "Şirket paneli · MDE" };

export default async function CompanyPage() {
  const account = await currentAccount();
  if (!account) redirect("/giris?next=/sirket");
  if (!canViewOrganization(account)) redirect("/hesabim");
  const organization = await prisma.organization.findUnique({
    where: { id: account.organizationId! },
    include: { memberships: { include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] } },
  });
  if (!organization) redirect("/hesabim");
  const records = await prisma.workspaceRecord.findMany({ where: { organizationId: organization.id, archivedAt: null }, orderBy: { updatedAt: "desc" } });
  const memberMap = new Map(organization.memberships.map((member) => [member.userId, member.user.name]));
  const workspaces = records.map((record) => {
    const data = record.data as Record<string, unknown>;
    const steps = Array.isArray(data.steps) ? data.steps as { status?: string }[] : [];
    return {
      id: record.id,
      owner: record.ownerUserId ? memberMap.get(record.ownerUserId) ?? "Eski kullanıcı" : "Sahibi belirtilmedi",
      title: String(data.problemDescription ?? "Adsız çalışma"),
      method: String(data.methodologyName ?? record.methodology),
      status: String(data.closureStatus ?? "OPEN"),
      progress: steps.length ? Math.round(steps.filter((step) => stepIsComplete(step.status)).length / steps.length * 100) : 0,
      updatedAt: record.updatedAt,
    };
  });
  const completed = workspaces.filter((item) => item.status === "CLOSED").length;
  const activeMembers = organization.memberships.filter((member) => member.status === "ACTIVE");
  const memberStats = activeMembers.map((member) => {
    const memberWork = workspaces.filter((workspace) => workspace.owner === member.user.name);
    return { id: member.id, name: member.user.name, count: memberWork.length, completed: memberWork.filter((item) => item.status === "CLOSED").length, progress: memberWork.length ? Math.round(memberWork.reduce((sum, item) => sum + item.progress, 0) / memberWork.length) : 0 };
  }).sort((a, b) => b.count - a.count);
  const now = new Date();
  const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const trend = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(weekStart); start.setDate(start.getDate() - (7 - index) * 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const inRange = (value: Date) => value >= start && value < end;
    return {
      label: start.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      started: records.filter((record) => inRange(record.createdAt)).length,
      completed: records.filter((record) => {
        const closedAt = (record.data as Record<string, unknown>).closedAt;
        return typeof closedAt === "string" && inRange(new Date(closedAt));
      }).length,
    };
  });

  return <main className="page-shell">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Şirket çalışma alanı</p><h1 className="page-heading mt-1">{organization.name}</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Ekibinizin hangi çalışmaları başlattığını, nerede desteğe ihtiyaç duyduğunu ve doğrulamayla kapanan sonuçları görün.</p></div><Link href="/diagnoz" className="btn btn-primary">+ Yeni çalışma başlat</Link></div>
    <LocalWorkspaceMigration targetLabel="şirket çalışma alanınız" />
    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><AccountMetric label="Aktif kullanıcı" value={activeMembers.length} detail={`${organization.seatLimit} kullanıcı hakkından`} /><AccountMetric label="Toplam çalışma" value={workspaces.length} detail="Şirket genelinde" /><AccountMetric label="Devam eden" value={workspaces.length - completed} detail="Takip veya doğrulama bekliyor" tone="amber" /><AccountMetric label="Tamamlanan" value={completed} detail="Doğrulama sonrası kapandı" tone="green" /><AccountMetric label="Tamamlanma oranı" value={workspaces.length ? Math.round(completed / workspaces.length * 100) : 0} detail="Şirket portföyünde %" tone={completed ? "green" : "indigo"} /></section>
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <div className="card overflow-hidden"><div className="border-b border-[var(--rule)] px-5 py-4"><h2 className="section-heading">Ekip çalışmaları</h2><p className="text-xs text-[var(--muted-2)]">İlerleme oranı, yalnızca tamamlandı olarak işaretlenen metodoloji adımlarından hesaplanır.</p></div><div className="divide-y divide-[var(--rule)]">{workspaces.slice(0, 20).map((workspace) => <Link href={`/workspace/${workspace.id}`} key={workspace.id} className="grid gap-2 px-5 py-4 hover:bg-[var(--surface-mark)] sm:grid-cols-[1fr_auto]"><div className="min-w-0"><strong className="block truncate text-sm">{workspace.title}</strong><span className="text-xs text-[var(--muted-2)]">{workspace.owner} · {workspace.method}</span></div><div className="text-right"><span className="block text-sm font-semibold">%{workspace.progress}</span><span className="text-[11px] text-[var(--muted-2)]">{workspace.updatedAt.toLocaleDateString("tr-TR")}</span></div></Link>)}{!workspaces.length && <p className="p-10 text-center text-sm text-[var(--muted-2)]">Ekibiniz henüz çalışma başlatmadı.</p>}</div></div>
      <div className="card overflow-hidden"><div className="border-b border-[var(--rule)] px-5 py-4"><h2 className="section-heading">Ekip görünümü</h2><p className="text-xs text-[var(--muted-2)]">Bu tablo kişileri yarıştırmak için değil, iş yükünü ve destek ihtiyacını görmek için kullanılır.</p></div><div className="divide-y divide-[var(--rule)]">{memberStats.map((member) => <div key={member.id} className="p-4"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{member.name}</strong><span className="text-xs text-[var(--muted-2)]">{member.count} çalışma</span></div><div className="meter mt-2"><div className="meter-fill" style={{ width: `${member.progress}%` }} /></div><p className="mt-1 text-[11px] text-[var(--muted-2)]">Ortalama adım ilerlemesi %{member.progress} · {member.completed} tamamlandı</p></div>)}</div></div>
    </section>
    <CompanyTrendChart points={trend} />
    <CompanyMembersPanel members={organization.memberships} seatLimit={organization.seatLimit} canManage={canManageMembers(account)} />
    {canManageMembers(account) && <CompanySettings name={organization.name} seatLimit={organization.seatLimit} />}
    <PasswordChangeForm />
    <section className="subtle-panel mt-6 text-sm leading-relaxed"><strong>Performans verisini nasıl okumalı?</strong><p className="mt-1">Çalışma sayısı tek başına performans değildir. Karmaşık bir vaka daha uzun sürebilir. Bu panel ilerleme, kapanış ve iş yükünü birlikte gösterir; çalışan değerlendirmesinde kanıt kalitesi, aksiyon etkinliği ve problemin tekrar edip etmediği ayrıca incelenmelidir.</p></section>
  </main>;
}
