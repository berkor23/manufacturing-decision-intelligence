"use client";

// Karar laboratuvarları: kapasite, hat dengeleme, SOP ve kıyaslama senaryoları.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { type BenchmarkReference, type CapacityScenario, type LineBalanceStudy, type LineOperation, type SopScenario, calculateCapacity, calculateLineBalance, calculateSop, normalizeBenchmark } from "@/domain/decision-labs";
import { NumericField, PanelTitle, RecordCardHeader, canRemoveRecord, numberValue } from "@/components/workspace/panel-kit";

export function DecisionLabsPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const addBenchmark = () =>
    onChange({
      benchmarkReferences: [
        ...workspace.benchmarkReferences,
        {
          id: crypto.randomUUID(),
          name: "",
          type: "INTERNAL",
          capability: "",
          localValue: 0,
          referenceValue: 0,
          localScale: 1,
          referenceScale: 1,
          practiceGap: "",
          adaptation: "",
          blindCopyRisk: "",
          evidenceIds: [],
        },
      ],
    });
  const updateBenchmark = (id: string, patch: Partial<BenchmarkReference>) =>
    onChange({
      benchmarkReferences: workspace.benchmarkReferences.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeBenchmark = (x: BenchmarkReference) => {
    if (canRemoveRecord("Kıyaslama referansı", Boolean(x.name.trim() || x.capability.trim())))
      onChange({ benchmarkReferences: workspace.benchmarkReferences.filter((item) => item.id !== x.id) });
  };
  const addCapacity = () =>
    onChange({
      capacityScenarios: [
        ...workspace.capacityScenarios,
        {
          id: crypto.randomUUID(),
          name: "Baz",
          demand: 0,
          availableMinutes: 480,
          bottleneckCycleSeconds: 0,
          yieldRate: 100,
          mixFactor: 1,
          channelMargin: 0,
          shelfLifeDays: null,
          inventory: 0,
          investment: 0,
        },
      ],
    });
  const updateCapacity = (id: string, patch: Partial<CapacityScenario>) =>
    onChange({
      capacityScenarios: workspace.capacityScenarios.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeCapacity = (x: CapacityScenario) => {
    if (canRemoveRecord("Kapasite senaryosu", Boolean(x.demand || x.bottleneckCycleSeconds)))
      onChange({ capacityScenarios: workspace.capacityScenarios.filter((item) => item.id !== x.id) });
  };
  const addSop = () =>
    onChange({
      sopScenarios: [
        ...workspace.sopScenarios,
        {
          id: crypto.randomUUID(),
          name: "Baz plan",
          strategy: "HYBRID",
          demandLow: 0,
          demandExpected: 0,
          demandHigh: 0,
          regularCapacity: 0,
          overtimeCapacity: 0,
          subcontractCapacity: 0,
          openingInventory: 0,
          serviceTarget: 95,
          unitRegularCost: 0,
          unitOvertimeCost: 0,
          unitSubcontractCost: 0,
          unitInventoryCost: 0,
          unitBacklogCost: 0,
        },
      ],
    });
  const updateSop = (id: string, patch: Partial<SopScenario>) =>
    onChange({
      sopScenarios: workspace.sopScenarios.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const removeSop = (x: SopScenario) => {
    if (canRemoveRecord("Satış ve operasyon planı", Boolean(x.demandExpected || x.regularCapacity)))
      onChange({ sopScenarios: workspace.sopScenarios.filter((item) => item.id !== x.id) });
  };
  const addLine = () =>
    onChange({
      lineBalanceStudies: [
        ...workspace.lineBalanceStudies,
        { demand: 0, availableSeconds: 28800, operations: [], mode: "LINE" },
      ],
    });
  const updateLine = (index: number, patch: Partial<LineBalanceStudy>) =>
    onChange({
      lineBalanceStudies: workspace.lineBalanceStudies.map((x, i) =>
        i === index ? { ...x, ...patch } : x,
      ),
    });
  const removeLine = (index: number, study: LineBalanceStudy) => {
    if (canRemoveRecord("Hat dengeleme çalışması", Boolean(study.demand || study.operations.length)))
      onChange({ lineBalanceStudies: workspace.lineBalanceStudies.filter((_, itemIndex) => itemIndex !== index) });
  };
  const removeOperation = (studyIndex: number, operation: LineOperation) => {
    if (canRemoveRecord("Operasyon", Boolean(operation.name.trim() || operation.seconds))) {
      const study = workspace.lineBalanceStudies[studyIndex];
      updateLine(studyIndex, { operations: study.operations.filter((item) => item.id !== operation.id) });
    }
  };
  const addOperation = (index: number) => {
    const study = workspace.lineBalanceStudies[index];
    updateLine(index, {
      operations: [
        ...study.operations,
        {
          id: crypto.randomUUID(),
          name: "",
          seconds: 0,
          station: study.operations.length + 1,
          skill: "",
          ergonomicRisk: "LOW",
          monotonyRisk: "LOW",
          qualityOwnership: "",
        },
      ],
    });
  };
  const updateOperation = (
    studyIndex: number,
    id: string,
    patch: Partial<LineOperation>,
  ) => {
    const study = workspace.lineBalanceStudies[studyIndex];
    updateLine(studyIndex, {
      operations: study.operations.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  };
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-6">
        <PanelTitle
          eyebrow="P4.1 · Benchmarking"
          title="Karşılaştırılabilir referans ve bağlama uyarlama"
          action="Referans ekle"
          onAction={addBenchmark}
        />
        <div className="record-list mt-4">
          {workspace.benchmarkReferences.map((x) => {
            const score = normalizeBenchmark(x);
            return (
              <div
                key={x.id}
                className="record-row"
              >
                <RecordCardHeader title={x.name || "Yeni kıyaslama referansı"} onRemove={() => removeBenchmark(x)} />
                <div className="grid gap-2 md:grid-cols-4">
                  <input
                    className="field"
                    value={x.name}
                    onChange={(e) =>
                      updateBenchmark(x.id, { name: e.target.value })
                    }
                    placeholder="Referans kuruluş / proses"
                  />
                  <select
                    className="field"
                    value={x.type}
                    onChange={(e) =>
                      updateBenchmark(x.id, {
                        type: e.target.value as BenchmarkReference["type"],
                      })
                    }
                  >
                    <option value="INTERNAL">İç referans</option>
                    <option value="COMPETITOR">Rakip</option>
                    <option value="FUNCTIONAL">Fonksiyonel</option>
                    <option value="GENERIC">Genel</option>
                  </select>
                  <input
                    className="field"
                    value={x.capability}
                    onChange={(e) =>
                      updateBenchmark(x.id, { capability: e.target.value })
                    }
                    placeholder="Kıyaslanan yetkinlik"
                  />
                  <span
                    className={`rounded-lg p-3 text-xs ${score.comparable ? "bg-[var(--st-ok-bg)] text-[var(--st-ok)]" : "bg-[var(--st-warn-bg)] text-[var(--st-warn)]"}`}
                  >
                    Normalize fark: {score.gap}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  {(
                    [
                      ["localValue", "Yerel değer"],
                      ["localScale", "Yerel ölçek"],
                      ["referenceValue", "Referans değer"],
                      ["referenceScale", "Referans ölçek"],
                    ] as const
                  ).map(([k, l]) => (
                    <input
                      key={k}
                      type="number"
                      className="field"
                      value={x[k]}
                      onChange={(e) =>
                        updateBenchmark(x.id, {
                          [k]: numberValue(e.target.value),
                        })
                      }
                      placeholder={l}
                    />
                  ))}
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <input
                    className="field"
                    value={x.practiceGap}
                    onChange={(e) =>
                      updateBenchmark(x.id, { practiceGap: e.target.value })
                    }
                    placeholder="Performans / uygulama farkı"
                  />
                  <input
                    className="field"
                    value={x.adaptation}
                    onChange={(e) =>
                      updateBenchmark(x.id, { adaptation: e.target.value })
                    }
                    placeholder="Yerel bağlama uyarlama"
                  />
                  <input
                    className="field"
                    value={x.blindCopyRisk}
                    onChange={(e) =>
                      updateBenchmark(x.id, { blindCopyRisk: e.target.value })
                    }
                    placeholder="Kör kopyalama riski"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P4.2 · Kapasite ve büyüme"
          title="Darboğaz, ürün karması ve yatırım what-if"
          action="Senaryo ekle"
          onAction={addCapacity}
        />
        <div className="mt-4 grid gap-3">
          {workspace.capacityScenarios.map((x) => {
            const result = calculateCapacity(x);
            return (
              <div
                key={x.id}
                className="record-row"
              >
                <RecordCardHeader title={x.name || "Yeni kapasite senaryosu"} onRemove={() => removeCapacity(x)} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <input
                    className="field sm:col-span-2 xl:col-span-3"
                    value={x.name}
                    onChange={(e) =>
                      updateCapacity(x.id, { name: e.target.value })
                    }
                  />
                  <span
                    className={`rounded-lg p-3 text-center text-xs ${result.feasible ? "bg-[var(--st-ok-bg)] text-[var(--st-ok)]" : "bg-[var(--st-risk-bg)] text-[var(--st-risk)]"}`}
                  >
                    {result.feasible ? "Talep karşılanır" : "Kapasite açığı"}
                  </span>
                  {(
                    [
                      ["demand", "Dönem talebi", "adet / dönem", "Bu senaryoda karşılanması gereken toplam ürün miktarı."],
                      ["availableMinutes", "Kullanılabilir üretim süresi", "dakika / dönem", "Planlı duruşlar çıktıktan sonra darboğazın gerçekten çalışabileceği süre. 480, sekiz saatlik vardiyayı ifade eder."],
                      ["bottleneckCycleSeconds", "Darboğaz çevrim süresi", "saniye / adet", "Hattın hızını sınırlayan operasyonun bir sağlam ürün için harcadığı süre."],
                      ["yieldRate", "Sağlam ürün verimi", "%", "Üretilen parçaların yüzde kaçının ek işlem görmeden sağlam çıktığı. 100, hiç kayıp olmadığı varsayımıdır."],
                      ["mixFactor", "Ürün karması kapasite katsayısı", "0–1 katsayı", "Çeşitlilik kapasiteyi düşürmüyorsa 1; örneğin %20 kayıp yaratıyorsa 0,80 girin."],
                      ["inventory", "Kullanılabilir başlangıç stoku", "adet", "Talebi karşılamak için kullanılabilecek hazır sağlam ürün. Stok yoksa 0."],
                      ["channelMargin", "Birim katkı", "para / adet", "Bir ek ürünün satışından değişken maliyet sonrası kalan katkı."],
                      ["investment", "Senaryo yatırım maliyeti", "para", "Bu kapasite seçeneğini hayata geçirmek için gereken tek seferlik yatırım."],
                    ] as const
                  ).map(([k, label, unit, help]) => (
                    <NumericField
                      key={k}
                      label={label}
                      unit={unit}
                      help={help}
                      value={x[k] ?? 0}
                      onChange={(value) => updateCapacity(x.id, { [k]: value })}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Throughput <strong>{result.throughput}</strong> · Açık/fazla{" "}
                  <strong>{result.gap}</strong> · Kullanım %{result.utilization}{" "}
                  · Katkı {result.contribution}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P4.3 · S&OP"
          title="Chase, level ve hybrid toplam plan senaryoları"
          action="Plan senaryosu ekle"
          onAction={addSop}
        />
        <div className="mt-4 grid gap-3">
          {workspace.sopScenarios.map((x) => {
            const result = calculateSop(x);
            return (
              <div
                key={x.id}
                className="record-row"
              >
                <RecordCardHeader title={x.name || "Yeni satış ve operasyon planı"} onRemove={() => removeSop(x)} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <input
                    className="field sm:col-span-2 xl:col-span-3"
                    value={x.name}
                    onChange={(e) => updateSop(x.id, { name: e.target.value })}
                  />
                  <select
                    className="field"
                    value={x.strategy}
                    onChange={(e) =>
                      updateSop(x.id, {
                        strategy: e.target.value as SopScenario["strategy"],
                      })
                    }
                  >
                    <option value="CHASE">Talebi izleyen plan · kapasite talebe göre değişir</option>
                    <option value="LEVEL">Dengeli plan · kapasite sabit tutulur</option>
                    <option value="HYBRID">Karma plan · kapasite, stok ve dış kaynak birlikte</option>
                  </select>
                  {(
                    [
                      ["demandLow", "Düşük talep tahmini", "adet / dönem", "İyimser kapasite açısından karşılaşılabilecek alt talep senaryosu."],
                      ["demandExpected", "Beklenen talep", "adet / dönem", "Planın ana hesabında kullanılacak en olası talep."],
                      ["demandHigh", "Yüksek talep tahmini", "adet / dönem", "Talep yükseldiğinde planın dayanıklılığını sınayan üst senaryo."],
                      ["regularCapacity", "Normal çalışma kapasitesi", "adet / dönem", "Normal vardiya ve mevcut kaynaklarla üretilebilecek miktar."],
                      ["overtimeCapacity", "Fazla mesai kapasitesi", "adet / dönem", "Onaylı fazla mesaiyle normal kapasiteye eklenebilecek miktar."],
                      ["subcontractCapacity", "Dış kaynak kapasitesi", "adet / dönem", "Tedarikçi veya taşeron üzerinden sağlanabilecek ek miktar."],
                      ["openingInventory", "Dönem başı kullanılabilir stok", "adet", "Plan dönemi başında talebi karşılamak için hazır bulunan sağlam ürün."],
                      ["serviceTarget", "Hedef hizmet seviyesi", "%", "Talebin en az yüzde kaçının dönem içinde karşılanması gerektiği. 95, %95 hedef demektir."],
                    ] as const
                  ).map(([k, label, unit, help]) => (
                    <NumericField
                      key={k}
                      label={label}
                      unit={unit}
                      help={help}
                      value={x[k]}
                      onChange={(value) => updateSop(x.id, { [k]: value })}
                    />
                  ))}
                </div>
                <div className="mt-4 border-t border-[var(--rule)] pt-3">
                  <p className="mb-2 text-xs font-semibold text-[var(--ink-soft)]">Birim maliyet varsayımları <span className="font-normal text-[var(--muted-2)]">· toplam maliyet hesabı için</span></p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {([
                      ["unitRegularCost", "Normal üretim", "para / adet", "Normal çalışma kapasitesinde üretilen bir adedin maliyeti."],
                      ["unitOvertimeCost", "Fazla mesai", "para / adet", "Fazla mesaiyle üretilen bir adedin ek maliyetleri dahil değeri."],
                      ["unitSubcontractCost", "Dış kaynak", "para / adet", "Taşerondan temin edilen bir adedin toplam maliyeti."],
                      ["unitInventoryCost", "Stok taşıma", "para / adet-dönem", "Dönem sonunda kalan bir adedin finansman ve depolama maliyeti."],
                      ["unitBacklogCost", "Karşılanamayan talep", "para / adet", "Geciken veya karşılanamayan bir sipariş adedinin tahmini ceza/kayıp maliyeti."],
                    ] as const).map(([key,label,unit,help])=><NumericField key={key} label={label} unit={unit} help={help} value={x[key]} onChange={(value)=>updateSop(x.id,{[key]:value})}/>) }
                  </div>
                </div>
                <p
                  className={`mt-3 rounded-lg p-2 text-xs ${result.meetsTarget ? "bg-[var(--st-ok-bg)] text-[var(--st-ok)]" : "bg-[var(--st-warn-bg)] text-[var(--st-warn)]"}`}
                >
                  Toplam arz {result.supply} · Karşılama oranı %{result.service} · Karşılanamayan talep{" "}
                  {result.backlog} · Dönem sonu stoku {result.endingInventory} · Toplam maliyet{" "}
                  {result.cost}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="card p-6">
        <PanelTitle
          eyebrow="P4.4 · Hat dengeleme"
          title="Takt, istasyon yükü ve iş tasarımı simülatörü"
          action="Çalışma ekle"
          onAction={addLine}
        />
        <div className="mt-4 flex flex-col gap-4">
          {workspace.lineBalanceStudies.map((study, i) => {
            const result = calculateLineBalance(study);
            return (
              <div
                key={i}
                className="record-row"
              >
                <RecordCardHeader title={`Hat dengeleme çalışması ${i + 1}`} onRemove={() => removeLine(i, study)} />
                <div className="grid gap-2 md:grid-cols-4">
                  <NumericField
                    label="Dönem üretim talebi"
                    unit="adet / dönem"
                    help="Seçilen çalışma süresi içinde tamamlanması gereken ürün miktarı. Takt süresinin paydasını oluşturur."
                    value={study.demand}
                    onChange={(value) => updateLine(i, { demand: value })}
                  />
                  <NumericField
                    label="Net kullanılabilir çalışma süresi"
                    unit="saniye / dönem"
                    help="Mola ve planlı duruşlar çıkarıldıktan sonra üretime kalan süre. 28.800 saniye, sekiz saattir."
                    value={study.availableSeconds}
                    onChange={(value) => updateLine(i, { availableSeconds: value })}
                  />
                  <label className="block"><span className="mb-1 block text-xs font-semibold text-[var(--ink-soft)]">İş organizasyonu</span><select className="field" value={study.mode} onChange={(e) => updateLine(i, { mode: e.target.value as LineBalanceStudy["mode"] })}><option value="LINE">Akış hattı · iş istasyonlara bölünür</option><option value="CELL">Hücresel üretim · ekip ürün ailesini tamamlar</option><option value="COMPLETE_ASSEMBLY">Tam montaj · bir kişi/ekip ürünü tamamlar</option></select><span className="mt-1 block text-[11px] leading-4 text-[var(--muted-2)]">Operasyonların fiziksel olarak nasıl örgütlendiğini seçin.</span></label>
                  <button
                    className="btn btn-secondary"
                    onClick={() => addOperation(i)}
                  >
                    Operasyon ekle
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  {study.operations.map((op) => (
                    <div
                      key={op.id}
                      className="subtle-panel"
                    >
                      <RecordCardHeader title={op.name || `Operasyon ${op.station}`} onRemove={() => removeOperation(i, op)} compact />
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <input
                        className="field sm:col-span-2"
                        value={op.name}
                        onChange={(e) =>
                          updateOperation(i, op.id, { name: e.target.value })
                        }
                        placeholder="Operasyon"
                      />
                      <NumericField
                        label="Standart işlem süresi"
                        unit="saniye / adet"
                        help="Bu operasyonun normal koşullarda bir ürün için gerektirdiği süre."
                        compact
                        value={op.seconds}
                        onChange={(value) => updateOperation(i, op.id, { seconds: value })}
                      />
                      <NumericField
                        label="Atandığı istasyon"
                        unit="istasyon no."
                        help="Aynı istasyon numarasındaki operasyon süreleri birlikte toplanır."
                        compact
                        value={op.station}
                        onChange={(value) => updateOperation(i, op.id, { station: value })}
                      />
                      <select
                        className="field"
                        value={op.ergonomicRisk}
                        onChange={(e) =>
                          updateOperation(i, op.id, {
                            ergonomicRisk: e.target
                              .value as LineOperation["ergonomicRisk"],
                          })
                        }
                      >
                        <option value="LOW">Ergo düşük</option>
                        <option value="MEDIUM">Ergo orta</option>
                        <option value="HIGH">Ergo yüksek</option>
                      </select>
                      <input
                        className="field"
                        value={op.qualityOwnership}
                        onChange={(e) =>
                          updateOperation(i, op.id, {
                            qualityOwnership: e.target.value,
                          })
                        }
                        placeholder="Kalite sahipliği"
                      />
                      </div>
                    </div>
                  ))}
                </div>
                <p
                  className={`mt-3 rounded-lg p-2 text-xs ${result.overloaded.length ? "bg-[var(--st-risk-bg)] text-[var(--st-risk)]" : "bg-[var(--st-ok-bg)] text-[var(--st-ok)]"}`}
                >
                  Takt {result.takt} sn · Kapasite {result.capacity} · Verim %
                  {result.efficiency} · Denge kaybı %{result.balanceLoss} ·
                  Aşırı istasyon: {result.overloaded.join(", ") || "yok"} ·
                  Yüksek ergonomi: {result.ergonomicHigh}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function DecisionLabsIntro() {
  return (
    <section className="subtle-panel">
      <p className="eyebrow">Karar Laboratuvarı kullanım rehberi</p>
      <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.012em]">
        Önce vermek istediğiniz kararı seçin
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
        Bu dört araç aynı anda doldurulmak zorunda değildir. Cevaplamak
        istediğiniz soruya uyan laboratuvarı kullanın; farklı varsayımlar için
        birden fazla senaryo ekleyip sonuçları karşılaştırın.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Kıyaslama",
            "Bizden daha iyi bir uygulama ne yapıyor ve bunu kendi koşullarımıza nasıl uyarlayabiliriz?",
          ],
          [
            "Kapasite senaryosu",
            "Talebi karşılayabilir miyiz; darboğaz veya yatırım değişirse sonuç ne olur?",
          ],
          [
            "Satış ve operasyon planı",
            "Talep değişirken stok, fazla mesai ve taşeron dengesini nasıl kurmalıyız?",
          ],
          [
            "Hat dengeleme",
            "Operasyonları istasyonlara nasıl dağıtırsak hedef üretim ritmini yakalarız?",
          ],
        ].map(([title, detail]) => (
          <div
            key={title}
            className="subtle-panel"
          >
            <strong className="text-sm text-[var(--ink)]">
              {title}
            </strong>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}


