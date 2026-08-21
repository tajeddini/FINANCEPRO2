import { useMemo, useState } from "react";
import { KEY_FEATURES, PAGES, type PageDef } from "../content";
import {
  faNum,
  jalaliFirstOffset,
  jalaliMonthLen,
  jalaliToday,
  MONTHS_FA,
} from "../lib/utils";
import { Icon } from "./icons";
import { Reveal, SectionHead } from "./shared";

/* ================= قابلیت‌های کلیدی ================= */
export function KeyFeatures() {
  return (
    <section id="features" className="relative bg-paper ledger-light text-pine-850">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28">
        <SectionHead
          light
          index="۰۱"
          kicker="قابلیت‌های کلیدی"
          title="چیزهایی که فایننس‌پرو را فایننس‌پرو کرده"
          desc="شش ستون اصلی محصول؛ از حذفِ قابل‌بازگشت تا دفترکل مشترک با تلگرام. همهٔ این‌ها در تحویل، تست‌شده و فعال‌اند."
        />

        <div className="grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <div className="rounded-xl border-2 border-dashed border-pine-700/25 p-6 bg-paper-2/60">
                <Icon name="flag" className="w-7 h-7 text-gold-500" strokeWidth={2} />
                <p className="font-display text-2xl mt-3 leading-snug">
                  تحویلِ بدون نقص،
                  <br />
                  با دفترچهٔ راهنما
                </p>
                <p className="text-sm leading-7 text-pine-700/80 mt-2">
                  هر قابلیت در ادامه، در مدل داده، صفحه‌ها و ربات تلگرام ریشه دارد —
                  جدا از هم ساخته نشده‌اند.
                </p>
                <div className="rule-dash text-pine-700/30 my-4" />
                <p className="text-[12px] font-bold text-pine-700/70 flex items-center gap-2">
                  <span className="w-2 h-2 rotate-45 bg-gold-500" />
                  ۶ قابلیت · ۸ صفحه · ۱۹ جدول
                </p>
              </div>
            </div>
          </Reveal>

          <div className="lg:col-span-8">
            {KEY_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="group flex gap-5 items-start py-6 border-b border-pine-700/15 hover:bg-paper-2/70 transition-colors duration-300 px-3 -mx-3 rounded-lg">
                  <span className="font-display text-3xl text-pine-700/25 group-hover:text-gold-500 transition-colors duration-300 leading-none pt-1 w-10 shrink-0">
                    {faNum(i + 1).padStart(2, "۰")}
                  </span>
                  <span className="w-11 h-11 rounded-lg bg-pine-850 text-gold-400 grid place-items-center shrink-0 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <Icon name={f.icon} className="w-5.5 h-5.5" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl lg:text-2xl text-pine-850 leading-tight">
                      {f.title}
                    </h3>
                    <p className="text-sm leading-7 text-pine-700/85 mt-1.5 max-w-xl">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= مرورگر صفحه‌ها ================= */
export function PagesExplorer() {
  const [active, setActive] = useState(PAGES[0].id);
  const page = PAGES.find((p) => p.id === active) ?? PAGES[0];

  return (
    <section id="pages" className="relative ledger-dark glow-top overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28">
        <SectionHead
          index="۰۲"
          kicker="هشت صفحهٔ اصلی"
          title="هر صفحه یک ستون دفترکل"
          desc="پوستهٔ App مسیریابی، ورود/ثبت‌نام، جستجو و یادآوری را اداره می‌کند و pages.tsx این هشت صفحه را می‌سازد."
        />

        <div className="grid lg:grid-cols-12 gap-6">
          {/* فهرست تب‌ها */}
          <Reveal className="lg:col-span-4">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1">
              {PAGES.map((p) => {
                const isActive = p.id === active;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    className={`tab-btn flex items-center gap-3 shrink-0 lg:shrink rounded-xl px-4 py-3 text-start border cursor-pointer ${
                      isActive
                        ? "bg-gold-500 text-pine-950 border-gold-500 shadow-[0_14px_30px_-12px_rgba(232,176,75,0.55)]"
                        : "bg-pine-900/70 text-ink-2 border-mint-400/12 hover:border-mint-400/40 hover:text-ink"
                    }`}
                  >
                    <Icon name={p.icon} className="w-5 h-5" strokeWidth={2} />
                    <span className="font-display text-lg leading-none">{p.title}</span>
                    <span
                      className={`text-[10.5px] font-black ms-auto hidden sm:inline ${
                        isActive ? "text-pine-950/60" : "text-ink-3"
                      }`}
                    >
                      {p.num}
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* پنل جزئیات */}
          <Reveal className="lg:col-span-8" delay={120}>
            <div
              key={page.id}
              className="feed-in rounded-2xl border border-mint-400/15 bg-pine-900/80 p-6 lg:p-8 grid md:grid-cols-2 gap-8 min-h-[420px]"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-5xl text-gold-500/90 leading-none">{page.num}</span>
                  <div>
                    <h3 className="font-display text-3xl text-ink leading-none">صفحهٔ {page.title}</h3>
                    <p className="text-[13px] font-bold text-mint-400 mt-1.5">{page.tagline}</p>
                  </div>
                </div>
                <ul className="mt-7 grid gap-3.5">
                  {page.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[14px] leading-7 text-ink-2">
                      <span className="w-5 h-5 rounded-md bg-mint-400/12 border border-mint-400/30 grid place-items-center shrink-0 mt-1">
                        <Icon name="check" className="w-3 h-3 text-mint-400" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex items-center gap-2 text-[12px] font-bold text-ink-3">
                  <Icon name="file" className="w-4 h-4 text-gold-500" />
                  <span dir="ltr">src/pages.tsx</span>
                  <span className="opacity-60">— پیاده‌سازی همهٔ صفحه‌ها در یک ماژول</span>
                </div>
              </div>
              <PageVisual page={page} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- بصری‌سازی کوچک هر صفحه ---------- */
function PageVisual({ page }: { page: PageDef }) {
  return (
    <div className="rounded-xl bg-pine-950/60 border border-mint-400/12 p-5 flex flex-col justify-center">
      {page.visual === "dashboard" && <VisualDashboard />}
      {page.visual === "transactions" && <VisualTransactions />}
      {page.visual === "categories" && <VisualCategories />}
      {page.visual === "debts" && <VisualDebts />}
      {page.visual === "appointments" && <VisualAppointments />}
      {page.visual === "reports" && <VisualReports />}
      {page.visual === "manage" && <VisualManage />}
      {page.visual === "settings" && <VisualSettings />}
    </div>
  );
}

function VisualDashboard() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between rounded-lg bg-pine-900 border border-mint-400/12 px-4 py-3">
        <span className="text-[12px] font-bold text-ink-2">موجودی کل</span>
        <span className="font-display text-xl text-gold-400 tabular-nums">۱۲٬۸۴۶٬۵۰۰ <span className="text-[10px] text-ink-3">تومان</span></span>
      </div>
      <div>
        <div className="flex justify-between text-[10.5px] font-bold text-ink-3 mb-1"><span>درآمد ماه</span><span className="text-mint-400 tabular-nums">۱۸٬۵۰۰٬۰۰۰</span></div>
        <div className="h-2 rounded-full bg-pine-900"><div className="h-full w-4/5 rounded-full bg-mint-400 bar-grow" /></div>
      </div>
      <div>
        <div className="flex justify-between text-[10.5px] font-bold text-ink-3 mb-1"><span>هزینه ماه</span><span className="text-coral-400 tabular-nums">۱۲٬۸۷۰٬۰۰۰</span></div>
        <div className="h-2 rounded-full bg-pine-900"><div className="h-full w-3/5 rounded-full bg-coral-500 bar-grow" style={{ animationDelay: "150ms" }} /></div>
      </div>
      <div className="flex gap-2 mt-1">
        <span className="text-[10px] font-black bg-mint-400/10 text-mint-300 border border-mint-400/25 rounded px-2 py-1">چالش پس‌انداز: ٪۶۴</span>
        <span className="text-[10px] font-black bg-skyx-400/10 text-skyx-400 border border-skyx-400/25 rounded px-2 py-1">ارز خارجی فعال</span>
      </div>
    </div>
  );
}

function VisualTransactions() {
  const rows = [
    { t: "سوپرمارکت یاس", a: "−۲۸۵٬۰۰۰", c: "text-coral-400" },
    { t: "واریز حقوق", a: "+۱۸٬۵۰۰٬۰۰۰", c: "text-mint-400" },
    { t: "اسنپ", a: "−۹۵٬۰۰۰", c: "text-coral-400" },
  ];
  return (
    <div className="grid gap-2">
      {rows.map((r) => (
        <div key={r.t} className="flex items-center justify-between rounded-lg bg-pine-900 border border-mint-400/12 px-4 py-2.5">
          <span className="text-[12px] font-bold text-ink">{r.t}</span>
          <span className={`text-[11.5px] font-black tabular-nums ${r.c}`}>{r.a}</span>
        </div>
      ))}
      <div className="mt-2 rounded-lg bg-gold-500/10 border border-gold-500/35 px-4 py-2.5">
        <div className="flex items-center justify-between text-[11px] font-black text-gold-400 mb-1.5">
          <span className="flex items-center gap-1.5"><Icon name="undo" className="w-3.5 h-3.5" /> «اسنپ» حذف شد — بازگشت؟</span>
          <span className="tabular-nums">۲۷ ثانیه</span>
        </div>
        <div className="h-1.5 rounded-full bg-pine-950 overflow-hidden">
          <div className="h-full w-[90%] rounded-full bg-gold-500 bar-grow" style={{ animationDelay: "200ms" }} />
        </div>
      </div>
    </div>
  );
}

function VisualCategories() {
  const C = 2 * Math.PI * 40;
  const segs = [
    { pct: 0.42, color: "var(--color-gold-500)" },
    { pct: 0.31, color: "var(--color-mint-400)" },
    { pct: 0.27, color: "var(--color-coral-500)" },
  ];
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90 shrink-0">
        {segs.map((s, i) => {
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r="40" fill="none"
              stroke={s.color} strokeWidth="13"
              strokeDasharray={`${s.pct * C - 3} ${C - s.pct * C + 3}`}
              strokeDashoffset={-acc * C}
              className="transition-all duration-700"
            />
          );
          acc += s.pct;
          return el;
        })}
      </svg>
      <div className="grid gap-2 text-[11.5px] font-bold">
        <span className="flex items-center gap-2 text-ink"><i className="w-2.5 h-2.5 rounded-sm bg-gold-500 not-italic" /> خوراک — ٪۴۲</span>
        <span className="flex items-center gap-2 text-ink"><i className="w-2.5 h-2.5 rounded-sm bg-mint-400 not-italic" /> رفت‌وآمد — ٪۳۱</span>
        <span className="flex items-center gap-2 text-ink"><i className="w-2.5 h-2.5 rounded-sm bg-coral-500 not-italic" /> کافه — ٪۲۷</span>
        <span className="text-[10.5px] text-ink-3 mt-1">کلیک روی دسته → تراکنش‌هایش</span>
      </div>
    </div>
  );
}

function VisualDebts() {
  return (
    <div className="grid gap-3">
      <div className="rounded-lg bg-pine-900 border border-mint-400/12 px-4 py-3">
        <div className="flex justify-between text-[11px] font-bold mb-1.5"><span className="text-ink">اقساط وام بانک ملت</span><span className="text-gold-400 tabular-nums">قسط ۶ از ۱۰</span></div>
        <div className="h-2 rounded-full bg-pine-950 overflow-hidden"><div className="h-full w-3/5 rounded-full bg-gold-500 bar-grow" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-pine-900 border border-mint-400/12 px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold text-ink-3">جمع بدهی</p>
          <p className="font-display text-lg text-coral-400 tabular-nums">۴٬۲۰۰٬۰۰۰</p>
        </div>
        <div className="rounded-lg bg-pine-900 border border-mint-400/12 px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold text-ink-3">جمع طلب</p>
          <p className="font-display text-lg text-mint-400 tabular-nums">۱٬۷۵۰٬۰۰۰</p>
        </div>
      </div>
      <span className="inline-flex items-center justify-center gap-1.5 text-[10.5px] font-black text-skyx-400 border border-dashed border-skyx-400/40 rounded-lg px-3 py-2">
        <Icon name="qr" className="w-4 h-4" /> QR درخواست وجه
      </span>
    </div>
  );
}

function VisualAppointments() {
  const t = jalaliToday();
  const len = jalaliMonthLen(t.jy, t.jm);
  const offset = jalaliFirstOffset(t.jy, t.jm);
  const events = [5, 12, 21, t.jd];
  return (
    <div>
      <p className="text-[11.5px] font-black text-mint-400 mb-2 text-center">
        {MONTHS_FA[t.jm - 1]} {faNum(t.jy)}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => (
          <span key={d} className="text-[9.5px] font-black text-ink-3 py-1">{d}</span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: len }).map((_, i) => {
          const d = i + 1;
          const isToday = d === t.jd;
          const hasEvent = events.includes(d) && !isToday;
          return (
            <span
              key={d}
              className={`text-[10px] font-bold py-1 rounded relative tabular-nums ${
                isToday
                  ? "bg-gold-500 text-pine-950"
                  : hasEvent
                  ? "text-mint-300"
                  : "text-ink-2"
              }`}
            >
              {faNum(d)}
              {hasEvent && <i className="absolute bottom-0 right-1/2 translate-x-1/2 w-1 h-1 rounded-full bg-mint-400 not-italic" />}
            </span>
          );
        })}
      </div>
      <p className="text-[10.5px] text-ink-3 font-bold mt-3 text-center">تایپ صوتی عنوان + خروجی ICS</p>
    </div>
  );
}

function VisualReports() {
  const cells = useMemo(
    () => Array.from({ length: 7 * 14 }, (_, i) => (i * 37 + ((i / 7) | 0) * 13) % 9),
    []
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black text-ink-2">نقشهٔ حرارتی خرج — ۱۴ هفته</span>
        <span className="text-[10px] font-black text-gold-400">امتیاز سلامت: {faNum(78)} از {faNum(100)}</span>
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-1" dir="ltr">
        {cells.map((v, i) => (
          <span
            key={i}
            className="heat-pop w-full aspect-square rounded-[3px]"
            style={{
              background: `rgba(87,217,163,${0.08 + v * 0.09})`,
              animationDelay: `${i * 8}ms`,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-ink-3" dir="ltr">
        کم
        {[0.12, 0.3, 0.5, 0.7, 0.9].map((o) => (
          <span key={o} className="w-3 h-3 rounded-[3px]" style={{ background: `rgba(87,217,163,${o})` }} />
        ))}
        زیاد
      </div>
    </div>
  );
}

function VisualManage() {
  const [toggles, setToggles] = useState([true, false, true]);
  const labels = ["تراکنش دوره‌ای اجاره", "یادآوری اشتراک‌ها", "بودجهٔ خوراک"];
  return (
    <div className="grid gap-2.5">
      {labels.map((l, i) => (
        <button
          key={l}
          onClick={() => setToggles((p) => p.map((v, j) => (j === i ? !v : v)))}
          className="flex items-center justify-between rounded-lg bg-pine-900 border border-mint-400/12 px-4 py-3 cursor-pointer hover:border-mint-400/35 transition-colors"
        >
          <span className="text-[12px] font-bold text-ink">{l}</span>
          <span className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-300 flex ${toggles[i] ? "bg-mint-400 justify-end" : "bg-pine-700 justify-start"}`}>
            <span className="w-4.5 h-4.5 rounded-full bg-paper shadow transition-transform duration-300" />
          </span>
        </button>
      ))}
      <p className="text-[10.5px] text-ink-3 font-bold mt-1">حساب، دسته، چک، دارایی و ۶ ابزار دیگر…</p>
    </div>
  );
}

function VisualSettings() {
  const [dark, setDark] = useState(true);
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between rounded-lg bg-pine-900 border border-mint-400/12 px-4 py-3">
        <span className="text-[12px] font-bold text-ink">تم برنامه</span>
        <div className="flex rounded-lg border border-mint-400/25 overflow-hidden">
          <button onClick={() => setDark(true)} className={`px-3 py-1.5 text-[11px] font-black transition-colors cursor-pointer ${dark ? "bg-gold-500 text-pine-950" : "text-ink-3"}`}>تیره</button>
          <button onClick={() => setDark(false)} className={`px-3 py-1.5 text-[11px] font-black transition-colors cursor-pointer ${!dark ? "bg-gold-500 text-pine-950" : "text-ink-3"}`}>روشن</button>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-pine-900 border border-mint-400/12 px-4 py-3">
        <span className="text-[12px] font-bold text-ink">قفل با پین/اثر انگشت</span>
        <Icon name="shield" className="w-4.5 h-4.5 text-mint-400" />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-pine-900 border border-mint-400/12 px-4 py-3">
        <span className="text-[12px] font-bold text-ink">همگام‌سازی ابری</span>
        <span className="flex items-center gap-1.5 text-[10.5px] font-black text-mint-400">
          <span className="w-1.5 h-1.5 rounded-full bg-mint-400 pulse-dot" /> Realtime متصل
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-pine-900 border border-mint-400/12 px-4 py-3">
        <span className="text-[12px] font-bold text-ink">اتصال ربات تلگرام</span>
        <Icon name="plane" className="w-4.5 h-4.5 text-skyx-400" />
      </div>
    </div>
  );
}
