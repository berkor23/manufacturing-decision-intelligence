import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE, adminPassword, authEnabled } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { accountAuthEnabled, currentAccount, USER_SESSION_COOKIE } from "@/lib/account-auth";
import { aiEnabled } from "@/lib/ai-config";
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

const SITE_NAME = "Manufacturing Decision Engine";
const SITE_DESCRIPTION =
  "Üretim problemlerini yapılandıran, ayırt edici sorularla problem karakterini belirleyen ve RCA, DMAIC, 8D, TPM, TOC, VSM, SPC ile diğer metodolojiler arasında açık karar kurallarıyla gerekçeli seçim yapan karar destek sistemi.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.manufacturingdecisionengine.com"),
  title: {
    default: `${SITE_NAME} | Üretim Problemleri için Açıklanabilir Karar Desteği`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "üretim problem çözme", "kök neden analizi", "RCA", "DMAIC", "8D", "FMEA",
    "TPM", "TOC", "VSM", "SPC", "SDCA", "yalın üretim", "sürekli iyileştirme",
    "karar destek sistemi", "manufacturing decision support",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "tr_TR",
    title: `${SITE_NAME} | Üretim Problemleri için Açıklanabilir Karar Desteği`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Açıklanabilir Üretim Karar Desteği`,
    description: SITE_DESCRIPTION,
  },
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
          <DemoBanner aiEnabled={aiEnabled()} />
        )}
        <SiteHeader signedIn={signedIn} adminAvailable={!accountAuthEnabled() && adminAvailable} accountName={account?.name} companyManager={Boolean(account?.organizationId && ["OWNER","ADMIN","MANAGER"].includes(account.role ?? ""))} />
        <div id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>{children}</div>
        <footer className="no-print mt-auto border-t border-[var(--rule)]">
          <div className="mx-auto flex max-w-[78rem] flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-7">
            <p className="text-[11px] text-[var(--muted-2)]">
              <span className="font-semibold tracking-[0.08em] text-[var(--muted)]">MDE</span>
              <span className="mx-2">/</span>
              Manufacturing Decision Engine — açıklanabilir üretim karar desteği
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
