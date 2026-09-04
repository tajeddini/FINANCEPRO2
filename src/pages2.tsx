/* ---------- صفحه‌های اصلی برنامه (بخش دوم) ---------- */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight, BarChart3, Bell, Bot, CalendarDays, Check, Cloud, Clock3, Copy, Download, FileDown,
  KeyRound, Lock, Moon, Palette, PencilLine, Pin, PinOff, Plus, Printer, RefreshCw, Repeat, Search, Shield,
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
  WEEKDAYS_MIN, type PeriodKey,
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
            <p className="text-[12px] font-black mb-2" style={{ color: "var(--fp-text3)" }}>برنامه‌های {faDate(selDay)}</p>
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
    if (editing) { setTitle(editing.title); setDate(editing.date); setTime(editing.time); setNote(editing.note ?? ""); }
    else { setTitle(""); setDate(todayISO()); setTime(nextHourTime()); setNote(""); }
  }, [open, editing]);

  const save = () => {
    if (!title.trim()) return toast("warn", "عنوان قرار را بنویسید.");
    if (editing) {
      mutate((d) => {
        const a = d.appointments.find((x) => x.id === editing.id);
        if (a) Object.assign(a, { title: title.trim(), date, time, note: note.trim() || undefined });
      }, `قرار «${title.trim()}» ویرایش شد`);
      toast("ok", "قرار ویرایش شد.");
    } else {
      mutate((d) => {
        d.appointments.push({ id: Math.random().toString(36).slice(2, 10), title: title.trim(), date, time, note: note.trim() || undefined });
      }, `قرار «${title.trim()}» ثبت شد`);
      toast("ok", "قرار ثبت شد.");
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "ویرایش قرار" : "قرار جدید"}>
      <div className="grid gap-3.5">
        <Field label="عنوان">
          <div className="flex gap-2">
            <TInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: جلسه با تیم" autoFocus />
            <MicButton onText={(t) => setTitle(t)} baseText={title} />
          </div>
        </Field>
        <Field label="تاریخ (شمسی)"><JalaliPicker value={date} onChange={setDate} /></Field>
        <Field label="ساعت (۲۴ ساعته)"><TInput dir="ltr" value={time} onChange={(e) => setTime(e.target.value)} placeholder="18:00" /></Field>
        <Field label="یادداشت"><TInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 mt-1">
          <button className="btn btn-ghost" onClick={onClose}>انصراف</button>
          <button className="btn btn-gold" onClick={save}><Plus className="w-4 h-4" strokeWidth={3} /> ذخیره</button>
        </div>
      </div>
    </Modal>
  );
}

