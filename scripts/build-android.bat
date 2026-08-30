@echo off
chcp 65001 >nul
REM ═══════════════════════════════════════════════════════════
REM  فایننس‌پرو — ساخت و سینک اپ اندروید (یک‌کلیکی، ویندوز)
REM  بار اول: پروژهٔ اندروید را می‌سازد + میرور ایران را پچ می‌کند
REM  دفعه‌های بعد: فقط بیلد سایت و سینک داخل اپ
REM ═══════════════════════════════════════════════════════════
cd /d "%~dp0.."

if not exist "android\build.gradle" (
  echo.
  echo [1/5] ساخت پروژهٔ اندروید (فقط بار اول — چند دقیقه) ...
  echo ────────────────────────────────────────────────
  call npx cap add android
  if errorlevel 1 goto :error
) else (
  echo.
  echo [1/5] پروژهٔ اندروید موجود است — از ساخت دوباره رد شد
)

echo.
echo [2/5] پچ میرور Gradle برای اینترنت ایران (Aliyun) ...
echo ────────────────────────────────────────────────
node patch-android-mirror.cjs

echo.
echo [3/5] بیلد سایت (Vite) ...
echo ────────────────────────────────────────────────
call npm run build
if errorlevel 1 goto :error

echo.
echo [4/5] سینک سایت داخل اپ اندروید ...
echo ────────────────────────────────────────────────
call npx cap sync android
if errorlevel 1 goto :error

echo.
echo [5/5] پچ مجدد میرور (برای اطمینان بعد از سینک) ...
node patch-android-mirror.cjs >nul

echo.
echo ═══════════════════════════════════════════════════════════
echo  ✅ آماده است!
echo.
echo  حالا برای باز کردن در Android Studio بزن:
echo      npx cap open android
echo.
echo  (بار اول: Trust Project بزن و ۵ تا ۱۵ دقیقه صبر کن تا
echo   Gradle Sync سبز شود — بارهای بعد چند ثانیه است)
echo ═══════════════════════════════════════════════════════════
pause
goto :eof

:error
echo.
echo  ❌ خطا رخ داد — متن قرمز بالا را بخوان و در CAPACITOR-GUIDE.md
echo     بخش «عیب‌یابی» را ببین.
pause
exit /b 1
