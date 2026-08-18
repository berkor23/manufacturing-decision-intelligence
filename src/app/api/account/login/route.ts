import { NextResponse } from "next/server";
import { getAccountService } from "@/application/wiring";
import { isAllowedMutationOrigin, requireAccountSystem, safeNextPath, setSessionCookie } from "@/lib/account-auth";
import { loginSchema } from "@/lib/account-schemas";
import { normalizeEmail } from "@/domain/access";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const closed = requireAccountSystem();
  if (closed) return closed;
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." }, { status: 400 });
  }
  // Hem kaynak adrese hem hedef hesaba bağlı sayaç: dağıtık deneme de,
  // tek hesaba yoğunlaşan deneme de sınırlanır.
  const limited = enforceRateLimit(request, "account-login", normalizeEmail(parsed.data.email));
  if (limited) return limited;

  const result = await getAccountService().login(parsed.data);
  if (result.outcome === "INVALID_CREDENTIALS") {
    // Sabit gecikme: yanıt süresinden hesabın varlığı çıkarılamasın.
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 401 });
  }
  if (result.outcome === "EMAIL_NOT_VERIFIED") {
    return NextResponse.json(
      { error: "Önce e-posta adresinizi doğrulayın.", verificationRequired: true },
      { status: 403 },
    );
  }
  await setSessionCookie(result.session);
  return NextResponse.json({
    ok: true,
    redirectTo: safeNextPath(parsed.data.next, result.accountType === "COMPANY" ? "/sirket" : "/hesabim"),
  });
}
