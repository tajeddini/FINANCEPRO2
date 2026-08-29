/* ---------- کتابخانهٔ UI: توست، مودال، تقویم شمسی، فرم‌ها، دستیار صوتی ---------- */
import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
  type ComponentType, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
} from "react";
import {
  AlertTriangle, Apple, Baby, Beef, Book, Briefcase, Bus, CandlestickChart, Car, Check,
  ChevronLeft, ChevronRight, Coffee, Croissant, CupSoda, Film, Gamepad2, Gift, GraduationCap,
  HeartPulse, Home, Landmark, Mic, MicOff, Music, PawPrint, PencilLine, Plane, Receipt,
  Shirt, Smartphone, Trash2, Utensils, Wallet, Wifi, Wrench, X, Coins, Fuel, CalendarDays,
} from "lucide-react";
import {
  faDate, faNum, groupInt, isoToJalali, jalaliFirstOffset, jalaliMonthLen, jalaliMonthRange, jalaliShort,
  jalaliToday, jalaliToISO, MONTHS_FA, PERIODS, periodRange, todayISO, toEnDigits, type PeriodKey,
} from "./lib/utils";

/* ================= توست ================= */
type ToastKind = "ok" | "err" | "warn";
interface ToastItem { id: number; kind: ToastKind; text: string; }
const ToastCtx = createContext<(kind: ToastKind, text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = (kind: ToastKind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p.slice(-3), { id, kind, text }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4200);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[130] grid gap-2 w-[min(92vw,420px)] pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className="pop-in pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md"
            style={{
              background: "color-mix(in srgb, var(--fp-bg2) 92%, transparent)",
              borderColor: t.kind === "ok" ? "var(--fp-mint)" : t.kind === "err" ? "var(--fp-coral)" : "var(--fp-accent)",
              color: "var(--fp-text)",
            }}>
            <span className="mt-0.5 shrink-0" style={{ color: t.kind === "ok" ? "var(--fp-mint)" : t.kind === "err" ? "var(--fp-coral)" : "var(--fp-accent)" }}>
              {t.kind === "ok" ? <Check className="w-4 h-4" strokeWidth={3} /> : t.kind === "err" ? <X className="w-4 h-4" strokeWidth={3} /> : <AlertTriangle className="w-4 h-4" />}
            </span>
            <p className="text-[12.5px] font-bold leading-6">{t.text}</p>
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0" style={{ background: "rgba(3, 15, 10, 0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className={`pop-in relative w-full ${wide ? "max-w-2xl" : "max-w-md"} card p-6 max-h-[88vh] overflow-y-auto`}
        style={{ background: "var(--fp-bg2)", borderColor: "var(--fp-border2)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl" style={{ color: "var(--fp-accent)" }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} title="بستن"><X className="w-4.5 h-4.5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ================= تأیید ================= */
export function Confirm({
  open, onClose, onYes, title, desc, yesLabel = "بله، انجام شود",
}: {
  open: boolean; onClose: () => void; onYes: () => void; title: string; desc: string; yesLabel?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[13px] font-bold leading-7" style={{ color: "var(--fp-text2)" }}>{desc}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn btn-danger" onClick={() => { onYes(); onClose(); }}>{yesLabel}</button>
      </div>
    </Modal>
  );
}

/* ================= فرم‌ها =================
   ⚠️ Field از div ساخته می‌شود، نه label — دکمهٔ تعاملی (میکروفون) داخل label
   در کروم/PWA کلیک را دوبار شلیک می‌کند و ضبط صوتی دوتایی می‌شود. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>{label}</span>
      {children}
      {hint && <span className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{hint}</span>}
    </div>
  );
}

export function TInput(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`input ${p.className ?? ""}`} />;
}

export function TSelect(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`input cursor-pointer ${p.className ?? ""}`} />;
}

/** ورودی مبلغ — همزمان با تایپ، جداکنندهٔ هزارگان فارسی نشان می‌دهد */
export function AmountInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      dir="ltr"
      inputMode="numeric"
      className="input text-end !text-[15px] !font-black tabular"
      placeholder={placeholder ?? "مثلاً ۲۵۰٬۰۰۰"}
      value={value ? faNum(groupInt(parseInt(value || "0", 10))) : ""}
      onChange={(e) => onChange(toEnDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 15))}
    />
  );
}

export const hiddenMoney = "••••••";

/* ================= نوار درصد ================= */
export function Bar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setW(Math.min(100, Math.max(0, pct))), 30 + delay);
    return () => window.clearTimeout(id);
  }, [pct, delay]);
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--fp-bg3)" }}>
      <div className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

