-- AutoNex quality gate: backend search-vector coherence
-- ---------------------------------------------------------------------------
-- Goal:
-- - Keep existing search_vector trigger/index setup intact.
-- - Ensure the active trigger path uses a single coherent helper.
-- - Include key vehicle-native fields in the active search_vector payload.
-- ---------------------------------------------------------------------------

-- 1) Canonical helper used by trigger-backed updates.
-- Uses weighted simple tsvector across core listing + vehicle fields.
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

-- 2) Active trigger function now delegates to canonical helper.
-- Location text intentionally aggregates legacy + current location columns.
CREATE OR REPLACE FUNCTION public.update_listing_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := public.listing_search_vector(
    NEW.title,
    NEW.description,
    concat_ws(' ', NEW.ville, NEW.quartier, NEW.quartier_libre, NEW.region),
    NEW.make,
    NEW.model,
    NEW.fuel,
    NEW.body_style
  );
  RETURN NEW;
END;
$$;

-- 3) Ensure trigger exists (non-destructive; no-op when already present).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_listing_search'
      AND tgrelid = 'public.listings'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER update_listing_search
      BEFORE INSERT OR UPDATE ON public.listings
      FOR EACH ROW EXECUTE FUNCTION public.update_listing_search_vector();
  END IF;
END $$;

-- 4) Backfill existing rows once so old listings get coherent vectors too.
UPDATE public.listings
SET search_vector = public.listing_search_vector(
  title,
  description,
  concat_ws(' ', ville, quartier, quartier_libre, region),
  make,
  model,
  fuel,
  body_style
)
WHERE search_vector IS NULL;
