import Link from "next/link";
import { AccountAccessForm } from "@/components/account-access-form";
import { accountAuthEnabled } from "@/lib/account-auth";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Giriş · MDI" };

export default function LoginPage() {
  if (!accountAuthEnabled()) {
    return (
      <main className="page-shell grid min-h-[70vh] place-items-center">
        <section className="card w-full max-w-md p-6 sm:p-7">
          <div className="border-b border-[var(--rule-strong)] pb-4">
            <p className="eyebrow">Yerel erişim</p>
            <h1 className="page-heading mt-1.5">Uygulamaya giriş</h1>
          </div>
          <div className="mt-5">
            <LoginForm />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell grid min-h-[70vh] place-items-center">
      <section className="card w-full max-w-lg p-6 sm:p-8">
        <div className="border-b border-[var(--rule-strong)] pb-4">
          <p className="eyebrow">Hesabınıza dönün</p>
          <h1 className="page-heading mt-1.5">Kaldığınız yerden devam edin</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            Çalışmalarınız, görevleriniz ve doğrulama kayıtlarınız hesabınızla birlikte korunur.
          </p>
        </div>

        <AccountAccessForm mode="login" />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--rule)] pt-4 text-[12px]">
          <Link
            href="/sifremi-unuttum"
            className="text-[var(--muted)] underline decoration-[var(--rule-strong)] underline-offset-[3px] hover:text-[var(--ink)] hover:decoration-[var(--ink)]"
          >
            Parolamı unuttum
          </Link>
          <p className="text-[var(--muted)]">
            İlk kez mi geliyorsunuz?{" "}
            <Link
              href="/kayit"
              className="font-medium text-[var(--ink)] underline decoration-[var(--rule-strong)] underline-offset-[3px] hover:decoration-[var(--ink)]"
            >
              Hesap oluşturun
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
