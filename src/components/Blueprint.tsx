import { useMemo, useState } from "react";
import {
  DATA_TABLES,
  FILE_TREE,
  RUN_COMMANDS,
  SUPABASE_TABLES,
  TECH_ROWS,
  type TableGroup,
  type TreeNode,
} from "../content";
import { faNum } from "../lib/utils";
import { Icon } from "./icons";
import { CopyButton, Reveal, SectionHead } from "./shared";

/* ================= پشتهٔ فناوری ================= */
export function TechStack() {
  return (
    <section id="tech" className="relative bg-paper ledger-light text-pine-850">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28">
        <SectionHead
          light
          index="۰۳"
          kicker="فناوری‌ها"
          title="پشته‌ای که رویش حساب باز شده"
          desc="هر انتخاب دلیل دارد: jalaali-js برای شمسی، ExcelJS برای خروجی چندبرگی، و Supabase برای Realtime. هیچ وابستگی اضافه‌ای راه نیفتاده."
        />

        <div className="grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-8">
            <div className="rounded-xl border border-pine-700/20 overflow-hidden bg-paper-2/50">
              <div className="grid grid-cols-[3rem_1fr_1.6fr] sm:grid-cols-[4rem_1fr_1.8fr] bg-pine-850 text-gold-400 text-[12px] font-black px-5 py-3">
                <span>ردیف</span>
                <span>حوزه</span>
                <span>فناوری</span>
              </div>
              {TECH_ROWS.map((r, i) => (
                <div
                  key={r.area}
                  className={`grid grid-cols-[3rem_1fr_1.6fr] sm:grid-cols-[4rem_1fr_1.8fr] items-center px-5 py-3.5 transition-colors duration-200 hover:bg-gold-500/15 group ${
                    i % 2 ? "bg-pine-700/[0.045]" : ""
                  } ${i < TECH_ROWS.length - 1 ? "border-b border-pine-700/12" : ""}`}
                >
                  <span className="font-display text-lg text-pine-700/35 group-hover:text-gold-500 transition-colors tabular-nums">
                    {faNum(i + 1).padStart(2, "۰")}
                  </span>
                  <span className="flex items-center gap-2.5 text-[13.5px] font-black text-pine-850">
                    <span className="w-7 h-7 rounded-md bg-pine-850 text-gold-400 grid place-items-center shrink-0">
                      <Icon name={r.icon} className="w-3.5 h-3.5" strokeWidth={2.1} />
                    </span>
                    {r.area}
                  </span>
                  <span dir="auto" className="text-[13px] font-semibold text-pine-700/90 leading-6">
                    {r.tech}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="lg:col-span-4" delay={150}>
            <div className="lg:sticky lg:top-28 grid gap-4">
              <div className="rounded-xl border border-pine-700/20 bg-pine-850 text-ink p-6">
                <Icon name="sliders" className="w-6 h-6 text-gold-400" />
                <p className="font-display text-xl mt-3">تم = متغیرها</p>
                <p className="text-[13px] leading-7 text-ink-2 mt-2">
                  همهٔ رنگ‌ها در CSS Variables با پیشوند{" "}
                  <code dir="ltr" className="text-mint-300 bg-pine-950/70 rounded px-1.5 py-0.5 text-[11.5px]">--fp-*</code>{" "}
                  تعریف شده‌اند؛ تم روشن و تیره فقط با جابه‌جایی متغیرها.
                </p>
              </div>
              <div className="rounded-xl border-2 border-dashed border-pine-700/25 p-6">
                <p className="text-[12.5px] font-black text-pine-850 mb-3">اجرای لوکال، چهار فرمان:</p>
                <div className="grid gap-2">
                  {RUN_COMMANDS.map((c) => (
                    <div key={c.cmd} className="rounded-lg bg-pine-850 px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <code dir="ltr" className="text-[11.5px] font-bold text-mint-300 truncate">{c.cmd}</code>
                        <CopyButton text={c.cmd} />
                      </div>
                      <p className="text-[10.5px] font-semibold text-ink-3 mt-1">{c.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================= ساختار فایل‌ها ================= */
function treeToText(node: TreeNode): string {
  const lines: string[] = [];
  const walk = (n: TreeNode, prefix: string, isLast: boolean, isRoot: boolean) => {
    const connector = isRoot ? "" : isLast ? "└── " : "├── ";
    lines.push(`${prefix}${connector}${n.name}${n.note ? `  ← ${n.note}` : ""}`);
    const kids = n.children ?? [];
    kids.forEach((k, i) => {
      walk(k, isRoot ? "" : prefix + (isLast ? "    " : "│   "), i === kids.length - 1, false);
    });
  };
  walk(node, "", true, true);
  return lines.join("\n");
}

function TreeRow({ node, depth = 0, last = false }: { node: TreeNode; depth?: number; last?: boolean }) {
  const isDir = !!node.children;
  return (
    <div>
      <div
        className="group flex items-baseline gap-2.5 py-[5px] rounded hover:bg-mint-400/6 px-2 -mx-2 transition-colors"
        style={{ paddingInlineStart: `${depth * 26}px` }}
      >
        <span className="text-pine-600 select-none text-[13px]" dir="ltr">
          {depth > 0 ? (last ? "└──" : "├──") : ""}
        </span>
        <span className={isDir ? "text-gold-400" : "text-mint-400/80"}>
          <Icon name={isDir ? "folder" : "file"} className="w-3.5 h-3.5 translate-y-0.5" strokeWidth={2} />
        </span>
        <span dir="ltr" className={`text-[12.5px] font-bold ${isDir ? "text-gold-300" : "text-ink"} group-hover:text-gold-300 transition-colors`}>
          {node.name}
        </span>
        {node.note && (
          <span className="text-[11.5px] text-ink-3 font-semibold truncate opacity-80 group-hover:opacity-100">
            — {node.note}
          </span>
        )}
      </div>
      {node.children?.map((k, i) => (
        <TreeRow
          key={k.name}
          node={k}
          depth={depth + 1}
          last={i === (node.children?.length ?? 0) - 1}
        />
      ))}
    </div>
  );
}

export function FileStructure() {
  const plain = useMemo(() => treeToText(FILE_TREE), []);
  return (
    <section id="files" className="relative ledger-dark glow-top">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28">
        <SectionHead
          index="۰۴"
          kicker="ساختار فایل‌ها"
          title="نقشهٔ گنجِ ریپازیتوری"
          desc="هر فایل مسئولیت مشخصی دارد؛ هستهٔ منطق در src/lib و پوستهٔ UI در src. کنار هر فایل، نقشش آمده."
        />

        <div className="grid lg:grid-cols-12 gap-8">
          <Reveal className="lg:col-span-7">
            <div className="rounded-xl border border-mint-400/15 overflow-hidden bg-pine-900/85 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-mint-400/12 bg-pine-850">
                <div className="flex items-center gap-2.5">
                  <Icon name="folder" className="w-4 h-4 text-gold-400" />
                  <span className="text-[12.5px] font-black text-ink">ساختار پروژه</span>
                </div>
                <CopyButton text={plain} />
              </div>
              <div className="p-5 max-h-[560px] overflow-y-auto">
                <TreeRow node={FILE_TREE} />
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-5" delay={140}>
            <div className="grid gap-4 lg:sticky lg:top-28">
              <div className="rounded-xl border border-mint-400/15 bg-pine-900/85 p-6">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-gold-500/15 border border-gold-500/35 grid place-items-center text-gold-400">
                    <Icon name="db" className="w-5 h-5" />
                  </span>
                  <p className="font-display text-xl text-ink">lib/ = مغز پروژه</p>
                </div>
                <p className="text-[13px] leading-7 text-ink-2 mt-3">
                  data.tsx مدل ۱۹ جدولی و Store مرکزی را نگه می‌دارد؛ auth.ts
                  احراز هویت را، و cloud.ts سینک با Supabase را. هیچ صفحه‌ای
                  مستقیم به داده دست نمی‌زند.
                </p>
              </div>
              <div className="rounded-xl border border-mint-400/15 bg-pine-900/85 p-6">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-mint-400/12 border border-mint-400/30 grid place-items-center text-mint-400">
                    <Icon name="plane" className="w-5 h-5" />
                  </span>
                  <p className="font-display text-xl text-ink">دو نسخهٔ ربات</p>
                </div>
                <p className="text-[13px] leading-7 text-ink-2 mt-3">
                  <code dir="ltr" className="text-mint-300 text-[12px]">bot/bot.js</code> با Polling لوکال اجرا
                  می‌شود و <code dir="ltr" className="text-mint-300 text-[12px]">api/telegram-webhook.mjs</code>{" "}
                  همان منطق را Serverless روی Vercel. هر دو به یک Supabase وصل‌اند.
                </p>
              </div>
              <div className="rounded-xl border border-dashed border-gold-500/40 bg-gold-500/8 p-6">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-gold-500 text-pine-950 grid place-items-center">
                    <Icon name="download" className="w-5 h-5" strokeWidth={2.2} />
                  </span>
                  <div>
                    <p className="font-display text-xl text-ink leading-none">PWA از روز اول</p>
                    <p className="text-[11.5px] font-bold text-ink-3 mt-1">manifest + icon + sw.js برای کش آفلاین</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================= مدل داده ================= */
const GROUP_STYLE: Record<TableGroup, string> = {
  هسته: "bg-mint-400/12 border-mint-400/40 text-mint-500",
  مالی: "bg-gold-500/12 border-gold-500/40 text-gold-500",
  "برنامه‌ریزی": "bg-skyx-400/12 border-skyx-400/40 text-skyx-400",
  سیستم: "bg-coral-500/12 border-coral-500/40 text-coral-500",
};

export function DataModel() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<TableGroup | "همه">("همه");
  const groups: (TableGroup | "همه")[] = ["همه", "هسته", "مالی", "برنامه‌ریزی", "سیستم"];

  const filtered = DATA_TABLES.filter(
    (t) =>
      (group === "همه" || t.group === group) &&
      (t.name.includes(q.trim().toLowerCase()) || t.desc.includes(q.trim()))
  );

  return (
    <section id="data" className="relative bg-paper ledger-light text-pine-850">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28">
        <SectionHead
          light
          index="۰۵"
          kicker="مدل داده"
          title="۱۹ جدول، یک Store مرکزی"
          desc="همهٔ جداول در src/lib/data.tsx تعریف شده‌اند. تاریخ‌ها ISO (میلادی) ذخیره و فقط هنگام نمایش شمسی می‌شوند؛ ماندهٔ حساب‌ها با هر تراکنش خودکار بازمحاسبه می‌شود."
        />

        <Reveal>
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <label className="flex items-center gap-2.5 rounded-xl border border-pine-700/25 bg-paper-2/70 px-4 py-2.5 focus-within:border-gold-500 transition-colors grow sm:grow-0 sm:min-w-[280px]">
              <Icon name="search" className="w-4 h-4 text-pine-700/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جست‌وجوی جدول یا توضیح…"
                className="bg-transparent outline-none text-[13px] font-bold placeholder:text-pine-700/45 w-full"
              />
            </label>
            <div className="flex gap-2 flex-wrap">
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`px-3.5 py-2 rounded-lg text-[12px] font-black border transition-all duration-200 cursor-pointer ${
                    group === g
                      ? "bg-pine-850 text-gold-400 border-pine-850 shadow-md"
                      : "border-pine-700/25 text-pine-700/80 hover:border-pine-700/60"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <span className="text-[12px] font-black text-pine-700/60 ms-auto tabular-nums">
              {faNum(filtered.length)} از {faNum(19)} جدول
            </span>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t, i) => (
            <Reveal key={t.name} delay={Math.min(i, 8) * 45}>
              <div className="group rounded-xl border border-pine-700/18 bg-paper-2/60 px-4.5 py-4 hover:border-gold-500/70 hover:bg-gold-500/10 hover:-translate-y-0.5 transition-all duration-250">
                <div className="flex items-center justify-between gap-2">
                  <code dir="ltr" className="text-[13px] font-black text-pine-850 group-hover:text-pine-850">
                    {t.name}
                  </code>
                  <span className={`text-[10px] font-black border rounded-full px-2 py-0.5 ${GROUP_STYLE[t.group]}`}>
                    {t.group}
                  </span>
                </div>
                <p className="text-[12px] font-semibold text-pine-700/80 mt-1.5 leading-6">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-pine-700/60 font-bold py-14">جدولی با این مشخصات پیدا نشد.</p>
        )}

        <Reveal delay={120}>
          <div className="mt-12 grid lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-pine-700/20 bg-pine-850 text-ink p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="db" className="w-5 h-5 text-gold-400" />
                <h3 className="font-display text-xl">جدول‌های Supabase</h3>
              </div>
              <div className="grid gap-2.5">
                {SUPABASE_TABLES.map((t) => (
                  <div key={t.name} className="rounded-lg bg-pine-950/60 border border-mint-400/12 px-4 py-3">
                    <code dir="ltr" className="text-[12.5px] font-black text-mint-300">{t.name}</code>
                    <p className="text-[12px] font-semibold text-ink-2 mt-1 leading-6">{t.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] font-bold text-gold-400/90 mt-4 leading-6">
                RLS فعال است با policy باز برای anon (برای شروع) — در تولید باید محدود شود.
              </p>
            </div>

            <div className="rounded-xl border-2 border-dashed border-pine-700/30 p-6 flex flex-col justify-center">
              <Icon name="bell" className="w-6 h-6 text-gold-500" />
              <h3 className="font-display text-2xl mt-3">قانون طلایی تاریخ‌ها</h3>
              <p className="text-[13.5px] leading-8 text-pine-700/85 mt-2">
                همه‌چیز <b>ISO میلادی</b> ذخیره می‌شود — در دیتابیس، در کش لوکال، در ربات.
                تبدیل به شمسی فقط در لایهٔ نمایش و با{" "}
                <code dir="ltr" className="bg-pine-850 text-mint-300 rounded px-1.5 py-0.5 text-[12px]">toJalaali()</code>{" "}
                انجام می‌شود. این تنها راهی است که ساعت تابستانی و سال کبیسه غافلگیرتان نمی‌کنند.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
