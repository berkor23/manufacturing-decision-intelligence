"use client";

// Metodoloji Uygulama Alanı — playbook tabanlı profesyonel yürütme.
// Sol: adım haritası (ilerleme). Sağ: aktif adımın yapılandırılmış formu
// (gerçek 8D/FMEA/KT formları gibi), adım başına AI taslağı ve rehber.
// Altta: aksiyon takibi, profesyonel rapor ve AI rehber paneli.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import type {
  ActionItem,
  ActionStatus,
} from "@/application/ports/rca-repository";
import {
  FISHBONE_CATEGORIES,
  FieldValue,
  PlaybookField,
  PlaybookStep,
  StepState,
  TableRow,
  emptyStepState,
  fieldFilled,
  getPlaybook,
  isCellMarked,
  isTabular,
  normalizeFishboneCategory,
} from "@/domain/playbook";
import { Markdown } from "@/components/markdown";
import type {
  Approval,
  ClaimItem,
  ContainmentControl,
  EvidenceItem,
  HorizontalDeploymentTarget,
  LearningDecision,
  MonitoringPlan,
  RedTeamReview,
  SystemDocument,
  SystemDocumentType,
} from "@/domain/workspace-intelligence";
import {
  METHODOLOGY_META,
  nextMethodologies,
  analyzeDecision,
  type Methodology,
  type DecisionCriterion,
  type DecisionOption,
} from "@/domain/diagnosis";
import {
  analyzeIndividuals,
  buildChangeTimeline,
  customerUpdate,
  parseMeasurementText,
  scoreFmea,
} from "@/domain/manufacturing-analytics";
import type {
  ControlBurdenItem,
  DailyManagementRecord,
  KaizenExperiment,
  OplLesson,
  WeakSignal,
  WeakSignalStatus,
} from "@/domain/proactive-operations";
import {
  canTransitionSignal,
  controlBurdenSummary,
  oplCompetencyReady,
} from "@/domain/proactive-operations";
import type {
  GembaBehaviorItem,
  QmsDimension,
  QmsHealthItem,
  SystemBehaviorAnalysis,
} from "@/domain/organization-context";
import {
  contextCompleteness,
  isPersonBlaming,
  qmsHealthScore,
} from "@/domain/organization-context";
import type {
  BenchmarkReference,
  CapacityScenario,
  LineBalanceStudy,
  LineOperation,
  SopScenario,
} from "@/domain/decision-labs";
import {
  calculateCapacity,
  calculateLineBalance,
  calculateSop,
  normalizeBenchmark,
} from "@/domain/decision-labs";
import type {
  AdvancedAnalysis,
  AdvancedTool,
} from "@/domain/advanced-analysis";
import {
  ADVANCED_TOOLS,
  ADVANCED_TOOL_DEFINITIONS,
  evaluateAdvancedAnalysis,
} from "@/domain/advanced-analysis";
import {
  normalizeWorkspace,
  WORKSPACE_TABS,
  type WorkspaceTab,
} from "@/components/workspace/workspace-view-model";
import {
  loadWorkspace,
  saveWorkspace,
} from "@/components/workspace/workspace-api";
import { fieldQualityFindings } from "@/domain/field-readiness";

const STATUS_LABEL: Record<ActionStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "Devam",
  IMPLEMENTED: "Uygulandı",
  EFFECTIVENESS_DUE: "Etkinlik bekliyor",
  EFFECTIVE: "Etkili",
  INEFFECTIVE: "Etkisiz",
  DONE: "Tamam",
};

