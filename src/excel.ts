/* ---------- خروجی اکسل حرفه‌ای چندبرگی با ExcelJS + CSV + ICS ---------- */
import ExcelJS from "exceljs";
import { getTags, type AppState, type Tx } from "./lib/data";
import { faDate, jalaliDateStr, toEnDigits } from "./lib/utils";

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const PINE = "FF0D2C24";
const GRAY = "FF87A496";
const ROW_A = "FFF4F9F5";
const ROW_B = "FFFFFFFF";
const BORDER = "FFD7E4DB";
const NUM_FMT = "#,##0";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER } },
  bottom: { style: "thin", color: { argb: BORDER } },
  right: { style: "thin", color: { argb: BORDER } },
  left: { style: "thin", color: { argb: BORDER } },
};

function makeSheet(wb: ExcelJS.Workbook, name: string, headers: { h: string; w: number }[]) {
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, showGridLines: false }] });
  ws.columns = headers.map((c, i) => ({ header: c.h, key: `c${i}`, width: c.w }));
  const hr = ws.getRow(1);
  hr.height = 26;
  hr.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Vazirmatn" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PINE } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });
  ws.views = [{ rightToLeft: true, showGridLines: false, state: "frozen", ySplit: 1 }];
  return ws;
}

function zebra(ws: ExcelJS.Worksheet, fromRow: number, toRow: number, numCols: number[], moneyCols: number[] = []) {
  for (let r = fromRow; r <= toRow; r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > ws.columnCount) return;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: r % 2 ? ROW_A : ROW_B } };
      cell.border = thinBorder;
      cell.font = { size: 10.5, name: "Vazirmatn" };
      cell.alignment = { vertical: "middle", horizontal: numCols.includes(col) ? "center" : "right" };
      if (moneyCols.includes(col) && typeof cell.value === "number") cell.numFmt = NUM_FMT;
    });
    row.height = 20;
  }
}

function totalRow(ws: ExcelJS.Worksheet, label: string, value: number, col: number, color = PINE) {
  const r = ws.addRow([]);
  r.height = 24;
  const lc = r.getCell(1);
  lc.value = label;
  lc.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Vazirmatn" };
  lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  lc.alignment = { horizontal: "right", vertical: "middle" };
  for (let i = 2; i < col; i++) {
    const c = r.getCell(i);
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  }
  const vc = r.getCell(col);
  vc.value = value;
  vc.numFmt = NUM_FMT;
  vc.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Vazirmatn" };
  vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  vc.alignment = { horizontal: "center", vertical: "middle" };
  r.eachCell({ includeEmpty: true }, (c) => { c.border = thinBorder; });
}

