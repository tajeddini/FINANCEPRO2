import { useEffect, useRef, useState } from "react";
import { toJalaali, toGregorian, isLeapJalaaliYear } from "jalaali-js";

/* ---------- عمومی ---------- */
export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export const toEnDigits = (s: string): string =>
  s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

export const enDigits = toEnDigits;

export const faNum = (v: number | string): string =>
  String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const groupInt = (n: number): string =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");

export const faMoney = (n: number): string => faNum(groupInt(Math.abs(n)));

export const MONTHS_FA = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];
export const WEEKDAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const WEEKDAYS_MIN = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/* ---------- تقویم شمسی ---------- */
export interface JalaliDate { jy: number; jm: number; jd: number; }
export interface JalaliToday extends JalaliDate { weekday: string; }

export function jalaliToday(): JalaliToday {
  const now = new Date();
  const j = toJalaali(now);
  return { jy: j.jy, jm: j.jm, jd: j.jd, weekday: WEEKDAYS_FA[(now.getDay() + 1) % 7] };
}

export function jalaliMonthLen(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

export function jalaliFirstOffset(jy: number, jm: number): number {
  const g = toGregorian(jy, jm, 1);
  const d = new Date(g.gy, g.gm - 1, g.gd);
  return (d.getDay() + 1) % 7; // شنبه = ۰
}

export function jalaliToISO(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${g.gy}-${p(g.gm)}-${p(g.gd)}`;
}

export function isoToJalali(iso: string): JalaliDate {
  const j = toJalaali(new Date(iso + (iso.length === 10 ? "T12:00:00" : "")));
  return { jy: j.jy, jm: j.jm, jd: j.jd };
}

export function jalaliMonthRange(jy: number, jm: number): { from: string; to: string } {
  return { from: jalaliToISO(jy, jm, 1), to: jalaliToISO(jy, jm, jalaliMonthLen(jy, jm)) };
}

export const jalaliMonthKey = (jy: number, jm: number): string =>
  `${jy}-${String(jm).padStart(2, "0")}`;

export function weekdayOfISO(iso: string): number {
  return (new Date(iso + "T12:00:00").getDay() + 1) % 7;
}

export function addJalaliMonths(jy: number, jm: number, n: number): { jy: number; jm: number } {
  const total = jy * 12 + (jm - 1) + n;
  return { jy: Math.floor(total / 12), jm: (total % 12) + 1 };
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + "T12:00:00");
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayISO(): string {
  return addDaysISO(new Date().toISOString().slice(0, 10), 0);
}

export function inRange(iso: string, r: { from: string; to: string }): boolean {
  const d = iso.slice(0, 10);
  return d >= r.from && d <= r.to;
}

/* ---------- قالب‌بندی تاریخ ---------- */
export function faDate(iso: string): string {
  const j = isoToJalali(iso);
  return `${faNum(j.jd)} ${MONTHS_FA[j.jm - 1]} ${faNum(j.jy)}`;
}

export function jalaliShort(iso: string): string {
  const j = isoToJalali(iso);
  const t = jalaliToday();
  return `${faNum(j.jd)} ${MONTHS_FA[j.jm - 1]}${j.jy !== t.jy ? " " + faNum(j.jy) : ""}`;
}

export function jalaliCompact(iso: string): string {
  const j = isoToJalali(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return faNum(`${p(j.jy)}/${p(j.jm)}/${p(j.jd)}`);
}

export function jalaliDateStr(): string {
  const t = jalaliToday();
  return `${t.weekday}، ${faNum(t.jd)} ${MONTHS_FA[t.jm - 1]} ${faNum(t.jy)}`;
}

export const faTime = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return faNum(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
};

export function relTime(at: number | string): string {
  const t = typeof at === "number" ? at : new Date(at).getTime();
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "همین حالا";
  if (m < 60) return `${faNum(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${faNum(h)} ساعت پیش`;
  const d = Math.floor(h / 24);
  if (d < 31) return `${faNum(d)} روز پیش`;
  return jalaliShort(new Date(t).toISOString().slice(0, 10));
}

/* ---------- بازه‌های زمانی (۹ فیلتر) ---------- */
export type PeriodKey =
  | "today" | "yesterday" | "week" | "thisMonth" | "lastMonth"
  | "last3" | "thisYear" | "lastYear" | "all";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "امروز" },
  { key: "yesterday", label: "دیروز" },
  { key: "week", label: "این هفته" },
  { key: "thisMonth", label: "این ماه" },
  { key: "lastMonth", label: "ماه گذشته" },
  { key: "last3", label: "۳ ماه اخیر" },
  { key: "thisYear", label: "امسال" },
  { key: "lastYear", label: "سال گذشته" },
  { key: "all", label: "همه" },
];

export function periodRange(key: PeriodKey): { from: string; to: string } {
  const t = jalaliToday();
  const end = todayISO();
  const ms = (jy: number, jm: number) => jalaliMonthRange(jy, jm);
  switch (key) {
    case "today":
      return { from: end, to: end };
    case "yesterday": {
      const y = addDaysISO(end, -1);
      return { from: y, to: y };
    }
    case "week": {
      const off = weekdayOfISO(end);
      return { from: addDaysISO(end, -off), to: end };
    }
    case "thisMonth":
      return ms(t.jy, t.jm);
    case "lastMonth": {
      const lm = addJalaliMonths(t.jy, t.jm, -1);
      return ms(lm.jy, lm.jm);
    }
    case "last3": {
      const s = addJalaliMonths(t.jy, t.jm, -2);
      return { from: jalaliMonthRange(s.jy, s.jm).from, to: end };
    }
    case "thisYear":
      return { from: jalaliMonthRange(t.jy, 1).from, to: end };
    case "lastYear": {
      const ly = t.jy - 1;
      return ms(ly, 12);
    }
    default:
      return { from: "2000-01-01", to: end };
  }
}

/* ---------- ماشین‌حساب وام ---------- */
export function calcEMI(principal: number, annualPct: number, months: number) {
  if (months <= 0 || principal <= 0) return { monthly: 0, total: 0, interest: 0 };
  const r = annualPct / 100 / 12;
  if (r === 0) return { monthly: Math.round(principal / months), total: principal, interest: 0 };
  const monthly = (principal * r) / (1 - Math.pow(1 + r, -months));
  return {
    monthly: Math.round(monthly),
    total: Math.round(monthly * months),
    interest: Math.round(monthly * months - principal),
  };
}

/* ---------- هوک‌ها ---------- */
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

export function useNow(tick = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tick);
    return () => window.clearInterval(id);
  }, [tick]);
  return now;
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

export function useInView<T extends HTMLElement>(threshold = 0.12): [React.MutableRefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/** کپی در کلیپ‌بورد با fallback */
export async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}
