-- Launch credit pack ladder (Ariary) + listing status for payment proof verification queue

ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'pending_payment_verification';

-- Replace pack catalog with 200–1000 ladder (ids align with src/config/monetization.ts)
DELETE FROM public.credit_packs WHERE id IN ('cp_500', 'cp_2000');

INSERT INTO public.credit_packs (id, name, credits_amount, price_mga, sort_order) VALUES
  ('cp_200', 'Pack 200 crédits', 200, 25000, 1),
  ('cp_400', 'Pack 400 crédits', 400, 45000, 2),
  ('cp_600', 'Pack 600 crédits', 600, 65000, 3),
  ('cp_800', 'Pack 800 crédits', 800, 85000, 4),
  ('cp_1000', 'Pack 1000 crédits', 1000, 100000, 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_amount = EXCLUDED.credits_amount,
  price_mga = EXCLUDED.price_mga,
  sort_order = EXCLUDED.sort_order;
