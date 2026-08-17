"use client";

// Sistem dokümanları ve containment (geçici koruma) kontrolleri.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import type { ContainmentControl, SystemDocument, SystemDocumentType } from "@/domain/workspace-intelligence";

export const DOCUMENT_LABELS: Record<SystemDocumentType, string> = {
  STANDARD_WORK: "Standart İş",
  CONTROL_PLAN: "Control Plan",
  PFMEA: "PFMEA",
  DFMEA: "DFMEA",
  MAINTENANCE_PLAN: "Bakım Planı",
  INSPECTION_INSTRUCTION: "Kontrol Talimatı",
  OPL: "OPL",
  COMPETENCY_RECORD: "Yetkinlik Kaydı",
};

export function SystemDocumentsPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const add = () => {
    const item: SystemDocument = {
      id: crypto.randomUUID(),
      type: "STANDARD_WORK",
      title: "",
      revision: "00",
      status: "DRAFT",
      owner: "",
      approver: "",
      effectiveDate: null,
      changeSummary: "",
      evidenceIds: [],
      relatedWorkspaceId: workspace.id,
    };
    onChange({ systemDocuments: [...workspace.systemDocuments, item] });
  };
  const update = (id: string, patch: Partial<SystemDocument>) =>
    onChange({
      systemDocuments: workspace.systemDocuments.map((doc) =>
        doc.id === id ? { ...doc, ...patch } : doc,
      ),
    });
  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Gerçek sistem dokümanları</p>
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
            Revizyon ve onay kontrollü çıktılar
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-2)]">
            “Güncellendi” notu yerine sahibi, revizyonu, kanıtı ve yürürlük
            tarihi olan izlenebilir bir nesne oluşturun.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={add}>
          Doküman ekle
        </button>
      </div>
      <div className="record-list mt-4">
        {workspace.systemDocuments.map((doc) => (
          <div
            key={doc.id}
            className="record-row"
          >
            <div className="grid gap-2 md:grid-cols-4">
              <select
                className="field"
                value={doc.type}
                onChange={(e) =>
                  update(doc.id, { type: e.target.value as SystemDocumentType })
                }
              >
                {Object.entries(DOCUMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                className="field md:col-span-2"
                value={doc.title}
                onChange={(e) => update(doc.id, { title: e.target.value })}
                placeholder="Doküman adı / numarası"
              />
              <input
                className="field"
                value={doc.revision}
                onChange={(e) => update(doc.id, { revision: e.target.value })}
                placeholder="Revizyon"
              />
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <input
                className="field"
                value={doc.owner}
                onChange={(e) => update(doc.id, { owner: e.target.value })}
                placeholder="Doküman sahibi"
              />
              <input
                className="field"
                value={doc.approver}
                onChange={(e) => update(doc.id, { approver: e.target.value })}
                placeholder="Onaylayan"
              />
              <input
                className="field"
                type="date"
                value={doc.effectiveDate ?? ""}
                onChange={(e) =>
                  update(doc.id, { effectiveDate: e.target.value || null })
                }
              />
              <select
                className="field"
                value={doc.status}
                onChange={(e) =>
                  update(doc.id, {
                    status: e.target.value as SystemDocument["status"],
                  })
                }
              >
                <option value="DRAFT">Taslak</option>
                <option value="IN_REVIEW">İncelemede</option>
                <option value="APPROVED">Onaylı / yürürlükte</option>
                <option value="SUPERSEDED">Eski revizyon</option>
              </select>
            </div>
            <textarea
              className="field mt-2 min-h-20"
              value={doc.changeSummary}
              onChange={(e) =>
                update(doc.id, { changeSummary: e.target.value })
              }
              placeholder="Değişiklik özeti ve bu vakayla ilişkisi"
            />
            <select
              multiple
              className="field mt-2 h-16 text-xs"
              value={doc.evidenceIds}
              onChange={(e) =>
                update(doc.id, {
                  evidenceIds: [...e.target.selectedOptions].map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {workspace.evidence.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
        ))}
        {!workspace.systemDocuments.length && (
          <p className="text-sm text-[var(--muted-2)]">
            Henüz sürümlü sistem çıktısı oluşturulmadı.
          </p>
        )}
      </div>
    </section>
  );
}

export function ContainmentPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const add = () => {
    const item: ContainmentControl = {
      id: crypto.randomUUID(),
      purpose: "",
      scope: "",
      startedAt: new Date().toISOString(),
      owner: "",
      effectivenessMetric: "",
      currentResult: "",
      costOrBurden: "",
      removalCriteria: "",
      status: "ACTIVE",
      removalApprovedBy: "",
      removedAt: null,
      permanentActionId: null,
      evidenceIds: [],
    };
    onChange({ containmentControls: [...workspace.containmentControls, item] });
  };
  const update = (id: string, patch: Partial<ContainmentControl>) =>
    onChange({
      containmentControls: workspace.containmentControls.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Containment yaşam döngüsü</p>
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
            Geçici kontrolü görünür ve sonlandırılabilir tut
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-2)]">
            Aktif veya doğrulanan geçici kontrol kaldırılmadan ya da kalıcı
            kontrole devredilmeden vaka kapanmaz.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={add}>
          Containment ekle
        </button>
      </div>
      <div className="record-list mt-4">
        {workspace.containmentControls.map((item) => (
          <div
            key={item.id}
            className="record-row"
          >
            <div className="grid gap-2 md:grid-cols-4">
              <input
                className="field"
                value={item.purpose}
                onChange={(e) => update(item.id, { purpose: e.target.value })}
                placeholder="Amaç / korunan risk"
              />
              <input
                className="field"
                value={item.scope}
                onChange={(e) => update(item.id, { scope: e.target.value })}
                placeholder="Stok, müşteri, proses kapsamı"
              />
              <input
                className="field"
                value={item.owner}
                onChange={(e) => update(item.id, { owner: e.target.value })}
                placeholder="Sorumlu"
              />
              <select
                className="field"
                value={item.status}
                onChange={(e) =>
                  update(item.id, {
                    status: e.target.value as ContainmentControl["status"],
                    removedAt: ["REMOVED", "TRANSFERRED"].includes(
                      e.target.value,
                    )
                      ? new Date().toISOString()
                      : null,
                  })
                }
              >
                <option value="ACTIVE">Aktif</option>
                <option value="VERIFYING">Etkinlik doğrulanıyor</option>
                <option value="REMOVED">Kaldırıldı</option>
                <option value="TRANSFERRED">Kalıcı kontrole devredildi</option>
              </select>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <input
                className="field"
                value={item.effectivenessMetric}
                onChange={(e) =>
                  update(item.id, { effectivenessMetric: e.target.value })
                }
                placeholder="Etkinlik metriği"
              />
              <input
                className="field"
                value={item.currentResult}
                onChange={(e) =>
                  update(item.id, { currentResult: e.target.value })
                }
                placeholder="Güncel sonuç"
              />
              <input
                className="field"
                value={item.costOrBurden}
                onChange={(e) =>
                  update(item.id, { costOrBurden: e.target.value })
                }
                placeholder="Maliyet / operasyon yükü"
              />
              <input
                className="field"
                value={item.removalCriteria}
                onChange={(e) =>
                  update(item.id, { removalCriteria: e.target.value })
                }
                placeholder="Kaldırma kriteri"
              />
              <input
                className="field"
                value={item.removalApprovedBy}
                onChange={(e) =>
                  update(item.id, { removalApprovedBy: e.target.value })
                }
                placeholder="Kaldırma onayı"
              />
              <select
                className="field"
                value={item.permanentActionId ?? ""}
                onChange={(e) =>
                  update(item.id, { permanentActionId: e.target.value || null })
                }
              >
                <option value="">Kalıcı aksiyon bağlantısı</option>
                {workspace.actions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.action}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {!workspace.containmentControls.length && (
          <p className="text-sm text-[var(--muted-2)]">
            Bu vakada kayıtlı geçici kontrol yok.
          </p>
        )}
      </div>
    </section>
  );
}

