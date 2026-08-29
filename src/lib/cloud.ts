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
/* اگر کاربر آدرس را با /rest/v1 کپی کرده باشد، تکراری نشود */
const restBase = (url: string) => {
  const u = url.replace(/\/+$/, "");
  return u.endsWith("/rest/v1") ? u : u + "/rest/v1";
};

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
    if (!res.ok)
      return { ok: false, message: httpDiagnosis(res.status, "خواندن از ابر") };
    const rows = (await res.json()) as { data: string; updated_at?: string }[];
    /* ⚠️ ابر «خالی» یک موفقیت است (HTTP درست کار کرده) — نه خطا!
       این تمایز، بن‌بست «اولین سینک» را می‌شکند: دستگاه تازه باید بتواند
       اولین push را انجام دهد تا ردیف ساخته شود. فقط خطای واقعی جلوی ارسال را می‌گیرد. */
    if (!rows.length)
      return { ok: true, message: "ابر خالی است — آمادهٔ دریافت اولین ارسال.", state: undefined };
    const st = decodeState(rows[0].data);
    if (!st) return { ok: false, message: "دادهٔ ابر قابل‌خواندن نیست (فرمت قدیمی یا خراب)." };
    return { ok: true, message: "داده از ابر خوانده شد.", state: st, updatedAt: rows[0].updated_at };
  } catch {
    return { ok: false, message: "اتصال برقرار نشد — اینترنت را بررسی کنید (یا آدرس پروژه اشتباه است)." };
  }
}

/* ---------- تشخیص خطاهای HTTP با راهنمای عملی ---------- */
export function httpDiagnosis(status: number, action: string): string {
  if (status === 401 || status === 403)
    return `کلید anon اشتباه یا منقضی است (${status}) — آن را دوباره از Settings → API سوپابیس کپی کنید.`;
  if (status === 404)
    return `جدول یا آدرس پیدا نشد (${status}) — آدرس پروژه و وجود جدول financepro_state را بررسی کنید (SQL آن در سند پروژه است).`;
  if (status === 400)
    return `درخواست نامعتبر (${status}) — احتمالاً آدرس پروژه را اشتباه وارد کرده‌اید (با https://xxx.supabase.co).`;
  if (status >= 500)
    return `خطای سمت سرور سوپابیس (${status}) — چند لحظه دیگر دوباره تلاش می‌شود.`;
  return `خطای ${status} هنگام ${action} از Supabase.`;
}

/* ---------- آزمایش اتصال — برای دکمهٔ «آزمایش اتصال» در تنظیمات ---------- */
export async function testConnection(
  p: Prefs,
  syncId?: string
): Promise<{ ok: boolean; message: string }> {
  const id = syncId ?? p.syncId ?? "fp-connection-test";
  if (!p.syncUrl || !p.syncKey)
    return { ok: false, message: "آدرس پروژه و کلید anon را کامل وارد کنید." };
  try {
    const res = await fetch(
      `${restBase(p.syncUrl)}/financepro_state?select=id&limit=1`,
      { headers: authHeaders(p.syncKey) }
    );
    if (res.ok)
      return { ok: true, message: `اتصال برقرار است ✅ — جدول financepro_state پاسخ داد (شناسهٔ سینک: ${id}).` };
    return { ok: false, message: httpDiagnosis(res.status, "آزمایش اتصال") };
  } catch {
    return { ok: false, message: "اتصال برقرار نشد — اینترنت را بررسی کنید. اگر از فیلترشکن استفاده می‌کنید، برای سوپابیس هم فعال باشد." };
  }
}

/* ---------- وضعیت سینک (برای نمایش در نشانگر و تنظیمات) ---------- */
export interface SyncStatus { ok: boolean; at: number; message: string; }
const STATUS_KEY = "fp_sync_status";

export const readSyncStatus = (): SyncStatus | null => {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as SyncStatus) : null;
  } catch {
    return null;
  }
};

export const writeSyncStatus = (s: SyncStatus): void => {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("fp-sync-status"));
  } catch { /* ignore */ }
};