/* ---------- برگهٔ خلاصه ---------- */
function summarySheet(wb: ExcelJS.Workbook, s: AppState, txs: Tx[], periodLabel: string) {
  const ws = wb.addWorksheet("خلاصه", { views: [{ rightToLeft: true, showGridLines: false }] });
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 22;

  const title = ws.getRow(2);
  title.getCell(2).value = "گزارش مدیریت مالی — فایننس‌پرو";
  title.getCell(2).font = { bold: true, size: 18, color: { argb: PINE }, name: "Lalezar" };
  title.height = 34;

  const sub = ws.getRow(3);
  sub.getCell(2).value = `بازهٔ گزارش: ${periodLabel} · تاریخ تولید: ${jalaliDateStr()}`;
  sub.getCell(2).font = { size: 10.5, color: { argb: GRAY }, name: "Vazirmatn" };

  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const netWorth = s.accounts.reduce((a, x) => a + x.balance, 0)
    + s.assets.reduce((a, x) => a + x.nowPrice * x.qty, 0)
    + s.currencies.reduce((a, x) => a + x.rate * x.qty, 0)
    - s.debts.filter((d) => d.kind === "debt").reduce((a, d) => a + (d.amount - d.paid), 0)
    + s.debts.filter((d) => d.kind === "credit").reduce((a, d) => a + (d.amount - d.paid), 0);

  let r = 5;
  const kpi = (label: string, value: number, color: string) => {
    const row = ws.getRow(r++);
    row.height = 24;
    const lc = row.getCell(2);
    lc.value = label;
    lc.font = { bold: true, size: 11.5, name: "Vazirmatn", color: { argb: PINE } };
    lc.border = thinBorder;
    lc.alignment = { vertical: "middle" };
    const vc = row.getCell(3);
    vc.value = value;
    vc.numFmt = NUM_FMT + " [$تومان]";
    vc.font = { bold: true, size: 12, name: "Vazirmatn", color: { argb: color } };
    vc.border = thinBorder;
    vc.alignment = { horizontal: "center", vertical: "middle" };
  };
  kpi("جمع درآمد بازه", income, "FF1F7A56");
  kpi("جمع هزینهٔ بازه", expense, "FFC24A3D");
  kpi("تراز بازه (درآمد − هزینه)", income - expense, income - expense >= 0 ? "FF1F7A56" : "FFC24A3D");
  kpi("ارزش خالص دارایی‌ها", netWorth, PINE);

  r += 1;
  const h1 = ws.getRow(r++);
  h1.getCell(2).value = "برترین دسته‌های هزینه";
  h1.getCell(2).font = { bold: true, size: 13, color: { argb: PINE }, name: "Lalezar" };
  const map = new Map<string, number>();
  for (const t of txs.filter((x) => x.type === "expense")) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  const top = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  for (const [catId, sum] of top) {
    const row = ws.getRow(r++);
    row.getCell(2).value = s.categories.find((c) => c.id === catId)?.name ?? "—";
    row.getCell(2).font = { size: 10.5, name: "Vazirmatn" };
    row.getCell(3).value = sum;
    row.getCell(3).numFmt = NUM_FMT;
    row.getCell(3).font = { size: 10.5, name: "Vazirmatn" };
    row.getCell(3).alignment = { horizontal: "center" };
    const pc = row.getCell(4);
    pc.value = expense > 0 ? sum / expense : 0;
    pc.numFmt = "0.0%";
    pc.font = { size: 10.5, name: "Vazirmatn", color: { argb: GRAY } };
    pc.alignment = { horizontal: "center" };
  }

  r += 1;
  const h2 = ws.getRow(r++);
  h2.getCell(2).value = "موجودی حساب‌ها";
  h2.getCell(2).font = { bold: true, size: 13, color: { argb: PINE }, name: "Lalezar" };
  for (const a of s.accounts) {
    const row = ws.getRow(r++);
    row.getCell(2).value = `${a.name} (${a.type})`;
    row.getCell(2).font = { size: 10.5, name: "Vazirmatn" };
    row.getCell(3).value = a.balance;
    row.getCell(3).numFmt = NUM_FMT;
    row.getCell(3).font = { bold: true, size: 10.5, name: "Vazirmatn", color: { argb: a.balance < 0 ? "FFC24A3D" : PINE } };
    row.getCell(3).alignment = { horizontal: "center" };
  }
}

