import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";
import { safeAttachmentPath } from "@/infrastructure/persistence/attachment-policy";

export async function GET(_req:Request,{params}:{params:Promise<{id:string;attachmentId:string}>}) {
  const {id,attachmentId}=await params; const item=await getWorkspaceService().getAttachment(id,attachmentId);
  if(!item)return NextResponse.json({error:"Dosya bulunamadı."},{status:404});
  const root=path.resolve(process.cwd(),"storage","evidence"); const filePath=safeAttachmentPath(root,item.storageKey);
  if(!filePath)return NextResponse.json({error:"Geçersiz dosya yolu."},{status:400});
  try { const data=await readFile(filePath); const safe=item.originalName.replace(/["\r\n]/g,"_"); return new Response(data,{headers:{"Content-Type":item.mimeType,"Content-Length":String(item.size),"Content-Disposition":`attachment; filename="${safe}"`,"X-Content-Type-Options":"nosniff"}}); }
  catch{return NextResponse.json({error:"Dosya depoda bulunamadı."},{status:404});}
}
