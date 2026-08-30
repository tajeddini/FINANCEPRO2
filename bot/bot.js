#!/usr/bin/env node
/* =====================================================================
   فایننس‌پرو — ربات تلگرام (نسخهٔ مستقل، بدون هیچ وابستگی npm)
   ---------------------------------------------------------------------
   دفترکل مشترک با سایت: همان جدول financepro_state در Supabase را
   می‌خواند و می‌نویسد؛ پس هر تراکنشی که اینجا ثبت شود، در سایت (و برعکس)
   دیده می‌شود. کلید ردیف = fp-user-<نام‌کاربری> — دقیقاً مثل وب‌اپ.

   اجرا:
     BOT_TOKEN=...  SUPABASE_URL=...  SUPABASE_KEY=...  node bot.js

   نیازمندی‌ها: فقط Node.js نسخهٔ ۱۸ به بالا (fetch داخلی). هیچ npm install لازم نیست.

   فرمان‌ها:
     /start            شروع و اتصال حساب (نام کاربری سایت را می‌پرسد)
     /help             راهنما
     موجودی            مجموع موجودی حساب‌ها
     امروز             خرج و درآمد امروز
     گزارش             خلاصهٔ این ماه + ۵ تراکنش آخر
     (فوروارد پیامک بانکی)   تشخیص خودکار مبلغ/نوع/تاریخ و ثبت
     ثبت: <توضیح> <مبلغ>     ثبت دستی سریع (مثلاً: ثبت: اسنپ ۵۰۰۰۰)
   ===================================================================== */
"use strict";

const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

/* ---------- تنظیمات از محیط ---------- */
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!BOT_TOKEN) die("متغیر محیطی BOT_TOKEN تنظیم نشده است.");
if (!SUPABASE_URL || !SUPABASE_KEY) die("متغیرهای محیطی SUPABASE_URL و SUPABASE_KEY را تنظیم کنید.");

function die(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const STATE_FILE = path.join(__dirname, "bot-state.json"); // نگاشت chatId → username

/* ---------- اعداد فارسی ---------- */
const FA = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (v) => String(v).replace(/\d/g, (d) => FA[+d]);
const money = (n) =>
  faNum(Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬"));
const toEnDigits = (s) =>
  s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
   .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/* ---------- تاریخ: «امروز» به وقت ایران ---------- */
function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
}
function jalaliToday() {
  return new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).split("/").map(Number); // [jy, jm, jd]
}

/* ---------- ذخیرهٔ محلی نگاشت chatId→username ---------- */
let links = {};
try { links = JSON.parse(fs.readFileSync(STATE_FILE, "utf8") || "{}"); } catch { links = {}; }
function saveLinks() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(links, null, 2), "utf8"); } catch {}
}
const rowIdFor = (username) => "fp-user-" + String(username).trim().toLowerCase();

/* ---------- Supabase REST ---------- */
async function sb(method, urlPath, body, extraHeaders = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${urlPath}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${typeof json === "string" ? json.slice(0, 200) : JSON.stringify(json).slice(0, 200)}`);
  return json;
}

const decodeState = (b64) => JSON.parse(decodeURIComponent(escape(atob(b64))));
const encodeState = (s) => btoa(unescape(encodeURIComponent(JSON.stringify(s))));

async function getState(username) {
  const rows = await sb("GET", `financepro_state?id=eq.${encodeURIComponent(rowIdFor(username))}&select=data,updated_at`);
  if (!rows || !rows.length) return null;
  return decodeState(rows[0].data);
}

async function saveState(username, state) {
  state.rev = Date.now();
  state.lastSync = Date.now();
  await sb("POST", "financepro_state", {
    id: rowIdFor(username),
    data: encodeState(state),
    updated_at: new Date().toISOString(),
  }, { Prefer: "resolution=merge-duplicates" });
}

/* ---------- تلگرام ---------- */
async function tg(method, payload) {
  try {
    const res = await fetch(`${TG}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.error("telegram error:", e.message);
    return { ok: false };
  }
}
const send = (chatId, text, extra = {}) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });

