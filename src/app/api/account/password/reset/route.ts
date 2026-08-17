import { NextResponse } from "next/server";
import { getAccountService } from "@/application/wiring";
import { isAllowedMutationOrigin, setSessionCookie } from "@/lib/account-auth";
import { resetPasswordSchema } from "@/lib/account-schemas";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const limited = enforceRateLimit(request, "account-token");
  if (limited) return limited;
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Yeni parola geçerli değil." }, { status: 400 });
  }
  // Servis jetonu tüketir, parolayı değiştirir ve TÜM eski oturumları düşürür.
  const result = await getAccountService().resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: "Bu bağlantı kullanılmış veya süresi dolmuş." }, { status: 400 });
  }
  await setSessionCookie(result.session);
  return NextResponse.json({ ok: true, redirectTo: "/hesabim" });
}
