/* ---------- فرم ثبت/ویرایش تراکنش + ماشین‌حساب ---------- */
import { useEffect, useMemo, useState } from "react";
import { Calculator, Check, MessageSquare, Plus, Sparkles, X } from "lucide-react";
import { catById, detectSmart, getTags, useStore, type ID, type Tx } from "../lib/data";
import { faMoney, faNum, groupInt, inRange, jalaliMonthRange, jalaliToday, todayISO } from "../lib/utils";
import { parseBankSMS, matchAccountByCard, matchAccountByBankName, SMS_SAMPLES, type SmsParse } from "../lib/sms";
import { AmountInput, Field, JalaliPicker, MicButton, Modal, TSelect, useToast } from "../ui";

/* ---------- پیشنهاد هوشمند تگ بر اساس دسته ---------- */
const TAG_SUGGEST_KEYWORDS: { tag: string; words: string[] }[] = [
  { tag: "fun", words: ["تفریح", "کافه", "رستوران", "سینما", "بازی", "سفر", "کنسرت", "شهربازی", "قهوه"] },
  { tag: "essential", words: ["خوراک", "سوپر", "خانه", "اجاره", "قبض", "سلامت", "دارو", "رفت", "اسنپ", "مترو", "بنزین", "آموزش", "شهریه", "نان", "میوه", "داروخانه"] },
  { tag: "later", words: ["پوشاک", "لباس", "کفش", "اشتراک", "هدیه"] },
];

export default function TxModal({
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
  const [calcOpen, setCalcOpen] = useState(false);
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
        <span className="text-[13px] font-black shrink-0" style={{ color: smart ? "var(--fp-accent)" : "var(--fp-text2)" }}>تشخیص هوشمند</span>
        <span className="text-[10.5px] font-bold flex-1 min-w-0 truncate" style={{ color: "var(--fp-text3)" }}>مبلغ، دسته و کارت بانکی را از توضیحات حدس می‌زند</span>
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
          <span className="text-[13px] font-black shrink-0" style={{ color: smsOpen ? "var(--fp-sky)" : "var(--fp-text2)" }}>ثبت از پیام بانکی</span>
          <span className="text-[10.5px] font-bold flex-1 min-w-0 truncate text-start" style={{ color: "var(--fp-text3)" }}>پیامک بانک را بچسبان تا خودکار پر شود</span>
          <span className="text-[11px] font-black shrink-0" style={{ color: "var(--fp-text3)" }}>{smsOpen ? "▲" : "▼"}</span>
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
        <Field label="مبلغ (تومان)">
          <div className="flex gap-1.5 items-stretch">
            <AmountInput value={amount} onChange={setAmount} />
            <button type="button" onClick={() => setCalcOpen(true)} title="ماشین‌حساب"
              className="w-12 shrink-0 rounded-xl border grid place-items-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                borderColor: "color-mix(in srgb, var(--fp-accent) 45%, transparent)",
                color: "var(--fp-accent)",
                background: "color-mix(in srgb, var(--fp-accent) 9%, var(--fp-bg))",
              }}>
              <Calculator className="w-5 h-5" />
            </button>
          </div>
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

      <CalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} initialValue={amount}
        onApply={(v) => { setAmount(String(Math.round(v))); setCalcOpen(false); }} />
    </Modal>
  );
}

