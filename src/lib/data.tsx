/* ---------- مدل داده + Store مرکزی + تشخیص هوشمند + تگ‌ها و یادداشت‌ها ---------- */
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  addDaysISO, jalaliMonthLen, jalaliToISO, jalaliToday,
  toEnDigits, todayISO, uid,
} from "./utils";

export type ID = string;

export interface Account { id: ID; name: string; type: string; initial: number; color: string; balance: number; }
export interface Category { id: ID; name: string; type: "income" | "expense"; color: string; icon?: string; }

/* ---------- برچسب‌های تراکنش ---------- */
export interface TagDef { id: ID; label: string; color: string; desc?: string; builtin?: boolean; }

export const DEFAULT_TAGS: TagDef[] = [
  { id: "essential", label: "ضروری", color: "#ff7a6b", desc: "خرجی که چاره‌ای جز پرداختش نبود", builtin: true },
  { id: "fun", label: "تفریحی", color: "#e8b04b", desc: "برای خوش‌گذرانی و تفریح", builtin: true },
  { id: "later", label: "میشد بعدا هم خرید", color: "#5ec8de", desc: "عجله‌ای نداشت؛ می‌شد عقب انداخت", builtin: true },
  { id: "cheap", label: "معمولی و قیمتش کم بود خریدم", color: "#57d9a3", desc: "ارزان بود و نیاز معمولی", builtin: true },
];

export interface Tx {
  id: ID; date: string; type: "income" | "expense"; amount: number; title: string;
  note?: string; tag?: ID; categoryId: ID; accountId: ID; payMethod?: string;
  createdAt: number; /** مهر زمانیِ آخرین ویرایش — مبنای ادغام صحیح بین دستگاه‌ها */ updatedAt?: number;
  source?: "app" | "bot";
}
export interface Transfer { id: ID; date: string; from: ID; to: ID; amount: number; note?: string; }
export interface Debt { id: ID; kind: "debt" | "credit"; person: string; amount: number; paid: number; due?: string; note?: string; }
export interface Installment { id: ID; title: string; total: number; months: number; amountPerMonth: number; start: string; paidCount: number; accountId: ID; }
export interface Budget { id: ID; categoryId: ID; limit: number; }
export interface PayMethod { id: ID; name: string; }
export interface Recurring { id: ID; title: string; type: "income" | "expense"; amount: number; categoryId: ID; accountId: ID; dayOfMonth: number; lastRun?: string; }
export interface Goal { id: ID; title: string; target: number; saved: number; deadline?: string; }
export interface Appointment { id: ID; date: string; time: string; title: string; note?: string; done?: boolean; }
export interface Note { id: ID; title: string; body: string; date: string; color: string; cat?: string; pinned?: boolean; createdAt: number; }
export interface Cheque { id: ID; kind: "in" | "out"; bank: string; amount: number; date: string; person: string; status: "pending" | "cashed" | "bounced"; }
export interface Challenge { id: ID; title: string; target: number; saved: number; perDay: number; }
export interface Currency { id: ID; name: string; symbol: string; rate: number; qty: number; }
export interface Asset { id: ID; name: string; buyPrice: number; nowPrice: number; qty: number; }
export interface Subscription { id: ID; name: string; amount: number; cycle: "monthly" | "yearly"; renew: string; }
export interface ActivityLog { id: ID; at: number; text: string; }
export interface TelegramUser { id: ID; name: string; username: string; joined: number; }
export interface TrashEntry { key: string; table: string; item: unknown; until: number; label: string; }

/* سنگ‌قبر (Tombstone): رکورد دائمیِ حذف —
   چون سینک «کل‌نگر» است، حذفِ یک تراکنش در یک مرورگر نباید در مرورگر دیگر
   به‌صورت «تراکنش محلیِ جدید» تفسیر و زنده شود. هر حذف یک سنگ‌قبر می‌سازد که
   همراه داده سینک می‌شود و هنگام ادغام، تراکنشِ حذف‌شده را حذف‌شده نگه می‌دارد
   (مگر اینکه بعداً عمداً بازگردانی شده باشد — updatedAt جدیدتر از سنگ‌قبر). */
