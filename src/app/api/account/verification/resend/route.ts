import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountService } from "@/application/wiring";
import { isAllowedMutationOrigin } from "@/lib/account-auth";
import { normalizeEmail } from "@/domain/access";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  // Geçersiz gövde de aynı sessiz yanıtı alır: adres sorgulanamaz.
  if (!parsed.success) return NextResponse.json({ ok: true });
  const limited = enforceRateLimit(request, "email-dispatch", normalizeEmail(parsed.data.email));
  if (limited) return limited;

  const { previewUrl } = await getAccountService().resendVerification(parsed.data.email);
  return NextResponse.json({ ok: true, message: "Hesap uygunsa yeni bağlantı gönderildi.", previewUrl });
}
