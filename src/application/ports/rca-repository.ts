// RCA çalışma alanı PORTU. Metodoloji uygulama modülü (Faz 5).
// Karar mantığı değil, yapılandırılmış çalışma alanı (5 Why + Balık kılçığı + aksiyon).

export type FishboneCategory =
  | "MAN"
  | "MACHINE"
  | "METHOD"
  | "MATERIAL"
  | "MEASUREMENT"
  | "ENVIRONMENT";

export const FISHBONE_CATEGORIES: { key: FishboneCategory; label: string }[] = [
  { key: "MAN", label: "İnsan" },
  { key: "MACHINE", label: "Makine" },
  { key: "METHOD", label: "Metot" },
  { key: "MATERIAL", label: "Malzeme" },
  { key: "MEASUREMENT", label: "Ölçüm" },
  { key: "ENVIRONMENT", label: "Çevre" },
];

export type ActionStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "EFFECTIVENESS_DUE"
  | "EFFECTIVE"
  | "INEFFECTIVE"
  | "DONE";

export interface WhyStep {
  statement: string;
  isRootCause: boolean;
}
export interface FishboneItem {
  category: FishboneCategory;
  cause: string;
}
export interface ActionItem {
  id?: string;
  action: string;
  owner: string | null;
  status: ActionStatus;
  dueDate?: string | null;
  targetCauseId?: string | null;
  successMetric?: string;
  baseline?: string;
  target?: string;
  actual?: string;
  verificationDueDate?: string | null;
  evidenceIds?: string[];
}

export interface RcaWorkspace {
  id: string;
  conversationId: string | null;
  problemDescription: string;
  whySteps: WhyStep[];
  fishbone: FishboneItem[];
  actions: ActionItem[];
  createdAt: string;
  updatedAt: string;
}

export type RcaPatch = Partial<
  Pick<RcaWorkspace, "whySteps" | "fishbone" | "actions" | "problemDescription">
>;

export interface IRcaRepository {
  create(seed: { conversationId?: string | null; problemDescription: string }): Promise<RcaWorkspace>;
  get(id: string): Promise<RcaWorkspace | null>;
  update(id: string, patch: RcaPatch): Promise<RcaWorkspace | null>;
}
