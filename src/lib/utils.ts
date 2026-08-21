import { useEffect, useRef, useState } from "react";
import { toJalaali, toGregorian, isLeapJalaaliYear } from "jalaali-js";

/* ---------- اعداد فارسی ---------- */
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export const faNum = (v: number | string): string =>
  String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const toEnDigits = (s: string): string =>
  s
    .split("")
    .map((ch) => {
      const fi = FA_DIGITS.indexOf(ch);
      if (fi > -1) return String(fi);
      const ai = AR_DIGITS.indexOf(ch);
      if (ai > -1) return String(ai);
      return ch;
    })
    .join("");

export const parseAmount = (s: string): number => {
  const clean = toEnDigits(s).replace(/[٬,\s]/g, "").replace(/[^\d.]/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

export const groupInt = (n: number): string =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬");

export const faMoney = (n: number): string => faNum(groupInt(Math.round(n)));

export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ---------- تقویم شمسی ---------- */
export const MONTHS_FA = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];
export const WEEKDAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export const jalaliToday = (): JalaliDate & { weekday: string } => {
  const now = new Date();
  const j = toJalaali(now);
  return { jy: j.jy, jm: j.jm, jd: j.jd, weekday: WEEKDAYS_FA[(now.getDay() + 1) % 7] };
};

export const jalaliMonthLen = (jy: number, jm: number): number => {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
};

export const jalaliFirstOffset = (jy: number, jm: number): number => {
  const g = toGregorian(jy, jm, 1);
  return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
};

/** جلالی ← ISO میلادی (به‌وقت محلی) */
export const jalaliToISO = (jy: number, jm: number, jd: number): string => {
  const g = toGregorian(jy, jm, jd);
  return isoOf(new Date(g.gy, g.gm - 1, g.gd));
};

export const isoOf = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const todayISO = (): string => isoOf(new Date());

export const isoToDate = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysISO = (iso: string, n: number): string => {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};

export const isoToJalali = (iso: string): JalaliDate => {
  const d = isoToDate(iso);
  const j = toJalaali(d);
  return { jy: j.jy, jm: j.jm, jd: j.jd };
};

export const faDate = (iso: string): string => {
  const j = isoToJalali(iso);
  return `${faNum(j.jd)} ${MONTHS_FA[j.jm - 1]} ${faNum(j.jy)}`;
};

export const faDateShort = (iso: string): string => {
  const j = isoToJalali(iso);
  return `${faNum(j.jy)}/${faNum(String(j.jm).padStart(2, "0"))}/${faNum(String(j.jd).padStart(2, "0"))}`;
};

export const weekdayOfISO = (iso: string): string =>
  WEEKDAYS_FA[(isoToDate(iso).getDay() + 1) % 7];

/** کلید ماه جلالی یک تاریخ ISO — مثل 1404-05 */
export const jalaliMonthKey = (iso: string): string => {
  const j = isoToJalali(iso);
  return `${j.jy}-${String(j.jm).padStart(2, "0")}`;
};

export const jalaliLabel = (key: string): string => {
  const [jy, jm] = key.split("-").map(Number);
  return `${MONTHS_FA[jm - 1]} ${faNum(jy)}`;
};

/** بازهٔ ISO یک ماه جلالی: [start, end) */
export const jalaliMonthRange = (jy: number, jm: number): { start: string; end: string } => ({
  start: jalaliToISO(jy, jm, 1),
  end: addDaysISO(jalaliToISO(jy, jm, jalaliMonthLen(jy, jm)), 1),
});

export const addJalaliMonths = (jy: number, jm: number, n: number): { jy: number; jm: number } => {
  let m = jy * 12 + (jm - 1) + n;
  return { jy: Math.floor(m / 12), jm: (m % 12) + 1 };
};

/** بازهٔ ISO برای فیلترهای زمانی (۹ گزینه) */
export type PeriodKey =
  | "today" | "yesterday" | "thisWeek" | "lastWeek"
  | "thisMonth" | "lastMonth" | "thisYear" | "lastYear" | "all";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "امروز" },
  { key: "yesterday", label: "دیروز" },
  { key: "thisWeek", label: "این هفته" },
  { key: "lastWeek", label: "هفتهٔ قبل" },
  { key: "thisMonth", label: "این ماه" },
  { key: "lastMonth", label: "ماه قبل" },
  { key: "thisYear", label: "امسال" },
  { key: "lastYear", label: "پارسال" },
  { key: "all", label: "همه" },
];

export function periodRange(key: PeriodKey): { start: string; end: string } | null {
  const t = jalaliToday();
  const now = new Date();
  const iso = todayISO();
  switch (key) {
    case "today":
      return { start: iso, end: addDaysISO(iso, 1) };
    case "yesterday": {
      const y = addDaysISO(iso, -1);
      return { start: y, end: iso };
    }
    case "thisWeek": {
      const offset = (now.getDay() + 1) % 7;
      const s = addDaysISO(iso, -offset);
      return { start: s, end: addDaysISO(iso, 1) };
    }
    case "lastWeek": {
      const offset = (now.getDay() + 1) % 7;
      const s = addDaysISO(iso, -offset - 7);
      return { start: s, end: addDaysISO(iso, -offset) };
    }
    case "thisMonth":
      return jalaliMonthRange(t.jy, t.jm);
    case "lastMonth": {
      const p = addJalaliMonths(t.jy, t.jm, -1);
      return jalaliMonthRange(p.jy, p.jm);
    }
    case "thisYear":
      return jalaliMonthRange(t.jy, 1);
    case "lastYear":
      return jalaliMonthRange(t.jy - 1, 1);
    case "all":
      return null;
  }
}

export const inRange = (iso: string, r: { start: string; end: string } | null): boolean =>
  r === null || (iso >= r.start && iso < r.end);

export const faTime = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return faNum(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
};

/* ---------- هوک‌ها ---------- */
export function useNow(tick = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tick);
    return () => window.clearInterval(id);
  }, [tick]);
  return now;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function useInView<T extends HTMLElement>(
  threshold = 0.12
): [(node: T | null) => void, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const setRef = (node: T | null) => {
    ref.current = node;
  };
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, inView]);
  return [setRef, inView];
}

export function useCountUp(target: number, duration = 900, start = true): number {
  const reduced = usePrefersReducedMotion();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start, reduced]);
  return val;
}
