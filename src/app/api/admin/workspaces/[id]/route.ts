import { rm } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE, isValidAdminSession } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Yıkıcı bir işlem: proxy kapısına ek olarak route da kendi kontrolünü yapar.
  const store = await cookies();
  if (!(await isValidAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value, store.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Platform yöneticisi oturumu gerekli." }, { status: 403 });
  }
  const { id } = await params;
  const service = getWorkspaceService();
  const workspace = await service.get(id);
  if (!workspace) {
    return NextResponse.json({ error: "Çalışma bulunamadı." }, { status: 404 });
  }

  const deleted = await service.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Çalışma kaldırılamadı." }, { status: 409 });
  }

  const evidenceRoot = path.resolve(process.cwd(), "storage", "evidence");
  const workspaceDirectory = path.resolve(evidenceRoot, id);
  if (workspaceDirectory.startsWith(`${evidenceRoot}${path.sep}`)) {
    await rm(workspaceDirectory, { recursive: true, force: true }).catch(() => undefined);
  }

  return NextResponse.json({ deleted: true, id });
}
