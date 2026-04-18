/**
 * Historique Immonex → AutoNex : clés `localStorage` actuelles et anciennes.
 * Les lectures écrivent progressivement vers les clés AutoNex sans casser les sessions existantes.
 */
export const AUTONEX_STORAGE_KEYS = {
  publishDraftPrefix: "autonex.publishDraft.v1",
  currency: "autonex_currency",
  searchAnalyticsSession: "autonex_analytics_session_id",
} as const;

/** Préfixes / clés encore présents chez les utilisateurs ayant utilisé l’app avant le rebranding. */
export const LEGACY_IMMONEX_STORAGE_KEYS = {
  publishDraftPrefix: "immonex.publishDraft.v1",
  currency: "immonex_currency",
  searchAnalyticsSession: "immonex_analytics_session_id",
} as const;

export function publishDraftStorageKey(prefix: string, userId: string, draftListingId: string): string {
  return `${prefix}:${userId}:${draftListingId}`;
}
