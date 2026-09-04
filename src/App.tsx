/* ---------- پوسته: مسیریابی، ورود/ثبت‌نام، جستجو، یادآوری، نوار بازگشت ---------- */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3, CalendarDays, Coins, Download, LayoutDashboard, List, LogOut, Mic, Moon,
  PieChart, Plus, RotateCcw, Search, Settings, SlidersHorizontal, StickyNote, Sun, Sunrise, X,
} from "lucide-react";
import { THEMES, applyAccent, readAccent, themeById } from "./lib/themes";
import {
  pushToCloud, pullFromCloud, effectivePrefs, getCloud, saveCloud, envCloud,
  mergePulledState, sameLedgerContent,
  readSyncStatus, writeSyncStatus, type SyncStatus,
} from "./lib/cloud";
import { DataProvider, useStore } from "./lib/data";
import {
  deleteAccount, getSession, guestLogin, login, logout, signup, type User,
} from "./lib/auth";
import { faNum, faTime, fireNotification, jalaliDateStr, localISODate, playChime, relTime, useNow } from "./lib/utils";
import { ToastProvider, useToast, TInput, Field, CatGlyph, appendSmart } from "./ui";
import { DashboardPage, TransactionsPage, CategoriesPage, DebtsPage, TxModal } from "./pages";
import { AppointmentsPage, DailyPage, NotesPage, ReportsPage, ManagePage, SettingsPage } from "./pages2";

type PageId = "dashboard" | "daily" | "transactions" | "categories" | "debts" | "appointments" | "notes" | "reports" | "manage" | "settings";

const NAV: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "داشبورد", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { id: "daily", label: "روزانه", icon: <Sunrise className="w-[18px] h-[18px]" /> },
  { id: "transactions", label: "تراکنش‌ها", icon: <List className="w-[18px] h-[18px]" /> },
  { id: "categories", label: "گزارش دسته‌ها", icon: <PieChart className="w-[18px] h-[18px]" /> },
  { id: "debts", label: "بدهی‌ها", icon: <Coins className="w-[18px] h-[18px]" /> },
  { id: "appointments", label: "قرارها", icon: <CalendarDays className="w-[18px] h-[18px]" /> },
  { id: "notes", label: "یادداشت‌ها", icon: <StickyNote className="w-[18px] h-[18px]" /> },
  { id: "reports", label: "گزارش‌ها", icon: <BarChart3 className="w-[18px] h-[18px]" /> },
  { id: "manage", label: "مدیریت", icon: <SlidersHorizontal className="w-[18px] h-[18px]" /> },
  { id: "settings", label: "تنظیمات", icon: <Settings className="w-[18px] h-[18px]" /> },
];

export default function App() {
  const [user, setUser] = useState<User | null>(() => getSession());
  const [gen, setGen] = useState(0);
  const consumeFresh = () => {
    try {
      const f = sessionStorage.getItem("fp_fresh_signup") === "1";
      sessionStorage.removeItem("fp_fresh_signup");
      return f;
    } catch { return false; }
  };
  return (
    <ToastProvider>
      {user ? (
        <DataProvider key={`${user.id}:${gen}`} userId={user.id} fresh={consumeFresh()}>
          <Shell user={user} onLogout={() => { logout(); setUser(null); }} onDelete={() => { deleteAccount(user.id); setUser(null); }} />
        </DataProvider>
      ) : (
        <AuthScreen onAuthed={(u) => { setUser(u); setGen((g) => g + 1); }} />
      )}
    </ToastProvider>
  );
}

