/* ---------- ویجت‌های تحلیلی: نقشهٔ حرارتی، پیش‌بینی، امتیاز سلامت، نشان‌ها ---------- */
import { useMemo } from "react";
import type { AppState, Tx } from "./lib/data";
import {
  addDaysISO, addJalaliMonths, faNum, groupInt, inRange, jalaliMonthRange,
  jalaliToday, jalaliMonthKey, weekdayOfISO, isoToJalali, MONTHS_FA,
} from "./lib/utils";
import { useInView } from "./lib/utils";

/* ================= نقشهٔ حرارتی خرج (۱۴ هفته) ================= */
export function Heatmap({ txs }: { txs: Tx[] }) {
  const weeks = 14;
  const { cells, max } = useMemo(() => {
    const today = new Date();
    const offset = (today.getDay() + 1) % 7;
    const end = addDaysISO(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`, -offset + 6);
    const start = addDaysISO(end, -(weeks * 7 - 1));
    const byDay = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
    }
    const cells: { date: string; amount: number }[] = [];
    let max = 1;
    for (let i = 0; i < weeks * 7; i++) {
      const date = addDaysISO(start, i);
      const amount = byDay.get(date) ?? 0;
      if (amount > max) max = amount;
      cells.push({ date, amount });
    }
    return { cells, max };
  }, [txs]);

  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" dir="ltr" style={{ width: "max-content" }}>
        {cells.map((c, i) => {
          const lvl = c.amount === 0 ? 0 : Math.min(4, Math.ceil((c.amount / max) * 4));
          return (
            <span
              key={i}
              title={`${c.date} — ${c.amount ? `${faNum(groupInt(c.amount))} تومان` : "بدون خرج"}`}
              className="w-3.5 h-3.5 rounded-[4px] transition-transform duration-150 hover:scale-125"
              style={{
                background: lvl === 0 ? "var(--fp-bg3)"
                  : `color-mix(in srgb, var(--fp-mint) ${lvl * 22 + 8}%, var(--fp-bg3))`,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1 mt-2.5 text-[10px] font-bold" style={{ color: "var(--fp-text3)" }}>
        کم
        {[1, 2, 3, 4].map((l) => (
          <span key={l} className="w-3 h-3 rounded-[3px]"
            style={{ background: `color-mix(in srgb, var(--fp-mint) ${l * 22 + 8}%, var(--fp-bg3))` }} />
        ))}
        زیاد
      </div>
    </div>
  );
}

/* ================= امتیاز سلامت مالی ================= */
export function computeHealthScore(s: AppState, monthTxs: Tx[], lastMonthTxs: Tx[]): {
  score: number; parts: { label: string; pct: number; tip: string }[];
} {
  const income = monthTxs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = monthTxs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const lastExpense = lastMonthTxs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);

  const saveRate = income > 0 ? Math.max(0, (income - expense) / income) : 0;
  const savePct = Math.round(Math.min(1, saveRate / 0.35) * 100);

  let budgetPct = 60;
  if (s.budgets.length) {
    let ok = 0;
    for (const b of s.budgets) {
      const spent = monthTxs.filter((t) => t.type === "expense" && t.categoryId === b.categoryId).reduce((a, t) => a + t.amount, 0);
      if (spent <= b.limit) ok++;
    }
    budgetPct = Math.round((ok / s.budgets.length) * 100);
  }

  const trendPct = lastExpense > 0 ? Math.round(Math.min(1, Math.max(0, 1 - (expense - lastExpense) / lastExpense)) * 100) : 70;
  const validGoals = s.savings_goals.filter((g) => g.target > 0);
  const goalPct = validGoals.length
    ? Math.round(Math.min(1, Math.max(0, Math.max(...validGoals.map((g) => g.saved / g.target)))) * 100)
    : 0;

  const score = Math.round(savePct * 0.35 + budgetPct * 0.25 + trendPct * 0.2 + goalPct * 0.2);
  return {
    score: Math.max(5, Math.min(99, score)),
    parts: [
      { label: "نرخ پس‌انداز", pct: savePct, tip: "سعی کنید حداقل ۳۰٪ درآمد ماه پس‌انداز شود." },
      { label: "پایبندی به بودجه", pct: budgetPct, tip: "برای دسته‌های پرهزینه سقف ماهانه بگذارید." },
      { label: "روند هزینه‌ها", pct: trendPct, tip: "هزینهٔ این ماه را نسبت به ماه قبل کاهش دهید." },
      { label: "پیشرفت اهداف", pct: goalPct, tip: "هدف پس‌انداز تعریف کنید و منظم واریز کنید." },
    ],
  };
}

export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const r = (size - 16) / 2;
  const C = 2 * Math.PI * r;
  const color = score >= 70 ? "var(--fp-mint)" : score >= 45 ? "var(--fp-accent)" : "var(--fp-coral)";
  const label = score >= 70 ? "عالی" : score >= 45 ? "متوسط" : "ضعیف";
  return (
    <div ref={ref} className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fp-bg3)" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={inView ? C * (1 - score / 100) : C}
          style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.3,0.7,0.2,1) 0.2s" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl leading-none" style={{ color }}>{faNum(score)}</div>
        <div className="text-[10.5px] font-black mt-1" style={{ color: "var(--fp-text3)" }}>{label}</div>
      </div>
    </div>
  );
}

/* ================= پیش‌بینی ماه بعد ================= */
export function Forecast({ s }: { s: AppState }) {
  const data = useMemo(() => {
    const t = jalaliToday();
    const months: { key: string; label: string; income: number; expense: number }[] = [];
    for (let i = -5; i <= 1; i++) {
      const m = addJalaliMonths(t.jy, t.jm, i);
      const r = jalaliMonthRange(m.jy, m.jm);
      const txs = s.transactions.filter((x) => inRange(x.date, r));
      months.push({
        key: `${m.jy}-${String(m.jm).padStart(2, "0")}`,
        label: MONTHS_FA[m.jm - 1],
        income: txs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0),
        expense: txs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0),
      });
    }
    const last3 = months.slice(2, 5);
    const avgInc = last3.reduce((a, m) => a + m.income, 0) / 3;
    const avgExp = last3.reduce((a, m) => a + m.expense, 0) / 3;
    const prev = months[4];
    const trend = prev && prev.expense > 0 ? (prev.expense - (months[3]?.expense ?? prev.expense)) / prev.expense : 0;
    const fc = months[6];
    fc.income = Math.round(avgInc * (1 + trend * 0.3));
    fc.expense = Math.round(avgExp * (1 + trend));
    return { months, forecast: fc };
  }, [s]);
  return { ...data };
}

/* ================= اسپارک‌لاین موجودی ================= */
export function Sparkline({ points, height = 56, color = "var(--fp-mint)" }: { points: number[]; height?: number; color?: string }) {
  const w = 220;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((p - min) / span) * (height - 6) - 3).toFixed(1)}`).join(" ");
  return (
    <div dir="ltr" className="w-full">
      <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="none">
        <path d={`${path} L${w},${height} L0,${height} Z`} fill={color} opacity="0.12" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ================= نشان‌ها ================= */
export interface Badge { id: string; icon: string; title: string; desc: string; earned: boolean; }

export function computeBadges(s: AppState): Badge[] {
  const t = jalaliToday();
  const r = jalaliMonthRange(t.jy, t.jm);
  const monthTxs = s.transactions.filter((x) => inRange(x.date, r));
  const income = monthTxs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const expense = monthTxs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
  const saveRate = income > 0 ? (income - expense) / income : 0;

  let streak = 0;
  const expenseDates = new Set(s.transactions.filter((x) => x.type === "expense").map((x) => x.date));
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const dd = new Date(today);
    dd.setDate(dd.getDate() - i);
    const iso = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    if (expenseDates.has(iso)) break;
    streak++;
  }

  return [
    { id: "first", icon: "🌱", title: "قدم اول", desc: "اولین تراکنش را ثبت کردید", earned: s.transactions.length > 0 },
    { id: "saver", icon: "🏦", title: "پس‌اندازکننده", desc: "نرخ پس‌انداز بالای ۳۰٪ این ماه", earned: saveRate > 0.3 },
    { id: "streak3", icon: "🔥", title: "سه روز آرام", desc: "۳ روز پیاپی بدون خرج", earned: streak >= 3 },
    { id: "streak7", icon: "⚡", title: "هفتهٔ طلایی", desc: "۷ روز پیاپی بدون خرج", earned: streak >= 7 },
    { id: "goal", icon: "🎯", title: "هدف‌دار", desc: "یک هدف پس‌انداز بالای ۵۰٪", earned: s.savings_goals.some((g) => g.target > 0 && g.saved / g.target >= 0.5) },
    { id: "clean", icon: "🕊️", title: "بدون بدهی", desc: "هیچ بدهی باز ندارید", earned: s.debts.filter((d) => d.kind === "debt" && d.paid < d.amount).length === 0 },
    { id: "bot", icon: "🤖", title: "همراه ربات", desc: "تراکنشی از ربات تلگرام ثبت شده", earned: s.transactions.some((x) => x.source === "bot") },
    { id: "budget", icon: "📐", title: "منضبط", desc: "بودجهٔ این ماه رعایت شده", earned: s.budgets.length > 0 && s.budgets.every((b) => monthTxs.filter((x) => x.categoryId === b.categoryId && x.type === "expense").reduce((a, x) => a + x.amount, 0) <= b.limit) },
  ];
}

export { jalaliMonthKey, weekdayOfISO, isoToJalali, faNum };
