import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceService } from "@/application/wiring";

const schema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("CLOSE") }),
  z.object({ operation: z.literal("MONITOR"), result: z.enum(["PASSED", "FAILED"]) }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz yaşam döngüsü işlemi." }, { status: 400 });
  try {
    const id = (await params).id;
    const ws = parsed.data.operation === "CLOSE"
      ? await getWorkspaceService().close(id)
      : await getWorkspaceService().monitor(id, parsed.data.result);
    return NextResponse.json(ws);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hata" }, { status: 409 });
  }
}
