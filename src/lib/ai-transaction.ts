import { callAI, type AIMessage } from "./ai";
import type { Category, Prefs } from "./data";
import { addDaysISO, isoToJalali, jalaliToday, todayISO } from "./utils";

export interface TransactionDraft {
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  date: string;
  title: string;
}

function dateFacts() {
  const today = todayISO();
  return [-2, -1, 0].map((offset) => {
    const date = addDaysISO(today, offset);
    const jalali = isoToJalali(date);
    const formatted = `${jalali.jy}/${String(jalali.jm).padStart(2, "0")}/${String(jalali.jd).padStart(2, "0")}`;
    const relative = offset === 0 ? "امروز" : offset === -1 ? "دیروز" : "پریروز";
    return { relative, jalali: formatted, date };
  });
}

function parseDraft(response: string, categories: Category[]): TransactionDraft {
  let value: unknown;
  try {
    const text = response.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    value = JSON.parse(text);
  } catch {
    throw new Error("متوجه نشدم، لطفاً واضح‌تر بنویسید یا دستی ثبت کنید.");
  }

  if (!value || typeof value !== "object") {
    throw new Error("متوجه نشدم، لطفاً واضح‌تر بنویسید یا دستی ثبت کنید.");
  }
  const result = value as Record<string, unknown>;
  const amount = typeof result.amount === "number" ? result.amount : Number(result.amount);
  const type = result.type;
  const date = result.date;
  const title = typeof result.title === "string" ? result.title.trim().slice(0, 80) : "";
  const parsedDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00`)
    : null;
  if (
    !Number.isFinite(amount) || amount <= 0 ||
    (type !== "income" && type !== "expense") ||
    !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date ||
    !title
  ) {
    throw new Error("متوجه نشدم، لطفاً واضح‌تر بنویسید یا دستی ثبت کنید.");
  }

  const matchingCategory = categories.find((category) =>
    category.id === result.categoryId && category.type === type
  ) ?? categories.find((category) =>
    category.type === type && /^(متفرقه|سایر)$/.test(category.name.trim())
  ) ?? categories.find((category) => category.type === type);
  if (!matchingCategory) {
    throw new Error("برای این نوع تراکنش دسته‌ای تعریف نشده است؛ ابتدا دسته‌ای مناسب بسازید.");
  }

  return { amount: Math.round(amount), type, categoryId: matchingCategory.id, date, title };
}

export async function parseTransactionText(
  sentence: string,
  categories: Category[],
  prefs: Prefs,
): Promise<TransactionDraft> {
  const input = sentence.trim();
  if (!input) throw new Error("متن تراکنش را بنویسید.");

  const today = jalaliToday();
  const todayJalali = `${today.jy}/${String(today.jm).padStart(2, "0")}/${String(today.jd).padStart(2, "0")}`;
  const messages: AIMessage[] = [
    {
      role: "system",
      content: "از متن فارسی فقط یک تراکنش مالی استخراج کن. فقط JSON معتبر و بدون توضیح یا markdown بده. schema دقیق: {\"amount\": number, \"type\": \"income\"|\"expense\", \"categoryId\": string, \"date\": \"YYYY-MM-DD\", \"title\": string}. کلیدهای JSON باید دقیقاً همین کلیدهای انگلیسی باقی بمانند، اما مقدار فیلدهای متنی آزاد مثل title را به همان زبان متن ورودی بنویس و ترجمه یا آوانویسی نکن؛ اگر متن ورودی فارسی است، عنوان نیز فارسی باشد. amount مبلغ نهایی به تومان و عدد مثبت باشد؛ اگر واحد «ریال» است بر ۱۰ تقسیم کن، اگر «تومان/تومن» گفته شده همان مقدار، و اگر واحد نیامده تومان فرض کن. واژه‌های امروز/دیروز/پریروز را با جدول تاریخ زیر به ISO میلادی تبدیل کن؛ اگر تاریخ نسبی نیامده تاریخ امروز است. برای تاریخ صریح نیز ISO میلادی بده. categoryId حتماً باید یکی از شناسه‌های دسته‌های داده‌شده و متناسب با نوع باشد؛ دستهٔ جدید نساز و نزدیک‌ترین دسته را انتخاب کن. type دریافتی مثل حقوق/واریز/فروش income و پرداخت/خرید expense است. title کوتاه و تمیز، مثل نام فروشگاه یا مورد تراکنش باشد. اگر مبلغ یا نوع از متن قابل‌تشخیص نیست، JSON با amount برابر 0 بده.",
    },
    {
      role: "user",
      content: `امروز شمسی: ${todayJalali}\nتبدیل تاریخ‌های نسبی به ISO: ${JSON.stringify(dateFacts())}\nدسته‌های مجاز: ${JSON.stringify(categories.map(({ id, name, type }) => ({ id, name, type })))}\nمتن کاربر: ${input}`,
    },
  ];
  const response = await callAI(messages, prefs, { maxTokens: 120 });
  return parseDraft(response, categories);
}
