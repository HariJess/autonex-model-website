-- Adds the `negotiable` boolean column to listings.
--
-- Business need: let sellers flag a listing as "price is open to negotiation"
-- without changing the displayed price. The app renders a "Négociable" badge
-- on cards and listing detail when this flag is true.
--
-- Default false: existing rows stay non-negotiable (neutral).
-- Partial index on TRUE only — expected low cardinality so the partial index
-- stays tiny and speeds up the "negotiable only" search filter.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS negotiable BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.negotiable IS
  'Seller opted-in flag. When true, UI renders a "Négociable" badge on cards and detail page.';

CREATE INDEX IF NOT EXISTS idx_listings_negotiable
  ON public.listings(negotiable)
  WHERE negotiable = true;
