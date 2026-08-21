/* ---------- مدل داده (۱۹ جدول) + Store مرکزی + تقویم شمسی + اعداد فارسی ---------- */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  addDaysISO, addJalaliMonths, jalaliMonthLen, jalaliToISO, jalaliToday,
  toEnDigits, todayISO, uid,
} from "./utils";

export type ID = string;

export interface Account { id: ID; name: string; type: string; initial: number; color: string; balance: number; }
export interface Category { id: ID; name: string; type: "income" | "expense"; color: string; }
export interface Tx {
  id: ID; date: string; type: "income" | "expense"; amount: number; title: string;
  note?: string; categoryId: ID; accountId: ID; payMethod?: string; createdAt: number; source?: "app" | "bot";
}
export interface Transfer { id: ID; date: string; from: ID; to: ID; amount: number; note?: string; }
export interface Debt { id: ID; kind: "debt" | "credit"; person: string; amount: number; paid: number; due?: string; note?: string; }
export interface Installment { id: ID; title: string; total: number; months: number; amountPerMonth: number; start: string; paidCount: number; accountId: ID; }
export interface Budget { id: ID; categoryId: ID; limit: number; }
export interface PayMethod { id: ID; name: string; }
export interface Recurring { id: ID; title: string; type: "income" | "expense"; amount: number; categoryId: ID; accountId: ID; dayOfMonth: number; lastRun?: string; }
export interface Goal { id: ID; title: string; target: number; saved: number; deadline?: string; }
export interface Appointment { id: ID; date: string; time: string; title: string; note?: string; done?: boolean; }
export interface Cheque { id: ID; kind: "in" | "out"; bank: string; amount: number; date: string; person: string; status: "pending" | "cashed" | "bounced"; }
export interface Challenge { id: ID; title: string; target: number; saved: number; perDay: number; }
export interface Currency { id: ID; name: string; symbol: string; rate: number; qty: number; }
export interface Asset { id: ID; name: string; buyPrice: number; nowPrice: number; qty: number; }
export interface Subscription { id: ID; name: string; amount: number; cycle: "monthly" | "yearly"; renew: string; }
export interface ActivityLog { id: ID; at: number; text: string; }
export interface TelegramUser { id: ID; name: string; username: string; joined: number; }
export interface TrashEntry { key: string; table: string; item: any; until: number; label: string; }

export interface Prefs {
  theme: "dark" | "light";
  pin?: string;
  pinEnabled?: boolean;
  botToken?: string;
  syncId?: string;
  syncUrl?: string;
  syncKey?: string;
}

export interface AppState {
  accounts: Account[]; categories: Category[]; transactions: Tx[]; transfers: Transfer[];
  debts: Debt[]; installments: Installment[]; budgets: Budget[]; payment_methods: PayMethod[];
  recurring: Recurring[]; savings_goals: Goal[]; appointments: Appointment[]; cheques: Cheque[];
  splits: { id: ID; title: string; total: number; parts: number }[];
  challenges: Challenge[]; currencies: Currency[]; assets: Asset[]; subscriptions: Subscription[];
  activity_logs: ActivityLog[]; telegram_users: TelegramUser[];
  trash: TrashEntry[]; prefs: Prefs; lastSync: number;
}

