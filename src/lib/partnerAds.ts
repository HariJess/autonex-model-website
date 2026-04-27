import { MONETIZATION_SLOT_META } from "@/config/monetization";

export const PARTNER_AD_PLACEMENT_KEYS = [
  "homeBillboard",
  "homeSponsorStrip",
  "searchTopBanner",
  "listingSponsor",
  "homeModal",
] as const;

export type PartnerAdPlacementKey = (typeof PARTNER_AD_PLACEMENT_KEYS)[number];

export const PARTNER_AD_AUDIENCES = ["all", "guests", "authenticated"] as const;
export type PartnerAdAudience = (typeof PARTNER_AD_AUDIENCES)[number];

export type PublicPartnerCampaign = {
  id: string;
  advertiser_name: string;
  placement_key: string;
  media_type: string;
  image_url: string;
  image_url_mobile: string | null;
  destination_url: string | null;
  cta_label: string | null;
  audience: PartnerAdAudience;
};

export function isPartnerAdPlacementKey(value: string): value is PartnerAdPlacementKey {
  return (PARTNER_AD_PLACEMENT_KEYS as readonly string[]).includes(value);
}

export function isSlotConfiguredAsPartnerAd(key: string): boolean {
  if (!(key in MONETIZATION_SLOT_META)) return false;
  const meta = MONETIZATION_SLOT_META[key as keyof typeof MONETIZATION_SLOT_META];
  return meta.family === "partner_advertising";
}

export function selectFirstCampaign<T>(rows: T[] | null | undefined): T | null {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
