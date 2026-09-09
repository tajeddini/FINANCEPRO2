@echo off
REM ═══════════════════════════════════════════════════════════
REM  فایننس‌پرو — ساخت و سینک اپ اندروید (یک‌کلیکی، ویندوز)
REM ═══════════════════════════════════════════════════════════
chcp 65001 >nul
cd /d "%~dp0\.."

echo.
if not exist "android\build.gradle" (
  echo [1/4] ساخت پروژهٔ اندروید (فقط بار اول — چند دقیقه) ...
  call npx cap add android
  if errorlevel 1 goto :fail
) else (
  echo [1/4] پروژهٔ اندروید موجود است — از ساخت دوباره رد شد
)

echo.
echo [2/4] پچ میرور Gradle برای اینترنت ایران ...
node patch-android-mirror.cjs

echo.
echo [3/4] بیلد سایت (Vite) ...
call npm run build
if errorlevel 1 goto :fail

echo.
echo [4/4] سینک سایت داخل اپ اندروید ...
call npx cap sync android
if errorlevel 1 goto :fail
node patch-android-mirror.cjs >nul

REM امضای دیباگ ثابت — همان کلید CI تا APK لوکال و CI هم‌امضا باشند
if exist "keys\debug.keystore.p12" (
  findstr /C:"keys/debug-signing.gradle" "android\app\build.gradle" >nul 2>&1
  if errorlevel 1 (
    echo apply from: '%cd%\keys\debug-signing.gradle'>> "android\app\build.gradle"
    echo ✅ امضای دیباگ ثابت اعمال شد.
  )
)

echo.
echo ═══════════════════════════════════════════════════════════
echo  آماده است! حالا بزن:  npx cap open android
echo  بعد در Android Studio:  Build -^> Build APK(s)
echo ═══════════════════════════════════════════════════════════
pause
exit /b 0

:fail
echo.
echo ❌ خطا رخ داد — پیام‌های بالا را بررسی کنید.
pause
exit /b 1
