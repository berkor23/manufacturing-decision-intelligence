import { MethodologyWorkspace } from "@/components/methodology-workspace";
import { aiEnabled } from "@/lib/ai-config";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Sağlayıcı durumu yalnız sunucuda bilinir; arayüz AI vaat eden düğmeleri
  // buna göre gösterir.
  return <MethodologyWorkspace id={id} aiEnabled={aiEnabled()} />;
}
