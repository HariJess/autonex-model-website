-- =============================================================================
-- PROMPT 11 — Schema Delta : market_listings_clean extension for V2 estimation
--
-- Migration NON-DESTRUCTIVE :
--   - 11 colonnes ADD COLUMN IF NOT EXISTS pour accueillir le format CSV scrap
--     FB / dealer (price_type, negotiable, drivetrain, engine_text, seats,
--     options_summary, condition_notes, include_in_estimation, data_confidence,
--     extraction_notes, duplicate_group)
--   - 3 index pour les filtres engine V2 (make+model+year actif, data_confidence,
--     seller_type)
--   - Active RLS sur market_listings_clean + market_listings_raw + market_price_stats
--     (manquant dans la migration foundation 20260417160000)
--   - 1 policy SELECT public sur market_listings_clean (engine côté client lit
--     uniquement les rows include_in_estimation=true ET outlier_flag=false)
--   - market_listings_raw + market_price_stats : aucun SELECT public (admin /
--     service_role uniquement)
--
-- Cette migration NE BRANCHE PAS l'engine sur market_listings_clean — c'est
-- PROMPT 10A. L'engine continue de fonctionner exactement comme avant.
--
-- Référence : briefs/PROMPT_11_DB_INGESTION_CSV.md (validé Ali post-PROMPT 9 audit).
-- =============================================================================

-- =============================================================================
-- SECTION A — Activer RLS sur les 3 tables market_*
-- (foundation migration 20260417160000 a oublié)
-- =============================================================================

ALTER TABLE public.market_listings_clean ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_listings_raw   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_stats    ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION B — 11 colonnes nouvelles sur market_listings_clean
-- =============================================================================

ALTER TABLE public.market_listings_clean
  ADD COLUMN IF NOT EXISTS price_type text
    CHECK (price_type IN ('asking','firm','negotiable','quote') OR price_type IS NULL),
  ADD COLUMN IF NOT EXISTS negotiable boolean,
  ADD COLUMN IF NOT EXISTS drivetrain text
    CHECK (drivetrain IN ('4x2','4x4','awd','rwd','fwd','other') OR drivetrain IS NULL),
  ADD COLUMN IF NOT EXISTS engine_text text,
  ADD COLUMN IF NOT EXISTS seats integer
    CHECK ((seats BETWEEN 1 AND 25) OR seats IS NULL),
  ADD COLUMN IF NOT EXISTS options_summary text,
  ADD COLUMN IF NOT EXISTS condition_notes text,
  ADD COLUMN IF NOT EXISTS include_in_estimation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS data_confidence text
    CHECK (data_confidence IN ('high','medium','low') OR data_confidence IS NULL),
  ADD COLUMN IF NOT EXISTS extraction_notes text,
  ADD COLUMN IF NOT EXISTS duplicate_group text;

-- =============================================================================
-- SECTION C — Comments documentation introspection
-- =============================================================================

COMMENT ON COLUMN public.market_listings_clean.price_type IS
  'Nature du prix observé : asking (prix demandé), firm (non négociable), negotiable, quote (devis pro). PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.negotiable IS
  'Le vendeur a explicitement marqué le prix négociable. NULL si inconnu. PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.drivetrain IS
  'Transmission roues : 4x2 / 4x4 / awd / rwd / fwd / other. Influe ajustement V2. PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.engine_text IS
  'Description moteur en clair (ex "V8 turbo diesel"). Champ libre, pas normalisé. PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.seats IS
  'Nombre de places (1-25). NULL si non renseigné. PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.options_summary IS
  'Liste des options/équipements en clair (clim, GPS, cuir, jantes alu...). PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.condition_notes IS
  'Notes vendeur sur l état du véhicule (ex "État impeccable"). PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.include_in_estimation IS
  'Si false : la ligne ne participe PAS au calcul comparables (qualité insuffisante, conflit donnée, prix hors bande). PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.data_confidence IS
  'Niveau qualitatif de confiance sur la ligne (high/medium/low) — pondère son weight dans le matching V2. PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.extraction_notes IS
  'Notes du pipeline d ingestion (ex "fmg_converted", "out_of_band", "year_unknown"). Diagnostic uniquement. PROMPT 11.';
COMMENT ON COLUMN public.market_listings_clean.duplicate_group IS
  'Clé partagée entre annonces probables doublons (banding fingerprint avant FK exact via duplicate_of). PROMPT 11.';

-- =============================================================================
-- SECTION D — Index composites pour les filtres engine V2
-- =============================================================================

-- Hot path : matching make+model+year en filtrant sur incluables non-outliers
CREATE INDEX IF NOT EXISTS idx_market_clean_make_model_year_active
  ON public.market_listings_clean(normalized_make, normalized_model, year)
  WHERE include_in_estimation = true AND outlier_flag = false;

-- Pondération par data_confidence
CREATE INDEX IF NOT EXISTS idx_market_clean_data_confidence
  ON public.market_listings_clean(data_confidence)
  WHERE include_in_estimation = true;

-- Future : transaction factor par seller_type
CREATE INDEX IF NOT EXISTS idx_market_clean_seller_type
  ON public.market_listings_clean(seller_type)
  WHERE include_in_estimation = true;

-- =============================================================================
-- SECTION E — RLS policies
--
-- market_listings_clean : public read sur les rows usable (pour engine client).
-- Aucune policy WRITE publique : seul le service_role peut INSERT/UPDATE
-- (script ingestion + Edge Function compute-estimation).
--
-- market_listings_raw : aucune policy publique (données brutes parfois
-- contiennent des contacts hashés, RGPD).
--
-- market_price_stats : aucune policy publique V1 (V2 pourra ouvrir SELECT
-- public si l engine V2 lit les agrégats côté client).
-- =============================================================================

DROP POLICY IF EXISTS "market_listings_clean_public_read" ON public.market_listings_clean;
CREATE POLICY "market_listings_clean_public_read"
  ON public.market_listings_clean
  FOR SELECT
  TO anon, authenticated
  USING (include_in_estimation = true AND outlier_flag = false);

-- (volontairement aucune policy WRITE — seul service_role bypass RLS pour les
--  scripts/Edge Functions)
