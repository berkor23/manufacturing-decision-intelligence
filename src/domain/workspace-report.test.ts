import { describe, expect, it } from "vitest";
import type { MethodologyWorkspace } from "@/application/ports/methodology-workspace-repository";
import { METHODOLOGIES, METHODOLOGY_META, type Methodology } from "./diagnosis";
import { emptyStepState, getPlaybook } from "./playbook";
import { generateWorkspaceReport, officialReportBlockers } from "./workspace-report";

function workspace(methodology: Methodology): MethodologyWorkspace {
  return {
    methodology,
    methodologyName: METHODOLOGY_META[methodology].name,
    problemDescription: "Hat 2 kaynak prosesinde tekrar eden çatlak oranı arttı.",
    steps: getPlaybook(methodology).steps.map(emptyStepState),
    actions: [], metrics: [], evidence: [], claims: [], approvals: [
      { role: "QUALITY", name: "Kalite sorumlusu", status: "PENDING", comment: "" },
      { role: "PROCESS_OWNER", name: "Proses sahibi", status: "PENDING", comment: "" },
    ],
    closureStatus: "OPEN", monitoring: null,
    recommendationFeedback: { decision: "ACCEPTED", recommendedMethodology: methodology, selectedMethodology: methodology, reason: "Uzman incelemesiyle uygun bulundu.", reviewedAt: null, outcome: "PENDING", outcomeNote: "", outcomeAt: null },
    methodSelectionContext: { customerMandate: "", regulatoryMandate: "", existingCaseSystem: "SAP QM", requiredFormat: "Müşteri 8D formu", teamCompetence: "MEDIUM", facilitatorAvailable: true, containmentHours: 24, resolutionDays: 10, availablePeople: 3, managementExpectation: "", resourceConstraint: "" },
    fieldPilot: { status: "NOT_PLANNED", site: "", line: "", owner: "", participants: "", startedAt: null, completedAt: null, baselineCycleHours: null, actualCycleHours: null, baselineRecurrenceRate: null, actualRecurrenceRate: null, observationDays: null, duplicateEntryMinutes: null, frictionPoints: "", userFeedback: "", workarounds: "", result: "PENDING" },
  } as unknown as MethodologyWorkspace;
}

describe("workspace raporu", () => {
  it("15 metodolojinin tamamında ara rapor üretir ve üç yöntem bağlamını ayırır", () => {
    for (const methodology of METHODOLOGIES) {
      const ws = workspace(methodology);
      const playbook = getPlaybook(methodology);
      ws.steps = ws.steps.map((state, stepIndex) => {
        const definition = playbook.steps[stepIndex];
        const values = { ...state.values };
        for (const field of definition.fields) values[field.key] = field.type === "text" || field.type === "textarea"
          ? `Bu alan ${methodology} uygulama testinde somut saha bilgisiyle dolduruldu.`
          : [Object.fromEntries((field.columns ?? []).map((column) => [column.key, `${column.label} test değeri`]))];
        return { ...state, status: "VERIFIED" as const, values };
      });
      const report = generateWorkspaceReport(ws, "INTERIM");
      expect(report).toContain("Uygulama Raporu — Ara durum");
      expect(report).toContain("Teşhis motorunun önerdiği yöntem");
      expect(report).toContain("Sahada uygulanan yöntem");
      expect(report).toContain("Müşteri 8D formu");
      expect(report).toContain(playbook.steps[0].fields[0].label);
    }
  });

  it.each(["DMAIC", "EIGHT_D", "KT_DECISION", "TOC"] as const)("%s raporu yönteme özel tüm uygulama alanlarını aktarır", (methodology) => {
    const ws = workspace(methodology);
    const playbook = getPlaybook(methodology);
    ws.steps = ws.steps.map((state, index) => ({ ...state, status: "VERIFIED", values: Object.fromEntries(playbook.steps[index].fields.map((field) => [field.key, field.type === "text" || field.type === "textarea" ? `Doğrulanmış ${field.label} saha sonucu ve karar kaydı.` : [Object.fromEntries((field.columns ?? []).map((column) => [column.key, `${column.label} doğrulandı`]))]])) }));
    const report = generateWorkspaceReport(ws, "INTERIM");
    for (const field of playbook.steps.flatMap((step) => step.fields)) expect(report).toContain(field.label);
  });

  it("resmî raporu kapanış ve onaylar tamamlanmadan engeller", () => {
    const ws = workspace("EIGHT_D");
    expect(officialReportBlockers(ws).length).toBeGreaterThan(0);
    expect(() => generateWorkspaceReport(ws, "OFFICIAL")).toThrow("Resmî rapor henüz üretilemez");
  });

  it("doğrulanmış adımlar, kapalı yaşam döngüsü ve imzalı onaylarla resmî rapor üretir", () => {
    const ws = workspace("PDCA_A3");
    ws.steps = ws.steps.map((step) => ({ ...step, status: "SKIPPED", values: { ...step.values, __completionJustification: "Bu adımın güvencesi onaylı kurumsal kayıtla sağlandı." } }));
    ws.closureStatus = "CLOSED";
    ws.approvals = ws.approvals.map((approval) => ({ ...approval, status: "APPROVED" }));
    expect(officialReportBlockers(ws)).toEqual([]);
    expect(generateWorkspaceReport(ws, "OFFICIAL")).toContain("RESMÎ / kapanış kapıları tamamlandı");
  });
});
