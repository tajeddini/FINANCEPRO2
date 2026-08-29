/* ---------- صفحه‌های اصلی برنامه (بخش دوم — نسخهٔ کامل) ---------- */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight, BarChart3, Bell, Bot, CalendarDays, Check, Cloud, Clock3, Copy, Download, FileDown,
  KeyRound, Lock, Moon, Palette, PencilLine, Pin, PinOff, Plus, Printer, RefreshCw, Search, Shield,
  Sparkles, StickyNote, Sun, Target, Trash2, TrendingUp, Upload, Wallet, X,
} from "lucide-react";
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import {
  clearData, getTags, migrateLoadedState, sampleFill, useStore, DEFAULT_TAGS,
  type AppState, type ID, type Appointment, type Note, type TagDef,
} from "./lib/data";
import {
  addDaysISO, addJalaliMonths, faDate, faMoney, faNum, faTime, inRange, isoToJalali,
  jalaliDateStr, jalaliFirstOffset, jalaliMonthLen, jalaliMonthRange,
  copyText, fireNotification, jalaliShort, jalaliToISO, jalaliToday, localISODate,
  MONTHS_FA, PERIODS, periodRange, playChime, relTime, todayISO, useNow,
  WEEKDAYS_FA, WEEKDAYS_MIN, type PeriodKey,
} from "./lib/utils";
import { THEMES, applyAccent } from "./lib/themes";
import {
  encodeState, decodeState, pushToCloud, pullFromCloud, saveCloud, effectivePrefs,
  localOnlyTx, mergePulledState, sameLedgerContent, testConnection,
} from "./lib/cloud";
import { listUsers, type User } from "./lib/auth";
import {
  AmountInput, Bar, CatGlyph, CATEGORY_ICONS, CATEGORY_ICON_LABELS, Confirm, DeleteBtn, EditBtn,
  Empty, Field, JalaliPicker, MicButton, Modal, PeriodFilter, TInput, TSelect, useToast, usePeriod,
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
  const nav = (n: number) => setView(addJalaliMonths(view.jy, view.jm, n));

  const dayEvents = state.appointments.filter((a) => a.date === selDay).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = state.appointments
    .filter((a) => a.date >= todayISO() && !a.done)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + a.time))
    .slice(0, 5);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">قرارها و برنامه‌ها</h1>
          <p className="text-[12.5px] font-bold mt-1 flex items-center gap-2" style={{ color: "var(--fp-text3)" }}>
            <Clock3 className="w-4 h-4" style={{ color: "var(--fp-accent)" }} />
            <span className="tabular text-[15px]" style={{ color: "var(--fp-mint)" }} dir="ltr">{faTime(now)}</span>
            (۲۴ ساعته) · {jalaliDateStr()}
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus className="w-4 h-4" strokeWidth={3} /> قرار جدید
        </button>
      </div>

      {/* یادآور صوتی */}
      <div className="card p-4 flex flex-wrap items-center gap-3 rise-in" style={{ ["--d" as string]: "40ms" }}>
        <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
          style={{ background: state.prefs.notifyEnabled ? "color-mix(in srgb, var(--fp-mint) 14%, transparent)" : "var(--fp-bg3)", color: state.prefs.notifyEnabled ? "var(--fp-mint)" : "var(--fp-text3)" }}>
          <Bell className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-[180px]">
          <p className="text-[13px] font-black">یادآور صوتی قرارها</p>
          <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>
            {state.prefs.notifyEnabled
              ? "فعال — سرِ ساعت، زنگ می‌خورد و اعلان می‌آید (حتی اگر برنامه در پس‌زمینه باشد)"
              : "وقتی وقت قرار برسد، زنگ صوتی + اعلان سیستم می‌گیرید"}
          </p>
        </div>
        {state.prefs.notifyEnabled ? (
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => { playChime(1); void fireNotification("فایننس‌پرو", "یادآور صوتی کار می‌کند 🔔"); }}>تست زنگ</button>
            <button className="btn btn-danger btn-sm" onClick={() => { mutate((d) => { d.prefs.notifyEnabled = false; }, "یادآور صوتی غیرفعال شد"); toast("ok", "یادآور صوتی خاموش شد."); }}>غیرفعال</button>
          </div>
        ) : (
          <button className="btn btn-mint btn-sm" onClick={async () => {
            let granted = true;
            if ("Notification" in window && Notification.permission === "default") {
              granted = (await Notification.requestPermission()) === "granted";
            } else if ("Notification" in window && Notification.permission === "denied") {
              granted = false;
            }
            if (!granted) return toast("warn", "اجازهٔ اعلان داده نشد — از تنظیمات مرورگر اجازه بدهید.");
            mutate((d) => { d.prefs.notifyEnabled = true; }, "یادآور صوتی فعال شد");
            playChime(1);
            toast("ok", "یادآور صوتی فعال شد — سرِ ساعتِ قرارها زنگ می‌خورد.");
          }}>فعال‌سازی</button>
        )}
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
                  <span className="text-[12px] font-black tabular px-2 py-1 rounded-lg" style={{ background: "var(--fp-bg3)", color: "var(--fp-accent)" }} dir="ltr">{faNum(a.time)}</span>
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
                  <button className="icon-btn !w-8 !h-8" title="خروجی ICS"
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
                  <EditBtn onClick={() => { setEditing(a); setOpenForm(true); }} />
                  <DeleteBtn onClick={() => trashItem("appointments", a.id, a.title)} />
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

