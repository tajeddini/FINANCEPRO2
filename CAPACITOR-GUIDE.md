# 📱 راهنمای ساخت اپ اندروید فایننس‌پرو با Capacitor

> این راهنما سایت شما را به یک **اپلیکیشن واقعی اندروید (APK)** تبدیل می‌کند.
> کامپیوتر فقط برای **ساختن** لازم است؛ بعد از ساخت، اپ روی گوشی مستقل کار می‌کند.

---

## 🎯 قبل از شروع — چه چیزهایی آماده است؟

| مورد | وضعیت |
|---|---|
| فایل `capacitor.config.ts` (سازگار با Capacitor 8) | ✅ ساخته شده |
| پکیج‌های `@capacitor/core` و `@capacitor/cli` (v8) | ✅ نصب شده |
| پکیج `@capacitor/android` + `splash-screen` + `status-bar` (v8) | ✅ نصب شده |
| **اسکریپت یک‌کلیکی `scripts/build-android.bat`** | ✅ ساخته شد — همهٔ مراحل را خودش می‌رود |
| `assets/icon.svg` (آیکون برند اپ) | ✅ ساخته شده |
| `.gitignore` برای پوشهٔ `android` | ✅ تنظیم شده |
| Android Studio روی کامپیوتر شما (Quail 3 Patch 1) | ✅ نصب شده |
| Android SDK | ✅ دانلود شده |
| کد سایت | ✅ بدون تغییر — همان است |

> 🔑 **کل فرآیند در یک فرمان:** فایل `scripts/build-android.bat` را (در ویندوز با دوبار کلیک، یا در ترمینال) اجرا کنید — بقیهٔ این راهنما توضیحِ همان کارهایی است که اسکریپت انجام می‌دهد.

---

## ۱) پیش‌نیازها (روی کامپیوتر)

به این سه چیز نیاز دارید:

