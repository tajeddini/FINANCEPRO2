/* ---------- صفحه‌های اصلی برنامه (بخش اول) ---------- */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowUpLeft, Banknote, Bot, CalendarDays, Coins, Download, Filter,
  Landmark, PencilLine, Plus, QrCode, Receipt, Repeat,
  Scale, Search, Sparkles, Trash2, Upload, Wallet,
} from "lucide-react";
import {
  accById, catById, detectSmart, sumTx, useStore, type Tx,
} from "./lib/data";
import {
  calcEMI, faDate, faMoney, faNum, inRange, jalaliDateStr, jalaliMonthRange,
  jalaliShort, jalaliToday, periodRange, PERIODS, relTime, todayISO, useCountUp,
  type PeriodKey,
} from "./lib/utils";
import {
  AmountInput, Bar, Confirm, Empty, Field, JalaliPicker, MicButton, Modal,
  TInput, TSelect, useToast, hiddenMoney,
} from "./ui";
import { parseCSV, exportCSV } from "./excel";
import { Sparkline } from "./widgets";

/* ================= فرم تراکنش (افزودن/ویرایش) ================= */
export function TxModal({
  open, onClose, editing,
}: {
  open: boolean; onClose: () => void; editing?: Tx | null;
}) {
  const { state, mutate } = useStore();
  const toast = useToast();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [pay, setPay] = useState("کارت");
  const [touchedCat, setTouchedCat] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type); setTitle(editing.title); setAmount(String(editing.amount));
      setCategoryId(editing.categoryId); setAccountId(editing.accountId);
      setDate(editing.date); setPay(editing.payMethod ?? "کارت"); setTouchedCat(true);
    } else {
      setType("expense"); setTitle(""); setAmount(""); setDate(todayISO()); setPay("کارت");
      setTouchedCat(false);
      setAccountId(state.accounts[0]?.id ?? "");
      setCategoryId(state.categories.find((c) => c.type === "expense")?.id ?? "");
    }
  }, [open, editing]);

  useEffect(() => {
    if (touchedCat || !open) return;
    setCategoryId(state.categories.find((c) => c.type === type)?.id ?? "");
  }, [type, open]);

  const onTitle = (v: string) => {
    setTitle(v);
    if (v.length > 2) {
      const hint = detectSmart(v, state.categories);
      if (hint.categoryId && !touchedCat) setCategoryId(hint.categoryId);
    }
  };

  const submit = () => {
    const amt = Number(amount) || 0;
    if (!title.trim()) return toast("warn", "عنوان تراکنش را بنویسید.");
    if (amt <= 0) return toast("warn", "مبلغ باید بزرگ‌تر از صفر باشد.");
    if (editing) {
      mutate((d) => {
        const t = d.transactions.find((x) => x.id === editing.id);
        if (t) Object.assign(t, { title: title.trim(), amount: amt, type, categoryId, accountId, date, payMethod: pay });
      }, `تراکنش «${title.trim()}» ویرایش شد`);
      toast("ok", "تراکنش ویرایش شد.");
    } else {
      mutate((d) => {
        d.transactions.unshift({
          id: Math.random().toString(36).slice(2, 10), date, type, amount: amt,
          title: title.trim(), categoryId, accountId, payMethod: pay,
          createdAt: Date.now(), source: "app",
        });
      }, `تراکنش «${title.trim()}» ثبت شد`);
      toast("ok", `«${title.trim()}» ثبت شد.`);
    }
    onClose();
  };

  const cats = state.categories.filter((c) => c.type === type);

  return (
    <Modal open={open} onClose={onClose} title={editing ? "ویرایش تراکنش" : "ثبت تراکنش"} wide>
      <div className="flex rounded-xl p-1 gap-1 mb-4" style={{ background: "var(--fp-bg)" }}>
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="flex-1 rounded-lg py-2 text-[13px] font-black transition-all cursor-pointer"
            style={{
              background: type === t ? (t === "income" ? "var(--fp-mint)" : "var(--fp-coral)") : "transparent",
              color: type === t ? "#071b16" : "var(--fp-text3)",
            }}
          >
            {t === "income" ? "درآمد" : "هزینه"}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="عنوان">
          <div className="flex gap-2">
            <TInput value={title} onChange={(e) => onTitle(e.target.value)} placeholder="مثلاً: خرید سوپرمارکت" autoFocus />
            <MicButton onText={(t) => { setTitle(t); onTitle(t); }} />
          </div>
        </Field>
        <Field label="مبلغ (تومان)">
          <AmountInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="دسته">
          <TSelect value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setTouchedCat(true); }}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </TSelect>
        </Field>
        <Field label="حساب">
          <TSelect value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </TSelect>
        </Field>
        <Field label="تاریخ (شمسی)">
          <JalaliPicker value={date} onChange={setDate} />
        </Field>
        <Field label="روش پرداخت">
          <TSelect value={pay} onChange={(e) => setPay(e.target.value)}>
            {state.payment_methods.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </TSelect>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn btn-gold" onClick={submit}>
          <Plus className="w-4 h-4" strokeWidth={3} />
          {editing ? "ذخیرهٔ تغییرات" : "ثبت تراکنش"}
        </button>
      </div>
    </Modal>
  );
}

