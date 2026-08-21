import { useEffect, useRef, useState } from "react";
import { toJalaali, toGregorian, isLeapJalaaliYear } from "jalaali-js";

/* ---------- اعداد فارسی ---------- */
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export const faNum = (v: number | string): string =>
  String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const groupInt = (n: number): string =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬");

export const faMoney = (n: number): string => faNum(groupInt(n));

export const MONTHS_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const WEEKDAYS_FA = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

/* ---------- تقویم شمسی ---------- */
export interface JalaliToday {
  jy: number;
  jm: number;
  jd: number;
  weekday: string;
}

export function jalaliToday(): JalaliToday {
  const now = new Date();
  const j = toJalaali(now);
  return { jy: j.jy, jm: j.jm, jd: j.jd, weekday: WEEKDAYS_FA[(now.getDay() + 1) % 7] };
}

export function jalaliDateStr(): string {
  const t = jalaliToday();
  return `${t.weekday}، ${faNum(t.jd)} ${MONTHS_FA[t.jm - 1]} ${faNum(t.jy)}`;
}

export function jalaliMonthLen(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

/** جای خالی روزهای قبل از اول ماه در جدول هفتگی (شنبه = ۰) */
export function jalaliFirstOffset(jy: number, jm: number): number {
  const g = toGregorian(jy, jm, 1);
  const d = new Date(g.gy, g.gm - 1, g.gd);
  return (d.getDay() + 1) % 7;
}

export const faTime = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return faNum(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
};

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

export function useCountUp(target: number, duration = 1500, start = true): number {
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
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start, reduced]);
  return val;
}

export function useInView<T extends HTMLElement>(
  threshold = 0.15
): [React.MutableRefObject<T | null>, boolean] {
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
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}
