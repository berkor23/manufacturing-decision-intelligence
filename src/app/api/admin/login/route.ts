import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE, adminPassword, adminSessionToken, appPassword, sessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const submitted = String(form.get("password") ?? "");
  const expected = adminPassword() ?? appPassword();
  if (!expected || submitted !== expected) return NextResponse.redirect(new URL("/admin/giris?error=1", request.url), 303);

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, await adminSessionToken(submitted), { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", path:"/", maxAge:60*60*8 });
  const applicationPassword = appPassword();
  if (applicationPassword) response.cookies.set(SESSION_COOKIE, await sessionToken(applicationPassword), { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", path:"/", maxAge:60*60*8 });
  return response;
}