/* ---------- پارسر پیامک بانکی (نسخهٔ فشردهٔ sms.ts) ---------- */
function parseSMS(raw) {
  const text = toEnDigits(raw)
    .replace(/[ك]/g, "ک").replace(/[ي]/g, "ی")
    .replace(/[٬،]/g, ",").replace(/[٫]/g, ".")
    .replace(/[\u200c\u200f\u200e]/g, " ");

  // شمارهٔ ارجاع (رسالت) را جدا کن تا با مبلغ قاطی نشود
  const refM = text.match(/\b([0-9]{1,6}\.[0-9]{4,}\.[0-9]{1,4})\b/);
  const body = refM ? text.replace(refM[1], " ") : text;

  const unitAt = (s) => (/ریال/.test(s) ? "rial" : /تومان|تومن/.test(s) ? "toman" : "unknown");
  let raw = 0, unit = "unknown", sign = "", found = false;

  let m = body.match(/مبلغ\s*[:\-–]?\s*([+-]?)\s*([0-9][0-9,.]*)\s*([+-]?)\s*(میلیون\s*)?(هزار\s*)?(ریال|تومان|تومن)?/);
  if (m && parseFloat(m[2]) > 0) { raw = parseFloat(m[2].replace(/,/g, "")); sign = m[1] || m[3]; raw *= m[4] ? 1e6 : m[5] ? 1e3 : 1; unit = m[6] ? unitAt(m[6]) : unitAt(body); found = true; }

  if (!found) {
    m = body.match(/(انتقال|برداشت|واریز|خرید|پرداخت|کسر|دریافت|بستانکار|بدهکار)\s*[:\-–]?\s*([+-]?)\s*([0-9][0-9,.]*)\s*([+-]?)\s*(میلیون\s*)?(هزار\s*)?(ریال|تومان|تومن)?/);
    if (m && parseFloat(m[3]) > 0) { raw = parseFloat(m[3].replace(/,/g, "")); sign = m[2] || m[4]; raw *= m[5] ? 1e6 : m[6] ? 1e3 : 1; unit = m[7] ? unitAt(m[7]) : unitAt(body); found = true; }
  }
  if (!found) {
    m = body.match(/([0-9][0-9,.]*)\s*(میلیون\s*)?(هزار\s*)?(ریال|تومان|تومن)\b/);
    if (m) { raw = parseFloat(m[1].replace(/,/g, "")); raw *= m[2] ? 1e6 : m[3] ? 1e3 : 1; unit = unitAt(m[4]); found = true; }
  }
  if (!found) {
    m = body.match(/(?:^|\n)\s*([+-])\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{5,})\s*(?=\n|$)/);
    if (m && parseFloat(m[2]) > 0) { raw = parseFloat(m[2].replace(/,/g, "")); sign = m[1]; unit = unitAt(body); found = true; }
  }

  if (found && unit === "unknown") unit = "rial"; // عرف بانک‌های ایران
  const amountToman = unit === "rial" ? Math.round(raw / 10) : Math.round(raw);

  let type;
  if (sign === "-") type = "expense";
  else if (sign === "+") type = "income";
  else if (/(واریز|دریافت|افزایش موجودی|برگشت وجه|بستانکار)/.test(body)) type = "income";
  else type = "expense";

  // تاریخ
  let dateISO = todayISO();
  const dm = body.match(/(1[34][0-9]{2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{1,2})/);
  if (dm) {
    const [, jy, jm, jd] = dm.map(Number);
    if (jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      try { dateISO = jalaliToISO(jy, jm, jd); } catch { /* امروز */ }
    }
  }

  // طرف مقابل
  const merM = body.match(/(?:خرید(?:\s+اینترنتی)?\s+از|پرداخت\s+به|برداشت\s+از|واریز\s+از|انتقال\s+به|دریافت\s+از)\s*[:\-–]?\s*([^\n]{2,40}?)(?=\s+(?:مبلغ|کارت|شماره|به|در|زمان|تاریخ|مانده|با|برای)|[,،]|\s*$)/);
  const merchant = merM ? merM[1].trim().replace(/[.،,]+$/, "") : undefined;

  return { found, type, amountToman, dateISO, merchant };
}

