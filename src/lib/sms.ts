/* ---------- پارسر پیام‌های بانکی فارسی ----------
   همهٔ پردازش روی دستگاه خود کاربر انجام می‌شود — پیام هیچ‌جا ارسال نمی‌شود.
   فرمت‌های پشتیبانی‌شده: بانک ملی (انتقال:4,509,000- / حساب:83008 / 0531-20:40)،
   بانک رسالت (ارجاع نقطه‌دار / -10,314,000 / 06/01_15:08) و فرمت‌های رایج دیگر. */
import { toEnDigits, jalaliToISO, jalaliMonthLen, jalaliToday } from "./utils";

export interface SmsParse {
  type: "income" | "expense";
  amountToman: number;
  rawAmount: number;
  unit: "rial" | "toman" | "unknown";
  dateISO?: string;
  jalali?: string;
  time?: string;
  cardTail?: string;
  accountNo?: string;
  merchant?: string;
  balanceToman?: number;
  reference?: string;
  confidence: "high" | "medium" | "low";
  /** یادداشت‌های تحلیلی — جاهایی که پارسر حدس زده و کاربر باید چک کند */
  notes: string[];
}

/** نرمال‌سازی: ارقام فارسی/عربی ← لاتین، کاف و یای عربی ← فارسی، جداکننده‌ها */
const clean = (s: string) =>
  toEnDigits(s)
    .replace(/ك/g, "ک")
    .replace(/ي/g, "ی")
    .replace(/\u200c/g, " ")
    .replace(/[٬،]/g, ",")
    .replace(/[٫]/g, ".");

/** تبدیل «مبلغ + واحد» به تومان */
function toToman(value: number, unit: "rial" | "toman" | "unknown"): number {
  if (unit === "rial") return Math.round(value / 10);
  return Math.round(value);
}

const unitAt = (around: string): "rial" | "toman" | "unknown" => {
  if (/ریال/.test(around)) return "rial";
  if (/تومان|تومن|توم\b/.test(around)) return "toman";
  return "unknown";
};

