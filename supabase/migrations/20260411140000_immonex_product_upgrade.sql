-- ImmoNex product upgrade: moderation statuses, credits lock, agency fields, listing fields,
-- credit packs, payment proof, terrain/rental constraint, boost types, consume_credits RPC.

-- Listing statuses (manual moderation before active)
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'rejected';

-- Boost types (V1)
ALTER TYPE public.boost_type ADD VALUE IF NOT EXISTS 'urgent';
ALTER TYPE public.boost_type ADD VALUE IF NOT EXISTS 'daily_bump';

-- Offline bank transfer
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';

-- Agency professional fields
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS commercial_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS nif TEXT,
  ADD COLUMN IF NOT EXISTS stat TEXT,
  ADD COLUMN IF NOT EXISTS reg_commerce TEXT;

-- Listing extended fields
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS internal_ref TEXT,
  ADD COLUMN IF NOT EXISTS toilets INT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT,
  ADD COLUMN IF NOT EXISTS is_new_program BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_boost_types JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Transactions: proof + credit purchase metadata
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS credit_pack_id TEXT,
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL;

-- Credit products (amounts of credits for sale — prices in Ar)
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits_amount INT NOT NULL CHECK (credits_amount > 0),
  price_mga BIGINT NOT NULL CHECK (price_mga >= 0),
  sort_order INT DEFAULT 0
);
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credit packs are public read" ON public.credit_packs FOR SELECT USING (true);

INSERT INTO public.credit_packs (id, name, credits_amount, price_mga, sort_order) VALUES
  ('cp_200', 'Pack 200 crédits', 200, 15000, 1),
  ('cp_500', 'Pack 500 crédits', 500, 35000, 2),
  ('cp_1000', 'Pack 1000 crédits', 1000, 65000, 3),
  ('cp_2000', 'Pack 2000 crédits', 2000, 120000, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_amount = EXCLUDED.credits_amount,
  price_mga = EXCLUDED.price_mga,
  sort_order = EXCLUDED.sort_order;

-- Business rule: terrain cannot be rental
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_terrain_not_rental;
ALTER TABLE public.listings ADD CONSTRAINT listings_terrain_not_rental CHECK (
  NOT (type = 'terrain' AND transaction IN ('location', 'location_vacances'))
);

-- Prevent clients from editing credits_balance directly (RPC bypasses via SECURITY DEFINER + set_config)
CREATE OR REPLACE FUNCTION public.profiles_lock_credits_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.credits_balance IS DISTINCT FROM OLD.credits_balance THEN
    IF COALESCE(current_setting('immonex.allow_credits_mutation', true), 'off') IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'Direct credits balance update is not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_lock_credits ON public.profiles;
CREATE TRIGGER tr_profiles_lock_credits
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.profiles_lock_credits_balance();

-- Atomically deduct credits and log ledger (service logic)
CREATE OR REPLACE FUNCTION public.consume_credits(p_user_id UUID, p_amount INT, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal INT;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  SELECT credits_balance INTO bal FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF bal IS NULL OR bal < p_amount THEN
    PERFORM set_config('immonex.allow_credits_mutation', 'off', true);
    RETURN FALSE;
  END IF;
  UPDATE profiles SET credits_balance = credits_balance - p_amount WHERE id = p_user_id;
  INSERT INTO credits_ledger (user_id, delta, reason) VALUES (p_user_id, -p_amount, COALESCE(p_reason, 'consume'));
  PERFORM set_config('immonex.allow_credits_mutation', 'off', true);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credits(UUID, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credits(UUID, INT, TEXT) TO authenticated;

-- Credit top-ups: only callable with service role / SQL (not exposed to end users)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INT, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;
  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  UPDATE profiles SET credits_balance = credits_balance + p_amount WHERE id = p_user_id;
  INSERT INTO credits_ledger (user_id, delta, reason) VALUES (p_user_id, p_amount, COALESCE(p_reason, 'credit'));
  PERFORM set_config('immonex.allow_credits_mutation', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.add_credits(UUID, INT, TEXT) FROM PUBLIC;

-- Storage for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own payment proofs" ON storage.objects;
CREATE POLICY "Users upload own payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "Users read own payment proofs" ON storage.objects;
CREATE POLICY "Users read own payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND name LIKE auth.uid()::text || '/%');

-- Agency creation on signup (professional accounts)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB;
  r TEXT;
  agency_uuid UUID;
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  r := COALESCE(meta->>'role', 'particulier');

  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(meta->>'full_name', ''),
    CASE
      WHEN r IN ('particulier', 'agence', 'promoteur', 'admin') THEN r::public.user_role
      ELSE 'particulier'::public.user_role
    END,
    NULLIF(trim(meta->>'phone'), '')
  );

  IF r = 'agence' AND NULLIF(trim(meta->>'agency_name'), '') IS NOT NULL THEN
    base_slug := lower(regexp_replace(trim(meta->>'agency_name'), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN
      base_slug := 'agence';
    END IF;
    final_slug := base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

    INSERT INTO public.agencies (
      name, slug, phone, email, logo_url,
      address, commercial_contact_name, nif, stat, reg_commerce
    ) VALUES (
      trim(meta->>'agency_name'),
      final_slug,
      NULLIF(trim(meta->>'phone'), ''),
      NULLIF(trim(NEW.email), ''),
      NULLIF(trim(meta->>'agency_logo_url'), ''),
      NULLIF(trim(meta->>'agency_address'), ''),
      NULLIF(trim(meta->>'commercial_contact_name'), ''),
      NULLIF(trim(meta->>'nif'), ''),
      NULLIF(trim(meta->>'stat'), ''),
      NULLIF(trim(meta->>'reg_commerce'), '')
    )
    RETURNING id INTO agency_uuid;

    UPDATE public.profiles SET agency_id = agency_uuid WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