### الف) Node.js نسخهٔ ۱۸ یا بالاتر
از [nodejs.org](https://nodejs.org) نسخهٔ **LTS** را نصب کنید. بعد در ترمینال چک کنید:
```bash
node -v
```

### ب) Java JDK نسخهٔ ۱۷
Android Studio خودش JDK لازم را می‌آورد، پس معمولاً جدا نصب نکنید.

### ج) Android Studio (نسخهٔ Quail یا جدیدتر)
۱. از [developer.android.com/studio](https://developer.android.com/studio) دانلود و نصب کنید (حدود ۱ گیگابایت).
۲. بار اول که باز می‌کنید، **Setup Wizard** را کامل بروید تا **Android SDK** و **SDK Platform-Tools** نصب شود (حدود ۳ گیگابایت دیگر).
۳. صبر کنید تا «SDK Manager» خودش به‌روز شود.

> 💾 **نکتهٔ مهم:** Android Studio حدود ۴ گیگابایت جا می‌گیرد. چون VPS شما فقط ۵۰۰ مگابایت است، این کار را **روی کامپیوتر خودتان** انجام دهید، نه VPS.

### ⚠️ اگر اینترنت ایران مشکل دارد (خطای Gradle Sync)
سرورهای `dl.google.com` از ایران گاهی مسدودند. راه‌حل: اسکریپت آمادهٔ پروژه را اجرا کنید — بعد از `npx cap add android`:
```bash
node patch-android-mirror.cjs
```
این اسکریپت میرورهای Aliyun را به `android/build.gradle` و `android/settings.gradle` اضافه می‌کند (فقط بار اول یا بعد از هر `cap sync` که فایل‌ها را بازنویسی کند).

---

## ۲) ساخت اولین APK — گام‌به‌گام

در ترمینال VS Code، داخل پوشهٔ پروژه، این فرمان‌ها را **به‌ترتیب** بزنید:

### گام ۱ — بیلد گرفتن از سایت
```bash
npm run build
```
این پوشهٔ `dist` را می‌سازد (همان که Vercel استفاده می‌کند).

### گام ۲ — افزودن پلتفرم اندروید (فقط بار اول)
```bash
npx cap add android
```
این پوشهٔ `android` را می‌سازد. ⚠️ این پوشه در `.gitignore` است و به GitHub نمی‌رود.

### گام ۳ — پچ میرور (برای اینترنت ایران)
```bash
node patch-android-mirror.cjs
```

### گام ۴ — کپی سایت داخل پروژهٔ اندروید
```bash
npx cap sync android
```
این فایل‌های `dist` را داخل `android` کپی می‌کند. **هر بار که کد سایت را عوض کردید، دوباره `npm run build` و سپس `npx cap sync android` بزنید.**

### گام ۵ — باز کردن در Android Studio
```bash
npx cap open android
```
پنجرهٔ Android Studio باز می‌شود و شروع به بیلد می‌کند (بار اول چند دقیقه طول می‌کشد).
- پیام **«Trust Project»** آمد → حتماً **Trust Project** را بزنید.
- صبر کنید تا **Gradle Sync** سبز شود (بار اول ۵ تا ۱۵ دقیقه).

### گام ۶ — ساخت APK
در Android Studio از منوی بالا (یا منوی ☰ در رابط جدید):
**Build → Build App Bundle(s) / APK(s) → Build APK(s)**

صبر کنید تا تمام شود. بعد روی لینک «locate» در اعلان کلیک کنید. فایل شما اینجاست:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

🎉 **این همان فایل اپ شماست!**

---

## ۳) آیکون اپ (به‌جای آیکون پیش‌فرض)

فایل `assets/icon.svg` آیکون برند فایننس‌پرو است (زمردی + نمودار طلایی). یک نسخهٔ PNG آمادهٔ ۱۰۲۴×۱۰۲۴ هم ساخته شده که برای Image Asset Studio راحت‌تر است:

> 🖼️ **دانلود آیکون PNG آماده:** [icon-1024.png](https://image.qwenlm.ai/generated-images/dd1c9b3e-dee9-44a5-aa02-c95e0306e9b8/_result.png) — دانلود کنید و در مرحلهٔ زیر استفاده کنید. (اگر لینک منقضی شده بود، همان `assets/icon.svg` را بدهید — قبول می‌شود.)

### روش پیشنهادی (داخل Android Studio):
۱. روی پوشهٔ `res` راست‌کلیک → **New → Image Asset**
۲. در Icon Type گزینهٔ **Launcher Icons (Adaptive)** را انتخاب کنید
۳. در بخش Foreground، آیکون PNG (یا SVG) را انتخاب کنید
۴. Next → Finish — همهٔ سایزهای `mipmap` خودکار ساخته می‌شود

### روش جایگزین (آنلاین):
۱. بروید به [icon.kitchen](https://icon.kitchen) یا [appicon.co](https://appicon.co)
۲. فایل `assets/icon.svg` را آپلود کنید
۳. خروجی **Android (zip)** را دانلود کنید
۴. فایل‌ها را در مسیر `android/app/src/main/res/` جایگزین کنید (پوشه‌های `mipmap-*`)

### روش با Android Studio:
روی پوشهٔ `res` راست‌کلیک → **New → Image Asset** → فایل SVG را انتخاب → Next → Finish

---

## ۴) نصب روی گوشی

### روش آسان — با کابل USB:
۱. روی گوشی، **Developer Options** را فعال کنید (در Settings → About phone، هفت بار روی Build number بزنید).
۲. **USB Debugging** را روشن کنید.
۳. گوشی را با کابل به کامپیوتر وصل کنید.
۴. در Android Studio، گوشی‌تان در لیست دستگاه‌ها ظاهر می‌شود — دکمهٔ سبز ▶ (Run) را بزنید. اپ مستقیم نصب و اجرا می‌شود.

### روش بدون کابل — انتقال APK:
فایل `app-debug.apk` را با تلگرام/واتساپ برای خودتان بفرستید، روی گوشی دانلود و نصب کنید.
> ⚠️ گوشی می‌پرسد «نصب از منابع ناشناس؟» — اجازه بدهید.

### ✅ چک‌لیست تست اولین اجرا
وقتی اپ باز شد، این‌ها را به‌ترتیب امتحان کنید:

| # | تست | نتیجهٔ مورد انتظار |
|---|---|---|
| ۱ | صفحهٔ ورود بالا می‌آید | ✅ با نام و برند فایننس‌پرو |
| ۲ | با **همان نام کاربری و رمز سایت** وارد شوید | ✅ شناخته شوید (از Supabase) |
| ۳ | دکمهٔ سینک ابری در تنظیمات | ✅ سبز — داده‌ها یکسان با سایت |
| ۴ | یک تراکنش در اپ ثبت کنید | ✅ چند ثانیه بعد در سایت هم هست |
| ۵ | اینترنت گوشی را خاموش و اپ را باز کنید | ✅ داده‌ها از حافظهٔ محلی بالا می‌آیند |
| ۶ | اپ را از لیست اخیر ببندید و دوباره باز کنید | ✅ نشست حفظ شده — دوباره ورود نمی‌خواهد |

---

## ۵) قابلیت‌های ویژه (بعد از ساخت اولیه)

این‌ها را **بعد از اینکه اولین APK موفق بود** اضافه می‌کنیم:

### الف) قفل با اثر انگشت 🔐
این تنها قابلیتی است که **فقط** با اپ بومی به‌دست می‌آید. نیاز به پلاگین `capacitor-native-biometric` دارد. ماژول `src/lib/native.ts` از حالا برای این کار آماده است.

### ب) اعلان‌های بومی 🔔
با پلاگین `@capacitor/local-notifications` می‌توان یادآوری قرارها را حتی وقتی اپ بسته است نشان داد.

### ج) بارگذاری از سایت زنده (به‌جای فایل محلی)
در `capacitor.config.ts`، خط `url` را فعال کنید تا اپ همیشه نسخهٔ آنلاین Vercel را لود کند. آن‌وقت برای آپدیت اپ، نیازی به ساخت APK جدید نیست — فقط سایت را دیپلوی کنید!

---

## ۶) انتشار در گوگل‌پلی (اختیاری)

برای انتشار رسمی:
۱. **حساب توسعه‌دهندهٔ گوگل‌پلی** بسازید — **۲۵ دلار، یک‌بار برای همیشه** در [play.google.com/console](https://play.google.com/console).
۲. در Android Studio از **Build → Generate Signed App Bundle** نسخهٔ امضاشده بسازید.
۳. فایل `.aab` را در کنسول گوگل‌پلی آپلود کنید.

> 📌 فعلاً نیازی نیست — اول APK را برای خودتان بسازید و تست کنید.

---

## ۷) عیب‌یابی رایج

| مشکل | راه‌حل |
|---|---|
| `cap: command not found` | پکیج `@capacitor/cli` نصب نیست — `npm install` بزنید |
| صفحهٔ سفید در اپ | اول `npm run build` و بعد `npx cap sync android` بزنید |
| سینک با Supabase کار نمی‌کند | در گوشی اینترنت روشن است؟ در شبیه‌ساز گاهی DNS مشکل دارد — روی گوشی واقعی تست کنید |
| Android Studio بیلد نمی‌شود | از منوی File → Sync Project with Gradle Files را بزنید |
| «SDK not found» | در Android Studio → SDK Manager، حداقل یک Android SDK Platform (مثلاً API 34/35) نصب کنید |
| `Could not resolve all artifacts` — `Could not find com.android.tools.build:gradle:8.13.0` یا `com.google.gms:google-services:4.4.4` (خطای `dl.google.com`) | سرورهای گوگل از ایران مسدودند — `node patch-android-mirror.cjs` بزنید (میرور Aliyun را به build.gradle و settings.gradle اضافه می‌کند) سپس File → Sync Project with Gradle Files. اگر باز هم نشد، VPN کل‌سیستم + تنظیم پروکسی در Settings → HTTP Proxy |
| `compileSdk 35/36 not found` | در SDK Manager تیک API 35 یا 36 را بزنید و Apply کنید |
| لیست SDK خالی است | مسیر SDK را بدهید: `C:\Users\<نام>\AppData\Local\Android\Sdk` |
| `Unsupported class file major version` | در Settings → Build Tools → Gradle، مقدار Gradle JDK را روی `jbr-21` بگذارید |
| بعد از `cap sync` تغییرات سایت را نمی‌بینی | دوباره `npm run build` → `npx cap sync android` → در استودیو File → Sync Project |

---

## ۸) ساختار فایل‌ها بعد از افزودن اندروید

```
financepro/
├── src/                      ← کد سایت (بدون تغییر)
├── dist/                     ← خروجی بیلد (بدون تغییر)
├── capacitor.config.ts       ← ✅ پیکربندی (ساخته شد)
├── patch-android-mirror.cjs  ← ✅ پچ میرور برای اینترنت ایران
├── assets/icon.svg           ← ✅ آیکون برند اپ
├── android/                  ← ⬜ با `npx cap add android` ساخته می‌شود (به GitHub نمی‌رود)
└── CAPACITOR-GUIDE.md        ← ✅ همین راهنما
```

---

## ⚠️ نکات مهم برای اینکه سایت خراب نشود

1. **هیچ‌کدام از این فرمان‌ها سایت آنلاین (Vercel) را تغییر نمی‌دهند.** آن‌ها فقط روی کامپیوتر شما پوشهٔ `android` می‌سازند.
2. پوشهٔ `android` در `.gitignore` است، پس با `git push` به GitHub (و در نتیجه Vercel) نمی‌رود.
3. `capacitor.config.ts` توسط Vite خوانده نمی‌شود (چون `include` tsconfig فقط `src` است)، پس بیلد سایت را تحت‌تأثیر قرار نمی‌دهد.
4. برای آپدیت سایت همچنان از همان فرآیند قبلی (`git push` → Vercel) استفاده کنید — هیچ چیز عوض نشده.

---

## 🚀 خلاصهٔ سریع — دو راه

### راه یک‌کلیکی (پیشنهادی):
```
scripts/build-android.bat      ← دوبار کلیک کنید (یا در ترمینال اجرا کنید)
npx cap open android           ← بعد از اتمام، این را بزنید
# در Android Studio: Build → Build APK(s)
```
اسکریپت خودش تشخیص می‌دهد بار اول است یا نه و همهٔ مراحل (add → پچ میرور → build → sync) را به‌ترتیب می‌رود.

### راه دستی:
```bash
npm run build                  # بیلد سایت
npx cap add android            # فقط بار اول
node patch-android-mirror.cjs  # میرور ایران (هر بار — idempotent است)
npx cap sync android           # کپی سایت داخل اپ
npx cap open android           # باز کردن در Android Studio
# سپس: Build → Build APK(s)
```

---

## 🔄 گردش کار روزانهٔ آپدیت اپ

هر بار که کد سایت را عوض کردید و خواستید APK جدید بسازید:

```
scripts/build-android.bat      ← فقط همین!
# سپس در Android Studio: Build → Build APK(s)
```

---

*همه‌چیز آماده است — `scripts/build-android.bat` را اجرا کنید و اگر جایی خطا دیدید، متنش را بفرستید تا با هم حلش کنیم. 🙂*
