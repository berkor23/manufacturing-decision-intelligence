"use client";

// Organizasyon bağlamı: bağlam sözleşmesi, sistem davranışı, KYS sağlığı, gemba.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { type GembaBehaviorItem, type QmsDimension, type QmsHealthItem, type SystemBehaviorAnalysis, contextCompleteness, isPersonBlaming, qmsHealthScore } from "@/domain/organization-context";
import { PanelTitle } from "@/components/workspace/panel-kit";

const QMS_LABELS: Record<QmsDimension, string> = {
  QUALITY_CAPACITY: "Kalite kaynak kapasitesi",
  PRODUCTION_PRESSURE: "Üretim baskısı",
  STANDARD_COVERAGE: "Standart kapsamı",
  DATA_RELIABILITY: "Veri güvenilirliği",
  COST_OF_QUALITY: "Kalite maliyeti",
  RECURRENCE: "Tekrar oranı",
  CAPA_LOAD: "CAPA yükü",
  PRIORITY_ALIGNMENT: "Yönetim öncelik uyumu",
};

export function OrganizationContextPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const contract = contextCompleteness(workspace.contextContract);
  const health = qmsHealthScore(workspace.qmsHealth);
  const setContract = (key: keyof WsData["contextContract"], value: string) =>
    onChange({
      contextContract: { ...workspace.contextContract, [key]: value },
    });
  const addSystem = () =>
    onChange({
      systemBehaviorAnalyses: [
        ...workspace.systemBehaviorAnalyses,
        {
          id: crypto.randomUUID(),
          observedBehavior: "",
          systemCondition: "",
          managementAssumption: "",
          localKpi: "",
          incentiveConflict: "",
          delayedEffect: "",
          feedbackLoop: "",
          interventionHypothesis: "",
          evidenceIds: [],
        },
      ],
    });
  const updateSystem = (id: string, patch: Partial<SystemBehaviorAnalysis>) =>
    onChange({
      systemBehaviorAnalyses: workspace.systemBehaviorAnalyses.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const addQms = (dimension: QmsDimension) => {
    if (workspace.qmsHealth.some((x) => x.dimension === dimension)) return;
    onChange({
      qmsHealth: [
        ...workspace.qmsHealth,
        {
          dimension,
          score: 3,
          observation: "",
          evidenceIds: [],
          owner: "",
          action: "",
        },
      ],
    });
  };
  const updateQms = (dimension: QmsDimension, patch: Partial<QmsHealthItem>) =>
    onChange({
      qmsHealth: workspace.qmsHealth.map((x) =>
        x.dimension === dimension ? { ...x, ...patch } : x,
      ),
    });
  const addGemba = () =>
    onChange({
      gembaBehaviorMap: [
        ...workspace.gembaBehaviorMap,
        {
          id: crypto.randomUUID(),
          processStep: "",
          expectedStandard: "",
          actualBehavior: "",
          humanDecisionPoint: "",
          repeatedQuestion: "",
          searchOrMotion: "",
          errorOpportunity: "",
          compensationBehavior: "",
          physicalConstraint: "",
          pokaYokeIdea: "",
          evidenceIds: [],
        },
      ],
    });
  const updateGemba = (id: string, patch: Partial<GembaBehaviorItem>) =>
    onChange({
      gembaBehaviorMap: workspace.gembaBehaviorMap.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">P3.1 · Bağlam sözleşmesi</p>
            <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
              Yöntemin sınırlarını işe başlamadan tanımla
            </h2>
          </div>
          <span
            className={`px-3 py-1 text-xs ${contract.ready ? "bg-[var(--st-ok-bg)] text-[var(--st-ok)]" : "bg-[var(--st-warn-bg)] text-[var(--st-warn)]"}`}
          >
            {contract.complete}/{contract.total}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(
            [
              ["purpose", "Amaç"],
              ["scope", "Kapsam"],
              ["outOfScope", "Kapsam dışı"],
              ["successMetric", "Başarı ölçütü"],
              ["methodRole", "Yöntemin bu vakadaki rolü"],
              ["pivotCondition", "Bırakma / yöntem değiştirme koşulu"],
              ["misuseRisk", "Yanlış kullanım riski"],
              ["undesiredBehavior", "Üretmesini istemediğimiz davranış"],
              ["owner", "Sözleşme sahibi"],
              ["approvedBy", "Onaylayan"],
            ] as const
          ).map(([key, label]) => (
            <textarea
              key={key}
              className="field min-h-20"
              value={workspace.contextContract[key]}
              onChange={(e) => setContract(key, e.target.value)}
              placeholder={label}
            />
          ))}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P3.2 · Sistem düşüncesi"
          title="Davranıştan sisteme ve zihinsel modele"
          action="Analiz satırı ekle"
          onAction={addSystem}
        />
        <div className="record-list mt-4">
          {workspace.systemBehaviorAnalyses.map((x) => (
            <div
              key={x.id}
              className={`record-row ${isPersonBlaming(x.observedBehavior) && !x.systemCondition.trim() ? "record-row-risk" : ""}`}
            >
              <div className="grid gap-2 md:grid-cols-3">
                <input
                  className="field"
                  value={x.observedBehavior}
                  onChange={(e) =>
                    updateSystem(x.id, { observedBehavior: e.target.value })
                  }
                  placeholder="Gözlenen davranış"
                />
                <input
                  className="field"
                  value={x.systemCondition}
                  onChange={(e) =>
                    updateSystem(x.id, { systemCondition: e.target.value })
                  }
                  placeholder="Buna izin veren sistem koşulu"
                />
                <input
                  className="field"
                  value={x.managementAssumption}
                  onChange={(e) =>
                    updateSystem(x.id, { managementAssumption: e.target.value })
                  }
                  placeholder="Yönetim varsayımı"
                />
                <input
                  className="field"
                  value={x.localKpi}
                  onChange={(e) =>
                    updateSystem(x.id, { localKpi: e.target.value })
                  }
                  placeholder="Yerel KPI"
                />
                <input
                  className="field"
                  value={x.incentiveConflict}
                  onChange={(e) =>
                    updateSystem(x.id, { incentiveConflict: e.target.value })
                  }
                  placeholder="Teşvik / hedef çatışması"
                />
                <input
                  className="field"
                  value={x.delayedEffect}
                  onChange={(e) =>
                    updateSystem(x.id, { delayedEffect: e.target.value })
                  }
                  placeholder="Gecikmeli etki"
                />
                <input
                  className="field"
                  value={x.feedbackLoop}
                  onChange={(e) =>
                    updateSystem(x.id, { feedbackLoop: e.target.value })
                  }
                  placeholder="Geri besleme döngüsü"
                />
                <input
                  className="field md:col-span-2"
                  value={x.interventionHypothesis}
                  onChange={(e) =>
                    updateSystem(x.id, {
                      interventionHypothesis: e.target.value,
                    })
                  }
                  placeholder="Sistem müdahalesi hipotezi"
                />
              </div>
              {isPersonBlaming(x.observedBehavior) &&
                !x.systemCondition.trim() && (
                  <p className="mt-2 text-xs text-[var(--st-risk)]">
                    Kişi etiketi son neden olamaz; davranışa izin veren sistem
                    koşulunu açıklayın.
                  </p>
                )}
            </div>
          ))}
        </div>
      </section>
      <section className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">P3.3 · QMS sağlık taraması</p>
            <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
              Kalite sisteminin taşıma kapasitesi
            </h2>
          </div>
          <span
            className={`px-3 py-1 text-xs ${health.level ==="HEALTHY" ? "bg-[var(--st-ok-bg)] text-[var(--st-ok)]" : health.level === "CRITICAL" ? "bg-[var(--st-risk-bg)] text-[var(--st-risk)]" : "bg-[var(--st-warn-bg)] text-[var(--st-warn)]"}`}
          >
            {health.level} {health.score ? health.score.toFixed(1) : "—"}/5
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(Object.keys(QMS_LABELS) as QmsDimension[]).map((d) => {
            const item = workspace.qmsHealth.find((x) => x.dimension === d);
            return (
              <div
                key={d}
                className="record-row"
              >
                {!item ? (
                  <button
                    className="btn btn-secondary w-full"
                    onClick={() => addQms(d)}
                  >
                    {QMS_LABELS[d]} değerlendir
                  </button>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <strong className="text-sm">{QMS_LABELS[d]}</strong>
                      <select
                        className="field field-sm w-28"
                        value={item.score}
                        onChange={(e) =>
                          updateQms(d, {
                            score: Number(
                              e.target.value,
                            ) as QmsHealthItem["score"],
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v}/5
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      className="field mt-2 min-h-16"
                      value={item.observation}
                      onChange={(e) =>
                        updateQms(d, { observation: e.target.value })
                      }
                      placeholder="Saha bulgusu / kanıt"
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        className="field"
                        value={item.owner}
                        onChange={(e) =>
                          updateQms(d, { owner: e.target.value })
                        }
                        placeholder="Sorumlu"
                      />
                      <input
                        className="field"
                        value={item.action}
                        onChange={(e) =>
                          updateQms(d, { action: e.target.value })
                        }
                        placeholder="İyileştirme aksiyonu"
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P3.4 · Gemba davranış haritası"
          title="Standart ile gerçek iş arasındaki boşluk"
          action="Gemba satırı ekle"
          onAction={addGemba}
        />
        <div className="record-list mt-4">
          {workspace.gembaBehaviorMap.map((x) => (
            <div
              key={x.id}
              className="record-row"
            >
              <div className="grid gap-2 md:grid-cols-3">
                <input
                  className="field"
                  value={x.processStep}
                  onChange={(e) =>
                    updateGemba(x.id, { processStep: e.target.value })
                  }
                  placeholder="Proses adımı"
                />
                <input
                  className="field"
                  value={x.expectedStandard}
                  onChange={(e) =>
                    updateGemba(x.id, { expectedStandard: e.target.value })
                  }
                  placeholder="Beklenen standart"
                />
                <input
                  className="field"
                  value={x.actualBehavior}
                  onChange={(e) =>
                    updateGemba(x.id, { actualBehavior: e.target.value })
                  }
                  placeholder="Gerçek davranış"
                />
                <input
                  className="field"
                  value={x.humanDecisionPoint}
                  onChange={(e) =>
                    updateGemba(x.id, { humanDecisionPoint: e.target.value })
                  }
                  placeholder="İnsan karar noktası"
                />
                <input
                  className="field"
                  value={x.repeatedQuestion}
                  onChange={(e) =>
                    updateGemba(x.id, { repeatedQuestion: e.target.value })
                  }
                  placeholder="Tekrarlanan soru"
                />
                <input
                  className="field"
                  value={x.searchOrMotion}
                  onChange={(e) =>
                    updateGemba(x.id, { searchOrMotion: e.target.value })
                  }
                  placeholder="Arama / gereksiz hareket"
                />
                <input
                  className="field"
                  value={x.errorOpportunity}
                  onChange={(e) =>
                    updateGemba(x.id, { errorOpportunity: e.target.value })
                  }
                  placeholder="Hata fırsatı"
                />
                <input
                  className="field"
                  value={x.compensationBehavior}
                  onChange={(e) =>
                    updateGemba(x.id, { compensationBehavior: e.target.value })
                  }
                  placeholder="Telafi davranışı"
                />
                <input
                  className="field"
                  value={x.physicalConstraint}
                  onChange={(e) =>
                    updateGemba(x.id, { physicalConstraint: e.target.value })
                  }
                  placeholder="Fiziksel kısıt"
                />
                <input
                  className="field md:col-span-3"
                  value={x.pokaYokeIdea}
                  onChange={(e) =>
                    updateGemba(x.id, { pokaYokeIdea: e.target.value })
                  }
                  placeholder="Kaynakta önleme / Poka-Yoke fikri"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

