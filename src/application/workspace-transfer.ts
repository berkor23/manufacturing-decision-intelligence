import type { MethodologyWorkspace } from "./ports/methodology-workspace-repository";
import type { Methodology } from "@/domain/diagnosis";
import type { StepState, TableRow } from "@/domain/playbook";
import { scoreFmea } from "@/domain/manufacturing-analytics";

export interface TransferSummary { evidence: number; claims: number; actions: number; metrics: number; populatedSteps: string[] }
export interface TransferResult { steps: StepState[]; evidence: MethodologyWorkspace["evidence"]; claims: MethodologyWorkspace["claims"]; actions: MethodologyWorkspace["actions"]; metrics: MethodologyWorkspace["metrics"]; attachments: MethodologyWorkspace["attachments"]; specialty: Record<string, unknown>; summary: TransferSummary }

const step = (steps: StepState[], key: string) => steps.find((s) => s.key === key);
const setText = (steps: StepState[], stepKey: string, field: string, value: string) => {
  if (!value.trim()) return; const target = step(steps, stepKey); if (!target) return;
  target.values[field] = value; if (target.status === "PENDING") target.status = "IN_PROGRESS";
};
const setRows = (steps: StepState[], stepKey: string, field: string, rows: TableRow[]) => {
  if (!rows.length) return; const target = step(steps, stepKey); if (!target) return;
  target.values[field] = rows; if (target.status === "PENDING") target.status = "IN_PROGRESS";
};

export function transferWorkspace(source: MethodologyWorkspace, target: MethodologyWorkspace): TransferResult {
  const steps = structuredClone(target.steps);
  const verifiedRoots = source.claims.filter((c) => c.kind === "ROOT_CAUSE" && c.status === "VERIFIED").map((c) => c.statement);
  const actionRows = source.actions.map((a) => ({ rootCause: verifiedRoots.join("; "), action: a.action, owner: a.owner ?? "", due: a.dueDate ?? "", status: a.status }));
  setGeneric(source, target.methodology, steps, verifiedRoots, actionRows);
  if (source.methodology === "FMEA" && target.methodology === "POKA_YOKE") fmeaToPoka(source, steps);
  if (source.methodology === "FMEA" && target.methodology === "SPC") fmeaToSpc(source, steps);
  if (source.methodology === "POKA_YOKE" && target.methodology === "FMEA") pokaToFmea(source, steps);

  const evidence = source.evidence.map((e) => ({ ...e }));
  const claims = source.claims.map((c) => ({ ...c, evidenceIds: [...c.evidenceIds] }));
  const actions = source.actions.map((a, i) => ({ ...a, id: `act_transfer_${Date.now().toString(36)}_${i}`, evidenceIds: [...(a.evidenceIds ?? [])] }));
  const metrics = source.metrics.map((m) => ({ ...m, id: `metric_transfer_${Date.now().toString(36)}_${m.id}` }));
  const attachments = source.attachments.map((a)=>({...a,id:`att_link_${target.id}_${a.id}`}));
  const populatedSteps = steps.filter((s) => s.status !== "PENDING").map((s) => s.key);
  return { steps, evidence, claims, actions, metrics, attachments, specialty: { ...target.specialty, transferredFrom: source.id, transferredMethodology: source.methodology, transferredAt: new Date().toISOString() }, summary: { evidence: evidence.length, claims: claims.length, actions: actions.length, metrics: metrics.length, populatedSteps } };
}

function setGeneric(source: MethodologyWorkspace, methodology: Methodology, steps: StepState[], roots: string[], actions: TableRow[]) {
  if (methodology === "EIGHT_D") {
    setText(steps, "d2", "what", source.problemDescription); setText(steps, "d2", "statement", source.problemDescription);
    setText(steps, "d4", "occurrenceRoot", roots.join("\n")); setRows(steps, "d5", "correctiveActions", actions);
  } else if (methodology === "RCA") {
    setText(steps, "define", "statement", source.problemDescription); setText(steps, "rootcause", "rootCause", roots.join("\n"));
    setRows(steps, "prevent", "actions", actions.map((a)=>({action:a.action,owner:a.owner,due:a.due,status:a.status})));
  } else if (methodology === "PDCA_A3") {
    setText(steps, "background", "background", source.problemDescription); setRows(steps, "plan", "countermeasures", actions.map((a)=>({cause:a.rootCause,countermeasure:a.action,owner:a.owner,due:a.due,status:a.status})));
  }
}

function fmeaRows(source: MethodologyWorkspace): TableRow[] {
  return (step(source.steps, "analysis")?.values.fmeaTable ?? []) as TableRow[];
}
function topFmea(source: MethodologyWorkspace): TableRow | null {
  return [...fmeaRows(source)].sort((a,b)=>scoreFmea(b.s,b.o,b.d).rpn-scoreFmea(a.s,a.o,a.d).rpn)[0] ?? null;
}
function fmeaToPoka(source: MethodologyWorkspace, steps: StepState[]) {
  const row = topFmea(source); if (!row) return;
  setText(steps, "analyze", "errorPoint", row.step ?? ""); setText(steps, "analyze", "defectPoint", row.failureMode ?? "");
  setText(steps, "analyze", "observation", `Etki: ${row.effect ?? ""}\nÖnleyici kontrol: ${row.preventionControl ?? row.control ?? ""}\nTespit kontrolü: ${row.detectionControl ?? ""}`);
  setRows(steps, "modes", "errorModes", [{ mode: row.failureMode ?? "", condition: row.cause ?? "", frequency: `O=${row.o ?? ""}, S=${row.s ?? ""}` }]);
}
function fmeaToSpc(source: MethodologyWorkspace, steps: StepState[]) {
  const row = topFmea(source); if (!row) return;
  setText(steps, "characteristic", "characteristic", `${row.step ?? ""} — ${row.failureMode ?? ""}`);
  setText(steps, "characteristic", "point", `Tespit kontrolü: ${row.detectionControl ?? row.control ?? ""}`);
}
function pokaToFmea(source: MethodologyWorkspace, steps: StepState[]) {
  const analyze = step(source.steps, "analyze"); const verify = step(source.steps, "verify");
  setRows(steps, "analysis", "fmeaTable", [{ step: String(analyze?.values.errorPoint ?? ""), riskSource: "Poka-Yoke çalışması", scenario: "", failureMode: String(analyze?.values.defectPoint ?? ""), effect: "", s: "", cause: String(analyze?.values.observation ?? ""), o: "", preventionControl: String(verify?.values.standard ?? ""), detectionControl: "", controlEvidence: String(verify?.values.test ?? ""), d: "", rpn: "" }]);
  setRows(steps, "reassess", "livingTriggers", [{ trigger: "Poka-Yoke veya hata modu değişikliği", owner: "", reviewRule: `Doğrulama: ${String(verify?.values.test ?? "")}`, lastReview: "" }]);
}
