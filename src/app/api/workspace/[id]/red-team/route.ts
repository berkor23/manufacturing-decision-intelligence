import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";
import { denyWorkspaceAccess } from "@/lib/workspace-guard";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWorkspaceAccess(req, (await params).id, "read");
  if (denied) return denied;
  try { return NextResponse.json(await getWorkspaceService().redTeam((await params).id)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Hata" }, { status: 404 }); }
}
