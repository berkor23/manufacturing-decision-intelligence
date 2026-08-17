import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRcaRepository } from "@/application/wiring";
import { accountAuthEnabled, accountFromRequest } from "@/lib/account-auth";

const bodySchema = z.object({
  conversationId: z.string().optional(),
  problemDescription: z.string().min(1, "Problem açıklaması gerekli."),
});

// POST /api/rca — yeni RCA çalışma alanı oluştur
export async function POST(req: NextRequest) {
  const account = accountAuthEnabled() ? await accountFromRequest(req) : null;
  if (accountAuthEnabled() && !account) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 },
    );
  }
  // Sahiplik olmadan kayıt hiçbir hesaba bağlanmaz ve erişim kontrolü kapanır;
  // bu yüzden kayıtla AYNI yazımda verilir.
  const ws = await getRcaRepository().create(
    {
      conversationId: parsed.data.conversationId ?? null,
      problemDescription: parsed.data.problemDescription,
    },
    account ? { ownerUserId: account.userId, organizationId: account.organizationId } : undefined,
  );
  return NextResponse.json(ws, { status: 201 });
}
