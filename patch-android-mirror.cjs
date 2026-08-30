#!/usr/bin/env node
/* =====================================================================
   پچ خودکار مخازن Gradle برای دسترسی از ایران
   ---------------------------------------------------------------------
   مشکل: سرورهای dl.google.com / maven central از ایران قابل دسترسی کامل
   نیستند و Gradle Sync با خطای «Could not resolve all artifacts» یا
   «Read timed out» شکست می‌خورد.

   راه‌حل این اسکریپت (چندلایه):
     ۱) افزودن چند میرور به repositories — Aliyun، Huawei (تجمیعی شامل
        google/central/gradle-plugin) و Amazon (میرور maven central).
        Gradle به‌ترتیب امتحان می‌کند تا یکی جواب بدهد.
     ۲) timeouts کوتاه در gradle.properties تا میرورِ قطع‌شده سریع رد شود
        و به بعدی برسد (به‌جای معطلی طولانی).
     ۳) پشتیبانی از VPN: اگر متغیر محیطی FP_PROXY تنظیم شود، پراکسی به
        gradle.properties اضافه می‌شود (تضمینی‌ترین راه از ایران).

   زمان اجرا: بعد از «npx cap add android» و بعد از هر «npx cap sync android»

   فرمان:
     node patch-android-mirror.cjs
   با VPN (پورت پراکسی محلیِ کلاینت خود — v2rayN معمولاً 10809 و Clash 7890):
     set FP_PROXY=127.0.0.1:10809 && node patch-android-mirror.cjs

   امنیت: فقط فایل‌های داخل پوشهٔ android/ را لمس می‌کند (پوشه‌ای که در
   .gitignore است و به GitHub/Vercel نمی‌رود). تکرارش بی‌ضرر است.
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const ANDROID = path.join(__dirname, "android");

/* میرورها به ترتیب اولویت — اگر یکی قطع بود، Gradle بعدی را امتحان می‌کند.
   Huawei اول است چون از ایران معمولاً پایدارتر از Aliyun است. */
const MIRRORS = [
  /* تجمیعی Huawei — google + central + gradle-plugin را یکجا دارد (پایدار از ایران) */
  "maven { url 'https://repo.huaweicloud.com/repository/maven/' }",
  "maven { url 'https://maven.aliyun.com/repository/google' }",
  "maven { url 'https://maven.aliyun.com/repository/public' }",
  "maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }",
  /* سرور مستقیم گوگل — گاهی باز است */
  "maven { url 'https://maven.google.com/' }",
  /* میرور maven central روی Amazon */
  "maven { url 'https://maven-central.storage-download.amazonaws.com/maven2/' }",
];

const urlOf = (line) => {
  const m = line.match(/url '([^']+)'/);
  return m ? m[1] : "";
};

/**
 * جلوی هر «google repository» در بلوک‌های repositories، میرورهای جدید را
 * اضافه می‌کند. هر سه قالب رایج را می‌شناسد:
 *   ۱) google()                       ← قالب قدیمی/ساده
 *   ۲) google { content { ... } }     ← قالب جدید Android Studio (Quail و بعد)
 *   ۳) settings.gradle بدون google    ← بلوک pluginManagement به ابتدای فایل
 * تکراری وارد نمی‌کند.
 */
