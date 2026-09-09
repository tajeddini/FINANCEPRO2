/* ═══════════════════════════════════════════════════════════
   ساخت کی‌استور دیباگ ثابت برای فایننس‌پرو
   ═══════════════════════════════════════════════════════════
   چرا؟ کی‌استور دیباگ پیش‌فرض Gradle در هر اجرای CI از نو ساخته
   می‌شود (کلید تصادفی) → هر APK امضای متفاوتی دارد → نصبِ آپدیت
   روی نسخهٔ قبلی با خطای «package conflicts» شکست می‌خورد.

   راه‌حل: یک کی‌استور ثابت (اینجا ساخته می‌شود و در ریپازیتوری
   commit می‌شود) که همهٔ بیلدهای CI و لوکال از آن استفاده کنند.

   خروجی:
     keys/debug.keystore.p12   ← فایل باینری (commit شود)
     keys/debug.keystore.b64   ← نسخهٔ متنی Base64 (برای مرجع/CI)

   مشخصات (مشابه کی‌استور استاندارد اندروید):
     storeType : PKCS12
     alias     : androiddebugkey
     password  : android
     اعتبار    : ۱۰۰ سال

   اجرا:  node scripts/gen-debug-keystore.mjs
   ⚠️ این اسکریپت فقط برای دیباگ است — برای انتشار در گوگل‌پلی
      از کلید upload/app signing جداگانه استفاده می‌شود. */
import forge from "node-forge";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const keysDir = join(root, "keys");
const p12Path = join(keysDir, "debug.keystore.p12");
const b64Path = join(keysDir, "debug.keystore.b64");

if (existsSync(p12Path) && !process.argv.includes("--force")) {
  console.log("✅ keys/debug.keystore.p12 از قبل موجود است — چیزی ساخته نشد.");
  console.log("   (برای ساخت دوباره: node scripts/gen-debug-keystore.mjs --force)");
  process.exit(0);
}

console.log("🔑 در حال ساخت جفت‌کلید RSA-2048 …");
const keys = forge.pki.rsa.generateKeyPair(2048);

console.log("📜 در حال ساخت گواهی خودامضا (۱۰۰ سال اعتبار) …");
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = "01";
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 100);

const attrs = [
  { name: "commonName", value: "Android Debug" },
  { name: "organizationName", value: "FinancePro" },
  { shortName: "OU", value: "Debug" },
  { name: "countryName", value: "IR" },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());

console.log("📦 در حال بسته‌بندی PKCS12 …");
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "android", {
  algorithm: "3des",
  friendlyName: "androiddebugkey",
});
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

mkdirSync(keysDir, { recursive: true });
writeFileSync(p12Path, Buffer.from(p12Der, "binary"));

const b64 = Buffer.from(p12Der, "binary").toString("base64");
writeFileSync(b64Path, b64, "utf8");

console.log("");
console.log("✅ ساخته شد:");
console.log("   keys/debug.keystore.p12  (فایل باینری — commit کنید)");
console.log("   keys/debug.keystore.b64  (نسخهٔ Base64 برای مرجع)");
console.log("");
console.log("   alias: androiddebugkey | password: android | storeType: PKCS12");
