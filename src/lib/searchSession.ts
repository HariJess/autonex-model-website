import { AUTONEX_STORAGE_KEYS, LEGACY_IMMONEX_STORAGE_KEYS } from "@/lib/localStorageLegacyKeys";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-browser id for anonymized product analytics (search signals). */
export function getSearchSessionId(): string {
  try {
    let id = localStorage.getItem(AUTONEX_STORAGE_KEYS.searchAnalyticsSession);
    if (!id) {
      const legacy = localStorage.getItem(LEGACY_IMMONEX_STORAGE_KEYS.searchAnalyticsSession);
      if (legacy) {
        id = legacy;
        localStorage.setItem(AUTONEX_STORAGE_KEYS.searchAnalyticsSession, legacy);
        localStorage.removeItem(LEGACY_IMMONEX_STORAGE_KEYS.searchAnalyticsSession);
      }
    }
    if (!id) {
      id = randomId();
      localStorage.setItem(AUTONEX_STORAGE_KEYS.searchAnalyticsSession, id);
    }
    return id;
  } catch {
    return randomId();
  }
}
