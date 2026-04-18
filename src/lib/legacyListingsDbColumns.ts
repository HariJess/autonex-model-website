/**
 * Cartographie explicite des colonnes table `public.listings` héritées du schéma immobilier.
 * La base conserve encore ces noms ; le produit AutoNex y mappe la donnée véhicule.
 *
 * Ne pas « corriger » massivement le schéma ici : toute migration SQL doit être planifiée à part.
 *
 * @see `buildLegacyMirrorFieldsFromVehicle` dans `vehicleCanonical.ts`
 * @see `getVehicleMileageValue` / `getVehicleDoorsValue` dans `vehiclePresentation.ts`
 */
export const LEGACY_LISTINGS_COLUMN_SEMANTICS = {
  /** Kilométrage (km), pas une surface en m². */
  surface: "mileage_km",
  /** Indice de finition / version (numérique historique), pas une chambre. */
  rooms: "trim_or_version_numeric",
  /** Nombre de portes, pas de salles de bain. */
  bathrooms: "doors_count",
  /** Places / capacité sièges (usage étendu), pas « toilettes » au sens immobilier. */
  toilets: "seats_capacity",
  /** Enum DB inchangé ; les libellés UI sont véhicule (voir `LISTING_TYPE_LABELS`). */
  listing_type_enum: "vehicle_body_category",
} as const;