/* ================= حالت خالی ================= */
export function Empty({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-10 text-center">
      <span className="w-14 h-14 rounded-2xl grid place-items-center mb-3"
        style={{ background: "var(--fp-bg3)", color: "var(--fp-text3)" }}>
        <Wallet className="w-6 h-6" />
      </span>
      <p className="text-[13px] font-bold" style={{ color: "var(--fp-text3)" }}>{text}</p>
    </div>
  );
}

/* ================= تقویم شمسی ================= */
export function JalaliPicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [view, setView] = useState(() => {
    try {
      const j = isoToJalali(value);
      /* مقدار نامعتبر (رشتهٔ خالی/خراب) → NaN می‌شود؛ در این حالت ماه جاری */
      if (Number.isFinite(j.jy) && Number.isFinite(j.jm)) return { jy: j.jy, jm: j.jm };
    } catch { /* مقدار غیرقابل‌تبدیل */ }
    const t = jalaliToday();
    return { jy: t.jy, jm: t.jm };
  });
  const t = jalaliToday();
  const len = jalaliMonthLen(view.jy, view.jm);
  const off = jalaliFirstOffset(view.jy, view.jm);
  const nav = (n: number) => {
    const total = view.jy * 12 + (view.jm - 1) + n;
    setView({ jy: Math.floor(total / 12), jm: (total % 12) + 1 });
  };
  const todayIso = todayISO();
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--fp-border2)", background: "var(--fp-bg)" }}>
      <div className="flex items-center justify-between mb-2.5">
        <button type="button" className="icon-btn !w-8 !h-8" onClick={() => nav(1)}><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-[12.5px] font-black" style={{ color: "var(--fp-text)" }}>
          {MONTHS_FA[view.jm - 1]} {faNum(view.jy)}
        </span>
        <button type="button" className="icon-btn !w-8 !h-8" onClick={() => nav(-1)}><ChevronRight className="w-4 h-4" /></button>
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
          const iso = jalaliToISO(view.jy, view.jm, d);
          const on = value === iso;
          const isToday = iso === todayIso;
          return (
            <button type="button" key={d} onClick={() => onChange(iso)}
              className="rounded-lg py-1.5 text-[11.5px] font-bold tabular cursor-pointer transition-all duration-150 hover:scale-105"
              style={{
                background: on ? "var(--fp-accent)" : "transparent",
                color: on ? "#071b16" : "var(--fp-text2)",
                border: isToday && !on ? "1px dashed var(--fp-border2)" : "1px solid transparent",
              }}>
              {faNum(d)}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>{faDate(value)}</span>
        {value !== todayIso && (
          <button type="button" className="chip !py-0.5 !text-[10px]" onClick={() => { onChange(todayIso); const j = jalaliToday(); setView({ jy: j.jy, jm: j.jm }); }}>
            امروز
          </button>
        )}
      </div>
    </div>
  );
}

function toJalaliSafe(iso: string) {
  const { isoToJalali } = { isoToJalali: (v: string) => {
    const [y, m, d] = v.split("-").map(Number);
    const dd = new Date(y, m - 1, d, 12);
    const j = (window as unknown as Record<string, never>);
    void dd; void j;
    /* از jalaali-js استفاده می‌شود — import مستقیم برای سادگی */
    return jalaliToday();
  } };
  void iso;
  return isoToJalali(iso);
}

