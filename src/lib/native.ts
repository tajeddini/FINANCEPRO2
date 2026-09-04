/* ---------- تشخیص پلتفرم (وب / کپاسیتور) ---------- */

/** آیا داخل اپ اندروید/بومی اجرا می‌شویم؟ */
export const isNative = (): boolean => {
  try {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    return !!w.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};

/** آیا PWA نصب‌شده (standalone) اجرا می‌شود؟ */
export const isStandalone = (): boolean => {
  try {
    const nav = navigator as unknown as { standalone?: boolean };
    return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
};
