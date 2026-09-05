/* ---------- صفحهٔ گزارش‌ها و تحلیل ---------- */
import { useMemo, useState } from "react";
import { ArrowLeftRight, BarChart3, Copy, Download, FileDown, Printer, Shield, Sparkles, Target, TrendingUp } from "lucide-react";
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { catById, getTags, useStore, type AppState } from "../lib/data";
import { addJalaliMonths, copyText, faMoney, faNum, inRange, jalaliDateStr, jalaliMonthRange, jalaliToday } from "../lib/utils";
import { Bar, Modal, PeriodFilter, usePeriod, useToast } from "../ui";
import { computeBadges, computeHealthScore, Forecast, Heatmap, ScoreRing } from "../widgets";
import { exportExcel, exportCSV } from "../excel";

/* ---------- گزارش هوشمند — متن جامع و ساختاریافته برای تحلیل با هوش مصنوعی ---------- */
function buildSmartReport(s: AppState): string {
  const t = jalaliToday();
  const mr = jalaliMonthRange(t.jy, t.jm);
  const txs = s.transactions.filter((x) => inRange(x.date, mr));
  const income = txs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const expense = txs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
  const total = s.accounts.reduce((a, x) => a + x.balance, 0);
  const L: string[] = [];
  L.push(`# گزارش مالی فایننس‌پرو — ${jalaliDateStr()}`);
  L.push("");
  L.push("این گزارش برای تحلیل توسط هوش مصنوعی تهیه شده است. همهٔ مبالغ به تومان است.");
  L.push("");
  L.push("## ۱. نمای کلی این ماه");
  L.push(`- موجودی کل حساب‌ها: ${faMoney(total)}`);
  L.push(`- درآمد: ${faMoney(income)}`);
  L.push(`- هزینه: ${faMoney(expense)}`);
  L.push(`- تراز (درآمد − هزینه): ${faMoney(income - expense)}`);
  L.push(`- نرخ پس‌انداز: ٪${faNum(income > 0 ? Math.round(((income - expense) / income) * 100) : 0)}`);
  L.push("");
  L.push("## ۲. تفکیک هزینه بر اساس دسته");
  const byCat = new Map<string, number>();
  for (const x of txs.filter((x) => x.type === "expense")) {
    const name = catById(s, x.categoryId)?.name ?? "نامشخص";
    byCat.set(name, (byCat.get(name) ?? 0) + x.amount);
  }
  [...byCat.entries()].sort((a, b) => b[1] - a[1]).forEach(([name, sum]) => {
    L.push(`- ${name}: ${faMoney(sum)} (٪${faNum(expense > 0 ? Math.round((sum / expense) * 100) : 0)} از کل هزینه)`);
  });
  if (byCat.size === 0) L.push("- هزینه‌ای ثبت نشده.");
  L.push("");
  L.push("## ۳. رفتار خرج بر اساس برچسب");
  const byTag = new Map<string, number>();
  let untagged = 0;
  for (const x of txs.filter((x) => x.type === "expense")) {
    const tg = x.tag ? getTags(s).find((g) => g.id === x.tag) : undefined;
    if (!tg) { untagged += x.amount; continue; }
    byTag.set(tg.label, (byTag.get(tg.label) ?? 0) + x.amount);
  }
  [...byTag.entries()].sort((a, b) => b[1] - a[1]).forEach(([label, sum]) => L.push(`- ${label}: ${faMoney(sum)}`));
  if (untagged > 0) L.push(`- بدون برچسب: ${faMoney(untagged)}`);
  if (byTag.size === 0 && untagged === 0) L.push("- داده‌ای نیست.");
  L.push("");
  L.push("## ۴. بودجه‌ها");
  if (s.budgets.length === 0) L.push("- بودجه‌ای تعریف نشده.");
  s.budgets.forEach((b) => {
    const name = catById(s, b.categoryId)?.name ?? "?";
    const spent = byCat.get(name) ?? 0;
    L.push(`- ${name}: سقف ${faMoney(b.limit)} · خرج‌شده ${faMoney(spent)} · ${spent > b.limit ? "مازاد بر سقف!" : "باقی‌مانده " + faMoney(b.limit - spent)}`);
  });
  L.push("");
  L.push("## ۵. بدهی‌ها و طلب‌ها");
  if (s.debts.length === 0) L.push("- موردی نیست.");
  s.debts.forEach((d) => L.push(`- ${d.kind === "debt" ? "بدهی به" : "طلب از"} ${d.person}: ${faMoney(d.amount - d.paid)} باقی‌مانده`));
  L.push("");
  L.push("## ۶. اهداف پس‌انداز");
  if (s.savings_goals.length === 0) L.push("- هدفی نیست.");
  s.savings_goals.forEach((g) => L.push(`- ${g.title}: ${faMoney(g.saved)} از ${faMoney(g.target)} (٪${faNum(Math.round((g.saved / g.target) * 100))})`));
  L.push("");
  L.push("## ۷. درخواست از هوش مصنوعی");
  L.push("بر اساس این داده‌ها: ۱) وضعیت مالی را در ۳ جمله خلاصه کن، ۲) ۳ نقطهٔ قوت و ۳ نقطهٔ ضعف را بگو، ۳) ۵ راهکار عملی برای ماه بعد بده، ۴) یک بودجه‌بندی پیشنهادی ارائه کن. پاسخ را به فارسی و ساده بده.");
  return L.join("\n");
}