/* ================= صفحهٔ ورود ================= */
function AuthScreen({ onAuthed }: { onAuthed: (u: User) => void }) {
  const toast = useToast();
  useEffect(() => { applyAccent(readAccent()); }, []);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const r = mode === "login" ? await login(username, pass) : signup(name, username, pass);
    setBusy(false);
    if (r.error) return toast("err", r.error);
    try {
      if (mode === "signup") sessionStorage.setItem("fp_fresh_signup", "1");
      else sessionStorage.removeItem("fp_fresh_signup");
    } catch { /* ignore */ }
    toast("ok", mode === "login"
      ? `خوش آمدید، ${r.user!.name}!`
      : "حساب ساخته شد — دفترکل نمونه برایتان آماده است (از مدیریت قابل پاک‌کردن است).");
    onAuthed(r.user!);
  };

  return (
    <div className="min-h-screen app-texture relative overflow-hidden">
      <div className="absolute inset-0 grid-lines" />
      <div className="noise-layer" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 min-h-screen grid lg:grid-cols-2 items-center gap-10 py-10">
        <div className="rise-in">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="font-display text-4xl leading-none">فایننس‌پرو</p>
              <p className="text-[11.5px] font-black tracking-wide mt-1" style={{ color: "var(--fp-text3)" }} dir="ltr">FinancePro — Digital Ledger</p>
            </div>
          </div>
          <h1 className="font-display text-[42px] md:text-6xl leading-[1.2] mt-7">
            دفترکلِ دیجیتالِ
            <br />
            <span style={{ color: "var(--fp-accent)" }}>پولِ شما</span> — به فارسی
          </h1>
          <p className="text-[14px] font-bold leading-8 mt-4 max-w-md" style={{ color: "var(--fp-text2)" }}>
            تقویم شمسی، اعداد فارسی، ربات تلگرام و همگام‌سازی ابری —
            همهٔ درآمد و خرج‌تان یک‌جا، حتی آفلاین.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {["تقویم شمسی", "PWA و آفلاین", "ربات تلگرام", "خروجی اکسل", "حذف با بازگشت ۳۰ ثانیه"].map((f) => (
              <span key={f} className="chip !cursor-default !py-1.5">{f}</span>
            ))}
          </div>
          <div className="card p-4 mt-8 max-w-sm flex items-center gap-3.5">
            <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: "color-mix(in srgb, var(--fp-mint) 14%, transparent)", color: "var(--fp-mint)" }}>
              <CalendarDays className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[12.5px] font-black">{jalaliDateStr()}</p>
              <p className="text-[10.5px] font-bold mt-0.5" style={{ color: "var(--fp-text3)" }}>ذخیره به میلادی، نمایش به شمسی — همیشه.</p>
            </div>
          </div>
        </div>

        <div className="card p-6 md:p-8 rise-in" style={{ ["--d" as string]: "120ms" }}>
          <div className="flex rounded-xl p-1 gap-1 mb-6" style={{ background: "var(--fp-bg)" }}>
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 rounded-lg py-2.5 text-[13px] font-black transition-all cursor-pointer"
                style={{ background: mode === m ? "var(--fp-accent)" : "transparent", color: mode === m ? "#071b16" : "var(--fp-text3)" }}>
                {m === "login" ? "ورود" : "ثبت‌نام"}
              </button>
            ))}
          </div>
          <div className="grid gap-4">
            {mode === "signup" && (
              <Field label="نام و نام خانوادگی"><TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: سارا رضایی" /></Field>
            )}
            <Field label="نام کاربری"><TInput dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="sara" /></Field>
            <Field label="رمز عبور"><TInput dir="ltr" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && submit()} /></Field>
            <button className="btn btn-gold !py-3 !text-[14px]" onClick={submit} disabled={busy}>
              {busy ? "در حال بررسی…" : mode === "login" ? "ورود به دفترکل" : "ساخت حساب و شروع"}
            </button>

            <CloudConnectBox />

            <button className="btn btn-ghost" onClick={() => onAuthed(guestLogin())}>
              ادامه به‌صورت مهمان — بدون ثبت‌نام
            </button>
            <p className="text-[10.5px] font-bold text-center leading-5" style={{ color: "var(--fp-text3)" }}>
              هر کاربر دادهٔ کاملاً جداگانه دارد؛ رمز به‌صورت هش ذخیره می‌شود.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloudConnectBox() {
  const toast = useToast();
  /* اتصال مؤثر: اولویت با تنظیم دستیِ ذخیره‌شده در مرورگر، بعد متغیرهای محیطی Vercel */
  const envCfg = envCloud();
  const [localCfg, setLocalCfg] = useState(() => getCloud());
  const cfg = localCfg ?? envCfg;
  const source: "manual" | "env" | null = localCfg ? "manual" : envCfg ? "env" : null;
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");

  const save = () => {
    const u = url.trim();
    const k = key.trim();
    if (!u || !k) return toast("warn", "آدرس پروژه و کلید anon را کامل وارد کنید.");
    saveCloud({ url: u, key: k });
    setLocalCfg({ url: u, key: k });
    setOpen(false);
    toast("ok", "اتصال Supabase فعال شد — حالا با حساب دستگاه دیگر وارد شوید.");
  };

  /* بازکردن فرم با مقادیر مؤثر فعلی تا کاربر چیزی را از دست ندهد */
  const openForm = () => {
    setUrl(cfg?.url ?? "");
    setKey(cfg?.key ?? "");
    setOpen((o) => !o);
  };

  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        borderColor: cfg ? "color-mix(in srgb, var(--fp-mint) 45%, transparent)" : "color-mix(in srgb, var(--fp-accent) 45%, transparent)",
        background: cfg ? "color-mix(in srgb, var(--fp-mint) 7%, transparent)" : "color-mix(in srgb, var(--fp-accent) 6%, transparent)",
      }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-black flex items-center gap-1.5"
          style={{ color: cfg ? "var(--fp-mint)" : "var(--fp-accent)" }}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg ? "pulse-soft" : "blink-dot"}`} style={{ background: "currentColor" }} />
          {source === "env"
            ? "اتصال ابری فعال — از متغیرهای محیطی Vercel ✅"
            : source === "manual"
              ? "اتصال ابری فعال — ورود از همهٔ دستگاه‌ها"
              : "اتصال ابری (اختیاری) — برای سینک بین دستگاه‌ها"}
        </span>
        <button className="text-[10.5px] font-black underline underline-offset-2 cursor-pointer"
          style={{ color: "var(--fp-text3)" }}
          onClick={openForm}>
          {cfg ? "ویرایش" : "فعال‌سازی"}
        </button>
      </div>
      {source === "env" && !open && (
        <p className="text-[10.5px] font-bold mt-1.5 leading-5" style={{ color: "var(--fp-text3)" }}>
          آدرس و کلید Supabase به‌طور خودکار خوانده شدند — نیازی به وارد کردن دستی نیست.
        </p>
      )}
      {!cfg && !open && (
        <p className="text-[10.5px] font-bold mt-1.5 leading-5" style={{ color: "var(--fp-text3)" }}>
          بدون اتصال، حساب‌ها فقط در همین مرورگر ذخیره می‌شوند.
        </p>
      )}
      {open && (
        <div className="grid gap-2 mt-3">
          <input dir="ltr" className="input !py-2 !text-[11.5px]" placeholder="https://xxx.supabase.co"
            value={url} onChange={(e) => setUrl(e.target.value)} />
          <input dir="ltr" type="password" className="input !py-2 !text-[11.5px]" placeholder="anon public key (eyJ…)"
            value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="btn btn-mint btn-sm" onClick={save}>ذخیرهٔ اتصال</button>
        </div>
      )}
    </div>
  );
}

export function BrandMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-12 h-12 shrink-0">
      <rect width="48" height="48" rx="12" fill="var(--fp-pine)" />
      <rect x="1" y="1" width="46" height="46" rx="11" fill="none" stroke="var(--fp-border2)" />
      <path d="M14 32V18l10 9 10-9v14" stroke="var(--fp-accent)" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="12" r="2.4" fill="var(--fp-mint)" />
    </svg>
  );
}

/* ---------- جست‌وجوی سراسری (تراکنش + یادداشت + قرار + دسته) ---------- */
function GlobalSearch({ onNavigate }: {
  onNavigate: (page: PageId, drill?: { cat?: string; query?: string }) => void;
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
    <div ref={boxRef} className="relative flex-1 max-w-sm mx-auto">
      <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" style={{ color: "var(--fp-text3)" }} />
      <input
        className="input !py-2 !ps-9 !pe-10 !text-[12.5px]"
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
                    <span className="flex-1 text-[12px] font-bold truncate">{c?.name ?? t.title}{t.note ? ` · ${t.note}` : ""}</span>
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

/* ================= پوستهٔ اصلی ================= */
function Shell({ user, onLogout, onDelete }: { user: User; onLogout: () => void; onDelete: () => void }) {
  const { state, mutate, restore, purgeTrash } = useStore();
  const toast = useToast();
  const now = useNow();
  const [page, setPage] = useState<PageId>("dashboard");
  const [drill, setDrill] = useState<{ cat?: string; query?: string; key: number }>({ key: 0 });
  const [quickAdd, setQuickAdd] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinErr, setPinErr] = useState(false);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  const remindedIdsRef = useRef<Set<string>>(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const reconciledRef = useRef(false);
  const pushedRef = useRef("");

  useEffect(() => {
    applyAccent(state.prefs.accent ?? readAccent());
  }, [state.prefs.accent]);

  useEffect(() => {
    const t = state.prefs.theme ?? "dark";
    document.documentElement.classList.toggle("light", t === "light");
    try { localStorage.setItem("fp_theme", t); } catch { /* ignore */ }
  }, [state.prefs.theme]);

  /* نصب PWA */
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    const hi = () => setInstalled(true);
    window.addEventListener("appinstalled", hi);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", hi); };
  }, []);
  const doInstall = async () => {
    if (!installEvt) return;
    const e = installEvt as Event & { prompt: () => Promise<void> };
    await e.prompt();
    setInstallEvt(null);
  };

  const cloudSyncId = "fp-user-" + user.username;
  const syncOn = (() => {
    const ep = effectivePrefs(state.prefs);
    return !!(ep.syncUrl && ep.syncKey);
  })();

  /* سازش‌گیری: اول بخوان، اگر ابر جدیدتر بود ادغام کن، وگرنه بفرست */
  const reconcile = useCallback(async () => {
    const s = stateRef.current;
    const ep = effectivePrefs(s.prefs);
    if (!ep.syncUrl || !ep.syncKey) return;
    try {
      const pull = await pullFromCloud(ep, cloudSyncId);
      if (pull.ok && pull.state && (pull.state.rev ?? 0) > (s.rev ?? 0)) {
        if (!sameLedgerContent(s, pull.state)) {
          mutateRef.current((d) => { mergePulledState(d, pull.state!); }, "بازیابی داده‌ها از ابر");
          toastRef.current("ok", "تراکنش‌های شما از ابر بازیابی شد.");
        }
      } else if (pull.ok) {
        await pushToCloud(s, ep, cloudSyncId);
      }
      writeSyncStatus({ ok: true, at: Date.now(), message: pull.message });
    } catch {
      writeSyncStatus({ ok: false, at: Date.now(), message: "خطا در سینک" });
    }
    reconciledRef.current = true;
    pushedRef.current = JSON.stringify(stateRef.current);
  }, [cloudSyncId]);

  /* هنگام بارگذاری: یک‌بار سازش‌گیری */
  useEffect(() => {
    if (!syncOn || reconciledRef.current) return;
    void reconcile();
  }, [syncOn, reconcile]);

  /* بعد از سازش‌گیری، هر تغییر محلی با دیباونس سازش‌گیری می‌کند */
  useEffect(() => {
    if (!syncOn || !reconciledRef.current) return;
    const id = setTimeout(() => {
      const json = JSON.stringify(stateRef.current);
      if (json === pushedRef.current) return;
      pushedRef.current = json;
      void reconcile();
    }, 3500);
    return () => clearTimeout(id);
  }, [state, syncOn, reconcile]);

  /* پولینگ هر ۹۰ ثانیه */
  useEffect(() => {
    if (!syncOn) return;
    const id = setInterval(() => { void reconcile(); }, 90000);
    return () => clearInterval(id);
  }, [syncOn, reconcile]);

  /* سینک دستی با کلیک روی نشانگر */
  useEffect(() => {
    const h = () => { void reconcile(); };
    window.addEventListener("fp-sync-now", h);
    return () => window.removeEventListener("fp-sync-now", h);
  }, [reconcile]);

  /* یادآوری قرارها (یک‌ساعت‌قبل) */
  useEffect(() => {
    const today = localISODate(now);
    const soon = state.appointments.find((a) => {
      if (a.date !== today || a.done || remindedIdsRef.current.has(a.id)) return false;
      const [h, m] = a.time.split(":").map(Number);
      const mins = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
      return mins >= 0 && mins <= 60;
    });
    if (soon) {
      remindedIdsRef.current.add(soon.id);
      toast("warn", `یادآوری: «${soon.title}» ساعت ${faNum(soon.time)} — تا یک ساعت دیگر`);
    }
  }, [state.appointments, now, toast]);

  /* زنگِ سرِ ساعت */
  useEffect(() => {
    if (!state.prefs.notifyEnabled) return;
    const today = localISODate(now);
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    for (const a of state.appointments) {
      if (a.date !== today || a.done) continue;
      const [h, m] = a.time.split(":").map(Number);
      const at = h * 3600 + m * 60;
      const key = `fp_ring_${a.id}_${a.date}`;
      if (nowSec >= at && nowSec < at + 60 && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        playChime(3);
        toast("warn", `🔔 وقتِ «${a.title}» رسید — ساعت ${faNum(a.time)}`);
        void fireNotification(`وقتِ «${a.title}» رسید`, `ساعت ${faNum(a.time)} — فایننس‌پرو`);
      }
    }
  }, [now, state.appointments, state.prefs.notifyEnabled, toast]);

  /* پاکسازی سطل */
  useEffect(() => {
    purgeTrash();
  }, [now, purgeTrash]);

  const tryPin = () => {
    const en = pinInput.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    if (en === state.prefs.pin) {
      setLocked(false); setPinInput("");
    } else {
      setPinErr(true); setPinInput("");
      setTimeout(() => setPinErr(false), 500);
    }
  };

  if (locked) {
    return (
      <div className="min-h-screen grid place-items-center app-texture relative">
        <div className="absolute inset-0 grid-lines" />
        <div className={`card p-8 w-full max-w-xs text-center relative z-10 ${pinErr ? "shake-x" : ""} pop-in`}>
          <BrandMark />
          <p className="font-display text-2xl mt-4">قفل پین</p>
          <p className="text-[11.5px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>برای باز کردن دفترکل، پین را وارد کنید</p>
          <TInput
            dir="ltr" type="password" inputMode="numeric" className="text-center !text-xl !tracking-[0.5em] mt-5"
            value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/[^\d۰-۹]/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && tryPin()} autoFocus
          />
          <button className="btn btn-gold w-full mt-4" onClick={tryPin}>باز کردن</button>
        </div>
      </div>
    );
  }

  const go = (p: PageId) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="min-h-screen app-texture relative">
      <div className="fixed inset-0 grid-lines pointer-events-none" />
      <div className="noise-layer" />

      <div className="relative z-10 flex">
        <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen border-e no-print" style={{ borderColor: "var(--fp-border)", background: "color-mix(in srgb, var(--fp-bg) 82%, transparent)" }}>
          <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
            <BrandMark />
            <div>
              <p className="font-display text-xl leading-none">فایننس‌پرو</p>
              <p className="text-[9.5px] font-black mt-1" style={{ color: "var(--fp-text3)" }} dir="ltr">FINANCEPRO v1.0</p>
            </div>
          </div>
          <nav className="grid gap-1 px-3">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-black transition-all duration-200 cursor-pointer"
                style={{
                  background: page === n.id ? "color-mix(in srgb, var(--fp-accent) 14%, transparent)" : "transparent",
                  color: page === n.id ? "var(--fp-accent)" : "var(--fp-text2)",
                  borderInlineStart: page === n.id ? "3px solid var(--fp-accent)" : "3px solid transparent",
                }}>
                {n.icon}{n.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto p-4">
            <div className="card p-3.5 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl grid place-items-center font-display text-lg shrink-0" style={{ background: "color-mix(in srgb, var(--fp-mint) 15%, transparent)", color: "var(--fp-mint)" }}>
                {user.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-black truncate">{user.name}</p>
                <p className="text-[10px] font-bold truncate" style={{ color: "var(--fp-text3)" }} dir="ltr">@{user.username}</p>
              </div>
              <button className="icon-btn !w-8 !h-8" title="خروج" onClick={onLogout}><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-40 border-b backdrop-blur-md no-print" style={{ borderColor: "var(--fp-border)", background: "color-mix(in srgb, var(--fp-bg) 78%, transparent)" }}>
            <div className="flex items-center gap-2.5 px-4 lg:px-8 h-16">
              <span className="lg:hidden"><BrandMark /></span>
              <p className="font-display text-xl hidden sm:block">{NAV.find((n) => n.id === page)?.label}</p>

              <GlobalSearch onNavigate={(p, d) => { setDrill({ ...d, key: Date.now() }); setPage(p); }} />

              <SyncBadge />
              {installEvt && !installed && (
                <button className="btn btn-mint btn-sm" onClick={doInstall} title="نصب روی دستگاه">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">نصب اپ</span>
                </button>
              )}
              <ThemeToggle />
              <AccentCycle />
              <button className="btn btn-gold btn-sm" onClick={() => setQuickAdd(true)}>
                <Plus className="w-4 h-4" strokeWidth={3} /> <span className="hidden sm:inline">ثبت</span>
              </button>
              <button className="icon-btn lg:hidden" onClick={onLogout} title="خروج"><LogOut className="w-[18px] h-[18px]" /></button>
            </div>
          </header>

          <main className="flex-1 px-4 lg:px-8 py-6 pb-28 lg:pb-10 max-w-[1200px] w-full mx-auto">
            <div key={page + drill.key}>
              {page === "dashboard" && <DashboardPage onQuickAdd={() => setQuickAdd(true)} />}
              {page === "daily" && <DailyPage />}
              {page === "transactions" && <TransactionsPage initQuery={drill.query} initCat={drill.cat} />}
              {page === "categories" && <CategoriesPage />}
              {page === "debts" && <DebtsPage />}
              {page === "appointments" && <AppointmentsPage />}
              {page === "notes" && <NotesPage />}
              {page === "reports" && <ReportsPage />}
              {page === "manage" && <ManagePage />}
              {page === "settings" && (
                <SettingsPage user={user} onLogout={onLogout} onDelete={onDelete} onLock={() => setLocked(true)} />
              )}
            </div>
          </main>
        </div>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-md no-print"
        style={{ borderColor: "var(--fp-border)", background: "color-mix(in srgb, var(--fp-bg) 85%, transparent)" }}>
        <div className="flex overflow-x-auto px-2 py-1.5 gap-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => go(n.id)}
              className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[9.5px] font-black shrink-0 transition-all cursor-pointer"
              style={{ color: page === n.id ? "var(--fp-accent)" : "var(--fp-text3)", background: page === n.id ? "color-mix(in srgb, var(--fp-accent) 12%, transparent)" : "transparent" }}>
              {n.icon}{n.label}
            </button>
          ))}
        </div>
      </nav>

      <UndoBar />
      <TxModal open={quickAdd} onClose={() => setQuickAdd(false)} />
    </div>
  );
}

function SyncBadge() {
  const { state } = useStore();
  const e = effectivePrefs(state.prefs);
  const on = !!e.syncUrl && !!e.syncKey;
  const [status, setStatus] = useState<SyncStatus | null>(() => readSyncStatus());
  const now = useNow(15000);
  void now;

  useEffect(() => {
    const h = () => setStatus(readSyncStatus());
    window.addEventListener("fp-sync-status", h);
    return () => window.removeEventListener("fp-sync-status", h);
  }, []);

  if (!on) {
    return (
      <span className="hidden md:flex items-center gap-1.5 text-[10.5px] font-black px-2.5 py-1.5 rounded-full border"
        style={{ borderColor: "var(--fp-border)", color: "var(--fp-text3)" }}
        title="سینک ابری غیرفعال — از تنظیمات وصل کنید">
        <span className="w-1.5 h-1.5 rounded-full blink-dot" style={{ background: "currentColor" }} />
        آفلاین
      </span>
    );
  }

  const ok = status?.ok !== false;
  const ago = status ? relTime(status.at) : relTime(state.lastSync);
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("fp-sync-now"))}
      className="hidden md:flex items-center gap-1.5 text-[10.5px] font-black px-2.5 py-1.5 rounded-full border cursor-pointer transition-transform hover:scale-105 active:scale-95"
      style={{
        borderColor: ok ? "color-mix(in srgb, var(--fp-mint) 45%, transparent)" : "color-mix(in srgb, var(--fp-coral) 55%, transparent)",
        color: ok ? "var(--fp-mint)" : "var(--fp-coral)",
        background: ok ? "color-mix(in srgb, var(--fp-mint) 7%, transparent)" : "color-mix(in srgb, var(--fp-coral) 9%, transparent)",
      }}
      title={ok
        ? `آخرین سینک موفق: ${ago}${status?.message ? " — " + status.message : ""} · برای سینک دستی کلیک کنید`
        : `سینک ناموفق (${ago}) — ${status?.message ?? "خطای نامشخص"} · برای تلاش دوباره کلیک کنید`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "pulse-soft" : ""}`} style={{ background: "currentColor" }} />
      {ok ? "همگام" : "خطای سینک"}
      {!ok && <RotateCcw className="w-3 h-3" />}
    </button>
  );
}

