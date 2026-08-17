type TrendPoint = { label: string; started: number; completed: number };

export function CompanyTrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(1, ...points.flatMap((point) => [point.started, point.completed]));
  return <section className="card mt-6 p-5">
    <div><p className="eyebrow">Sekiz haftalık eğilim</p><h2 className="section-heading mt-1">Başlatılan ve kapanan çalışmalar</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-2)]">Bu grafik iş yoğunluğunun birikmeye başlayıp başlamadığını gösterir. Başlatılan çalışmalar sürekli kapananların üzerindeyse ekip kapasitesi veya takip disiplini ayrıca incelenmelidir.</p></div>
    <div className="mt-5 flex items-end gap-2 overflow-x-auto pb-2" role="img" aria-label="Son sekiz haftada başlatılan ve kapanan çalışma grafiği">
      {points.map((point) => <div key={point.label} className="min-w-16 flex-1">
        <div className="flex h-40 items-end justify-center gap-1 rounded-xl bg-[var(--surface-sunk)] px-2 pt-3">
          <div title={`${point.started} başlatılan`} className="w-4 rounded-t bg-[var(--ink)]" style={{ height: `${Math.max(point.started ? 8 : 2, point.started / max * 100)}%` }} />
          <div title={`${point.completed} kapanan`} className="w-4 rounded-t bg-[var(--st-ok)]" style={{ height: `${Math.max(point.completed ? 8 : 2, point.completed / max * 100)}%` }} />
        </div>
        <p className="mt-2 text-center text-[10px] text-[var(--muted-2)]">{point.label}</p>
        <p className="text-center text-[10px] font-medium text-[var(--ink-soft)]">{point.started} / {point.completed}</p>
      </div>)}
    </div>
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted)]"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ink)]" />Başlatılan</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--st-ok)]" />Doğrulamayla kapanan</span></div>
  </section>;
}
