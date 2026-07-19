import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRcaRepository } from "@/application/wiring";

const fishboneCategory = z.enum([
  "MAN",
  "MACHINE",
  "METHOD",
  "MATERIAL",
  "MEASUREMENT",
  "ENVIRONMENT",
]);

const patchSchema = z.object({
  problemDescription: z.string().optional(),
  whySteps: z
    .array(z.object({ statement: z.string(), isRootCause: z.boolean() }))
    .optional(),
  fishbone: z
    .array(z.object({ category: fishboneCategory, cause: z.string() }))
    .optional(),
  actions: z
    .array(
      z.object({
        action: z.string(),
        owner: z.string().nullable(),
        status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]),
      }),
    )
    .optional(),
});

// GET /api/rca/{id}
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ws = await getRcaRepository().get(id);
  if (!ws) return NextResponse.json({ error: "RCA bulunamadı." }, { status: 404 });
  return NextResponse.json(ws);
}

// PATCH /api/rca/{id} — whySteps/fishbone/actions güncelle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 },
    );
  }
  const ws = await getRcaRepository().update(id, parsed.data);
  if (!ws) return NextResponse.json({ error: "RCA bulunamadı." }, { status: 404 });
  return NextResponse.json(ws);
}
