import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";

// LLM (Ollama, gerekirse tünel üzerinden) yavaş olabilir; Vercel varsayılan
// 10sn limitini 60sn'ye çıkar (Hobby üst sınırı).
export const maxDuration = 60;

// POST /api/workspace/{id}/report — doldurulan adımlardan profesyonel rapor üret
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const ws = await getWorkspaceService().generateReport(id);
    return NextResponse.json(ws);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Rapor üretilemedi.";
    const status = msg.includes("bulunamadı") ? 404 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
