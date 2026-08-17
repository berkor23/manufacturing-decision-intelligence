import {NextResponse} from "next/server";
import {getWorkspaceService} from "@/application/wiring";
import {denyWorkspaceAccess} from "@/lib/workspace-guard";
const csv=(rows:string[][])=>rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\r\n");
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const denied=await denyWorkspaceAccess(req,(await params).id,"read"); if(denied)return denied;
 const ws=await getWorkspaceService().get((await params).id);if(!ws)return NextResponse.json({error:"Çalışma bulunamadı."},{status:404});
 if(new URL(req.url).searchParams.get("format")==="csv"){const rows=[["Tür","Başlık","Sahip","Durum","Termin"],...ws.actions.map(x=>["ACTION",x.action,x.owner??"",x.status,x.dueDate??""]),...ws.containmentControls.map(x=>["CONTAINMENT",x.purpose,x.owner,x.status,x.removedAt??""]),...ws.weakSignals.map(x=>["WEAK_SIGNAL",x.description,x.owner,x.status,x.dueDate??""])];return new Response(`\uFEFF${csv(rows)}`,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${ws.id}-audit.csv"`}})}
 const {id,createdAt,updatedAt,conversationId,methodologyName,whenToUse,tools,auditTrail,methodology,problemDescription,phases,dna,...patch}=ws;void createdAt;void updatedAt;void conversationId;void methodologyName;void whenToUse;void tools;void auditTrail;void phases;void dna;
 return NextResponse.json({schemaVersion:1,exportedAt:new Date().toISOString(),workspace:{methodology,problemDescription,patch}},{headers:{"Content-Disposition":`attachment; filename="${id}.json"`}})
}
