import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceService } from "@/application/wiring";

// LLM (Ollama, gerekirse tünel üzerinden) yavaş olabilir; Vercel varsayılan
// 10sn limitini 60sn'ye çıkar (Hobby üst sınırı).
export const maxDuration = 60;

const bodySchema = z.object({ stepKey: z.string().min(1) });

// POST /api/workspace/{id}/draft — bir playbook adımı için AI taslağı üret
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek: stepKey gerekli." }, { status: 400 });
  }
  try {
    const ws = await getWorkspaceService().draftStep(id, parsed.data.stepKey);
    return NextResponse.json(ws);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Taslak üretilemedi.";
    const status = msg.includes("bulunamadı") ? 404 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
