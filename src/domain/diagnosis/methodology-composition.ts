import type { Methodology, MethodologyRole } from "./methodologies";
import { METHODOLOGY_META, METHODOLOGY_ROLES } from "./methodologies";
import type { MethodologyConfidence } from "./confidence-engine";

export type MethodPlanLayer =
  | "PRIMARY"
  | "COORDINATION"
  | "ANALYSIS"
  | "DESIGN"
  | "IMPROVEMENT"
  | "COUNTERMEASURE"
  | "RISK"
  | "CONTROL"
  | "OPERATING_SYSTEM";

export interface MethodPlanItem {
  layer: MethodPlanLayer;
  layerLabel: string;
  methodology: Methodology;
  methodologyRole: MethodologyRole;
  roleLabel: string;
  score: number;
  confidence: number;
  reason: string;
}

export interface MethodologyPlan {
  primary: MethodPlanItem;
  supporting: MethodPlanItem[];
}

const LAYER_BY_ROLE: Record<MethodologyRole, Exclude<MethodPlanLayer, "PRIMARY">> = {
  GOVERNANCE: "COORDINATION",
  ANALYSIS: "ANALYSIS",
  IMPROVEMENT: "IMPROVEMENT",
  RISK: "RISK",
  DESIGN: "DESIGN",
  COUNTERMEASURE: "COUNTERMEASURE",
  CONTROL: "CONTROL",
  OPERATING_SYSTEM: "OPERATING_SYSTEM",
};

const LAYER_LABELS: Record<MethodPlanLayer, string> = {
  PRIMARY: "Ana çalışma omurgası",
  COORDINATION: "Yönetim ve koordinasyon",
  ANALYSIS: "Problem / neden analizi",
  DESIGN: "Yeni çözüm tasarımı",
  IMPROVEMENT: "İyileştirme yöntemi",
  COUNTERMEASURE: "Karşı önlem tasarımı",
  RISK: "Risk değerlendirmesi",
  CONTROL: "Kontrol ve izleme",
  OPERATING_SYSTEM: "İşletim ve standartlaştırma",
};

function item(
  candidate: MethodologyConfidence,
  layer: MethodPlanLayer,
): MethodPlanItem {
  const role = METHODOLOGY_ROLES[candidate.methodology];
  return {
    layer,
    layerLabel: LAYER_LABELS[layer],
    methodology: candidate.methodology,
    methodologyRole: role.role,
    roleLabel: role.label,
    score: candidate.score,
    confidence: candidate.confidence,
    reason: METHODOLOGY_META[candidate.methodology].description,
  };
}

/**
 * Göreli sıralamayı tek reçete olmaktan çıkarıp rol bazlı uygulama mimarisine
 * dönüştürür. Her destek katmanına yalnız pozitif kanıt taşıyan en güçlü yöntem
 * alınır; böylece sıfır skorlu yöntemler sırf katalogda bulunduğu için önerilmez.
 */
export function composeMethodologyPlan(
  ranking: MethodologyConfidence[],
): MethodologyPlan {
  if (ranking.length === 0) throw new Error("Metodoloji sıralaması boş olamaz.");

  const primaryCandidate = ranking[0];
  const primary = item(primaryCandidate, "PRIMARY");
  const bestByLayer = new Map<Exclude<MethodPlanLayer, "PRIMARY">, MethodologyConfidence>();

  for (const candidate of ranking) {
    if (candidate.methodology === primaryCandidate.methodology || candidate.score <= 0) continue;
    const layer = LAYER_BY_ROLE[METHODOLOGY_ROLES[candidate.methodology].role];
    if (!bestByLayer.has(layer)) bestByLayer.set(layer, candidate);
  }

  const order: Exclude<MethodPlanLayer, "PRIMARY">[] = [
    "COORDINATION",
    "ANALYSIS",
    "DESIGN",
    "IMPROVEMENT",
    "COUNTERMEASURE",
    "RISK",
    "CONTROL",
    "OPERATING_SYSTEM",
  ];
  const supporting = order
    .map((layer) => {
      const candidate = bestByLayer.get(layer);
      return candidate ? item(candidate, layer) : null;
    })
    .filter((entry): entry is MethodPlanItem => entry !== null);

  return { primary, supporting };
}
