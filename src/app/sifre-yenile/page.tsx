import { AccountTokenForm } from "@/components/account-token-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <main className="page-shell grid min-h-[70vh] place-items-center"><section className="card w-full max-w-md p-6 sm:p-8"><div className="border-b border-[var(--rule-strong)] pb-4"><p className="eyebrow">Yeni parola</p><h1 className="page-heading mt-1.5">Hesabınızı yeniden güvene alın</h1><p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">Yeni parolanız kaydedildiğinde diğer cihazlardaki açık oturumlar kapatılır.</p></div>{token ? <AccountTokenForm token={token} mode="reset" /> : <p className="mt-6 text-sm text-[var(--st-risk)]">Parola yenileme bağlantısı eksik.</p>}</section></main>;
}