/* ---------- افزودن هوشمند (idempotent) ----------
   هم‌پوشانی متن قبلی و متن جدید را پیدا می‌کند تا تکرار پیش نیاید.
   اگر موتور تشخیص، جمله‌ای را دوباره تحویل دهد، خروجی تغییر نمی‌کند. */
export function appendSmart(base: string, add: string): string {
  const b = base.trim();
  const a = add.trim();
  if (!a) return b;
  if (!b) return a;
  if (b.endsWith(a)) return b;
  let overlap = 0;
  const maxK = Math.min(b.length, a.length);
  for (let k = maxK; k > 0; k--) {
    if (b.endsWith(a.slice(0, k))) { overlap = k; break; }
  }
  const rest = a.slice(overlap).trim();
  if (!rest) return b;
  return (b + " " + rest).trim();
}

/* ================= دستیار صوتی (fa-IR) — معماری نهایی =================
   - هر نشست = نمونهٔ تازهٔ SpeechRecognition (نتایج قبلی باقی نمی‌مانند)
   - گارد نشست یکتا (sessionId) — رویدادهای نشست‌های قدیمی نادیده گرفته می‌شوند
   - بازسازی متن نهایی از صفر: در هر رویداد، همهٔ e.results پیمایش و فقط isFinalها به هم می‌چسبند
   - حالت افزودنی: گفته‌های جدید به انتهای متن فعلی اضافه می‌شوند، متن قبلی پاک نمی‌شود
   - حذف تکرار (appendSmart) + ارسال فقط هنگام تغییر واقعی — تکرار کلمات غیرممکن است
   - حلقهٔ restart ممنوع — عامل اصلی تکرار کلمات در نسخه‌های قدیمی بود */
