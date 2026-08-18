import { NextResponse } from "next/server";
import { getAccountService } from "@/application/wiring";
import { isAllowedMutationOrigin, requireAccountSystem, setSessionCookie } from "@/lib/account-auth";
import { resetPasswordSchema } from "@/lib/account-schemas";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const closed = requireAccountSystem();
  if (closed) return closed;
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const limited = enforceRateLimit(request, "account-token");
  if (limited) return limited;
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Parola geçerli değil." }, { status: 400 });
  }
  // Davet ön koşulu (üyelik BEKLEYEN olmalı) ve jeton tüketimi servistedir.
  const result = await getAccountService().acceptInvitation(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: "Davet kullanılmış, iptal edilmiş veya süresi dolmuş." }, { status: 400 });
  }
  await setSessionCookie(result.session);
  return NextResponse.json({ ok: true, redirectTo: "/hesabim" });
}
