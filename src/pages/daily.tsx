/* ---------- صفحهٔ حالت روزانه ---------- */
import { Bell, CalendarDays, Check, RefreshCw, Shield, Sun, TrendingUp } from "lucide-react";
import { useStore, type ID } from "../lib/data";
import {
  addDaysISO, faDate, faMoney, faNum, faTime, inRange, jalaliDateStr, jalaliMonthRange,
  jalaliToday, localISODate, useNow,
} from "../lib/utils";
import { CatGlyph } from "../ui";

export default function DailyPage() {
  const { state, mutate } = useStore();
  const now = useNow();
  const today = localISODate(now);
  const t = jalaliToday();

  const todayTxs = state.transactions.filter((x) => x.date === today);
  const spent = todayTxs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
  const earned = todayTxs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);

  const todayAppts = state.appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time));

  const soon = addDaysISO(today, 7);
  const reminders: { icon: React.ReactNode; text: string; color: string }[] = [];
  for (const d of state.debts) {
    if (d.kind === "debt" && d.due && d.amount - d.paid > 0 && d.due >= today && d.due <= soon) {
      reminders.push({ icon: <CoinsMini />, text: `بدهی به ${d.person} — ${faMoney(d.amount - d.paid)} تومان، سررسید ${faDate(d.due)}`, color: "var(--fp-coral)" });
    }
  }
  const mr = jalaliMonthRange(t.jy, t.jm);
  for (const b of state.budgets) {
    const s = state.transactions.filter((x) => x.categoryId === b.categoryId && x.type === "expense" && inRange(x.date, mr)).reduce((a, x) => a + x.amount, 0);
    if (b.limit > 0 && s >= b.limit * 0.8) {
      const name = state.categories.find((c) => c.id === b.categoryId)?.name ?? "دسته";
      reminders.push({
        icon: <Shield className="w-4 h-4" />,
        text: s > b.limit ? `بودجهٔ «${name}» رد شده — ${faMoney(s - b.limit)} تومان مازاد` : `بودجهٔ «${name}» ٪${faNum(Math.round((s / b.limit) * 100))} مصرف شده`,
        color: s > b.limit ? "var(--fp-coral)" : "var(--fp-accent)",
      });
    }
  }
  for (const sub of state.subscriptions) {
    if (sub.renew >= today && sub.renew <= soon) {
      reminders.push({ icon: <RefreshCw className="w-4 h-4" />, text: `تمدید اشتراک «${sub.name}» — ${faMoney(sub.amount)} تومان در ${faDate(sub.renew)}`, color: "var(--fp-sky)" });
    }
  }

  const toggleDone = (id: ID) => {
    mutate((d) => {
      const a = d.appointments.find((x) => x.id === id);
      if (a) a.done = !a.done;
    }, "وضعیت قرار تغییر کرد");
  };

  return (
    <div className="grid gap-5">
      <div className="rise-in">
        <h1 className="font-display text-3xl md:text-4xl flex items-center gap-3">
          <Sun className="w-8 h-8" style={{ color: "var(--fp-accent)" }} /> حالت روزانه
        </h1>
        <p className="text-[13px] font-bold mt-1.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--fp-text3)" }}>
          {jalaliDateStr()}
          <span className="tabular font-display text-[15px]" style={{ color: "var(--fp-accent)" }} dir="ltr">{faTime(now)}</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "40ms" }}>
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>خرج امروز</p>
          <p className="font-display text-3xl tabular mt-1.5" style={{ color: "var(--fp-coral)" }}>{faMoney(spent)}</p>
          <p className="text-[10.5px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>{faNum(todayTxs.filter((x) => x.type === "expense").length)} تراکنش</p>
        </div>
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>درآمد امروز</p>
          <p className="font-display text-3xl tabular mt-1.5" style={{ color: "var(--fp-mint)" }}>{faMoney(earned)}</p>
          <p className="text-[10.5px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>{faNum(todayTxs.filter((x) => x.type === "income").length)} تراکنش</p>
        </div>
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "120ms" }}>
          <p className="text-[11.5px] font-black" style={{ color: "var(--fp-text3)" }}>قرارهای امروز</p>
          <p className="font-display text-3xl tabular mt-1.5" style={{ color: "var(--fp-accent)" }}>
            {faNum(todayAppts.filter((a) => !a.done).length)}
            <span className="text-[15px]" style={{ color: "var(--fp-text3)" }}> از {faNum(todayAppts.length)}</span>
          </p>
          <p className="text-[10.5px] font-bold mt-1" style={{ color: "var(--fp-text3)" }}>باقی‌مانده از امروز</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5 rise-in" style={{ ["--d" as string]: "160ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2">
            <CalendarDays className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> برنامهٔ امروز
          </h3>
          {todayAppts.length === 0 ? (
            <p className="text-[12px] font-bold py-6 text-center" style={{ color: "var(--fp-text3)" }}>برای امروز قراری نداری. 🎉</p>
          ) : (
            <div className="grid gap-2 mt-3">
              {todayAppts.map((a) => (
                <button key={a.id} onClick={() => toggleDone(a.id)}
                  className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-start cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ borderColor: a.done ? "var(--fp-border)" : "color-mix(in srgb, var(--fp-mint) 40%, transparent)", background: a.done ? "var(--fp-bg)" : "color-mix(in srgb, var(--fp-mint) 6%, transparent)" }}>
                  <span className="font-display text-xl tabular shrink-0" dir="ltr" style={{ color: a.done ? "var(--fp-text3)" : "var(--fp-accent)" }}>{faNum(a.time)}</span>
                  <span className={`flex-1 text-[12.5px] font-black ${a.done ? "line-through opacity-60" : ""}`}>{a.title}</span>
                  <span className="w-5 h-5 rounded-md grid place-items-center shrink-0 border"
                    style={{ borderColor: a.done ? "var(--fp-mint)" : "var(--fp-border2)", background: a.done ? "var(--fp-mint)" : "transparent" }}>
                    {a.done && <Check className="w-3.5 h-3.5" strokeWidth={3.5} style={{ color: "#071b16" }} />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 rise-in" style={{ ["--d" as string]: "200ms" }}>
          <h3 className="text-[14px] font-black flex items-center gap-2">
            <Bell className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> یادآوری‌های هفتهٔ پیشِ رو
          </h3>
          {reminders.length === 0 ? (
            <p className="text-[12px] font-bold py-6 text-center" style={{ color: "var(--fp-text3)" }}>چیز نگران‌کننده‌ای در راه نیست. 😌</p>
          ) : (
            <div className="grid gap-2 mt-3">
              {reminders.map((r, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border"
                  style={{ borderColor: `color-mix(in srgb, ${r.color} 35%, transparent)`, background: `color-mix(in srgb, ${r.color} 7%, transparent)` }}>
                  <span style={{ color: r.color }} className="shrink-0">{r.icon}</span>
                  <span className="text-[12px] font-bold leading-6">{r.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "240ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2">
          <TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> تراکنش‌های امروز
        </h3>
        {todayTxs.length === 0 ? (
          <p className="text-[12px] font-bold py-6 text-center" style={{ color: "var(--fp-text3)" }}>امروز هنوز تراکنشی ثبت نشده.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-1.5 mt-3">
            {todayTxs.map((x) => {
              const c = state.categories.find((cc) => cc.id === x.categoryId);
              return (
                <div key={x.id} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: "var(--fp-bg)" }}>
                  <CatGlyph icon={c?.icon} color={c?.color} className="w-7 h-7 rounded-lg" iconClass="w-3.5 h-3.5" />
                  <span className="flex-1 text-[12px] font-black truncate">{x.note || x.title}</span>
                  <span className="text-[12px] font-black tabular shrink-0" style={{ color: x.type === "income" ? "var(--fp-mint)" : "var(--fp-coral)" }}>
                    {x.type === "income" ? "+" : "−"}{faMoney(x.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CoinsMini() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M15.5 5.5a6 6 0 1 1-8 8" strokeLinecap="round" /><path d="M7 9h4M9 7v4" strokeLinecap="round" /></svg>; }
