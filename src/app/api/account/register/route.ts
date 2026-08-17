import { NextResponse } from "next/server";
import { getAccountService } from "@/application/wiring";
import { isAllowedMutationOrigin } from "@/lib/account-auth";
import { registerSchema } from "@/lib/account-schemas";
import { ensureEmailDeliveryConfigured } from "@/lib/email-delivery";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  ensureEmailDeliveryConfigured();
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const limited = enforceRateLimit(request, "account-register");
  if (limited) return limited;
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." }, { status: 400 });
  }
  // Akışın tamamı AccountService'te: var olan adres için de aynı yanıt döner
  // (hesap numaralandırmasını önleyen kural orada testle sabitlenmiştir).
  const result = await getAccountService().register(parsed.data);
  return NextResponse.json({ ok: true, ...result }, { status: 201 });
}
