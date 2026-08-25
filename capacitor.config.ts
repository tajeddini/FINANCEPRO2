import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ⚠️ این فایل توسط خود سایت (Vite / npm run build) خوانده نمی‌شود و
 * هیچ اثری روی دیپلوی Vercel ندارد. فقط فرمان‌های `npx cap` از آن استفاده می‌کنند.
 *
 * راهنمای کامل ساخت APK: فایل CAPACITOR-GUIDE.md
 */
const config: CapacitorConfig = {
  /* شناسهٔ یکتای اپ — قبل از انتشار در گوگل‌پلی می‌توان عوضش کرد،
     ولی بعد از انتشار نباید تغییر کند */
  appId: 'ir.tajeddini.financepro',

  /* نام اپ که زیر آیکون در گوشی نمایش داده می‌شود */
  appName: 'فایننس‌پرو',

  /* خروجی بیلد Vite — همان جایی که Vercel هم از آن استفاده می‌کند */
  webDir: 'dist',

  server: {
    /* لازم است تا درخواست‌های Supabase و فونت‌ها درست کار کنند */
    androidScheme: 'https',

    /* اگر روزی خواستی سایتِ دیپلوی‌شدهٔ Vercel را داخل اپ لود کنی
       (به‌جای فایل‌های محلی)، این خط را فعال کن — فعلاً خاموش است: */
    // url: 'https://financepro-2-luokj45qg-66-fcd4.vercel.app',
    // cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a2019',
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a2019',
    },
  },
};

export default config;
