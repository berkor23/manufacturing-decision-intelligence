"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MEMBER_LINKS = [
  { href: "/dashboard", label: "Pano" },
  { href: "/gorevler", label: "Görevler" },
  { href: "/calismalar", label: "Çalışmalar" },
];

const GUEST_LINKS = [
  { href: "/#ornek-teshis", label: "Örnek teşhis" },
  { href: "/#nasil-calisir", label: "Karar nasıl oluşuyor?" },
  { href: "/#yontemler", label: "Yöntemler" },
  { href: "/yerel-calismalar", label: "Yerel çalışmalarım" },
  { href: "/en", label: "EN" },
];

/**
 * Marka işareti: ölçüm penceresi içinde bir sinyal izi. Tek renk (currentColor)
 * — açık ve koyu temada aynı çizim, ayrı bir "marka rengi" yok.
 */
function LogoMark() {
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center border border-[var(--ink)] text-[var(--ink)]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor">
        <path d="M2 13.5h3.2L7.6 6l2.8 8 2-4.5h3.6" strokeWidth="1.6" strokeLinejoin="miter" />
      </svg>
    </span>
  );
}

export function SiteHeader({
  signedIn,
  adminAvailable,
  accountName,
  companyManager,
}: {
  signedIn: boolean;
  adminAvailable: boolean;
  accountName?: string | null;
  companyManager?: boolean;
}) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
  const accountHref = companyManager ? "/sirket" : "/hesabim";

  return (
    <header className="no-print sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--surface)]">
      <div className="mx-auto flex min-h-14 max-w-[78rem] items-center justify-between gap-4 px-4 sm:px-7">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="Manufacturing Decision Engine ana sayfa"
        >
          <LogoMark />
          <span className="hidden min-w-0 sm:block">
            <strong className="block truncate text-[13px] font-semibold leading-tight tracking-[-0.012em]">
              Manufacturing Decision Engine
            </strong>
            <small className="block truncate text-[10px] leading-tight text-[var(--muted-2)]">
              Açıklanabilir üretim karar desteği
            </small>
          </span>
          <span className="font-mono text-[13px] font-semibold tracking-[0.06em] sm:hidden">MDE</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Ana navigasyon">
          {(signedIn ? MEMBER_LINKS : GUEST_LINKS).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={`btn ${active(item.href) ? "nav-active" : "btn-ghost"}`}
            >
              {item.label}
            </Link>
          ))}

          {adminAvailable && (
            <Link
              href="/admin"
              aria-current={active("/admin") ? "page" : undefined}
              className={`btn ${active("/admin") ? "nav-active" : "btn-ghost"}`}
            >
              Admin
            </Link>
          )}

          {/* Hesap bölgesi, gezinme bağlantılarından dikey cetvelle ayrılır. */}
          {(accountName || signedIn || !signedIn) && (
            <span className="mx-1.5 h-5 w-px bg-[var(--rule)]" aria-hidden="true" />
          )}

          {accountName && (
            <Link
              href={accountHref}
              className={`btn ${active(accountHref) ? "nav-active" : "btn-ghost"}`}
            >
              {accountName.split(" ")[0]}
            </Link>
          )}
          {signedIn && (
            <form action={accountName ? "/api/account/logout" : "/api/auth/logout"} method="post">
              <button className="btn btn-ghost">Çıkış</button>
            </form>
          )}
          {!signedIn && (
            <>
              <Link href="/giris" className="btn btn-ghost">Giriş yap</Link>
              <Link href="/kayit" className="btn btn-secondary">Üye ol</Link>
            </>
          )}
          <Link href="/diagnoz" className="btn btn-primary ml-1">
            {signedIn ? "Yeni teşhis" : "Üye olmadan dene"}
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Link href="/diagnoz" className="btn btn-primary">
            {signedIn ? "Yeni teşhis" : "Dene"}
          </Link>
          <details className="mobile-menu relative">
            <summary className="btn btn-secondary" aria-label="Menüyü aç">Menü</summary>
            <nav
              className="absolute right-0 top-11 z-40 grid min-w-56 gap-px border border-[var(--rule-strong)] bg-[var(--surface)] p-1"
              aria-label="Mobil navigasyon"
            >
              {(signedIn ? MEMBER_LINKS : GUEST_LINKS).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-[13px] text-[var(--ink-soft)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              ))}
              {accountName && (
                <Link
                  href={accountHref}
                  className="border-t border-[var(--rule)] px-3 py-2 text-[13px] text-[var(--ink-soft)] hover:bg-[var(--surface-sunk)]"
                >
                  Hesabım
                </Link>
              )}
              {!signedIn && (
                <>
                  <Link
                    href="/giris"
                    className="border-t border-[var(--rule)] px-3 py-2 text-[13px] text-[var(--ink-soft)] hover:bg-[var(--surface-sunk)]"
                  >
                    Giriş yap
                  </Link>
                  <Link
                    href="/kayit"
                    className="bg-[var(--ink)] px-3 py-2 text-[13px] font-semibold text-[var(--on-ink)]"
                  >
                    Üye ol
                  </Link>
                </>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
