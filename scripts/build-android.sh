#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  فایننس‌پرو — ساخت و سینک اپ اندروید (یک‌کلیکی، لینوکس/مک)
# ═══════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/.."

if [ ! -f "android/build.gradle" ]; then
  echo ""
  echo "[1/4] ساخت پروژهٔ اندروید (فقط بار اول — چند دقیقه) ..."
  npx cap add android
else
  echo ""
  echo "[1/4] پروژهٔ اندروید موجود است — از ساخت دوباره رد شد"
fi

echo ""
echo "[2/4] پچ میرور Gradle برای اینترنت ایران (Aliyun) ..."
node patch-android-mirror.cjs

echo ""
echo "[3/4] بیلد سایت (Vite) ..."
npm run build

echo ""
echo "[4/4] سینک سایت داخل اپ اندروید ..."
npx cap sync android
node patch-android-mirror.cjs >/dev/null

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " ✅ آماده است! حالا بزن:  npx cap open android"
echo "═══════════════════════════════════════════════════════════"
