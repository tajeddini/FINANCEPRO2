import assert from "node:assert/strict";
import { REMOVED_PREF_FIELDS, sanitizeStateForExport } from "../src/lib/backup-sanitize";
import type { AppState } from "../src/lib/data";

const state: AppState = {
  accounts: [],
  categories: [],
  tags: [],
  transactions: [],
  transfers: [],
  debts: [],
  installments: [],
  budgets: [],
  payment_methods: [],
  recurring: [],
  savings_goals: [],
  appointments: [],
  notes: [],
  cheques: [],
  splits: [],
  challenges: [],
  currencies: [],
  assets: [],
  subscriptions: [],
  activity_logs: [],
  telegram_users: [],
  trash: [],
  tombstones: [],
  prefs: {
    theme: "dark",
    accent: "violet",
    pin: "fake-pin-7391",
    botToken: "fake-bot-token-secret",
    syncKey: "fake-cloud-key-secret",
    aiApiKey: "fake-ai-key-secret",
    syncId: "safe-sync-id",
    syncUrl: "https://safe.example.test",
    aiApiUrl: "https://safe-ai.example.test",
    aiModel: "safe-model",
    aiProvider: "custom",
    pinEnabled: true,
    notifyEnabled: true,
  },
  lastSync: 0,
  rev: 1,
};

const output = sanitizeStateForExport(state);
const json = JSON.stringify(output);
for (const secret of ["fake-pin-7391", "fake-bot-token-secret", "fake-cloud-key-secret", "fake-ai-key-secret"]) {
  assert.equal(json.includes(secret), false, `${secret} must not be exported`);
}
for (const field of REMOVED_PREF_FIELDS) {
  assert.equal(Object.hasOwn(output.prefs, field), false, `${field} must be removed`);
}
assert.equal(output.prefs.theme, "dark");
assert.equal(output.prefs.accent, "violet");
assert.equal(output.prefs.syncId, "safe-sync-id");
assert.equal(output.prefs.syncUrl, "https://safe.example.test");
assert.equal(output.prefs.aiProvider, "custom");
assert.equal(state.prefs.pin, "fake-pin-7391", "the source state must not be mutated");
console.log(`Passed backup sanitization: removed ${REMOVED_PREF_FIELDS.join(", ")}; retained harmless preferences.`);
