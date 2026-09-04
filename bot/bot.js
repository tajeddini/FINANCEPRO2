#!/usr/bin/env node
/* =====================================================================
   ربات تلگرام فایننس‌پرو — بدون هیچ وابستگی npm (فقط Node 18+)
   دفترکل مشترک با سایت از راه جدول financepro_state در Supabase.

   متغیرهای محیطی لازم:
     BOT_TOKEN          توکن ربات از BotFather
     SUPABASE_URL       آدرس پروژهٔ سوپابیس (https://xxx.supabase.co)
     SUPABASE_KEY       کلید anon
     SUPABASE_SYNC_ID   شناسهٔ سینک کاربر (fp-user-<نام‌کاربری>)

   اجرا:  node bot.js
   ===================================================================== */

const TG = process.env.BOT_TOKEN;
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_KEY = process.env.SUPABASE_KEY;
const SYNC_ID = process.env.SUPABASE_SYNC_ID;

if (!TG || !SB_URL || !SB_KEY || !SYNC_ID) {
  console.error("خطا: متغیرهای محیطی BOT_TOKEN, SUPABASE_URL, SUPABASE_KEY, SUPABASE_SYNC_ID لازم است.");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TG}`;
const REST = `${SB_URL}/rest/v1`;

/* ---------- ابزارهای عمومی ---------- */
const FA = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (v) => String(v).replace(/\d/g, (d) => FA[+d]);
const groupInt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
const faMoney = (n) => faNum(groupInt(Math.abs(n)));
const toEnDigits = (s) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const MONTHS_FA = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];

function jalaliToday() {
  // تبدیل میلادی به جلالی (الگوریتم jalaali-js به‌صورت فشرده)
  const now = new Date();
  const gy = now.getFullYear(), gm = now.getMonth() + 1, gd = now.getDate();
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let jm, jd;
  if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31); }
  else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30); }
  return { jy, jm, jd };
}

/* ---------- ارتباط با Supabase ---------- */
async function sbGet(path) {
  const r = await fetch(`${REST}${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  return r.json();
}

