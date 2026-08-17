import { GuestWorkspaceList } from "@/components/guest-workspace-list";

export const metadata = { title: "Yerel Çalışmalarım · MDI" };

export default function LocalWorkspacesPage() {
  return <main className="page-shell flex-1"><p className="eyebrow">Misafir çalışma alanı</p><h1 className="page-heading mt-1">Bu tarayıcıdaki çalışmalarınız</h1><p className="page-lead mb-6">Hesap açmadan başlattığınız çalışmalar yalnızca bu tarayıcıda saklanır.</p><GuestWorkspaceList /></main>;
}
