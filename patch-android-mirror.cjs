#!/usr/bin/env node
/* =====================================================================
   پچ خودکار Gradle برای دسترسی از ایران — نسخهٔ ۳
   ---------------------------------------------------------------------
   سه کار انجام می‌دهد:
     ۱) افزودن چند میرور به مخازن (Aliyun، Huawei، Tsinghua، Amazon، Google)
        در android/build.gradle و android/settings.gradle
     ۲) تنظیم timeout کوتاه در gradle.properties تا میرورِ قطع‌شده سریع رد شود
     ۳) تشخیص خودکار پروکسیِ کلاینت VPN (v2rayN / Clash / Shadowsocks) و
        معرفی آن به Gradle — چون Gradle به‌تنهایی از VPN استفاده نمی‌کند!

   زمان اجرا: بعد از «npx cap add android» و بعد از هر «npx cap sync android»
   فرمان:   node patch-android-mirror.cjs
   امنیت:    فقط فایل‌های داخل پوشهٔ android/ را لمس می‌کند. تکرارش بی‌ضرر است.
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const net = require("net");

const ANDROID = path.join(__dirname, "android");

/* میرورها به ترتیب اولویت از ایران */
const MIRRORS = [
  "maven { url 'https://maven.aliyun.com/repository/public' }",
  "maven { url 'https://maven.aliyun.com/repository/google' }",
  "maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }",
  "maven { url 'https://repo.huaweicloud.com/repository/maven/' }",
  "maven { url 'https://mirrors.tuna.tsinghua.edu.cn/maven/' }",
  "maven { url 'https://maven-central.storage-download.amazonaws.com/maven2/' }",
  "maven { url 'https://maven.google.com/' }",
];

/* پورت‌های رایج پروکسیِ کلاینت‌های VPN در ویندوز */
const PROXY_PORTS = [
  { port: 10809, name: "v2rayN" },
  { port: 7890, name: "Clash / Clash Verge" },
  { port: 7891, name: "Clash (mixed)" },
  { port: 1080, name: "Shadowsocks" },
  { port: 2080, name: "v2ray (alt)" },
  { port: 8118, name: "Privoxy" },
];

const urlOf = (line) => {
  const m = line.match(/url '([^']+)'/);
  return m ? m[1] : "";
};

/** بررسی بازبودن یک پورت محلی (برای تشخیص پروکسی فعال) */
function probePort(port, host = "127.0.0.1", timeout = 350) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host });
    const done = (ok) => {
      try { s.destroy(); } catch { /* ignore */ }
      resolve(ok);
    };
    s.setTimeout(timeout);
    s.once("connect", () => done(true));
    s.once("timeout", () => done(false));
    s.once("error", () => done(false));
  });
}

