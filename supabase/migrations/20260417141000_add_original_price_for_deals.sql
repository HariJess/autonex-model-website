-- Homepage deals support: optional original price for real discounts
ALTER TABLE IF EXISTS public.listings
  ADD COLUMN IF NOT EXISTS original_price_mga numeric;
