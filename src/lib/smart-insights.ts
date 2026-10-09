import type { AppState, Category, Tx } from "./data";
import {
  addDaysISO, addJalaliMonths, inRange, isoToJalali, jalaliMonthLen, jalaliMonthRange,
  jalaliToday, MONTHS_FA, todayISO, toEnDigits,
} from "./utils";

export interface MonthEndForecast {
  balance: number;
  dailyExpense: number;
  projectedExpense: number;
  recurringIncome: number;
  daysRemaining: number;
}

export function forecastMonthEndBalance(state: AppState): MonthEndForecast {
  const today = jalaliToday();
  const monthRange = jalaliMonthRange(today.jy, today.jm);
  const elapsedDays = Math.max(1, today.jd);
  const monthLength = jalaliMonthLen(today.jy, today.jm);
  const daysRemaining = Math.max(0, monthLength - today.jd);
  const monthExpense = state.transactions
    .filter((tx) => tx.type === "expense" && !tx.reimbursable && inRange(tx.date, monthRange))
    .reduce((sum, tx) => sum + tx.amount, 0);
  const dailyExpense = monthExpense / elapsedDays;
  const projectedExpense = dailyExpense * daysRemaining;
  const monthKey = `${today.jy}-${String(today.jm).padStart(2, "0")}`;
  const recurringIncome = state.recurring
    .filter((item) => item.type === "income" && item.lastRun !== monthKey
      && Math.min(item.dayOfMonth, monthLength) > today.jd)
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = state.accounts.reduce((sum, account) => sum + account.balance, 0)
    - projectedExpense + recurringIncome;

  return { balance, dailyExpense, projectedExpense, recurringIncome, daysRemaining };
}

export interface RecurringExpensePattern {
  categoryId: string;
  categoryName: string;
  amount: number;
  intervalDays: number;
  nextInDays: number;
  dayOfMonth: number;
}

