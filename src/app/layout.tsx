import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE, adminPassword, authEnabled } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manufacturing Diagnosis Engine",
  description: "Önce problemi teşhis et, doğru metodolojiyi öner, uçtan uca uygulat.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Çıkış butonunu oturum çerezinin VARLIĞINA göre göster: "sonlandırılacak bir
  // oturum var mı?" Bu, çerezi istek anında okur — auth durumu build'e gömülmez.
  const cookieStore = await cookies();
  const signedIn = cookieStore.has(SESSION_COOKIE);
  const adminAvailable = cookieStore.has(ADMIN_SESSION_COOKIE) || signedIn || (!authEnabled() && !adminPassword());

  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">Ana içeriğe geç</a>
        <SiteHeader signedIn={signedIn} adminAvailable={adminAvailable} />
        <div id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>{children}</div>
        <footer className="no-print border-t border-slate-200/60 py-6 text-center text-xs text-slate-400 dark:border-slate-800/60">
          Manufacturing Diagnosis Engine · yerel, deterministik karar motoru
        </footer>
      </body>
    </html>
  );
}
