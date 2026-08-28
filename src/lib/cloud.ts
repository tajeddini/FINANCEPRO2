/* ---------- ماندگاری بین مرورگرها: کد انتقال + سینک واقعی Supabase ---------- */
import { migrateLoadedState, type AppState, type ID, type Prefs, type Tx } from "./data";

/* ===== تنظیمات اتصال مشترک (برای صفحهٔ ورود هم در دسترس باشد) ===== */
const CLOUD_KEY = "fp_cloud";
export interface CloudCfg { url: string; key: string; }

export const getCloud = (): CloudCfg | null => {
  try {
    const raw = localStorage.getItem(CLOUD_KEY);
    return raw ? (JSON.parse(raw) as CloudCfg) : null;
  } catch {
    return null;
  }
};

export const saveCloud = (cfg: CloudCfg) => {
  try {
    localStorage.setItem(CLOUD_KEY, JSON.stringify(cfg));
  } catch { /* ignore */ }
};

/** تنظیمات مؤثر: ترجیح با prefs کاربر؛ اگر نبود، تنظیمات مشترک؛ بعد متغیرهای محیطی Vercel */
export function effectivePrefs(p: Prefs): Prefs {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const shared = getCloud();
  return {
    ...p,
    syncUrl: p.syncUrl || shared?.url || env.VITE_SUPABASE_URL || "",
    syncKey: p.syncKey || shared?.key || env.VITE_SUPABASE_ANON_KEY || "",
  };
}

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

/* ===== سینک Supabase (REST) ===== */
const restBase = (url: string) => url.replace(/\/+$/, "") + "/rest/v1";

const authHeaders = (key: string, extra: Record<string, string> = {}) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  ...extra,
});

/**
 * فرستادن دفترکل — جدول financepro_state (id, data, updated_at)
 * ⚠️ داده‌های حساس prefs (پین، کلیدها، توکن‌ها) هرگز به ابر فرستاده نمی‌شوند؛
 * فقط syncId نگه داشته می‌شود تا decodeState به وجود prefs خطا ندهد.
 */
export async function pushToCloud(
  s: AppState,
  p: Prefs,
  syncId?: string
): Promise<{ ok: boolean; message: string }> {
  const id = syncId ?? p.syncId;
  if (!p.syncUrl || !p.syncKey || !id)
    return { ok: false, message: "آدرس، کلید و شناسهٔ سینک کامل نیست." };
  try {
    const safeState: AppState = { ...s, prefs: { syncId: id } as Prefs };
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
    if (!rows.length) return { ok: false, message: "هنوز داده‌ای در ابر نیست." };
    const st = decodeState(rows[0].data);
    if (!st) return { ok: false, message: "دادهٔ ابر قابل‌خواندن نیست." };
    return { ok: true, message: "داده از ابر خوانده شد.", state: st, updatedAt: rows[0].updated_at };
  } catch {
    return { ok: false, message: "اتصال برقرار نشد." };
  }
}

/* ===== تراکنش‌های محلیِ سینک‌نشده (برای جلوگیری از گم‌شدن هنگام pull) ===== */
export function localOnlyTx(local: AppState, remote: AppState): Tx[] {
  const remoteIds = new Set(remote.transactions.map((t) => t.id));
  return local.transactions.filter((t) => !remoteIds.has(t.id));
}

/**
 * ادغام دادهٔ ابری با محلی: دادهٔ ابری مبناست، ولی تراکنش‌های محلیِ
 * سینک‌نشده حفظ می‌شوند (dedupe بر اساس id) و prefs محلی دست نمی‌خورد.
 */
export function mergePulledState(d: AppState, pulled: AppState, keep: Tx[]) {
  const merged = migrateLoadedState({ ...pulled });
  const pulledIds = new Set(merged.transactions.map((t) => t.id));
  merged.transactions = [...keep.filter((t) => !pulledIds.has(t.id)), ...merged.transactions];
  const prefs = d.prefs;
  Object.assign(d, merged, { prefs });
}

/* ===== کاربران ابری — جدول fp_users (username, data, updated_at) =====
   فقط نام کاربری، نام نمایشی، هش رمز و تاریخ ساخت — برای ورود چنددستگاهی */
export interface CloudUser { username: string; name: string; hash: string; created: number; }

export async function pushUser(u: CloudUser, cfg: CloudCfg): Promise<boolean> {
  try {
    const res = await fetch(`${restBase(cfg.url)}/fp_users`, {
      method: "POST",
      headers: authHeaders(cfg.key, { Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify({
        username: u.username,
        data: JSON.stringify({ name: u.name, hash: u.hash, created: u.created }),
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pullUser(username: string, cfg: CloudCfg): Promise<CloudUser | null> {
  try {
    const res = await fetch(
      `${restBase(cfg.url)}/fp_users?username=eq.${encodeURIComponent(username)}&select=data`,
      { headers: authHeaders(cfg.key) }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { data: string }[];
    if (!rows.length) return null;
    const d = JSON.parse(rows[0].data) as { name: string; hash: string; created: number };
    return { username, name: d.name, hash: d.hash, created: d.created };
  } catch {
    return null;
  }
}

export type { ID };
