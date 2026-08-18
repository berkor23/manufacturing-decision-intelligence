import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountService } from "@/application/wiring";
import { isAllowedMutationOrigin, requireAccountSystem, setSessionCookie } from "@/lib/account-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({ token: z.string().min(20) });

export async function POST(request: Request) {
  const closed = requireAccountSystem();
  if (closed) return closed;
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }
  const limited = enforceRateLimit(request, "account-token");
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Doğrulama bağlantısı geçerli değil." }, { status: 400 });
  }
  const result = await getAccountService().verifyEmail(parsed.data.token);
  if (!result.ok) {
    return NextResponse.json({ error: "Bu bağlantı kullanılmış veya süresi dolmuş." }, { status: 400 });
  }
  await setSessionCookie(result.session);
  return NextResponse.json({ ok: true, redirectTo: result.accountType === "COMPANY" ? "/sirket" : "/hesabim" });
}