export function parseBankSMS(raw: string): SmsParse {
  const notes: string[] = [];
  const normalized = clean(raw);

  /* ---------- شمارهٔ ارجاع (فرمت رسالت: 10.10070145.1) ----------
     اول از همه جدا می‌شود تا با مبلغ/تاریخ اشتباه گرفته نشود */
  let reference: string | undefined;
  let text = normalized;
  const refM = normalized.match(/^\s*(\d{1,4}(?:\.\d{4,}){1,3})\s*$/m);
  if (refM) {
    reference = refM[1];
    text = normalized.replace(refM[0], " ");
  }

  /* ---------- مبلغ ---------- */
  let rawAmount = 0;
  let unit: SmsParse["unit"] = "unknown";
  let explicitSign: "+" | "-" | undefined;
  let amountFound = false;
  let m: RegExpMatchArray | null;

  /* ۱) «مبلغ: X [واحد]» */
  m = text.match(/مبلغ\s*[:\-–]?\s*([+-]?)\s*([0-9][0-9,.]*)\s*(میلیون\s*)?(هزار\s*)?(ریال|تومان|تومن|توم)?/);
  if (m && parseFloat(m[2]) > 0) {
    rawAmount = parseFloat(m[2].replace(/,/g, ""));
    if (m[1]) explicitSign = m[1] as "+" | "-";
    rawAmount *= m[3] ? 1_000_000 : m[4] ? 1_000 : 1;
    unit = m[5] ? unitAt(m[5]) : unitAt(text);
    amountFound = true;
  }

  /* ۲) «کلیدواژه: X-» (فرمت ملی: انتقال:4,509,000-) — علامت چسبیدهٔ بعد از عدد */
  if (!amountFound) {
    m = text.match(
      /(?:انتقال|واریز|برداشت|خرید|پرداخت|دریافت|کارمزد|برگشت|تسویه|شارژ)\s*[:\-–]?\s*([0-9][0-9,.]*)\s*([+-])/
    );
    if (m && parseFloat(m[1]) > 0) {
      rawAmount = parseFloat(m[1].replace(/,/g, ""));
      explicitSign = m[2] as "+" | "-";
      unit = unitAt(text);
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

  /* ۴) عدد گروه‌دارِ تنها با علامت — فرمت رسالت: «-10,314,000» در یک خط جدا
     (بدون کلیدواژه و بدون واحد؛ علامت +/- الزامی است تا با مانده اشتباه نشود) */
  if (!amountFound) {
    m = text.match(/(?:^|\n)\s*([+-])\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{5,})\s*(?=\n|$)/);
    if (m && parseFloat(m[2]) > 0) {
      rawAmount = parseFloat(m[2].replace(/,/g, ""));
      explicitSign = m[1] as "+" | "-";
      unit = unitAt(text);
      amountFound = true;
    }
  }

  /* ---------- تاریخ شمسی ---------- */
  let dateISO: string | undefined;
  let jalali: string | undefined;
  const t = jalaliToday();

  /* تاریخ کامل: 1403/05/12 */
  const dm = text.match(/\b(1[34][0-9]{2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{1,2})\b/);
  if (dm) {
    const jy = +dm[1], jm = +dm[2], jd = +dm[3];
    if (jm >= 1 && jm <= 12 && jd >= 1 && jd <= jalaliMonthLen(jy, jm)) {
      jalali = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
      try { dateISO = jalaliToISO(jy, jm, jd); } catch { /* نامعتبر */ }
    }
  }

  /* تاریخ کوتاه بدون سال (ملی: 0531-20:40 | رسالت: 06/01_15:08) — حدس سال از امروز */
  if (!dateISO) {
    const sm = text.match(/\b([01][0-9])([0-3][0-9])\s*[-_\/]\s*([012]?[0-9]):([0-5][0-9])\b/);
    if (sm) {
      const jm = +sm[1], jd = +sm[2];
      if (jm >= 1 && jm <= 12) {
        /* اگر ماه از ماه جاری جلوتر است، حتماً سال قبل است */
        let jy = jm > t.jm ? t.jy - 1 : t.jy;
        if (jd >= 1 && jd <= jalaliMonthLen(jy, jm)) {
          jalali = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
          try { dateISO = jalaliToISO(jy, jm, jd); } catch { /* نامعتبر */ }
          if (jy !== t.jy) notes.push(`تاریخ بدون سال بود — سال ${jy} حدس زده شد.`);
        }
      }
    }
  }

  /* ---------- ساعت ---------- */
  const tm = text.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?\b/);
  const time = tm ? `${tm[1].padStart(2, "0")}:${tm[2]}` : undefined;

  /* ---------- شمارهٔ حساب (فرمت ملی: حساب:83008) ---------- */
  const accM = text.match(/حساب\s*[:\-–]?\s*#?\s*([0-9]{4,20})/);
  const accountNo = accM ? accM[1] : undefined;

  /* ---------- چهار رقم آخر کارت ---------- */
  const cardM =
    text.match(/\b[0-9]{4}[-\s]?[0-9xX*]{4}[-\s]?[0-9xX*]{4}[-\s]?([0-9]{4})\b/) ||
    text.match(/(?:کارت|شماره کارت)[^0-9]{0,14}?([0-9]{4})(?![0-9])/) ||
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
  const bm = text.match(/مانده[^0-9]{0,12}([0-9][0-9,.]*)\s*(ریال|تومان|تومن)?/);
  if (bm) {
    const u = bm[2] ? unitAt(bm[2]) : unit;
    balanceToman = toToman(parseFloat(bm[1].replace(/,/g, "")) || 0, u);
  }

  /* ---------- نوع تراکنش ----------
     ۱) علامت صریحِ مبلغ، ۲) کلیدواژه‌ها، ۳) پیش‌فرض: هزینه */
  let type: "income" | "expense";
  if (explicitSign) type = explicitSign === "+" ? "income" : "expense";
  else if (/(واریز|دریافت|افزایش موجودی|برگشت وجه|عایدی)/.test(text)) type = "income";
  else type = "expense"; /* خرید، برداشت، پرداخت، انتقال */

  /* ---------- یادداشت‌های تحلیلی ---------- */
  if (amountFound && unit === "unknown") {
    notes.push("واحد پول در پیام نبود — «ریال» فرض و به تومان تبدیل شد؛ مبلغ را چک کن.");
  }

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
    accountNo,
    merchant,
    balanceToman,
    reference,
    confidence,
    notes,
  };
}

/** پیدا کردن حساب از روی چهار رقم آخر کارت یا شمارهٔ حساب — اگر در نام حساب باشد */
export function matchAccountByCard<T extends { name: string }>(
  accounts: T[],
  cardTail?: string,
  accountNo?: string
): T | undefined {
  if (cardTail) {
    const byCard = accounts.find((a) => {
      const digits = a.name.replace(/[^0-9]/g, "");
      return digits.endsWith(cardTail) || a.name.includes(`*${cardTail}`);
    });
    if (byCard) return byCard;
  }
  if (accountNo) {
    const byAcc = accounts.find((a) => a.name.replace(/[^0-9]/g, "").includes(accountNo));
    if (byAcc) return byAcc;
  }
  return undefined;
}

/** پیدا کردن حساب از نام بانکِ داخل پیام (مثلاً «بانك ملي» ← حسابی که «ملی» دارد) */
export function matchAccountByBankName<T extends { name: string }>(
  accounts: T[],
  smsText: string
): T | undefined {
  const text = clean(smsText);
  const BANK_WORDS = [
    "ملی", "ملت", "صادرات", "سپه", "کشاورزی", "مسکن", "توسعه تعاون", "پست بانک",
    "رسالت", "مهر ایران", "قرض الحسنه", "سامان", "پارسیان", "پاسارگاد", "اقتصاد نوین",
    "کارآفرین", "سرمایه", "سینا", "شهر", "دی", "ایران زمین", "خاورمیانه", "گردشگری",
    "آینده", "انصار", "حکمت ایرانیان", "ایرانیان", "تجارت", "رفاه", "قرض‌الحسنه",
  ];
  for (const w of BANK_WORDS) {
    if (!text.includes(w)) continue;
    const hit = accounts.find((a) => a.name.includes(w));
    if (hit) return hit;
  }
  return undefined;
}
