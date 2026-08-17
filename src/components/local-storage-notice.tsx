"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { guestStorageEstimate, requestDurableGuestStorage } from "@/lib/guest-storage";

export function LocalStorageNotice({ compact = false }: { compact?: boolean }) {
  const [durable, setDurable] = useState<boolean | null>(null);
  const [quotaWarning, setQuotaWarning] = useState(false);
  useEffect(() => {
    void requestDurableGuestStorage().then(setDurable).catch(() => setDurable(false));
    void guestStorageEstimate().then((estimate) => {
      const usage = estimate?.usage ?? 0;
      const quota = estimate?.quota ?? 0;
      setQuotaWarning(quota > 0 && usage / quota >= 0.8);
    }).catch(() => undefined);
  }, []);
  return <aside className={`rounded-xl border border-[var(--rule-strong)] bg-[var(--surface-mark)] text-[var(--ink)] ${compact ? "px-3 py-2 text-xs" : "p-4 text-sm"}`}>
    <strong>Bu çalışma bu tarayıcıda otomatik kaydedilir.</strong>
    {!compact && <p className="mt-1 text-xs leading-5">Hesap açmanız gerekmez. Tarayıcı verilerini temizlerseniz veya gizli sekme kullanırsanız çalışma kaybolabilir; başka cihazlarda görünmez.</p>}
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span>{durable ? "Tarayıcı kalıcı depolamaya izin verdi." : "Önemli çalışmalar için yedek alın veya üyelikten sonra buluta taşıyın."}</span><Link href="/gizlilik" className="font-semibold underline">Ayrıntılar</Link></div>
    {quotaWarning && <p className="mt-2 rounded-lg bg-[var(--st-warn-bg)] px-3 py-2 text-xs font-medium text-[var(--st-warn)]">Tarayıcı depolama alanı dolmak üzere. Veri kaybı riskini azaltmak için yerel yedek alın veya çalışmalarınızı hesabınıza taşıyın.</p>}
  </aside>;
}
