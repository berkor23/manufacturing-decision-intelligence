import { NextResponse } from "next/server";
import { getAccountService } from "@/application/wiring";
import { canManageMembers, currentAccount, isAllowedMutationOrigin } from "@/lib/account-auth";
import { memberUpdateSchema } from "@/lib/account-schemas";

/** Ortak kapı: kaynak doğrulaması + şirket yöneticisi yetkisi. */
async function guard(request: Request) {
  if (!isAllowedMutationOrigin(request)) {
    return { error: NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 }) };
  }
  const account = await currentAccount();
  if (!account || !canManageMembers(account)) {
    return { error: NextResponse.json({ error: "Yetkiniz yok." }, { status: 403 }) };
  }
  return { account };
}

export async function PATCH(request: Request, context: { params: Promise<{ membershipId: string }> }) {
  const { account, error } = await guard(request);
  if (error) return error;
  const parsed = memberUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Değişiklikler geçerli değil." }, { status: 400 });
  const { membershipId } = await context.params;
  // OWNER üyeliğinin korunması domain kuralıdır; servis uygular.
  const result = await getAccountService().updateMember({
    membershipId,
    organizationId: account.organizationId!,
    actor: { userId: account.userId, organizationId: account.organizationId },
    patch: parsed.data,
  });
  if (!result.ok) return NextResponse.json({ error: "Bu üyelik değiştirilemez." }, { status: 404 });
  return NextResponse.json(result.membership);
}

export async function DELETE(request: Request, context: { params: Promise<{ membershipId: string }> }) {
  const { account, error } = await guard(request);
  if (error) return error;
  const { membershipId } = await context.params;
  const result = await getAccountService().removeMember({
    membershipId,
    organizationId: account.organizationId!,
    actor: { userId: account.userId, organizationId: account.organizationId },
  });
  if (!result.ok) {
    return NextResponse.json({ error: "Şirket sahibinin üyeliği kaldırılamaz." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