const normalizeText = (text: string) => text
  .toLocaleLowerCase()
  .replace(/[يى]/g, "ی")
  .replace(/ك/g, "ک")
  .replace(/[\u200c\u200f]/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .replace(/\s+/g, " ");

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end.slice(0, 10)}T12:00:00`).getTime()
    - new Date(`${start.slice(0, 10)}T12:00:00`).getTime()) / 86_400_000);
}

export function detectRecurringExpenses(
  transactions: Tx[],
  categories: Category[],
): RecurringExpensePattern[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const candidates: Tx[] = [];
  for (const tx of transactions) {
    if (tx.type !== "expense" || tx.reimbursable) continue;
    if (normalizeText(tx.note || tx.title)) candidates.push(tx);
  }

  const groups: Tx[][] = [];
  for (const tx of candidates) {
    const text = new Set(normalizeText(tx.note || tx.title).split(" "));
    const group = groups.find((items) => {
      const first = items[0];
      if (first.categoryId !== tx.categoryId) return false;
      const firstText = new Set(normalizeText(first.note || first.title).split(" "));
      const sharedWords = [...text].filter((word) => firstText.has(word)).length;
      if (sharedWords / Math.max(1, Math.min(text.size, firstText.size)) < 0.6) return false;
      const average = items.reduce((sum, item) => sum + item.amount, 0) / items.length;
      return average > 0 && Math.abs(tx.amount - average) / average <= 0.1;
    });
    if (group) group.push(tx);
    else groups.push([tx]);
  }

  const today = todayISO();
  const patterns: RecurringExpensePattern[] = [];
  for (const group of groups) {
    const sorted = group.sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 3) continue;
    const intervals = sorted.slice(1).map((tx, index) => daysBetween(sorted[index].date, tx.date));
    if (intervals.some((days) => days < 28 || days > 32)) continue;
    const intervalDays = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
    const amounts = sorted.map((tx) => tx.amount);
    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    if (averageAmount <= 0 || (Math.max(...amounts) - Math.min(...amounts)) / averageAmount > 0.1) continue;
    const last = sorted[sorted.length - 1];
    const nextDate = addDaysISO(last.date, Math.round(intervalDays));
    const category = categoriesById.get(last.categoryId);
    if (!category) continue;
    patterns.push({
      categoryId: category.id,
      categoryName: category.name,
      amount: averageAmount,
      intervalDays,
      nextInDays: Math.max(0, daysBetween(today, nextDate)),
      dayOfMonth: isoToJalali(last.date).jd,
    });
  }
  return patterns.sort((a, b) => a.nextInDays - b.nextInDays);
}

export interface TransactionWarningInput {
  amount: number;
  type: Tx["type"];
  categoryId: string;
  accountId: string;
}

export function getTransactionWarnings(
  transactions: Tx[],
  input: TransactionWarningInput,
  now = Date.now(),
): string[] {
  const warnings: string[] = [];
  const recentThreshold = now - 10 * 60 * 1000;
  const duplicate = transactions.some((tx) =>
    tx.createdAt >= recentThreshold
    && tx.type === input.type
    && tx.amount === input.amount
    && tx.categoryId === input.categoryId
    && tx.accountId === input.accountId);
  if (duplicate) warnings.push("این تراکنش قبلاً ثبت شده؟ دوباره بررسی کنید.");

  if (input.type === "expense") {
    const recentExpenses = transactions.filter((tx) =>
      tx.type === "expense" && !tx.reimbursable && tx.categoryId === input.categoryId
      && daysBetween(tx.date, todayISO()) >= 0 && daysBetween(tx.date, todayISO()) <= 90);
    if (recentExpenses.length >= 3) {
      const average = recentExpenses.reduce((sum, tx) => sum + tx.amount, 0) / recentExpenses.length;
      if (average > 0 && input.amount > average * 3) {
        warnings.push("این تراکنش نسبت به الگوی معمول شما در این دسته بیشتر است.");
      }
    }
  }
  return warnings;
}

export interface TransactionSearch {
  range?: { from: string; to: string };
  keywords: string[];
  type?: Tx["type"];
  label: string;
}

const MONTH_INDEX = new Map(MONTHS_FA.map((month, index) => [normalizeText(month), index + 1]));

export function parseTransactionSearch(query: string): TransactionSearch {
  const today = jalaliToday();
  const normalized = normalizeText(toEnDigits(query));
  const monthMatch = [...MONTH_INDEX.entries()].find(([month]) => normalized.includes(month));
  const yearMatch = normalized.match(/(?:^|\s)(1[34]\d{2})(?=\s|$)/);
  const year = yearMatch ? Number(yearMatch[1]) : today.jy;
  const type: TransactionSearch["type"] = /(?:^|\s)(?:هزینه|خرج|خرجی)(?:ها|های)?(?=\s|$)/.test(normalized)
    ? "expense"
    : /(?:^|\s)(?:درآمد|واریز|حقوق)(?:ها|های)?(?=\s|$)/.test(normalized) ? "income" : undefined;
  let range: TransactionSearch["range"];
  let dateLabel = "";

  if (normalized.includes("هفته گذشته") || normalized.includes("هفته قبل")) {
    range = { from: addDaysISO(todayISO(), -6), to: todayISO() };
    dateLabel = "هفتهٔ گذشته";
  } else if (normalized.includes("ماه قبل") || normalized.includes("ماه گذشته")) {
    const previous = addJalaliMonths(today.jy, today.jm, -1);
    range = jalaliMonthRange(previous.jy, previous.jm);
    dateLabel = `${MONTHS_FA[previous.jm - 1]} ${previous.jy}`;
  } else if (normalized.includes("این ماه")) {
    range = jalaliMonthRange(today.jy, today.jm);
    dateLabel = `${MONTHS_FA[today.jm - 1]} ${today.jy}`;
  } else if (normalized.includes("امسال")) {
    range = { from: jalaliMonthRange(today.jy, 1).from, to: todayISO() };
    dateLabel = `سال ${today.jy}`;
  } else if (monthMatch) {
    const month = monthMatch[1];
    range = jalaliMonthRange(year, month);
    dateLabel = `${MONTHS_FA[month - 1]} ${year}`;
  }

  let keywordText = normalized;
  for (const [month] of MONTH_INDEX) keywordText = keywordText.split(month).join(" ");
  keywordText = keywordText
    .replace(/(?:^|\s)1[34]\d{2}(?=\s|$)/g, " ")
    .replace(/هفته (?:گذشته|قبل)|ماه (?:قبل|گذشته)|این ماه|امسال/g, " ")
    .replace(/هزینه(?:های|ها|هاى)?|خرجی?|درآمد|واریز|حقوق|همه|تراکنش(?:ها)?|رو|های|ها|هایِ|از|در|برای/g, " ");
  const keywords = keywordText.split(/\s+/).filter((word) => word.length > 1);
  const applied = [...keywords, ...(type ? [type === "expense" ? "هزینه" : "درآمد"] : []), ...(dateLabel ? [dateLabel] : [])];
  return { range, keywords, type, label: applied.length ? applied.join(" · ") : "" };
}

export function transactionMatchesSearch(
  tx: Tx,
  query: TransactionSearch,
  categoryName: string,
): boolean {
  const haystack = normalizeText(`${tx.title} ${tx.note ?? ""} ${categoryName}`);
  return query.keywords.every((keyword) => haystack.includes(keyword));
}
