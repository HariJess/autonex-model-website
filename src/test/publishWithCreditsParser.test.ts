import { describe, it, expect } from "vitest";
import { parsePublishWithCreditsPayload } from "@/lib/publishWithCredits";

/**
 * Lot 9.1e — Regression guards pour le parser de la RPC
 * `publish_listing_with_credits`.
 *
 * Contexte : la RPC renvoie `status = 'active'` pour un dealer vérifié
 * (fast-track) et `status = 'pending_review'` pour un particulier (modération
 * manuelle). Avant le fix, le parser n'acceptait que `'active'`, ce qui
 * faisait paraître les publications particulier comme des échecs alors
 * qu'elles avaient réussi côté DB.
 *
 * Ces tests empêchent la régression.
 */
describe("parsePublishWithCreditsPayload", () => {
  const FALLBACK_ID = "fallback-xxx";

  it("accepte le statut active (dealer vérifié)", () => {
    const result = parsePublishWithCreditsPayload(
      {
        ok: true,
        listing_id: "abc",
        status: "active",
        spent_credits: 100,
        message: "published",
      },
      FALLBACK_ID,
    );
    expect(result).not.toBeNull();
    expect(result?.finalStatus).toBe("active");
    expect(result?.listingId).toBe("abc");
    expect(result?.spentCredits).toBe(100);
  });

  it("accepte le statut pending_review (particulier)", () => {
    // REGRESSION GUARD : avant le fix 9.1e, ce cas retournait null (faux
    // positif d'échec qui déclenchait le toast rouge côté PublishPage).
    const result = parsePublishWithCreditsPayload(
      {
        ok: true,
        listing_id: "abc",
        status: "pending_review",
        spent_credits: 100,
        message: "pending_review",
      },
      FALLBACK_ID,
    );
    expect(result).not.toBeNull();
    expect(result?.finalStatus).toBe("pending_review");
    expect(result?.listingId).toBe("abc");
    expect(result?.spentCredits).toBe(100);
  });

  it("rejette les autres statuts (ex: draft)", () => {
    const result = parsePublishWithCreditsPayload(
      {
        ok: true,
        listing_id: "abc",
        status: "draft",
        spent_credits: 0,
        message: "",
      },
      FALLBACK_ID,
    );
    expect(result).toBeNull();
  });

  it("rejette ok=false", () => {
    const result = parsePublishWithCreditsPayload(
      {
        ok: false,
        listing_id: "abc",
        status: "active",
        spent_credits: 0,
        message: "error",
      },
      FALLBACK_ID,
    );
    expect(result).toBeNull();
  });

  it("rejette data=null", () => {
    const result = parsePublishWithCreditsPayload(null, FALLBACK_ID);
    expect(result).toBeNull();
  });

  it("utilise le fallbackListingId si listing_id absent", () => {
    const result = parsePublishWithCreditsPayload(
      { ok: true, status: "pending_review", spent_credits: 100 },
      FALLBACK_ID,
    );
    expect(result).not.toBeNull();
    expect(result?.listingId).toBe(FALLBACK_ID);
  });
});