/* ---------- دادهٔ اولیه ---------- */
function seed(): AppState {
  const t = todayISO();
  const d = (n: number) => addDaysISO(t, -n);
  const cat = (name: string, type: "income" | "expense", color: string): Category => ({
    id: uid(), name, type, color,
  });
  const cFood = cat("خوراک", "expense", "#e8b04b");
  const cTrans = cat("رفت‌وآمد", "expense", "#5ec8de");
  const cHome = cat("خانه و اجاره", "expense", "#8f7ae8");
  const cHealth = cat("سلامت", "expense", "#ff7a6b");
  const cFun = cat("تفریح", "expense", "#57d9a3");
  const cCloth = cat("پوشاک", "expense", "#f28fc0");
  const cEdu = cat("آموزش", "expense", "#7ab8f2");
  const cSub = cat("اشتراک", "expense", "#c0e85e");
  const cMisc = cat("متفرقه", "expense", "#a3b8ac");
  const iSalary = cat("حقوق", "income", "#57d9a3");
  const iProject = cat("پروژه", "income", "#e8b04b");
  const iGift = cat("هدیه", "income", "#f28fc0");
  const categories = [cFood, cTrans, cHome, cHealth, cFun, cCloth, cEdu, cSub, cMisc, iSalary, iProject, iGift];

  const a1: Account = { id: uid(), name: "بانک ملت", type: "کارت بانکی", initial: 5200000, color: "#57d9a3", balance: 0 };
  const a2: Account = { id: uid(), name: "بانک سامان", type: "کارت بانکی", initial: 1800000, color: "#5ec8de", balance: 0 };
  const a3: Account = { id: uid(), name: "صندوق طلا", type: "سرمایه‌گذاری", initial: 2500000, color: "#e8b04b", balance: 0 };
  const accounts = [a1, a2, a3];

  const tx = (n: number, type: "income" | "expense", title: string, amount: number, categoryId: Category, accountId: Account, payMethod = "کارت", source: "app" | "bot" = "app"): Tx => ({
    id: uid(), date: d(n), type, title, amount, categoryId: categoryId.id, accountId: accountId.id, payMethod, createdAt: Date.now() - n * 86400000, source,
  });

  const transactions: Tx[] = [
    tx(85, "income", "واریز حقوق", 18500000, iSalary, a1, "شبا"),
    tx(83, "expense", "اجارهٔ خانه", 4500000, cHome, a1, "شبا"),
    tx(80, "expense", "خرید سوپرمارکت", 680000, cFood, a1),
    tx(76, "expense", "اسنپ تا شرکت", 95000, cTrans, a1, "نقد", "bot"),
    tx(74, "expense", "رستوران با خانواده", 540000, cFood, a1),
    tx(70, "expense", "داروخانه", 240000, cHealth, a2),
    tx(66, "income", "پروژهٔ طراحی سایت", 3200000, iProject, a2, "شبا"),
    tx(63, "expense", "قبض برق و گاز", 380000, cHome, a1, "شبا"),
    tx(60, "expense", "بلیت سینما", 160000, cFun, a2),
    tx(58, "expense", "خرید میوه", 210000, cFood, a1, "نقد", "bot"),
    tx(55, "income", "واریز حقوق", 18500000, iSalary, a1, "شبا"),
    tx(52, "expense", "قسط وام بانک ملت", 1450000, cMisc, a1, "شبا"),
    tx(49, "expense", "بنزین", 300000, cTrans, a1),
    tx(45, "expense", "کافه با دوستان", 145000, cFun, a2, "کارت", "bot"),
    tx(41, "expense", "خرید پوشاک", 890000, cCloth, a1),
    tx(38, "expense", "خرید ماهانهٔ سوپر", 920000, cFood, a1),
    tx(35, "expense", "شارژ ساختمان", 350000, cHome, a1, "کارت"),
    tx(32, "income", "هدیهٔ تولد", 500000, iGift, a2, "نقد"),
    tx(29, "expense", "اشتراک فیلم", 79000, cSub, a1),
    tx(26, "expense", "ویزیت دکتر", 350000, cHealth, a2),
    tx(25, "income", "واریز حقوق", 18500000, iSalary, a1, "شبا"),
    tx(22, "expense", "اجارهٔ خانه", 4500000, cHome, a1, "شبا"),
    tx(19, "expense", "کلاس زبان", 750000, cEdu, a2, "کارت"),
    tx(16, "expense", "خرید سوپرمارکت", 540000, cFood, a1),
    tx(13, "expense", "تاکسی اینترنتی", 120000, cTrans, a1, "نقد", "bot"),
    tx(10, "expense", "رستوران ناهار", 285000, cFood, a1, "کارت"),
    tx(8, "income", "پروژهٔ فریلنسری", 1800000, iProject, a2, "شبا", "bot"),
    tx(6, "expense", "باشگاه ورزشی", 400000, cHealth, a2),
    tx(4, "expense", "خرید قهوه", 98000, cFood, a2, "نقد", "bot"),
    tx(2, "expense", "خرید کتاب", 185000, cEdu, a1),
    tx(1, "expense", "سوپرمارکت یاس", 265000, cFood, a1, "کارت"),
    tx(0, "expense", "اسنپ — جلسه", 88000, cTrans, a1, "نقد", "bot"),
  ];

  const jt = jalaliToday();
  const ap = (n: number, time: string, title: string, note?: string, done?: boolean): Appointment => ({
    id: uid(), date: addDaysISO(t, n), time, title, note, done,
  });

  const state: AppState = {
    accounts, categories, transactions,
    transfers: [{ id: uid(), date: d(12), from: a1.id, to: a3.id, amount: 1000000, note: "پس‌انداز طلا" }],
    debts: [
      { id: uid(), kind: "debt", person: "رضا محمدی", amount: 1500000, paid: 500000, due: addDaysISO(t, 12), note: "قرض تعمیر ماشین" },
      { id: uid(), kind: "credit", person: "مریم احمدی", amount: 800000, paid: 0, due: addDaysISO(t, 5), note: "پول بلیت کنسرت" },
    ],
    installments: [
      { id: uid(), title: "وام خرید لپ‌تاپ", total: 14500000, months: 10, amountPerMonth: 1450000, start: d(150), paidCount: 5, accountId: a1.id },
    ],
    budgets: [
      { id: uid(), categoryId: cFood.id, limit: 3000000 },
      { id: uid(), categoryId: cTrans.id, limit: 1200000 },
      { id: uid(), categoryId: cFun.id, limit: 800000 },
      { id: uid(), categoryId: cHome.id, limit: 5500000 },
    ],
    payment_methods: [{ id: uid(), name: "کارت" }, { id: uid(), name: "نقد" }, { id: uid(), name: "شبا" }, { id: uid(), name: "ارز دیجیتال" }],
    recurring: [
      { id: uid(), title: "اجارهٔ خانه", type: "expense", amount: 4500000, categoryId: cHome.id, accountId: a1.id, dayOfMonth: 1 },
      { id: uid(), title: "اشتراک فیلم", type: "expense", amount: 79000, categoryId: cSub.id, accountId: a1.id, dayOfMonth: 5 },
    ],
    savings_goals: [
      { id: uid(), title: "سفر شیراز", target: 6000000, saved: 3850000, deadline: addDaysISO(t, 60) },
      { id: uid(), title: "لپ‌تاپ جدید", target: 45000000, saved: 12000000 },
    ],
    appointments: [
      ap(0, "17:30", "جلسه با تیم محصول", "لینک جلسه در تلگرام"),
      ap(0, "20:00", "ورزش — دویدن"),
      ap(2, "10:00", "ویزیت دندانپزشکی", "کلینیک دکتر راد"),
      ap(5, "18:00", "شام با مریم و رضا", "رستوران شاندیز"),
      ap(-3, "09:00", "تحویل پروژهٔ فریلنسری", "تحویل شد", true),
    ],
    cheques: [
      { id: uid(), kind: "out", bank: "ملت", amount: 1450000, date: addDaysISO(t, 9), person: "بانک ملت — قسط ۶", status: "pending" },
      { id: uid(), kind: "in", bank: "صادرات", amount: 2200000, date: addDaysISO(t, -6), person: "شرکت آریا", status: "cashed" },
    ],
    splits: [{ id: uid(), title: "شام تیم", total: 1200000, parts: 4 }],
    challenges: [{ id: uid(), title: "چالش ۳۰ روزهٔ پس‌انداز", target: 1500000, saved: 950000, perDay: 50000 }],
    currencies: [
      { id: uid(), name: "دلار آمریکا", symbol: "USD", rate: 625000, qty: 40 },
      { id: uid(), name: "یورو", symbol: "EUR", rate: 678000, qty: 15 },
    ],
    assets: [
      { id: uid(), name: "سکهٔ بهار آزادی", buyPrice: 42000000, nowPrice: 51000000, qty: 1 },
      { id: uid(), name: "پراید ۱۳۹۸", buyPrice: 180000000, nowPrice: 260000000, qty: 1 },
    ],
    subscriptions: [
      { id: uid(), name: "فیلم‌نت", amount: 79000, cycle: "monthly", renew: jalaliToISO(jt.jy, jt.jm, Math.min(28, jalaliMonthLen(jt.jy, jt.jm))) },
      { id: uid(), name: "اسپاتیفای", amount: 145000, cycle: "monthly", renew: addDaysISO(t, 11) },
    ],
    activity_logs: [
      { id: uid(), at: Date.now() - 3600000, text: "تراکنش «اسنپ — جلسه» از ربات تلگرام ثبت شد" },
      { id: uid(), at: Date.now() - 86400000, text: "سینک ابری با موفقیت انجام شد" },
    ],
    telegram_users: [{ id: uid(), name: "شما", username: "@shoma", joined: Date.now() - 30 * 86400000 }],
    trash: [],
    prefs: { theme: "dark" },
    lastSync: Date.now(),
  };
  recomputeBalances(state);
  return state;
}

