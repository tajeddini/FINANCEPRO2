# 🤖 راهنمای راه‌اندازی ربات تلگرام روی VPS

این ربات، **دفترکل مشترک** با سایت است: هر تراکنشی که از تلگرام ثبت کنی، در سایت (و برعکس) دیده می‌شود. چون هر دو به یک جدول `financepro_state` در Supabase وصل‌اند.

ربات **هیچ وابستگی npm ندارد** — فقط Node.js نسخهٔ ۱۸ به بالا لازم است و با `fetch` داخلی کار می‌کند. برای VPS رایگان شما (ARM64 / 2GB RAM / 500MB SSD) کاملاً مناسب است.

---

## پیش‌نیازها

قبل از شروع، این سه چیز را آماده کن:

| مورد | از کجا |
|---|---|
| `BOT_TOKEN` | از [@BotFather](https://t.me/BotFather) — فرمان `/newbot` |
| `SUPABASE_URL` | داشبورد Supabase → Settings → API → Project URL |
| `SUPABASE_KEY` | همان‌جا → کلید `anon` |

> ⚠️ کلید `anon` را استفاده کن، **نه** `service_role`.

---

## ۱) وصل شدن به VPS با SSH

```bash
ssh root@<آی‌پی-سرور>
```

(آی‌پی و رمز را از پنل WPSwala بگیر.)

---

## ۲) نصب Node.js (نسخهٔ ARM64)

چون سرور ARM64 است و فقط ۵۰۰ مگابایت جا دارد، نسخهٔ سبک را نصب می‌کنیم:

```bash
# اگر curl نیست:
apt update && apt install -y curl

# نصب Node 20 از NodeSource (معماری ARM را خودکار تشخیص می‌دهد)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# بررسی
node -v    # باید v20.x باشد
```

---

## ۳) انتقال کد ربات به سرور

فقط پوشهٔ `bot` لازم است. دو راه داری:

**راه آسان (اگر git روی سرور هست):**
```bash
apt install -y git
git clone https://github.com/tajeddini/FINANCEPRO2.git
cd FINANCEPRO2/bot
```

**راه دستی:** فایل `bot.js` و `package.json` را با `scp` از کامپیوتر خودت بفرست:
```bash
# روی کامپیوتر خودت:
scp bot/bot.js bot/package.json root@<آی‌پی-سرور>:/root/bot/
```

---

## ۴) تنظیم متغیرهای محیطی

یک فایل `.env` نساز؛ مستقیم متغیرها را موقع اجرا بده (یا در systemd بگذار — بخش ۶). برای تست سریع:

```bash
cd /root/bot
export BOT_TOKEN="123456:ABC..."
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_KEY="eyJhbGci..."
```

---

## ۵) تست اجرا

```bash
node bot.js
```

باید ببینی:
```
✅ ربات @YourBotName در حال اجراست…
```

حالا در تلگرام برو پیش ربات و `/start` بزن، **نام کاربری سایت** را بفرست، بعد یکی از این‌ها را امتحان کن:
- `موجودی`
- فوروارد کردن یک پیامک بانکی

اگر درست کار کرد، `Ctrl+C` بزن و برو مرحلهٔ بعد تا همیشه‌روشن شود.

---

## ۶) همیشه‌روشن نگه‌داشتن با systemd (بدون pm2)

چون جا کم است، از `pm2` استفاده **نمی‌کنیم**؛ `systemd` داخل خود لینوکس است و رایگان.

یک فایل سرویس بساز:

```bash
nano /etc/systemd/system/financepro-bot.service
```

این محتوا را داخلش بگذار (مقادیر `Environment` را با مال خودت پر کن):

```ini
[Unit]
Description=FinancePro Telegram Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/bot
ExecStart=/usr/bin/node bot.js
Restart=always
RestartSec=5
Environment=BOT_TOKEN=123456:ABC...
Environment=SUPABASE_URL=https://xxxx.supabase.co
Environment=SUPABASE_KEY=eyJhbGci...

[Install]
WantedBy=multi-user.target
```

ذخیره کن (`Ctrl+X` بعد `Y` بعد `Enter`) و فعالش کن:

```bash
systemctl daemon-reload
systemctl enable financepro-bot     # با روشن‌شدن سرور، خودکار اجرا شود
systemctl start financepro-bot      # همین حالا اجرا کن

systemctl status financepro-bot     # بررسی وضعیت (باید active باشد)
journalctl -u financepro-bot -f     # دیدن لاگ‌ها به‌صورت زنده
```

حالا حتی اگر سرور ریستارت شود، ربات خودکار بالا می‌آید. ✅

---

## فرمان‌های ربات

| فرمان | کار |
|---|---|
| `/start` | اتصال — نام کاربری سایت را می‌پرسد |
| `/help` | راهنما |
| `موجودی` | مجموع موجودی حساب‌ها |
| `امروز` | خرج و درآمد امروز |
| `گزارش` | موجودی کل + ۵ تراکنش آخر |
| فوروارد پیامک بانک | تشخیص خودکار مبلغ/نوع/تاریخ و ثبت |
| `ثبت: اسنپ ۵۰۰۰۰` | ثبت دستی سریع |

---

## عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| `BOT_TOKEN تنظیم نشده` | متغیرهای محیطی را چک کن |
| ربات جواب نمی‌دهد | `journalctl -u financepro-bot -f` را ببین |
| `Supabase 401` | کلید `SUPABASE_KEY` اشتباه است |
| `داده‌ای در ابر پیدا نشد` | اول در **سایت** یک‌بار سینک کن تا داده‌ات در ابر باشد |
| پیامک تشخیص داده نشد | پارسر، فرمت ملی/ملت/رسالت را می‌شناسد؛ پیام را کامل فوروارد کن |

---

## نکتهٔ امنیتی

- ربات، نگاشت «chatId تلگرام → نام کاربری» را در فایل `bot/bot-state.json` روی سرور نگه می‌دارد (داخل git نمی‌رود).
- چون VPS شما بکاپ ندارد، اگر سرور پاک شود فقط همین فایل اتصال از دست می‌رود و باید دوباره `/start` بزنی — **داده‌های مالی‌ات در Supabase امن‌اند**.
