import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";
import type { WorkspaceAttachment } from "@/domain/workspace-intelligence";
import { safeAttachmentPath, validateAttachment } from "@/infrastructure/persistence/attachment-policy";

const TARGETS = new Set(["WORKSPACE","EVIDENCE","CLAIM","ACTION","STEP"]);

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const form=await req.formData(); const file=form.get("file");
  if(!(file instanceof File))return NextResponse.json({error:"Dosya gerekli."},{status:400});
  const invalid=validateAttachment(file.size,file.type); if(invalid)return NextResponse.json({error:invalid},{status:400});
  const targetType=String(form.get("targetType")??"WORKSPACE"); if(!TARGETS.has(targetType))return NextResponse.json({error:"Geçersiz bağlantı hedefi."},{status:400});
  const ws=await getWorkspaceService().get(id); if(!ws)return NextResponse.json({error:"Çalışma bulunamadı."},{status:404});
  const ext=path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g,"").slice(0,10);
  const attachmentId=`att_${randomUUID()}`; const storageKey=`${id}/${attachmentId}${ext}`;
  const root=path.resolve(process.cwd(),"storage","evidence"); const directory=path.resolve(root,id);
  const filePath=safeAttachmentPath(root,storageKey); if(!filePath||!directory.startsWith(root+path.sep))return NextResponse.json({error:"Geçersiz depolama yolu."},{status:400});
  await mkdir(directory,{recursive:true}); await writeFile(filePath,Buffer.from(await file.arrayBuffer()));
  const attachment:WorkspaceAttachment={id:attachmentId,originalName:path.basename(file.name).slice(0,180),storageKey,mimeType:file.type,size:file.size,targetType:targetType as WorkspaceAttachment["targetType"],targetId:String(form.get("targetId")??"")||null,description:String(form.get("description")??"").slice(0,500),uploadedAt:new Date().toISOString()};
  const updated=await getWorkspaceService().addAttachment(id,attachment); return NextResponse.json(updated,{status:201});
}
