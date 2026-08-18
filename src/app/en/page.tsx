import Link from "next/link";
import { METHODOLOGIES, METHODOLOGY_META, type Methodology } from "@/domain/diagnosis/methodologies";

/* ═══════════════════════════════════════════════════════════════════════════
   English overview.

   Scope note (deliberate): the product interface — diagnostic questions,
   methodology workspaces, reports — is Turkish. Translating the full
   application is a separate piece of work. This page exists so an
   English-speaking reader can understand what the system does, how it decides
   and why the architecture is shaped the way it is, without pretending the app
   itself is bilingual. The terminology table below is the canonical TR ↔ EN
   glossary used across the project.
   ═══════════════════════════════════════════════════════════════════════════ */

export const metadata = {
  title: "How the Decision Engine Works",
  description:
    "Manufacturing Decision Engine structures manufacturing problems, asks discriminating questions and selects between RCA, DMAIC, 8D, TPM, TOC, VSM, SPC and other methodologies through explicit, testable decision rules.",
};

const PIPELINE = [
  {
    t: "Problem structuring",
    d: "Free text is read and mapped onto three-valued diagnostic features (yes / no / unknown). No decision is made here — only fields are filled.",
  },
  {
    t: "Discriminating questions",
    d: "Expected information gain is computed for every unknown feature; the question that reduces uncertainty most is asked. Not a long questionnaire — questions that separate hypotheses.",
  },
  {
    t: "Rule evaluation",
    d: "Explicit rules run against KNOWN features only. Each rule carries a written rationale and states how much it supports or suppresses each methodology.",
  },
  {
    t: "Evidence sufficiency",
    d: "Every methodology declares the independent evidence dimensions it must satisfy. A high score alone does not make a result confirmed.",
  },
  {
    t: "Conflict and contest detection",
    d: "Mutually inconsistent answers, and problems that genuinely carry two characters at once, are flagged rather than hidden.",
  },
  {
    t: "Recommendation with rationale",
    d: "The primary methodology is presented together with supporting evidence, opposing signals, and the reason each alternative ranked lower.",
  },
];

const ARCHITECTURE = [
  {
    t: "Pure decision core",
    d: "Rules, scoring, question selection and the decision trace live in one dependency-free layer. No language model, no database — the same input always yields the same output.",
  },
  {
    t: "Bounded role for the LLM",
    d: "Natural language is used only to structure the problem, phrase questions naturally and write reports. Methodology selection is never delegated to the model.",
  },
  {
    t: "Evidence profiles",
    d: "Each methodology defines the independent evidence dimensions required before it counts as confirmed. The same definition drives both the question route and the conclusion gate.",
  },
  {
    t: "Decision trace and counterfactuals",
    d: "The chain of answers behind a decision is retained; “what if this answer were reversed?” scenarios are recomputed by the same engine, not narrated by a model.",
  },
  {
    t: "Execution and verification",
    d: "The selected methodology hands off to a workspace carrying its own steps. Whether an action was implemented and whether it was effective are separate states.",
  },
  {
    t: "Regression shield",
    d: "Rule weights are pinned by case tests that check not only that the right methodology is selected, but that the wrong ones are not triggered.",
  },
];

const PAIRS: { a: Methodology; b: Methodology; q: string }[] = [
  { a: "RCA", b: "DMAIC", q: "Did the deviation start after a specific date, or has it fluctuated the same way for a long time?" },
  { a: "TPM", b: "TOC", q: "Does the machine limit total system output even when it is not broken down?" },
  { a: "TOC", b: "LEAN_VSM", q: "Is performance limited mainly by a single system constraint, or are losses spread along the flow?" },
  { a: "SPC", b: "DMAIC", q: "Is the process capable today — are we looking for causes, or holding a level already earned?" },
  { a: "SDCA", b: "PDCA_A3", q: "Does everyone do the same job the same way; is there a stable baseline to improve on?" },
  { a: "FMEA", b: "DMADV", q: "Are we assessing risk in an existing process, or designing something new from scratch?" },
  { a: "EIGHT_D", b: "RCA", q: "Is interim containment needed right now to protect the customer, and is the event recurring?" },
];

const GLOSSARY: [string, string][] = [
  ["Kök neden", "Root cause"],
  ["Saha kanıtı", "Field evidence"],
  ["Karşı-olgusal test", "Counterfactual test"],
  ["Etkinlik doğrulaması", "Effectiveness verification"],
  ["Yatay yayılım", "Horizontal deployment"],
  ["Metodoloji desteği", "Methodology support"],
  ["Karar izi", "Decision trace"],
  ["Çakışan sinyaller", "Contested signals"],
  ["Kanıt yeterliliği", "Evidence sufficiency"],
  ["Ayırt edici soru", "Discriminating question"],
  ["Stabilizasyon kapısı", "Stabilization gate"],
  ["Kural desteği skoru", "Decision support score"],
];

const TEST_PRINCIPLES = [
  "Customer impact alone must not select 8D.",
  "A single machine breakdown must not confirm TPM.",
  "DMAIC must not surface for a stable, capable process.",
  "A numerically verified bottleneck must support TOC.",
  "Without queue and starvation evidence, TOC must not be auto-selected.",
  "Missing standard work must be able to rank SDCA ahead of PDCA.",
  "Without sufficient discriminating evidence, no definitive result is produced.",
  "Contested signals must stay visible.",
];

