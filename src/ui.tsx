/* ---------- کتابخانهٔ UI: توست، مودال، تقویم شمسی، فرم، تایپ صوتی ---------- */
import {
  createContext, useContext, useEffect, useRef, useState,
  type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
} from "react";
import {
  ChevronRight, ChevronLeft, Mic, MicOff, Check, AlertTriangle, X, PencilLine, Trash2,
  UtensilsCrossed, Car, Home, HeartPulse, Gamepad2, Shirt, GraduationCap, Tv, Gift, Briefcase,
  Banknote, Wallet, ShoppingCart, Coffee, Plane, Music, Dumbbell, BookOpen, Smartphone,
  PawPrint, Stethoscope, Fuel, Baby, Pizza, Bus, Wrench, MoreHorizontal,
  Apple, Croissant, CandlestickChart, Receipt, Beef, Wifi, Landmark, CupSoda,
  type LucideIcon,
} from "lucide-react";

/* ---------- آیکون‌های دسته‌ها ---------- */
type CatIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

/* نمادهای جنسیتی — در lucide نیستند، دستی کشیده شده‌اند */
const MarsIcon: CatIcon = ({ className, style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="5.5" />
    <path d="M14 10 20 4" /><path d="M15 4h5v5" />
  </svg>
);
const VenusIcon: CatIcon = ({ className, style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.5" r="5.5" />
    <path d="M12 14v7" /><path d="M8.5 17.5h7" />
  </svg>
);

export const CATEGORY_ICONS: Record<string, CatIcon> = {
  utensils: UtensilsCrossed, car: Car, home: Home, "heart-pulse": HeartPulse,
  "gamepad-2": Gamepad2, shirt: Shirt, "graduation-cap": GraduationCap, tv: Tv,
  gift: Gift, briefcase: Briefcase, banknote: Banknote, wallet: Wallet,
  "shopping-cart": ShoppingCart, coffee: Coffee, plane: Plane, music: Music,
  dumbbell: Dumbbell, "book-open": BookOpen, smartphone: Smartphone, "paw-print": PawPrint,
  stethoscope: Stethoscope, fuel: Fuel, baby: Baby, pizza: Pizza, bus: Bus,
  wrench: Wrench, more: MoreHorizontal,
  /* آیکون‌های جدید (v1.9) */
  apple: Apple, "cup-soda": CupSoda, croissant: Croissant, candlestick: CandlestickChart,
  receipt: Receipt, beef: Beef, wifi: Wifi, male: MarsIcon, female: VenusIcon,
  landmark: Landmark,
};

export const CATEGORY_ICON_LABELS: Record<string, string> = {
  utensils: "غذا و خوراک", car: "ماشین", home: "خانه", "heart-pulse": "سلامت",
  "gamepad-2": "بازی و تفریح", shirt: "پوشاک", "graduation-cap": "آموزش", tv: "اشتراک و فیلم",
  gift: "هدیه", briefcase: "کار و پروژه", banknote: "پول و حقوق", wallet: "کیف پول",
  "shopping-cart": "خرید", coffee: "دانهٔ قهوه", plane: "سفر", music: "موسیقی",
  dumbbell: "ورزش", "book-open": "کتاب", smartphone: "موبایل", "paw-print": "حیوان خانگی",
  stethoscope: "پزشکی", fuel: "سوخت", baby: "کودک", pizza: "فست‌فود", bus: "حمل‌ونقل عمومی",
  wrench: "تعمیرات", more: "سایر",
  /* آیکون‌های جدید (v1.9) */
  apple: "میوه", "cup-soda": "کافه", croissant: "نان و شیرینی", candlestick: "پراپ تریدینگ",
  receipt: "قبوض", beef: "گوشت و پروتئین", wifi: "اینترنت", male: "شخص (مرد)", female: "شخص (زن)",
  landmark: "وام و تسهیلات",
};

/* آیکون دسته داخل کاشی رنگی (جایگزین دایرهٔ رنگی) */
export function CatGlyph({ icon, color, className = "w-9 h-9", iconClass = "w-4.5 h-4.5" }: {
  icon?: string; color?: string; className?: string; iconClass?: string;
}) {
  const I = CATEGORY_ICONS[icon ?? ""] ?? Wallet;
  return (
    <span className={`${className} rounded-xl grid place-items-center shrink-0 transition-colors duration-200`}
      style={{ background: `color-mix(in srgb, ${color ?? "#888"} 16%, transparent)`, color: color ?? "var(--fp-text3)" }}>
      <I className={iconClass} />
    </span>
  );
}

/* آیکون سادهٔ دسته (بدون پس‌زمینه) برای استفادهٔ درون‌خطی */
export function CatIconInline({ icon, className = "w-4 h-4", color }: {
  icon?: string; className?: string; color?: string;
}) {
  const I = CATEGORY_ICONS[icon ?? ""] ?? Wallet;
  return <I className={className} style={color ? { color } : undefined} />;
}
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
  /* ⚠️ div به‌جای label — دکمهٔ داخل <label> در برخی مرورگرها (از جمله کرومِ PWA)
     رویداد کلیک را دوبار شلیک می‌کند و باعث شروع دوتایی ضبط صدا می‌شد. */
  return (
    <div className="block">
      <span className="block text-[11.5px] font-black mb-1.5" style={{ color: "var(--fp-text3)" }}>{label}</span>
      {children}
      {hint && <span className="block text-[10.5px] font-semibold mt-1" style={{ color: "var(--fp-text3)" }}>{hint}</span>}
    </div>
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

/** الحاق هوشمند و idempotent: اگر `add` از قبل (کامل یا بخشی از آن) در انتهای `base`
    وجود داشته باشد، دوباره اضافه نمی‌شود. جلوی تکرار جمله در PWA/اندروید را می‌گیرد. */
function appendSmart(base: string, add: string): string {
  const b = base.trim();
  const a = add.trim();
  if (!a) return b;
  if (!b) return a;
  if (b.endsWith(a)) return b; /* تکرار کامل — هیچ تغییری نده */
  /* بلندترین پیشوندِ add که با انتهای base یکی است را پیدا و حذف کن */
  let overlap = 0;
  const maxK = Math.min(b.length, a.length);
  for (let k = maxK; k > 0; k--) {
    if (b.endsWith(a.slice(0, k))) { overlap = k; break; }
  }
  const rest = a.slice(overlap).trim();
  if (!rest) return b;
  return (b + " " + rest).trim();
}

/* ================= تایپ صوتی (fa-IR) — پیشرفته =================
   ۱) متن قبلی پاک نمی‌شود؛ گفته‌های جدید به انتهای متن موجود اضافه می‌شوند.
   ۲) بازسازی «idempotent» از کل آرایهٔ نتایج: در هر رویداد، متن نهاییِ نشست از «صفر»
      و از کل e.results ساخته می‌شود — هیچ تجمع دستی در کلوژر وجود ندارد. این‌طوری اگر
      موتور (مخصوصاً Chrome اندروید/PWA) نشست را ری‌استارت کند یا رویدادی تکرار شود،
      خروجی همیشه یکتاست و کلمه‌ای تکرار نمی‌شود (باگ «برفی» ریشه‌ای حل شده).
   ۳) «توکن نشست» (sessionId): هر نشست شمارهٔ یکتا می‌گیرد و نشست‌های قدیمی/هم‌پوشان
      باطل می‌شوند — هیچ‌وقت دو نمونهٔ تشخیص همزمان متن تحویل نمی‌دهند.
   ۴) گوش دادن پیوسته است؛ بعد از مکث، نشست جدید (با نمونهٔ تازه) خودکار شروع می‌شود.
   ۵) الحاق هوشمند (appendSmart): اگر جمله‌ای از قبل در انتهای فیلد باشد دوباره اضافه
      نمی‌شود — لایهٔ دفاعی نهایی در برابر تکرار. */
export function MicButton({
  onText, baseText = "", disabled,
}: {
  onText: (text: string) => void;
  /** متن فعلی فیلد — گفته‌های جدید به انتهای آن اضافه می‌شود */
  baseText?: string;
  disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const recRef = useRef<any>(null);
  const stopReqRef = useRef(false);
  const activeRef = useRef(false); /* گارد همگام — جلوی شروع دوتایی */
  /* توکن نشست — هر نشست یک شمارهٔ یکتا می‌گیرد؛ نشست‌های قدیمی/هم‌پوشان باطل می‌شوند
     تا هیچ‌وقت دو نمونهٔ تشخیص همزمان متن تحویل ندهند (عامل دوم باگ برفی PWA) */
  const sessionIdRef = useRef(0);
  /* محتوای لحظه‌ای فیلد — مبنای الحاق و حذف تکرار
     (در PWA/اندروید موتور گاهی جملهٔ قبلی را دوباره می‌فرستد؛ appendSmart جلوش را می‌گیرد) */
  const fieldRef = useRef(baseText);
  useEffect(() => { fieldRef.current = baseText; }, [baseText]);
  const supported = typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const toast = useToast();

  useEffect(() => () => {
    stopReqRef.current = true;
    activeRef.current = false;
    sessionIdRef.current++; /* باطل‌کردن نشست در حال اجرا */
    try { recRef.current?.abort(); } catch { /* ignore */ }
  }, []);

  const hardStop = (msg?: string, kind: "err" | "warn" = "err") => {
    stopReqRef.current = true;
    activeRef.current = false;
    sessionIdRef.current++; /* باطل‌کردن نشست در حال اجرا */
    setListening(false);
    setHeard("");
    if (msg) toast(kind, msg);
  };

  /* یک نشست تشخیصِ تازه — همیشه نمونهٔ جدید + بازسازی idempotent از کل e.results.
     متن نهایی در هر رویداد از «صفر» و از کل آرایهٔ نتایج ساخته می‌شود (نه تجمع در کلوژر)،
     تا ری‌استارت داخلی موتور یا تکرار رویداد در PWA/اندروید هرگز باعث تکرار کلمه نشود. */
  const beginSession = () => {
    /* نمونهٔ قبلی (اگر هست) را کاملاً باطل کن — هیچ‌وقت دو نمونهٔ همزمان */
    try { recRef.current?.abort(); } catch { /* ignore */ }

    const myId = ++sessionIdRef.current; /* توکن یکتای این نشست */
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "fa-IR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    /* پیشوند جلسه = محتوای فیلد در لحظهٔ شروع این نشست (ثابت در طول نشست) */
    const sessionPrefix = fieldRef.current;
    let lastEmitted = sessionPrefix;

    rec.onresult = (e: any) => {
      if (sessionIdRef.current !== myId) return; /* نشست قدیمی — باطل */
      /* بازسازی کامل و idempotent متن نهایی از «کل» آرایهٔ نتایجِ نشست —
         بدون هیچ تجمع دستی در کلوژر. اگر موتور (مخصوصاً Chrome اندروید/PWA) نشست را
         داخلی ری‌استارت کند، results از ایندکس ۰ شروع شود، یا رویدادی تکرار شود،
         بازخوانی از e.results همیشه «همان متن درستِ یکتا» را می‌دهد و کلمه‌ای تکرار نمی‌شود. */
      let finals = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = (r[0]?.transcript ?? "").trim();
        if (!txt) continue;
        if (r.isFinal) finals += (finals ? " " : "") + txt;
        else interim = txt; /* فقط آخرین پیش‌نویسِ غیرنهایی */
      }
      setHeard((finals + (interim ? " " + interim : "")).trim());
      if (!finals) return;
      const merged = appendSmart(sessionPrefix, finals);
      if (merged !== lastEmitted) {
        lastEmitted = merged;
        fieldRef.current = merged;
        onText(merged);
      }
    };

    rec.onend = () => {
      if (sessionIdRef.current !== myId) return; /* نشست قدیمی — باطل */
      if (stopReqRef.current) {
        activeRef.current = false;
        setListening(false);
        setHeard("");
        return;
      }
      /* مکث طبیعی → نشستِ بعدی با نمونهٔ تازه (fieldRef به‌روز است) */
      window.setTimeout(() => {
        if (stopReqRef.current || sessionIdRef.current !== myId) return;
        beginSession();
      }, 250);
    };

    rec.onerror = (ev: any) => {
      if (sessionIdRef.current !== myId) return;
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        hardStop("دسترسی به میکروفون رد شد — از نوار آدرس مرورگر اجازه بدهید.");
      } else if (ev.error === "network") {
        hardStop("تشخیص صوتی به اینترنت نیاز دارد — در نسخهٔ نصب‌شده (PWA) اتصال را بررسی کنید.");
      } else if (ev.error === "audio-capture") {
        hardStop("میکروفون پیدا نشد — اتصال میکروفون را بررسی کنید.");
      } else if (ev.error === "aborted") {
        activeRef.current = false;
      }
      /* no-speech خود به onend می‌رود و نشست بعدی شروع می‌شود */
    };

    recRef.current = rec;
    activeRef.current = true;
    try {
      rec.start();
      setListening(true);
      setHeard("");
    } catch {
      activeRef.current = false;
      setListening(false);
    }
  };

  const toggle = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!supported) {
      toast("warn", "مرورگر شما از تایپ صوتی پشتیبانی نمی‌کند — Chrome را امتحان کنید.");
      return;
    }
    if (activeRef.current || listening) {
      stopReqRef.current = true;
      activeRef.current = false;
      sessionIdRef.current++; /* باطل‌کردن نشست در حال اجرا */
      try { recRef.current?.stop(); } catch { /* ignore */ }
      setListening(false);
      setHeard("");
      return;
    }
    stopReqRef.current = false;
    fieldRef.current = baseText.trim(); /* snapshot هنگام شروع */
    beginSession();
  };

  return (
    <span className="inline-flex flex-col gap-1.5 w-full">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={listening ? "توقف ضبط" : supported ? "تایپ صوتی (فارسی) — به متن موجود اضافه می‌کند" : "تایپ صوتی پشتیبانی نمی‌شود"}
        className="flex items-center gap-2 self-start px-3.5 py-2 rounded-xl text-[12px] font-black transition-all duration-200 cursor-pointer active:scale-95"
        style={{
          background: listening ? "color-mix(in srgb, var(--fp-coral) 16%, transparent)" : "var(--fp-bg3)",
          color: listening ? "var(--fp-coral)" : "var(--fp-text2)",
          border: `1px solid ${listening ? "var(--fp-coral)" : "var(--fp-border2)"}`,
          boxShadow: listening ? "0 0 0 3px color-mix(in srgb, var(--fp-coral) 18%, transparent)" : "none",
        }}
      >
        <span className="relative grid place-items-center">
          {listening
            ? <MicOff className="w-4 h-4" />
            : <Mic className="w-4 h-4" />}
          {listening && (
            <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full pulse-soft" style={{ background: "var(--fp-coral)" }} />
          )}
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

/* ================= دکمه‌های ویرایش و حذف — پررنگ و همیشه‌نمای ================= */
export function EditBtn({ onClick, title = "ویرایش" }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
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
      className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
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