function patchGradleFile(rel) {
  const file = path.join(ANDROID, rel);
  if (!fs.existsSync(file)) {
    console.log(`⚠️  ${rel} پیدا نشد — اول فرمان «npx cap add android» را اجرا کنید.`);
    return false;
  }
  const text = fs.readFileSync(file, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const missing = MIRRORS.filter((m) => !text.includes(urlOf(m)));
  if (missing.length === 0) {
    console.log(`✅ ${rel} — همهٔ میرورها از قبل هست؛ تغییری لازم نیست.`);
    return true;
  }
  const lines = text.split(/\r?\n/);
  const out = [];
  let blocks = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    /* شناسایی google repository در هر سه قالب */
    const isGoogleRepo =
      trimmed === "google()" ||
      trimmed === "google(){" ||
      trimmed === "google {" ||
      /^google\s*\(/.test(trimmed) ||
      /^google\s*\{/.test(trimmed);
    if (isGoogleRepo) {
      const indent = line.slice(0, line.length - line.trimStart().length);
      for (const m of missing) out.push(indent + m);
      blocks++;
    }
    out.push(line);
  }

  /* قالب جدید settings.gradle که اصلاً google ندارد → بلوک pluginManagement می‌سازیم */
  const isSettings = rel.replace(/\\/g, "/").endsWith("settings.gradle");
  if (blocks === 0 && isSettings && !text.includes("pluginManagement")) {
    const block =
      "/* --- patch-android-mirror: مخازن برای دسترسی از ایران --- */" + eol +
      "pluginManagement {" + eol +
      "    repositories {" + eol +
      MIRRORS.map((m) => "        " + m).join(eol) + eol +
      "    }" + eol +
      "}" + eol + eol;
    fs.writeFileSync(file, block + text, "utf8");
    console.log(`✅ ${rel} — قالب جدید است؛ بلوک pluginManagement با ${MIRRORS.length} میرور به ابتدای فایل اضافه شد.`);
    return true;
  }

  if (blocks === 0) {
    console.log(`⚠️  در ${rel} بلوک repositories گوگل پیدا نشد — محتوای فایل را برای بررسی بفرستید.`);
    return false;
  }
  fs.writeFileSync(file, out.join(eol), "utf8");
  console.log(`✅ ${rel} — ${missing.length} میرور جدید به ${blocks} بلوک اضافه شد.`);
  return true;
}

/**
 * gradle.properties:
   ۱) timeout کوتاه → میرور قطع‌شده سریع رد می‌شود
   ۲) پراکسی VPN (اگر FP_PROXY تنظیم شده باشد)
 */
function patchProps() {
  const file = path.join(ANDROID, "gradle.properties");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const add = [];

  if (!text.includes("internal.http.connectionTimeout")) {
    add.push("");
    add.push("# --- patch-android-mirror: رد شدن سریع از میرورهای قطع‌شده ---");
    add.push("systemProp.org.gradle.internal.http.connectionTimeout=8000");
    add.push("systemProp.org.gradle.internal.http.socketTimeout=15000");
  }

  const proxy = process.env.FP_PROXY;
  if (proxy && !text.includes("https.proxyHost")) {
    const parts = proxy.split(":");
    const host = parts[0] || "127.0.0.1";
    const port = parts[1] || "10809";
    add.push("");
    add.push(`# --- patch-android-mirror: پراکسی VPN (${host}:${port}) ---`);
    add.push(`systemProp.http.proxyHost=${host}`);
    add.push(`systemProp.http.proxyPort=${port}`);
    add.push(`systemProp.https.proxyHost=${host}`);
    add.push(`systemProp.https.proxyPort=${port}`);
  }

  if (add.length === 0) {
    console.log("✅ gradle.properties — از قبل تنظیم شده؛ تغییری لازم نیست.");
    return true;
  }
  fs.appendFileSync(file, add.join(eol) + eol, "utf8");
  console.log(`✅ gradle.properties —${proxy ? " پراکسی VPN +" : ""} timeout سریع اضافه شد.`);
  return true;
}

console.log("🔧 پچ مخازن Gradle برای اینترنت ایران");
console.log("────────────────────────────────────────────────────");
const ok1 = patchGradleFile(path.join("build.gradle"));
const ok2 = patchGradleFile(path.join("settings.gradle"));
const ok3 = patchProps();
console.log("────────────────────────────────────────────────────");
if (ok1 && ok2 && ok3) {
  console.log("🎉 پچ کامل شد. حالا در Android Studio بزنید:");
  console.log("   File → Sync Project with Gradle Files");
  if (!process.env.FP_PROXY) {
    console.log("   (اگر باز هم timeout گرفتید → VPN را روشن کنید و:");
    console.log("    set FP_PROXY=127.0.0.1:10809 && node patch-android-mirror.cjs)");
  }
} else {
  console.log("❌ پچ کامل نشد — پیام‌های بالا را بررسی کنید.");
  process.exitCode = 1;
}
