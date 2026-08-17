"use client";

// AI rehber paneli: metodoloji bilgi tabanından soru-cevap.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { askGuide } from "@/components/workspace/workspace-api";
import { useState } from "react";

export function GuidePanel({
  methodology,
  problem,
}: {
  methodology: string;
  problem: string;
}) {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suggestions = [
    "Bu metodolojiyi nasıl uygularım?",
    "İlk adım ne olmalı?",
    "Hangi araçları kullanmalıyım?",
    "En sık yapılan hata nedir?",
  ];

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const a = await askGuide(methodology, question, problem);
      setThread((t) => [...t, { q: question, a }]);
      setQ("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rehber yanıtı alınamadı. Yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-accent-emerald p-6">
      <div>
        <p className="eyebrow">Metodoloji bilgi tabanı</p>
        <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.012em]">AI rehber</h2>
      </div>
      <p className="mb-3 mt-1 text-xs text-[var(--muted-2)]">
        Bu metodolojiyi nasıl uygulayacağını sor; yanıtlar metodolojinin bilgi
        tabanına dayanır.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={busy}
            className="chip"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {thread.map((t, i) => (
          <div key={i}>
            <p className="text-sm font-medium">— {t.q}</p>
            <div className="subtle-panel mt-1 whitespace-pre-wrap text-sm text-[var(--ink-soft)]">
              {t.a}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(q)}
          placeholder="Kendi sorunu yaz…"
          className="field"
        />
        <button
          onClick={() => ask(q)}
          disabled={busy || !q.trim()}
          className="btn btn-primary shrink-0"
        >
          {busy ? "…" : "Sor"}
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-[var(--st-risk)]">{err}</p>}
    </section>
  );
}
