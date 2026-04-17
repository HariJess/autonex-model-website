-- Add missing vehicle attributes on listings (safe additive migration)
ALTER TABLE IF EXISTS public.listings
  ADD COLUMN IF NOT EXISTS exterior_color text,
  ADD COLUMN IF NOT EXISTS engine_displacement_l numeric(4,2);
