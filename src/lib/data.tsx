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
  accent?: string;
  notifyEnabled?: boolean;
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
  /** شمارندهٔ نسخه — با هر تغییر بالا می‌رود تا سینک چنددستگاهه «آخرین نوشتن برنده» درست کار کند */
  rev: number;
}

/* ---------- دادهٔ اولیه — فقط ساختار پایه، بدون تراکنش ---------- */
function seed(): AppState {
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

  const a1: Account = { id: uid(), name: "حساب اصلی", type: "کارت بانکی", initial: 0, color: "#57d9a3", balance: 0 };

  const state: AppState = {
    accounts: [a1],
    categories,
    transactions: [],
    transfers: [],
    debts: [],
    installments: [],
    budgets: [],
    payment_methods: [{ id: uid(), name: "کارت" }, { id: uid(), name: "نقد" }, { id: uid(), name: "شبا" }, { id: uid(), name: "ارز دیجیتال" }],
    recurring: [],
    savings_goals: [],
    appointments: [],
    cheques: [],
    splits: [],
    challenges: [],
    currencies: [],
    assets: [],
    subscriptions: [],
    activity_logs: [],
    telegram_users: [],
    trash: [],
    prefs: { theme: "dark" },
    lastSync: Date.now(),
    rev: 0,
  };
  recomputeBalances(state);
  return state;
}

/* ---------- پاک‌سازی همهٔ داده‌ها (ساختار می‌ماند) ---------- */
export function clearData(d: AppState) {
  d.transactions = [];
  d.transfers = [];
  d.debts = [];
  d.installments = [];
  d.budgets = [];
  d.recurring = [];
  d.savings_goals = [];
  d.appointments = [];
  d.cheques = [];
  d.splits = [];
  d.challenges = [];
  d.currencies = [];
  d.assets = [];
  d.subscriptions = [];
  d.activity_logs = [];
  d.trash = [];
  for (const a of d.accounts) a.initial = 0;
}

