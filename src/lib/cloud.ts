/* ---------- ماندگاری بین مرورگرها: کد انتقال + سینک واقعی Supabase ---------- */
import type { AppState, Prefs } from "./data";

/* ===== کد انتقال (آفلاین، بین مرورگرها) ===== */
export const encodeState = (s: AppState): string => {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
  } catch {
    return "";
  }
};

export const decodeState = (code: string): AppState | null => {
  try {
    const json = decodeURIComponent(escape(atob(code.trim().replace(/\s+/g, ""))));
    const d = JSON.parse(json) as AppState;
    if (!Array.isArray(d.transactions) || !Array.isArray(d.accounts) || !d.prefs) return null;
    return d;
  } catch {
    return null;
  }
};

/** تراکنش‌هایی که محلی ثبت شده‌اند ولی در نسخهٔ ابری وجود ندارند */
export function localOnlyTx(local: AppState, pulled: AppState): AppState["transactions"] {
  const ids = new Set(pulled.transactions.map((t) => t.id));
  return local.transactions.filter((t) => !ids.has(t.id));
}

/**
 * ادغام دادهٔ ابری در پیش‌نویس محلی — بدون از دست رفتن تراکنش‌های محلی.
 * تراکنش‌های محلی که در ابر نیستند (مثلاً در مرورگر دیگر ثبت شده و هنوز سینک
 * نشده‌اند) با dedupe بر اساس id حفظ می‌شوند. تعداد تراکنش‌های حفظ‌شده را برمی‌گرداند.
 */
export function mergePulledState(d: AppState, pulled: AppState): number {
  const keep = localOnlyTx(d, pulled);
  const localPrefs = d.prefs; /* prefs محلی (تم، پین و…) هرگز بازنویسی نشود */
  Object.assign(d, pulled, { prefs: localPrefs });
  /* نسخه‌های قدیمیِ ابر ممکن است جدول‌های جدید را نداشته باشند */
  if (!Array.isArray(d.notes)) d.notes = [];
  if (keep.length) d.transactions = [...keep, ...d.transactions];
  return keep.length;
}

/* ===== سینک Supabase (REST) ===== */
const restBase = (url: string) => url.replace(/\/+$/, "") + "/rest/v1";

const authHeaders = (key: string, extra: Record<string, string> = {}) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  ...extra,
});

/** فرستادن دفترکل — جدول financepro_state (id, data, updated_at) */
export async function pushToCloud(
  s: AppState,
  p: Prefs,
  syncId?: string
): Promise<{ ok: boolean; message: string }> {
  const id = syncId ?? p.syncId;
  if (!p.syncUrl || !p.syncKey || !id)
    return { ok: false, message: "آدرس، کلید و شناسهٔ سینک کامل نیست." };
  try {
    /* 🔒 امنیت: هرگز دادهٔ حساس prefs (پین، کلید سینک، آدرس، توکن‌ها) به ابر فرستاده نشود.
       فقط شناسهٔ سینک نگه داشته می‌شود — decodeState همچنان به وجود prefs نیاز دارد. */
    const safeState: AppState = { ...s, prefs: { syncId: p.syncId } as Prefs };
    const res = await fetch(`${restBase(p.syncUrl)}/financepro_state`, {
      method: "POST",
      headers: authHeaders(p.syncKey, { Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify({
        id,
        data: encodeState(safeState),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok)
      return {
        ok: false,
        message: `خطای ${res.status} از Supabase — کلید یا جدول financepro_state را بررسی کنید.`,
      };
    return { ok: true, message: "دفترکل به ابر فرستاده شد." };
  } catch {
    return { ok: false, message: "اتصال برقرار نشد — اینترنت یا آدرس پروژه را بررسی کنید." };
  }
}

/** خواندن دفترکل از ابر */
export async function pullFromCloud(
  p: Prefs,
  syncId?: string
): Promise<{ ok: boolean; message: string; state?: AppState; updatedAt?: string }> {
  const id = syncId ?? p.syncId;
  if (!p.syncUrl || !p.syncKey || !id)
    return { ok: false, message: "آدرس، کلید و شناسهٔ سینک کامل نیست." };
  try {
    const res = await fetch(
      `${restBase(p.syncUrl)}/financepro_state?id=eq.${encodeURIComponent(id)}&select=data,updated_at`,
      { headers: authHeaders(p.syncKey) }
    );
    if (!res.ok) return { ok: false, message: `خطای ${res.status} از Supabase.` };
    const rows = (await res.json()) as { data: string; updated_at?: string }[];
    // ردیفی نیست = خواندن موفق بوده ولی ابر خالی است (با خطای شبکه فرق دارد)
    if (!rows.length) return { ok: true, message: "هنوز داده‌ای در ابر نیست.", state: undefined };
    const st = decodeState(rows[0].data);
    if (!st) return { ok: false, message: "دادهٔ ابر قابل‌خواندن نیست." };
    return { ok: true, message: "داده از ابر خوانده شد.", state: st, updatedAt: rows[0].updated_at };
  } catch {
    return { ok: false, message: "اتصال برقرار نشد." };
  }
}

/* ===== پیکربندی ابری مشترک (برای همهٔ کاربران) =====
   اولویت: تنظیمات ذخیره‌شده در مرورگر ← متغیرهای محیطی Vercel */
export interface CloudConfig { url: string; key: string; }

export function getCloud(): CloudConfig | null {
  try {
    const g = JSON.parse(localStorage.getItem("fp_cloud") || "null") as CloudConfig | null;
    if (g && g.url && g.key) return g;
  } catch { /* ignore */ }
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
    return { url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_ANON_KEY };
  return null;
}

export function saveCloud(cfg: CloudConfig) {
  try { localStorage.setItem("fp_cloud", JSON.stringify(cfg)); } catch { /* ignore */ }
}

/** تنظیمات مؤثر سینک — ترجیح با ذخیرهٔ کاربر، بعد پیکربندی مشترک */
export function effectivePrefs(p: Prefs): Prefs {
  const c = getCloud();
  return { ...p, syncUrl: p.syncUrl || c?.url || "", syncKey: p.syncKey || c?.key || "" };
}

/* ===== حساب‌های کاربری مشترک (ورود یکسان در همهٔ دستگاه‌ها) ===== */
export interface CloudUser { username: string; name: string; hash: string; created: number; }

export async function pushUser(u: CloudUser, cfg: CloudConfig): Promise<boolean> {
  try {
    const res = await fetch(`${restBase(cfg.url)}/fp_users`, {
      method: "POST",
      headers: authHeaders(cfg.key, { Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify({ username: u.username, data: JSON.stringify(u), updated_at: new Date().toISOString() }),
    });
    return res.ok;
  } catch { return false; }
}

export async function pullUser(username: string, cfg: CloudConfig): Promise<CloudUser | null> {
  try {
    const res = await fetch(
      `${restBase(cfg.url)}/fp_users?username=eq.${encodeURIComponent(username)}&select=data`,
      { headers: authHeaders(cfg.key) }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { data: string }[];
    if (!rows.length) return null;
    return JSON.parse(rows[0].data) as CloudUser;
  } catch { return null; }
}
