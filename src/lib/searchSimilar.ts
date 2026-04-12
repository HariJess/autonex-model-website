import type { DisplayListing } from "@/types/listing";
import type { SearchFilters } from "@/types/search";
import { getVille } from "@/data/madagascar-locations";

/** Arrondissement label for a quartier name within a ville (reference data), if known. */
export function arrondissementForQuartier(villeName: string, quartierName: string): string | null {
  const v = getVille(villeName);
  if (!v) return null;
  const qLower = quartierName.trim().toLowerCase();
  for (const arr of v.arrondissements) {
    if (arr.quartiers.some((q) => q.name.toLowerCase() === qLower)) {
      return arr.name;
    }
  }
  return null;
}

function roomMatch(listingRooms: number | null, filterRooms: number[]): boolean {
  if (filterRooms.length === 0) return true;
  const r = listingRooms ?? -1;
  return filterRooms.some((fr) => {
    if (fr === 5) return r >= 5;
    return r === fr || r === fr - 1 || r === fr + 1;
  });
}

function bathroomMatch(listingBath: number | null, filterBath: number[]): boolean {
  if (filterBath.length === 0) return true;
  const b = listingBath ?? -1;
  return filterBath.some((fb) => {
    if (fb === 4) return b >= 4;
    return b === fb || b === fb - 1 || b === fb + 1;
  });
}

function priceTolerance(price: number, min: number, max: number): number {
  let penalty = 0;
  if (min > 0 && price < min) {
    const gap = min - price;
    penalty += Math.min(gap / Math.max(min, 1), 0.5) * 40;
  }
  if (max > 0 && price > max) {
    const gap = price - max;
    penalty += Math.min(gap / Math.max(max, 1), 0.5) * 40;
  }
  return penalty;
}

function surfaceTolerance(surface: number | null, min: number, max: number): number {
  if (surface == null || surface <= 0) return 8;
  let penalty = 0;
  if (min > 0 && surface < min) {
    penalty += Math.min((min - surface) / Math.max(min, 1), 0.4) * 25;
  }
  if (max > 0 && surface > max) {
    penalty += Math.min((surface - max) / Math.max(max, 1), 0.4) * 25;
  }
  return penalty;
}

/**
 * Score how well a listing matches relaxed criteria (for « biens similaires » / recommandations).
 * Higher is better. Not shown to users as a « precision score ».
 */
export function similarListingScore(
  listing: DisplayListing,
  filters: SearchFilters,
  opts: { userQuartierNames: string[]; sameArrHints: Set<string> }
): number {
  let score = 0;

  if (filters.transaction && listing.transaction === filters.transaction) {
    score += 120;
  } else if (filters.transaction) {
    return 0;
  }

  if (filters.types.length > 0) {
    if (filters.types.includes(listing.type)) score += 55;
    else score += 8;
  }

  if (filters.ville) {
    if (listing.ville === filters.ville) score += 45;
    else score += 5;
  }

  const lq = (listing.quartier ?? "").toLowerCase();
  const lql = (listing.quartier_libre ?? "").toLowerCase();
  const city = filters.ville;

  if (opts.userQuartierNames.length > 0 && city) {
    const userArrs = new Set<string>();
    for (const uq of opts.userQuartierNames) {
      const ar = arrondissementForQuartier(city, uq);
      if (ar) userArrs.add(ar);
    }
    const listArr = listing.arrondissement?.trim();
    if (listArr && userArrs.has(listArr)) score += 35;

    let quartierOverlap = false;
    for (const uq of opts.userQuartierNames) {
      const ul = uq.toLowerCase();
      if (lq.includes(ul) || lql.includes(ul)) {
        quartierOverlap = true;
        break;
      }
    }
    if (quartierOverlap) score += 50;
    else {
      for (const h of opts.sameArrHints) {
        if (lq.includes(h.toLowerCase()) || lql.includes(h.toLowerCase())) {
          score += 22;
          break;
        }
      }
    }
  }

  const price = listing.price_mga;
  score -= priceTolerance(price, filters.priceMin, filters.priceMax);
  score -= surfaceTolerance(listing.surface, filters.surfaceMin, filters.surfaceMax);

  if (!roomMatch(listing.rooms, filters.rooms)) score -= 35;
  if (!bathroomMatch(listing.bathrooms, filters.bathrooms)) score -= 20;

  const created = listing.created_at ? new Date(listing.created_at).getTime() : 0;
  score += Math.min(created / 1e12, 15);

  const vr = listing.visibility_rank_score ?? 0;
  score += Math.min(vr / 1e14, 12);

  return score;
}

export function rankSimilarListings(
  pool: DisplayListing[],
  filters: SearchFilters,
  excludeIds: Set<string>,
  limit: number
): DisplayListing[] {
  const userQuartierNames = filters.quartiers;
  const sameArrHints = new Set<string>();
  if (filters.ville && userQuartierNames.length > 0) {
    for (const qn of userQuartierNames) {
      const ar = arrondissementForQuartier(filters.ville, qn);
      if (ar) {
        for (const arr of getVille(filters.ville)?.arrondissements ?? []) {
          if (arr.name === ar) {
            arr.quartiers.forEach((q) => sameArrHints.add(q.name));
          }
        }
      }
    }
  }

  const scored = pool
    .filter((l) => !excludeIds.has(l.id))
    .map((l) => ({
      l,
      score: similarListingScore(l, filters, { userQuartierNames, sameArrHints }),
    }))
    .filter((x) => x.score > 8)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.l);
}
