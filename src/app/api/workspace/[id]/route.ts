import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceService } from "@/application/wiring";
import { workspacePatchSchema as patchSchema } from "@/application/workspace-patch-schema";
/*
const legacyPatchSchema = z.object({
  steps: z
    .array(
      z.object({
        key: z.string(),
        status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]),
        values: z.record(z.string(), fieldValueSchema),
      }),
    )
    .optional(),
  actions: z
    .array(
      z.object({
        action: z.string(),
        owner: z.string().nullable(),
        id: z.string().optional(),
        status: z.enum(["OPEN", "IN_PROGRESS", "IMPLEMENTED", "EFFECTIVENESS_DUE", "EFFECTIVE", "INEFFECTIVE", "DONE"]),
        dueDate: z.string().nullable().optional(),
        targetCauseId: z.string().nullable().optional(),
        successMetric: z.string().optional(),
        baseline: z.string().optional(),
        target: z.string().optional(),
        actual: z.string().optional(),
        verificationDueDate: z.string().nullable().optional(),
        evidenceIds: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  evidence: looseArray.optional(),
  claims: looseArray.optional(),
  metrics: looseArray.optional(),
  links: looseArray.optional(),
  approvals: looseArray.optional(),
  monitoring: z.record(z.string(), z.unknown()).nullable().optional(),
  closureStatus: z.enum(["OPEN", "CLOSURE_CANDIDATE", "MONITORING", "CLOSED", "REOPENED"]).optional(),
  closedAt: z.string().nullable().optional(),
  reopenCount: z.number().int().nonnegative().optional(),
  specialty: z.record(z.string(), z.unknown()).optional(),
  redTeamReviews: looseArray.optional(),
  horizontalTargets: looseArray.optional(),
  attachments: looseArray.optional(),
  systemDocuments: looseArray.optional(),
  containmentControls: looseArray.optional(),
  learningDecision: z.record(z.string(), z.unknown()).optional(),
  weakSignals: looseArray.optional(),
  dailyManagement: looseArray.optional(),
  kaizenExperiments: looseArray.optional(),
  oplLessons: looseArray.optional(),
  controlBurden: looseArray.optional(),
  contextContract: z.record(z.string(), z.string()).optional(),
  systemBehaviorAnalyses: looseArray.optional(),
  qmsHealth: looseArray.optional(),
  gembaBehaviorMap: looseArray.optional(),
  benchmarkReferences: looseArray.optional(),
  capacityScenarios: looseArray.optional(),
  sopScenarios: looseArray.optional(),
  lineBalanceStudies: looseArray.optional(),
  advancedAnalyses: looseArray.optional(),
  report: z.string().nullable().optional(),
}); */

// GET /api/workspace/{id}
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ws = await getWorkspaceService().get(id);
  if (!ws) return NextResponse.json({ error: "Çalışma alanı bulunamadı." }, { status: 404 });
  return NextResponse.json(ws);
}

// PATCH /api/workspace/{id}
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0] ? `${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}` : "Geçersiz istek." },
      { status: 400 },
    );
  }
  const ws = await getWorkspaceService().update(id, parsed.data as Parameters<ReturnType<typeof getWorkspaceService>["update"]>[1]);
  if (!ws) return NextResponse.json({ error: "Çalışma alanı bulunamadı." }, { status: 404 });
  return NextResponse.json(ws);
}
