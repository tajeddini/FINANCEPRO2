/* ---------- چاپ / خروجی PDF ----------
   وب/PWA  → همان window.print() (دیالوگ چاپ/ذخیرهٔ مرورگر)
   اندروید → WebView دیالوگ چاپ ندارد؛ پس از صفحه «عکس» می‌گیریم
             (html2canvas-pro — متن فارسی و رنگ‌های مدرن را درست رندر می‌کند)
             و با jsPDF یک PDF چندصفحه‌ای A4 می‌سازیم و ذخیره/اشتراک می‌گذاریم. */
import { isNativePlat, exportFile } from "./native-files";

/* سایز A4 با dpi=96 */
const PAGE_W = 794;
const PAGE_H = 1123;

/**
 * چاپ یک عنصر — در وب دیالوگ چاپ، در اندروید ساخت و ذخیرهٔ PDF.
 * @param el عنصری که از آن خروجی گرفته می‌شود (مثلاً کل صفحهٔ گزارش)
 * @param filename نام فایل PDF
 */
export async function printOrPdf(el: HTMLElement | null, filename: string): Promise<void> {
  if (!isNativePlat()) {
    window.print();
    return;
  }
  if (!el) return;

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  /* صبر تا فونت‌های فارسی کامل لود شده باشند */
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch { /* ignore */ }

  const canvas = await html2canvas(el, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
    /* در نسخهٔ کپی‌شده برای عکس‌گرفتن، دکمه‌ها و عناصر «چاپ‌نشدنی» حذف شوند */
    onclone: (doc) => {
      doc.querySelectorAll("[data-nopdf]").forEach((n) => n.remove());
    },
  });

  const img = canvas.toDataURL("image/jpeg", 0.92);

  /* نسبتِ کوچک‌کردن عرض به اندازهٔ A4 */
  const ratio = PAGE_W / canvas.width;
  const scaledH = canvas.height * ratio;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [PAGE_W, PAGE_H],
    hotfixes: ["px_scaling"],
  });

  /* برش تصویر بلند به صفحه‌های A4 */
  let y = 0;
  let page = 0;
  while (y < scaledH) {
    if (page > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");
    pdf.addImage(img, "JPEG", 0, -y, PAGE_W, scaledH);
    y += PAGE_H;
    page++;
  }

  const blob = pdf.output("blob");
  await exportFile(filename.endsWith(".pdf") ? filename : `${filename}.pdf`, blob, "application/pdf");
}
