import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGuideService } from "@/application/wiring";
import { METHODOLOGIES } from "@/domain/diagnosis";

const bodySchema = z.object({
  methodology: z.enum(METHODOLOGIES),
  question: z.string().min(1, "Soru boş olamaz."),
  problemDescription: z.string().optional(),
});

// POST /api/guide — seçilen metodoloji hakkında "nasıl uygularım?" sorusu
export async function POST(req: NextRequest) {
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata." },
      { status: 500 },
    );
  }
}
