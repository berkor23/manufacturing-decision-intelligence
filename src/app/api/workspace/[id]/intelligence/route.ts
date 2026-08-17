import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";
import { denyWorkspaceAccess } from "@/lib/workspace-guard";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWorkspaceAccess(req, (await params).id, "read");
  if (denied) return denied;
  try {
    return NextResponse.json(await getWorkspaceService().intelligence((await params).id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hata" }, { status: 404 });
  }
}
