export type WeakSignalStatus = "NEW" | "TRIAGED" | "VERIFYING" | "DISMISSED" | "WATCHING" | "CASE_OPENED";
export type WeakSignalType = "HUMAN_OBSERVATION" | "PROCESS_MEASUREMENT" | "MICRO_STOP" | "TEMPORARY_INTERVENTION" | "REMEASUREMENT" | "SORTING" | "WIP" | "SCHEDULE_CHANGE" | "OVERTIME" | "MAINTENANCE_DEFERRAL" | "PSYCHOLOGICAL_SAFETY";
export interface WeakSignal { id:string; type:WeakSignalType; description:string; source:string; detectedAt:string; status:WeakSignalStatus; hypothesis:string; verificationTask:string; owner:string; dueDate:string|null; evidenceIds:string[]; linkedWorkspaceId:string|null }

export type DailyTier = "TIER_1" | "TIER_2" | "TIER_3";
export interface DailyManagementRecord { id:string; date:string; tier:DailyTier; area:string; safety:string; quality:string; delivery:string; cost:string; people:string; yesterdayDeviation:string; todayRisk:string; action:string; owner:string; escalation:"NONE"|"NEXT_TIER"|"CASE_OPENED"; gembaTask:string; shiftHandover:string; linkedWorkspaceId:string|null }

export interface KaizenExperiment { id:string; idea:string; owner:string; risk:"LOW"|"MEDIUM"|"HIGH"; status:"IDEA"|"RISK_REVIEW"|"EXPERIMENT"|"MEASURED"|"STANDARDIZED"|"YOKOTEN"|"ESCALATED"; hypothesis:string; measure:string; baseline:string; result:string; standardDocumentId:string|null; yokotenScope:string; escalationMethod:"PDCA_A3"|"DMAIC"|"FMEA"|null }

export interface OplLesson { id:string; type:"BASIC"|"IMPROVEMENT"|"SAFETY"; title:string; objective:string; correctVisual:string; wrongVisual:string; limit:string; mediaUrl:string; station:string; revision:string; reviewDate:string|null; linkedDocumentIds:string[]; quizQuestion:string; quizAnswer:string; trainee:string; competency:"PENDING"|"PASSED"|"FAILED" }

export interface ControlBurdenItem { id:string; controlPoint:string; type:"PREVENTION"|"DETECTION"|"SORTING"; frequency:string; cost:string; escapeRisk:string; falseAcceptReject:string; temporary:boolean; sourcePreventionQuestion:string; preventionAlternative:string; removalCriteria:string; status:"ACTIVE"|"REDUCE"|"REMOVE_READY"|"REMOVED" }

const SIGNAL_TRANSITIONS: Record<WeakSignalStatus, WeakSignalStatus[]> = {
  NEW:["TRIAGED"], TRIAGED:["VERIFYING","DISMISSED","WATCHING","CASE_OPENED"], VERIFYING:["DISMISSED","WATCHING","CASE_OPENED"], DISMISSED:[], WATCHING:["VERIFYING","CASE_OPENED","DISMISSED"], CASE_OPENED:[],
};
export function canTransitionSignal(from:WeakSignalStatus,to:WeakSignalStatus) { return SIGNAL_TRANSITIONS[from].includes(to); }
export function signalReadyForDecision(signal:WeakSignal) { return Boolean(signal.hypothesis.trim() && signal.verificationTask.trim() && signal.owner.trim()); }
export function kaizenNeedsEscalation(item:KaizenExperiment) { return item.risk === "HIGH" || item.escalationMethod !== null; }
export function oplCompetencyReady(item:OplLesson) { return Boolean(item.objective.trim() && item.limit.trim() && item.quizQuestion.trim() && item.quizAnswer.trim() && item.trainee.trim()); }
export function controlBurdenSummary(items:ControlBurdenItem[]) { return { total:items.length, temporary:items.filter(x=>x.temporary&&x.status!=="REMOVED").length, sourcePreventionMissing:items.filter(x=>x.status!=="REMOVED"&&!x.sourcePreventionQuestion.trim()).length, removalReady:items.filter(x=>x.status==="REMOVE_READY").length }; }
