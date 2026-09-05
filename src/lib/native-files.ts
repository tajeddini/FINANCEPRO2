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

/* ---------- ذخیره/اشتراک فایل در پلتفرم بومی ---------- */

/** تبدیل Blob به Base64 (تکه‌تکه تا برای فایل‌های بزرگ stack پر نشود) */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * ذخیرهٔ فایل در حافظهٔ موقت اپ و بازکردن برگهٔ اشتراک/ذخیرهٔ بومی.
 * کاربر از آنجا می‌تواند در Downloads ذخیره کند یا به تلگرام و… بفرستد.
 * فقط در پلتفرم بومی صدا زده شود.
 */
export async function saveAndShareNative(
  filename: string,
  blob: Blob,
  mime: string
): Promise<boolean> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
      recursive: false,
    });
    await Share.share({
      title: filename,
      text: filename,
      url: written.uri,
      dialogTitle: "ذخیره یا اشتراک‌گذاری فایل",
    });
    return true;
  } catch {
    /* کاربر برگه را بست یا خطا — فایل در Cache مانده */
    return false;
  }
}

/**
 * خروجی گرفتن از یک Blob — با تشخیص خودکار پلتفرم:
 *   وب/PWA  → دانلود مرورگری (Blob URL + <a download>)
 *   اندروید → ذخیره در Cache + برگهٔ اشتراک/ذخیرهٔ بومی
 * اگر مسیر بومی شکست خورد، به مسیر وب برمی‌گردد (بهترین تلاش).
 */
export async function exportFile(
  name: string,
  blob: Blob,
  mime: string
): Promise<"native" | "web"> {
  if (isNativePlat()) {
    const ok = await saveAndShareNative(name, blob, mime);
    if (ok) return "native";
    /* fallthrough: شاید WebView اجازهٔ دانلود بدهد */
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "web";
}
