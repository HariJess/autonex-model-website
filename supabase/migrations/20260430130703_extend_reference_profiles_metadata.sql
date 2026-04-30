-- =====================================================================
-- Extension métadonnées vehicle_price_reference_profiles
-- Ajoute: data_quality_tier, sample_size, source_versions, updated_at
-- + index unique (lower(make_name), lower(model_name)) requis pour ON CONFLICT
-- Idempotent.
-- =====================================================================

ALTER TABLE public.vehicle_price_reference_profiles
  ADD COLUMN IF NOT EXISTS data_quality_tier TEXT
    CHECK (data_quality_tier IN ('A_strong','B_moderate','C_anchor')),
  ADD COLUMN IF NOT EXISTS sample_size INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_versions TEXT[],
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_reference_profiles_make_model_lower
  ON public.vehicle_price_reference_profiles (LOWER(make_name), LOWER(model_name));

COMMENT ON COLUMN public.vehicle_price_reference_profiles.data_quality_tier IS
  'A_strong / B_moderate / C_anchor. Calculé par scripts/data/build-reference-profiles.ts.';
COMMENT ON COLUMN public.vehicle_price_reference_profiles.sample_size IS
  'Nombre d''observations utilisées pour calibrer ce profil.';
COMMENT ON COLUMN public.vehicle_price_reference_profiles.source_versions IS
  'Versions du pipeline ayant calibré ce profil (ex: [''v1'',''v2'']).';
