/* ---------- جست‌وجوی سراسری (تراکنش + یادداشت + قرار + دسته) + جست‌وجوی صوتی ---------- */
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Mic, Search, StickyNote } from "lucide-react";
import { useStore } from "../lib/data";
import { faNum } from "../lib/utils";
import { appendSmart, CatGlyph, useToast } from "../ui";

export function GlobalSearch({ onNavigate }: {
  onNavigate: (page: string, drill?: { cat?: string; query?: string }) => void;
}) {
  const { state } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const activeRecRef = useRef(false);
  const vsSessionRef = useRef(0);
  const vsLastEmittedRef = useRef("");

  const voiceSearch = () => {
    const W = window as unknown as Record<string, unknown>;
    const SR = (W.SpeechRecognition || W.webkitSpeechRecognition) as (new () => {
      lang: string; interimResults: boolean; continuous: boolean;
      onresult: ((e: unknown) => void) | null; onend: (() => void) | null; onerror: ((e: unknown) => void) | null;
      start: () => void; abort: () => void;
    }) | undefined;
    if (!SR) return toast("warn", "مرورگر شما از جست‌وجوی صوتی پشتیبانی نمی‌کند.");
    if (activeRecRef.current) return;
    const rec = new SR();
    rec.lang = "fa-IR";
    rec.interimResults = true;
    rec.continuous = false;
    const myId = ++vsSessionRef.current;
    vsLastEmittedRef.current = "";
    activeRecRef.current = true;
    rec.onresult = (e: unknown) => {
      if (myId !== vsSessionRef.current) return;
      const ev = e as { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
      let finalText = "";
      for (let i = 0; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += (finalText ? " " : "") + ev.results[i][0].transcript;
      }
      finalText = finalText.trim();
      if (!finalText) return;
      const merged = appendSmart("", finalText);
      if (merged !== vsLastEmittedRef.current) {
        vsLastEmittedRef.current = merged;
        setQ(merged);
        setOpen(true);
      }
    };
    rec.onend = () => {
      if (myId !== vsSessionRef.current) return;
      setListening(false); activeRecRef.current = false;
    };
    rec.onerror = () => {
      if (myId !== vsSessionRef.current) return;
      setListening(false); activeRecRef.current = false;
    };
    try {
      rec.start();
      setListening(true);
    } catch { activeRecRef.current = false; }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const term = q.trim();
  const has = term.length > 0;
  const txHits = has ? state.transactions.filter((t) => (t.note || t.title).includes(term)).slice(0, 4) : [];
  const noteHits = has ? state.notes.filter((n) => (n.title + n.body).includes(term)).slice(0, 3) : [];
  const apptHits = has ? state.appointments.filter((a) => a.title.includes(term)).slice(0, 3) : [];
  const catHits = has ? state.categories.filter((c) => c.name.includes(term)).slice(0, 3) : [];
  const none = has && !txHits.length && !noteHits.length && !apptHits.length && !catHits.length;

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0 max-w-sm mx-auto">
      <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" style={{ color: "var(--fp-text3)" }} />
      <input
        className="input !py-2 !ps-9 !pe-10 !text-[12.5px] !w-full min-w-0"
        placeholder={listening ? "در حال گوش دادن…" : "جست‌وجو — تایپ کن یا بگو 🎙"}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && has) onNavigate("transactions", { query: q }); }}
      />
      <button onClick={voiceSearch} title="جست‌وجوی صوتی"
        className="absolute top-1/2 -translate-y-1/2 end-2 w-7 h-7 rounded-lg grid place-items-center cursor-pointer transition-all duration-150 hover:scale-110 active:scale-95"
        style={{
          background: listening ? "color-mix(in srgb, var(--fp-coral) 16%, transparent)" : "transparent",
          color: listening ? "var(--fp-coral)" : "var(--fp-text3)",
        }}>
        <Mic className="w-4 h-4" />
      </button>

      {open && has && (
        <div className="absolute top-full mt-2 inset-x-0 card p-2 z-50 max-h-[60vh] overflow-y-auto" style={{ background: "var(--fp-bg2)" }}>
          {none && <p className="text-[12px] font-bold text-center py-4" style={{ color: "var(--fp-text3)" }}>چیزی پیدا نشد.</p>}
          {txHits.length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] font-black px-2 py-1" style={{ color: "var(--fp-text3)" }}>تراکنش‌ها</p>
              {txHits.map((t) => {
                const c = state.categories.find((x) => x.id === t.categoryId);
                return (
                  <button key={t.id} onClick={() => onNavigate("transactions", { query: t.note || t.title })}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-start cursor-pointer hover:bg-[color-mix(in_srgb,var(--fp-mint)_7%,transparent)]">
                    <CatGlyph icon={c?.icon} color={c?.color} className="w-7 h-7 rounded-lg" iconClass="w-3.5 h-3.5" />
                    <span className="flex-1 text-[12px] font-bold truncate">{t.note || t.title}</span>
                    <span className="text-[11px] font-black tabular" style={{ color: t.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                      {t.type === "income" ? "+" : "−"}{faNum(t.amount.toLocaleString("fa-IR"))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {noteHits.length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] font-black px-2 py-1" style={{ color: "var(--fp-text3)" }}>یادداشت‌ها</p>
              {noteHits.map((n) => (
                <button key={n.id} onClick={() => onNavigate("notes")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-start cursor-pointer hover:bg-[color-mix(in_srgb,var(--fp-mint)_7%,transparent)]">
                  <StickyNote className="w-4 h-4 shrink-0" style={{ color: "var(--fp-accent)" }} />
                  <span className="text-[12px] font-bold truncate">{n.title}</span>
                </button>
              ))}
            </div>
          )}
          {apptHits.length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] font-black px-2 py-1" style={{ color: "var(--fp-text3)" }}>قرارها</p>
              {apptHits.map((a) => (
                <button key={a.id} onClick={() => onNavigate("appointments")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-start cursor-pointer hover:bg-[color-mix(in_srgb,var(--fp-mint)_7%,transparent)]">
                  <CalendarDays className="w-4 h-4 shrink-0" style={{ color: "var(--fp-sky)" }} />
                  <span className="text-[12px] font-bold truncate">{a.title}</span>
                </button>
              ))}
            </div>
          )}
          {catHits.length > 0 && (
            <div>
              <p className="text-[10px] font-black px-2 py-1" style={{ color: "var(--fp-text3)" }}>دسته‌ها</p>
              {catHits.map((c) => (
                <button key={c.id} onClick={() => onNavigate("transactions", { cat: c.id })}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-start cursor-pointer hover:bg-[color-mix(in_srgb,var(--fp-mint)_7%,transparent)]">
                  <CatGlyph icon={c.icon} color={c.color} className="w-7 h-7 rounded-lg" iconClass="w-3.5 h-3.5" />
                  <span className="text-[12px] font-bold truncate">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
