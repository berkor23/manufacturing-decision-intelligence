import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, appPassword, constantTimeEquals, sessionToken } from "@/lib/auth";
import { isAllowedMutationOrigin, secureCookiesEnabled } from "@/lib/account-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ password: z.string().min(1, "Parola gerekli.") });

// POST /api/auth/login — parola doğruysa oturum çerezi ver.
export async function POST(req: NextRequest) {
  if (!isAllowedMutationOrigin(req)) return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  const password = appPassword();
  if (!password) {
    return NextResponse.json({ error: "Auth kapalı (APP_PASSWORD tanımlı değil)." }, { status: 400 });
  }
  const limited = enforceRateLimit(req, "app-login");
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parola gerekli." }, { status: 400 });
  }

  if (!constantTimeEquals(parsed.data.password, password)) {
    // Deneme hızını kabaca sınırla (sözlük saldırısını yavaşlatır).
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Parola hatalı." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookiesEnabled(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS, // sunucudaki yaş sınırıyla aynı
  });
  return res;
}