/* ---------- خروجی اصلی ---------- */
export async function exportExcel(s: AppState, opts?: { txs?: Tx[]; periodLabel?: string }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FinancePro";
  wb.lastModifiedBy = "FinancePro";
  const txs = [...(opts?.txs ?? s.transactions)].sort((a, b) => (b.date + b.createdAt).toString().localeCompare((a.date + a.createdAt).toString()));
  const periodLabel = opts?.periodLabel ?? "همهٔ دوره‌ها";
  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);

  summarySheet(wb, s, txs, periodLabel);

  const tags = getTags(s);
  const tagName = (id?: string) => tags.find((x) => x.id === id)?.label ?? "—";
  const w1 = makeSheet(wb, "تراکنش‌ها", [
    { h: "ردیف", w: 7 }, { h: "تاریخ شمسی", w: 17 }, { h: "نوع", w: 10 }, { h: "دسته", w: 17 },
    { h: "حساب", w: 17 }, { h: "توضیحات", w: 30 }, { h: "تگ", w: 17 }, { h: "روش پرداخت", w: 13 }, { h: "مبلغ (تومان)", w: 17 }, { h: "منبع", w: 10 },
  ]);
  txs.forEach((t, i) => {
    w1.addRow({
      c0: i + 1, c1: faDate(t.date), c2: t.type === "income" ? "درآمد" : "هزینه",
      c3: s.categories.find((c) => c.id === t.categoryId)?.name ?? "—",
      c4: s.accounts.find((a) => a.id === t.accountId)?.name ?? "—",
      c5: t.note || t.title || "—", c6: tagName(t.tag), c7: t.payMethod ?? "—",
      c8: t.type === "income" ? t.amount : -t.amount,
      c9: t.source === "bot" ? "ربات" : "برنامه",
    });
    const row = w1.getRow(i + 2);
    const typeCell = row.getCell(3);
    typeCell.font = { bold: true, size: 10.5, name: "Vazirmatn", color: { argb: t.type === "income" ? "FF1F7A56" : "FFC24A3D" } };
    const amtCell = row.getCell(9);
    amtCell.font = { bold: true, size: 10.5, name: "Vazirmatn", color: { argb: t.type === "income" ? "FF1F7A56" : "FFC24A3D" } };
  });
  zebra(w1, 2, txs.length + 1, [1, 3, 9], [9]);
  totalRow(w1, `جمع درآمد بازهٔ «${periodLabel}»`, income, 9, "FF1F7A56");
  totalRow(w1, `جمع هزینهٔ بازهٔ «${periodLabel}»`, expense, 9, "FFC24A3D");
  totalRow(w1, "تراز نهایی", income - expense, 9, PINE);
  w1.autoFilter = { from: "A1", to: `J${txs.length + 1}` };

  const w2 = makeSheet(wb, "گزارش دسته‌ها", [
    { h: "دسته", w: 22 }, { h: "نوع", w: 10 }, { h: "تعداد تراکنش", w: 14 }, { h: "جمع (تومان)", w: 18 }, { h: "سهم از کل", w: 12 },
  ]);
  const catMap = new Map<string, { sum: number; n: number; type: string }>();
  for (const t of txs) {
    const e = catMap.get(t.categoryId) ?? { sum: 0, n: 0, type: t.type === "income" ? "درآمد" : "هزینه" };
    e.sum += t.amount; e.n++;
    catMap.set(t.categoryId, e);
  }
  const totalAll = income + expense;
  let i2 = 2;
  for (const [catId, e] of [...catMap.entries()].sort((a, b) => b[1].sum - a[1].sum)) {
    w2.addRow({
      c0: s.categories.find((c) => c.id === catId)?.name ?? "—", c1: e.type, c2: e.n, c3: e.sum,
      c4: totalAll > 0 ? e.sum / totalAll : 0,
    });
    w2.getRow(i2).getCell(5).numFmt = "0.0%";
    i2++;
  }
  zebra(w2, 2, i2 - 1, [2, 3, 5], [4]);

  const w3 = makeSheet(wb, "حساب‌ها", [
    { h: "نام حساب", w: 24 }, { h: "نوع", w: 18 }, { h: "موجودی اولیه", w: 18 }, { h: "ماندهٔ فعلی", w: 18 },
  ]);
  s.accounts.forEach((a) => w3.addRow({ c0: a.name, c1: a.type, c2: a.initial, c3: a.balance }));
  zebra(w3, 2, s.accounts.length + 1, [2], [3, 4]);
  totalRow(w3, "جمع ماندهٔ حساب‌ها", s.accounts.reduce((x, a) => x + a.balance, 0), 4);

  const w4 = makeSheet(wb, "بدهی‌ها و طلب‌ها", [
    { h: "نوع", w: 10 }, { h: "طرف حساب", w: 22 }, { h: "مبلغ کل", w: 16 }, { h: "پرداخت‌شده", w: 16 },
    { h: "باقی‌مانده", w: 16 }, { h: "سررسید", w: 15 }, { h: "یادداشت", w: 26 },
  ]);
  s.debts.forEach((d) => w4.addRow({
    c0: d.kind === "debt" ? "بدهی" : "طلب", c1: d.person, c2: d.amount, c3: d.paid,
    c4: d.amount - d.paid, c5: d.due ? faDate(d.due) : "—", c6: d.note ?? "—",
  }));
  zebra(w4, 2, s.debts.length + 1, [1], [3, 4, 5]);

  const w5 = makeSheet(wb, "اقساط", [
    { h: "عنوان", w: 26 }, { h: "مبلغ کل", w: 16 }, { h: "قسط ماهانه", w: 15 }, { h: "تعداد ماه", w: 11 },
    { h: "پرداخت‌شده", w: 12 }, { h: "پیشرفت", w: 10 },
  ]);
  s.installments.forEach((x, idx) => {
    w5.addRow({ c0: x.title, c1: x.total, c2: x.amountPerMonth, c3: x.months, c4: x.paidCount, c5: x.months > 0 ? x.paidCount / x.months : 0 });
    w5.getRow(idx + 2).getCell(6).numFmt = "0%";
  });
  zebra(w5, 2, s.installments.length + 1, [4, 5, 6], [1, 2]);

  const w6 = makeSheet(wb, "بودجه‌ها", [
    { h: "دسته", w: 22 }, { h: "سقف ماهانه", w: 17 }, { h: "خرجِ بازه", w: 17 }, { h: "باقی‌مانده", w: 17 }, { h: "وضعیت", w: 13 },
  ]);
  s.budgets.forEach((b, idx) => {
    const spent = txs.filter((t) => t.categoryId === b.categoryId && t.type === "expense").reduce((x, t) => x + t.amount, 0);
    w6.addRow({
      c0: s.categories.find((c) => c.id === b.categoryId)?.name ?? "—", c1: b.limit, c2: spent,
      c3: b.limit - spent, c4: spent > b.limit ? "مازاد بر سقف" : "در محدوده",
    });
    const st = w6.getRow(idx + 2).getCell(5);
    st.font = { bold: true, size: 10.5, name: "Vazirmatn", color: { argb: spent > b.limit ? "FFC24A3D" : "FF1F7A56" } };
  });
  zebra(w6, 2, s.budgets.length + 1, [5], [2, 3, 4]);

  const w7 = makeSheet(wb, "دارایی‌ها و اهداف", [
    { h: "بخش", w: 16 }, { h: "عنوان", w: 26 }, { h: "ارزش ۱", w: 18 }, { h: "ارزش ۲", w: 18 }, { h: "توضیح", w: 22 },
  ]);
  s.savings_goals.forEach((g) => w7.addRow({ c0: "هدف پس‌انداز", c1: g.title, c2: g.saved, c3: g.target, c4: g.deadline ? `مهلت: ${faDate(g.deadline)}` : "—" }));
  s.assets.forEach((a) => w7.addRow({ c0: "دارایی", c1: a.name, c2: a.buyPrice * a.qty, c3: a.nowPrice * a.qty, c4: `تعداد: ${a.qty}` }));
  s.currencies.forEach((c) => w7.addRow({ c0: "ارز", c1: `${c.name} (${c.symbol})`, c2: c.qty, c3: c.rate * c.qty, c4: `نرخ: ${c.rate.toLocaleString("fa-IR")}` }));
  s.subscriptions.forEach((x) => w7.addRow({ c0: "اشتراک", c1: x.name, c2: x.amount, c3: x.cycle === "monthly" ? x.amount * 12 : x.amount, c4: `تمدید: ${faDate(x.renew)}` }));
  zebra(w7, 2, s.savings_goals.length + s.assets.length + s.currencies.length + s.subscriptions.length + 1, [1], [3, 4]);

  const w8 = makeSheet(wb, "برچسب‌ها", [
    { h: "برچسب", w: 24 }, { h: "توضیح", w: 34 }, { h: "تعداد تراکنش", w: 14 }, { h: "جمع (تومان)", w: 17 }, { h: "سهم از هزینه", w: 13 },
  ]);
  const tagExpense = txs.filter((t) => t.type === "expense");
  tags.forEach((tg, idx) => {
    const list = tagExpense.filter((t) => t.tag === tg.id);
    const sum = list.reduce((a, t) => a + t.amount, 0);
    w8.addRow({ c0: tg.label, c1: tg.desc || "—", c2: list.length, c3: sum, c4: expense > 0 ? sum / expense : 0 });
    w8.getRow(idx + 2).getCell(5).numFmt = "0.0%";
  });
  zebra(w8, 2, tags.length + 1, [3, 5], [4]);

  const w9 = makeSheet(wb, "یادداشت‌ها", [
    { h: "عنوان", w: 26 }, { h: "دسته", w: 14 }, { h: "تاریخ شمسی", w: 16 }, { h: "سنجاق", w: 9 }, { h: "متن", w: 50 },
  ]);
  s.notes.forEach((n) => w9.addRow({ c0: n.title, c1: n.cat ?? "—", c2: faDate(n.date), c3: n.pinned ? "بله" : "—", c4: n.body || "—" }));
  zebra(w9, 2, s.notes.length + 1, [4], []);

  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `financepro-${periodLabel.replace(/\s+/g, "-")}.xlsx`);
}

