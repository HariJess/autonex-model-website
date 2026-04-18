import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { wrapRpc } from "@/lib/monitoring";
import {
  AGENCY_SPOTLIGHT_CREDIT_COST,
  BOOST_CREDIT_COSTS,
  LISTING_PUBLISH_CREDIT_COST,
  type PurchasableBoostType,
} from "@/config/monetization";

export const PRICING_KEYS = [
  "publish_listing",
  "boost_urgent",
  "boost_daily_bump",
  "boost_featured",
  "boost_top",
  "agency_spotlight",
] as const;

export type PricingKey = (typeof PRICING_KEYS)[number];
export type PricingMap = Record<PricingKey, number>;

/**
 * Compiled-in fallback. Mirrors the credit_pricing table seed.
 * The source of truth is the DB: usePricing() fetches get_pricing() and
 * overrides these values. This fallback only kicks in during the initial
 * load or when the network is unavailable (Madagascar launch window).
 */
export const FALLBACK_PRICING: PricingMap = {
  publish_listing: LISTING_PUBLISH_CREDIT_COST,
  boost_urgent: BOOST_CREDIT_COSTS.urgent,
  boost_daily_bump: BOOST_CREDIT_COSTS.daily_bump,
  boost_featured: BOOST_CREDIT_COSTS.featured,
  boost_top: BOOST_CREDIT_COSTS.top,
  agency_spotlight: AGENCY_SPOTLIGHT_CREDIT_COST,
};

const BOOST_TO_PRICING_KEY: Record<PurchasableBoostType, PricingKey> = {
  urgent: "boost_urgent",
  daily_bump: "boost_daily_bump",
  featured: "boost_featured",
  top: "boost_top",
};

const PRICING_KEY_SET = new Set<PricingKey>(PRICING_KEYS);

type PricingRow = { key?: unknown; amount?: unknown; description?: unknown };

const isPricingMap = (v: unknown): v is PricingMap =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export function usePricing() {
  const query = useQuery({
    queryKey: ["credit-pricing"],
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<PricingMap> => {
      const { data, error } = await wrapRpc("get_pricing", () =>
        supabase.rpc("get_pricing"),
      );
      if (error) throw error;
      const rows: PricingRow[] = Array.isArray(data) ? (data as PricingRow[]) : [];
      const overrides: Partial<PricingMap> = {};
      for (const row of rows) {
        if (typeof row.key === "string" && typeof row.amount === "number") {
          if (PRICING_KEY_SET.has(row.key as PricingKey)) {
            overrides[row.key as PricingKey] = row.amount;
          }
        }
      }
      return { ...FALLBACK_PRICING, ...overrides };
    },
  });

  const prices: PricingMap = isPricingMap(query.data) ? query.data : FALLBACK_PRICING;

  const boostPrice = (type: PurchasableBoostType): number =>
    prices[BOOST_TO_PRICING_KEY[type]];

  const totalBoosts = (selected: PurchasableBoostType[]): number =>
    selected.reduce((sum, t) => sum + boostPrice(t), 0);

  const totalPublication = (
    selected: PurchasableBoostType[],
    options?: { agencySpotlight?: boolean },
  ): number => {
    let sum = prices.publish_listing + totalBoosts(selected);
    if (options?.agencySpotlight) sum += prices.agency_spotlight;
    return sum;
  };

  return {
    prices,
    boostPrice,
    totalBoosts,
    totalPublication,
    isLoading: query.isLoading,
    error: query.error,
  };
}