function ThemeToggle() {
  const { state, mutate } = useStore();
  const dark = state.prefs.theme !== "light";
  return (
    <button
      className="icon-btn"
      title={dark ? "تم روشن" : "تم تیره"}
      onClick={() => mutate((d) => { d.prefs.theme = dark ? "light" : "dark"; }, dark ? "تم روشن شد" : "تم تیره شد")}>
      {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
}

function AccentCycle() {
  const { state, mutate } = useStore();
  const cur = themeById(state.prefs.accent);
  const next = THEMES[(THEMES.findIndex((t) => t.id === cur.id) + 1) % THEMES.length];
  return (
    <button
      className="icon-btn"
      title={`تم رنگی: ${cur.name} — تغییر به ${next.name}`}
      onClick={() => {
        applyAccent(next.id);
        mutate((d) => { d.prefs.accent = next.id; }, `تم رنگی «${next.name}» فعال شد`);
      }}>
      <span className="brand-swatch w-5 h-5 rounded-full block transition-transform duration-200 hover:scale-110"
        style={{ background: `linear-gradient(135deg, ${next.accent} 0 52%, ${next.mint} 52%)`, boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function UndoBar() {
  const { state, restore, purgeTrash } = useStore();
  const now = useNow(200);
  useEffect(() => { purgeTrash(); }, [now, purgeTrash]);
  const pending = state.trash
    .map((e) => ({ e, remaining: e.until - now.getTime() }))
    .filter((x) => x.remaining > 0)
    .sort((a, b) => b.e.until - a.e.until);
  if (pending.length === 0) return null;
  return (
    <div className="fixed bottom-20 lg:bottom-6 inset-x-0 z-[110] px-4 pointer-events-none no-print">
      <div className="pointer-events-auto max-w-lg mx-auto grid gap-2">
        {pending.map(({ e, remaining }) => {
          const secs = Math.ceil(remaining / 1000);
          return (
            <div key={e.key} className="rounded-2xl border overflow-hidden slide-up shadow-2xl"
              style={{ background: "var(--fp-bg2)", borderColor: "color-mix(in srgb, var(--fp-accent) 50%, transparent)" }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: "color-mix(in srgb, var(--fp-accent) 15%, transparent)", color: "var(--fp-accent)" }}>
                  <RotateCcw className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-black truncate">«{e.label}» حذف شد</p>
                  <p className="text-[10.5px] font-bold tabular mt-0.5" style={{ color: "var(--fp-accent)" }}>
                    {faNum(secs)} ثانیه تا حذف دائم
                  </p>
                </div>
                <button className="btn btn-gold btn-sm" onClick={() => restore(e.key)}>بازگردانی</button>
                <button className="icon-btn !w-8 !h-8" onClick={purgeTrash} title="حذف فوری همه"><X className="w-4 h-4" /></button>
              </div>
              <div className="h-1" style={{ background: "var(--fp-bg3)" }}>
                <div className="h-full transition-[width] duration-200 ease-linear" style={{ width: `${(remaining / 30000) * 100}%`, background: "var(--fp-accent)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
