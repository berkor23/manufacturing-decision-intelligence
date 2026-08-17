"use client";

// Genel bakış: doğrulama akışı, saha gerçekliği, veri kalitesi, kalibrasyon, denetim izi.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useState } from "react";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { METHODOLOGY_META, type Methodology } from "@/domain/diagnosis";
import type { WorkspaceTab } from "@/components/workspace/workspace-view-model";
import { friendlyStepName } from "@/components/workspace/terminology";
import { fieldQualityFindings } from "@/domain/field-readiness";
import { StatusPill } from "@/components/workspace/panel-kit";
import { ReadoutBand, type ReadoutTone } from "@/components/readout";
import { stepIsComplete } from "@/domain/playbook";

/**
 * Çalışma alanı özet göstergesinin tonu. Kanıt borcu risk, takip gerektiren
 * iş uyarı; ilerleme oranı ("3/6") nötr kalır — o bir sayaç değil, durum.
 */
function readoutTone(label: string): ReadoutTone {
  if (label === "Doğrulanmamış iddia") return "risk";
  if (label === "Açık aksiyon" || label === "Yayılım riski") return "warn";
  return "info";
}

export function ValidationFlow({
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
        <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
          Kanıt → Neden → Aksiyon → Sonuç
        </h2>
        <p className="mt-1 text-xs text-[var(--muted-2)]">
          Her halka bir sonrakini destekler; eksik halka kapanış güvenini
          düşürür.
        </p>
      </div>
      {/* Zincirin dört halkası: dolu renk blokları yerine 1px aralıklı hücreler.
          Hazır/eksik ayrımı sol çubuk ve küçük etiketle taşınır; sayı mono ve
          hizalı olduğu için halkalar arası karşılaştırma göz taramasıyla olur. */}
      <div className="mt-5 grid gap-px border-y border-[var(--rule-strong)] bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage, index) => (
          <button
            key={stage.label}
            type="button"
            onClick={() => onNavigate(stage.tab)}
            style={{ borderLeft: `3px solid ${stage.ready ? "var(--st-ok)" : "var(--st-warn)"}` }}
            className="bg-[var(--surface)] px-3 py-3.5 text-left transition-colors hover:bg-[var(--surface-sunk)]"
          >
            <p className="eyebrow">
              {String(index + 1).padStart(2, "0")} · {stage.label}
            </p>
            <p
              className="mt-1.5 font-mono text-[1.5rem] font-semibold leading-none tabular-nums"
              style={{ color: stage.value === 0 ? "var(--muted-2)" : "var(--ink)" }}
            >
              {stage.value}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted-2)]">
              {stage.detail}
            </p>
            <span className={`tag mt-2 ${stage.ready ? "state-ok" : "state-warn"}`}>
              {stage.ready ? "Bağ hazır" : "Tamamlanmalı"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function FieldRealityPanel({workspace,onChange}:{workspace:WsData;onChange:(patch:Partial<WsData>)=>void}){
  const context=workspace.methodSelectionContext;const pilot=workspace.fieldPilot;
  const setContext=(key:keyof typeof context,value:unknown)=>onChange({methodSelectionContext:{...context,[key]:value}});
  const setPilot=(key:keyof typeof pilot,value:unknown)=>onChange({fieldPilot:{...pilot,[key]:value}});
  const number=(value:string)=>value===""?null:Number(value);
  const addLink=()=>onChange({externalSystemLinks:[...workspace.externalSystemLinks,{id:`ext_${Date.now().toString(36)}`,system:"MES",externalId:"",url:"",ownership:"EXTERNAL_MASTER",syncStatus:"NOT_CONFIGURED",lastSyncedAt:null,notes:""}]});
  return <div className="space-y-5">
    <section className="card p-6"><p className="eyebrow">Gerçek dünya karar bağlamı</p><h2 className="section-heading mt-1">Teknik olarak doğru olan ile uygulanabilir olanı ayır</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Müşteri zorunluluğu, standart, ekip yetkinliği ve kaynak baskısı yöntemi değiştirebilir veya ikinci bir raporlama formatını zorunlu kılabilir. Bu alanlar teknik öneriyi silmez; uygulanabilir yürütme planını görünür yapar.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <input className="field" value={context.customerMandate} onChange={e=>setContext("customerMandate",e.target.value)} placeholder="Müşteri/OEM zorunluluğu (örn. 8D)"/><input className="field" value={context.regulatoryMandate} onChange={e=>setContext("regulatoryMandate",e.target.value)} placeholder="Standart veya regülasyon şartı"/><input className="field" value={context.requiredFormat} onChange={e=>setContext("requiredFormat",e.target.value)} placeholder="Zorunlu çıktı/rapor formatı"/><input className="field" value={context.existingCaseSystem} onChange={e=>setContext("existingCaseSystem",e.target.value)} placeholder="Mevcut SAP/MES/CAPA kayıt numarası"/>
      <select className="field" value={context.teamCompetence} onChange={e=>setContext("teamCompetence",e.target.value)}><option value="UNKNOWN">Ekip yetkinliği bilinmiyor</option><option value="LOW">Düşük yetkinlik</option><option value="MEDIUM">Orta yetkinlik</option><option value="HIGH">Yüksek yetkinlik</option></select><label className="field flex items-center gap-2 text-sm"><input type="checkbox" checked={context.facilitatorAvailable} onChange={e=>setContext("facilitatorAvailable",e.target.checked)}/>Metodoloji kolaylaştırıcısı mevcut</label>
      <input className="field" type="number" min="0" value={context.containmentHours??""} onChange={e=>setContext("containmentHours",number(e.target.value))} placeholder="İlk kontrol için saat"/><input className="field" type="number" min="0" value={context.resolutionDays??""} onChange={e=>setContext("resolutionDays",number(e.target.value))} placeholder="Kalıcı çözüm için gün"/><input className="field" type="number" min="0" value={context.availablePeople??""} onChange={e=>setContext("availablePeople",number(e.target.value))} placeholder="Ayrılabilen kişi sayısı"/><textarea className="field min-h-20" value={context.managementExpectation} onChange={e=>setContext("managementExpectation",e.target.value)} placeholder="Yönetim beklentisi ve zaman baskısı"/><textarea className="field min-h-20 md:col-span-2" value={context.resourceConstraint} onChange={e=>setContext("resourceConstraint",e.target.value)} placeholder="Kaynak, vardiya, erişim veya organizasyon kısıtları"/>
    </div></section>
    <section className="card p-6"><p className="eyebrow">Saha pilot protokolü</p><h2 className="section-heading mt-1">Gerçek kullanım etkisini ölç</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">“Sahada çalışıyor” iddiası ancak gerçek kullanıcı, gerçek sürtünme, başlangıç değeri ve izleme sonucu kaydedildiğinde kullanılmalıdır.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><select className="field" value={pilot.status} onChange={e=>setPilot("status",e.target.value)}><option value="NOT_PLANNED">Pilot planlanmadı</option><option value="PLANNED">Planlandı</option><option value="RUNNING">Sahada yürütülüyor</option><option value="COMPLETED">Tamamlandı</option><option value="ABORTED">Durduruldu</option></select><input className="field" value={pilot.site} onChange={e=>setPilot("site",e.target.value)} placeholder="Fabrika / tesis"/><input className="field" value={pilot.line} onChange={e=>setPilot("line",e.target.value)} placeholder="Hat / proses"/><input className="field" value={pilot.owner} onChange={e=>setPilot("owner",e.target.value)} placeholder="Pilot sahibi"/><input className="field md:col-span-2" value={pilot.participants} onChange={e=>setPilot("participants",e.target.value)} placeholder="Gerçek kullanıcılar ve rolleri"/>{(["baselineCycleHours","actualCycleHours","baselineRecurrenceRate","actualRecurrenceRate","observationDays","duplicateEntryMinutes"] as const).map((key,i)=><input key={key} className="field" type="number" min="0" value={pilot[key]??""} onChange={e=>setPilot(key,number(e.target.value))} placeholder={["Önceki çevrim süresi (saat)","Gerçek çevrim süresi (saat)","Önceki tekrar oranı (%)","Pilot tekrar oranı (%)","İzleme süresi (gün)","Çift veri girişi (dakika)"][i]}/>)}<textarea className="field min-h-24" value={pilot.frictionPoints} onChange={e=>setPilot("frictionPoints",e.target.value)} placeholder="Nerede zorlandılar?"/><textarea className="field min-h-24" value={pilot.workarounds} onChange={e=>setPilot("workarounds",e.target.value)} placeholder="Excel/WhatsApp veya atlatma yolları"/><textarea className="field min-h-24" value={pilot.userFeedback} onChange={e=>setPilot("userFeedback",e.target.value)} placeholder="Operatör ve mühendis geri bildirimi"/><select className="field" value={pilot.result} onChange={e=>setPilot("result",e.target.value)}><option value="PENDING">Sonuç bekleniyor</option><option value="POSITIVE">Olumlu</option><option value="MIXED">Karma</option><option value="NEGATIVE">Olumsuz</option></select></div></section>
    <section className="card p-6"><div className="section-toolbar"><div><p className="eyebrow">Kurumsal entegrasyon</p><h2 className="section-heading mt-1">Dış sistem referansları ve veri sahipliği</h2><p className="mt-1 text-xs text-[var(--muted)]">Aynı veriyi yeniden yazmak yerine SAP QM/PM, MES, CAPA veya veri ambarındaki ana kaydı bağlayın.</p></div><button type="button" className="btn btn-secondary" onClick={addLink}>+ Sistem bağlantısı</button></div><div className="record-list mt-4">{workspace.externalSystemLinks.map((link,index)=><div key={link.id} className="subtle-panel grid gap-2 md:grid-cols-3"><select className="field" value={link.system} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,system:e.target.value as typeof x.system}:x)})}>{["SAP_QM","SAP_PM","MES","QMS_CAPA","ERP","DATA_WAREHOUSE","OTHER"].map(x=><option key={x}>{x}</option>)}</select><input className="field" value={link.externalId} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,externalId:e.target.value}:x)})} placeholder="Dış kayıt numarası"/><input className="field" value={link.url} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,url:e.target.value}:x)})} placeholder="Kaynak sistem bağlantısı"/><select className="field" value={link.ownership} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,ownership:e.target.value as typeof x.ownership}:x)})}><option value="EXTERNAL_MASTER">Ana kayıt dış sistemde</option><option value="MDI_MASTER">Ana kayıt MDI’da</option><option value="SHARED">Ortak sahiplik</option></select><select className="field" value={link.syncStatus} onChange={e=>onChange({externalSystemLinks:workspace.externalSystemLinks.map((x,i)=>i===index?{...x,syncStatus:e.target.value as typeof x.syncStatus}:x)})}><option value="NOT_CONFIGURED">Bağlantı kurulmadı</option><option value="MANUAL">Manuel referans</option><option value="SYNCED">Senkronize</option><option value="ERROR">Senkronizasyon hatası</option></select><button type="button" className="text-right text-xs font-semibold text-[var(--st-risk)]" onClick={()=>onChange({externalSystemLinks:workspace.externalSystemLinks.filter((_,i)=>i!==index)})}>Kaydı kaldır</button></div>)}{!workspace.externalSystemLinks.length&&<p className="text-sm text-[var(--muted-2)]">Henüz dış sistem bağlantısı yok.</p>}</div></section>
  </div>
}

