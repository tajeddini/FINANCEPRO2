/* ---------- پارسر پیام‌های بانکی فارسی ----------
   همهٔ پردازش روی دستگاه خود کاربر انجام می‌شود — پیام هیچ‌جا ارسال نمی‌شود.

   فرمت‌های پشتیبانی‌شده (نمونه‌های واقعی):
   ── بانک ملی (بدون واحد، علامت منفیِ انتهای مبلغ = برداشت، تاریخ MMDD):
        بانك ملي ايران
        انتقال:4,509,000-
        حساب:83008
        مانده:220,654,858
        0531-20:40
   ── بانک‌های با واحد ریال/تومان و تاریخ کامل شمسی:
        خرید از هایپر استار
        مبلغ 1,234,567 ریال  کارت *4321
        1403/05/12 14:30  مانده: 22,000,000 ریال
*/
import { toEnDigits, jalaliToISO, jalaliToday, jalaliMonthLen } from "./utils";

export interface SmsParse {
  type: "income" | "expense";
  amountToman: number;
  rawAmount: number;
  unit: "rial" | "toman" | "unknown";
  /** واحد در پیام نبود و «ریال» (عرف بانک‌های ایران) فرض شد */
  unitInferred: boolean;
  dateISO?: string;
  jalali?: string;
  time?: string;
  cardTail?: string;
  accountNo?: string;
  merchant?: string;
  balanceToman?: number;
  confidence: "high" | "medium" | "low";
  /** یادداشت‌های تحلیلی برای نمایش (مثلاً حدس سال یا واحد) */
  notes: string[];
}

/** نرمال‌سازی متن: ارقام فارسی/عربی ← لاتین، کاف و یای عربی ← فارسی، جداکننده‌ها */
const normalize = (s: string) =>
  toEnDigits(s)
    .replace(/[ك]/g, "ک")
    .replace(/[ي]/g, "ی")
    .replace(/[٬،]/g, ",")
    .replace(/[٫]/g, ".")
    .replace(/[\u200c\u200f\u200e]/g, " ");

const toToman = (value: number, unit: "rial" | "toman" | "unknown"): number =>
  unit === "rial" ? Math.round(value / 10) : Math.round(value);

