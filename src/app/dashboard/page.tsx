import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkspaceService } from "@/application/wiring";
import { accountAuthEnabled, allowedWorkspaceIds, currentAccount } from "@/lib/account-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karar Panosu · Manufacturing Diagnosis Engine" };

/** Pano metrikleri yalnız hesabın erişebildiği çalışmalardan hesaplanır. */
async function tenantScope() {
  if (!accountAuthEnabled()) return undefined;
  const account = await currentAccount();
  if (!account) redirect("/giris?next=/dashboard");
  return allowedWorkspaceIds(account);
}

import { ReadoutGroup, type ReadoutItem } from "@/components/readout";

type Metric = ReadoutItem;

// Arayüz metinleri Türkçe: liste ham enum ("REOPENED") yerine etiket gösterir.
const CLOSURE_LABEL: Record<string, string> = {
  OPEN: "Açık",
  CLOSURE_CANDIDATE: "Kapanış adayı",
  MONITORING: "İzlemede",
  CLOSED: "Kapalı",
  REOPENED: "Yeniden açıldı",
};

export default async function DashboardPage() {
  const d = await getWorkspaceService().dashboard(await tenantScope());

  const delivery: Metric[] = [
    { label: "Açık çalışma", value: d.open, detail: "Kapanış veya izleme bekleyen", tone: "info" },
    { label: "Etkinlik bekliyor", value: d.effectivenessDue, detail: "Uygulanmış fakat doğrulanmamış", tone: "warn" },
    { label: "Kanıtsız iddia", value: d.unverifiedClaims, detail: "Doğrulama zincirindeki açık", tone: "risk" },
    { label: "Yeniden açılan", value: d.reopened, detail: "İzlemede tekrar eden vaka", tone: "risk" },
  ];
  const prevention: Metric[] = [
    { label: "Açık zayıf sinyal", value: d.weakSignalsOpen, detail: "Triyaj veya doğrulama bekliyor", tone: "warn" },
    { label: "Aktif Kaizen", value: d.kaizenActive, detail: "Deney ve ölçüm çevriminde", tone: "info" },
    { label: "Geçici kontrol", value: d.temporaryControls, detail: "Kalıcı önlem veya kaldırma bekliyor", tone: "warn" },
    { label: "OPL yetkinlik", value: d.oplCompetencyDue, detail: "Yetkinlik doğrulaması bekliyor", tone: "warn" },
  ];
  const system: Metric[] = [
    { label: "Kritik QMS", value: d.qmsCritical, detail: "Sistem müdahalesi gerekiyor", tone: "risk" },
    { label: "Gemba fırsatı", value: d.gembaOpportunities, detail: "Hata veya telafi noktası", tone: "info" },
    { label: "Kapasite açığı", value: d.infeasibleCapacityScenarios, detail: "Talebi karşılamayan senaryo", tone: "risk" },
    { label: "S&OP hedef sapması", value: d.sopTargetMisses, detail: "Hizmet hedefi karşılanmıyor", tone: "warn" },
    { label: "Aşırı yüklü hat", value: d.overloadedLineStudies, detail: "Taktı aşan istasyon", tone: "risk" },
    { label: "İleri analiz inceleme", value: d.advancedReviewsDue, detail: "Eksik veya taslak analiz", tone: "warn" },
    { label: "Bağlamı hazır", value: d.contextContractsReady, detail: "Sınırları tanımlı çalışma", tone: "ok" },
    { label: "Saha kanıtı", value: d.evidenceCount, detail: "Toplam bağlı kanıt", tone: "ok" },
  ];
  const learning: Metric[] = [
    { label: "Uzman değerlendirmesi", value: d.feedbackReviewed, detail: "Önerisi incelenmiş vaka", tone: "info" },
    { label: "Öneri kabulü", value: d.feedbackAccepted, detail: "Motor önerisi kabul edildi", tone: "ok" },
    { label: "Yöntem değişikliği", value: d.feedbackOverridden, detail: "Uzman farklı yöntem seçti", tone: "warn" },
    { label: "Başarılı sonuç", value: d.outcomeSuccess, detail: "Sahada başarı doğrulandı", tone: "ok" },
    { label: "Kısmi sonuç", value: d.outcomePartial, detail: "İyileştirme devam ediyor", tone: "warn" },
    { label: "Başarısız sonuç", value: d.outcomeFailed, detail: "Pivot veya yeni öğrenme gerekli", tone: "risk" },
  ];

  const atRisk = d.workspaces.filter((w) => w.closureStatus !== "CLOSED").slice(0, 12);

  return (
    <main className="page-shell">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rule-strong)] pb-5">
        <div>
          <p className="eyebrow">Operasyonel gerçeklik</p>
          <h1 className="page-heading mt-1.5">Karar ve kapanış panosu</h1>
          <p className="page-lead">
            Form doluluğunu değil; kanıt borcunu, aksiyon etkinliğini, erken riskleri ve gerçek saha
            sonuçlarını izler.
          </p>
        </div>
        <Link href="/gorevler" className="btn btn-primary">Öncelikli görevlere git</Link>
      </div>

      <ReadoutGroup
        title="Kapanış ve doğrulama"
        description="Önce kapanışı veya karar güvenini doğrudan etkileyen açıkları ele alın."
        items={delivery}
      />
      <ReadoutGroup
        title="Erken uyarı ve önleme"
        description="Problem büyümeden önce müdahale edilmesi gereken operasyon sinyalleri."
        items={prevention}
      />
      <ReadoutGroup
        title="Sistem ve karar kapasitesi"
        description="Organizasyon, kapasite ve ileri analiz seviyesindeki yapısal göstergeler."
        items={system}
        columns={4}
      />
      <ReadoutGroup
        title="Kalibrasyon ve gerçek sonuç"
        description="Teşhis motoru önerilerinin uzman kararı ve saha sonucuyla karşılaştırılması."
        items={learning}
      />

      <section className="mt-9">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule-strong)] pb-2">
          <div>
            <h2 className="section-heading">Kapanış riski taşıyan çalışmalar</h2>
            <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
              Açık ve yeniden ele alınması gereken ilk 12 çalışma.
            </p>
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
            {String(atRisk.length).padStart(2, "0")}
          </span>
        </div>
        {d.total === 0 ? (
          <p className="empty-state mt-4">Henüz çalışma yok.</p>
        ) : (
          <ul>
            {atRisk.map((w) => (
              <li key={w.id} className="border-b border-[var(--rule)]">
                <Link
                  href={`/workspace/${w.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-[var(--surface-sunk)]"
                >
                  <span className="min-w-0 truncate text-[13px]">{w.problemDescription}</span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    <span className="code-tag">{w.methodologyName}</span>
                    <span
                      className={`tag ${w.closureStatus ==="REOPENED" ? "state-risk" : w.closureStatus === "MONITORING" ? "state-watch" : "state-idle"}`}
                    >
                      {CLOSURE_LABEL[w.closureStatus] ?? w.closureStatus}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
