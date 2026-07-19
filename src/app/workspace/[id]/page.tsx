import { MethodologyWorkspace } from "@/components/methodology-workspace";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MethodologyWorkspace id={id} />;
}
