import { NextResponse } from "next/server";
import { getAccountService } from "@/application/wiring";
import { canManageMembers, currentAccount, isAllowedMutationOrigin } from "@/lib/account-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ membershipId: string }> }) {
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const account = await currentAccount();
  if (!account || !canManageMembers(account)) {
    return NextResponse.json({ error: "Yetkiniz yok." }, { status: 403 });
  }
  const { membershipId } = await context.params;
  const limited = enforceRateLimit(request, "email-dispatch", membershipId);
  if (limited) return limited;
  // Yeni davet jetonu öncekini geçersizler (issueToken kuralı).
  const result = await getAccountService().resendInvitation({
    membershipId,
    organizationId: account.organizationId!,
  });
  if (!result.ok) return NextResponse.json({ error: "Bekleyen davet bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true, previewUrl: result.previewUrl });
}
