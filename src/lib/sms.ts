import { Capacitor } from "@capacitor/core";
import { ReadSMS } from "capacitor-sms-reader";

export type SmsTransactionType = "income" | "expense";

export interface SmsAccountConfig {
  accountMatch: string;
  bankLabel: string;
}

export interface SmsParse {
  id: string;
  raw: string;
  bankLabel: string;
  accountIdentifier: string;
  type: SmsTransactionType;
  amount: number;
  amountToman: number;
  date: Date;
  dateISO?: string;
  balance?: number;
  source: "resalat" | "melli";
  note?: string;
  confidence: "high" | "medium" | "low";
  cardTail?: string;
  accountNo?: string;
  merchant?: string;
  balanceToman?: number;
  reference?: string;
  unit?: "rial" | "toman" | "unknown";
  unitInferred?: boolean;
  jalali?: string;
  time?: string;
  rawAmount?: number;
  notes?: string[];
}

export interface PendingSmsTransaction {
  id: string;
  raw: string;
  parsed: SmsParse;
  createdAt: number;
  status: "pending";
}

export const SMS_ACCOUNT_MAP: SmsAccountConfig[] = [
  { accountMatch: "10.10070145.1", bankLabel: "رسالت" },
  { accountMatch: "83008", bankLabel: "بانک ملی" },
];

const normalizeSmsText = (input: string): string =>
  input
    .replace(/\r/g, "")
    .replace(/[\u200c\u200f\u200e]/g, " ")
    .replace(/[ك]/g, "ک")
    .replace(/[ي]/g, "ی")
    .trim();

const parseAmount = (value: string): number => {
  const digits = value.replace(/[٬،]/g, "").replace(/[^0-9]/g, "");
  return Number(digits || "0");
};

const buildDate = (value: string, format: "resalat" | "melli"): Date | null => {
  const patterns = format === "resalat"
    ? /^(\d{2})\/(\d{2})_(\d{2}):(\d{2})$/
    : /^(\d{2})(\d{2})-(\d{2}):(\d{2})$/;

  const match = value.match(patterns);
  if (!match) return null;

  const [, a, b, c, d] = match;
  const month = Number(a);
  const day = Number(b);
  const hour = Number(c);
  const minute = Number(d);
  const year = new Date().getFullYear();
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseResalat = (text: string): SmsParse | null => {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines[0] || !lines[0].includes("10.10070145.1")) return null;

  const amountLine = lines[1];
  const dateLine = lines[2];
  const balanceLine = lines[3];
  if (!amountLine || !dateLine || !balanceLine) return null;

  const sign = amountLine.startsWith("-") ? "-" : amountLine.startsWith("+") ? "+" : "";
  if (!sign) return null;

  const date = buildDate(dateLine, "resalat");
  if (!date) return null;

  const balance = balanceLine.startsWith("مانده:") ? parseAmount(balanceLine.replace(/^مانده:/, "")) : undefined;
  const amount = parseAmount(amountLine);

  return {
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    raw: text,
    bankLabel: "رسالت",
    accountIdentifier: "10.10070145.1",
    type: sign === "+" ? "income" : "expense",
    amount,
    amountToman: amount,
    date,
    dateISO: date.toISOString(),
    balance,
    balanceToman: balance,
    source: "resalat",
    confidence: "high",
    rawAmount: amount,
    notes: [],
    unit: "unknown",
    unitInferred: false,
  };
};

const parseBankMelli = (text: string): SmsParse | null => {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length || !text.includes("حساب:83008")) return null;

  const amountLine = lines.find((line) => /^(?:انتقال|برداشت):[+-]/.test(line));
  if (!amountLine) return null;

  const sign = amountLine.includes("-") ? "-" : amountLine.includes("+") ? "+" : "";
  if (!sign) return null;

  const amount = parseAmount(amountLine.replace(/^(?:انتقال|برداشت):/, ""));
  const balanceLine = lines.find((line) => line.startsWith("مانده:"));
  const balance = balanceLine ? parseAmount(balanceLine.replace(/^مانده:/, "")) : undefined;
  const dateLine = lines.find((line) => /^\d{4}-\d{2}:\d{2}$/.test(line));
  const date = dateLine ? buildDate(dateLine, "melli") : new Date();
  if (!date) return null;

  return {
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    raw: text,
    bankLabel: "بانک ملی",
    accountIdentifier: "83008",
    type: sign === "+" ? "income" : "expense",
    amount,
    amountToman: amount,
    date,
    dateISO: date.toISOString(),
    balance,
    balanceToman: balance,
    source: "melli",
    confidence: "high",
    rawAmount: amount,
    notes: [],
    unit: "unknown",
    unitInferred: false,
  };
};

export function parseBankSMS(raw: string): SmsParse | null {
  if (!raw || !raw.trim()) return null;
  const text = normalizeSmsText(raw);
  if (!text) return null;

  const accountMatch = SMS_ACCOUNT_MAP.find((entry) => text.includes(entry.accountMatch));
  if (!accountMatch) {
    if (/(بانک|BANK|حساب)/i.test(text)) {
      console.warn("[sms] unmatched bank-like message", { text: text.slice(0, 220) });
    }
    return null;
  }

  if (text.includes("10.10070145.1")) return parseResalat(text);
  if (text.includes("حساب:83008")) return parseBankMelli(text);
  return null;
}

