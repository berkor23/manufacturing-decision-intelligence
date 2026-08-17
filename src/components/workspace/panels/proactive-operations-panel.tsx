"use client";

// Proaktif operasyonlar: zayıf sinyaller, günlük yönetim, kaizen, OPL, kontrol yükü.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useState } from "react";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import type { Methodology } from "@/domain/diagnosis";
import { type ControlBurdenItem, type DailyManagementRecord, type KaizenExperiment, type OplLesson, type WeakSignal, type WeakSignalStatus, canTransitionSignal, controlBurdenSummary, oplCompetencyReady } from "@/domain/proactive-operations";
import { PanelTitle, RecordCardHeader, canRemoveRecord } from "@/components/workspace/panel-kit";

const SIGNAL_TYPE_LABELS: Record<WeakSignal["type"], string> = {
  HUMAN_OBSERVATION: "İnsan gözlemi",
  PROCESS_MEASUREMENT: "Proses ölçüm sapması",
  MICRO_STOP: "Mikro duruş",
  TEMPORARY_INTERVENTION: "Geçici müdahale ihtiyacı",
  REMEASUREMENT: "Tekrar ölçüm",
  SORTING: "Ayıklama artışı",
  WIP: "Proses içi stok artışı",
  SCHEDULE_CHANGE: "Plan değişikliği",
  OVERTIME: "Fazla mesai artışı",
  MAINTENANCE_DEFERRAL: "Ertelenen bakım",
  PSYCHOLOGICAL_SAFETY: "Sorun bildirme / psikolojik güvenlik",
};
const SIGNAL_STATUS_LABELS: Record<WeakSignalStatus, string> = {
  NEW: "Yeni · henüz değerlendirilmedi",
  TRIAGED: "Ön değerlendirme yapıldı",
  VERIFYING: "Veriyle doğrulanıyor",
  DISMISSED: "Risk olmadığı doğrulandı",
  WATCHING: "İzleme listesinde",
  CASE_OPENED: "Problem vakasına dönüştürüldü",
};

