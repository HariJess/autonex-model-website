-- =============================================================================
-- Hotfix sécurité : enable RLS sur tables catalogue véhicules vides
-- =============================================================================
-- Contexte : Supabase Security Advisor a flagué 5 tables du schéma public
-- sans RLS activée. Les 5 tables étaient ACTUELLEMENT VIDES (0 rows chacune),
-- donc aucune fuite de données réelle. Mais on ferme l'alerte et on prépare
-- le futur : quand ces tables seront peuplées (autocomplete marques/modèles,
-- historique prix scraped), RLS sera déjà en place.
--
-- Pattern appliqué : lecture publique (SELECT true), pas d'INSERT/UPDATE/
-- DELETE pour users anonymes ou authentifiés. L'écriture se fera via
-- service_role (admin backoffice, scripts d'import, futurs crawlers).
--
-- Tables concernées :
--   - vehicle_makes                    (catalogue marques)
--   - vehicle_models                   (catalogue modèles)
--   - vehicle_generations              (générations d'un modèle)
--   - vehicle_trims                    (finitions/versions)
--   - vehicle_listing_price_history    (historique prix, données publiques)
--
-- Applied in prod via SQL Editor before this file commit (2026-04-22).
-- =============================================================================

-- vehicle_makes
ALTER TABLE public.vehicle_makes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_makes_public_read"
  ON public.vehicle_makes
  FOR SELECT
  USING (true);

-- vehicle_models
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_models_public_read"
  ON public.vehicle_models
  FOR SELECT
  USING (true);

-- vehicle_generations
ALTER TABLE public.vehicle_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_generations_public_read"
  ON public.vehicle_generations
  FOR SELECT
  USING (true);

-- vehicle_trims
ALTER TABLE public.vehicle_trims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_trims_public_read"
  ON public.vehicle_trims
  FOR SELECT
  USING (true);

-- vehicle_listing_price_history
ALTER TABLE public.vehicle_listing_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_listing_price_history_public_read"
  ON public.vehicle_listing_price_history
  FOR SELECT
  USING (true);