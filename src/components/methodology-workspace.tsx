"use client";

// Metodoloji Çalışma Alanı — playbook tabanlı profesyonel yürütme.
// Sol: adım haritası (ilerleme). Sağ: aktif adımın yapılandırılmış formu
// (gerçek 8D/FMEA/KT formları gibi), adım başına AI taslağı ve rehber.
// Altta: aksiyon takibi, profesyonel rapor ve AI rehber paneli.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { StepState, emptyStepState, fieldFilled, getPlaybook, stepIsComplete } from "@/domain/playbook";
import { BASIC_WORKSPACE_TABS, normalizeWorkspace, WORKSPACE_TAB_GROUPS, WORKSPACE_TABS, type WorkspaceTab, type WorkspaceTabGroup } from "@/components/workspace/workspace-view-model";
import { loadWorkspace, saveWorkspace } from "@/components/workspace/workspace-api";
import { ProactiveOperationsPanel } from "@/components/workspace/panels/proactive-operations-panel";
import { DecisionLabsIntro, DecisionLabsPanel } from "@/components/workspace/panels/decision-labs-panel";
import { OrganizationContextPanel } from "@/components/workspace/panels/organization-context-panel";
import { AdvancedAnalysisPanel } from "@/components/workspace/panels/advanced-analysis-panel";
import { AuditTimeline, CalibrationPanel, DataQualityPanel, FieldRealityPanel, ValidationFlow, WorkspaceOverview } from "@/components/workspace/panels/overview-panel";
import { WorkspaceSectionGuide } from "@/components/workspace/panels/section-guide";
import { ContainmentPanel, SystemDocumentsPanel } from "@/components/workspace/panels/documents-panel";
import { LearningDecisionPanel, LearningRecordPanel } from "@/components/workspace/panels/learning-panel";
import { StepBadge, StepEditor } from "@/components/workspace/panels/step-editor";
import { Actions } from "@/components/workspace/panels/actions-panel";
import { AttachmentPanel } from "@/components/workspace/panels/attachment-panel";
import { HorizontalDeploymentPanel, LinkedWorkPanel } from "@/components/workspace/panels/linked-work-panel";
import { SpecialtyPanel } from "@/components/workspace/panels/specialty-panel";
import { IntelligencePanel } from "@/components/workspace/panels/intelligence-panel";
import { ReportSection } from "@/components/workspace/panels/report-section";
import { GuidePanel } from "@/components/workspace/panels/guide-panel";
import { Shell, StatusPill } from "@/components/workspace/panel-kit";
import { LocalStorageNotice } from "@/components/local-storage-notice";
import { exportGuestWorkspace, isGuestWorkspaceId } from "@/lib/guest-storage";
import { Markdown } from "@/components/markdown";
import { friendlyStepName } from "@/components/workspace/terminology";
import { generateWorkspaceReport, officialReportBlockers } from "@/domain/workspace-report";


