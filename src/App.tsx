/* ---------- پوسته: مسیریابی، ورود/ثبت‌نام، جستجو، یادآوری، نوار بازگشت ---------- */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, CalendarDays, Coins, Download, LayoutDashboard, List, LogOut, Mic, Moon,
  PieChart, Plus, RotateCcw, Search, Settings, SlidersHorizontal, StickyNote, Sun, Sunrise, Target, X,
} from "lucide-react";
import { THEMES, applyAccent, readAccent, themeById } from "./lib/themes";
import { pushToCloud, pullFromCloud, effectivePrefs, getCloud, saveCloud, localOnlyTx, mergePulledState, sameLedgerContent } from "./lib/cloud";
import { DataProvider, useStore } from "./lib/data";
import {
  deleteAccount, getSession, guestLogin, login, logout, signup, type User,
} from "./lib/auth";
import { faDate, faMoney, faNum, faTime, fireNotification, jalaliDateStr, localISODate, playChime, relTime, useNow } from "./lib/utils";
import { ToastProvider, useToast, Modal, TInput, Field, CatGlyph } from "./ui";
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
  return (
    <ToastProvider>
      {user ? (
        <DataProvider key={user.id} userId={user.id}>
          <Shell user={user} onLogout={() => { logout(); setUser(null); }} onDelete={() => { deleteAccount(user.id); setUser(null); }} />
        </DataProvider>
      ) : (
        <AuthScreen onAuthed={setUser} />
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
    toast("ok", mode === "login" ? `خوش آمدید، ${r.user!.name}!` : "حساب ساخته شد — دفترکل نمونه برایتان آماده است.");
    onAuthed(r.user!);
  };

  return (
    <div className="min-h-screen app-texture relative overflow-hidden">
      <div className="absolute inset-0 grid-lines" />
      <div className="noise-layer" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 min-h-screen grid lg:grid-cols-2 items-center gap-10 py-10">
        {/* برند */}
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

        {/* فرم */}
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

/* باکس فعال‌سازی اتصال ابری — از همان صفحهٔ ورود */
function CloudConnectBox() {
  const toast = useToast();
  const [cfg, setCfg] = useState(() => getCloud());
  const [open, setOpen] = useState(() => !getCloud());
  const [url, setUrl] = useState(cfg?.url ?? "");
  const [key, setKey] = useState(cfg?.key ?? "");

  const save = () => {
    const u = url.trim();
    const k = key.trim();
    if (!u || !k) return toast("warn", "آدرس پروژه و کلید anon را کامل وارد کنید.");
    saveCloud({ url: u, key: k });
    setCfg({ url: u, key: k });
    setOpen(false);
    toast("ok", "اتصال Supabase فعال شد — حالا با حساب دستگاه دیگر وارد شوید.");
  };

  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        borderColor: cfg ? "color-mix(in srgb, var(--fp-mint) 45%, transparent)" : "color-mix(in srgb, var(--fp-accent) 45%, transparent)",
        background: cfg ? "color-mix(in srgb, var(--fp-mint) 7%, transparent)" : "color-mix(in srgb, var(--fp-accent) 6%, transparent)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11.5px] font-black flex items-center gap-1.5"
          style={{ color: cfg ? "var(--fp-mint)" : "var(--fp-accent)" }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cfg ? "pulse-soft" : "blink-dot"}`} style={{ background: "currentColor" }} />
          {cfg ? "اتصال ابری فعال — ورود از همهٔ دستگاه‌ها" : "اتصال Supabase تنظیم نیست"}
        </span>
        <button
          className="text-[10.5px] font-black underline underline-offset-2 cursor-pointer"
          style={{ color: "var(--fp-text3)" }}
          onClick={() => setOpen((o) => !o)}
        >
          {cfg ? "ویرایش" : "فعال‌سازی"}
        </button>
      </div>
      {!cfg && !open && (
        <p className="text-[10.5px] font-bold mt-1.5 leading-5" style={{ color: "var(--fp-text3)" }}>
          بدون اتصال، حساب‌ها فقط در همین مرورگر ذخیره می‌شوند.
        </p>
      )}
      {open && (
        <div className="grid gap-2 mt-3">
          <input
            dir="ltr"
            className="input !py-2 !text-[11.5px]"
            placeholder="https://xxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            dir="ltr"
            type="password"
            className="input !py-2 !text-[11.5px]"
            placeholder="anon public key (eyJ…)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <button className="btn btn-mint btn-sm" onClick={save}>
            ذخیرهٔ اتصال
          </button>
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

  /* جست‌وجوی صوتی: گفتن عبارت به‌جای تایپ */
  const voiceSearch = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast("warn", "مرورگر شما از جست‌وجوی صوتی پشتیبانی نمی‌کند — Chrome را امتحان کنید.");
    if (activeRecRef.current) return;
    const rec = new SR();
    rec.lang = "fa-IR";
    rec.interimResults = true;
    rec.continuous = false;
    let heard = "";
    activeRecRef.current = true;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) heard += e.results[i][0].transcript;
      }
      if (heard.trim()) { setQ(heard.trim()); setOpen(true); }
    };
    rec.onend = () => { setListening(false); activeRecRef.current = false; };
    rec.onerror = (e: any) => {
      setListening(false); activeRecRef.current = false;
      if (e.error === "not-allowed") toast("err", "دسترسی به میکروفون رد شد — از نوار آدرس اجازه بده.");
      else if (e.error === "no-speech") toast("warn", "صدایی شنیده نشد — دوباره بزن و صحبت کن.");
    };
    try { rec.start(); setListening(true); } catch { activeRecRef.current = false; }
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const term = q.trim().toLowerCase();
  const has = term.length >= 2;
  const match = (s?: string) => !!s && s.toLowerCase().includes(term);

  const txs = has ? state.transactions.filter((t) =>
    match(t.note) || match(t.title) ||
    match(state.categories.find((c) => c.id === t.categoryId)?.name) ||
    match(state.accounts.find((a) => a.id === t.accountId)?.name)
  ).slice(0, 5) : [];
  const notes = has ? state.notes.filter((n) => match(n.title) || match(n.body) || match(n.cat)).slice(0, 4) : [];
  const appts = has ? state.appointments.filter((a) => match(a.title) || match(a.note)).slice(0, 4) : [];
  const cats = has ? state.categories.filter((c) => match(c.name)).slice(0, 3) : [];
  const empty = has && txs.length + notes.length + appts.length + cats.length === 0;

  const go = (page: PageId, drill?: { cat?: string; query?: string }) => {
    onNavigate(page, drill);
    setQ(""); setOpen(false);
  };

  const groupTitle = (icon: React.ReactNode, label: string, count: number) => (
    <p className="flex items-center gap-1.5 text-[10.5px] font-black px-3 pt-2.5 pb-1" style={{ color: "var(--fp-text3)" }}>
      <span style={{ color: "var(--fp-accent)" }}>{icon}</span>{label}
      <span className="tabular">({faNum(count)})</span>
    </p>
  );

  return (
    <div ref={boxRef} className="relative flex-1 max-w-sm mx-auto">
      <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" style={{ color: "var(--fp-text3)" }} />
      <input
        className="input !py-2 !ps-9 !pe-10 !text-[12.5px]"
        placeholder={listening ? "در حال گوش دادن…" : "جست‌وجو — تایپ کن یا بگو 🎙"}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && has) go("transactions", { query: q }); }}
      />
      <button onClick={voiceSearch} title="جست‌وجوی صوتی — عبارت را بگو"
        className="absolute top-1/2 -translate-y-1/2 end-2 w-7 h-7 rounded-lg grid place-items-center cursor-pointer transition-all duration-150 hover:scale-110 active:scale-95"
        style={{
          background: listening ? "color-mix(in srgb, var(--fp-coral) 16%, transparent)" : "transparent",
          color: listening ? "var(--fp-coral)" : "var(--fp-text3)",
          boxShadow: listening ? "0 0 0 3px color-mix(in srgb, var(--fp-coral) 15%, transparent)" : "none",
        }}>
        <span className="relative grid place-items-center">
          <Mic className="w-4 h-4" />
          {listening && <i className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 rounded-full pulse-soft not-italic" style={{ background: "var(--fp-coral)" }} />}
        </span>
      </button>
      {open && has && (
        <div className="absolute top-full inset-x-0 mt-2 rounded-xl border shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
          style={{ background: "var(--fp-bg)", borderColor: "var(--fp-border2)" }}>
          {empty && (
            <p className="text-[12px] font-bold p-4 text-center" style={{ color: "var(--fp-text3)" }}>چیزی با «{q}» پیدا نشد.</p>
          )}
          {txs.length > 0 && groupTitle(<List className="w-3.5 h-3.5" />, "تراکنش‌ها", txs.length)}
          {txs.map((t) => {
            const c = state.categories.find((x) => x.id === t.categoryId);
            return (
              <button key={t.id} onClick={() => go("transactions", { query: t.note || t.title })}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-start cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--fp-mint)_7%,transparent)]">
                <CatGlyph icon={c?.icon} color={c?.color} className="w-6 h-6 rounded-lg" iconClass="w-3 h-3" />
                <span className="flex-1 min-w-0 text-[12px] font-bold truncate">{t.note || t.title}</span>
                <span className="text-[10.5px] font-bold tabular shrink-0" style={{ color: "var(--fp-text3)" }}>{faDate(t.date)}</span>
                <span className="text-[11.5px] font-black tabular shrink-0" style={{ color: t.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                  {t.type === "income" ? "+" : "−"}{faMoney(t.amount)}
                </span>
              </button>
            );
          })}
          {notes.length > 0 && groupTitle(<StickyNote className="w-3.5 h-3.5" />, "یادداشت‌ها", notes.length)}
          {notes.map((n) => (
            <button key={n.id} onClick={() => go("notes")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-start cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--fp-mint)_7%,transparent)]">
              <i className="w-2 h-2 rounded-full not-italic shrink-0" style={{ background: n.color }} />
              <span className="flex-1 min-w-0 text-[12px] font-bold truncate">{n.title}</span>
              <span className="text-[10.5px] font-bold tabular shrink-0" style={{ color: "var(--fp-text3)" }}>{faDate(n.date)}</span>
            </button>
          ))}
          {appts.length > 0 && groupTitle(<CalendarDays className="w-3.5 h-3.5" />, "قرارها", appts.length)}
          {appts.map((a) => (
            <button key={a.id} onClick={() => go("appointments")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-start cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--fp-mint)_7%,transparent)]">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--fp-accent)" }} />
              <span className="flex-1 min-w-0 text-[12px] font-bold truncate">{a.title}</span>
              <span className="text-[10.5px] font-bold tabular shrink-0" style={{ color: "var(--fp-text3)" }}>{faDate(a.date)} · {faNum(a.time)}</span>
            </button>
          ))}
          {cats.length > 0 && groupTitle(<Target className="w-3.5 h-3.5" />, "دسته‌ها", cats.length)}
          {cats.map((c) => (
            <button key={c.id} onClick={() => go("transactions", { cat: c.id })}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-start cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--fp-mint)_7%,transparent)]">
              <i className="w-2 h-2 rounded-full not-italic shrink-0" style={{ background: c.color }} />
              <span className="flex-1 min-w-0 text-[12px] font-bold truncate">{c.name}</span>
              <span className="text-[10.5px] font-bold shrink-0" style={{ color: "var(--fp-text3)" }}>{c.type === "income" ? "درآمد" : "هزینه"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= پوستهٔ اصلی ================= */
function Shell({ user, onLogout, onDelete }: { user: User; onLogout: () => void; onDelete: () => void }) {
  const { state, mutate, purgeTrash } = useStore();
  const toast = useToast();
  const now = useNow();
  const [page, setPage] = useState<PageId>("dashboard");
  const [drill, setDrill] = useState<{ cat?: string; query?: string; key: number }>({ key: 0 });
  const [quickAdd, setQuickAdd] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinErr, setPinErr] = useState(false);
  /* شناسهٔ قرارهایی که «یک‌ساعت‌قبل» یادآوری شده‌اند — هر قرار مستقل یادآوری می‌شود
     (نه یک boolean سراسری که بعد از اولین مورد، بقیه را برای همیشه خاموش می‌کرد) */
  const remindedIdsRef = useRef<Set<string>>(new Set());

  /* ---------- نصب PWA ---------- */
  const [installEvt, setInstallEvt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const doInstall = async () => {
    if (!installEvt) return;
    (installEvt as Event & { prompt: () => void }).prompt();
    await (installEvt as Event & { userChoice: Promise<{ outcome: string }> }).userChoice;
    setInstallEvt(null);
  };

  /* تم */
  useEffect(() => {
    const t = state.prefs.theme ?? "dark";
    document.documentElement.classList.toggle("light", t === "light");
    try { localStorage.setItem("fp_theme", t); } catch { /* ignore */ }
  }, [state.prefs.theme]);

  /* تم رنگی ترکیبی */
  useEffect(() => {
    applyAccent(state.prefs.accent ?? readAccent());
  }, [state.prefs.accent]);

  /* ---------- همگام‌سازی ابریِ چنددستگاهه ----------
     کلید سینک از «نام کاربری» ساخته می‌شود تا همهٔ دستگاه‌های یک کاربر به یک ردیف
     مشترک در Supabase وصل باشند. شمارندهٔ نسخه (rev) تعیین می‌کند کدام داده جدیدتر
     است؛ دستگاه تازه‌وارد به‌جای پاک کردن، دادهٔ دستگاه اصلی را از ابر بازیابی می‌کند. */
  const stateRef = useRef(state);
  stateRef.current = state;
  const pushedRef = useRef("");
  const reconciledRef = useRef(false);
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const cloudSyncId = "fp-user-" + user.username;
  const syncOn = (() => {
    const e = effectivePrefs(state.prefs);
    return !!(e.syncUrl && e.syncKey);
  })();

  /* شناسهٔ نمایشی سینک را هم‌نام کلید ابری نگه می‌داریم */
  useEffect(() => {
    if (state.prefs.syncId !== cloudSyncId) {
      mutate((d) => { d.prefs.syncId = cloudSyncId; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSyncId]);

  /* سازش‌گیری: اول از ابر بخوان؛ اگر ابر جدیدتر بود جایگزین کن، وگرنه محلی را بفرست */
  const reconcile = useCallback(async () => {
    const s = stateRef.current;
    const ep = effectivePrefs(s.prefs);
    if (!ep.syncUrl || !ep.syncKey) return;
    try {
      const pull = await pullFromCloud(ep, cloudSyncId);
      if (!pull.ok) {
        /* خطای واقعی (شبکه/کلید) — چیزی نمی‌فرستیم تا دادهٔ ابر اشتباهی پاک نشود */
      } else if (pull.state && (pull.state.rev ?? 0) > (s.rev ?? 0)) {
        if (sameLedgerContent(s, pull.state)) {
          /* محتوای ابر با محلی یکسان است و فقط شمارهٔ نسخه جلوتر است —
             کاری لازم نیست. این گارد جلوی چرخهٔ بی‌پایانِ «ادغام + لاگ + ارسال»
             بین دستگاه‌هایی را می‌گیرد که ساعتشان چند ثانیه اختلاف دارد. */
        } else {
          /* ابر جدیدتر است — دادهٔ دستگاه اصلی را بازیابی کن،
             اما تراکنش‌های محلیِ سینک‌نشده را حفظ کن (جلوگیری از گم شدن تغییرات) */
          const pulled = pull.state;
          const keepCount = localOnlyTx(s, pulled).length;
          mutateRef.current((d) => { mergePulledState(d, pulled); }, "بازیابی داده‌ها از ابر");
          toastRef.current("ok", keepCount > 0
            ? `از ابر بازیابی شد و ${faNum(keepCount)} تراکنش محلیِ تازه هم حفظ شد.`
            : "تراکنش‌های شما از ابر بازیابی شد.");
        }
      } else {
        /* ابر خالی یا قدیمی‌تر است — فرستادن محلی امن است */
        await pushToCloud(s, ep, cloudSyncId);
      }
    } catch { /* شبکه قطع است — از دادهٔ محلی استفاده می‌شود */ }
    reconciledRef.current = true;
    pushedRef.current = JSON.stringify(stateRef.current);
  }, [cloudSyncId]);

  /* هنگام فعال شدن سینک و هر ۹۰ ثانیه، سازش‌گیری کن */
  useEffect(() => {
    if (!syncOn) return;
    reconciledRef.current = false;
    reconcile();
    const id = setInterval(reconcile, 90000);
    return () => clearInterval(id);
  }, [syncOn, reconcile]);

  /* بعد از سازش‌گیری اولیه، هر تغییر محلی با دیباونس «سازش‌گیری» می‌کند —
     نه ارسال کورکورانه: ابتدا ابر خوانده می‌شود و اگر ابر جدیدتر باشد ادغام
     می‌شود، وگرنه محلی فرستاده می‌شود. این‌طوری نسخهٔ قدیمیِ یک دستگاه هرگز
     جای دادهٔ جدیدترِ دستگاه دیگر را نمی‌گیرد (ریشهٔ باگ عوض‌شدن خودبه‌خود). */
  useEffect(() => {
    if (!syncOn || !reconciledRef.current) return;
    const id = setTimeout(async () => {
      const json = JSON.stringify(stateRef.current);
      if (json === pushedRef.current) return;
      pushedRef.current = json;
      await reconcile();
    }, 3500);
    return () => clearTimeout(id);
  }, [state, syncOn, reconcile]);

  /* قفل پین */
  useEffect(() => {
    if (state.prefs.pinEnabled && state.prefs.pin) setLocked(true);
  }, []);

  /* یادآوری قرارها — اعلان یک‌ساعت‌قبل.
     هر قرار با شناسهٔ خودش در Set ثبت می‌شود تا «هر قرار جدا و مستقل» یادآوری شود؛
     اگر در یک روز چند قرار نزدیک‌به‌هم باشد، برای همه‌شان (نه فقط اولی) توست می‌آید. */
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

  /* ---------- زنگِ سرِ ساعت ----------
     هر ۱۵ ثانیه بررسی می‌شود؛ وقتی وقتِ یک قرار برسد، زنگ صوتی + اعلان سیستم
     پخش می‌شود (از Service Worker تا حتی وقتی برنامه در پس‌زمینه است). */
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
  }, [now]);

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
        {/* سایدبار دسکتاپ */}
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

        {/* بدنه */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* تاپ‌بار */}
          <header className="sticky top-0 z-40 border-b backdrop-blur-md no-print" style={{ borderColor: "var(--fp-border)", background: "color-mix(in srgb, var(--fp-bg) 78%, transparent)" }}>
            <div className="flex items-center gap-2.5 px-4 lg:px-8 h-16">
              <span className="lg:hidden"><BrandMark /></span>
              <p className="font-display text-xl hidden sm:block">{NAV.find((n) => n.id === page)?.label}</p>

              <GlobalSearch onNavigate={(p, drill) => { setDrill({ ...drill, key: Date.now() }); setPage(p); }} />

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
                <SettingsPage user={user} onLogout={onLogout} onDelete={onDelete}
                  onLock={() => setLocked(true)} />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ناوبری موبایل */}
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

/* تگ سینک */
function SyncBadge() {
  const { state } = useStore();
  const e = effectivePrefs(state.prefs);
  const on = !!e.syncUrl && !!e.syncKey;
  return (
    <span className="hidden md:flex items-center gap-1.5 text-[10.5px] font-black px-2.5 py-1.5 rounded-full border"
      style={{ borderColor: "var(--fp-border)", color: on ? "var(--fp-mint)" : "var(--fp-text3)" }}
      title={on ? `آخرین سینک: ${relTime(state.lastSync)}` : "سینک ابری غیرفعال — از تنظیمات وصل کنید"}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "pulse-soft" : "blink-dot"}`} style={{ background: "currentColor" }} />
      {on ? "سینک" : "آفلاین"}
    </span>
  );
}

function ThemeToggle() {
  const { state, mutate } = useStore();
  const dark = state.prefs.theme !== "light";
  return (
    <button
      className="icon-btn"
      title={dark ? "تم روشن" : "تم تیره"}
      onClick={() => mutate((d) => { d.prefs.theme = dark ? "light" : "dark"; }, dark ? "تم روشن شد" : "تم تیره شد")}
    >
      {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
}

/* دکمهٔ چرخش تم‌های رنگی ترکیبی */
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
      }}
    >
      <span className="brand-swatch w-5 h-5 rounded-full block transition-transform duration-200 hover:scale-110"
        style={{ boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

/* نوار بازگشت ۳۰ ثانیه */
function UndoBar() {
  const { state, restore, purgeTrash } = useStore();
  const now = useNow(200);
  useEffect(() => { purgeTrash(); }, [now]);
  /* همهٔ حذف‌های هنوز-منقضی‌نشده — هرکدام جداگانه قابل بازگشت */
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