export default function ReportsPage() {
  const { state } = useStore();
  const toast = useToast();
  const t = jalaliToday();
  const pf = usePeriod("thisMonth");
  const range = pf.range;
  const monthTxs = state.transactions.filter((x) => inRange(x.date, range));

  const lastMonth = addJalaliMonths(t.jy, t.jm, -1);
  const lastRange = jalaliMonthRange(lastMonth.jy, lastMonth.jm);
  const lastMonthTxs = state.transactions.filter((x) => inRange(x.date, lastRange));

  const health = computeHealthScore(state, monthTxs, lastMonthTxs);
  const badges = computeBadges(state);
  const forecast = Forecast({ s: state });

  const chartData = useMemo(() => {
    return forecast.months.map((m, i) => ({
      name: i === 6 ? `${m.label} (پیش‌بینی)` : m.label,
      درآمد: m.income,
      هزینه: m.expense,
    }));
  }, [forecast]);

  /* مقایسهٔ ماهانه: این ماه در برابر ماه قبل، بر اساس دسته */
  const comparison = useMemo(() => {
    const sumBy = (arr: AppState["transactions"]) => {
      const m = new Map<string, number>();
      for (const x of arr.filter((x) => x.type === "expense")) {
        const name = catById(state, x.categoryId)?.name ?? "نامشخص";
        m.set(name, (m.get(name) ?? 0) + x.amount);
      }
      return m;
    };
    const cur = sumBy(monthTxs);
    const prev = sumBy(lastMonthTxs);
    const names = [...new Set([...cur.keys(), ...prev.keys()])];
    return names
      .map((name) => ({ name, cur: cur.get(name) ?? 0, prev: prev.get(name) ?? 0 }))
      .sort((a, b) => b.cur - a.cur)
      .slice(0, 6);
  }, [monthTxs, lastMonthTxs, state]);

  /* گزارش هوشمند */
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const openReport = () => { setReportText(buildSmartReport(state)); setReportOpen(true); };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <h1 className="font-display text-3xl md:text-4xl flex items-center gap-3">
          <BarChart3 className="w-8 h-8" style={{ color: "var(--fp-accent)" }} /> گزارش‌ها و تحلیل
        </h1>
        <div className="flex gap-2">
          <button className="btn btn-mint btn-sm" onClick={openReport}>
            <Sparkles className="w-4 h-4" /> گزارش هوشمند
          </button>
          <button className="btn btn-gold btn-sm" onClick={() => { exportExcel(state, { txs: monthTxs, periodLabel: pf.label }); toast("ok", "فایل اکسل چندبرگی دانلود شد."); }}>
            <Download className="w-4 h-4" /> خروجی اکسل
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { exportCSV(state); toast("ok", "خروجی CSV دانلود شد."); }}>
            <FileDown className="w-4 h-4" /> CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> چاپ / PDF
          </button>
        </div>
      </div>

      <PeriodFilter pf={pf} count={<>{faNum(monthTxs.length)} تراکنش</>} className="rise-in" />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 flex flex-col items-center rise-in" style={{ ["--d" as string]: "60ms" }}>
          <h3 className="text-[14px] font-black self-start flex items-center gap-2"><Shield className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> امتیاز سلامت مالی</h3>
          <div className="my-4"><ScoreRing score={health.score} /></div>
          <div className="w-full grid gap-2.5">
            {health.parts.map((p) => (
              <div key={p.label} title={p.tip}>
                <div className="flex justify-between text-[11px] font-black mb-1">
                  <span style={{ color: "var(--fp-text2)" }}>{p.label}</span>
                  <span style={{ color: "var(--fp-accent)" }}>٪{faNum(p.pct)}</span>
                </div>
                <Bar pct={p.pct} color={p.pct >= 70 ? "var(--fp-mint)" : p.pct >= 45 ? "var(--fp-accent)" : "var(--fp-coral)"} />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2 rise-in" style={{ ["--d" as string]: "100ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2"><TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> درآمد و هزینه — ۶ ماه اخیر + پیش‌بینی</h3>
          <div className="mt-4" dir="ltr" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--fp-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--fp-text3)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--fp-text3)" }} tickFormatter={(v: number) => `${v / 1000000}M`} />
                <RTooltip contentStyle={{ background: "var(--fp-bg2)", border: "1px solid var(--fp-border)", borderRadius: 12, direction: "rtl" }} />
                <Legend />
                <RBar dataKey="درآمد" fill="var(--fp-mint)" radius={[6, 6, 0, 0]} />
                <RBar dataKey="هزینه" fill="var(--fp-coral)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] font-bold mt-2" style={{ color: "var(--fp-text3)" }}>
            پیش‌بینی ماه بعد: درآمد ~{faMoney(forecast.forecast.income)} · هزینه ~{faMoney(forecast.forecast.expense)} تومان
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "140ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2"><Target className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> نقشهٔ حرارتی خرج (۱۴ هفته)</h3>
          <div className="mt-4 overflow-x-auto"><Heatmap txs={state.transactions} /></div>
        </div>

        <div className="card p-5 rise-in" style={{ ["--d" as string]: "180ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2"><Sparkles className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> نشان‌ها</h3>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {badges.map((b) => (
              <div key={b.id} className="rounded-xl border p-3 flex items-center gap-2.5 transition-all"
                style={{ borderColor: b.earned ? "color-mix(in srgb, var(--fp-accent) 45%, transparent)" : "var(--fp-border)", background: b.earned ? "color-mix(in srgb, var(--fp-accent) 8%, transparent)" : "var(--fp-bg)", opacity: b.earned ? 1 : 0.5 }}>
                <span className="text-xl">{b.icon}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-black">{b.title}</p>
                  <p className="text-[9.5px] font-bold truncate" style={{ color: "var(--fp-text3)" }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "220ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><ArrowLeftRight className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> مقایسهٔ ماهانه (این ماه در برابر ماه قبل)</h3>
        {comparison.length === 0 ? (
          <p className="text-[12px] font-bold py-5 text-center" style={{ color: "var(--fp-text3)" }}>داده‌ای برای مقایسه نیست.</p>
        ) : (
          <div className="grid gap-3 mt-4">
            {comparison.map((c) => {
              const max = Math.max(c.cur, c.prev, 1);
              const diff = c.cur - c.prev;
              return (
                <div key={c.name}>
                  <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-[11.5px] font-black mb-1.5">
                    <span className="min-w-0 truncate" style={{ color: "var(--fp-text)" }}>{c.name}</span>
                    <span className="flex items-center gap-2 tabular whitespace-nowrap shrink-0">
                      <span style={{ color: "var(--fp-text3)" }}>{faMoney(c.prev)} ←</span>
                      <span style={{ color: "var(--fp-text)" }}>{faMoney(c.cur)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: diff > 0 ? "color-mix(in srgb, var(--fp-coral) 15%, transparent)" : "color-mix(in srgb, var(--fp-mint) 15%, transparent)", color: diff > 0 ? "var(--fp-coral)" : "var(--fp-mint)" }}>
                        {diff > 0 ? "▲" : "▼"} {faMoney(Math.abs(diff))}
                      </span>
                    </span>
                  </div>
                  <div className="grid gap-1">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--fp-bg3)" }}>
                      <div className="h-full rounded-full grow-x" style={{ width: `${(c.prev / max) * 100}%`, background: "var(--fp-text3)", opacity: 0.5 }} />
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--fp-bg3)" }}>
                      <div className="h-full rounded-full grow-x" style={{ width: `${(c.cur / max) * 100}%`, background: diff > 0 ? "var(--fp-coral)" : "var(--fp-mint)" }} />
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] font-bold" style={{ color: "var(--fp-text3)" }}>نوار کم‌رنگ: ماه قبل · نوار پررنگ: این ماه</p>
          </div>
        )}
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="گزارش هوشمند (برای تحلیل با هوش مصنوعی)" wide>
        <p className="text-[11.5px] font-bold leading-6 mb-3" style={{ color: "var(--fp-text2)" }}>
          این گزارش، خلاصهٔ کامل وضعیت مالی شماست. آن را کپی کنید و به یک هوش مصنوعی (مثل ChatGPT یا Claude) بدهید تا تحلیل و راهکار بگیرید.
        </p>
        <textarea readOnly value={reportText} dir="rtl" rows={14}
          className="input !text-[11.5px] !leading-6 resize-y" style={{ background: "var(--fp-bg)" }} />
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn btn-gold btn-sm" onClick={async () => { const ok = await copyText(reportText); toast(ok ? "ok" : "err", ok ? "گزارش کپی شد — حالا به هوش مصنوعی بدهید." : "کپی ناموفق بود."); }}>
            <Copy className="w-4 h-4" /> کپی گزارش
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setReportOpen(false)}>بستن</button>
        </div>
      </Modal>
    </div>
  );
}
