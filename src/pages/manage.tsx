/* ---------- صفحهٔ مدیریت (حساب‌ها، دسته‌ها، برچسب‌ها، بودجه‌ها، اهداف، دوره‌ای، روش پرداخت) ---------- */
import { useState } from "react";
import { Plus, Repeat, Target, Trash2, Upload, Wallet } from "lucide-react";
import { clearData, getTags, sampleFill, useStore } from "../lib/data";
import { faMoney, faNum, inRange, jalaliMonthRange, jalaliToday } from "../lib/utils";
import { AmountInput, Bar, CatGlyph, CATEGORY_ICONS, CATEGORY_ICON_LABELS, Confirm, DeleteBtn, EditBtn, Empty, Field, JalaliPicker, Modal, TInput, TSelect, useToast } from "../ui";

export default function ManagePage() {
  const { mutate } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState("accounts");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);

  const tabs = [
    ["accounts", "حساب‌ها"], ["categories", "دسته‌ها"], ["tags", "برچسب‌ها"], ["budgets", "بودجه‌ها"],
    ["goals", "اهداف"], ["recurring", "دوره‌ای"], ["methods", "روش پرداخت"],
  ] as const;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">مدیریت</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmSample(true)}>
            <Upload className="w-4 h-4" /> دادهٔ نمونه
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmClear(true)}>
            <Trash2 className="w-4 h-4" /> پاک‌سازی داده‌ها
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rise-in" style={{ ["--d" as string]: "40ms" }}>
        {tabs.map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? "chip-on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "accounts" && <AccountsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "tags" && <TagsTab />}
      {tab === "budgets" && <BudgetsTab />}
      {tab === "goals" && <GoalsTab />}
      {tab === "recurring" && <RecurringTab />}
      {tab === "methods" && <MethodsTab />}

      <Confirm
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onYes={() => {
          mutate((d) => clearData(d), "همهٔ داده‌ها پاک‌سازی شد");
          toast("ok", "همهٔ تراکنش‌ها و داده‌ها پاک شد — ساختار (دسته‌ها، حساب‌ها، برچسب‌ها) حفظ شده.");
        }}
        title="پاک‌سازی همهٔ داده‌ها"
        desc="همهٔ تراکنش‌ها، بدهی‌ها، اقساط، بودجه‌ها، اهداف، قرارها و یادداشت‌ها حذف می‌شوند. ساختار (حساب‌ها، دسته‌ها، برچسب‌ها) حفظ می‌شود. این کار قابل بازگشت نیست. مطمئن هستید؟"
        yesLabel="بله، همه پاک شود"
      />
      <Confirm
        open={confirmSample}
        onClose={() => setConfirmSample(false)}
        onYes={() => {
          mutate((d) => sampleFill(d), "دادهٔ نمونه اضافه شد");
          toast("ok", "دادهٔ نمونه اضافه شد.");
        }}
        title="افزودن دادهٔ نمونه"
        desc="چند ماه تراکنش، بدهی، بودجه، هدف، قرار و یادداشت نمونه اضافه می‌شود تا برنامه را پر ببینید. مطمئن هستید؟"
        yesLabel="بله، اضافه شود"
      />
    </div>
  );
}

