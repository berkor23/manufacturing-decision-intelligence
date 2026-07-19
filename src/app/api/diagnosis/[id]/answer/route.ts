import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDiagnosisService } from "@/application/wiring";

const bodySchema = z.object({ text: z.string().min(1, "Cevap boş olamaz.") });

// POST /api/diagnosis/{id}/answer — bekleyen soruya cevap ver
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 },
    );
  }

  try {
    const view = await getDiagnosisService().answer(id, parsed.data.text);
    return NextResponse.json(view);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata.";
    const status = message.includes("bulunamadı") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
