import { describe, expect, it } from "vitest";
import {
  isPartnerAdPlacementKey,
  isSlotConfiguredAsPartnerAd,
  PARTNER_AD_PLACEMENT_KEYS,
  selectFirstCampaign,
} from "@/lib/partnerAds";

describe("partner ads helpers", () => {
  it("valide les clés de placement V1", () => {
    for (const k of PARTNER_AD_PLACEMENT_KEYS) {
      expect(isPartnerAdPlacementKey(k)).toBe(true);
      expect(isSlotConfiguredAsPartnerAd(k)).toBe(true);
    }
    expect(isPartnerAdPlacementKey("searchSidebar")).toBe(false);
  });

  it("sélectionne la première campagne active retournée", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    expect(selectFirstCampaign(rows)).toEqual({ id: "a" });
    expect(selectFirstCampaign([])).toBeNull();
  });
});
