import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceService } from "@/application/wiring";
import { METHODOLOGIES } from "@/domain/diagnosis";

const bodySchema = z.object({
  conversationId: z.string().optional(),
  methodology: z.enum(METHODOLOGIES),
  problemDescription: z.string().min(1, "Problem açıklaması gerekli."),
  sourceWorkspaceId: z.string().optional(),
  reason: z.string().optional(),
  relation: z.enum(["COMPLEMENTARY", "FOLLOW_UP", "RECURRENCE", "HORIZONTAL_DEPLOYMENT"]).optional(),
  targetDescription: z.string().optional(),
  horizontalTargetId: z.string().optional(),
});

// POST /api/workspace — metodoloji uygulama alanı oluştur
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 },
    );
  }
  const ws = parsed.data.sourceWorkspaceId ? await getWorkspaceService().createLinked({
    sourceWorkspaceId: parsed.data.sourceWorkspaceId,
    methodology: parsed.data.methodology,
    reason: parsed.data.reason ?? "Bağlı metodoloji çalışması",
    relation: parsed.data.relation,
    targetDescription: parsed.data.targetDescription,
    horizontalTargetId: parsed.data.horizontalTargetId,
  }) : await getWorkspaceService().create({
    conversationId: parsed.data.conversationId ?? null,
    methodology: parsed.data.methodology,
    problemDescription: parsed.data.problemDescription,
  });
  return NextResponse.json(ws, { status: 201 });
}