/* ================= ۹) یادداشت‌ها ================= */
const NOTE_COLORS = [
  { name: "زرد", value: "#ffd76b" },
  { name: "نعنایی", value: "#7fe0b4" },
  { name: "آبی", value: "#8fd3ff" },
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

  const catOptions = useMemo(() => {
    const s = new Set<string>();
    for (const n of state.notes) if (n.cat) s.add(n.cat);
    return [...s];
  }, [state.notes]);

  const notes = useMemo(() => {
    const term = q.trim();
    return [...state.notes]
      .filter((n) => !term || (n.title + n.body + (n.cat ?? "")).includes(term))
      .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false) || b.createdAt - a.createdAt);
  }, [state.notes, q]);

  const startEdit = (n: Note) => {
    setEditing(n); setTitle(n.title); setDate(n.date); setBody(n.body); setColor(n.color); setCat(n.cat ?? "");
    setOpenForm(true);
  };

  const save = () => {
    if (!title.trim()) return toast("warn", "عنوان یادداشت را بنویسید.");
    if (editing) {
      mutate((d) => {
        const n = d.notes.find((x) => x.id === editing.id);
        if (n) Object.assign(n, { title: title.trim(), date, body: body.trim(), color, cat: cat.trim() || undefined });
      }, `یادداشت «${title.trim()}» ویرایش شد`);
      toast("ok", "یادداشت ویرایش شد.");
    } else {
      mutate((d) => {
        d.notes.unshift({ id: Math.random().toString(36).slice(2, 10), title: title.trim(), date, body: body.trim(), color, cat: cat.trim() || undefined, pinned: false, createdAt: Date.now() });
      }, `یادداشت «${title.trim()}» ثبت شد`);
      toast("ok", "یادداشت ذخیره شد.");
    }
    setOpenForm(false); setEditing(null);
  };

  const togglePin = (n: Note) => {
    mutate((d) => {
      const x = d.notes.find((y) => y.id === n.id);
      if (x) x.pinned = !x.pinned;
    }, n.pinned ? `سنجاق «${n.title}» برداشته شد` : `«${n.title}» سنجاق شد`);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl flex items-center gap-3">
          <StickyNote className="w-8 h-8" style={{ color: "var(--fp-accent)" }} /> یادداشت‌ها
        </h1>
        <button className="btn btn-gold" onClick={() => { setEditing(null); setTitle(""); setDate(todayISO()); setBody(""); setColor(NOTE_COLORS[0].value); setCat(""); setOpenForm(true); }}>
          <Plus className="w-4 h-4" strokeWidth={3} /> یادداشت جدید
        </button>
      </div>

      <div className="relative max-w-md rise-in" style={{ ["--d" as string]: "40ms" }}>
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3" style={{ color: "var(--fp-text3)" }} />
        <TInput className="!ps-9" placeholder="جست‌وجو در یادداشت‌ها…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {notes.length === 0 ? (
        <div className="card rise-in" style={{ ["--d" as string]: "80ms" }}>
          <Empty text={q.trim() ? "یادداشتی با این عبارت پیدا نشد." : "هنوز یادداشتی ندارید — اولین را بسازید."} />
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:balance]">
          {notes.map((n, i) => (
            <div key={n.id}
              className="group relative break-inside-avoid mb-4 rounded-xl p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl rise-in"
              style={{ background: n.color, color: "#0d2c24", ["--d" as string]: `${Math.min(i, 6) * 60}ms`, transform: `rotate(${(i % 3 - 1) * 0.6}deg)` }}>
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
              {n.body && <p className="text-[13px] font-bold leading-7 mt-3 whitespace-pre-wrap">{n.body}</p>}
              <div className="flex justify-end gap-1.5 mt-4">
                <button className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "rgba(13,44,36,0.14)", color: "#0d2c24", border: "1px solid rgba(13,44,36,0.25)" }}
                  onClick={() => startEdit(n)}>
                  <PencilLine className="w-3.5 h-3.5" /> ویرایش
                </button>
                <button className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
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
              <datalist id="note-cats">{catOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </>
          </Field>
          <Field label="متن یادداشت" hint="می‌توانید با میکروفون هم بنویسید.">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
              placeholder="هر چه در ذهن دارید همین‌جا بنویسید…"
              className="input !leading-7 resize-y" style={{ background: "var(--fp-bg)", border: "1px solid var(--fp-border)" }} />
            <div className="mt-2"><MicButton onText={(tt) => setBody(tt)} baseText={body} /></div>
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

  const todayAppts = state.appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time));

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
        text: s > b.limit ? `بودجهٔ «${name}» رد شده — ${faMoney(s - b.limit)} تومان مازاد` : `بودجهٔ «${name}» ٪${faNum(Math.round((s / b.limit) * 100))} مصرف شده`,
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
                  <span className="flex-1 text-[12px] font-black truncate">{c?.name ?? x.title}{x.note ? ` · ${x.note}` : ""}</span>
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

