/* ---------- صفحه‌های اصلی برنامه (بخش اول) ---------- */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowUpLeft, Banknote, Bot, CalendarDays, Check, Coins, Download, Filter,
  Landmark, Lightbulb, MessageSquare, PencilLine, Plus, QrCode, Receipt, Repeat,
  Scale, Search, Sparkles, Trash2, Upload, Wallet,
} from "lucide-react";
import {
  accById, catById, detectSmart, getTags, normalizeInstallments, sumTx, tagById, useStore,
  type ID, type Installment, type Tx,
} from "./lib/data";
import {
  calcEMI, faDate, faMoney, faNum, groupInt, inRange, jalaliDateStr, jalaliMonthRange,
  jalaliShort, jalaliToday, localISODate, periodRange, PERIODS, relTime, todayISO,
  useCountUp, type PeriodKey,
} from "./lib/utils";
import { parseBankSMS, matchAccountByCard, matchAccountByBankName, SMS_SAMPLES, type SmsParse } from "./lib/sms";
import {
  AmountInput, Bar, Confirm, DeleteBtn, EditBtn, Empty, Field, JalaliPicker, MicButton, Modal,
  PeriodFilter, TInput, TSelect, useToast, usePeriod, hiddenMoney, CatGlyph, CatIconInline,
} from "./ui";
import { parseCSV, exportCSV } from "./excel";
import { Sparkline } from "./widgets";
import { readAccent } from "./lib/themes";

/* ---------- پیشنهاد هوشمند تگ بر اساس دسته ---------- */
const TAG_SUGGEST_KEYWORDS: { tag: string; words: string[] }[] = [
  { tag: "fun", words: ["تفریح", "کافه", "رستوران", "سینما", "بازی", "سفر", "کنسرت", "شهربازی", "قهوه"] },
  { tag: "essential", words: ["خوراک", "سوپر", "خانه", "اجاره", "قبض", "سلامت", "دارو", "رفت", "اسنپ", "مترو", "بنزین", "آموزش", "شهریه", "نان", "میوه", "داروخانه"] },
  { tag: "later", words: ["پوشاک", "لباس", "کفش", "اشتراک", "هدیه"] },
];

