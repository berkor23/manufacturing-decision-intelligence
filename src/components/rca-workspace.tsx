"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  RcaWorkspace as RcaWorkspaceData,
  WhyStep,
  FishboneItem,
  ActionItem,
  ActionStatus,
} from "@/application/ports/rca-repository";
import { FISHBONE_CATEGORIES } from "@/application/ports/rca-repository";

const STATUS_LABEL: Record<ActionStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "Devam",
  IMPLEMENTED: "Uygulandı",
  EFFECTIVENESS_DUE: "Etkinlik bekliyor",
  EFFECTIVE: "Etkili",
  INEFFECTIVE: "Etkisiz",
  DONE: "Tamam",
};

export function RcaWorkspace({ id }: { id: string }) {
  const [ws, setWs] = useState<RcaWorkspaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch(`/api/rca/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("RCA bulunamadı."))))
      .then(setWs)
      .catch((e) => setError(e.message));
  }, [id]);

  function mutate(patch: Partial<RcaWorkspaceData>) {
    setWs((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }

  async function save() {
    if (!ws) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rca/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whySteps: ws.whySteps, fishbone: ws.fishbone, actions: ws.actions }),
      });
      if (!res.ok) throw new Error("Kaydetme başarısız.");
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata.");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <Shell><p className="text-[var(--st-risk)]">{error}</p></Shell>;
  if (!ws) return <Shell><p className="text-[var(--muted)]">Yükleniyor…</p></Shell>;

  return (
    <Shell>
      <Head
        eyebrow="RCA · Kök Neden Analizi"
        title="Kök Neden Analizi"
        subtitle={ws.problemDescription}
        saving={saving}
        dirty={dirty}
        onSave={save}
      />
      <FiveWhy steps={ws.whySteps} onChange={(whySteps) => mutate({ whySteps })} />
      <Fishbone items={ws.fishbone} onChange={(fishbone) => mutate({ fishbone })} />
      <Actions actions={ws.actions} onChange={(actions) => mutate({ actions })} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      {children}
    </main>
  );
}

export function Head({
  eyebrow,
  title,
  subtitle,
  extra,
  saving,
  dirty,
  onSave,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  extra?: React.ReactNode;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        {extra}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button onClick={onSave} disabled={saving || !dirty} className="btn btn-primary">
          {saving ? "Kaydediliyor…" : dirty ? "Kaydet" : "Kaydedildi ✓"}
        </button>
        <Link href="/diagnoz" className="text-xs text-[var(--muted-2)] hover:underline">
          Teşhise dön
        </Link>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-[15px] font-semibold tracking-[-0.012em]">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-xs text-[var(--muted-2)]">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function FiveWhy({ steps, onChange }: { steps: WhyStep[]; onChange: (s: WhyStep[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...steps, { statement: draft.trim(), isRootCause: false }]);
    setDraft("");
  };
  return (
    <Section title="5 Neden (5 Why)" hint="Her adımda &quot;neden?&quot; diye derinleş; kök nedeni işaretle.">
      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-sm text-[var(--muted-2)]">{i + 1}.</span>
            <input
              value={s.statement}
              onChange={(e) => onChange(steps.map((x, j) => (j === i ? { ...x, statement: e.target.value } : x)))}
              className="field"
            />
            <button
              onClick={() => onChange(steps.map((x, j) => (j === i ? { ...x, isRootCause: !x.isRootCause } : x)))}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${s.isRootCause ? "bg-[var(--st-ok)] text-[var(--on-ink)]" : "border border-[var(--rule-strong)] text-[var(--muted)]"}`}
            >
              Kök neden
            </button>
            <button onClick={() => onChange(steps.filter((_, j) => j !== i))} className="shrink-0 text-[var(--muted-2)] hover:text-[var(--st-risk)]">✕</button>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Neden? →" className="field" />
        <button onClick={add} className="btn btn-secondary shrink-0">Ekle</button>
      </div>
    </Section>
  );
}

function Fishbone({ items, onChange }: { items: FishboneItem[]; onChange: (i: FishboneItem[]) => void }) {
  return (
    <Section title="Balık Kılçığı (6M)">
      <div className="grid gap-3 sm:grid-cols-2">
        {FISHBONE_CATEGORIES.map((cat) => (
          <FishboneColumn
            key={cat.key}
            label={cat.label}
            causes={items.filter((i) => i.category === cat.key)}
            onAdd={(cause) => onChange([...items, { category: cat.key, cause }])}
            onRemove={(cause) => onChange(items.filter((i) => !(i.category === cat.key && i.cause === cause)))}
          />
        ))}
      </div>
    </Section>
  );
}

function FishboneColumn({
  label,
  causes,
  onAdd,
  onRemove,
}: {
  label: string;
  causes: FishboneItem[];
  onAdd: (cause: string) => void;
  onRemove: (cause: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="record-row">
      <div className="mb-2 text-sm font-semibold text-[var(--ink)]">{label}</div>
      <ul className="mb-2 flex flex-col gap-1">
        {causes.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <span>{c.cause}</span>
            <button onClick={() => onRemove(c.cause)} className="text-[var(--muted-2)] hover:text-[var(--st-risk)]">✕</button>
          </li>
        ))}
      </ul>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            onAdd(draft.trim());
            setDraft("");
          }
        }}
        placeholder={`${label} nedeni…`}
        className="field text-xs"
      />
    </div>
  );
}

function Actions({ actions, onChange }: { actions: ActionItem[]; onChange: (a: ActionItem[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...actions, { action: draft.trim(), owner: null, status: "OPEN" }]);
    setDraft("");
  };
  return (
    <Section title="Aksiyonlar">
      <ul className="flex flex-col gap-2">
        {actions.map((a, i) => (
          <li key={i} className="flex items-center gap-2">
            <input value={a.action} onChange={(e) => onChange(actions.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)))} className="field" />
            <input value={a.owner ?? ""} onChange={(e) => onChange(actions.map((x, j) => (j === i ? { ...x, owner: e.target.value || null } : x)))} placeholder="Sorumlu" className="field field-sm" />
            <select
              value={a.status}
              onChange={(e) => onChange(actions.map((x, j) => (j === i ? { ...x, status: e.target.value as ActionStatus } : x)))}
              className="field field-sm"
            >
              {(["OPEN", "IN_PROGRESS", "IMPLEMENTED", "EFFECTIVENESS_DUE", "EFFECTIVE", "INEFFECTIVE", "DONE"] as ActionStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button onClick={() => onChange(actions.filter((_, j) => j !== i))} className="shrink-0 text-[var(--muted-2)] hover:text-[var(--st-risk)]">✕</button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Yeni aksiyon…" className="field" />
        <button onClick={add} className="btn btn-secondary shrink-0">Ekle</button>
      </div>
    </Section>
  );
}
