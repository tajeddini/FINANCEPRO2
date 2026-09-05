/* ---------- یادآورهای بومی (اندروید) با @capacitor/local-notifications ----------
   زمان‌بندی اعلان‌ها برای:
     - قرارها: دقیقاً سرِ ساعت (با ترجیح «یادآور صوتی» صفحهٔ قرارها)
     - سررسید بدهی‌ها: ۲ روز قبل
     - سررسید اقساط: ۱ روز قبل
     - هشدار بودجه: عبور از ۸۰٪ و ۱۰۰٪ سقف (یک‌بار در ماه برای هر دسته)
   همهٔ اعلان‌ها با allowWhileIdle زمان‌بندی می‌شوند تا حتی اگر اپ کاملاً
   بسته باشد (Force-stop / Doze) باز هم به‌موقع در نوار اعلان گوشی بیایند.
   فقط در پلتفرم بومی اجرا می‌شود؛ وب/PWA مسیر اعلان مرورگری خودش را دارد. */
import type { AppState } from "./data";
import { faDate, faMoney, faTime, inRange, jalaliMonthRange, jalaliToday, todayISO } from "./utils";
import { isNativePlat } from "./native-files";

/* هش deterministیک رشته به عدد صحیح (برای id اعلان) */
const hashId = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
};

/* ساخت Date از ISO + ساعت ۹ صبحِ n روز قبل */
const atMorning = (iso: string, daysBefore: number): Date => {
  const d = new Date(iso + "T09:00:00");
  d.setDate(d.getDate() - daysBefore);
  return d;
};

interface ScheduledNote { id: number; title: string; body: string; at: Date; }

let permissionAsked = false;

/**
 * باززمان‌بندی همهٔ یادآورهای بومی بر اساس دادهٔ فعلی.
 * هر بار اعلان‌های قبلی لغو و مجموعهٔ تازه ساخته می‌شود (idempotent).
 */
export async function rescheduleReminders(state: AppState): Promise<void> {
  if (!isNativePlat()) return;

  const now = Date.now();
  const notes: ScheduledNote[] = [];

  /* ---- قرارها: دقیقاً سرِ ساعت قرار (با ترجیح «یادآور صوتی») ---- */
  if (state.prefs.notifyEnabled) {
    for (const a of state.appointments) {
      if (a.done) continue;
      const at = new Date(`${a.date}T${a.time}:00`);
      if (Number.isNaN(at.getTime()) || at.getTime() <= now) continue;
      notes.push({
        id: hashId("appt:" + a.id + ":" + a.date),
        title: "یادآوری قرار",
        body: `${a.title} — ساعت ${faTime(at)}`,
        at,
      });
    }
  }

  /* ---- بدهی‌ها، اقساط و بودجه (با ترجیح «یادآورهای بومی» در تنظیمات) ---- */
  if (state.prefs.nativeReminders) {
    /* سررسید بدهی‌ها: ۲ روز قبل */
    for (const d of state.debts) {
      if (d.kind !== "debt" || !d.due) continue;
      if (d.amount - d.paid <= 0) continue; /* تسویه شده */
      const at = atMorning(d.due, 2);
      if (at.getTime() <= now) continue;
      notes.push({
        id: hashId("debt:" + d.id),
        title: "یادآوری سررسید بدهی",
        body: `بدهی به ${d.person} — ${faMoney(d.amount - d.paid)} تومان، سررسید ${faDate(d.due)}`,
        at,
      });
    }

    /* سررسید اقساط: ۱ روز قبل */
    for (const inst of state.installments) {
      for (const m of inst.schedule || []) {
        if (m.paidAt) continue;
        if (m.due < todayISO()) continue;
        const at = atMorning(m.due, 1);
        if (at.getTime() <= now) continue;
        notes.push({
          id: hashId("inst:" + inst.id + ":" + m.due),
          title: "یادآوری قسط",
          body: `قسط «${inst.title}» — ${faMoney(m.amount)} تومان، سررسید ${faDate(m.due)}`,
          at,
        });
      }
    }

    /* هشدار بودجه: عبور از ۸۰٪ سقف (یک‌بار در ماه برای هر دسته) */
    const t = jalaliToday();
    const mr = jalaliMonthRange(t.jy, t.jm);
    const monthKey = `${t.jy}-${t.jm}`;
    for (const b of state.budgets) {
      if (b.limit <= 0) continue;
      const spent = state.transactions
        .filter((x) => x.categoryId === b.categoryId && x.type === "expense" && inRange(x.date, mr))
        .reduce((a, x) => a + x.amount, 0);
      const pct = Math.round((spent / b.limit) * 100);
      if (pct < 80) continue;
      const storageKey = `fp_budget_notified_${b.categoryId}_${monthKey}_${pct >= 100 ? "100" : "80"}`;
      try {
        if (localStorage.getItem(storageKey)) continue; /* قبلاً اطلاع داده شده */
        localStorage.setItem(storageKey, "1");
      } catch { /* ignore */ }
      const catName = state.categories.find((c) => c.id === b.categoryId)?.name ?? "دسته";
      notes.push({
        id: hashId("budget:" + b.categoryId + ":" + monthKey + (pct >= 100 ? ":over" : ":warn")),
        title: pct >= 100 ? "سقف بودجه رد شد!" : "هشدار بودجه",
        body:
          pct >= 100
            ? `بودجهٔ «${catName}» رد شد — ${faMoney(spent)} از ${faMoney(b.limit)} تومان`
            : `٪${pct} از بودجهٔ «${catName}» مصرف شده — ${faMoney(spent)} از ${faMoney(b.limit)} تومان`,
        /* اعلان فوری (۵ ثانیه بعد) تا کاربر همین حالا ببیند */
        at: new Date(now + 5000),
      });
    }
  }

  /* چیزی برای زمان‌بندی نیست — اجازه هم درخواست نکن */
  if (notes.length === 0) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    /* اجازهٔ اعلان (اندروید ۱۳+ / API 33) — فقط یک‌بار در هر نشست */
    if (!permissionAsked) {
      permissionAsked = true;
      try {
        await LocalNotifications.requestPermissions();
      } catch { /* کاربر رد کرد — اعلان‌ها بی‌صدا می‌مانند */ }
    }

    /* لغو اعلان‌های قبلی */
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch { /* ignore */ }

    const toPayload = (idle: boolean) =>
      notes.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { at: n.at, allowWhileIdle: idle },
        /* در برخی نسخه‌ها smallIcon الزامی است */
        smallIcon: "ic_stat_icon_config_sample",
      }));

    try {
      /* ترجیح: زنگ دقیق حتی در حالت Doze/بسته‌بودن اپ */
      await LocalNotifications.schedule({ notifications: toPayload(true) });
    } catch {
      /* دستگاه اجازهٔ زنگ دقیق نداد (اندروید ۱۲+) — زنگ غیردقیق باز هم می‌آید */
      await LocalNotifications.schedule({ notifications: toPayload(false) });
    }
  } catch {
    /* خطای کلی — اعلان‌ها اختیاری‌اند؛ نباید اپ را متوقف کنند */
  }
}

/**
 * درخواست اجازهٔ اعلان با پیام فارسی — هنگام فعال‌کردن از تنظیمات صدا زده می‌شود.
 * مقدار بازگشتی: آیا اجازه داده شد؟
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativePlat()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.requestPermissions();
    return res.display === "granted";
  } catch {
    return false;
  }
}
