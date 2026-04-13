-- Draft autosave: step tracking, last-write timestamp, optional archived status

ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS draft_step SMALLINT NOT NULL DEFAULT 0 CHECK (draft_step >= 0 AND draft_step <= 10),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.listings.draft_step IS 'Wizard step index for status=draft (0-based; UI typically 0–3)';
COMMENT ON COLUMN public.listings.updated_at IS 'Last row update (draft autosave or any edit)';

CREATE OR REPLACE FUNCTION public.set_listings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_listings_updated_at ON public.listings;
CREATE TRIGGER tr_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_listings_updated_at();

CREATE INDEX IF NOT EXISTS idx_listings_owner_draft ON public.listings (owner_id, status)
  WHERE status = 'draft';
