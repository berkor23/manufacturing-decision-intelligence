// Kapı bekçisi (Next 16: "middleware" → "proxy"): APP_PASSWORD tanımlıysa tüm
// sayfa ve API isteklerinde geçerli oturum çerezi arar. Tanımlı değilse hiçbir
// şey yapmaz (auth kapalı, out-of-box kurulum bozulmaz).
//
// Not: Proxy, Next 16'da varsayılan olarak Node.js runtime'ında çalışır — bu
// yüzden APP_PASSWORD çalışma anında okunur (build'e gömülmez) ve parola
// değişince yeniden derleme gerekmez. `runtime` seçeneği Proxy'de KULLANILAMAZ.

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE, adminPassword, authEnabled, isValidAdminSession, isValidSession } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

const PUBLIC_PATHS = ["/giris", "/api/auth/login", "/api/auth/logout", "/admin/giris", "/api/admin/login", "/api/admin/logout"];

export async function proxy(req: NextRequest) {
  if (!authEnabled() && !adminPassword()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
    const allowed = await isValidAdminSession(req.cookies.get(ADMIN_SESSION_COOKIE)?.value, req.cookies.get(SESSION_COOKIE)?.value);
    if (allowed) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Yönetici oturumu gerekli." }, { status: 403 });
    const adminLogin = req.nextUrl.clone();
    adminLogin.pathname = "/admin/giris";
    adminLogin.search = "";
    return NextResponse.redirect(adminLogin);
  }

  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  // API: yönlendirme değil, dürüst 401.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/giris";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}
