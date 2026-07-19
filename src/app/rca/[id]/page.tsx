import { RcaWorkspace } from "@/components/rca-workspace";

export default async function RcaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RcaWorkspace id={id} />;
}