/* ---------- تبدیل جلالی به میلادی (الگوریتم دقیق jalaali-js، بدون وابستگی) ---------- */
function div(a, b) { return ~~(a / b); }
function mod(a, b) { return a - ~~(a / b) * b; }
function jalCal(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length, gy = jy + 621;
  let leapJ = -14, jp = breaks[0], jm, jump, leap, leapG, march, n, i;
  for (i = 1; i < bl; i += 1) {
    jm = breaks[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function jalaliToISO(jy, jm, jd) {
  const g = d2g(j2d(jy, jm, jd));
  const p = (x) => String(x).padStart(2, "0");
  return `${g.gy}-${p(g.gm)}-${p(g.gd)}`;
}

/* ---------- فرمان‌ها ---------- */
const HELP = `
🏦 <b>فایننس‌پرو</b> — دفترکل مشترک با سایت

<b>اتصال:</b> /start و بعد <b>نام کاربری</b> سایت را بفرست.

<b>فرمان‌ها:</b>
• <code>موجودی</code> — مجموع موجودی حساب‌ها
• <code>امروز</code> — خرج و درآمد امروز
• <code>گزارش</code> — خلاصهٔ این ماه + تراکنش‌های آخر
• <b>فوروارد پیامک بانک</b> — تشخیص خودکار مبلغ/نوع/تاریخ و ثبت
• <code>ثبت: اسنپ ۵۰۰۰۰</code> — ثبت دستی سریع

🔒 همه‌چیز در همان Supabase سایت ذخیره می‌شود.
`;

async function handleBalance(chatId, username) {
  const s = await getState(username);
  if (!s) return send(chatId, "⚠️ داده‌ای در ابر پیدا نشد. اول در سایت یک‌بار سینک کن.");
  const total = (s.accounts || []).reduce((a, x) => a + (x.balance || 0), 0);
  const lines = (s.accounts || []).map((a) => `• ${a.name}: <b>${money(a.balance)}</b>`).join("\n");
  send(chatId, `💰 <b>موجودی کل:</b> ${money(total)} تومان\n\n${lines}`);
}

async function handleToday(chatId, username) {
  const s = await getState(username);
  if (!s) return send(chatId, "⚠️ داده‌ای در ابر پیدا نشد.");
  const t = todayISO();
  const txs = (s.transactions || []).filter((x) => x.date === t);
  const inc = txs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const exp = txs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
  send(chatId,
    `📅 <b>امروز</b> (${faNum(t)})\n\n` +
    `🟢 درآمد: <b>${money(inc)}</b>\n🔴 هزینه: <b>${money(exp)}</b>\n\n` +
    (txs.length ? `تعداد تراکنش: ${faNum(txs.length)}` : "هنوز تراکنشی ثبت نشده."));
}

async function handleReport(chatId, username) {
  const s = await getState(username);
  if (!s) return send(chatId, "⚠️ داده‌ای در ابر پیدا نشد.");
  const last = (s.transactions || []).slice(0, 5)
    .map((x) => `${x.type === "income" ? "🟢" : "🔴"} ${x.title || "—"} — <b>${money(x.amount)}</b>`)
    .join("\n");
  const total = (s.accounts || []).reduce((a, x) => a + (x.balance || 0), 0);
  send(chatId,
    `📊 <b>گزارش</b>\n\n💰 موجودی کل: <b>${money(total)}</b> تومان\n\n` +
    `<b>آخرین تراکنش‌ها:</b>\n${last || "چیزی نیست."}`);
}

async function addTransaction(username, tx) {
  let s = await getState(username);
  if (!s) throw new Error("NO_DATA");
  const now = Date.now();
  tx.id = randomUUID().slice(0, 13);
  tx.createdAt = now;
  tx.updatedAt = now;
  tx.source = "bot";
  s.transactions = [tx, ...(s.transactions || [])];
  await saveState(username, s);
  return tx;
}

async function handleSMS(chatId, username, text) {
  const p = parseSMS(text);
  if (!p.found || p.amountToman <= 0) {
    return send(chatId, "🤔 نتونستم مبلغ رو از پیام در بیارم.\nراهنما: /help");
  }
  const s = await getState(username);
  const cat = (s?.categories || []).find((c) => c.type === (p.type === "income" ? "income" : "expense"));
  const acc = (s?.accounts || [])[0];
  try {
    await addTransaction(username, {
      date: p.dateISO,
      type: p.type,
      amount: p.amountToman,
      title: p.merchant || (p.type === "income" ? "واریز (از پیامک)" : "برداشت (از پیامک)"),
      categoryId: cat?.id || "",
      accountId: acc?.id || "",
      payMethod: "کارت",
    });
    send(chatId,
      `✅ ثبت شد!\n\n${p.type === "income" ? "🟢 واریز" : "🔴 هزینه"}: <b>${money(p.amountToman)}</b> تومان\n` +
      (p.merchant ? `📝 ${p.merchant}\n` : "") +
      `📅 ${faNum(p.dateISO)}\n\nدر سایت هم می‌بینیش. 🎉`);
  } catch (e) {
    send(chatId, e.message === "NO_DATA"
      ? "⚠️ اول در سایت یک‌بار سینک کن تا داده‌ات در ابر باشه."
      : "❌ خطا در ثبت: " + e.message);
  }
}

/* ثبت دستی: «ثبت: اسنپ ۵۰۰۰۰» */
async function handleManual(chatId, username, text) {
  const m = text.replace(/^ثبت\s*[:：]?\s*/i, "").trim().match(/^(.*?)\s+([0-9۰-۹][0-9۰-۹,٬]*)\s*$/);
  if (!m) return send(chatId, "📝 قالب: <code>ثبت: اسنپ ۵۰۰۰۰</code>");
  const title = m[1].trim() || "تراکنش";
  const amount = Math.round(parseFloat(toEnDigits(m[2]).replace(/[,٬]/g, "")) || 0);
  if (amount <= 0) return send(chatId, "مبلغ معتبر نیست.");
  const s = await getState(username);
  const cat = (s?.categories || []).find((c) => c.type === "expense");
  const acc = (s?.accounts || [])[0];
  try {
    await addTransaction(username, {
      date: todayISO(), type: "expense", amount, title,
      categoryId: cat?.id || "", accountId: acc?.id || "", payMethod: "کارت",
    });
    send(chatId, `✅ «${title}» به مبلغ <b>${money(amount)}</b> تومان ثبت شد.`);
  } catch (e) {
    send(chatId, "⚠️ اول در سایت یک‌بار سینک کن.");
  }
}

/* ---------- حلقهٔ اصلی (long-polling) ---------- */
let offset = 0;

async function processUpdate(u) {
  const msg = u.message;
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const username = links[String(chatId)];

  if (text === "/start") {
    if (username) return send(chatId, `👋 سلام دوباره!\nحساب متصل: <b>${username}</b>\n\nراهنما: /help`);
    return send(chatId,
      `👋 <b>سلام!</b>\n\nبرای اتصال، <b>نام کاربری</b> خودت در سایت فایننس‌پرو را بفرست.\n` +
      `(همونی که باهاش وارد سایت می‌شی)`);
  }

  if (!username) {
    // در حال اتصال: هر متن = نام کاربری
    const un = text.toLowerCase().replace(/^@/, "").trim();
    if (!/^[a-z0-9_.]{3,}$/.test(un)) return send(chatId, "نام کاربری معتبر نیست (حداقل ۳ حرف انگلیسی/عدد).");
    links[String(chatId)] = un;
    saveLinks();
    return send(chatId, `✅ متصل شدی به حساب <b>${un}</b>!\n\nحالا می‌تونی پیامک بانک رو فوروارد کنی یا بزنی <code>موجودی</code>.\nراهنما: /help`);
  }

  if (text === "/help") return send(chatId, HELP);
  if (/^موجودی/i.test(text)) return handleBalance(chatId, username).catch(errReply(chatId));
  if (/^امروز/i.test(text)) return handleToday(chatId, username).catch(errReply(chatId));
  if (/^گزارش/i.test(text)) return handleReport(chatId, username).catch(errReply(chatId));
  if (/^ثبت\s*[:：]/i.test(text)) return handleManual(chatId, username, text).catch(errReply(chatId));

  // در غیر این صورت فرض کن پیامک بانکی است
  return handleSMS(chatId, username, text).catch(errReply(chatId));
}

const errReply = (chatId) => (e) => send(chatId, "❌ خطا: " + (e.message || e));

async function poll() {
  const r = await tg("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
  if (r.ok && Array.isArray(r.result)) {
    for (const u of r.result) {
      offset = u.update_id + 1;
      try { await processUpdate(u); } catch (e) { console.error("handler:", e.message); }
    }
  }
}

(async () => {
  const me = await tg("getMe");
  console.log(me.ok ? `✅ ربات @${me.result.username} در حال اجراست…` : "❌ اتصال به تلگرام ناموفق بود — BOT_TOKEN را چک کن.");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { await poll(); } catch (e) { console.error("poll:", e.message); await new Promise((r) => setTimeout(r, 3000)); }
  }
})();
