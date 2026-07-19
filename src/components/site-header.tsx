"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Pano", short: "Pano" },
  { href: "/gorevler", label: "Görevler", short: "Görev" },
  { href: "/calismalar", label: "Çalışmalar", short: "Çalışma" },
  { href: "/aktarim", label: "Aktarım", short: "Aktar" },
];

function LogoMark() {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-sm shadow-indigo-500/20"><svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M3 12h4l2 5 4-12 2 7h6" /></svg></span>;
}

export function SiteHeader({ signedIn, adminAvailable }: { signedIn: boolean; adminAvailable: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
  return <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-white/92 shadow-[0_1px_12px_rgba(15,23,42,.035)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/92">
    <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
      <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-xl" aria-label="Manufacturing Diagnosis Engine ana sayfa">
        <LogoMark />
        <span className="hidden min-w-0 sm:block"><strong className="block truncate text-sm tracking-tight">Manufacturing Diagnosis Engine</strong><small className="block truncate text-[10px] font-medium text-slate-400">Problem teşhisi ve uygulama yönetimi</small></span>
        <span className="text-sm font-bold sm:hidden">MDI</span>
      </Link>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Ana navigasyon">
        {LINKS.map((item) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={`btn ${active(item.href) ? "nav-active" : "btn-ghost"}`}>{item.label}</Link>)}
        {adminAvailable && <Link href="/admin" aria-current={active('/admin') ? "page" : undefined} className={`btn ${active('/admin') ? 'nav-active' : 'btn-ghost'}`}>Admin</Link>}
        {signedIn && <form action="/api/auth/logout" method="post"><button className="btn btn-ghost">Çıkış</button></form>}
        <Link href="/diagnoz" className="btn btn-primary">+ Yeni teşhis</Link>
      </nav>
      <Link href="/diagnoz" className="btn btn-primary mobile-cta">+ Teşhis</Link>
    </div>
    <nav className="scroll-fade flex overflow-x-auto border-t border-slate-100 px-3 py-1 md:hidden dark:border-slate-800" aria-label="Mobil navigasyon">
      {LINKS.map((item) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={`workspace-tab flex-1 justify-center ${active(item.href) ? "workspace-tab-active" : ""}`}>{item.short}</Link>)}
      {adminAvailable && <Link href="/admin" aria-current={active("/admin") ? "page" : undefined} className={`workspace-tab flex-1 justify-center ${active("/admin") ? "workspace-tab-active" : ""}`}>Admin</Link>}
    </nav>
  </header>;
}
