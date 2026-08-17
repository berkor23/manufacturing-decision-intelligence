import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, SESSION_COOKIE, adminPassword, adminSessionToken, appPassword, constantTimeEquals, sessionToken } from "@/lib/auth";
import { isAllowedMutationOrigin, secureCookiesEnabled } from "@/lib/account-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Form gönderimi de olsa oturum açtıran bir uçtur: CSRF ile kurbanı
  // saldırganın yönetici oturumuna sokmayı engeller.
  if (!isAllowedMutationOrigin(request)) return NextResponse.redirect(new URL("/admin/giris?error=1", request.url), 303);
  const limited = enforceRateLimit(request, "admin-login");
  if (limited) return limited;
  const form = await request.formData();
  const submitted = String(form.get("password") ?? "");
  const expected = adminPassword() ?? appPassword();
  if (!expected || !constantTimeEquals(submitted, expected)) return NextResponse.redirect(new URL("/admin/giris?error=1", request.url), 303);

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, await adminSessionToken(submitted), { httpOnly:true, sameSite:"lax", secure:secureCookiesEnabled(), path:"/", maxAge:ADMIN_SESSION_MAX_AGE_SECONDS });
  const applicationPassword = appPassword();
  if (applicationPassword) response.cookies.set(SESSION_COOKIE, await sessionToken(applicationPassword), { httpOnly:true, sameSite:"lax", secure:secureCookiesEnabled(), path:"/", maxAge:ADMIN_SESSION_MAX_AGE_SECONDS });
  return response;
}
