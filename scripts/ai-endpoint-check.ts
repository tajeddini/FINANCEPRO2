import assert from "node:assert/strict";
import { validateAiEndpoint } from "../src/lib/ai";

const errorMessage = "آدرس سرویس هوش مصنوعی باید HTTPS باشد (HTTP فقط برای آدرس‌های محلی مجاز است).";
const cases: { url: string; allowed: boolean }[] = [
  { url: "https://openrouter.ai/api/v1", allowed: true },
  { url: "https://generativelanguage.googleapis.com/v1beta/openai/", allowed: true },
  { url: "http://localhost:11434/v1", allowed: true },
  { url: "http://192.168.1.20:8080/v1", allowed: true },
  { url: "http://example.com/v1", allowed: false },
  { url: "ftp://x", allowed: false },
];

for (const testCase of cases) {
  const result = validateAiEndpoint(new URL(testCase.url));
  assert.equal(result === null, testCase.allowed, testCase.url);
  if (!testCase.allowed) assert.equal(result, errorMessage);
  console.log(`PASS ${testCase.url} ${testCase.allowed ? "OK" : "REJECTED"}`);
}
console.log(`Passed ${cases.length} AI endpoint checks.`);
