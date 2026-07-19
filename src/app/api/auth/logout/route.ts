import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/logout — oturum çerezini sil, giriş sayfasına yolla.
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/giris", req.url), { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