/* ================= ماشین‌حساب ساده (برای ورود مبلغ) ================= */
function CalculatorModal({ open, onClose, onApply, initialValue }: {
  open: boolean; onClose: () => void; onApply: (v: number) => void; initialValue?: string;
}) {
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<"+" | "-" | "*" | "/" | null>(null);
  const [fresh, setFresh] = useState(true);

  useEffect(() => {
    if (open) {
      const v = Number(initialValue) || 0;
      setDisplay(v > 0 ? String(v) : "0");
      setAcc(null); setOp(null); setFresh(v <= 0);
    }
  }, [open]);

  const compute = (a: number, b: number, o: string): number => {
    switch (o) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? 0 : a / b;
      default: return b;
    }
  };
  const opSymbol = (o: string) => (o === "+" ? "+" : o === "-" ? "−" : o === "*" ? "×" : "÷");

  const digit = (d: string) => {
    if (fresh) {
      setDisplay(d === "." ? "0." : d);
      setFresh(false);
    } else {
      if (d === "." && display.includes(".")) return;
      setDisplay(display === "0" && d !== "." ? d : display + d);
    }
  };
  const applyOp = (nextOp: "+" | "-" | "*" | "/") => {
    const cur = parseFloat(display) || 0;
    if (acc === null || op === null) {
      setAcc(cur);
    } else if (!fresh) {
      const res = compute(acc, cur, op);
      setAcc(res);
      setDisplay(String(Math.round(res)));
    }
    setOp(nextOp);
    setFresh(true);
  };
  const equals = () => {
    if (op === null || acc === null) return;
    const res = compute(acc, parseFloat(display) || 0, op);
    setDisplay(String(Math.round(res)));
    setAcc(null); setOp(null); setFresh(true);
  };
  const clearAll = () => { setDisplay("0"); setAcc(null); setOp(null); setFresh(true); };
  const backspace = () => {
    if (fresh) return;
    const next = display.length > 1 ? display.slice(0, -1) : "0";
    setDisplay(next === "" || next === "-" ? "0" : next);
    if (next === "0") setFresh(true);
  };
  const percent = () => {
    setDisplay(String(Math.round((parseFloat(display) || 0) / 100)));
    setFresh(true);
  };

  const fmtNum = (s: string): string => {
    const [i, d] = s.split(".");
    const intPart = i === "" || i === "-" ? "0" : i;
    const grouped = faNum(groupInt(Number(intPart)));
    return d !== undefined ? grouped + "٫" + faNum(d) : grouped;
  };

  if (!open) return null;

  const numBtn = "h-12 rounded-xl text-[16px] font-black cursor-pointer transition-all duration-100 hover:brightness-110 active:scale-95";

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0" style={{ background: "rgba(3,15,10,0.75)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="pop-in relative w-full max-w-xs card p-5" style={{ background: "var(--fp-bg2)", borderColor: "var(--fp-border2)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl flex items-center gap-2" style={{ color: "var(--fp-accent)" }}>
            <Calculator className="w-5 h-5" /> ماشین‌حساب
          </h2>
          <button className="icon-btn" onClick={onClose} title="بستن"><X className="w-4.5 h-4.5" /></button>
        </div>

        <div className="rounded-xl px-4 py-3 text-end mb-4 overflow-hidden" style={{ background: "var(--fp-bg)", border: "1px solid var(--fp-border)" }}>
          {op !== null && acc !== null && (
            <p className="text-[12px] font-bold tabular" style={{ color: "var(--fp-text3)" }} dir="ltr">
              {faNum(groupInt(acc))} {opSymbol(op)}
            </p>
          )}
          <p className="font-display text-[28px] leading-tight tabular truncate" style={{ color: "var(--fp-text)" }} dir="ltr">
            {fmtNum(display)}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2" dir="ltr">
          <button className={numBtn} style={{ background: "color-mix(in srgb, var(--fp-coral) 15%, var(--fp-bg))", color: "var(--fp-coral)" }} onClick={clearAll}>C</button>
          <button className={numBtn} style={{ background: "var(--fp-bg)", color: "var(--fp-text2)" }} onClick={backspace}>⌫</button>
          <button className={numBtn} style={{ background: "var(--fp-bg)", color: "var(--fp-text2)" }} onClick={percent}>٪</button>
          <button className={numBtn} style={{ background: "color-mix(in srgb, var(--fp-accent) 18%, var(--fp-bg))", color: "var(--fp-accent)" }} onClick={() => applyOp("/")}>÷</button>

          {["7", "8", "9"].map((d) => (
            <button key={d} className={numBtn} style={{ background: "var(--fp-bg)", color: "var(--fp-text)" }} onClick={() => digit(d)}>{faNum(d)}</button>
          ))}
          <button className={numBtn} style={{ background: "color-mix(in srgb, var(--fp-accent) 18%, var(--fp-bg))", color: "var(--fp-accent)" }} onClick={() => applyOp("*")}>×</button>

          {["4", "5", "6"].map((d) => (
            <button key={d} className={numBtn} style={{ background: "var(--fp-bg)", color: "var(--fp-text)" }} onClick={() => digit(d)}>{faNum(d)}</button>
          ))}
          <button className={numBtn} style={{ background: "color-mix(in srgb, var(--fp-accent) 18%, var(--fp-bg))", color: "var(--fp-accent)" }} onClick={() => applyOp("-")}>−</button>

          {["1", "2", "3"].map((d) => (
            <button key={d} className={numBtn} style={{ background: "var(--fp-bg)", color: "var(--fp-text)" }} onClick={() => digit(d)}>{faNum(d)}</button>
          ))}
          <button className={numBtn} style={{ background: "color-mix(in srgb, var(--fp-accent) 18%, var(--fp-bg))", color: "var(--fp-accent)" }} onClick={() => applyOp("+")}>+</button>

          <button className={`${numBtn} col-span-2`} style={{ background: "var(--fp-bg)", color: "var(--fp-text)" }} onClick={() => digit("0")}>۰</button>
          <button className={numBtn} style={{ background: "var(--fp-bg)", color: "var(--fp-text)" }} onClick={() => digit(".")}>,</button>
          <button className={numBtn} style={{ background: "var(--fp-accent)", color: "#071b16" }} onClick={equals}>=</button>
        </div>

        <button className="btn btn-gold w-full mt-4" onClick={() => onApply(parseFloat(display) || 0)}>
          <Check className="w-4 h-4" strokeWidth={3} /> استفاده در مبلغ
        </button>
      </div>
    </div>
  );
}
