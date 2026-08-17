import type {MethodologyWorkspace} from "@/application/ports/methodology-workspace-repository";
import {getGuestWorkspace,isGuestWorkspaceId,saveGuestWorkspace} from "@/lib/guest-storage";
export function workspacePatch(data:MethodologyWorkspace){return {steps:data.steps,actions:data.actions,evidence:data.evidence,claims:data.claims,metrics:data.metrics,links:data.links,approvals:data.approvals,monitoring:data.monitoring?.result==="PENDING"?data.monitoring:null,specialty:data.specialty,redTeamReviews:data.redTeamReviews,horizontalTargets:data.horizontalTargets,systemDocuments:data.systemDocuments,containmentControls:data.containmentControls,learningDecision:data.learningDecision,weakSignals:data.weakSignals,dailyManagement:data.dailyManagement,kaizenExperiments:data.kaizenExperiments,oplLessons:data.oplLessons,controlBurden:data.controlBurden,contextContract:data.contextContract,systemBehaviorAnalyses:data.systemBehaviorAnalyses,qmsHealth:data.qmsHealth,gembaBehaviorMap:data.gembaBehaviorMap,benchmarkReferences:data.benchmarkReferences,capacityScenarios:data.capacityScenarios,sopScenarios:data.sopScenarios,lineBalanceStudies:data.lineBalanceStudies,advancedAnalyses:data.advancedAnalyses,recommendationFeedback:data.recommendationFeedback,methodSelectionContext:data.methodSelectionContext,fieldPilot:data.fieldPilot,externalSystemLinks:data.externalSystemLinks}}
export async function loadWorkspace(id:string):Promise<MethodologyWorkspace>{if(isGuestWorkspaceId(id)){const local=await getGuestWorkspace(id);if(!local)throw new Error("Bu yerel çalışma bu tarayıcıda bulunamadı.");return local}const response=await fetch(`/api/workspace/${encodeURIComponent(id)}`,{cache:"no-store"});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error??"Çalışma yüklenemedi.");return body}
export async function saveWorkspace(id:string,data:MethodologyWorkspace):Promise<MethodologyWorkspace>{if(isGuestWorkspaceId(id)){const next={...data,updatedAt:new Date().toISOString()};await saveGuestWorkspace(next);return next}const response=await fetch(`/api/workspace/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(workspacePatch(data))});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error??"Kaydetme başarısız.");return body}

/** AI rehber (metodoloji soru-cevap) çağrısı. */
export async function askGuide(methodology: string, question: string, problem: string): Promise<string> {
  const response = await fetch("/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ methodology, question, problemDescription: problem }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Rehber yanıt vermedi.");
  return body.answer as string;
}
