"use client";

// Öğrenme ve standartlaştırma: kalıcı ders kaydı ve yayma kararı.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { DOCUMENT_LABELS } from "@/components/workspace/panels/documents-panel";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import type { LearningDecision } from "@/domain/workspace-intelligence";

export type LearningRecord = {
  rootCause: string;
  effectiveCountermeasure: string;
  verification: string;
  standardization: string;
  reuseScope: string;
  tags: string;
};


export function LearningDecisionPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const record: LearningDecision = workspace.learningDecision;
  const set = (patch: Partial<LearningDecision>) =>
    onChange({ learningDecision: { ...record, ...patch } });
  return (
    <section className="card p-6">
      <p className="eyebrow">Lessons Learned kapısı</p>
      <h2 className="text-[15px] font-semibold tracking-[-0.012em]">Öğrenimi sisteme bağla</h2>
      <p className="mt-1 text-xs text-[var(--muted-2)]">
        Kapanış için onaylı bir doküman çıktısı veya kanıtlanmış “güncelleme
        gerekmiyor” kararı zorunludur.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <textarea
          className="field min-h-24"
          value={record.summary}
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="Bu vakadan öğrenilen sistem dersi"
        />
        <div className="grid gap-2">
          <select
            className="field"
            value={record.decision}
            onChange={(e) =>
              set({
                decision: e.target.value as LearningDecision["decision"],
                decidedAt:
                  e.target.value !== "PENDING"
                    ? new Date().toISOString()
                    : null,
              })
            }
          >
            <option value="PENDING">Karar bekleniyor</option>
            <option value="DOCUMENT_UPDATED">
              Sistem dokümanı güncellendi
            </option>
            <option value="NO_UPDATE_REQUIRED">Güncelleme gerekmiyor</option>
          </select>
          <input
            className="field"
            value={record.owner}
            onChange={(e) => set({ owner: e.target.value })}
            placeholder="Öğrenim sahibi"
          />
          <input
            className="field"
            value={record.approvedBy}
            onChange={(e) => set({ approvedBy: e.target.value })}
            placeholder="Kararı onaylayan"
          />
        </div>
        <textarea
          className="field min-h-20"
          value={record.rationale}
          onChange={(e) => set({ rationale: e.target.value })}
          placeholder="Karar gerekçesi"
        />
        <select
          multiple
          disabled={record.decision !== "DOCUMENT_UPDATED"}
          className="field h-24 text-xs"
          value={record.documentIds}
          onChange={(e) =>
            set({
              documentIds: [...e.target.selectedOptions].map((o) => o.value),
            })
          }
        >
          {workspace.systemDocuments.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {DOCUMENT_LABELS[doc.type]} · {doc.title || "İsimsiz"} ·{" "}
              {doc.status}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

export function LearningRecordPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const empty: LearningRecord = {
    rootCause: "",
    effectiveCountermeasure: "",
    verification: "",
    standardization: "",
    reuseScope: "",
    tags: "",
  };
  const stored = workspace.specialty.learningRecord;
  const record: LearningRecord =
    typeof stored === "object" && stored !== null
      ? { ...empty, ...(stored as Partial<LearningRecord>) }
      : empty;
  const set = (patch: Partial<LearningRecord>) =>
    onChange({
      specialty: {
        ...workspace.specialty,
        learningRecord: { ...record, ...patch },
      },
    });
  const verifiedCauses = workspace.claims.filter(
    (claim) => claim.kind === "ROOT_CAUSE" && claim.status === "VERIFIED",
  );
  const effectiveActions = workspace.actions.filter(
    (action) => action.status === "EFFECTIVE" || action.status === "DONE",
  );
  const suggest = () =>
    set({
      rootCause:
        record.rootCause ||
        verifiedCauses.map((claim) => claim.statement).join("; "),
      effectiveCountermeasure:
        record.effectiveCountermeasure ||
        effectiveActions.map((action) => action.action).join("; "),
      verification:
        record.verification ||
        effectiveActions
          .map((action) =>
            [action.successMetric, action.actual].filter(Boolean).join(": "),
          )
          .filter(Boolean)
          .join("; "),
    });
  const completeness = Object.values(record).filter((value) =>
    value.trim(),
  ).length;
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Kurumsal öğrenim</p>
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
            Bu vakadan neyi standartlaştırıyoruz?
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-2)]">
            Kapanan vakayı gelecekte bulunabilir ve yeniden kullanılabilir bir
            mühendislik hafızasına dönüştür.
          </p>
        </div>
        <div className="text-right">
          <strong className="text-sm">{completeness}/6 alan</strong>
          <button
            type="button"
            onClick={suggest}
            className="btn btn-secondary ml-3"
          >
            Doğrulanmış veriden getir
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <textarea
          className="field min-h-24"
          value={record.rootCause}
          onChange={(e) => set({ rootCause: e.target.value })}
          placeholder="Doğrulanmış kök neden"
        />
        <textarea
          className="field min-h-24"
          value={record.effectiveCountermeasure}
          onChange={(e) => set({ effectiveCountermeasure: e.target.value })}
          placeholder="Etkili olduğu doğrulanan karşı önlem"
        />
        <textarea
          className="field min-h-24"
          value={record.verification}
          onChange={(e) => set({ verification: e.target.value })}
          placeholder="Hangi metrik ve kanıtla doğrulandı?"
        />
        <textarea
          className="field min-h-24"
          value={record.standardization}
          onChange={(e) => set({ standardization: e.target.value })}
          placeholder="Talimat, kontrol planı, FMEA veya bakım standardında ne değişti?"
        />
        <input
          className="field"
          value={record.reuseScope}
          onChange={(e) => set({ reuseScope: e.target.value })}
          placeholder="Yeniden kullanım kapsamı: proses / ürün / makine ailesi"
        />
        <input
          className="field"
          value={record.tags}
          onChange={(e) => set({ tags: e.target.value })}
          placeholder="Etiketler: kaynak, çatlak, fikstür (virgülle)"
        />
      </div>
    </section>
  );
}

