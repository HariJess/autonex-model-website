import { describe, expect, it } from "vitest";
import {
  mapPublishWithCreditsError,
  parsePublishWithCreditsPayload,
} from "@/lib/publishWithCredits";

describe("mapPublishWithCreditsError", () => {
  it("maps insufficient credits", () => {
    expect(mapPublishWithCreditsError("P0001: insufficient_credits")).toBe("insufficient_credits");
  });

  it("maps not owner", () => {
    expect(mapPublishWithCreditsError("42501: not_owner")).toBe("not_owner");
  });

  it("maps listing not found", () => {
    expect(mapPublishWithCreditsError("P0002: listing_not_found")).toBe("listing_not_found");
  });

  it("maps already published", () => {
    expect(mapPublishWithCreditsError("P0001: already_published")).toBe("already_published");
  });
});

describe("parsePublishWithCreditsPayload", () => {
  it("parses success payload", () => {
    const parsed = parsePublishWithCreditsPayload(
      {
        ok: true,
        listing_id: "listing-1",
        status: "active",
        spent_credits: 220,
        message: "published",
      },
      "fallback",
    );
    expect(parsed?.ok).toBe(true);
    expect(parsed?.listingId).toBe("listing-1");
    expect(parsed?.finalStatus).toBe("active");
    expect(parsed?.spentCredits).toBe(220);
  });

  it("rejects non-active payloads", () => {
    const parsed = parsePublishWithCreditsPayload(
      {
        ok: true,
        listing_id: "listing-1",
        status: "draft",
      },
      "fallback",
    );
    expect(parsed).toBeNull();
  });
});
