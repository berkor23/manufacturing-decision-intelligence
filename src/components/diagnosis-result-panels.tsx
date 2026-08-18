"use client";

// Teşhis sonucu panelleri.
//
// diagnosis-flow.tsx akışın orkestratörüdür; sonuç ekranının açıklanabilirlik
// blokları burada dosya başına toplanır. Hepsinin ortak kuralı: hiçbir metin
// burada ÜRETİLMEZ — her satır ya bir karar kuralının kendi gerekçesi ya da
// FEATURE_META'daki sabit alan metnidir.

import type { DiagnosisView } from "@/application/diagnosis-service";
import { FEATURE_META, problemCharacter } from "@/domain/diagnosis";
import { METHODOLOGY_META, type Methodology } from "@/domain/diagnosis/methodologies";

const label = (m: Methodology) => METHODOLOGY_META[m].shortName;

/* ═══════════════════════════════════════════════════════════════════════════
   Problem özeti ve karakteri
   ───────────────────────────────────────────────────────────────────────────
   Sonucun ilk bloğu yöntem değil PROBLEMdir: kullanıcı kendi anlattığı problemi
   ve sistemin ondan çıkardığı yapılandırılmış karakteri görmeden öneriye
   güvenemez. "Problemin adı" değil karakteri gösterilir.
   ═══════════════════════════════════════════════════════════════════════════ */
