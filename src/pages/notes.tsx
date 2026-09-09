/* ---------- صفحهٔ یادداشت‌ها ---------- */
import { useMemo, useState } from "react";
import { CalendarDays, PencilLine, Pin, PinOff, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import { useStore, type Note } from "../lib/data";
import { faDate, todayISO } from "../lib/utils";
import { Empty, Field, JalaliPicker, MicButton, Modal, TInput, useToast } from "../ui";

const NOTE_COLORS = [
  { name: "زرد", value: "#ffd76b" },
  { name: "نعنایی", value: "#7fe0b4" },
  { name: "آبی", value: "#8fd3ff" },
  { name: "صورتی", value: "#ffb3cd" },
  { name: "بنفش", value: "#c9b3ff" },
];

export default function NotesPage() {
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
