/* ---------- صفحهٔ تراکنش‌ها ---------- */
import { useMemo, useRef, useState } from "react";
import { Bot, CalendarDays, Download, PencilLine, Search, Trash2, Upload } from "lucide-react";
import { accById, catById, getTags, sumTx, tagById, useStore, type ID, type Tx } from "../lib/data";
import { faDate, faMoney, faNum, inRange } from "../lib/utils";
import { parseCSV, exportCSV } from "../excel";
import { CatGlyph, Confirm, Empty, PeriodFilter, TInput, TSelect, usePeriod, useToast } from "../ui";
import TxModal from "./tx-modal";

export default function TransactionsPage({ initQuery, initCat }: { initQuery?: string; initCat?: string }) {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const pf = usePeriod("thisMonth");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [q, setQ] = useState(initQuery ?? "");
  const [catFilter, setCatFilter] = useState(initCat ?? "");
  const [tagFilter, setTagFilter] = useState<ID | "">("");
  const [editing, setEditing] = useState<Tx | null>(null);
  const [confirmDel, setConfirmDel] = useState<Tx | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const range = pf.range;
  const filtered = useMemo(() => {
    return state.transactions
      .filter((t) => (type === "all" || t.type === type))
      .filter((t) => inRange(t.date, range))
      .filter((t) => !catFilter || t.categoryId === catFilter)
      .filter((t) => !tagFilter || t.tag === tagFilter)
      .filter((t) => !q.trim() || (t.note || t.title).includes(q.trim()))
      .sort((a, b) => (b.date + b.createdAt).toString().localeCompare((a.date + a.createdAt).toString()));
  }, [state.transactions, type, range, catFilter, tagFilter, q]);

  const income = sumTx(filtered, "income");
  const expense = sumTx(filtered, "expense");

  const groups = useMemo(() => {
    const m = new Map<string, Tx[]>();
    for (const t of filtered) {
      const arr = m.get(t.date) ?? [];
      arr.push(t);
      m.set(t.date, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { rows, errors } = parseCSV(String(reader.result), state);
      if (!rows.length) return toast("err", `فایل خوانا نبود${errors ? ` (${faNum(errors)} خط خطا)` : ""}.`);
      mutate((d) => {
        for (const r of rows) {
          d.transactions.unshift({
            id: Math.random().toString(36).slice(2, 10), date: r.date, type: r.type, amount: r.amount,
            title: r.title, categoryId: r.categoryId || d.categories[0]?.id || "", accountId: d.accounts[0]?.id || "",
            createdAt: Date.now(), source: "app",
          });
        }
      }, `ورود ${faNum(rows.length)} تراکنش از CSV`);
      toast("ok", `${faNum(rows.length)} تراکنش وارد شد${errors ? `، ${faNum(errors)} خط نادیده گرفته شد` : ""}.`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">تراکنش‌ها</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> ورود CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
          <button className="btn btn-ghost btn-sm" onClick={() => { exportCSV(state); toast("ok", "خروجی CSV دانلود شد."); }}>
            <Download className="w-4 h-4" /> خروجی CSV
          </button>
        </div>
      </div>

      <PeriodFilter pf={pf} count={<>{faNum(filtered.length)} تراکنش</>} className="rise-in" />

      <div className="card p-3.5 flex flex-wrap items-center gap-2 rise-in" style={{ ["--d" as string]: "60ms" }}>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3" style={{ color: "var(--fp-text3)" }} />
          <TInput className="!ps-9" placeholder="جست‌وجو…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {[["all", "همه"], ["income", "درآمد"], ["expense", "هزینه"]].map(([k, l]) => (
            <button key={k} className={`chip ${type === k ? "chip-on" : ""}`} onClick={() => setType(k as "all" | "income" | "expense")}>{l}</button>
          ))}
        </div>
        <TSelect className="!w-auto" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">همهٔ دسته‌ها</option>
          {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </TSelect>
      </div>

      <div className="flex flex-wrap gap-1.5 rise-in" style={{ ["--d" as string]: "80ms" }}>
        <button className={`chip ${tagFilter === "" ? "chip-on" : ""}`} onClick={() => setTagFilter("")}>همهٔ برچسب‌ها</button>
        {getTags(state).map((tg) => (
          <button key={tg.id} onClick={() => setTagFilter(tagFilter === tg.id ? "" : tg.id)}
            className="chip"
            style={tagFilter === tg.id ? { background: tg.color, borderColor: tg.color, color: "#071b16" } : { color: tg.color, borderColor: `color-mix(in srgb, ${tg.color} 50%, transparent)` }}>
            {tg.label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex items-center justify-between rise-in" style={{ ["--d" as string]: "100ms" }}>
        <span className="text-[12px] font-black" style={{ color: "var(--fp-mint)" }}>درآمد: {faMoney(income)}</span>
        <span className="text-[12px] font-black" style={{ color: "var(--fp-coral)" }}>هزینه: {faMoney(expense)}</span>
        <span className="text-[12px] font-black" style={{ color: "var(--fp-accent)" }}>تراز: {faMoney(income - expense)}</span>
      </div>

      {groups.length === 0 && <div className="card rise-in"><Empty text="تراکنشی با این فیلترها پیدا نشد." /></div>}

      {groups.map(([date, txs]) => (
        <div key={date} className="card overflow-hidden rise-in">
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "var(--fp-bg3)" }}>
            <span className="text-[12px] font-black flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" style={{ color: "var(--fp-accent)" }} /> {faDate(date)}</span>
            <span className="text-[11px] font-bold tabular" style={{ color: "var(--fp-text3)" }}>{faNum(txs.length)} تراکنش</span>
          </div>
          <div>
{txs.map((tx) => {
                const c = catById(state, tx.categoryId);
                const tg = tagById(state, tx.tag);
                const acc = accById(state, tx.accountId);
                const detail = [tx.note, acc?.name, tx.payMethod].filter(Boolean).join(" · ");
                const hasDetail = detail.length > 0;
                const btnEdit = (
                  <button title="ویرایش" onClick={() => setEditing(tx)}
                    className="w-7 h-7 rounded-lg grid place-items-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ background: "color-mix(in srgb, var(--fp-accent) 13%, transparent)", color: "var(--fp-accent)" }}>
                    <PencilLine className="w-3.5 h-3.5" />
                  </button>
                );
                const btnDel = (
                  <button title="حذف" onClick={() => setConfirmDel(tx)}
                    className="w-7 h-7 rounded-lg grid place-items-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ background: "color-mix(in srgb, var(--fp-coral) 12%, transparent)", color: "var(--fp-coral)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                );
                return (
                  <div key={tx.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b last:border-b-0 transition-colors hover:bg-[color-mix(in_srgb,var(--fp-mint)_3%,transparent)]" style={{ borderColor: "var(--fp-border2)" }}>
                    {/* آیکون دسته */}
                    <CatGlyph icon={c?.icon} color={c?.color} className="w-9 h-9 rounded-xl shrink-0" iconClass="w-4.5 h-4.5" />

                    {/* اطلاعات: دسکتاپ یک‌خط، موبایل/PWA دوخط خوانا */}
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1.5 min-w-0 text-[13px] leading-6">
                        <span className="font-black truncate" style={{ color: "var(--fp-text)" }}>{tx.title}</span>
                        {tx.source === "bot" && <Bot className="w-3 h-3 shrink-0" style={{ color: "var(--fp-sky)" }} />}
                        {tg && (
                          <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0 whitespace-nowrap" style={{ background: `color-mix(in srgb, ${tg.color} 14%, transparent)`, color: tg.color }}>
                            {tg.label}
                          </span>
                        )}
                        {hasDetail && (
                          <span className="hidden md:inline text-[12px] font-medium truncate min-w-0" style={{ color: "var(--fp-text3)" }}>
                            · {detail}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 md:hidden mt-0.5">
                        {hasDetail ? (
                          <p className="flex-1 min-w-0 truncate text-[11px] leading-5 font-medium" style={{ color: "var(--fp-text3)" }}>{detail}</p>
                        ) : (
                          <span className="flex-1" />
                        )}
                        <div className="flex gap-1 shrink-0">{btnEdit}{btnDel}</div>
                      </div>
                    </div>

                    {/* دکمه‌ها در دسکتاپ (در موبایل زیر جزئیات‌اند) */}
                    <div className="hidden md:flex items-center gap-1 shrink-0">{btnEdit}{btnDel}</div>

                    {/* قیمت — همیشه سمت چپ */}
                    <span className="text-[13px] md:text-[13.5px] font-black tabular shrink-0 whitespace-nowrap" style={{ color: tx.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                      {tx.type === "income" ? "+" : "−"}{faMoney(tx.amount)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      <TxModal open={!!editing} onClose={() => setEditing(null)} editing={editing} />
      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onYes={() => {
          if (confirmDel) {
            trashItem("transactions", confirmDel.id, confirmDel.note || confirmDel.title);
            toast("warn", "حذف شد — تا ۳۰ ثانیه می‌توانی برگردانی.");
          }
        }}
        title="حذف تراکنش"
        desc={`آیا از حذف «${confirmDel?.note || confirmDel?.title}» مطمئن هستید؟ تا ۳۰ ثانیه فرصت بازگردانی دارید.`}
        yesLabel="بله، حذف شود"
      />
    </div>
  );
}
