import { NextResponse } from "next/server";
import { getAccountService } from "@/application/wiring";
import { canManageMembers, currentAccount, isAllowedMutationOrigin } from "@/lib/account-auth";
import { memberSchema } from "@/lib/account-schemas";
import { ensureEmailDeliveryConfigured } from "@/lib/email-delivery";
import { enforceRateLimit } from "@/lib/rate-limit";

const ERRORS = {
  SEAT_LIMIT: "Kullanıcı sınırına ulaştınız. Önce boş bir koltuk açın veya plan sınırını artırın.",
  EMAIL_TAKEN: "Bu e-posta adresi başka bir hesapta kullanılıyor.",
  NO_ORGANIZATION: "Şirket bulunamadı.",
} as const;

export async function POST(request: Request) {
  ensureEmailDeliveryConfigured();
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const account = await currentAccount();
  if (!account || !canManageMembers(account)) {
    return NextResponse.json({ error: "Bu işlem için şirket yöneticisi olmalısınız." }, { status: 403 });
  }
  const limited = enforceRateLimit(request, "member-invite", account.organizationId ?? "");
  if (limited) return limited;
  const parsed = memberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Çalışan bilgilerini kontrol edin." },
      { status: 400 },
    );
  }
  // Koltuk kontrolü, kullanıcı+üyelik oluşturma ve davet e-postası servistedir.
  const result = await getAccountService().inviteMember({
    organizationId: account.organizationId!,
    actor: { userId: account.userId, organizationId: account.organizationId },
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    jobTitle: parsed.data.jobTitle,
    department: parsed.data.department,
  });
  if (!result.ok) {
    return NextResponse.json({ error: ERRORS[result.reason] }, { status: result.reason === "NO_ORGANIZATION" ? 404 : 409 });
  }
  return NextResponse.json({ ...result.membership, previewUrl: result.previewUrl }, { status: 201 });
}
