import { NextResponse } from "next/server";
import { METHODOLOGIES } from "@/domain/diagnosis";
import { getWorkspaceService } from "@/application/wiring";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const methodology = new URL(req.url).searchParams.get("methodology");
  if (!methodology || !METHODOLOGIES.includes(methodology as never)) return NextResponse.json({error:"Geçersiz metodoloji."},{status:400});
  try { return NextResponse.json(await getWorkspaceService().transferPreview((await params).id, methodology as never)); }
  catch(e){ return NextResponse.json({error:e instanceof Error?e.message:"Hata"},{status:404}); }
}
