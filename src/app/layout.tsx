import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE, adminPassword, authEnabled } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { accountAuthEnabled, currentAccount, USER_SESSION_COOKIE } from "@/lib/account-auth";
import "./globals.css";

// Tipografi: IBM Plex. Mühendislik/üretim bağlamına ait, Türkçe için gerekli
// latin-ext (ğ, ş, ı, İ) kapsamı tam ve mono eşi aynı iskeletten türeyen tek
// aile — sayı sütunları ile metin aynı ritmi paylaşır.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MDI · Üretim Problemi Teşhisi ve Uygulama Yönetimi",
  description: "Üretim ve kalite problemlerini sınıflandırın, uygun metodolojiyi gerekçesiyle seçin ve çalışmayı kanıtla kapanana kadar yönetin.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Çıkış butonunu oturum çerezinin VARLIĞINA göre göster: "sonlandırılacak bir
  // oturum var mı?" Bu, çerezi istek anında okur — auth durumu build'e gömülmez.
  const cookieStore = await cookies();
  const account = accountAuthEnabled() ? await currentAccount() : null;
  const signedIn = account ? true : cookieStore.has(SESSION_COOKIE) || cookieStore.has(USER_SESSION_COOKIE);
  const adminAvailable = cookieStore.has(ADMIN_SESSION_COOKIE) || signedIn || (!authEnabled() && !adminPassword());

  return (
    <html
      lang="tr"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">Ana içeriğe geç</a>
        {process.env.NEXT_PUBLIC_DEMO === "1" && (
          <DemoBanner aiEnabled={(process.env.AI_PROVIDER ?? "ollama").toLowerCase() !== "none"} />
        )}
        <SiteHeader signedIn={signedIn} adminAvailable={!accountAuthEnabled() && adminAvailable} accountName={account?.name} companyManager={Boolean(account?.organizationId && ["OWNER","ADMIN","MANAGER"].includes(account.role ?? ""))} />
        <div id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>{children}</div>
        <footer className="no-print mt-auto border-t border-[var(--rule)]">
          <div className="mx-auto flex max-w-[78rem] flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-7">
            <p className="text-[11px] text-[var(--muted-2)]">
              <span className="font-semibold tracking-[0.08em] text-[var(--muted)]">MDI</span>
              <span className="mx-2">/</span>
              Üretim problemi teşhisi ve uygulama yönetimi
            </p>
            <Link
              href="/gizlilik"
              className="text-[11px] text-[var(--muted)] underline decoration-[var(--rule-strong)] underline-offset-[3px] hover:text-[var(--ink)] hover:decoration-[var(--ink)]"
            >
              Veri ve gizlilik
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
