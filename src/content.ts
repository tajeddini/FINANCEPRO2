/* ---------- محتوای سند تحویل پروژهٔ فایننس‌پرو ---------- */

export const NAV_LINKS = [
  { id: "features", label: "قابلیت‌ها" },
  { id: "pages", label: "صفحه‌ها" },
  { id: "tech", label: "فناوری‌ها" },
  { id: "files", label: "ساختار فایل‌ها" },
  { id: "data", label: "مدل داده" },
  { id: "deploy", label: "استقرار" },
  { id: "notes", label: "نکات توسعه" },
];

export const TICKER_ITEMS = [
  "تقویم شمسی در همه‌جا",
  "اعداد فارسی با جداکنندهٔ هزارگان",
  "ربات تلگرام با دفترکل مشترک",
  "Supabase Realtime + پولینگ",
  "خروجی اکسل چندبرگی",
  "تایپ صوتی fa-IR",
  "حذف با بازگشت ۳۰ ثانیه",
  "PWA — نصب و آفلاین",
  "۱۹ جدول داده",
  "۸ صفحهٔ اصلی",
  "چالش پس‌انداز",
  "نقشهٔ حرارتی خرج",
  "تشخیص هوشمند دسته و مبلغ",
  "همگام‌سازی ابری خودکار",
  "ذخیره به میلادی، نمایش به شمسی",
];

export interface KeyFeature {
  icon: string;
  title: string;
  desc: string;
}

export const KEY_FEATURES: KeyFeature[] = [
  {
    icon: "undo",
    title: "حذف با بازگشت ۳۰ ثانیه",
    desc: "هیچ‌چیز فوراً پاک نمی‌شود؛ نوار بازگردانی با شمارش معکوس، ۳۰ ثانیه فرصت پشیمانی می‌دهد.",
  },
  {
    icon: "users",
    title: "چندکاربره با حالت مهمان",
    desc: "ثبت‌نام و ورود با هش رمز عبور؛ هر کاربر دادهٔ کاملاً جدا دارد و بدون حساب هم می‌شود مهمان بود.",
  },
  {
    icon: "cloud",
    title: "سینک ابری خودکار",
    desc: "Supabase Realtime به‌علاوهٔ پولینگ؛ ارسال خودکار با دیباونس و سیاست «آخرین نوشتن برنده».",
  },
  {
    icon: "mic",
    title: "تایپ صوتی فارسی",
    desc: "Web Speech API با زبان fa-IR برای توضیح تراکنش و عنوان قرارها — hands-free کامل.",
  },
  {
    icon: "spark",
    title: "تشخیص هوشمند",
    desc: "از متن توضیح، دسته و مبلغ حدس زده می‌شود؛ ثبت سریع، سریع‌تر از همیشه.",
  },
  {
    icon: "plane",
    title: "ربات تلگرام",
    desc: "دفترکل مشترک بین سایت و تلگرام + یادآوری قرارها؛ در دو نسخهٔ Polling و Serverless.",
  },
];

export interface PageDef {
  id: string;
  num: string;
  title: string;
  icon: string;
  tagline: string;
  features: string[];
  visual:
    | "dashboard"
    | "transactions"
    | "categories"
    | "debts"
    | "appointments"
    | "reports"
    | "manage"
    | "settings";
}