export function DataQualityPanel({workspace}:{workspace:WsData}){const findings=fieldQualityFindings(workspace);return <section className="card p-6"><p className="eyebrow">Atlatma ve veri kalitesi denetimi</p><h2 className="section-heading mt-1">Form doluluğu değil, karar dayanıklılığı</h2><p className="mt-2 text-xs text-[var(--muted)]">Engelleyici bulgular kapanışı durdurur; uyarılar gerekçe ve saha incelemesi ister.</p><div className="mt-4 space-y-2">{findings.map(item=><div key={item.key} className={`record-row text-sm ${item.severity==="BLOCKING"?"record-row-risk text-[var(--st-risk)]":"record-row-warn text-[var(--st-warn)]"}`}><strong>{item.severity==="BLOCKING"?"Engelleyici":"Uyarı"}: {item.title}</strong><p className="mt-1 text-xs">{item.detail}</p></div>)}{!findings.length&&<p className="alert alert-ok">Kritik veri kalitesi ihlali bulunmadı.</p>}</div></section>}

export function CalibrationPanel({
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
      <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
        Uzman kararı ile gerçek sonucu ayrı kaydet
      </h2>
      <p className="mt-1 text-xs text-[var(--muted-2)]">
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


export function WorkspaceOverview({
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
  const nextStep = workspace.steps.find((step) => !stepIsComplete(step.status));
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
        title: `${friendlyStepName(nextStep.key)} adımını ilerlet`,
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
      label: "Geçici koruma",
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
      <section className="card card-accent-indigo p-5 sm:p-6">
        <p className="eyebrow">Sıradaki en doğru iş</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.014em]">{next.title}</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {next.detail}
            </p>
          </div>
          <button
            onClick={() => onNavigate(next.tab)}
            className="btn btn-primary"
          >
            İlgili bölüme git
          </button>
        </div>
      </section>
      {/* Panodakiyle aynı ölçüm bandı: ayrı çerçeveli kartlar yerine 1px
          aralıklı hücreler. Sıfır olan sayaç susar, sorunlu olan renklenir. */}
      <ReadoutBand
        items={cards.map(([label, value, detail, tab]) => ({
          label: String(label),
          value: value as number | string,
          detail: String(detail),
          tone: readoutTone(String(label)),
          onClick: () => onNavigate(tab as WorkspaceTab),
        }))}
      />
      <details className="card p-6">
        <summary className="cursor-pointer">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
          <div>
            <p className="eyebrow">Kapanış hazırlığı</p>
            <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
              {gates.filter((gate) => gate.passed).length}/{gates.length} kapanış koşulu hazır
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-2)]">
              Çalışma ilerledikçe açın; eksik koşul sizi ilgili bölüme götürür.
            </p>
          </div>
          <StatusPill status={workspace.closureStatus} />
        </div>
        </summary>
        <div className="mt-4">
        <div className="meter mt-4">
          <div
            className="meter-fill"
            style={{
              width: `${(gates.filter((gate) => gate.passed).length / gates.length) * 100}%`,
            }}
          />
        </div>
        {/* Beş dolu renk bloğu yerine satır listesi: durum sağdaki küçük
            etiketten okunur, satırın kendisi nötr kalır. */}
        <ul className="mt-4 border-t border-[var(--rule-strong)]">
          {gates.map((gate) => (
            <li key={gate.label} className="border-b border-[var(--rule)]">
              <button
                type="button"
                onClick={() => onNavigate(gate.tab)}
                className="flex w-full items-center justify-between gap-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-sunk)]"
              >
                <span className="min-w-0">
                  <strong className="block text-[13px] font-medium">{gate.label}</strong>
                  <span className="mt-0.5 block text-[11px] text-[var(--muted-2)]">
                    {gate.detail}
                  </span>
                </span>
                <span className={`tag shrink-0 ${gate.passed ? "state-ok" : "state-warn"}`}>
                  {gate.passed ? "Hazır" : "Eksik"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        </div>
      </details>
    </div>
  );
}


export function AuditTimeline({ workspace }: { workspace: WsData }) {
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
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">Çalışma zaman çizelgesi</h2>
          <p className="mt-1 text-xs text-[var(--muted-2)]">
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
      <ol className="record-list mt-4">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex gap-3 border-l-2 border-[var(--rule-strong)] pl-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm">{event.summary}</strong>
                <span className="bg-[var(--surface-mark)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  {labels[event.type]}
                </span>
              </div>
              {event.changedFields.length > 0 && (
                <p className="mt-1 text-xs text-[var(--muted-2)]">
                  Alanlar: {event.changedFields.join(", ")}
                </p>
              )}
            </div>
            <time
              className="shrink-0 text-xs text-[var(--muted-2)]"
              dateTime={event.occurredAt}
            >
              {new Date(event.occurredAt).toLocaleString("tr-TR")}
            </time>
          </li>
        ))}
        {events.length === 0 && (
          <li className="text-sm text-[var(--muted-2)]">
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
