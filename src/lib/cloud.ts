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
  p: Prefs
): Promise<{ ok: boolean; message: string }> {
  if (!p.syncUrl || !p.syncKey || !p.syncId)
    return { ok: false, message: "آدرس، کلید و شناسهٔ سینک کامل نیست." };
  try {
    const res = await fetch(`${restBase(p.syncUrl)}/financepro_state`, {
      method: "POST",
      headers: authHeaders(p.syncKey, { Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify({
        id: p.syncId,
        data: encodeState(s),
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
  p: Prefs
): Promise<{ ok: boolean; message: string; state?: AppState; updatedAt?: string }> {
  if (!p.syncUrl || !p.syncKey || !p.syncId)
    return { ok: false, message: "آدرس، کلید و شناسهٔ سینک کامل نیست." };
  try {
    const res = await fetch(
      `${restBase(p.syncUrl)}/financepro_state?id=eq.${encodeURIComponent(p.syncId)}&select=data,updated_at`,
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