export const PAGES: PageDef[] = [
  {
    id: "dashboard",
    num: "۰۱",
    title: "داشبورد",
    icon: "wallet",
    tagline: "مرکز فرمان پول شما",
    features: [
      "موجودی کل، درآمد و هزینه با دکمهٔ مخفی‌سازی جدا",
      "ثبت سریع با صوت و تشخیص هوشمند",
      "موجودی حساب‌ها و فعالیت اخیر",
      "چالش پس‌انداز و ارز خارجی",
    ],
    visual: "dashboard",
  },
  {
    id: "transactions",
    num: "۰۲",
    title: "تراکنش‌ها",
    icon: "rows",
    tagline: "دفترکل، ردیف به ردیف",
    features: [
      "فیلتر نوع و بازهٔ زمانی",
      "ویرایش و حذف با بازگشت ۳۰ ثانیه",
      "ورود دسته‌جمعی با CSV",
    ],
    visual: "transactions",
  },
  {
    id: "categories",
    num: "۰۳",
    title: "گزارش دسته‌ها",
    icon: "pie",
    tagline: "پول کجا می‌رود؟",
    features: ["۹ فیلتر زمانی آماده", "کلیک روی هر دسته → تراکنش‌هایش", "نمودار سهم هر دسته"],
    visual: "categories",
  },
  {
    id: "debts",
    num: "۰۴",
    title: "بدهی‌ها",
    icon: "swap",
    tagline: "حسابِ بده و بستان",
    features: [
      "بدهی، طلب و اقساط",
      "برنامهٔ تسویه و ماشین‌حساب وام",
      "QR درخواست وجه",
    ],
    visual: "debts",
  },
  {
    id: "appointments",
    num: "۰۵",
    title: "قرارها",
    icon: "calendar",
    tagline: "برنامه‌ها روی تقویم شمسی",
    features: [
      "تقویم شمسی با ساعت زنده و ۲۴ساعته",
      "تایپ صوتی عنوان",
      "ویرایش و خروجی ICS",
    ],
    visual: "appointments",
  },
  {
    id: "reports",
    num: "۰۶",
    title: "گزارش‌ها",
    icon: "chart",
    tagline: "تحلیل، پیش‌بینی، امتیاز",
    features: [
      "نمودار و پیش‌بینی ماه بعد",
      "امتیاز سلامت مالی و نشان‌ها",
      "نقشهٔ حرارتی + خروجی اکسل و PDF",
    ],
    visual: "reports",
  },
  {
    id: "manage",
    num: "۰۷",
    title: "مدیریت",
    icon: "sliders",
    tagline: "همهٔ ابزارهای دفترداری",
    features: [
      "حساب، دسته، انتقال و تراکنش دوره‌ای",
      "هدف پس‌انداز و بودجهٔ ماهانه",
      "روش پرداخت، چک، اشتراک و دارایی",
    ],
    visual: "manage",
  },
  {
    id: "settings",
    num: "۰۸",
    title: "تنظیمات",
    icon: "gear",
    tagline: "مالکیت کامل داده",
    features: [
      "اتصال ربات تلگرام",
      "تم روشن/تیره و امنیت (پین/اثر انگشت)",
      "همگام‌سازی ابری و حساب کاربری",
    ],
    visual: "settings",
  },
];

export interface TechRow {
  area: string;
  tech: string;
  icon: string;
}

export const TECH_ROWS: TechRow[] = [
  { area: "فریم‌ورک", tech: "React 18 + Vite 6", icon: "code" },
  { area: "زبان", tech: "TypeScript", icon: "code" },
  { area: "استایل", tech: "Tailwind CSS v4 با CSS Variables برای تم", icon: "sliders" },
  { area: "فونت", tech: "Lalezar (تیتر) + Vazirmatn (متن)", icon: "type" },
  { area: "تاریخ شمسی", tech: "jalaali-js", icon: "calendar" },
  { area: "نمودار", tech: "Recharts", icon: "chart" },
  { area: "آیکن", tech: "Lucide React", icon: "spark" },
  { area: "اکسل", tech: "ExcelJS — خروجی چندبرگی", icon: "sheet" },
  { area: "بک‌اند و دیتابیس", tech: "Supabase — PostgreSQL + REST + Realtime", icon: "db" },
  { area: "میزبانی سایت", tech: "Vercel", icon: "cloud" },
  { area: "ربات تلگرام", tech: "Node.js بدون وابستگی — Serverless روی Vercel", icon: "plane" },
];

export interface TreeNode {
  name: string;
  note?: string;
  children?: TreeNode[];
}

