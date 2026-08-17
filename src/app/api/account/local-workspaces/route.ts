import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { METHODOLOGIES } from "@/domain/diagnosis";
import { workspacePatchSchema } from "@/application/workspace-patch-schema";
import type { WorkspacePatch } from "@/application/ports/methodology-workspace-repository";
import { getWorkspaceService } from "@/application/wiring";
import { accountFromRequest, isAllowedMutationOrigin, recordActivity } from "@/lib/account-auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

const inputSchema = z.object({
  localId: z.string().regex(/^local_ws_[a-zA-Z0-9-]+$/).max(100),
  methodology: z.enum(METHODOLOGIES),
  problemDescription: z.string().trim().min(1).max(8_000),
  data: z.unknown(),
});

export async function POST(request: NextRequest) {
  if (!isAllowedMutationOrigin(request)) return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  const account = await accountFromRequest(request);
  if (!account) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const limited = enforceRateLimit(request, "local-workspace-import", account.userId);
  if (limited) return limited;

  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Yerel çalışma paketi doğrulanamadı." }, { status: 400 });
  const patch = workspacePatchSchema.safeParse(input.data.data);
  if (!patch.success) return NextResponse.json({ error: "Çalışma içeriği güvenli aktarım şemasına uymuyor." }, { status: 400 });

  const ownerFilter = account.organizationId
    ? { organizationId: account.organizationId }
    : { ownerUserId: account.userId, organizationId: null };
  const duplicate = await prisma.workspaceRecord.findFirst({
    where: { ...ownerFilter, data: { path: ["specialty", "localOriginId"], equals: input.data.localId } },
    select: { id: true },
  });
  if (duplicate) return NextResponse.json({ id: duplicate.id, duplicate: true });

  const created = await getWorkspaceService().create({
    methodology: input.data.methodology,
    problemDescription: input.data.problemDescription,
    owner: { ownerUserId: account.userId, organizationId: account.organizationId },
  });
  const imported = patch.data as WorkspacePatch;
  const updated = await getWorkspaceService().update(created.id, {
    ...imported,
    // Dosya baytları ayrı, tür/boyut doğrulamalı yükleme ucundan taşınır. İstemciden
    // gelen yerel storageKey değerlerini bulut metadata'sına yazmak kırık bağlantı üretir.
    attachments: [],
    specialty: { ...(imported.specialty ?? {}), localOriginId: input.data.localId },
  });
  if (!updated) return NextResponse.json({ error: "Bulut çalışması oluşturuldu ancak içeriği aktarılamadı." }, { status: 500 });

  await recordActivity({ account, type: "LOCAL_WORKSPACE_IMPORTED", summary: "Tarayıcıdaki yerel çalışma buluta aktarıldı.", workspaceId: created.id });
  return NextResponse.json({ id: created.id, duplicate: false }, { status: 201 });
}
