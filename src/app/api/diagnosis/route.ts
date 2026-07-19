import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDiagnosisService } from "@/application/wiring";

const bodySchema = z.object({ text: z.string().min(1, "Problem metni boş olamaz.") });

// POST /api/diagnosis — yeni teşhis başlat
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
    const view = await getDiagnosisService().start(parsed.data.text);
    return NextResponse.json(view, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata." },
      { status: 500 },
    );
  }
}
