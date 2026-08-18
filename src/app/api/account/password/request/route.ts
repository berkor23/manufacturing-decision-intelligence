import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountService } from "@/application/wiring";
import { isAllowedMutationOrigin, requireAccountSystem } from "@/lib/account-auth";
import { normalizeEmail } from "@/domain/access";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const closed = requireAccountSystem();
  if (closed) return closed;
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  // Kurbanın gelen kutusuna e-posta yağdırmayı engeller.
  const limited = enforceRateLimit(request, "email-dispatch", normalizeEmail(parsed.data.email));
  if (limited) return limited;

  const { previewUrl } = await getAccountService().requestPasswordReset(parsed.data.email);
  return NextResponse.json({
    ok: true,
    message: "Adres sistemde kayıtlıysa parola yenileme bağlantısı gönderildi.",
    previewUrl,
  });
}
