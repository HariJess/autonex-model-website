import { describe, expect, it, vi } from "vitest";
import type { PersistDraftFormSnapshot } from "@/pages/publish/publishPersistDraftOperation";
import { runPersistDraftOperation } from "@/pages/publish/publishPersistDraftOperation";

/** Used only for early-return guard tests (never reaches form usage). */
const dummyForm = {} as PersistDraftFormSnapshot;

function baseInput() {
  return {
    stepOverride: undefined as number | undefined,
    step: 0,
    draftListingId: "550e8400-e29b-41d4-a716-446655440000",
    draftHydrated: true,
    isPublishedListingEdit: false,
    listingModerationStatus: null as string | null,
    pendingPhotosCount: 0,
    progressFingerprint: "fp",
    queryClient: { invalidateQueries: vi.fn() } as unknown as import("@tanstack/react-query").QueryClient,
    t: ((k: string) => k) as import("i18next").TFunction,
    serverPhotosRef: { current: [] },
    editPriceBaselineRef: { current: null },
    editOriginalPriceRef: { current: null },
    baselineMaterialSnapshotRef: { current: "" },
    lastPersistedFingerprintRef: { current: "" },
    setSaveStatus: vi.fn(),
    setSaveError: vi.fn(),
    setLastSavedAt: vi.fn(),
    setListingModerationStatus: vi.fn(),
    form: dummyForm,
  };
}

describe("runPersistDraftOperation guards", () => {
  it("returns false when userId is missing", async () => {
    const ok = await runPersistDraftOperation({
      ...baseInput(),
      userId: undefined,
    });
    expect(ok).toBe(false);
  });

  it("returns false when draftListingId is missing", async () => {
    const ok = await runPersistDraftOperation({
      ...baseInput(),
      userId: "owner-1",
      draftListingId: null,
    });
    expect(ok).toBe(false);
  });

  it("returns false when draft is not hydrated yet", async () => {
    const ok = await runPersistDraftOperation({
      ...baseInput(),
      userId: "owner-1",
      draftHydrated: false,
    });
    expect(ok).toBe(false);
  });
});