export function getBankAccountLabelFromMessage(raw: string): string | undefined {
  const text = normalizeSmsText(raw);
  return SMS_ACCOUNT_MAP.find((entry) => text.includes(entry.accountMatch))?.bankLabel;
}

const PENDING_SMS_KEY = "fp_pending_sms_v1";

export function loadPendingSms(): PendingSmsTransaction[] {
  try {
    const raw = localStorage.getItem(PENDING_SMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingSmsTransaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingSms(items: PendingSmsTransaction[]) {
  try {
    localStorage.setItem(PENDING_SMS_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("fp-pending-sms-changed"));
  } catch {
    // ignore
  }
}

export function removePendingSms(id: string) {
  const items = loadPendingSms().filter((item) => item.id !== id);
  savePendingSms(items);
}

export function enqueuePendingSms(raw: string): PendingSmsTransaction | null {
  const parsed = parseBankSMS(raw);
  if (!parsed) return null;

  const pending: PendingSmsTransaction = {
    id: parsed.id,
    raw,
    parsed,
    createdAt: Date.now(),
    status: "pending",
  };

  const list = loadPendingSms();
  list.unshift(pending);
  savePendingSms(list.slice(0, 20));
  window.dispatchEvent(new CustomEvent("fp-open-sms-review", { detail: { pending } }));
  return pending;
}

export async function scanInboxForBankMessages(): Promise<PendingSmsTransaction[]> {
  if (!Capacitor.isNativePlatform()) return [];

  const inbox = await ReadSMS.getSMS({ timestamp: "0", pageSize: 200 });
  const items = Array.isArray(inbox?.value)
    ? (inbox.value ?? [])
    : [];

  const list: PendingSmsTransaction[] = [];
  for (const message of items) {
    const body = typeof message?.body === "string" ? message.body : "";
    if (!body) continue;
    const parsed = parseBankSMS(body);
    if (!parsed) continue;
    const item: PendingSmsTransaction = {
      id: parsed.id,
      raw: body,
      parsed,
      createdAt: Number(message?.date ?? Date.now()),
      status: "pending",
    };
    list.push(item);
  }

  if (list.length) {
    const current = loadPendingSms();
    const merged = [...list, ...current].slice(0, 50);
    savePendingSms(merged);
    for (const entry of list) {
      window.dispatchEvent(new CustomEvent("fp-open-sms-review", { detail: { pending: entry } }));
    }
  }

  return list;
}

export async function requestSmsPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await ReadSMS.requestPermission();
    return (result?.value ?? "denied") === "granted";
  } catch {
    return false;
  }
}

export async function checkSmsPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await ReadSMS.checkPermission();
    return (result?.value ?? "denied") === "granted";
  } catch {
    return false;
  }
}

export async function openSmsAppSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await ReadSMS.openAppSettings();
  } catch {
    // ignore
  }
}

export function startNativeSmsListener(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let remove: (() => void) | null = null;
  ReadSMS.addListener("smsReceived", ({ value }) => {
    if (!value?.body) return;
    enqueuePendingSms(value.body);
  }).then((handler) => {
    remove = () => handler.remove();
  }).catch(() => {
    remove = null;
  });

  return () => remove?.();
}

const GENERIC_WORDS = ["بانک", "حساب", "کارت", "اصلی", "جاری", "پس‌انداز", "ریال", "تومان", "ایران"];
export function matchAccountByCard<T extends { name: string }>(
  accounts: T[],
  cardTail?: string,
  accountNo?: string
): T | undefined {
  const hit = (tail: string) =>
    accounts.find((a) => {
      const digits = a.name.replace(/[^0-9]/g, "");
      return digits.length >= 4 && (digits.endsWith(tail) || digits.includes(tail));
    });
  return (cardTail && hit(cardTail)) || (accountNo && accountNo.length >= 5 && hit(accountNo)) || undefined;
}

export function matchAccountByBankName<T extends { name: string }>(
  accounts: T[],
  smsText: string
): T | undefined {
  const text = normalizeSmsText(smsText);
  for (const a of accounts) {
    const tokens = a.name
      .split(/[\s\-–٬,.0-9]+/)
      .filter((w) => w.length >= 3 && !GENERIC_WORDS.includes(w));
    if (tokens.some((w) => text.includes(w))) return a;
  }
  return undefined;
}

export const SMS_SAMPLES: { label: string; text: string }[] = [
  { label: "رسالت — واریز", text: "10.10070145.1\n+49,218,750\n06/17_19:04\nمانده:2,113,202,094" },
  { label: "رسالت — برداشت", text: "10.10070145.1\n-1,837,880\n06/19_01:30\nمانده:2,111,364,214" },
  { label: "بانک ملی — واریز", text: "بانك ملي ايران\nانتقال:+90,000,000\nحساب:83008\nمانده:310,654,858\n0601-12:51" },
  { label: "بانک ملی — برداشت", text: "بانك ملي ايران\nبرداشت:-16,000,000\nحساب:83008\nمانده:5,536,400\n0615-19:54" },
];