export function ProblemSummaryPanel({ view }: { view: DiagnosisView }) {
  const character = problemCharacter(view.structuredProblem);
  if (character.length === 0) return null;

  return (
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">Problem özeti</p>
      {view.structuredProblem.problemDescription && (
        <p className="mt-2 max-w-3xl text-[13px] leading-[1.7] text-[var(--ink-soft)]">
          {view.structuredProblem.problemDescription}
        </p>
      )}
      {view.structuredProblem.processName && (
        <p className="mt-1.5 text-[11px] text-[var(--muted-2)]">
          Süreç: {view.structuredProblem.processName}
        </p>
      )}

      <div className="mt-4 border-t border-[var(--rule)] pt-3.5">
        <p className="eyebrow">Problem karakteri</p>
        <p className="mt-1 text-[11px] text-[var(--muted-2)]">
          Kararın dayandığı yapılandırılmış tablo — {character.length} yanıt. Metinden çıkarılıp
          henüz teyit edilmemiş alanlar ayrıca işaretlenir.
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {character.map((item) => (
            <li
              key={item.featureKey}
              className={item.value ? "tag state-ink" : "tag state-idle"}
              title={FEATURE_META[item.featureKey].label}
            >
              {item.text}
              {view.featureSources?.[item.featureKey] === "PARSER" && (
                <span className="ml-1.5 text-[var(--muted-2)]">metinden</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Çakışan sinyaller
   ───────────────────────────────────────────────────────────────────────────
   Bazı problemler gerçekten iki karakter taşır — kronik arızalı bir darboğaz
   gibi. Bunu gizleyip tek kazanan ilan etmek karar kalitesini düşürür; doğru
   cevap ikisi arasındaki SIRAyı kurmaktır.
   ═══════════════════════════════════════════════════════════════════════════ */
export function ContestedSignalsPanel({ view }: { view: DiagnosisView }) {
  const contested = view.contested;
  if (!contested) return null;

  return (
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">Çakışan sinyaller</p>
      <h3 className="mt-1.5 text-[13px] font-semibold">Bu problem tek bir karakter taşımıyor</h3>
      <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--muted-2)]">
        İki bağımsız kanıt gövdesi de kendi yöntemini destekliyor. Sistem birini gizlemek yerine
        ikisini de gösteriyor ve aralarındaki sırayı öneriyor.
      </p>

      <div className="mt-4 grid gap-px bg-[var(--rule)] sm:grid-cols-2">
        {contested.sides.map((side) => (
          <div key={side.methodology} className="bg-[var(--surface)] p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="code-tag">{label(side.methodology)}</span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
                {side.support} puan destek
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {side.facts.slice(0, 4).map((fact) => (
                <li key={fact} className="text-[12px] leading-relaxed text-[var(--ink-soft)]">
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 border-l-2 border-[var(--st-watch)] pl-3.5">
        <p className="eyebrow">Önerilen sıra</p>
        <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-[var(--ink-soft)]">
          {contested.integration}
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Karşıtlıklı karar izi
   ───────────────────────────────────────────────────────────────────────────
   Karar zinciri yalnız kazananın lehindeki nedenleri sıralar; bu kararın neden
   verildiğini anlatır ama neden ÖTEKİ olmadığını anlatmaz. Burada lider ile en
   yakın rakip yan yana, destek (+) ve itiraz (−) sinyalleriyle okunur.
   ═══════════════════════════════════════════════════════════════════════════ */
export function ContrastiveTracePanel({ view }: { view: DiagnosisView }) {
  const entries = view.contrastive ?? [];
  if (entries.length < 2) return null;

  return (
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">Karar izi</p>
      <h3 className="mt-1.5 text-[13px] font-semibold">Destekleyen ve çelişen sinyaller</h3>
      <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--muted-2)]">
        Her satır bir karar kuralının tetiklenmesidir. Sağdaki sayı o kuralın ilgili yönteme
        katkısıdır; toplamları sıralamayı üretir.
      </p>

      <div className="mt-4 grid gap-px bg-[var(--rule)] sm:grid-cols-2">
        {entries.map((entry, index) => (
          <div key={entry.methodology} className="bg-[var(--surface)] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-baseline gap-2">
                <span className="code-tag">{label(entry.methodology)}</span>
                <span className="eyebrow">{index === 0 ? "Birincil" : "En yakın alternatif"}</span>
              </span>
              <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums">
                {entry.score > 0 ? "+" : ""}
                {entry.score}
              </span>
            </div>

            <ul className="mt-3 border-t border-[var(--rule-faint)]">
              {entry.supporting.map((signal, i) => (
                <li
                  key={`s${i}`}
                  className="flex items-baseline gap-2.5 border-b border-[var(--rule-faint)] py-1.5 last:border-b-0"
                >
                  <span className="shrink-0 font-mono text-[12px] font-semibold text-[var(--st-ok)]">+</span>
                  <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-[var(--ink-soft)]">
                    {signal.because}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
                    {signal.delta}
                  </span>
                </li>
              ))}
              {entry.opposing.map((signal, i) => (
                <li
                  key={`o${i}`}
                  className="flex items-baseline gap-2.5 border-b border-[var(--rule-faint)] py-1.5 last:border-b-0"
                >
                  <span className="shrink-0 font-mono text-[12px] font-semibold text-[var(--st-risk)]">−</span>
                  <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-[var(--muted)]">
                    {signal.because}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
                    {signal.delta}
                  </span>
                </li>
              ))}
              {entry.supporting.length === 0 && entry.opposing.length === 0 && (
                <li className="py-1.5 text-[12px] text-[var(--muted-2)]">
                  Bu vakada bu yöntemle etkileşen kural yok.
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Eksik kanıt
   ───────────────────────────────────────────────────────────────────────────
   "Yeterli kanıt yok" bir başarısızlık değil, geçerli ve değerli bir sonuçtur.
   Bu panel neyin eksik olduğunu ve kararı netleştirmek için hangi bilginin
   gerektiğini açıkça söyler; kullanıcı bir metodolojiye zorlanmaz.
   ═══════════════════════════════════════════════════════════════════════════ */
export function MissingEvidencePanel({ view }: { view: DiagnosisView }) {
  const openTasks = (view.informationTasks ?? []).filter((task) => task.status === "OPEN");
  const unknownGate = view.stabilization?.unknowns ?? [];
  const inconclusive = view.evidence.status === "INCONCLUSIVE";
  if (!inconclusive && openTasks.length === 0 && unknownGate.length === 0) return null;

  return (
    <section className={inconclusive ? "card card-accent-indigo p-5 sm:p-6" : "card p-5 sm:p-6"}>
      <p className="eyebrow">Eksik kanıt</p>
      <h3 className="mt-1.5 text-[13px] font-semibold">
        {inconclusive
          ? "Tek bir metodolojiyi güçlü biçimde önermek için yeterli ayırt edici kanıt yok"
          : "Kararı sağlamlaştıracak açık bilgi ihtiyaçları"}
      </h3>
      <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-[var(--muted)]">
        {inconclusive
          ? "Kararı netleştirmek için aşağıdaki bilgilerin doğrulanması gerekiyor. O zamana kadar öneriyi kesin bir seçim değil, çalışma hipotezi olarak kullanın."
          : "Aşağıdaki bilgiler doğrulandığında öneri kanıtla desteklenmiş sayılır."}
      </p>

      {openTasks.length > 0 && (
        <ul className="mt-4 border-t border-[var(--rule-strong)]">
          {openTasks.map((task) => (
            <li
              key={task.featureKey}
              className="flex items-baseline gap-3 border-b border-[var(--rule)] py-2.5"
            >
              <span className="code-tag shrink-0">Doğrula</span>
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                {FEATURE_META[task.featureKey].questionTheme}
              </p>
            </li>
          ))}
        </ul>
      )}

      {unknownGate.length > 0 && (
        <div className="mt-4 border-t border-[var(--rule)] pt-3.5">
          <p className="eyebrow">Doğrulanmamış hazırlık koşulları</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {unknownGate.map((key) => (
              <li key={key} className="tag state-idle">
                {FEATURE_META[key].label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
