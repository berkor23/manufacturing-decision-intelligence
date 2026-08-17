"use client";

import { FormEvent, useState } from "react";

export function PasswordChangeForm() {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/account/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Parolanız değiştirildi. Diğer cihazlardaki oturumlar kapatıldı." : result.error ?? "Parola değiştirilemedi.");
    if (response.ok) form.reset();
  }
  return <details className="card mt-6 p-5"><summary className="cursor-pointer font-semibold">Giriş ve güvenlik</summary><p className="mt-2 text-xs leading-5 text-[var(--muted-2)]">İlk giriş parolası kullandıysanız veya parolanızın paylaşıldığını düşünüyorsanız buradan yenileyin.</p><form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3 sm:items-end"><label className="form-label">Mevcut parola<input name="currentPassword" type="password" autoComplete="current-password" className="form-input mt-1" required /></label><label className="form-label">Yeni parola<input name="newPassword" type="password" autoComplete="new-password" minLength={10} className="form-input mt-1" required /></label><button className="btn btn-secondary justify-center">Parolayı değiştir</button></form>{message && <p className="mt-3 text-xs text-[var(--muted)]">{message}</p>}</details>;
}
