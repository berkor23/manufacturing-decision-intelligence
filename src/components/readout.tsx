// Sayısal gösterge — pano, görev merkezi, admin ve hesap ekranlarının ortak
// ölçüm birimi.
//
// Neden tek bileşen: bu dört ekran aynı işi dört ayrı kopyada yapıyordu ve her
// biri `--stat-card` içine ESKİ PALETTEN sabit rgba değerleri (rgba(99,102,241,…)
// gibi) gömüyordu. Renk artık token'dan gelir ve kural tek yerde yaşar.

export type ReadoutTone = "risk" | "warn" | "ok" | "info";

/**
 * Gösterge rengi DEĞERE bağlıdır, etiketine değil.
 *
 * Sıfır olan bir risk sayacı sessizleşir: eskiden 0 "Kanıtsız iddia" ile 12
 * "Kanıtsız iddia" aynı kırmızı işareti taşıyordu ve renk anlamını yitiriyordu.
 * Sol çubuk yalnız yapılacak iş varken renklenir; böylece panoya bakan kişi
 * nereye müdahale edeceğini taramadan görür.
 */
/** "0" ve 0 aynı şeydir: gösterge susar. "0/6" gibi oranlar susmaz. */
const isSilent = (value: number | string) => value === 0 || value === "0";

function toneColors(value: number | string, tone: ReadoutTone) {
  if (isSilent(value) || tone === "info") return { bar: "var(--rule)", text: "var(--ink)" };
  if (tone === "risk") return { bar: "var(--st-risk)", text: "var(--st-risk)" };
  if (tone === "warn") return { bar: "var(--st-warn)", text: "var(--st-warn)" };
  return { bar: "var(--st-ok)", text: "var(--ink)" };
}

export function Readout({
  label,
  value,
  detail,
  tone = "info",
  onClick,
}: {
  label: string;
  value: number | string;
  detail?: string;
  tone?: ReadoutTone;
  /** Verilirse gösterge tıklanabilir olur (çalışma alanında bölüme gider). */
  onClick?: () => void;
}) {
  const { bar, text } = toneColors(value, tone);
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p
        className="mt-1.5 font-mono text-[1.5rem] font-semibold leading-none tabular-nums"
        style={{ color: isSilent(value) ? "var(--muted-2)" : text }}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted-2)]">{detail}</p>
      )}
    </>
  );
  const style = { borderLeft: `3px solid ${bar}` };
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        className="bg-[var(--surface)] px-3 py-3.5 text-left transition-colors hover:bg-[var(--surface-sunk)]"
      >
        {body}
      </button>
    );
  }
  return (
    <div className="bg-[var(--surface)] px-3 py-3.5" style={style}>
      {body}
    </div>
  );
}

export type ReadoutItem = {
  label: string;
  value: number | string;
  detail?: string;
  tone?: ReadoutTone;
  onClick?: () => void;
};

/** Göstergeler 1px aralıkla dizilir; kart yığını yerine tek bir ölçüm bandı. */
export function ReadoutBand({
  items,
  columns = 4,
}: {
  items: ReadoutItem[];
  columns?: 3 | 4 | 6;
}) {
  const cols = columns === 6 ? "lg:grid-cols-6" : columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <div className={`grid gap-px border-y border-[var(--rule-strong)] bg-[var(--rule)] sm:grid-cols-2 ${cols}`}>
      {items.map((item) => (
        <Readout key={item.label} {...item} />
      ))}
    </div>
  );
}

/** Başlıklı grup: sağda "kaç gösterge dikkat istiyor" künyesi. */
export function ReadoutGroup({
  title,
  description,
  items,
  columns = 4,
}: {
  title: string;
  description?: string;
  items: ReadoutItem[];
  columns?: 3 | 4 | 6;
}) {
  const actionable = items.filter(
    (item) => !isSilent(item.value) && (item.tone === "risk" || item.tone === "warn"),
  ).length;
  return (
    <section className="mt-9">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule-strong)] pb-2">
        <div>
          <h2 className="section-heading">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">{description}</p>
          )}
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
          {actionable > 0 ? `${actionable} gösterge dikkat istiyor` : "temiz"}
        </span>
      </div>
      <div className="mt-px">
        <ReadoutBand items={items} columns={columns} />
      </div>
    </section>
  );
}
