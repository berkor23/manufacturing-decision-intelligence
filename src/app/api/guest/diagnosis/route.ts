import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DiagnosisService } from "@/application/diagnosis-service";
import type { Conversation } from "@/application/ports/conversation-repository";
import { FEATURE_KEYS } from "@/domain/diagnosis";
import { getProblemParser } from "@/application/wiring";
import { TransientConversationRepository } from "@/infrastructure/persistence/transient-conversation-repository";
import { enforceRateLimit } from "@/lib/rate-limit";

const messageSchema = z.object({
  role: z.enum(["USER", "ASSISTANT", "SYSTEM"]),
  kind: z.enum(["FREE_TEXT", "QUESTION", "ANSWER", "REPORT"]),
  content: z.string().max(12_000),
  featureKey: z.enum(FEATURE_KEYS).nullable().optional(),
  createdAt: z.string().max(40),
});

const conversationSchema = z.object({
  id: z.string().regex(/^local_conv_[a-zA-Z0-9-]+$/),
  status: z.enum(["ACTIVE", "CONCLUDED", "ABANDONED"]),
  structuredProblem: z.object({
    processName: z.string().max(300).nullable(),
    problemDescription: z.string().max(8_000).nullable(),
    features: z.record(z.string(), z.boolean().nullable()),
  }),
  featureSources: z.partialRecord(z.enum(FEATURE_KEYS), z.enum(["PARSER", "USER_CONFIRMED", "USER_ANSWERED", "UNKNOWN"])).optional().default({}),
  questionsAsked: z.number().int().min(0).max(100),
  askedFeatures: z.array(z.enum(FEATURE_KEYS)).max(FEATURE_KEYS.length),
  pendingFeature: z.enum(FEATURE_KEYS).nullable(),
  messages: z.array(messageSchema).max(250),
  result: z.unknown().nullable(),
  informationTasks: z.array(z.unknown()).max(100),
  recommendationChanges: z.array(z.unknown()).max(100),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

const requestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("START"), text: z.string().trim().min(10).max(8_000) }),
  z.object({
    operation: z.literal("ANSWER"),
    text: z.string().trim().min(1).max(4_000),
    state: conversationSchema,
  }),
  z.object({
    operation: z.literal("REVIEW"),
    corrections: z.partialRecord(z.enum(FEATURE_KEYS), z.boolean().nullable()),
    state: conversationSchema,
  }),
]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Misafir teşhis isteği doğrulanamadı." }, { status: 400 });
  }

  // Aynı şirket ağındaki kullanıcıların birbirinin soru kotasını tüketmemesi
  // için devam eden akışlar konuşma kimliğiyle ayrılır. Yeni akış açma sınırı
  // yine IP tabanlıdır; böylece sahte kimliklerle sınırsız başlangıç yapılamaz.
  const limited = parsed.data.operation === "START"
    ? enforceRateLimit(request, "diagnosis-start", "guest")
    : enforceRateLimit(request, "guest-diagnosis", parsed.data.state.id);
  if (limited) return limited;

  try {
    const restored = parsed.data.operation !== "START"
      ? parsed.data.state as Conversation
      : undefined;
    const repository = new TransientConversationRepository(restored);
    const service = new DiagnosisService(repository, getProblemParser());
    const view = parsed.data.operation === "START"
      ? await service.start(parsed.data.text)
      : parsed.data.operation === "ANSWER"
        ? await service.answer(restored!.id, parsed.data.text)
        : await service.reviewFeatures(restored!.id, parsed.data.corrections);

    return NextResponse.json({ view, state: repository.snapshot() }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[guest-diagnosis] calculation failed", error);
    return NextResponse.json({ error: "Teşhis hesaplanamadı. Lütfen yeniden deneyin." }, { status: 500 });
  }
}
