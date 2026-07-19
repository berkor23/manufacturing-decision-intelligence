import { NextResponse } from "next/server";
import { getDiagnosisService } from "@/application/wiring";

// GET /api/diagnosis/{id} — mevcut teşhis durumunu getir
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const view = await getDiagnosisService().getState(id);
  if (!view) {
    return NextResponse.json({ error: "Conversation bulunamadı." }, { status: 404 });
  }
  return NextResponse.json(view);
}