export default function EnglishOverview() {
  return (
    <main className="page-shell flex-1">
      <section className="max-w-3xl">
        <p className="eyebrow">Explainable decision support for manufacturing problems</p>
        <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[2.25rem]">
          <span className="text-[var(--muted)]">Diagnose the problem first,</span>
          <br />
          then choose the methodology.
        </h1>
        <p className="mt-5 text-[14px] leading-[1.7] text-[var(--ink-soft)]">
          Manufacturing problems look alike on the surface; different problem{" "}
          <strong className="font-semibold text-[var(--ink)]">characters</strong> demand different
          ways of thinking. Manufacturing Decision Engine tries to tell those characters apart and
          to explain why one methodology fits better than its neighbours.
        </p>
        <p className="mt-4 border-l-2 border-[var(--rule-strong)] pl-3.5 text-[13px] leading-[1.7] text-[var(--muted)]">
          Natural language is used to structure the problem; methodology selection is performed
          through explicit, testable decision rules.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Link href="/diagnoz" className="btn btn-primary btn-lg">Try the diagnosis</Link>
          <Link href="/" className="btn btn-secondary btn-lg">Türkçe ana sayfa</Link>
        </div>
        <p className="mt-3 text-[12px] text-[var(--muted-2)]">
          No account required. The application interface — diagnostic questions, workspaces and
          reports — is currently Turkish only; this page is the English overview.
        </p>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">How a decision is formed</h2>
          <span className="eyebrow">Six stages</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          The system does not send your text to a language model and ask “which methodology should
          I pick?”. The text is read only to structure the problem; the selection is made by
          written, testable rules.
        </p>
        <ol className="mt-6 grid gap-px bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((step, index) => (
            <li key={step.t} className="bg-[var(--paper)] p-4">
              <span className="font-mono text-[11px] font-medium text-[var(--muted-2)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[13px] font-semibold">{step.t}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Methodology discrimination</h2>
          <span className="eyebrow">The question that separates them</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          The value is not in how many methodologies are listed, but in modelling the conditions
          under which similar-looking ones diverge. Each row corresponds to a rule pair and a
          regression test.
        </p>
        <ul className="mt-5 border-t border-[var(--rule-strong)]">
          {PAIRS.map((pair) => (
            <li
              key={`${pair.a}-${pair.b}`}
              className="flex flex-col gap-2 border-b border-[var(--rule)] py-3 sm:flex-row sm:items-baseline sm:gap-5"
            >
              <span className="flex shrink-0 items-baseline gap-2 sm:w-44">
                <span className="code-tag">{METHODOLOGY_META[pair.a].shortName}</span>
                <span className="text-[11px] text-[var(--muted-2)]">or</span>
                <span className="code-tag">{METHODOLOGY_META[pair.b].shortName}</span>
              </span>
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                {pair.q}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-[var(--muted-2)]">
          {METHODOLOGIES.length} methodologies are supported. The count is secondary information —
          the discrimination is the point.
        </p>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Decision engine architecture</h2>
          <span className="eyebrow">Six layers</span>
        </div>
        <div className="mt-6 grid gap-px bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-3">
          {ARCHITECTURE.map((layer, index) => (
            <div key={layer.t} className="bg-[var(--paper)] p-4">
              <span className="font-mono text-[11px] font-medium text-[var(--muted-2)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[13px] font-semibold">{layer.t}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{layer.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Regression-tested decision rules</h2>
          <span className="eyebrow">What the tests assert</span>
        </div>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
          Decision rules are verified by case tests that check both directions: that the right
          methodology is selected, and that the wrong ones are not triggered. Raising one
          methodology&rsquo;s weight must not break its twin&rsquo;s negative case.
        </p>
        <ul className="mt-5 grid gap-px bg-[var(--rule)] sm:grid-cols-2">
          {TEST_PRINCIPLES.map((principle) => (
            <li
              key={principle}
              className="bg-[var(--paper)] px-4 py-3 text-[12px] leading-relaxed text-[var(--ink-soft)]"
            >
              {principle}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
          <h2 className="section-heading">Terminology</h2>
          <span className="eyebrow">TR · EN</span>
        </div>
        <dl className="mt-5 grid gap-px bg-[var(--rule)] sm:grid-cols-2">
          {GLOSSARY.map(([tr, en]) => (
            <div key={tr} className="flex items-baseline justify-between gap-4 bg-[var(--paper)] px-4 py-2.5">
              <dt className="text-[13px] text-[var(--muted)]">{tr}</dt>
              <dd className="text-[13px] font-medium text-[var(--ink)]">{en}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 border-t border-[var(--rule-strong)] py-7">
        <p className="eyebrow">Scope of the decision support</p>
        <h2 className="mt-2 text-[14px] font-semibold">It does not replace expert judgement</h2>
        <p className="mt-2.5 max-w-3xl text-[13px] leading-[1.7] text-[var(--muted)]">
          Rather than automating the expert&rsquo;s decision, the system structures problem
          signals, compares methodology alternatives and makes the rationale visible. When there
          is not enough discriminating evidence, it says so. Scores shown are rule support, not a
          probability of success.
        </p>
      </section>
    </main>
  );
}
