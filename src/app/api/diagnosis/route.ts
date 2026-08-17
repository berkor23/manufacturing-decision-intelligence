import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDiagnosisService } from "@/application/wiring";
import { accountAuthEnabled, accountFromRequest, recordActivity } from "@/lib/account-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { PROBLEM_TEXT_MAX, PROBLEM_TEXT_MIN, PROBLEM_TEXT_TOO_LONG, PROBLEM_TEXT_TOO_SHORT } from "@/domain/diagnosis";

const bodySchema = z.object({
  text: z.string().trim().min(PROBLEM_TEXT_MIN, PROBLEM_TEXT_TOO_SHORT).max(PROBLEM_TEXT_MAX, PROBLEM_TEXT_TOO_LONG),
});

// POST /api/diagnosis — yeni teşhis başlat
export async function POST(req: NextRequest) {
  const account = accountAuthEnabled() ? await accountFromRequest(req) : null;
  if (accountAuthEnabled() && !account) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const limited = enforceRateLimit(req, "diagnosis-start");
  if (limited) return limited;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 },
    );
  }

  try {
    // Sahiplik oluşturmanın parçasıdır: kayıt ve sahibi aynı yazımda kalıcılaşır.
    const view = await getDiagnosisService().start(
      parsed.data.text,
      account ? { ownerUserId: account.userId, organizationId: account.organizationId } : undefined,
    );
    if (account) {
      await recordActivity({ account, type: "DIAGNOSIS_STARTED", summary: "Yeni problem teşhisi başlatıldı." });
    }
    return NextResponse.json(view, { status: 201 });
  } catch (err) {
    // Ham hata metni sağlayıcı adresi, model adı veya yığın izi sızdırabilir.
    console.error("[diagnosis] start failed", err);
    return NextResponse.json({ error: "Teşhis başlatılamadı." }, { status: 500 });
  }
}
