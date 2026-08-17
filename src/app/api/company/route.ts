import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountService } from "@/application/wiring";
import { canManageMembers, currentAccount, isAllowedMutationOrigin } from "@/lib/account-auth";

const schema = z.object({ name: z.string().trim().min(2).max(140), seatLimit: z.number().int().min(1).max(10000) });

export async function PATCH(request: Request) {
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const account = await currentAccount();
  if (!account || !canManageMembers(account)) {
    return NextResponse.json({ error: "Şirket ayarlarını değiştirme yetkiniz yok." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." }, { status: 400 });
  }
  const result = await getAccountService().updateOrganization({
    organizationId: account.organizationId!,
    actor: { userId: account.userId, organizationId: account.organizationId },
    name: parsed.data.name,
    seatLimit: parsed.data.seatLimit,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: `Kullanıcı sınırı aktif ${result.used} hesabın altına indirilemez.` },
      { status: 409 },
    );
  }
  return NextResponse.json(result.organization);
}