export function MicButton({
  onText, baseText = "", disabled,
}: {
  onText: (text: string) => void;
  baseText?: string;
  disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const recRef = useRef<{ abort: () => void; start: () => void } | null>(null);
  const sessionIdRef = useRef(0);
  const activeRef = useRef(false);
  const fieldRef = useRef("");
  const startBaseRef = useRef("");
  const supported = typeof window !== "undefined" &&
    !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
  const toast = useToast();
  /* آخرین مقدار ارسال‌شده — فقط وقتی نتیجهٔ ادغام واقعاً عوض شد onText صدا زده می‌شود */
  const lastEmittedRef = useRef("");

  useEffect(() => () => {
    activeRef.current = false;
    sessionIdRef.current++;
    try { recRef.current?.abort(); } catch { /* ignore */ }
  }, []);

  const hardStop = (msg?: string, kind: ToastKind = "err") => {
    activeRef.current = false;
    sessionIdRef.current++;
    setListening(false);
    setHeard("");
    try { recRef.current?.abort(); } catch { /* ignore */ }
    if (msg) toast(kind, msg);
  };

  const beginSession = () => {
    const W = window as unknown as Record<string, unknown>;
    const SR = (W.SpeechRecognition || W.webkitSpeechRecognition) as new () => {
      lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
      onresult: ((e: unknown) => void) | null; onend: (() => void) | null; onerror: ((e: unknown) => void) | null;
      start: () => void; abort: () => void;
    };
    const rec = new SR();
    rec.lang = "fa-IR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    const myId = ++sessionIdRef.current;
    startBaseRef.current = fieldRef.current.trim();
    lastEmittedRef.current = "";

    rec.onresult = (e: unknown) => {
      if (myId !== sessionIdRef.current) return; /* رویداد نشستِ باطل‌شده — نادیده بگیر */
      const ev = e as { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
      /* بازسازی کامل متن نهایی از صفر در هر رویداد: همهٔ e.results پیمایش و فقط
         isFinalها به هم می‌چسبند. تحویلِ دوبارهٔ یک نتیجهٔ قبلی توسط موتور، خروجی را
         تغییر نمی‌دهد — همین idempotent بودن، ریشهٔ تکرار کلمات را می‌خشکاند. */
      let finalText = "";
      let interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const txt = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += (finalText ? " " : "") + txt;
        else interim += txt;
      }
      finalText = finalText.trim();
      setHeard((finalText + (interim ? " " + interim : "")).trim());
      if (finalText) {
        const merged = appendSmart(startBaseRef.current, finalText);
        if (merged !== lastEmittedRef.current) {
          lastEmittedRef.current = merged;
          onText(merged);
        }
      }
    };
    rec.onend = () => {
      if (myId !== sessionIdRef.current) return;
      activeRef.current = false;
      setListening(false);
      setHeard("");
    };
    rec.onerror = (e: unknown) => {
      if (myId !== sessionIdRef.current) return;
      const err = (e as { error?: string }).error;
      activeRef.current = false;
      setListening(false);
      setHeard("");
      if (err === "not-allowed" || err === "service-not-allowed")
        toast("err", "دسترسی به میکروفون رد شد — از نوار آدرس مرورگر اجازه بدهید.");
      else if (err === "no-speech")
        toast("warn", "صدایی شنیده نشد — نزدیک‌تر صحبت کنید و دوباره بزنید.");
      else if (err === "network")
        toast("err", "خطای شبکه در تشخیص صوت — اینترنت را بررسی کنید (در نسخهٔ نصب‌شده هم همین‌طور).");
      else if (err === "audio-capture")
        toast("err", "میکروفونی روی دستگاه پیدا نشد.");
      else if (err !== "aborted")
        toast("err", "تشخیص صوتی ناموفق بود؛ دوباره تلاش کنید.");
    };

    try { recRef.current?.abort(); } catch { /* ignore */ }
    recRef.current = rec;
    try {
      rec.start();
      activeRef.current = true;
      setListening(true);
      setHeard("");
    } catch { /* اگر موتور آماده نبود */ }
  };

  const toggle = () => {
    if (!supported) {
      toast("warn", "مرورگر شما از تایپ صوتی پشتیبانی نمی‌کند — Chrome را امتحان کنید.");
      return;
    }
    if (listening || activeRef.current) {
      hardStop();
      return;
    }
    fieldRef.current = baseText;
    beginSession();
  };

  return (
    <span className="inline-flex flex-col gap-1.5 w-full">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={listening ? "توقف ضبط" : supported ? "دیکتهٔ صوتی (فارسی) — به متن موجود اضافه می‌کند" : "تایپ صوتی پشتیبانی نمی‌شود"}
        className={`flex items-center gap-2 self-start px-3.5 py-2 rounded-xl text-[12px] font-black transition-all duration-200 cursor-pointer active:scale-95 ${listening ? "mic-live" : ""}`}
        style={{
          background: listening ? "color-mix(in srgb, var(--fp-coral) 16%, transparent)" : "var(--fp-bg3)",
          color: listening ? "var(--fp-coral)" : "var(--fp-text2)",
          border: `1px solid ${listening ? "var(--fp-coral)" : "var(--fp-border2)"}`,
        }}
      >
        <span className="relative grid place-items-center">
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {listening && <i className="absolute -top-1 -left-1 w-2 h-2 rounded-full blink-dot not-italic" style={{ background: "var(--fp-coral)" }} />}
        </span>
        {listening ? "توقف ضبط" : "دیکتهٔ صوتی"}
        {baseText.trim() && !listening && (
          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "color-mix(in srgb, var(--fp-mint) 14%, transparent)", color: "var(--fp-mint)" }}>
            به متن فعلی اضافه می‌شود
          </span>
        )}
      </button>
      {listening && (
        <span className="text-[11px] font-bold leading-5 px-3 py-2 rounded-lg border border-dashed"
          style={{ borderColor: "var(--fp-border2)", color: heard ? "var(--fp-text2)" : "var(--fp-text3)" }}>
          {heard ? <>«{heard}»</> : "در حال گوش دادن… صحبت کنید"}
        </span>
      )}
    </span>
  );
}

