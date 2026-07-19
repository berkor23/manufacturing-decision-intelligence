import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, appPassword, sessionToken } from "@/lib/auth";

const bodySchema = z.object({ password: z.string().min(1, "Parola gerekli.") });

// POST /api/auth/login — parola doğruysa oturum çerezi ver.
export async function POST(req: NextRequest) {
  const password = appPassword();
  if (!password) {
    return NextResponse.json({ error: "Auth kapalı (APP_PASSWORD tanımlı değil)." }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parola gerekli." }, { status: 400 });
  }

  if (parsed.data.password !== password) {
    // Deneme hızını kabaca sınırla (sözlük saldırısını yavaşlatır).
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Parola hatalı." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 gün
  });
  return res;
}