export function parseBankSMS(raw: string): SmsParse {
  const text = normalize(raw);
  const notes: string[] = [];

  /* ================= مبلغ ================= */
  let rawAmount = 0;
  let unit: SmsParse["unit"] = "unknown";
  let explicitSign: "+" | "-" | "" = "";
  let amountFound = false;

  const unitAt = (s: string): "rial" | "toman" | "unknown" =>
    /ریال|ر‌یال/.test(s) ? "rial" : /تومان|تومن/.test(s) ? "toman" : "unknown";

  /* ۱) «مبلغ ۱٬۲۳۴ ریال» — صریح‌ترین حالت */
  let m = text.match(
    /مبلغ\s*[:\-–]?\s*([+-]?)\s*([0-9][0-9,.]*)\s*([+-]?)\s*(میلیون\s*)?(هزار\s*)?(ریال|تومان|تومن)?/
  );
  if (m && parseFloat(m[2]) > 0) {
    rawAmount = parseFloat(m[2].replace(/,/g, ""));
    explicitSign = (m[1] || m[3]) as "+" | "-" | "";
    rawAmount *= m[4] ? 1_000_000 : m[5] ? 1_000 : 1;
    unit = m[6] ? unitAt(m[6]) : unitAt(text);
    amountFound = true;
  }

  /* ۲) «انتقال:4,509,000-» / «برداشت: 500,000-» / «واریز: +1,000,000» — فرمت بانک ملی */
  if (!amountFound) {
    m = text.match(
      /(انتقال|برداشت|واریز|خرید|پرداخت|کسر|دریافت|بستانکار|بدهکار)\s*[:\-–]?\s*([+-]?)\s*([0-9][0-9,.]*)\s*([+-]?)\s*(میلیون\s*)?(هزار\s*)?(ریال|تومان|تومن)?/
    );
    if (m && parseFloat(m[3]) > 0) {
      rawAmount = parseFloat(m[3].replace(/,/g, ""));
      explicitSign = (m[2] || m[4]) as "+" | "-" | "";
      rawAmount *= m[5] ? 1_000_000 : m[6] ? 1_000 : 1;
      unit = m[7] ? unitAt(m[7]) : unitAt(text);
      amountFound = true;
    }
  }

  /* ۳) عدد + واحد بدون کلیدواژه: «1,234,567 ریال» */
  if (!amountFound) {
    m = text.match(/([0-9][0-9,.]*)\s*(میلیون\s*)?(هزار\s*)?(ریال|تومان|تومن)\b/);
    if (m) {
      rawAmount = parseFloat(m[1].replace(/,/g, ""));
      rawAmount *= m[2] ? 1_000_000 : m[3] ? 1_000 : 1;
      unit = unitAt(m[4]);
      amountFound = true;
    }
  }

  /* واحد نامشخص → عرف بانک‌های ایران «ریال» است */
  const unitInferred = amountFound && unit === "unknown";
  if (unitInferred) {
    unit = "rial";
    notes.push("واحد پول در پیام نبود — «ریال» (عرف پیامک‌های بانکی) در نظر گرفته شد؛ اگر تومان است مبلغ را دستی اصلاح کن.");
  }

  /* ================= تاریخ و ساعت ================= */
  let dateISO: string | undefined;
  let jalali: string | undefined;

  /* الف) تاریخ کامل شمسی: 1403/05/12 */
  const dm = text.match(/(1[34][0-9]{2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{1,2})/);
  if (dm) {
    const jy = +dm[1], jm = +dm[2], jd = +dm[3];
    if (jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      jalali = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
      try { dateISO = jalaliToISO(jy, jm, jd); } catch { /* نامعتبر */ }
    }
  }

  /* ب) فرمت بانک ملی: MMDD-HH:MM (بدون سال → حدس از امروز) */
  let time: string | undefined;
  const mmdd = text.match(/\b(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])\s*[-–]\s*([01]?[0-9]|2[0-3]):([0-5][0-9])\b/);
  if (mmdd) {
    const jm = +mmdd[1], jd = +mmdd[2];
    time = `${mmdd[3].padStart(2, "0")}:${mmdd[4]}`;
    const today = jalaliToday();
    let jy = today.jy;
    if (jm > today.jm) {
      jy -= 1; /* پیام نمی‌تواند از ماه آینده باشد؛ پس سال قبل است */
      notes.push("سالِ تاریخ از امروز حدس زده شد.");
    }
    if (jd <= jalaliMonthLen(jy, jm)) {
      jalali = `${jy}/${mmdd[1]}/${mmdd[2]}`;
      try { dateISO = jalaliToISO(jy, jm, jd); } catch { /* نامعتبر */ }
    }
  } else {
    /* ج) فقط ساعت: 20:40 */
    const tm = text.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/);
    if (tm) time = `${tm[1].padStart(2, "0")}:${tm[2]}`;
  }

  /* ================= حساب و کارت ================= */
  const acctM = text.match(/حساب\s*[:\-–]?\s*([0-9]{3,16})/);
  const accountNo = acctM ? acctM[1] : undefined;

  const cardM =
    text.match(/\b[0-9]{4}[-\s]?[0-9xX*]{4}[-\s]?[0-9xX*]{4}[-\s]?([0-9]{4})\b/) ||
    text.match(/(?:کارت|شماره)[^0-9]{0,14}?([0-9]{4})(?![0-9])/) ||
    text.match(/\*{2,}\s*([0-9]{4})(?![0-9])/) ||
    text.match(/انتهای\s*([0-9]{4})/);
  const cardTail = cardM ? cardM[1] : undefined;

  /* ================= طرف مقابل ================= */
  const merM = text.match(
    /(?:خرید(?:\s+اینترنتی)?\s+از|پرداخت\s+به|برداشت\s+از|واریز\s+از|انتقال\s+به|دریافت\s+از)\s*[:\-–]?\s*([^\n]{2,40}?)(?=\s+(?:مبلغ|کارت|شماره|به|در|زمان|تاریخ|مانده|با|برای)|[,،]|\s*$)/
  );
  const merchant = merM ? merM[1].trim().replace(/[.،,]+$/, "") : undefined;

  /* ================= مانده ================= */
  let balanceToman: number | undefined;
  const bm = text.match(/مانده\s*[:\-–]?\s*([0-9][0-9,.]*)\s*(ریال|تومان|تومن)?/);
  if (bm) {
    const u = bm[2] ? unitAt(bm[2]) : unit;
    balanceToman = toToman(parseFloat(bm[1].replace(/,/g, "")) || 0, u);
  }

  /* ================= نوع تراکنش =================
     اولویت: علامت صریح (+/−) > کلیدواژه‌ها > پیش‌فرض هزینه */
  let type: "income" | "expense";
  if (explicitSign === "-") type = "expense";
  else if (explicitSign === "+") type = "income";
  else if (/(واریز|دریافت|افزایش موجودی|برگشت وجه|بستانکار)/.test(text)) type = "income";
  else type = "expense"; /* خرید، برداشت، پرداخت، انتقال: …- و پیش‌فرض */

  const confidence: SmsParse["confidence"] = !amountFound
    ? "low"
    : unitInferred || (!dateISO && !time) ? "medium" : "high";

  return {
    type, amountToman: toToman(rawAmount, unit), rawAmount: Math.round(rawAmount),
    unit, unitInferred, dateISO, jalali, time, cardTail, accountNo,
    merchant, balanceToman, confidence, notes,
  };
}

