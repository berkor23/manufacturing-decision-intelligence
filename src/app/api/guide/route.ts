import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGuideService } from "@/application/wiring";
import { METHODOLOGIES } from "@/domain/diagnosis";
import { enforceRateLimit } from "@/lib/rate-limit";

// LLM (Ollama, gerekirse tünel üzerinden) yavaş olabilir; Vercel varsayılan
// 10sn limitini 60sn'ye çıkar (Hobby üst sınırı).
export const maxDuration = 60;

const bodySchema = z.object({
  methodology: z.enum(METHODOLOGIES),
  question: z.string().min(1, "Soru boş olamaz."),
  problemDescription: z.string().optional(),
});

// POST /api/guide — seçilen metodoloji hakkında "nasıl uygularım?" sorusu
export async function POST(req: NextRequest) {
  // LLM çağrısı pahalı ve yavaş (60 sn); sınırsız erişim kaynak tüketimi demek.
  const limited = enforceRateLimit(req, "ai-generate");
  if (limited) return limited;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 },
    );
  }
  try {
    const answer = await getGuideService().ask(parsed.data);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[guide] ask failed", err);
    return NextResponse.json({ error: "Rehber yanıtı üretilemedi." }, { status: 500 });
  }
}
