import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountService } from "@/application/wiring";
import { accountFromRequest, isAllowedMutationOrigin, sessionTokenFromRequest } from "@/lib/account-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).regex(/[a-zA-ZÇĞİÖŞÜçğıöşü]/).regex(/[0-9]/),
});

export async function PATCH(request: Request) {
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const account = await accountFromRequest(request);
  if (!account) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  // Çalınan bir oturumla mevcut parolayı deneme-yanılma ile bulmayı sınırlar.
  const limited = enforceRateLimit(request, "password-change", account.userId);
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Yeni parola en az 10 karakter, bir harf ve bir rakam içermeli." },
      { status: 400 },
    );
  }
  // Mevcut oturum korunur, diğer cihazlardaki oturumlar düşer.
  const result = await getAccountService().changePassword({
    userId: account.userId,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    currentSessionToken: sessionTokenFromRequest(request),
  });
  if (!result.ok) return NextResponse.json({ error: "Mevcut parola doğru değil." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
