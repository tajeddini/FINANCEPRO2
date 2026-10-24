import type { AppState, Prefs } from "./data";

export const REMOVED_PREF_FIELDS = ["pin", "botToken", "syncKey", "aiApiKey"] as const satisfies readonly (keyof Prefs)[];

export function sanitizeStateForExport(state: AppState): AppState {
  const sanitized = structuredClone(state);
  if (sanitized.prefs && typeof sanitized.prefs === "object") {
    for (const field of REMOVED_PREF_FIELDS) delete sanitized.prefs[field];
  }
  return sanitized;
}
