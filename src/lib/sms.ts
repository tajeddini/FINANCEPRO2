/* ---------- پارسر پیام‌های بانکی فارسی ----------
   همهٔ پردازش روی دستگاه خود کاربر انجام می‌شود — پیام هیچ‌جا ارسال نمی‌شود. */
import { toEnDigits, jalaliToISO } from "./utils";

export interface SmsParse {
  type: "income" | "expense";
  amountToman: number;
  rawAmount: number;
  unit: "rial" | "toman" | "unknown";
  dateISO?: string;
  jalali?: string;
  time?: string;
  cardTail?: string;
  merchant?: string;
  balanceToman?: number;
  confidence: "high" | "medium" | "low";
}

const clean = (s: string) => toEnDigits(s).replace(/[٬،]/g, ",").replace(/[٫]/g, ".");

/** تبدیل «مبلغ + واحد» به تومان */
function toToman(value: number, unit: "rial" | "toman" | "unknown"): number {
  if (unit === "rial") return Math.round(value / 10);
  return Math.round(value);
}

export function parseBankSMS(raw: string): SmsParse {
  const text = clean(raw);

  /* ---------- مبلغ ---------- */
  let rawAmount = 0;
  let mult = 1;
  let unit: SmsParse["unit"] = "unknown";

  const unitAt = (around: string): "rial" | "toman" | "unknown" => {
    if (/ریال|ريال/.test(around)) return "rial";
    if (/تومان|تومن|توم\b/.test(around)) return "toman";
    return "unknown";
  };

  let m = text.match(/مبلغ\s*[:\-–]?\s*([0-9][0-9,.]*)\s*(میلیون\s*)?(هزار\s*)?(ریال|ريال|تومان|تومن|توم)?/);
  if (m) {
    rawAmount = parseFloat(m[1].replace(/,/g, "")) || 0;
    mult = m[2] ? 1_000_000 : m[3] ? 1_000 : 1;
    unit = m[4] ? unitAt(m[4]) : unitAt(text);
  } else {
    m = text.match(/([0-9][0-9,.]*)\s*(میلیون\s*)?(هزار\s*)?(ریال|ريال|تومان|تومن|توم)\b/);
    if (m) {
      rawAmount = parseFloat(m[1].replace(/,/g, "")) || 0;
      mult = m[2] ? 1_000_000 : m[3] ? 1_000 : 1;
      unit = unitAt(m[4]);
    }
  }
  rawAmount *= mult;

  /* ---------- تاریخ شمسی ---------- */
  let dateISO: string | undefined;
  let jalali: string | undefined;
  const dm = text.match(/(1[34][0-9]{2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{1,2})/);
  if (dm) {
    const jy = +dm[1], jm = +dm[2], jd = +dm[3];
    if (jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      jalali = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
      try { dateISO = jalaliToISO(jy, jm, jd); } catch { /* تاریخ نامعتبر */ }
    }
  }

  /* ---------- ساعت ---------- */
  const tm = text.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?/);
  const time = tm ? `${tm[1].padStart(2, "0")}:${tm[2]}` : undefined;

  /* ---------- چهار رقم آخر کارت ---------- */
  const cardM =
    text.match(/\b[0-9]{4}[-\s]?[0-9xX*]{4}[-\s]?[0-9xX*]{4}[-\s]?([0-9]{4})\b/) ||
    text.match(/(?:کارت|شماره)[^0-9]{0,14}?([0-9]{4})(?![0-9])/) ||
    text.match(/\*{2,}\s*([0-9]{4})(?![0-9])/) ||
    text.match(/انتهای\s*([0-9]{4})/);
  const cardTail = cardM ? cardM[1] : undefined;

  /* ---------- طرف مقابل ---------- */
  const merM = text.match(
    /(?:خرید(?:\s+اینترنتی)?\s+از|پرداخت\s+به|برداشت\s+از|واریز\s+از|انتقال\s+به|دریافت\s+از)\s*[:\-–]?\s*([^\n]{2,40}?)(?=\s+(?:مبلغ|کارت|شماره|به|در|زمان|تاریخ|مانده|با|برای)|[,،]|\s*$)/
  );
  const merchant = merM ? merM[1].trim().replace(/[.،,]+$/, "") : undefined;

  /* ---------- مانده ---------- */
  let balanceToman: number | undefined;
  const bm = text.match(/مانده[^0-9]{0,12}([0-9][0-9,.]*)\s*(ریال|ريال|تومان|تومن)?/);
  if (bm) {
    const u = bm[2] ? unitAt(bm[2]) : unit;
    balanceToman = toToman(parseFloat(bm[1].replace(/,/g, "")) || 0, u);
  }

  /* ---------- نوع تراکنش ---------- */
  const strongExpense = /(خرید|برداشت|پرداخت|کسر|قبض|کارمزد|تسویه)/.test(text);
  const incomeHit = /(واریز|دریافت|افزایش موجودی|برگشت وجه|عایدی)/.test(text);
  const transferOut = /انتقال\s+به/.test(text);
  const type: "income" | "expense" =
    strongExpense || transferOut ? "expense" : incomeHit ? "income" : "expense";

  /* ---------- اطمینان ---------- */
  const confidence: SmsParse["confidence"] =
    rawAmount > 0 && unit !== "unknown" ? "high" : rawAmount > 0 ? "medium" : "low";

  return {
    type,
    amountToman: toToman(rawAmount, unit),
    rawAmount: Math.round(rawAmount),
    unit,
    dateISO,
    jalali,
    time,
    cardTail,
    merchant,
    balanceToman,
    confidence,
  };
}

/** پیدا کردن حساب از روی چهار رقم آخر کارت — اگر شماره در نام حساب باشد */
export function matchAccountByCard<T extends { name: string }>(
  accounts: T[],
  cardTail?: string
): T | undefined {
  if (!cardTail) return undefined;
  return accounts.find((a) => {
    const digits = a.name.replace(/[^0-9]/g, "");
    return digits.endsWith(cardTail) || a.name.includes(`*${cardTail}`);
  });
}
