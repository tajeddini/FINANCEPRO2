# 📱 راهنمای ساخت اپ اندروید فایننس‌پرو (Capacitor)

این راهنما شما را از کد وب تا یک فایل APK قابل نصب روی گوشی می‌رساند.

---

## پیش‌نیازها

| مورد | وضعیت |
|---|---|
| Node.js نسخه ۱۸+ | لازم |
| Android Studio (Quail یا جدیدتر) | لازم |
| Android SDK + API 36 | لازم (از SDK Manager) |
| JDK داخلی Android Studio | خودکار |

---

## گام ۱ — آماده‌سازی کد

در ترمینال VS Code (داخل پوشهٔ پروژه):

```bash
npm install
npm run build
```

## گام ۲ — افزودن پلتفرم اندروید (فقط بار اول)

```bash
npx cap add android
```

اگر پوشهٔ `android` از قبل هست، این مرحله را رد کنید.

## گام ۳ — پچ Gradle برای اینترنت ایران

سرورهای گوگل از ایران مستقیم در دسترس نیستند. اسکریپت پچ، میرور + پروکسی را به Gradle معرفی می‌کند:

```bash
node patch-android-mirror.cjs
```

> 💡 اگر VPN دارید (v2rayN پورت 10809 یا Clash پورت 7890)، پچ به‌صورت خودکار پروکسی محلی را تشخیص می‌دهد. برای اجبار:
> ```bash
> set FP_PROXY=127.0.0.1:10809 && node patch-android-mirror.cjs
> ```

## گام ۴ — سینک سایت داخل اپ

```bash
npx cap sync android
```

**راه یک‌کلیکی:** به‌جای گام‌های ۲ تا ۴، روی `scripts/build-android.bat` (ویندوز) یا `scripts/build-android.sh` (لینوکس/مک) دوبار کلیک کنید.

## گام ۵ — باز کردن در Android Studio

```bash
npx cap open android
```

- پیام **Trust Project** → حتماً **Trust Project** را بزنید.
- صبر کنید **Gradle Sync** سبز شود (بار اول ۵–۱۵ دقیقه).

## گام ۶ — ساخت APK

در Android Studio:
```
Build → Build App Bundle(s) / APK(s) → Build APK(s)
```

فایل نهایی اینجاست:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## گام ۷ — نصب روی گوشی

- **با کابل:** USB Debugging را روشن کنید و دکمهٔ سبز **▶ Run** را بزنید.
- **بدون کابل:** فایل `app-debug.apk` را با تلگرام برای خود بفرستید و روی گوشی نصب کنید (اجازهٔ «نصب از منابع ناشناس» لازم است).

---

## چک‌لیست تست اولین اجرا

| # | تست | انتظار |
|---|---|---|
| ۱ | صفحهٔ ورود بالا می‌آید | با برند فایننس‌پرو |
| ۲ | ورود با همان نام کاربری/رمز سایت | شناخته شوید (از Supabase) |
| ۳ | ثبت تراکنش در اپ | چند ثانیه بعد در سایت هم هست |
| ۴ | خاموش‌کردن اینترنت و بازکردن اپ | داده‌ها از حافظهٔ محلی بالا می‌آیند |
| ۵ | بستن و بازکردن اپ | نشست حفظ شده، ورود دوباره نمی‌خواهد |

---

## عیب‌یابی

| خطا | راه‌حل |
|---|---|
| `Could not resolve all artifacts` | `node patch-android-mirror.cjs` را دوباره بزنید + Sync |
| `Read timed out` روی میرور | از VPN استفاده کنید (گام ۳) |
| `compileSdk 36 not found` | در SDK Manager تیک API 36 را بزنید |
| `SDK location not found` | مسیر SDK را در Settings → Android SDK بدهید |
| صفحهٔ سفید داخل اپ | `npm run build` و `npx cap sync android` را دوباره بزنید |
| `Unsupported class file major version` | Gradle JDK را روی jbr-21 (داخلی استودیو) بگذارید |

---

## گردش کار روزانهٔ آپدیت

هر بار که کد سایت را عوض کردید:

```bash
npm run build
npx cap sync android
node patch-android-mirror.cjs
```

سپس در Android Studio → Build APK(s).

---

## امضای دیباگ ثابت (آپدیت بدون خطای «package conflicts»)

اگر هنگام نصبِ APK جدید روی نسخهٔ قبلی خطای **«App not installed as package conflicts with an existing package»** گرفتید، یعنی دو APK با کلیدهای متفاوت امضا شده‌اند. پروژه این مشکل را حل کرده:

- **`keys/debug.keystore.p12`** — کی‌استور ثابت (commit شده) که همهٔ بیلدها از آن استفاده می‌کنند:
  - alias: `androiddebugkey` · password: `android` · نوع: PKCS12 · اعتبار: ۱۰۰ سال
- **`keys/debug-signing.gradle`** — تنظیم امضا که به `android/app/build.gradle` الحاق می‌شود.
- **Workflow گیت‌هاب** بعد از `cap sync` خودکار این امضا را اعمال می‌کند (چون `android/` در CI از نو ساخته می‌شود).
- **اسکریپت‌های `build-android.bat/sh`** هم همان امضا را لوکال اعمال می‌کنند تا APK لوکال و CI هم‌امضا باشند.

> ⚠️ **یک‌بار:** بعد از فعال‌شدن این تغییر، اپ نصب‌شدهٔ فعلی روی گوشی را **uninstall** کنید و APK جدید را نصب کنید. آپدیتهای بعد از آن، تمیز روی هم نصب می‌شوند.

اگر روزی کی‌استور گم شد، با این فرمان دوباره ساخته می‌شود (اما امضای قبلی‌ها دیگر با آن نصب نمی‌شوند — فقط یک‌بار اجرا کنید و خروجی را commit کنید):

```bash
node scripts/gen-debug-keystore.mjs --force
```

---

## انتشار در گوگل‌پلی

۱. حق توسعه‌دهنده ۲۵ دلار (یک‌بار) در [play.google.com/console](https://play.google.com/console)
۲. ساخت App Bundle: در Android Studio → **Build → Build App Bundle(s)**
۳. آپلود فایل `.aab` در کنسول + پرکردن فرم‌ها + اسکرین‌شات
۴. تغییر `appId` در `capacitor.config.ts` قبل از اولین انتشار (بعد از آن تغییر نکنید)

---

## نکتهٔ امنیتی

پوشهٔ `android` در `.gitignore` است و به GitHub نمی‌رود — فقط روی کامپیوتر شماست. این درست است چون حجم زیادی دارد.
