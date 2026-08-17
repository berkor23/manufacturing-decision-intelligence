import { NextResponse } from "next/server";
import { z } from "zod";
import { METHODOLOGIES } from "@/domain/diagnosis";
import { getWorkspaceService } from "@/application/wiring";
import { workspacePatchSchema } from "@/application/workspace-patch-schema";
import type { WorkspacePatch } from "@/application/ports/methodology-workspace-repository";
import { accountAuthEnabled, accountFromRequest, isAllowedMutationOrigin, recordActivity } from "@/lib/account-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  schemaVersion: z.literal(1),
  workspace: z.object({
    methodology: z.enum(METHODOLOGIES),
    problemDescription: z.string().min(1),
    patch: workspacePatchSchema,
  }),
});

export async function POST(req: Request) {
  if (!isAllowedMutationOrigin(req)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  // Sahipsiz içe aktarma hem kimliksiz kayıt üretiyor hem de hiçbir hesaba
  // bağlanmadığı için erişim kontrolünün dışında kalıyordu.
  const account = accountAuthEnabled() ? await accountFromRequest(req) : null;
  if (accountAuthEnabled() && !account) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const limited = enforceRateLimit(req, "workspace-import");
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Geçersiz veya desteklenmeyen içe aktarma paketi.",
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
      { status: 400 },
    );
  }

  const { methodology, problemDescription, patch } = parsed.data.workspace;
  const service = getWorkspaceService();
  // Sahiplik oluşturmanın parçasıdır: kayıt ve sahibi aynı yazımda kalıcılaşır.
  const ws = await service.create({
    methodology,
    problemDescription,
    owner: account ? { ownerUserId: account.userId, organizationId: account.organizationId } : undefined,
  });
  if (account) {
    await recordActivity({
      account,
      type: "WORKSPACE_IMPORTED",
      summary: "Çalışma içe aktarıldı.",
      workspaceId: ws.id,
    });
  }
  return NextResponse.json(await service.update(ws.id, patch as unknown as WorkspacePatch), { status: 201 });
}
