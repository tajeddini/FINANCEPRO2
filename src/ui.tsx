/* ---------- کتابخانهٔ UI: توست، مودال، تقویم شمسی، فرم، تایپ صوتی ---------- */
import {
  createContext, useContext, useEffect, useRef, useState,
  type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
} from "react";
import { ChevronRight, ChevronLeft, Mic, MicOff, Check, AlertTriangle, X } from "lucide-react";
import {
  faNum, groupInt, jalaliFirstOffset, jalaliMonthLen, jalaliToday, jalaliToISO,
  isoToJalali, MONTHS_FA, todayISO, toEnDigits,
} from "./lib/utils";

/* ================= توست ================= */
interface Toast { id: string; kind: "ok" | "warn" | "err"; text: string; }
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (kind: Toast["kind"], text: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3600);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 start-5 z-[120] grid gap-2 max-w-[19rem] no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-bold shadow-xl"
            style={{
              background: "var(--fp-bg2)",
              borderColor: t.kind === "ok" ? "color-mix(in srgb, var(--fp-mint) 45%, transparent)"
                : t.kind === "warn" ? "color-mix(in srgb, var(--fp-accent) 45%, transparent)"
                : "color-mix(in srgb, var(--fp-coral) 45%, transparent)",
            }}
          >
            {t.kind === "ok" ? <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--fp-mint)" }} />
              : t.kind === "warn" ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--fp-accent)" }} />
              : <X className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--fp-coral)" }} />}
            <span className="leading-6">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ================= مودال ================= */
export function Modal({
  open, onClose, title, children, wide,
}: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={wide ? { maxWidth: "44rem" } : undefined}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--fp-border)" }}>
          <h3 className="font-display text-xl" style={{ color: "var(--fp-text)" }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="بستن"><X className="w-4.5 h-4.5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({
  open, onClose, onYes, title, desc,
}: {
  open: boolean; onClose: () => void; onYes: () => void; title: string; desc: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[13.5px] leading-7 font-semibold" style={{ color: "var(--fp-text2)" }}>{desc}</p>
      <div className="flex gap-2 mt-5 justify-end">
        <button className="btn btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn btn-danger" onClick={() => { onYes(); onClose(); }}>تأیید</button>
      </div>
    </Modal>
  );
}

/* ================= فرم ================= */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-black mb-1.5" style={{ color: "var(--fp-text3)" }}>{label}</span>
      {children}
      {hint && <span className="block text-[10.5px] font-semibold mt-1" style={{ color: "var(--fp-text3)" }}>{hint}</span>}
    </label>
  );
}

export function TInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ""}`} />;
}

/** ورودی مبلغ — ارقام فارسی/عربی را به انگلیسی تبدیل می‌کند */
export function AmountInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      className="input tabular-nums"
      dir="ltr"
      inputMode="numeric"
      placeholder={placeholder ?? "مثلاً ۲۵۰٬۰۰۰"}
      value={value ? faNum(groupInt(parseInt(value || "0", 10))) : ""}
      onChange={(e) => onChange(toEnDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 15))}
    />
  );
}

export function TSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`select ${props.className ?? ""}`} />;
}

/* ================= تقویم شمسی (انتخاب روز) ================= */
export function JalaliPicker({
  value, onChange,
}: {
  value: string; onChange: (iso: string) => void;
}) {
  const sel = isoToJalali(value);
  const [view, setView] = useState({ jy: sel.jy, jm: sel.jm });
  const t = jalaliToday();
  const len = jalaliMonthLen(view.jy, view.jm);
  const off = jalaliFirstOffset(view.jy, view.jm);

  const nav = (n: number) => {
    let m = view.jy * 12 + (view.jm - 1) + n;
    setView({ jy: Math.floor(m / 12), jm: (m % 12) + 1 });
  };

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="icon-btn" onClick={() => nav(1)} aria-label="ماه بعد"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex items-center gap-2">
          <span className="font-display text-[15px]" style={{ color: "var(--fp-text)" }}>
            {MONTHS_FA[view.jm - 1]} {faNum(view.jy)}
          </span>
          {!(view.jy === t.jy && view.jm === t.jm) && (
            <button type="button" className="chip !py-0.5" onClick={() => setView({ jy: t.jy, jm: t.jm })}>امروز</button>
          )}
        </div>
        <button type="button" className="icon-btn" onClick={() => nav(-1)} aria-label="ماه قبل"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => (
          <span key={d} className="text-[10px] font-black py-1" style={{ color: "var(--fp-text3)" }}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: off }).map((_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: len }).map((_, i) => {
          const d = i + 1;
          const isSel = sel.jy === view.jy && sel.jm === view.jm && sel.jd === d;
          const isToday = t.jy === view.jy && t.jm === view.jm && t.jd === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(jalaliToISO(view.jy, view.jm, d))}
              className="rounded-lg py-1.5 text-[12px] font-bold tabular-nums transition-all duration-150 cursor-pointer hover:scale-105"
              style={{
                background: isSel ? "var(--fp-accent)" : isToday ? "var(--fp-bg3)" : "transparent",
                color: isSel ? "#071b16" : "var(--fp-text2)",
                border: isToday && !isSel ? "1px dashed var(--fp-border2)" : "1px solid transparent",
              }}
            >
              {faNum(d)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= تایپ صوتی (fa-IR) ================= */
export function MicButton({
  onText, disabled,
}: {
  onText: (text: string) => void; disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const supported = typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const toast = useToast();

  const toggle = () => {
    if (!supported) {
      toast("warn", "مرورگر شما از تایپ صوتی پشتیبانی نمی‌کند (Chrome را امتحان کنید).");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "fa-IR";
    rec.interimResults = true;
    rec.continuous = false;
    let final = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += txt;
        else interim += txt;
      }
      onText(final + interim);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast("err", "تشخیص صوتی ناموفق بود؛ دوباره تلاش کنید.");
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={supported ? "تایپ صوتی (فارسی)" : "تایپ صوتی پشتیبانی نمی‌شود"}
      className={`icon-btn ${listening ? "mic-live" : ""}`}
      style={{ border: "1px solid var(--fp-border)" }}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}

/* ================= متفرقه ================= */
export function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-3"
        style={{ background: "var(--fp-bg3)", color: "var(--fp-text3)" }}>
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[13px] font-bold" style={{ color: "var(--fp-text3)" }}>{text}</p>
    </div>
  );
}

export function Bar({ pct, color, delay = 0 }: { pct: number; color?: string; delay?: number }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--fp-bg3)" }}>
      <div
        className="h-full rounded-full bar-grow"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: color ?? "var(--fp-mint)",
          animationDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

export const hiddenMoney = "••••••";
export { todayISO };
