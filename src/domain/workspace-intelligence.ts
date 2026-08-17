import type { Methodology } from "./diagnosis";
import type { MethodologyWorkspace } from "@/application/ports/methodology-workspace-repository";
import { fieldQualityFindings } from "./field-readiness";
import { stepIsComplete } from "./playbook";

export type ClaimStatus = "CLAIMED" | "VERIFIED" | "REJECTED";
export type ClosureStatus = "OPEN" | "CLOSURE_CANDIDATE" | "MONITORING" | "CLOSED" | "REOPENED";

export interface EvidenceItem {
  id: string;
  title: string;
  source: string;
  finding: string;
  stepKey?: string | null;
  claimId?: string | null;
  recordedAt: string;
}

export interface ClaimItem {
  id: string;
  statement: string;
  kind: "HYPOTHESIS" | "ROOT_CAUSE" | "CONCLUSION";
  status: ClaimStatus;
  stepKey?: string | null;
  evidenceIds: string[];
  counterfactual?: string;
}

export interface WorkspaceMetric {
  id: string;
  name: string;
  baseline: string;
  target: string;
  actual: string;
  direction: "LOWER" | "HIGHER" | "RANGE";
  observedAt?: string | null;
}

export interface WorkspaceLink {
  id: string;
  targetWorkspaceId: string;
  methodology: Methodology;
  relation: "COMPLEMENTARY" | "FOLLOW_UP" | "RECURRENCE" | "HORIZONTAL_DEPLOYMENT";
  reason: string;
}

export interface Approval {
  role: "QUALITY" | "PROCESS_OWNER" | "CUSTOMER_REP";
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment: string;
  decidedAt?: string | null;
}

export interface MonitoringPlan {
  metric: string;
  trigger: string;
  reviewDate: string | null;
  owner: string;
  result: "PENDING" | "PASSED" | "FAILED";
}

export interface ProblemDNA {
  tokens: string[];
  process: string | null;
  defect: string | null;
}

export interface RedTeamReview {
  findingId: string;
  status: "OPEN" | "ACCEPTED" | "REJECTED_WITH_EVIDENCE" | "IRRELEVANT" | "RESOLVED";
  comment: string;
  evidenceIds: string[];
  updatedAt: string;
}

export interface HorizontalDeploymentTarget {
  id: string;
  name: string;
  kind: "PROCESS" | "MACHINE" | "LINE" | "LOCATION" | "SUPPLIER";
  status: "PENDING" | "CLEAR" | "RISK_FOUND";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  owner: string | null;
  dueDate: string | null;
  finding: string;
  evidenceIds: string[];
  childWorkspaceId: string | null;
}

export interface WorkspaceAttachment {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  targetType: "WORKSPACE" | "EVIDENCE" | "CLAIM" | "ACTION" | "STEP";
  targetId: string | null;
  description: string;
  uploadedAt: string;
}

export interface WorkspaceAuditEvent {
  id: string;
  type: "CREATED" | "UPDATED" | "AI_DRAFT" | "REPORT" | "ATTACHMENT" | "LINKED" | "LIFECYCLE";
  summary: string;
  changedFields: string[];
  occurredAt: string;
}

export type SystemDocumentType = "STANDARD_WORK" | "CONTROL_PLAN" | "PFMEA" | "DFMEA" | "MAINTENANCE_PLAN" | "INSPECTION_INSTRUCTION" | "OPL" | "COMPETENCY_RECORD";
export interface SystemDocument {
  id: string;
  type: SystemDocumentType;
  title: string;
  revision: string;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "SUPERSEDED";
  owner: string;
  approver: string;
  effectiveDate: string | null;
  changeSummary: string;
  evidenceIds: string[];
  relatedWorkspaceId: string;
}

export interface ContainmentControl {
  id: string;
  purpose: string;
  scope: string;
  startedAt: string;
  owner: string;
  effectivenessMetric: string;
  currentResult: string;
  costOrBurden: string;
  removalCriteria: string;
  status: "ACTIVE" | "VERIFYING" | "REMOVED" | "TRANSFERRED";
  removalApprovedBy: string;
  removedAt: string | null;
  permanentActionId: string | null;
  evidenceIds: string[];
}

export interface LearningDecision {
  summary: string;
  decision: "PENDING" | "DOCUMENT_UPDATED" | "NO_UPDATE_REQUIRED";
  documentIds: string[];
  rationale: string;
  owner: string;
  approvedBy: string;
  decidedAt: string | null;
}

export interface ClosureCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export function problemDNA(description: string): ProblemDNA {
  const stop = new Set(["bir", "ve", "ile", "icin", "olan", "var", "yok", "gibi", "bu", "da", "de"]);
  const tokens = description
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9çğıöşü\s-]/gi, " ")
    .split(/\s+/)
    .filter((x) => x.length > 2 && !stop.has(x));
  return { tokens: [...new Set(tokens)].slice(0, 20), process: null, defect: null };
}

