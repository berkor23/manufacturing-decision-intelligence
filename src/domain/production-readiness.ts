import type {Methodology} from "./diagnosis";
export interface RecommendationFeedback {decision:"PENDING"|"ACCEPTED"|"REJECTED"|"OVERRIDDEN";recommendedMethodology:Methodology;selectedMethodology:Methodology;reason:string;reviewedAt:string|null;outcome:"PENDING"|"SUCCESS"|"PARTIAL"|"FAILED";outcomeNote:string;outcomeAt:string|null}
export type UnifiedTaskKind="INFORMATION"|"ACTION"|"CONTAINMENT"|"WEAK_SIGNAL"|"QMS"|"MONITORING"|"OPL";
export interface UnifiedTask {id:string;workspaceId:string;workspaceTitle:string;kind:UnifiedTaskKind;title:string;owner:string;dueDate:string|null;status:"OPEN"|"DUE_SOON"|"OVERDUE"|"DONE";href:string}
export function taskTemporalStatus(done:boolean,dueDate:string|null,now=new Date()):UnifiedTask["status"]{if(done)return"DONE";if(!dueDate)return"OPEN";const days=(Date.parse(dueDate)-now.getTime())/86400000;return days<0?"OVERDUE":days<=3?"DUE_SOON":"OPEN"}
