/* ---------- صفحهٔ گزارش دسته‌ها ---------- */
import { Fragment, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { catById, sumTx, useStore } from "../lib/data";
import { faMoney, faNum, inRange, jalaliShort } from "../lib/utils";
import { Bar, CatGlyph, Empty, PeriodFilter, usePeriod } from "../ui";
import { Head } from "./shared";

export default function CategoriesPage() {
  const { state } = useStore();
  const pf = usePeriod("thisMonth");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [selected, setSelected] = useState<string>("");

  const range = pf.range;
  const txs = useMemo(() =>
    state.transactions.filter((t) => t.type === type && inRange(t.date, range)),
    [state.transactions, type, range]);
  const total = sumTx(txs);

  const rows = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txs) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    return [...m.entries()]
      .map(([id, sum]) => ({ cat: catById(state, id), sum }))
      .filter((r) => r.cat)
      .sort((a, b) => b.sum - a.sum);
  }, [txs, state]);

  const selCat = selected ? catById(state, selected) : undefined;
  const selTxs = selected ? txs.filter((t) => t.categoryId === selected) : [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">گزارش دسته‌ها</h1>
        <div className="flex gap-1.5">
          <button className={`chip ${type === "expense" ? "chip-on" : ""}`} onClick={() => { setType("expense"); setSelected(""); }}>هزینه‌ها</button>
          <button className={`chip ${type === "income" ? "chip-on" : ""}`} onClick={() => { setType("income"); setSelected(""); }}>درآمدها</button>
        </div>
      </div>

      <PeriodFilter pf={pf} count={<>{faNum(txs.length)} تراکنش</>} className="rise-in" />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
          <Head icon={<Scale className="w-4.5 h-4.5" />} title="جمع دوره" />
          <p className="font-display text-[clamp(1.25rem,5.5vw,1.875rem)] mt-3 tabular whitespace-nowrap" style={{ color: type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>{faMoney(total)}</p>
          <p className="text-[11px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>تومان · {pf.label}</p>
          <div className="mt-4 grid gap-1.5">
            {rows.slice(0, 5).map((r) => (
              <div key={r.cat!.id} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.cat!.color }} />
                <span className="text-[11px] font-bold flex-1 truncate">{r.cat!.name}</span>
                <span className="text-[11px] font-black tabular">٪{faNum(total > 0 ? Math.round((r.sum / total) * 100) : 0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2 rise-in" style={{ ["--d" as string]: "140ms" }}>
          {rows.length === 0 && <Empty text="در این بازه تراکنشی ثبت نشده." />}
          <div className="grid gap-3">
            {rows.map((r, i) => {
              const pct = total > 0 ? (r.sum / total) * 100 : 0;
              const count = txs.filter((t) => t.categoryId === r.cat!.id).length;
              const isSel = selected === r.cat!.id;
              return (
                <Fragment key={r.cat!.id}>
                  <button onClick={() => setSelected((s) => (s === r.cat!.id ? "" : r.cat!.id))}
                    className="group text-start rounded-xl border p-3.5 transition-all cursor-pointer hover:-translate-y-0.5"
                    style={{
                      borderColor: isSel ? r.cat!.color : "var(--fp-border)",
                      background: isSel ? `color-mix(in srgb, ${r.cat!.color} 10%, var(--fp-bg))` : "var(--fp-bg)",
                      boxShadow: isSel ? `0 8px 24px -12px color-mix(in srgb, ${r.cat!.color} 55%, transparent)` : "none",
                    }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="flex items-center gap-2 text-[13px] font-black min-w-0">
                        <CatGlyph icon={r.cat!.icon} color={r.cat!.color} className="w-8 h-8 shrink-0" iconClass="w-4 h-4" />
                        <span className="truncate">{r.cat!.name}</span>
                        <span className="text-[10.5px] font-bold shrink-0 whitespace-nowrap" style={{ color: "var(--fp-text3)" }}>{faNum(count)} تراکنش</span>
                      </span>
                      <span className="text-[13px] font-black tabular shrink-0 whitespace-nowrap">
                        {faMoney(r.sum)} <span className="text-[10.5px]" style={{ color: r.cat!.color }}>٪{faNum(Math.round(pct))}</span>
                      </span>
                    </div>
                    <Bar pct={pct} color={r.cat!.color} delay={i * 90} />
                    <p className={`text-[10px] font-bold mt-1.5 transition-opacity ${isSel ? "" : "opacity-0 group-hover:opacity-100"}`} style={{ color: "var(--fp-accent)" }}>
                      {isSel ? "▲ دوباره کلیک کن تا جمع شود" : "▼ کلیک: تراکنش‌ها همین‌جا زیرش باز می‌شود"}
                    </p>
                  </button>
                  {isSel && selCat && (
                    <div className="rounded-xl border p-3 grid gap-2" style={{ borderColor: `color-mix(in srgb, ${selCat.color} 40%, transparent)`, background: "var(--fp-bg)" }}>
                      <p className="text-[11.5px] font-black" style={{ color: selCat.color }}>
                        تراکنش‌های «{selCat.name}» در {pf.label} · جمع {faMoney(r.sum)} تومان
                      </p>
                      <div className="max-h-64 overflow-y-auto grid gap-1.5">
                        {selTxs.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "var(--fp-bg2)" }}>
                            <span className="text-[10.5px] font-bold shrink-0 whitespace-nowrap" style={{ color: "var(--fp-text3)" }}>{jalaliShort(t.date)}</span>
                            <span className="text-[11.5px] font-black flex-1 min-w-0 truncate">{t.note || t.title}</span>
                            <span className="text-[11.5px] font-black tabular shrink-0 whitespace-nowrap" style={{ color: "var(--fp-text)" }}>{faMoney(t.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
