import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDiagnosisService } from "@/application/wiring";
import { FEATURE_KEYS } from "@/domain/diagnosis";

const reviewSchema = z.object({
  corrections: z.partialRecord(z.enum(FEATURE_KEYS), z.boolean().nullable()),
});

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Gözden geçirme verisi doğrulanamadı." }, { status: 400 });
  try {
    const { id } = await params;
    return NextResponse.json(await getDiagnosisService().reviewFeatures(id, parsed.data.corrections));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gözden geçirme tamamlanamadı.";
    return NextResponse.json({ error: message }, { status: message.includes("bulunamadı") ? 404 : 400 });
  }
}
