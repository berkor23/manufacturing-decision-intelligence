import type { MethodologyWorkspace } from "@/application/ports/methodology-workspace-repository";
import { METHODOLOGY_META } from "./diagnosis";
import { fieldImportance, fieldQualityIssue, getPlaybook, stepIsComplete } from "./playbook";
import { fieldQualityFindings } from "./field-readiness";

export type WorkspaceReportKind = "INTERIM" | "OFFICIAL";

const statusLabel = (status?: string) => ({
  VERIFIED: "Doğrulandı", DONE: "Doğrulandı", SKIPPED: "Gerekçeli atlandı",
  READY: "İncelemeye hazır", IN_PROGRESS: "Devam ediyor", PENDING: "Başlanmadı",
}[status ?? "PENDING"] ?? status ?? "Başlanmadı");

function formatValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value.flatMap((row, index) => {
    if (!row || typeof row !== "object") return [];
    const cells = Object.entries(row as Record<string, unknown>)
      .filter(([, cell]) => String(cell ?? "").trim())
      .map(([key, cell]) => `${key}: ${String(cell).trim()}`)
      .join("; ");
    return cells ? [`${index + 1}. ${cells}`] : [];
  }).join("\n");
}

export function officialReportBlockers(workspace: MethodologyWorkspace): string[] {
  const blockers: string[] = [];
  if (workspace.closureStatus !== "CLOSED") blockers.push("Çalışmanın yaşam döngüsü ‘Kapalı’ durumunda değil.");
  const incomplete = workspace.steps.filter((step) => !stepIsComplete(step.status)).length;
  if (incomplete) blockers.push(`${incomplete} metodoloji adımı doğrulanmadı veya gerekçeli kapatılmadı.`);
  const blockingFindings = fieldQualityFindings(workspace).filter((finding) => finding.severity === "BLOCKING");
  blockers.push(...blockingFindings.map((finding) => finding.title));
  const approvals = workspace.approvals ?? [];
  if (!approvals.length || approvals.some((approval) => approval.status !== "APPROVED" || !approval.name.trim())) {
    blockers.push("Gerekli kalite ve proses sahibi onayları tamamlanmadı.");
  }
  return Array.from(new Set(blockers));
}

