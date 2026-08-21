import { useState } from "react";
import {
  DEPLOY_TABS,
  DEV_NOTES,
  ENV_VARS,
  ROADMAP_ITEMS,
  SERVICE_ACCOUNTS,
} from "../content";
import { faNum, jalaliToday, MONTHS_FA, useInView } from "../lib/utils";
import { Icon } from "./icons";
import { CodeBlock, Reveal, SectionHead, StatusBadge } from "./shared";

/* ================= استقرار ================= */
export function Deployment() {
  const [tab, setTab] = useState(DEPLOY_TABS[0].id);
  const active = DEPLOY_TABS.find((t) => t.id === tab) ?? DEPLOY_TABS[0];

  return (
    <section id="deploy" className="relative ledger-dark glow-top">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28">
        <SectionHead
          index="۰۶"
          kicker="استقرار"
          title="از لوکال تا تولید، چهار ایستگاه"
          desc="سایت روی Vercel، دیتابیس روی Supabase، ربات به‌صورت Serverless — و سینک ابری که همه را به هم می‌دوزد."
        />

        <Reveal>
          <div className="flex flex-wrap gap-2 mb-8">
            {DEPLOY_TABS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`tab-btn flex items-center gap-2.5 rounded-xl px-4.5 py-3 border text-[13px] font-black cursor-pointer ${
                  tab === t.id
                    ? "bg-mint-400 text-pine-950 border-mint-400 shadow-[0_14px_30px_-12px_rgba(87,217,163,0.5)]"
                    : "bg-pine-900/70 text-ink-2 border-mint-400/12 hover:border-mint-400/45 hover:text-ink"
                }`}
              >
                <span className={`font-display text-lg leading-none ${tab === t.id ? "text-pine-950/70" : "text-gold-500"}`}>
                  {faNum(i + 1).padStart(2, "۰")}
                </span>
                <Icon name={t.icon} className="w-4.5 h-4.5" strokeWidth={2} />
                {t.title}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div key={active.id} className="feed-in grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-mint-400/15 bg-pine-900/80 p-6 lg:p-8">
              <ol className="grid gap-6">
                {active.steps.map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="w-9 h-9 shrink-0 rounded-lg bg-gold-500 text-pine-950 font-display text-xl grid place-items-center leading-none pt-1">
                      {faNum(i + 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] leading-8 text-ink font-semibold">{s.text}</p>
                      {s.code && (
                        <div className="mt-2.5">
                          <CodeBlock
                            lines={[{ text: s.code, kind: "plain" }]}
                            copy={s.code}
                            label={active.codeLabel}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-5 grid gap-4 content-start">
              {active.id === "bot" && (
                <div className="rounded-xl border border-mint-400/15 bg-pine-900/80 p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Icon name="key" className="w-5 h-5 text-gold-400" />
                    <h3 className="font-display text-xl text-ink">متغیرهای محیطی</h3>
                  </div>
                  <div className="grid gap-2">
                    {ENV_VARS.map((v) => (
                      <div key={v.key} className="flex items-center justify-between gap-3 rounded-lg bg-pine-950/60 border border-mint-400/10 px-3.5 py-2.5">
                        <code dir="ltr" className="text-[11.5px] font-black text-mint-300 truncate">{v.key}</code>
                        <span className="text-[11px] font-semibold text-ink-3 text-left">{v.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-dashed border-gold-500/40 bg-gold-500/8 p-6">
                <div className="flex items-center gap-2.5">
                  <Icon name="sync" className="w-5 h-5 text-gold-400" />
                  <h3 className="font-display text-xl text-ink">جریان داده</h3>
                </div>
                <p className="text-[13px] leading-7 text-ink-2 mt-3">
                  سایت ← (دیباونس) ← <b className="text-ink">financepro_state</b> ← (Realtime) ← ربات تلگرام.
                  هر تغییر در هر طرف، با «آخرین نوشتن برنده» به طرف دیگر می‌رسد.
                </p>
                <div className="flex items-center gap-2 mt-4 text-[11px] font-black text-mint-300" dir="ltr">
                  <span className="rounded bg-pine-950 border border-mint-400/20 px-2 py-1">Site</span>
                  <span className="rule-dash grow text-mint-400/50" />
                  <span className="rounded bg-pine-950 border border-mint-400/20 px-2 py-1">Supabase</span>
                  <span className="rule-dash grow text-mint-400/50" />
                  <span className="rounded bg-pine-950 border border-mint-400/20 px-2 py-1">Bot</span>
                </div>
              </div>
              <div className="rounded-xl border border-mint-400/15 bg-pine-900/80 p-6">
                <p className="text-[12.5px] font-black text-ink mb-3">خلاصهٔ فرمان‌های ربات</p>
                <CodeBlock
                  lines={[
                    { text: "# ثبت تراکنش از تلگرام", kind: "comment" },
                    { text: "هزینه ۲۸۵۰۰۰ سوپرمارکت", kind: "cmd" },
                    { text: "درآمد ۱۸۵۰۰۰۰ حقوق", kind: "cmd" },
                    { text: "مانده", kind: "cmd" },
                  ]}
                  copy={"هزینه ۲۸۵۰۰۰ سوپرمارکت\nدرآمد ۱۸۵۰۰۰۰ حقوق\nمانده"}
                  label="Telegram"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= نکات توسعه‌دهنده ================= */
export function DevNotes() {
  return (
    <section id="notes" className="relative bg-paper ledger-light text-pine-850">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28">
        <SectionHead
          light
          index="۰۷"
          kicker="دست‌به‌آچار"
          title="نکات مهم برای توسعه‌دهندهٔ بعدی"
          desc="شش قانونی که اگر رعایت نشوند، پروژه زیر پای‌تان لیز می‌خورد. قبل از اولین commit، دو بار بخوانیدشان."
        />

        <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
          {DEV_NOTES.map((n, i) => (
            <Reveal key={n.title} delay={(i % 2) * 90}>
              <div className={`group flex gap-5 py-6 border-b border-pine-700/15 hover:bg-paper-2/80 transition-colors px-3 -mx-3 rounded-lg ${i % 2 ? "md:translate-y-6" : ""}`}>
                <span className="font-display text-5xl leading-none text-gold-500/85 group-hover:scale-110 transition-transform duration-300 origin-top shrink-0">
                  {faNum(i + 1)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-xl leading-snug">{n.title}</h3>
                  <p className="text-[13px] leading-7 text-pine-700/85 mt-1.5">{n.body}</p>
                  {n.code && (
                    <code dir="ltr" className="inline-block mt-2.5 text-[11.5px] font-black bg-pine-850 text-mint-300 rounded-md px-2.5 py-1.5">
                      {n.code}
                    </code>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={150}>
          <div className="mt-16 rounded-2xl overflow-hidden border border-pine-700/25">
            <div className="stripe-edge h-3.5" />
            <div className="bg-pine-950 px-6 py-7 sm:px-9 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <span className="w-13 h-13 shrink-0 rounded-xl bg-coral-500/15 border border-coral-500/40 grid place-items-center text-coral-400" style={{ width: "3.25rem", height: "3.25rem" }}>
                <Icon name="shield" className="w-6 h-6" strokeWidth={2} />
              </span>
              <div>
                <h3 className="font-display text-2xl text-gold-400 leading-none">هشدار امنیتی</h3>
                <p className="text-[13.5px] leading-7 text-ink-2 mt-2 max-w-3xl">
                  کلید <code dir="ltr" className="text-mint-300 text-[12px]">anon</code> سوپابیس و توکن ربات را{" "}
                  <b className="text-ink">هرگز در کد commit نکنید</b>؛ فقط در Environment Variables سرویس‌ها نگه‌شان دارید.
                  RLS هم برای شروع باز است — قبل از رفتن به تولید، policyها را محدود کنید.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= نقشهٔ راه ================= */
export function Roadmap() {
  const [done, setDone] = useState<boolean[]>(() => ROADMAP_ITEMS.map(() => false));
  const [stampRef, stampOn] = useInView<HTMLDivElement>(0.4);
  const count = done.filter(Boolean).length;
  const t = jalaliToday();

  return (
    <section id="roadmap" className="relative ledger-dark overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 right-0 font-display wordmark-outline text-[22vw] leading-none select-none hidden lg:block"
      >
        ۱۴۰۵
      </div>
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <SectionHead
            index="۰۸"
            kicker="افق پیش‌رو"
            title="کارهای باقی‌مانده و ایده‌های بعدی"
            desc="پروژه کامل تحویل می‌شود، اما راه ادامه دارد. تیک بزنید تا ببینید چه چیزی مانده — این چک‌لیست زنده است."
          />
          <Reveal delay={120}>
            <div className="rounded-xl border border-mint-400/15 bg-pine-900/80 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12.5px] font-black text-ink-2">پیشرفت نقشهٔ راه</span>
                <span className="font-display text-2xl text-gold-400 tabular-nums leading-none">
                  {faNum(count)} از {faNum(ROADMAP_ITEMS.length)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-pine-950 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold-500 transition-all duration-500"
                  style={{ width: `${(count / ROADMAP_ITEMS.length) * 100}%` }}
                />
              </div>
              <button
                onClick={() => setDone(ROADMAP_ITEMS.map(() => false))}
                className="mt-4 text-[11.5px] font-black text-mint-300 hover:text-mint-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Icon name="sync" className="w-3.5 h-3.5" />
                بازنشانی چک‌لیست
              </button>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <div className="grid gap-3">
            {ROADMAP_ITEMS.map((item, i) => (
              <Reveal key={item} delay={i * 60}>
                <button
                  onClick={() => setDone((p) => p.map((v, j) => (j === i ? !v : v)))}
                  className={`w-full flex items-center gap-4 rounded-xl border px-5 py-4 text-start transition-all duration-300 cursor-pointer ${
                    done[i]
                      ? "bg-mint-400/10 border-mint-400/45"
                      : "bg-pine-900/70 border-mint-400/12 hover:border-gold-500/50 hover:-translate-y-0.5"
                  }`}
                >
                  <span
                    className={`w-6.5 h-6.5 shrink-0 rounded-md border-2 grid place-items-center transition-all duration-300 ${
                      done[i] ? "bg-mint-400 border-mint-400 scale-110" : "border-ink-3/50"
                    }`}
                    style={{ width: "1.6rem", height: "1.6rem" }}
                  >
                    {done[i] && <Icon name="check" className="w-3.5 h-3.5 text-pine-950" strokeWidth={3.2} />}
                  </span>
                  <span className={`text-[14px] font-bold leading-7 transition-colors ${done[i] ? "text-ink-3 line-through decoration-mint-400/60" : "text-ink"}`}>
                    {item}
                  </span>
                </button>
              </Reveal>
            ))}
          </div>

          {count === ROADMAP_ITEMS.length && (
            <div ref={stampRef} className="mt-8 flex justify-center">
              <span className={`${stampOn ? "stamp-in" : ""} inline-block border-4 border-double border-mint-400 text-mint-300 font-display text-2xl px-8 py-3 rounded-xl`}>
                برنامهٔ بعدی هم تمام شد!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* پانوشت سند */}
      <div className="relative border-t border-mint-400/12 bg-pine-900/50">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[12.5px] font-bold text-ink-3">
          <span className="flex items-center gap-2">
            <Icon name="file" className="w-4 h-4 text-gold-500" />
            این سند همراه با پروژه تحویل می‌شود.
          </span>
          <span>برای سؤال، با توسعه‌دهندهٔ اصلی تماس بگیرید.</span>
          <span className="ms-auto tabular-nums">
            {MONTHS_FA[t.jm - 1]} {faNum(t.jy)}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ================= پاصفحه ================= */
export function Footer() {
  const [stampRef, stampOn] = useInView<HTMLDivElement>(0.5);
  return (
    <footer className="relative bg-pine-950 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-14 right-1/2 translate-x-1/2 font-display wordmark-outline text-[30vw] leading-none select-none whitespace-nowrap"
      >
        فایننس‌پرو
      </div>

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8 py-16 grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-gold-500 text-pine-950 grid place-items-center">
              <Icon name="wallet" className="w-6 h-6" strokeWidth={2} />
            </span>
            <p className="font-display text-4xl text-ink leading-none">فایننس‌پرو</p>
          </div>
          <p className="text-[13.5px] leading-8 text-ink-2 mt-5 max-w-md">
            دفترکل دیجیتال شخصی برای کاربران فارسی‌زبان — PWA با تقویم شمسی،
            اعداد فارسی و ربات تلگرام. تحویل‌گرفته، مستند، آمادهٔ توسعهٔ بعدی.
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-6">
            <StatusBadge text="GitHub — پابلیش شده" />
            <StatusBadge text="Supabase — متصل" />
            <StatusBadge text="ربات — آنلاین" />
          </div>
        </div>

        <div className="lg:col-span-4">
          <p className="text-[12px] font-black text-ink-3 mb-4 tracking-wide">حساب‌ها و دسترسی‌ها</p>
          <div className="grid gap-2.5">
            {SERVICE_ACCOUNTS.map((s) => (
              <div key={s.service} className="flex items-center gap-3.5 rounded-xl border border-mint-400/12 bg-pine-900/70 px-4 py-3 hover:border-gold-500/45 transition-colors duration-250 group">
                <span className="w-9 h-9 rounded-lg bg-pine-850 border border-mint-400/15 grid place-items-center text-gold-400 group-hover:-rotate-6 transition-transform duration-300">
                  <Icon name={s.icon} className="w-4.5 h-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink leading-none">{s.service}</p>
                  <p className="text-[11px] font-semibold text-ink-3 mt-1.5">{s.desc}</p>
                </div>
                <Icon name="check" className="w-4 h-4 text-mint-400 ms-auto" strokeWidth={2.6} />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 flex lg:justify-end">
          <div ref={stampRef}>
            <div className={`${stampOn ? "stamp-in" : "opacity-0"} border-[3px] border-gold-500 text-gold-400 rounded-xl px-7 py-5 text-center shadow-[0_0_40px_rgba(232,176,75,0.15)]`}>
              <p className="font-display text-2xl leading-none">تحویل داده شد</p>
              <p className="text-[11px] font-black mt-2 tracking-wide">نسخهٔ {faNum("1.0")} — FinancePro</p>
              <div className="rule-dash text-gold-500/50 my-2.5" />
              <p className="text-[10.5px] font-bold text-ink-3">React · Vite · Tailwind · Supabase</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-mint-400/10">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-5 flex flex-wrap items-center gap-4 text-[11.5px] font-bold text-ink-3">
          <span>سند تحویل پروژه — فایننس‌پرو</span>
          <span className="w-1 h-1 rounded-full bg-ink-3/50" />
          <span>ذخیره به میلادی، نمایش به شمسی</span>
          <a href="#top" className="ms-auto flex items-center gap-1.5 text-mint-300 hover:text-gold-400 transition-colors">
            بازگشت به بالا
            <Icon name="arrow" className="w-3.5 h-3.5 rotate-90" strokeWidth={2.4} />
          </a>
        </div>
      </div>
    </footer>
  );
}