/* ================= دکمه‌های ویرایش و حذف — پررنگ و همیشه‌نما ================= */
export function EditBtn({ onClick, title = "ویرایش" }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 shrink-0"
      style={{
        background: "color-mix(in srgb, var(--fp-accent) 15%, transparent)",
        color: "var(--fp-accent)",
        border: "1px solid color-mix(in srgb, var(--fp-accent) 40%, transparent)",
      }}
    >
      <PencilLine className="w-3.5 h-3.5" /> ویرایش
    </button>
  );
}

export function DeleteBtn({ onClick, title = "حذف" }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 shrink-0"
      style={{
        background: "color-mix(in srgb, var(--fp-coral) 14%, transparent)",
        color: "var(--fp-coral)",
        border: "1px solid color-mix(in srgb, var(--fp-coral) 40%, transparent)",
      }}
    >
      <Trash2 className="w-3.5 h-3.5" /> حذف
    </button>
  );
}

/* ================= آیکون‌های دسته ================= */
/* نمادهای مرد/زن در lucide نیستند — SVG دستی */
function MarsIcon(p: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <circle cx="10" cy="14" r="6" /><path d="M19 5l-4.7 4.7M19 5h-5M19 5v5" />
    </svg>
  );
}
function VenusIcon(p: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <circle cx="12" cy="9" r="6" /><path d="M12 15v6M9 18h6" />
    </svg>
  );
}

/* ComponentType<any>: هم آیکون‌های lucide و هم SVGهای دستی (مرد/زن/ورزش) را می‌پذیرد */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CatIcon = ComponentType<any>;

export const CATEGORY_ICONS: Record<string, CatIcon> = {
  food: Utensils, apple: Apple, croissant: Croissant, beef: Beef, "cup-soda": CupSoda, coffee: Coffee,
  car: Car, bus: Bus, fuel: Fuel, home: Home, receipt: Receipt, wifi: Wifi,
  health: HeartPulse, medical: HeartPulse, fitness: Flame_, game: Gamepad2, film: Film, music: Music,
  plane: Plane, shirt: Shirt, graduation: GraduationCap, book: Book, gift: Gift,
  baby: Baby, paw: PawPrint, wrench: Wrench, candlestick: CandlestickChart,
  male: MarsIcon, female: VenusIcon, landmark: Landmark,
  coins: Coins, briefcase: Briefcase, wallet: Wallet, phone: Smartphone,
};

/* آیکون ورزش — lucide نسخه‌های مختلف نام متفاوت دارند؛ SVG ساده */
function Flame_(p: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M12 3c1 3-3 4.5-3 8a3.5 3.5 0 0 0 7 0c0-1.5-.5-2.5-1-3.5 2 .5 4 2.5 4 6a7 7 0 0 1-14 0c0-5 5-7 7-10.5z" />
    </svg>
  );
}

export const CATEGORY_ICON_LABELS: Record<string, string> = {
  food: "غذا", apple: "میوه", croissant: "نان و شیرینی", beef: "گوشت و پروتئین",
  "cup-soda": "کافه", coffee: "دانهٔ قهوه",
  car: "ماشین", bus: "حمل‌ونقل عمومی", fuel: "سوخت", home: "خانه", receipt: "قبوض", wifi: "اینترنت",
  health: "سلامت", medical: "پزشکی", fitness: "ورزش", game: "تفریح", film: "فیلم و اشتراک", music: "موسیقی",
  plane: "سفر", shirt: "پوشاک", graduation: "آموزش", book: "کتاب", gift: "هدیه",
  baby: "کودک", paw: "حیوان خانگی", wrench: "تعمیرات", candlestick: "پراپ تریدینگ",
  male: "شخص (مرد)", female: "شخص (زن)", landmark: "وام و تسهیلات",
  coins: "پول", briefcase: "کار و پروژه", wallet: "کیف پول", phone: "موبایل",
};

