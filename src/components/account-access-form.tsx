"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AccountAccessForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [accountType, setAccountType] = useState<"INDIVIDUAL" | "COMPANY">("INDIVIDUAL");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(mode === "login" ? "/api/account/login" : "/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, accountType, next: params.get("next") ?? undefined }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "İşlem tamamlanamadı.");
      setPending(false);
      return;
    }
    if (result.previewUrl) {
      setPreviewUrl(result.previewUrl);
      setPending(false);
      return;
    }
    router.push(result.redirectTo);
    router.refresh();
  }

  return <form onSubmit={submit} className="mt-6 space-y-4">
    {mode === "register" && <>
      <div className="grid grid-cols-2 border border-[var(--rule-strong)]" role="group">
        <button type="button" onClick={() => setAccountType("INDIVIDUAL")} aria-pressed={accountType === "INDIVIDUAL"} className={`px-3 py-2.5 text-[13px] font-medium transition-colors ${accountType ==="INDIVIDUAL" ? "bg-[var(--ink)] text-[var(--on-ink)]" : "text-[var(--muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"}`}>Kendim için</button>
        <button type="button" onClick={() => setAccountType("COMPANY")} aria-pressed={accountType === "COMPANY"} className={`border-l border-[var(--rule-strong)] px-3 py-2.5 text-[13px] font-medium transition-colors ${accountType ==="COMPANY" ? "bg-[var(--ink)] text-[var(--on-ink)]" : "text-[var(--muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"}`}>Şirketim için</button>
      </div>
      <label className="form-label">Ad soyad<input className="form-input mt-1.5" name="name" autoComplete="name" required placeholder="Örn. Bora Yılmaz" /></label>
      {accountType === "COMPANY" && <label className="form-label">Şirket adı<input className="form-input mt-1.5" name="companyName" autoComplete="organization" required placeholder="Ekibinizin göreceği şirket adı" /></label>}
    </>}
    <label className="form-label">E-posta adresi<input className="form-input mt-1.5" name="email" type="email" autoComplete="email" required placeholder="ad@firma.com" /></label>
    <label className="form-label">Parola<input className="form-input mt-1.5" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 10 : undefined} required placeholder={mode === "register" ? "En az 10 karakter ve bir rakam" : "Parolanız"} /></label>
    {error && <p role="alert" className="rounded-xl border border-[var(--st-risk-rule)] bg-[var(--st-risk-bg)] p-3 text-sm text-[var(--st-risk)]">{error}</p>}
    <button className="btn btn-primary w-full justify-center py-3" disabled={pending}>{pending ? "İşleminiz tamamlanıyor…" : mode === "login" ? "Hesabıma gir" : "Hesabımı oluştur"}</button>
    {previewUrl && <div className="rounded-xl border border-[var(--rule-strong)] bg-[var(--surface-mark)] p-3 text-sm text-[var(--ink)]"><p>Yerel geliştirme modunda gerçek e-posta gönderilmedi.</p><a href={previewUrl} className="mt-2 inline-block font-semibold underline">Doğrulama bağlantısını aç</a></div>}
    {mode === "register" && <p className="text-xs leading-5 text-[var(--muted-2)]">Şirket hesabı açarsanız ilk kullanıcı şirket sahibi olur. Ekibinizi ve erişim rollerini şirket panelinden yönetebilirsiniz.</p>}
  </form>;
}