export const FILE_TREE: TreeNode = {
  name: "financepro/",
  children: [
    { name: "index.html", note: "نقطهٔ ورود HTML — RTL، فونت‌ها، تم اولیه" },
    {
      name: "src/",
      children: [
        { name: "main.tsx", note: "بوت‌استرپ React + ثبت Service Worker" },
        { name: "App.tsx", note: "پوسته: مسیریابی، ورود/ثبت‌نام، جستجو، یادآوری" },
        { name: "index.css", note: "سیستم طراحی — متغیرها، تم روشن/تیره" },
        { name: "ui.tsx", note: "کتابخانهٔ UI: توست، مودال، تقویم شمسی، فرم" },
        { name: "pages.tsx", note: "۸ صفحهٔ اصلی برنامه" },
        { name: "widgets.tsx", note: "ویجت‌های تحلیلی: نقشهٔ حرارتی، پیش‌بینی، امتیاز" },
        { name: "excel.ts", note: "خروجی اکسل چندبرگی با ExcelJS" },
        { name: "shims.d.ts", note: "تعریف تایپ ماژول‌های خارجی" },
        {
          name: "lib/",
          children: [
            { name: "data.tsx", note: "مدل داده (۱۹ جدول) + Store + شمسی + اعداد فارسی" },
            { name: "auth.ts", note: "احراز هویت چندکاربره — ثبت‌نام، ورود، هش رمز" },
            { name: "cloud.ts", note: "همگام‌سازی ابری با Supabase — Realtime + پولینگ" },
          ],
        },
      ],
    },
    {
      name: "api/",
      note: "توابع Serverless ربات تلگرام (Vercel)",
      children: [{ name: "telegram-webhook.mjs" }, { name: "health.mjs" }],
    },
    {
      name: "bot/",
      note: "نسخهٔ مستقل ربات — اجرای لوکال با Polling",
      children: [{ name: "bot.js" }, { name: "package.json" }],
    },
    {
      name: "public/",
      note: "فایل‌های PWA",
      children: [
        { name: "manifest.webmanifest" },
        { name: "icon.svg" },
        { name: "sw.js", note: "Service Worker — کش آفلاین" },
      ],
    },
    { name: "supabase-bot.sql", note: "SQL ساخت جدول‌های سوپابیس" },
  ],
};

export const RUN_COMMANDS: { cmd: string; comment: string }[] = [
  { cmd: "npm install", comment: "نصب وابستگی‌ها — فقط بار اول" },
  { cmd: "npm run dev", comment: "اجرای سایت → http://localhost:5173" },
  { cmd: "npm run build", comment: "بیلد برای تولید" },
  { cmd: "cd bot && BOT_TOKEN=*** node bot.js", comment: "اجرای ربات به‌صورت لوکال (Polling)" },
];

export type TableGroup = "هسته" | "مالی" | "برنامه‌ریزی" | "سیستم";

export interface DataTable {
  name: string;
  desc: string;
  group: TableGroup;
}

export const DATA_TABLES: DataTable[] = [
  { name: "accounts", desc: "حساب‌های بانکی/کارت با مانده", group: "هسته" },
  { name: "categories", desc: "دسته‌های درآمد/هزینه", group: "هسته" },
  { name: "transactions", desc: "تراکنش‌ها — هستهٔ دفترکل", group: "هسته" },
  { name: "transfers", desc: "انتقال بین حساب‌ها", group: "هسته" },
  { name: "debts", desc: "بدهی‌ها و طلب‌ها", group: "مالی" },
  { name: "installments", desc: "اقساط", group: "مالی" },
  { name: "budgets", desc: "بودجهٔ ماهانه", group: "مالی" },
  { name: "payment_methods", desc: "روش‌های پرداخت", group: "مالی" },
  { name: "cheques", desc: "چک‌های دریافتی/پرداختی", group: "مالی" },
  { name: "splits", desc: "تقسیم صورت‌حساب", group: "مالی" },
  { name: "currencies", desc: "ارزهای خارجی", group: "مالی" },
  { name: "assets", desc: "دارایی‌ها — طلا، ماشین و…", group: "مالی" },
  { name: "recurring", desc: "تراکنش‌های دوره‌ای", group: "برنامه‌ریزی" },
  { name: "savings_goals", desc: "اهداف پس‌انداز", group: "برنامه‌ریزی" },
  { name: "appointments", desc: "قرارها و برنامه‌ها", group: "برنامه‌ریزی" },
  { name: "subscriptions", desc: "اشتراک‌ها", group: "برنامه‌ریزی" },
  { name: "challenges", desc: "چالش‌های پس‌انداز", group: "برنامه‌ریزی" },
  { name: "activity_logs", desc: "گزارش فعالیت", group: "سیستم" },
  { name: "telegram_users", desc: "کاربران ربات تلگرام", group: "سیستم" },
];

