import { NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";
import { denyWorkspaceAccess } from "@/lib/workspace-guard";
import { enforceRateLimit } from "@/lib/rate-limit";

// LLM (Ollama, gerekirse tünel üzerinden) yavaş olabilir; Vercel varsayılan
// 10sn limitini 60sn'ye çıkar (Hobby üst sınırı).
export const maxDuration = 60;

// POST /api/workspace/{id}/report — doldurulan adımlardan profesyonel rapor üret
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const denied = await denyWorkspaceAccess(req, id, "write");
  if (denied) return denied;
  const limited = enforceRateLimit(req, "ai-generate");
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => ({})) as { kind?: string };
    const kind = body.kind === "OFFICIAL" ? "OFFICIAL" : "INTERIM";
    const ws = await getWorkspaceService().generateReport(id, kind);
    return NextResponse.json(ws);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Rapor üretilemedi.";
    const status = msg.includes("bulunamadı") ? 404 : msg.includes("Resmî rapor henüz üretilemez") ? 409 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
