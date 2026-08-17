import { NextResponse } from "next/server";
import { getAttachmentStorage, getWorkspaceService } from "@/application/wiring";
import { denyWorkspaceAccess } from "@/lib/workspace-guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await params;
  const denied = await denyWorkspaceAccess(req, id, "read");
  if (denied) return denied;

  const item = await getWorkspaceService().getAttachment(id, attachmentId);
  if (!item) return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });

  const data = await getAttachmentStorage().get(item.storageKey);
  if (!data) return NextResponse.json({ error: "Dosya depoda bulunamadı." }, { status: 404 });

  // Ad başlıkta kullanıldığı için tırnak ve satır sonu temizlenir; nosniff ile
  // tarayıcının içeriği farklı bir tür sanıp çalıştırması engellenir.
  const safeName = item.originalName.replace(/["\r\n]/g, "_");
  // Uint8Array.from: gövde ArrayBuffer destekli olmalı (Buffer SharedArrayBuffer
  // destekli olabildiği için doğrudan BodyInit sayılmıyor).
  return new Response(Uint8Array.from(data), {
    headers: {
      "Content-Type": item.mimeType,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