/* ===== تراکنش‌های محلیِ سینک‌نشده (برای جلوگیری از گم‌شدن هنگام pull) ===== */
export function localOnlyTx(local: AppState, remote: AppState): Tx[] {
  const remoteIds = new Set(remote.transactions.map((t) => t.id));
  return local.transactions.filter((t) => !remoteIds.has(t.id));
}

/**
 * ادغام دادهٔ ابری با محلی: دادهٔ ابری مبناست، ولی تراکنش‌های محلیِ
 * سینک‌نشده حفظ می‌شوند (dedupe بر اساس id) و prefs محلی دست نمی‌خورد.
 * پارامتر keep اختیاری است — اگر داده نشود، خودکار محاسبه می‌شود.
 */
export function mergePulledState(d: AppState, pulled: AppState, keep?: Tx[]) {
  const merged = migrateLoadedState({ ...pulled });

  /* ۱) ادغام سنگ‌قبرها: برای هر id، جدیدترین زمان حذف (از هر دو طرف) */
  const tombById = new Map<string, number>();
  for (const tb of [...(d.tombstones ?? []), ...merged.tombstones]) {
    tombById.set(tb.id, Math.max(tombById.get(tb.id) ?? 0, tb.at));
  }
  merged.tombstones = [...tombById.entries()].map(([id, at]) => ({ table: "transactions" as const, id, at }));

  /* ۲) برای تراکنش‌های مشترک، «نسخهٔ جدیدترِ هر تراکنش» برنده است —
        نه اینکه کورکورانه کل دادهٔ ابر جایگزین محلی شود. در مساوی، محلی می‌ماند. */
  const localTxById = new Map(d.transactions.map((t) => [t.id, t]));
  merged.transactions = merged.transactions.map((pt) => {
    const lt = localTxById.get(pt.id);
    if (!lt) return pt;
    const localTime = lt.updatedAt ?? lt.createdAt ?? 0;
    const pulledTime = pt.updatedAt ?? pt.createdAt ?? 0;
    return localTime >= pulledTime ? lt : pt;
  });

  /* ۳) تراکنش‌های فقط-محلی (هنوز سینک‌نشده) هم حفظ می‌شوند (dedupe بر اساس id) */
  const toKeep = keep ?? localOnlyTx(d, merged);
  const mergedIds = new Set(merged.transactions.map((t) => t.id));
  merged.transactions = [...toKeep.filter((t) => !mergedIds.has(t.id)), ...merged.transactions];

  /* ۴) حذفِ ماندگار: تراکنشی که سنگ‌قبرش جدیدتر از آخرین ویرایشش است،
        حذف‌شده می‌ماند — حتی اگر مرورگر دیگر هنوز آن را داشته باشد.
        (اگر عمداً بازگردانی شده باشد، updatedAt جدیدتر از سنگ‌قبر است و می‌ماند.) */
  merged.transactions = merged.transactions.filter((t) => {
    const deletedAt = tombById.get(t.id);
    if (deletedAt === undefined) return true;
    return (t.updatedAt ?? t.createdAt ?? 0) > deletedAt;
  });

  /* ۵) سطل زبالهٔ محلی (پنجرهٔ بازگشت ۳۰ ثانیه) دست‌نخورده می‌ماند */
  const prefs = d.prefs;
  const trash = d.trash;
  Object.assign(d, merged, { prefs, trash });
}

/* ===== تشخیص برابری محتوای دفترکل =====
   برای جلوگیری از ادغام و لاگِ بیهوده وقتی دادهٔ ابر از نظر محتوایی
   همان دادهٔ محلی است (مثلاً وقتی ساعت دو دستگاه کمی اختلاف دارد) */
const ledgerFingerprint = (s: AppState): string =>
  JSON.stringify([
    s.transactions, s.transfers, s.accounts, s.categories, s.tags, s.debts,
    s.installments, s.budgets, s.payment_methods, s.recurring, s.savings_goals,
    s.appointments, s.notes, s.cheques, s.splits, s.challenges, s.currencies,
    s.assets, s.subscriptions, s.tombstones ?? [],
  ]);

export const sameLedgerContent = (a: AppState, b: AppState): boolean =>
  ledgerFingerprint(a) === ledgerFingerprint(b);

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
