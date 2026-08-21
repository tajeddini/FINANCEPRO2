import { useEffect, useRef, useState } from "react";
import {
  FEED_POOL,
  MOCK_ACCOUNTS,
  MONTH_EXPENSE,
  MONTH_INCOME,
  NAV_LINKS,
  SPARK_POINTS,
  TICKER_ITEMS,
  TOTAL_BALANCE,
  type FeedItem,
} from "../content";
import {
  faMoney,
  faNum,
  faTime,
  groupInt,
  jalaliDateStr,
  useCountUp,
  useInView,
  useNow,
  usePrefersReducedMotion,
} from "../lib/utils";
import { Icon } from "./icons";
import { Reveal, StatusBadge } from "./shared";

/* ================= نوار متحرک ================= */
export function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="ticker-wrap relative z-40 overflow-hidden border-b border-gold-500/20 bg-pine-900/95">
      <div className="ticker-track py-2">
        {items.map((t, i) => (
          <span key={i} dir="rtl" className="flex items-center gap-6 pe-6 whitespace-nowrap">
            <span className="text-[12.5px] font-semibold text-gold-300/90">{t}</span>
            <span className="block w-1.5 h-1.5 rotate-45 bg-mint-400/70" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================= ناوبری ================= */
export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "bg-pine-950/95 border-mint-400/15 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]"
          : "bg-pine-950/80 border-transparent"
      } backdrop-blur-sm`}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-3 group">
          <span className="w-9 h-9 rounded-lg bg-gold-500 text-pine-950 grid place-items-center transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
            <Icon name="wallet" className="w-5 h-5" strokeWidth={2} />
          </span>
          <span className="leading-none">
            <span className="font-display text-2xl text-ink block">فایننس‌پرو</span>
            <span className="text-[10.5px] text-ink-3 font-semibold tracking-wide">
              سند تحویل پروژه — نسخهٔ {faNum("1.0")}
            </span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="relative px-3 py-2 text-[13.5px] font-semibold text-ink-2 hover:text-mint-300 transition-colors duration-200 group"
            >
              {l.label}
              <span className="absolute bottom-1 right-3 left-3 h-[2px] bg-gold-500 scale-x-0 group-hover:scale-x-100 origin-right transition-transform duration-300" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#deploy"
            className="hidden sm:inline-flex btn-gold items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
          >
            <Icon name="check" className="w-4 h-4" strokeWidth={2.4} />
            آمادهٔ استقرار
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden w-10 h-10 grid place-items-center rounded-lg border border-mint-400/25 text-mint-300 cursor-pointer"
            aria-label="منو"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="lg:hidden border-t border-mint-400/10 bg-pine-900/98 px-5 py-3 grid gap-1">
          {NAV_LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={() => setOpen(false)}
              className="py-2.5 px-3 rounded-lg text-sm font-semibold text-ink-2 hover:bg-mint-400/10 hover:text-mint-300 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

/* ================= اسپارک‌لاین ================= */
function Sparkline({ on }: { on: boolean }) {
  const W = 300;
  const H = 86;
  const n = SPARK_POINTS.length;
  const coords = SPARK_POINTS.map((v, i) => [
    (i / (n - 1)) * W,
    H - 6 - v * 0.82,
  ]);
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L${W} ${H} L0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full h-20 ${on ? "spark-on" : ""}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-mint-400)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-mint-400)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" className="spark-fill" />
      <path d={d} fill="none" stroke="var(--color-mint-400)" strokeWidth="2.2" pathLength={1} className="spark-path" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ================= ماک داشبورد ================= */
function DashboardMock() {
  const reduced = usePrefersReducedMotion();
  const now = useNow(1000);
  const [hidden, setHidden] = useState(false);
  const balance = useCountUp(TOTAL_BALANCE, 1600);
  const [sparkRef, sparkOn] = useInView<HTMLDivElement>(0.3);

  const [feed, setFeed] = useState(() =>
    FEED_POOL.slice(0, 3).map((item, i) => ({ item, uid: i }))
  );
  const counter = useRef(3);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setFeed((prev) =>
        [{ item: FEED_POOL[counter.current % FEED_POOL.length], uid: counter.current }, ...prev].slice(0, 3)
      );
      counter.current += 1;
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="relative">
      {/* چیپ‌های شناور */}
      <div className="absolute -top-5 -left-3 sm:-left-8 z-20 float-y">
        <div className="flex items-center gap-2 bg-pine-800 border border-mint-400/30 rounded-lg px-3 py-2 shadow-xl shadow-black/40">
          <Icon name="plane" className="w-4 h-4 text-skyx-400" />
          <span className="text-[11.5px] font-bold text-ink">ثبت از تلگرام</span>
          <Icon name="check" className="w-3.5 h-3.5 text-mint-400" strokeWidth={2.6} />
        </div>
      </div>
      <div className="absolute -bottom-5 right-4 sm:-right-6 z-20 float-y" style={{ animationDelay: "1.4s" }}>
        <div className="flex items-center gap-2 bg-gold-500 text-pine-950 rounded-lg px-3 py-2 shadow-xl shadow-black/40">
          <Icon name="download" className="w-4 h-4" strokeWidth={2.2} />
          <span className="text-[11.5px] font-black">PWA — قابل نصب و آفلاین</span>
        </div>
      </div>

      {/* قاب اپ */}
      <div className="relative rounded-2xl border border-mint-400/20 bg-pine-900 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* نوار عنوان */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-mint-400/10 bg-pine-850">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-coral-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-gold-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-mint-400/80" />
          </div>
          <div className="flex-1 mx-2 rounded-md bg-pine-950/70 border border-mint-400/10 px-3 py-1 text-center">
            <span dir="ltr" className="text-[11px] text-ink-3 font-mono">financepro.vercel.app</span>
          </div>
          <StatusBadge text="سینک فعال" />
        </div>

        <div className="p-4 sm:p-5 grid gap-4">
          {/* سربرگ */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-display text-xl text-ink leading-none">صبح بخیر، آرمان</p>
              <p className="text-[11.5px] text-ink-3 font-semibold mt-1.5">{jalaliDateStr()}</p>
            </div>
            <div className="text-left">
              <p dir="ltr" className="font-display text-2xl text-gold-400 leading-none tabular-nums">
                {faTime(now)}
              </p>
              <p className="text-[10.5px] text-ink-3 font-semibold mt-1">ساعت زنده — ۲۴ ساعته</p>
            </div>
          </div>

          {/* موجودی */}
          <div className="rounded-xl bg-pine-850 border border-mint-400/15 p-4 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gold-500" />
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-ink-2">موجودی کل</span>
              <button
                onClick={() => setHidden((v) => !v)}
                className="w-8 h-8 grid place-items-center rounded-lg border border-mint-400/20 text-ink-3 hover:text-gold-400 hover:border-gold-500/50 transition-colors cursor-pointer"
                aria-label="مخفی‌سازی موجودی"
              >
                <Icon name={hidden ? "eyeOff" : "eye"} className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-3xl sm:text-4xl text-ink num-shadow tabular-nums leading-none">
                {hidden ? "••••••••" : faMoney(balance)}
              </span>
              <span className="text-xs font-bold text-ink-3">تومان</span>
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-mint-300 bg-mint-400/10 border border-mint-400/25 rounded-md px-2.5 py-1 tabular-nums">
                <span className="text-mint-400">+</span> {hidden ? "•••" : faMoney(MONTH_INCOME)} درآمد ماه
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-coral-400 bg-coral-500/10 border border-coral-500/25 rounded-md px-2.5 py-1 tabular-nums">
                <span>−</span> {hidden ? "•••" : faMoney(MONTH_EXPENSE)} هزینه ماه
              </span>
            </div>
          </div>

          {/* نمودار */}
          <div ref={sparkRef} className="rounded-xl bg-pine-850 border border-mint-400/15 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold text-ink-2">روند ۳۰ روز اخیر</span>
              <span className="text-[11px] font-bold text-mint-400 tabular-nums">٪{faNum(23)}+ رشد</span>
            </div>
            <Sparkline on={sparkOn} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* حساب‌ها */}
            <div className="rounded-xl bg-pine-850 border border-mint-400/15 p-4">
              <span className="text-[12px] font-bold text-ink-2 block mb-3">موجودی حساب‌ها</span>
              <div className="grid gap-3">
                {MOCK_ACCOUNTS.map((a, i) => (
                  <div key={a.name}>
                    <div className="flex items-center justify-between text-[11.5px] font-bold mb-1">
                      <span className="text-ink">{a.name}</span>
                      <span className="text-ink-3 tabular-nums">{hidden ? "•••" : faMoney(a.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-pine-950/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bar-grow"
                        style={{ width: `${a.pct}%`, background: a.color, animationDelay: `${i * 140 + 300}ms` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* فعالیت اخیر */}
            <div className="rounded-xl bg-pine-850 border border-mint-400/15 p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[12px] font-bold text-ink-2">فعالیت اخیر</span>
                <span className="w-1.5 h-1.5 rounded-full bg-mint-400 pulse-dot" />
              </div>
              <div className="grid gap-2">
                {feed.map(({ item, uid }) => (
                  <FeedRow key={uid} item={item} hidden={hidden} />
                ))}
              </div>
            </div>
          </div>

          {/* ثبت سریع */}
          <button className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-mint-400/10 border border-dashed border-mint-400/40 text-mint-300 py-2.5 text-[12.5px] font-black hover:bg-mint-400/20 transition-colors cursor-pointer">
            <Icon name="mic" className="w-4 h-4" />
            ثبت سریع — بگو «دویست هزار تومان، سوپرمارکت»
            <Icon name="plus" className="w-4 h-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedRow({ item, hidden }: { item: FeedItem; hidden: boolean }) {
  return (
    <div className="feed-in flex items-center justify-between gap-2 rounded-lg bg-pine-950/50 border border-mint-400/8 px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-[11.5px] font-bold text-ink truncate flex items-center gap-1.5">
          {item.title}
          {item.bot && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-skyx-400 bg-skyx-400/10 border border-skyx-400/25 rounded px-1.5 py-0.5">
              <Icon name="plane" className="w-2.5 h-2.5" strokeWidth={2.2} />
              ربات
            </span>
          )}
        </p>
        <p className="text-[10px] text-ink-3 font-semibold mt-0.5">{item.cat}</p>
      </div>
      <span
        className={`text-[11.5px] font-black tabular-nums whitespace-nowrap ${
          item.income ? "text-mint-400" : "text-coral-400"
        }`}
      >
        {item.income ? "+" : "−"} {hidden ? "•••" : faNum(groupInt(item.amount))}
      </span>
    </div>
  );
}

/* ================= هیرو ================= */
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden ledger-dark glow-top">
      {/* واترمارک */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 left-0 font-display wordmark-outline text-[26vw] leading-none select-none hidden md:block"
      >
        دفترکل
      </div>

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8 pt-14 pb-20 lg:pt-20 lg:pb-28 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* متن */}
        <div className="lg:col-span-5 order-2 lg:order-1">
          <Reveal>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge text="سند تحویل پروژه" />
              <span className="text-[11px] font-bold text-ink-3 border border-mint-400/15 rounded-full px-2.5 py-1">
                نسخهٔ {faNum("1.0")} — {faNum(1404)}
              </span>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="font-display text-5xl sm:text-6xl xl:text-7xl leading-[1.12] text-ink mt-6">
              دفترکل دیجیتالِ
              <span className="block text-gold-400">
                <span className="brush-underline">فارسی‌زبان‌ها</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-6 text-base sm:text-lg leading-9 text-ink-2 max-w-xl">
              فایننس‌پرو یک وب‌اپلیکیشن مدیریت مالی شخصی برای کاربران ایرانی است؛
              کاملاً <b className="text-ink">راست‌به‌چپ</b>، با{" "}
              <b className="text-ink">تقویم شمسی</b> در همه‌جا،{" "}
              <b className="text-ink">اعداد فارسی</b>، ربات تلگرام و سینک ابری — و
              این، سند تحویل کامل پروژه به توسعه‌دهندهٔ بعدی است.
            </p>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <a href="#pages" className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black">
                مرور ۸ صفحهٔ اپ
                <Icon name="arrow" className="w-4 h-4" strokeWidth={2.4} />
              </a>
              <a href="#files" className="btn-ghost inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black">
                <Icon name="folder" className="w-4 h-4" />
                ساختار فایل‌ها
              </a>
            </div>
          </Reveal>
          <Reveal delay={420}>
            <ul className="mt-9 flex items-center gap-x-6 gap-y-2 flex-wrap text-[12.5px] font-bold text-ink-3">
              {["RTL کامل", "PWA آفلاین", "چندکاربره", "ربات تلگرام"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Icon name="check" className="w-3.5 h-3.5 text-gold-500" strokeWidth={2.8} />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* ماک */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <Reveal delay={150}>
            <DashboardMock />
          </Reveal>
        </div>
      </div>

      <StatStrip />
    </section>
  );
}

/* ================= نوار آمار ================= */
function StatStrip() {
  const stats = [
    { num: "۱۹", label: "جدول داده", color: "text-gold-400" },
    { num: "۸", label: "صفحهٔ اصلی", color: "text-mint-400" },
    { num: "۳۰", label: "ثانیه فرصت بازگشت", color: "text-coral-400" },
    { num: "۱۱", label: "فناوری در پشته", color: "text-skyx-400" },
    { num: "۲", label: "نسخهٔ ربات تلگرام", color: "text-gold-400" },
  ];
  return (
    <div className="relative border-t border-mint-400/15 bg-pine-900/60">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 90} className={i > 0 ? "sm:border-s sm:border-dashed sm:border-mint-400/20" : ""}>
            <div className="px-2 sm:px-6 text-center sm:text-start group cursor-default">
              <p className={`font-display text-4xl md:text-5xl leading-none ${s.color} transition-transform duration-300 group-hover:-translate-y-1 inline-block`}>
                {s.num}
              </p>
              <p className="text-[12px] font-bold text-ink-3 mt-2">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
