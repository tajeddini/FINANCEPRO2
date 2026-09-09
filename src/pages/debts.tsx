/* ---------- صفحهٔ بدهی‌ها و اقساط ---------- */
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpLeft, Banknote, Check, Plus, QrCode, Repeat, Scale } from "lucide-react";
import { accById, useStore, type ID, type Installment } from "../lib/data";
import { calcEMI, faDate, faMoney, faNum, jalaliShort, todayISO } from "../lib/utils";
import { AmountInput, Bar, DeleteBtn, EditBtn, Empty, Field, JalaliPicker, Modal, TInput, TSelect, useToast } from "../ui";
import { Head } from "./shared";

export default function DebtsPage() {
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
        {[["debt", "بدهی‌ها"], ["credit", "طلب‌ها"], ["inst", "اقساط"]].map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? "chip-on" : ""}`} onClick={() => setTab(k as "debt" | "credit" | "inst")}>{l}</button>
        ))}
      </div>

      {tab !== "inst" ? (
        <div className="grid gap-3">
          {list.length === 0 && <div className="card rise-in"><Empty text={tab === "debt" ? "هیچ بدهی‌ای نداری — آفرین! 🎉" : "طلبی ثبت نشده."} /></div>}
          {list.map((d) => {
            const remaining = d.amount - d.paid;
            return (
              <div key={d.id} className="card p-4 rise-in">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-[14px] font-black flex items-center gap-2">
                      <span className="shrink-0">{d.kind === "debt" ? <ArrowUpLeft className="w-4 h-4" style={{ color: "var(--fp-coral)" }} /> : <ArrowDownRight className="w-4 h-4" style={{ color: "var(--fp-mint)" }} />}</span>
                      <span className="truncate">{d.person}</span>
                    </p>
                    {d.note && <p className="text-[10.5px] font-bold mt-0.5 truncate" style={{ color: "var(--fp-text3)" }}>{d.note}</p>}
                    {d.due && <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>سررسید: {faDate(d.due)}</p>}
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[14px] font-black tabular whitespace-nowrap" style={{ color: tab === "debt" ? "var(--fp-coral)" : "var(--fp-mint)" }}>
                      {faMoney(remaining)} <span className="text-[10px]" style={{ color: "var(--fp-text3)" }}>از {faMoney(d.amount)}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 justify-end">
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
                      <p className="text-[14px] font-black flex items-center gap-2 min-w-0"><Repeat className="w-4 h-4 shrink-0" style={{ color: "var(--fp-accent)" }} /> <span className="truncate">{x.title}</span></p>
                      <div className="flex gap-1.5 shrink-0">
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
                          <span className="text-[10.5px] font-bold shrink-0 whitespace-nowrap flex items-center gap-1" style={{ color: m.paidAt ? "var(--fp-mint)" : "var(--fp-text3)" }}>
                            {m.paidAt && <Check className="w-3.5 h-3.5" />} قسط {faNum(idx + 1)}
                          </span>
                          <span className="text-[10.5px] font-bold flex-1 min-w-0 truncate" style={{ color: "var(--fp-text3)" }}>{jalaliShort(m.due)}</span>
                          <span className="text-[11px] font-black tabular shrink-0 whitespace-nowrap">{faMoney(m.amount)}</span>
                          {!m.paidAt && (
                            <button className="btn btn-mint btn-sm !py-0.5 !text-[10px] shrink-0" onClick={() => { setPayInst({ inst: x, idx }); setPayInstAcc(x.accountId); }}>پرداخت</button>
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
                <div className="flex justify-between gap-2 text-[12.5px] font-black"><span>قسط ماهانه</span><span className="tabular whitespace-nowrap" style={{ color: "var(--fp-accent)" }}>{faMoney(emi.monthly)}</span></div>
                <div className="flex justify-between gap-2 text-[11.5px] font-bold mt-2" style={{ color: "var(--fp-text2)" }}><span>جمع بازپرداخت</span><span className="tabular whitespace-nowrap">{faMoney(emi.total)}</span></div>
                <div className="flex justify-between gap-2 text-[11.5px] font-bold mt-1.5" style={{ color: "var(--fp-text2)" }}><span>سود پرداختی</span><span className="tabular whitespace-nowrap" style={{ color: "var(--fp-coral)" }}>{faMoney(emi.interest)}</span></div>
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
