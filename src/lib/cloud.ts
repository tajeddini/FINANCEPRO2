/* ---------- ماندگاری بین مرورگرها: کد انتقال + سینک واقعی Supabase ---------- */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
    window.dispatchEvent(new CustomEvent("fp-cloud-config"));
  } catch { /* ignore */ }
};

/** متغیرهای محیطی Vercel — به‌صورت مستقیم از import.meta.env خوانده می‌شوند
    تا Vite در build زمان، مقادیر VITE_* را مطمئناً جایگذاری کند */
export function envCloud(): CloudCfg | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env.VITE_SUPABASE_URL ?? "";
  const key = env.VITE_SUPABASE_ANON_KEY ?? "";
  return url && key ? { url, key } : null;
}

let supabaseClient: SupabaseClient | null = null;
let supabaseClientKey = "";

export function getSupabaseClient(cfg: CloudCfg | null = getCloud() ?? envCloud()): SupabaseClient {
  if (!cfg) throw new Error("ابتدا آدرس پروژه و کلید anon سوپابیس را تنظیم کنید.");
  const clientKey = `${cfg.url}\n${cfg.key}`;
  if (supabaseClient && supabaseClientKey === clientKey) return supabaseClient;
  supabaseClient = createClient(cfg.url, cfg.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  supabaseClientKey = clientKey;
  return supabaseClient;
}

/** تنظیمات مؤثر: ترجیح با prefs کاربر؛ اگر نبود، تنظیمات مشترک؛ بعد متغیرهای محیطی Vercel */
export function effectivePrefs(p: Prefs): Prefs {
  const env = envCloud();
  const shared = getCloud();
  return {
    ...p,
    syncUrl: p.syncUrl || shared?.url || env?.url || "",
    syncKey: p.syncKey || shared?.key || env?.key || "",
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
const restBase = (url: string) => {
  const u = url.replace(/\/+$/, "");
  return u.endsWith("/rest/v1") ? u : u + "/rest/v1";
};

const authHeaders = (key: string, accessToken: string, extra: Record<string, string> = {}) => ({
  apikey: key,
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
  ...extra,
});

async function authenticatedUser(cfg: CloudCfg): Promise<{ id: string; accessToken: string } | null> {
  const client = getSupabaseClient(cfg);
  const [{ data: userData, error: userError }, { data: sessionData, error: sessionError }] = await Promise.all([
    client.auth.getUser(),
    client.auth.getSession(),
  ]);
  if (userError) throw userError;
  if (sessionError) throw sessionError;
  if (!userData.user || !sessionData.session) return null;
  return { id: userData.user.id, accessToken: sessionData.session.access_token };
}

/** فرستادن دفترکل — داده‌های حساس prefs هرگز فرستاده نمی‌شوند */
export async function pushToCloud(
  s: AppState,
  p: Prefs
): Promise<{ ok: boolean; message: string }> {
  if (!p.syncUrl || !p.syncKey)
    return { ok: false, message: "آدرس و کلید سینک کامل نیست." };
  try {
    const cfg = { url: p.syncUrl, key: p.syncKey };
    const auth = await authenticatedUser(cfg);
    if (!auth) return { ok: false, message: "برای همگام‌سازی ابری ابتدا با حساب سوپابیس وارد شوید." };
    const lookup = await fetch(
      `${restBase(cfg.url)}/financepro_state?user_id=eq.${encodeURIComponent(auth.id)}&select=id&limit=1`,
      { headers: authHeaders(cfg.key, auth.accessToken) }
    );
    if (!lookup.ok) return { ok: false, message: httpDiagnosis(lookup.status, "یافتن دفترکل کاربر") };
    const rows = (await lookup.json()) as { id: string }[];
    const id = rows[0]?.id ?? `fp-user-${auth.id}`;
    const safeState: AppState = { ...s, prefs: { syncId: id } as Prefs };
    const res = await fetch(`${restBase(p.syncUrl)}/financepro_state`, {
      method: "POST",
      headers: authHeaders(p.syncKey, auth.accessToken, { Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify({
        id,
        user_id: auth.id,
        data: encodeState(safeState),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok)
      return {
        ok: false,
        message: httpDiagnosis(res.status, "نوشتن در ابر"),
      };
    return { ok: true, message: "دفترکل به ابر فرستاده شد." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "اتصال برقرار نشد — اینترنت یا آدرس پروژه را بررسی کنید.",
    };
  }
}

/** خواندن دفترکل از ابر */
export async function pullFromCloud(
  p: Prefs
): Promise<{ ok: boolean; message: string; state?: AppState; updatedAt?: string }> {
  if (!p.syncUrl || !p.syncKey)
    return { ok: false, message: "آدرس و کلید سینک کامل نیست." };
  try {
    const cfg = { url: p.syncUrl, key: p.syncKey };
    const auth = await authenticatedUser(cfg);
    if (!auth) return { ok: false, message: "برای همگام‌سازی ابری ابتدا با حساب سوپابیس وارد شوید." };
    const res = await fetch(
      `${restBase(cfg.url)}/financepro_state?user_id=eq.${encodeURIComponent(auth.id)}&select=data,updated_at`,
      { headers: authHeaders(cfg.key, auth.accessToken) }
    );
    if (!res.ok)
      return { ok: false, message: httpDiagnosis(res.status, "خواندن از ابر") };
    const rows = (await res.json()) as { data: string; updated_at?: string }[];
    if (!rows.length)
      return { ok: true, message: "ابر خالی است — آمادهٔ دریافت اولین ارسال.", state: undefined };
    const st = decodeState(rows[0].data);
    if (!st) return { ok: false, message: "دادهٔ ابر قابل‌خواندن نیست." };
    return { ok: true, message: "داده از ابر خوانده شد.", state: st, updatedAt: rows[0].updated_at };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "اتصال برقرار نشد — اینترنت را بررسی کنید.",
    };
  }
}

export function httpDiagnosis(status: number, action: string): string {
  if (status === 401)
    return "نشست احراز هویت معتبر نیست یا کلید anon اشتباه است (401)؛ دوباره وارد شوید.";
  if (status === 403)
    return "دسترسی به ردیف رد شد (403)؛ نشست کاربر و سیاست RLS را بررسی کنید.";
  if (status === 404)
    return `جدول یا آدرس پیدا نشد (${status}) — جدول financepro_state را بررسی کنید.`;
  if (status === 400)
    return `درخواست نامعتبر (${status}) — آدرس پروژه را بررسی کنید.`;
  if (status >= 500)
    return `خطای سمت سرور سوپابیس (${status}).`;
  return `خطای ${status} هنگام ${action} از Supabase.`;
}

export async function testConnection(
  p: Prefs
): Promise<{ ok: boolean; message: string }> {
  if (!p.syncUrl || !p.syncKey)
    return { ok: false, message: "آدرس پروژه و کلید anon را کامل وارد کنید." };
  try {
    const cfg = { url: p.syncUrl, key: p.syncKey };
    const auth = await authenticatedUser(cfg);
    if (!auth) return { ok: false, message: "برای آزمایش اتصال ابتدا با حساب سوپابیس وارد شوید." };
    const res = await fetch(
      `${restBase(cfg.url)}/financepro_state?user_id=eq.${encodeURIComponent(auth.id)}&select=id&limit=1`,
      { headers: authHeaders(cfg.key, auth.accessToken) }
    );
    if (res.ok)
      return { ok: true, message: "اتصال برقرار است ✅ — دسترسی کاربر به جدول تأیید شد." };
    return { ok: false, message: httpDiagnosis(res.status, "آزمایش اتصال") };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "اتصال برقرار نشد — اینترنت را بررسی کنید.",
    };
  }
}

/* ---------- وضعیت سینک ---------- */
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

/* ===== تراکنش‌های محلیِ سینک‌نشده ===== */
export function localOnlyTx(local: AppState, remote: AppState): Tx[] {
  const remoteIds = new Set(remote.transactions.map((t) => t.id));
  return local.transactions.filter((t) => !remoteIds.has(t.id));
}

/** ادغام دادهٔ ابری با محلی — تراکنش‌محور، با سنگ‌قبر */
export function mergePulledState(d: AppState, pulled: AppState, keep?: Tx[]) {
  const merged = migrateLoadedState({ ...pulled });

  const tombById = new Map<string, number>();
  for (const tb of [...(d.tombstones ?? []), ...merged.tombstones]) {
    tombById.set(tb.id, Math.max(tombById.get(tb.id) ?? 0, tb.at));
  }
  merged.tombstones = [...tombById.entries()].map(([id, at]) => ({ table: "transactions" as const, id, at }));

  const localTxById = new Map(d.transactions.map((t) => [t.id, t]));
  merged.transactions = merged.transactions.map((pt) => {
    const lt = localTxById.get(pt.id);
    if (!lt) return pt;
    const localTime = lt.updatedAt ?? lt.createdAt ?? 0;
    const pulledTime = pt.updatedAt ?? pt.createdAt ?? 0;
    return localTime >= pulledTime ? lt : pt;
  });

  const toKeep = keep ?? localOnlyTx(d, merged);
  const mergedIds = new Set(merged.transactions.map((t) => t.id));
  merged.transactions = [...toKeep.filter((t) => !mergedIds.has(t.id)), ...merged.transactions];

  merged.transactions = merged.transactions.filter((t) => {
    const deletedAt = tombById.get(t.id);
    if (deletedAt === undefined) return true;
    return (t.updatedAt ?? t.createdAt ?? 0) > deletedAt;
  });

  const prefs = d.prefs;
  const trash = d.trash;
  Object.assign(d, merged, { prefs, trash });
}

const ledgerFingerprint = (s: AppState): string =>
  JSON.stringify([
    s.transactions, s.transfers, s.accounts, s.categories, s.tags, s.debts,
    s.installments, s.budgets, s.payment_methods, s.recurring, s.savings_goals,
    s.appointments, s.notes, s.cheques, s.splits, s.challenges, s.currencies,
    s.assets, s.subscriptions, s.tombstones ?? [],
  ]);

export const sameLedgerContent = (a: AppState, b: AppState): boolean =>
  ledgerFingerprint(a) === ledgerFingerprint(b);

export type { ID };
