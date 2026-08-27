/* ---------- صفحه‌های اصلی برنامه (بخش دوم) ---------- */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, Bot, CalendarDays, Check, Cloud, Clock3, Copy, Download, FileDown,
  KeyRound, Lock, Moon, Palette, PencilLine, Pin, PinOff, Plus, Printer, RefreshCw, Search, Shield,
  StickyNote, Sun, Target, Trash2, TrendingUp, Upload, X,
} from "lucide-react";
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useStore, type AppState, type ID, type Appointment, type Note } from "./lib/data";
import {
  addDaysISO, addJalaliMonths, faDate, faMoney, faNum, faTime, inRange, isoToJalali,
  jalaliDateStr, jalaliFirstOffset, jalaliMonthLen, jalaliMonthRange,
  copyText, jalaliShort, jalaliToISO, jalaliToday, localISODate, MONTHS_FA, relTime,
  todayISO, useNow, WEEKDAYS_MIN,
} from "./lib/utils";
import { THEMES, applyAccent } from "./lib/themes";
import { encodeState, decodeState, pushToCloud, pullFromCloud } from "./lib/cloud";
import { listUsers } from "./lib/auth";
import {
  AmountInput, Bar, CatGlyph, Confirm, Empty, Field, JalaliPicker, MicButton, Modal,
  TInput, TSelect, useToast,
} from "./ui";
import { computeBadges, computeHealthScore, Forecast, Heatmap, ScoreRing } from "./widgets";
import { exportExcel, exportCSV } from "./excel";

