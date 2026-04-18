import { describe, expect, it } from "vitest";
import {
  AUTONEX_STORAGE_KEYS,
  LEGACY_IMMONEX_STORAGE_KEYS,
  publishDraftStorageKey,
} from "@/lib/localStorageLegacyKeys";

describe("localStorage legacy key helpers", () => {
  it("builds stable publish-draft keys per prefix", () => {
    const uid = "user-1";
    const draft = "550e8400-e29b-41d4-a716-446655440000";
    expect(publishDraftStorageKey(AUTONEX_STORAGE_KEYS.publishDraftPrefix, uid, draft)).toBe(
      `autonex.publishDraft.v1:${uid}:${draft}`,
    );
    expect(publishDraftStorageKey(LEGACY_IMMONEX_STORAGE_KEYS.publishDraftPrefix, uid, draft)).toBe(
      `immonex.publishDraft.v1:${uid}:${draft}`,
    );
  });
});