export function MethodologyWorkspace({ id, aiEnabled = true }: { id: string; aiEnabled?: boolean }) {
  const localMode = isGuestWorkspaceId(id);
  const [ws, setWs] = useState<WsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState(0);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [activeGroup, setActiveGroup] = useState<WorkspaceTabGroup>("apply");
  const [viewMode, setViewMode] = useState<"basic" | "advanced">("basic");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const storedViewMode = window.localStorage.getItem("mdi-workspace-view-mode");
    if (storedViewMode === "advanced") window.setTimeout(() => setViewMode("advanced"), 0);
    const requested = new URLSearchParams(window.location.search).get(
      "tab",
    ) as WorkspaceTab | null;
    if (requested && WORKSPACE_TABS.some((tab) => tab.key === requested))
      window.setTimeout(() => navigateTab(requested), 0);
    loadWorkspace(id)
      .then((data: WsData) => {
        const normalized = normalizeWorkspace(data);
        setWs(normalized);
        // Kaldığı yerden devam: ilk tamamlanmamış adım
        const idx = normalized.steps.findIndex((s) => !stepIsComplete(s.status));
        setActive(idx === -1 ? normalized.steps.length - 1 : idx);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  function changeViewMode(next: "basic" | "advanced") {
    setViewMode(next);
    window.localStorage.setItem("mdi-workspace-view-mode", next);
    if (next === "basic" && !BASIC_WORKSPACE_TABS.includes(activeTab)) {
      navigateTab("overview");
    }
  }

  useEffect(() => {
    if (!dirty || !ws || saving) return;
    const timer = window.setTimeout(() => {
      void save(ws);
    }, 1200);
    return () => window.clearTimeout(timer);
  // `save` mevcut çalışma anlık görüntüsünü kullandığı için bağımlılığa
  // eklenmez; aksi durumda her render otomatik kayıt zamanlayıcısını yeniler.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, ws, saving]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  useEffect(() => {
    if (!dirty || !ws) return;
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") void save(ws);
    };
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => document.removeEventListener("visibilitychange", saveWhenHidden);
  // Yalnız değişen çalışma anlık görüntüsü için yeni dinleyici kurulur.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, ws]);

  const playbook = useMemo(
    () => (ws ? getPlaybook(ws.methodology) : null),
    [ws],
  );

  function mutate(patch: Partial<WsData>) {
    setWs((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }

  function navigateTab(tab: WorkspaceTab) {
    setActiveTab(tab);
    const group = WORKSPACE_TABS.find((item) => item.key === tab)?.group;
    if (group) setActiveGroup(group);
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
      setError(e instanceof Error ? e.message : "Çalışma kaydedilemedi. Değişiklikleriniz ekranda duruyor; bağlantı gelince yeniden deneyin.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function downloadLocalBackup() {
    const blob = await exportGuestWorkspace(id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mdi-yerel-${id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (error && !ws)
    return (
      <Shell>
        <p className="text-[var(--st-risk)]">{error}</p>
      </Shell>
    );
  if (!ws || !playbook)
    return (
      <Shell>
        <p className="text-[var(--muted)]">Yükleniyor…</p>
      </Shell>
    );

  const doneCount = ws.steps.filter((s) => stepIsComplete(s.status)).length;
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
            <p className="eyebrow">Çalışma Alanı</p>
            <h1 className="text-2xl font-bold tracking-tight">
              {ws.methodologyName}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {ws.problemDescription}
            </p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {playbook.intro}
            </p>
            {ws.tools.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ws.tools.map((t) => (
                  <span
                    key={t}
                    className="bg-[var(--surface-mark)] px-2.5 py-0.5 text-xs text-[var(--ink)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
            <Link
              href={localMode ? "/yerel-calismalar" : "/diagnoz"}
              className="text-xs text-[var(--muted-2)] hover:text-[var(--ink)] hover:underline"
            >
              {localMode ? "Yerel çalışmalarıma dön" : "Teşhise dön"}
            </Link>
            <div className="flex gap-1">
              {localMode ? <button type="button" className="btn btn-secondary" onClick={() => void downloadLocalBackup()}>Yerel yedek al</button> : <>
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
              </>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="meter-label mb-1.5">
            <span className="eyebrow">İlerleme</span>
            <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
              {doneCount}/{ws.steps.length} adım tamamlandı
            </span>
          </div>
          <div className="meter">
            <div
              className={`meter-fill ${doneCount === ws.steps.length ? "meter-fill-ok" : ""}`}
              style={{ width: `${(doneCount / Math.max(1, ws.steps.length)) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {localMode && <LocalStorageNotice compact />}

      {/* Yapışkan kontrol çubuğu: cam efekti (backdrop-blur + yarı saydam)
          yerine opak yüzey ve 1px çerçeve. Altındaki içerik bulanık bir sis
          değil, çizgiyle kesilmiş net bir sınır olarak okunur. */}
      {/* Yapışkan başlık her genişlikte 56px (min-h-14); çubuk ona yaslanır.
          Eskiden mobilde 105px'ten yapışıyordu — başlık 57px olduğu için
          arada 48px'lik bir bant kalıyor ve içerik oradan akıp geçiyordu. */}
      <div className="sticky top-14 z-10 -mx-1 border border-[var(--rule-strong)] bg-[var(--surface)] p-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusPill status={ws.closureStatus} />
            <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
              {doneCount}/{ws.steps.length} adım
            </span>
            <span
              className={`text-[11px] ${openActions ? "text-[var(--st-warn)]" : "text-[var(--muted-2)]"}`}
            >
              {openActions} açık aksiyon
            </span>
            <span
              className={`text-[11px] ${unverifiedClaims ? "text-[var(--st-warn)]" : "text-[var(--muted-2)]"}`}
            >
              {unverifiedClaims} doğrulanmamış iddia
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden border border-[var(--rule-strong)] sm:flex" aria-label="Çalışma alanı görünümü">
              <button
                type="button"
                onClick={() => changeViewMode("basic")}
                aria-pressed={viewMode === "basic"}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${viewMode ==="basic" ? "bg-[var(--ink)] text-[var(--on-ink)]" : "text-[var(--muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"}`}
              >
                Temel görünüm
              </button>
              <button
                type="button"
                onClick={() => changeViewMode("advanced")}
                aria-pressed={viewMode === "advanced"}
                className={`border-l border-[var(--rule-strong)] px-2.5 py-1 text-[11px] font-medium transition-colors ${viewMode ==="advanced" ? "bg-[var(--ink)] text-[var(--on-ink)]" : "text-[var(--muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"}`}
              >
                Gelişmiş araçlar
              </button>
            </div>
            <span
              className={`text-[11px] ${error ? "text-[var(--st-risk)]" : dirty ? "text-[var(--st-warn)]" : "text-[var(--muted-2)]"}`}
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
                      ? `${localMode ? "Bu tarayıcıya" : "Buluta"} kaydedildi · ${lastSavedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`
                      : localMode ? "Bu tarayıcıya kaydedildi" : "Buluta kaydedildi"}
            </span>
            <button
              onClick={() => save()}
              disabled={saving || !dirty}
              className="btn btn-primary"
              /* Çalışma zaten kendiliğinden kaydediliyor; bu düğme yalnız
                 beklemeden kaydetmek isteyen için. Adı bunu söylemeli, yoksa
                 "basmazsam kaybolur mu?" sorusunu doğuruyor. */
              title="Çalışma kendiliğinden kaydedilir; bu düğme beklemeden kaydeder"
            >
              {saving ? "Kaydediliyor…" : "Şimdi kaydet"}
            </button>
          </div>
        </div>
        <div className="mb-2 flex border border-[var(--rule-strong)] sm:hidden" aria-label="Çalışma alanı görünümü">
          <button
            type="button"
            onClick={() => changeViewMode("basic")}
            aria-pressed={viewMode === "basic"}
            className={`flex-1 px-3 py-2 text-[12px] font-medium ${viewMode ==="basic" ? "bg-[var(--ink)] text-[var(--on-ink)]" : "text-[var(--muted)]"}`}
          >
            Temel görünüm
          </button>
          <button
            type="button"
            onClick={() => changeViewMode("advanced")}
            aria-pressed={viewMode === "advanced"}
            className={`flex-1 border-l border-[var(--rule-strong)] px-3 py-2 text-[12px] font-medium ${viewMode ==="advanced" ? "bg-[var(--ink)] text-[var(--on-ink)]" : "text-[var(--muted)]"}`}
          >
            Gelişmiş araçlar
          </button>
        </div>
        {viewMode === "advanced" && <nav className="mb-1 flex flex-wrap gap-1 border-b border-[var(--rule-faint)] pb-2" aria-label="Çalışma alanı grupları">
          {WORKSPACE_TAB_GROUPS.map((group)=><button key={group.key} type="button" onClick={()=>{setActiveGroup(group.key);const first=WORKSPACE_TABS.find((tab)=>tab.group===group.key);if(first)setActiveTab(first.key)}} className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeGroup===group.key?"bg-[var(--ink)] text-[var(--on-ink)]":"text-[var(--muted)] hover:bg-[var(--surface-mark)]"}`}>{group.label}</button>)}
        </nav>}
        <nav
          className="scroll-fade flex gap-1 overflow-x-auto"
          aria-label="Çalışma alanı bölümleri"
          role="tablist"
        >
          {WORKSPACE_TABS.filter((tab)=>viewMode === "basic" ? BASIC_WORKSPACE_TABS.includes(tab.key) : tab.group===activeGroup).map((tab) => {
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
                onClick={() => navigateTab(tab.key)}
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
          onNavigate={navigateTab}
        />
      )}

      {/* Adım haritası + aktif adım */}
      {activeTab === "methodology" && (
        <>
          <div className="rounded-2xl border border-[var(--rule-strong)] bg-[var(--surface-mark)] px-4 py-3 text-sm text-[var(--ink)]">
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
                    stepIsComplete(ws.steps.find((x) => x.key === "d3")?.status);
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
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${ isActive ? "bg-[var(--surface-mark)] font-medium text-[var(--ink)]  "
                            : "text-[var(--ink-soft)] hover:bg-[var(--surface-mark)]"
                        }`}
                      >
                        <StepBadge
                          index={i}
                          status={st?.status ?? "PENDING"}
                          active={isActive}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block">{friendlyStepName(s.key, s.name)}</span>
                          <span className="mt-0.5 block text-[10px] font-normal text-[var(--muted-2)]">
                            {stepIsComplete(st?.status)
                              ? st?.status === "SKIPPED" ? "Gerekçeli atlandı" : "Doğrulandı"
                              : st?.status === "READY" ? "İncelemeye hazır"
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
              methodology={ws.methodology}
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
              localMode={localMode}
              aiEnabled={aiEnabled}
              prerequisiteMessage={(() => {
                const prerequisite = playbook.steps.slice(0, active).find((definition) =>
                  !stepIsComplete(ws.steps.find((item) => item.key === definition.key)?.status),
                );
                return prerequisite
                  ? `Bu adımı doğrulamadan önce “${friendlyStepName(prerequisite.key, prerequisite.name)}” adımını doğrulayın veya denetlenebilir bir gerekçeyle uygulanmadı olarak kapatın.`
                  : undefined;
              })()}
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
          <ValidationFlow workspace={ws} onNavigate={navigateTab} />
          <ContainmentPanel workspace={ws} onChange={mutate} />
          <IntelligencePanel
            workspace={ws}
            localMode={localMode}
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
            localMode={localMode}
            onFresh={(fresh) => {
              setWs(normalizeWorkspace(fresh));
              setDirty(false);
            }}
          />
          {localMode && <GuestFeatureNote title="Çok kullanıcılı onay" detail="Kanıtlarınız ve kapanış kararınız bu tarayıcıda saklanır. Başka kullanıcıların kimlik doğrulamalı onayı ve şirket portföyü denetimi, çalışma hesabınıza taşındıktan sonra etkinleşir." />}
        </>
      )}
      {activeTab === "deployment" && (
        <>
          <WorkspaceSectionGuide section="deployment" />
          {!localMode ? <><LinkedWorkPanel workspace={ws} onChange={mutate} /><HorizontalDeploymentPanel workspace={ws} onChange={mutate} /></> : <GuestFeatureNote title="Bağlı çalışmalar ve yatay yayılım" detail="Bu bölüm şirket portföyündeki diğer çalışmalarla güvenli bağlantı kurar. Yerel çalışmanızı hesabınıza taşıdıktan sonra kullanılabilir." />}
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
        localMode ? <LocalReportSection workspace={ws} onChange={mutate} /> : <ReportSection
          workspace={ws}
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

function GuestFeatureNote({ title, detail }: { title: string; detail: string }) {
  return <section className="card p-6"><p className="eyebrow">Bulut çalışma özelliği</p><h2 className="mt-1 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p><Link href="/kayit" className="btn btn-secondary mt-4">Üyelik seçeneklerini gör</Link></section>;
}

function LocalReportSection({ workspace, onChange }: { workspace: WsData; onChange: (patch: Partial<WsData>) => void }) {
  const blockers = officialReportBlockers(workspace);
  function generate() { onChange({ report: generateWorkspaceReport(workspace, "INTERIM") }); }
  return <section className="card card-accent-indigo p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Yerel ara rapor</p><h2 className="mt-1 text-[15px] font-semibold tracking-[-0.012em]">Uçtan uca çalışma raporu</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted)]">Yalnız dolu kayıtları rapora taşır; eksik kritik alanları ayrı bir açıklar listesinde gösterir. Önerilen yöntem, uygulanan yöntem ve zorunlu müşteri formatını birbirinden ayırır.</p></div><div className="flex gap-2">{workspace.report && <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Yazdır / PDF</button>}<button type="button" className="btn btn-primary" onClick={generate}>{workspace.report ? "Ara raporu güncelle" : "Ara rapor oluştur"}</button></div></div><div className="alert alert-warn mt-4 text-[11px]"><strong>Yerel çalışma resmî rapor üretemez.</strong> Kimlik doğrulamalı onay ve merkezi denetim izi için hesabınıza taşıyın.{blockers.length > 0 && <span> Ayrıca {blockers.length} kapanış koşulu açık.</span>}</div>{workspace.report && <div className="mt-5 rounded-xl bg-[var(--surface-sunk)] p-4"><Markdown>{workspace.report}</Markdown></div>}</section>;
}
