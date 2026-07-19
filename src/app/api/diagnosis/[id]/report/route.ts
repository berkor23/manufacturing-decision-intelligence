import { NextResponse } from "next/server";
import { getReportService } from "@/application/wiring";

// LLM (Ollama, gerekirse tünel üzerinden) yavaş olabilir; Vercel'in varsayılan
// 10sn fonksiyon limitini 60sn'ye çıkar (Hobby üst sınırı).
export const maxDuration = 60;

// POST /api/diagnosis/{id}/report — sonuçlanmış teşhisten rapor üret
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const report = await getReportService().generate(id);
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata.";
    const status = message.includes("bulunamadı") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