export interface Tombstone { table: "transactions"; id: ID; at: number; }

export interface Prefs {
  theme: "dark" | "light";
  accent?: string;
  pin?: string;
  pinEnabled?: boolean;
  notifyEnabled?: boolean;
  botToken?: string;
  syncId?: string;
  syncUrl?: string;
  syncKey?: string;
  aiApiUrl?: string;
  aiApiKey?: string;
  aiModel?: string;
}

export interface AppState {
  accounts: Account[]; categories: Category[]; tags: TagDef[]; transactions: Tx[]; transfers: Transfer[];
  debts: Debt[]; installments: Installment[]; budgets: Budget[]; payment_methods: PayMethod[];
  recurring: Recurring[]; savings_goals: Goal[]; appointments: Appointment[]; notes: Note[]; cheques: Cheque[];
  splits: { id: ID; title: string; total: number; parts: number }[];
  challenges: Challenge[]; currencies: Currency[]; assets: Asset[]; subscriptions: Subscription[];
  activity_logs: ActivityLog[]; telegram_users: TelegramUser[];
  trash: TrashEntry[]; tombstones: Tombstone[]; prefs: Prefs; lastSync: number; rev: number;
}

/* ---------- نگاشت نام دسته به آیکون پیش‌فرض ---------- */
const CATEGORY_ICON_BY_NAME: Record<string, string> = {
  "خوراک": "food", "سوپرمارکت": "food", "رستوران": "food", "فست‌فود": "food",
  "میوه": "apple", "نان": "croissant", "نان و شیرینی": "croissant", "گوشت": "beef", "گوشت و پروتئین": "beef",
  "کافه": "cup-soda", "قهوه": "coffee", "دانهٔ قهوه": "coffee",
  "رفت‌وآمد": "car", "اسنپ": "car", "تاکسی": "car", "سوخت": "fuel", "بنزین": "fuel", "حمل‌ونقل عمومی": "bus",
  "خانه و اجاره": "home", "قبوض": "receipt", "قبض": "receipt", "اینترنت": "wifi",
  "سلامت": "health", "داروخانه": "medical", "پزشکی": "medical", "ورزش": "fitness", "باشگاه": "fitness",
  "تفریح": "game", "سینما": "film", "موسیقی": "music", "سفر": "plane",
  "پوشاک": "shirt", "لباس": "shirt",
  "آموزش": "graduation", "کتاب": "book",
  "اشتراک": "film", "فیلم": "film",
  "هدیه": "gift", "کودک": "baby", "حیوان خانگی": "paw",
  "تعمیرات": "wrench", "پراپ تریدینگ": "candlestick",
  "مرد": "male", "شخص (مرد)": "male", "زن": "female", "شخص (زن)": "female",
  "وام و تسهیلات": "landmark", "وام": "landmark",
  "حقوق": "coins", "پروژه": "briefcase", "متفرقه": "wallet",
};

