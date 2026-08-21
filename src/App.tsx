/* ---------- پوسته: مسیریابی، ورود/ثبت‌نام، جستجو، یادآوری، نوار بازگشت ---------- */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, CalendarDays, Coins, LayoutDashboard, List, LogOut, Moon,
  PieChart, Plus, RotateCcw, Search, Settings, SlidersHorizontal, Sun, X,
} from "lucide-react";
import { DataProvider, useStore } from "./lib/data";
import {
  deleteAccount, getSession, guestLogin, login, logout, signup, type User,
} from "./lib/auth";
import { faNum, faTime, jalaliDateStr, relTime, useNow } from "./lib/utils";
import { ToastProvider, useToast, Modal, TInput, Field } from "./ui";
import { DashboardPage, TransactionsPage, CategoriesPage, DebtsPage, TxModal } from "./pages";
import { AppointmentsPage, ReportsPage, ManagePage, SettingsPage } from "./pages2";

type PageId = "dashboard" | "transactions" | "categories" | "debts" | "appointments" | "reports" | "manage" | "settings";

const NAV: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "داشبورد", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { id: "transactions", label: "تراکنش‌ها", icon: <List className="w-[18px] h-[18px]" /> },
  { id: "categories", label: "گزارش دسته‌ها", icon: <PieChart className="w-[18px] h-[18px]" /> },
  { id: "debts", label: "بدهی‌ها", icon: <Coins className="w-[18px] h-[18px]" /> },
  { id: "appointments", label: "قرارها", icon: <CalendarDays className="w-[18px] h-[18px]" /> },
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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");

  const submit = () => {
    const r = mode === "login" ? login(username, pass) : signup(name, username, pass);
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
            <button className="btn btn-gold !py-3 !text-[14px]" onClick={submit}>
              {mode === "login" ? "ورود به دفترکل" : "ساخت حساب و شروع"}
            </button>
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
  const [searchQ, setSearchQ] = useState("");
  const remindedRef = useRef(false);

  /* تم */
  useEffect(() => {
    const t = state.prefs.theme ?? "dark";
    document.documentElement.classList.toggle("light", t === "light");
    try { localStorage.setItem("fp_theme", t); } catch { /* ignore */ }
  }, [state.prefs.theme]);

  /* شناسهٔ سینک — یک‌بار برای هر کاربر ساخته می‌شود */
  useEffect(() => {
    if (!state.prefs.syncId) {
      mutate((d) => { d.prefs.syncId = "sync-" + Math.random().toString(36).slice(2, 10); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* قفل پین */
  useEffect(() => {
    if (state.prefs.pinEnabled && state.prefs.pin) setLocked(true);
  }, []);

  /* یادآوری قرارها */
  useEffect(() => {
    if (remindedRef.current) return;
    const today = now.toISOString().slice(0, 10);
    const soon = state.appointments.find((a) => {
      if (a.date !== today || a.done) return false;
      const [h, m] = a.time.split(":").map(Number);
      const mins = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
      return mins >= 0 && mins <= 60;
    });
    if (soon) {
      remindedRef.current = true;
      toast("warn", `یادآوری: «${soon.title}» ساعت ${faNum(soon.time)} — تا یک ساعت دیگر`);
    }
  }, [state.appointments, now, toast]);

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

              <div className="relative flex-1 max-w-sm mx-auto">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" style={{ color: "var(--fp-text3)" }} />
                <input
                  className="input !py-2 !ps-9 !text-[12.5px]"
                  placeholder="جست‌وجوی تراکنش…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setDrill({ query: searchQ, key: Date.now() });
                      setPage("transactions");
                    }
                  }}
                />
              </div>

              <SyncBadge />
              <ThemeToggle />
              <button className="btn btn-gold btn-sm" onClick={() => setQuickAdd(true)}>
                <Plus className="w-4 h-4" strokeWidth={3} /> <span className="hidden sm:inline">ثبت</span>
              </button>
              <button className="icon-btn lg:hidden" onClick={onLogout} title="خروج"><LogOut className="w-[18px] h-[18px]" /></button>
            </div>
          </header>

          <main className="flex-1 px-4 lg:px-8 py-6 pb-28 lg:pb-10 max-w-[1200px] w-full mx-auto">
            <div key={page + drill.key}>
              {page === "dashboard" && <DashboardPage onQuickAdd={() => setQuickAdd(true)} />}
              {page === "transactions" && <TransactionsPage initQuery={drill.query} initCat={drill.cat} />}
              {page === "categories" && <CategoriesPage onDrill={(cat) => { setDrill({ cat, key: Date.now() }); setPage("transactions"); }} />}
              {page === "debts" && <DebtsPage />}
              {page === "appointments" && <AppointmentsPage />}
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
  const on = !!state.prefs.syncUrl && !!state.prefs.syncKey;
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

/* نوار بازگشت ۳۰ ثانیه */
function UndoBar() {
  const { state, restore, purgeTrash } = useStore();
  const now = useNow(200);
  const entry = state.trash[state.trash.length - 1];
  useEffect(() => { purgeTrash(); }, [now]);
  if (!entry) return null;
  const remaining = Math.max(0, entry.until - now.getTime());
  if (remaining <= 0) return null;
  const secs = Math.ceil(remaining / 1000);
  return (
    <div className="fixed bottom-20 lg:bottom-6 inset-x-0 z-[110] px-4 pointer-events-none no-print">
      <div className="pointer-events-auto max-w-lg mx-auto rounded-2xl border overflow-hidden slide-up shadow-2xl"
        style={{ background: "var(--fp-bg2)", borderColor: "color-mix(in srgb, var(--fp-accent) 50%, transparent)" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: "color-mix(in srgb, var(--fp-accent) 15%, transparent)", color: "var(--fp-accent)" }}>
            <RotateCcw className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-black truncate">«{entry.label}» حذف شد</p>
            <p className="text-[10.5px] font-bold tabular mt-0.5" style={{ color: "var(--fp-accent)" }}>
              {faNum(secs)} ثانیه تا حذف دائم
            </p>
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => restore(entry.key)}>بازگردانی</button>
          <button className="icon-btn !w-8 !h-8" onClick={purgeTrash} title="حذف فوری"><X className="w-4 h-4" /></button>
        </div>
        <div className="h-1" style={{ background: "var(--fp-bg3)" }}>
          <div className="h-full transition-[width] duration-200 ease-linear" style={{ width: `${(remaining / 30000) * 100}%`, background: "var(--fp-accent)" }} />
        </div>
      </div>
    </div>
  );
}