/* ---------- انتخابگر ساعت و دقیقه (جدولی + پیش‌تنظیم + ساعت زنده) ---------- */
function TimeWheel({ value, onChange, onPresetDate }: {
  value: string;
  onChange: (t: string) => void;
  onPresetDate?: (iso: string) => void;
}) {
  const hh = value.split(":")[0] ?? "18";
  const mm = value.split(":")[1] ?? "00";
  const now = useNow();
  const live = faTime(now);

  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  const p = (n: number) => String(n).padStart(2, "0");
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59).getTime();
  const presets = [
    { label: "الان", time: `${p(now.getHours())}:${p(now.getMinutes())}`, date: todayISO() },
    {
      label: "۳۰ دقیقه دیگر",
      time: (() => { const d = new Date(Date.now() + 30 * 60000); return `${p(d.getHours())}:${p(d.getMinutes())}`; })(),
      date: Date.now() + 30 * 60000 > endOfDay ? addDaysISO(todayISO(), 1) : todayISO(),
    },
    {
      label: "۱ ساعت دیگر",
      time: (() => { const d = new Date(Date.now() + 60 * 60000); return `${p(d.getHours())}:${p(d.getMinutes())}`; })(),
      date: Date.now() + 60 * 60000 > endOfDay ? addDaysISO(todayISO(), 1) : todayISO(),
    },
    { label: "فردا ۹ صبح", time: "09:00", date: addDaysISO(todayISO(), 1) },
  ];

  const cell = (it: string, sel: string, onSel: (v: string) => void, color: string) => {
    const on = it === sel;
    return (
      <button key={it} onClick={() => onSel(it)}
        className="rounded-lg py-1.5 text-[12.5px] font-black tabular transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95"
        style={{
          background: on ? color : "transparent",
          color: on ? "#071b16" : "var(--fp-text2)",
          border: on ? "none" : "1px solid var(--fp-border)",
          boxShadow: on ? `0 6px 14px -6px color-mix(in srgb, ${color} 75%, transparent)` : "none",
        }}>
        {faNum(it)}
      </button>
    );
  };

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11.5px] font-black flex items-center gap-1.5" style={{ color: "var(--fp-text3)" }}>
          <Clock3 className="w-4 h-4" style={{ color: "var(--fp-accent)" }} /> ساعت (۲۴ ساعته)
        </span>
        <span className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold tabular flex items-center gap-1" style={{ color: "var(--fp-text3)" }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: "var(--fp-mint)" }} /> الان: <bdi dir="ltr">{live}</bdi>
          </span>
          <span dir="ltr" className="font-display text-3xl leading-none tabular" style={{ color: "var(--fp-accent)" }}>
            {faNum(hh)}<span className="opacity-40">:</span>{faNum(mm)}
          </span>
        </span>
      </div>

      <p className="text-[10.5px] font-black mb-1.5" style={{ color: "var(--fp-text3)" }}>ساعت:</p>
      <div className="grid grid-cols-8 gap-1.5">
        {HOURS.map((h) => cell(h, hh, (v) => onChange(`${v}:${mm}`), "var(--fp-accent)"))}
      </div>

      <p className="text-[10.5px] font-black mb-1.5 mt-3" style={{ color: "var(--fp-text3)" }}>دقیقه:</p>
      <div className="grid grid-cols-6 gap-1.5">
        {MINS.map((m) => cell(m, mm, (v) => onChange(`${hh}:${v}`), "var(--fp-mint)"))}
      </div>

      <div className="flex gap-1.5 flex-wrap mt-3.5 pt-3 border-t" style={{ borderColor: "var(--fp-border)" }}>
        {presets.map((pr) => (
          <button key={pr.label} onClick={() => { onChange(pr.time); onPresetDate?.(pr.date); }}
            className="chip !py-1.5 !text-[11px]">
            {pr.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
            <MicButton onText={(t) => setTitle(t)} baseText={title} />
          </div>
        </Field>
        <Field label="تاریخ (شمسی)"><JalaliPicker value={date} onChange={setDate} /></Field>
        <TimeWheel value={time} onChange={setTime} onPresetDate={setDate} />
        <Field label="یادداشت"><TInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
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

/* ---------- پیش‌تنظیم‌های ارائه‌دهندهٔ هوش مصنوعی ---------- */
const AI_PROVIDERS = [
  { id: "gemini", label: "Google Gemini (رایگان — پیشنهادی)", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-2.0-flash" },
  { id: "openrouter", label: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", model: "openai/gpt-4o-mini" },
  { id: "openai", label: "OpenAI", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
];

/* ---------- گزارش هوشمند (برای تحلیل با هوش مصنوعی) ---------- */
function buildAiReport(s: AppState): string {
  const t = jalaliToday();
  const mr = jalaliMonthRange(t.jy, t.jm);
  const monthTxs = s.transactions.filter((x) => inRange(x.date, mr));
  const income = monthTxs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const expense = monthTxs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
  const balance = s.accounts.reduce((a, x) => a + x.balance, 0);
  const net = income - expense;
  const en = (n: number) => Math.round(n).toLocaleString("en-US");
  const L: string[] = [];
  const P = (x = "") => L.push(x);

  P("📊 گزارش هوشمند مالی — فایننس‌پرو");
  P(`تاریخ: ${t.jy}/${t.jm}/${t.jd} (هجری شمسی) | ${localISODate(new Date())} (میلادی)`);
  P("");
  P("این گزارش، داده‌های واقعی دفترکل مالی شخصی من است (همهٔ مبالغ به تومان). از تو به‌عنوان مشاور مالی می‌خواهم رفتار مالی‌ام را دقیق تحلیل کنی و راهکار عملی بدهی.");
  P("");

  P("## ۱. نمای کلی");
  P(`- موجودی کل حساب‌ها: ${en(balance)}`);
  P(`- درآمد این ماه: ${en(income)}`);
  P(`- هزینهٔ این ماه: ${en(expense)}`);
  P(`- تراز این ماه: ${en(net)} (${net >= 0 ? "مثبت" : "منفی"})`);
  P(`- نرخ پس‌انداز این ماه: ${income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0}٪`);
  P("");

  P("## ۲. روند ۶ ماه اخیر (درآمد | هزینه | خالص)");
  const monthly: { label: string; inc: number; exp: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = addJalaliMonths(t.jy, t.jm, -i);
    const r = jalaliMonthRange(m.jy, m.jm);
    const txs = s.transactions.filter((x) => inRange(x.date, r));
    const inc = txs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
    const exp = txs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
    monthly.push({ label: `${MONTHS_FA[m.jm - 1]} ${m.jy}`, inc, exp });
    P(`- ${MONTHS_FA[m.jm - 1]} ${m.jy}: ${en(inc)} | ${en(exp)} | ${en(inc - exp)}`);
  }
  P("");

  P("## ۳. تفکیک هزینه‌های این ماه بر اساس دسته");
  const byCat = new Map<string, { sum: number; count: number }>();
  for (const x of monthTxs.filter((x) => x.type === "expense")) {
    const c = s.categories.find((cc) => cc.id === x.categoryId);
    const key = c?.name ?? "نامشخص";
    const cur = byCat.get(key) ?? { sum: 0, count: 0 };
    cur.sum += x.amount; cur.count++;
    byCat.set(key, cur);
  }
  const cats = [...byCat.entries()].sort((a, b) => b[1].sum - a[1].sum);
  if (cats.length === 0) P("- هزینه‌ای ثبت نشده.");
  for (const [name, v] of cats.slice(0, 10)) {
    P(`- ${name}: ${en(v.sum)} (${v.count} تراکنش) — ${expense > 0 ? Math.round((v.sum / expense) * 100) : 0}٪ از کل هزینه`);
  }
  P("");

  P("## ۴. برچسب‌های رفتاری این ماه (روی هزینه‌ها)");
  let laterSum = 0, funSum = 0;
  for (const tag of getTags(s)) {
    const txs = monthTxs.filter((x) => x.type === "expense" && x.tag === tag.id);
    const sum = txs.reduce((a, x) => a + x.amount, 0);
    if (tag.id === "later") laterSum = sum;
    if (tag.id === "fun") funSum = sum;
    P(`- ${tag.label}: ${en(sum)} (${txs.length} تراکنش)${expense > 0 ? ` — ${Math.round((sum / expense) * 100)}٪ از کل هزینه` : ""}`);
  }
  P(`- 💡 پتانسیل پس‌انداز (تفریحی + «میشد بعدا هم خرید»): ${en(funSum + laterSum)}`);
  P("");

  P("## ۵. بودجه‌بندی ماهانه");
  if (s.budgets.length === 0) P("- بودجه‌ای تعریف نشده.");
  for (const b of s.budgets) {
    const cat = s.categories.find((c) => c.id === b.categoryId);
    const spent = byCat.get(cat?.name ?? "")?.sum ?? 0;
    const diff = b.limit - spent;
    P(`- ${cat?.name ?? "?"}: سقف ${en(b.limit)} | خرج‌شده ${en(spent)} | ${diff >= 0 ? `باقی‌مانده ${en(diff)}` : `مازاد ${en(-diff)}`}`);
  }
  P("");

  P("## ۶. بدهی‌ها و طلب‌ها");
  const debts = s.debts.filter((d) => d.kind === "debt");
  const credits = s.debts.filter((d) => d.kind === "credit");
  P(`- مجموع بدهی باقی‌مانده: ${en(debts.reduce((a, d) => a + (d.amount - d.paid), 0))}`);
  P(`- مجموع طلب باقی‌مانده: ${en(credits.reduce((a, d) => a + (d.amount - d.paid), 0))}`);
  for (const d of debts) P(`  - بدهی به ${d.person}: ${en(d.amount - d.paid)} باقی‌مانده${d.due ? ` (سررسید ${d.due})` : ""}`);
  for (const d of credits) P(`  - طلب از ${d.person}: ${en(d.amount - d.paid)} باقی‌مانده${d.due ? ` (سررسید ${d.due})` : ""}`);
  P("");

  P("## ۷. اقساط");
  if (s.installments.length === 0) P("- قسطی ثبت نشده.");
  for (const i of s.installments) {
    P(`- ${i.title}: ماهی ${en(i.amountPerMonth)} — قسط ${i.paidCount} از ${i.months} پرداخت شده`);
  }
  P("");

  P("## ۸. اهداف پس‌انداز");
  if (s.savings_goals.length === 0) P("- هدفی ثبت نشده.");
  for (const g of s.savings_goals) {
    P(`- ${g.title}: ${en(g.saved)} از ${en(g.target)} (${Math.round((g.saved / g.target) * 100)}٪)`);
  }
  P("");

  P("## ۹. هزینه‌های ثابت و اشتراک‌ها");
  const recSum = s.recurring.reduce((a, r) => a + (r.type === "expense" ? r.amount : 0), 0);
  P(`- مجموع تراکنش‌های دوره‌ای ماهانه: ${en(recSum)}`);
  for (const r of s.recurring) P(`  - ${r.title}: ${en(r.amount)} (روز ${r.dayOfMonth} هر ماه)`);
  for (const sub of s.subscriptions) P(`  - اشتراک ${sub.name}: ${en(sub.amount)} ${sub.cycle === "monthly" ? "ماهانه" : "سالانه"} (تمدید ${sub.renew})`);
  P("");

  P("## ۱۰. دارایی‌ها و ارز");
  if (s.assets.length === 0 && s.currencies.length === 0) P("- دارایی یا ارزی ثبت نشده.");
  for (const a of s.assets) {
    const pnl = (a.nowPrice - a.buyPrice) * a.qty;
    P(`- ${a.name}: ارزش امروز ${en(a.nowPrice * a.qty)} | سود/زیان ${en(pnl)}`);
  }
  for (const c of s.currencies) {
    P(`- ${c.name} (${c.symbol}): ${en(c.qty)} واحد × نرخ ${en(c.rate)} = ${en(c.qty * c.rate)}`);
  }
  P("");

  P("## ۱۱. بزرگ‌ترین هزینه‌های این ماه");
  const topExp = [...monthTxs.filter((x) => x.type === "expense")].sort((a, b) => b.amount - a.amount).slice(0, 5);
  if (topExp.length === 0) P("- هزینه‌ای ثبت نشده.");
  for (const x of topExp) {
    const c = s.categories.find((cc) => cc.id === x.categoryId);
    P(`- ${en(x.amount)} — ${c?.name ?? "?"}${x.note ? ` (${x.note})` : ""}`);
  }
  P("");

  P("## ۱۲. الگوهای رفتاری");
  const daysPassed = Math.max(1, t.jd);
  P(`- میانگین خرج روزانه این ماه: ${en(expense / daysPassed)} (در ${daysPassed} روز)`);
  const wd = new Array(7).fill(0);
  for (const x of monthTxs.filter((x) => x.type === "expense")) {
    const d = new Date(x.date + "T12:00:00");
    wd[(d.getDay() + 1) % 7] += x.amount;
  }
  const maxWd = wd.indexOf(Math.max(...wd));
  if (expense > 0) P(`- پرخرج‌ترین روز هفته: ${WEEKDAYS_FA[maxWd]}`);
  const incomes = monthTxs.filter((x) => x.type === "income");
  P(`- تعداد منابع درآمد این ماه: ${new Set(incomes.map((x) => x.categoryId)).size}`);
  P("");

  P("## ۱۳. امتیاز سلامت مالی و پیش‌بینی");
  try {
    const lastMonth = addJalaliMonths(t.jy, t.jm, -1);
    const lastRange = jalaliMonthRange(lastMonth.jy, lastMonth.jm);
    const lastTxs = s.transactions.filter((x) => inRange(x.date, lastRange));
    const h = computeHealthScore(s, monthTxs, lastTxs);
    P(`- امتیاز سلامت مالی: ${h.score} از 100`);
    for (const pp of h.parts) P(`  - ${pp.label}: ${pp.pct}٪`);
  } catch { /* دادهٔ کافی نیست */ }
  const last3 = monthly.slice(0, 3);
  const avgInc = last3.reduce((a, m) => a + m.inc, 0) / Math.max(1, last3.length);
  const avgExp = last3.reduce((a, m) => a + m.exp, 0) / Math.max(1, last3.length);
  P(`- پیش‌بینی ماه بعد (میانگین ۳ ماه اخیر): درآمد حدود ${en(avgInc)} | هزینه حدود ${en(avgExp)}`);
  const badges = computeBadges(s).filter((b) => b.earned);
  if (badges.length > 0) P(`- نشان‌های کسب‌شده: ${badges.map((b) => b.title).join("، ")}`);
  P("");

  P("## ۱۴. درخواست از هوش مصنوعی");
  P("لطفاً بر اساس داده‌های بالا:");
  P("۱) وضعیت کلی مالی‌ام را در ۳ جمله خلاصه کن.");
  P("۲) ۳ نقطهٔ قوت و ۳ نقطهٔ ضعف رفتار مالی‌ام را مشخص کن.");
  P("۳) ۵ راهکار عملی و مشخص برای ماه بعد بده (با عدد و رقم پیشنهادی بر اساس داده‌های خودم).");
  P("۴) یک بودجه‌بندی پیشنهادی برای دسته‌های اصلی‌ام بنویس.");
  P("۵) یک برنامهٔ پس‌انداز ۳ ماهه با هدف مشخص طراحی کن.");
  P("پاسخ را به فارسی، ساده و قابل‌اقدام بده.");

  return L.join("\n");
}

/* ---------- نمودار روند ۶ ماهه + پیش‌بینی (از دادهٔ Forecast) ---------- */
function TrendChart({ s }: { s: AppState }) {
  const { months, forecast } = Forecast({ s });
  return (
    <div>
      <div style={{ width: "100%", height: 210 }} dir="ltr">
        <ResponsiveContainer>
          <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--fp-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--fp-text2)" }} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "var(--fp-text3)" }} tickFormatter={(v) => `${Math.round(Number(v) / 1000000)}م`} width={40} />
            <RTooltip formatter={(v) => faMoney(Number(v))} contentStyle={{ background: "var(--fp-bg2)", border: "1px solid var(--fp-border)", borderRadius: 10, fontFamily: "Vazirmatn", direction: "rtl" }} />
            <RBar dataKey="income" name="درآمد" fill="var(--fp-mint)" radius={[5, 5, 0, 0]} />
            <RBar dataKey="expense" name="هزینه" fill="var(--fp-coral)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11.5px] font-bold mt-3 leading-6" style={{ color: "var(--fp-text2)" }}>
        <Sparkles className="w-3.5 h-3.5 inline me-1" style={{ color: "var(--fp-accent)" }} />
        پیش‌بینی ماه بعد: درآمد ~{faMoney(forecast.income)} · هزینه ~{faMoney(forecast.expense)} تومان
      </p>
    </div>
  );
}

/* ================= ۶) گزارش‌ها ================= */
export function ReportsPage() {
  const { state, mutate } = useStore();
  const toast = useToast();
  const t = jalaliToday();
  const pf = usePeriod("thisMonth");
  const periodLabel = pf.label;
  const range = pf.range;
  const monthTxs = state.transactions.filter((x) => inRange(x.date, range));

  const [aiOpen, setAiOpen] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [showCfg, setShowCfg] = useState(false);
  const [cfgUrl, setCfgUrl] = useState(state.prefs.aiApiUrl ?? AI_PROVIDERS[0].url);
  const [cfgKey, setCfgKey] = useState(state.prefs.aiApiKey ?? "");
  const [cfgModel, setCfgModel] = useState(state.prefs.aiModel ?? AI_PROVIDERS[0].model);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");

  const income = monthTxs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const expense = monthTxs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);

  /* مقایسهٔ ماهانه: این ماه در برابر ماه قبل، به تفکیک دسته */
  const cmpData = useMemo(() => {
    const cur = jalaliMonthRange(t.jy, t.jm);
    const last = addJalaliMonths(t.jy, t.jm, -1);
    const lastR = jalaliMonthRange(last.jy, last.jm);
    const map = new Map<string, { name: string; cur: number; prev: number }>();
    for (const x of state.transactions) {
      if (x.type !== "expense") continue;
      const name = state.categories.find((c) => c.id === x.categoryId)?.name ?? "نامشخص";
      const e = map.get(name) ?? { name, cur: 0, prev: 0 };
      if (inRange(x.date, cur)) e.cur += x.amount;
      else if (inRange(x.date, lastR)) e.prev += x.amount;
      map.set(name, e);
    }
    return [...map.values()]
      .filter((e) => e.cur + e.prev > 0)
      .sort((a, b) => b.cur + b.prev - (a.cur + a.prev))
      .slice(0, 7);
  }, [state.transactions, state.categories, t.jy, t.jm]);

  const lastMonth = addJalaliMonths(t.jy, t.jm, -1);
  const lastRange = jalaliMonthRange(lastMonth.jy, lastMonth.jm);
  const lastTxs = state.transactions.filter((x) => inRange(x.date, lastRange));
  const health = useMemo(() => computeHealthScore(state, monthTxs, lastTxs), [state, monthTxs, lastTxs]);
  const badges = useMemo(() => computeBadges(state), [state]);

  const saveCfg = () => {
    mutate((d) => { d.prefs.aiApiUrl = cfgUrl.trim(); d.prefs.aiApiKey = cfgKey.trim(); d.prefs.aiModel = cfgModel.trim(); }, "تنظیمات هوش مصنوعی ذخیره شد");
    toast("ok", "تنظیمات هوش مصنوعی ذخیره شد.");
    setShowCfg(false);
  };

  const analyzeWithAI = async () => {
    const url = (state.prefs.aiApiUrl ?? cfgUrl).trim();
    const key = (state.prefs.aiApiKey ?? cfgKey).trim();
    const model = (state.prefs.aiModel ?? cfgModel).trim() || AI_PROVIDERS[0].model;
    if (!url || !key) { setShowCfg(true); return toast("warn", "ابتدا آدرس API و کلید را وارد و ذخیره کن."); }
    setAiBusy(true); setAiAnswer("");
    const SYSTEM = "تو یک مشاور مالی شخصی برای کاربران فارسی‌زبان هستی. پاسخ‌هایت را به فارسی، ساده، عملی و با عدد و رقم بده.";
    /* تشخیص خودکار پروتکل: آدرس‌های گوگل (کلیدهای AQ. و AIza) فرمت بومی می‌خواهند */
    const isGoogle = url.includes("generativelanguage.googleapis.com");
    try {
      let res: Response;
      if (isGoogle) {
        const m = url.match(/^(https?:\/\/[^/]+\/v1(?:beta|alpha)?)/i);
        const base = m ? m[1] : "https://generativelanguage.googleapis.com/v1beta";
        res = await fetch(`${base}/models/${model}:streamGenerateContent?alt=sse`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: "user", parts: [{ text: aiReport }] }],
          }),
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, stream: true, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: aiReport }] }),
        });
      }
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${msg ? " — " + msg.slice(0, 140) : ""}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const tt = line.trim();
          if (!tt.startsWith("data:")) continue;
          const data = tt.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const delta =
              j.choices?.[0]?.delta?.content ??
              j.choices?.[0]?.message?.content ??
              (Array.isArray(j.candidates?.[0]?.content?.parts)
                ? j.candidates[0].content.parts.map((pp: { text?: string }) => pp.text ?? "").join("")
                : undefined) ?? "";
            if (delta) { acc += delta; setAiAnswer(acc); }
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }
      if (!acc) throw new Error("پاسخ خالی — کلید یا مدل را بررسی کن");
    } catch (e) {
      toast("err", `تحلیل ناموفق بود — آدرس، کلید و مدل را بررسی کن. (${(e as Error).message ?? "خطای شبکه"})`);
    } finally {
      setAiBusy(false);
    }
  };

  const exportAiPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return toast("err", "مرورگر اجازهٔ بازکردن پنجره نداد.");
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>گزارش هوشمند فایننس‌پرو</title>
      <link href="https://fonts.googleapis.com/css2?family=Lalezar&family=Vazirmatn:wght@400;700;900&display=swap" rel="stylesheet">
      <style>body{font-family:Vazirmatn,sans-serif;padding:32px;color:#122b22;line-height:1.9;font-size:13px}
      h1{font-family:Lalezar;color:#0d2c24}pre{white-space:pre-wrap;font-family:Vazirmatn;background:#f2f6f1;padding:16px;border-radius:12px}
      .ai{background:#eafaf2;border:1px solid #2fb98a;padding:16px;border-radius:12px;margin-top:16px}</style></head><body>
      <h1>📊 گزارش هوشمند فایننس‌پرو — ${jalaliDateStr()}</h1>
      <pre>${aiReport.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c))}</pre>
      ${aiAnswer ? `<div class="ai"><b>🤖 تحلیل هوش مصنوعی:</b><pre style="background:transparent;padding:8px 0">${aiAnswer.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c))}</pre></div>` : ""}
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in no-print">
        <h1 className="font-display text-3xl md:text-4xl">گزارش‌ها و تحلیل</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-mint btn-sm" onClick={() => { setAiReport(buildAiReport(state)); setAiAnswer(""); setAiOpen(true); }}>
            <Sparkles className="w-4 h-4" /> گزارش هوشمند
          </button>
          <button className="btn btn-gold btn-sm" onClick={() => { exportExcel(state, { txs: monthTxs, periodLabel }).then(() => toast("ok", `اکسل حرفه‌ای بازهٔ «${periodLabel}» دانلود شد.`)); }}>
            <Download className="w-4 h-4" /> خروجی اکسل
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { exportCSV(state); toast("ok", "فایل CSV دانلود شد."); }}><FileDown className="w-4 h-4" /> CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer className="w-4 h-4" /> چاپ / PDF</button>
        </div>
      </div>

      {/* فیلتر زمانی — ۹ بازهٔ آماده + بازهٔ دلخواه */}
      <div className="no-print">
        <PeriodFilter pf={pf} count={<>{faNum(monthTxs.length)} تراکنش در این بازه</>} className="!mt-0" />
      </div>

      {/* خلاصهٔ بازه */}
      <div className="grid sm:grid-cols-3 gap-4 rise-in" style={{ ["--d" as string]: "40ms" }}>
        <div className="card p-5">
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>درآمد بازه</p>
          <p className="font-display text-2xl tabular mt-1.5" style={{ color: "var(--fp-mint)" }}>{faMoney(income)}</p>
        </div>
        <div className="card p-5">
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>هزینهٔ بازه</p>
          <p className="font-display text-2xl tabular mt-1.5" style={{ color: "var(--fp-coral)" }}>{faMoney(expense)}</p>
        </div>
        <div className="card p-5">
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>تراز بازه</p>
          <p className="font-display text-2xl tabular mt-1.5" style={{ color: income - expense >= 0 ? "var(--fp-accent)" : "var(--fp-coral)" }}>{income - expense >= 0 ? "+" : "−"}{faMoney(income - expense)}</p>
        </div>
      </div>

      {/* مقایسهٔ ماهانه */}
      <div className="card p-5 rise-in no-print" style={{ ["--d" as string]: "60ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} />
          مقایسهٔ ماهانه — {MONTHS_FA[t.jm - 1]} در برابر {MONTHS_FA[lastMonth.jm - 1]}
        </h3>
        {cmpData.length === 0 ? (
          <p className="text-[12px] font-bold py-6 text-center" style={{ color: "var(--fp-text3)" }}>داده‌ای برای مقایسه نیست.</p>
        ) : (
          <>
            <div style={{ width: "100%", height: 260 }} dir="ltr">
              <ResponsiveContainer>
                <BarChart data={cmpData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--fp-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--fp-text2)" }} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--fp-text3)" }} tickFormatter={(v) => `${Math.round(Number(v) / 1000000)}م`} width={40} />
                  <RTooltip formatter={(v) => faMoney(Number(v))} contentStyle={{ background: "var(--fp-bg2)", border: "1px solid var(--fp-border)", borderRadius: 10, fontFamily: "Vazirmatn", direction: "rtl" }} />
                  <Legend wrapperStyle={{ fontFamily: "Vazirmatn", fontSize: 12 }} />
                  <RBar dataKey="prev" name="ماه قبل" fill="var(--fp-border2)" radius={[6, 6, 0, 0]} />
                  <RBar dataKey="cur" name="این ماه" fill="var(--fp-accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {cmpData.map((c) => {
                const delta = c.prev > 0 ? Math.round(((c.cur - c.prev) / c.prev) * 100) : null;
                return (
                  <span key={c.name} className="chip !cursor-default !text-[10.5px]">
                    {c.name}: {delta === null ? "جدید" : `${delta >= 0 ? "▲" : "▼"} ٪${faNum(Math.abs(delta))}`}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5 rise-in no-print" style={{ ["--d" as string]: "80ms" }}>
          <h3 className="text-[14px] font-black mb-3 flex items-center gap-2"><TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> روند و پیش‌بینی</h3>
          <TrendChart s={state} />
        </div>
        <div className="card p-5 rise-in no-print" style={{ ["--d" as string]: "100ms" }}>
          <h3 className="text-[14px] font-black mb-3 flex items-center gap-2"><Target className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> امتیاز سلامت مالی</h3>
          <div className="flex items-center gap-5">
            <ScoreRing score={health.score} />
            <div className="grid gap-2 flex-1">
              {health.parts.map((pp) => (
                <div key={pp.label}>
                  <div className="flex justify-between text-[11px] font-black mb-1">
                    <span style={{ color: "var(--fp-text2)" }}>{pp.label}</span>
                    <span className="tabular" style={{ color: "var(--fp-accent)" }}>٪{faNum(pp.pct)}</span>
                  </div>
                  <Bar pct={pp.pct} color={pp.pct >= 60 ? "var(--fp-mint)" : pp.pct >= 30 ? "var(--fp-accent)" : "var(--fp-coral)"} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 rise-in no-print" style={{ ["--d" as string]: "120ms" }}>
        <h3 className="text-[14px] font-black mb-3 flex items-center gap-2"><Sparkles className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> نشان‌ها</h3>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b.title} className="chip !cursor-default"
              style={b.earned ? { color: "var(--fp-accent)", borderColor: "var(--fp-accent)" } : { opacity: 0.4 }}>
              {b.earned ? "🏅" : "🔒"} {b.title}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-5 rise-in no-print" style={{ ["--d" as string]: "140ms" }}>
        <h3 className="text-[14px] font-black mb-3 flex items-center gap-2"><CalendarDays className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> نقشهٔ حرارتی خرج — ۱۴ هفته</h3>
        <Heatmap txs={state.transactions} />
      </div>

      {/* سربرگ چاپ */}
      <div className="hidden print:block">
        <h1 style={{ fontFamily: "Lalezar", fontSize: 26 }}>گزارش فایننس‌پرو — {periodLabel}</h1>
        <p style={{ fontFamily: "Vazirmatn", fontSize: 12, color: "#555" }}>{jalaliDateStr()} · درآمد: {faMoney(income)} · هزینه: {faMoney(expense)}</p>
      </div>

      {/* مودال گزارش هوشمند */}
      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="گزارش هوشمند برای هوش مصنوعی" wide>
        <div className="rounded-xl p-4 mb-3 flex items-start gap-2.5 text-[12px] font-bold leading-6"
          style={{ background: "color-mix(in srgb, var(--fp-accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--fp-accent) 30%, transparent)", color: "var(--fp-text2)" }}>
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--fp-accent)" }} />
          <span>این گزارش همهٔ داده‌های مالی‌ات را به‌صورت متنی و ساختاریافته جمع کرده. آن را کپی کن و به ChatGPT، Claude یا Gemini بده — یا همین‌جا با دکمهٔ «تحلیل با هوش مصنوعی» پاسخ زنده بگیر.</span>
        </div>
        <pre dir="rtl"
          className="text-[12px] leading-7 font-bold whitespace-pre-wrap rounded-xl border p-4 max-h-[38vh] overflow-y-auto"
          style={{ background: "var(--fp-bg)", borderColor: "var(--fp-border)", color: "var(--fp-text2)" }}>
          {aiReport}
        </pre>

        {/* تنظیمات هوش مصنوعی */}
        <div className="mt-3 rounded-xl border p-4" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[12.5px] font-black flex items-center gap-1.5"><Bot className="w-4 h-4" style={{ color: "var(--fp-sky)" }} /> تحلیل مستقیم با هوش مصنوعی</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCfg((v) => !v)}>{showCfg ? "بستن تنظیمات" : "تنظیمات API"}</button>
          </div>
          {showCfg && (
            <div className="grid gap-3 mt-3">
              <Field label="ارائه‌دهنده">
                <TSelect value={AI_PROVIDERS.some((pp) => pp.url === cfgUrl) ? AI_PROVIDERS.find((pp) => pp.url === cfgUrl)!.id : "custom"}
                  onChange={(e) => {
                    const prov = AI_PROVIDERS.find((pp) => pp.id === e.target.value);
                    if (prov) { setCfgUrl(prov.url); setCfgModel(prov.model); }
                  }}>
                  {AI_PROVIDERS.map((pp) => <option key={pp.id} value={pp.id}>{pp.label}</option>)}
                  <option value="custom">سفارشی…</option>
                </TSelect>
              </Field>
              <Field label="آدرس API (Gemini / OpenRouter / OpenAI)"><TInput dir="ltr" value={cfgUrl} onChange={(e) => setCfgUrl(e.target.value)} placeholder="https://…" /></Field>
              <Field label="کلید API"><TInput dir="ltr" type="password" value={cfgKey} onChange={(e) => setCfgKey(e.target.value)} placeholder="AIza… یا AQ.… یا sk-…" /></Field>
              <Field label="مدل"><TInput dir="ltr" value={cfgModel} onChange={(e) => setCfgModel(e.target.value)} placeholder="gemini-2.0-flash" /></Field>
              <div className="flex justify-end">
                <button className="btn btn-mint btn-sm" onClick={saveCfg}>ذخیرهٔ تنظیمات</button>
              </div>
              <p className="text-[10.5px] font-bold leading-5" style={{ color: "var(--fp-text3)" }}>
                کلید فقط در مرورگر خودت ذخیره می‌شود و هرگز به ابر فرستاده نمی‌شود. کلید رایگان Gemini را از aistudio.google.com بگیر.
              </p>
            </div>
          )}
          {aiAnswer && (
            <div className="mt-3 rounded-xl border p-4 max-h-[30vh] overflow-y-auto"
              style={{ borderColor: "color-mix(in srgb, var(--fp-mint) 40%, transparent)", background: "color-mix(in srgb, var(--fp-mint) 6%, transparent)" }}>
              <p className="text-[11px] font-black mb-2 flex items-center gap-1.5" style={{ color: "var(--fp-mint)" }}><Bot className="w-4 h-4" /> پاسخ هوش مصنوعی{aiBusy && " (در حال نوشتن…)"}</p>
              <p className="text-[12.5px] font-bold leading-7 whitespace-pre-wrap" style={{ color: "var(--fp-text2)" }}>{aiAnswer}{aiBusy && <span className="caret-blink">▌</span>}</p>
            </div>
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button className="btn btn-mint btn-sm" disabled={aiBusy} onClick={analyzeWithAI}>
              <Sparkles className="w-4 h-4" /> {aiBusy ? "در حال تحلیل…" : "تحلیل با هوش مصنوعی"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
          <span className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{faNum(aiReport.length)} کاراکتر · آمادهٔ ارسال</span>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-ghost btn-sm" onClick={exportAiPdf} title="خروجی PDF گزارش + تحلیل"><Printer className="w-4 h-4" /> خروجی PDF</button>
            <button className="btn btn-gold btn-sm" onClick={async () => {
              const ok = await copyText(aiReport);
              toast(ok ? "ok" : "err", ok ? "گزارش کپی شد — حالا به هوش مصنوعی بده." : "کپی ناموفق بود؛ متن را دستی انتخاب و کپی کن.");
            }}>
              <Copy className="w-4 h-4" /> کپی گزارش
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ================= ۷) مدیریت ================= */
type FieldType = "text" | "amount" | "date" | "number" | "select" | "icon" | "color";
interface FieldDef { key: string; label: string; type: FieldType; options?: { v: string; l: string }[]; }
interface ToolDef { id: string; label: string; table: keyof AppState; fields: FieldDef[]; name: (row: Record<string, unknown>) => string; }

export function ManagePage() {
  const { state, mutate, trashItem } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState("accounts");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [delAccount, setDelAccount] = useState<{ id: ID; name: string; txCount: number } | null>(null);

  const accOpts = state.accounts.map((a) => ({ v: a.id, l: a.name }));
  const catOpts = state.categories.map((c) => ({ v: c.id, l: c.name }));
  const expCatOpts = state.categories.filter((c) => c.type === "expense").map((c) => ({ v: c.id, l: c.name }));

  const TOOLS: ToolDef[] = [
    {
      id: "accounts", label: "حساب‌ها", table: "accounts",
      fields: [
        { key: "name", label: "نام حساب", type: "text" },
        { key: "type", label: "نوع", type: "text" },
        { key: "initial", label: "موجودی اولیه", type: "amount" },
        { key: "color", label: "رنگ", type: "color" },
      ],
      name: (r) => String(r.name ?? ""),
    },
    {
      id: "categories", label: "دسته‌ها", table: "categories",
      fields: [
        { key: "name", label: "نام دسته", type: "text" },
        { key: "type", label: "نوع", type: "select", options: [{ v: "expense", l: "هزینه" }, { v: "income", l: "درآمد" }] },
        { key: "color", label: "رنگ", type: "color" },
        { key: "icon", label: "آیکون دسته", type: "icon" },
      ],
      name: (r) => String(r.name ?? ""),
    },
    {
      id: "transfers", label: "انتقال‌ها", table: "transfers",
      fields: [
        { key: "date", label: "تاریخ", type: "date" },
        { key: "from", label: "از حساب", type: "select", options: accOpts },
        { key: "to", label: "به حساب", type: "select", options: accOpts },
        { key: "amount", label: "مبلغ", type: "amount" },
        { key: "note", label: "یادداشت", type: "text" },
      ],
      name: (r) => `${state.accounts.find((a) => a.id === r.from)?.name ?? "?"} ← ${state.accounts.find((a) => a.id === r.to)?.name ?? "?"}`,
    },
    {
      id: "recurring", label: "دوره‌ای‌ها", table: "recurring",
      fields: [
        { key: "title", label: "عنوان", type: "text" },
        { key: "type", label: "نوع", type: "select", options: [{ v: "expense", l: "هزینه" }, { v: "income", l: "درآمد" }] },
        { key: "amount", label: "مبلغ", type: "amount" },
        { key: "categoryId", label: "دسته", type: "select", options: catOpts },
        { key: "accountId", label: "حساب", type: "select", options: accOpts },
        { key: "dayOfMonth", label: "روز ماه (۱-۳۱ — آخر ماه در ماه‌های کوتاه)", type: "number" },
      ],
      name: (r) => String(r.title ?? ""),
    },
    {
      id: "goals", label: "اهداف", table: "savings_goals",
      fields: [
        { key: "title", label: "عنوان هدف", type: "text" },
        { key: "target", label: "هدف", type: "amount" },
        { key: "saved", label: "پس‌اندازشده", type: "amount" },
        { key: "deadline", label: "مهلت", type: "date" },
      ],
      name: (r) => String(r.title ?? ""),
    },
    {
      id: "budgets", label: "بودجه‌ها", table: "budgets",
      fields: [
        { key: "categoryId", label: "دسته", type: "select", options: expCatOpts },
        { key: "limit", label: "سقف ماهانه", type: "amount" },
      ],
      name: (r) => state.categories.find((c) => c.id === r.categoryId)?.name ?? "?",
    },
    {
      id: "paymethods", label: "روش‌های پرداخت", table: "payment_methods",
      fields: [{ key: "name", label: "نام روش", type: "text" }],
      name: (r) => String(r.name ?? ""),
    },
    {
      id: "cheques", label: "چک‌ها", table: "cheques",
      fields: [
        { key: "kind", label: "نوع", type: "select", options: [{ v: "out", l: "پرداختی" }, { v: "in", l: "دریافتی" }] },
        { key: "bank", label: "بانک", type: "text" },
        { key: "amount", label: "مبلغ", type: "amount" },
        { key: "date", label: "تاریخ سررسید", type: "date" },
        { key: "person", label: "در وجه / از", type: "text" },
        { key: "status", label: "وضعیت", type: "select", options: [{ v: "pending", l: "در انتظار" }, { v: "cashed", l: "نقدشده" }, { v: "bounced", l: "برگشتی" }] },
      ],
      name: (r) => `${String(r.bank ?? "")} — ${String(r.person ?? "")}`,
    },
    {
      id: "subscriptions", label: "اشتراک‌ها", table: "subscriptions",
      fields: [
        { key: "name", label: "نام اشتراک", type: "text" },
        { key: "amount", label: "مبلغ", type: "amount" },
        { key: "cycle", label: "دوره", type: "select", options: [{ v: "monthly", l: "ماهانه" }, { v: "yearly", l: "سالانه" }] },
        { key: "renew", label: "تمدید", type: "date" },
      ],
      name: (r) => String(r.name ?? ""),
    },
    {
      id: "assets", label: "دارایی‌ها", table: "assets",
      fields: [
        { key: "name", label: "نام دارایی", type: "text" },
        { key: "buyPrice", label: "قیمت خرید", type: "amount" },
        { key: "nowPrice", label: "قیمت امروز", type: "amount" },
        { key: "qty", label: "تعداد", type: "number" },
      ],
      name: (r) => String(r.name ?? ""),
    },
    {
      id: "challenges", label: "چالش‌ها", table: "challenges",
      fields: [
        { key: "title", label: "عنوان چالش", type: "text" },
        { key: "target", label: "هدف", type: "amount" },
        { key: "saved", label: "پس‌اندازشده", type: "amount" },
        { key: "perDay", label: "روزانه", type: "amount" },
      ],
      name: (r) => String(r.title ?? ""),
    },
    {
      id: "currencies", label: "ارزها", table: "currencies",
      fields: [
        { key: "name", label: "نام ارز", type: "text" },
        { key: "symbol", label: "نماد", type: "text" },
        { key: "rate", label: "نرخ (تومان)", type: "amount" },
        { key: "qty", label: "مقدار", type: "number" },
      ],
      name: (r) => String(r.name ?? ""),
    },
  ];

  const TABS = [
    ...TOOLS.map((tl) => ({ id: tl.id, label: tl.label })),
    { id: "tags", label: "برچسب‌ها" },
  ];

  const activeTool = TOOLS.find((tl) => tl.id === tab);

  const startNew = () => {
    setEditing(null);
    const init: Record<string, string> = {};
    if (activeTool) for (const f of activeTool.fields) init[f.key] = f.type === "select" ? (f.options?.[0]?.v ?? "") : f.type === "number" ? "1" : "";
    if (activeTool?.id === "categories") { init.icon = "wallet"; init.type = "expense"; init.color = "#57d9a3"; }
    if (activeTool?.id === "accounts") init.color = "#57d9a3";
    setForm(init);
    setOpenForm(true);
  };

  const startEdit = (row: Record<string, unknown>) => {
    setEditing(row);
    const init: Record<string, string> = {};
    if (activeTool) for (const f of activeTool.fields) init[f.key] = row[f.key] != null ? String(row[f.key]) : "";
    setForm(init);
    setOpenForm(true);
  };

  const save = () => {
    if (!activeTool) return;
    const firstText = activeTool.fields.find((f) => f.type === "text");
    if (firstText && !form[firstText.key]?.trim()) return toast("warn", "عنوان را کامل کنید.");
    const numericKeys = new Set(activeTool.fields.filter((f) => f.type === "amount" || f.type === "number").map((f) => f.key));
    const payload: Record<string, unknown> = { ...form };
    for (const k of numericKeys) payload[k] = Number(form[k]) || 0;
    if (activeTool.id === "accounts" && !editing) payload.balance = payload.initial;

    if (editing) {
      mutate((d) => {
        const arr = d[activeTool.table] as Record<string, unknown>[];
        const row = arr.find((r) => r.id === editing.id);
        if (row) Object.assign(row, payload);
      }, `${activeTool.label} ویرایش شد`);
      toast("ok", "ویرایش ذخیره شد.");
    } else {
      mutate((d) => {
        (d[activeTool.table] as Record<string, unknown>[]).push({ id: Math.random().toString(36).slice(2, 10), ...payload });
      }, `${activeTool.label} جدید ثبت شد`);
      toast("ok", "ثبت شد.");
    }
    setOpenForm(false);
  };

  /* ---------- تب برچسب‌ها ---------- */
  const [tagForm, setTagForm] = useState({ label: "", desc: "", color: "#e8b04b" });
  const [tagEdit, setTagEdit] = useState<TagDef | null>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const tags = getTags(state);
  const tagCount = (id: ID) => state.transactions.filter((x) => x.tag === id).length;

  const saveTag = () => {
    if (!tagForm.label.trim()) return toast("warn", "نام برچسب را بنویسید.");
    if (tagEdit) {
      mutate((d) => {
        const x = (d.tags ?? []).find((y) => y.id === tagEdit.id);
        if (x) Object.assign(x, { label: tagForm.label.trim(), desc: tagForm.desc.trim() || undefined, color: tagForm.color });
      }, `برچسب «${tagForm.label.trim()}» ویرایش شد`);
      toast("ok", "برچسب ویرایش شد.");
    } else {
      mutate((d) => {
        if (!Array.isArray(d.tags)) d.tags = [];
        d.tags.push({ id: Math.random().toString(36).slice(2, 10), label: tagForm.label.trim(), desc: tagForm.desc.trim() || undefined, color: tagForm.color });
      }, `برچسب «${tagForm.label.trim()}» ساخته شد`);
      toast("ok", "برچسب جدید ساخته شد.");
    }
    setTagOpen(false);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl">مدیریت</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(true)}><Trash2 className="w-4 h-4" /> پاک‌سازی داده‌ها</button>
          <button className="btn btn-mint btn-sm" onClick={() => { mutate((d) => sampleFill(d), "دادهٔ نمونه وارد شد"); toast("ok", "دادهٔ نمونه وارد شد."); }}><Download className="w-4 h-4" /> ورود دادهٔ نمونه</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rise-in" style={{ ["--d" as string]: "40ms" }}>
        {TABS.map((tb) => (
          <button key={tb.id} className={`chip ${tab === tb.id ? "chip-on" : ""}`} onClick={() => setTab(tb.id)}>{tb.label}</button>
        ))}
      </div>

      {/* تب برچسب‌ها */}
      {tab === "tags" && (
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "60ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-black">برچسب‌های تراکنش</h3>
            <button className="btn btn-gold btn-sm" onClick={() => { setTagEdit(null); setTagForm({ label: "", desc: "", color: "#e8b04b" }); setTagOpen(true); }}>
              <Plus className="w-4 h-4" strokeWidth={3} /> برچسب جدید
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {tags.map((tg) => (
              <div key={tg.id} className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: tg.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black truncate">{tg.label} {tg.builtin && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ms-1" style={{ background: "var(--fp-bg3)", color: "var(--fp-text3)" }}>پیش‌فرض</span>}</p>
                  {tg.desc && <p className="text-[10.5px] font-bold truncate" style={{ color: "var(--fp-text3)" }}>{tg.desc}</p>}
                </div>
                <span className="text-[10.5px] font-black tabular shrink-0" style={{ color: "var(--fp-text3)" }}>{faNum(tagCount(tg.id))} تراکنش</span>
                <EditBtn onClick={() => { setTagEdit(tg); setTagForm({ label: tg.label, desc: tg.desc ?? "", color: tg.color }); setTagOpen(true); }} />
                <DeleteBtn onClick={() => trashItem("tags", tg.id, tg.label)} />
              </div>
            ))}
          </div>
          <p className="text-[10.5px] font-bold mt-3" style={{ color: "var(--fp-text3)" }}>
            برچسب‌ها در فرم ثبت تراکنش، فیلتر تراکنش‌ها، تحلیل داشبورد و گزارش هوشمند استفاده می‌شوند.
          </p>
        </div>
      )}

      {/* تب‌های عمومی */}
      {activeTool && (
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "60ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-black">{activeTool.label}</h3>
            <button className="btn btn-gold btn-sm" onClick={startNew}><Plus className="w-4 h-4" strokeWidth={3} /> جدید</button>
          </div>
          {(() => {
            const rows = (state[activeTool.table] as Record<string, unknown>[]);
            if (rows.length === 0) return <Empty text="موردی ثبت نشده — اولین را بسازید." />;
            return (
              <div className="grid sm:grid-cols-2 gap-2">
                {rows.map((r) => {
                  const acc = activeTool.id === "accounts" ? (r as unknown as { balance?: number }) : null;
                  const budget = activeTool.id === "budgets" ? (r as unknown as { categoryId: ID; limit: number }) : null;
                  let budgetPct: number | null = null;
                  if (budget) {
                    const mr = jalaliMonthRange(jalaliToday().jy, jalaliToday().jm);
                    const spent = state.transactions.filter((x) => x.categoryId === budget.categoryId && x.type === "expense" && inRange(x.date, mr)).reduce((a, x) => a + x.amount, 0);
                    budgetPct = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : null;
                  }
                  return (
                    <div key={String(r.id)} className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
                      style={{ borderColor: budget && budgetPct !== null && budgetPct >= 80 ? "color-mix(in srgb, var(--fp-coral) 50%, transparent)" : "var(--fp-border)", background: "var(--fp-bg)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black truncate">{activeTool.name(r)}</p>
                        {acc && <p className="text-[10.5px] font-bold tabular" style={{ color: "var(--fp-text3)" }}>موجودی: {faMoney(acc.balance ?? 0)} تومان</p>}
                        {budget && budgetPct !== null && (
                          <p className="text-[10.5px] font-bold tabular" style={{ color: budgetPct > 100 ? "var(--fp-coral)" : budgetPct >= 80 ? "var(--fp-accent)" : "var(--fp-mint)" }}>
                            ٪{faNum(budgetPct)} مصرف شده {budgetPct > 100 ? "— مازاد بر سقف" : budgetPct >= 80 ? "— نزدیک سقف" : ""}
                          </p>
                        )}
                      </div>
                      {activeTool.id === "categories" && <CatGlyph icon={String(r.icon ?? "")} color={String(r.color ?? "")} className="w-8 h-8 rounded-lg" iconClass="w-4 h-4" />}
                      <EditBtn onClick={() => startEdit(r)} />
                      {activeTool.id === "accounts" ? (
                        <DeleteBtn onClick={() => {
                          const cnt = state.transactions.filter((x) => x.accountId === r.id).length;
                          setDelAccount({ id: String(r.id), name: String(r.name ?? ""), txCount: cnt });
                        }} />
                      ) : (
                        <DeleteBtn onClick={() => trashItem(activeTool.table as Parameters<typeof trashItem>[0], String(r.id), activeTool.name(r))} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* فرم عمومی */}
      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editing ? "ویرایش" : "ثبت جدید"}>
        <div className="grid gap-3.5">
          {activeTool?.fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === "text" && <TInput value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
              {f.type === "amount" && <AmountInput value={form[f.key] ?? ""} onChange={(v) => setForm({ ...form, [f.key]: v })} />}
              {f.type === "number" && <TInput dir="ltr" type="number" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
              {f.type === "date" && <JalaliPicker value={form[f.key] ?? todayISO()} onChange={(v) => setForm({ ...form, [f.key]: v })} />}
              {f.type === "color" && <TInput dir="ltr" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder="#57d9a3" />}
              {f.type === "select" && (
                <TSelect value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  {(f.options ?? []).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </TSelect>
              )}
              {f.type === "icon" && (
                <div>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(CATEGORY_ICONS).map(([key, I]) => {
                      const on = form[f.key] === key;
                      return (
                        <button key={key} type="button" title={CATEGORY_ICON_LABELS[key] ?? key}
                          onClick={() => setForm({ ...form, [f.key]: key })}
                          className="w-9 h-9 rounded-lg grid place-items-center cursor-pointer transition-all duration-150 hover:scale-110 active:scale-95"
                          style={{
                            background: on ? "var(--fp-accent)" : "var(--fp-bg)",
                            color: on ? "#071b16" : "var(--fp-text2)",
                            border: `1px solid ${on ? "var(--fp-accent)" : "var(--fp-border2)"}`,
                          }}>
                          <I className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-bold mt-1.5" style={{ color: "var(--fp-text3)" }}>
                    انتخاب‌شده: {CATEGORY_ICON_LABELS[form[f.key] ?? ""] ?? "کیف پول"}
                  </p>
                </div>
              )}
            </Field>
          ))}
          <div className="flex justify-end gap-2 mt-1">
            <button className="btn btn-ghost" onClick={() => setOpenForm(false)}>انصراف</button>
            <button className="btn btn-gold" onClick={save}><Plus className="w-4 h-4" strokeWidth={3} /> ذخیره</button>
          </div>
        </div>
      </Modal>

      {/* فرم برچسب */}
      <Modal open={tagOpen} onClose={() => setTagOpen(false)} title={tagEdit ? "ویرایش برچسب" : "برچسب جدید"}>
        <div className="grid gap-3.5">
          <Field label="نام برچسب"><TInput value={tagForm.label} onChange={(e) => setTagForm({ ...tagForm, label: e.target.value })} placeholder="مثلاً: ضروری" autoFocus /></Field>
          <Field label="توضیح (راهنما)"><TInput value={tagForm.desc} onChange={(e) => setTagForm({ ...tagForm, desc: e.target.value })} placeholder="این برچسب چه خرج‌هایی را پوشش می‌دهد؟" /></Field>
          <Field label="رنگ">
            <div className="flex gap-2">
              {["#ff7a6b", "#e8b04b", "#5ec8de", "#57d9a3", "#f28fc0", "#8f7ae8", "#c0e85e", "#a3b8ac"].map((c) => (
                <button key={c} onClick={() => setTagForm({ ...tagForm, color: c })}
                  className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110"
                  style={{ background: c, outline: tagForm.color === c ? "2.5px solid var(--fp-text)" : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </Field>
          <div className="flex justify-end gap-2 mt-1">
            <button className="btn btn-ghost" onClick={() => setTagOpen(false)}>انصراف</button>
            <button className="btn btn-gold" onClick={saveTag}><Plus className="w-4 h-4" strokeWidth={3} /> ذخیره</button>
          </div>
        </div>
      </Modal>

      <Confirm open={confirmClear} onClose={() => setConfirmClear(false)}
        onYes={() => { mutate((d) => clearData(d), "همهٔ داده‌ها پاک شد"); setConfirmClear(false); toast("ok", "همهٔ داده‌ها پاک شد — ساختار (دسته‌ها، حساب‌ها، برچسب‌ها) حفظ شد."); }}
        title="پاک‌سازی همهٔ داده‌ها" desc="همهٔ تراکنش‌ها، بدهی‌ها، قرارها، یادداشت‌ها و… پاک می‌شوند؛ ساختار (دسته‌ها، حساب‌ها، برچسب‌ها) می‌ماند. آیا مطمئن هستید؟" />

      <Confirm open={!!delAccount} onClose={() => setDelAccount(null)}
        onYes={() => {
          if (!delAccount) return;
          trashItem("accounts", delAccount.id, delAccount.name);
          setDelAccount(null);
        }}
        title={`حذف حساب «${delAccount?.name ?? ""}»`}
        desc={delAccount && delAccount.txCount > 0
          ? `این حساب ${faNum(delAccount.txCount)} تراکنش دارد. با حذف حساب، مبلغ این تراکنش‌ها از «موجودی کل» خارج می‌شود (تراکنش‌ها می‌مانند ولی بدون حساب). آیا مطمئن هستید؟`
          : "این حساب حذف می‌شود. آیا مطمئن هستید؟"} />
    </div>
  );
}

/* ================= ۸) تنظیمات ================= */
export function SettingsPage({ user, onLogout, onDelete, onLock }: {
  user: User; onLogout: () => void; onDelete: () => void; onLock: () => void;
}) {
  const { state, mutate } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const p = state.prefs;
  const ep = effectivePrefs(p);
  const syncOn = !!ep.syncUrl && !!ep.syncKey;
  const fromEnv = !p.syncUrl && !!ep.syncUrl;
  const users = listUsers();
  const [syncing, setSyncing] = useState(false);
  const [pin, setPin] = useState("");
  const [transferOut, setTransferOut] = useState("");
  const [transferIn, setTransferIn] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const setPrefs = (patch: Partial<typeof p>, log?: string) => mutate((d) => Object.assign(d.prefs, patch), log);

  /* سینک دستی — همان منطق امنِ سینک خودکار (rev زمانی + ادغام تراکنش‌محور) */
  const cloudSyncId = "fp-user-" + user.username;
  const doSync = async () => {
    const epp = effectivePrefs(p);
    if (!epp.syncUrl || !epp.syncKey) return toast("warn", "ابتدا آدرس پروژه و کلید anon را پر کنید.");
    setSyncing(true);
    const pull = await pullFromCloud(epp, cloudSyncId);
    if (!pull.ok) {
      toast("err", pull.message);
    } else if (pull.state && (pull.state.rev ?? 0) > (state.rev ?? 0)) {
      if (sameLedgerContent(state, pull.state)) {
        toast("ok", "داده‌ها از قبل همگام بودند.");
      } else {
        const keepCount = localOnlyTx(state, pull.state).length;
        mutate((d) => { mergePulledState(d, pull.state!); }, "دریافت داده از ابر");
        toast("ok", keepCount > 0
          ? `از ابر بازیابی شد و ${faNum(keepCount)} تراکنش محلیِ تازه هم حفظ شد.`
          : "نسخهٔ جدیدتر از Supabase دریافت شد.");
      }
    } else {
      const push = await pushToCloud(state, epp, cloudSyncId);
      toast(push.ok ? "ok" : "err", push.ok ? "دفترکل با Supabase همگام شد — در هر مرورگری همین داده را می‌بینید." : push.message);
    }
    setSyncing(false);
  };

  /* آزمایش اتصال — یک GET سبک به جدول؛ می‌گوید مشکل از آدرس/کلید/جدول است یا اینترنت */
  const [testing, setTesting] = useState(false);
  const doTest = async () => {
    const epp = effectivePrefs(p);
    setTesting(true);
    const r = await testConnection(epp, cloudSyncId);
    setTesting(false);
    toast(r.ok ? "ok" : "err", r.message);
  };

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl md:text-4xl rise-in">تنظیمات</h1>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="grid gap-5">
          {/* تم */}
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "40ms" }}>
            <h3 className="text-[14px] font-black flex items-center gap-2"><Sun className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> ظاهر برنامه</h3>
            <div className="mt-4">
              <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--fp-bg)" }}>
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
                  {THEMES.find((th) => th.id === (p.accent ?? "emerald"))?.name}
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
              <p className="text-[10.5px] font-bold mt-2.5" style={{ color: "var(--fp-text3)" }}>دکمهٔ پالت در بالای برنامه هم تم را سریع عوض می‌کند.</p>
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
              <Field label="آدرس پروژه (SUPABASE_URL)">
                <TInput dir="ltr" placeholder="https://xxx.supabase.co" value={ep.syncUrl ?? ""}
                  onChange={(e) => { setPrefs({ syncUrl: e.target.value }); if (e.target.value.trim() && ep.syncKey) saveCloud({ url: e.target.value.trim(), key: ep.syncKey }); }} />
              </Field>
              <Field label="کلید anon (SUPABASE_KEY)">
                <TInput dir="ltr" type="password" placeholder="eyJhbGciOi…" value={ep.syncKey ?? ""}
                  onChange={(e) => { setPrefs({ syncKey: e.target.value }); if (e.target.value.trim() && ep.syncUrl) saveCloud({ url: ep.syncUrl, key: e.target.value.trim() }); }} />
              </Field>
              {fromEnv && (
                <p className="text-[11px] font-black flex items-center gap-1.5" style={{ color: "var(--fp-mint)" }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={3} /> اتصال از متغیرهای محیطی Vercel خوانده شده — نیازی به پر کردن دستی نیست
                </p>
              )}
              <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <span className="text-[12px] font-black" style={{ color: "var(--fp-text2)" }}>آخرین سینک: {relTime(state.lastSync)}</span>
                <div className="flex gap-2">
                  <button className="btn btn-mint btn-sm" disabled={syncing || testing} onClick={doSync}>
                    <RefreshCw className={`w-4 h-4 ${syncing ? "spin-slow" : ""}`} /> {syncing ? "در حال سینک…" : "سینک اکنون"}
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled={syncing || testing} onClick={doTest}
                    title="یک درخواست سبک می‌فرستد تا بگوید مشکل از آدرس/کلید/جدول است یا اینترنت">
                    {testing ? <RefreshCw className="w-4 h-4 spin-slow" /> : <Cloud className="w-4 h-4" />}
                    {testing ? "در حال آزمایش…" : "آزمایش اتصال"}
                  </button>
                </div>
              </div>
              <p className="text-[11px] font-bold leading-6" style={{ color: "var(--fp-text3)" }}>
                پس از اتصال، تغییرات با ۳ ثانیه تأخیر خودکار به ابر فرستاده و هر ۹۰ ثانیه بررسی می‌شود —
                در مرورگر دیگر با همان نام کاربری، همین دفترکل را دارید. اگر سینک کار نکرد، اول «آزمایش اتصال» را بزنید.
              </p>
              <div className="rounded-xl p-3.5 border mt-1"
                style={{ borderColor: "color-mix(in srgb, var(--fp-mint) 40%, transparent)", background: "color-mix(in srgb, var(--fp-mint) 6%, transparent)" }}>
                <p className="text-[11.5px] font-black flex items-center gap-1.5" style={{ color: "var(--fp-mint)" }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={3} /> خیالتان راحت — دیپلویِ جدید، داده را پاک نمی‌کند
                </p>
                <p className="text-[10.5px] font-bold leading-5 mt-1.5" style={{ color: "var(--fp-text2)" }}>
                  داده‌های شما در مرورگر خودتان و در Supabase ذخیره می‌شود، نه روی سرور Vercel.
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
              <textarea readOnly value={transferOut} dir="ltr" onFocus={(e) => e.target.select()}
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
                mutate((s) => { Object.assign(s, migrateLoadedState(d), { prefs: s.prefs }); }, "انتقال داده از مرورگر دیگر");
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
                    mutate((d) => Object.assign(d, migrateLoadedState(data), { prefs: d.prefs }), "بازیابی از پشتیبان");
                    toast("ok", "دادهٔ پشتیبان بازیابی شد — تنظیمات و اتصال ابری این دستگاه حفظ شد.");
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
              {["React 18", "Vite 6", "TypeScript", "Tailwind v4", "jalaali-js", "Recharts", "ExcelJS", "Supabase", "Capacitor"].map((tch) => (
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

/* ================= ۹) یادداشت‌ها ================= */
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
              <MicButton onText={(tt) => setBody(tt)} baseText={body} />
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

/* ================= ۱۰) حالت روزانه ================= */
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