export function ProactiveOperationsPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const [opening, setOpening] = useState<string | null>(null);
  const burden = controlBurdenSummary(workspace.controlBurden);
  const openCase = async (
    id: string,
    methodology: Methodology,
    reason: string,
  ) => {
    setOpening(id);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWorkspaceId: workspace.id,
          methodology,
          problemDescription: workspace.problemDescription,
          reason,
          relation: "FOLLOW_UP",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vaka açılamadı.");
      window.open(`/workspace/${data.id}`, "_self");
    } finally {
      setOpening(null);
    }
  };
  const updateSignal = (id: string, patch: Partial<WeakSignal>) =>
    onChange({
      weakSignals: workspace.weakSignals.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeSignal = (x: WeakSignal) => {
    if (
      canRemoveRecord(
        "Zayıf sinyal",
        Boolean(x.description.trim() || x.hypothesis.trim()),
      )
    )
      onChange({
        weakSignals: workspace.weakSignals.filter((item) => item.id !== x.id),
      });
  };
  const addSignal = () =>
    onChange({
      weakSignals: [
        ...workspace.weakSignals,
        {
          id: crypto.randomUUID(),
          type: "HUMAN_OBSERVATION",
          description: "",
          source: "",
          detectedAt: new Date().toISOString(),
          status: "NEW",
          hypothesis: "",
          verificationTask: "",
          owner: "",
          dueDate: null,
          evidenceIds: [],
          linkedWorkspaceId: null,
        },
      ],
    });
  const addDaily = () =>
    onChange({
      dailyManagement: [
        ...workspace.dailyManagement,
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          tier: "TIER_1",
          area: "",
          safety: "",
          quality: "",
          delivery: "",
          cost: "",
          people: "",
          yesterdayDeviation: "",
          todayRisk: "",
          action: "",
          owner: "",
          escalation: "NONE",
          gembaTask: "",
          shiftHandover: "",
          linkedWorkspaceId: null,
        },
      ],
    });
  const updateDaily = (id: string, patch: Partial<DailyManagementRecord>) =>
    onChange({
      dailyManagement: workspace.dailyManagement.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeDaily = (x: DailyManagementRecord) => {
    if (canRemoveRecord("Günlük yönetim kaydı", Boolean(x.area.trim() || x.action.trim())))
      onChange({ dailyManagement: workspace.dailyManagement.filter((item) => item.id !== x.id) });
  };
  const addKaizen = () =>
    onChange({
      kaizenExperiments: [
        ...workspace.kaizenExperiments,
        {
          id: crypto.randomUUID(),
          idea: "",
          owner: "",
          risk: "LOW",
          status: "IDEA",
          hypothesis: "",
          measure: "",
          baseline: "",
          result: "",
          standardDocumentId: null,
          yokotenScope: "",
          escalationMethod: null,
        },
      ],
    });
  const updateKaizen = (id: string, patch: Partial<KaizenExperiment>) =>
    onChange({
      kaizenExperiments: workspace.kaizenExperiments.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeKaizen = (x: KaizenExperiment) => {
    if (canRemoveRecord("İyileştirme deneyi", Boolean(x.idea.trim() || x.result.trim())))
      onChange({ kaizenExperiments: workspace.kaizenExperiments.filter((item) => item.id !== x.id) });
  };
  const addOpl = () =>
    onChange({
      oplLessons: [
        ...workspace.oplLessons,
        {
          id: crypto.randomUUID(),
          type: "BASIC",
          title: "",
          objective: "",
          correctVisual: "",
          wrongVisual: "",
          limit: "",
          mediaUrl: "",
          station: "",
          revision: "00",
          reviewDate: null,
          linkedDocumentIds: [],
          quizQuestion: "",
          quizAnswer: "",
          trainee: "",
          competency: "PENDING",
        },
      ],
    });
  const updateOpl = (id: string, patch: Partial<OplLesson>) =>
    onChange({
      oplLessons: workspace.oplLessons.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeOpl = (x: OplLesson) => {
    if (canRemoveRecord("Tek Nokta Dersi", Boolean(x.title.trim() || x.objective.trim())))
      onChange({ oplLessons: workspace.oplLessons.filter((item) => item.id !== x.id) });
  };
  const addControl = () =>
    onChange({
      controlBurden: [
        ...workspace.controlBurden,
        {
          id: crypto.randomUUID(),
          controlPoint: "",
          type: "DETECTION",
          frequency: "",
          cost: "",
          escapeRisk: "",
          falseAcceptReject: "",
          temporary: true,
          sourcePreventionQuestion: "",
          preventionAlternative: "",
          removalCriteria: "",
          status: "ACTIVE",
        },
      ],
    });
  const updateControl = (id: string, patch: Partial<ControlBurdenItem>) =>
    onChange({
      controlBurden: workspace.controlBurden.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeControl = (x: ControlBurdenItem) => {
    if (canRemoveRecord("Kontrol noktası", Boolean(x.controlPoint.trim())))
      onChange({ controlBurden: workspace.controlBurden.filter((item) => item.id !== x.id) });
  };
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-6">
        <PanelTitle
          eyebrow="P2.1 · Erken uyarı"
          title="Zayıf sinyal merkezi"
          description="Henüz arızaya dönüşmemiş küçük sapmaları kaydedin. Sinyal türü kaynağı sınıflandırır; durum ise kaydın araştırma sürecinde nerede olduğunu gösterir."
          action="Sinyal ekle"
          onAction={addSignal}
        />
        <div className="record-list mt-4">
          {workspace.weakSignals.map((x) => (
            <div
              key={x.id}
              className="record-row"
            >
              <div className="mb-3 flex items-center justify-between">
                <strong className="text-sm">Zayıf sinyal kaydı</strong>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--st-risk)] hover:underline"
                  onClick={() => removeSignal(x)}
                >
                  Kaydı kaldır
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <select
                  aria-label="Sinyalin türü"
                  title="Gözlemin hangi erken uyarı grubuna ait olduğunu seçin."
                  className="field"
                  value={x.type}
                  onChange={(e) =>
                    updateSignal(x.id, {
                      type: e.target.value as WeakSignal["type"],
                    })
                  }
                >
                  {Object.entries(SIGNAL_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Gözlenen zayıf sinyal"
                  className="field md:col-span-2"
                  value={x.description}
                  onChange={(e) =>
                    updateSignal(x.id, { description: e.target.value })
                  }
                  placeholder="Örn. son üç vardiyada mikro duruşlar arttı"
                />
                <select
                  aria-label="Sinyalin değerlendirme durumu"
                  title="Sinyalin araştırma sürecindeki mevcut aşamasını seçin."
                  className="field"
                  value={x.status}
                  onChange={(e) => {
                    const next = e.target.value as WeakSignalStatus;
                    if (canTransitionSignal(x.status, next))
                      updateSignal(x.id, { status: next });
                  }}
                >
                  {Object.entries(SIGNAL_STATUS_LABELS).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                        disabled={
                          value !== x.status &&
                          !canTransitionSignal(
                            x.status,
                            value as WeakSignalStatus,
                          )
                        }
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <input
                  className="field"
                  value={x.source}
                  onChange={(e) =>
                    updateSignal(x.id, { source: e.target.value })
                  }
                  placeholder="Kaynak / istasyon"
                />
                <input
                  className="field"
                  value={x.hypothesis}
                  onChange={(e) =>
                    updateSignal(x.id, { hypothesis: e.target.value })
                  }
                  placeholder="Araştırma hipotezi (kök neden değil)"
                />
                <input
                  className="field"
                  value={x.verificationTask}
                  onChange={(e) =>
                    updateSignal(x.id, { verificationTask: e.target.value })
                  }
                  placeholder="Hangi veriyle kontrol edilecek?"
                />
                <input
                  className="field"
                  value={x.owner}
                  onChange={(e) =>
                    updateSignal(x.id, { owner: e.target.value })
                  }
                  placeholder="Araştırma sorumlusu"
                />
              </div>
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                Önce gözlemi tarafsız yazın; ardından geçici bir hipotez,
                doğrulama işi ve sorumlu belirleyin. Hipotezi doğrulanmadan kök
                neden olarak kabul etmeyin.
              </p>
              {["VERIFYING", "WATCHING"].includes(x.status) && (
                <button
                  disabled={opening === x.id}
                  className="btn btn-primary mt-2"
                  onClick={() =>
                    void openCase(
                      x.id,
                      "PDCA_A3",
                      `Zayıf sinyal vakası: ${x.description}`,
                    )
                  }
                >
                  Doğrulamayı problem vakasına yükselt
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P2.2 · Günlük yönetim"
          title="Tier 1–3 SQDCP ve eskalasyon"
          action="Günlük kayıt ekle"
          onAction={addDaily}
        />
        <div className="record-list mt-4">
          {workspace.dailyManagement.map((x) => (
            <div
              key={x.id}
              className="record-row"
            >
              <RecordCardHeader title={[x.date, x.area].filter(Boolean).join(" · ") || "Yeni günlük yönetim kaydı"} onRemove={() => removeDaily(x)} />
              <div className="grid gap-2 md:grid-cols-5">
                <input
                  type="date"
                  className="field"
                  value={x.date}
                  onChange={(e) => updateDaily(x.id, { date: e.target.value })}
                />
                <select
                  className="field"
                  value={x.tier}
                  onChange={(e) =>
                    updateDaily(x.id, {
                      tier: e.target.value as DailyManagementRecord["tier"],
                    })
                  }
                >
                  <option value="TIER_1">Tier 1 · Hat</option>
                  <option value="TIER_2">Tier 2 · Bölüm</option>
                  <option value="TIER_3">Tier 3 · Fabrika</option>
                </select>
                <input
                  className="field"
                  value={x.area}
                  onChange={(e) => updateDaily(x.id, { area: e.target.value })}
                  placeholder="Alan"
                />
                <input
                  className="field"
                  value={x.owner}
                  onChange={(e) => updateDaily(x.id, { owner: e.target.value })}
                  placeholder="Aksiyon sahibi"
                />
                <select
                  className="field"
                  value={x.escalation}
                  onChange={(e) =>
                    updateDaily(x.id, {
                      escalation: e.target
                        .value as DailyManagementRecord["escalation"],
                    })
                  }
                >
                  <option value="NONE">Eskalasyon yok</option>
                  <option value="NEXT_TIER">Üst katmana</option>
                  <option value="CASE_OPENED">Vaka açıldı</option>
                </select>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-5">
                {(
                  ["safety", "quality", "delivery", "cost", "people"] as const
                ).map((k) => (
                  <input
                    key={k}
                    className="field"
                    value={x[k]}
                    onChange={(e) => updateDaily(x.id, { [k]: e.target.value })}
                    placeholder={k.toUpperCase()}
                  />
                ))}
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <input
                  className="field"
                  value={x.yesterdayDeviation}
                  onChange={(e) =>
                    updateDaily(x.id, { yesterdayDeviation: e.target.value })
                  }
                  placeholder="Dünkü sapma"
                />
                <input
                  className="field"
                  value={x.todayRisk}
                  onChange={(e) =>
                    updateDaily(x.id, { todayRisk: e.target.value })
                  }
                  placeholder="Bugünkü risk"
                />
                <input
                  className="field"
                  value={x.gembaTask}
                  onChange={(e) =>
                    updateDaily(x.id, { gembaTask: e.target.value })
                  }
                  placeholder="Gemba / vardiya devir görevi"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P2.3 · Hafif Kaizen"
          title="Öneri → deney → ölçüm → standart → Yokoten"
          action="Kaizen ekle"
          onAction={addKaizen}
        />
        <div className="record-list mt-4">
          {workspace.kaizenExperiments.map((x) => (
            <div
              key={x.id}
              className="record-row"
            >
              <RecordCardHeader title={x.idea || "Yeni iyileştirme deneyi"} onRemove={() => removeKaizen(x)} />
              <div className="grid gap-2 md:grid-cols-4">
                <input
                  className="field md:col-span-2"
                  value={x.idea}
                  onChange={(e) => updateKaizen(x.id, { idea: e.target.value })}
                  placeholder="Küçük iyileştirme fikri"
                />
                <input
                  className="field"
                  value={x.owner}
                  onChange={(e) =>
                    updateKaizen(x.id, { owner: e.target.value })
                  }
                  placeholder="Sahibi"
                />
                <select
                  className="field"
                  value={x.risk}
                  onChange={(e) =>
                    updateKaizen(x.id, {
                      risk: e.target.value as KaizenExperiment["risk"],
                      status:
                        e.target.value === "HIGH" ? "ESCALATED" : x.status,
                      escalationMethod:
                        e.target.value === "HIGH"
                          ? (x.escalationMethod ?? "FMEA")
                          : x.escalationMethod,
                    })
                  }
                >
                  <option value="LOW">Düşük risk</option>
                  <option value="MEDIUM">Orta risk</option>
                  <option value="HIGH">Yüksek · yükselt</option>
                </select>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <input
                  className="field"
                  value={x.hypothesis}
                  onChange={(e) =>
                    updateKaizen(x.id, { hypothesis: e.target.value })
                  }
                  placeholder="Deney hipotezi"
                />
                <input
                  className="field"
                  value={x.measure}
                  onChange={(e) =>
                    updateKaizen(x.id, { measure: e.target.value })
                  }
                  placeholder="Ölçüm"
                />
                <input
                  className="field"
                  value={x.baseline}
                  onChange={(e) =>
                    updateKaizen(x.id, { baseline: e.target.value })
                  }
                  placeholder="Önce"
                />
                <input
                  className="field"
                  value={x.result}
                  onChange={(e) =>
                    updateKaizen(x.id, { result: e.target.value })
                  }
                  placeholder="Sonra"
                />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <select
                  className="field"
                  value={x.status}
                  onChange={(e) =>
                    updateKaizen(x.id, {
                      status: e.target.value as KaizenExperiment["status"],
                    })
                  }
                >
                  {[
                    "IDEA",
                    "RISK_REVIEW",
                    "EXPERIMENT",
                    "MEASURED",
                    "STANDARDIZED",
                    "YOKOTEN",
                    "ESCALATED",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <select
                  className="field"
                  value={x.standardDocumentId ?? ""}
                  onChange={(e) =>
                    updateKaizen(x.id, {
                      standardDocumentId: e.target.value || null,
                    })
                  }
                >
                  <option value="">Standart çıktısı</option>
                  {workspace.systemDocuments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || d.type}
                    </option>
                  ))}
                </select>
                <input
                  className="field"
                  value={x.yokotenScope}
                  onChange={(e) =>
                    updateKaizen(x.id, { yokotenScope: e.target.value })
                  }
                  placeholder="Yokoten kapsamı"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P2.4 · Yetkinlik"
          title="Dijital OPL akademisi"
          action="OPL ekle"
          onAction={addOpl}
        />
        <div className="record-list mt-4">
          {workspace.oplLessons.map((x) => (
            <div
              key={x.id}
              className="record-row"
            >
              <RecordCardHeader title={x.title || "Yeni Tek Nokta Dersi"} onRemove={() => removeOpl(x)} />
              <div className="grid gap-2 md:grid-cols-4">
                <select
                  className="field"
                  value={x.type}
                  onChange={(e) =>
                    updateOpl(x.id, {
                      type: e.target.value as OplLesson["type"],
                    })
                  }
                >
                  <option value="BASIC">Temel bilgi</option>
                  <option value="IMPROVEMENT">İyileştirme</option>
                  <option value="SAFETY">Güvenlik</option>
                </select>
                <input
                  className="field"
                  value={x.title}
                  onChange={(e) => updateOpl(x.id, { title: e.target.value })}
                  placeholder="OPL başlığı"
                />
                <input
                  className="field"
                  value={x.objective}
                  onChange={(e) =>
                    updateOpl(x.id, { objective: e.target.value })
                  }
                  placeholder="Tek öğrenme hedefi"
                />
                <input
                  className="field"
                  value={x.limit}
                  onChange={(e) => updateOpl(x.id, { limit: e.target.value })}
                  placeholder="Net limit / değer"
                />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <input
                  className="field"
                  value={x.correctVisual}
                  onChange={(e) =>
                    updateOpl(x.id, { correctVisual: e.target.value })
                  }
                  placeholder="Doğru görsel bağlantısı"
                />
                <input
                  className="field"
                  value={x.wrongVisual}
                  onChange={(e) =>
                    updateOpl(x.id, { wrongVisual: e.target.value })
                  }
                  placeholder="Yanlış görsel bağlantısı"
                />
                <input
                  className="field"
                  value={x.mediaUrl}
                  onChange={(e) =>
                    updateOpl(x.id, { mediaUrl: e.target.value })
                  }
                  placeholder="Mikro video / QR"
                />
                <input
                  className="field"
                  value={x.station}
                  onChange={(e) => updateOpl(x.id, { station: e.target.value })}
                  placeholder="İstasyon"
                />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <input
                  className="field"
                  value={x.quizQuestion}
                  onChange={(e) =>
                    updateOpl(x.id, { quizQuestion: e.target.value })
                  }
                  placeholder="Mikro sınav sorusu"
                />
                <input
                  className="field"
                  value={x.quizAnswer}
                  onChange={(e) =>
                    updateOpl(x.id, { quizAnswer: e.target.value })
                  }
                  placeholder="Doğru cevap"
                />
                <input
                  className="field"
                  value={x.trainee}
                  onChange={(e) => updateOpl(x.id, { trainee: e.target.value })}
                  placeholder="Yetkinliği doğrulanan kişi"
                />
                <select
                  disabled={!oplCompetencyReady(x)}
                  className="field"
                  value={x.competency}
                  onChange={(e) =>
                    updateOpl(x.id, {
                      competency: e.target.value as OplLesson["competency"],
                    })
                  }
                >
                  <option value="PENDING">Bekliyor</option>
                  <option value="PASSED">Başarılı</option>
                  <option value="FAILED">Başarısız</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P2.5 · Kaynakta kalite"
          title="Kontrol yükü ve kaldırma portföyü"
          action="Kontrol noktası ekle"
          onAction={addControl}
        />
        <div className="mt-3 flex gap-2 text-xs">
          <span className="bg-[var(--surface-mark)] px-3 py-1">
            {burden.total} kontrol
          </span>
          <span className="bg-[var(--st-warn-bg)] px-3 py-1 text-[var(--st-warn)]">
            {burden.temporary} geçici
          </span>
          <span className="bg-[var(--st-risk-bg)] px-3 py-1 text-[var(--st-risk)]">
            {burden.sourcePreventionMissing} kaynak önleme sorusu eksik
          </span>
        </div>
        <div className="record-list mt-4">
          {workspace.controlBurden.map((x) => (
            <div
              key={x.id}
              className="record-row"
            >
              <RecordCardHeader title={x.controlPoint || "Yeni kontrol noktası"} onRemove={() => removeControl(x)} />
              <div className="grid gap-2 md:grid-cols-4">
                <input
                  className="field"
                  value={x.controlPoint}
                  onChange={(e) =>
                    updateControl(x.id, { controlPoint: e.target.value })
                  }
                  placeholder="Kontrol noktası"
                />
                <select
                  className="field"
                  value={x.type}
                  onChange={(e) =>
                    updateControl(x.id, {
                      type: e.target.value as ControlBurdenItem["type"],
                    })
                  }
                >
                  <option value="PREVENTION">Önleme</option>
                  <option value="DETECTION">Tespit</option>
                  <option value="SORTING">Ayıklama</option>
                </select>
                <input
                  className="field"
                  value={x.frequency}
                  onChange={(e) =>
                    updateControl(x.id, { frequency: e.target.value })
                  }
                  placeholder="Sıklık"
                />
                <input
                  className="field"
                  value={x.cost}
                  onChange={(e) =>
                    updateControl(x.id, { cost: e.target.value })
                  }
                  placeholder="Maliyet"
                />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <input
                  className="field"
                  value={x.escapeRisk}
                  onChange={(e) =>
                    updateControl(x.id, { escapeRisk: e.target.value })
                  }
                  placeholder="Kaçış riski"
                />
                <input
                  className="field"
                  value={x.falseAcceptReject}
                  onChange={(e) =>
                    updateControl(x.id, { falseAcceptReject: e.target.value })
                  }
                  placeholder="Yanlış kabul / ret"
                />
                <input
                  className="field"
                  value={x.sourcePreventionQuestion}
                  onChange={(e) =>
                    updateControl(x.id, {
                      sourcePreventionQuestion: e.target.value,
                    })
                  }
                  placeholder="Neden kaynakta önleyemiyoruz?"
                />
                <input
                  className="field"
                  value={x.preventionAlternative}
                  onChange={(e) =>
                    updateControl(x.id, {
                      preventionAlternative: e.target.value,
                    })
                  }
                  placeholder="Önleyici alternatif"
                />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <input
                  className="field"
                  value={x.removalCriteria}
                  onChange={(e) =>
                    updateControl(x.id, { removalCriteria: e.target.value })
                  }
                  placeholder="Kaldırma kriteri"
                />
                <select
                  className="field"
                  value={x.status}
                  onChange={(e) =>
                    updateControl(x.id, {
                      status: e.target.value as ControlBurdenItem["status"],
                    })
                  }
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="REDUCE">Azaltılacak</option>
                  <option value="REMOVE_READY">Kaldırmaya hazır</option>
                  <option value="REMOVED">Kaldırıldı</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

