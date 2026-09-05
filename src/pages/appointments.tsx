/* ---------- صفحهٔ قرارها و برنامه‌ها ---------- */
import { useEffect, useState } from "react";
import { Bell, CalendarDays, Clock3, FileDown, Plus, TrendingUp } from "lucide-react";
import { useStore, type Appointment } from "../lib/data";
import {
  addJalaliMonths, faDate, faNum, faTime, fireNotification, jalaliDateStr, jalaliFirstOffset,
  jalaliMonthLen, jalaliShort, jalaliToISO, jalaliToday, MONTHS_FA, playChime, todayISO,
  useNow, WEEKDAYS_MIN,
} from "../lib/utils";
import { DeleteBtn, EditBtn, Field, JalaliPicker, MicButton, Modal, TInput, useToast } from "../ui";
import { dl } from "./shared";

export default function AppointmentsPage() {
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
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
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