function AccountsTab() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<{ id?: string; name: string; type: string; initial: string; color: string } | null>(null);
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <button className="btn btn-gold btn-sm" onClick={() => setForm({ name: "", type: "کارت بانکی", initial: "0", color: "#57d9a3" })}><Plus className="w-4 h-4" strokeWidth={3} /> حساب جدید</button>
      </div>
      {state.accounts.map((a) => (
        <div key={a.id} className="card p-4 flex flex-wrap items-center gap-x-3 gap-y-2 rise-in">
          <CatGlyph icon="wallet" color={a.color} className="w-10 h-10 rounded-xl shrink-0" iconClass="w-5 h-5" />
          <div className="flex-1 min-w-0 basis-40">
            <p className="text-[13px] font-black truncate">{a.name}</p>
            <p className="text-[10.5px] font-bold truncate" style={{ color: "var(--fp-text3)" }}>{a.type} · موجودی اولیه {faMoney(a.initial)}</p>
          </div>
          <p className="text-[13px] font-black tabular shrink-0 whitespace-nowrap" style={{ color: a.balance < 0 ? "var(--fp-coral)" : "var(--fp-mint)" }}>{faMoney(a.balance)}</p>
          <span className="flex gap-1.5 shrink-0">
            <EditBtn onClick={() => setForm({ id: a.id, name: a.name, type: a.type, initial: String(a.initial), color: a.color })} />
            <DeleteBtn onClick={() => { trashItem("accounts", a.id, a.name); toast("warn", "حساب حذف شد — تا ۳۰ ثانیه قابل بازگشت."); }} />
          </span>
        </div>
      ))}
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "ویرایش حساب" : "حساب جدید"}>
          <div className="grid gap-3.5">
            <Field label="نام حساب"><TInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: بانک ملت" /></Field>
            <Field label="نوع">
              <TSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {["کارت بانکی", "نقدی", "سرمایه‌گذاری", "ارز دیجیتال"].map((t) => <option key={t} value={t}>{t}</option>)}
              </TSelect>
            </Field>
            <Field label="موجودی اولیه (تومان)"><AmountInput value={form.initial} onChange={(v) => setForm({ ...form, initial: v })} /></Field>
            <Field label="رنگ">
              <div className="flex gap-2">
                {["#57d9a3", "#5ec8de", "#e8b04b", "#f28fc0", "#8f7ae8"].map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })} className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110"
                    style={{ background: c, outline: form.color === c ? "2.5px solid var(--fp-text)" : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2 mt-1">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>انصراف</button>
              <button className="btn btn-gold" onClick={() => {
                if (!form.name.trim()) return toast("warn", "نام حساب را بنویسید.");
                if (form.id) {
                  mutate((d) => {
                    const a = d.accounts.find((x) => x.id === form.id);
                    if (a) Object.assign(a, { name: form.name.trim(), type: form.type, initial: Number(form.initial) || 0, color: form.color });
                  }, `حساب «${form.name.trim()}» ویرایش شد`);
                } else {
                  mutate((d) => {
                    d.accounts.push({ id: Math.random().toString(36).slice(2, 10), name: form.name.trim(), type: form.type, initial: Number(form.initial) || 0, color: form.color, balance: 0 });
                  }, `حساب «${form.name.trim()}» ساخته شد`);
                }
                toast("ok", "ذخیره شد."); setForm(null);
              }}>ذخیره</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CategoriesTab() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<{ id?: string; name: string; type: "income" | "expense"; color: string; icon: string } | null>(null);
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <button className="btn btn-gold btn-sm" onClick={() => setForm({ name: "", type: "expense", color: "#e8b04b", icon: "wallet" })}><Plus className="w-4 h-4" strokeWidth={3} /> دسته جدید</button>
      </div>
      {state.categories.map((c) => (
        <div key={c.id} className="card p-4 flex flex-wrap items-center gap-x-3 gap-y-2 rise-in">
          <CatGlyph icon={c.icon} color={c.color} className="w-10 h-10 rounded-xl shrink-0" iconClass="w-5 h-5" />
          <div className="flex-1 min-w-0 basis-40">
            <p className="text-[13px] font-black truncate">{c.name}</p>
            <p className="text-[10.5px] font-bold" style={{ color: c.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>{c.type === "income" ? "درآمد" : "هزینه"}</p>
          </div>
          <span className="flex gap-1.5 shrink-0">
            <EditBtn onClick={() => setForm({ id: c.id, name: c.name, type: c.type, color: c.color, icon: c.icon ?? "wallet" })} />
            <DeleteBtn onClick={() => { trashItem("categories", c.id, c.name); toast("warn", "دسته حذف شد — تا ۳۰ ثانیه قابل بازگشت."); }} />
          </span>
        </div>
      ))}
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "ویرایش دسته" : "دسته جدید"}>
          <div className="grid gap-3.5">
            <Field label="نام دسته"><TInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: خوراک" /></Field>
            <Field label="نوع">
              <TSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "income" | "expense" })}>
                <option value="expense">هزینه</option>
                <option value="income">درآمد</option>
              </TSelect>
            </Field>
            <Field label="آیکون">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(CATEGORY_ICONS).map(([key]) => (
                  <button key={key} title={CATEGORY_ICON_LABELS[key]} onClick={() => setForm({ ...form, icon: key })}
                    className="w-9 h-9 rounded-lg grid place-items-center cursor-pointer transition-transform hover:scale-110"
                    style={{ background: form.icon === key ? "color-mix(in srgb, var(--fp-accent) 25%, transparent)" : "var(--fp-bg)", border: `1.5px solid ${form.icon === key ? "var(--fp-accent)" : "var(--fp-border)"}`, color: form.icon === key ? "var(--fp-accent)" : "var(--fp-text2)" }}>
                    <CatGlyph icon={key} color={form.icon === key ? "var(--fp-accent)" : undefined} className="w-6 h-6" iconClass="w-4 h-4" />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="رنگ">
              <div className="flex gap-2">
                {["#e8b04b", "#57d9a3", "#5ec8de", "#ff7a6b", "#f28fc0", "#8f7ae8", "#c0e85e"].map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })} className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110"
                    style={{ background: c, outline: form.color === c ? "2.5px solid var(--fp-text)" : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2 mt-1">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>انصراف</button>
              <button className="btn btn-gold" onClick={() => {
                if (!form.name.trim()) return toast("warn", "نام دسته را بنویسید.");
                if (form.id) {
                  mutate((d) => {
                    const c = d.categories.find((x) => x.id === form.id);
                    if (c) Object.assign(c, { name: form.name.trim(), type: form.type, color: form.color, icon: form.icon });
                  }, `دستهٔ «${form.name.trim()}» ویرایش شد`);
                } else {
                  mutate((d) => {
                    d.categories.push({ id: Math.random().toString(36).slice(2, 10), name: form.name.trim(), type: form.type, color: form.color, icon: form.icon });
                  }, `دستهٔ «${form.name.trim()}» ساخته شد`);
                }
                toast("ok", "ذخیره شد."); setForm(null);
              }}>ذخیره</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TagsTab() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const tags = getTags(state);
  const [form, setForm] = useState<{ id?: string; label: string; color: string; desc: string } | null>(null);
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <button className="btn btn-gold btn-sm" onClick={() => setForm({ label: "", color: "#5ec8de", desc: "" })}><Plus className="w-4 h-4" strokeWidth={3} /> برچسب جدید</button>
      </div>
      {tags.map((tg) => {
        const count = state.transactions.filter((t) => t.tag === tg.id).length;
        return (
          <div key={tg.id} className="card p-4 flex flex-wrap items-center gap-x-3 gap-y-2 rise-in">
            <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-[11px] font-black"
              style={{ background: `color-mix(in srgb, ${tg.color} 18%, transparent)`, color: tg.color }}>
              {tg.label.slice(0, 2)}
            </span>
            <div className="flex-1 min-w-0 basis-36">
              <p className="text-[13px] font-black flex items-center gap-2 min-w-0">
                <span className="truncate">{tg.label}</span>
                {tg.builtin && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ background: "var(--fp-bg3)", color: "var(--fp-text3)" }}>پیش‌فرض</span>}
              </p>
              <p className="text-[10.5px] font-bold truncate" style={{ color: "var(--fp-text3)" }}>{tg.desc || "—"} · {faNum(count)} تراکنش</p>
            </div>
            <span className="flex gap-1.5 shrink-0">
              <EditBtn onClick={() => setForm({ id: tg.id, label: tg.label, color: tg.color, desc: tg.desc ?? "" })} />
              <DeleteBtn onClick={() => { trashItem("tags", tg.id, tg.label); toast("warn", "برچسب حذف شد — تا ۳۰ ثانیه قابل بازگشت."); }} />
            </span>
          </div>
        );
      })}
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "ویرایش برچسب" : "برچسب جدید"}>
          <div className="grid gap-3.5">
            <Field label="نام برچسب"><TInput value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="مثلاً: ضروری" /></Field>
            <Field label="توضیح"><TInput value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="این برچسب چه معنایی دارد؟" /></Field>
            <Field label="رنگ">
              <div className="flex gap-2">
                {["#ff7a6b", "#e8b04b", "#5ec8de", "#57d9a3", "#f28fc0", "#8f7ae8"].map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })} className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110"
                    style={{ background: c, outline: form.color === c ? "2.5px solid var(--fp-text)" : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2 mt-1">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>انصراف</button>
              <button className="btn btn-gold" onClick={() => {
                if (!form.label.trim()) return toast("warn", "نام برچسب را بنویسید.");
                if (form.id) {
                  mutate((d) => {
                    const t = d.tags.find((x) => x.id === form.id);
                    if (t) Object.assign(t, { label: form.label.trim(), color: form.color, desc: form.desc.trim() || undefined });
                  }, `برچسب «${form.label.trim()}» ویرایش شد`);
                } else {
                  mutate((d) => {
                    d.tags.push({ id: Math.random().toString(36).slice(2, 10), label: form.label.trim(), color: form.color, desc: form.desc.trim() || undefined });
                  }, `برچسب «${form.label.trim()}» ساخته شد`);
                }
                toast("ok", "ذخیره شد."); setForm(null);
              }}>ذخیره</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BudgetsTab() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<{ id?: string; categoryId: string; limit: string } | null>(null);
  const t = jalaliToday();
  const mr = jalaliMonthRange(t.jy, t.jm);
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <button className="btn btn-gold btn-sm" onClick={() => setForm({ categoryId: state.categories.find((c) => c.type === "expense")?.id ?? "", limit: "" })}><Plus className="w-4 h-4" strokeWidth={3} /> بودجه جدید</button>
      </div>
      {state.budgets.map((b) => {
        const cat = state.categories.find((c) => c.id === b.categoryId);
        const spent = state.transactions.filter((x) => x.categoryId === b.categoryId && x.type === "expense" && inRange(x.date, mr)).reduce((a, x) => a + x.amount, 0);
        const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
        return (
          <div key={b.id} className="card p-4 rise-in">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[13px] font-black flex items-center gap-2 min-w-0">
                <CatGlyph icon={cat?.icon} color={cat?.color} className="w-8 h-8 shrink-0" iconClass="w-4 h-4" /> <span className="truncate">{cat?.name ?? "—"}</span>
              </p>
              <div className="flex gap-1.5 shrink-0">
                <EditBtn onClick={() => setForm({ id: b.id, categoryId: b.categoryId, limit: String(b.limit) })} />
                <DeleteBtn onClick={() => { trashItem("budgets", b.id, `بودجهٔ ${cat?.name}`); toast("warn", "بودجه حذف شد."); }} />
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-[11px] font-black mb-1.5">
              <span className="tabular whitespace-nowrap" style={{ color: "var(--fp-text2)" }}>{faMoney(spent)} از {faMoney(b.limit)}</span>
              <span className="tabular whitespace-nowrap" style={{ color: pct > 100 ? "var(--fp-coral)" : pct > 80 ? "var(--fp-accent)" : "var(--fp-mint)" }}>٪{faNum(Math.round(pct))}</span>
            </div>
            <Bar pct={Math.min(100, pct)} color={pct > 100 ? "var(--fp-coral)" : pct > 80 ? "var(--fp-accent)" : "var(--fp-mint)"} />
          </div>
        );
      })}
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "ویرایش بودجه" : "بودجه جدید"}>
          <div className="grid gap-3.5">
            <Field label="دسته">
              <TSelect value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {state.categories.filter((c) => c.type === "expense").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </TSelect>
            </Field>
            <Field label="سقف ماهانه (تومان)"><AmountInput value={form.limit} onChange={(v) => setForm({ ...form, limit: v })} /></Field>
            <div className="flex justify-end gap-2 mt-1">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>انصراف</button>
              <button className="btn btn-gold" onClick={() => {
                if (!Number(form.limit)) return toast("warn", "سقف را وارد کنید.");
                if (form.id) {
                  mutate((d) => {
                    const b = d.budgets.find((x) => x.id === form.id);
                    if (b) Object.assign(b, { categoryId: form.categoryId, limit: Number(form.limit) });
                  }, "بودجه ویرایش شد");
                } else {
                  mutate((d) => {
                    d.budgets.push({ id: Math.random().toString(36).slice(2, 10), categoryId: form.categoryId, limit: Number(form.limit) });
                  }, "بودجه ثبت شد");
                }
                toast("ok", "ذخیره شد."); setForm(null);
              }}>ذخیره</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function GoalsTab() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<{ id?: string; title: string; target: string; saved: string } | null>(null);
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <button className="btn btn-gold btn-sm" onClick={() => setForm({ title: "", target: "", saved: "0" })}><Plus className="w-4 h-4" strokeWidth={3} /> هدف جدید</button>
      </div>
      {state.savings_goals.map((g) => {
        const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
        return (
          <div key={g.id} className="card p-4 rise-in">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[13px] font-black flex items-center gap-2 min-w-0"><Target className="w-4 h-4 shrink-0" style={{ color: "var(--fp-accent)" }} /> <span className="truncate">{g.title}</span></p>
              <div className="flex gap-1.5 shrink-0">
                <EditBtn onClick={() => setForm({ id: g.id, title: g.title, target: String(g.target), saved: String(g.saved) })} />
                <DeleteBtn onClick={() => { trashItem("savings_goals", g.id, g.title); toast("warn", "هدف حذف شد."); }} />
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-[11px] font-black mb-1.5">
              <span className="tabular whitespace-nowrap" style={{ color: "var(--fp-text2)" }}>{faMoney(g.saved)} از {faMoney(g.target)}</span>
              <span className="tabular whitespace-nowrap" style={{ color: "var(--fp-accent)" }}>٪{faNum(Math.round(pct))}</span>
            </div>
            <Bar pct={Math.min(100, pct)} color="var(--fp-accent)" />
          </div>
        );
      })}
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "ویرایش هدف" : "هدف جدید"}>
          <div className="grid gap-3.5">
            <Field label="عنوان"><TInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: سفر شیراز" /></Field>
            <Field label="هدف (تومان)"><AmountInput value={form.target} onChange={(v) => setForm({ ...form, target: v })} /></Field>
            <Field label="پس‌انداز شده تاکنون (تومان)"><AmountInput value={form.saved} onChange={(v) => setForm({ ...form, saved: v })} /></Field>
            <div className="flex justify-end gap-2 mt-1">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>انصراف</button>
              <button className="btn btn-gold" onClick={() => {
                if (!form.title.trim() || !Number(form.target)) return toast("warn", "عنوان و مبلغ هدف را کامل کنید.");
                if (form.id) {
                  mutate((d) => {
                    const g = d.savings_goals.find((x) => x.id === form.id);
                    if (g) Object.assign(g, { title: form.title.trim(), target: Number(form.target), saved: Number(form.saved) || 0 });
                  }, `هدف «${form.title.trim()}» ویرایش شد`);
                } else {
                  mutate((d) => {
                    d.savings_goals.push({ id: Math.random().toString(36).slice(2, 10), title: form.title.trim(), target: Number(form.target), saved: Number(form.saved) || 0 });
                  }, `هدف «${form.title.trim()}» ثبت شد`);
                }
                toast("ok", "ذخیره شد."); setForm(null);
              }}>ذخیره</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RecurringTab() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  return (
    <div className="grid gap-3">
      {state.recurring.length === 0 && <div className="card p-5"><Empty text="تراکنش دوره‌ای تعریف نشده." /></div>}
      {state.recurring.map((r) => {
        const cat = state.categories.find((c) => c.id === r.categoryId);
        return (
          <div key={r.id} className="card p-4 flex flex-wrap items-center gap-x-3 gap-y-2 rise-in">
            <CatGlyph icon={cat?.icon} color={cat?.color} className="w-10 h-10 rounded-xl shrink-0" iconClass="w-5 h-5" />
            <div className="flex-1 min-w-0 basis-40">
              <p className="text-[13px] font-black flex items-center gap-2 min-w-0"><Repeat className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--fp-accent)" }} /> <span className="truncate">{r.title}</span></p>
              <p className="text-[10.5px] font-bold tabular truncate" style={{ color: "var(--fp-text3)" }}>روز {faNum(r.dayOfMonth)} هر ماه · {faMoney(r.amount)} تومان</p>
            </div>
            <span className="shrink-0"><DeleteBtn onClick={() => { trashItem("recurring", r.id, r.title); toast("warn", "حذف شد."); }} /></span>
          </div>
        );
      })}
    </div>
  );
}

function MethodsTab() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [name, setName] = useState("");
  return (
    <div className="grid gap-3">
      <div className="card p-4 flex gap-2 rise-in">
        <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="روش پرداخت جدید — مثلاً: شبا" />
        <button className="btn btn-gold btn-sm" onClick={() => {
          if (!name.trim()) return;
          mutate((d) => { d.payment_methods.push({ id: Math.random().toString(36).slice(2, 10), name: name.trim() }); }, `روش «${name.trim()}» اضافه شد`);
          setName(""); toast("ok", "اضافه شد.");
        }}><Plus className="w-4 h-4" strokeWidth={3} /> افزودن</button>
      </div>
      {state.payment_methods.map((m) => (
        <div key={m.id} className="card p-4 flex flex-wrap items-center gap-x-3 gap-y-2 rise-in">
          <Wallet className="w-5 h-5 shrink-0" style={{ color: "var(--fp-accent)" }} />
          <p className="flex-1 min-w-0 basis-32 text-[13px] font-black truncate">{m.name}</p>
          <span className="shrink-0"><DeleteBtn onClick={() => { trashItem("payment_methods", m.id, m.name); toast("warn", "حذف شد."); }} /></span>
        </div>
      ))}
    </div>
  );
}