export const SUPABASE_TABLES = [
  { name: "financepro_state", desc: "دفترکل مشترک سایت و ربات — هر کاربر یک ردیف با id" },
  { name: "bot_state", desc: "حالت مکالمهٔ ربات — مرحلهٔ ثبت هزینه/درآمد" },
];

export interface DeployTab {
  id: string;
  title: string;
  icon: string;
  steps: { text: string; code?: string }[];
  codeLabel?: string;
}

export const DEPLOY_TABS: DeployTab[] = [
  {
    id: "vercel",
    title: "سایت روی Vercel",
    icon: "cloud",
    steps: [
      { text: "پروژه را به GitHub بفرستید." },
      { text: "در Vercel پروژه را Import کنید — خودش Vite را می‌شناسد." },
      { text: "Deploy! آدرس می‌گیرید:", code: "https://xxx.vercel.app" },
    ],
  },
  {
    id: "supabase",
    title: "دیتابیس Supabase",
    icon: "db",
    steps: [
      { text: "در supabase.com یک پروژه بسازید." },
      { text: "در SQL Editor فایل supabase-bot.sql را اجرا کنید." },
      { text: "از Settings → API، آدرس پروژه و کلید anon را بردارید." },
    ],
  },
  {
    id: "bot",
    title: "ربات تلگرام (Serverless)",
    icon: "plane",
    steps: [
      { text: "در Vercel → Settings → Environment Variables این پنج متغیر را اضافه کنید: BOT_TOKEN، WEBHOOK_SECRET، SUPABASE_URL، SUPABASE_KEY و SUPABASE_SYNC_ID (شناسهٔ سینک کاربر از تنظیمات سایت)." },
      { text: "Webhook را فعال کنید:", code: 'Invoke-RestMethod "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://xxx.vercel.app/api/telegram-webhook&secret_token=<SECRET>"' },
    ],
    codeLabel: "PowerShell",
  },
  {
    id: "sync",
    title: "سینک سایت با Supabase",
    icon: "sync",
    steps: [
      { text: "در سایت به تنظیمات ← همگام‌سازی ابری بروید." },
      { text: "آدرس پروژه و کلید anon را وارد و ذخیره کنید." },
      { text: "سینک خودکار فعال می‌شود — Realtime + پولینگ + ارسال با دیباونس." },
    ],
  },
];

export const ENV_VARS = [
  { key: "BOT_TOKEN", desc: "توکن ربات از BotFather" },
  { key: "WEBHOOK_SECRET", desc: "یک رمز دلخواه" },
  { key: "SUPABASE_URL", desc: "آدرس پروژهٔ سوپابیس" },
  { key: "SUPABASE_KEY", desc: "کلید anon" },
  { key: "SUPABASE_SYNC_ID", desc: "شناسهٔ سینک کاربر — از تنظیمات سایت" },
];

export interface DevNote {
  title: string;
  body: string;
  code?: string;
}

