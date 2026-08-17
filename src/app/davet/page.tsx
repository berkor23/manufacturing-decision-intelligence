import { AccountTokenForm } from "@/components/account-token-form";

export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <main className="page-shell grid min-h-[70vh] place-items-center"><section className="card w-full max-w-md p-6 sm:p-8"><div className="border-b border-[var(--rule-strong)] pb-4"><p className="eyebrow">Şirket daveti</p><h1 className="page-heading mt-1.5">Ekibiniz sizi bekliyor</h1><p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">Kişisel parolanızı belirlediğinizde şirket çalışma alanına katılırsınız. Bu bağlantı yalnız bir kez kullanılabilir.</p></div>{token ? <AccountTokenForm token={token} mode="invite" /> : <p className="mt-6 text-sm text-[var(--st-risk)]">Davet bağlantısı eksik.</p>}</section></main>;
}