/* ---------- پچ build.gradle و settings.gradle ---------- */
function patchGradleFile(rel) {
  const file = path.join(ANDROID, rel);
  if (!fs.existsSync(file)) {
    console.log(`⚠️  ${rel} پیدا نشد — اول «npx cap add android» را اجرا کنید.`);
    return false;
  }
  let text = fs.readFileSync(file, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const isSettings = rel.replace(/\\/g, "/").endsWith("settings.gradle");

  /* settings.gradle: اطمینان از وجود pluginManagement و dependencyResolutionManagement */
  if (isSettings) {
    if (!/pluginManagement\s*\{/.test(text)) {
      const block =
        "/* --- patch-android-mirror: مخازن برای دسترسی از ایران --- */" + eol +
        "pluginManagement {" + eol +
        "    repositories {" + eol +
        MIRRORS.map((m) => "        " + m).join(eol) + eol +
        "    }" + eol +
        "}" + eol + eol;
      text = block + text;
      console.log(`✅ ${rel} — بلوک pluginManagement ساخته شد.`);
    }
    if (!/dependencyResolutionManagement\s*\{/.test(text)) {
      /* بدون repositoriesMode → حالت پیش‌فرض که با مخازنِ سطح پروژه تداخل نمی‌کند */
      const block =
        eol + "/* --- patch-android-mirror: مخازن runtime برای دسترسی از ایران --- */" + eol +
        "dependencyResolutionManagement {" + eol +
        "    repositories {" + eol +
        MIRRORS.map((m) => "        " + m).join(eol) + eol +
        "    }" + eol +
        "}" + eol;
      /* بعد از بلوک pluginManagement درج شود (ترتیب Gradle) */
      const pmEnd = text.indexOf("}");
      text = pmEnd >= 0
        ? text.slice(0, pmEnd + 1) + block + text.slice(pmEnd + 1)
        : block + text;
      console.log(`✅ ${rel} — بلوک dependencyResolutionManagement اضافه شد.`);
    }
  }

  /* افزودن میرورهای جاافتاده قبل از هر google() */
  const missing = MIRRORS.filter((m) => !text.includes(urlOf(m)));
  if (missing.length === 0) {
    fs.writeFileSync(file, text, "utf8");
    console.log(`✅ ${rel} — همهٔ میرورها از قبل هست.`);
    return true;
  }
  const lines = text.split(/\r?\n/);
  const out = [];
  let blocks = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t === "google()" || t === "google(){" || /^google\s*\(/.test(t)) {
      const indent = line.slice(0, line.length - line.trimStart().length);
      for (const m of missing) out.push(indent + m);
      blocks++;
    }
    out.push(line);
  }
  if (blocks === 0 && !isSettings) {
    console.log(`⚠️  در ${rel} بلوک google() پیدا نشد.`);
    return false;
  }
  fs.writeFileSync(file, out.join(eol), "utf8");
  if (blocks > 0) console.log(`✅ ${rel} — ${missing.length} میرور به ${blocks} بلوک اضافه شد.`);
  return true;
}

/* ---------- پچ gradle.properties: timeout + پروکسی ---------- */
async function patchProps() {
  const file = path.join(ANDROID, "gradle.properties");
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";

  /* timeout کوتاه — فقط یک‌بار */
  if (!text.includes("internal.http.connectionTimeout")) {
    text += eol +
      "# --- patch-android-mirror: رد شدن سریع از میرورهای قطع‌شده ---" + eol +
      "systemProp.org.gradle.internal.http.connectionTimeout=8000" + eol +
      "systemProp.org.gradle.internal.http.socketTimeout=15000" + eol;
    console.log("✅ gradle.properties — timeout سریع اضافه شد.");
  }

  /* بلوک پروکسیِ قبلی را پاک کن تا تکراری نشود */
  text = text.replace(
    /\r?\n?# --- fp-patch-proxy BEGIN ---[\s\S]*?# --- fp-patch-proxy END ---\r?\n?/g,
    ""
  );

  /* تصمیم دربارهٔ پروکسی */
  let proxy = process.env.FP_PROXY || "";
  let proxySource = "متغیر محیطی FP_PROXY";

  if (process.env.FP_PROXY === "off") {
    proxy = "";
    console.log("🔓 پروکسی به درخواست شما (FP_PROXY=off) حذف شد.");
  } else if (!proxy) {
    /* تشخیص خودکار پروکسی فعال */
    for (const { port, name } of PROXY_PORTS) {
      if (await probePort(port)) {
        proxy = `127.0.0.1:${port}`;
        proxySource = `تشخیص خودکار (${name})`;
        break;
      }
    }
  }

  if (proxy) {
    const parts = proxy.split(":");
    const host = parts[0] || "127.0.0.1";
    const port = parts[1] || "10809";
    text += eol +
      "# --- fp-patch-proxy BEGIN ---" + eol +
      `# پروکسی VPN (${proxySource}) — Gradle به‌تنهایی از VPN استفاده نمی‌کند` + eol +
      `systemProp.http.proxyHost=${host}` + eol +
      `systemProp.http.proxyPort=${port}` + eol +
      `systemProp.https.proxyHost=${host}` + eol +
      `systemProp.https.proxyPort=${port}` + eol +
      "systemProp.http.nonProxyHosts=localhost|127.0.0.1" + eol +
      "# --- fp-patch-proxy END ---" + eol;
    console.log(`✅ gradle.properties — پروکسی ${host}:${port} معرفی شد (${proxySource}).`);
  } else {
    console.log("ℹ️  پروکسی فعالی پیدا نشد. اگر VPN دارید ولی خطا گرفتید:");
    console.log("   set FP_PROXY=127.0.0.1:10809 && node patch-android-mirror.cjs");
  }

  fs.writeFileSync(file, text, "utf8");
  return true;
}

/* ---------- اجرا ---------- */
(async () => {
  console.log("🔧 پچ Gradle برای اینترنت ایران (نسخهٔ ۳)");
  console.log("────────────────────────────────────────────────────");
  const ok1 = patchGradleFile(path.join("build.gradle"));
  const ok2 = patchGradleFile(path.join("settings.gradle"));
  const ok3 = await patchProps();
  console.log("────────────────────────────────────────────────────");
  if (ok1 && ok2 && ok3) {
    console.log("🎉 پچ کامل شد. حالا در Android Studio بزنید:");
    console.log("   File → Sync Project with Gradle Files");
    console.log("💡 اگر باز هم خطای دانلود گرفتید، VPN را روشن کنید و دوباره این اسکریپت را اجرا کنید.");
  } else {
    console.log("❌ پچ کامل نشد — پیام‌های بالا را بررسی کنید.");
    process.exitCode = 1;
  }
})();
