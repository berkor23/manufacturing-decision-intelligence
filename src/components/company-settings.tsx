"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CompanySettings({ name, seatLimit }: { name: string; seatLimit: number }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/company", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, seatLimit: Number(body.seatLimit) }) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Şirket bilgileri güncellendi." : result.error ?? "Değişiklik kaydedilemedi.");
    if (response.ok) router.refresh();
  }
  return <details className="card mt-6 p-5"><summary className="cursor-pointer font-semibold">Şirket ayarları</summary><p className="mt-2 text-xs leading-5 text-[var(--muted-2)]">Şirket adı ekip ekranlarında görünür. Kullanıcı sınırı, şirkete aynı anda kaç aktif hesap bağlanabileceğini belirler.</p><form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end"><label className="form-label">Şirket adı<input name="name" defaultValue={name} className="form-input mt-1" required /></label><label className="form-label">Kullanıcı sınırı<input name="seatLimit" type="number" min={1} max={10000} defaultValue={seatLimit} className="form-input mt-1" required /></label><button className="btn btn-secondary justify-center">Ayarları kaydet</button></form>{message && <p className="mt-3 text-xs text-[var(--muted)]">{message}</p>}</details>;
}
