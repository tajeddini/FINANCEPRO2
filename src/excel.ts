/* ---------- خروجی اکسل چندبرگی با ExcelJS + CSV + ICS ---------- */
import ExcelJS from "exceljs";
import type { AppState } from "./lib/data";
import { faDate } from "./lib/utils";

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportExcel(s: AppState) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FinancePro";

  const styleHead = (ws: ExcelJS.Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FF071B16" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8B04B" } };
  };

  // برگهٔ تراکنش‌ها
  const w1 = wb.addWorksheet("تراکنش‌ها", { views: [{ rightToLeft: true }] });
  w1.columns = [
    { header: "تاریخ", key: "date", width: 18 },
    { header: "نوع", key: "type", width: 10 },
    { header: "عنوان", key: "title", width: 30 },
    { header: "دسته", key: "cat", width: 16 },
    { header: "حساب", key: "acc", width: 16 },
    { header: "مبلغ (تومان)", key: "amount", width: 16 },
    { header: "روش پرداخت", key: "pay", width: 14 },
  ];
  for (const t of [...s.transactions].sort((a, b) => b.date.localeCompare(a.date))) {
    w1.addRow({
      date: faDate(t.date),
      type: t.type === "income" ? "درآمد" : "هزینه",
      title: t.title,
      cat: s.categories.find((c) => c.id === t.categoryId)?.name ?? "—",
      acc: s.accounts.find((a) => a.id === t.accountId)?.name ?? "—",
      amount: t.amount,
      pay: t.payMethod ?? "—",
    });
  }
  styleHead(w1);

  // برگهٔ حساب‌ها
  const w2 = wb.addWorksheet("حساب‌ها", { views: [{ rightToLeft: true }] });
  w2.columns = [
    { header: "نام حساب", key: "name", width: 22 },
    { header: "نوع", key: "type", width: 16 },
    { header: "مانده (تومان)", key: "balance", width: 18 },
  ];
  for (const a of s.accounts) w2.addRow({ name: a.name, type: a.type, balance: a.balance });
  styleHead(w2);

  // برگهٔ بودجه‌ها
  const w3 = wb.addWorksheet("بودجه‌ها", { views: [{ rightToLeft: true }] });
  w3.columns = [
    { header: "دسته", key: "cat", width: 22 },
    { header: "سقف ماهانه", key: "limit", width: 18 },
  ];
  for (const b of s.budgets)
    w3.addRow({ cat: s.categories.find((c) => c.id === b.categoryId)?.name ?? "—", limit: b.limit });
  styleHead(w3);

  // برگهٔ بدهی‌ها و اقساط
  const w4 = wb.addWorksheet("بدهی‌ها و اقساط", { views: [{ rightToLeft: true }] });
  w4.columns = [
    { header: "نوع", key: "kind", width: 12 },
    { header: "طرف حساب", key: "who", width: 22 },
    { header: "مبلغ", key: "amount", width: 16 },
    { header: "پرداخت‌شده", key: "paid", width: 16 },
  ];
  for (const d of s.debts)
    w4.addRow({ kind: d.kind === "debt" ? "بدهی" : "طلب", who: d.person, amount: d.amount, paid: d.paid });
  for (const i of s.installments)
    w4.addRow({ kind: "قسط", who: i.title, amount: i.total, paid: i.paidCount * i.amountPerMonth });
  styleHead(w4);

  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "financepro-report.xlsx");
}

/* ---------- CSV ---------- */
export function exportCSV(s: AppState) {
  const rows = [["date", "type", "title", "category", "amount"]];
  for (const t of s.transactions) {
    rows.push([
      t.date,
      t.type,
      `"${t.title.replace(/"/g, '""')}"`,
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
    const isIncome = /income|درآمد/i.test(type);
    const category = s.categories.find((c) => c.name === catName) ??
      s.categories.find((c) => c.type === (isIncome ? "income" : "expense"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title || !amount) {
      errors++;
      continue;
    }
    rows.push({ date, type: isIncome ? "income" : "expense", title, categoryId: category?.id ?? "", amount: parseFloat(amount) || 0 });
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