/* ---------- CSV ---------- */
export function exportCSV(s: AppState) {
  const rows = [["date", "type", "title", "category", "amount"]];
  for (const t of s.transactions) {
    rows.push([
      t.date,
      t.type,
      `"${(t.note || t.title).replace(/"/g, '""')}"`,
      s.categories.find((c) => c.id === t.categoryId)?.name ?? "",
      String(t.amount),
    ]);
  }
  const blob = new Blob(["\uFEFF" + rows.map((r) => r.join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  download(blob, "financepro-transactions.csv");
}

/** ورود CSV — فرمت: date,type,title,category,amount */
export function parseCSV(text: string, s: AppState): {
  rows: { date: string; type: "income" | "expense"; title: string; categoryId: string; amount: number }[];
  errors: number;
} {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const rows: { date: string; type: "income" | "expense"; title: string; categoryId: string; amount: number }[] = [];
  let errors = 0;
  const start = /date\s*,/i.test(lines[0] ?? "") ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].match(/(".*?"|[^,]+)/g)?.map((p) => p.replace(/^"|"$/g, "").trim()) ?? [];
    if (parts.length < 5) {
      errors++;
      continue;
    }
    const [date, type, title, catName, amount] = parts;
    const ndate = toEnDigits(date).trim();
    const namount = toEnDigits(amount).replace(/[٬،,\s]/g, "");
    const isIncome = /income|درآمد/i.test(type);
    const category = s.categories.find((c) => c.name === catName) ??
      s.categories.find((c) => c.type === (isIncome ? "income" : "expense"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ndate) || !title || !namount) {
      errors++;
      continue;
    }
    rows.push({ date: ndate, type: isIncome ? "income" : "expense", title, categoryId: category?.id ?? "", amount: parseFloat(namount) || 0 });
  }
  return { rows, errors };
}

/* ---------- ICS برای قرارها ---------- */
export function exportICS(s: AppState) {
  const esc = (x: string) => x.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FinancePro//FA//"];
  for (const a of s.appointments) {
    const [y, m, d] = a.date.split("-");
    const [hh, mm] = (a.time || "09:00").split(":");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@financepro`,
      `DTSTART:${y}${m}${d}T${hh}${mm}00`,
      `SUMMARY:${esc(a.title)}`,
      a.note ? `DESCRIPTION:${esc(a.note)}` : "",
      `STATUS:${a.done ? "COMPLETED" : "CONFIRMED"}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  download(new Blob([lines.filter(Boolean).join("\r\n")], { type: "text/calendar" }), "financepro-appointments.ics");
}
