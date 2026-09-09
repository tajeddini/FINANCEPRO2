/* ---------- صفحهٔ داشبورد ---------- */
import { useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpLeft, Bot, Coins, Landmark, Lightbulb, Plus, Receipt, Sparkles, Wallet,
} from "lucide-react";
import { catById, getTags, sumTx, useStore } from "../lib/data";
import {
  faMoney, faNum, inRange, jalaliDateStr, jalaliMonthRange, jalaliShort, jalaliToday,
  localISODate, useCountUp,
} from "../lib/utils";
import { readAccent } from "../lib/themes";
import { Bar, CatGlyph, hiddenMoney } from "../ui";
import { Sparkline } from "../widgets";
import { EyeOff, EyeOn, Head } from "./shared";

export default function DashboardPage({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { state } = useStore();
  const t = jalaliToday();
  const mr = jalaliMonthRange(t.jy, t.jm);
  const monthTxs = state.transactions.filter((x) => inRange(x.date, mr));
  const income = sumTx(monthTxs, "income");
  const expense = sumTx(monthTxs, "expense");
  const total = state.accounts.reduce((s, a) => s + a.balance, 0);

  const [hideBal, setHideBal] = useState(false);
  const [hideInc, setHideInc] = useState(false);
  const [hideExp, setHideExp] = useState(false);
  const [hideAcc, setHideAcc] = useState(false);

  const bal = useCountUp(total);
  const inc = useCountUp(income);
  const exp = useCountUp(expense);

  const isGlass = (state.prefs.accent ?? readAccent()) === "glass-dark";
  const saveRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const spark = useMemo(() => {
    const pts: number[] = [];
    let run = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = localISODate(d);
      const day = state.transactions.filter((x) => x.date === iso);
      run += day.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0)
        - day.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
      pts.push(run + total);
    }
    return pts;
  }, [state.transactions, total]);

  const recent = [...state.transactions].sort((a, b) => (b.date + b.createdAt).toString().localeCompare((a.date + a.createdAt).toString())).slice(0, 6);
  const challenge = state.challenges[0];
  const currenciesTotal = state.currencies.reduce((s, c) => s + c.rate * c.qty, 0);

  /* تحلیل رفتار خرج این ماه بر اساس برچسب‌ها */
  const tagAnalysis = useMemo(() => {
    const expTxs = monthTxs.filter((x) => x.type === "expense");
    const byTag = new Map<string, { label: string; color: string; sum: number; count: number }>();
    let untagged = 0;
    for (const x of expTxs) {
      const tg = x.tag ? getTags(state).find((t) => t.id === x.tag) : undefined;
      if (!tg) { untagged += x.amount; continue; }
      const cur = byTag.get(tg.id) ?? { label: tg.label, color: tg.color, sum: 0, count: 0 };
      cur.sum += x.amount; cur.count++;
      byTag.set(tg.id, cur);
    }
    const rows = [...byTag.values()].sort((a, b) => b.sum - a.sum);
    const potential = rows.filter((r) => !r.label.includes("ضروری")).reduce((s, r) => s + r.sum, 0);
    return { rows, untagged, potential };
  }, [monthTxs, state]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rise-in">
        <div>
          <h1 className="font-display text-3xl md:text-4xl leading-tight">سلام! 👋</h1>
          <p className="text-[13px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>{jalaliDateStr()}</p>
        </div>
        <button className="btn btn-gold no-print" onClick={onQuickAdd}>
          <Plus className="w-4 h-4" strokeWidth={3} /> ثبت سریع تراکنش
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5" />} title="موجودی کل" color="var(--fp-accent)"
          value={hideBal ? hiddenMoney : faMoney(bal)} suffix="تومان"
          hide={hideBal} onHide={() => setHideBal(!hideBal)}
          ring={isGlass ? saveRate : undefined}
          foot={<Sparkline points={spark} height={44} color="var(--fp-accent)" />}
        />
        <StatCard
          icon={<ArrowDownRight className="w-5 h-5" />} title="درآمد این ماه" color="var(--fp-mint)"
          value={hideInc ? hiddenMoney : faMoney(inc)} suffix="تومان"
          hide={hideInc} onHide={() => setHideInc(!hideInc)}
          foot={<Bar pct={income > 0 ? 100 : 0} color="var(--fp-mint)" />}
        />
        <StatCard
          icon={<ArrowUpLeft className="w-5 h-5" />} title="هزینهٔ این ماه" color="var(--fp-coral)"
          value={hideExp ? hiddenMoney : faMoney(exp)} suffix="تومان"
          hide={hideExp} onHide={() => setHideExp(!hideExp)}
          foot={<Bar pct={income > 0 ? Math.min(100, (expense / income) * 100) : 0} color="var(--fp-coral)" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2 rise-in" style={{ ["--d" as string]: "80ms" }}>
          <div className="flex items-center justify-between mb-4">
            <Head icon={<Landmark className="w-4.5 h-4.5" />} title="موجودی حساب‌ها" />
            <button className="icon-btn !w-8 !h-8" onClick={() => setHideAcc(!hideAcc)} title={hideAcc ? "نمایش" : "مخفی کردن"}>
              {hideAcc ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {state.accounts.map((a) => (
              <div key={a.id} className="rounded-xl border p-3.5 flex items-center gap-3 transition-all hover:-translate-y-0.5" style={{ borderColor: "var(--fp-border)", background: "var(--fp-bg)" }}>
                <CatGlyph icon="wallet" color={a.color} className="w-10 h-10 rounded-xl" iconClass="w-5 h-5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-black truncate">{a.name}</p>
                  <p className="text-[10px] font-bold truncate" style={{ color: "var(--fp-text3)" }}>{a.type}</p>
                </div>
                <p className="text-[13px] font-black tabular shrink-0 whitespace-nowrap" style={{ color: a.balance < 0 ? "var(--fp-coral)" : "var(--fp-text)" }}>
                  {hideAcc ? hiddenMoney : faMoney(a.balance)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 rise-in" style={{ ["--d" as string]: "120ms" }}>
          <Head icon={<Receipt className="w-4.5 h-4.5" />} title="فعالیت اخیر" />
          <div className="grid gap-2 mt-3">
            {recent.length === 0 && <p className="text-[12px] font-bold text-center py-4" style={{ color: "var(--fp-text3)" }}>هنوز تراکنشی نداری.</p>}
            {recent.map((x) => {
              const c = catById(state, x.categoryId);
              return (
                <div key={x.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                  <CatGlyph icon={c?.icon} color={c?.color} className="w-8 h-8 rounded-lg" iconClass="w-4 h-4" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black truncate">{x.note || x.title}</p>
                    <p className="text-[9.5px] font-bold flex items-center gap-1" style={{ color: "var(--fp-text3)" }}>
                      {jalaliShort(x.date)}
                      {x.source === "bot" && <span className="flex items-center gap-0.5" style={{ color: "var(--fp-sky)" }}><Bot className="w-3 h-3" /> ربات</span>}
                    </p>
                  </div>
                  <span className="text-[12px] font-black tabular shrink-0 whitespace-nowrap" style={{ color: x.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                    {x.type === "income" ? "+" : "−"}{faMoney(x.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {challenge && (
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "160ms" }}>
            <Head icon={<Sparkles className="w-4.5 h-4.5" />} title={challenge.title} />
            <div className="mt-3">
              <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-[12px] font-black mb-1.5">
                <span className="tabular whitespace-nowrap" style={{ color: "var(--fp-text2)" }}>{faMoney(challenge.saved)} از {faMoney(challenge.target)}</span>
                <span className="tabular whitespace-nowrap" style={{ color: "var(--fp-accent)" }}>٪{faNum(Math.min(100, Math.round((challenge.saved / challenge.target) * 100)))}</span>
              </div>
              <Bar pct={(challenge.saved / challenge.target) * 100} color="var(--fp-accent)" />
              <p className="text-[10.5px] font-bold mt-2" style={{ color: "var(--fp-text3)" }}>روزی {faMoney(challenge.perDay)} تومان</p>
            </div>
          </div>
        )}
        {currenciesTotal > 0 && (
          <div className="card p-5 rise-in" style={{ ["--d" as string]: "200ms" }}>
            <Head icon={<Coins className="w-4.5 h-4.5" />} title="ارز خارجی" />
            <div className="grid gap-2 mt-3">
              {state.currencies.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
                  <span className="text-[12px] font-black min-w-0 truncate">{c.name} <span style={{ color: "var(--fp-text3)" }}>({c.symbol})</span></span>
                  <span className="text-[12px] font-black tabular shrink-0 whitespace-nowrap">{faMoney(c.rate * c.qty)} <span className="text-[9.5px]" style={{ color: "var(--fp-text3)" }}>تومان</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {expense > 0 && (
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "240ms" }}>
          <div className="flex items-center justify-between mb-4">
            <Head icon={<Lightbulb className="w-4.5 h-4.5" />} title="تحلیل رفتار خرج" />
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--fp-accent) 14%, transparent)", color: "var(--fp-accent)" }}>این ماه</span>
          </div>
          <div className="grid lg:grid-cols-2 gap-6 lg:items-center">
            <div>
              <p className="text-[13px] font-bold leading-7" style={{ color: "var(--fp-text2)" }}>
                از <b className="tabular" style={{ color: "var(--fp-text)" }}>{faMoney(expense)}</b> تومان خرجِ این ماه،
                {" "}<b className="tabular" style={{ color: "var(--fp-mint)" }}>{faMoney(tagAnalysis.potential)}</b> تومان
                خرجِ غیرضروری بود — همون می‌تونست پس‌انداز بشه.
              </p>
              {tagAnalysis.untagged > 0 && (
                <p className="text-[10.5px] font-bold mt-2.5 leading-5" style={{ color: "var(--fp-text3)" }}>
                  {faMoney(tagAnalysis.untagged)} تومان هم بدون برچسبه — اگه برچسب بزنی، تحلیل دقیق‌تر می‌شه.
                </p>
              )}
            </div>
            <div className="grid gap-3">
              {tagAnalysis.rows.slice(0, 4).map((r, i) => (
                <div key={r.label}>
                  <div className="flex justify-between gap-2 text-[11px] font-black mb-1">
                    <span className="min-w-0 truncate" style={{ color: r.color }}>
                      {r.label} <span style={{ color: "var(--fp-text3)" }}>({faNum(r.count)})</span>
                    </span>
                    <span className="tabular shrink-0 whitespace-nowrap" style={{ color: "var(--fp-text)" }}>{faMoney(r.sum)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--fp-bg3)" }}>
                    <div className="h-full rounded-full grow-x" style={{ width: `${Math.max(4, (r.sum / expense) * 100)}%`, background: r.color, animationDelay: `${i * 90}ms` }} />
                  </div>
                </div>
              ))}
              {tagAnalysis.rows.length === 0 && (
                <p className="text-[11px] font-bold text-center py-3" style={{ color: "var(--fp-text3)" }}>
                  هنوز خرجی برچسب نخورده — موقع ثبت تراکنش برچسب بزن.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, suffix, color, hide, onHide, foot, ring }: {
  icon: React.ReactNode; title: string; value: string; suffix: string; color: string;
  hide: boolean; onHide: () => void; foot?: React.ReactNode; ring?: number;
}) {
  return (
    <div className="card card-hover p-5 relative overflow-hidden rise-in">
      <div className="absolute -top-8 -start-8 w-28 h-28 rounded-full opacity-[0.12]" style={{ background: color }} />
      {ring !== undefined && <GlassRing pct={ring} />}
      <div className="flex items-center justify-between relative gap-2">
        <span className="flex items-center gap-2 text-[12px] font-black min-w-0" style={{ color: "var(--fp-text3)" }}>
          <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{icon}</span>
          <span className="truncate">{title}</span>
        </span>
        <button className="icon-btn !w-8 !h-8 shrink-0" onClick={onHide} title={hide ? "نمایش" : "مخفی کردن"}>
          {hide ? <EyeOff /> : <EyeOn />}
        </button>
      </div>
      <p className="font-display text-[clamp(1.25rem,5.5vw,1.875rem)] mt-3 tabular relative leading-tight whitespace-nowrap" style={{ color: hide ? "var(--fp-text3)" : color }}>
        {value} {!hide && <span className="text-[12px] font-body font-bold" style={{ color: "var(--fp-text3)" }}>{suffix}</span>}
      </p>
      <div className="mt-2.5 relative">{foot}</div>
    </div>
  );
}

function GlassRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div className="absolute top-4 end-4 z-10 grid place-items-center" title={`نرخ پس‌انداز: ٪${faNum(clamped)}`}>
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={R} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
        <circle cx="38" cy="38" r={R} fill="none" stroke="var(--fp-accent)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - clamped / 100)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.3,0.7,0.2,1)", filter: "drop-shadow(0 0 6px rgba(212,175,55,0.45))" }} />
      </svg>
      <span className="absolute text-[13px] font-extrabold tabular" style={{ color: "var(--fp-accent)" }}>٪{faNum(clamped)}</span>
    </div>
  );
}
