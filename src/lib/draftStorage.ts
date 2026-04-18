/**
 * Single gateway to localStorage for publish drafts.
 *
 * Every read/write/remove for "publishDraft.v1" entries MUST go through this
 * module. Direct localStorage.* calls elsewhere are forbidden (and enforced
 * by an ESLint rule — see eslint.config.js). This is what keeps the prefix
 * unified (autonex.* only) and prevents phantom-UUID loops when a draft is
 * deleted server-side but its local backup survives.
 *
 * The stored payload schema (LocalPublishBackupV1) remains defined in
 * publishDraft.ts to avoid a circular import; this module only handles key
 * layout, serialization, and legacy migration.
 */

import type { LocalPublishBackupV1 } from "@/lib/publishDraft";

export const DRAFT_PREFIX = "autonex.publishDraft.v1:";
export const LEGACY_IMMONEX_PREFIX = "immonex.publishDraft.v1:";

/**
 * Drafts not touched for this long are considered abandoned and swept at
 * boot. Exposed for the unit test; the runtime purge reads this constant.
 */
export const DRAFT_TTL_DAYS = 30;

export type DraftIdentifier = { userId: string; draftId: string };

function draftKey(userId: string, draftId: string): string {
  return `${DRAFT_PREFIX}${userId}:${draftId}`;
}

function legacyDraftKey(userId: string, draftId: string): string {
  return `${LEGACY_IMMONEX_PREFIX}${userId}:${draftId}`;
}

function parseKey(key: string, prefix: string): DraftIdentifier | null {
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const colonIdx = rest.indexOf(":");
  if (colonIdx < 0) return null;
  const userId = rest.slice(0, colonIdx);
  const draftId = rest.slice(colonIdx + 1);
  if (!userId || !draftId) return null;
  return { userId, draftId };
}

export function getDraft(userId: string, draftId: string): LocalPublishBackupV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(userId, draftId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalPublishBackupV1;
    if (parsed.v !== 1 || !parsed.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDraft(
  userId: string,
  draftId: string,
  data: Omit<LocalPublishBackupV1, "v" | "savedAt" | "lastTouchedAt"> & { step: number },
): void {
  if (typeof window === "undefined") return;
  try {
    const now = new Date().toISOString();
    const payload: LocalPublishBackupV1 = {
      v: 1,
      savedAt: now,
      lastTouchedAt: now,
      ...data,
    };
    window.localStorage.setItem(draftKey(userId, draftId), JSON.stringify(payload));
    // Evict any legacy entry for the same logical draft so the prefix split
    // converges on autonex.* even if migrateLegacyImmonexDrafts hasn't run.
    window.localStorage.removeItem(legacyDraftKey(userId, draftId));
  } catch {
    /* quota / private mode / sandboxed */
  }
}

export function removeDraft(userId: string, draftId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(userId, draftId));
    window.localStorage.removeItem(legacyDraftKey(userId, draftId));
  } catch {
    /* ignore */
  }
}

export function listDrafts(): DraftIdentifier[] {
  if (typeof window === "undefined") return [];
  try {
    const out: DraftIdentifier[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      const parsed = parseKey(k, DRAFT_PREFIX);
      if (parsed) out.push(parsed);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Copies any remaining `immonex.publishDraft.v1:*` entry to its `autonex.*`
 * counterpart and removes the legacy key. Called once at app boot so that
 * accumulated pre-rebranding drafts are surfaced again under the canonical
 * prefix instead of lingering forever.
 *
 * Idempotent: running it a second time is a no-op.
 * If an `autonex.*` entry already exists for a given key, the legacy value
 * is discarded (the current one wins).
 *
 * @returns number of legacy entries migrated or cleaned up.
 */
/**
 * Sweeps drafts whose last save timestamp is older than `DRAFT_TTL_DAYS`.
 * Falls back to `savedAt` when a pre-TTL entry has no `lastTouchedAt`.
 * Safe under localStorage quota/private-mode errors.
 *
 * @returns number of entries purged.
 */
export function purgeExpiredDrafts(ttlDays: number = DRAFT_TTL_DAYS): number {
  if (typeof window === "undefined") return 0;
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  try {
    const candidates: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) candidates.push(k);
    }
    let purged = 0;
    for (const key of candidates) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      let stamp: number | null = null;
      try {
        const parsed = JSON.parse(raw) as LocalPublishBackupV1;
        const iso = parsed.lastTouchedAt ?? parsed.savedAt;
        const t = iso ? Date.parse(iso) : NaN;
        stamp = Number.isFinite(t) ? t : null;
      } catch {
        stamp = null;
      }
      // Corrupt/timestamp-less entries are swept too — nothing to protect.
      if (stamp == null || now - stamp > ttlMs) {
        window.localStorage.removeItem(key);
        purged += 1;
      }
    }
    if (import.meta.env.DEV && purged > 0) {
      console.info(`[draftStorage] purged ${purged} draft(s) older than ${ttlDays} days`);
    }
    return purged;
  } catch {
    return 0;
  }
}

export function migrateLegacyImmonexDrafts(): number {
  if (typeof window === "undefined") return 0;
  try {
    const legacyKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(LEGACY_IMMONEX_PREFIX)) legacyKeys.push(k);
    }
    let migrated = 0;
    for (const legacyKey of legacyKeys) {
      const value = window.localStorage.getItem(legacyKey);
      const newKey = DRAFT_PREFIX + legacyKey.slice(LEGACY_IMMONEX_PREFIX.length);
      if (value != null && window.localStorage.getItem(newKey) == null) {
        window.localStorage.setItem(newKey, value);
      }
      window.localStorage.removeItem(legacyKey);
      migrated += 1;
    }
    if (import.meta.env.DEV && migrated > 0) {
      console.info(`[draftStorage] migrated ${migrated} legacy immonex draft(s) to autonex prefix`);
    }
    return migrated;
  } catch {
    return 0;
  }
}
