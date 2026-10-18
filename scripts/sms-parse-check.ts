import assert from "node:assert/strict";
import { parseBankSMS } from "../src/lib/sms";

const receivedAt = new Date(2026, 5, 1, 12, 51).getTime();

const tests: { name: string; raw: string; receivedAt?: number; expected: (parsed: ReturnType<typeof parseBankSMS>) => void }[] = [
  {
    name: "Resalat first account withdrawal",
    raw: "10.10070145.1\n-1,837,880\n06/19_01:30\nمانده:2,111,364,214",
    expected: (parsed) => {
      assert.ok(parsed);
      assert.equal(parsed.source, "resalat");
      assert.equal(parsed.accountIdentifier, "10.10070145.1");
      assert.equal(parsed.type, "expense");
      assert.equal(parsed.amount, 1_837_880);
    },
  },
  {
    name: "Resalat second account deposit",
    raw: "10.10091455.1\n+49,218,750\n06/19_01:30\nمانده:2,111,364,214",
    expected: (parsed) => {
      assert.ok(parsed);
      assert.equal(parsed.accountIdentifier, "10.10091455.1");
      assert.equal(parsed.type, "income");
      assert.equal(parsed.amount, 49_218_750);
    },
  },
  {
    name: "Melli explicit deposit and withdrawal",
    raw: "بانك ملي ايران\nانتقال:+90,000,000\nحساب:83008\nمانده:310,654,858\n0601-12:51",
    receivedAt,
    expected: (parsed) => {
      assert.ok(parsed);
      assert.equal(parsed.accountIdentifier, "83008");
      assert.equal(parsed.type, "income");
      assert.equal(parsed.amount, 90_000_000);
      const withdrawal = parseBankSMS("بانك ملي ايران\nبرداشت:-16,000,000\nحساب:83008\nمانده:294,654,858\n0601-12:51", receivedAt);
      assert.ok(withdrawal);
      assert.equal(withdrawal.type, "expense");
      assert.equal(withdrawal.amount, 16_000_000);
    },
  },
  {
    name: "Melli Persian digits and spaced account",
    raw: "بانك ملي ايران\nانتقال:+۹۰,۰۰۰,۰۰۰\nحساب: ۸۳۰۰۸\nمانده:۳۱۰,۶۵۴,۸۵۸\n۰۶۰۱-۱۲:۵۱",
    receivedAt,
    expected: (parsed) => {
      assert.ok(parsed);
      assert.equal(parsed.accountIdentifier, "83008");
      assert.equal(parsed.type, "income");
      assert.equal(parsed.amount, 90_000_000);
      assert.equal(parsed.balance, 310_654_858);
    },
  },
  {
    name: "Melli ambiguous unsigned transfer is rejected",
    raw: "بانك ملي ايران\nانتقال:90,000,000\nحساب:83008\nمانده:310,654,858\n0601-12:51",
    receivedAt,
    expected: (parsed) => assert.equal(parsed, null),
  },
  {
    name: "Melli missing date requires receivedAt",
    raw: "بانك ملي ايران\nواریز:+90,000,000\nحساب:83008\nمانده:310,654,858",
    expected: (parsed) => assert.equal(parsed, null),
  },
  {
    name: "Melli missing date uses receivedAt",
    raw: "بانك ملي ايران\nواریز:+90,000,000\nحساب:83008\nمانده:310,654,858",
    receivedAt,
    expected: (parsed) => {
      assert.ok(parsed);
      assert.equal(parsed.date.getTime(), receivedAt);
    },
  },
  {
    name: "Melli malformed date uses receivedAt",
    raw: "بانك ملي ايران\nواریز:+90,000,000\nحساب:83008\nمانده:310,654,858\n1399-12:88",
    receivedAt,
    expected: (parsed) => {
      assert.ok(parsed);
      assert.equal(parsed.date.getTime(), receivedAt);
    },
  },
  {
    name: "Account and balance numbers are never selected as amount",
    raw: "بانك ملي ايران\nحساب:83008\nمانده:310,654,858\n0601-12:51",
    receivedAt,
    expected: (parsed) => assert.equal(parsed, null),
  },
  {
    name: "Unrelated OTP and promotional SMS are rejected",
    raw: "کد تأیید شما ۱۲۳۴۵۶ است. خرید ویژه با تخفیف ۹۰٪!",
    expected: (parsed) => assert.equal(parsed, null),
  },
  {
    name: "Unambiguous withdrawal label supplies expense hint",
    raw: "بانك ملي ايران\nبرداشت:16,000,000\nحساب:83008\nمانده:294,654,858\n0601-12:51",
    receivedAt,
    expected: (parsed) => {
      assert.ok(parsed);
      assert.equal(parsed.type, "expense");
      assert.equal(parsed.amount, 16_000_000);
    },
  },
  {
    name: "Unambiguous deposit label supplies income hint",
    raw: "بانك ملي ايران\nواریز:90,000,000\nحساب:83008\nمانده:400,654,858\n0601-12:51",
    receivedAt,
    expected: (parsed) => {
      assert.ok(parsed);
      assert.equal(parsed.type, "income");
      assert.equal(parsed.amount, 90_000_000);
    },
  },
];

for (const test of tests) {
  test.expected(parseBankSMS(test.raw, test.receivedAt));
  console.log(`PASS ${test.name}`);
}

console.log(`Passed ${tests.length} SMS parser checks.`);
