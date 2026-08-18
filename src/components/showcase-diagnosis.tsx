// Canlı teşhis vitrini — sunucu bileşeni.
//
// Bu bileşen bir ekran görüntüsü ya da elle yazılmış örnek çıktı GÖSTERMEZ.
// Vitrin vakasını saf `diagnose()` motoruyla o an çalıştırır ve motorun
// ürettiği sıralamayı, gerekçe zincirini, "neden diğerleri değil" açıklamalarını
// ve varsa çakışan sinyalleri olduğu gibi basar. Kural ağırlıkları değişirse
// buradaki metin de değişir — vitrin ile ürün arasında kopma olmaz.

import { problemWith } from "@/domain/diagnosis/features";
import { diagnose } from "@/domain/diagnosis/diagnose";
import { METHODOLOGY_META, METHODOLOGY_ROLES } from "@/domain/diagnosis/methodologies";
import type { ShowcaseCase } from "@/domain/diagnosis/showcase-cases";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Ham puan farkını sözle anlat — yüzde göstermeden. */
function supportBand(margin: number): { label: string; tone: string } {
  if (margin >= 4) return { label: "Güçlü", tone: "state-ok" };
  if (margin >= 2) return { label: "Orta", tone: "state-watch" };
  return { label: "Sınırlı", tone: "state-warn" };
}