/* ================= ۶) گزارش‌ها ================= */
export function ReportsPage() {
  const { state } = useStore();
  const toast = useToast();
  const t = jalaliToday();
  const pf = usePeriod("thisMonth");
  const range = pf.range;
  const monthTxs = state.transactions.filter((x) => inRange(x.date, range));

  const lastMonth = addJalaliMonths(t.jy, t.jm, -1);
  const lastRange = jalaliMonthRange(lastMonth.jy, lastMonth.jm);
  const lastMonthTxs = state.transactions.filter((x) => inRange(x.date, lastRange));

  const health = computeHealthScore(state, monthTxs, lastMonthTxs);
  const badges = computeBadges(state);
  const forecast = Forecast({ s: state });

  const chartData = useMemo(() => {
    return forecast.months.map((m, i) => ({
      name: i === 6 ? `${m.label} (پیش‌بینی)` : m.label,
      درآمد: m.income,
      هزینه: m.expense,
    }));
  }, [forecast]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl flex items-center gap-3">
          <BarChart3 className="w-8 h-8" style={{ color: "var(--fp-accent)" }} /> گزارش‌ها و تحلیل
        </h1>
        <div className="flex gap-2">
          <button className="btn btn-gold btn-sm" onClick={() => { exportExcel(state, { txs: monthTxs, periodLabel: pf.label }); toast("ok", "فایل اکسل چندبرگی دانلود شد."); }}>
            <Download className="w-4 h-4" /> خروجی اکسل
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { exportCSV(state); toast("ok", "خروجی CSV دانلود شد."); }}>
            <FileDown className="w-4 h-4" /> CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> چاپ / PDF
          </button>
        </div>
      </div>

      <PeriodFilter pf={pf} count={<>{faNum(monthTxs.length)} تراکنش</>} className="rise-in" />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 flex flex-col items-center rise-in" style={{ ["--d" as string]: "60ms" }}>
          <h3 className="text-[14px] font-black self-start flex items-center gap-2"><Shield className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> امتیاز سلامت مالی</h3>
          <div className="my-4"><ScoreRing score={health.score} /></div>
          <div className="w-full grid gap-2.5">
            {health.parts.map((p) => (
              <div key={p.label} title={p.tip}>
                <div className="flex justify-between text-[11px] font-black mb-1">
                  <span style={{ color: "var(--fp-text2)" }}>{p.label}</span>
                  <span style={{ color: "var(--fp-accent)" }}>٪{faNum(p.pct)}</span>
                </div>
                <Bar pct={p.pct} color={p.pct >= 70 ? "var(--fp-mint)" : p.pct >= 45 ? "var(--fp-accent)" : "var(--fp-coral)"} />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2 rise-in" style={{ ["--d" as string]: "100ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2"><TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> درآمد و هزینه — ۶ ماه اخیر + پیش‌بینی</h3>
          <div className="mt-4" dir="ltr" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--fp-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--fp-text3)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--fp-text3)" }} tickFormatter={(v: number) => `${v / 1000000}M`} />
                <RTooltip contentStyle={{ background: "var(--fp-bg2)", border: "1px solid var(--fp-border)", borderRadius: 12, direction: "rtl" }} />
                <Legend />
                <RBar dataKey="درآمد" fill="var(--fp-mint)" radius={[6, 6, 0, 0]} />
                <RBar dataKey="هزینه" fill="var(--fp-coral)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] font-bold mt-2" style={{ color: "var(--fp-text3)" }}>
            پیش‌بینی ماه بعد: درآمد ~{faMoney(forecast.forecast.income)} · هزینه ~{faMoney(forecast.forecast.expense)} تومان
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "140ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2"><Target className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> نقشهٔ حرارتی خرج (۱۴ هفته)</h3>
          <div className="mt-4 overflow-x-auto"><Heatmap txs={state.transactions} /></div>
        </div>

        <div className="card p-5 rise-in" style={{ ["--d" as string]: "180ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2"><Sparkles className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> نشان‌ها</h3>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {badges.map((b) => (
              <div key={b.id} className="rounded-xl border p-3 flex items-center gap-2.5 transition-all"
                style={{ borderColor: b.earned ? "color-mix(in srgb, var(--fp-accent) 45%, transparent)" : "var(--fp-border)", background: b.earned ? "color-mix(in srgb, var(--fp-accent) 8%, transparent)" : "var(--fp-bg)", opacity: b.earned ? 1 : 0.5 }}>
                <span className="text-xl">{b.icon}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-black">{b.title}</p>
                  <p className="text-[9.5px] font-bold truncate" style={{ color: "var(--fp-text3)" }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= ۷) مدیریت ================= */
export function ManagePage() {
  const { state, mutate, trashItem } = useStore();
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
        <div key={a.id} className="card p-4 flex items-center gap-3 rise-in">
          <CatGlyph icon="wallet" color={a.color} className="w-10 h-10 rounded-xl" iconClass="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black">{a.name}</p>
            <p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{a.type} · موجودی اولیه {faMoney(a.initial)}</p>
          </div>
          <p className="text-[13px] font-black tabular" style={{ color: a.balance < 0 ? "var(--fp-coral)" : "var(--fp-mint)" }}>{faMoney(a.balance)}</p>
          <EditBtn onClick={() => setForm({ id: a.id, name: a.name, type: a.type, initial: String(a.initial), color: a.color })} />
          <DeleteBtn onClick={() => { trashItem("accounts", a.id, a.name); toast("warn", "حساب حذف شد — تا ۳۰ ثانیه قابل بازگشت."); }} />
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
        <div key={c.id} className="card p-4 flex items-center gap-3 rise-in">
          <CatGlyph icon={c.icon} color={c.color} className="w-10 h-10 rounded-xl" iconClass="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black">{c.name}</p>
            <p className="text-[10.5px] font-bold" style={{ color: c.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>{c.type === "income" ? "درآمد" : "هزینه"}</p>
          </div>
          <EditBtn onClick={() => setForm({ id: c.id, name: c.name, type: c.type, color: c.color, icon: c.icon ?? "wallet" })} />
          <DeleteBtn onClick={() => { trashItem("categories", c.id, c.name); toast("warn", "دسته حذف شد — تا ۳۰ ثانیه قابل بازگشت."); }} />
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
          <div key={tg.id} className="card p-4 flex items-center gap-3 rise-in">
            <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-[11px] font-black"
              style={{ background: `color-mix(in srgb, ${tg.color} 18%, transparent)`, color: tg.color }}>
              {tg.label.slice(0, 2)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black flex items-center gap-2">
                {tg.label}
                {tg.builtin && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "var(--fp-bg3)", color: "var(--fp-text3)" }}>پیش‌فرض</span>}
              </p>
              <p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{tg.desc || "—"} · {faNum(count)} تراکنش</p>
            </div>
            <EditBtn onClick={() => setForm({ id: tg.id, label: tg.label, color: tg.color, desc: tg.desc ?? "" })} />
            <DeleteBtn onClick={() => { trashItem("tags", tg.id, tg.label); toast("warn", "برچسب حذف شد — تا ۳۰ ثانیه قابل بازگشت."); }} />
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
              <p className="text-[13px] font-black flex items-center gap-2">
                <CatGlyph icon={cat?.icon} color={cat?.color} className="w-8 h-8" iconClass="w-4 h-4" /> {cat?.name ?? "—"}
              </p>
              <div className="flex gap-1.5">
                <EditBtn onClick={() => setForm({ id: b.id, categoryId: b.categoryId, limit: String(b.limit) })} />
                <DeleteBtn onClick={() => { trashItem("budgets", b.id, `بودجهٔ ${cat?.name}`); toast("warn", "بودجه حذف شد."); }} />
              </div>
            </div>
            <div className="flex justify-between text-[11px] font-black mb-1.5">
              <span style={{ color: "var(--fp-text2)" }}>{faMoney(spent)} از {faMoney(b.limit)}</span>
              <span style={{ color: pct > 100 ? "var(--fp-coral)" : pct > 80 ? "var(--fp-accent)" : "var(--fp-mint)" }}>٪{faNum(Math.round(pct))}</span>
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
              <p className="text-[13px] font-black flex items-center gap-2"><Target className="w-4 h-4" style={{ color: "var(--fp-accent)" }} /> {g.title}</p>
              <div className="flex gap-1.5">
                <EditBtn onClick={() => setForm({ id: g.id, title: g.title, target: String(g.target), saved: String(g.saved) })} />
                <DeleteBtn onClick={() => { trashItem("savings_goals", g.id, g.title); toast("warn", "هدف حذف شد."); }} />
              </div>
            </div>
            <div className="flex justify-between text-[11px] font-black mb-1.5">
              <span style={{ color: "var(--fp-text2)" }}>{faMoney(g.saved)} از {faMoney(g.target)}</span>
              <span style={{ color: "var(--fp-accent)" }}>٪{faNum(Math.round(pct))}</span>
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
          <div key={r.id} className="card p-4 flex items-center gap-3 rise-in">
            <CatGlyph icon={cat?.icon} color={cat?.color} className="w-10 h-10 rounded-xl" iconClass="w-5 h-5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black flex items-center gap-2"><Repeat className="w-3.5 h-3.5" style={{ color: "var(--fp-accent)" }} /> {r.title}</p>
              <p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>روز {faNum(r.dayOfMonth)} هر ماه · {faMoney(r.amount)} تومان</p>
            </div>
            <DeleteBtn onClick={() => { trashItem("recurring", r.id, r.title); toast("warn", "حذف شد."); }} />
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
        <div key={m.id} className="card p-4 flex items-center gap-3 rise-in">
          <Wallet className="w-5 h-5" style={{ color: "var(--fp-accent)" }} />
          <p className="flex-1 text-[13px] font-black">{m.name}</p>
          <DeleteBtn onClick={() => { trashItem("payment_methods", m.id, m.name); toast("warn", "حذف شد."); }} />
        </div>
      ))}
    </div>
  );
}

/* ================= ۸) تنظیمات ================= */
export function SettingsPage({ user, onLogout, onDelete, onLock }: {
  user: User; onLogout: () => void; onDelete: () => void; onLock: () => void;
}) {
  const { state, mutate } = useStore();
  const toast = useToast();
  const p = state.prefs;
  const [syncUrl, setSyncUrl] = useState(p.syncUrl ?? "");
  const [syncKey, setSyncKey] = useState(p.syncKey ?? "");
  const [pin, setPin] = useState(p.pin ?? "");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cloudSyncId = "fp-user-" + user.username;

  const saveSync = () => {
    mutate((d) => { d.prefs.syncUrl = syncUrl.trim(); d.prefs.syncKey = syncKey.trim(); }, "تنظیمات سینک ذخیره شد");
    saveCloud({ url: syncUrl.trim(), key: syncKey.trim() });
    toast("ok", "تنظیمات سینک ذخیره شد.");
  };

  const doTest = async () => {
    setTesting(true);
    const r = await testConnection({ ...p, syncUrl: syncUrl.trim(), syncKey: syncKey.trim() }, cloudSyncId);
    setTesting(false);
    toast(r.ok ? "ok" : "err", r.message);
  };

  const doSync = async () => {
    const ep = effectivePrefs({ ...p, syncUrl: syncUrl.trim(), syncKey: syncKey.trim() });
    if (!ep.syncUrl || !ep.syncKey) return toast("warn", "ابتدا آدرس و کلید را پر و ذخیره کنید.");
    setSyncing(true);
    const pull = await pullFromCloud(ep, cloudSyncId);
    if (pull.ok && pull.state && (pull.state.rev ?? 0) > (state.rev ?? 0)) {
      if (!sameLedgerContent(state, pull.state)) {
        mutate((d) => { mergePulledState(d, pull.state!); }, "دریافت داده از ابر");
        toast("ok", "نسخهٔ جدیدتر از Supabase دریافت شد.");
      } else {
        toast("ok", "داده‌ها از قبل همگام بودند.");
      }
    } else if (pull.ok) {
      const push = await pushToCloud(state, ep, cloudSyncId);
      toast(push.ok ? "ok" : "err", push.ok ? "دفترکل با Supabase همگام شد." : push.message);
    } else {
      toast("err", pull.message);
    }
    setSyncing(false);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    dl(blob, `financepro-backup-${todayISO()}.json`);
    toast("ok", "پشتیبان JSON دانلود شد.");
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as AppState;
        if (!Array.isArray(data.transactions) || !Array.isArray(data.accounts)) throw new Error("bad");
        mutate((d) => { Object.assign(d, migrateLoadedState(data), { prefs: d.prefs }); }, "بازیابی از پشتیبان");
        toast("ok", "پشتیبان بازیابی شد — تنظیمات و اتصال ابری این دستگاه حفظ شد.");
      } catch {
        toast("err", "فایل پشتیبان معتبر نیست.");
      }
    };
    reader.readAsText(file);
  };

  const users = listUsers();

  return (
    <div className="grid gap-5 max-w-3xl">
      <h1 className="font-display text-3xl md:text-4xl rise-in">تنظیمات</h1>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "40ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Palette className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> ظاهر</h3>
        <div className="grid gap-4 mt-4">
          <Field label="تم روشن / تیره">
            <div className="flex gap-2">
              <button className={`chip ${p.theme !== "light" ? "chip-on" : ""}`} onClick={() => mutate((d) => { d.prefs.theme = "dark"; }, "تم تیره شد")}><Moon className="w-3.5 h-3.5" /> تیره</button>
              <button className={`chip ${p.theme === "light" ? "chip-on" : ""}`} onClick={() => mutate((d) => { d.prefs.theme = "light"; }, "تم روشن شد")}><Sun className="w-3.5 h-3.5" /> روشن</button>
            </div>
          </Field>
          <Field label="تم رنگی ترکیبی">
            <div className="flex flex-wrap gap-2">
              {THEMES.map((th) => (
                <button key={th.id} title={th.name}
                  onClick={() => { applyAccent(th.id); mutate((d) => { d.prefs.accent = th.id; }, `تم «${th.name}» فعال شد`); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black cursor-pointer transition-all hover:scale-105"
                  style={{
                    background: (p.accent ?? "emerald") === th.id ? `color-mix(in srgb, ${th.accent} 22%, transparent)` : "var(--fp-bg)",
                    border: `1.5px solid ${(p.accent ?? "emerald") === th.id ? th.accent : "var(--fp-border)"}`,
                    color: (p.accent ?? "emerald") === th.id ? th.accent : "var(--fp-text2)",
                  }}>
                  <span className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${th.accent} 0 52%, ${th.mint} 52%)` }} />
                  {th.name}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Lock className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> امنیت</h3>
        <div className="grid gap-4 mt-4">
          <Field label="پین ورود (۴ تا ۶ رقم)" hint="وقتی فعال باشد، هر بار ورود پین می‌خواهد.">
            <div className="flex gap-2">
              <TInput dir="ltr" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/[^\d۰-۹]/g, "").slice(0, 6))} placeholder="••••" />
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const en = pin.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
                mutate((d) => { d.prefs.pin = en || undefined; d.prefs.pinEnabled = en.length >= 4; }, en ? "پین تنظیم شد" : "پین حذف شد");
                toast("ok", en.length >= 4 ? "پین فعال شد." : "پین حذف شد.");
              }}>ذخیرهٔ پین</button>
            </div>
          </Field>
          {p.pinEnabled && (
            <button className="btn btn-ghost btn-sm self-start" onClick={onLock}><Lock className="w-4 h-4" /> قفل کردن اکنون</button>
          )}
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "120ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Cloud className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> همگام‌سازی ابری (Supabase)</h3>
        <p className="text-[11px] font-bold mt-1 leading-5" style={{ color: "var(--fp-text3)" }}>
          آدرس پروژه و کلید anon را از داشبورد Supabase (Settings → API) بگیرید. کلید هرگز به ابر فرستاده نمی‌شود.
        </p>
        <div className="grid gap-3 mt-4">
          <Field label="آدرس پروژه (SUPABASE_URL)"><TInput dir="ltr" value={syncUrl} onChange={(e) => setSyncUrl(e.target.value)} placeholder="https://xxx.supabase.co" /></Field>
          <Field label="کلید anon (SUPABASE_KEY)"><TInput dir="ltr" type="password" value={syncKey} onChange={(e) => setSyncKey(e.target.value)} placeholder="eyJhbGciOi…" /></Field>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-gold btn-sm" onClick={saveSync}>ذخیره</button>
            <button className="btn btn-ghost btn-sm" onClick={doTest} disabled={testing}><RefreshCw className={`w-4 h-4 ${testing ? "spin-slow" : ""}`} /> آزمایش اتصال</button>
            <button className="btn btn-mint btn-sm" onClick={doSync} disabled={syncing}><Cloud className="w-4 h-4" /> {syncing ? "در حال سینک…" : "سینک اکنون"}</button>
          </div>
          <p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>
            شناسهٔ سینک شما: <span dir="ltr" className="tabular">{cloudSyncId}</span> — با همین شناسه در هر دستگاهی داده‌هایتان را می‌بینید.
          </p>
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "160ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Download className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> پشتیبان‌گیری</h3>
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn btn-ghost btn-sm" onClick={exportBackup}><Download className="w-4 h-4" /> دانلود پشتیبان JSON</button>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> بازیابی از پشتیبان</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }} />
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "200ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Shield className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> حساب کاربری</h3>
        <div className="flex items-center gap-3 mt-4">
          <span className="w-12 h-12 rounded-xl grid place-items-center font-display text-xl" style={{ background: "color-mix(in srgb, var(--fp-mint) 15%, transparent)", color: "var(--fp-mint)" }}>{user.name.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-black">{user.name} {user.guest && <span className="chip !cursor-default" style={{ color: "var(--fp-accent)" }}>مهمان</span>}</p>
            <p className="text-[11px] font-bold" style={{ color: "var(--fp-text3)" }} dir="ltr">@{user.username}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>خروج</button>
        </div>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--fp-border)" }}>
          <p className="text-[11px] font-black mb-2" style={{ color: "var(--fp-text3)" }}>کاربران این دستگاه — {faNum(users.length)} کاربر</p>
          <div className="grid gap-1.5">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                style={{ background: u.id === user.id ? "color-mix(in srgb, var(--fp-mint) 8%, transparent)" : "var(--fp-bg)", border: `1px solid ${u.id === user.id ? "var(--fp-mint)" : "var(--fp-border)"}` }}>
                <span className="w-7 h-7 rounded-lg grid place-items-center font-display text-[13px] shrink-0" style={{ background: "color-mix(in srgb, var(--fp-mint) 15%, transparent)", color: "var(--fp-mint)" }}>{u.name.slice(0, 1)}</span>
                <span className="text-[12px] font-black flex-1 truncate">{u.name}</span>
                <span className="text-[10px] font-bold" style={{ color: "var(--fp-text3)" }} dir="ltr">@{u.username}</span>
                {u.id === user.id && <span className="chip !cursor-default" style={{ color: "var(--fp-mint)", borderColor: "var(--fp-mint)" }}>فعال</span>}
              </div>
            ))}
          </div>
        </div>
        {!user.guest && (
          <button className="btn btn-danger btn-sm mt-4" onClick={() => { if (confirm("حساب و همهٔ داده‌های این دستگاه حذف شود؟")) onDelete(); }}>
            <Trash2 className="w-4 h-4" /> حذف حساب و داده‌ها
          </button>
        )}
      </div>
    </div>
  );
}
