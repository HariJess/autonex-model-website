import { supabase } from "@/integrations/supabase/client";
import type { SearchFilters } from "@/types/search";
import { getSearchSessionId } from "@/lib/searchSession";

export type SearchAnalyticsPayload = {
  filters: SearchFilters;
  exactResultCount: number;
  hadZeroExact: boolean;
  showedSimilarFallback: boolean;
  showedAlsoLike: boolean;
  path?: string;
};

let lastSentKey = "";

function payloadKey(p: SearchAnalyticsPayload): string {
  return JSON.stringify({
    f: p.filters,
    e: p.exactResultCount,
    z: p.hadZeroExact,
    s: p.showedSimilarFallback,
    a: p.showedAlsoLike,
    path: p.path,
  });
}

/** Fire-and-forget: logs one row per distinct search outcome (deduped while params unchanged). */
export function recordSearchAnalytics(payload: SearchAnalyticsPayload): void {
  const key = payloadKey(payload);
  if (key === lastSentKey) return;
  lastSentKey = key;

  const f = payload.filters;
  const row = {
    session_id: getSearchSessionId(),
    ville: f.ville || null,
    quartiers: f.quartiers.length ? f.quartiers : null,
    quartier_libre: f.quartierLibre.trim() || null,
    transaction_type: f.transaction || null,
    property_types: f.types.length ? f.types : null,
    price_min: f.priceMin || null,
    price_max: f.priceMax || null,
    surface_min: f.mileageMinKm || null,
    surface_max: f.mileageMaxKm || null,
    rooms: f.trimVersionIndices.length ? f.trimVersionIndices : null,
    bathrooms: f.doorCounts.length ? f.doorCounts : null,
    equipments: f.equipments.length ? f.equipments : null,
    exact_result_count: payload.exactResultCount,
    had_zero_exact: payload.hadZeroExact,
    showed_similar_fallback: payload.showedSimilarFallback,
    showed_also_like: payload.showedAlsoLike,
    path: payload.path ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : null),
  };

  void supabase.from("search_analytics_events").insert(row).then(({ error }) => {
    if (error) {
      console.warn("[search analytics]", error.message);
    }
  });
}
