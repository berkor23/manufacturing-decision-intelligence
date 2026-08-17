"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AccountTokenForm({ token, mode }: { token: string; mode: "verify" | "invite" | "reset" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint = mode === "verify" ? "/api/account/verify" : mode === "invite" ? "/api/account/invitation/accept" : "/api/account/password/reset";
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, token }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Bağlantı kullanılamadı."); setPending(false); return; }
    router.push(result.redirectTo);
    router.refresh();
  }
  return <form onSubmit={submit} className="mt-6 space-y-4">
    {mode !== "verify" && <label className="form-label">Yeni parolanız<input className="form-input mt-1.5" name="password" type="password" minLength={10} autoComplete="new-password" required placeholder="En az 10 karakter ve bir rakam" /></label>}
    {error && <p className="rounded-xl bg-[var(--st-risk-bg)] p-3 text-sm text-[var(--st-risk)]">{error}</p>}
    <button className="btn btn-primary w-full justify-center py-3" disabled={pending}>{pending ? "İşlem tamamlanıyor…" : mode === "verify" ? "E-posta adresimi doğrula" : mode === "invite" ? "Parolamı belirle ve ekibe katıl" : "Parolamı yenile"}</button>
  </form>;
}

export function EmailRequestForm({ mode, initialEmail = "" }: { mode: "verification" | "reset"; initialEmail?: string }) {
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const endpoint = mode === "verification" ? "/api/account/verification/resend" : "/api/account/password/request";
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const result = await response.json().catch(() => ({}));
    setMessage(result.message ?? "İsteğiniz alındı.");
    setPreviewUrl(result.previewUrl ?? null);
  }
  return <form onSubmit={submit} className="mt-6 space-y-4"><label className="form-label">E-posta adresi<input className="form-input mt-1.5" name="email" type="email" defaultValue={initialEmail} required /></label><button className="btn btn-primary w-full justify-center">{mode === "verification" ? "Yeni doğrulama bağlantısı gönder" : "Parola yenileme bağlantısı gönder"}</button>{message && <p className="alert alert-ok">{message}</p>}{previewUrl && <a className="btn btn-secondary w-full justify-center" href={previewUrl}>Yerel test bağlantısını aç</a>}</form>;
}