/* ---------- دادهٔ اولیه ---------- */
function seed(): AppState {
  const t = todayISO();
  const d = (n: number) => addDaysISO(t, -n);
  const cat = (name: string, type: "income" | "expense", color: string): Category => ({
    id: uid(), name, type, color, icon: CATEGORY_ICON_BY_NAME[name] ?? "wallet",
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

  const tx = (n: number, type: "income" | "expense", title: string, amount: number, categoryId: Category, accountId: Account, payMethod = "کارت", source: "app" | "bot" = "app", tag?: ID): Tx => ({
    id: uid(), date: d(n), type, title, amount, categoryId: categoryId.id, accountId: accountId.id, payMethod, createdAt: Date.now() - n * 86400000, source, tag,
  });

  const transactions: Tx[] = [
    tx(85, "income", "واریز حقوق", 18500000, iSalary, a1, "شبا"),
    tx(83, "expense", "اجارهٔ خانه", 4500000, cHome, a1, "شبا", "app", "essential"),
    tx(80, "expense", "خرید سوپرمارکت", 680000, cFood, a1, "کارت", "app", "essential"),
    tx(76, "expense", "اسنپ تا شرکت", 95000, cTrans, a1, "نقد", "bot", "essential"),
    tx(74, "expense", "رستوران با خانواده", 540000, cFood, a1, "کارت", "app", "fun"),
    tx(70, "expense", "داروخانه", 240000, cHealth, a2, "کارت", "app", "essential"),
    tx(66, "income", "پروژهٔ طراحی سایت", 3200000, iProject, a2, "شبا"),
    tx(63, "expense", "قبض برق و گاز", 380000, cHome, a1, "شبا", "app", "essential"),
    tx(60, "expense", "بلیت سینما", 160000, cFun, a2, "کارت", "app", "fun"),
    tx(58, "expense", "خرید میوه", 210000, cFood, a1, "نقد", "bot", "cheap"),
    tx(55, "income", "واریز حقوق", 18500000, iSalary, a1, "شبا"),
    tx(52, "expense", "قسط وام بانک ملت", 1450000, cMisc, a1, "شبا", "app", "essential"),
    tx(49, "expense", "بنزین", 300000, cTrans, a1, "کارت", "app", "essential"),
    tx(45, "expense", "کافه با دوستان", 145000, cFun, a2, "کارت", "bot", "fun"),
    tx(41, "expense", "خرید پوشاک", 890000, cCloth, a1, "کارت", "app", "later"),
    tx(38, "expense", "خرید ماهانهٔ سوپر", 920000, cFood, a1, "کارت", "app", "essential"),
    tx(35, "expense", "شارژ ساختمان", 350000, cHome, a1, "کارت", "app", "essential"),
    tx(32, "income", "هدیهٔ تولد", 500000, iGift, a2, "نقد"),
    tx(29, "expense", "اشتراک فیلم", 79000, cSub, a1, "کارت", "app", "later"),
    tx(26, "expense", "ویزیت دکتر", 350000, cHealth, a2, "کارت", "app", "essential"),
    tx(25, "income", "واریز حقوق", 18500000, iSalary, a1, "شبا"),
    tx(22, "expense", "اجارهٔ خانه", 4500000, cHome, a1, "شبا", "app", "essential"),
    tx(19, "expense", "کلاس زبان", 750000, cEdu, a2, "کارت", "app", "later"),
    tx(16, "expense", "خرید سوپرمارکت", 540000, cFood, a1, "کارت", "app", "essential"),
    tx(13, "expense", "تاکسی اینترنتی", 120000, cTrans, a1, "نقد", "bot", "essential"),
    tx(10, "expense", "رستوران ناهار", 285000, cFood, a1, "کارت", "app", "fun"),
    tx(8, "income", "پروژهٔ فریلنسری", 1800000, iProject, a2, "شبا", "bot"),
    tx(6, "expense", "باشگاه ورزشی", 400000, cHealth, a2, "کارت", "app", "fun"),
    tx(4, "expense", "خرید قهوه", 98000, cFood, a2, "نقد", "bot", "cheap"),
    tx(2, "expense", "خرید کتاب", 185000, cEdu, a1, "کارت", "app", "later"),
    tx(1, "expense", "سوپرمارکت یاس", 265000, cFood, a1, "کارت", "app", "essential"),
    tx(0, "expense", "اسنپ — جلسه", 88000, cTrans, a1, "نقد", "bot", "essential"),
  ];

  const jt = jalaliToday();
  const ap = (n: number, time: string, title: string, note?: string, done?: boolean): Appointment => ({
    id: uid(), date: addDaysISO(t, n), time, title, note, done,
  });

  const state: AppState = {
    accounts, categories, tags: JSON.parse(JSON.stringify(DEFAULT_TAGS)), transactions,
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
    notes: [
      { id: uid(), title: "ایدهٔ پس‌انداز", body: "هر ماه ۱۰٪ از حقوق را همان روز به صندوق طلا منتقل کنم تا قبل از خرج شدن، پس‌انداز شده باشد.", date: d(3), color: "#e8b04b", createdAt: Date.now() - 3 * 86400000 },
      { id: uid(), title: "لیست خرید هفته", body: "شیر، نان، میوه، قهوه — خرید بزرگ ماهانه را به اول هفته موکول کنم که تخفیف‌ها تازه هستند.", date: d(1), color: "#57d9a3", createdAt: Date.now() - 86400000 },
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
    tombstones: [],
    prefs: { theme: "dark" },
    lastSync: Date.now(),
    rev: 0,
  };
  recomputeBalances(state);
  return state;
}

/* ---------- حالت خالی (بدون دادهٔ نمونه) ----------
   برای «کاربر موجودی» که در مرورگر/دستگاه جدید وارد می‌شود: ساختار آماده است،
   داده‌های واقعی از ابر می‌آیند — دادهٔ نمونه جای دادهٔ واقعی را نمی‌گیرد. */
export function emptyState(): AppState {
  const cat = (name: string, type: "income" | "expense", color: string): Category => ({
    id: uid(), name, type, color, icon: CATEGORY_ICON_BY_NAME[name] ?? "wallet",
  });
  const a1: Account = { id: uid(), name: "بانک ملت", type: "کارت بانکی", initial: 0, color: "#57d9a3", balance: 0 };
  const state: AppState = {
    accounts: [a1],
    categories: [
      cat("خوراک", "expense", "#e8b04b"), cat("رفت‌وآمد", "expense", "#5ec8de"),
      cat("خانه و اجاره", "expense", "#8f7ae8"), cat("سلامت", "expense", "#ff7a6b"),
      cat("تفریح", "expense", "#57d9a3"), cat("پوشاک", "expense", "#f28fc0"),
      cat("آموزش", "expense", "#7ab8f2"), cat("اشتراک", "expense", "#c0e85e"),
      cat("متفرقه", "expense", "#a3b8ac"),
      cat("حقوق", "income", "#57d9a3"), cat("پروژه", "income", "#e8b04b"), cat("هدیه", "income", "#f28fc0"),
    ],
    tags: JSON.parse(JSON.stringify(DEFAULT_TAGS)),
    transactions: [], transfers: [], debts: [], installments: [], budgets: [],
    payment_methods: [{ id: uid(), name: "کارت" }, { id: uid(), name: "نقد" }, { id: uid(), name: "شبا" }],
    recurring: [], savings_goals: [], appointments: [], notes: [], cheques: [], splits: [],
    challenges: [], currencies: [], assets: [], subscriptions: [],
    activity_logs: [], telegram_users: [], trash: [], tombstones: [],
    prefs: { theme: "dark" }, lastSync: Date.now(), rev: 0,
  };
  recomputeBalances(state);
  return state;
}

/* ---------- مهاجرت داده‌های بارگذاری‌شده (نسخه‌های قدیمی) ---------- */
export function migrateLoadedState(parsed: AppState): AppState {
  if (typeof parsed.rev !== "number") parsed.rev = 0;
  if (!Array.isArray(parsed.notes)) parsed.notes = [];
  if (!Array.isArray(parsed.tombstones)) parsed.tombstones = [];
  /* پاک‌سازی سنگ‌قبرهای خیلی قدیمی (بیش از ۱۸۰ روز) تا داده بی‌نهایت رشد نکند */
  const cutoff = Date.now() - 180 * 86400000;
  parsed.tombstones = parsed.tombstones.filter((tb) => tb.at > cutoff);
  if (!Array.isArray(parsed.tags) || parsed.tags.length === 0) {
    parsed.tags = JSON.parse(JSON.stringify(DEFAULT_TAGS));
  }
  if (!parsed.prefs) parsed.prefs = { theme: "dark" };
  for (const c of parsed.categories ?? []) {
    if (!c.icon) c.icon = CATEGORY_ICON_BY_NAME[c.name] ?? "wallet";
  }
  return parsed;
}

/* ---------- بازمحاسبهٔ ماندهٔ حساب‌ها ---------- */
/** JSON محتوای تراکنش بدون مهر زمانی — برای تشخیص «تغییر واقعی» در ادغام چنددستگاهه */
const txContentJson = (t: Tx): string => JSON.stringify({ ...t, updatedAt: 0 });

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

/* ---------- تشخیص هوشمند مبلغ، دسته و حساب از متن ---------- */
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

export function detectSmart(text: string, categories: Category[], accounts?: Account[]): SmartDetect {
  const en = toEnDigits(text);
  const lower = text.toLowerCase();

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

  let categoryId: ID | undefined;
  for (const [name, hints] of AMOUNT_HINTS) {
    if (hints.some((h) => lower.includes(h))) {
      const c = categories.find((x) => x.name === name);
      if (c) { categoryId = c.id; break; }
    }
  }

  const income = /(درآمد|واریز|حقوق|دریافت|طلب|فروش)/.test(lower);

  let accountId: ID | undefined;
  if (accounts?.length) {
    for (const a of accounts) {
      const name = a.name.toLowerCase();
      if (lower.includes(name)) { accountId = a.id; break; }
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
    /* روز مؤثر: در ماه‌های کوتاه، آخرین روز ماه */
    const day = Math.min(r.dayOfMonth, jalaliMonthLen(t.jy, t.jm));
    if (t.jd >= day) {
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
  "accounts" | "categories" | "tags" | "transactions" | "transfers" | "debts" | "installments" |
  "budgets" | "payment_methods" | "recurring" | "savings_goals" | "appointments" | "notes" |
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

export function DataProvider({ userId, fresh = false, children }: {
  userId: string;
  /** فقط برای حسابی که «همین الان ساخته شده» — دادهٔ نمونه می‌گیرد.
      کاربر موجودی که در مرورگر جدید وارد می‌شود false است تا دادهٔ نمونه
      جای دادهٔ واقعیِ ابری را نگیرد (ریشهٔ باگ «تراکنش‌های مالِ من نیست») */
  fresh?: boolean;
  children: ReactNode;
}) {
  const storageKey = `fp_data_${userId}`;
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        migrateLoadedState(parsed);
        applyRecurring(parsed);
        recomputeBalances(parsed);
        return parsed;
      }
    } catch { /* دادهٔ خراب — از نو */ }
    const init = fresh ? seed() : emptyState();
    localStorage.setItem(storageKey, JSON.stringify(init));
    return init;
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
      /* مهر زمانی برای تراکنش‌های «جدید یا واقعاً تغییرکرده» —
         مقایسهٔ محتوا بدون خودِ updatedAt انجام می‌شود تا تغییرات صوری مهر نخورند */
      {
        const prevTxs = new Map(prev.transactions.map((t) => [t.id, txContentJson(t)]));
        const stamp = Date.now();
        for (const t of draft.transactions) {
          if (prevTxs.get(t.id) !== txContentJson(t)) t.updatedAt = stamp;
        }
      }
      /* نسخهٔ داده = مهر زمانیِ آخرین تغییر — بر خلاف شمارندهٔ محلی،
         بین همهٔ دستگاه‌ها قابل مقایسه است (ریشهٔ باگ «خودبه‌خود عوض شدن») */
      draft.rev = Date.now();
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
      d.trash = [...d.trash.filter((e) => e.table !== table || (e.item as { id: ID }).id !== id), {
        key: uid(), table, item, until: Date.now() + 30000, label,
      }].slice(-5);
      /* سنگ‌قبر: حذف در همهٔ مرورگرها ماندگار می‌شود (ریشهٔ باگ «برگشتن تراکنش حذف‌شده») */
      if (table === "transactions") {
        d.tombstones = [...d.tombstones.filter((tb) => tb.id !== id), { table: "transactions", id, at: Date.now() }];
      }
    });
  };

  const restore = (key: string) => {
    mutate((d) => {
      const entry = d.trash.find((e) => e.key === key);
      if (!entry) return;
      (d[entry.table as TableName] as unknown[]).push(entry.item);
      d.trash = d.trash.filter((e) => e.key !== key);
      /* بازگردانی = تغییر جدید: مهر زمانی می‌گیرد و سنگ‌قبرش پاک می‌شود
         تا در مرورگرهای دیگر «بازگردانی» بر «حذف قدیمی» برنده شود */
      if (entry.table === "transactions") {
        const tx = entry.item as Tx;
        tx.updatedAt = Date.now();
        d.tombstones = d.tombstones.filter((tb) => tb.id !== tx.id);
      }
      d.activity_logs.unshift({ id: uid(), at: Date.now(), text: `«${entry.label}» بازگردانی شد` });
    });
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

/* ---------- گزینش‌گرها ---------- */
export const sumTx = (txs: Tx[], type?: "income" | "expense") =>
  txs.filter((t) => !type || t.type === type).reduce((s, t) => s + t.amount, 0);

export const catById = (s: AppState, id: ID) => s.categories.find((c) => c.id === id);
export const accById = (s: AppState, id: ID) => s.accounts.find((a) => a.id === id);
export const tagById = (s: AppState, id?: ID) => (id ? getTags(s).find((t) => t.id === id) : undefined);

/** تگ‌های زندهٔ state — اگر خالی بود، پیش‌فرض‌ها */
export const getTags = (s: AppState): TagDef[] =>
  Array.isArray(s.tags) && s.tags.length > 0 ? s.tags : DEFAULT_TAGS;

/* ---------- دادهٔ نمونهٔ اختیاری ---------- */
export function sampleFill(d: AppState) {
  const t = todayISO();
  const dd = (n: number) => addDaysISO(t, -n);
  const cat = (name: string, type: "income" | "expense", color: string): Category => {
    const found = d.categories.find((c) => c.name === name);
    if (found) return found;
    const c: Category = { id: uid(), name, type, color, icon: CATEGORY_ICON_BY_NAME[name] ?? "wallet" };
    d.categories.push(c);
    return c;
  };
  const cFood = cat("خوراک", "expense", "#e8b04b");
  const cTrans = cat("رفت‌وآمد", "expense", "#5ec8de");
  const cHome = cat("خانه و اجاره", "expense", "#8f7ae8");
  const cHealth = cat("سلامت", "expense", "#ff7a6b");
  const cFun = cat("تفریح", "expense", "#57d9a3");
  const cCloth = cat("پوشاک", "expense", "#f28fc0");
  const cEdu = cat("آموزش", "expense", "#7ab8f2");
  const cSub = cat("اشتراک", "expense", "#c0e85e");
  const iSalary = cat("حقوق", "income", "#57d9a3");
  const iProject = cat("پروژه", "income", "#e8b04b");

  const acc = (name: string, initial: number, color: string): Account => {
    const found = d.accounts.find((a) => a.name === name);
    if (found) return found;
    const a: Account = { id: uid(), name, type: "کارت بانکی", initial, color, balance: 0 };
    d.accounts.push(a);
    return a;
  };
  const a1 = acc("بانک ملت", 5200000, "#57d9a3");
  const a2 = acc("بانک سامان", 1800000, "#5ec8de");

  const tx = (n: number, type: "income" | "expense", title: string, amount: number, c: Category, a: Account, tag?: ID): Tx => ({
    id: uid(), date: dd(n), type, title, amount, categoryId: c.id, accountId: a.id, payMethod: "کارت",
    createdAt: Date.now() - n * 86400000, source: "app", tag,
  });

  d.transactions.unshift(
    tx(62, "income", "واریز حقوق", 18500000, iSalary, a1),
    tx(60, "expense", "اجارهٔ خانه", 4500000, cHome, a1, "essential"),
    tx(55, "expense", "خرید سوپرمارکت", 720000, cFood, a1, "essential"),
    tx(50, "expense", "اسنپ تا شرکت", 95000, cTrans, a1, "essential"),
    tx(45, "income", "پروژهٔ طراحی سایت", 3200000, iProject, a2),
    tx(40, "expense", "داروخانه", 240000, cHealth, a2, "essential"),
    tx(35, "expense", "رستوران با خانواده", 540000, cFood, a1, "fun"),
    tx(30, "income", "واریز حقوق", 18500000, iSalary, a1),
    tx(28, "expense", "قبض برق و گاز", 380000, cHome, a1, "essential"),
    tx(24, "expense", "خرید پوشاک", 890000, cCloth, a1, "later"),
    tx(20, "expense", "کافه با دوستان", 145000, cFun, a2, "fun"),
    tx(16, "expense", "کلاس زبان", 750000, cEdu, a2, "later"),
    tx(12, "expense", "اشتراک فیلم", 79000, cSub, a1, "later"),
    tx(8, "expense", "خرید میوه", 210000, cFood, a1, "cheap"),
    tx(5, "expense", "بنزین", 300000, cTrans, a1, "essential"),
    tx(2, "expense", "سوپرمارکت یاس", 265000, cFood, a1, "essential"),
    tx(1, "income", "پروژهٔ فریلنسری", 1800000, iProject, a2),
    tx(0, "expense", "اسنپ — جلسه", 88000, cTrans, a1, "essential"),
  );

  d.debts.push(
    { id: uid(), kind: "debt", person: "رضا محمدی", amount: 1500000, paid: 500000, due: addDaysISO(t, 12), note: "قرض تعمیر ماشین" },
    { id: uid(), kind: "credit", person: "مریم احمدی", amount: 800000, paid: 0, due: addDaysISO(t, 5), note: "پول بلیت کنسرت" },
  );
  d.budgets.push(
    { id: uid(), categoryId: cFood.id, limit: 3000000 },
    { id: uid(), categoryId: cTrans.id, limit: 1200000 },
    { id: uid(), categoryId: cFun.id, limit: 800000 },
    { id: uid(), categoryId: cHome.id, limit: 5500000 },
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
  d.notes.push(
    { id: uid(), title: "ایدهٔ پس‌انداز", body: "هر ماه ۱۰٪ از حقوق را همان روز به صندوق طلا منتقل کنم تا قبل از خرج شدن، پس‌انداز شده باشد.", date: dd(3), color: "#e8b04b", createdAt: Date.now() - 3 * 86400000 },
    { id: uid(), title: "لیست خرید هفته", body: "شیر، نان، میوه، قهوه — خرید بزرگ ماهانه را به اول هفته موکول کنم که تخفیف‌ها تازه هستند.", date: dd(1), color: "#57d9a3", createdAt: Date.now() - 86400000 },
  );
  recomputeBalances(d);
}

/** پاک‌سازی همهٔ داده‌ها — ساختار (دسته‌ها، حساب‌ها، تگ‌ها، روش‌های پرداخت) حفظ می‌شود */
export function clearData(d: AppState) {
  d.transactions = [];
  d.transfers = [];
  d.debts = [];
  d.installments = [];
  d.budgets = [];
  d.recurring = [];
  d.savings_goals = [];
  d.appointments = [];
  d.notes = [];
  d.cheques = [];
  d.splits = [];
  d.challenges = [];
  d.currencies = [];
  d.assets = [];
  d.subscriptions = [];
  d.trash = [];
  for (const a of d.accounts) a.balance = a.initial;
  recomputeBalances(d);
}

export { jalaliToday, todayISO };
