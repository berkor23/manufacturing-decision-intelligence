import Link from "next/link";
import { AccountAccessForm } from "@/components/account-access-form";
import { accountAuthEnabled } from "@/lib/account-auth";
import { authEnabled } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Giriş · MDE" };

export default function LoginPage() {
  // Üçüncü durum: ne hesap sistemi ne de APP_PASSWORD var (açık demo).
  // Girilecek bir kapı yokken parola kutusu göstermek, doldurulduğunda hiçbir
  // şey yapmayan bir form sunmak demekti.
  if (!accountAuthEnabled() && !authEnabled()) {
    return (
      <main className="page-shell grid min-h-[70vh] place-items-center">
        <section className="card w-full max-w-lg p-6 sm:p-8">
          <div className="border-b border-[var(--rule-strong)] pb-4">
            <p className="eyebrow">Erişim</p>
            <h1 className="page-heading mt-1.5">Giriş gerekmiyor</h1>
          </div>

          <div className="alert alert-ok mt-5">
            Bu kurulumda oturum açmanıza gerek yok — uygulamanın tamamı
            doğrudan açık.
          </div>

          <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
            Hesap sistemi (bireysel ve şirket hesapları, roller, davet) bu demo
            dağıtımında devre dışı. Kayıtlar herkese açıktır ve sıfırlanabilir.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--rule)] pt-5">
            <Link href="/diagnoz" className="btn btn-primary">
              Teşhise başla
            </Link>
            <Link href="/yerel-calismalar" className="btn">
              Yerel çalışmalarım
            </Link>
          </div>
        </section>
      </main>
    );
  }

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
