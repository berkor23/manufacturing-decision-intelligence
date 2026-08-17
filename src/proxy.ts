// Kapı bekçisi (Next 16: "middleware" → "proxy"): APP_PASSWORD tanımlıysa tüm
// sayfa ve API isteklerinde geçerli oturum çerezi arar. Tanımlı değilse hiçbir
// şey yapmaz (auth kapalı, out-of-box kurulum bozulmaz).
//
// Not: Proxy, Next 16'da varsayılan olarak Node.js runtime'ında çalışır — bu
// yüzden APP_PASSWORD çalışma anında okunur (build'e gömülmez) ve parola
// değişince yeniden derleme gerekmez. `runtime` seçeneği Proxy'de KULLANILAMAZ.

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE, adminPassword, authEnabled, isValidAdminSession, isValidSession } from "@/lib/auth";
import { USER_SESSION_COOKIE, accountAuthEnabled, accountFromToken, canAccessWorkspace, canEditWorkspace, canAccessDiagnosis, canAccessRca, isAllowedMutationOrigin } from "@/lib/account-auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

const PUBLIC_PATHS = ["/", "/giris", "/kayit", "/diagnoz", "/yerel-calismalar", "/gizlilik", "/nasil-calisir", "/dogrula", "/davet", "/dogrulama-bekliyor", "/sifremi-unuttum", "/sifre-yenile", "/api/guest", "/api/guide", "/api/auth/login", "/api/auth/logout", "/api/account/login", "/api/account/register", "/api/account/verify", "/api/account/verification", "/api/account/password/request", "/api/account/password/reset", "/api/account/invitation/accept", "/admin/giris", "/api/admin/login", "/api/admin/logout", "/api/health"];

function isPublicPath(pathname: string) {
  return pathname.startsWith("/workspace/local_ws_") || PUBLIC_PATHS.some((path) =>
    pathname === path || (path !== "/" && pathname.startsWith(path + "/")),
  );
}

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF: durum değiştiren her API isteği aynı kaynaktan gelmeli. Hesap
  // route'ları bunu kendi içinde de kontrol ediyor; burada tek noktadan
  // uygulanması, kontrolü olmayan route'ları (workspace, diagnosis, rca)
  // da kapsar. SameSite=lax tek başına multipart/form gönderimlerini durdurmaz.
  if (pathname.startsWith("/api/") && !SAFE_METHODS.includes(req.method) && !isAllowedMutationOrigin(req)) {
    return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  }

  if (accountAuthEnabled()) {
    if (isPublicPath(pathname)) return NextResponse.next();
    if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
      const allowed = await isValidAdminSession(req.cookies.get(ADMIN_SESSION_COOKIE)?.value, req.cookies.get(SESSION_COOKIE)?.value);
      if (allowed) return NextResponse.next();
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Platform yöneticisi oturumu gerekli." }, { status: 403 });
      const url = req.nextUrl.clone(); url.pathname = "/admin/giris"; url.search = ""; return NextResponse.redirect(url);
    }
    // Çerezin VARLIĞI değil, GEÇERLİLİĞİ aranır. `has()` ile yetinmek, sahte bir
    // `mdi_user_session` çerezinin kapıdan geçmesi anlamına geliyordu.
    const account = await accountFromToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    if (!account) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
      const url = req.nextUrl.clone(); url.pathname = "/giris"; url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`; return NextResponse.redirect(url);
    }

    const workspaceMatch = pathname.match(/^\/(?:api\/)?workspace\/(ws_[^/]+)/);
    if (workspaceMatch) {
      if (!(await canAccessWorkspace(account, workspaceMatch[1]))) {
        if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Bu çalışmaya erişiminiz yok." }, { status: 403 });
        const url = req.nextUrl.clone(); url.pathname = "/calismalar"; url.search = ""; return NextResponse.redirect(url);
      }
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !(await canEditWorkspace(account, workspaceMatch[1]))) {
        return NextResponse.json({ error: "Bu çalışma için yalnızca görüntüleme yetkiniz var." }, { status: 403 });
      }
    }
    const diagnosisMatch = pathname.match(/^\/api\/diagnosis\/(conv_[^/]+)/);
    if (diagnosisMatch && !(await canAccessDiagnosis(account, diagnosisMatch[1]))) {
      return NextResponse.json({ error: "Bu teşhis kaydına erişiminiz yok." }, { status: 403 });
    }
    const rcaMatch = pathname.match(/^\/(?:api\/)?rca\/(rca_[^/]+)/);
    if (rcaMatch && !(await canAccessRca(account, rcaMatch[1]))) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Bu RCA kaydına erişiminiz yok." }, { status: 403 });
      const url = req.nextUrl.clone(); url.pathname = "/calismalar"; url.search = ""; return NextResponse.redirect(url);
    }
    if (pathname === "/dashboard") {
      const url = req.nextUrl.clone(); url.pathname = "/hesabim"; return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (!authEnabled() && !adminPassword()) return NextResponse.next();

  if (isPublicPath(pathname)) {
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
