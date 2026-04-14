-- AutoNex compatibility migration (additive only)
-- -----------------------------------------------------------------------------
-- This migration intentionally keeps legacy/property-style schema pieces untouched.
-- We only add missing vehicle-oriented fields needed by AutoNex transition.
-- It is a compatibility migration, not a full schema rewrite.
-- -----------------------------------------------------------------------------

-- 1) Extend public.listings with vehicle-related fields (safe + additive only).
-- NOTE: Existing columns/tables from older copied ImmoNex migrations are preserved
-- on purpose for frontend/backward compatibility.
ALTER TABLE IF EXISTS public.listings
  ADD COLUMN IF NOT EXISTS make text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS mileage_km integer,
  ADD COLUMN IF NOT EXISTS fuel text,
  ADD COLUMN IF NOT EXISTS transmission_gearbox text,
  ADD COLUMN IF NOT EXISTS drivetrain text,
  ADD COLUMN IF NOT EXISTS doors integer,
  ADD COLUMN IF NOT EXISTS vehicle_condition text,
  ADD COLUMN IF NOT EXISTS body_style text,
  ADD COLUMN IF NOT EXISTS seller_type text,
  ADD COLUMN IF NOT EXISTS rental_mode text,
  ADD COLUMN IF NOT EXISTS is_electric boolean,
  ADD COLUMN IF NOT EXISTS is_hybrid boolean,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS availability_status text,
  ADD COLUMN IF NOT EXISTS exterior_color text,
  ADD COLUMN IF NOT EXISTS interior_color text,
  ADD COLUMN IF NOT EXISTS seats integer;

-- 2) Add useful non-destructive indexes for common vehicle search filters.
-- These are intentionally simple B-Tree indexes for equality/range filtering.
CREATE INDEX IF NOT EXISTS idx_listings_make ON public.listings (make);
CREATE INDEX IF NOT EXISTS idx_listings_model ON public.listings (model);
CREATE INDEX IF NOT EXISTS idx_listings_year ON public.listings (year);
CREATE INDEX IF NOT EXISTS idx_listings_mileage_km ON public.listings (mileage_km);
CREATE INDEX IF NOT EXISTS idx_listings_fuel ON public.listings (fuel);
CREATE INDEX IF NOT EXISTS idx_listings_body_style ON public.listings (body_style);
CREATE INDEX IF NOT EXISTS idx_listings_availability_status ON public.listings (availability_status);
CREATE INDEX IF NOT EXISTS idx_listings_make_model_year ON public.listings (make, model, year);

-- City index is conditional because legacy schemas may name location differently.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'city'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings (city)';
  END IF;
END $$;

-- 3) Update/replace a search-vector helper function so vehicle terms are included.
-- This function is safe to replace and does not remove any old behavior.
-- It can be used by existing or future triggers/generated expressions.
CREATE OR REPLACE FUNCTION public.listing_search_vector(
  p_title text,
  p_description text,
  p_city text,
  p_make text,
  p_model text,
  p_fuel text,
  p_body_style text
)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    setweight(to_tsvector('simple', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(p_make, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(p_model, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(p_description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(p_city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(p_fuel, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(p_body_style, '')), 'C');
$$;

-- Optional text-search index if the legacy column exists and is used in frontend.
-- This is additive and harmless if search_vector already exists/populated.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'search_vector'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_listings_search_vector_gin ON public.listings USING gin (search_vector)';
  END IF;
END $$;

-- 4) Extend public.profiles with seller contact/type fields (if missing).
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS seller_type text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- Compatibility note:
-- - No tables were dropped.
-- - No columns were removed.
-- - No destructive schema rewrite was performed.
-- - Legacy/property fields are preserved intentionally during AutoNex transition.
