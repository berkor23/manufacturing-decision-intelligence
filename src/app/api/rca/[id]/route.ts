import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRcaRepository } from "@/application/wiring";
import { accountAuthEnabled, accountFromRequest, canAccessRca } from "@/lib/account-auth";

/** RCA kaydı kiracıya bağlıdır: proxy'ye ek olarak route da kendi kapısını tutar. */
async function denyUnlessAllowed(req: Request, id: string) {
  if (!accountAuthEnabled()) return null;
  const account = await accountFromRequest(req);
  if (!account || !(await canAccessRca(account, id))) {
    return NextResponse.json({ error: "Bu RCA kaydına erişiminiz yok." }, { status: 403 });
  }
  return null;
}

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
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const denied = await denyUnlessAllowed(req, id);
  if (denied) return denied;
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
  const denied = await denyUnlessAllowed(req, id);
  if (denied) return denied;
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
