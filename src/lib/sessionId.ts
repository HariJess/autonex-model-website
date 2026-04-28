const SESSION_ID_KEY = "autonex.session.id";

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Get or create a stable session ID for the current browser session.
 * Stored in sessionStorage (cleared when tab/browser closes).
 * Used for ad event deduplication and reporting.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return generateSessionId();
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing && existing.length >= 8) {
      return existing;
    }
    const fresh = generateSessionId();
    window.sessionStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
  } catch {
    return generateSessionId();
  }
}