/* ---------- تطبیق حساب ---------- */

/** از روی چهار رقم آخر کارت یا شمارهٔ حسابِ پیام */
export function matchAccountByCard<T extends { name: string }>(
  accounts: T[],
  cardTail?: string,
  accountNo?: string
): T | undefined {
  const hit = (tail: string) =>
    accounts.find((a) => {
      const digits = a.name.replace(/[^0-9]/g, "");
      return digits.length >= 4 && (digits.endsWith(tail) || digits.includes(tail));
    });
  return (cardTail && hit(cardTail)) || (accountNo && accountNo.length >= 5 && hit(accountNo)) || undefined;
}

/** از روی نام بانکِ داخل پیام (مثلاً «ملی» در نام حساب «بانک ملی») */
const GENERIC_WORDS = ["بانک", "حساب", "کارت", "اصلی", "جاری", "پس‌انداز", "ریال", "تومان", "ایران"];
export function matchAccountByBankName<T extends { name: string }>(
  accounts: T[],
  smsText: string
): T | undefined {
  const text = normalize(smsText);
  for (const a of accounts) {
    const tokens = normalize(a.name)
      .split(/[\s\-–٬,.0-9]+/)
      .filter((w) => w.length >= 3 && !GENERIC_WORDS.includes(w));
    if (tokens.some((w) => text.includes(w))) return a;
  }
  return undefined;
}

/* ---------- نمونه‌های واقعی برای تست سریع ---------- */
export const SMS_SAMPLES: { label: string; text: string }[] = [
  {
    label: "برداشت — بانک ملی",
    text: "بانك ملي ايران\nانتقال:4,509,000-\nحساب:83008\nمانده:220,654,858\n0531-20:40",
  },
  {
    label: "خرید — با ریال و کارت",
    text: "خرید از هایپر استار\nمبلغ 1,234,567 ریال\nکارت *4321\n1403/05/12 14:30\nمانده: 220,000,000 ریال",
  },
  {
    label: "واریز حقوق — بانک ملت",
    text: "بانک ملت\nواریز: +185,000,000\nحساب: 112233\nمانده: 197,320,000\n0601-08:15",
  },
];