export const DEV_NOTES: DevNote[] = [
  {
    title: "هرگز new Date() مستقیم برای شمسی نه",
    body: "همیشه از toJalaali() و toGregorianDate() در data.tsx استفاده کن.",
    code: "toJalaali(date) / toGregorianDate(jy, jm, jd)",
  },
  {
    title: "اعداد فارسی",
    body: "برای نمایش از faNum() و money() استفاده کن، نه toLocaleString خالی.",
    code: "faNum(12846500) → «۱۲٬۸۴۶٬۵۰۰»",
  },
  {
    title: "Store مرکزی",
    body: "همهٔ تغییرات داده باید از mutate() در data.tsx عبور کند تا سینک ابری و ذخیرهٔ محلی انجام شود.",
    code: "mutate((draft) => { … })",
  },
  {
    title: "حذف‌ها",
    body: "برای حذف از trashItem() استفاده کن — ۳۰ ثانیه فرصت بازگشت — نه حذف مستقیم.",
    code: "trashItem(id, 'transactions')",
  },
  {
    title: "تم",
    body: "رنگ‌ها در CSS Variables با پیشوند --fp- تعریف شده‌اند؛ برای تم جدید فقط متغیرها را تغییر بده.",
    code: "--fp-accent, --fp-bg, …",
  },
  {
    title: "ربات تلگرام — دو نسخه",
    body: "bot/bot.js نسخهٔ مستقل با Polling است و api/telegram-webhook.mjs نسخهٔ Serverless روی Vercel؛ هر دو از Supabase مشترک استفاده می‌کنند.",
  },
];

export const ROADMAP_ITEMS = [
  "محدود کردن RLS سوپابیس برای تولید",
  "سینک خودکار دوطرفهٔ کامل — الان «آخرین نوشتن برنده» است",
  "اپ موبایل بومی با Capacitor",
  "پشتیبان‌گیری خودکار روزانه در تلگرام",
  "گزارش PDF با طراحی اختصاصی‌تر",
  "دستورات بیشتر ربات — جستجو، گزارش دسته",
];

export const SERVICE_ACCOUNTS = [
  { service: "GitHub", desc: "ریپازیتوری پابلیش شده", icon: "code" },
  { service: "Vercel", desc: "سایت + ربات (Serverless)", icon: "cloud" },
  { service: "Supabase", desc: "دیتابیس + Realtime", icon: "db" },
  { service: "تلگرام", desc: "ربات ساخته‌شده با BotFather", icon: "plane" },
];

/* ---------- دادهٔ نمایشی داشبورد ---------- */
export const MOCK_ACCOUNTS = [
  { name: "بانک ملت", amount: 8420000, pct: 66, color: "var(--color-mint-400)" },
  { name: "صندوق طلا", amount: 2496500, pct: 19, color: "var(--color-gold-500)" },
  { name: "نقدینگی", amount: 1250000, pct: 10, color: "var(--color-skyx-400)" },
  { name: "کارت هدیه", amount: 680000, pct: 5, color: "var(--color-coral-400)" },
];

export const TOTAL_BALANCE = 12846500;
export const MONTH_INCOME = 18500000;
export const MONTH_EXPENSE = 12870000;

export interface FeedItem {
  title: string;
  cat: string;
  amount: number;
  income: boolean;
  bot?: boolean;
}

export const FEED_POOL: FeedItem[] = [
  { title: "سوپرمارکت یاس", cat: "خوراک", amount: 285000, income: false },
  { title: "اسنپ — تا شرکت", cat: "رفت‌وآمد", amount: 95000, income: false, bot: true },
  { title: "واریز حقوق", cat: "درآمد", amount: 18500000, income: true },
  { title: "قهوه با رضا", cat: "کافه", amount: 140000, income: false, bot: true },
  { title: "اشتراک فیلم", cat: "اشتراک", amount: 79000, income: false },
  { title: "دریافت از مریم", cat: "طلب", amount: 500000, income: true },
  { title: "داروخانه", cat: "سلامت", amount: 240000, income: false },
  { title: "شارژ ساختمان", cat: "خانه", amount: 350000, income: false },
  { title: "فروش جزوه", cat: "متفرقه", amount: 120000, income: true, bot: true },
];

export const SPARK_POINTS = [
  38, 42, 40, 46, 50, 44, 52, 58, 54, 60, 56, 63, 61, 58, 66, 70, 64, 72, 68, 75, 71, 78, 74, 80, 76, 84, 80, 86, 82, 90,
];
