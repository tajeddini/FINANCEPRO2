/* ---------- تشخیص پلتفرم بومی (Capacitor) ----------
   فاز ۱ — آماده‌سازی: این ماژول هنوز به هیچ‌جای برنامه وصل نیست و هیچ رفتاری
   را تغییر نمی‌دهد. در نسخهٔ وب (Vercel) مقادیرش همیشه «web» است.

   در فاز ساخت APK از این ماژول برای موارد زیر استفاده می‌شود:
   - قفل با اثر انگشت (Biometric) که در مرورگر ممکن نیست
   - اعلان‌های بومی واقعی
   - اشتراک‌گذاری گزارش‌ها به‌صورت بومی */
import { Capacitor } from "@capacitor/core";

/** آیا برنامه داخل اپ بومی (اندروید/iOS) اجرا می‌شود یا در مرورگر؟ */
export const isNativePlatform: boolean = Capacitor.isNativePlatform();

/** پلتفرم فعلی: 'web' | 'android' | 'ios' */
export const platform: string = Capacitor.getPlatform();

/** آیا پلاگین مشخصی روی این پلتفرم موجود است؟ (برای فازهای بعدی) */
export const hasNativePlugin = (name: string): boolean =>
  Capacitor.isPluginAvailable(name);
