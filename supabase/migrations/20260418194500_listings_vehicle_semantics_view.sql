-- -----------------------------------------------------------------------------
-- Vue additive read-only : valeurs véhicule « effectives » (native + colonnes legacy).
-- Ne modifie pas `public.listings`, ne supprime aucune colonne ; réversible via DROP VIEW.
-- Destinée aux exports, reporting et futures APIs lecture ; les écritures applicatives inchangées.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.listings_vehicle_semantics AS
SELECT
  l.id,
  COALESCE(l.mileage_km, l.surface) AS mileage_km_effective,
  l.mileage_km AS mileage_km_native,
  l.surface AS legacy_surface_km,
  l.rooms AS trim_version_index,
  COALESCE(l.doors, l.bathrooms) AS doors_effective,
  l.doors AS doors_native,
  l.bathrooms AS legacy_bathrooms_doors,
  COALESCE(l.seats, l.toilets) AS seats_effective,
  l.seats AS seats_native,
  l.toilets AS legacy_toilets_seats
FROM public.listings l;

COMMENT ON VIEW public.listings_vehicle_semantics IS
  'AutoNex step-3: lecture unifiée km/portes/places sans renommer les colonnes SQL historiques.';

GRANT SELECT ON public.listings_vehicle_semantics TO anon;
GRANT SELECT ON public.listings_vehicle_semantics TO authenticated;
GRANT SELECT ON public.listings_vehicle_semantics TO service_role;