export function MethodologyWorkspace({ id }: { id: string }) {
  const [ws, setWs] = useState<WsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState(0);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      "tab",
    ) as WorkspaceTab | null;
    if (requested && WORKSPACE_TABS.some((tab) => tab.key === requested))
      window.setTimeout(() => setActiveTab(requested), 0);
    loadWorkspace(id)
      .then((data: WsData) => {
        const normalized = normalizeWorkspace(data);
        setWs(normalized);
        // Kaldığı yerden devam: ilk tamamlanmamış adım
        const idx = normalized.steps.findIndex((s) => s.status !== "DONE");
        setActive(idx === -1 ? normalized.steps.length - 1 : idx);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!dirty || !ws || saving) return;
    const timer = window.setTimeout(() => {
      void save(ws);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [dirty, ws, saving]);

  const playbook = useMemo(
    () => (ws ? getPlaybook(ws.methodology) : null),
    [ws],
  );

  function mutate(patch: Partial<WsData>) {
    setWs((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }

  async function save(current?: WsData): Promise<boolean> {
    const data = current ?? ws;
    if (!data) return false;
    setSaving(true);
    setError(null);
    try {
      await saveWorkspace(id, data);
      setDirty(false);
      setLastSavedAt(new Date());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (error && !ws)
    return (
      <Shell>
        <p className="text-red-600">{error}</p>
      </Shell>
    );
  if (!ws || !playbook)
    return (
      <Shell>
        <p className="text-slate-500">Yükleniyor…</p>
      </Shell>
    );

  const doneCount = ws.steps.filter((s) => s.status === "DONE").length;
  const openActions = ws.actions.filter(
    (a) => a.status !== "DONE" && a.status !== "EFFECTIVE",
  ).length;
  const unverifiedClaims = ws.claims.filter(
    (c) => c.kind !== "HYPOTHESIS" && c.status !== "VERIFIED",
  ).length;
  const pendingApprovals = ws.approvals.filter(
    (a) => a.status !== "APPROVED",
  ).length;
  const pendingDeployment = ws.horizontalTargets.filter(
    (t) =>
      t.status === "PENDING" ||
      (t.status === "RISK_FOUND" && !t.childWorkspaceId),
  ).length;
  const step = playbook.steps[active];
  // Savunma: playbook evrilip (ör. yeni adım) sunucu verisi henüz uyumlanmamışsa
  // (client/sunucu bundle uyumsuzluğu) state undefined olup çökebiliyordu.
  // Boş adım tohumlayıp çökmeyi engelle — reconcile sunucuda kalıcılaşır.
  const state =
    ws.steps.find((s) => s.key === step.key) ?? emptyStepState(step);

  function setStep(next: StepState) {
    mutate({ steps: ws!.steps.map((s) => (s.key === next.key ? next : s)) });
  }

  return (
    <Shell>
      {/* Başlık + ilerleme */}
      <header className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Uygulama Alanı</p>
            <h1 className="text-2xl font-bold tracking-tight">
              {ws.methodologyName}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {ws.problemDescription}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {playbook.intro}
            </p>
            {ws.tools.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ws.tools.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
            <Link
              href="/diagnoz"
              className="text-xs text-slate-400 hover:text-indigo-600 hover:underline"
            >
              ← Teşhise dön
            </Link>
            <div className="flex gap-1">
              <a
                className="btn btn-secondary"
                href={`/api/workspace/${id}/export`}
                title="Taşınabilir çalışma paketi"
              >
                JSON
              </a>
              <a
                className="btn btn-secondary"
                href={`/api/workspace/${id}/export?format=csv`}
                title="Denetim ve toplantı listesi"
              >
                CSV
              </a>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>İlerleme</span>
            <span>
              {doneCount}/{ws.steps.length} adım tamamlandı
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${(doneCount / Math.max(1, ws.steps.length)) * 100}%`,
              }}
            />
          </div>
        </div>
      </header>

      <div className="sticky top-[105px] z-10 -mx-1 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-sm backdrop-blur-xl md:top-16 dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusPill status={ws.closureStatus} />
            <span className="text-slate-500">
              {doneCount}/{ws.steps.length} adım
            </span>
            <span
              className={openActions ? "text-amber-600" : "text-emerald-600"}
            >
              {openActions} açık aksiyon
            </span>
            <span
              className={
                unverifiedClaims ? "text-amber-600" : "text-emerald-600"
              }
            >
              {unverifiedClaims} doğrulanmamış iddia
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] sm:text-xs ${error ? "text-rose-600" : dirty ? "text-amber-600" : "text-slate-400"}`}
              role="status"
              aria-live="polite"
            >
              {saving
                ? "Kaydediliyor…"
                : error
                  ? "Kayıt hatası"
                  : dirty
                    ? "Kaydetme bekliyor"
                    : lastSavedAt
                      ? `Kaydedildi · ${lastSavedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`
                      : "Kaydedildi"}
            </span>
            <button
              onClick={() => save()}
              disabled={saving || !dirty}
              className="btn btn-primary"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
        <nav
          className="scroll-fade flex gap-1 overflow-x-auto"
          aria-label="Çalışma alanı bölümleri"
          role="tablist"
        >
          {WORKSPACE_TABS.map((tab) => {
            const count =
              tab.key === "validation"
                ? unverifiedClaims + pendingApprovals
                : tab.key === "actions"
                  ? openActions
                  : tab.key === "deployment"
                    ? pendingDeployment
                    : 0;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`workspace-tab ${activeTab === tab.key ? "workspace-tab-active" : ""}`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="workspace-tab-count"
                    aria-label={`${count} bekleyen kayıt`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <strong className="block">Değişiklik kaydedilemedi</strong>
          <span className="mt-0.5 block">{error}</span>
          <button
            type="button"
            onClick={() => void save()}
            className="mt-2 font-semibold underline"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {activeTab === "overview" && (
        <WorkspaceOverview
          workspace={ws}
          doneCount={doneCount}
          openActions={openActions}
          unverifiedClaims={unverifiedClaims}
          pendingApprovals={pendingApprovals}
          pendingDeployment={pendingDeployment}
          onNavigate={setActiveTab}
        />
      )}

      {/* Adım haritası + aktif adım */}
      {activeTab === "methodology" && (
        <>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/25 dark:text-indigo-200">
            <strong>Adım yaklaşımı:</strong> Her adımı mekanik olarak doldurmak
            yerine, adımın beklediği güvenceyi sağlayın. Uygulanmayan bir adımın
            gerekçesini ve onu karşılayan kanıtı ilgili alana yazın.
          </div>
          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <nav className="card h-fit p-3 lg:sticky lg:top-32">
              <ol className="flex flex-col gap-0.5">
                {playbook.steps.map((s, i) => {
                  const st = ws.steps.find((x) => x.key === s.key);
                  const stepFilled = s.fields.filter((field) =>
                    fieldFilled(st?.values[field.key]),
                  ).length;
                  const stepPercent = s.fields.length
                    ? Math.round((stepFilled / s.fields.length) * 100)
                    : 100;
                  const isActive = i === active;
                  const d3Done =
                    ws.steps.find((x) => x.key === "d3")?.status === "DONE";
                  const gated =
                    ws.methodology === "EIGHT_D" &&
                    i >= playbook.steps.findIndex((x) => x.key === "d4") &&
                    !d3Done;
                  return (
                    <li key={s.key}>
                      <button
                        onClick={() => setActive(i)}
                        disabled={gated}
                        title={
                          gated
                            ? "D3 containment tamamlanmadan kök neden aşamasına geçilemez."
                            : undefined
                        }
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                          isActive
                            ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <StepBadge
                          index={i}
                          status={st?.status ?? "PENDING"}
                          active={isActive}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{s.name}</span>
                          <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                            {st?.status === "DONE"
                              ? "Tamamlandı"
                              : stepFilled
                                ? `${stepFilled}/${s.fields.length} alan · %${stepPercent}`
                                : "Henüz başlanmadı"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <StepEditor
              key={step.key}
              workspaceId={id}
              step={step}
              state={state}
              stepIndex={active}
              stepCount={playbook.steps.length}
              dirty={dirty}
              onChange={setStep}
              onNavigate={(i) => setActive(i)}
              onDrafted={(fresh) => {
                setWs(normalizeWorkspace(fresh));
                setDirty(false);
              }}
              ensureSaved={() => save()}
            />
          </div>
          <SpecialtyPanel workspace={ws} onChange={mutate} />
          <GuidePanel
            methodology={ws.methodology}
            problem={ws.problemDescription}
          />
        </>
      )}

      {activeTab === "actions" && (
        <>
          <WorkspaceSectionGuide section="actions" />
          <Actions
            actions={ws.actions}
            onChange={(actions) => mutate({ actions })}
          />
        </>
      )}
      {activeTab === "operations" && (
        <>
          <WorkspaceSectionGuide section="operations" />
          <ProactiveOperationsPanel workspace={ws} onChange={mutate} />
        </>
      )}
      {activeTab === "organization" && (
        <>
          <WorkspaceSectionGuide section="organization" />
          <OrganizationContextPanel workspace={ws} onChange={mutate} />
          <FieldRealityPanel workspace={ws} onChange={mutate} />
        </>
      )}
      {activeTab === "labs" && (
        <>
          <DecisionLabsIntro />
          <DecisionLabsPanel workspace={ws} onChange={mutate} />
        </>
      )}
      {activeTab === "advanced" && (
        <>
          <WorkspaceSectionGuide section="advanced" />
          <AdvancedAnalysisPanel workspace={ws} onChange={mutate} />
        </>
      )}
      {activeTab === "validation" && (
        <>
          <WorkspaceSectionGuide section="validation" />
          <CalibrationPanel workspace={ws} onChange={mutate} />
          <DataQualityPanel workspace={ws} />
          <ValidationFlow workspace={ws} onNavigate={setActiveTab} />
          <ContainmentPanel workspace={ws} onChange={mutate} />
          <IntelligencePanel
            workspace={ws}
            dirty={dirty}
            ensureSaved={() => save()}
            onChange={mutate}
            onFresh={(fresh) => {
              setWs(normalizeWorkspace(fresh));
              setDirty(false);
            }}
          />
          <AttachmentPanel
            workspace={ws}
            onFresh={(fresh) => {
              setWs(normalizeWorkspace(fresh));
              setDirty(false);
            }}
          />
        </>
      )}
      {activeTab === "deployment" && (
        <>
          <WorkspaceSectionGuide section="deployment" />
          <LinkedWorkPanel workspace={ws} onChange={mutate} />
          <HorizontalDeploymentPanel workspace={ws} onChange={mutate} />
        </>
      )}
      {activeTab === "learning" && (
        <>
          <WorkspaceSectionGuide section="learning" />
          <LearningRecordPanel workspace={ws} onChange={mutate} />
          <SystemDocumentsPanel workspace={ws} onChange={mutate} />
          <LearningDecisionPanel workspace={ws} onChange={mutate} />
        </>
      )}
      {activeTab === "history" && <AuditTimeline workspace={ws} />}
      {activeTab === "report" && (
        <ReportSection
          workspaceId={id}
          report={ws.report}
          doneCount={doneCount}
          total={ws.steps.length}
          dirty={dirty}
          ensureSaved={() => save()}
          onReport={(fresh) => {
            setWs(normalizeWorkspace(fresh));
            setDirty(false);
          }}
        />
      )}
    </Shell>
  );
}

function StatusPill({ status }: { status: WsData["closureStatus"] }) {
  const config = {
    OPEN: [
      "Açık",
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    ],
    CLOSURE_CANDIDATE: [
      "Kapanış adayı",
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
    ],
    MONITORING: [
      "İzlemede",
      "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    ],
    CLOSED: [
      "Kapalı",
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    ],
    REOPENED: [
      "Yeniden açıldı",
      "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    ],
  } as const;
  const [label, className] = config[status];
  return (
    <span className={`rounded-full px-2.5 py-1 font-medium ${className}`}>
      {label}
    </span>
  );
}

function ValidationFlow({
  workspace,
  onNavigate,
}: {
  workspace: WsData;
  onNavigate: (tab: WorkspaceTab) => void;
}) {
  const verifiedClaims = workspace.claims.filter(
    (claim) => claim.status === "VERIFIED" && claim.evidenceIds.length > 0,
  );
  const effectiveActions = workspace.actions.filter((action) =>
    ["EFFECTIVE", "DONE"].includes(action.status),
  );
  const measuredActions = effectiveActions.filter(
    (action) => action.successMetric && action.actual,
  );
  const stages = [
    {
      label: "Saha kanıtı",
      value: workspace.evidence.length,
      detail: "Ölçüm, deney ve gözlem",
      ready: workspace.evidence.length > 0,
      tab: "validation" as const,
    },
    {
      label: "Kanıtlı neden",
      value: verifiedClaims.length,
      detail: "İddia + karşı-olgu",
      ready: verifiedClaims.length > 0,
      tab: "validation" as const,
    },
    {
      label: "Etkili aksiyon",
      value: effectiveActions.length,
      detail: "Uygulandı ve doğrulandı",
      ready: effectiveActions.length > 0,
      tab: "actions" as const,
    },
    {
      label: "Ölçülen sonuç",
      value: measuredActions.length,
      detail: "Metrik + gerçekleşen",
      ready: measuredActions.length > 0,
      tab: "actions" as const,
    },
  ];
  return (
    <section className="card p-6">
      <div>
        <p className="eyebrow">Doğrulama zinciri</p>
        <h2 className="text-lg font-semibold">
          Kanıt → Neden → Aksiyon → Sonuç
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Her halka bir sonrakini destekler; eksik halka kapanış güvenini
          düşürür.
        </p>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative">
            <button
              type="button"
              onClick={() => onNavigate(stage.tab)}
              className={`h-full w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${stage.ready ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {index + 1}. {stage.label}
                </span>
                <span
                  className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-bold ${stage.ready ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}
                >
                  {stage.value}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">{stage.detail}</p>
              <span
                className={`mt-3 block text-xs font-medium ${stage.ready ? "text-emerald-700" : "text-amber-700"}`}
              >
                {stage.ready ? "✓ Bağ hazır" : "○ Tamamlanmalı"}
              </span>
            </button>
            {index < stages.length - 1 && (
              <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 lg:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FieldRealityPanel({workspace,onChange}:{workspace:WsData;onChange:(patch:Partial<WsData>)=>void}){
  const context=workspace.methodSelectionContext;const pilot=workspace.fieldPilot;
  const setContext=(key:keyof typeof context,value:unknown)=>onChange({methodSelectionContext:{...context,[key]:value}});
  const setPilot=(key:keyof typeof pilot,value:unknown)=>onChange({fieldPilot:{...pilot,[key]:value}});
  const number=(value:string)=>value===""?null:Number(value);
  const addLink=()=>onChange({externalSystemLinks:[...workspace.externalSystemLinks,{id:`ext_${Date.now().toString(36)}`,system:"MES",externalId:"",url:"",ownership:"EXTERNAL_MASTER",syncStatus:"NOT_CONFIGURED",lastSyncedAt:null,notes:""}]});
  return <div className="space-y-5">
    <section className="card p-6"><p className="eyebrow">Gerçek dünya karar bağlamı</p><h2 className="section-heading mt-1">Teknik olarak doğru olan ile uygulanabilir olanı ayır</h2><p className="mt-2 text-xs leading-5 text-slate-500">Müşteri zorunluluğu, standart, ekip yetkinliği ve kaynak baskısı yöntemi değiştirebilir veya ikinci bir raporlama formatını zorunlu kılabilir. Bu alanlar teknik öneriyi silmez; uygulanabilir yürütme planını görünür yapar.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <input className="field" value={context.customerMandate} onChange={e=>setContext("customerMandate",e.target.value)} placeholder="Müşteri/OEM zorunluluğu (örn. 8D)"/><input className="field" value={context.regulatoryMandate} onChange={e=>setContext("regulatoryMandate",e.target.value)} placeholder="Standart veya regülasyon şartı"/><input className="field" value={context.requiredFormat} onChange={e=>setContext("requiredFormat",e.target.value)} placeholder="Zorunlu çıktı/rapor formatı"/><input className="field" value={context.existingCaseSystem} onChange={e=>setContext("existingCaseSystem",e.target.value)} placeholder="Mevcut SAP/MES/CAPA kayıt numarası"/>
      <select className="field" value={context.teamCompetence} onChange={e=>setContext("teamCompetence",e.target.value)}><option value="UNKNOWN">Ekip yetkinliği bilinmiyor</option><option value="LOW">Düşük yetkinlik</option><option value="MEDIUM">Orta yetkinlik</option><option value="HIGH">Yüksek yetkinlik</option></select><label className="field flex items-center gap-2 text-sm"><input type="checkbox" checked={context.facilitatorAvailable} onChange={e=>setContext("facilitatorAvailable",e.target.checked)}/>Metodoloji kolaylaştırıcısı mevcut</label>
      <input className="field" type="number" min="0" value={context.containmentHours??""} onChange={e=>setContext("containmentHours",number(e.target.value))} placeholder="İlk kontrol için saat"/><input className="field" type="number" min="0" value={context.resolutionDays??""} onChange={e=>setContext("resolutionDays",number(e.target.value))} placeholder="Kalıcı çözüm için gün"/><input className="field" type="number" min="0" value={context.availablePeople??""} onChange={e=>setContext("availablePeople",number(e.target.value))} placeholder="Ayrılabilen kişi sayısı"/><textarea className="field min-h-20" value={context.managementExpectation} onChange={e=>setContext("managementExpectation",e.target.value)} placeholder="Yönetim beklentisi ve zaman baskısı"/><textarea className="field min-h-20 md:col-span-2" value={context.resourceConstraint} onChange={e=>setContext("resourceConstraint",e.target.value)} placeholder="Kaynak, vardiya, erişim veya organizasyon kısıtları"/>
    </div></section>
    <section className="card p-6"><p className="eyebrow">Saha pilot protokolü</p><h2 className="section-heading mt-1">Gerçek kullanım etkisini ölç</h2><p className="mt-2 text-xs leading-5 text-slate-500">“Sahada çalışıyor” iddiası ancak gerçek kullanıcı, gerçek sürtünme, başlangıç değeri ve izleme sonucu kaydedildiğinde kullanılmalıdır.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><select className="field" value={pilot.status} onChange={e=>setPilot("status",e.target.value)}><option value="NOT_PLANNED">Pilot planlanmadı</option><option value="PLANNED">Planlandı</option><option value="RUNNING">Sahada yürütülüyor</option><option value="COMPLETED">Tamamlandı</option><option value="ABORTED">Durduruldu</option></select><input className="field" value={pilot.site} onChange={e=>setPilot("site",e.target.value)} placeholder="Fabrika / tesis"/><input className="field" value={pilot.line} onChange={e=>setPilot("line",e.target.value)} placeholder="Hat / proses"/><input className="field" value={pilot.owner} onChange={e=>setPilot("owner",e.target.value)} placeholder="Pilot sahibi"/><input className="field md:col-span-2" value={pilot.participants} onChange={e=>setPilot("participants",e.target.value)} placeholder="Gerçek kullanıcılar ve rolleri"/>{(["baselineCycleHours","actualCycleHours","baselineRecurrenceRate","actualRecurrenceRate","observationDays","duplicateEntryMinutes"] as const).map((key,i)=><input key={key} className="field" type="number" min="0" value={pilot[key]??""} onChange={e=>setPilot(key,number(e.target.value))} placeholder={["Önceki çevrim süresi (saat)","Gerçek çevrim süresi (saat)","Önceki tekrar oranı (%)","Pilot tekrar oranı (%)","İzleme süresi (gün)","Çift veri girişi (dakika)"][i]}/>)}<textarea className="field min-h-24" value={pilot.frictionPoints} onChange={e=>setPilot("frictionPoints",e.target.value)} placeholder="Nerede zorlandılar?"/><textarea className="field min-h-24" value={pilot.workarounds} onChange={e=>setPilot("workarounds",e.target.value)} placeholder="Excel/WhatsApp veya atlatma yolları"/><textarea className="field min-h-24" value={pilot.userFeedback} onChange={e=>setPilot("userFeedback",e.target.value)} placeholder="Operatör ve mühendis geri bildirimi"/><select className="field" value={pilot.result} onChange={e=>setPilot("result",e.target.value)}><option value="PENDING">Sonuç bekleniyor</option><option value="POSITIVE">Olumlu</option><option value="MIXED">Karma</option><option value="NEGATIVE">Olumsuz</option></select></div></section>
    <section className="card p-6"><div className="section-toolbar"><div><p className="eyebrow">Kurumsal entegrasyon</p><h2 className="section-heading mt-1">Dış sistem referansları ve veri sahipliği</h2><p className="mt-1 text-xs text-slate-500">Aynı veriyi yeniden yazmak yerine SAP QM/PM, MES, CAPA veya veri ambarındaki ana kaydı bağlayın.</p></div><button type="button" className="btn btn-secondary" onClick={addLink}>+ Sistem bağlantısı</button></div><div className="mt-4 space-y-3">{workspace.externalSystemLinks.map((link,index)=><div key={link.id} className="subtle-panel grid gap-2 md:grid-cols-3"><select className="field" value={link.system} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,system:e.target.value as typeof x.system}:x)})}>{["SAP_QM","SAP_PM","MES","QMS_CAPA","ERP","DATA_WAREHOUSE","OTHER"].map(x=><option key={x}>{x}</option>)}</select><input className="field" value={link.externalId} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,externalId:e.target.value}:x)})} placeholder="Dış kayıt numarası"/><input className="field" value={link.url} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,url:e.target.value}:x)})} placeholder="Kaynak sistem bağlantısı"/><select className="field" value={link.ownership} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,ownership:e.target.value as typeof x.ownership}:x)})}><option value="EXTERNAL_MASTER">Ana kayıt dış sistemde</option><option value="MDI_MASTER">Ana kayıt MDI’da</option><option value="SHARED">Ortak sahiplik</option></select><select className="field" value={link.syncStatus} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,syncStatus:e.target.value as typeof x.syncStatus}:x)})}><option value="NOT_CONFIGURED">Bağlantı kurulmadı</option><option value="MANUAL">Manuel referans</option><option value="SYNCED">Senkronize</option><option value="ERROR">Senkronizasyon hatası</option></select><button type="button" className="text-right text-xs font-semibold text-red-600" onClick={()=>onChange({externalSystemLinks:workspace.externalSystemLinks.filter((_,i)=>i!==index)})}>Kaydı kaldır</button></div>)}{!workspace.externalSystemLinks.length&&<p className="text-sm text-slate-400">Henüz dış sistem bağlantısı yok.</p>}</div></section>
  </div>
}

function DataQualityPanel({workspace}:{workspace:WsData}){const findings=fieldQualityFindings(workspace);return <section className="card p-6"><p className="eyebrow">Atlatma ve veri kalitesi denetimi</p><h2 className="section-heading mt-1">Form doluluğu değil, karar dayanıklılığı</h2><p className="mt-2 text-xs text-slate-500">Engelleyici bulgular kapanışı durdurur; uyarılar gerekçe ve saha incelemesi ister.</p><div className="mt-4 space-y-2">{findings.map(item=><div key={item.key} className={`rounded-xl border p-3 text-sm ${item.severity==="BLOCKING"?"border-red-200 bg-red-50 text-red-800":"border-amber-200 bg-amber-50 text-amber-800"}`}><strong>{item.severity==="BLOCKING"?"Engelleyici":"Uyarı"}: {item.title}</strong><p className="mt-1 text-xs">{item.detail}</p></div>)}{!findings.length&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Kritik veri kalitesi ihlali bulunmadı.</div>}</div></section>}

function CalibrationPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const f = workspace.recommendationFeedback;
  const set = (patch: Partial<typeof f>) =>
    onChange({ recommendationFeedback: { ...f, ...patch } });
  return (
    <section className="card p-6">
      <p className="eyebrow">Pilot ve kalibrasyon verisi</p>
      <h2 className="text-lg font-semibold">
        Uzman kararı ile gerçek sonucu ayrı kaydet
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        Bu kayıtlar ileride kural ağırlıklarını gerçek saha sonucuyla kalibre
        etmek için kullanılacaktır.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <select
          className="field"
          value={f.decision}
          onChange={(e) =>
            set({
              decision: e.target.value as typeof f.decision,
              reviewedAt: new Date().toISOString(),
            })
          }
        >
          <option value="PENDING">Uzman değerlendirmesi bekliyor</option>
          <option value="ACCEPTED">Öneri kabul edildi</option>
          <option value="REJECTED">Öneri reddedildi</option>
          <option value="OVERRIDDEN">Başka yöntem seçildi</option>
        </select>
        <select
          className="field"
          value={f.selectedMethodology}
          onChange={(e) =>
            set({ selectedMethodology: e.target.value as Methodology })
          }
        >
          {Object.keys(METHODOLOGY_META).map((m) => (
            <option key={m} value={m}>
              {METHODOLOGY_META[m as Methodology].shortName}
            </option>
          ))}
        </select>
        <input
          className="field"
          value={f.reason}
          onChange={(e) => set({ reason: e.target.value })}
          placeholder="Kabul/ret/değişiklik gerekçesi"
        />
        <select
          className="field"
          value={f.outcome}
          onChange={(e) =>
            set({
              outcome: e.target.value as typeof f.outcome,
              outcomeAt:
                e.target.value !== "PENDING" ? new Date().toISOString() : null,
            })
          }
        >
          <option value="PENDING">Sonuç bekleniyor</option>
          <option value="SUCCESS">Başarılı</option>
          <option value="PARTIAL">Kısmi</option>
          <option value="FAILED">Başarısız</option>
        </select>
        <textarea
          className="field min-h-20 md:col-span-2"
          value={f.outcomeNote}
          onChange={(e) => set({ outcomeNote: e.target.value })}
          placeholder="Gerçekleşen sonuç ve öğrenilen"
        />
      </div>
    </section>
  );
}

function WorkspaceOverview({
  workspace,
  doneCount,
  openActions,
  unverifiedClaims,
  pendingApprovals,
  pendingDeployment,
  onNavigate,
}: {
  workspace: WsData;
  doneCount: number;
  openActions: number;
  unverifiedClaims: number;
  pendingApprovals: number;
  pendingDeployment: number;
  onNavigate: (tab: WorkspaceTab) => void;
}) {
  const nextStep = workspace.steps.find((step) => step.status !== "DONE");
  const learning = workspace.specialty.learningRecord as
    | Record<string, unknown>
    | undefined;
  const learningCount = learning
    ? Object.values(learning).filter(
        (value) => typeof value === "string" && value.trim(),
      ).length
    : 0;
  const next = nextStep
    ? {
        tab: "methodology" as const,
        title: `${nextStep.key.toUpperCase()} adımını ilerlet`,
        detail: "Metodoloji akışındaki ilk tamamlanmamış adımı tamamlayın.",
      }
    : unverifiedClaims
      ? {
          tab: "validation" as const,
          title: "Kritik iddiaları doğrula",
          detail: `${unverifiedClaims} iddia kanıt bağlantısı veya doğrulama kararı bekliyor.`,
        }
      : openActions
        ? {
            tab: "actions" as const,
            title: "Aksiyon etkinliğini doğrula",
            detail: `${openActions} aksiyon henüz etkili veya tamamlanmış durumda değil.`,
          }
        : pendingDeployment
          ? {
              tab: "deployment" as const,
              title: "Yatay yayılımı tamamla",
              detail: `${pendingDeployment} hedef değerlendirme veya alt vaka bekliyor.`,
            }
          : pendingApprovals
            ? {
                tab: "validation" as const,
                title: "Kapanış onaylarını tamamla",
                detail: `${pendingApprovals} jüri onayı bekleniyor.`,
              }
            : learningCount < 4
              ? {
                  tab: "learning" as const,
                  title: "Öğrenimi standarda dönüştür",
                  detail: "Doğrulanan çözümü kurumsal öğrenim kaydına aktarın.",
                }
              : {
                  tab: "report" as const,
                  title: "Yönetici raporunu üret",
                  detail:
                    "Çalışma verilerini profesyonel kapanış raporuna dönüştürün.",
                };
  const cards = [
    [
      "Metodoloji",
      `${doneCount}/${workspace.steps.length}`,
      doneCount === workspace.steps.length ? "Tamam" : "Devam ediyor",
      "methodology",
    ],
    [
      "Doğrulanmamış iddia",
      unverifiedClaims,
      unverifiedClaims ? "Kanıt gerekiyor" : "Temiz",
      "validation",
    ],
    [
      "Açık aksiyon",
      openActions,
      openActions ? "Takip gerekiyor" : "Temiz",
      "actions",
    ],
    [
      "Yayılım riski",
      pendingDeployment,
      pendingDeployment ? "İşlem gerekiyor" : "Temiz",
      "deployment",
    ],
  ] as const;
  const criticalClaims = workspace.claims.filter(
    (claim) => claim.kind !== "HYPOTHESIS",
  );
  const gates: {
    label: string;
    detail: string;
    passed: boolean;
    tab: WorkspaceTab;
  }[] = [
    {
      label: "Metodoloji adımları",
      detail: `${doneCount}/${workspace.steps.length} tamam`,
      passed: doneCount === workspace.steps.length,
      tab: "methodology",
    },
    {
      label: "Kritik iddialar",
      detail: criticalClaims.length
        ? `${criticalClaims.filter((claim) => claim.status === "VERIFIED" && claim.evidenceIds.length > 0).length}/${criticalClaims.length} kanıtlı`
        : "Kök neden bekleniyor",
      passed:
        criticalClaims.length > 0 &&
        criticalClaims.every(
          (claim) =>
            claim.status === "VERIFIED" && claim.evidenceIds.length > 0,
        ),
      tab: "validation",
    },
    {
      label: "Aksiyon etkinliği",
      detail: workspace.actions.length
        ? `${workspace.actions.filter((action) => ["EFFECTIVE", "DONE"].includes(action.status)).length}/${workspace.actions.length} etkili`
        : "Aksiyon bekleniyor",
      passed: workspace.actions.length > 0 && openActions === 0,
      tab: "actions",
    },
    {
      label: "İzleme planı",
      detail: workspace.monitoring?.reviewDate || "Tarih ve eşik bekleniyor",
      passed: Boolean(
        workspace.monitoring?.metric &&
          workspace.monitoring?.trigger &&
          workspace.monitoring?.reviewDate,
      ),
      tab: "validation",
    },
    {
      label: "Kapanış onayları",
      detail: `${workspace.approvals.filter((approval) => approval.status === "APPROVED").length}/${workspace.approvals.length} onay`,
      passed: workspace.approvals.length > 0 && pendingApprovals === 0,
      tab: "validation",
    },
    {
      label: "Saha kanıtı",
      detail: `${workspace.evidence.length} kayıt`,
      passed: workspace.evidence.length > 0,
      tab: "validation",
    },
    {
      label: "Kırmızı takım",
      detail: workspace.redTeamReviews.some((review) =>
        ["OPEN", "ACCEPTED"].includes(review.status),
      )
        ? "Açık itiraz var"
        : "Kritik itiraz yok",
      passed: workspace.redTeamReviews.every(
        (review) => !["OPEN", "ACCEPTED"].includes(review.status),
      ),
      tab: "deployment",
    },
    {
      label: "Yatay yayılım",
      detail: workspace.horizontalTargets.length
        ? `${workspace.horizontalTargets.length - pendingDeployment}/${workspace.horizontalTargets.length} değerlendirildi`
        : "Hedef bekleniyor",
      passed: workspace.horizontalTargets.length > 0 && pendingDeployment === 0,
      tab: "deployment",
    },
    {
      label: "Containment",
      detail: workspace.containmentControls.length
        ? `${workspace.containmentControls.filter((item) => ["REMOVED", "TRANSFERRED"].includes(item.status)).length}/${workspace.containmentControls.length} sonlandırıldı`
        : "Geçici kontrol yok",
      passed: workspace.containmentControls.every((item) =>
        ["REMOVED", "TRANSFERRED"].includes(item.status),
      ),
      tab: "validation",
    },
    {
      label: "Sistem öğrenimi",
      detail:
        workspace.learningDecision.decision === "PENDING"
          ? "Karar bekleniyor"
          : workspace.learningDecision.decision,
      passed:
        workspace.learningDecision.decision === "NO_UPDATE_REQUIRED"
          ? Boolean(
              workspace.learningDecision.rationale.trim() &&
                workspace.learningDecision.approvedBy.trim(),
            )
          : workspace.learningDecision.decision === "DOCUMENT_UPDATED" &&
            workspace.learningDecision.documentIds.length > 0 &&
            workspace.learningDecision.documentIds.every((id) =>
              workspace.systemDocuments.some(
                (doc) => doc.id === id && doc.status === "APPROVED",
              ),
            ),
      tab: "learning",
    },
  ];
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-emerald-50 p-6 dark:border-indigo-900 dark:from-indigo-950/40 dark:to-emerald-950/20">
        <p className="eyebrow">Sıradaki en doğru iş</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{next.title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {next.detail}
            </p>
          </div>
          <button
            onClick={() => onNavigate(next.tab)}
            className="btn btn-primary"
          >
            İlgili bölüme git →
          </button>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, detail, tab]) => (
          <button
            key={label}
            onClick={() => onNavigate(tab)}
            className="card p-5 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-800"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <strong className="mt-2 block text-3xl tabular-nums">
              {value}
            </strong>
            <span className="mt-1 block text-xs text-slate-400">{detail}</span>
          </button>
        ))}
      </section>
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Kapanış hazırlığı</p>
            <h2 className="text-lg font-semibold">
              {gates.filter((gate) => gate.passed).length}/{gates.length} kapı
              hazır
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Eksik kapıya tıklayarak doğrudan tamamlanacağı bölüme gidin.
            </p>
          </div>
          <StatusPill status={workspace.closureStatus} />
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
            style={{
              width: `${(gates.filter((gate) => gate.passed).length / gates.length) * 100}%`,
            }}
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {gates.map((gate) => (
            <button
              type="button"
              onClick={() => onNavigate(gate.tab)}
              key={gate.label}
              className={`rounded-xl px-3 py-3 text-left text-sm transition hover:-translate-y-0.5 ${gate.passed ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30" : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30"}`}
            >
              <strong className="block">
                {gate.passed ? "✓" : "○"} {gate.label}
              </strong>
              <span className="mt-1 block text-[11px] opacity-75">
                {gate.detail}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

type LearningRecord = {
  rootCause: string;
  effectiveCountermeasure: string;
  verification: string;
  standardization: string;
  reuseScope: string;
  tags: string;
};

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
const numberValue = (value: string) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;
function canRemoveRecord(label: string, hasContent: boolean) {
  return (
    !hasContent ||
    window.confirm(
      `${label} kaydı kalıcı olarak kaldırılacak. Devam etmek istiyor musunuz?`,
    )
  );
}
function AdvancedAnalysisPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const add = (tool: AdvancedTool = "MSA") => {
    const def = ADVANCED_TOOL_DEFINITIONS[tool];
    onChange({
      advancedAnalyses: [
        ...workspace.advancedAnalyses,
        {
          id: crypto.randomUUID(),
          tool,
          title: def.name,
          status: "DRAFT",
          decisionPoint: "",
          hypothesis: "",
          fields: Object.fromEntries(def.fields.map((f) => [f.key, ""])),
          rows: [],
          conclusion: "",
          evidenceIds: [],
        },
      ],
    });
  };
  const update = (id: string, patch: Partial<AdvancedAnalysis>) =>
    onChange({
      advancedAnalyses: workspace.advancedAnalyses.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const changeTool = (item: AdvancedAnalysis, tool: AdvancedTool) => {
    const def = ADVANCED_TOOL_DEFINITIONS[tool];
    update(item.id, {
      tool,
      title: def.name,
      fields: Object.fromEntries(def.fields.map((f) => [f.key, ""])),
      rows: [],
      conclusion: "",
      status: "DRAFT",
    });
  };
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Faz 5 · Destekleyici yöntemler</p>
            <h2 className="text-lg font-semibold">
              Karar noktasında çağrılan ileri analiz tezgâhı
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Bu araçlar ana metodolojinin yerine geçmez; ölçüm, deney, risk,
              bakım, yaratıcılık veya öğrenme kararını destekler.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => add()}>
            Analiz ekle
          </button>
        </div>
      </section>
      {workspace.advancedAnalyses.map((item) => {
        const def = ADVANCED_TOOL_DEFINITIONS[item.tool];
        const result = evaluateAdvancedAnalysis(item);
        return (
          <section key={item.id} className="card p-6">
            <div className="grid gap-2 md:grid-cols-4">
              <select
                className="field"
                value={item.tool}
                onChange={(e) =>
                  changeTool(item, e.target.value as AdvancedTool)
                }
              >
                {ADVANCED_TOOLS.map((tool) => (
                  <option key={tool} value={tool}>
                    {ADVANCED_TOOL_DEFINITIONS[tool].name}
                  </option>
                ))}
              </select>
              <input
                className="field md:col-span-2"
                value={item.title}
                onChange={(e) => update(item.id, { title: e.target.value })}
                placeholder="Çalışma başlığı"
              />
              <select
                className="field"
                value={item.status}
                onChange={(e) =>
                  update(item.id, {
                    status: e.target.value as AdvancedAnalysis["status"],
                  })
                }
              >
                <option value="DRAFT">Taslak</option>
                <option value="IN_PROGRESS">Devam ediyor</option>
                <option value="REVIEW">İncelemede</option>
                <option value="COMPLETED" disabled={!result.ready}>
                  Tamamlandı
                </option>
              </select>
            </div>
            <p className="mt-2 text-xs text-slate-500">{def.purpose}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <textarea
                className="field min-h-20"
                value={item.decisionPoint}
                onChange={(e) =>
                  update(item.id, { decisionPoint: e.target.value })
                }
                placeholder="Bu araç hangi somut karar noktasında çağrıldı?"
              />
              <textarea
                className="field min-h-20"
                value={item.hypothesis}
                onChange={(e) =>
                  update(item.id, { hypothesis: e.target.value })
                }
                placeholder="Sınanacak hipotez / soru"
              />
              {def.fields.map((field) => (
                <input
                  key={field.key}
                  className="field"
                  value={item.fields[field.key] ?? ""}
                  onChange={(e) =>
                    update(item.id, {
                      fields: { ...item.fields, [field.key]: e.target.value },
                    })
                  }
                  placeholder={field.label}
                />
              ))}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr>
                    {def.columns.map((c) => (
                      <th key={c.key} className="p-2 text-left">
                        {c.label}
                      </th>
                    ))}
                    <th>
                      <button
                        className="btn btn-secondary"
                        onClick={() =>
                          update(item.id, {
                            rows: [
                              ...item.rows,
                              Object.fromEntries(
                                def.columns.map((c) => [c.key, ""]),
                              ),
                            ],
                          })
                        }
                      >
                        Satır ekle
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, i) => (
                    <tr key={i}>
                      {def.columns.map((c) => (
                        <td key={c.key} className="p-1">
                          <input
                            className="field"
                            value={row[c.key] ?? ""}
                            onChange={(e) =>
                              update(item.id, {
                                rows: item.rows.map((r, j) =>
                                  j === i
                                    ? { ...r, [c.key]: e.target.value }
                                    : r,
                                ),
                              })
                            }
                          />
                        </td>
                      ))}
                      <td className="p-1">
                        <button
                          className="text-red-500"
                          onClick={() =>
                            update(item.id, {
                              rows: item.rows.filter((_, j) => j !== i),
                            })
                          }
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <textarea
              className="field mt-3 min-h-24"
              value={item.conclusion}
              onChange={(e) => update(item.id, { conclusion: e.target.value })}
              placeholder="Karar sonucu, sınırlar ve sonraki adım"
            />
            <select
              multiple
              className="field mt-2 h-20 text-xs"
              value={item.evidenceIds}
              onChange={(e) =>
                update(item.id, {
                  evidenceIds: [...e.target.selectedOptions].map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {workspace.evidence.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
            <div
              className={`mt-3 rounded-xl p-3 text-xs ${result.warning ? "bg-amber-50 text-amber-700" : result.ready ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}`}
            >
              <strong>
                {result.metric || "Hesap için veri satırı bekleniyor."}
              </strong>
              {result.warning && (
                <span className="ml-2">⚠ {result.warning}</span>
              )}
              {result.missing.length > 0 && (
                <p className="mt-1">Eksik: {result.missing.join(", ")}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
function DecisionLabsPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const addBenchmark = () =>
    onChange({
      benchmarkReferences: [
        ...workspace.benchmarkReferences,
        {
          id: crypto.randomUUID(),
          name: "",
          type: "INTERNAL",
          capability: "",
          localValue: 0,
          referenceValue: 0,
          localScale: 1,
          referenceScale: 1,
          practiceGap: "",
          adaptation: "",
          blindCopyRisk: "",
          evidenceIds: [],
        },
      ],
    });
  const updateBenchmark = (id: string, patch: Partial<BenchmarkReference>) =>
    onChange({
      benchmarkReferences: workspace.benchmarkReferences.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeBenchmark = (x: BenchmarkReference) => {
    if (canRemoveRecord("Kıyaslama referansı", Boolean(x.name.trim() || x.capability.trim())))
      onChange({ benchmarkReferences: workspace.benchmarkReferences.filter((item) => item.id !== x.id) });
  };
  const addCapacity = () =>
    onChange({
      capacityScenarios: [
        ...workspace.capacityScenarios,
        {
          id: crypto.randomUUID(),
          name: "Baz",
          demand: 0,
          availableMinutes: 480,
          bottleneckCycleSeconds: 0,
          yieldRate: 100,
          mixFactor: 1,
          channelMargin: 0,
          shelfLifeDays: null,
          inventory: 0,
          investment: 0,
        },
      ],
    });
  const updateCapacity = (id: string, patch: Partial<CapacityScenario>) =>
    onChange({
      capacityScenarios: workspace.capacityScenarios.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeCapacity = (x: CapacityScenario) => {
    if (canRemoveRecord("Kapasite senaryosu", Boolean(x.demand || x.bottleneckCycleSeconds)))
      onChange({ capacityScenarios: workspace.capacityScenarios.filter((item) => item.id !== x.id) });
  };
  const addSop = () =>
    onChange({
      sopScenarios: [
        ...workspace.sopScenarios,
        {
          id: crypto.randomUUID(),
          name: "Baz plan",
          strategy: "HYBRID",
          demandLow: 0,
          demandExpected: 0,
          demandHigh: 0,
          regularCapacity: 0,
          overtimeCapacity: 0,
          subcontractCapacity: 0,
          openingInventory: 0,
          serviceTarget: 95,
          unitRegularCost: 0,
          unitOvertimeCost: 0,
          unitSubcontractCost: 0,
          unitInventoryCost: 0,
          unitBacklogCost: 0,
        },
      ],
    });
  const updateSop = (id: string, patch: Partial<SopScenario>) =>
    onChange({
      sopScenarios: workspace.sopScenarios.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeSop = (x: SopScenario) => {
    if (canRemoveRecord("Satış ve operasyon planı", Boolean(x.demandExpected || x.regularCapacity)))
      onChange({ sopScenarios: workspace.sopScenarios.filter((item) => item.id !== x.id) });
  };
  const addLine = () =>
    onChange({
      lineBalanceStudies: [
        ...workspace.lineBalanceStudies,
        { demand: 0, availableSeconds: 28800, operations: [], mode: "LINE" },
      ],
    });
  const updateLine = (index: number, patch: Partial<LineBalanceStudy>) =>
    onChange({
      lineBalanceStudies: workspace.lineBalanceStudies.map((x, i) =>
        i === index ? { ...x, ...patch } : x,
      ),
    });
  const removeLine = (index: number, study: LineBalanceStudy) => {
    if (canRemoveRecord("Hat dengeleme çalışması", Boolean(study.demand || study.operations.length)))
      onChange({ lineBalanceStudies: workspace.lineBalanceStudies.filter((_, itemIndex) => itemIndex !== index) });
  };
  const removeOperation = (studyIndex: number, operation: LineOperation) => {
    if (canRemoveRecord("Operasyon", Boolean(operation.name.trim() || operation.seconds))) {
      const study = workspace.lineBalanceStudies[studyIndex];
      updateLine(studyIndex, { operations: study.operations.filter((item) => item.id !== operation.id) });
    }
  };
  const addOperation = (index: number) => {
    const study = workspace.lineBalanceStudies[index];
    updateLine(index, {
      operations: [
        ...study.operations,
        {
          id: crypto.randomUUID(),
          name: "",
          seconds: 0,
          station: study.operations.length + 1,
          skill: "",
          ergonomicRisk: "LOW",
          monotonyRisk: "LOW",
          qualityOwnership: "",
        },
      ],
    });
  };
  const updateOperation = (
    studyIndex: number,
    id: string,
    patch: Partial<LineOperation>,
  ) => {
    const study = workspace.lineBalanceStudies[studyIndex];
    updateLine(studyIndex, {
      operations: study.operations.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  };
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-6">
        <PanelTitle
          eyebrow="P4.1 · Benchmarking"
          title="Karşılaştırılabilir referans ve bağlama uyarlama"
          action="Referans ekle"
          onAction={addBenchmark}
        />
        <div className="mt-4 flex flex-col gap-3">
          {workspace.benchmarkReferences.map((x) => {
            const score = normalizeBenchmark(x);
            return (
              <div
                key={x.id}
                className="rounded-xl border p-3 dark:border-slate-800"
              >
                <RecordCardHeader title={x.name || "Yeni kıyaslama referansı"} onRemove={() => removeBenchmark(x)} />
                <div className="grid gap-2 md:grid-cols-4">
                  <input
                    className="field"
                    value={x.name}
                    onChange={(e) =>
                      updateBenchmark(x.id, { name: e.target.value })
                    }
                    placeholder="Referans kuruluş / proses"
                  />
                  <select
                    className="field"
                    value={x.type}
                    onChange={(e) =>
                      updateBenchmark(x.id, {
                        type: e.target.value as BenchmarkReference["type"],
                      })
                    }
                  >
                    <option value="INTERNAL">İç referans</option>
                    <option value="COMPETITOR">Rakip</option>
                    <option value="FUNCTIONAL">Fonksiyonel</option>
                    <option value="GENERIC">Genel</option>
                  </select>
                  <input
                    className="field"
                    value={x.capability}
                    onChange={(e) =>
                      updateBenchmark(x.id, { capability: e.target.value })
                    }
                    placeholder="Kıyaslanan yetkinlik"
                  />
                  <span
                    className={`rounded-lg p-3 text-xs ${score.comparable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    Normalize fark: {score.gap}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  {(
                    [
                      ["localValue", "Yerel değer"],
                      ["localScale", "Yerel ölçek"],
                      ["referenceValue", "Referans değer"],
                      ["referenceScale", "Referans ölçek"],
                    ] as const
                  ).map(([k, l]) => (
                    <input
                      key={k}
                      type="number"
                      className="field"
                      value={x[k]}
                      onChange={(e) =>
                        updateBenchmark(x.id, {
                          [k]: numberValue(e.target.value),
                        })
                      }
                      placeholder={l}
                    />
                  ))}
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <input
                    className="field"
                    value={x.practiceGap}
                    onChange={(e) =>
                      updateBenchmark(x.id, { practiceGap: e.target.value })
                    }
                    placeholder="Performans / uygulama farkı"
                  />
                  <input
                    className="field"
                    value={x.adaptation}
                    onChange={(e) =>
                      updateBenchmark(x.id, { adaptation: e.target.value })
                    }
                    placeholder="Yerel bağlama uyarlama"
                  />
                  <input
                    className="field"
                    value={x.blindCopyRisk}
                    onChange={(e) =>
                      updateBenchmark(x.id, { blindCopyRisk: e.target.value })
                    }
                    placeholder="Kör kopyalama riski"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P4.2 · Kapasite ve büyüme"
          title="Darboğaz, ürün karması ve yatırım what-if"
          action="Senaryo ekle"
          onAction={addCapacity}
        />
        <div className="mt-4 grid gap-3">
          {workspace.capacityScenarios.map((x) => {
            const result = calculateCapacity(x);
            return (
              <div
                key={x.id}
                className="rounded-xl border p-4 dark:border-slate-800"
              >
                <RecordCardHeader title={x.name || "Yeni kapasite senaryosu"} onRemove={() => removeCapacity(x)} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <input
                    className="field sm:col-span-2 xl:col-span-3"
                    value={x.name}
                    onChange={(e) =>
                      updateCapacity(x.id, { name: e.target.value })
                    }
                  />
                  <span
                    className={`rounded-lg p-3 text-center text-xs ${result.feasible ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {result.feasible ? "Talep karşılanır" : "Kapasite açığı"}
                  </span>
                  {(
                    [
                      ["demand", "Dönem talebi", "adet / dönem", "Bu senaryoda karşılanması gereken toplam ürün miktarı."],
                      ["availableMinutes", "Kullanılabilir üretim süresi", "dakika / dönem", "Planlı duruşlar çıktıktan sonra darboğazın gerçekten çalışabileceği süre. 480, sekiz saatlik vardiyayı ifade eder."],
                      ["bottleneckCycleSeconds", "Darboğaz çevrim süresi", "saniye / adet", "Hattın hızını sınırlayan operasyonun bir sağlam ürün için harcadığı süre."],
                      ["yieldRate", "Sağlam ürün verimi", "%", "Üretilen parçaların yüzde kaçının ek işlem görmeden sağlam çıktığı. 100, hiç kayıp olmadığı varsayımıdır."],
                      ["mixFactor", "Ürün karması kapasite katsayısı", "0–1 katsayı", "Çeşitlilik kapasiteyi düşürmüyorsa 1; örneğin %20 kayıp yaratıyorsa 0,80 girin."],
                      ["inventory", "Kullanılabilir başlangıç stoku", "adet", "Talebi karşılamak için kullanılabilecek hazır sağlam ürün. Stok yoksa 0."],
                      ["channelMargin", "Birim katkı", "para / adet", "Bir ek ürünün satışından değişken maliyet sonrası kalan katkı."],
                      ["investment", "Senaryo yatırım maliyeti", "para", "Bu kapasite seçeneğini hayata geçirmek için gereken tek seferlik yatırım."],
                    ] as const
                  ).map(([k, label, unit, help]) => (
                    <NumericField
                      key={k}
                      label={label}
                      unit={unit}
                      help={help}
                      value={x[k] ?? 0}
                      onChange={(value) => updateCapacity(x.id, { [k]: value })}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Throughput <strong>{result.throughput}</strong> · Açık/fazla{" "}
                  <strong>{result.gap}</strong> · Kullanım %{result.utilization}{" "}
                  · Katkı {result.contribution}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P4.3 · S&OP"
          title="Chase, level ve hybrid toplam plan senaryoları"
          action="Plan senaryosu ekle"
          onAction={addSop}
        />
        <div className="mt-4 grid gap-3">
          {workspace.sopScenarios.map((x) => {
            const result = calculateSop(x);
            return (
              <div
                key={x.id}
                className="rounded-xl border p-4 dark:border-slate-800"
              >
                <RecordCardHeader title={x.name || "Yeni satış ve operasyon planı"} onRemove={() => removeSop(x)} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <input
                    className="field sm:col-span-2 xl:col-span-3"
                    value={x.name}
                    onChange={(e) => updateSop(x.id, { name: e.target.value })}
                  />
                  <select
                    className="field"
                    value={x.strategy}
                    onChange={(e) =>
                      updateSop(x.id, {
                        strategy: e.target.value as SopScenario["strategy"],
                      })
                    }
                  >
                    <option value="CHASE">Talebi izleyen plan · kapasite talebe göre değişir</option>
                    <option value="LEVEL">Dengeli plan · kapasite sabit tutulur</option>
                    <option value="HYBRID">Karma plan · kapasite, stok ve dış kaynak birlikte</option>
                  </select>
                  {(
                    [
                      ["demandLow", "Düşük talep tahmini", "adet / dönem", "İyimser kapasite açısından karşılaşılabilecek alt talep senaryosu."],
                      ["demandExpected", "Beklenen talep", "adet / dönem", "Planın ana hesabında kullanılacak en olası talep."],
                      ["demandHigh", "Yüksek talep tahmini", "adet / dönem", "Talep yükseldiğinde planın dayanıklılığını sınayan üst senaryo."],
                      ["regularCapacity", "Normal çalışma kapasitesi", "adet / dönem", "Normal vardiya ve mevcut kaynaklarla üretilebilecek miktar."],
                      ["overtimeCapacity", "Fazla mesai kapasitesi", "adet / dönem", "Onaylı fazla mesaiyle normal kapasiteye eklenebilecek miktar."],
                      ["subcontractCapacity", "Dış kaynak kapasitesi", "adet / dönem", "Tedarikçi veya taşeron üzerinden sağlanabilecek ek miktar."],
                      ["openingInventory", "Dönem başı kullanılabilir stok", "adet", "Plan dönemi başında talebi karşılamak için hazır bulunan sağlam ürün."],
                      ["serviceTarget", "Hedef hizmet seviyesi", "%", "Talebin en az yüzde kaçının dönem içinde karşılanması gerektiği. 95, %95 hedef demektir."],
                    ] as const
                  ).map(([k, label, unit, help]) => (
                    <NumericField
                      key={k}
                      label={label}
                      unit={unit}
                      help={help}
                      value={x[k]}
                      onChange={(value) => updateSop(x.id, { [k]: value })}
                    />
                  ))}
                </div>
                <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Birim maliyet varsayımları <span className="font-normal text-slate-400">· toplam maliyet hesabı için</span></p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {([
                      ["unitRegularCost", "Normal üretim", "para / adet", "Normal çalışma kapasitesinde üretilen bir adedin maliyeti."],
                      ["unitOvertimeCost", "Fazla mesai", "para / adet", "Fazla mesaiyle üretilen bir adedin ek maliyetleri dahil değeri."],
                      ["unitSubcontractCost", "Dış kaynak", "para / adet", "Taşerondan temin edilen bir adedin toplam maliyeti."],
                      ["unitInventoryCost", "Stok taşıma", "para / adet-dönem", "Dönem sonunda kalan bir adedin finansman ve depolama maliyeti."],
                      ["unitBacklogCost", "Karşılanamayan talep", "para / adet", "Geciken veya karşılanamayan bir sipariş adedinin tahmini ceza/kayıp maliyeti."],
                    ] as const).map(([key,label,unit,help])=><NumericField key={key} label={label} unit={unit} help={help} value={x[key]} onChange={(value)=>updateSop(x.id,{[key]:value})}/>) }
                  </div>
                </div>
                <p
                  className={`mt-3 rounded-lg p-2 text-xs ${result.meetsTarget ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  Toplam arz {result.supply} · Karşılama oranı %{result.service} · Karşılanamayan talep{" "}
                  {result.backlog} · Dönem sonu stoku {result.endingInventory} · Toplam maliyet{" "}
                  {result.cost}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P4.4 · Hat dengeleme"
          title="Takt, istasyon yükü ve iş tasarımı simülatörü"
          action="Çalışma ekle"
          onAction={addLine}
        />
        <div className="mt-4 flex flex-col gap-4">
          {workspace.lineBalanceStudies.map((study, i) => {
            const result = calculateLineBalance(study);
            return (
              <div
                key={i}
                className="rounded-xl border p-4 dark:border-slate-800"
              >
                <RecordCardHeader title={`Hat dengeleme çalışması ${i + 1}`} onRemove={() => removeLine(i, study)} />
                <div className="grid gap-2 md:grid-cols-4">
                  <NumericField
                    label="Dönem üretim talebi"
                    unit="adet / dönem"
                    help="Seçilen çalışma süresi içinde tamamlanması gereken ürün miktarı. Takt süresinin paydasını oluşturur."
                    value={study.demand}
                    onChange={(value) => updateLine(i, { demand: value })}
                  />
                  <NumericField
                    label="Net kullanılabilir çalışma süresi"
                    unit="saniye / dönem"
                    help="Mola ve planlı duruşlar çıkarıldıktan sonra üretime kalan süre. 28.800 saniye, sekiz saattir."
                    value={study.availableSeconds}
                    onChange={(value) => updateLine(i, { availableSeconds: value })}
                  />
                  <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">İş organizasyonu</span><select className="field" value={study.mode} onChange={(e) => updateLine(i, { mode: e.target.value as LineBalanceStudy["mode"] })}><option value="LINE">Akış hattı · iş istasyonlara bölünür</option><option value="CELL">Hücresel üretim · ekip ürün ailesini tamamlar</option><option value="COMPLETE_ASSEMBLY">Tam montaj · bir kişi/ekip ürünü tamamlar</option></select><span className="mt-1 block text-[11px] leading-4 text-slate-400">Operasyonların fiziksel olarak nasıl örgütlendiğini seçin.</span></label>
                  <button
                    className="btn btn-secondary"
                    onClick={() => addOperation(i)}
                  >
                    Operasyon ekle
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  {study.operations.map((op) => (
                    <div
                      key={op.id}
                      className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"
                    >
                      <RecordCardHeader title={op.name || `Operasyon ${op.station}`} onRemove={() => removeOperation(i, op)} compact />
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <input
                        className="field sm:col-span-2"
                        value={op.name}
                        onChange={(e) =>
                          updateOperation(i, op.id, { name: e.target.value })
                        }
                        placeholder="Operasyon"
                      />
                      <NumericField
                        label="Standart işlem süresi"
                        unit="saniye / adet"
                        help="Bu operasyonun normal koşullarda bir ürün için gerektirdiği süre."
                        compact
                        value={op.seconds}
                        onChange={(value) => updateOperation(i, op.id, { seconds: value })}
                      />
                      <NumericField
                        label="Atandığı istasyon"
                        unit="istasyon no."
                        help="Aynı istasyon numarasındaki operasyon süreleri birlikte toplanır."
                        compact
                        value={op.station}
                        onChange={(value) => updateOperation(i, op.id, { station: value })}
                      />
                      <select
                        className="field"
                        value={op.ergonomicRisk}
                        onChange={(e) =>
                          updateOperation(i, op.id, {
                            ergonomicRisk: e.target
                              .value as LineOperation["ergonomicRisk"],
                          })
                        }
                      >
                        <option value="LOW">Ergo düşük</option>
                        <option value="MEDIUM">Ergo orta</option>
                        <option value="HIGH">Ergo yüksek</option>
                      </select>
                      <input
                        className="field"
                        value={op.qualityOwnership}
                        onChange={(e) =>
                          updateOperation(i, op.id, {
                            qualityOwnership: e.target.value,
                          })
                        }
                        placeholder="Kalite sahipliği"
                      />
                      </div>
                    </div>
                  ))}
                </div>
                <p
                  className={`mt-3 rounded-lg p-2 text-xs ${result.overloaded.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                >
                  Takt {result.takt} sn · Kapasite {result.capacity} · Verim %
                  {result.efficiency} · Denge kaybı %{result.balanceLoss} ·
                  Aşırı istasyon: {result.overloaded.join(", ") || "yok"} ·
                  Yüksek ergonomi: {result.ergonomicHigh}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
function OrganizationContextPanel({
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
            <h2 className="text-lg font-semibold">
              Yöntemin sınırlarını işe başlamadan tanımla
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs ${contract.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
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
        <div className="mt-4 flex flex-col gap-3">
          {workspace.systemBehaviorAnalyses.map((x) => (
            <div
              key={x.id}
              className={`rounded-xl border p-3 ${isPersonBlaming(x.observedBehavior) && !x.systemCondition.trim() ? "border-red-300 bg-red-50/40" : "dark:border-slate-800"}`}
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
                  <p className="mt-2 text-xs text-red-600">
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
            <h2 className="text-lg font-semibold">
              Kalite sisteminin taşıma kapasitesi
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs ${health.level === "HEALTHY" ? "bg-emerald-50 text-emerald-700" : health.level === "CRITICAL" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
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
                className="rounded-xl border p-3 dark:border-slate-800"
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
        <div className="mt-4 flex flex-col gap-3">
          {workspace.gembaBehaviorMap.map((x) => (
            <div
              key={x.id}
              className="rounded-xl border p-3 dark:border-slate-800"
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

function ProactiveOperationsPanel({
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
        <div className="mt-4 flex flex-col gap-3">
          {workspace.weakSignals.map((x) => (
            <div
              key={x.id}
              className="rounded-xl border p-3 dark:border-slate-800"
            >
              <div className="mb-3 flex items-center justify-between">
                <strong className="text-sm">Zayıf sinyal kaydı</strong>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:underline"
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
              <p className="mt-2 text-[11px] text-slate-500">
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
        <div className="mt-4 flex flex-col gap-3">
          {workspace.dailyManagement.map((x) => (
            <div
              key={x.id}
              className="rounded-xl border p-3 dark:border-slate-800"
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
        <div className="mt-4 flex flex-col gap-3">
          {workspace.kaizenExperiments.map((x) => (
            <div
              key={x.id}
              className="rounded-xl border p-3 dark:border-slate-800"
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
        <div className="mt-4 flex flex-col gap-3">
          {workspace.oplLessons.map((x) => (
            <div
              key={x.id}
              className="rounded-xl border p-3 dark:border-slate-800"
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
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {burden.total} kontrol
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
            {burden.temporary} geçici
          </span>
          <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
            {burden.sourcePreventionMissing} kaynak önleme sorusu eksik
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {workspace.controlBurden.map((x) => (
            <div
              key={x.id}
              className="rounded-xl border p-3 dark:border-slate-800"
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

const PANEL_DESCRIPTIONS: Record<string, string> = {
  "Zayıf sinyal merkezi":
    "Henüz arızaya dönüşmemiş küçük sapmaları kaydedin. Önce tarafsız gözlemi, sonra araştırılacak hipotezi ve doğrulama görevini yazın.",
  "Tier 1–3 SQDCP ve eskalasyon":
    "Güvenlik, kalite, teslimat, maliyet ve çalışan göstergelerini günlük toplantı düzeyinde değerlendirin; yerinde çözülemeyen konuyu üst seviyeye aktarın.",
  "Öneri → deney → ölçüm → standart → Yokoten":
    "Düşük riskli iyileştirme fikrini küçük ölçekte deneyin, önce-sonra sonucunu ölçün; başarılıysa standarda ve benzer alanlara yayın.",
  "Dijital OPL akademisi":
    "OPL (Tek Nokta Dersi), tek bir kritik işi birkaç dakikada öğretir. Bir ders yalnız bir öğrenme hedefi, doğru/yanlış örneği ve yetkinlik kontrolü taşımalıdır.",
  "Kontrol yükü ve kaldırma portföyü":
    "Kontrollerin maliyetini ve kaçış riskini görünür kılın. Amaç daha fazla kontrol değil, hatayı kaynağında önleyerek geçici ayıklamayı kaldırmaktır.",
  "Karşılaştırılabilir referans ve bağlama uyarlama":
    "Kendi performansınızı benzer bir referansla aynı ölçeğe getirerek kıyaslayın. Uygulamayı körü körüne kopyalamadan yerel koşullara nasıl uyarlayacağınızı yazın.",
  "Darboğaz, ürün karması ve yatırım what-if":
    "Talep, darboğaz çevrim süresi, verim ve stok değiştiğinde kapasite açığının nasıl değişeceğini senaryolarla görün.",
  "Chase, level ve hybrid toplam plan senaryoları":
    "Talep belirsizliğine karşı kapasite, fazla mesai, taşeron ve stok tercihlerini karşılaştırın; hizmet düzeyi ile toplam maliyet dengesini görün.",
  "Takt, istasyon yükü ve iş tasarımı simülatörü":
    "Müşteri talebinin gerektirdiği üretim ritmini hesaplayın; operasyon sürelerini istasyonlara dağıtarak aşırı yükü, denge kaybını ve ergonomi riskini bulun.",
  "Davranıştan sisteme ve zihinsel modele":
    "Gözlenen davranışı son neden kabul etmeyin; davranışı makul veya kaçınılmaz hale getiren hedefi, iş koşulunu, gecikmeli etkiyi ve yönetim varsayımını araştırın.",
  "Standart ile gerçek iş arasındaki boşluk":
    "Sahada işi yapan kişiyi izleyin; yazılı standarttan sapmanın nerede ve neden gerekli hale geldiğini, arama-hareket kayıplarını ve hata fırsatlarını kaydedin.",
};
const PANEL_FRIENDLY_TITLES: Record<string, string> = {
  "Tier 1–3 SQDCP ve eskalasyon":
    "Günlük performans ve sorun yükseltme toplantıları",
  "Öneri → deney → ölçüm → standart → Yokoten":
    "Fikirden deneye, ölçümden standartlaştırmaya",
  "Dijital OPL akademisi": "Tek Nokta Dersi ile kısa saha eğitimi",
  "Darboğaz, ürün karması ve yatırım what-if":
    "Kapasite, darboğaz ve yatırım senaryoları",
  "Chase, level ve hybrid toplam plan senaryoları":
    "Satış ve operasyon planı senaryoları",
};
const PANEL_TERMS: Record<string, string[]> = {
  "Karşılaştırılabilir referans ve bağlama uyarlama": [
    "Yerel değer: kendi sürecinizin ölçülen sonucu.",
    "Referans değer: kıyaslanan süreç veya kuruluşun sonucu.",
    "Ölçek: değerlerin adil karşılaştırılması için üretim adedi, çalışan sayısı veya süre gibi payda.",
    "Uyarlama: iyi uygulamanın sizin teknoloji, insan ve hacim koşullarınıza göre değiştirilmiş hali.",
  ],
  "Darboğaz, ürün karması ve yatırım what-if": [
    "Talep: incelenen dönem için karşılanması gereken toplam miktar.",
    "Darboğaz çevrim süresi: hattın hızını sınırlayan adımın bir ürün için harcadığı saniye.",
    "Verim: sağlam çıkan ürün yüzdesi.",
    "Karma faktörü: ürün çeşitliliğinin teorik kapasiteye etkisi; 1 etkisiz, 1'in altı kapasite kaybıdır.",
  ],
  "Chase, level ve hybrid toplam plan senaryoları": [
    "Talebi izleyen plan: kapasiteyi talebe göre artırıp azaltır.",
    "Dengeli plan: kapasiteyi sabit tutar, dalgalanmayı stok veya bekleyen siparişle karşılar.",
    "Karma plan: sabit kapasiteyi fazla mesai, taşeron ve stokla birlikte kullanır.",
    "Bekleyen sipariş: o dönemde karşılanamayıp sonraki döneme taşınan talep.",
  ],
  "Takt, istasyon yükü ve iş tasarımı simülatörü": [
    "Takt süresi: müşteri talebini karşılamak için bir ürünün kaç saniyede çıkması gerektiği.",
    "Operasyon süresi: tek iş adımının standart tamamlanma süresi.",
    "İstasyon: bir veya daha fazla operasyonun atandığı çalışma noktası.",
    "Denge kaybı: istasyonlar arasındaki boş veya aşırı yük nedeniyle kullanılamayan kapasite.",
  ],
  "Zayıf sinyal merkezi": [
    "Sinyal türü: gözlemin hangi operasyon kaynağından geldiğini gösterir.",
    "Hipotez: araştırılacak geçici açıklamadır; doğrulanmış kök neden değildir.",
    "Doğrulama görevi: hipotezi hangi ölçüm, gözlem veya karşılaştırmayla sınayacağınız.",
    "İzleme: henüz vaka açmaya yetmeyen ancak kaybolmaması gereken sinyal durumu.",
  ],
  "Tier 1–3 SQDCP ve eskalasyon": [
    "Tier 1: hat veya vardiya düzeyi günlük toplantı.",
    "Tier 2: bölüm düzeyinde, yerel ekibin çözemediği engeller.",
    "Tier 3: fabrika veya yönetim düzeyinde kaynak ve öncelik kararı.",
    "SQDCP: güvenlik, kalite, teslimat, maliyet ve çalışan göstergeleri.",
  ],
  "Öneri → deney → ölçüm → standart → Yokoten": [
    "Hipotez: değişiklik yapılırsa hangi ölçünün neden iyileşeceği beklentisi.",
    "Başlangıç değeri: deneyden önceki karşılaştırma noktası.",
    "Standartlaştırma: başarılı yöntemin kontrollü dokümana dönüştürülmesi.",
    "Yokoten: öğrenimin uygun benzer alanlara yatay yayılımı.",
  ],
  "Dijital OPL akademisi": [
    "OPL / Tek Nokta Dersi: tek bir kritik bilgiyi kısa ve görsel anlatan eğitim.",
    "Net limit: doğru ile yanlışı ayıran ölçülebilir sınır.",
    "Mikro sınav: yalnız katılımı değil anlayışı kontrol eden tek soru.",
    "Yetkinlik: kişinin işi sahada doğru yapabildiğinin doğrulanması.",
  ],
  "Kontrol yükü ve kaldırma portföyü": [
    "Önleme: hatanın oluşmasını fiziksel veya sistemsel olarak engeller.",
    "Tespit: oluşan hatayı sonraki aşamaya geçmeden bulur.",
    "Ayıklama: şüpheli ürünleri tek tek kontrol eden geçici ve maliyetli koruma.",
    "Kaldırma kriteri: geçici kontrolün hangi kanıtla güvenle sonlandırılacağı.",
  ],
  "Davranıştan sisteme ve zihinsel modele": [
    "Sistem koşulu: davranışı mümkün veya mantıklı hale getiren iş ortamı.",
    "Yönetim varsayımı: kararın arkasındaki çoğu zaman söylenmeyen kabul.",
    "Yerel gösterge: bir alanı iyileştirirken bütüne zarar verebilen bölüm hedefi.",
    "Geri besleme döngüsü: bir sonucun zamanla kendi nedenini güçlendirmesi veya zayıflatması.",
  ],
  "Standart ile gerçek iş arasındaki boşluk": [
    "Beklenen standart: dokümanda tarif edilen çalışma biçimi.",
    "Gerçek davranış: kişinin sahada fiilen yaptığı işlem.",
    "Telafi davranışı: sistem eksiğini kapatmak için geliştirilen resmi olmayan çözüm.",
    "Hata fırsatı: yanlış seçimi veya unutmayı mümkün kılan karar noktası.",
  ],
};
// Eski kayıtlarla geriye dönük UI karşılaştırması için tutulur; yeni arayüz kart içi kaldırma kullanır.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProactiveRecordRemovalPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  return (
    <RecordRemovalPanel
      groups={[
        {
          label: "Zayıf sinyal",
          items: workspace.weakSignals.map((x) => ({
            id: x.id,
            name: x.description,
            hasContent: Boolean(x.description.trim() || x.hypothesis.trim()),
            remove: () =>
              onChange({
                weakSignals: workspace.weakSignals.filter(
                  (item) => item.id !== x.id,
                ),
              }),
          })),
        },
        {
          label: "Günlük yönetim kaydı",
          items: workspace.dailyManagement.map((x) => ({
            id: x.id,
            name: [x.date, x.area].filter(Boolean).join(" · "),
            hasContent: Boolean(x.area.trim() || x.action.trim()),
            remove: () =>
              onChange({
                dailyManagement: workspace.dailyManagement.filter(
                  (item) => item.id !== x.id,
                ),
              }),
          })),
        },
        {
          label: "Kaizen deneyi",
          items: workspace.kaizenExperiments.map((x) => ({
            id: x.id,
            name: x.idea,
            hasContent: Boolean(x.idea.trim() || x.result.trim()),
            remove: () =>
              onChange({
                kaizenExperiments: workspace.kaizenExperiments.filter(
                  (item) => item.id !== x.id,
                ),
              }),
          })),
        },
        {
          label: "Tek Nokta Dersi",
          items: workspace.oplLessons.map((x) => ({
            id: x.id,
            name: x.title,
            hasContent: Boolean(x.title.trim() || x.objective.trim()),
            remove: () =>
              onChange({
                oplLessons: workspace.oplLessons.filter(
                  (item) => item.id !== x.id,
                ),
              }),
          })),
        },
        {
          label: "Kontrol noktası",
          items: workspace.controlBurden.map((x) => ({
            id: x.id,
            name: x.controlPoint,
            hasContent: Boolean(x.controlPoint.trim()),
            remove: () =>
              onChange({
                controlBurden: workspace.controlBurden.filter(
                  (item) => item.id !== x.id,
                ),
              }),
          })),
        },
      ]}
    />
  );
}

function DecisionLabsIntro() {
  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/25">
      <p className="eyebrow">Karar Laboratuvarı kullanım rehberi</p>
      <h2 className="mt-1 text-lg font-semibold">
        Önce vermek istediğiniz kararı seçin
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Bu dört araç aynı anda doldurulmak zorunda değildir. Cevaplamak
        istediğiniz soruya uyan laboratuvarı kullanın; farklı varsayımlar için
        birden fazla senaryo ekleyip sonuçları karşılaştırın.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Kıyaslama",
            "Bizden daha iyi bir uygulama ne yapıyor ve bunu kendi koşullarımıza nasıl uyarlayabiliriz?",
          ],
          [
            "Kapasite senaryosu",
            "Talebi karşılayabilir miyiz; darboğaz veya yatırım değişirse sonuç ne olur?",
          ],
          [
            "Satış ve operasyon planı",
            "Talep değişirken stok, fazla mesai ve taşeron dengesini nasıl kurmalıyız?",
          ],
          [
            "Hat dengeleme",
            "Operasyonları istasyonlara nasıl dağıtırsak hedef üretim ritmini yakalarız?",
          ],
        ].map(([title, detail]) => (
          <div
            key={title}
            className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60"
          >
            <strong className="text-sm text-indigo-700 dark:text-indigo-300">
              {title}
            </strong>
            <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const SECTION_GUIDES = {
  actions: {
    eyebrow: "Aksiyon yönetimi kullanım rehberi",
    title: "Kararı uygulanabilir ve doğrulanabilir işe dönüştürün",
    description:
      "Bu bölüm kök neden veya risk kararından sonra kullanılır. Her aksiyonun sorumlusu, tarihi, başarı ölçütü ve gerçekleşen sonucu olmalıdır; yalnız “yapıldı” demek etkinlik kanıtı değildir.",
    cards: [
      [
        "Ne eklenir?",
        "Kök nedeni ortadan kaldıran, kaçışı önleyen veya riski azaltan somut işler.",
      ],
      [
        "Ne zaman tamamlanır?",
        "Uygulama bittikten ve başarı ölçütü izleme verisiyle doğrulandıktan sonra.",
      ],
      [
        "Beklenen çıktı",
        "Sahibi ve termini belli, etkinliği kanıtlanmış aksiyon portföyü.",
      ],
    ],
  },
  operations: {
    eyebrow: "Proaktif operasyon kullanım rehberi",
    title: "Problem büyümeden önce sinyali yakalayın ve öğrenmeyi hızlandırın",
    description:
      "Bu alan günlük operasyon davranışlarını yönetir. Her alt sistem farklı bir ihtiyaca hizmet eder; hepsini her vaka için doldurmanız gerekmez.",
    cards: [
      [
        "Zayıf sinyal",
        "Henüz arızaya dönüşmemiş tekrar, sapma veya olağandışı davranışı araştırın.",
      ],
      [
        "Günlük yönetim",
        "Vardiya performansını ve üst seviyeye taşınması gereken engelleri kaydedin.",
      ],
      [
        "İyileştirme ve eğitim",
        "Düşük riskli fikri deneyin; çalışan sonucu kısa saha dersine dönüştürün.",
      ],
      [
        "Kontrol yükü",
        "Geçici kontrol ve ayıklamaları görünür tutup kaynakta önlemeyle azaltın.",
      ],
    ],
  },
  organization: {
    eyebrow: "Organizasyon ve sistem davranışı rehberi",
    title: "Kişiyi suçlamadan davranışı üreten sistemi inceleyin",
    description:
      "Tekrarlayan problemlerde yalnız teknik kök neden yetmeyebilir. Hedefler, teşvikler, standartlar, iş tasarımı ve yönetim varsayımlarının davranışı nasıl şekillendirdiğini burada inceleyin.",
    cards: [
      [
        "Sistem davranışı",
        "Gözlenen davranışın arkasındaki koşul, hedef çatışması ve geri besleme döngüsünü yazın.",
      ],
      [
        "QMS sağlık taraması",
        "Kalite sisteminin problemi önleme ve öğrenmeyi taşıma kapasitesini değerlendirin.",
      ],
      [
        "Gemba haritası",
        "Yazılı standart ile işin sahada gerçekten nasıl yapıldığı arasındaki boşluğu gözlemleyin.",
      ],
    ],
  },
  advanced: {
    eyebrow: "İleri analiz kullanım rehberi",
    title: "Ana metodolojinin karar noktasında uzman aracı çağırın",
    description:
      "Bu araçlar ana problem çözme yönteminin yerine geçmez. Ölçüm güvenilirliği, deney, risk veya bakım gibi özel bir karar için gerekli olduğunda seçin.",
    cards: [
      [
        "Önce karar noktası",
        "Bu analizin hangi somut kararı destekleyeceğini yazın.",
      ],
      ["Sonra hipotez", "Sınanacak soruyu sonuçtan önce tanımlayın."],
      [
        "Kapanış koşulu",
        "Veriyi, hesap sonucunu, sınırlılıkları ve sonraki kararı birlikte kaydedin.",
      ],
    ],
  },
  validation: {
    eyebrow: "Doğrulama omurgası kullanım rehberi",
    title: "İddia, kanıt ve onayı birbirine bağlayın",
    description:
      "Metodoloji formunun dolu olması çözümün doğru olduğunu göstermez. Burada kök neden iddialarını saha kanıtına, aksiyonları başarı metriğine ve kapanışı bağımsız onaya bağlayın.",
    cards: [
      ["İddia", "Doğru olduğuna inandığınız sınanabilir açıklama."],
      ["Kanıt", "İddiayı destekleyen ölçüm, gözlem, deney veya kayıt."],
      [
        "Karşı-olgu",
        "Neden kaldırıldığında problemin kaybolup kaybolmadığını gösteren sınama.",
      ],
      [
        "Kapanış jürisi",
        "Kalite ve süreç sahibinin kanıt paketine verdiği izlenebilir karar.",
      ],
    ],
  },
  deployment: {
    eyebrow: "Yatay yayılım kullanım rehberi",
    title: "Çözümü tek vakada bırakmayın; benzer riski sistem genelinde arayın",
    description:
      "Doğrulanmış neden veya etkili aksiyonun başka makine, hat, ürün, lokasyon ya da tedarikçide karşılığı olup olmadığını değerlendirin.",
    cards: [
      ["Yayılım hedefi", "Aynı mekanizmanın bulunabileceği somut alan."],
      [
        "Yerel kontrol",
        "Hedefte riskin gerçekten var olup olmadığını gösteren bulgu ve kanıt.",
      ],
      [
        "Alt vaka",
        "Risk bulunduğunda o alan için açılan, sahibi ve akışı ayrı çalışma.",
      ],
    ],
  },
  learning: {
    eyebrow: "Kurumsal öğrenim kullanım rehberi",
    title:
      "Vaka bilgisini kalıcı standarda ve yeniden kullanılabilir hafızaya dönüştürün",
    description:
      "Bu bölüm kapanıştan hemen önce kullanılır. Etkili çözümün hangi dokümanı değiştirdiğini, kim tarafından onaylandığını ve nerelerde yeniden kullanılabileceğini kaydedin.",
    cards: [
      [
        "Öğrenim kaydı",
        "Doğrulanmış neden, etkili karşı önlem ve doğrulama yönteminin kısa özeti.",
      ],
      [
        "Sistem dokümanı",
        "Revizyonu, sahibi, onayı ve yürürlük tarihi olan gerçek standart çıktısı.",
      ],
      [
        "Öğrenim kararı",
        "Doküman güncellendi veya neden güncelleme gerekmedi; gerekçesi ve onayıyla.",
      ],
    ],
  },
} as const;

function WorkspaceSectionGuide({
  section,
}: {
  section: keyof typeof SECTION_GUIDES;
}) {
  const guide = SECTION_GUIDES[section];
  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/25">
      <p className="eyebrow">{guide.eyebrow}</p>
      <h2 className="mt-1 text-lg font-semibold">{guide.title}</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
        {guide.description}
      </p>
      <div
        className={`mt-4 grid gap-3 ${guide.cards.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}
      >
        {guide.cards.map(([title, detail]) => (
          <div
            key={title}
            className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60"
          >
            <strong className="text-sm text-indigo-700 dark:text-indigo-300">
              {title}
            </strong>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecordCardHeader({title,onRemove,compact=false}:{title:string;onRemove:()=>void;compact?:boolean}) {
  return <div className={`flex items-center justify-between gap-3 ${compact?"mb-2":"mb-3"}`}><strong className={`${compact?"text-xs":"text-sm"} min-w-0 truncate text-slate-700 dark:text-slate-200`}>{title}</strong><button type="button" className="shrink-0 text-xs font-semibold text-red-600 hover:underline" onClick={onRemove}>Kaydı kaldır</button></div>;
}

function NumericField({label,unit,help,value,onChange,compact=false}:{label:string;unit:string;help:string;value:number;onChange:(value:number)=>void;compact?:boolean}) {
  return <label className="block min-w-0"><span className="mb-1 block min-w-0"><span className="block break-words text-xs font-semibold leading-4 text-slate-600 dark:text-slate-300">{label}</span><span className="mt-0.5 block text-[10px] font-normal leading-3 text-slate-400">{unit}</span></span><input type="number" className="field" value={value} onChange={(event)=>onChange(numberValue(event.target.value))}/><span className={`mt-1.5 block break-words leading-4 text-slate-400 ${compact?"text-[10px]":"text-[11px]"}`}>{help}</span></label>;
}

// Eski kayıtlarla geriye dönük UI karşılaştırması için tutulur; yeni arayüz kart içi kaldırma kullanır.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DecisionLabRemovalPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  return (
    <RecordRemovalPanel
      groups={[
        {
          label: "Kıyaslama referansı",
          items: workspace.benchmarkReferences.map((x) => ({
            id: x.id,
            name: x.name,
            hasContent: Boolean(x.name.trim() || x.capability.trim()),
            remove: () =>
              onChange({
                benchmarkReferences: workspace.benchmarkReferences.filter(
                  (item) => item.id !== x.id,
                ),
              }),
          })),
        },
        {
          label: "Kapasite senaryosu",
          items: workspace.capacityScenarios.map((x) => ({
            id: x.id,
            name: x.name,
            hasContent: Boolean(x.demand || x.bottleneckCycleSeconds),
            remove: () =>
              onChange({
                capacityScenarios: workspace.capacityScenarios.filter(
                  (item) => item.id !== x.id,
                ),
              }),
          })),
        },
        {
          label: "Satış ve operasyon planı",
          items: workspace.sopScenarios.map((x) => ({
            id: x.id,
            name: x.name,
            hasContent: Boolean(x.demandExpected || x.regularCapacity),
            remove: () =>
              onChange({
                sopScenarios: workspace.sopScenarios.filter(
                  (item) => item.id !== x.id,
                ),
              }),
          })),
        },
        {
          label: "Hat dengeleme çalışması",
          items: workspace.lineBalanceStudies.map((x, index) => ({
            id: String(index),
            name: `Çalışma ${index + 1} · ${x.operations.length} operasyon`,
            hasContent: Boolean(x.demand || x.operations.length),
            remove: () =>
              onChange({
                lineBalanceStudies: workspace.lineBalanceStudies.filter(
                  (_, itemIndex) => itemIndex !== index,
                ),
              }),
          })),
        },
      ]}
    />
  );
}

function PanelTitle({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action: string;
  onAction: () => void;
}) {
  const terms = PANEL_TERMS[title];
  const detail = description ?? PANEL_DESCRIPTIONS[title];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="text-lg font-semibold">
            {PANEL_FRIENDLY_TITLES[title] ?? title}
          </h2>
          {detail && (
            <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {detail}
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={onAction}>
          {action === "OPL ekle"
            ? "Tek Nokta Dersi ekle"
            : action === "Kaizen ekle"
              ? "İyileştirme deneyi ekle"
              : action}
        </button>
      </div>
      {terms && (
        <details className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs dark:bg-slate-900/60">
          <summary className="cursor-pointer font-semibold text-indigo-700 dark:text-indigo-300">
            Bu bölümdeki alanlar ne anlama geliyor?
          </summary>
          <ul className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-400">
            {terms.map((term) => (
              <li key={term}>• {term}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function RecordRemovalPanel({
  groups,
}: {
  groups: {
    label: string;
    items: {
      id: string;
      name: string;
      hasContent: boolean;
      remove: () => void;
    }[];
  }[];
}) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (!total) return null;
  return (
    <details className="card p-5">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
        Eklenen kayıtları yönet veya kaldır{" "}
        <span className="ml-1 text-xs font-normal text-slate-400">
          ({total} kayıt)
        </span>
      </summary>
      <p className="mt-2 text-xs text-slate-500">
        Yanlışlıkla açılan boş kayıtlar doğrudan kaldırılır. Bilgi girilmiş
        kayıtlarda veri kaybını önlemek için onay istenir.
      </p>
      <div className="mt-4 space-y-4">
        {groups
          .filter((group) => group.items.length)
          .map((group) => (
            <div key={group.label}>
              <strong className="text-xs text-slate-500">{group.label}</strong>
              <ul className="mt-2 space-y-2">
                {group.items.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                  >
                    <span className="truncate">
                      {item.name || `${group.label} ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                      onClick={() => {
                        if (canRemoveRecord(group.label, item.hasContent))
                          item.remove();
                      }}
                    >
                      Kaldır
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </details>
  );
}

const DOCUMENT_LABELS: Record<SystemDocumentType, string> = {
  STANDARD_WORK: "Standart İş",
  CONTROL_PLAN: "Control Plan",
  PFMEA: "PFMEA",
  DFMEA: "DFMEA",
  MAINTENANCE_PLAN: "Bakım Planı",
  INSPECTION_INSTRUCTION: "Kontrol Talimatı",
  OPL: "OPL",
  COMPETENCY_RECORD: "Yetkinlik Kaydı",
};

function SystemDocumentsPanel({
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
          <h2 className="text-lg font-semibold">
            Revizyon ve onay kontrollü çıktılar
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            “Güncellendi” notu yerine sahibi, revizyonu, kanıtı ve yürürlük
            tarihi olan izlenebilir bir nesne oluşturun.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={add}>
          Doküman ekle
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {workspace.systemDocuments.map((doc) => (
          <div
            key={doc.id}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
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
          <p className="text-sm text-slate-400">
            Henüz sürümlü sistem çıktısı oluşturulmadı.
          </p>
        )}
      </div>
    </section>
  );
}

function ContainmentPanel({
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
          <h2 className="text-lg font-semibold">
            Geçici kontrolü görünür ve sonlandırılabilir tut
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Aktif veya doğrulanan geçici kontrol kaldırılmadan ya da kalıcı
            kontrole devredilmeden vaka kapanmaz.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={add}>
          Containment ekle
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {workspace.containmentControls.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
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
          <p className="text-sm text-slate-400">
            Bu vakada kayıtlı geçici kontrol yok.
          </p>
        )}
      </div>
    </section>
  );
}

function LearningDecisionPanel({
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
      <h2 className="text-lg font-semibold">Öğrenimi sisteme bağla</h2>
      <p className="mt-1 text-xs text-slate-400">
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

function LearningRecordPanel({
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
          <h2 className="text-lg font-semibold">
            Bu vakadan neyi standartlaştırıyoruz?
          </h2>
          <p className="mt-1 text-xs text-slate-400">
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

function AuditTimeline({ workspace }: { workspace: WsData }) {
  const [filter, setFilter] = useState<
    "ALL" | WsData["auditTrail"][number]["type"]
  >("ALL");
  const [showAll, setShowAll] = useState(false);
  const labels: Record<WsData["auditTrail"][number]["type"], string> = {
    CREATED: "Oluşturma",
    UPDATED: "Güncelleme",
    AI_DRAFT: "AI taslağı",
    REPORT: "Rapor",
    ATTACHMENT: "Dosya",
    LINKED: "Bağlantı",
    LIFECYCLE: "Yaşam döngüsü",
  };
  const filtered = [...workspace.auditTrail]
    .reverse()
    .filter((event) => filter === "ALL" || event.type === filter);
  const events = showAll ? filtered : filtered.slice(0, 8);
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Denetim izi</p>
          <h2 className="text-lg font-semibold">Çalışma zaman çizelgesi</h2>
          <p className="mt-1 text-xs text-slate-400">
            Kritik değişiklikler ve sistem işlemleri kronolojik olarak
            kaydedilir.
          </p>
        </div>
        <select
          className="field w-auto"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as typeof filter);
            setShowAll(false);
          }}
          aria-label="Olay türüne göre filtrele"
        >
          <option value="ALL">Tüm olaylar</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <ol className="mt-4 space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex gap-3 border-l-2 border-indigo-200 pl-4 dark:border-indigo-900"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm">{event.summary}</strong>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">
                  {labels[event.type]}
                </span>
              </div>
              {event.changedFields.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Alanlar: {event.changedFields.join(", ")}
                </p>
              )}
            </div>
            <time
              className="shrink-0 text-xs text-slate-400"
              dateTime={event.occurredAt}
            >
              {new Date(event.occurredAt).toLocaleString("tr-TR")}
            </time>
          </li>
        ))}
        {events.length === 0 && (
          <li className="text-sm text-slate-400">
            Bu filtre için denetim olayı bulunmuyor.
          </li>
        )}
      </ol>
      {filtered.length > 8 && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="btn btn-secondary mt-4"
        >
          {showAll
            ? "Son 8 olayı göster"
            : `Tüm geçmişi göster (${filtered.length})`}
        </button>
      )}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-7 sm:px-6 sm:py-9">
      {children}
    </main>
  );
}

function StepBadge({
  index,
  status,
  active,
}: {
  index: number;
  status: string;
  active: boolean;
}) {
  if (status === "DONE") {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
        ✓
      </span>
    );
  }
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
        active
          ? "bg-indigo-600 text-white"
          : status === "IN_PROGRESS"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {index + 1}
    </span>
  );
}

// ── Aktif adım formu ─────────────────────────────────────────────

function StepEditor({
  workspaceId,
  step,
  state,
  stepIndex,
  stepCount,
  dirty,
  onChange,
  onNavigate,
  onDrafted,
  ensureSaved,
}: {
  workspaceId: string;
  step: PlaybookStep;
  state: StepState;
  stepIndex: number;
  stepCount: number;
  dirty: boolean;
  onChange: (s: StepState) => void;
  onNavigate: (i: number) => void;
  onDrafted: (ws: WsData) => void;
  ensureSaved: () => Promise<boolean>;
}) {
  const [drafting, setDrafting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filledCount = step.fields.filter((f) =>
    fieldFilled(state.values[f.key]),
  ).length;
  const completionPercent = step.fields.length
    ? Math.round((filledCount / step.fields.length) * 100)
    : 100;
  const done = state.status === "DONE";
  const expectedOutput =
    step.expectedOutput ??
    `${step.fields.map((field) => field.label).join(", ")} kayıtlarının karar verilebilir ve izlenebilir biçimde oluşturulması.`;
  const completionCriteria = step.completionCriteria ?? [
    "Yazılan sonuç gözlem, ölçüm veya doğrulanabilir bir kaynağa dayanıyor.",
    "Varsayım ile doğrulanmış gerçek birbirinden açıkça ayrılıyor.",
    "Kararın sahibi, kapsamı ve gerekiyorsa sonraki aksiyonu anlaşılabiliyor.",
  ];

  function setValue(fieldKey: string, v: FieldValue) {
    onChange({
      ...state,
      status: state.status === "PENDING" ? "IN_PROGRESS" : state.status,
      values: { ...state.values, [fieldKey]: v },
    });
  }

  async function draft() {
    setDrafting(true);
    setErr(null);
    try {
      // Yerel değişiklikler kaybolmasın: önce kaydet.
      if (dirty && !(await ensureSaved()))
        throw new Error("Taslak öncesi kaydetme başarısız.");
      const res = await fetch(`/api/workspace/${workspaceId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepKey: step.key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Taslak üretilemedi.");
      onDrafted(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Hata.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{step.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {step.objective}
          </p>
        </div>
        <button
          onClick={draft}
          disabled={drafting}
          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          title="Boş alanlara probleme özel profesyonel taslak doldurur"
        >
          {drafting ? "Taslak üretiliyor…" : "✨ AI ile taslak doldur"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/50 p-4 text-sm text-slate-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-slate-300">
          <strong className="block text-indigo-700 dark:text-indigo-300">
            Bu adım nasıl yürütülür?
          </strong>
          <p className="mt-1.5 leading-6">{step.guidance}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-4 text-sm text-slate-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-slate-300">
          <strong className="block text-emerald-700 dark:text-emerald-300">
            Adımın beklenen çıktısı
          </strong>
          <p className="mt-1.5 leading-6">{expectedOutput}</p>
        </div>
      </div>

      <details className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
          Tamamlamadan önce kalite kontrolü
        </summary>
        <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-400">
          {completionCriteria.map((criterion) => (
            <li key={criterion} className="flex gap-2">
              <span className="text-emerald-500">✓</span>
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800">
          Bu adım vakaya uygulanmıyorsa boş bırakmak yerine neden
          uygulanmadığını ve aynı güvenceyi hangi kayıt veya kontrolün
          sağladığını ilgili alanda belirtin.
        </p>
      </details>

      {err && <p className="text-xs text-red-600">{err}</p>}

      <div className="flex flex-col gap-4" aria-label={`${step.name} alanları`}>
        {step.fields.map((f) => (
          <FieldEditor
            key={f.key}
            field={f}
            value={state.values[f.key]}
            onChange={(v) => setValue(f.key, v)}
          />
        ))}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onChange({ ...state, status: done ? "IN_PROGRESS" : "DONE" })
            }
            className={done ? "btn btn-secondary" : "btn btn-success"}
          >
            {done ? "↩ Tamamlandı işaretini kaldır" : "✓ Adımı tamamla"}
          </button>
          <div
            className="min-w-36"
            aria-label={`Adım doluluk oranı yüzde ${completionPercent}`}
          >
            <div className="flex justify-between text-xs text-slate-400">
              <span>
                {filledCount}/{step.fields.length} alan dolu
              </span>
              <span>%{completionPercent}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <span
                className="block h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="btn btn-secondary"
          >
            ← Önceki
          </button>
          <button
            onClick={() => onNavigate(stepIndex + 1)}
            disabled={stepIndex >= stepCount - 1}
            className="btn btn-secondary"
          >
            Sonraki →
          </button>
        </div>
      </div>
    </section>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: PlaybookField;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
}) {
  const rows = Array.isArray(value) ? value : [];
  const filled = fieldFilled(value);
  const guide = getFieldGuide(field);
  const inputId = `playbook-field-${field.key}`;
  const helpId = `${inputId}-help`;
  return (
    <div
      className={`rounded-xl border p-4 transition ${filled ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/60" : "border-slate-200 dark:border-slate-800"}`}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {field.label}
          </label>
          <p
            id={helpId}
            className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400"
          >
            {guide.rationale}
          </p>
        </div>
        <span
          className={`status-badge ${filled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
        >
          {filled ? "Kayıt var" : "Girdi bekliyor"}
        </span>
      </div>
      {field.type === "fivewhy" ? (
        <FiveWhyEditor rows={rows} onChange={onChange} />
      ) : field.type === "fishbone" ? (
        <FishboneEditor rows={rows} onChange={onChange} />
      ) : field.type === "table" ? (
        <TableEditor field={field} rows={rows} onChange={onChange} />
      ) : field.type === "textarea" ? (
        <textarea
          id={inputId}
          aria-describedby={helpId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={field.help ?? ""}
          className="field resize-y"
        />
      ) : (
        <input
          id={inputId}
          aria-describedby={helpId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.help ?? ""}
          className="field"
        />
      )}
      <div className="mt-2 grid gap-1 text-[11px] leading-5 text-slate-500 sm:grid-cols-2 dark:text-slate-400">
        <p>
          <strong className="text-slate-600 dark:text-slate-300">
            İyi kayıt ölçütü:
          </strong>{" "}
          {guide.acceptance}
        </p>
        <p>
          <strong className="text-slate-600 dark:text-slate-300">Örnek:</strong>{" "}
          {guide.example}
        </p>
      </div>
    </div>
  );
}

function getFieldGuide(field: PlaybookField): {
  rationale: string;
  acceptance: string;
  example: string;
} {
  const label = field.label.toLocaleLowerCase("tr-TR");
  const rationale =
    field.rationale ??
    (field.type === "fivewhy"
      ? "Neden-sonuç zincirini görünür kılar; ilk makul açıklamada durmayı ve görüşü kök neden sanmayı önler."
      : field.type === "fishbone"
        ? "Olası nedenleri 6M başlıklarında genişletir; ekipteki farklı uzmanlıkların sistematik biçimde değerlendirilmesini sağlar."
        : field.type === "table"
          ? "Birden fazla kaydı aynı yapıda karşılaştırmayı; sahiplik, kapsam ve takip bilgisini satır bazında izlemeyi sağlar."
          : label.includes("kanıt") || label.includes("doğrula")
            ? "Kararın yalnız kanaate değil, başka bir kişinin de inceleyebileceği nesnel bir dayanağa bağlanmasını sağlar."
            : label.includes("hedef") ||
                label.includes("metrik") ||
                label.includes("sonuç")
              ? "Başarı ölçüsünü görünür kılar ve uygulama sonrasında önce-sonra karşılaştırması yapılabilmesini sağlar."
              : label.includes("neden")
                ? "Problemi belirti düzeyinde bırakmadan sınanabilir bir nedensel açıklamaya dönüştürür."
                : label.includes("kapsam") || label.includes("nerede")
                  ? "Analizin sınırını netleştirir; genellemeyi ve kapsam dışı sonuç üretmeyi önler."
                  : label.includes("sorumlu") ||
                      label.includes("lider") ||
                      label.includes("ekip")
                    ? "Kararın ve takibin sahipsiz kalmasını önler; kimin katkı veya onay vereceğini görünür yapar."
                    : "Bu adımın sonucunu izlenebilir bir çalışma kaydına dönüştürür ve sonraki adımın doğru bilgiyle başlamasını sağlar.");

  const acceptance =
    field.acceptance ??
    (field.type === "table"
      ? "Her satır tek bir kaydı anlatsın; kritik hücreler boş kalmasın ve ifadeler birbirinden ayırt edilebilir olsun."
      : field.type === "fivewhy"
        ? "Her neden bir önceki ifadeyi açıklasın, kanıtı yazılsın ve kök neden yalnız doğrulandıktan sonra işaretlensin."
        : field.type === "fishbone"
          ? "Başlık başına olası nedenler üretildikten sonra her neden veriyle elensin veya güçlendirilsin."
          : "Somut, vakaya özgü ve başka bir kişinin aynı şekilde yorumlayabileceği açıklıkta olsun; mümkünse tarih, sayı ve kaynak içersin.");

  const example =
    field.example ??
    field.help ??
    (field.type === "table"
      ? "Bir satır = bir aksiyon, gözlem, kişi veya hipotez; örn. “Hat 2 sensör kontrolü · Ayşe K. · 22.07 · Devam ediyor”."
      : field.type === "fivewhy"
        ? "“Conta ezildi” → “Sıkma kuvveti üst limitteydi”; kanıt: tork kaydı ve tekrar deneyi."
        : field.type === "fishbone"
          ? "Makine: fikstür boşluğu; değerlendirme: komparatör ölçümünde 0,4 mm sapma görüldü."
          : label.includes("hedef")
            ? "“Hurda oranını 30 Eylül'e kadar %4,2'den %1,0'ın altına indirmek.”"
            : label.includes("neden")
              ? "“Besleme basıncı 5,5 bar altına düştüğünde eksik dolum oluşuyor; üç tekrar deneyiyle doğrulandı.”"
              : "“Hat 2'de, 18 Temmuz gece vardiyasında 480 parçanın 23'ünde (%4,8) sapma ölçüldü.”");

  return { rationale, acceptance, example };
}

function TableEditor({
  field,
  rows,
  onChange,
}: {
  field: PlaybookField;
  rows: TableRow[];
  onChange: (rows: TableRow[]) => void;
}) {
  const cols = field.columns ?? [];
  const emptyRow = () =>
    Object.fromEntries(cols.map((c) => [c.key, ""])) as TableRow;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left dark:border-slate-800 dark:bg-slate-900/60">
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                {c.label}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
            >
              {cols.map((c) => (
                <td key={c.key} className="p-1">
                  <input
                    aria-label={`${field.label}, ${i + 1}. satır, ${c.label}`}
                    value={row[c.key] ?? ""}
                    onChange={(e) =>
                      onChange(
                        rows.map((r, j) =>
                          j === i ? { ...r, [c.key]: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder={c.help ?? `${c.label} girin`}
                    className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none transition focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900"
                  />
                </td>
              ))}
              <td className="p-1 text-center">
                <button
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  className="text-slate-300 hover:text-red-500"
                  title="Satırı sil"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={cols.length + 1}
                className="px-3 py-3 text-center text-xs text-slate-400"
              >
                Henüz satır yok — elle ekle ya da &quot;AI ile taslak
                doldur&quot;.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="border-t border-slate-100 p-1.5 dark:border-slate-800/60">
        <button
          onClick={() => onChange([...rows, emptyRow()])}
          className="chip"
        >
          + Satır ekle
        </button>
      </div>
    </div>
  );
}

// ── 5 Neden aracı (zincir + kök neden işareti) ───────────────────

function FiveWhyEditor({
  rows,
  onChange,
}: {
  rows: TableRow[];
  onChange: (r: TableRow[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    if (!draft.trim()) return;
    onChange([
      ...rows,
      {
        level: String(rows.length + 1),
        why: draft.trim(),
        evidence: "",
        isRoot: "",
      },
    ]);
    setDraft("");
  };
  const patch = (i: number, p: TableRow) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const remove = (i: number) =>
    onChange(
      rows
        .filter((_, j) => j !== i)
        .map((r, j) => ({ ...r, level: String(j + 1) })),
    );

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const root = isCellMarked(r.isRoot);
          return (
            <li
              key={i}
              className={`rounded-lg border p-2.5 transition ${
                root
                  ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {i + 1}
                </span>
                <input
                  value={r.why ?? ""}
                  onChange={(e) => patch(i, { why: e.target.value })}
                  placeholder="Neden?"
                  className="field"
                />
                <button
                  onClick={() => patch(i, { isRoot: root ? "" : "evet" })}
                  title="Kök neden olarak işaretle"
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    root
                      ? "bg-emerald-500 text-white"
                      : "border border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700"
                  }`}
                >
                  {root ? "✓ Kök neden" : "Kök neden"}
                </button>
                <button
                  onClick={() => remove(i)}
                  className="shrink-0 text-slate-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
              <input
                value={r.evidence ?? ""}
                onChange={(e) => patch(i, { evidence: e.target.value })}
                placeholder="Kanıt — bu nedeni neye dayanarak söylüyorsun?"
                className="field mt-1.5 text-xs"
              />
            </li>
          );
        })}
      </ol>
      {rows.length === 0 && (
        <p className="px-1 py-2 text-center text-xs text-slate-400">
          Zincir boş — ilk &quot;neden?&quot; ile başla ya da &quot;AI ile
          taslak doldur&quot;.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={
            rows.length === 0 ? "Neden oldu? →" : "Peki bu neden oldu? →"
          }
          className="field"
        />
        <button onClick={add} className="btn btn-secondary shrink-0">
          Ekle
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Kök neden, &quot;kaldırınca problem tekrarlanamıyor&quot; olduğunda
        doğrulanmıştır — zinciri oraya kadar derinleştir.
      </p>
    </div>
  );
}

// ── Balık kılçığı aracı (6M sütunları) ───────────────────────────

function FishboneEditor({
  rows,
  onChange,
}: {
  rows: TableRow[];
  onChange: (r: TableRow[]) => void;
}) {
  // Satırlar 6M kovalarına dağıtılır; tanınmayan kategori "Sınıflandırılmamış"a düşer.
  const buckets = new Map<string, { row: TableRow; index: number }[]>();
  const unmatched: { row: TableRow; index: number }[] = [];
  for (const [index, row] of rows.entries()) {
    const key = normalizeFishboneCategory(row.category);
    if (!key) unmatched.push({ row, index });
    else buckets.set(key, [...(buckets.get(key) ?? []), { row, index }]);
  }

  const patch = (i: number, p: TableRow) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FISHBONE_CATEGORIES.map((cat) => (
        <FishboneColumn
          key={cat.key}
          label={cat.label}
          entries={buckets.get(cat.key) ?? []}
          onAdd={(cause) =>
            onChange([...rows, { category: cat.label, cause, assessment: "" }])
          }
          onPatch={patch}
          onRemove={remove}
        />
      ))}
      {unmatched.length > 0 && (
        <div className="sm:col-span-2">
          <FishboneColumn
            label="Sınıflandırılmamış"
            entries={unmatched}
            onPatch={patch}
            onRemove={remove}
          />
        </div>
      )}
    </div>
  );
}

function FishboneColumn({
  label,
  entries,
  onAdd,
  onPatch,
  onRemove,
}: {
  label: string;
  entries: { row: TableRow; index: number }[];
  onAdd?: (cause: string) => void;
  onPatch: (i: number, p: TableRow) => void;
  onRemove: (i: number) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {label}
        </span>
        <span className="text-[11px] text-slate-400">{entries.length}</span>
      </div>
      <ul className="mb-2 flex flex-col gap-1.5">
        {entries.map(({ row, index }) => (
          <li
            key={index}
            className="rounded-lg bg-slate-50 p-1.5 dark:bg-slate-900/50"
          >
            <div className="flex items-center gap-1.5">
              <input
                value={row.cause ?? ""}
                onChange={(e) => onPatch(index, { cause: e.target.value })}
                placeholder="Olası neden"
                className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900"
              />
              <button
                onClick={() => onRemove(index)}
                className="shrink-0 text-slate-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
            <input
              value={row.assessment ?? ""}
              onChange={(e) => onPatch(index, { assessment: e.target.value })}
              placeholder="Değerlendirme (kanıtla)…"
              className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-slate-500 outline-none transition focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900"
            />
          </li>
        ))}
      </ul>
      {onAdd && (
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
      )}
    </div>
  );
}

// ── Aksiyon takibi ───────────────────────────────────────────────

function Actions({
  actions,
  onChange,
}: {
  actions: ActionItem[];
  onChange: (a: ActionItem[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const add = () => {
    if (!draft.trim()) return;
    const id = crypto.randomUUID();
    onChange([
      ...actions,
      {
        id,
        action: draft.trim(),
        owner: null,
        status: "OPEN",
        successMetric: "",
        baseline: "",
        target: "",
        actual: "",
        verificationDueDate: null,
        evidenceIds: [],
      },
    ]);
    setExpanded((items) => [...items, id]);
    setDraft("");
  };
  const patch = (index: number, values: Partial<ActionItem>) =>
    onChange(
      actions.map((item, current) =>
        current === index ? { ...item, ...values } : item,
      ),
    );
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Uygulama ve etkinlik</p>
          <h2 className="text-lg font-semibold">Aksiyon Takibi</h2>
          <p className="mt-1 text-xs text-slate-400">
            Önce işi uygula, ardından sonuç metriğiyle gerçekten etkili olduğunu
            doğrula.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-950/30">
            {
              actions.filter((a) => !["EFFECTIVE", "DONE"].includes(a.status))
                .length
            }{" "}
            açık
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/30">
            {
              actions.filter((a) => ["EFFECTIVE", "DONE"].includes(a.status))
                .length
            }{" "}
            etkili
          </span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Yeni aksiyon…"
          className="field"
        />
        <button onClick={add} className="btn btn-primary shrink-0">
          Aksiyon ekle
        </button>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {actions.map((action, index) => {
          const id = action.id ?? String(index);
          const isOpen = expanded.includes(id);
          const needsVerification =
            action.status === "IMPLEMENTED" ||
            action.status === "EFFECTIVENESS_DUE";
          const ineffective = action.status === "INEFFECTIVE";
          return (
            <li
              key={id}
              className={`overflow-hidden rounded-xl border bg-white dark:bg-slate-950/30 ${ineffective ? "border-red-300 dark:border-red-900" : needsVerification ? "border-amber-300 dark:border-amber-900" : "border-slate-200 dark:border-slate-800"}`}
            >
              <div className="flex flex-wrap items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((items) =>
                      isOpen
                        ? items.filter((item) => item !== id)
                        : [...items, id],
                    )
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <strong className="block truncate text-sm">
                    {action.action || "İsimsiz aksiyon"}
                  </strong>
                  <span className="mt-1 block text-xs text-slate-400">
                    {action.owner || "Sorumlu atanmamış"}
                    {action.verificationDueDate
                      ? ` · doğrulama ${new Date(action.verificationDueDate).toLocaleDateString("tr-TR")}`
                      : " · doğrulama tarihi yok"}
                  </span>
                </button>
                <ActionStatusPill status={action.status} />
                {action.successMetric && (
                  <span className="hidden max-w-52 truncate text-xs text-slate-500 lg:block">
                    {action.successMetric}: {action.baseline || "—"} →{" "}
                    {action.actual || action.target || "—"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((items) =>
                      isOpen
                        ? items.filter((item) => item !== id)
                        : [...items, id],
                    )
                  }
                  className="btn btn-secondary"
                >
                  {isOpen ? "Kapat" : "Detaylar"}
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="grid gap-3 lg:grid-cols-12">
                    <label className="lg:col-span-6">
                      <span className="field-label">Aksiyon</span>
                      <input
                        value={action.action}
                        onChange={(e) =>
                          patch(index, { action: e.target.value })
                        }
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-3">
                      <span className="field-label">Sorumlu</span>
                      <input
                        value={action.owner ?? ""}
                        onChange={(e) =>
                          patch(index, { owner: e.target.value || null })
                        }
                        placeholder="Ad soyad"
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-3">
                      <span className="field-label">Durum</span>
                      <select
                        value={action.status}
                        onChange={(e) =>
                          patch(index, {
                            status: e.target.value as ActionStatus,
                          })
                        }
                        className="field"
                      >
                        {(
                          [
                            "OPEN",
                            "IN_PROGRESS",
                            "IMPLEMENTED",
                            "EFFECTIVENESS_DUE",
                            "EFFECTIVE",
                            "INEFFECTIVE",
                            "DONE",
                          ] as ActionStatus[]
                        ).map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABEL[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="lg:col-span-4">
                      <span className="field-label">Başarı metriği</span>
                      <input
                        value={action.successMetric ?? ""}
                        onChange={(e) =>
                          patch(index, { successMetric: e.target.value })
                        }
                        placeholder="Örn. kaçak oranı"
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Başlangıç</span>
                      <input
                        value={action.baseline ?? ""}
                        onChange={(e) =>
                          patch(index, { baseline: e.target.value })
                        }
                        placeholder="Önce"
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Hedef</span>
                      <input
                        value={action.target ?? ""}
                        onChange={(e) =>
                          patch(index, { target: e.target.value })
                        }
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Gerçekleşen</span>
                      <input
                        value={action.actual ?? ""}
                        onChange={(e) =>
                          patch(index, { actual: e.target.value })
                        }
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Doğrulama tarihi</span>
                      <input
                        type="date"
                        value={action.verificationDueDate ?? ""}
                        onChange={(e) =>
                          patch(index, {
                            verificationDueDate: e.target.value || null,
                          })
                        }
                        className="field"
                      />
                    </label>
                  </div>
                  {needsVerification && (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30">
                      Aksiyon uygulandı; gerçekleşen sonuç ölçülene kadar etkili
                      kabul edilmez.
                    </p>
                  )}
                  {ineffective && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30">
                      Aksiyon etkisiz bulundu. Yeni karşı önlem veya kök neden
                      değerlendirmesi gerekiyor.
                    </p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          actions.filter((_, current) => current !== index),
                        )
                      }
                      className="btn btn-ghost text-red-600"
                    >
                      Aksiyonu sil
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {actions.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
            Henüz aksiyon yok. İlk karşı önlemi yukarıdan ekleyin.
          </li>
        )}
      </ul>
    </section>
  );
}

function ActionStatusPill({ status }: { status: ActionStatus }) {
  const color =
    status === "EFFECTIVE" || status === "DONE"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
      : status === "INEFFECTIVE"
        ? "bg-red-50 text-red-700 dark:bg-red-950/30"
        : status === "IMPLEMENTED" || status === "EFFECTIVENESS_DUE"
          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30"
          : status === "IN_PROGRESS"
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Profesyonel rapor ────────────────────────────────────────────

type Intelligence = {
  checks: { key: string; label: string; passed: boolean; detail: string }[];
  canClose: boolean;
  similar: {
    id: string;
    methodology: string;
    problemDescription: string;
    score: number;
  }[];
};

function AttachmentPanel({
  workspace,
  onFresh,
}: {
  workspace: WsData;
  onFresh: (ws: WsData) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<
    "WORKSPACE" | "EVIDENCE" | "CLAIM" | "ACTION" | "STEP"
  >("WORKSPACE");
  const [targetId, setTargetId] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targets =
    targetType === "EVIDENCE"
      ? workspace.evidence.map((x) => [x.id, x.title])
      : targetType === "CLAIM"
        ? workspace.claims.map((x) => [x.id, x.statement])
        : targetType === "ACTION"
          ? workspace.actions.map((x) => [x.id ?? "", x.action])
          : targetType === "STEP"
            ? workspace.steps.map((x) => [x.key, x.key])
            : [];
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("targetType", targetType);
      form.set("targetId", targetId);
      form.set("description", description);
      const res = await fetch(`/api/workspace/${workspace.id}/attachments`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Yüklenemedi.");
      onFresh(data);
      setFile(null);
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card p-6">
      <p className="eyebrow">Dosya kanıtları</p>
      <h2 className="text-lg font-semibold">
        Fotoğraf, rapor ve ölçüm dosyaları
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        JPEG/PNG/WebP, PDF, CSV, TXT ve Excel · en fazla 10 MB. Dosyayı doğrudan
        ilgili iddia, kanıt, aksiyon veya adıma bağla.
      </p>
      <div className="mt-4 grid gap-2 lg:grid-cols-5">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,text/csv,text/plain,.xls,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="field lg:col-span-2"
        />
        <select
          className="field"
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value as typeof targetType);
            setTargetId("");
          }}
        >
          <option value="WORKSPACE">Genel çalışma</option>
          <option value="EVIDENCE">Kanıta bağla</option>
          <option value="CLAIM">İddiaya bağla</option>
          <option value="ACTION">Aksiyona bağla</option>
          <option value="STEP">Adıma bağla</option>
        </select>
        <select
          className="field"
          disabled={targetType === "WORKSPACE"}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Hedef seç</option>
          {targets.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          disabled={!file || busy || (targetType !== "WORKSPACE" && !targetId)}
          onClick={upload}
        >
          {busy ? "Yükleniyor…" : "Dosyayı yükle"}
        </button>
      </div>
      <input
        className="field mt-2"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Dosyanın neyi kanıtladığını açıklayın"
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {workspace.attachments.map((a) => (
          <a
            key={a.id}
            href={`/api/workspace/${workspace.id}/attachments/${a.id}`}
            className="rounded-xl border border-slate-200 p-3 text-sm hover:border-indigo-300 dark:border-slate-800"
          >
            <div className="flex justify-between gap-2">
              <strong className="truncate">{a.originalName}</strong>
              <span className="shrink-0 text-xs text-slate-400">
                {Math.ceil(a.size / 1024)} KB
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {a.targetType}
              {a.targetId ? ` · ${a.targetId}` : ""}
              {a.description ? ` · ${a.description}` : ""}
            </p>
          </a>
        ))}
        {workspace.attachments.length === 0 && (
          <p className="text-sm text-slate-400">
            Henüz dosya kanıtı yüklenmedi.
          </p>
        )}
      </div>
    </section>
  );
}

function HorizontalDeploymentPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const update = (id: string, patch: Partial<HorizontalDeploymentTarget>) =>
    onChange({
      horizontalTargets: workspace.horizontalTargets.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });
  const add = () => {
    if (!name.trim()) return;
    onChange({
      horizontalTargets: [
        ...workspace.horizontalTargets,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          kind: "PROCESS",
          status: "PENDING",
          riskLevel: null,
          owner: null,
          dueDate: null,
          finding: "",
          evidenceIds: [],
          childWorkspaceId: null,
        },
      ],
    });
    setName("");
  };
  async function createCase(target: HorizontalDeploymentTarget) {
    setBusy(target.id);
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceWorkspaceId: workspace.id,
        methodology: workspace.methodology,
        problemDescription: workspace.problemDescription,
        reason: `Yatay yayılım riski: ${target.name}`,
        relation: "HORIZONTAL_DEPLOYMENT",
        targetDescription: `${workspace.problemDescription} — Yatay yayılım: ${target.name}`,
        horizontalTargetId: target.id,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      update(target.id, { childWorkspaceId: data.id });
      window.location.href = `/workspace/${data.id}`;
    } else setBusy(null);
  }
  return (
    <section className="card p-6">
      <p className="eyebrow">Yatay yayılım sihirbazı</p>
      <h2 className="text-lg font-semibold">
        Aynı risk başka nerede yaşayabilir?
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        Makine, hat, proses, lokasyon veya tedarikçi bazında kontrol et. Bulunan
        risk alt vakaya dönüşmeden kapanış tamamlanmaz.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Örn. Hat 4 kaynak istasyonu"
        />
        <button className="btn btn-secondary" onClick={add}>
          Hedef ekle
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {workspace.horizontalTargets.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
          >
            <div className="grid gap-2 sm:grid-cols-5">
              <input
                className="field sm:col-span-2"
                value={t.name}
                onChange={(e) => update(t.id, { name: e.target.value })}
              />
              <select
                className="field"
                value={t.kind}
                onChange={(e) =>
                  update(t.id, {
                    kind: e.target.value as HorizontalDeploymentTarget["kind"],
                  })
                }
              >
                <option value="PROCESS">Proses</option>
                <option value="MACHINE">Makine</option>
                <option value="LINE">Hat</option>
                <option value="LOCATION">Lokasyon</option>
                <option value="SUPPLIER">Tedarikçi</option>
              </select>
              <select
                className="field"
                value={t.status}
                onChange={(e) =>
                  update(t.id, {
                    status: e.target
                      .value as HorizontalDeploymentTarget["status"],
                    riskLevel:
                      e.target.value === "RISK_FOUND"
                        ? (t.riskLevel ?? "MEDIUM")
                        : null,
                  })
                }
              >
                <option value="PENDING">Kontrol bekliyor</option>
                <option value="CLEAR">Risk yok</option>
                <option value="RISK_FOUND">Risk bulundu</option>
              </select>
              <select
                className="field"
                disabled={t.status !== "RISK_FOUND"}
                value={t.riskLevel ?? ""}
                onChange={(e) =>
                  update(t.id, {
                    riskLevel: e.target
                      .value as HorizontalDeploymentTarget["riskLevel"],
                  })
                }
              >
                <option value="">Risk seviyesi</option>
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
              </select>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <input
                className="field"
                value={t.owner ?? ""}
                onChange={(e) =>
                  update(t.id, { owner: e.target.value || null })
                }
                placeholder="Sorumlu"
              />
              <input
                className="field"
                type="date"
                value={t.dueDate ?? ""}
                onChange={(e) =>
                  update(t.id, { dueDate: e.target.value || null })
                }
              />
              <input
                className="field sm:col-span-2"
                value={t.finding}
                onChange={(e) => update(t.id, { finding: e.target.value })}
                placeholder="Yerel bulgu / kontrol sonucu"
              />
            </div>
            <select
              multiple
              className="field mt-2 h-16 text-xs"
              value={t.evidenceIds}
              onChange={(e) =>
                update(t.id, {
                  evidenceIds: [...e.target.selectedOptions].map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {workspace.evidence.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            {t.status === "RISK_FOUND" && !t.childWorkspaceId && (
              <button
                className="btn btn-primary mt-2"
                disabled={busy === t.id}
                onClick={() => createCase(t)}
              >
                Bu risk için alt vaka aç
              </button>
            )}
            {t.childWorkspaceId && (
              <Link
                className="btn btn-secondary mt-2"
                href={`/workspace/${t.childWorkspaceId}`}
              >
                Alt vakaya git →
              </Link>
            )}
          </div>
        ))}
        {workspace.horizontalTargets.length === 0 && (
          <p className="text-sm text-slate-400">
            Henüz yayılım hedefi eklenmedi.
          </p>
        )}
      </div>
    </section>
  );
}

function SpcMiniChart({
  points,
  mean,
  ucl,
  lcl,
}: {
  points: { value: number }[];
  mean: number;
  ucl: number;
  lcl: number;
}) {
  const width = 520,
    height = 180,
    pad = 20;
  const min = Math.min(lcl, ...points.map((p) => p.value));
  const max = Math.max(ucl, ...points.map((p) => p.value));
  const x = (i: number) =>
    pad + i * ((width - pad * 2) / Math.max(1, points.length - 1));
  const y = (v: number) =>
    height -
    pad -
    ((v - min) / Math.max(0.0001, max - min)) * (height - pad * 2);
  const path = points
    .map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-3 w-full rounded-xl bg-slate-50 dark:bg-slate-900"
      role="img"
      aria-label="I kontrol kartı"
    >
      {[
        { v: ucl, c: "#ef4444", n: "UCL" },
        { v: mean, c: "#6366f1", n: "CL" },
        { v: lcl, c: "#ef4444", n: "LCL" },
      ].map((l) => (
        <g key={l.n}>
          <line
            x1={pad}
            x2={width - pad}
            y1={y(l.v)}
            y2={y(l.v)}
            stroke={l.c}
            strokeDasharray="5 4"
          />
          <text
            x={width - pad - 2}
            y={y(l.v) - 3}
            textAnchor="end"
            fontSize="9"
            fill={l.c}
          >
            {l.n} {l.v}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#0f766e" strokeWidth="2" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r="3"
          fill={p.value > ucl || p.value < lcl ? "#ef4444" : "#0f766e"}
        />
      ))}
    </svg>
  );
}

function SpecialtyPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const [renderedAt] = useState(() => Date.now());
  const specialty = workspace.specialty ?? {};
  const set = (values: Record<string, unknown>) =>
    onChange({ specialty: { ...specialty, ...values } });
  if (workspace.methodology === "SPC") {
    const raw = String(specialty.spcData ?? "");
    const lsl =
      specialty.lsl === "" || specialty.lsl == null
        ? null
        : Number(specialty.lsl);
    const usl =
      specialty.usl === "" || specialty.usl == null
        ? null
        : Number(specialty.usl);
    let points = parseMeasurementText(raw);
    let analysis: ReturnType<typeof analyzeIndividuals> | null = null;
    let parseError = "";
    try {
      points = parseMeasurementText(raw);
      if (points.length >= 2) analysis = analyzeIndividuals(points, lsl, usl);
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Veri okunamadı";
    }
    return (
      <section className="card p-6">
        <p className="eyebrow">SPC çalışma tezgâhı</p>
        <h2 className="text-lg font-semibold">
          I-MR kontrol kartı ve özel neden sinyalleri
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          CSV/Excel’den satırları yapıştır: tarih;ölçüm veya yalnız ölçüm.
          Limitler hareketli aralıkla hesaplanır.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <textarea
            className="field min-h-48 font-mono text-xs"
            value={raw}
            onChange={(e) => set({ spcData: e.target.value })}
            placeholder={"2026-01-01;10.02\n2026-01-02;10.11"}
          />
          <div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="field"
                type="number"
                value={(specialty.lsl as string) ?? ""}
                onChange={(e) => set({ lsl: e.target.value })}
                placeholder="LSL"
              />
              <input
                className="field"
                type="number"
                value={(specialty.usl as string) ?? ""}
                onChange={(e) => set({ usl: e.target.value })}
                placeholder="USL"
              />
            </div>
            {analysis && (
              <>
                <SpcMiniChart
                  points={points}
                  mean={analysis.mean}
                  ucl={analysis.ucl}
                  lcl={analysis.lcl}
                />
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    ["Ortalama", analysis.mean],
                    ["LCL", analysis.lcl],
                    ["UCL", analysis.ucl],
                    ["Sigma", analysis.sigma],
                    ["Cp", analysis.cp ?? "—"],
                    ["Cpk", analysis.cpk ?? "—"],
                  ].map(([k, v]) => (
                    <div
                      key={String(k)}
                      className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900"
                    >
                      <strong className="block text-base">{v}</strong>
                      {k}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {analysis.signals.map((s, i) => (
                    <p
                      key={i}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30"
                    >
                      ⚠ {s.message}
                    </p>
                  ))}
                  {analysis.signals.length === 0 && (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      Özel neden sinyali bulunmadı.
                    </p>
                  )}
                </div>
              </>
            )}
            {parseError && (
              <p className="mt-2 text-xs text-red-600">{parseError}</p>
            )}
          </div>
        </div>
      </section>
    );
  }
  if (workspace.methodology === "FMEA") {
    const analysisStep = workspace.steps.find((s) => s.key === "analysis");
    const rows = (analysisStep?.values.fmeaTable ?? []) as TableRow[];
    const scored = rows.map((row) => ({
      row,
      risk: scoreFmea(row.s, row.o, row.d),
    }));
    const recalc = () => {
      if (!analysisStep) return;
      onChange({
        steps: workspace.steps.map((s) =>
          s.key !== "analysis"
            ? s
            : {
                ...s,
                values: {
                  ...s.values,
                  fmeaTable: rows.map((r) => {
                    const risk = scoreFmea(r.s, r.o, r.d);
                    return { ...r, rpn: risk.valid ? String(risk.rpn) : "" };
                  }),
                },
              },
        ),
      });
    };
    return (
      <section className="card p-6">
        <p className="eyebrow">FMEA risk motoru</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              S×O×D doğrulama ve öncelik
            </h2>
            <p className="text-xs text-slate-400">
              1–10 dışı puanlar reddedilir; S≥9 RPN düşük olsa da kritiktir.
            </p>
          </div>
          <button onClick={recalc} className="btn btn-primary">
            RPN’leri hesapla
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {scored
            .sort((a, b) => b.risk.rpn - a.risk.rpn)
            .map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
              >
                <span>{r.row.failureMode || `Satır ${i + 1}`}</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${r.risk.priority === "CRITICAL" ? "bg-red-100 text-red-700" : r.risk.priority === "HIGH" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {r.risk.valid
                    ? `${r.risk.priority} · RPN ${r.risk.rpn}`
                    : "Geçersiz S/O/D"}
                </span>
              </div>
            ))}
          {rows.length === 0 && (
            <p className="text-sm text-slate-400">
              Önce “Hata Modu Analizi” adımına satır ekleyin.
            </p>
          )}
        </div>
      </section>
    );
  }
  if (workspace.methodology === "EIGHT_D") {
    const startedAt = String(specialty.incidentStartedAt ?? "");
    const elapsed = startedAt
      ? Math.max(0, Math.floor((renderedAt - Date.parse(startedAt)) / 3600000))
      : null;
    const d3 = workspace.steps.find((s) => s.key === "d3");
    const d4 = workspace.steps.find((s) => s.key === "d4");
    const containment = String(d3?.values.effectiveness ?? "");
    const root =
      workspace.claims.find(
        (c) => c.kind === "ROOT_CAUSE" && c.status === "VERIFIED",
      )?.statement ?? "";
    const message = customerUpdate(
      workspace.problemDescription,
      containment,
      root,
      workspace.closureStatus === "CLOSED",
    );
    return (
      <section className="card p-6">
        <p className="eyebrow">8D olay komuta merkezi</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Müşteri koruma saati</h2>
            <input
              type="datetime-local"
              className="field mt-3"
              value={startedAt}
              onChange={(e) => set({ incidentStartedAt: e.target.value })}
            />
            {elapsed != null && (
              <p
                className={`mt-3 rounded-xl p-3 text-sm ${elapsed > 24 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                <strong>{elapsed} saat</strong> geçti · containment{" "}
                {d3?.status === "DONE" ? "tamam" : "bekliyor"}
              </p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Şüpheli stok", "suspectStock"],
                ["Müşteri stoku", "customerStock"],
                ["Transit", "transitStock"],
              ].map(([label, key]) => (
                <input
                  key={key}
                  className="field text-xs"
                  value={String(specialty[key] ?? "")}
                  onChange={(e) => set({ [key]: e.target.value })}
                  placeholder={label}
                />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Kontrollü müşteri metni</h2>
            <textarea
              readOnly
              className="field mt-3 min-h-48 text-xs"
              value={message}
            />
            <p className="mt-2 text-xs text-slate-400">
              Kök neden doğrulanana kadar kesin dil otomatik engellenir.
            </p>
          </div>
        </div>
      </section>
    );
  }
  if (workspace.methodology === "KEPNER_TREGOE") {
    const date = String(specialty.deviationDate ?? "");
    const changeRows = (workspace.steps.find((s) => s.key === "changes")?.values
      .changeList ?? []) as TableRow[];
    const timeline = date
      ? buildChangeTimeline(
          date,
          changeRows
            .map((r) => ({ date: r.date, change: r.change }))
            .filter((x) => x.date),
        )
      : [];
    return (
      <section className="card p-6">
        <p className="eyebrow">KT değişiklik radarı</p>
        <h2 className="text-lg font-semibold">
          Sapma çevresindeki zaman çizgisi
        </h2>
        <input
          type="date"
          className="field field-sm mt-3"
          value={date}
          onChange={(e) => set({ deviationDate: e.target.value })}
        />
        <div className="mt-4 flex flex-col gap-2">
          {timeline.map((x, i) => (
            <div
              key={i}
              className={`rounded-xl border-l-4 p-3 text-sm ${x.kind === "DEVIATION" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-indigo-400 bg-slate-50 dark:bg-slate-900"}`}
            >
              <strong>
                {x.date} · {x.label}
              </strong>
              {x.distanceDays != null && x.kind === "CHANGE" && (
                <span className="ml-2 text-xs text-slate-500">
                  sapmadan {Math.abs(x.distanceDays)} gün{" "}
                  {x.distanceDays <= 0 ? "önce" : "sonra"}
                </span>
              )}
            </div>
          ))}
          {!date && (
            <p className="text-sm text-slate-400">
              İlk sapma tarihini seçin; “Değişiklik Analizi” satırları otomatik
              dizilir.
            </p>
          )}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <input
            className="field"
            value={String(specialty.experiment ?? "")}
            onChange={(e) => set({ experiment: e.target.value })}
            placeholder="Geri alma / A-B deneyi"
          />
          <input
            className="field"
            value={String(specialty.expected ?? "")}
            onChange={(e) => set({ expected: e.target.value })}
            placeholder="Beklenen sonuç"
          />
          <select
            className="field"
            value={String(specialty.verdict ?? "PENDING")}
            onChange={(e) => set({ verdict: e.target.value })}
          >
            <option value="PENDING">Deney bekliyor</option>
            <option value="CONFIRMED">Neden doğrulandı</option>
            <option value="REJECTED">Neden elendi</option>
          </select>
        </div>
      </section>
    );
  }
  if (workspace.methodology === "KT_DECISION") {
    const rowsOf = (stepKey: string, field: string) =>
      (workspace.steps.find((s) => s.key === stepKey)?.values[field] ?? []) as TableRow[];
    const mustRows = rowsOf("musts", "mustTable");
    const wantRows = rowsOf("wants", "wantTable");
    const scoreRows = rowsOf("score", "scoreTable");

    const norm = (s: string | undefined) => (s ?? "").trim().toLocaleLowerCase("tr");
    const YES = new Set(["evet", "var", "geçer", "geçti", "true", "yes", "x", "✓", "olur", "uygun"]);
    const NO = new Set(["hayır", "yok", "kalır", "elendi", "false", "no", "olmaz"]);
    const asBool = (v: string | undefined): boolean | null => {
      const t = norm(v);
      if (YES.has(t)) return true;
      if (NO.has(t)) return false;
      return null;
    };
    const asNum = (v: string | undefined): number => {
      const n = Number((v ?? "").replace(",", "."));
      return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0;
    };
    const asWeight = (v: string | undefined): number => {
      const n = Number((v ?? "").replace(",", "."));
      return Number.isFinite(n) && n > 0 ? Math.max(1, Math.min(10, n)) : 1;
    };

    const criteria: DecisionCriterion[] = [];
    for (const r of mustRows) {
      const label = (r.criterion ?? "").trim();
      if (label) criteria.push({ id: norm(label), label, kind: "MUST" });
    }
    for (const r of wantRows) {
      const label = (r.criterion ?? "").trim();
      if (label) criteria.push({ id: norm(label), label, kind: "WANT", weight: asWeight(r.weight) });
    }
    const critById = new Map(criteria.map((c) => [c.id, c]));

    const optionMap = new Map<string, DecisionOption>();
    let unmatched = 0;
    for (const r of scoreRows) {
      const opt = (r.option ?? "").trim();
      const critKey = norm(r.criterion);
      if (!opt || !critKey) continue;
      const c = critById.get(critKey);
      if (!c) { unmatched++; continue; }
      if (!optionMap.has(opt)) optionMap.set(opt, { id: opt, label: opt, scores: {} });
      optionMap.get(opt)!.scores[c.id] = c.kind === "MUST" ? asBool(r.value) : asNum(r.value);
    }
    const options = [...optionMap.values()];
    const result = options.length && criteria.length ? analyzeDecision(criteria, options) : null;

    return (
      <section className="card p-6">
        <p className="eyebrow">KT karar motoru</p>
        <h2 className="text-lg font-semibold">Canlı karar hesabı (MUST/WANT)</h2>
        <p className="text-xs text-slate-400">
          Kriter ve puanları girdikçe eleme ile ağırlıklı skor anında hesaplanır; LLM değil, deterministik motor.
        </p>
        {!result ? (
          <p className="mt-4 text-sm text-slate-400">
            Önce “Zorunlu/İsteğe bağlı kriterler” ve “Alternatifleri Puanla” adımlarını doldurun.
          </p>
        ) : (
          <>
            {result.recommended ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Önerilen alternatif</p>
                <p className="mt-1 text-lg font-semibold">
                  {result.recommended.option.label}
                  <span className="text-emerald-600 dark:text-emerald-400"> · {Math.round(result.recommended.normalized * 100)}/100</span>
                </p>
                {result.close && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Karar kırılgan: ikinci sıradakiyle fark dar; seçileni riskleriyle ayrıca tartın.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20">
                Hiçbir alternatif tüm zorunlu (MUST) kriterleri karşılamıyor; kriterleri veya alternatifleri gözden geçirin.
              </p>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {result.ranked.map((e) => (
                <div
                  key={e.option.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm ${e.eliminated ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/10" : "border-slate-200 dark:border-slate-800"}`}
                >
                  <span className="font-medium">{e.option.label}</span>
                  {e.eliminated ? (
                    <span className="text-xs text-red-600 dark:text-red-400">Elendi · {e.failedMusts.join(", ")}</span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Ağırlıklı skor {Math.round(e.normalized * 100)}/100
                      {e.unverifiedMusts.length ? ` · doğrulanmamış: ${e.unverifiedMusts.join(", ")}` : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
              <p className="text-xs font-semibold text-slate-500">Gerekçe</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-600 dark:text-slate-400">
                {result.trace.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            {unmatched > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                {unmatched} puan satırı bir kriterle eşleşmedi — “Kriter” adını MUST/WANT tablolarındaki adla birebir yazın.
              </p>
            )}
          </>
        )}
      </section>
    );
  }
  return null;
}

function LinkedWorkPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const [findings, setFindings] = useState<
    {
      id: string;
      severity: string;
      title: string;
      detail: string;
      review: RedTeamReview | null;
    }[]
  >([]);
  const [previews, setPreviews] = useState<
    Record<
      string,
      {
        evidence: number;
        claims: number;
        actions: number;
        metrics: number;
        populatedSteps: string[];
      }
    >
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const options = nextMethodologies(workspace.methodology);
  useEffect(() => {
    fetch(`/api/workspace/${workspace.id}/red-team`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setFindings);
    Promise.all(
      options.map(async (o) => {
        const r = await fetch(
          `/api/workspace/${workspace.id}/transfer?methodology=${o.code}`,
        );
        return [o.code, r.ok ? await r.json() : null] as const;
      }),
    ).then((items) =>
      setPreviews(Object.fromEntries(items.filter((x) => x[1]))),
    );
  }, [workspace.id, workspace.updatedAt]);
  async function create(
    methodology: Methodology,
    reason: string,
    relation: "COMPLEMENTARY" | "HORIZONTAL_DEPLOYMENT" = "COMPLEMENTARY",
  ) {
    setBusy(methodology);
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceWorkspaceId: workspace.id,
        methodology,
        problemDescription: workspace.problemDescription,
        reason,
        relation,
      }),
    });
    const data = await res.json();
    if (res.ok) window.location.assign(`/workspace/${data.id}`);
    else setBusy(null);
  }
  function review(findingId: string, patch: Partial<RedTeamReview>) {
    const current = workspace.redTeamReviews.find(
      (r) => r.findingId === findingId,
    ) ?? {
      findingId,
      status: "OPEN" as const,
      comment: "",
      evidenceIds: [],
      updatedAt: new Date().toISOString(),
    };
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    onChange({
      redTeamReviews: [
        ...workspace.redTeamReviews.filter((r) => r.findingId !== findingId),
        next,
      ],
    });
    setFindings((items) =>
      items.map((f) => (f.id === findingId ? { ...f, review: next } : f)),
    );
  }
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="card p-6">
        <p className="eyebrow">Metodoloji zinciri</p>
        <h2 className="text-lg font-semibold">
          Sonraki çalışma gerçekten başlasın
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Bağlı çalışma problem, kanıt, doğrulanmış neden, aksiyon ve
          metriklerle hazır açılır.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {options.map((o) => {
            const p = previews[o.code];
            return (
              <button
                key={o.code}
                disabled={busy !== null}
                onClick={() => create(o.code, o.reason)}
                className="rounded-xl border border-slate-200 p-3 text-left text-sm hover:border-indigo-300 dark:border-slate-800"
              >
                <strong>{METHODOLOGY_META[o.code].shortName}</strong>
                <span className="ml-2 text-xs text-slate-500">{o.reason}</span>
                {p && (
                  <span className="mt-2 block text-[11px] text-emerald-600">
                    Aktarılacak: {p.evidence} kanıt · {p.claims} iddia ·{" "}
                    {p.actions} aksiyon · {p.populatedSteps.length} hazır adım
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {workspace.links.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            {workspace.links.map((l) => (
              <Link
                key={l.id}
                href={`/workspace/${l.targetWorkspaceId}`}
                className="block py-1 text-indigo-600"
              >
                {l.relation} → {METHODOLOGY_META[l.methodology].shortName}
              </Link>
            ))}
          </div>
        )}
        <button
          disabled={busy !== null}
          onClick={() =>
            create(
              workspace.methodology,
              "Benzer proses/ekipmanda yatay yayılım kontrolü",
              "HORIZONTAL_DEPLOYMENT",
            )
          }
          className="btn btn-secondary mt-3"
        >
          Yatay yayılım kontrolü aç
        </button>
      </div>
      <div className="card p-6">
        <p className="eyebrow">Kırmızı takım</p>
        <h2 className="text-lg font-semibold">Analize itirazlar</h2>
        <p className="mt-1 text-xs text-slate-400">
          Kritik itiraz kabul edilip açık bırakılırsa kapanış engellenir.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {findings.map((f) => (
            <div
              key={f.id}
              className={`rounded-xl p-3 text-sm ${f.severity === "HIGH" ? "bg-red-50 text-red-700 dark:bg-red-950/30" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30"}`}
            >
              <strong>{f.title}</strong>
              <p className="mt-1 text-xs opacity-80">{f.detail}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <select
                  className="field text-xs"
                  value={f.review?.status ?? "OPEN"}
                  onChange={(e) =>
                    review(f.id, {
                      status: e.target.value as RedTeamReview["status"],
                    })
                  }
                >
                  <option value="OPEN">Açık</option>
                  <option value="ACCEPTED">Kabul edildi · düzeltilecek</option>
                  <option value="REJECTED_WITH_EVIDENCE">
                    Kanıtla reddedildi
                  </option>
                  <option value="IRRELEVANT">İlgisiz</option>
                  <option value="RESOLVED">Çözüldü</option>
                </select>
                <input
                  className="field text-xs"
                  value={f.review?.comment ?? ""}
                  onChange={(e) => review(f.id, { comment: e.target.value })}
                  placeholder="Karar açıklaması"
                />
              </div>
              {f.review?.status === "REJECTED_WITH_EVIDENCE" && (
                <select
                  multiple
                  className="field mt-2 h-16 text-xs"
                  value={f.review.evidenceIds}
                  onChange={(e) =>
                    review(f.id, {
                      evidenceIds: [...e.target.selectedOptions].map(
                        (o) => o.value,
                      ),
                    })
                  }
                >
                  {workspace.evidence.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
          {findings.length === 0 && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30">
              Açık deterministik itiraz yok.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function IntelligencePanel({
  workspace,
  dirty,
  ensureSaved,
  onChange,
  onFresh,
}: {
  workspace: WsData;
  dirty: boolean;
  ensureSaved: () => Promise<boolean>;
  onChange: (patch: Partial<WsData>) => void;
  onFresh: (ws: WsData) => void;
}) {
  const [intel, setIntel] = useState<Intelligence | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [claimText, setClaimText] = useState("");
  const refresh = async () => {
    const res = await fetch(`/api/workspace/${workspace.id}/intelligence`);
    if (res.ok) setIntel(await res.json());
  };
  useEffect(() => {
    let active = true;
    fetch(`/api/workspace/${workspace.id}/intelligence`).then(async (res) => {
      if (res.ok && active) setIntel(await res.json());
    });
    return () => {
      active = false;
    };
  }, [workspace.id, workspace.updatedAt]);
  const addEvidence = () => {
    if (!evidenceTitle.trim()) return;
    const item: EvidenceItem = {
      id: crypto.randomUUID(),
      title: evidenceTitle.trim(),
      source: "",
      finding: "",
      recordedAt: new Date().toISOString(),
    };
    onChange({ evidence: [...workspace.evidence, item] });
    setEvidenceTitle("");
  };
  const addClaim = () => {
    if (!claimText.trim()) return;
    const item: ClaimItem = {
      id: crypto.randomUUID(),
      statement: claimText.trim(),
      kind: "ROOT_CAUSE",
      status: "CLAIMED",
      evidenceIds: [],
    };
    onChange({ claims: [...workspace.claims, item] });
    setClaimText("");
  };
  async function lifecycle(
    operation: "CLOSE" | "MONITOR",
    result?: "PASSED" | "FAILED",
  ) {
    setBusy(true);
    setError(null);
    try {
      if (dirty && !(await ensureSaved()))
        throw new Error("Önce çalışma kaydedilemedi.");
      const res = await fetch(`/api/workspace/${workspace.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "İşlem başarısız.");
      onFresh(data);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }
  async function openRecurrence(similarId: string, description: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWorkspaceId: similarId,
          methodology: workspace.methodology,
          problemDescription: workspace.problemDescription,
          reason: `Tekrar vaka: ${workspace.problemDescription}`,
          relation: "RECURRENCE",
          targetDescription: workspace.problemDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tekrar vakası açılamadı.");
      window.location.assign(`/workspace/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
      setBusy(false);
    }
  }
  const monitoring: MonitoringPlan = workspace.monitoring ?? {
    metric: "",
    trigger: "",
    reviewDate: null,
    owner: "",
    result: "PENDING",
  };
  return (
    <section className="card card-accent-emerald p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Doğrulama omurgası</p>
          <h2 className="text-lg font-semibold">
            Kanıt → Kök neden → Etkili aksiyon → İzleme
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Formun dolması kapanış değildir; kritik iddialar ve aksiyon
            sonuçları doğrulanır.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
          {workspace.closureStatus}
        </span>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Saha kanıtları</h3>
          <div className="mt-2 flex gap-2">
            <input
              className="field"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              placeholder="Örn. vardiya ölçüm raporu"
            />
            <button className="btn btn-secondary" onClick={addEvidence}>
              Ekle
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {workspace.evidence.map((e, i) => (
              <div
                key={e.id}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <input
                  className="field"
                  value={e.title}
                  onChange={(x) =>
                    onChange({
                      evidence: workspace.evidence.map((v, j) =>
                        j === i ? { ...v, title: x.target.value } : v,
                      ),
                    })
                  }
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    className="field text-xs"
                    value={e.source}
                    placeholder="Kaynak"
                    onChange={(x) =>
                      onChange({
                        evidence: workspace.evidence.map((v, j) =>
                          j === i ? { ...v, source: x.target.value } : v,
                        ),
                      })
                    }
                  />
                  <input
                    className="field text-xs"
                    value={e.finding}
                    placeholder="Bulgu"
                    onChange={(x) =>
                      onChange({
                        evidence: workspace.evidence.map((v, j) =>
                          j === i ? { ...v, finding: x.target.value } : v,
                        ),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Doğrulanabilir iddialar</h3>
          <div className="mt-2 flex gap-2">
            <input
              className="field"
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="Doğrulanmış kök neden iddiası"
            />
            <button className="btn btn-secondary" onClick={addClaim}>
              Ekle
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {workspace.claims.map((c, i) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <input
                  className="field"
                  value={c.statement}
                  onChange={(x) =>
                    onChange({
                      claims: workspace.claims.map((v, j) =>
                        j === i ? { ...v, statement: x.target.value } : v,
                      ),
                    })
                  }
                />
                <div className="mt-2 flex gap-2">
                  <select
                    className="field field-sm"
                    value={c.status}
                    onChange={(x) =>
                      onChange({
                        claims: workspace.claims.map((v, j) =>
                          j === i
                            ? {
                                ...v,
                                status: x.target.value as ClaimItem["status"],
                              }
                            : v,
                        ),
                      })
                    }
                  >
                    <option value="CLAIMED">İddia</option>
                    <option value="VERIFIED">Doğrulandı</option>
                    <option value="REJECTED">Elendi</option>
                  </select>
                  <select
                    multiple
                    className="field h-16 text-xs"
                    value={c.evidenceIds}
                    onChange={(x) =>
                      onChange({
                        claims: workspace.claims.map((v, j) =>
                          j === i
                            ? {
                                ...v,
                                evidenceIds: [...x.target.selectedOptions].map(
                                  (o) => o.value,
                                ),
                              }
                            : v,
                        ),
                      })
                    }
                  >
                    {workspace.evidence.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className="field mt-2 text-xs"
                  value={c.counterfactual ?? ""}
                  placeholder="Karşı-olgu: neden kaldırıldığında ne oldu?"
                  onChange={(x) =>
                    onChange({
                      claims: workspace.claims.map((v, j) =>
                        j === i ? { ...v, counterfactual: x.target.value } : v,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold">Kapanış sonrası erken uyarı</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <input
            className="field"
            value={monitoring.metric}
            placeholder="İzlenecek metrik"
            onChange={(e) =>
              onChange({
                monitoring: { ...monitoring, metric: e.target.value },
              })
            }
          />
          <input
            className="field"
            value={monitoring.trigger}
            placeholder="Yeniden açma eşiği"
            onChange={(e) =>
              onChange({
                monitoring: { ...monitoring, trigger: e.target.value },
              })
            }
          />
          <input
            className="field"
            type="date"
            value={monitoring.reviewDate ?? ""}
            onChange={(e) =>
              onChange({
                monitoring: {
                  ...monitoring,
                  reviewDate: e.target.value || null,
                },
              })
            }
          />
          <input
            className="field"
            value={monitoring.owner}
            placeholder="Süreç sahibi"
            onChange={(e) =>
              onChange({ monitoring: { ...monitoring, owner: e.target.value } })
            }
          />
        </div>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold">Kapanış jürisi</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {workspace.approvals.map((a: Approval, i) => (
            <div key={a.role} className="flex gap-2">
              <input
                className="field"
                value={a.name}
                placeholder={
                  a.role === "QUALITY" ? "Kalite onaylayanı" : "Süreç sahibi"
                }
                onChange={(e) =>
                  onChange({
                    approvals: workspace.approvals.map((v, j) =>
                      j === i ? { ...v, name: e.target.value } : v,
                    ),
                  })
                }
              />
              <select
                className="field field-sm"
                value={a.status}
                onChange={(e) =>
                  onChange({
                    approvals: workspace.approvals.map((v, j) =>
                      j === i
                        ? {
                            ...v,
                            status: e.target.value as Approval["status"],
                            decidedAt: new Date().toISOString(),
                          }
                        : v,
                    ),
                  })
                }
              >
                <option value="PENDING">Bekliyor</option>
                <option value="APPROVED">Onay</option>
                <option value="REJECTED">Ret</option>
              </select>
            </div>
          ))}
        </div>
      </div>
      {intel && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Kapanış kapıları</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {intel.checks.map((c) => (
                <li
                  key={c.key}
                  className={`rounded-lg px-3 py-2 text-xs ${c.passed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30"}`}
                >
                  {c.passed ? "✓" : "○"} {c.label} · {c.detail}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Benzer Problem DNA’sı</h3>
            <div className="mt-2 flex flex-col gap-1.5">
              {intel.similar.map((s) => (
                <div
                  className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900"
                  key={s.id}
                >
                  <Link
                    className="hover:text-indigo-600"
                    href={`/workspace/${s.id}`}
                  >
                    %{Math.round(s.score * 100)} · {s.problemDescription}
                  </Link>
                  <button
                    disabled={busy}
                    onClick={() => openRecurrence(s.id, s.problemDescription)}
                    className="ml-2 font-medium text-red-600 hover:underline"
                  >
                    Tekrar vakası olarak aç
                  </button>
                </div>
              ))}
              {intel.similar.length === 0 && (
                <p className="text-xs text-slate-400">
                  Henüz anlamlı benzer vaka yok.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          disabled={
            busy || !intel?.canClose || workspace.closureStatus === "CLOSED"
          }
          onClick={() => lifecycle("CLOSE")}
          className="btn btn-success"
        >
          İzlemeye al ve kapanışa hazırla
        </button>
        {workspace.closureStatus === "MONITORING" && (
          <>
            <button
              disabled={busy}
              onClick={() => lifecycle("MONITOR", "PASSED")}
              className="btn btn-primary"
            >
              İzleme başarılı · Kapat
            </button>
            <button
              disabled={busy}
              onClick={() => lifecycle("MONITOR", "FAILED")}
              className="btn btn-secondary"
            >
              Problem tekrar etti · Yeniden aç
            </button>
          </>
        )}
        {error && <p className="self-center text-xs text-red-600">{error}</p>}
      </div>
    </section>
  );
}

function ReportSection({
  workspaceId,
  report,
  doneCount,
  total,
  dirty,
  ensureSaved,
  onReport,
}: {
  workspaceId: string;
  report: string | null;
  doneCount: number;
  total: number;
  dirty: boolean;
  ensureSaved: () => Promise<boolean>;
  onReport: (ws: WsData) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      if (dirty && !(await ensureSaved()))
        throw new Error("Rapor öncesi kaydetme başarısız.");
      const res = await fetch(`/api/workspace/${workspaceId}/report`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rapor üretilemedi.");
      onReport(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Hata.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-accent-indigo p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">📄 Uygulama Raporu</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Doldurduğun adımlardan profesyonel bir kapanış/durum raporu üretir
            {doneCount < total
              ? ` (şu an ${doneCount}/${total} adım tamam — ara durum raporu da alabilirsin)`
              : ""}
            .
          </p>
        </div>
        <div className="flex gap-2">
          {report && (
            <Link
              href={`/workspace/${workspaceId}/rapor`}
              className="btn btn-secondary"
            >
              🖨 Yazdır / PDF
            </Link>
          )}
          <button
            onClick={generate}
            disabled={busy}
            className="btn btn-primary"
          >
            {busy
              ? "Rapor üretiliyor…"
              : report
                ? "Raporu yenile"
                : "Rapor oluştur"}
          </button>
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      {report && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
          <Markdown>{report}</Markdown>
        </div>
      )}
    </section>
  );
}

// ── AI Rehber (soru-cevap) ───────────────────────────────────────

async function askGuide(
  methodology: string,
  question: string,
  problem: string,
) {
  const res = await fetch("/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      methodology,
      question,
      problemDescription: problem,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Rehber yanıt vermedi.");
  return data.answer as string;
}

function GuidePanel({
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
      setErr(e instanceof Error ? e.message : "Hata.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-accent-emerald p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          🤖
        </span>
        <h2 className="text-lg font-semibold">AI Rehber</h2>
      </div>
      <p className="mb-3 mt-1 text-xs text-slate-400">
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
            <div className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
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
          className="btn btn-success shrink-0"
        >
          {busy ? "…" : "Sor"}
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </section>
  );
}
