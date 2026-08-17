import "client-only";

import type { MethodologyWorkspace } from "@/application/ports/methodology-workspace-repository";
import { METHODOLOGY_META, type Methodology } from "@/domain/diagnosis";
import { emptyStepState, getPlaybook } from "@/domain/playbook";
import { problemDNA } from "@/domain/workspace-intelligence";
import { EMPTY_FIELD_PILOT, EMPTY_SELECTION_CONTEXT } from "@/domain/field-readiness";

export function createGuestWorkspace(input: {
  conversationId: string | null;
  methodology: Methodology;
  problemDescription: string;
  recommendedMethodology?: Methodology;
  diagnosisRationale?: string;
}): MethodologyWorkspace {
  const now = new Date().toISOString();
  const id = `local_ws_${crypto.randomUUID()}`;
  const meta = METHODOLOGY_META[input.methodology];
  const playbook = getPlaybook(input.methodology);
  return {
    id,
    conversationId: input.conversationId,
    methodology: input.methodology,
    methodologyName: meta.name,
    problemDescription: input.problemDescription,
    whenToUse: meta.description,
    tools: [],
    steps: playbook.steps.map(emptyStepState),
    actions: [], report: null, evidence: [], claims: [], metrics: [], links: [],
    approvals: [
      { role: "QUALITY", name: "", status: "PENDING", comment: "" },
      { role: "PROCESS_OWNER", name: "", status: "PENDING", comment: "" },
    ],
    monitoring: null, closureStatus: "OPEN", closedAt: null, reopenCount: 0,
    dna: problemDNA(input.problemDescription), specialty: {}, redTeamReviews: [],
    horizontalTargets: [], attachments: [],
    auditTrail: [{ id: `audit_${crypto.randomUUID()}`, type: "CREATED", summary: "Yerel çalışma alanı oluşturuldu", changedFields: [], occurredAt: now }],
    systemDocuments: [], containmentControls: [],
    learningDecision: { summary: "", decision: "PENDING", documentIds: [], rationale: "", owner: "", approvedBy: "", decidedAt: null },
    weakSignals: [], dailyManagement: [], kaizenExperiments: [], oplLessons: [], controlBurden: [],
    contextContract: { purpose: "", scope: "", outOfScope: "", successMetric: "", methodRole: "", pivotCondition: "", misuseRisk: "", undesiredBehavior: "", owner: "", approvedBy: "" },
    systemBehaviorAnalyses: [], qmsHealth: [], gembaBehaviorMap: [], benchmarkReferences: [],
    capacityScenarios: [], sopScenarios: [], lineBalanceStudies: [], advancedAnalyses: [],
    recommendationFeedback: { decision: "PENDING", recommendedMethodology: input.recommendedMethodology ?? input.methodology, selectedMethodology: input.methodology, reason: input.diagnosisRationale?.trim() ?? "", reviewedAt: null, outcome: "PENDING", outcomeNote: "", outcomeAt: null },
    methodSelectionContext: { ...EMPTY_SELECTION_CONTEXT },
    fieldPilot: { ...EMPTY_FIELD_PILOT }, externalSystemLinks: [],
    createdAt: now, updatedAt: now,
  };
}
