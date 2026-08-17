"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  jobTitle: string | null;
  department: string | null;
  user: { name: string; email: string; lastLoginAt: string | Date | null };
};

const roleLabels = { OWNER: "Şirket sahibi", ADMIN: "Yönetici", MANAGER: "Ekip yöneticisi", MEMBER: "Çalışan", VIEWER: "İzleyici" };

export function CompanyMembersPanel({ members, seatLimit, canManage }: { members: Member[]; seatLimit: number; canManage: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const used = members.filter((member) => member.status !== "SUSPENDED").length;

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/company/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setError(result.error ?? "Çalışan eklenemedi.");
    setPreviewUrl(result.previewUrl ?? null);
    setAdding(false);
    router.refresh();
  }

  async function change(id: string, body: Record<string, string>) {
    const response = await fetch(`/api/company/members/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) setError((await response.json().catch(() => ({}))).error ?? "Değişiklik kaydedilemedi.");
    else router.refresh();
  }

  async function remove(member: Member) {
    if (!confirm(`${member.user.name} şirket hesabından çıkarılsın mı? Kullanıcı artık giriş yapamaz; geçmiş çalışmaları korunur.`)) return;
    const response = await fetch(`/api/company/members/${member.id}`, { method: "DELETE" });
    if (!response.ok) setError((await response.json().catch(() => ({}))).error ?? "Kullanıcı çıkarılamadı.");
    else router.refresh();
  }

  async function resendInvitation(member: Member) {
    setError("");
    const response = await fetch(`/api/company/members/${member.id}/invitation`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setError(result.error ?? "Davet yenilenemedi.");
    setPreviewUrl(result.previewUrl ?? null);
  }

  return <section className="card mt-6 overflow-hidden">
    <div className="section-toolbar border-b border-[var(--rule)] px-5 py-4">
      <div><p className="eyebrow">Ekip ve erişim</p><h2 className="section-heading mt-1">Çalışanlar</h2><p className="mt-1 text-xs text-[var(--muted-2)]">{used}/{seatLimit} kullanıcı hakkı kullanılıyor. Askıya alınan kullanıcı giriş yapamaz, geçmiş kayıtları silinmez.</p></div>
      {canManage && <button className="btn btn-primary" onClick={() => setAdding((value) => !value)}>{adding ? "Formu kapat" : "+ Çalışan ekle"}</button>}
    </div>
    {adding && <form onSubmit={addMember} className="grid gap-3 border-b border-[var(--rule)] bg-[var(--surface-sunk)] p-5 sm:grid-cols-2 lg:grid-cols-3">
      <label className="form-label">Ad soyad<input name="name" className="form-input mt-1" required /></label>
      <label className="form-label">E-posta<input name="email" type="email" className="form-input mt-1" required /></label>
      <label className="form-label">Görevi<input name="jobTitle" className="form-input mt-1" placeholder="Örn. Kalite mühendisi" /></label>
      <label className="form-label">Bölümü<input name="department" className="form-input mt-1" placeholder="Örn. Üretim" /></label>
      <label className="form-label">Erişim rolü<select name="role" className="form-input mt-1" defaultValue="MEMBER"><option value="MEMBER">Çalışan</option><option value="MANAGER">Ekip yöneticisi</option><option value="ADMIN">Yönetici</option><option value="VIEWER">İzleyici</option></select></label>
      <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3">{error && <p className="text-sm text-[var(--st-risk)]">{error}</p>}<button className="btn btn-primary ml-auto">Davet gönder</button></div>
    </form>}
    {previewUrl && <div className="subtle-panel m-4 text-sm"><p>Yerel modda e-posta yerine test bağlantısı oluşturuldu.</p><a href={previewUrl} className="font-semibold underline">Davet bağlantısını aç</a></div>}
    {error && !adding && <p className="m-4 rounded-xl bg-[var(--st-risk-bg)] p-3 text-sm text-[var(--st-risk)]">{error}</p>}
    <div className="divide-y divide-[var(--rule)]">{members.map((member) => <div key={member.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.3fr)_1fr_1fr_auto] md:items-center">
      <div className="min-w-0"><strong className="block truncate text-sm">{member.user.name}</strong><span className="block truncate text-xs text-[var(--muted-2)]">{member.user.email}</span></div>
      <div><span className="block text-xs font-medium">{member.jobTitle || "Görev belirtilmedi"}</span><span className="text-[11px] text-[var(--muted-2)]">{member.department || "Bölüm belirtilmedi"}</span></div>
      {canManage && member.role !== "OWNER" ? <select value={member.role} onChange={(event) => change(member.id, { role: event.target.value })} className="form-input py-2 text-xs"><option value="ADMIN">Yönetici</option><option value="MANAGER">Ekip yöneticisi</option><option value="MEMBER">Çalışan</option><option value="VIEWER">İzleyici</option></select> : <span className="tag state-ink">{roleLabels[member.role]}</span>}
      <div className="flex items-center gap-2">{member.status === "INVITED" && <><span className="tag state-ink">Davet bekliyor</span>{canManage && <button className="btn btn-ghost text-xs" onClick={() => resendInvitation(member)}>Tekrar gönder</button>}</>}{member.status === "SUSPENDED" && <span className="tag state-warn">Askıda</span>}{canManage && member.role !== "OWNER" && member.status !== "INVITED" && <button className="btn btn-ghost text-xs" onClick={() => change(member.id, { status: member.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" })}>{member.status === "SUSPENDED" ? "Erişimi aç" : "Askıya al"}</button>}{canManage && member.role !== "OWNER" && <button className="btn btn-ghost text-xs text-[var(--st-risk)]" onClick={() => remove(member)}>Çıkar</button>}</div>
    </div>)}</div>
  </section>;
}