/* ---------- بازمحاسبهٔ ماندهٔ حساب‌ها ---------- */
export function recomputeBalances(s: AppState) {
  const map = new Map(s.accounts.map((a) => [a.id, a.initial]));
  for (const tr of s.transfers) {
    map.set(tr.from, (map.get(tr.from) ?? 0) - tr.amount);
    map.set(tr.to, (map.get(tr.to) ?? 0) + tr.amount);
  }
  for (const t of s.transactions) {
    map.set(t.accountId, (map.get(t.accountId) ?? 0) + (t.type === "income" ? t.amount : -t.amount));
  }
  for (const a of s.accounts) a.balance = map.get(a.id) ?? a.initial;
}

/* ---------- تشخیص هوشمند دسته و مبلغ از متن ---------- */
const CAT_HINTS: [string, string[]][] = [
  ["خوراک", ["سوپر", "رستوران", "کافه", "قهوه", "میوه", "نان", "غذا", "فست‌فود", "پیتزا", "کباب", "شیرینی"]],
  ["رفت‌وآمد", ["اسنپ", "تاکسی", "مترو", "اتوبوس", "بنزین", "پمپ بنزین", "پارکینگ", "قطار", "هواپیما"]],
  ["خانه و اجاره", ["اجاره", "قبض", "برق", "گاز", "آب", "شارژ", "اینترنت"]],
  ["سلامت", ["دارو", "داروخانه", "دکتر", "ویزیت", "بیمارستان", "باشگاه", "ورزش", "دندان"]],
  ["تفریح", ["سینما", "کنسرت", "بازی", "سفر", "تئاتر", "شهربازی"]],
  ["پوشاک", ["لباس", "کفش", "پیراهن", "مانتو", "پوشاک"]],
  ["آموزش", ["کتاب", "کلاس", "دوره", "آموزش", "زبان", "شهریه"]],
  ["اشتراک", ["اشتراک", "فیلم", "موزیک", "اسپاتیفای", "فیلیمو", "فیلم‌نت"]],
  ["حقوق", ["حقوق", "دستمزد", "واریز شرکت"]],
  ["پروژه", ["پروژه", "فریلنس", "طراحی سایت", "قرارداد"]],
  ["هدیه", ["هدیه", "عیدی", "تولد"]],
];

