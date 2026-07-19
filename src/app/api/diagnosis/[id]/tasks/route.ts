import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDiagnosisService } from "@/application/wiring";

const schema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("UPDATE"), taskId: z.string(), owner: z.string().nullable().optional(), dueDate: z.string().nullable().optional() }),
  z.object({ operation: z.literal("RESOLVE"), taskId: z.string(), answer: z.string().min(1) }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz bilgi görevi işlemi." }, { status: 400 });
  try {
    const id = (await params).id;
    const view = parsed.data.operation === "RESOLVE"
      ? await getDiagnosisService().resolveInformationTask(id, parsed.data.taskId, parsed.data.answer)
      : await getDiagnosisService().updateInformationTask(id, parsed.data.taskId, { owner: parsed.data.owner, dueDate: parsed.data.dueDate });
    return NextResponse.json(view);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hata" }, { status: 409 });
  }
}