/* ---------- بارگذاری دادهٔ نمونه ---------- */
export function sampleFill(d: AppState) {
  const t = todayISO();
  const dd = (n: number) => addDaysISO(t, -n);
  const catN = (name: string) => d.categories.find((c) => c.name === name);
  if (!catN("خوراک")) {
    const extra: [string, "income" | "expense", string][] = [
      ["خوراک", "expense", "#e8b04b"], ["رفت‌وآمد", "expense", "#5ec8de"], ["خانه و اجاره", "expense", "#8f7ae8"],
      ["سلامت", "expense", "#ff7a6b"], ["تفریح", "expense", "#57d9a3"], ["پوشاک", "expense", "#f28fc0"],
      ["آموزش", "expense", "#7ab8f2"], ["اشتراک", "expense", "#c0e85e"], ["متفرقه", "expense", "#a3b8ac"],
      ["حقوق", "income", "#57d9a3"], ["پروژه", "income", "#e8b04b"], ["هدیه", "income", "#f28fc0"],
    ];
    for (const [n, ty, co] of extra) if (!d.categories.some((c) => c.name === n)) d.categories.push({ id: uid(), name: n, type: ty, color: co });
  }
  const cFood = catN("خوراک")!; const cTrans = catN("رفت‌وآمد")!; const cHome = catN("خانه و اجاره")!;
  const cHealth = catN("سلامت")!; const cFun = catN("تفریح")!; const cCloth = catN("پوشاک")!;
  const cEdu = catN("آموزش")!; const cSub = catN("اشتراک")!; const cMisc = catN("متفرقه")!;
  const iSalary = catN("حقوق")!; const iProject = catN("پروژه")!; const iGift = catN("هدیه")!;

  /* حساب‌های نمونه */
  if (!d.accounts.some((a) => /ملت/.test(a.name))) d.accounts.push({ id: uid(), name: "بانک ملت", type: "کارت بانکی", initial: 5200000, color: "#57d9a3", balance: 0 });
  if (!d.accounts.some((a) => /سامان/.test(a.name))) d.accounts.push({ id: uid(), name: "بانک سامان", type: "کارت بانکی", initial: 1800000, color: "#5ec8de", balance: 0 });
  if (!d.accounts.some((a) => /طلا/.test(a.name))) d.accounts.push({ id: uid(), name: "صندوق طلا", type: "سرمایه‌گذاری", initial: 2500000, color: "#e8b04b", balance: 0 });
  const a1 = d.accounts.find((a) => /ملت/.test(a.name)) ?? d.accounts[0];
  const a2 = d.accounts.find((a) => /سامان/.test(a.name)) ?? d.accounts[0];
  const a3 = d.accounts.find((a) => /طلا/.test(a.name)) ?? d.accounts[0];

  const tx = (n: number, type: "income" | "expense", note: string, amount: number, c: Category, a: Account, payMethod = "کارت", source: "app" | "bot" = "app"): Tx => ({
    id: uid(), date: dd(n), type, title: c.name, note, amount, categoryId: c.id, accountId: a.id, payMethod, createdAt: Date.now() - n * 86400000, source,
  });

  const sampleTxs: Tx[] = [
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
  d.transactions.unshift(...sampleTxs);

  d.transfers.push({ id: uid(), date: dd(12), from: a1.id, to: a3.id, amount: 1000000, note: "پس‌انداز طلا" });
  d.debts.push(
    { id: uid(), kind: "debt", person: "رضا محمدی", amount: 1500000, paid: 500000, due: addDaysISO(t, 12), note: "قرض تعمیر ماشین" },
    { id: uid(), kind: "credit", person: "مریم احمدی", amount: 800000, paid: 0, due: addDaysISO(t, 5), note: "پول بلیت کنسرت" },
  );
  d.installments.push({ id: uid(), title: "وام خرید لپ‌تاپ", total: 14500000, months: 10, amountPerMonth: 1450000, start: dd(150), paidCount: 5, accountId: a1.id });
  d.budgets.push(
    { id: uid(), categoryId: cFood.id, limit: 3000000 },
    { id: uid(), categoryId: cTrans.id, limit: 1200000 },
    { id: uid(), categoryId: cFun.id, limit: 800000 },
    { id: uid(), categoryId: cHome.id, limit: 5500000 },
  );
  d.recurring.push(
    { id: uid(), title: "اجارهٔ خانه", type: "expense", amount: 4500000, categoryId: cHome.id, accountId: a1.id, dayOfMonth: 1 },
    { id: uid(), title: "اشتراک فیلم", type: "expense", amount: 79000, categoryId: cSub.id, accountId: a1.id, dayOfMonth: 5 },
  );
  d.savings_goals.push(
    { id: uid(), title: "سفر شیراز", target: 6000000, saved: 3850000, deadline: addDaysISO(t, 60) },
    { id: uid(), title: "لپ‌تاپ جدید", target: 45000000, saved: 12000000 },
  );
  d.appointments.push(
    { id: uid(), date: t, time: "20:00", title: "ورزش — دویدن" },
    { id: uid(), date: addDaysISO(t, 2), time: "10:00", title: "ویزیت دندانپزشکی", note: "کلینیک دکتر راد" },
    { id: uid(), date: addDaysISO(t, 5), time: "18:00", title: "شام با مریم و رضا", note: "رستوران شاندیز" },
  );
  d.cheques.push(
    { id: uid(), kind: "out", bank: "ملت", amount: 1450000, date: addDaysISO(t, 9), person: "بانک ملت — قسط ۶", status: "pending" },
    { id: uid(), kind: "in", bank: "صادرات", amount: 2200000, date: addDaysISO(t, -6), person: "شرکت آریا", status: "cashed" },
  );
  d.splits.push({ id: uid(), title: "شام تیم", total: 1200000, parts: 4 });
  d.challenges.push({ id: uid(), title: "چالش ۳۰ روزهٔ پس‌انداز", target: 1500000, saved: 950000, perDay: 50000 });
  d.currencies.push(
    { id: uid(), name: "دلار آمریکا", symbol: "USD", rate: 625000, qty: 40 },
    { id: uid(), name: "یورو", symbol: "EUR", rate: 678000, qty: 15 },
  );
  d.assets.push(
    { id: uid(), name: "سکهٔ بهار آزادی", buyPrice: 42000000, nowPrice: 51000000, qty: 1 },
    { id: uid(), name: "پراید ۱۳۹۸", buyPrice: 180000000, nowPrice: 260000000, qty: 1 },
  );
  const jt = jalaliToday();
  d.subscriptions.push(
    { id: uid(), name: "فیلم‌نت", amount: 79000, cycle: "monthly", renew: jalaliToISO(jt.jy, jt.jm, Math.min(28, jalaliMonthLen(jt.jy, jt.jm))) },
    { id: uid(), name: "اسپاتیفای", amount: 145000, cycle: "monthly", renew: addDaysISO(t, 11) },
  );
  d.activity_logs.unshift(
    { id: uid(), at: Date.now(), text: "دادهٔ نمونه بارگذاری شد" },
    { id: uid(), at: Date.now() - 3600000, text: "تراکنش «اسنپ — جلسه» از ربات تلگرام ثبت شد" },
  );
  d.telegram_users.push({ id: uid(), name: "شما", username: "@shoma", joined: Date.now() - 30 * 86400000 });
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

const AMOUNT_HINTS: [string, string[]][] = [
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

export interface SmartDetect {
  amount: number;
  categoryId?: ID;
  accountId?: ID;
  income?: boolean;
}

/**
 * تشخیص هوشمند مبلغ، دسته و حساب از متن توضیح
 * مثال: «اسنپ ۵۰ هزار از کارت ملت» → مبلغ ۵۰٬۰۰۰، دسته رفت‌وآمد، حساب ملت
 */
export function detectSmart(text: string, categories: Category[], accounts?: Account[]): SmartDetect {
  const en = toEnDigits(text);
  const lower = text.toLowerCase();

  /* مبلغ: عدد + واحد (هزار، میلیون، میلیارد) */
  let amount = 0;
  const m = en.match(/([\d,،٬]+(?:\.\d+)?)\s*(میلیارد|میلیون|هزار|هزارت|تومن|تومان|توم|ت)?/);
  if (m) {
    const base = parseFloat(m[1].replace(/[,،٬]/g, "")) || 0;
    const unit = m[2] ?? "";
    if (unit.startsWith("میلیارد")) amount = base * 1_000_000_000;
    else if (unit.startsWith("میلیون")) amount = base * 1_000_000;
    else if (unit.startsWith("هزار")) amount = base * 1_000;
    else amount = base;
  }

  /* دسته */
  let categoryId: ID | undefined;
  for (const [name, hints] of AMOUNT_HINTS) {
    if (hints.some((h) => lower.includes(h))) {
      const c = categories.find((x) => x.name === name);
      if (c) { categoryId = c.id; break; }
    }
  }

  /* نوع: درآمد یا هزینه */
  const income = /(درآمد|واریز|حقوق|دریافت|طلب|فروش)/.test(lower);

  /* حساب بانکی */
  let accountId: ID | undefined;
  if (accounts?.length) {
    for (const a of accounts) {
      const name = a.name.toLowerCase();
      if (lower.includes(name)) { accountId = a.id; break; }
      /* کلمات کلیدی بانک‌ها */
      const bankHints = name.replace(/بانک|کارت/g, "").trim();
      if (bankHints.length > 1 && lower.includes(bankHints)) { accountId = a.id; break; }
    }
    if (!accountId && /نقد/.test(lower)) {
      const cash = accounts.find((a) => /نقد/.test(a.name));
      if (cash) accountId = cash.id;
    }
  }

  return { amount, categoryId, accountId, income: income || undefined };
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
        if (typeof parsed.rev !== "number") parsed.rev = 0;
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
      draft.rev = (draft.rev ?? 0) + 1;
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
