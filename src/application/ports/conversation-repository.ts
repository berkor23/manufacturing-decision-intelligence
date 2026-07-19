// Conversation persistence PORTU. Somut uygulamalar infrastructure/persistence altında
// (in-memory: şimdi çalışır; prisma: Postgres bağlanınca).

import {
  StructuredProblem,
  DiagnosticFeatureKey,
  Methodology,
  DecisionTrace,
  MethodologyConfidence,
  MethodologyPlan,
  StabilizationGate,
} from "@/domain/diagnosis";

export type ConversationStatus = "ACTIVE" | "CONCLUDED" | "ABANDONED";
export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";
export type MessageKind = "FREE_TEXT" | "QUESTION" | "ANSWER" | "REPORT";

export interface ConversationMessage {
  role: MessageRole;
  kind: MessageKind;
  content: string;
  featureKey?: DiagnosticFeatureKey | null;
  createdAt: string; // ISO
}

export interface DiagnosisResultRecord {
  methodology: Methodology;
  confidence: number;
  ranking: MethodologyConfidence[];
  trace: DecisionTrace;
  evidenceStatus: "PROVISIONAL" | "CONFIRMED";
  methodPlan: MethodologyPlan;
  stabilization: StabilizationGate;
}

export interface InformationTask {
  id: string;
  featureKey: DiagnosticFeatureKey;
  question: string;
  status: "OPEN" | "RESOLVED";
  owner: string | null;
  dueDate: string | null;
  answer: string | null;
  createdAt: string;
  resolvedAt: string | null;
  previousMethodology: Methodology | null;
  resultingMethodology: Methodology | null;
}

export interface RecommendationChange {
  taskId: string;
  from: Methodology;
  to: Methodology;
  changedAt: string;
}

export interface Conversation {
  id: string;
  status: ConversationStatus;
  structuredProblem: StructuredProblem;
  /** Sorulan soru sayısı (durma politikası için). */
  questionsAsked: number;
  /** Sorulmuş ama yanıtı belirsiz kalan alanlar — tekrar sorulmaz. */
  askedFeatures: DiagnosticFeatureKey[];
  /** Yanıt bekleyen sorunun hedef alanı (null: bekleyen soru yok). */
  pendingFeature: DiagnosticFeatureKey | null;
  messages: ConversationMessage[];
  result: DiagnosisResultRecord | null;
  informationTasks: InformationTask[];
  recommendationChanges: RecommendationChange[];
  createdAt: string;
  updatedAt: string;
}

export interface IConversationRepository {
  create(seed: Pick<Conversation, "structuredProblem"> & {
    messages?: ConversationMessage[];
  }): Promise<Conversation>;
  get(id: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<Conversation>;
}