async function sbUpsert(state) {
  const payload = { id: SYNC_ID, updated_at: new Date().toISOString() };
  payload["data"] = JSON.stringify(state);
  const r = await fetch(`${REST}/financepro_state`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Supabase POST ${r.status}`);
}

async function loadState() {
  const rows = await sbGet(`/financepro_state?id=eq.${encodeURIComponent(SYNC_ID)}&select=data`);
  if (!rows.length) return null;
  try { return JSON.parse(rows[0].data); } catch { return null; }
}

/* ---------- ارسال پیام به تلگرام ---------- */
async function send(chat_id, text) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
  }).catch((e) => console.error("send error:", e.message));
}

/* ---------- پارسر پیامک بانکی (ساده‌شده، مشترک با سایت) ---------- */
function parseBankSMS(raw) {
  const text = toEnDigits(raw).replace(/[٬،]/g, ",").replace(/[kك]/g, "ک");
  let rawAmount = 0, unit = "unknown", sign = "";

  let m = text.match(/مبلغ\s*[:\-–]?\s*([+-]?)([0-9][0-9,.]*)\s*([+-]?)(ریال|تومان|تومن)?/);
  if (m) { rawAmount = parseFloat(m[2].replace(/,/g, "")); sign = m[1] || m[3]; unit = m[4] ? (/تومان|تومن/.test(m[4]) ? "toman" : "rial") : "unknown"; }
  else {
    m = text.match(/(انتقال|برداشت|واریز|خرید|پرداخت|دریافت)\s*[:\-–]?\s*([+-]?)([0-9][0-9,.]*)\s*([+-]?)(ریال|تومان)?/);
    if (m) { rawAmount = parseFloat(m[3].replace(/,/g, "")); sign = m[2] || m[4]; unit = m[5] ? (/تومان/.test(m[5]) ? "toman" : "rial") : "unknown"; }
    else {
      m = text.match(/(?:^|\n)\s*([+-])\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{5,})\s*(?=\n|$)/);
      if (m) { rawAmount = parseFloat(m[2].replace(/,/g, "")); sign = m[1]; unit = "unknown"; }
    }
  }
  if (unit === "unknown") unit = "rial";
  const amount = unit === "rial" ? Math.round(rawAmount / 10) : Math.round(rawAmount);
  let type = "expense";
  if (sign === "+") type = "income";
  else if (sign !== "-" && /واریز|دریافت/.test(text)) type = "income";
  return { amount, type, ok: rawAmount > 0 };
}

/* ---------- فرمان‌ها ---------- */
async function handle(chat_id, text) {
  const t = (text || "").trim();
  const state = await loadState();

  if (t === "/start" || t === "/help") {
    return send(chat_id,
      "🏦 <b>فایننس‌پرو</b>\n\n" +
      "فرمان‌ها:\n" +
      "• <code>موجودی</code> — موجودی کل و حساب‌ها\n" +
      "• <code>امروز</code> — خرج و درآمد امروز\n" +
      "• <code>گزارش</code> — خلاصهٔ این ماه\n" +
      "• <code>ثبت: اسنپ ۵۰۰۰۰</code> — ثبت تراکنش\n" +
      "• پیامک بانک را <b>فوروارد</b> کن تا خودکار ثبت شود");
  }

  if (!state) {
    return send(chat_id, "⚠️ داده‌ای در ابر پیدا نشد. اول در سایت با همین حساب سینک را فعال کن.");
  }

  if (t === "موجودی") {
    const total = (state.accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
    let msg = `💰 <b>موجودی کل:</b> ${faMoney(total)} تومان\n\n`;
    for (const a of state.accounts || []) msg += `▪️ ${a.name}: ${faMoney(a.balance)}\n`;
    return send(chat_id, msg);
  }

  if (t === "امروز") {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const txs = (state.transactions || []).filter((x) => x.date === iso);
    const inc = txs.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
    const exp = txs.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
    return send(chat_id, `📅 <b>امروز</b>\n\nدرآمد: ${faMoney(inc)}\nهزینه: ${faMoney(exp)}\nتراکنش: ${faNum(txs.length)}`);
  }

  if (t === "گزارش") {
    const j = jalaliToday();
    const from = `${j.jy}-${String(j.jm).padStart(2, "0")}-01`;
    const txs = (state.transactions || []).filter((x) => x.date >= from);
    const inc = txs.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
    const exp = txs.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
    return send(chat_id, `📊 <b>${MONTHS_FA[j.jm - 1]} ${faNum(j.jy)}</b>\n\nدرآمد: ${faMoney(inc)}\nهزینه: ${faMoney(exp)}\nتراز: ${faMoney(inc - exp)}\nتراکنش: ${faNum(txs.length)}`);
  }

  if (t.startsWith("ثبت:") || t.startsWith("ثبت :")) {
    const body = t.replace(/^ثبت\s*:?\s*:?\s*/, "");
    const p = parseBankSMS(body);
    const acc = (state.accounts || [])[0];
    if (!acc) return send(chat_id, "⚠️ حسابی تعریف نشده.");
    const tx = {
      id: Math.random().toString(36).slice(2, 10),
      date: new Date().toISOString().slice(0, 10),
      type: p.type,
      amount: p.amount,
      title: body,
      note: body,
      categoryId: (state.categories || []).find((c) => c.type === p.type)?.id || "",
      accountId: acc.id,
      payMethod: "کارت",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: "bot",
    };
    state.transactions = state.transactions || [];
    state.transactions.unshift(tx);
    state.rev = Date.now();
    state.lastSync = Date.now();
    await sbUpsert(state);
    return send(chat_id, `✅ «${body}» به مبلغ ${faMoney(p.amount)} تومان ثبت شد (${p.type === "income" ? "درآمد" : "هزینه"}).`);
  }

  // فوروارد پیامک بانکی
  const p = parseBankSMS(t);
  if (p.ok) {
    const acc = (state.accounts || [])[0];
    if (!acc) return send(chat_id, "⚠️ حسابی تعریف نشده.");
    const tx = {
      id: Math.random().toString(36).slice(2, 10),
      date: new Date().toISOString().slice(0, 10),
      type: p.type,
      amount: p.amount,
      title: "از پیامک بانکی",
      note: t.slice(0, 100),
      categoryId: (state.categories || []).find((c) => c.type === p.type)?.id || "",
      accountId: acc.id,
      payMethod: "کارت",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: "bot",
    };
    state.transactions = state.transactions || [];
    state.transactions.unshift(tx);
    state.rev = Date.now();
    state.lastSync = Date.now();
    await sbUpsert(state);
    return send(chat_id, `🏦 پیامک بانکی شناسایی شد:\n${p.type === "income" ? "➕ واریز" : "➖ برداشت"} ${faMoney(p.amount)} تومان\n\n✅ به‌عنوان تراکنش ثبت شد.`);
  }

  return send(chat_id, "متوجه نشدم. /help را بفرست تا فرمان‌ها را ببینی.");
}

/* ---------- حلقهٔ long-polling ---------- */
let offset = 0;
async function poll() {
  while (true) {
    try {
      const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message"]`);
      const data = await r.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const u of data.result) {
          offset = u.update_id + 1;
          const msg = u.message;
          if (msg && msg.chat) {
            const text = msg.text || (msg.forward_from ? "(forwarded)" : "");
            handle(msg.chat.id, text).catch((e) => console.error("handle error:", e.message));
          }
        }
      }
    } catch (e) {
      console.error("poll error:", e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

console.log("🤖 ربات فایننس‌پرو شروع شد (long-polling)");
console.log(`   سینک با: ${SYNC_ID}`);
poll();
