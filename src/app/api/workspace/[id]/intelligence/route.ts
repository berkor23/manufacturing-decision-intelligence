import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await getWorkspaceService().intelligence((await params).id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hata" }, { status: 404 });
  }
}
