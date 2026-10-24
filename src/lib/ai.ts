import type { Prefs } from "./data";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };
export type AISettings = Pick<Prefs, "aiApiUrl" | "aiApiKey" | "aiModel">;

const PLAIN_HTTP_ERROR = "آدرس سرویس هوش مصنوعی باید HTTPS باشد (HTTP فقط برای آدرس‌های محلی مجاز است).";

function isPrivateLanIpv4(hostname: string): boolean {
  const octets = hostname.split(".");
  if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const [first, second, third, fourth] = octets.map(Number);
  if ([first, second, third, fourth].some((part) => part < 0 || part > 255)) return false;
  return first === 10 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31);
}

export function validateAiEndpoint(url: URL): string | null {
  if (url.protocol === "https:") return null;
  if (url.protocol !== "http:") return PLAIN_HTTP_ERROR;
  const hostname = url.hostname.toLowerCase();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" ||
    hostname === "[::1]" || hostname === "::1" || isPrivateLanIpv4(hostname);
  return isLocal ? null : PLAIN_HTTP_ERROR;
}

export function hasAIConfig(prefs: AISettings): boolean {
  return !!(prefs.aiApiUrl?.trim() && prefs.aiApiKey?.trim() && prefs.aiModel?.trim());
}

export async function callAI(
  messages: AIMessage[],
  prefs: AISettings,
  options: { maxTokens?: number } = {},
): Promise<string> {
  const baseUrl = prefs.aiApiUrl?.trim().replace(/\/+$/, "").replace(/\/chat\/completions$/i, "");
  const apiKey = prefs.aiApiKey?.trim();
  const model = prefs.aiModel?.trim();
  if (!baseUrl || !apiKey || !model) {
    throw new Error("لطفاً ابتدا در تنظیمات، سرویس هوش مصنوعی، آدرس پایه، مدل و کلید معتبر وارد کنید.");
  }

  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl}/chat/completions`);
  } catch {
    throw new Error("آدرس پایهٔ سرویس هوش مصنوعی معتبر نیست.");
  }
  const endpointError = validateAiEndpoint(endpoint);
  if (endpointError) throw new Error(endpointError);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 500,
        temperature: 0.4,
      }),
    });
  } catch {
    throw new Error("اتصال به سرویس هوش مصنوعی برقرار نشد؛ اینترنت و آدرس سرویس را بررسی کنید.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("کلید API معتبر نیست یا اجازهٔ دسترسی به این مدل را ندارد.");
  }
  if (response.status === 429) {
    throw new Error("محدودیت درخواست یا اعتبار سرویس تمام شده است؛ کمی بعد دوباره تلاش کنید.");
  }
  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("سرویس هوش مصنوعی موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید.");
    }
    throw new Error("درخواست پذیرفته نشد؛ آدرس، مدل و تنظیمات سرویس را بررسی کنید.");
  }

  let result: {
    choices?: { message?: { content?: string | { type?: string; text?: string }[] } }[];
  };
  try {
    result = await response.json() as typeof result;
  } catch {
    throw new Error("پاسخ سرویس هوش مصنوعی قابل‌خواندن نبود؛ آدرس سازگار با OpenAI را بررسی کنید.");
  }

  const content = result.choices?.[0]?.message?.content;
  const text = typeof content === "string"
    ? content.trim()
    : content?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("پاسخی از مدل دریافت نشد؛ مدل انتخاب‌شده را بررسی کنید.");
  return text;
}
