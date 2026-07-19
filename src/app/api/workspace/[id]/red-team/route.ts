import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await getWorkspaceService().redTeam((await params).id)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Hata" }, { status: 404 }); }
}
