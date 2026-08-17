import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceService } from "@/application/wiring";
import { METHODOLOGIES } from "@/domain/diagnosis";
import { accountAuthEnabled, accountFromRequest, canEditWorkspace, recordActivity } from "@/lib/account-auth";

const bodySchema = z.object({
  conversationId: z.string().optional(),
  methodology: z.enum(METHODOLOGIES),
  problemDescription: z.string().min(1, "Problem açıklaması gerekli."),
  recommendedMethodology: z.enum(METHODOLOGIES).optional(),
  diagnosisRationale: z.string().max(4000).optional(),
  sourceWorkspaceId: z.string().optional(),
  reason: z.string().optional(),
  relation: z.enum(["COMPLEMENTARY", "FOLLOW_UP", "RECURRENCE", "HORIZONTAL_DEPLOYMENT"]).optional(),
  targetDescription: z.string().optional(),
  horizontalTargetId: z.string().optional(),
});

// POST /api/workspace — metodoloji uygulama alanı oluştur
export async function POST(req: NextRequest) {
  const account = accountAuthEnabled() ? await accountFromRequest(req) : null;
  if (accountAuthEnabled() && !account) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 },
    );
  }
  // Bağlı çalışma, kaynağın adımlarını/kanıtlarını/eklerini hedefe kopyalar.
  // Kaynak yetkisi doğrulanmazsa bu, kiracılar arası veri çekme yoluna dönüşür.
  // Proxy'nin /workspace/{id} deseni bu yolu (id'siz POST) kapsamaz.
  if (parsed.data.sourceWorkspaceId && account && !(await canEditWorkspace(account, parsed.data.sourceWorkspaceId))) {
    return NextResponse.json({ error: "Kaynak çalışmayı kullanma yetkiniz yok." }, { status: 403 });
  }
  // Sahiplik oluşturmanın parçasıdır: kayıt ve sahibi aynı yazımda kalıcılaşır.
  const owner = account ? { ownerUserId: account.userId, organizationId: account.organizationId } : undefined;
  const ws = parsed.data.sourceWorkspaceId ? await getWorkspaceService().createLinked({
    sourceWorkspaceId: parsed.data.sourceWorkspaceId,
    methodology: parsed.data.methodology,
    reason: parsed.data.reason ?? "Bağlı metodoloji çalışması",
    relation: parsed.data.relation,
    targetDescription: parsed.data.targetDescription,
    horizontalTargetId: parsed.data.horizontalTargetId,
    owner,
  }) : await getWorkspaceService().create({
    conversationId: parsed.data.conversationId ?? null,
    methodology: parsed.data.methodology,
    problemDescription: parsed.data.problemDescription,
    recommendedMethodology: parsed.data.recommendedMethodology,
    diagnosisRationale: parsed.data.diagnosisRationale,
    owner,
  });
  if (account) {
    await recordActivity({ account, type: "WORKSPACE_CREATED", summary: `${ws.methodologyName} çalışması başlatıldı.`, workspaceId: ws.id });
  }
  return NextResponse.json(ws, { status: 201 });
}