export function detectSmart(text: string, categories: Category[]): { amount: number; categoryId?: ID } {
  const en = toEnDigits(text);
  const m = en.match(/([\d,،٬]+(?:\.\d+)?)/);
  let amount = 0;
  if (m) amount = parseFloat(m[1].replace(/[,،٬]/g, "")) || 0;
  const lower = text.toLowerCase();
  for (const [name, hints] of CAT_HINTS) {
    if (hints.some((h) => lower.includes(h))) {
      const c = categories.find((c) => c.name === name);
      if (c) return { amount, categoryId: c.id };
    }
  }
  return { amount };
}

/* ---------- اجرای تراکنش‌های دوره‌ای سررسیدشده ---------- */
function applyRecurring(s: AppState) {
  const t = jalaliToday();
  const monthKey = `${t.jy}-${String(t.jm).padStart(2, "0")}`;
  for (const r of s.recurring) {
    if (r.lastRun === monthKey) continue;
    if (t.jd >= r.dayOfMonth) {
      const day = Math.min(r.dayOfMonth, jalaliMonthLen(t.jy, t.jm));
      s.transactions.unshift({
        id: uid(), date: jalaliToISO(t.jy, t.jm, day), type: r.type, amount: r.amount,
        title: `${r.title} (دوره‌ای)`, categoryId: r.categoryId, accountId: r.accountId,
        payMethod: "کارت", createdAt: Date.now(), source: "app",
      });
      r.lastRun = monthKey;
      s.activity_logs.unshift({ id: uid(), at: Date.now(), text: `تراکنش دوره‌ای «${r.title}» خودکار ثبت شد` });
    }
  }
}

