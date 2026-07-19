export interface SpcPoint { index: number; value: number; label?: string }
export interface SpcSignal { index: number; rule: "BEYOND_3SIGMA" | "EIGHT_ONE_SIDE" | "SIX_TREND"; message: string }
export interface SpcAnalysis { mean: number; sigma: number; ucl: number; lcl: number; signals: SpcSignal[]; cp: number | null; cpk: number | null }

const round = (n: number) => Math.round(n * 1000) / 1000;

export function parseMeasurementText(raw: string): SpcPoint[] {
  const rows = raw.trim().split(/\r?\n/).filter(Boolean);
  const points: SpcPoint[] = [];
  for (const [rowIndex, row] of rows.entries()) {
    const cells = row.split(/[;,\t]/).map((x) => x.trim());
    const numeric = [...cells].reverse().map((x) => Number(x.replace(",", "."))).find(Number.isFinite);
    if (numeric === undefined) continue;
    points.push({ index: points.length + 1, value: numeric, label: cells.length > 1 ? cells[0] : String(rowIndex + 1) });
  }
  return points;
}

export function analyzeIndividuals(points: SpcPoint[], lsl?: number | null, usl?: number | null): SpcAnalysis {
  if (points.length < 2) throw new Error("En az iki ölçüm gerekli.");
  const values = points.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const mr = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const mrBar = mr.reduce((a, b) => a + b, 0) / mr.length;
  const sigma = mrBar / 1.128;
  const ucl = mean + 3 * sigma;
  const lcl = mean - 3 * sigma;
  const signals: SpcSignal[] = [];
  values.forEach((v, i) => { if (v > ucl || v < lcl) signals.push({ index: i, rule: "BEYOND_3SIGMA", message: `${i + 1}. nokta kontrol limitinin dışında` }); });
  for (let i = 7; i < values.length; i++) {
    const window = values.slice(i - 7, i + 1);
    if (window.every((v) => v > mean) || window.every((v) => v < mean)) signals.push({ index: i, rule: "EIGHT_ONE_SIDE", message: `${i - 6}–${i + 1}: sekiz nokta merkez çizgisinin aynı tarafında` });
  }
  for (let i = 5; i < values.length; i++) {
    const window = values.slice(i - 5, i + 1);
    const up = window.every((v, j) => j === 0 || v > window[j - 1]);
    const down = window.every((v, j) => j === 0 || v < window[j - 1]);
    if (up || down) signals.push({ index: i, rule: "SIX_TREND", message: `${i - 4}–${i + 1}: altı noktalık ${up ? "artan" : "azalan"} trend` });
  }
  const cp = sigma > 0 && lsl != null && usl != null ? (usl - lsl) / (6 * sigma) : null;
  const cpk = sigma > 0 && lsl != null && usl != null ? Math.min((usl - mean) / (3 * sigma), (mean - lsl) / (3 * sigma)) : null;
  return { mean: round(mean), sigma: round(sigma), ucl: round(ucl), lcl: round(lcl), signals, cp: cp == null ? null : round(cp), cpk: cpk == null ? null : round(cpk) };
}

export interface FmeaRisk { s: number; o: number; d: number; rpn: number; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; valid: boolean }
export function scoreFmea(sRaw: string | number, oRaw: string | number, dRaw: string | number): FmeaRisk {
  const [s, o, d] = [sRaw, oRaw, dRaw].map(Number);
  const valid = [s, o, d].every((n) => Number.isInteger(n) && n >= 1 && n <= 10);
  const rpn = valid ? s * o * d : 0;
  const priority = !valid ? "LOW" : s >= 9 ? "CRITICAL" : rpn >= 200 ? "HIGH" : rpn >= 80 ? "MEDIUM" : "LOW";
  return { s, o, d, rpn, priority, valid };
}

export interface TimelineItem { date: string; label: string; kind: "CHANGE" | "DEVIATION"; distanceDays: number | null }
export function buildChangeTimeline(deviationDate: string, changes: { date: string; change: string }[]): TimelineItem[] {
  const base = Date.parse(deviationDate);
  return [
    ...changes.map((c) => ({ date: c.date, label: c.change, kind: "CHANGE" as const, distanceDays: Number.isFinite(base) && Number.isFinite(Date.parse(c.date)) ? Math.round((Date.parse(c.date) - base) / 86400000) : null })),
    { date: deviationDate, label: "İlk sapma", kind: "DEVIATION" as const, distanceDays: 0 },
  ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function customerUpdate(problem: string, containment: string, rootCause: string, final = false): string {
  const root = rootCause.trim() ? `Doğrulanmış kök neden: ${rootCause.trim()}.` : "Kök neden analizi sürmektedir; henüz kesin neden beyan edilmemektedir.";
  return `${final ? "Kapanış bilgilendirmesi" : "Ara durum bilgilendirmesi"}\n\nProblem: ${problem}\nGeçici koruma/containment: ${containment || "Saha ekibi tarafından güncellenecek."}\n${root}\n${final ? "Kalıcı aksiyonlar doğrulanmış ve izleme planına devredilmiştir." : "Yeni doğrulanmış bilgi oluştuğunda güncelleme paylaşılacaktır."}`;
}