export function generateWorkspaceReport(workspace: MethodologyWorkspace, kind: WorkspaceReportKind): string {
  const officialBlockers = officialReportBlockers(workspace);
  if (kind === "OFFICIAL" && officialBlockers.length) throw new Error(`Resmî rapor henüz üretilemez: ${officialBlockers.join(" ")}`);

  const playbook = getPlaybook(workspace.methodology);
  const completed = workspace.steps.filter((step) => stepIsComplete(step.status)).length;
  const criticalGaps: string[] = [];
  const stepSections = playbook.steps.map((definition, index) => {
    const state = workspace.steps.find((item) => item.key === definition.key);
    const populated = definition.fields.flatMap((field) => {
      const value = state?.values[field.key];
      const issue = fieldQualityIssue(field, value);
      if (issue && fieldImportance(field) !== "OPTIONAL") criticalGaps.push(`${definition.name} / ${field.label}: ${issue}`);
      const output = formatValue(value);
      return output ? [`### ${field.label}\n${output}`] : [];
    });
    const justification = typeof state?.values.__completionJustification === "string" && state.values.__completionJustification.trim()
      ? `\n\n**Uygulanmama / eksik alan gerekçesi:** ${state.values.__completionJustification.trim()}` : "";
    return `## ${index + 1}. ${definition.name}\n\n**Durum:** ${statusLabel(state?.status)}\n\n${definition.objective}${populated.length ? `\n\n${populated.join("\n\n")}` : "\n\n_Bu adımda rapora aktarılacak kayıt bulunmuyor."}${justification}`;
  }).join("\n\n---\n\n");

  const feedback = workspace.recommendationFeedback;
  const recommended = METHODOLOGY_META[feedback?.recommendedMethodology ?? workspace.methodology].name;
  const applied = workspace.methodologyName;
  const requiredFormat = workspace.methodSelectionContext?.requiredFormat?.trim() || "Kurumsal veya müşteri formatı belirtilmedi";
  const selectionReason = feedback?.reason?.trim() || "Uygulanan yöntem için ayrıca uzman gerekçesi kaydedilmedi.";
  const warnings = kind === "INTERIM" && (criticalGaps.length || officialBlockers.length)
    ? `\n\n## Tamamlanmadan önce açık kalanlar\n\n${[...criticalGaps, ...officialBlockers].map((gap) => `- ${gap}`).join("\n")}` : "";
  const actions = (workspace.actions ?? []).filter((item) => item.action.trim()).map((item, index) =>
    `${index + 1}. **${item.action}** — Sorumlu: ${item.owner || "Belirtilmedi"}; durum: ${item.status}; başarı ölçütü: ${item.successMetric || "Belirtilmedi"}; gerçekleşen: ${item.actual || "Henüz girilmedi"}`,
  ).join("\n");
  const metrics = (workspace.metrics ?? []).filter((item) => item.name.trim()).map((item) =>
    `- **${item.name}:** başlangıç ${item.baseline || "—"}; hedef ${item.target || "—"}; gerçekleşen ${item.actual || "—"}`,
  ).join("\n");
  const evidence = (workspace.evidence ?? []).filter((item) => item.title.trim()).map((item) =>
    `- **${item.title}** — Kaynak: ${item.source || "Belirtilmedi"}. Bulgu: ${item.finding || "Belirtilmedi"}`,
  ).join("\n");
  const claims = (workspace.claims ?? []).filter((item) => item.statement.trim()).map((item) =>
    `- **${item.kind} / ${item.status}:** ${item.statement} (${item.evidenceIds.length} kanıt bağlantısı)`,
  ).join("\n");

  return `# ${applied} Uygulama Raporu — ${kind === "OFFICIAL" ? "Resmî kapanış" : "Ara durum"}\n\n> Rapor sınıfı: **${kind === "OFFICIAL" ? "RESMÎ / kapanış kapıları tamamlandı" : "ARA DURUM / çalışma devam edebilir"}**\n\n## Yönetici özeti\n\n**Problem:** ${workspace.problemDescription}\n\n**İlerleme:** ${completed}/${workspace.steps.length} adım tamamlandı.\n\n**Yaşam döngüsü:** ${workspace.closureStatus}\n\n## Teşhis ve yöntem seçimi\n\n- **Teşhis motorunun önerdiği yöntem:** ${recommended}\n- **Sahada uygulanan yöntem:** ${applied}\n- **Zorunlu kurumsal / müşteri formatı:** ${requiredFormat}\n- **Uzman kararı veya yöntem değişikliği gerekçesi:** ${selectionReason}\n\nBu ayrım, teknik analiz yönteminin müşteri tarafından istenen rapor formatıyla aynı şeymiş gibi gösterilmesini önler.${warnings}\n\n## Metodoloji uygulama kaydı\n\n${stepSections}${actions ? `\n\n## Aksiyon planı\n\n${actions}` : ""}${metrics ? `\n\n## Ölçüm sonuçları\n\n${metrics}` : ""}${claims ? `\n\n## İddialar ve doğrulama durumu\n\n${claims}` : ""}${evidence ? `\n\n## Kanıt dizini\n\n${evidence}` : ""}\n\n## Kapanış değerlendirmesi\n\nMevcut durum **${workspace.closureStatus}**.${workspace.monitoring ? ` İzlenen ölçüt: ${workspace.monitoring.metric || "Belirtilmedi"}; sorumlu: ${workspace.monitoring.owner || "Belirtilmedi"}; sonuç: ${workspace.monitoring.result}.` : " İzleme planı henüz kaydedilmedi."}`;
}
