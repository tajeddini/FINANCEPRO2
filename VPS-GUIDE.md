# 🤖 راهنمای ربات تلگرام فایننس‌پرو روی VPS

ربات تلگرام بدون هیچ وابستگی npm است (فقط Node.js ۱۸+) و با دفترکل سایت مشترک است — هر تراکنشی که از تلگرام بزنید، همان لحظه در سایت دیده می‌شود.

---

## پیش‌نیازها

| مورد | توضیح |
|---|---|
| VPS لینوکس با SSH Root | مثل wpswala (ARM64, 2GB RAM کافی است) |
| Node.js نسخه ۱۸+ | روی VPS نصب می‌شود |
| توکن ربات | از BotFather در تلگرام |
| آدرس و کلید anon سوپابیس | از Settings → API پروژه |

---

## گام ۱ — گرفتن توکن ربات

۱. در تلگرام به **@BotFather** پیام دهید.
۲. `/newbot` را بفرستید، نام و نام کاربری ربات را انتخاب کنید.
۳. توکنی شبیه `123456:ABC-DEF...` می‌گیرید — **نگهش دارید**.

## گام ۲ — نصب Node.js روی VPS

با SSH وصل شوید:
```bash
ssh root@<آدرس-IP-سرور>
```

برای ARM64 (سرورهای جدید):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v
```

## گام ۳ — انتقال کد ربات به VPS

پوشهٔ `bot/` را از کامپیوتر به VPS بفرستید:
```bash
scp -r bot/ root@<آدرس-سرور>:/root/financepro-bot/
```

یا اگر کد روی GitHub است:
```bash
cd /root
git clone https://github.com/tajeddini/FINANCEPRO2.git
cd FINANCEPRO2/bot
```

## گام ۴ — تنظیم متغیرهای محیطی

```bash
cd /root/financepro-bot
export BOT_TOKEN="<توکن-ربات>"
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_KEY="<کلید-anon>"
export SUPABASE_SYNC_ID="fp-user-<نام‌کاربری-شما>"
```

> ⚠️ `SUPABASE_SYNC_ID` باید دقیقاً همان `fp-user-<نام‌کاربری>` باشد که در سایت استفاده می‌کنید تا به همان دفترکل وصل شود.

## گام ۵ — اجرای آزمایشی

```bash
node bot.js
```

باید پیام «ربات شروع شد» را ببینید. در تلگرام به ربات `/start` بفرستید.

## گام ۶ — همیشه‌روشن نگه‌داشتن با systemd

چون VPS فضای کمی دارد، از systemd (داخل خود لینوکس) استفاده می‌کنیم، نه pm2.

فایل سرویس را بسازید:
```bash
nano /etc/systemd/system/financepro-bot.service
```

این محتوا را بنویسید:
```ini
[Unit]
Description=FinancePro Telegram Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/financepro-bot
Environment="BOT_TOKEN=<توکن-ربات>"
Environment="SUPABASE_URL=https://xxx.supabase.co"
Environment="SUPABASE_KEY=<کلید-anon>"
Environment="SUPABASE_SYNC_ID=fp-user-<نام‌کاربری>"
ExecStart=/usr/bin/node bot.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

فعال و اجرا کنید:
```bash
systemctl daemon-reload
systemctl enable financepro-bot
systemctl start financepro-bot
systemctl status financepro-bot
```

برای دیدن لاگ‌ها:
```bash
journalctl -u financepro-bot -f
```

---

## فرمان‌های ربات

| فرمان | کار |
|---|---|
| `/start` | اتصال با نام کاربری سایت |
| `موجودی` | موجودی کل + حساب‌ها |
| `امروز` | خرج و درآمد امروز |
| `گزارش` | خلاصهٔ این ماه |
| `ثبت: اسنپ ۵۰۰۰۰` | ثبت تراکنش با تشخیص هوشمند |
| **فوروارد پیامک بانک** | ثبت خودکار (ملی/ملت/رسالت) |

---

## عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| ربات جواب نمی‌دهد | `journalctl -u financepro-bot -f` را ببینید |
| خطای 401 از سوپابیس | کلید anon اشتباه است |
| تراکنش در سایت نیست | `SUPABASE_SYNC_ID` را با سایت چک کنید |
| Node پیدا نشد | `which node` و مسیر ExecStart را اصلاح کنید |

---

## نکتهٔ امنیتی

توکن ربات و کلید سوپابیس را **هرگز** در کد commit نکنید — فقط در Environment Variables سرویس systemd نگه دارید. فایل `bot/bot-state.json` (نگاشت کاربران تلگرام) در `.gitignore` است.