/* ---------- Store ---------- */
export type TableName = keyof Pick<
  AppState,
  "accounts" | "categories" | "transactions" | "transfers" | "debts" | "installments" |
  "budgets" | "payment_methods" | "recurring" | "savings_goals" | "appointments" |
  "cheques" | "challenges" | "currencies" | "assets" | "subscriptions"
>;

interface Store {
  state: AppState;
  mutate: (fn: (draft: AppState) => void, log?: string) => void;
  trashItem: (table: TableName, id: string, label: string) => void;
  restore: (key: string) => void;
  purgeTrash: () => void;
}

const Ctx = createContext<Store>(null!);
export const useStore = () => useContext(Ctx);

export function DataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const storageKey = `fp_data_${userId}`;
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        applyRecurring(parsed);
        recomputeBalances(parsed);
        return parsed;
      }
    } catch { /* دادهٔ خراب — از نو */ }
    const fresh = seed();
    localStorage.setItem(storageKey, JSON.stringify(fresh));
    return fresh;
  });

  const persist = (s: AppState) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch { /* حافظه پر */ }
  };

  const mutate = (fn: (draft: AppState) => void, log?: string) => {
    setState((prev) => {
      const draft: AppState = JSON.parse(JSON.stringify(prev));
      fn(draft);
      recomputeBalances(draft);
      if (log) {
        draft.activity_logs.unshift({ id: uid(), at: Date.now(), text: log });
        draft.activity_logs = draft.activity_logs.slice(0, 80);
      }
      draft.lastSync = Date.now();
      persist(draft);
      return draft;
    });
  };

  const trashItem = (table: TableName, id: string, label: string) => {
    mutate((d) => {
      const arr = d[table] as { id: ID }[];
      const item = arr.find((x) => x.id === id);
      if (!item) return;
      d[table] = arr.filter((x) => x.id !== id) as never;
      d.trash = [...d.trash.filter((e) => e.table !== table || e.item.id !== id), {
        key: uid(), table, item, until: Date.now() + 30000, label,
      }].slice(-3);
    });
  };

  const restore = (key: string) => {
    mutate((d) => {
      const entry = d.trash.find((e) => e.key === key);
      if (!entry) return;
      (d[entry.table as TableName] as unknown[]).push(entry.item);
      d.trash = d.trash.filter((e) => e.key !== key);
    }, `«${arguments_label(key, state)}» بازگردانی شد`);
  };

  const purgeTrash = () => {
    setState((prev) => {
      if (!prev.trash.some((e) => e.until <= Date.now())) return prev;
      const draft: AppState = JSON.parse(JSON.stringify(prev));
      draft.trash = draft.trash.filter((e) => e.until > Date.now());
      persist(draft);
      return draft;
    });
  };

  return (
    <Ctx.Provider value={{ state, mutate, trashItem, restore, purgeTrash }}>
      {children}
    </Ctx.Provider>
  );
}

function arguments_label(key: string, state: AppState): string {
  return state.trash.find((e) => e.key === key)?.label ?? "مورد";
}

/* ---------- گزینش‌گرها ---------- */
export const sumTx = (txs: Tx[], type?: "income" | "expense") =>
  txs.filter((t) => !type || t.type === type).reduce((s, t) => s + t.amount, 0);

export const catById = (s: AppState, id: ID) => s.categories.find((c) => c.id === id);
export const accById = (s: AppState, id: ID) => s.accounts.find((a) => a.id === id);

export { jalaliToday, todayISO };
export const monthKeyOf = (jy: number, jm: number) => `${jy}-${String(jm).padStart(2, "0")}`;
export { addJalaliMonths };