export function ShowcaseDiagnosis({
  showcase,
  compact = false,
}: {
  showcase: ShowcaseCase;
  compact?: boolean;
}) {
  const problem = problemWith(showcase.answers, { problemDescription: showcase.problemText });
  // Soru bütçesi dolmuş sayılır: vitrinde sonuç ekranı gösterilir, soru turu değil.
  const snapshot = diagnose(problem, 6);

  const leader = snapshot.ranking[0];
  const meta = METHODOLOGY_META[leader.methodology];
  const band = supportBand(snapshot.evidence.scoreMargin);
  const rivals = snapshot.rivalAnalysis.slice(0, compact ? 2 : 3);
  const contrast = snapshot.contrastive;

  return (
    <div className="border border-[var(--rule-strong)] bg-[var(--surface)]">
      {/* ── Problem ─────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--rule)] px-4 py-4 sm:px-5">
        <p className="eyebrow">Problem — kullanıcının kendi cümleleri</p>
        <p className="mt-2 max-w-3xl text-[13px] leading-[1.7] text-[var(--ink-soft)]">
          {showcase.problemText}
        </p>
      </div>

      {/* ── Öneri künyesi ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[var(--rule)] px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="eyebrow">Önerilen yaklaşım</p>
          <h3 className="mt-2 font-mono text-[1.75rem] font-semibold leading-none tracking-[-0.01em]">
            {meta.shortName}
          </h3>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            {meta.name} · {METHODOLOGY_ROLES[leader.methodology].label}
          </p>
        </div>
        <div className="shrink-0">
          <p className="eyebrow">Kanıt desteği</p>
          <p className="mt-1.5 flex items-center gap-2">
            <span className={`tag ${band.tone}`}>{band.label}</span>
            <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
              en yakın alternatifin {snapshot.evidence.scoreMargin} puan önünde
            </span>
          </p>
        </div>
      </div>

      {/* ── Bu yaklaşımı destekleyen kanıtlar ───────────────────────────── */}
      <div className="border-b border-[var(--rule)] px-4 py-4 sm:px-5">
        <p className="eyebrow">Bu yaklaşımı destekleyen kanıtlar</p>
        <ul className="mt-2.5 border-t border-[var(--rule)]">
          {snapshot.trace.steps.slice(0, compact ? 4 : 6).map((step, index) => (
            <li
              key={index}
              className="flex items-baseline gap-3 border-b border-[var(--rule-faint)] py-2 last:border-b-0"
            >
              <span className="shrink-0 font-mono text-[11px] text-[var(--muted-2)]">
                {pad2(index + 1)}
              </span>
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                {step.because}
              </p>
              <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[var(--muted)]">
                +{step.delta}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Çakışan sinyaller (varsa) ───────────────────────────────────── */}
      {snapshot.contested && (
        <div className="border-b border-[var(--rule)] bg-[var(--surface-sunk)] px-4 py-4 sm:px-5">
          <p className="eyebrow">Çakışan sinyaller</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">
            Bu problem tek bir karakter taşımıyor. İki bağımsız kanıt gövdesi de kendi
            yöntemini destekliyor; sistem birini gizlemek yerine ikisi arasındaki sırayı kuruyor.
          </p>
          <div className="mt-3 grid gap-px bg-[var(--rule)] sm:grid-cols-2">
            {snapshot.contested.sides.map((side) => (
              <div key={side.methodology} className="bg-[var(--surface)] p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="code-tag">{METHODOLOGY_META[side.methodology].shortName}</span>
                  <span className="font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
                    {side.support} puan destek
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {side.facts.slice(0, 3).map((fact) => (
                    <li key={fact} className="text-[12px] leading-relaxed text-[var(--ink-soft)]">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-3 border-l-2 border-[var(--rule-strong)] pl-3.5">
            <p className="eyebrow">Önerilen sıra</p>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-[var(--ink-soft)]">
              {snapshot.contested.integration}
            </p>
          </div>
        </div>
      )}

      {/* ── Neden diğerleri değil ───────────────────────────────────────── */}
      <div className="border-b border-[var(--rule)] px-4 py-4 sm:px-5">
        <p className="eyebrow">Neden diğer yöntemler değil?</p>
        <ul className="mt-2.5 border-t border-[var(--rule)]">
          {rivals.map((rival) => (
            <li key={rival.methodology} className="border-b border-[var(--rule-faint)] py-2.5 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="code-tag">{METHODOLOGY_META[rival.methodology].shortName}</span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
                  {rival.kind === "SUPPRESSED"
                    ? "kanıtla çelişiyor"
                    : `${rival.scoreGapToLeader} puan geride`}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{rival.reason}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Karşıtlıklı okuma: destek ve itiraz yan yana ────────────────── */}
      {!compact && contrast.length === 2 && (
        <div className="grid gap-px border-b border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2">
          {contrast.map((entry) => (
            <div key={entry.methodology} className="bg-[var(--surface)] px-4 py-4 sm:px-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="code-tag">{METHODOLOGY_META[entry.methodology].shortName}</span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
                  net {entry.score > 0 ? "+" : ""}
                  {entry.score}
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {entry.supporting.slice(0, 4).map((signal, i) => (
                  <li key={`s${i}`} className="flex gap-2 text-[12px] leading-relaxed">
                    <span className="shrink-0 font-mono text-[var(--st-ok)]">+</span>
                    <span className="text-[var(--ink-soft)]">{signal.because}</span>
                  </li>
                ))}
                {entry.opposing.slice(0, 3).map((signal, i) => (
                  <li key={`o${i}`} className="flex gap-2 text-[12px] leading-relaxed">
                    <span className="shrink-0 font-mono text-[var(--st-risk)]">−</span>
                    <span className="text-[var(--muted)]">{signal.because}</span>
                  </li>
                ))}
                {entry.opposing.length === 0 && entry.supporting.length === 0 && (
                  <li className="text-[12px] text-[var(--muted-2)]">
                    Bu vakada bu yöntemle etkileşen kural yok.
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── Künye ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 sm:px-5">
        <p className="text-[11px] leading-relaxed text-[var(--muted-2)]">
          Bu blok bir ekran görüntüsü değildir: sayfa her yüklendiğinde aynı karar motoru
          çalıştırılır ve çıktısı olduğu gibi basılır. Puanlar kural desteğidir, başarı
          olasılığı değildir.
        </p>
      </div>
    </div>
  );
}
