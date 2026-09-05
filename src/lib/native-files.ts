/* ---------- انتخاب و خواندن فایل در پلتفرم بومی (اندروید) ----------
   در وب/PWA این ماژول null برمی‌گرداند و فراخوان‌کننده از <input type="file">
   موجود استفاده می‌کند؛ در اندروید، WebView دیالوگ انتخاب فایل را پیاده نمی‌کند،
   بنابراین از پلاگین FilePicker استفاده می‌کنیم و محتوای فایل را می‌خوانیم. */
import { Capacitor } from "@capacitor/core";

export interface PickedFile {
  name: string;
  mime?: string;
  /** محتوای فایل به‌صورت Base64 */
  base64: string;
}

export const isNativePlat = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * بازکردن انتخاب‌گر فایل بومی و خواندن محتوای یک فایل.
 * روی وب/PWA → null (فراخوان‌کننده مسیر <input type="file"> را ادامه می‌دهد).
 */
export async function pickFileNative(types: string[]): Promise<PickedFile | null> {
  if (!isNativePlat()) return null;
  const { FilePicker } = await import("@capawesome/capacitor-file-picker");
  const res = await FilePicker.pickFiles({
    types,
    limit: 1,
    readData: true,
  });
  const f = res.files[0];
  /* کاربر انتخاب را لغو کرد یا فایل داده نداشت */
  if (!f || !f.data) return null;
  return { name: f.name, mime: f.mimeType, base64: f.data };
}

/* ---------- کدگشایی Base64 ---------- */
export function base64ToUtf8(b64: string): string {
  const bytes = base64ToBytes(b64);
  return new TextDecoder("utf-8").decode(bytes);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
