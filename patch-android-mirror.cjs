#!/usr/bin/env node
/* =====================================================================
   پچ خودکار مخازن Gradle برای دسترسی از ایران (میرور Aliyun)
   ---------------------------------------------------------------------
   مشکل: سرورهای dl.google.com و maven central از ایران قابل دسترسی
   کامل نیستند و Gradle Sync با خطای «Could not resolve all artifacts»
   شکست می‌خورد (مثلاً com.android.tools.build:gradle).

   راه‌حل: این اسکریپت خطوط میرور Aliyun را به repositoriesهای
   android/build.gradle و android/settings.gradle اضافه می‌کند.

   زمان اجرا:
     ۱) بعد از `npx cap add android` (بار اول)
     ۲) بعد از هر `npx cap sync android` (چون sync ممکن است فایل‌ها
        را بازنویسی کند)

   فرمان:
     node patch-android-mirror.cjs

   امنیت: این اسکریپت فقط دو فایل داخل پوشهٔ android/ را لمس می‌کند
   (پوشه‌ای که در .gitignore است و به GitHub/Vercel نمی‌رود).
   اگر فایل‌ها قبلاً پچ شده باشند، هیچ تغییری نمی‌دهد (idempotent).
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const ANDROID = path.join(__dirname, "android");

/* میرورهای Aliyun — همهٔ آرته‌فکت‌های google/mavenCentral/gradlePlugin را دارند */
const MIRRORS = [
  "maven { url 'https://maven.aliyun.com/repository/google' }",
  "maven { url 'https://maven.aliyun.com/repository/public' }",
  "maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }",
];

/**
 * خطوط میرور را درست قبل از هر خط `google()` داخل بلوک‌های repositories
 * درج می‌کند (با همان تورفتگی). اگر فایل قبلاً پچ شده باشد، دست نمی‌زند.
 */
function patchFile(rel) {
  const file = path.join(ANDROID, rel);
  if (!fs.existsSync(file)) {
    console.log(`⚠️  ${rel} پیدا نشد — اول فرمان «npx cap add android» را اجرا کنید.`);
    return false;
  }
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("maven.aliyun.com")) {
    console.log(`✅ ${rel} — قبلاً پچ شده؛ تغییری لازم نیست.`);
    return true;
  }
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const out = [];
  let patched = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "google()") {
      const indent = line.slice(0, line.length - line.trimStart().length);
      for (const m of MIRRORS) out.push(indent + m);
      patched++;
    }
    out.push(line);
  }
  if (patched === 0) {
    console.log(`⚠️  در ${rel} بلوک repositories با google() پیدا نشد — فایل را دستی بررسی کنید.`);
    return false;
  }
  fs.writeFileSync(file, out.join(eol), "utf8");
  console.log(`✅ ${rel} — ${patched} بلوک repositories پچ شد (میرور Aliyun اضافه شد).`);
  return true;
}

console.log("🔧 پچ مخازن Gradle برای اینترنت ایران (میرور Aliyun)");
console.log("────────────────────────────────────────────────────");
const ok1 = patchFile(path.join("build.gradle"));
const ok2 = patchFile(path.join("settings.gradle"));
console.log("────────────────────────────────────────────────────");
if (ok1 && ok2) {
  console.log("🎉 پچ کامل شد. حالا در Android Studio بزنید:");
  console.log("   File → Sync Project with Gradle Files");
  console.log("   (بار اول چند دقیقه طول می‌کشد — دانلود از Aliyun)");
} else {
  console.log("❌ پچ کامل نشد — پیام‌های بالا را بررسی کنید.");
  process.exitCode = 1;
}
