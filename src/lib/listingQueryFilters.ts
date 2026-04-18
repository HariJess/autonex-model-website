import type { ListingType, TransactionType } from "@/types/listing";
import { resolveVehicleTypeFilters } from "@/data/automotiveCatalog";

/** Chain methods used by listing filters — shared by full row select and `{ count: 'exact', head: true }` queries */
export type FilterableListingQuery = {
  eq(column: string, value: unknown): FilterableListingQuery;
  gte(column: string, value: unknown): FilterableListingQuery;
  lte(column: string, value: unknown): FilterableListingQuery;
  or(filters: string): FilterableListingQuery;
  in(column: string, values: readonly unknown[]): FilterableListingQuery;
  ilike(column: string, pattern: string): FilterableListingQuery;
};

export interface ListingsFilters {
  transaction?: string;
  vehicleTypes?: string[];
  types?: string[];
  ville?: string;
  /**
   * Rough SQL match for sous-zones (arrondissements / quartiers sélectionnés dans l’UI).
   * À utiliser uniquement avec des requêtes strictes (`searchRelaxation` absent ou false).
   * La recherche relaxée sans ces champs évite de réduire le pool utilisé pour les suggestions.
   */
  arrondissements?: string[];
  quartiers?: string[];
  /** Free-text search (title, description, quartier, region, etc.) — server-side ilike OR */
  freeText?: string;
  priceMin?: number;
  priceMax?: number;
  rooms?: number[];
  bathrooms?: number[];
  surfaceMin?: number;
  surfaceMax?: number;
  brands?: string[];
  modelQuery?: string;
  yearMin?: number;
  yearMax?: number;
  fuels?: string[];
  transmissions?: string[];
  drivetrains?: string[];
  conditions?: string[];
  sellerTypes?: string[];
  exteriorColor?: string;
  engineDisplacementMin?: number;
  engineDisplacementMax?: number;
  searchText?: string;
  limit?: number;
  /** Offset du premier enregistrement (fenêtre pagination ; avec `limit`) */
  offset?: number;
  ownerIds?: string[];
  /** When set, only these listing IDs (e.g. boosted featured rail). Other filters ignored. */
  listingIds?: string[];
  /**
   * Search page relaxed fetch only: widen DB filters (price/rooms/surface) so client-side logic can show
   * strict matches vs. « résultats proches ». Count queries and strict callers must omit this.
   */
  searchRelaxation?: boolean;
}

/** Strip characters that would break PostgREST `or` / `ilike` filters */
export function sanitizeIlikeTerm(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
}

export const CLOSE_MATCH_PRICE_FACTOR = 1.25;
export const CLOSE_MATCH_SURFACE_MAX_FACTOR = 1.15;

/** ±1 chambre (et voisinage « 5+ ») pour élargir la requête SQL */
export function expandRoomsForRelaxedQuery(rooms: number[]): number[] {
  const out = new Set<number>();
  for (const r of rooms) {
    if (r === 5) {
      for (let i = 4; i <= 20; i++) out.add(i);
    } else {
      out.add(Math.max(0, r - 1));
      out.add(r);
      out.add(Math.min(99, r + 1));
    }
  }
  return Array.from(out);
}

export function expandBathroomsForRelaxedQuery(bathrooms: number[]): number[] {
  const out = new Set<number>();
  for (const b of bathrooms) {
    if (b === 4) {
      for (let i = 3; i <= 12; i++) out.add(i);
    } else {
      out.add(Math.max(1, b - 1));
      out.add(b);
      out.add(Math.min(99, b + 1));
    }
  }
  return Array.from(out);
}

/**
 * Filtre PostgREST OR pour approximer matchesLocationSubareas (ilike sous-chaîne).
 * Ne remplace pas le raffinage client si la recherche relaxée charge toute la ville.
 */
