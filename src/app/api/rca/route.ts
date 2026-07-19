import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRcaRepository } from "@/application/wiring";

const bodySchema = z.object({
  conversationId: z.string().optional(),
  problemDescription: z.string().min(1, "Problem açıklaması gerekli."),
});

// POST /api/rca — yeni RCA çalışma alanı oluştur
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 },
    );
  }
  const ws = await getRcaRepository().create({
    conversationId: parsed.data.conversationId ?? null,
    problemDescription: parsed.data.problemDescription,
  });
  return NextResponse.json(ws, { status: 201 });
}
