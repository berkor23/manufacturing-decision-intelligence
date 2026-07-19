import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Giriş · Manufacturing Diagnosis Engine" };

// ZORUNLU: auth durumu ÇALIŞMA ANINDA okunmalı. Statik prerender edilirse
// build anındaki APP_PASSWORD durumu sayfaya gömülür; parola build'de yokken
// çalışırken varsa `redirect("/")` donar ve /giris → / → /giris döngüsü oluşur
// (kimse giriş yapamaz).
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Auth kapalıysa giriş sayfası anlamsız.
  if (!authEnabled()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <div className="card p-7">
        <p className="eyebrow">İç araç · Erişim</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Giriş</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Bu araç ekip içi kullanım içindir. Devam etmek için parolayı gir.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
