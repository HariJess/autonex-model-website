-- Add updated_at column to public.agencies.
--
-- Background: the SEO sitemap builder (scripts/seo/generate-sitemaps.mjs)
-- selects agencies.updated_at for the <lastmod> entries and orders by it
-- DESC. The column was missing, which surfaced as PostgreSQL 42703
-- "column agencies.updated_at does not exist" during the Vercel build.
--
-- Pattern: mirrors set_listings_updated_at (mig 20260413100000) and
-- set_partner_ad_campaigns_updated_at (mig 20260414160000) — table-specific
-- helper + BEFORE UPDATE trigger. Kept consistent with the rest of the
-- project rather than introducing a generic handle_updated_at().

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing rows so historical entries carry a meaningful
-- lastmod in the sitemap (avoids every record collapsing to the
-- migration-application timestamp).
UPDATE public.agencies
SET updated_at = created_at
WHERE created_at IS NOT NULL;

COMMENT ON COLUMN public.agencies.updated_at
  IS 'Last row update (auto-maintained by tr_agencies_updated_at).';

CREATE OR REPLACE FUNCTION public.set_agencies_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_agencies_updated_at ON public.agencies;
CREATE TRIGGER tr_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_agencies_updated_at();

-- Supports ORDER BY updated_at DESC in scripts/seo/generate-sitemaps.mjs
-- and any future "last updated agencies" listings.
CREATE INDEX IF NOT EXISTS idx_agencies_updated_at
  ON public.agencies (updated_at DESC);
