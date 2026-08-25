/* ---------- پیکربندی Capacitor برای ساخت اپ اندروید ----------
   ⚠️ این فایل هیچ تأثیری روی نسخهٔ وب (Vercel) ندارد — فقط هنگام ساخت APK خوانده می‌شود.
   راهنمای کامل: CAPACITOR-GUIDE.md */
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  /* شناسهٔ یکتای اپ — بعد از ساخت پروژهٔ اندروید دیگر تغییرش ندهید */
  appId: "ir.tajeddini.financepro",
  /* نام اپ که زیر آیکون در گوشی دیده می‌شود */
  appName: "فایننس‌پرو",
  /* خروجی بیلد Vite — همان پوشه‌ای که Vercel هم استفاده می‌کند */
  webDir: "dist",
  /* رنگ پس‌زمینه هنگام بارگذاری اپ */
  backgroundColor: "#0a2019",

  server: {
    /* اپ از https://localhost سرو می‌شود → localStorage و مسیرهای مطلق درست کار می‌کنند */
    androidScheme: "https",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0a2019",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
