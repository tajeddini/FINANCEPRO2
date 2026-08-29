/* ---------- صفحه‌های اصلی برنامه (بخش اول) ---------- */
import { useEffect, useMemo, useRef, useState } from "react";
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
  /* مرحلهٔ پیشنهاد تگ بعد از ثبت تراکنشِ هزینهٔ بدون تگ */
  const [suggestTxId, setSuggestTxId] = useState<ID | "">("");
  const [suggestCat, setSuggestCat] = useState("");
  /* ثبت از پیام بانکی */
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
  }, [open, editing]);

  useEffect(() => {
    if (touchedCat || !open) return;
    setCategoryId(state.categories.find((c) => c.type === type)?.id ?? "");
  }, [type, open]);

  /* تشخیص هوشمند — با تغییر توضیح */
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

  /* پیش‌بینی کسری بودجه: هشدار قبل از رسیدن به سقف بودجهٔ دسته */
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
      /* یادآوری هوشمند تگ‌گذاری: هزینهٔ بدون تگ → پیشنهاد برچسب بر اساس دسته */
      if (!tag && getTags(state).length > 0) {
        setSuggestTxId(newId);
        setSuggestCat(label);
        return;
      }
    }
    handleClose();
  };

  /* ترتیب پیشنهادی تگ‌ها: تگِ هم‌خوان با دسته اول می‌آید */
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

  /* ---------- تحلیل پیام بانکی ---------- */
  const analyzeSms = (source = smsText) => {
    if (!source.trim()) return toast("warn", "ابتدا متن پیام بانکی را بچسبان.");
    const r = parseBankSMS(source);
    setSmsResult(r);
    if (r.confidence === "low") {
      toast("err", "مبلغی در پیام پیدا نشد — متن پیام را کامل کپی کن.");
      return;
    }
    /* پر کردن خودکار فرم */
    setType(r.type);
    setAmount(String(r.amountToman));
    if (r.dateISO) setDate(r.dateISO);
    /* تطبیق حساب: چهار رقم کارت ← شمارهٔ حساب ← نام بانک داخل پیام */
    const matched =
      matchAccountByCard(state.accounts, r.cardTail, r.accountNo) ??
      matchAccountByBankName(state.accounts, source);
    if (matched) setAccountId(matched.id);
    if (r.merchant) {
      setNote(r.merchant);
      /* حدس دسته از نام فروشنده/طرف مقابل */
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

      {/* کلید تشخیص هوشمند */}
      <button
        onClick={() => toggleSmart(!smart)}
        className="w-full flex items-center gap-3 rounded-xl border px-4 py-3 mb-4 transition-all duration-200 cursor-pointer"
        style={{
          borderColor: smart ? "color-mix(in srgb, var(--fp-accent) 60%, transparent)" : "var(--fp-border)",
          background: smart ? "color-mix(in srgb, var(--fp-accent) 9%, transparent)" : "var(--fp-bg)",
        }}
      >
        <Sparkles className="w-5 h-5 shrink-0" style={{ color: smart ? "var(--fp-accent)" : "var(--fp-text3)" }} />
        <span className="text-[13px] font-black" style={{ color: smart ? "var(--fp-accent)" : "var(--fp-text2)" }}>
          تشخیص هوشمند
        </span>
        <span className="text-[10.5px] font-bold flex-1" style={{ color: "var(--fp-text3)" }}>
          مبلغ، دسته و کارت بانکی را از توضیحات حدس می‌زند
        </span>
        <span
          className="w-11 h-6 rounded-full p-1 flex transition-all duration-250 shrink-0"
          style={{ background: smart ? "var(--fp-accent)" : "var(--fp-border2)", justifyContent: smart ? "flex-end" : "flex-start" }}
        >
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

      {/* ---------- ثبت از پیام بانکی ---------- */}
      <div className="rounded-xl border overflow-hidden mb-4 transition-all duration-200"
        style={{
          borderColor: smsOpen ? "color-mix(in srgb, var(--fp-sky) 55%, transparent)" : "var(--fp-border)",
          background: smsOpen ? "color-mix(in srgb, var(--fp-sky) 5%, var(--fp-bg))" : "var(--fp-bg)",
        }}>
        <button onClick={() => { setSmsOpen((o) => !o); setSmsResult(null); }}
          className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer">
          <MessageSquare className="w-5 h-5 shrink-0" style={{ color: smsOpen ? "var(--fp-sky)" : "var(--fp-text3)" }} />
          <span className="text-[13px] font-black" style={{ color: smsOpen ? "var(--fp-sky)" : "var(--fp-text2)" }}>
            ثبت از پیام بانکی
          </span>
          <span className="text-[10.5px] font-bold flex-1 text-start" style={{ color: "var(--fp-text3)" }}>
            پیامک بانک را بچسبان تا مبلغ، تاریخ و کارت خودش دربیاید
          </span>
          <span className={`transition-transform duration-200 ${smsOpen ? "rotate-180" : ""}`} style={{ color: "var(--fp-text3)" }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </span>
        </button>

        {smsOpen && (
          <div className="px-4 pb-4 rise-in">
            <div className="rounded-xl border border-dashed p-3" dir="rtl"
              style={{ borderColor: "var(--fp-border2)", background: "var(--fp-bg2)" }}>
              <textarea
                value={smsText}
                onChange={(e) => { setSmsText(e.target.value); setSmsResult(null); }}
                rows={4}
                placeholder={"بانك ملي ايران\nانتقال:4,509,000-\nحساب:83008\nمانده:220,654,858\n0531-20:40"}
                className="w-full bg-transparent outline-none resize-none text-[12px] leading-6"
                style={{ color: "var(--fp-text2)" }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-black me-0.5" style={{ color: "var(--fp-text3)" }}>نمونهٔ واقعی:</span>
              {SMS_SAMPLES.map((s) => (
                <button key={s.label}
                  onClick={() => { setSmsText(s.text); analyzeSms(s.text); }}
                  className="text-[10px] font-black px-2.5 py-1 rounded-full cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
                  style={{ background: "color-mix(in srgb, var(--fp-sky) 13%, transparent)", color: "var(--fp-sky)", border: "1px solid color-mix(in srgb, var(--fp-sky) 40%, transparent)" }}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <button className="btn btn-sm" onClick={() => analyzeSms()}
                style={{ background: "var(--fp-sky)", color: "#071b16" }}>
                <Sparkles className="w-4 h-4" /> تحلیل پیام
              </button>
              <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: "var(--fp-text3)" }}>
                🔒 تحلیل فقط روی دستگاه خودت انجام می‌شود — پیام هیچ‌جا فرستاده نمی‌شود
              </span>
            </div>

            {smsResult && smsResult.confidence !== "low" && (
              <div className="mt-3 rounded-xl border p-3.5 rise-in"
                style={{ borderColor: "color-mix(in srgb, var(--fp-sky) 40%, transparent)", background: "color-mix(in srgb, var(--fp-sky) 7%, transparent)" }}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11.5px] font-black" style={{ color: "var(--fp-sky)" }}>نتیجهٔ تحلیل — فرم پر شد ✔</span>
                  <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: smsResult.confidence === "high" ? "color-mix(in srgb, var(--fp-mint) 16%, transparent)" : "color-mix(in srgb, var(--fp-accent) 16%, transparent)",
                      color: smsResult.confidence === "high" ? "var(--fp-mint)" : "var(--fp-accent)",
                    }}>
                    {smsResult.confidence === "high" ? "اطمینان بالا" : "بازبینی کن"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-display text-3xl tabular" style={{ color: smsResult.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                    {smsResult.type === "income" ? "+" : "−"}{faMoney(smsResult.amountToman)}
                  </span>
                  <span className="text-[11px] font-black" style={{ color: "var(--fp-text2)" }}>تومان</span>
                  {smsResult.unit === "rial" && (
                    <span className="text-[10.5px] font-bold tabular" style={{ color: "var(--fp-text3)" }}>
                      ← {faNum(groupInt(smsResult.rawAmount))} ریال (تبدیل خودکار)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {smsResult.jalali && (
                    <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "var(--fp-bg2)", color: "var(--fp-text2)" }}>
                      <CalendarDays className="w-3 h-3" /> {smsResult.dateISO ? faDate(smsResult.dateISO) : smsResult.jalali}{smsResult.time ? ` — ${faNum(smsResult.time)}` : ""}
                    </span>
                  )}
                  {(smsResult.cardTail || smsResult.accountNo) && (
                    <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex items-center gap-1" dir="ltr" style={{ background: "var(--fp-bg2)", color: "var(--fp-text2)" }}>
                      <Wallet className="w-3 h-3" />
                      {smsResult.cardTail ? <bdi>*{faNum(smsResult.cardTail)}</bdi> : <bdi>حساب {faNum(smsResult.accountNo!)}</bdi>}
                      {(() => {
                        const a = matchAccountByCard(state.accounts, smsResult.cardTail, smsResult.accountNo)
                          ?? matchAccountByBankName(state.accounts, smsText);
                        return a ? <b style={{ color: "var(--fp-mint)" }}>← {a.name}</b> : <i className="not-italic" style={{ color: "var(--fp-text3)" }}>حساب منطبق پیدا نشد</i>;
                      })()}
                    </span>
                  )}
                  {smsResult.merchant && (
                    <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "var(--fp-bg2)", color: "var(--fp-text2)" }}>
                      <Receipt className="w-3 h-3" /> {smsResult.merchant}
                    </span>
                  )}
                  {smsResult.balanceToman !== undefined && (
                    <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "var(--fp-bg2)", color: "var(--fp-text2)" }}>
                      <Landmark className="w-3 h-3" /> مانده: {faMoney(smsResult.balanceToman)}
                    </span>
                  )}
                  {smsResult.reference && (
                    <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex items-center gap-1" dir="ltr" style={{ background: "var(--fp-bg2)", color: "var(--fp-text2)" }}>
                      <Receipt className="w-3 h-3" /> ارجاع: <bdi>{smsResult.reference}</bdi>
                    </span>
                  )}
                </div>
                {smsResult.notes.length > 0 && (
                  <ul className="grid gap-1 mt-2.5 pt-2.5 border-t" style={{ borderColor: "color-mix(in srgb, var(--fp-sky) 22%, transparent)" }}>
                    {smsResult.notes.map((n, i) => (
                      <li key={i} className="text-[10.5px] font-bold leading-5 flex items-start gap-1.5" style={{ color: "var(--fp-accent)" }}>
                        <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" /> {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="توضیحات (اختیاری — تراکنش با نام دسته ثبت می‌شود)">
            <textarea
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder={smart ? "مثلاً: اسنپ ۵۰ هزار از کارت ملت" : "مثلاً: خرید از سوپرمارکت یاس"}
              rows={2}
              className="input resize-none !text-[13.5px] !leading-6"
              autoFocus
            />
            <div className="mt-2">
              <MicButton onText={(t) => onNote(t)} baseText={note} />
            </div>
          </Field>
        </div>
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

      {type === "expense" && (
        <div className="mt-4">
          <Field label="تگ خرج (این خرید چه جور خرجی بود؟)">
            <div className="flex flex-wrap gap-2">
              {getTags(state).map((t) => {
                const on = tag === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTag(on ? "" : t.id)}
                    title={t.desc}
                    className="px-3 py-2 rounded-xl text-[12px] font-black transition-all duration-150 cursor-pointer hover:scale-[1.03] active:scale-95"
                    style={{
                      background: on ? `color-mix(in srgb, ${t.color} 22%, transparent)` : "var(--fp-bg)",
                      color: on ? t.color : "var(--fp-text3)",
                      border: `1.5px solid ${on ? t.color : "var(--fp-border)"}`,
                      boxShadow: on ? `0 4px 14px -6px color-mix(in srgb, ${t.color} 60%, transparent)` : "none",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      )}
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
          <div className="flex items-center justify-between">
            <Head icon={<Landmark className="w-4.5 h-4.5" />} title="موجودی حساب‌ها" />
            <button className="icon-btn !w-8 !h-8" onClick={() => setHideAcc(!hideAcc)} title={hideAcc ? "نمایش موجودی حساب‌ها" : "مخفی کردن موجودی حساب‌ها"}>
              {hideAcc ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
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
                      {hideAcc ? hiddenMoney : `${faMoney(a.balance)} ﷼`}
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

      <SpendInsightCard monthTxs={monthTxs} expense={expense} />
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

/* ---------- تحلیل خودکار رفتار خرج (بر اساس برچسب‌ها) ---------- */
function SpendInsightCard({ monthTxs, expense }: { monthTxs: Tx[]; expense: number }) {
  const { state } = useStore();
  const tags = getTags(state);
  const tagged = monthTxs.filter((x) => x.type === "expense" && x.tag);
  const perTag = tags
    .map((tg) => {
      const sum = tagged.filter((x) => x.tag === tg.id).reduce((a, x) => a + x.amount, 0);
      return { tag: tg, sum, pct: expense > 0 ? (sum / expense) * 100 : 0 };
    })
    .filter((x) => x.sum > 0)
    .sort((a, b) => b.sum - a.sum);
  /* بدون‌برچسب = تگی ندارد یا تگش حذف شده (یتیم) */
  const untagged = monthTxs.filter((x) => x.type === "expense" && (!x.tag || !tagById(state, x.tag))).length;
  /* پتانسیل پس‌انداز: همهٔ برچسب‌های غیرضروری — با برچسب‌های سفارشی کاربر هم به‌روز می‌ماند */
  const essential = tags.find((tg) => tg.label.includes("ضروری"));
  const potential = perTag.filter((x) => x.tag.id !== essential?.id).reduce((a, x) => a + x.sum, 0);
  const top = perTag[0];

  const insights: { icon: React.ReactNode; text: string; tone: string }[] = [];
  if (top) {
    insights.push({
      icon: <Sparkles className="w-4 h-4" />,
      text: `بیشترین خرج این ماه با برچسب «${top.tag.label}» بوده — ٪${faNum(Math.round(top.pct))} از کل هزینه.`,
      tone: top.tag.color,
    });
  }
  if (potential > 0 && expense > 0) {
    insights.push({
      icon: <Lightbulb className="w-4 h-4" />,
      text: `این ماه ٪${faNum(Math.round((potential / expense) * 100))} از خرج‌هایت (معادل ${faMoney(potential)} تومان) می‌توانست عقب بیفتد — این همان پتانسیل پس‌انداز توست.`,
      tone: "var(--fp-mint)",
    });
  }
  if (untagged > 0) {
    insights.push({
      icon: <Lightbulb className="w-4 h-4" />,
      text: `${faNum(untagged)} تراکنشِ هزینه هنوز برچسب ندارد — برچسب‌گذاری کمک می‌کند رفتار خرجت را دقیق‌تر ببینی.`,
      tone: "var(--fp-accent)",
    });
  }
  if (insights.length === 0) {
    insights.push({
      icon: <Sparkles className="w-4 h-4" />,
      text: "هنوز دادهٔ کافی برای تحلیل رفتار خرج نداری — چند تراکنش با برچسب ثبت کن.",
      tone: "var(--fp-text3)",
    });
  }

  return (
    <div className="card p-5 rise-in" style={{ ["--d" as string]: "200ms" }}>
      <Head icon={<Lightbulb className="w-4.5 h-4.5" />} title="تحلیل رفتار خرج این ماه" />
      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        <div className="grid gap-3.5">
          {perTag.slice(0, 5).map(({ tag, sum, pct }) => (
            <div key={tag.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12.5px] font-black flex items-center gap-2">
                  <i className="w-2.5 h-2.5 rounded-full not-italic" style={{ background: tag.color }} />
                  {tag.label}
                  <span className="text-[10px] font-bold" style={{ color: "var(--fp-text3)" }}>٪{faNum(Math.round(pct))}</span>
                </span>
                <span className="text-[12px] font-black tabular">{faMoney(sum)}</span>
              </div>
              <Bar pct={pct} color={tag.color} />
            </div>
          ))}
          {perTag.length === 0 && (
            <p className="text-[12px] font-bold" style={{ color: "var(--fp-text3)" }}>هنوز تراکنشی با برچسب ثبت نشده.</p>
          )}
        </div>
        <div className="grid gap-2.5 content-start">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl p-3 border"
              style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)", borderInlineStart: `3px solid ${ins.tone}` }}>
              <span style={{ color: ins.tone }} className="mt-0.5 shrink-0">{ins.icon}</span>
              <p className="text-[12px] font-bold leading-6">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  const pf = usePeriod("thisMonth");
  const [catFilter, setCatFilter] = useState(initCat ?? "");
  const [tagFilter, setTagFilter] = useState<ID | "">("");
  const [editing, setEditing] = useState<Tx | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const range = pf.range;
  const filtered = useMemo(() => {
    return state.transactions
      .filter((t) => (type === "all" || t.type === type))
      .filter((t) => inRange(t.date, range))
      .filter((t) => !catFilter || t.categoryId === catFilter)
      .filter((t) => !tagFilter || t.tag === tagFilter)
      .filter((t) => !q.trim() || t.title.includes(q.trim()) || (t.note ?? "").includes(q.trim()))
      .sort((a, b) => (b.date + b.createdAt).toString().localeCompare((a.date + a.createdAt).toString()));
  }, [state.transactions, type, q, catFilter, tagFilter, range.from, range.to]);

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
            <TInput className="!ps-9" placeholder="جست‌وجو در توضیحات و دسته‌ها…" value={q} onChange={(e) => setQ(e.target.value)} />
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
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] font-black me-1" style={{ color: "var(--fp-text3)" }}>تگ:</span>
          <button className={`chip ${tagFilter === "" ? "chip-on" : ""}`} onClick={() => setTagFilter("")}>همه</button>
          {getTags(state).map((tg) => (
            <button key={tg.id} onClick={() => setTagFilter(tagFilter === tg.id ? "" : tg.id)}
              className="chip"
              style={tagFilter === tg.id ? {
                background: `color-mix(in srgb, ${tg.color} 20%, transparent)`,
                color: tg.color, borderColor: tg.color,
              } : undefined}>
              {tg.label}
            </button>
          ))}
        </div>
      </div>

      <PeriodFilter pf={pf} count={<>{faNum(filtered.length)} تراکنش در این بازه</>} />

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
                        <p className="text-[13.5px] font-black truncate flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-md text-[10.5px] inline-flex items-center gap-1" style={{ background: `color-mix(in srgb, ${c?.color ?? "#888"} 16%, transparent)`, color: c?.color }}>
                            <CatIconInline icon={c?.icon} className="w-3 h-3" />
                            {c?.name ?? tx.title}
                          </span>
                          {(() => {
                            const tg = tagById(state, tx.tag);
                            return tg ? (
                              <span title={tg.desc} className="px-1.5 py-0.5 rounded-full text-[9.5px] font-black border shrink-0"
                                style={{ background: `color-mix(in srgb, ${tg.color} 14%, transparent)`, color: tg.color, borderColor: `color-mix(in srgb, ${tg.color} 45%, transparent)` }}>
                                {tg.label}
                              </span>
                            ) : null;
                          })()}
                          {tx.note && <span className="truncate">{tx.note}</span>}
                          {tx.source === "bot" && <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "color-mix(in srgb, var(--fp-sky) 15%, transparent)", color: "var(--fp-sky)" }}>ربات</span>}
                        </p>
                        <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>
                          {accById(state, tx.accountId)?.name} · {tx.payMethod ?? "—"}
                        </p>
                      </div>
                      <span className="text-[13.5px] font-black tabular" style={{ color: tx.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                        {tx.type === "income" ? "+" : "−"}{faMoney(tx.amount)}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          className="flex items-center gap-1 text-[11px] font-black px-2.5 py-2 rounded-lg transition-all duration-150 cursor-pointer hover:scale-105"
                          style={{ background: "color-mix(in srgb, var(--fp-accent) 14%, transparent)", color: "var(--fp-accent)", border: "1px solid color-mix(in srgb, var(--fp-accent) 35%, transparent)" }}
                          onClick={() => { setEditing(tx); setOpenEdit(true); }}>
                          <PencilLine className="w-3.5 h-3.5" /><span className="hidden sm:inline">ویرایش</span>
                        </button>
                        <button
                          className="flex items-center gap-1 text-[11px] font-black px-2.5 py-2 rounded-lg transition-all duration-150 cursor-pointer hover:scale-105"
                          style={{ background: "color-mix(in srgb, var(--fp-coral) 14%, transparent)", color: "var(--fp-coral)", border: "1px solid color-mix(in srgb, var(--fp-coral) 35%, transparent)" }}
                          onClick={() => trashItem("transactions", tx.id, tx.note || tx.title)}>
                          <Trash2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">حذف</span>
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
export function CategoriesPage() {
  const { state } = useStore();
  const pf = usePeriod("thisMonth");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [selected, setSelected] = useState<string>("");

  const range = pf.range;
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
      <PeriodFilter pf={pf} count={<>{faNum(txs.length)} تراکنش در این بازه</>} className="!mt-0" />

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
                <button key={r.cat!.id} onClick={() => setSelected((s) => (s === r.cat!.id ? "" : r.cat!.id))}
                  className="group text-start rounded-xl border p-3.5 transition-all cursor-pointer hover:-translate-y-0.5"
                  style={{
                    borderColor: selected === r.cat!.id ? r.cat!.color : "var(--fp-border)",
                    background: selected === r.cat!.id ? `color-mix(in srgb, ${r.cat!.color} 10%, var(--fp-bg))` : "var(--fp-bg)",
                    boxShadow: selected === r.cat!.id ? `0 8px 24px -12px color-mix(in srgb, ${r.cat!.color} 55%, transparent)` : "none",
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
                  <p className="text-[10px] font-bold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--fp-accent)" }}>
                    کلیک: نمایش تراکنش‌های این دسته در همین صفحه
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* تراکنش‌های دستهٔ انتخابی — با همان فیلتر زمانی */}
      {selected && (() => {
        const cat = catById(state, selected);
        const list = txs
          .filter((t) => t.categoryId === selected)
          .sort((a, b) => (b.date + b.createdAt).toString().localeCompare((a.date + a.createdAt).toString()));
        const periodLabel = pf.label;
        return (
          <div key={selected + pf.period + pf.range.from + pf.range.to + type} className="card overflow-hidden rise-in">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b"
              style={{ borderColor: "var(--fp-border)", background: `color-mix(in srgb, ${cat?.color ?? "#888"} 9%, var(--fp-bg))` }}>
              <span className="flex items-center gap-2.5 text-[14px] font-black">
                <i className="w-3.5 h-3.5 rounded-full not-italic" style={{ background: cat?.color }} />
                تراکنش‌های «{cat?.name}»
                <span className="chip !cursor-default !py-0.5 !px-2.5 !text-[10.5px]">{periodLabel}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-[12px] font-black tabular" style={{ color: type === "expense" ? "var(--fp-coral)" : "var(--fp-mint)" }}>
                  {faMoney(sumTx(list))} تومان
                </span>
                <button className="icon-btn !w-8 !h-8" title="بستن" onClick={() => setSelected("")}>
                  <XIcon />
                </button>
              </span>
            </div>
            {list.length === 0 && <Empty text="در این بازه تراکنشی برای این دسته نیست." />}
            <div>
              {list.map((t) => (
                <div key={t.id} className="feed-in flex items-center gap-3 px-5 py-3 border-b last:border-b-0" style={{ borderColor: "var(--fp-border)" }}>
                  <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${cat?.color ?? "#888"} 15%, transparent)`, color: cat?.color }}>
                    {t.type === "income" ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpLeft className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black truncate">{t.note || t.title || cat?.name}</p>
                    <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>
                      {faDate(t.date)} · {accById(state, t.accountId)?.name ?? "—"} · {t.payMethod ?? "—"}
                    </p>
                  </div>
                  <span className="text-[13px] font-black tabular" style={{ color: t.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                    {t.type === "income" ? "+" : "−"}{faMoney(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function XIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>;
}

/* ================= ۴) بدهی‌ها ================= */
export function DebtsPage() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<"debt" | "credit" | "inst">("debt");
  const [payFor, setPayFor] = useState<{ id: string; person: string; remaining: number; kind: "debt" | "credit" } | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payAcc, setPayAcc] = useState("");
  const [loan, setLoan] = useState({ p: "10000000", r: "23", n: "12" });
  const [qr, setQr] = useState<string | null>(null);
  const [editDebt, setEditDebt] = useState<{ id: string; kind: "debt" | "credit"; person: string; amount: number; paid: number; due?: string; note?: string } | null>(null);
  /* فرم ثبت/ویرایش قسط */
  const [instForm, setInstForm] = useState<null | { id?: string; title: string; total: string; months: string; start: string; accountId: string; categoryId: string }>(null);

  const debts = state.debts.filter((d) => d.kind === tab);

  /* ---------- محاسبات اقساط ---------- */
  const instStats = (i: Installment) => {
    const sched = i.schedule ?? [];
    const paidAmt = sched.filter((m) => m.paidAt).reduce((a, m) => a + m.amount, 0);
    const remaining = Math.max(0, i.total - paidAmt);
    const unpaid = sched.filter((m) => !m.paidAt);
    const today = todayISO();
    const next = unpaid[0];
    const overdue = unpaid.filter((m) => m.due < today);
    const pct = i.months > 0 ? (i.paidCount / i.months) * 100 : 0;
    return { paidAmt, remaining, next, overdue, pct };
  };

  const payMonth = (inst: Installment, idx: number) => {
    mutate((d) => {
      const x = d.installments.find((y) => y.id === inst.id);
      if (!x) return;
      const m = x.schedule?.[idx];
      if (!m || m.paidAt) return;
      m.paidAt = Date.now();
      x.paidCount = x.schedule.filter((mm) => !!mm.paidAt).length;
      const catId = x.categoryId
        ?? d.categories.find((c) => c.name === "متفرقه")?.id
        ?? d.categories.find((c) => c.type === "expense")?.id ?? "";
      d.transactions.unshift({
        id: Math.random().toString(36).slice(2, 10), date: todayISO(), type: "expense",
        amount: m.amount, title: `قسط ${faNum(idx + 1)} «${x.title}»`, categoryId: catId,
        accountId: x.accountId, payMethod: "شبا", createdAt: Date.now(), source: "app",
      });
    }, `قسط ${faNum(idx + 1)} «${inst.title}» پرداخت شد`);
    toast("ok", `قسط ${faNum(idx + 1)} پرداخت و به‌عنوان تراکنش ثبت شد.`);
  };

  const unpayMonth = (inst: Installment, idx: number) => {
    mutate((d) => {
      const x = d.installments.find((y) => y.id === inst.id);
      if (!x) return;
      const m = x.schedule?.[idx];
      if (!m || !m.paidAt) return;
      m.paidAt = undefined;
      x.paidCount = x.schedule.filter((mm) => !!mm.paidAt).length;
    }, `پرداخت قسط ${faNum(idx + 1)} «${inst.title}» لغو شد`);
    toast("warn", "قسط به حالت پرداخت‌نشده برگشت — تراکنشِ ثبت‌شده در صفحهٔ تراکنش‌ها باقی است.");
  };

  const saveInst = () => {
    if (!instForm) return;
    const title = instForm.title.trim();
    const total = Number(instForm.total) || 0;
    const months = Math.max(1, Number(instForm.months) || 1);
    if (!title) return toast("warn", "عنوان قسط را بنویسید.");
    if (total <= 0) return toast("warn", "مبلغ کل باید بزرگ‌تر از صفر باشد.");
    const base = {
      title, total, months,
      amountPerMonth: Math.ceil(total / months),
      start: instForm.start, accountId: instForm.accountId,
      categoryId: instForm.categoryId || undefined,
    };
    if (instForm.id) {
      mutate((d) => {
        const x = d.installments.find((y) => y.id === instForm.id);
        if (!x) return;
        const oldPaid = (x.schedule ?? []).filter((m) => m.paidAt).length;
        Object.assign(x, base, { paidCount: 0, schedule: [] });
        normalizeInstallments(d);
        const xx = d.installments.find((y) => y.id === instForm.id);
        if (xx) {
          xx.schedule.slice(0, oldPaid).forEach((m) => { m.paidAt = m.paidAt ?? Date.now(); });
          xx.paidCount = xx.schedule.filter((m) => !!m.paidAt).length;
        }
      }, `قسط «${title}» ویرایش شد`);
      toast("ok", "قسط ویرایش شد و برنامهٔ ماهانهٔ آن به‌روز شد.");
    } else {
      mutate((d) => {
        d.installments.push({ id: Math.random().toString(36).slice(2, 10), ...base, paidCount: 0, schedule: [] });
        normalizeInstallments(d);
      }, `قسط «${title}» ثبت شد`);
      toast("ok", "قسط جدید با برنامهٔ ماهانه ساخته شد.");
    }
    setInstForm(null);
  };

  const startInstForm = (i?: Installment) => {
    setInstForm(i
      ? { id: i.id, title: i.title, total: String(i.total), months: String(i.months), start: i.start, accountId: i.accountId, categoryId: i.categoryId ?? "" }
      : { title: "", total: "", months: "12", start: todayISO(), accountId: state.accounts[0]?.id ?? "", categoryId: "" });
  };

  /* جمع‌بندی کل اقساط برای نوار خلاصه */
  const instTotals = state.installments.reduce((acc, i) => {
    const st = instStats(i);
    const mr = jalaliMonthRange(jalaliToday().jy, jalaliToday().jm);
    const dueThisMonth = (i.schedule ?? []).filter((m) => !m.paidAt && inRange(m.due, mr)).reduce((a, m) => a + m.amount, 0);
    acc.remaining += st.remaining;
    acc.thisMonthDue += dueThisMonth;
    acc.overdueCount += st.overdue.length;
    return acc;
  }, { remaining: 0, thisMonthDue: 0, overdueCount: 0 });
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
                        onClick={() => { setPayFor({ id: d.id, person: d.person, remaining, kind: d.kind }); setPayAmt(""); setPayAcc(state.accounts[0]?.id ?? ""); }}>
                        {tab === "debt" ? "پرداخت" : "دریافت"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3"><Bar pct={(d.paid / d.amount) * 100} color={tab === "debt" ? "var(--fp-coral)" : "var(--fp-mint)"} /></div>
                  <div className="flex gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: "var(--fp-border)" }}>
                    <button
                      className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105"
                      style={{ background: "color-mix(in srgb, var(--fp-accent) 13%, transparent)", color: "var(--fp-accent)", border: "1px solid color-mix(in srgb, var(--fp-accent) 35%, transparent)" }}
                      onClick={() => setEditDebt({ id: d.id, kind: d.kind, person: d.person, amount: d.amount, paid: d.paid, due: d.due, note: d.note })}>
                      <PencilLine className="w-3.5 h-3.5" /> ویرایش
                    </button>
                    <button
                      className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105"
                      style={{ background: "color-mix(in srgb, var(--fp-coral) 13%, transparent)", color: "var(--fp-coral)", border: "1px solid color-mix(in srgb, var(--fp-coral) 35%, transparent)" }}
                      onClick={() => trashItem("debts", d.id, `${tab === "debt" ? "بدهی" : "طلب"} ${d.person}`)}>
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rise-in" style={{ ["--d" as string]: "160ms" }}>{addForm}</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* نوار خلاصه + ثبت قسط */}
          <div className="flex flex-wrap items-center gap-3 rise-in" style={{ ["--d" as string]: "80ms" }}>
            <div className="flex flex-wrap gap-2.5 grow">
              <span className="chip !cursor-default !py-2" style={{ color: "var(--fp-text2)" }}>
                <Repeat className="w-4 h-4" style={{ color: "var(--fp-accent)" }} /> {faNum(state.installments.length)} قسط فعال
              </span>
              <span className="chip !cursor-default !py-2 tabular" style={{ color: "var(--fp-coral)" }}>
                باقی‌مانده: {faMoney(instTotals.remaining)}
              </span>
              <span className="chip !cursor-default !py-2 tabular" style={{ color: "var(--fp-accent)" }}>
                سررسید این ماه: {faMoney(instTotals.thisMonthDue)}
              </span>
              {instTotals.overdueCount > 0 && (
                <span className="chip !cursor-default !py-2 tabular" style={{ color: "#8f1d1d", background: "color-mix(in srgb, var(--fp-coral) 16%, transparent)" }}>
                  ⚠ {faNum(instTotals.overdueCount)} قسط معوق
                </span>
              )}
            </div>
            <button className="btn btn-gold" onClick={() => startInstForm()}>
              <Plus className="w-4 h-4" strokeWidth={3} /> قسط جدید
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {state.installments.length === 0 && (
              <div className="lg:col-span-2 card rise-in" style={{ ["--d" as string]: "100ms" }}>
                <Empty text="هیچ قسطی ثبت نشده — با «قسط جدید» برنامهٔ ماهانهٔ وام یا خرید قسطی‌ات را بساز." />
              </div>
            )}
            {state.installments.map((i) => {
              const st = instStats(i);
              const sched = i.schedule ?? [];
              const catName = i.categoryId ? catById(state, i.categoryId)?.name : undefined;
              const today = todayISO();
              const daysTo = (iso: string) => Math.round((new Date(iso + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) / 86400000);
              return (
                <div key={i.id} className="card card-hover p-4 rise-in" style={{ ["--d" as string]: "100ms" }}>
                  {/* سربرگ */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-black truncate">{i.title}</p>
                      <p className="text-[11px] font-bold mt-1 flex flex-wrap gap-x-2 gap-y-0.5" style={{ color: "var(--fp-text3)" }}>
                        <span>{accById(state, i.accountId)?.name}</span>
                        {catName && <span>· {catName}</span>}
                        <span>· شروع {jalaliShort(i.start)}</span>
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <EditBtn onClick={() => startInstForm(i)} />
                      <DeleteBtn onClick={() => trashItem("installments", i.id, `قسط ${i.title}`)} />
                    </div>
                  </div>

                  {/* آمار و پیشرفت */}
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[13px] font-black tabular">{faMoney(i.amountPerMonth)} <span className="text-[10px]" style={{ color: "var(--fp-text3)" }}>/ ماه</span></p>
                    <p className="text-[12px] font-black tabular" style={{ color: st.remaining > 0 ? "var(--fp-coral)" : "var(--fp-mint)" }}>
                      {st.remaining > 0 ? `${faMoney(st.remaining)} مانده` : "تسویه شد 🎉"}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="grow"><Bar pct={st.pct} color={st.pct >= 100 ? "var(--fp-mint)" : "var(--fp-accent)"} /></div>
                    <span className="text-[10.5px] font-black tabular shrink-0" style={{ color: "var(--fp-text3)" }}>
                      {faNum(i.paidCount)} از {faNum(i.months)}
                    </span>
                  </div>
                  {st.next && (
                    <p className="text-[11px] font-bold mt-2 flex items-center gap-1.5">
                      {st.next.due < today
                        ? <span style={{ color: "var(--fp-coral)" }}>⚠ سررسید گذشته — {jalaliShort(st.next.due)} ({faNum(Math.abs(daysTo(st.next.due)))} روز تأخیر)</span>
                        : <span style={{ color: "var(--fp-text2)" }}>⏳ سررسید بعدی: {jalaliShort(st.next.due)} ({faNum(daysTo(st.next.due))} روز دیگر)</span>}
                    </p>
                  )}

                  {/* برنامهٔ ماهانه */}
                  <div className="mt-3 border-t pt-2 max-h-56 overflow-y-auto grid gap-1" style={{ borderColor: "var(--fp-border)" }}>
                    {sched.map((m, idx) => {
                      const overdue = !m.paidAt && m.due < today;
                      return (
                        <div key={idx} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5"
                          style={{ background: m.paidAt ? "color-mix(in srgb, var(--fp-mint) 7%, transparent)" : overdue ? "color-mix(in srgb, var(--fp-coral) 9%, transparent)" : "var(--fp-bg)" }}>
                          <span className="w-6 h-6 rounded-md grid place-items-center text-[10.5px] font-black tabular shrink-0"
                            style={{ background: "color-mix(in srgb, var(--fp-accent) 14%, transparent)", color: "var(--fp-accent)" }}>
                            {faNum(idx + 1)}
                          </span>
                          <span className="text-[11.5px] font-bold grow">{jalaliShort(m.due)}</span>
                          <span className="text-[11.5px] font-black tabular shrink-0">{faMoney(m.amount)}</span>
                          {m.paidAt ? (
                            <button onClick={() => unpayMonth(i, idx)} title="لغو پرداخت (تراکنش را حذف نمی‌کند)"
                              className="flex items-center gap-1 text-[10.5px] font-black px-2 py-1 rounded-md cursor-pointer transition-transform hover:scale-105 shrink-0"
                              style={{ background: "color-mix(in srgb, var(--fp-mint) 18%, transparent)", color: "#1f7a56" }}>
                              <Check className="w-3.5 h-3.5" strokeWidth={3} /> پرداخت شد
                            </button>
                          ) : (
                            <button onClick={() => payMonth(i, idx)}
                              className="flex items-center gap-1 text-[10.5px] font-black px-2 py-1 rounded-md cursor-pointer transition-transform hover:scale-105 shrink-0"
                              style={{ background: overdue ? "var(--fp-coral)" : "var(--fp-accent)", color: "#071b16" }}>
                              <Wallet className="w-3.5 h-3.5" /> {overdue ? "پرداخت معوق" : "پرداخت"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* مودال ثبت/ویرایش قسط */}
          <Modal open={!!instForm} onClose={() => setInstForm(null)} title={instForm?.id ? "ویرایش قسط" : "ثبت قسط جدید"} wide>
            {instForm && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="عنوان (مثلاً وام خرید لپ‌تاپ)"><TInput value={instForm.title} onChange={(e) => setInstForm({ ...instForm, title: e.target.value })} autoFocus /></Field>
                <Field label="مبلغ کل (تومان)"><AmountInput value={instForm.total} onChange={(v) => setInstForm({ ...instForm, total: v })} /></Field>
                <Field label="تعداد ماه"><TInput dir="ltr" value={faNum(instForm.months)} onChange={(e) => setInstForm({ ...instForm, months: e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))) })} /></Field>
                <Field label="اولین سررسید (شمسی)"><JalaliPicker value={instForm.start} onChange={(v) => setInstForm({ ...instForm, start: v })} /></Field>
                <Field label="حساب پرداخت"><TSelect value={instForm.accountId} onChange={(e) => setInstForm({ ...instForm, accountId: e.target.value })}>{state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</TSelect></Field>
                <Field label="دستهٔ هزینه (اختیاری)"><TSelect value={instForm.categoryId} onChange={(e) => setInstForm({ ...instForm, categoryId: e.target.value })}><option value="">— متفرقه —</option>{state.categories.filter((c) => c.type === "expense").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</TSelect></Field>
                {(Number(instForm.total) > 0 && Number(instForm.months) > 0) && (
                  <p className="sm:col-span-2 text-[12px] font-black px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--fp-accent) 10%, transparent)", color: "var(--fp-accent)" }}>
                    هر ماه ≈ {faMoney(Math.ceil((Number(instForm.total) || 0) / (Number(instForm.months) || 1)))} تومان — قسط آخر مابه‌التفاوت را جذب می‌کند تا جمع دقیق شود.
                  </p>
                )}
                <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                  <button className="btn btn-ghost" onClick={() => setInstForm(null)}>انصراف</button>
                  <button className="btn btn-gold" onClick={saveInst}><Plus className="w-4 h-4" strokeWidth={3} /> {instForm.id ? "ذخیرهٔ تغییرات" : "ثبت قسط"}</button>
                </div>
              </div>
            )}
          </Modal>

          {/* ماشین‌حساب وام */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "160ms" }}>
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
        <Field label={`مبلغ (تومان) — باقی‌مانده: ${faMoney(payFor?.remaining ?? 0)}`}>
          <AmountInput value={payAmt} onChange={setPayAmt} />
        </Field>
        {state.accounts.length > 0 && (
          <Field label={payFor?.kind === "debt" ? "پرداخت از حساب" : "دریافت به حساب"}>
            <TSelect value={payAcc} onChange={(e) => setPayAcc(e.target.value)}>
              {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </TSelect>
          </Field>
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
              /* ثبت تراکنش تا تسویه روی ماندهٔ حساب هم اثر بگذارد */
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

      {/* مودال ویرایش بدهی/طلب */}
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
