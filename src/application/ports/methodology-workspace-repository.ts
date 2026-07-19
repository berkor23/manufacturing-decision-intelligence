// Genel metodoloji çalışma alanı PORTU (Part C).
// Playbook tabanlı: her metodolojinin profesyonel adım şablonu domain'deki
// playbook'tan tohumlanır; burada yalnızca DURUM (doldurulan değerler) yaşar.

import { Methodology } from "@/domain/diagnosis";
import { StepState } from "@/domain/playbook";
import { ActionItem } from "./rca-repository";
import type { Approval, ClaimItem, ClosureStatus, ContainmentControl, EvidenceItem, HorizontalDeploymentTarget, LearningDecision, MonitoringPlan, ProblemDNA, RedTeamReview, SystemDocument, WorkspaceAttachment, WorkspaceAuditEvent, WorkspaceLink, WorkspaceMetric } from "@/domain/workspace-intelligence";
import type { ControlBurdenItem, DailyManagementRecord, KaizenExperiment, OplLesson, WeakSignal } from "@/domain/proactive-operations";
import type { ContextContract, GembaBehaviorItem, QmsHealthItem, SystemBehaviorAnalysis } from "@/domain/organization-context";
import type { BenchmarkReference, CapacityScenario, LineBalanceStudy, SopScenario } from "@/domain/decision-labs";
import type { AdvancedAnalysis } from "@/domain/advanced-analysis";
import type { RecommendationFeedback } from "@/domain/production-readiness";
import type { ExternalSystemLink, FieldPilot, MethodSelectionContext } from "@/domain/field-readiness";

/** Eski kayıtlarla uyumluluk için korunan serbest-not fazı. */
export interface WorkspacePhase {
  name: string;
  notes: string;
}

export interface MethodologyWorkspace {
  id: string;
  conversationId: string | null;
  methodology: Methodology;
  methodologyName: string;
  problemDescription: string;
  whenToUse: string;
  tools: string[];
  /** Playbook adımlarının doldurulmuş durumu. */
  steps: StepState[];
  actions: ActionItem[];
  /** Uygulama tamamlanınca üretilen profesyonel rapor. */
  report: string | null;
  evidence: EvidenceItem[];
  claims: ClaimItem[];
  metrics: WorkspaceMetric[];
  links: WorkspaceLink[];
  approvals: Approval[];
  monitoring: MonitoringPlan | null;
  closureStatus: ClosureStatus;
  closedAt: string | null;
  reopenCount: number;
  dna: ProblemDNA;
  specialty: Record<string, unknown>;
  redTeamReviews: RedTeamReview[];
  horizontalTargets: HorizontalDeploymentTarget[];
  attachments: WorkspaceAttachment[];
  auditTrail: WorkspaceAuditEvent[];
  systemDocuments: SystemDocument[];
  containmentControls: ContainmentControl[];
  learningDecision: LearningDecision;
  weakSignals: WeakSignal[];
  dailyManagement: DailyManagementRecord[];
  kaizenExperiments: KaizenExperiment[];
  oplLessons: OplLesson[];
  controlBurden: ControlBurdenItem[];
  contextContract: ContextContract;
  systemBehaviorAnalyses: SystemBehaviorAnalysis[];
  qmsHealth: QmsHealthItem[];
  gembaBehaviorMap: GembaBehaviorItem[];
  benchmarkReferences: BenchmarkReference[];
  capacityScenarios: CapacityScenario[];
  sopScenarios: SopScenario[];
  lineBalanceStudies: LineBalanceStudy[];
  advancedAnalyses: AdvancedAnalysis[];
  recommendationFeedback: RecommendationFeedback;
  methodSelectionContext: MethodSelectionContext;
  fieldPilot: FieldPilot;
  externalSystemLinks: ExternalSystemLink[];
  /** Eski (playbook öncesi) kayıtlar için; yeni kayıtlarda boş. */
  phases?: WorkspacePhase[];
  createdAt: string;
  updatedAt: string;
}

export type WorkspacePatch = Partial<Pick<MethodologyWorkspace,
  "steps" | "actions" | "report" | "evidence" | "claims" | "metrics" | "links" |
  "approvals" | "monitoring" | "closureStatus" | "closedAt" | "reopenCount" | "dna" | "specialty" | "redTeamReviews" | "horizontalTargets" | "attachments" | "auditTrail" | "systemDocuments" | "containmentControls" | "learningDecision" | "weakSignals" | "dailyManagement" | "kaizenExperiments" | "oplLessons" | "controlBurden" | "contextContract" | "systemBehaviorAnalyses" | "qmsHealth" | "gembaBehaviorMap" | "benchmarkReferences" | "capacityScenarios" | "sopScenarios" | "lineBalanceStudies" | "advancedAnalyses" | "recommendationFeedback" | "methodSelectionContext" | "fieldPilot" | "externalSystemLinks"
>>;

/** Liste ekranı için özet (tüm kaydı taşımaz). */
export interface WorkspaceSummary {
  id: string;
  methodology: Methodology;
  methodologyName: string;
  problemDescription: string;
  doneSteps: number;
  totalSteps: number;
  openActions: number;
  hasReport: boolean;
  closureStatus: ClosureStatus;
  effectivenessDue: number;
  unverifiedClaims: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMethodologyWorkspaceRepository {
  create(
    seed: Omit<MethodologyWorkspace, "id" | "createdAt" | "updatedAt">,
  ): Promise<MethodologyWorkspace>;
  get(id: string): Promise<MethodologyWorkspace | null>;
  update(id: string, patch: WorkspacePatch): Promise<MethodologyWorkspace | null>;
  /** En son güncellenen önce. */
  list(): Promise<MethodologyWorkspace[]>;
  delete(id: string): Promise<boolean>;
}