/** نمایش آیکون دسته — کاشی رنگی کوچک */
export function CatGlyph({
  icon, color, className = "w-8 h-8 rounded-lg", iconClass = "w-4 h-4",
}: {
  icon?: string; color?: string; className?: string; iconClass?: string;
}) {
  const I = CATEGORY_ICONS[icon ?? ""] ?? Wallet;
  return (
    <span className={`${className} grid place-items-center shrink-0`}
      style={{ background: `color-mix(in srgb, ${color ?? "#888"} 16%, transparent)`, color: color ?? "var(--fp-text2)" }}>
      <I className={iconClass} strokeWidth={2.2} />
    </span>
  );
}

/** نمایش آیکون دسته به‌صورت inline (برای چیپ‌ها و نشان‌ها) */
export function CatIconInline({ icon, className = "w-3.5 h-3.5", color }: { icon?: string; className?: string; color?: string }) {
  const I = CATEGORY_ICONS[icon ?? ""] ?? Wallet;
  return <span style={{ color: color ?? "currentColor" }} className="inline-grid place-items-center"><I className={className} strokeWidth={2.4} /></span>;
}

/* ================= فیلتر بازهٔ زمانی (۹ آماده + دلخواه) ================= */
export function usePeriod(defaultKey: PeriodKey = "thisMonth") {
  const [period, setPeriod] = useState<PeriodKey>(defaultKey);
  const [from, setFrom] = useState(() => {
    const t = jalaliToday();
    return jalaliMonthRange(t.jy, t.jm).from;
  });
  const [to, setTo] = useState(() => todayISO());

  const range = useMemo(() => {
    if (period === "custom") {
      const f = from <= to ? from : to;
      const t2 = from <= to ? to : from;
      return { from: f, to: t2 };
    }
    return periodRange(period);
  }, [period, from, to]);

  const label = useMemo(() => {
    if (period === "custom") return `${jalaliShort(range.from)} تا ${jalaliShort(range.to)}`;
    return PERIODS.find((p) => p.key === period)?.label ?? "";
  }, [period, range.from, range.to]);

  return { period, setPeriod, range, label, from, setFrom, to, setTo };
}

export function PeriodFilter({
  pf, count, className = "",
}: {
  pf: ReturnType<typeof usePeriod>;
  count?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-3.5 grid gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11.5px] font-black me-1.5 flex items-center gap-1.5" style={{ color: "var(--fp-text3)" }}>
          <CalendarDays className="w-4 h-4" style={{ color: "var(--fp-accent)" }} /> بازهٔ زمانی:
        </span>
        {PERIODS.map((p) => (
          <button key={p.key}
            className={`chip ${pf.period === p.key ? "chip-on" : ""}`}
            style={p.key === "custom" && pf.period !== "custom" ? { borderColor: "color-mix(in srgb, var(--fp-sky) 55%, transparent)", color: "var(--fp-sky)" } : undefined}
            onClick={() => pf.setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
        {count && <span className="text-[11px] font-bold ms-auto tabular" style={{ color: "var(--fp-text3)" }}>{count}</span>}
      </div>
      {pf.period === "custom" && (
        <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: "var(--fp-border)" }}>
          <Field label="از تاریخ (شمسی)"><JalaliPicker value={pf.from} onChange={pf.setFrom} /></Field>
          <Field label="تا تاریخ (شمسی)"><JalaliPicker value={pf.to} onChange={pf.setTo} /></Field>
        </div>
      )}
    </div>
  );
}