/* ================= فرم تراکنش (افزودن/ویرایش) ================= */
export function TxModal({
  open, onClose, editing,
}: {
  open: boolean; onClose: () => void; editing?: Tx | null;
}) {
  const { state, mutate } = useStore();
  const toast = useToast();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [pay, setPay] = useState("کارت");
  const [tag, setTag] = useState<ID | "">("");
  const [touchedCat, setTouchedCat] = useState(false);
  const [smart, setSmart] = useState(() => localStorage.getItem("fp_smart") === "1");
  const [detected, setDetected] = useState<string[]>([]);
  const [suggestTxId, setSuggestTxId] = useState<ID | "">("");
  const [suggestCat, setSuggestCat] = useState("");
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [smsResult, setSmsResult] = useState<SmsParse | null>(null);

  useEffect(() => {
    if (!open) return;
    setDetected([]);
    setSmsOpen(false); setSmsText(""); setSmsResult(null);
    if (editing) {
      setType(editing.type); setNote(editing.note ?? (editing.title !== catById(state, editing.categoryId)?.name ? editing.title : ""));
      setAmount(String(editing.amount));
      setCategoryId(editing.categoryId); setAccountId(editing.accountId);
      setDate(editing.date); setPay(editing.payMethod ?? "کارت"); setTag(editing.tag ?? ""); setTouchedCat(true);
    } else {
      setType("expense"); setNote(""); setAmount(""); setDate(todayISO()); setPay("کارت"); setTag("");
      setTouchedCat(false);
      setAccountId(state.accounts[0]?.id ?? "");
      setCategoryId(state.categories.find((c) => c.type === "expense")?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  useEffect(() => {
    if (touchedCat || !open) return;
    setCategoryId(state.categories.find((c) => c.type === type)?.id ?? "");
  }, [type, open, touchedCat, state.categories]);

  const runDetect = (text: string) => {
    if (!text.trim() || text.trim().length < 3) { setDetected([]); return; }
    const r = detectSmart(text, state.categories, state.accounts);
    const found: string[] = [];
    if (r.amount > 0) { setAmount(String(Math.round(r.amount))); found.push(`مبلغ: ${faMoney(r.amount)}`); }
    if (r.categoryId) {
      setCategoryId(r.categoryId); setTouchedCat(true);
      const c = state.categories.find((x) => x.id === r.categoryId);
      if (c) { setType(c.type); found.push(`دسته: ${c.name}`); }
    }
    if (r.accountId) {
      setAccountId(r.accountId);
      const a = state.accounts.find((x) => x.id === r.accountId);
      if (a) found.push(`حساب: ${a.name}`);
    }
    if (r.income && !r.categoryId) { setType("income"); found.push("نوع: درآمد"); }
    setDetected(found);
  };

  const onNote = (v: string) => {
    setNote(v);
    if (smart) runDetect(v);
  };

  const toggleSmart = (v: boolean) => {
    setSmart(v);
    try { localStorage.setItem("fp_smart", v ? "1" : "0"); } catch { /* ignore */ }
    if (v && note.trim()) runDetect(note);
  };

  const budgetCheck = (amt: number, catId: ID) => {
    const b = state.budgets.find((x) => x.categoryId === catId);
    if (!b || b.limit <= 0) return;
    const j = jalaliToday();
    const mr = jalaliMonthRange(j.jy, j.jm);
    const before = state.transactions
      .filter((x) => x.categoryId === catId && x.type === "expense" && inRange(x.date, mr))
      .reduce((a, x) => a + x.amount, 0);
    const after = before + amt;
    const catName = state.categories.find((c) => c.id === catId)?.name ?? "دسته";
    if (after > b.limit) {
      toast("err", `از سقف بودجهٔ «${catName}» عبور کردی! (${faMoney(after)} از ${faMoney(b.limit)})`);
    } else if (after >= b.limit * 0.8 && before < b.limit * 0.8) {
      toast("warn", `به ٪${faNum(Math.round((after / b.limit) * 100))} از بودجهٔ «${catName}» رسیدی — مواظب بقیهٔ ماه باش.`);
    }
  };

  const handleClose = () => { setSuggestTxId(""); setSuggestCat(""); onClose(); };

  const submit = () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return toast("warn", "مبلغ باید بزرگ‌تر از صفر باشد.");
    const cat = state.categories.find((c) => c.id === categoryId);
    const label = cat?.name ?? "تراکنش";
    if (editing) {
      mutate((d) => {
        const t = d.transactions.find((x) => x.id === editing.id);
        if (t) Object.assign(t, { title: label, note: note.trim() || undefined, tag: tag || undefined, amount: amt, type, categoryId, accountId, date, payMethod: pay });
      }, `تراکنش «${label}» ویرایش شد`);
      toast("ok", "تراکنش ویرایش شد.");
      if (type === "expense") budgetCheck(amt, categoryId);
      handleClose();
      return;
    }
    const newId = Math.random().toString(36).slice(2, 10);
    mutate((d) => {
      d.transactions.unshift({
        id: newId, date, type, amount: amt,
        title: label, note: note.trim() || undefined, tag: tag || undefined, categoryId, accountId, payMethod: pay,
        createdAt: Date.now(), source: "app",
      });
    }, `تراکنش «${label}» ثبت شد`);
    toast("ok", `«${label}» به مبلغ ${faMoney(amt)} ثبت شد.`);
    if (type === "expense") {
      budgetCheck(amt, categoryId);
      if (!tag && getTags(state).length > 0) {
        setSuggestTxId(newId);
        setSuggestCat(label);
        return;
      }
    }
    handleClose();
  };

  const tags = getTags(state);
  const suggestedTagId = useMemo(() => {
    const hit = TAG_SUGGEST_KEYWORDS.find((k) => k.words.some((w) => suggestCat.includes(w)));
    return hit && tags.some((t) => t.id === hit.tag) ? hit.tag : "";
  }, [suggestCat, tags]);
  const suggestOrder = useMemo(() => {
    if (!suggestedTagId) return tags;
    return [tags.find((t) => t.id === suggestedTagId)!, ...tags.filter((t) => t.id !== suggestedTagId)];
  }, [tags, suggestedTagId]);

  const applySuggest = (tagId: ID, tagLabel: string) => {
    mutate((d) => {
      const t = d.transactions.find((x) => x.id === suggestTxId);
      if (t) t.tag = tagId;
    }, `برچسب «${tagLabel}» ثبت شد`);
    toast("ok", `برچسب «${tagLabel}» برای تراکنش ثبت شد.`);
    handleClose();
  };

  const analyzeSms = (source = smsText) => {
    if (!source.trim()) return toast("warn", "ابتدا متن پیام بانکی را بچسبان.");
    const r = parseBankSMS(source);
    setSmsResult(r);
    if (r.confidence === "low") {
      toast("err", "مبلغی در پیام پیدا نشد — متن پیام را کامل کپی کن.");
      return;
    }
    setType(r.type);
    setAmount(String(r.amountToman));
    if (r.dateISO) setDate(r.dateISO);
    const matched =
      matchAccountByCard(state.accounts, r.cardTail, r.accountNo) ??
      matchAccountByBankName(state.accounts, source);
    if (matched) setAccountId(matched.id);
    if (r.merchant) {
      setNote(r.merchant);
      const d = detectSmart(r.merchant, state.categories, state.accounts);
      if (d.categoryId) { setCategoryId(d.categoryId); setTouchedCat(true); }
    }
    toast("ok", r.type === "income"
      ? `واریز ${faMoney(r.amountToman)} تومانی شناسایی شد — فرم پر شد.`
      : `خرج ${faMoney(r.amountToman)} تومانی شناسایی شد — فرم پر شد.`);
  };

  const cats = state.categories.filter((c) => c.type === type);

  return (
    <Modal open={open} onClose={handleClose} title={suggestTxId ? "این خرج چه جور خرجی بود؟" : editing ? "ویرایش تراکنش" : "ثبت تراکنش"} wide>
      {suggestTxId ? (
        <div className="grid gap-4 py-2 pop-in">
          <p className="text-[13px] font-bold leading-7" style={{ color: "var(--fp-text2)" }}>
            خرجِ «{suggestCat}» ثبت شد ✅ — یک برچسب بزن تا تحلیل رفتار خرجت دقیق‌تر شود:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestOrder.map((tg, i) => {
              const isSuggested = i === 0 && !!suggestedTagId;
              return (
                <button key={tg.id} onClick={() => applySuggest(tg.id, tg.label)} title={tg.desc}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-black cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
                  style={{
                    background: `color-mix(in srgb, ${tg.color} ${isSuggested ? 24 : 12}%, transparent)`,
                    color: tg.color,
                    border: `1.5px solid ${tg.color}`,
                    boxShadow: isSuggested ? `0 6px 18px -6px color-mix(in srgb, ${tg.color} 65%, transparent)` : "none",
                  }}>
                  {isSuggested && <Sparkles className="w-4 h-4" />}
                  {tg.label}
                  {isSuggested && <span className="text-[9.5px] font-bold opacity-80">(پیشنهادی)</span>}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <button className="btn btn-ghost" onClick={handleClose}>بدون برچسب — رد شو</button>
          </div>
        </div>
      ) : (
      <>
      <div className="flex rounded-xl p-1 gap-1 mb-4" style={{ background: "var(--fp-bg)" }}>
        {(["expense", "income"] as const).map((t) => (
          <button key={t} onClick={() => setType(t)}
            className="flex-1 rounded-lg py-2 text-[13px] font-black transition-all cursor-pointer"
            style={{ background: type === t ? (t === "income" ? "var(--fp-mint)" : "var(--fp-coral)") : "transparent", color: type === t ? "#071b16" : "var(--fp-text3)" }}>
            {t === "income" ? "درآمد" : "هزینه"}
          </button>
        ))}
      </div>

      <button onClick={() => toggleSmart(!smart)}
        className="w-full flex items-center gap-3 rounded-xl border px-4 py-3 mb-4 transition-all duration-200 cursor-pointer"
        style={{
          borderColor: smart ? "color-mix(in srgb, var(--fp-accent) 60%, transparent)" : "var(--fp-border)",
          background: smart ? "color-mix(in srgb, var(--fp-accent) 9%, transparent)" : "var(--fp-bg)",
        }}>
        <Sparkles className="w-5 h-5 shrink-0" style={{ color: smart ? "var(--fp-accent)" : "var(--fp-text3)" }} />
        <span className="text-[13px] font-black" style={{ color: smart ? "var(--fp-accent)" : "var(--fp-text2)" }}>تشخیص هوشمند</span>
        <span className="text-[10.5px] font-bold flex-1" style={{ color: "var(--fp-text3)" }}>مبلغ، دسته و کارت بانکی را از توضیحات حدس می‌زند</span>
        <span className="w-11 h-6 rounded-full p-1 flex transition-all duration-200 shrink-0"
          style={{ background: smart ? "var(--fp-accent)" : "var(--fp-border2)", justifyContent: smart ? "flex-end" : "flex-start" }}>
          <span className="w-4 h-4 rounded-full bg-white shadow transition-transform" />
        </span>
      </button>

      {detected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 rise-in">
          {detected.map((d) => (
            <span key={d} className="text-[10.5px] font-black px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: "color-mix(in srgb, var(--fp-accent) 13%, transparent)", color: "var(--fp-accent)" }}>
              <Sparkles className="w-3 h-3" /> {d}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-xl border overflow-hidden mb-4 transition-all duration-200"
        style={{
          borderColor: smsOpen ? "color-mix(in srgb, var(--fp-sky) 55%, transparent)" : "var(--fp-border)",
          background: smsOpen ? "color-mix(in srgb, var(--fp-sky) 5%, var(--fp-bg))" : "var(--fp-bg)",
        }}>
        <button onClick={() => { setSmsOpen((o) => !o); setSmsResult(null); }}
          className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer">
          <MessageSquare className="w-5 h-5 shrink-0" style={{ color: smsOpen ? "var(--fp-sky)" : "var(--fp-text3)" }} />
          <span className="text-[13px] font-black" style={{ color: smsOpen ? "var(--fp-sky)" : "var(--fp-text2)" }}>ثبت از پیام بانکی</span>
          <span className="text-[10.5px] font-bold flex-1 text-start" style={{ color: "var(--fp-text3)" }}>پیامک بانک را بچسبان تا خودکار پر شود</span>
          <span className="text-[11px] font-black" style={{ color: "var(--fp-text3)" }}>{smsOpen ? "▲" : "▼"}</span>
        </button>
        {smsOpen && (
          <div className="p-4 grid gap-3 border-t" style={{ borderColor: "var(--fp-border)" }}>
            <textarea value={smsText} onChange={(e) => setSmsText(e.target.value)} rows={4}
              placeholder={"مثلاً:\nبانك ملي ايران\nانتقال:4,509,000-\nحساب:83008\nمانده:220,654,858\n0531-20:40"}
              className="input !leading-6 resize-y !text-[12px]" dir="ltr" />
            <div className="flex flex-wrap gap-1.5">
              {SMS_SAMPLES.map((s) => (
                <button key={s.label} onClick={() => { setSmsText(s.text); analyzeSms(s.text); }}
                  className="chip !py-1 !text-[10px]">{s.label}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-mint btn-sm flex-1" onClick={() => analyzeSms()}>
                <Sparkles className="w-4 h-4" /> تحلیل پیام
              </button>
            </div>
            {smsResult && smsResult.confidence !== "low" && (
              <div className="rounded-lg p-3 grid gap-1 text-[11px] font-bold" style={{ background: "var(--fp-bg)", border: "1px solid var(--fp-border)" }}>
                <p>نوع: <b style={{ color: smsResult.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>{smsResult.type === "income" ? "درآمد (واریز)" : "هزینه (برداشت)"}</b></p>
                <p>مبلغ: <b className="tabular">{faMoney(smsResult.amountToman)} تومان</b></p>
                {smsResult.jalali && <p>تاریخ: <b>{smsResult.jalali}</b>{smsResult.time ? ` — ساعت ${faNum(smsResult.time)}` : ""}</p>}
                {smsResult.balanceToman !== undefined && <p>مانده: <b className="tabular">{faMoney(smsResult.balanceToman)} تومان</b></p>}
                {smsResult.notes.map((n, i) => <p key={i} style={{ color: "var(--fp-accent)" }}>⚠ {n}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="توضیحات (اختیاری — تراکنش با نام دسته ثبت می‌شود)">
          <textarea value={note} onChange={(e) => onNote(e.target.value)} rows={2}
            placeholder={smart ? "مثلاً: اسنپ ۵۰ هزار از کارت ملت" : "مثلاً: خرید از سوپرمارکت یاس"}
            className="input resize-none !text-[13.5px] !leading-6" />
          <div className="mt-2"><MicButton onText={(t) => onNote(t)} baseText={note} /></div>
        </Field>
        <Field label="مبلغ (تومان)"><AmountInput value={amount} onChange={setAmount} /></Field>
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
        <Field label="تاریخ (شمسی)"><JalaliPicker value={date} onChange={setDate} /></Field>
        <Field label="روش پرداخت">
          <TSelect value={pay} onChange={(e) => setPay(e.target.value)}>
            {state.payment_methods.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </TSelect>
        </Field>
        <Field label="برچسب (اختیاری)">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setTag("")} className={`chip !py-1 !text-[10.5px] ${tag === "" ? "chip-on" : ""}`}>بدون برچسب</button>
            {tags.map((tg) => (
              <button key={tg.id} onClick={() => setTag(tg.id)} title={tg.desc}
                className="chip !py-1 !text-[10.5px]"
                style={tag === tg.id ? { background: tg.color, borderColor: tg.color, color: "#071b16" } : { color: tg.color, borderColor: `color-mix(in srgb, ${tg.color} 50%, transparent)` }}>
                {tg.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-ghost" onClick={handleClose}>انصراف</button>
        <button className="btn btn-gold" onClick={submit}>
          <Plus className="w-4 h-4" strokeWidth={3} />
          {editing ? "ذخیرهٔ تغییرات" : "ثبت تراکنش"}
        </button>
      </div>
      </>
      )}
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
  const [hideAcc, setHideAcc] = useState(false);

  const bal = useCountUp(total);
  const inc = useCountUp(income);
  const exp = useCountUp(expense);

  const isGlass = (state.prefs.accent ?? readAccent()) === "glass-dark";
  const saveRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const spark = useMemo(() => {
    const pts: number[] = [];
    let run = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = localISODate(d);
      const day = state.transactions.filter((x) => x.date === iso);
      run += day.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0)
        - day.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
      pts.push(run + total);
    }
    return pts;
  }, [state.transactions, total]);

  const recent = [...state.transactions].sort((a, b) => (b.date + b.createdAt).toString().localeCompare((a.date + a.createdAt).toString())).slice(0, 6);
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

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5" />} title="موجودی کل" color="var(--fp-accent)"
          value={hideBal ? hiddenMoney : faMoney(bal)} suffix="تومان"
          hide={hideBal} onHide={() => setHideBal(!hideBal)}
          ring={isGlass ? saveRate : undefined}
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
          foot={<Bar pct={income > 0 ? Math.min(100, (expense / income) * 100) : 0} color="var(--fp-coral)" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2 rise-in" style={{ ["--d" as string]: "80ms" }}>
          <div className="flex items-center justify-between mb-4">
            <Head icon={<Landmark className="w-4.5 h-4.5" />} title="موجودی حساب‌ها" />
            <button className="icon-btn !w-8 !h-8" onClick={() => setHideAcc(!hideAcc)} title={hideAcc ? "نمایش" : "مخفی کردن"}>
              {hideAcc ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {state.accounts.map((a) => (
              <div key={a.id} className="rounded-xl border p-3.5 flex items-center gap-3 transition-all hover:-translate-y-0.5" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <CatGlyph icon="wallet" color={a.color} className="w-10 h-10 rounded-xl" iconClass="w-5 h-5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-black truncate">{a.name}</p>
                  <p className="text-[10px] font-bold" style={{ color: "var(--fp-text3)" }}>{a.type}</p>
                </div>
                <p className="text-[13px] font-black tabular" style={{ color: a.balance < 0 ? "var(--fp-coral)" : "var(--fp-text)" }}>
                  {hideAcc ? hiddenMoney : faMoney(a.balance)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 rise-in" style={{ ["--d" as string]: "120ms" }}>
          <Head icon={<Receipt className="w-4.5 h-4.5" />} title="فعالیت اخیر" />
          <div className="grid gap-2 mt-3">
            {recent.length === 0 && <p className="text-[12px] font-bold text-center py-4" style={{ color: "var(--fp-text3)" }}>هنوز تراکنشی نداری.</p>}
            {recent.map((x) => {
              const c = catById(state, x.categoryId);
              return (
                <div key={x.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                  <CatGlyph icon={c?.icon} color={c?.color} className="w-8 h-8 rounded-lg" iconClass="w-4 h-4" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black truncate">{x.note || x.title}</p>
                    <p className="text-[9.5px] font-bold flex items-center gap-1" style={{ color: "var(--fp-text3)" }}>
                      {jalaliShort(x.date)}
                      {x.source === "bot" && <span className="flex items-center gap-0.5" style={{ color: "var(--fp-sky)" }}><Bot className="w-3 h-3" /> ربات</span>}
                    </p>
                  </div>
                  <span className="text-[12px] font-black tabular" style={{ color: x.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                    {x.type === "income" ? "+" : "−"}{faMoney(x.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {challenge && (
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "160ms" }}>
            <Head icon={<Sparkles className="w-4.5 h-4.5" />} title={challenge.title} />
            <div className="mt-3">
              <div className="flex justify-between text-[12px] font-black mb-1.5">
                <span style={{ color: "var(--fp-text2)" }}>{faMoney(challenge.saved)} از {faMoney(challenge.target)}</span>
                <span style={{ color: "var(--fp-accent)" }}>٪{faNum(Math.min(100, Math.round((challenge.saved / challenge.target) * 100)))}</span>
              </div>
              <Bar pct={(challenge.saved / challenge.target) * 100} color="var(--fp-accent)" />
              <p className="text-[10.5px] font-bold mt-2" style={{ color: "var(--fp-text3)" }}>روزی {faMoney(challenge.perDay)} تومان</p>
            </div>
          </div>
        )}
        {currenciesTotal > 0 && (
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "200ms" }}>
            <Head icon={<Coins className="w-4.5 h-4.5" />} title="ارز خارجی" />
            <div className="grid gap-2 mt-3">
              {state.currencies.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg px-2 py-1.5">
                  <span className="text-[12px] font-black">{c.name} <span style={{ color: "var(--fp-text3)" }}>({c.symbol})</span></span>
                  <span className="text-[12px] font-black tabular">{faMoney(c.rate * c.qty)} <span className="text-[9.5px]" style={{ color: "var(--fp-text3)" }}>تومان</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EyeOn() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>; }
function EyeOff() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-6.5 0-10-7-10-7a19 19 0 0 1 5.06-5.94M9.9 4.24A10 10 0 0 1 12 4c6.5 0 10 7 10 7a19 19 0 0 1-3.22 4.31" /><path d="M1 1l22 22" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /></svg>; }

function StatCard({ icon, title, value, suffix, color, hide, onHide, foot, ring }: {
  icon: React.ReactNode; title: string; value: string; suffix: string; color: string;
  hide: boolean; onHide: () => void; foot?: React.ReactNode; ring?: number;
}) {
  return (
    <div className="card card-hover p-5 relative overflow-hidden rise-in">
      <div className="absolute -top-8 -start-8 w-28 h-28 rounded-full opacity-[0.12]" style={{ background: color }} />
      {ring !== undefined && <GlassRing pct={ring} />}
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

function GlassRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div className="absolute top-4 end-4 z-10 grid place-items-center" title={`نرخ پس‌انداز: ٪${faNum(clamped)}`}>
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={R} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
        <circle cx="38" cy="38" r={R} fill="none" stroke="var(--fp-accent)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - clamped / 100)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.3,0.7,0.2,1)", filter: "drop-shadow(0 0 6px rgba(212,175,55,0.45))" }} />
      </svg>
      <span className="absolute text-[13px] font-extrabold tabular" style={{ color: "var(--fp-accent)" }}>٪{faNum(clamped)}</span>
    </div>
  );
}

function Head({ icon, title, small }: { icon: React.ReactNode; title: string; small?: boolean }) {
  return (
    <h3 className={`font-black flex items-center gap-2 ${small ? "text-[12.5px]" : "text-[14.5px]"}`} style={{ color: "var(--fp-text)" }}>
      <span style={{ color: "var(--fp-accent)" }}>{icon}</span> {title}
    </h3>
  );
}

/* ================= ۲) تراکنش‌ها ================= */
export function TransactionsPage({ initQuery, initCat }: { initQuery?: string; initCat?: string }) {
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
          {([["all", "همه"], ["income", "درآمد"], ["expense", "هزینه"]] as const).map(([k, l]) => (
            <button key={k} className={`chip ${type === k ? "chip-on" : ""}`} onClick={() => setType(k)}>{l}</button>
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
              return (
                <div key={tx.id} className="group flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-[color-mix(in_srgb,var(--fp-mint)_4%,transparent)]" style={{ borderColor: "var(--fp-border)" }}>
                  <CatGlyph icon={c?.icon} color={c?.color} className="w-9 h-9 rounded-lg" iconClass="w-4.5 h-4.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black truncate flex items-center gap-1.5">
                      {tx.title}
                      {tx.source === "bot" && <Bot className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--fp-sky)" }} />}
                      {tg && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `color-mix(in srgb, ${tg.color} 18%, transparent)`, color: tg.color }}>{tg.label}</span>}
                    </p>
                    <p className="text-[10px] font-bold truncate" style={{ color: "var(--fp-text3)" }}>
                      {tx.note ? `${tx.note} · ` : ""}{accById(state, tx.accountId)?.name ?? "—"}{tx.payMethod ? ` · ${tx.payMethod}` : ""}
                    </p>
                  </div>
                  <span className="text-[13.5px] font-black tabular" style={{ color: tx.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                    {tx.type === "income" ? "+" : "−"}{faMoney(tx.amount)}
                  </span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditBtn onClick={() => setEditing(tx)} />
                    <DeleteBtn onClick={() => setConfirmDel(tx)} />
                  </div>
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

/* ================= ۳) گزارش دسته‌ها ================= */
export function CategoriesPage() {
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
          <p className="font-display text-3xl mt-3 tabular" style={{ color: type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>{faMoney(total)}</p>
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
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-[13px] font-black">
                        <CatGlyph icon={r.cat!.icon} color={r.cat!.color} className="w-8 h-8" iconClass="w-4 h-4" />
                        {r.cat!.name}
                        <span className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{faNum(count)} تراکنش</span>
                      </span>
                      <span className="text-[13px] font-black tabular">
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
                            <span className="text-[10.5px] font-bold shrink-0" style={{ color: "var(--fp-text3)" }}>{jalaliShort(t.date)}</span>
                            <span className="text-[11.5px] font-black flex-1 truncate">{t.note || t.title}</span>
                            <span className="text-[11.5px] font-black tabular" style={{ color: "var(--fp-text)" }}>{faMoney(t.amount)}</span>
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

/* ================= ۴) بدهی‌ها و اقساط ================= */
export function DebtsPage() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<"debt" | "credit" | "inst">("debt");
  const [adding, setAdding] = useState(false);
  const [payFor, setPayFor] = useState<{ id: string; person: string; remaining: number; kind: "debt" | "credit" } | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payAcc, setPayAcc] = useState("");
  const [editDebt, setEditDebt] = useState<{ id: string; kind: "debt" | "credit"; person: string; amount: number; paid: number; due?: string; note?: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [instForm, setInstForm] = useState<null | { id?: string; title: string; total: string; months: string; amountPerMonth: string; start: string; accountId: string; categoryId: string }>(null);
  const [payInst, setPayInst] = useState<{ inst: Installment; idx: number } | null>(null);
  const [payInstAcc, setPayInstAcc] = useState("");
  const [loan, setLoan] = useState({ p: "10000000", r: "18", n: "12" });

  const emi = useMemo(() => calcEMI(Number(loan.p) || 0, Number(loan.r) || 0, Number(loan.n) || 0), [loan]);

  const list = state.debts.filter((d) => d.kind === tab);

  const saveInst = () => {
    if (!instForm) return;
    const title = instForm.title.trim();
    const total = Number(instForm.total) || 0;
    const months = Math.max(1, Number(instForm.months) || 1);
    const apm = Math.round(Number(instForm.amountPerMonth) || 0);
    if (!title) return toast("warn", "عنوان قسط را بنویسید.");
    if (total <= 0) return toast("warn", "مبلغ کل باید بزرگ‌تر از صفر باشد.");
    if (apm <= 0) return toast("warn", "مبلغ هر قسط را خودت وارد کن.");
    const base = { title, total, months, amountPerMonth: apm, start: instForm.start, accountId: instForm.accountId, categoryId: instForm.categoryId || undefined };
    if (instForm.id) {
      mutate((d) => {
        const x = d.installments.find((y) => y.id === instForm.id);
        if (x) {
          Object.assign(x, base);
          x.schedule = (x.schedule && x.schedule.length === months) ? x.schedule : buildScheduleLocal(base, x.paidCount);
        }
      }, `قسط «${title}» ویرایش شد`);
      toast("ok", "قسط ویرایش شد.");
    } else {
      mutate((d) => {
        d.installments.push({ id: Math.random().toString(36).slice(2, 10), ...base, paidCount: 0, schedule: buildScheduleLocal(base, 0) });
      }, `قسط «${title}» ثبت شد`);
      toast("ok", "قسط ثبت شد.");
    }
    setInstForm(null);
  };

  const payMonth = (inst: Installment, idx: number, accountId?: ID) => {
    const accId = accountId ?? inst.accountId;
    const accName = accById(state, accId)?.name ?? "حساب";
    mutate((d) => {
      const x = d.installments.find((y) => y.id === inst.id);
      if (!x) return;
      const m = x.schedule?.[idx];
      if (!m || m.paidAt) return;
      m.paidAt = Date.now();
      x.paidCount = x.schedule.filter((mm) => !!mm.paidAt).length;
      const catId = x.categoryId ?? d.categories.find((c) => c.name === "متفرقه")?.id ?? d.categories.find((c) => c.type === "expense")?.id ?? "";
      const acc = d.accounts.find((a) => a.id === accId);
      const method = acc && /کارت/.test(acc.type) ? "کارت" : "شبا";
      d.transactions.unshift({
        id: Math.random().toString(36).slice(2, 10), date: todayISO(), type: "expense",
        amount: m.amount, title: `قسط ${faNum(idx + 1)} «${x.title}»`, categoryId: catId,
        accountId: accId, payMethod: method, createdAt: Date.now(), source: "app",
      });
    }, `قسط ${faNum(idx + 1)} «${inst.title}» پرداخت شد`);
    toast("ok", `قسط ${faNum(idx + 1)} از «${accName}» پرداخت و به‌عنوان تراکنش ثبت شد.`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">بدهی‌ها و اقساط</h1>
        {tab !== "inst" && (
          <button className="btn btn-gold btn-sm" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" strokeWidth={3} /> {tab === "debt" ? "بدهی جدید" : "طلب جدید"}
          </button>
        )}
      </div>

      <div className="flex gap-1.5 rise-in" style={{ ["--d" as string]: "40ms" }}>
        {([["debt", "بدهی‌ها"], ["credit", "طلب‌ها"], ["inst", "اقساط"]] as const).map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? "chip-on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab !== "inst" ? (
        <div className="grid gap-3">
          {list.length === 0 && <div className="card rise-in"><Empty text={tab === "debt" ? "هیچ بدهی‌ای نداری — آفرین! 🎉" : "طلبی ثبت نشده."} /></div>}
          {list.map((d) => {
            const remaining = d.amount - d.paid;
            return (
              <div key={d.id} className="card p-4 rise-in">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-black flex items-center gap-2">
                      {d.kind === "debt" ? <ArrowUpLeft className="w-4 h-4" style={{ color: "var(--fp-coral)" }} /> : <ArrowDownRight className="w-4 h-4" style={{ color: "var(--fp-mint)" }} />}
                      {d.person}
                    </p>
                    {d.note && <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>{d.note}</p>}
                    {d.due && <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>سررسید: {faDate(d.due)}</p>}
                  </div>
                  <div className="text-end">
                    <p className="text-[14px] font-black tabular" style={{ color: tab === "debt" ? "var(--fp-coral)" : "var(--fp-mint)" }}>
                      {faMoney(remaining)} <span className="text-[10px]" style={{ color: "var(--fp-text3)" }}>از {faMoney(d.amount)}</span>
                    </p>
                    <div className="flex gap-1.5 mt-1.5 justify-end">
                      <button className="btn btn-mint btn-sm" disabled={remaining <= 0}
                        onClick={() => { setPayFor({ id: d.id, person: d.person, remaining, kind: d.kind }); setPayAmt(""); setPayAcc(state.accounts[0]?.id ?? ""); }}>
                        {tab === "debt" ? "پرداخت" : "دریافت"}
                      </button>
                      {d.kind === "credit" && remaining > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setQr(d.person)} title="QR درخواست وجه"><QrCode className="w-4 h-4" /></button>
                      )}
                      <EditBtn onClick={() => setEditDebt({ id: d.id, kind: d.kind, person: d.person, amount: d.amount, paid: d.paid, due: d.due, note: d.note })} />
                      <DeleteBtn onClick={() => { trashItem("debts", d.id, `${d.kind === "debt" ? "بدهی" : "طلب"} ${d.person}`); toast("warn", "حذف شد — تا ۳۰ ثانیه قابل بازگشت."); }} />
                    </div>
                  </div>
                </div>
                <div className="mt-3"><Bar pct={(d.paid / d.amount) * 100} color={tab === "debt" ? "var(--fp-coral)" : "var(--fp-mint)"} /></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex justify-end">
            <button className="btn btn-gold btn-sm" onClick={() => setInstForm({ title: "", total: "", months: "12", amountPerMonth: "", start: todayISO(), accountId: state.accounts[0]?.id ?? "", categoryId: "" })}>
              <Plus className="w-4 h-4" strokeWidth={3} /> قسط جدید
            </button>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="grid gap-3 content-start">
              {state.installments.length === 0 && <div className="card p-5"><Empty text="هیچ قسطی ثبت نشده." /></div>}
              {state.installments.map((x) => {
                const pct = x.months > 0 ? (x.paidCount / x.months) * 100 : 0;
                return (
                  <div key={x.id} className="card p-4 rise-in">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[14px] font-black flex items-center gap-2"><Repeat className="w-4 h-4" style={{ color: "var(--fp-accent)" }} /> {x.title}</p>
                      <div className="flex gap-1.5">
                        <EditBtn onClick={() => setInstForm({ id: x.id, title: x.title, total: String(x.total), months: String(x.months), amountPerMonth: String(x.amountPerMonth), start: x.start, accountId: x.accountId, categoryId: x.categoryId ?? "" })} />
                        <DeleteBtn onClick={() => { trashItem("installments", x.id, x.title); toast("warn", "حذف شد — تا ۳۰ ثانیه قابل بازگشت."); }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-[11.5px] font-bold mb-1.5">
                      <span style={{ color: "var(--fp-text2)" }}>قسط {faNum(x.paidCount)} از {faNum(x.months)} · ماهی {faMoney(x.amountPerMonth)}</span>
                      <span style={{ color: "var(--fp-accent)" }}>٪{faNum(Math.round(pct))}</span>
                    </div>
                    <Bar pct={pct} color="var(--fp-accent)" />
                    <div className="grid gap-1.5 mt-3 max-h-48 overflow-y-auto">
                      {x.schedule?.map((m, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "var(--fp-bg)" }}>
                          <span className="text-[10.5px] font-bold shrink-0" style={{ color: m.paidAt ? "var(--fp-mint)" : "var(--fp-text3)" }}>
                            {m.paidAt ? <Check className="w-3.5 h-3.5 inline" /> : faNum(idx + 1)} قسط {faNum(idx + 1)}
                          </span>
                          <span className="text-[10.5px] font-bold flex-1" style={{ color: "var(--fp-text3)" }}>{jalaliShort(m.due)}</span>
                          <span className="text-[11px] font-black tabular">{faMoney(m.amount)}</span>
                          {!m.paidAt && (
                            <button className="btn btn-mint btn-sm !py-0.5 !text-[10px]" onClick={() => { setPayInst({ inst: x, idx }); setPayInstAcc(x.accountId); }}>پرداخت</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card p-5 rise-in h-fit" style={{ ["--d" as string]: "80ms" }}>
              <Head icon={<Scale className="w-4.5 h-4.5" />} title="ماشین‌حساب وام" />
              <div className="grid gap-3 mt-4">
                <Field label="مبلغ وام (تومان)"><AmountInput value={loan.p} onChange={(v) => setLoan({ ...loan, p: v })} /></Field>
                <Field label="سود سالانه (٪)"><TInput dir="ltr" value={loan.r} onChange={(e) => setLoan({ ...loan, r: toEnDigitsLocal(e.target.value) })} /></Field>
                <Field label="تعداد ماه"><TInput dir="ltr" value={loan.n} onChange={(e) => setLoan({ ...loan, n: toEnDigitsLocal(e.target.value) })} /></Field>
              </div>
              <div className="rounded-xl p-4 mt-4 border" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <div className="flex justify-between text-[12.5px] font-black"><span>قسط ماهانه</span><span className="tabular" style={{ color: "var(--fp-accent)" }}>{faMoney(emi.monthly)}</span></div>
                <div className="flex justify-between text-[11.5px] font-bold mt-2" style={{ color: "var(--fp-text2)" }}><span>جمع بازپرداخت</span><span className="tabular">{faMoney(emi.total)}</span></div>
                <div className="flex justify-between text-[11.5px] font-bold mt-1.5" style={{ color: "var(--fp-text2)" }}><span>سود پرداختی</span><span className="tabular" style={{ color: "var(--fp-coral)" }}>{faMoney(emi.interest)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {adding && tab !== "inst" && (
        <AddDebtForm kind={tab} onDone={() => setAdding(false)} />
      )}

      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={`${payFor?.kind === "debt" ? "پرداخت به" : "دریافت از"} ${payFor?.person ?? ""}`}>
        <Field label={`مبلغ (تومان) — باقی‌مانده: ${faMoney(payFor?.remaining ?? 0)}`}>
          <AmountInput value={payAmt} onChange={setPayAmt} />
        </Field>
        {state.accounts.length > 0 && (
          <div className="mt-3">
            <Field label={payFor?.kind === "debt" ? "پرداخت از حساب" : "دریافت به حساب"}>
              <TSelect value={payAcc} onChange={(e) => setPayAcc(e.target.value)}>
                {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </TSelect>
            </Field>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-ghost" onClick={() => setPayFor(null)}>انصراف</button>
          <button className="btn btn-mint" onClick={() => {
            const v = Math.min(Number(payAmt) || 0, payFor?.remaining ?? 0);
            if (v <= 0) return toast("warn", "مبلغ معتبر نیست.");
            const isDebt = payFor?.kind === "debt";
            mutate((d) => {
              const x = d.debts.find((y) => y.id === payFor!.id);
              if (x) x.paid = Math.min(x.amount, x.paid + v);
              const cat = d.categories.find((c) => c.type === (isDebt ? "expense" : "income"));
              d.transactions.unshift({
                id: Math.random().toString(36).slice(2, 10), date: todayISO(),
                type: isDebt ? "expense" : "income", amount: v,
                title: isDebt ? `پرداخت بدهی به ${payFor?.person}` : `دریافت طلب از ${payFor?.person}`,
                note: "تسویهٔ بدهی/طلب",
                categoryId: cat?.id ?? "", accountId: payAcc || d.accounts[0]?.id || "",
                payMethod: "کارت", createdAt: Date.now(), source: "app",
              });
            }, isDebt ? `پرداخت ${faMoney(v)} به ${payFor?.person}` : `دریافت ${faMoney(v)} از ${payFor?.person}`);
            toast("ok", "ثبت شد و تراکنش آن در حساب نشست.");
            setPayFor(null); setPayAmt("");
          }}>ثبت</button>
        </div>
      </Modal>

      <Modal open={!!editDebt} onClose={() => setEditDebt(null)} title={editDebt?.kind === "debt" ? "ویرایش بدهی" : "ویرایش طلب"}>
        {editDebt && (
          <div className="grid gap-3.5">
            <Field label="شخص"><TInput value={editDebt.person} onChange={(e) => setEditDebt({ ...editDebt, person: e.target.value })} /></Field>
            <Field label="مبلغ کل (تومان)"><AmountInput value={String(editDebt.amount)} onChange={(v) => setEditDebt({ ...editDebt, amount: Number(v) || 0 })} /></Field>
            <Field label="پرداخت‌شده تاکنون (تومان)"><AmountInput value={String(editDebt.paid)} onChange={(v) => setEditDebt({ ...editDebt, paid: Number(v) || 0 })} /></Field>
            <Field label="سررسید (شمسی)"><JalaliPicker value={editDebt.due ?? todayISO()} onChange={(v) => setEditDebt({ ...editDebt, due: v })} /></Field>
            <Field label="یادداشت"><TInput value={editDebt.note ?? ""} onChange={(e) => setEditDebt({ ...editDebt, note: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 mt-1">
              <button className="btn btn-ghost" onClick={() => setEditDebt(null)}>انصراف</button>
              <button className="btn btn-gold" onClick={() => {
                if (!editDebt.person.trim() || editDebt.amount <= 0) return toast("warn", "شخص و مبلغ را کامل کنید.");
                mutate((d) => {
                  const x = d.debts.find((y) => y.id === editDebt.id);
                  if (x) Object.assign(x, {
                    person: editDebt.person.trim(), amount: editDebt.amount,
                    paid: Math.min(editDebt.paid, editDebt.amount), due: editDebt.due, note: editDebt.note?.trim() || undefined,
                  });
                }, `ویرایش ${editDebt.kind === "debt" ? "بدهی" : "طلب"} «${editDebt.person.trim()}»`);
                toast("ok", "ویرایش ذخیره شد.");
                setEditDebt(null);
              }}>ذخیرهٔ تغییرات</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!instForm} onClose={() => setInstForm(null)} title={instForm?.id ? "ویرایش قسط" : "قسط جدید"}>
        {instForm && (
          <div className="grid gap-3.5">
            <Field label="عنوان"><TInput value={instForm.title} onChange={(e) => setInstForm({ ...instForm, title: e.target.value })} placeholder="مثلاً: وام خرید لپ‌تاپ" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="مبلغ کل (تومان)"><AmountInput value={instForm.total} onChange={(v) => setInstForm({ ...instForm, total: v })} /></Field>
              <Field label="تعداد ماه"><TInput dir="ltr" value={instForm.months} onChange={(e) => setInstForm({ ...instForm, months: toEnDigitsLocal(e.target.value) })} /></Field>
            </div>
            <Field label="مبلغ هر قسط (تومان) — دستی" hint="خودت وارد کن؛ قسط آخر مابه‌التفاوت را جذب می‌کند.">
              <AmountInput value={instForm.amountPerMonth} onChange={(v) => setInstForm({ ...instForm, amountPerMonth: v })} />
            </Field>
            {(() => {
              const total = Number(instForm.total) || 0;
              const months = Math.max(1, Number(instForm.months) || 1);
              const apm = Math.round(Number(instForm.amountPerMonth) || 0);
              if (apm <= 0 || total <= 0) return null;
              const sum = apm * months;
              const diff = sum - total;
              return (
                <p className="text-[12px] font-black px-3 py-2 rounded-lg leading-6" style={{ background: "color-mix(in srgb, var(--fp-accent) 10%, transparent)", color: "var(--fp-accent)" }}>
                  جمع برنامه: {faNum(months)} × {faMoney(apm)} = {faMoney(sum)} تومان
                  {diff === 0
                    ? " — دقیقاً برابر مبلغ کل ✅"
                    : <span style={{ color: diff > 0 ? "var(--fp-coral)" : "var(--fp-mint)" }}>
                        {" "}(تفاوت با مبلغ کل: {diff > 0 ? "+" : "−"}{faMoney(Math.abs(diff))} — قسط آخر {diff > 0 ? "کمتر" : "بیشتر"} می‌شود)
                      </span>}
                </p>
              );
            })()}
            <Field label="شروع (شمسی)"><JalaliPicker value={instForm.start} onChange={(v) => setInstForm({ ...instForm, start: v })} /></Field>
            <Field label="حساب">
              <TSelect value={instForm.accountId} onChange={(e) => setInstForm({ ...instForm, accountId: e.target.value })}>
                {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </TSelect>
            </Field>
            <Field label="دسته (اختیاری)">
              <TSelect value={instForm.categoryId} onChange={(e) => setInstForm({ ...instForm, categoryId: e.target.value })}>
                <option value="">— بدون دسته —</option>
                {state.categories.filter((c) => c.type === "expense").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </TSelect>
            </Field>
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn btn-ghost" onClick={() => setInstForm(null)}>انصراف</button>
              <button className="btn btn-gold" onClick={saveInst}><Plus className="w-4 h-4" strokeWidth={3} /> {instForm.id ? "ذخیرهٔ تغییرات" : "ثبت قسط"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!payInst} onClose={() => setPayInst(null)} title={`پرداخت قسط ${faNum((payInst?.idx ?? 0) + 1)} «${payInst?.inst.title ?? ""}»`}>
        {payInst && (() => {
          const m = payInst.inst.schedule?.[payInst.idx];
          return (
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: "color-mix(in srgb, var(--fp-accent) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--fp-accent) 30%, transparent)" }}>
                <span className="text-[12px] font-black" style={{ color: "var(--fp-text2)" }}>سررسید: {m ? jalaliShort(m.due) : "—"}</span>
                <span className="font-display text-2xl tabular" style={{ color: "var(--fp-accent)" }}>{faMoney(m?.amount ?? 0)} <span className="text-[11px]" style={{ color: "var(--fp-text3)" }}>تومان</span></span>
              </div>
              <div>
                <p className="text-[12px] font-black mb-2">این قسط از کدام حساب پرداخت شود؟</p>
                <div className="grid gap-2">
                  {state.accounts.map((a) => {
                    const on = payInstAcc === a.id;
                    return (
                      <button key={a.id} onClick={() => setPayInstAcc(a.id)}
                        className="flex items-center gap-3 rounded-xl border px-3.5 py-3 text-start cursor-pointer transition-all duration-150"
                        style={{ borderColor: on ? "var(--fp-accent)" : "var(--fp-border)", background: on ? "color-mix(in srgb, var(--fp-accent) 9%, transparent)" : "var(--fp-bg)" }}>
                        <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${a.color} 16%, transparent)`, color: a.color }}><Banknote className="w-4.5 h-4.5" /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-black truncate">{a.name}</span>
                          <span className="block text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{a.type}</span>
                        </span>
                        <span className="text-[12px] font-black tabular shrink-0">{faMoney(a.balance)} <span className="text-[9.5px]" style={{ color: "var(--fp-text3)" }}>مانده</span></span>
                        <span className="w-5 h-5 rounded-md grid place-items-center shrink-0 border" style={{ borderColor: on ? "var(--fp-accent)" : "var(--fp-border2)", background: on ? "var(--fp-accent)" : "transparent" }}>
                          {on && <Check className="w-3.5 h-3.5" strokeWidth={3.5} style={{ color: "#071b16" }} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost" onClick={() => setPayInst(null)}>انصراف</button>
                <button className="btn btn-mint" onClick={() => {
                  if (!payInstAcc) return toast("warn", "یک حساب انتخاب کن.");
                  payMonth(payInst.inst, payInst.idx, payInstAcc);
                  setPayInst(null);
                }}><Check className="w-4 h-4" strokeWidth={3} /> ثبت پرداخت</button>
              </div>
            </div>
          );
        })()}
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

function buildScheduleLocal(inst: { start: string; months: number; amountPerMonth: number; total: number }, paidCount: number) {
  const out: { due: string; amount: number; paidAt?: number }[] = [];
  const n = Math.max(1, inst.months | 0);
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const rest = inst.total - inst.amountPerMonth * (n - 1);
    const amount = isLast && rest > 0 ? rest : inst.amountPerMonth;
    const d = new Date(inst.start + "T12:00:00");
    d.setMonth(d.getMonth() + i);
    const p = (x: number) => String(x).padStart(2, "0");
    out.push({ due: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, amount, paidAt: i < paidCount ? Date.now() : undefined });
  }
  return out;
}

function toEnDigitsLocal(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function AddDebtForm({ kind, onDone }: { kind: "debt" | "credit"; onDone: () => void }) {
  const { mutate } = useStore();
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(todayISO());
  const [note, setNote] = useState("");
  return (
    <Modal open onClose={onDone} title={kind === "debt" ? "ثبت بدهی جدید" : "ثبت طلب جدید"}>
      <div className="grid gap-3">
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
    </Modal>
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