export function dnaSimilarity(a: ProblemDNA, b: ProblemDNA): number {
  const left = new Set(a.tokens);
  const right = new Set(b.tokens);
  const intersection = [...left].filter((x) => right.has(x)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

export function closureChecks(ws: MethodologyWorkspace): ClosureCheck[] {
  const evidence = ws.evidence ?? [];
  const claims = ws.claims ?? [];
  const actions = ws.actions ?? [];
  const approvals = ws.approvals ?? [];
  const criticalClaims = claims.filter((c) => c.kind !== "HYPOTHESIS");
  const effective = actions.filter((a) => a.status === "EFFECTIVE" || a.status === "DONE");
  const containment = ws.containmentControls ?? [];
  const activeContainment = containment.filter((item) => item.status === "ACTIVE" || item.status === "VERIFYING");
  const learning = ws.learningDecision;
  const learningPassed = learning?.decision === "DOCUMENT_UPDATED"
    ? learning.documentIds.length > 0 && learning.documentIds.every((id) => (ws.systemDocuments ?? []).some((doc) => doc.id === id && doc.status === "APPROVED"))
    : learning?.decision === "NO_UPDATE_REQUIRED" && Boolean(learning.rationale.trim() && learning.approvedBy.trim());
  const blockingQuality = fieldQualityFindings(ws).filter((item) => item.severity === "BLOCKING");
  return [
    { key: "steps", label: "Tüm metodoloji adımları doğrulandı veya gerekçeli atlandı", passed: ws.steps.every((s) => stepIsComplete(s.status)), detail: `${ws.steps.filter((s) => stepIsComplete(s.status)).length}/${ws.steps.length}` },
    { key: "evidence", label: "Kritik iddialar kanıtla doğrulandı", passed: criticalClaims.length > 0 && criticalClaims.every((c) => c.status === "VERIFIED" && c.evidenceIds.length > 0), detail: `${criticalClaims.filter((c) => c.status === "VERIFIED").length}/${criticalClaims.length}` },
    { key: "actions", label: "Kritik aksiyonların etkinliği doğrulandı", passed: actions.length > 0 && effective.length === actions.length, detail: `${effective.length}/${actions.length}` },
    { key: "monitoring", label: "Erken uyarı ve izleme planı tanımlandı", passed: Boolean(ws.monitoring?.metric && ws.monitoring?.trigger && ws.monitoring?.reviewDate), detail: ws.monitoring?.reviewDate ?? "Tarih yok" },
    { key: "approvals", label: "Kapanış onayları tamamlandı", passed: approvals.length > 0 && approvals.every((a) => a.status === "APPROVED"), detail: `${approvals.filter((a) => a.status === "APPROVED").length}/${approvals.length}` },
    { key: "evidence-count", label: "En az bir saha kanıtı kaydedildi", passed: evidence.length > 0, detail: `${evidence.length} kanıt` },
    { key: "red-team", label: "Kırmızı takım itirazları kapatıldı", passed: (ws.redTeamReviews ?? []).every((r) => !["OPEN","ACCEPTED"].includes(r.status)), detail: `${(ws.redTeamReviews ?? []).filter(r=>!["OPEN","ACCEPTED"].includes(r.status)).length}/${(ws.redTeamReviews ?? []).length}` },
    { key: "horizontal", label: "Yatay yayılım hedefleri değerlendirildi", passed: (ws.horizontalTargets ?? []).length > 0 && (ws.horizontalTargets ?? []).every((t) => t.status === "CLEAR" || (t.status === "RISK_FOUND" && Boolean(t.childWorkspaceId))), detail: `${(ws.horizontalTargets ?? []).filter(t=>t.status === "CLEAR" || Boolean(t.childWorkspaceId)).length}/${(ws.horizontalTargets ?? []).length}` },
    { key: "containment", label: "Geçici kontroller kaldırıldı veya devredildi", passed: activeContainment.length === 0, detail: containment.length ? `${containment.length - activeContainment.length}/${containment.length}` : "Containment yok" },
    { key: "learning-output", label: "Öğrenim gerçek sistem çıktısına bağlandı", passed: Boolean(learningPassed), detail: learning?.decision ?? "Karar bekleniyor" },
    { key: "data-quality", label: "Kritik veri kalitesi ihlali bulunmuyor", passed: blockingQuality.length === 0, detail: blockingQuality.length ? blockingQuality.map((item)=>item.title).join(", ") : "Engelleyici bulgu yok" },
  ];
}

export function canClose(ws: MethodologyWorkspace): boolean {
  return closureChecks(ws).every((c) => c.passed);
}
