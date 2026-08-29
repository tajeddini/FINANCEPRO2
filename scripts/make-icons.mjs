/* =====================================================================
   ساخت آیکون‌های PNG برنامه (PWA) — بدون هیچ وابستگی خارجی
   ---------------------------------------------------------------------
   آیکون را پیکسل‌به‌پیکسل رسم و با zlib داخلی Node به PNG کدگذاری می‌کند.
   خروجی: public/icon-192.png و public/icon-512.png
   این اسکریپت هنگام load شدن vite.config.js اجرا می‌شود تا آیکون‌ها قبل از
   کپی‌شدنِ publicDir در dist موجود باشند.
   ===================================================================== */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(root, "public");

/* ---------- CRC32 (برای چانک‌های PNG) ---------- */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};

const encodePNG = (w, h, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   /* bit depth */
  ihdr[9] = 6;   /* RGBA */
  /* هر سطر با بایت فیلتر ۰ شروع می‌شود */
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

/* ---------- ترسیم ---------- */
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const BG_TOP = hex("#0f3a2e");
const BG_BOT = hex("#071b16");
const GOLD = hex("#e8b04b");
const MINT = hex("#2fb98a");

/* فاصلهٔ نقطه تا پاره‌خط (برای رسم خطوط ضخیم) */
const distSeg = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
};

function drawIcon(size) {
  const s = size / 512; /* همهٔ مختصات بر مبنای ۵۱۲ طراحی و مقیاس می‌شوند */
  const buf = Buffer.alloc(size * size * 4);
  /* مسیرِ نمودارِ «M» (همان لوگوی icon.svg) */
  const path = [
    [148, 336], [148, 186], [256, 282], [364, 186], [364, 336],
  ].map(([x, y]) => [x * s, y * s]);
  const stroke = 36 * s;
  const dotC = [256 * s, 140 * s], dotR = 26 * s;
  const baseY = 392 * s, baseX1 = 120 * s, baseX2 = 392 * s, baseW = 20 * s;
  const r = 112 * s; /* شعاع گوشه‌های مربع */

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      /* ماسک مربعِ گوشه‌گرد */
      const cx = Math.max(r, Math.min(size - r, px));
      const cy = Math.max(r, Math.min(size - r, py));
      let alpha = Math.hypot(px - cx, py - cy) <= r ? 1 : 0;
      if (alpha === 0) continue;

      /* پس‌زمینهٔ گرادیان عمودی */
      const g = py / size;
      let cr = BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * g;
      let cg = BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * g;
      let cb = BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * g;

      /* خط پایهٔ نعنایی (نیمه‌شفاف) */
      const dBase = distSeg(px, py, baseX1, baseY, baseX2, baseY);
      const aBase = Math.max(0, Math.min(1, baseW / 2 + 0.8 - dBase)) * 0.5;
      cr = cr * (1 - aBase) + MINT[0] * aBase;
      cg = cg * (1 - aBase) + MINT[1] * aBase;
      cb = cb * (1 - aBase) + MINT[2] * aBase;

      /* نمودار طلایی */
      let d = Infinity;
      for (let i = 0; i < path.length - 1; i++)
        d = Math.min(d, distSeg(px, py, path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]));
      const aGold = Math.max(0, Math.min(1, stroke / 2 + 0.8 - d));
      cr = cr * (1 - aGold) + GOLD[0] * aGold;
      cg = cg * (1 - aGold) + GOLD[1] * aGold;
      cb = cb * (1 - aGold) + GOLD[2] * aGold;

      /* نقطهٔ نعنایی */
      const dDot = Math.hypot(px - dotC[0], py - dotC[1]);
      const aDot = Math.max(0, Math.min(1, dotR + 0.8 - dDot));
      cr = cr * (1 - aDot) + MINT[0] * aDot;
      cg = cg * (1 - aDot) + MINT[1] * aDot;
      cb = cb * (1 - aDot) + MINT[2] * aDot;

      const o = (y * size + x) * 4;
      buf[o] = Math.round(cr);
      buf[o + 1] = Math.round(cg);
      buf[o + 2] = Math.round(cb);
      buf[o + 3] = Math.round(alpha * 255);
    }
  }
  return encodePNG(size, size, buf);
}

if (!existsSync(PUB)) mkdirSync(PUB, { recursive: true });
const p192 = join(PUB, "icon-192.png");
const p512 = join(PUB, "icon-512.png");
/* اگر آیکون‌ها موجود باشند دوباره ساخته نمی‌شوند (برای بازسازی، فایل‌ها را پاک کنید) */
if (!existsSync(p192) || !existsSync(p512)) {
  if (!existsSync(p192)) writeFileSync(p192, drawIcon(192));
  if (!existsSync(p512)) writeFileSync(p512, drawIcon(512));
  /* eslint-disable-next-line no-console */
  console.log("🎨 آیکون‌های PWA ساخته شد: public/icon-192.png و public/icon-512.png");
}