/* ================= ۱) داشبورد ================= */
export function DashboardPage({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { state } = useStore();
  const t = jalaliToday();
  const mr = jalaliMonthRange(t.jy, t.jm);
  const monthTxs = state.transactions.filter((x) => inRange(x.date, mr));
  const income = sumTx(monthTxs, "income");
  const expense = sumTx(monthTxs, "expense");
  const total = state.accounts.reduce((s, a) => s + a.balance, 0);

  const [hideBal, setHideBal] = useState(false);
  const [hideInc, setHideInc] = useState(false);
  const [hideExp, setHideExp] = useState(false);

  const bal = useCountUp(total);
  const inc = useCountUp(income);
  const exp = useCountUp(expense);

  const spark = useMemo(() => {
    const pts: number[] = [];
    let run = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const day = state.transactions.filter((x) => x.date === iso);
      run += day.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0)
        - day.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
      pts.push(run + total);
    }
    return pts;
  }, [state.transactions, total]);

  const challenge = state.challenges[0];
  const currenciesTotal = state.currencies.reduce((s, c) => s + c.rate * c.qty, 0);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rise-in">
        <div>
          <h1 className="font-display text-3xl md:text-4xl leading-tight">سلام! 👋</h1>
          <p className="text-[13px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>{jalaliDateStr()}</p>
        </div>
        <button className="btn btn-gold no-print" onClick={onQuickAdd}>
          <Plus className="w-4 h-4" strokeWidth={3} /> ثبت سریع تراکنش
        </button>
      </div>

      {/* آمار */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5" />} title="موجودی کل" color="var(--fp-accent)"
          value={hideBal ? hiddenMoney : faMoney(bal)} suffix="تومان"
          hide={hideBal} onHide={() => setHideBal(!hideBal)}
          foot={<Sparkline points={spark} height={44} color="var(--fp-accent)" />}
        />
        <StatCard
          icon={<ArrowDownRight className="w-5 h-5" />} title="درآمد این ماه" color="var(--fp-mint)"
          value={hideInc ? hiddenMoney : faMoney(inc)} suffix="تومان"
          hide={hideInc} onHide={() => setHideInc(!hideInc)}
          foot={<Bar pct={income > 0 ? 100 : 0} color="var(--fp-mint)" />}
        />
        <StatCard
          icon={<ArrowUpLeft className="w-5 h-5" />} title="هزینهٔ این ماه" color="var(--fp-coral)"
          value={hideExp ? hiddenMoney : faMoney(exp)} suffix="تومان"
          hide={hideExp} onHide={() => setHideExp(!hideExp)}
          foot={
            <p className="text-[11px] font-bold" style={{ color: "var(--fp-text3)" }}>
              {income > 0 ? `٪${faNum(Math.round((expense / income) * 100))} از درآمد ماه` : "هنوز درآمدی ثبت نشده"}
            </p>
          }
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* حساب‌ها */}
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
          <Head icon={<Landmark className="w-4.5 h-4.5" />} title="موجودی حساب‌ها" />
          <div className="grid gap-3.5 mt-4">
            {state.accounts.map((a) => {
              const share = total > 0 ? (a.balance / total) * 100 : 0;
              return (
                <div key={a.id} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2 text-[13px] font-black">
                      <i className="w-2.5 h-2.5 rounded-full not-italic" style={{ background: a.color }} />
                      {a.name}
                      <span className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{a.type}</span>
                    </span>
                    <span className="text-[13px] font-black tabular" style={{ color: a.balance < 0 ? "var(--fp-coral)" : "var(--fp-text)" }}>
                      {hideBal ? hiddenMoney : `${faMoney(a.balance)} ﷼`}
                    </span>
                  </div>
                  <Bar pct={share} color={a.color} />
                </div>
              );
            })}
          </div>

          {challenge && (
            <div className="mt-5 rounded-xl p-4 border" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-black flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--fp-accent)" }} />
                  {challenge.title}
                </span>
                <span className="text-[11px] font-black tabular" style={{ color: "var(--fp-text3)" }}>
                  ٪{faNum(Math.min(100, Math.round((challenge.saved / challenge.target) * 100)))}
                </span>
              </div>
              <div className="mt-2.5"><Bar pct={(challenge.saved / challenge.target) * 100} color="var(--fp-accent)" /></div>
              <p className="text-[11px] font-bold mt-2" style={{ color: "var(--fp-text3)" }}>
                {faMoney(challenge.saved)} از {faMoney(challenge.target)} تومان — روزی {faMoney(challenge.perDay)}
              </p>
            </div>
          )}
        </div>

        {/* فعالیت اخیر */}
        <div className="card p-5 rise-in lg:col-span-2" style={{ ["--d" as string]: "140ms" }}>
          <Head icon={<Receipt className="w-4.5 h-4.5" />} title="فعالیت اخیر" />
          <div className="grid gap-1 mt-2">
            {[...state.transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 7).map((tx) => {
              const c = catById(state, tx.categoryId);
              return (
                <div key={tx.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--fp-mint)_5%,transparent)]">
                  <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${c?.color ?? "#888"} 16%, transparent)`, color: c?.color }}>
                    {tx.type === "income" ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpLeft className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black truncate flex items-center gap-1.5">
                      {tx.title}
                      {tx.source === "bot" && <Bot className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--fp-sky)" }} />}
                    </p>
                    <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>
                      {c?.name ?? "—"} · {accById(state, tx.accountId)?.name} · {relTime(tx.createdAt)}
                    </p>
                  </div>
                  <span className="text-[13px] font-black tabular shrink-0" style={{ color: tx.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                    {tx.type === "income" ? "+" : "−"}{faMoney(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl p-4 border" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
              <Head icon={<Banknote className="w-4 h-4" />} title="ارز خارجی" small />
              {state.currencies.map((c) => (
                <div key={c.id} className="flex justify-between text-[12px] font-bold mt-2.5">
                  <span>{c.name} <span className="tabular" style={{ color: "var(--fp-text3)" }}>×{faNum(c.qty)}</span></span>
                  <span className="tabular">{faMoney(c.qty * c.rate)}</span>
                </div>
              ))}
              <p className="text-[11px] font-black mt-3 pt-2 border-t flex justify-between" style={{ borderColor: "var(--fp-border)", color: "var(--fp-accent)" }}>
                <span>معادل تومانی</span><span className="tabular">{faMoney(currenciesTotal)}</span>
              </p>
            </div>
            <div className="rounded-xl p-4 border" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
              <Head icon={<Repeat className="w-4 h-4" />} title="اشتراک‌های فعال" small />
              {state.subscriptions.slice(0, 3).map((s) => (
                <div key={s.id} className="flex justify-between text-[12px] font-bold mt-2.5">
                  <span>{s.name}</span>
                  <span className="tabular" style={{ color: "var(--fp-text3)" }}>{faMoney(s.amount)} / ماه</span>
                </div>
              ))}
              <p className="text-[11px] font-bold mt-3" style={{ color: "var(--fp-text3)" }}>
                تمدید بعدی: {jalaliShort(state.subscriptions[0]?.renew ?? todayISO())}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Head({ icon, title, small }: { icon: React.ReactNode; title: string; small?: boolean }) {
  return (
    <h3 className={`font-black flex items-center gap-2 ${small ? "text-[12.5px]" : "text-[14.5px]"}`} style={{ color: "var(--fp-text)" }}>
      <span style={{ color: "var(--fp-accent)" }}>{icon}</span>{title}
    </h3>
  );
}

function StatCard({ icon, title, value, suffix, color, hide, onHide, foot }: {
  icon: React.ReactNode; title: string; value: string; suffix: string; color: string;
  hide: boolean; onHide: () => void; foot?: React.ReactNode;
}) {
  return (
    <div className="card card-hover p-5 relative overflow-hidden">
      <div className="absolute -top-8 -start-8 w-28 h-28 rounded-full opacity-[0.12]" style={{ background: color }} />
      <div className="flex items-center justify-between relative">
        <span className="flex items-center gap-2 text-[12px] font-black" style={{ color: "var(--fp-text3)" }}>
          <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{icon}</span>
          {title}
        </span>
        <button className="icon-btn !w-8 !h-8" onClick={onHide} title={hide ? "نمایش" : "مخفی کردن"}>
          {hide ? <EyeOff /> : <EyeOn />}
        </button>
      </div>
      <p className="font-display text-[26px] md:text-3xl mt-3 tabular relative" style={{ color: hide ? "var(--fp-text3)" : color }}>
        {value} {!hide && <span className="text-[12px] font-body font-bold" style={{ color: "var(--fp-text3)" }}>{suffix}</span>}
      </p>
      <div className="mt-2.5 relative">{foot}</div>
    </div>
  );
}

function EyeOn() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-3 3.9M6.1 6.1A17.6 17.6 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 5.9-1.9M3 3l18 18" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

/* ================= ۲) تراکنش‌ها ================= */
export function TransactionsPage({ initQuery, initCat }: { initQuery?: string; initCat?: string }) {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [q, setQ] = useState(initQuery ?? "");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [catFilter, setCatFilter] = useState(initCat ?? "");
  const [editing, setEditing] = useState<Tx | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const range = periodRange(period);
  const filtered = useMemo(() => {
    return state.transactions
      .filter((t) => (type === "all" || t.type === type))
      .filter((t) => inRange(t.date, range))
      .filter((t) => !catFilter || t.categoryId === catFilter)
      .filter((t) => !q.trim() || t.title.includes(q.trim()) || (t.note ?? "").includes(q.trim()))
      .sort((a, b) => (b.date + b.createdAt).toString().localeCompare((a.date + a.createdAt).toString()));
  }, [state.transactions, type, period, q, catFilter, range.from, range.to]);

  const groups = useMemo(() => {
    const m = new Map<string, Tx[]>();
    for (const t of filtered) {
      if (!m.has(t.date)) m.set(t.date, []);
      m.get(t.date)!.push(t);
    }
    return [...m.entries()];
  }, [filtered]);

  const doImport = () => {
    const { rows, errors } = parseCSV(csvText, state);
    if (!rows.length) return toast("err", "ردیف معتبری در CSV پیدا نشد.");
    mutate((d) => {
      for (const r of rows) {
        d.transactions.unshift({
          id: Math.random().toString(36).slice(2, 10), date: r.date, type: r.type, amount: r.amount,
          title: r.title, categoryId: r.categoryId, accountId: d.accounts[0]?.id ?? "",
          payMethod: "کارت", createdAt: Date.now(), source: "app",
        });
      }
    }, `ورود CSV — ${rows.length} تراکنش`);
    toast("ok", `${faNum(rows.length)} تراکنش وارد شد${errors ? ` (${faNum(errors)} خطا نادیده گرفته شد)` : ""}.`);
    setCsvOpen(false); setCsvText("");
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">تراکنش‌ها</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(state)}><Download className="w-4 h-4" /> خروجی CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCsvOpen(true)}><Upload className="w-4 h-4" /> ورود CSV</button>
        </div>
      </div>

      <div className="card p-4 grid gap-3 rise-in" style={{ ["--d" as string]: "60ms" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative grow max-w-xs">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3" style={{ color: "var(--fp-text3)" }} />
            <TInput className="!ps-9" placeholder="جست‌وجو در عنوان…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {([["all", "همه"], ["income", "درآمدها"], ["expense", "هزینه‌ها"]] as const).map(([k, l]) => (
            <button key={k} className={`chip ${type === k ? "chip-on" : ""}`} onClick={() => setType(k)}>
              {k === "income" ? <ArrowDownRight className="w-3.5 h-3.5" /> : k === "expense" ? <ArrowUpLeft className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}{l}
            </button>
          ))}
          {catFilter && (
            <button className="chip chip-on" onClick={() => setCatFilter("")}>
              دسته: {catById(state, catFilter)?.name} ×
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button key={p.key} className={`chip ${period === p.key ? "chip-on" : ""}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rise-in" style={{ ["--d" as string]: "120ms" }}>
        {groups.length === 0 && <div className="card"><Empty text="تراکنشی با این فیلترها پیدا نشد." /></div>}
        {groups.map(([date, txs]) => {
          const net = sumTx(txs, "income") - sumTx(txs, "expense");
          return (
            <div key={date} className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <span className="text-[12px] font-black flex items-center gap-1.5" style={{ color: "var(--fp-text2)" }}>
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: "var(--fp-accent)" }} /> {faDate(date)}
                </span>
                <span className="text-[11.5px] font-black tabular" style={{ color: net >= 0 ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                  خالص: {net >= 0 ? "+" : "−"}{faMoney(net)}
                </span>
              </div>
              <div>
                {txs.map((tx) => {
                  const c = catById(state, tx.categoryId);
                  return (
                    <div key={tx.id} className="group flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-[color-mix(in_srgb,var(--fp-mint)_4%,transparent)]" style={{ borderColor: "var(--fp-border)" }}>
                      <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                        style={{ background: `color-mix(in srgb, ${c?.color ?? "#888"} 15%, transparent)`, color: c?.color }}>
                        {tx.type === "income" ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpLeft className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-black truncate flex items-center gap-1.5">
                          {tx.title}
                          {tx.source === "bot" && <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--fp-sky) 15%, transparent)", color: "var(--fp-sky)" }}>ربات</span>}
                        </p>
                        <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>
                          {c?.name} · {accById(state, tx.accountId)?.name} · {tx.payMethod ?? "—"}
                        </p>
                      </div>
                      <span className="text-[13.5px] font-black tabular" style={{ color: tx.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                        {tx.type === "income" ? "+" : "−"}{faMoney(tx.amount)}
                      </span>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="icon-btn" title="ویرایش" onClick={() => { setEditing(tx); setOpenEdit(true); }}><PencilLine className="w-4 h-4" /></button>
                        <button className="icon-btn hover:!text-[var(--fp-coral)]" title="حذف (۳۰ ثانیه بازگشت)"
                          onClick={() => trashItem("transactions", tx.id, tx.title)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <TxModal open={openEdit} onClose={() => { setOpenEdit(false); setEditing(null); }} editing={editing} />

      <Modal open={csvOpen} onClose={() => setCsvOpen(false)} title="ورود تراکنش از CSV" wide>
        <p className="text-[12.5px] font-bold leading-6 mb-3" style={{ color: "var(--fp-text2)" }}>
          قالب: <code dir="ltr" className="text-[11.5px] px-1.5 py-0.5 rounded" style={{ background: "var(--fp-bg)" }}>date,type,title,category,amount</code>{" "}
          — تاریخ میلادی (۲۰۲۵-۰۵-۱۲)، نوع income/expense، مبلغ عددی.
        </p>
        <textarea
          className="input h-40 font-mono !text-[12px]" dir="ltr"
          placeholder={"2025-05-12,expense,Snapp,رفت‌وآمد,95000\n2025-05-13,income,Project,پروژه,3200000"}
          value={csvText} onChange={(e) => setCsvText(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> انتخاب فایل
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => setCsvText(String(r.result ?? ""));
              r.readAsText(f);
            }} />
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setCsvOpen(false)}>انصراف</button>
            <button className="btn btn-mint" onClick={doImport}><Upload className="w-4 h-4" /> وارد کردن</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ================= ۳) گزارش دسته‌ها ================= */
export function CategoriesPage({ onDrill }: { onDrill: (catId: string, period: PeriodKey) => void }) {
  const { state } = useStore();
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [type, setType] = useState<"expense" | "income">("expense");

  const range = periodRange(period);
  const txs = state.transactions.filter((t) => t.type === type && inRange(t.date, range));
  const total = sumTx(txs);

  const rows = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txs) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    return [...m.entries()]
      .map(([catId, sum]) => ({ cat: catById(state, catId), sum }))
      .filter((r) => r.cat)
      .sort((a, b) => b.sum - a.sum);
  }, [txs, state]);

  const donut = useMemo(() => {
    const C = 2 * Math.PI * 42;
    let acc = 0;
    return rows.slice(0, 6).map((r) => {
      const pct = total > 0 ? r.sum / total : 0;
      const seg = { color: r.cat!.color, dash: `${pct * C - 2.5} ${C - pct * C + 2.5}`, off: -acc * C };
      acc += pct;
      return seg;
    });
  }, [rows, total]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">گزارش دسته‌ها</h1>
        <div className="flex gap-2">
          <button className={`chip ${type === "expense" ? "chip-on" : ""}`} onClick={() => setType("expense")}>هزینه‌ها</button>
          <button className={`chip ${type === "income" ? "chip-on" : ""}`} onClick={() => setType("income")}>درآمدها</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 rise-in" style={{ ["--d" as string]: "50ms" }}>
        {PERIODS.map((p) => (
          <button key={p.key} className={`chip ${period === p.key ? "chip-on" : ""}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-6 grid place-items-center rise-in" style={{ ["--d" as string]: "90ms" }}>
          <div className="relative">
            <svg width="190" height="190" viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--fp-bg3)" strokeWidth="12" />
              {donut.map((s, i) => (
                <circle key={i} cx="50" cy="50" r="42" fill="none" stroke={s.color} strokeWidth="12"
                  strokeDasharray={s.dash} strokeDashoffset={s.off} strokeLinecap="butt"
                  style={{ transition: "all .7s cubic-bezier(.3,.7,.2,1)" }} />
              ))}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[10.5px] font-black" style={{ color: "var(--fp-text3)" }}>جمع {type === "expense" ? "هزینه" : "درآمد"}</p>
                <p className="font-display text-xl tabular mt-0.5" style={{ color: type === "expense" ? "var(--fp-coral)" : "var(--fp-mint)" }}>{faMoney(total)}</p>
                <p className="text-[10px] font-bold" style={{ color: "var(--fp-text3)" }}>تومان</p>
              </div>
            </div>
          </div>
          <p className="text-[11.5px] font-bold mt-4" style={{ color: "var(--fp-text3)" }}>
            {faNum(rows.length)} دسته · {faNum(txs.length)} تراکنش در بازهٔ انتخابی
          </p>
        </div>

        <div className="card p-5 lg:col-span-2 rise-in" style={{ ["--d" as string]: "140ms" }}>
          {rows.length === 0 && <Empty text="در این بازه تراکنشی ثبت نشده." />}
          <div className="grid gap-3">
            {rows.map((r, i) => {
              const pct = total > 0 ? (r.sum / total) * 100 : 0;
              const count = txs.filter((t) => t.categoryId === r.cat!.id).length;
              return (
                <button key={r.cat!.id} onClick={() => onDrill(r.cat!.id, period)}
                  className="group text-start rounded-xl border p-3.5 transition-all cursor-pointer hover:-translate-y-0.5"
                  style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-[13px] font-black">
                      <i className="w-3 h-3 rounded-full not-italic" style={{ background: r.cat!.color }} />
                      {r.cat!.name}
                      <span className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{faNum(count)} تراکنش</span>
                    </span>
                    <span className="text-[13px] font-black tabular">
                      {faMoney(r.sum)} <span className="text-[10.5px]" style={{ color: r.cat!.color }}>٪{faNum(Math.round(pct))}</span>
                    </span>
                  </div>
                  <Bar pct={pct} color={r.cat!.color} delay={i * 90} />
                  <p className="text-[10px] font-bold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--fp-accent)" }}>
                    برای دیدن تراکنش‌های این دسته کلیک کنید ←
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= ۴) بدهی‌ها ================= */
export function DebtsPage() {
  const { state, mutate } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<"debt" | "credit" | "inst">("debt");
  const [payFor, setPayFor] = useState<{ id: string; person: string; remaining: number } | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [loan, setLoan] = useState({ p: "10000000", r: "23", n: "12" });
  const [qr, setQr] = useState<string | null>(null);

  const debts = state.debts.filter((d) => d.kind === tab);
  const emi = calcEMI(Number(loan.p) || 0, Number(loan.r) || 0, Number(loan.n) || 0);

  const addForm = tab !== "inst" && (
    <AddDebtForm kind={tab} onDone={() => toast("ok", tab === "debt" ? "بدهی ثبت شد." : "طلب ثبت شد.")} />
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">بدهی‌ها و طلب‌ها</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => setQr("درخواست وجه")}>
          <QrCode className="w-4 h-4" /> QR درخواست وجه
        </button>
      </div>

      <div className="flex gap-2 rise-in" style={{ ["--d" as string]: "50ms" }}>
        {([["debt", "بدهی‌ها", Coins], ["credit", "طلب‌ها", Scale], ["inst", "اقساط", Repeat]] as const).map(([k, l, I]) => (
          <button key={k} className={`chip !text-[12.5px] !px-4 !py-2 ${tab === k ? "chip-on" : ""}`} onClick={() => setTab(k)}>
            <I className="w-4 h-4" /> {l}
          </button>
        ))}
      </div>

      {tab !== "inst" ? (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 grid gap-3 rise-in" style={{ ["--d" as string]: "100ms" }}>
            {debts.length === 0 && <div className="card"><Empty text={tab === "debt" ? "هیچ بدهی باز ندارید. آفرین! 🎉" : "طلبی ثبت نشده."} /></div>}
            {debts.map((d) => {
              const remaining = d.amount - d.paid;
              return (
                <div key={d.id} className="card card-hover p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-black">{d.person}</p>
                      <p className="text-[11px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>
                        {d.note ?? "—"} {d.due && `· سررسید: ${jalaliShort(d.due)}`}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[14px] font-black tabular" style={{ color: tab === "debt" ? "var(--fp-coral)" : "var(--fp-mint)" }}>
                        {faMoney(remaining)} <span className="text-[10px]" style={{ color: "var(--fp-text3)" }}>از {faMoney(d.amount)}</span>
                      </p>
                      <button className="btn btn-mint btn-sm mt-1.5" disabled={remaining <= 0}
                        onClick={() => { setPayFor({ id: d.id, person: d.person, remaining }); setPayAmt(""); }}>
                        {tab === "debt" ? "پرداخت" : "دریافت"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3"><Bar pct={(d.paid / d.amount) * 100} color={tab === "debt" ? "var(--fp-coral)" : "var(--fp-mint)"} /></div>
                </div>
              );
            })}
          </div>
          <div className="rise-in" style={{ ["--d" as string]: "160ms" }}>{addForm}</div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 grid gap-3 rise-in" style={{ ["--d" as string]: "100ms" }}>
            {state.installments.map((i) => {
              const pct = (i.paidCount / i.months) * 100;
              return (
                <div key={i.id} className="card card-hover p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-black">{i.title}</p>
                      <p className="text-[11px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>
                        قسط {faNum(i.paidCount + 1)} از {faNum(i.months)} · شروع: {jalaliShort(i.start)} · {accById(state, i.accountId)?.name}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[14px] font-black tabular">{faMoney(i.amountPerMonth)} <span className="text-[10px]" style={{ color: "var(--fp-text3)" }}>/ ماه</span></p>
                      <button className="btn btn-gold btn-sm mt-1.5" disabled={i.paidCount >= i.months}
                        onClick={() => {
                          mutate((d) => {
                            const x = d.installments.find((y) => y.id === i.id);
                            if (x) x.paidCount++;
                            d.transactions.unshift({
                              id: Math.random().toString(36).slice(2, 10), date: todayISO(), type: "expense",
                              amount: i.amountPerMonth, title: `قسط «${i.title}»`, categoryId: d.categories.find((c) => c.name === "متفرقه")?.id ?? "",
                              accountId: i.accountId, payMethod: "شبا", createdAt: Date.now(), source: "app",
                            });
                          }, `قسط «${i.title}» پرداخت شد`);
                          toast("ok", "قسط پرداخت و به‌عنوان تراکنش ثبت شد.");
                        }}>
                        پرداخت قسط
                      </button>
                    </div>
                  </div>
                  <div className="mt-3"><Bar pct={pct} color="var(--fp-accent)" /></div>
                </div>
              );
            })}
          </div>
          <div className="card p-5 h-fit rise-in" style={{ ["--d" as string]: "160ms" }}>
            <Head icon={<Scale className="w-4.5 h-4.5" />} title="ماشین‌حساب وام" />
            <div className="grid gap-3 mt-4">
              <Field label="مبلغ وام (تومان)"><AmountInput value={loan.p} onChange={(v) => setLoan({ ...loan, p: v })} /></Field>
              <Field label="سود سالانه (٪)"><TInput dir="ltr" value={faNum(loan.r)} onChange={(e) => setLoan({ ...loan, r: e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))) })} /></Field>
              <Field label="تعداد ماه"><TInput dir="ltr" value={faNum(loan.n)} onChange={(e) => setLoan({ ...loan, n: e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))) })} /></Field>
            </div>
            <div className="rounded-xl p-4 mt-4 border" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
              <div className="flex justify-between text-[12.5px] font-black"><span>قسط ماهانه</span><span className="tabular" style={{ color: "var(--fp-accent)" }}>{faMoney(emi.monthly)}</span></div>
              <div className="flex justify-between text-[11.5px] font-bold mt-2" style={{ color: "var(--fp-text2)" }}><span>جمع بازپرداخت</span><span className="tabular">{faMoney(emi.total)}</span></div>
              <div className="flex justify-between text-[11.5px] font-bold mt-1.5" style={{ color: "var(--fp-text2)" }}><span>سود پرداختی</span><span className="tabular" style={{ color: "var(--fp-coral)" }}>{faMoney(emi.interest)}</span></div>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={`${tab === "debt" ? "پرداخت به" : "دریافت از"} ${payFor?.person ?? ""}`}>
        <Field label="مبلغ (تومان) — باقی‌مانده: "><AmountInput value={payAmt} onChange={setPayAmt} /></Field>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-ghost" onClick={() => setPayFor(null)}>انصراف</button>
          <button className="btn btn-mint" onClick={() => {
            const v = Math.min(Number(payAmt) || 0, payFor?.remaining ?? 0);
            if (v <= 0) return toast("warn", "مبلغ معتبر نیست.");
            mutate((d) => {
              const x = d.debts.find((y) => y.id === payFor!.id);
              if (x) x.paid = Math.min(x.amount, x.paid + v);
            }, `پرداخت ${faMoney(v)} به ${payFor?.person}`);
            toast("ok", "ثبت شد."); setPayFor(null);
          }}>ثبت</button>
        </div>
      </Modal>

      <Modal open={!!qr} onClose={() => setQr(null)} title="QR درخواست وجه">
        <FakeQR label={qr ?? ""} />
        <p className="text-[11.5px] font-bold text-center mt-3 leading-6" style={{ color: "var(--fp-text3)" }}>
          این QR نمونهٔ نمایشی است؛ در نسخهٔ تولید، لینک پرداخت شاپرک جایگزین می‌شود.
        </p>
      </Modal>
    </div>
  );
}

function AddDebtForm({ kind, onDone }: { kind: "debt" | "credit"; onDone: () => void }) {
  const { mutate } = useStore();
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(todayISO());
  const [note, setNote] = useState("");
  return (
    <div className="card p-5 h-fit">
      <Head icon={<Plus className="w-4.5 h-4.5" />} title={kind === "debt" ? "ثبت بدهی جدید" : "ثبت طلب جدید"} />
      <div className="grid gap-3 mt-4">
        <Field label="طرف حساب"><TInput value={person} onChange={(e) => setPerson(e.target.value)} placeholder="مثلاً: رضا" /></Field>
        <Field label="مبلغ (تومان)"><AmountInput value={amount} onChange={setAmount} /></Field>
        <Field label="سررسید"><JalaliPicker value={due} onChange={setDue} /></Field>
        <Field label="یادداشت"><TInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <button className="btn btn-gold mt-1" onClick={() => {
          if (!person.trim() || !Number(amount)) return;
          mutate((d) => {
            d.debts.push({ id: Math.random().toString(36).slice(2, 10), kind, person: person.trim(), amount: Number(amount), paid: 0, due, note: note.trim() || undefined });
          }, `${kind === "debt" ? "بدهی" : "طلب"} «${person.trim()}» ثبت شد`);
          setPerson(""); setAmount(""); setNote(""); onDone();
        }}>
          <Plus className="w-4 h-4" strokeWidth={3} /> ثبت
        </button>
      </div>
    </div>
  );
}

function FakeQR({ label }: { label: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const ch of label) h = ((h ^ ch.charCodeAt(0)) * 16777619) >>> 0;
    const rnd = () => { h = (h * 1103515245 + 12345) >>> 0; return h / 4294967295; };
    const n = 21;
    const grid: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd() > 0.52));
    const finder = (r: number, c: number) => {
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        const on = i === 0 || i === 6 || j === 0 || j === 6 || (i > 1 && i < 5 && j > 1 && j < 5);
        grid[r + i][c + j] = on;
      }
    };
    finder(0, 0); finder(0, 14); finder(14, 0);
    return grid;
  }, [label]);
  return (
    <div className="mx-auto w-fit p-4 rounded-2xl" style={{ background: "#fff" }}>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: "repeat(21, 8px)" }} dir="ltr">
        {cells.flatMap((row, r) => row.map((on, c) => (
          <span key={`${r}-${c}`} className="w-2 h-2 rounded-[2px]" style={{ background: on ? "#0a2019" : "#fff" }} />
        )))}
      </div>
    </div>
  );
}
