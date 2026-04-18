import { beforeEach, describe, expect, it } from "vitest";
import {
  DRAFT_PREFIX,
  DRAFT_TTL_DAYS,
  LEGACY_IMMONEX_PREFIX,
  getDraft,
  migrateLegacyImmonexDrafts,
  purgeExpiredDrafts,
  setDraft,
} from "@/lib/draftStorage";
import { buildPublishLocalBackupPayload } from "@/pages/publish/publishBackupPayload";

const UID = "user-1";
const DRAFT_ID = "550e8400-e29b-41d4-a716-446655440000";

function emptyPayload(step: number, draftListingId: string = DRAFT_ID) {
  return buildPublishLocalBackupPayload({
    draftListingId,
    step,
    transaction: "",
    listingType: "",
    isNewProgram: false,
    internalRef: "",
    ville: "",
    arrondissement: "",
    quartier: "",
    quartierLibre: "",
    pinLat: null,
    pinLng: null,
    title: "",
    description: "",
    priceMga: "",
    surface: "",
    rooms: "",
    bathrooms: "",
    toilets: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleFuel: "",
    vehicleTransmission: "",
    vehicleDrivetrain: "",
    vehicleCondition: "",
    vehicleSellerType: "",
    vehicleRentalMode: "",
    vehicleBodyStyle: "",
    vehicleDoors: "",
    vehicleSeats: "",
    vehicleExteriorColor: "",
    vehicleEngineDisplacement: "",
    vehicleInteriorColor: "",
    vehicleAvailabilityStatus: "",
    vehicleWhatsappPhone: "",
    vehicleIsElectric: false,
    vehicleIsHybrid: false,
    selectedFeatures: [],
    videoUrl: "",
    virtualTourUrl: "",
    selectedBoosts: [],
    agencySpotlight: false,
  });
}

describe("draftStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("set + get round-trip preserves payload and stamps timestamps", () => {
    setDraft(UID, DRAFT_ID, emptyPayload(2));
    const got = getDraft(UID, DRAFT_ID);
    expect(got).not.toBeNull();
    expect(got?.v).toBe(1);
    expect(got?.draftListingId).toBe(DRAFT_ID);
    expect(got?.step).toBe(2);
    expect(got?.savedAt).toBeTruthy();
    expect(got?.lastTouchedAt).toBeTruthy();
    // Autonex prefix is the only one written.
    expect(localStorage.getItem(`${DRAFT_PREFIX}${UID}:${DRAFT_ID}`)).not.toBeNull();
    expect(localStorage.getItem(`${LEGACY_IMMONEX_PREFIX}${UID}:${DRAFT_ID}`)).toBeNull();
  });

  it("migrateLegacyImmonexDrafts copies 2 immonex keys to autonex and removes legacy", () => {
    const isoNow = new Date().toISOString();
    const legacyA = JSON.stringify({ v: 1, savedAt: isoNow, draftListingId: "id-a" });
    const legacyB = JSON.stringify({ v: 1, savedAt: isoNow, draftListingId: "id-b" });
    localStorage.setItem(`${LEGACY_IMMONEX_PREFIX}${UID}:id-a`, legacyA);
    localStorage.setItem(`${LEGACY_IMMONEX_PREFIX}${UID}:id-b`, legacyB);

    const migrated = migrateLegacyImmonexDrafts();

    expect(migrated).toBe(2);
    // No legacy key survives.
    expect(localStorage.getItem(`${LEGACY_IMMONEX_PREFIX}${UID}:id-a`)).toBeNull();
    expect(localStorage.getItem(`${LEGACY_IMMONEX_PREFIX}${UID}:id-b`)).toBeNull();
    // Both are now under the autonex prefix with identical payloads.
    expect(localStorage.getItem(`${DRAFT_PREFIX}${UID}:id-a`)).toBe(legacyA);
    expect(localStorage.getItem(`${DRAFT_PREFIX}${UID}:id-b`)).toBe(legacyB);
  });

  it("migrateLegacyImmonexDrafts is idempotent (no-op on second run)", () => {
    expect(migrateLegacyImmonexDrafts()).toBe(0);
    expect(migrateLegacyImmonexDrafts()).toBe(0);
  });

  it("purgeExpiredDrafts removes entries older than DRAFT_TTL_DAYS and keeps fresh ones", () => {
    const now = Date.now();
    const stale = new Date(now - (DRAFT_TTL_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    const fresh = new Date(now - 60 * 1000).toISOString();

    localStorage.setItem(
      `${DRAFT_PREFIX}${UID}:stale`,
      JSON.stringify({ v: 1, savedAt: stale, lastTouchedAt: stale, draftListingId: "stale" }),
    );
    localStorage.setItem(
      `${DRAFT_PREFIX}${UID}:fresh`,
      JSON.stringify({ v: 1, savedAt: fresh, lastTouchedAt: fresh, draftListingId: "fresh" }),
    );

    const purged = purgeExpiredDrafts();

    expect(purged).toBe(1);
    expect(localStorage.getItem(`${DRAFT_PREFIX}${UID}:stale`)).toBeNull();
    expect(localStorage.getItem(`${DRAFT_PREFIX}${UID}:fresh`)).not.toBeNull();
  });

  it("purgeExpiredDrafts uses savedAt as fallback when lastTouchedAt is absent (pre-TTL entries)", () => {
    const now = Date.now();
    const stale = new Date(now - (DRAFT_TTL_DAYS + 2) * 24 * 60 * 60 * 1000).toISOString();
    // Pre-TTL entry: no lastTouchedAt field.
    localStorage.setItem(
      `${DRAFT_PREFIX}${UID}:pre-ttl`,
      JSON.stringify({ v: 1, savedAt: stale, draftListingId: "pre-ttl" }),
    );

    expect(purgeExpiredDrafts()).toBe(1);
    expect(localStorage.getItem(`${DRAFT_PREFIX}${UID}:pre-ttl`)).toBeNull();
  });
});