const dl = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ================= ۵) قرارها ================= */
export function AppointmentsPage() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const now = useNow();
  const t = jalaliToday();
  const [view, setView] = useState({ jy: t.jy, jm: t.jm });
  const [selDay, setSelDay] = useState(todayISO());
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [openForm, setOpenForm] = useState(false);

  const len = jalaliMonthLen(view.jy, view.jm);
  const off = jalaliFirstOffset(view.jy, view.jm);
  const nav = (n: number) => {
    const m = addJalaliMonths(view.jy, view.jm, n);
    setView(m);
  };
  const dayEvents = state.appointments.filter((a) => a.date === selDay).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = state.appointments
    .filter((a) => a.date >= todayISO())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">قرارها و برنامه‌ها</h1>
          <p className="text-[12.5px] font-bold mt-1 flex items-center gap-2" style={{ color: "var(--fp-text3)" }}>
            <Clock3 className="w-4 h-4" style={{ color: "var(--fp-accent)" }} />
            <span className="tabular text-[15px]" style={{ color: "var(--fp-mint)" }}>{faTime(now)}</span>
            (۲۴ ساعته) · {jalaliDateStr()}
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus className="w-4 h-4" strokeWidth={3} /> قرار جدید
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "70ms" }}>
          <div className="flex items-center justify-between mb-4">
            <button className="icon-btn" onClick={() => nav(1)}><ChevL /></button>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg">{MONTHS_FA[view.jm - 1]} {faNum(view.jy)}</span>
              {!(view.jy === t.jy && view.jm === t.jm) && (
                <button className="chip !py-0.5" onClick={() => { setView({ jy: t.jy, jm: t.jm }); setSelDay(todayISO()); }}>امروز</button>
              )}
            </div>
            <button className="icon-btn" onClick={() => nav(-1)}><ChevR /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAYS_MIN.map((d) => <span key={d} className="text-[10.5px] font-black py-1" style={{ color: "var(--fp-text3)" }}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: off }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: len }).map((_, i) => {
              const d = i + 1;
              const iso = jalaliToISO(view.jy, view.jm, d);
              const evs = state.appointments.filter((a) => a.date === iso);
              const isSel = selDay === iso;
              const isToday = iso === todayISO();
              return (
                <button key={d} onClick={() => setSelDay(iso)}
                  className="relative rounded-lg py-2 text-[12.5px] font-bold tabular cursor-pointer transition-all duration-150 hover:scale-105"
                  style={{
                    background: isSel ? "var(--fp-accent)" : isToday ? "var(--fp-bg3)" : "transparent",
                    color: isSel ? "#071b16" : evs.length ? "var(--fp-text)" : "var(--fp-text2)",
                    border: isToday && !isSel ? "1px dashed var(--fp-border2)" : "1px solid transparent",
                  }}>
                  {faNum(d)}
                  {evs.length > 0 && (
                    <span className="absolute bottom-1 right-1/2 translate-x-1/2 flex gap-[2px]">
                      {evs.slice(0, 3).map((e) => (
                        <i key={e.id} className="w-1 h-1 rounded-full not-italic" style={{ background: isSel ? "#071b16" : "var(--fp-mint)" }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <p className="text-[12px] font-black mb-2" style={{ color: "var(--fp-text3)" }}>
              برنامه‌های {faDate(selDay)}
            </p>
            {dayEvents.length === 0 && <p className="text-[12px] font-bold py-4 text-center" style={{ color: "var(--fp-text3)" }}>قراری در این روز نیست.</p>}
            <div className="grid gap-2">
              {dayEvents.map((a) => (
                <div key={a.id} className="group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors hover:border-[var(--fp-mint)]" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                  <span className="text-[12px] font-black tabular px-2 py-1 rounded-lg" style={{ background: "var(--fp-bg3)", color: "var(--fp-accent)" }}>{faNum(a.time)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-black truncate ${a.done ? "line-through opacity-50" : ""}`}>{a.title}</p>
                    {a.note && <p className="text-[10.5px] font-bold truncate" style={{ color: "var(--fp-text3)" }}>{a.note}</p>}
                  </div>
                  <button className="icon-btn !w-8 !h-8" title={a.done ? "برگرداندن" : "انجام شد"}
                    onClick={() => mutate((d) => { const x = d.appointments.find((y) => y.id === a.id); if (x) x.done = !x.done; })}>
                    <span className="w-4 h-4 rounded-full border-2 grid place-items-center" style={{ borderColor: a.done ? "var(--fp-mint)" : "var(--fp-border2)", background: a.done ? "var(--fp-mint)" : "transparent" }}>
                      {a.done && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="#071b16" strokeWidth="4"><path d="M5 13l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                  </button>
                  <button className="icon-btn !w-8 !h-8" title="ICS"
                    onClick={() => {
                      const [y, m, dd] = a.date.split("-");
                      const [hh, mm] = a.time.split(":");
                      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FinancePro//FA//", "BEGIN:VEVENT",
                        `UID:${a.id}@financepro`, `DTSTART:${y}${m}${dd}T${hh}${mm}00`, `SUMMARY:${a.title.replace(/[,;]/g, " ")}`,
                        "END:VEVENT", "END:VCALENDAR"].join("\r\n");
                      dl(new Blob([ics], { type: "text/calendar" }), "appointment.ics");
                      toast("ok", "فایل ICS دانلود شد.");
                    }}>
                    <FileDown className="w-4 h-4" />
                  </button>
                  <button className="icon-btn !w-8 !h-8 hover:!text-[var(--fp-coral)]" onClick={() => trashItem("appointments", a.id, a.title)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="icon-btn !w-8 !h-8" onClick={() => { setEditing(a); setOpenForm(true); }}><PencilLine className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "130ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2"><TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> پیشِ رو</h3>
            <div className="grid gap-2 mt-3">
              {upcoming.length === 0 && <p className="text-[12px] font-bold text-center py-4" style={{ color: "var(--fp-text3)" }}>قرار آینده‌ای نیست.</p>}
              {upcoming.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3 border transition-all hover:-translate-y-0.5" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                  <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: "color-mix(in srgb, var(--fp-mint) 12%, transparent)", color: "var(--fp-mint)" }}>
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black truncate">{a.title}</p>
                    <p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{jalaliShort(a.date)} · ساعت {faNum(a.time)}</p>
                  </div>
                  {a.date === todayISO() && <span className="chip !cursor-default" style={{ color: "var(--fp-coral)", borderColor: "var(--fp-coral)" }}>امروز</span>}
                </div>
              ))}
            </div>
          </div>
          <ApptForm open={openForm} onClose={() => { setOpenForm(false); setEditing(null); }} editing={editing} />
        </div>
      </div>
    </div>
  );
}

function ChevL() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>; }
function ChevR() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>; }

/** ساعتِ رندِ بعدی — برای پیش‌فرض قرار جدید */
const nextHourTime = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
};

function ApptForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Appointment | null }) {
  const { mutate } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("18:00");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? ""); setDate(editing?.date ?? todayISO());
    setTime(editing?.time ?? nextHourTime()); setNote(editing?.note ?? "");
  }, [open, editing]);
  return (
    <Modal open={open} onClose={onClose} title={editing ? "ویرایش قرار" : "قرار جدید"}>
      <div className="grid gap-3.5">
        <Field label="عنوان">
          <div className="flex gap-2">
            <TInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: ویزیت دندانپزشکی" autoFocus />
            <MicButton onText={setTitle} />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ساعت و دقیقه (۲۴ ساعته)">
            <div className="grid grid-cols-2 gap-2">
              <TSelect aria-label="ساعت" value={time.split(":")[0] ?? "18"}
                onChange={(e) => setTime(`${e.target.value}:${time.split(":")[1] ?? "00"}`)}>
                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                  <option key={h} value={h}>{faNum(h)} — ساعت</option>
                ))}
              </TSelect>
              <TSelect aria-label="دقیقه" value={time.split(":")[1] ?? "00"}
                onChange={(e) => setTime(`${time.split(":")[0] ?? "18"}:${e.target.value}`)}>
                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                  <option key={m} value={m}>{faNum(m)} — دقیقه</option>
                ))}
              </TSelect>
            </div>
          </Field>
          <Field label="یادداشت"><TInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <Field label="تاریخ (شمسی)"><JalaliPicker value={date} onChange={setDate} /></Field>
        <div className="flex justify-end gap-2 mt-1">
          <button className="btn btn-ghost" onClick={onClose}>انصراف</button>
          <button className="btn btn-gold" onClick={() => {
            if (!title.trim()) return toast("warn", "عنوان را بنویسید.");
            if (editing) {
              mutate((d) => { const x = d.appointments.find((y) => y.id === editing.id); if (x) Object.assign(x, { title: title.trim(), date, time, note: note.trim() || undefined }); }, `قرار «${title.trim()}» ویرایش شد`);
            } else {
              mutate((d) => { d.appointments.push({ id: Math.random().toString(36).slice(2, 10), title: title.trim(), date, time, note: note.trim() || undefined }); }, `قرار «${title.trim()}» ثبت شد`);
            }
            toast("ok", "قرار ذخیره شد."); onClose();
          }}>
            <Plus className="w-4 h-4" strokeWidth={3} /> ذخیره
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ================= ۶) گزارش‌ها ================= */
export function ReportsPage() {
  const { state } = useStore();
  const toast = useToast();
  const t = jalaliToday();
  const monthOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = addJalaliMonths(t.jy, t.jm, -i);
      return { jy: m.jy, jm: m.jm, label: `${MONTHS_FA[m.jm - 1]} ${faNum(m.jy)}`, key: `${m.jy}-${m.jm}` };
    });
  }, [t.jy, t.jm]);
  const [mk, setMk] = useState(monthOptions[0].key);
  const sel = monthOptions.find((m) => m.key === mk)!;
  const range = jalaliMonthRange(sel.jy, sel.jm);
  const monthTxs = state.transactions.filter((x) => inRange(x.date, range));

  const { months, forecast } = Forecast({ s: state });
  const lm = addJalaliMonths(t.jy, t.jm, -1);
  const lastRange = jalaliMonthRange(lm.jy, lm.jm);
  const health = computeHealthScore(
    state, monthTxs,
    state.transactions.filter((x) => inRange(x.date, lastRange))
  );
  const badges = computeBadges(state);
  const income = monthTxs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const expense = monthTxs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);

  const fmt = (v: number) => (v >= 1_000_000 ? `${faNum((v / 1_000_000).toFixed(1))}م` : faNum(Math.round(v / 1000)) + "هـ");

  return (
    <div className="grid gap-5" id="reports-root">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in no-print">
        <h1 className="font-display text-3xl md:text-4xl">گزارش‌ها و تحلیل</h1>
        <div className="flex flex-wrap gap-2">
          <TSelect className="!w-auto" value={mk} onChange={(e) => setMk(e.target.value)}>
            {monthOptions.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </TSelect>
          <button className="btn btn-ghost btn-sm" onClick={() => { exportExcel(state).then(() => toast("ok", "فایل اکسل چندبرگی دانلود شد.")); }}>
            <Download className="w-4 h-4" /> اکسل
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(state)}><FileDown className="w-4 h-4" /> CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer className="w-4 h-4" /> چاپ / PDF</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2 rise-in" style={{ ["--d" as string]: "60ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2 mb-4">
            <BarChart3 className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> درآمد و هزینه — ۶ ماه اخیر
          </h3>
          <div dir="ltr" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months.slice(0, 6).map((m) => ({ ...m, income: m.income / 1e6, expense: m.expense / 1e6 }))} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--fp-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--fp-text3)", fontSize: 11, fontFamily: "Vazirmatn" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => fmt(v * 1e6)} tick={{ fill: "var(--fp-text3)", fontSize: 10, fontFamily: "Vazirmatn" }} axisLine={false} tickLine={false} width={44} />
                <RTooltip
                  cursor={{ fill: "color-mix(in srgb, var(--fp-mint) 6%, transparent)" }}
                  contentStyle={{ background: "var(--fp-bg2)", border: "1px solid var(--fp-border2)", borderRadius: 10, fontFamily: "Vazirmatn", fontSize: 12 }}
                  formatter={(v: number, n: string) => [`${faMoney(v * 1e6)} تومان`, n === "income" ? "درآمد" : "هزینه"]}
                  labelStyle={{ color: "var(--fp-text)" }}
                />
                <RBar dataKey="income" fill="var(--fp-mint)" radius={[6, 6, 0, 0]} maxBarSize={26} />
                <RBar dataKey="expense" fill="var(--fp-coral)" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "110ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2"><TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> پیش‌بینی ماه بعد</h3>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl p-3 border text-center" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <p className="text-[10.5px] font-black" style={{ color: "var(--fp-text3)" }}>درآمد احتمالی</p>
                <p className="font-display text-lg tabular mt-1" style={{ color: "var(--fp-mint)" }}>{faMoney(forecast.income)}</p>
              </div>
              <div className="rounded-xl p-3 border text-center" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <p className="text-[10.5px] font-black" style={{ color: "var(--fp-text3)" }}>هزینهٔ احتمالی</p>
                <p className="font-display text-lg tabular mt-1" style={{ color: "var(--fp-coral)" }}>{faMoney(forecast.expense)}</p>
              </div>
            </div>
            <p className="text-[10.5px] font-bold mt-3 leading-5" style={{ color: "var(--fp-text3)" }}>
              بر اساس میانگین سه ماه اخیر و روند ماه قبل.
            </p>
          </div>
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "160ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2"><Shield className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> سلامت مالی</h3>
            <div className="flex items-center gap-4 mt-3">
              <ScoreRing score={health.score} size={110} />
              <div className="flex-1 grid gap-2">
                {health.parts.map((p) => (
                  <div key={p.label} title={p.tip}>
                    <div className="flex justify-between text-[10.5px] font-black mb-1"><span>{p.label}</span><span className="tabular" style={{ color: "var(--fp-text3)" }}>٪{faNum(p.pct)}</span></div>
                    <Bar pct={p.pct} color={p.pct >= 60 ? "var(--fp-mint)" : p.pct >= 35 ? "var(--fp-accent)" : "var(--fp-coral)"} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
          <h3 className="text-[14px] font-black mb-4">خلاصهٔ {monthOptions.find((m) => m.key === mk)?.label}</h3>
          <div className="grid gap-2.5">
            {[
              ["درآمد ماه", income, "var(--fp-mint)"],
              ["هزینهٔ ماه", expense, "var(--fp-coral)"],
              ["تراز ماه", income - expense, income - expense >= 0 ? "var(--fp-mint)" : "var(--fp-coral)"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="flex justify-between items-center rounded-xl px-4 py-3 border" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <span className="text-[12.5px] font-black" style={{ color: "var(--fp-text2)" }}>{l as string}</span>
                <span className="font-display text-lg tabular" style={{ color: c as string }}>{faMoney(v as number)} <span className="text-[10px] font-body font-bold" style={{ color: "var(--fp-text3)" }}>تومان</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 rise-in" style={{ ["--d" as string]: "130ms" }}>
          <h3 className="text-[14px] font-black mb-4">نقشهٔ حرارتی خرج — ۱۴ هفته</h3>
          <Heatmap txs={state.transactions} />
        </div>

        <div className="card p-5 rise-in" style={{ ["--d" as string]: "180ms" }}>
          <h3 className="text-[14px] font-black mb-4">نشان‌ها</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {badges.map((b) => (
              <div key={b.id} title={b.desc}
                className="rounded-xl border p-3 text-center transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: b.earned ? "color-mix(in srgb, var(--fp-accent) 45%, transparent)" : "var(--fp-border)",
                  background: b.earned ? "color-mix(in srgb, var(--fp-accent) 7%, transparent)" : "var(--fp-bg)",
                  opacity: b.earned ? 1 : 0.45,
                }}>
                <span className="text-xl">{b.icon}</span>
                <p className="text-[11.5px] font-black mt-1">{b.title}</p>
                <p className="text-[9.5px] font-bold leading-4 mt-0.5" style={{ color: "var(--fp-text3)" }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="print-area" className="hidden">
        <h1 style={{ fontFamily: "Lalezar", fontSize: 26 }}>گزارش فایننس‌پرو — {monthOptions.find((m) => m.key === mk)?.label}</h1>
        <p>درآمد: {faMoney(income)} تومان · هزینه: {faMoney(expense)} تومان · تراز: {faMoney(income - expense)} تومان</p>
        <p>امتیاز سلامت مالی: {faNum(health.score)} از ۱۰۰</p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead><tr><th style={{ border: "1px solid #999", padding: 6 }}>تاریخ</th><th style={{ border: "1px solid #999", padding: 6 }}>عنوان</th><th style={{ border: "1px solid #999", padding: 6 }}>نوع</th><th style={{ border: "1px solid #999", padding: 6 }}>مبلغ</th></tr></thead>
          <tbody>
            {monthTxs.map((x) => (
              <tr key={x.id}>
                <td style={{ border: "1px solid #999", padding: 6 }}>{faDate(x.date)}</td>
                <td style={{ border: "1px solid #999", padding: 6 }}>{x.title}</td>
                <td style={{ border: "1px solid #999", padding: 6 }}>{x.type === "income" ? "درآمد" : "هزینه"}</td>
                <td style={{ border: "1px solid #999", padding: 6 }}>{faMoney(x.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= ۷) مدیریت ================= */
type FieldType = "text" | "amount" | "date" | "number" | "select";
interface FieldDef { key: string; label: string; type: FieldType; options?: { v: string; l: string }[]; }
interface ToolDef {
  id: string; title: string; icon: React.ReactNode; table: string;
  fields: FieldDef[];
  row: (item: any, s: AppState) => React.ReactNode;
}

const COLORS = ["#57d9a3", "#5ec8de", "#e8b04b", "#ff7a6b", "#8f7ae8", "#f28fc0", "#7ab8f2", "#c0e85e"];

export function ManagePage() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState("accounts");
  const [editing, setEditing] = useState<any>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const tools: ToolDef[] = [
    {
      id: "accounts", title: "حساب‌ها", icon: <WalletI />, table: "accounts",
      fields: [
        { key: "name", label: "نام حساب", type: "text" },
        { key: "type", label: "نوع", type: "select", options: [{ v: "کارت بانکی", l: "کارت بانکی" }, { v: "نقد", l: "نقد" }, { v: "سرمایه‌گذاری", l: "سرمایه‌گذاری" }] },
        { key: "initial", label: "موجودی اولیه (تومان)", type: "amount" },
        { key: "color", label: "رنگ", type: "select", options: COLORS.map((c) => ({ v: c, l: c })) },
      ],
      row: (a) => (
        <div className="flex items-center gap-3">
          <i className="w-3 h-3 rounded-full not-italic shrink-0" style={{ background: a.color }} />
          <div className="flex-1"><p className="text-[13px] font-black">{a.name}</p><p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{a.type}</p></div>
          <span className="text-[13px] font-black tabular">{faMoney(a.balance)}</span>
        </div>
      ),
    },
    {
      id: "categories", title: "دسته‌ها", icon: <Target className="w-4 h-4" />, table: "categories",
      fields: [
        { key: "name", label: "نام دسته", type: "text" },
        { key: "type", label: "نوع", type: "select", options: [{ v: "expense", l: "هزینه" }, { v: "income", l: "درآمد" }] },
        { key: "color", label: "رنگ", type: "select", options: COLORS.map((c) => ({ v: c, l: c })) },
      ],
      row: (c, s) => (
        <div className="flex items-center gap-3">
          <i className="w-3 h-3 rounded-full not-italic shrink-0" style={{ background: c.color }} />
          <span className="flex-1 text-[13px] font-black">{c.name}</span>
          <span className="chip !cursor-default">{c.type === "income" ? "درآمد" : "هزینه"}</span>
          <span className="text-[11px] font-bold tabular" style={{ color: "var(--fp-text3)" }}>{faNum(s.transactions.filter((t) => t.categoryId === c.id).length)} تراکنش</span>
        </div>
      ),
    },
    {
      id: "transfers", title: "انتقال‌ها", icon: <SwapI />, table: "transfers",
      fields: [
        { key: "from", label: "از حساب", type: "select", options: [] },
        { key: "to", label: "به حساب", type: "select", options: [] },
        { key: "amount", label: "مبلغ (تومان)", type: "amount" },
        { key: "date", label: "تاریخ", type: "date" },
        { key: "note", label: "یادداشت", type: "text" },
      ],
      row: (tr, s) => (
        <div className="flex items-center gap-3">
          <SwapI />
          <span className="flex-1 text-[12.5px] font-black">{s.accounts.find((a) => a.id === tr.from)?.name} ← {s.accounts.find((a) => a.id === tr.to)?.name}</span>
          <span className="text-[11px] font-bold" style={{ color: "var(--fp-text3)" }}>{jalaliShort(tr.date)}</span>
          <span className="text-[13px] font-black tabular" style={{ color: "var(--fp-sky)" }}>{faMoney(tr.amount)}</span>
        </div>
      ),
    },
    {
      id: "recurring", title: "دوره‌ای‌ها", icon: <RepeatI />, table: "recurring",
      fields: [
        { key: "title", label: "عنوان", type: "text" },
        { key: "type", label: "نوع", type: "select", options: [{ v: "expense", l: "هزینه" }, { v: "income", l: "درآمد" }] },
        { key: "amount", label: "مبلغ (تومان)", type: "amount" },
        { key: "categoryId", label: "دسته", type: "select", options: [] },
        { key: "accountId", label: "حساب", type: "select", options: [] },
        { key: "dayOfMonth", label: "روز ماه (۱-۲۸)", type: "number" },
      ],
      row: (r, s) => (
        <div className="flex items-center gap-3">
          <RepeatI />
          <div className="flex-1"><p className="text-[13px] font-black">{r.title}</p><p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>روز {faNum(r.dayOfMonth)} هر ماه · {s.categories.find((c) => c.id === r.categoryId)?.name}</p></div>
          <span className="text-[13px] font-black tabular" style={{ color: r.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>{faMoney(r.amount)}</span>
        </div>
      ),
    },
    {
      id: "savings_goals", title: "اهداف پس‌انداز", icon: <Target className="w-4 h-4" />, table: "savings_goals",
      fields: [
        { key: "title", label: "عنوان هدف", type: "text" },
        { key: "target", label: "مبلغ هدف (تومان)", type: "amount" },
        { key: "saved", label: "پس‌اندازشده (تومان)", type: "amount" },
        { key: "deadline", label: "مهلت", type: "date" },
      ],
      row: (g) => (
        <div className="w-full">
          <div className="flex justify-between text-[12.5px] font-black mb-1.5">
            <span>{g.title} {g.deadline && <span className="text-[10px] font-bold" style={{ color: "var(--fp-text3)" }}>· تا {jalaliShort(g.deadline)}</span>}</span>
            <span className="tabular">{faMoney(g.saved)} / {faMoney(g.target)}</span>
          </div>
          <Bar pct={(g.saved / g.target) * 100} color="var(--fp-mint)" />
        </div>
      ),
    },
    {
      id: "budgets", title: "بودجه‌ها", icon: <Shield className="w-4 h-4" />, table: "budgets",
      fields: [
        { key: "categoryId", label: "دسته", type: "select", options: [] },
        { key: "limit", label: "سقف ماهانه (تومان)", type: "amount" },
      ],
      row: (b, s) => {
        const t = jalaliToday();
        const spent = s.transactions.filter((x) => x.categoryId === b.categoryId && x.type === "expense" && inRange(x.date, jalaliMonthRange(t.jy, t.jm))).reduce((a, x) => a + x.amount, 0);
        const over = spent > b.limit;
        return (
          <div className="w-full">
            <div className="flex justify-between text-[12.5px] font-black mb-1.5">
              <span>{s.categories.find((c) => c.id === b.categoryId)?.name}</span>
              <span className="tabular" style={{ color: over ? "var(--fp-coral)" : "var(--fp-mint)" }}>{faMoney(spent)} از {faMoney(b.limit)} {over && "⚠"}</span>
            </div>
            <Bar pct={(spent / b.limit) * 100} color={over ? "var(--fp-coral)" : "var(--fp-mint)"} />
          </div>
        );
      },
    },
    {
      id: "payment_methods", title: "روش‌های پرداخت", icon: <CardI />, table: "payment_methods",
      fields: [{ key: "name", label: "نام روش", type: "text" }],
      row: (m) => <span className="text-[13px] font-black">{m.name}</span>,
    },
    {
      id: "cheques", title: "چک‌ها", icon: <FileI />, table: "cheques",
      fields: [
        { key: "kind", label: "نوع", type: "select", options: [{ v: "out", l: "پرداختی" }, { v: "in", l: "دریافتی" }] },
        { key: "bank", label: "بانک", type: "text" },
        { key: "person", label: "در وجه / از", type: "text" },
        { key: "amount", label: "مبلغ (تومان)", type: "amount" },
        { key: "date", label: "سررسید", type: "date" },
        { key: "status", label: "وضعیت", type: "select", options: [{ v: "pending", l: "در جریان" }, { v: "cashed", l: "پاس شده" }, { v: "bounced", l: "برگشتی" }] },
      ],
      row: (c) => (
        <div className="flex items-center gap-3">
          <FileI />
          <div className="flex-1"><p className="text-[13px] font-black">چک {c.kind === "out" ? "پرداختی" : "دریافتی"} — {c.bank}</p><p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{c.person} · سررسید {jalaliShort(c.date)}</p></div>
          <span className={`chip !cursor-default`} style={{ color: c.status === "cashed" ? "var(--fp-mint)" : c.status === "bounced" ? "var(--fp-coral)" : "var(--fp-accent)", borderColor: "currentColor" }}>
            {c.status === "cashed" ? "پاس شده" : c.status === "bounced" ? "برگشتی" : "در جریان"}
          </span>
          <span className="text-[13px] font-black tabular">{faMoney(c.amount)}</span>
        </div>
      ),
    },
    {
      id: "subscriptions", title: "اشتراک‌ها", icon: <RepeatI />, table: "subscriptions",
      fields: [
        { key: "name", label: "نام سرویس", type: "text" },
        { key: "amount", label: "مبلغ (تومان)", type: "amount" },
        { key: "cycle", label: "دوره", type: "select", options: [{ v: "monthly", l: "ماهانه" }, { v: "yearly", l: "سالانه" }] },
        { key: "renew", label: "تمدید", type: "date" },
      ],
      row: (sb) => (
        <div className="flex items-center gap-3">
          <RepeatI />
          <span className="flex-1 text-[13px] font-black">{sb.name}</span>
          <span className="text-[11px] font-bold" style={{ color: "var(--fp-text3)" }}>تمدید: {jalaliShort(sb.renew)}</span>
          <span className="text-[13px] font-black tabular">{faMoney(sb.amount)} / {sb.cycle === "monthly" ? "ماه" : "سال"}</span>
        </div>
      ),
    },
    {
      id: "assets", title: "دارایی‌ها", icon: <GemI />, table: "assets",
      fields: [
        { key: "name", label: "نام دارایی", type: "text" },
        { key: "buyPrice", label: "قیمت خرید (تومان)", type: "amount" },
        { key: "nowPrice", label: "قیمت امروز (تومان)", type: "amount" },
        { key: "qty", label: "تعداد", type: "number" },
      ],
      row: (a) => {
        const pnl = (a.nowPrice - a.buyPrice) * a.qty;
        return (
          <div className="flex items-center gap-3">
            <GemI />
            <span className="flex-1 text-[13px] font-black">{a.name} <span className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>×{faNum(a.qty)}</span></span>
            <span className="text-[13px] font-black tabular">{faMoney(a.nowPrice * a.qty)}</span>
            <span className="chip !cursor-default" style={{ color: pnl >= 0 ? "var(--fp-mint)" : "var(--fp-coral)", borderColor: "currentColor" }}>
              {pnl >= 0 ? "+" : "−"}{faMoney(pnl)}
            </span>
          </div>
        );
      },
    },
    {
      id: "challenges", title: "چالش‌ها", icon: <FlameI />, table: "challenges",
      fields: [
        { key: "title", label: "عنوان چالش", type: "text" },
        { key: "target", label: "هدف (تومان)", type: "amount" },
        { key: "saved", label: "جمع‌شده (تومان)", type: "amount" },
        { key: "perDay", label: "روزی (تومان)", type: "amount" },
      ],
      row: (c) => (
        <div className="w-full">
          <div className="flex justify-between text-[12.5px] font-black mb-1.5"><span>{c.title}</span><span className="tabular">٪{faNum(Math.min(100, Math.round((c.saved / c.target) * 100)))}</span></div>
          <Bar pct={(c.saved / c.target) * 100} color="var(--fp-accent)" />
        </div>
      ),
    },
    {
      id: "currencies", title: "ارزها", icon: <CoinI />, table: "currencies",
      fields: [
        { key: "name", label: "نام ارز", type: "text" },
        { key: "symbol", label: "نماد", type: "text" },
        { key: "rate", label: "نرخ (تومان)", type: "amount" },
        { key: "qty", label: "مقدار", type: "number" },
      ],
      row: (c) => (
        <div className="flex items-center gap-3">
          <CoinI />
          <span className="flex-1 text-[13px] font-black">{c.name} <span className="text-[10.5px]" style={{ color: "var(--fp-text3)" }}>({c.symbol})</span></span>
          <span className="text-[11px] font-bold tabular" style={{ color: "var(--fp-text3)" }}>نرخ {faMoney(c.rate)}</span>
          <span className="text-[13px] font-black tabular">{faMoney(c.rate * c.qty)}</span>
        </div>
      ),
    },
  ];

  const active = tools.find((tl) => tl.id === tab)!;
  const items: any[] = (state as any)[active.table] ?? [];

  const fillOptions = (f: FieldDef): FieldDef => {
    if (f.key === "categoryId") return { ...f, options: state.categories.map((c) => ({ v: c.id, l: c.name })) };
    if (f.key === "accountId" || f.key === "from" || f.key === "to") return { ...f, options: state.accounts.map((a) => ({ v: a.id, l: a.name })) };
    return f;
  };

  const startNew = () => {
    const init: Record<string, string> = {};
    for (const f of active.fields) {
      init[f.key] = f.type === "date" ? todayISO() : f.type === "select" ? (fillOptions(f).options?.[0]?.v ?? "") : "";
    }
    setForm(init); setEditing(null); setOpenForm(true);
  };
  const startEdit = (item: any) => {
    const init: Record<string, string> = {};
    for (const f of active.fields) init[f.key] = String(item[f.key] ?? "");
    setForm(init); setEditing(item); setOpenForm(true);
  };
  const save = () => {
    mutate((d) => {
      const arr = (d as any)[active.table] as any[];
      const obj: any = { ...editing };
      for (const f of active.fields) {
        obj[f.key] = f.type === "amount" || f.type === "number" ? Number(form[f.key]) || 0 : form[f.key];
      }
      if (editing) {
        const i = arr.findIndex((x) => x.id === editing.id);
        if (i >= 0) arr[i] = obj;
      } else {
        obj.id = Math.random().toString(36).slice(2, 10);
        if (active.table === "accounts") obj.balance = obj.initial;
        arr.push(obj);
      }
    }, `${active.title}: ${editing ? "ویرایش" : "افزودن"} «${form.name ?? form.title ?? form.person ?? ""}»`);
    toast("ok", editing ? "ویرایش شد." : "اضافه شد.");
    setOpenForm(false);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">مدیریت</h1>
        <button className="btn btn-gold" onClick={startNew}><Plus className="w-4 h-4" strokeWidth={3} /> افزودن به {active.title}</button>
      </div>

      <div className="flex flex-wrap gap-1.5 rise-in" style={{ ["--d" as string]: "50ms" }}>
        {tools.map((tl) => (
          <button key={tl.id} className={`chip ${tab === tl.id ? "chip-on" : ""}`} onClick={() => setTab(tl.id)}>
            {tl.icon}{tl.title}
            <span className="opacity-60 tabular">{faNum(((state as any)[tl.table] ?? []).length)}</span>
          </button>
        ))}
      </div>

      <div className="card p-4 rise-in" style={{ ["--d" as string]: "100ms" }}>
        {items.length === 0 && <Empty text={`هیچ ${active.title} ثبت نشده — اولین را بسازید.`} />}
        <div className="grid gap-2">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:border-[var(--fp-mint)]" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
              <div className="flex-1 min-w-0">{active.row(item, state)}</div>
              <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="icon-btn" onClick={() => startEdit(item)}><PencilLine className="w-4 h-4" /></button>
                <button className="icon-btn hover:!text-[var(--fp-coral)]" onClick={() => trashItem(active.table as any, item.id, item.name ?? item.title ?? item.person ?? active.title)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editing ? `ویرایش ${active.title}` : `افزودن ${active.title}`}>
        <div className="grid gap-3.5">
          {active.fields.map((f0) => {
            const f = fillOptions(f0);
            return (
              <Field key={f.key} label={f.label}>
                {f.type === "text" && <TInput value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
                {f.type === "number" && <TInput dir="ltr" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
                {f.type === "amount" && <AmountInput value={form[f.key] ?? ""} onChange={(v) => setForm({ ...form, [f.key]: v })} />}
                {f.type === "date" && <JalaliPicker value={form[f.key] || todayISO()} onChange={(v) => setForm({ ...form, [f.key]: v })} />}
                {f.type === "select" && (
                  f.key === "color" ? (
                    <div className="flex gap-2 flex-wrap">
                      {(f.options ?? []).map((o) => (
                        <button key={o.v} onClick={() => setForm({ ...form, color: o.v })}
                          className="w-8 h-8 rounded-lg cursor-pointer transition-transform hover:scale-110"
                          style={{ background: o.v, outline: form.color === o.v ? "2.5px solid var(--fp-text)" : "none", outlineOffset: 2 }} />
                      ))}
                    </div>
                  ) : (
                    <TSelect value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                      {(f.options ?? []).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </TSelect>
                  )
                )}
              </Field>
            );
          })}
          <div className="flex justify-end gap-2 mt-1">
            <button className="btn btn-ghost" onClick={() => setOpenForm(false)}>انصراف</button>
            <button className="btn btn-gold" onClick={save}><Plus className="w-4 h-4" strokeWidth={3} /> ذخیره</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function WalletI() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H5a2 2 0 0 1 0-4h13v4" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1" /><circle cx="16.5" cy="14" r="1" fill="currentColor" /></svg>; }
function SwapI() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></svg>; }
function RepeatI() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>; }
function CardI() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>; }
function FileI() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></svg>; }
function GemI() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></svg>; }
function FlameI() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3 1.072-2.143 .224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z" /></svg>; }
function CoinI() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5 1 2.5 2s-1 1.7-2.5 2-2.5 1-2.5 2 1 2 2.5 2c1 0 2-.5 2.5-1.5M12 6.5v11" strokeLinecap="round" /></svg>; }

/* ================= ۸) تنظیمات ================= */
export function SettingsPage({ user, onLogout, onDelete, onLock }: {
  user: { id: string; name: string; username: string; guest?: boolean };
  onLogout: () => void; onDelete: () => void; onLock: () => void;
}) {
  const { state, mutate } = useStore();
  const toast = useToast();
  const [pin, setPin] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [transferOut, setTransferOut] = useState("");
  const [transferIn, setTransferIn] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const p = state.prefs;
  const syncOn = !!p.syncUrl && !!p.syncKey;
  const users = listUsers();

  const setPrefs = (patch: Partial<typeof p>, log?: string) =>
    mutate((d) => { d.prefs = { ...d.prefs, ...patch }; }, log);

  const doSync = async () => {
    if (!p.syncUrl || !p.syncKey) return toast("warn", "ابتدا آدرس پروژه و کلید anon را پر کنید.");
    setSyncing(true);
    const pull = await pullFromCloud(p);
    if (pull.ok && pull.state && pull.updatedAt && pull.updatedAt > new Date(state.lastSync).toISOString()) {
      mutate((d) => { Object.assign(d, pull.state, { prefs: d.prefs }); }, "دریافت داده از ابر");
      toast("ok", "نسخهٔ جدیدتر از Supabase دریافت شد.");
    } else {
      const push = await pushToCloud(state, p);
      toast(push.ok ? "ok" : "err", push.ok ? "دفترکل با Supabase همگام شد — در هر مرورگری همین داده را می‌بینید." : push.message);
    }
    setSyncing(false);
  };

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl md:text-4xl rise-in">تنظیمات</h1>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="grid gap-5">
          {/* تم */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "40ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2"><Sun className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> ظاهر برنامه</h3>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[13px] font-bold" style={{ color: "var(--fp-text2)" }}>تم {p.theme === "dark" ? "تیره" : "روشن"} فعال است</span>
              <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--fp-border)" }}>
                <button className="px-4 py-2 text-[12px] font-black transition-colors cursor-pointer flex items-center gap-1.5"
                  style={{ background: p.theme === "dark" ? "var(--fp-accent)" : "transparent", color: p.theme === "dark" ? "#071b16" : "var(--fp-text3)" }}
                  onClick={() => setPrefs({ theme: "dark" }, "تم تیره شد")}><Moon className="w-3.5 h-3.5" /> تیره</button>
                <button className="px-4 py-2 text-[12px] font-black transition-colors cursor-pointer flex items-center gap-1.5"
                  style={{ background: p.theme === "light" ? "var(--fp-accent)" : "transparent", color: p.theme === "light" ? "#071b16" : "var(--fp-text3)" }}
                  onClick={() => setPrefs({ theme: "light" }, "تم روشن شد")}><Sun className="w-3.5 h-3.5" /> روشن</button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--fp-border)" }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: "var(--fp-text2)" }}>
                  <Palette className="w-4 h-4" style={{ color: "var(--fp-accent)" }} /> تم رنگی ترکیبی
                </span>
                <span className="text-[10.5px] font-black" style={{ color: "var(--fp-text3)" }}>
                  {THEMES.find((t) => t.id === (p.accent ?? "emerald"))?.name}
                </span>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {THEMES.map((th) => {
                  const active = (p.accent ?? "emerald") === th.id;
                  return (
                    <button key={th.id} title={th.name}
                      onClick={() => { applyAccent(th.id); setPrefs({ accent: th.id }, `تم رنگی «${th.name}» فعال شد`); }}
                      className="relative w-11 h-11 rounded-xl cursor-pointer transition-transform duration-150 hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${th.accent} 0 52%, ${th.mint} 52% 100%)`,
                        outline: active ? "2.5px solid var(--fp-text)" : "2px solid var(--fp-border)",
                        outlineOffset: 2,
                      }}>
                      {active && (
                        <span className="absolute inset-0 grid place-items-center">
                          <Check className="w-5 h-5" strokeWidth={3.5} style={{ color: "#071b16" }} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10.5px] font-bold mt-2.5" style={{ color: "var(--fp-text3)" }}>
                دکمهٔ پالت در بالای برنامه هم تم را سریع عوض می‌کند.
              </p>
            </div>
          </div>

          {/* امنیت */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2"><Lock className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> امنیت — پین</h3>
            {p.pinEnabled ? (
              <div className="flex items-center justify-between mt-4">
                <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: "var(--fp-mint)" }}>
                  <Shield className="w-4 h-4" /> قفل پین فعال است
                </span>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={onLock}><KeyRound className="w-4 h-4" /> قفل کن</button>
                  <button className="btn btn-danger btn-sm" onClick={() => { setPrefs({ pinEnabled: false, pin: undefined }, "قفل پین غیرفعال شد"); toast("ok", "پین حذف شد."); }}>حذف پین</button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 mt-4">
                <Field label="یک پین ۴ تا ۶ رقمی"><TInput dir="ltr" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/[^\d۰-۹]/g, "").slice(0, 6))} placeholder="••••" /></Field>
                <button className="btn btn-mint" onClick={() => {
                  const en = pin.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
                  if (!/^\d{4,6}$/.test(en)) return toast("warn", "پین باید ۴ تا ۶ رقم باشد.");
                  setPrefs({ pin: en, pinEnabled: true }, "قفل پین فعال شد");
                  toast("ok", "پین تنظیم شد؛ از این پس هنگام ورود پرسیده می‌شود."); setPin("");
                }}>فعال‌سازی قفل پین</button>
              </div>
            )}
          </div>

          {/* ربات تلگرام */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "120ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2"><Bot className="w-4.5 h-4.5" style={{ color: "var(--fp-sky)" }} /> ربات تلگرام</h3>
            <p className="text-[12px] font-bold leading-6 mt-3" style={{ color: "var(--fp-text2)" }}>
              دفترکل مشترک با سایت؛ از تلگرام هزینه/درآمد ثبت کنید و یادآوری قرارها بگیرید.
            </p>
            <div className="rounded-xl p-3.5 mt-3 border grid gap-2" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black" style={{ color: "var(--fp-text3)" }}>شناسهٔ سینک شما</span>
                <code dir="ltr" className="text-[12px] font-bold tabular" style={{ color: "var(--fp-accent)" }}>{p.syncId}</code>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black" style={{ color: "var(--fp-text3)" }}>Webhook</span>
                <code dir="ltr" className="text-[10.5px] font-bold truncate" style={{ color: "var(--fp-text2)" }}>/api/telegram-webhook</code>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {["/start", "هزینه ۵۰ هزار اسنپ", "درآمد ۵ میلیون حقوق", "گزارش ماه", "یادآوری‌ها"].map((c) => (
                <span key={c} className="chip !cursor-default" dir="auto">{c}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          {/* سینک ابری */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "60ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2">
              <Cloud className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> همگام‌سازی ابری (Supabase)
              <span className="ms-auto flex items-center gap-1.5 text-[10.5px] font-black" style={{ color: syncOn ? "var(--fp-mint)" : "var(--fp-text3)" }}>
                <span className={`w-1.5 h-1.5 rounded-full ${syncOn ? "pulse-soft" : ""}`} style={{ background: syncOn ? "var(--fp-mint)" : "var(--fp-text3)" }} />
                {syncOn ? "متصل" : "غیرفعال"}
              </span>
            </h3>
            <div className="grid gap-3 mt-4">
              <Field label="آدرس پروژه (SUPABASE_URL)"><TInput dir="ltr" placeholder="https://xxx.supabase.co" value={p.syncUrl ?? ""} onChange={(e) => setPrefs({ syncUrl: e.target.value })} /></Field>
              <Field label="کلید anon (SUPABASE_KEY)"><TInput dir="ltr" type="password" placeholder="eyJhbGciOi…" value={p.syncKey ?? ""} onChange={(e) => setPrefs({ syncKey: e.target.value })} /></Field>
              <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <span className="text-[12px] font-black" style={{ color: "var(--fp-text2)" }}>آخرین سینک: {relTime(state.lastSync)}</span>
                <button className="btn btn-mint btn-sm" disabled={syncing} onClick={doSync}>
                  <RefreshCw className={`w-4 h-4 ${syncing ? "spin-slow" : ""}`} /> {syncing ? "در حال سینک…" : "سینک اکنون"}
                </button>
              </div>
              <p className="text-[11px] font-bold leading-6" style={{ color: "var(--fp-text3)" }}>
                پس از اتصال، تغییرات با ۳ ثانیه تأخیر خودکار به ابر فرستاده و هر ۹۰ ثانیه بررسی می‌شود —
                در مرورگر دیگر با همان شناسهٔ سینک، همین دفترکل را دارید.
              </p>

              <div className="rounded-xl p-3.5 border mt-1"
                style={{ borderColor: "color-mix(in srgb, var(--fp-mint) 40%, transparent)", background: "color-mix(in srgb, var(--fp-mint) 6%, transparent)" }}>
                <p className="text-[11.5px] font-black flex items-center gap-1.5" style={{ color: "var(--fp-mint)" }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={3} /> خیالتان راحت — دیپلویِ جدید، داده را پاک نمی‌کند
                </p>
                <p className="text-[10.5px] font-bold leading-5 mt-1.5" style={{ color: "var(--fp-text2)" }}>
                  داده‌های شما در مرورگر خودتان و در Supabase ذخیره می‌شود، نه روی سرور Vercel.
                  هر دیپلوی جدید فقط فایل‌های برنامه را عوض می‌کند و به اطلاعات دست نمی‌زند؛
                  حتی اگر کش مرورگر پاک شود، با سینکِ فعال همه‌چیز از ابر برمی‌گردد.
                </p>
              </div>
            </div>
          </div>

          {/* انتقال بین مرورگرها */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2">
              <KeyRound className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> انتقال اطلاعات به مرورگر دیگر
            </h3>
            <p className="text-[12px] font-bold leading-6 mt-2" style={{ color: "var(--fp-text2)" }}>
              بدون Supabase هم می‌توانید داده‌ها را جابه‌جا کنید: کد بسازید، در مرورگر/دستگاه دیگر جای‌گذاری و وارد کنید.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button className="btn btn-mint btn-sm" onClick={() => { setTransferOut(encodeState(state)); toast("ok", "کد انتقال ساخته شد — کپی کنید."); }}>
                <KeyRound className="w-4 h-4" /> ساخت کد انتقال
              </button>
              {transferOut && (
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const ok = await copyText(transferOut);
                  setCopied(ok); setTimeout(() => setCopied(false), 1600);
                  toast(ok ? "ok" : "err", ok ? "کد کپی شد." : "کپی ناموفق بود — دستی انتخاب و کپی کنید.");
                }}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "کپی شد" : "کپی کد"}
                </button>
              )}
            </div>
            {transferOut && (
              <textarea readOnly value={transferOut} dir="ltr"
                onFocus={(e) => e.target.select()}
                className="input mt-3 !text-[10.5px] !leading-5 h-24 resize-none" style={{ fontFamily: "ui-monospace, monospace" }} />
            )}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--fp-border)" }}>
              <Field label="کد دریافتی را اینجا بچسبانید">
                <textarea value={transferIn} onChange={(e) => setTransferIn(e.target.value)} dir="ltr" rows={3}
                  placeholder="eyJhY2NvdW50cyI6…"
                  className="input !text-[10.5px] !leading-5 resize-none" style={{ fontFamily: "ui-monospace, monospace" }} />
              </Field>
              <button className="btn btn-gold btn-sm mt-2.5" onClick={() => {
                if (!transferIn.trim()) return toast("warn", "کدی وارد نشده است.");
                const d = decodeState(transferIn);
                if (!d) return toast("err", "کد معتبر نیست — دوباره از ابتدا کپی کنید.");
                mutate((s) => { Object.assign(s, d, { prefs: s.prefs }); }, "انتقال داده از مرورگر دیگر");
                setTransferIn(""); setTransferOut("");
                toast("ok", "اطلاعات با موفقیت منتقل شد.");
              }}>وارد کردن اطلاعات</button>
            </div>
          </div>

          {/* حساب کاربری */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "100ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2"><UserI /> حساب کاربری</h3>
            <div className="flex items-center gap-3 mt-4">
              <span className="w-12 h-12 rounded-2xl grid place-items-center font-display text-xl" style={{ background: "color-mix(in srgb, var(--fp-mint) 15%, transparent)", color: "var(--fp-mint)" }}>
                {user.name.slice(0, 1)}
              </span>
              <div>
                <p className="text-[14px] font-black">{user.name} {user.guest && <span className="chip !cursor-default ms-1">مهمان</span>}</p>
                <p className="text-[11px] font-bold" style={{ color: "var(--fp-text3)" }} dir="ltr">@{user.username}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--fp-border)" }}>
              <p className="text-[11px] font-black mb-2" style={{ color: "var(--fp-text3)" }}>
                کاربران این دستگاه — {faNum(users.length)} کاربر · دادهٔ هرکدام کاملاً جداست
              </p>
              <div className="grid gap-1.5">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors"
                    style={{
                      background: u.id === user.id ? "color-mix(in srgb, var(--fp-mint) 8%, transparent)" : "var(--fp-bg)",
                      border: `1px solid ${u.id === user.id ? "var(--fp-mint)" : "var(--fp-border)"}`,
                    }}>
                    <span className="w-7 h-7 rounded-lg grid place-items-center font-display text-[13px] shrink-0"
                      style={{ background: "color-mix(in srgb, var(--fp-mint) 15%, transparent)", color: "var(--fp-mint)" }}>
                      {u.name.slice(0, 1)}
                    </span>
                    <span className="text-[12px] font-black flex-1 truncate">{u.name}</span>
                    <span className="text-[10px] font-bold" style={{ color: "var(--fp-text3)" }} dir="ltr">@{u.username}</span>
                    {u.id === user.id && <span className="chip !cursor-default !py-0.5" style={{ color: "var(--fp-mint)", borderColor: "var(--fp-mint)" }}>فعال</span>}
                  </div>
                ))}
              </div>
              <p className="text-[10.5px] font-bold mt-2 leading-5" style={{ color: "var(--fp-text3)" }}>
                برای کار با کاربر دیگر، خارج شوید و از صفحهٔ ورود وارد شوید — دفترکل هر کاربر حفظ می‌شود.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button className="btn btn-ghost btn-sm" onClick={() => {
                dl(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), `financepro-backup-${todayISO()}.json`);
                toast("ok", "پشتیبان JSON دانلود شد.");
              }}><Download className="w-4 h-4" /> پشتیبان‌گیری</button>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> بازیابی</button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader();
                r.onload = () => {
                  try {
                    const data = JSON.parse(String(r.result));
                    if (!data.transactions || !data.accounts) throw new Error("bad");
                    mutate((d) => Object.assign(d, data), "بازیابی از پشتیبان");
                    toast("ok", "دادهٔ پشتیبان بازیابی شد.");
                  } catch { toast("err", "فایل پشتیبان معتبر نیست."); }
                };
                r.readAsText(f);
              }} />
              <button className="btn btn-ghost btn-sm" onClick={onLogout}><X className="w-4 h-4" /> خروج از حساب</button>
              {!user.guest && <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(true)}><Trash2 className="w-4 h-4" /> حذف حساب</button>}
            </div>
          </div>

          {/* درباره */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "140ms" }}>
            <h3 className="text-[14px] font-black">دربارهٔ فایننس‌پرو</h3>
            <p className="text-[12px] font-bold leading-7 mt-2" style={{ color: "var(--fp-text2)" }}>
              دفترکل دیجیتال شخصی برای کاربران فارسی‌زبان — PWA با تقویم شمسی، اعداد فارسی و ربات تلگرام.
              تاریخ‌ها میلادی ذخیره و شمسی نمایش داده می‌شوند؛ ماندهٔ حساب‌ها با هر تراکنش خودکار بازمحاسبه می‌شود.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {["React 18", "Vite 6", "TypeScript", "Tailwind v4", "jalaali-js", "Recharts", "ExcelJS", "Supabase"].map((tch) => (
                <span key={tch} className="chip !cursor-default" dir="ltr">{tch}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} onYes={onDelete}
        title="حذف حساب کاربری" desc="همهٔ داده‌های این حساب — تراکنش‌ها، حساب‌ها و تنظیمات — برای همیشه پاک می‌شود. آیا مطمئن هستید؟" />
    </div>
  );
}

function UserI() { return <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fp-accent)" }}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>; }

/* ================= ۵٫۵) یادداشت‌ها ================= */
const NOTE_COLORS = [
  { name: "زرد", value: "#ffd76b" },
  { name: "نعنایی", value: "#7fe0b4" },
  { name: "آسمانی", value: "#8fd3ff" },
  { name: "صورتی", value: "#ffb3cd" },
  { name: "بنفش", value: "#c9b3ff" },
];

export function NotesPage() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [openForm, setOpenForm] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [body, setBody] = useState("");
  const [color, setColor] = useState(NOTE_COLORS[0].value);
  const [cat, setCat] = useState("");
  const [pinFilter, setPinFilter] = useState("");

  /* دسته‌های موجود برای پیشنهاد */
  const catOptions = useMemo(
    () => [...new Set(state.notes.map((n) => n.cat).filter((c): c is string => !!c))],
    [state.notes]
  );

  const notes = useMemo(() => {
    const term = q.trim();
    return [...state.notes]
      .filter((n) => !pinFilter || n.cat === pinFilter)
      .filter((n) => !term || n.title.includes(term) || n.body.includes(term))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.date + b.createdAt).toString().localeCompare((a.date + a.createdAt).toString()));
  }, [state.notes, q, pinFilter]);

  const startNew = () => {
    setEditing(null);
    setTitle(""); setDate(todayISO()); setBody(""); setColor(NOTE_COLORS[0].value); setCat("");
    setOpenForm(true);
  };

  const startEdit = (n: Note) => {
    setEditing(n);
    setTitle(n.title); setDate(n.date); setBody(n.body); setColor(n.color); setCat(n.cat ?? "");
    setOpenForm(true);
  };

  const togglePin = (n: Note) => {
    mutate((d) => {
      const x = d.notes.find((y) => y.id === n.id);
      if (x) x.pinned = !x.pinned;
    }, n.pinned ? `سنجاق «${n.title}» برداشته شد` : `«${n.title}» سنجاق شد`);
  };

  const save = () => {
    if (!title.trim()) return toast("warn", "عنوان یادداشت را بنویسید.");
    const c = cat.trim();
    if (editing) {
      mutate((d) => {
        const x = d.notes.find((y) => y.id === editing.id);
        if (x) Object.assign(x, { title: title.trim(), date, body: body.trim(), color, cat: c || undefined });
      }, `یادداشت «${title.trim()}» ویرایش شد`);
      toast("ok", "یادداشت ویرایش شد.");
    } else {
      mutate((d) => {
        d.notes.unshift({
          id: Math.random().toString(36).slice(2, 10),
          title: title.trim(), date, body: body.trim(), color, createdAt: Date.now(), cat: c || undefined,
        });
      }, `یادداشت «${title.trim()}» ثبت شد`);
      toast("ok", "یادداشت ذخیره شد.");
    }
    setOpenForm(false);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <div>
          <h1 className="font-display text-3xl md:text-4xl flex items-center gap-3">
            <StickyNote className="w-8 h-8" style={{ color: "var(--fp-accent)" }} /> یادداشت‌ها
          </h1>
          <p className="text-[12.5px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>
            {faNum(state.notes.length)} یادداشت — با صدا بنویس، با تاریخ شمسی نگه دار
          </p>
        </div>
        <button className="btn btn-gold" onClick={startNew}>
          <Plus className="w-4 h-4" strokeWidth={3} /> یادداشت جدید
        </button>
      </div>

      <div className="relative max-w-md rise-in" style={{ ["--d" as string]: "40ms" }}>
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3" style={{ color: "var(--fp-text3)" }} />
        <TInput className="!ps-9" placeholder="جست‌وجو در عنوان و متن یادداشت‌ها…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {catOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rise-in" style={{ ["--d" as string]: "60ms" }}>
          <button className={`chip ${pinFilter === "" ? "chip-on" : ""}`} onClick={() => setPinFilter("")}>همه</button>
          {catOptions.map((c) => (
            <button key={c} className={`chip ${pinFilter === c ? "chip-on" : ""}`} onClick={() => setPinFilter(pinFilter === c ? "" : c)}>{c}</button>
          ))}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="card rise-in" style={{ ["--d" as string]: "80ms" }}>
          <Empty text={q.trim() ? "یادداشتی با این عبارت پیدا نشد." : "هنوز یادداشتی ندارید — اولین را بسازید."} />
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:balance]">
          {notes.map((n, i) => (
            <div
              key={n.id}
              className="group relative break-inside-avoid mb-4 rounded-xl p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl rise-in"
              style={{
                background: n.color,
                color: "#0d2c24",
                ["--d" as string]: `${Math.min(i, 6) * 60}ms`,
                transform: `rotate(${(i % 3 - 1) * 0.6}deg)`,
              }}
            >
              <span className="absolute -top-1.5 right-6 w-3.5 h-3.5 rounded-full shadow-inner"
                style={{ background: "color-mix(in srgb, #0d2c24 22%, transparent)", boxShadow: "inset 0 1px 2px rgba(0,0,0,.35)" }} />
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl leading-snug">{n.title}</h3>
                <button onClick={() => togglePin(n)} title={n.pinned ? "برداشتن سنجاق" : "سنجاق کردن"}
                  className="shrink-0 cursor-pointer transition-transform hover:scale-110"
                  style={{ color: n.pinned ? "#c2410c" : "rgba(13,44,36,0.4)" }}>
                  {n.pinned ? <Pin className="w-4 h-4" fill="currentColor" /> : <PinOff className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10.5px] font-black mt-1 flex items-center gap-1.5 flex-wrap opacity-80">
                <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {faDate(n.date)}</span>
                {n.cat && <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(13,44,36,0.12)" }}>{n.cat}</span>}
              </p>
              {n.body && (
                <p className="text-[13px] font-bold leading-7 mt-3 whitespace-pre-wrap">{n.body}</p>
              )}
              <div className="flex justify-end gap-1.5 mt-4">
                <button
                  className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "rgba(13,44,36,0.14)", color: "#0d2c24", border: "1px solid rgba(13,44,36,0.25)" }}
                  onClick={() => startEdit(n)}>
                  <PencilLine className="w-3.5 h-3.5" /> ویرایش
                </button>
                <button
                  className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "rgba(190,40,40,0.18)", color: "#8f1d1d", border: "1px solid rgba(190,40,40,0.35)" }}
                  onClick={() => trashItem("notes", n.id, n.title)}>
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editing ? "ویرایش یادداشت" : "یادداشت جدید"}>
        <div className="grid gap-3.5">
          <Field label="عنوان"><TInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: ایدهٔ پس‌انداز" autoFocus /></Field>
          <Field label="تاریخ (شمسی)"><JalaliPicker value={date} onChange={setDate} /></Field>
          <Field label="رنگ یادداشت">
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button key={c.value} title={c.name} onClick={() => setColor(c.value)}
                  className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110"
                  style={{ background: c.value, outline: color === c.value ? "2.5px solid var(--fp-text)" : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </Field>
          <Field label="دسته (اختیاری)" hint="برای گروه‌بندی یادداشت‌ها — مثلاً: کار، خانه، ایده">
            <>
              <TInput list="note-cats" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="مثلاً: کار" />
              <datalist id="note-cats">
                {catOptions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </>
          </Field>
          <Field label="متن یادداشت" hint="می‌توانید با میکروفون هم بنویسید.">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="هر چه در ذهن دارید همین‌جا بنویسید…"
              className="input !leading-7 resize-y"
              style={{ background: "var(--fp-bg)", border: "1px solid var(--fp-border)" }}
            />
            <div className="mt-2">
              <MicButton onText={(t) => setBody(t)} baseText={body} />
            </div>
          </Field>
          <div className="flex justify-end gap-2 mt-1">
            <button className="btn btn-ghost" onClick={() => setOpenForm(false)}>انصراف</button>
            <button className="btn btn-gold" onClick={save}><Plus className="w-4 h-4" strokeWidth={3} /> ذخیره</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ================= ۶٫۵) حالت روزانه ================= */
export function DailyPage() {
  const { state, mutate } = useStore();
  const now = useNow();
  const today = localISODate(now);
  const t = jalaliToday();

  const todayTxs = state.transactions.filter((x) => x.date === today);
  const spent = todayTxs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
  const earned = todayTxs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);

  const todayAppts = state.appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  /* یادآوری‌ها: سررسیدهای نزدیک، بودجه‌های در خطر، تمدید اشتراک‌ها */
  const soon = addDaysISO(today, 7);
  const reminders: { icon: React.ReactNode; text: string; color: string }[] = [];
  for (const d of state.debts) {
    if (d.kind === "debt" && d.due && d.amount - d.paid > 0 && d.due >= today && d.due <= soon) {
      reminders.push({ icon: <CoinsMini />, text: `بدهی به ${d.person} — ${faMoney(d.amount - d.paid)} تومان، سررسید ${faDate(d.due)}`, color: "var(--fp-coral)" });
    }
  }
  const mr = jalaliMonthRange(t.jy, t.jm);
  for (const b of state.budgets) {
    const s = state.transactions.filter((x) => x.categoryId === b.categoryId && x.type === "expense" && inRange(x.date, mr)).reduce((a, x) => a + x.amount, 0);
    if (b.limit > 0 && s >= b.limit * 0.8) {
      const name = state.categories.find((c) => c.id === b.categoryId)?.name ?? "دسته";
      reminders.push({
        icon: <Shield className="w-4 h-4" />,
        text: s > b.limit
          ? `بودجهٔ «${name}» رد شده — ${faMoney(s - b.limit)} تومان مازاد`
          : `بودجهٔ «${name}» ٪${faNum(Math.round((s / b.limit) * 100))} مصرف شده`,
        color: s > b.limit ? "var(--fp-coral)" : "var(--fp-accent)",
      });
    }
  }
  for (const sub of state.subscriptions) {
    if (sub.renew >= today && sub.renew <= soon) {
      reminders.push({ icon: <RefreshCw className="w-4 h-4" />, text: `تمدید اشتراک «${sub.name}» — ${faMoney(sub.amount)} تومان در ${faDate(sub.renew)}`, color: "var(--fp-sky)" });
    }
  }

  const toggleDone = (id: ID) => {
    mutate((d) => {
      const a = d.appointments.find((x) => x.id === id);
      if (a) a.done = !a.done;
    }, "وضعیت قرار تغییر کرد");
  };

  return (
    <div className="grid gap-5">
      <div className="rise-in">
        <h1 className="font-display text-3xl md:text-4xl flex items-center gap-3">
          <Sun className="w-8 h-8" style={{ color: "var(--fp-accent)" }} /> حالت روزانه
        </h1>
        <p className="text-[13px] font-bold mt-1.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--fp-text3)" }}>
          {jalaliDateStr()}
          <span className="tabular font-display text-[15px]" style={{ color: "var(--fp-accent)" }} dir="ltr">{faTime(now)}</span>
        </p>
      </div>

      {/* آمار امروز */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "40ms" }}>
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>خرج امروز</p>
          <p className="font-display text-3xl tabular mt-1.5" style={{ color: "var(--fp-coral)" }}>{faMoney(spent)}</p>
          <p className="text-[10.5px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>{faNum(todayTxs.filter((x) => x.type === "expense").length)} تراکنش</p>
        </div>
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>درآمد امروز</p>
          <p className="font-display text-3xl tabular mt-1.5" style={{ color: "var(--fp-mint)" }}>{faMoney(earned)}</p>
          <p className="text-[10.5px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>{faNum(todayTxs.filter((x) => x.type === "income").length)} تراکنش</p>
        </div>
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "120ms" }}>
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>قرارهای امروز</p>
          <p className="font-display text-3xl tabular mt-1.5" style={{ color: "var(--fp-accent)" }}>
            {faNum(todayAppts.filter((a) => !a.done).length)}
            <span className="text-[15px]" style={{ color: "var(--fp-text3)" }}> از {faNum(todayAppts.length)}</span>
          </p>
          <p className="text-[10.5px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>باقی‌مانده از امروز</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* قرارهای امروز */}
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "160ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2">
            <CalendarDays className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> برنامهٔ امروز
          </h3>
          {todayAppts.length === 0 ? (
            <p className="text-[12px] font-bold py-6 text-center" style={{ color: "var(--fp-text3)" }}>برای امروز قراری نداری. 🎉</p>
          ) : (
            <div className="grid gap-2 mt-3">
              {todayAppts.map((a) => (
                <button key={a.id} onClick={() => toggleDone(a.id)}
                  className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-start cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ borderColor: a.done ? "var(--fp-border)" : "color-mix(in srgb, var(--fp-mint) 40%, transparent)", background: a.done ? "var(--fp-bg)" : "color-mix(in srgb, var(--fp-mint) 6%, transparent)" }}>
                  <span className="font-display text-xl tabular shrink-0" dir="ltr" style={{ color: a.done ? "var(--fp-text3)" : "var(--fp-accent)" }}>{faNum(a.time)}</span>
                  <span className={`flex-1 text-[12.5px] font-black ${a.done ? "line-through opacity-60" : ""}`}>{a.title}</span>
                  <span className="w-5 h-5 rounded-md grid place-items-center shrink-0 border"
                    style={{ borderColor: a.done ? "var(--fp-mint)" : "var(--fp-border2)", background: a.done ? "var(--fp-mint)" : "transparent" }}>
                    {a.done && <Check className="w-3.5 h-3.5" strokeWidth={3.5} style={{ color: "#071b16" }} />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* یادآوری‌ها */}
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "200ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2">
            <Bell className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> یادآوری‌های هفتهٔ پیشِ رو
          </h3>
          {reminders.length === 0 ? (
            <p className="text-[12px] font-bold py-6 text-center" style={{ color: "var(--fp-text3)" }}>چیز نگران‌کننده‌ای در راه نیست. 😌</p>
          ) : (
            <div className="grid gap-2 mt-3">
              {reminders.map((r, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border"
                  style={{ borderColor: `color-mix(in srgb, ${r.color} 35%, transparent)`, background: `color-mix(in srgb, ${r.color} 7%, transparent)` }}>
                  <span style={{ color: r.color }} className="shrink-0">{r.icon}</span>
                  <span className="text-[12px] font-bold leading-6">{r.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* تراکنش‌های امروز */}
      <div className="card p-5 rise-in" style={{ ["--d" as string]: "240ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2">
          <TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> تراکنش‌های امروز
        </h3>
        {todayTxs.length === 0 ? (
          <p className="text-[12px] font-bold py-6 text-center" style={{ color: "var(--fp-text3)" }}>امروز هنوز تراکنشی ثبت نشده.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-1.5 mt-3">
            {todayTxs.map((x) => {
              const c = state.categories.find((cc) => cc.id === x.categoryId);
              return (
                <div key={x.id} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: "var(--fp-bg)" }}>
                  <CatGlyph icon={c?.icon} color={c?.color} className="w-7 h-7 rounded-lg" iconClass="w-3.5 h-3.5" />
                  <span className="flex-1 text-[12px] font-black truncate">{x.note || x.title}</span>
                  <span className="text-[12px] font-black tabular shrink-0" style={{ color: x.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                    {x.type === "income" ? "+" : "−"}{faMoney(x.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CoinsMini() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M15.5 5.5a6 6 0 1 1-8 8" strokeLinecap="round" /><path d="M7 9h4M9 7v4" strokeLinecap="round" /></svg>; }