export function buildLocationSubareaOrFilter(arrondissements: string[], quartiers: string[]): string | null {
  const parts: string[] = [];
  for (const raw of arrondissements) {
    const safe = sanitizeIlikeTerm(raw);
    if (safe.length >= 1) {
      parts.push(`arrondissement.ilike.%${safe}%`);
    }
  }
  for (const raw of quartiers) {
    const safe = sanitizeIlikeTerm(raw);
    if (safe.length >= 1) {
      parts.push(`quartier.ilike.%${safe}%`);
      parts.push(`quartier_libre.ilike.%${safe}%`);
    }
  }
  return parts.length > 0 ? parts.join(",") : null;
}

export function applyListingFilters(query: FilterableListingQuery, filters: ListingsFilters): FilterableListingQuery {
  const idsOnly = filters.listingIds && filters.listingIds.length > 0;
  const relaxed = filters.searchRelaxation === true;

  if (idsOnly) {
    return query.in("id", filters.listingIds!);
  }

  let q = query;
  const resolvedVehicleTypeFilters = resolveVehicleTypeFilters(filters.vehicleTypes ?? []);
  const mergedTypes = Array.from(new Set([...(filters.types ?? []), ...resolvedVehicleTypeFilters.listingTypes]));
  const mergedFuels = Array.from(new Set([...(filters.fuels ?? []), ...resolvedVehicleTypeFilters.fuels]));
  if (filters.transaction) {
    q = q.eq("transaction", filters.transaction as TransactionType);
  }
  if (mergedTypes.length > 0) {
    q = q.in("type", mergedTypes as ListingType[]);
  }
  if (filters.ville) {
    q = q.eq("ville", filters.ville);
  }

  const hasSubareas =
    (filters.arrondissements && filters.arrondissements.length > 0) ||
    (filters.quartiers && filters.quartiers.length > 0);
  if (filters.ville && hasSubareas) {
    const locOr = buildLocationSubareaOrFilter(filters.arrondissements ?? [], filters.quartiers ?? []);
    if (locOr) q = q.or(locOr);
  }

  const ft = filters.freeText?.trim();
  if (ft) {
    const safe = sanitizeIlikeTerm(ft);
    if (safe.length >= 1) {
      const p = `%${safe}%`;
      q = q.or(
        `title.ilike.${p},description.ilike.${p},make.ilike.${p},model.ilike.${p},fuel.ilike.${p},body_style.ilike.${p},quartier.ilike.${p},quartier_libre.ilike.${p},region.ilike.${p},ville.ilike.${p}`,
      );
    }
  }
  if (filters.ownerIds && filters.ownerIds.length > 0) {
    q = q.in("owner_id", filters.ownerIds);
  }
  if (filters.priceMin) {
    q = q.gte("price_mga", filters.priceMin);
  }
  if (filters.priceMax) {
    const cap = relaxed ? Math.ceil(filters.priceMax * CLOSE_MATCH_PRICE_FACTOR) : filters.priceMax;
    q = q.lte("price_mga", cap);
  }
  if (filters.rooms && filters.rooms.length > 0) {
    if (relaxed) {
      const expanded = expandRoomsForRelaxedQuery(filters.rooms);
      const under5 = [...new Set(expanded.filter((r) => r < 5))].sort((a, b) => a - b);
      const hasGte5 = expanded.some((r) => r >= 5);
      if (hasGte5 && under5.length > 0) {
        q = q.or(`rooms.in.(${under5.join(",")}),rooms.gte.5`);
      } else if (hasGte5) {
        q = q.gte("rooms", 4);
      } else {
        q = q.in("rooms", under5);
      }
    } else {
      const hasHighEnd = filters.rooms.includes(5);
      if (hasHighEnd) {
        const otherRooms = filters.rooms.filter((r) => r < 5);
        if (otherRooms.length > 0) {
          q = q.or(`rooms.in.(${otherRooms.join(",")}),rooms.gte.5`);
        } else {
          q = q.gte("rooms", 5);
        }
      } else {
        q = q.in("rooms", filters.rooms);
      }
    }
  }
  if (filters.bathrooms && filters.bathrooms.length > 0) {
    if (relaxed) {
      const expanded = expandBathroomsForRelaxedQuery(filters.bathrooms);
      const under4 = [...new Set(expanded.filter((b) => b < 4))].sort((a, b) => a - b);
      const hasGte4 = expanded.some((b) => b >= 4);
      if (hasGte4 && under4.length > 0) {
        q = q.or(
          `doors.in.(${under4.join(",")}),doors.gte.4,and(doors.is.null,bathrooms.in.(${under4.join(",")})),and(doors.is.null,bathrooms.gte.4)`,
        );
      } else if (hasGte4) {
        q = q.or("doors.gte.3,and(doors.is.null,bathrooms.gte.3)");
      } else {
        q = q.or(`doors.in.(${under4.join(",")}),and(doors.is.null,bathrooms.in.(${under4.join(",")}))`);
      }
    } else {
      const hasPlus = filters.bathrooms.includes(4);
      const others = filters.bathrooms.filter((b) => b < 4);
      if (hasPlus && others.length > 0) {
        q = q.or(
          `doors.in.(${others.join(",")}),doors.gte.4,and(doors.is.null,bathrooms.in.(${others.join(",")})),and(doors.is.null,bathrooms.gte.4)`,
        );
      } else if (hasPlus) {
        q = q.or("doors.gte.4,and(doors.is.null,bathrooms.gte.4)");
      } else {
        q = q.or(`doors.in.(${others.join(",")}),and(doors.is.null,bathrooms.in.(${others.join(",")}))`);
      }
    }
  }
  if (filters.surfaceMin) {
    const sm = relaxed ? Math.max(0, Math.floor(filters.surfaceMin * 0.88)) : filters.surfaceMin;
    q = q.or(`mileage_km.gte.${sm},and(mileage_km.is.null,surface.gte.${sm})`);
  }
  if (filters.surfaceMax && filters.surfaceMax > 0) {
    const cap = relaxed ? Math.ceil(filters.surfaceMax * CLOSE_MATCH_SURFACE_MAX_FACTOR) : filters.surfaceMax;
    q = q.or(`mileage_km.lte.${cap},and(mileage_km.is.null,surface.lte.${cap})`);
  }
  if (filters.brands && filters.brands.length > 0) {
    q = q.in("make", filters.brands);
  }
  if (filters.modelQuery && filters.modelQuery.trim()) {
    const safe = sanitizeIlikeTerm(filters.modelQuery);
    if (safe) q = q.ilike("model", `%${safe}%`);
  }
  if (filters.yearMin && filters.yearMin > 0) {
    q = q.gte("year", filters.yearMin);
  }
  if (filters.yearMax && filters.yearMax > 0) {
    q = q.lte("year", filters.yearMax);
  }
  if (mergedFuels.length > 0) {
    q = q.in("fuel", mergedFuels);
  }
  if (filters.transmissions && filters.transmissions.length > 0) {
    q = q.in("transmission_gearbox", filters.transmissions);
  }
  if (filters.drivetrains && filters.drivetrains.length > 0) {
    q = q.in("drivetrain", filters.drivetrains);
  }
  if (filters.conditions && filters.conditions.length > 0) {
    q = q.in("vehicle_condition", filters.conditions);
  }
  if (filters.sellerTypes && filters.sellerTypes.length > 0) {
    q = q.in("seller_type", filters.sellerTypes);
  }
  if (filters.exteriorColor) {
    q = q.eq("exterior_color", filters.exteriorColor);
  }
  if (filters.engineDisplacementMin && filters.engineDisplacementMin > 0) {
    q = q.gte("engine_displacement_l", filters.engineDisplacementMin);
  }
  if (filters.engineDisplacementMax && filters.engineDisplacementMax > 0) {
    q = q.lte("engine_displacement_l", filters.engineDisplacementMax);
  }

  return q;
}
