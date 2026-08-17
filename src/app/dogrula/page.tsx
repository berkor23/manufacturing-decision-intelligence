import Link from "next/link";
import { AccountTokenForm } from "@/components/account-token-form";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <main className="page-shell grid min-h-[70vh] place-items-center"><section className="card w-full max-w-md p-6 sm:p-8"><div className="border-b border-[var(--rule-strong)] pb-4"><p className="eyebrow">E-posta doğrulama</p><h1 className="page-heading mt-1.5">Hesabınızı kullanıma açın</h1><p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">Bu adım, hesabın gerçekten size ait e-posta adresiyle oluşturulduğunu doğrular.</p></div>{token ? <AccountTokenForm token={token} mode="verify" /> : <p className="mt-6 text-sm text-[var(--st-risk)]">Doğrulama bağlantısı eksik.</p>}<Link href="/giris" className="mt-5 block text-center text-sm text-[var(--ink)]">Giriş ekranına dön</Link></section></main>;
}
