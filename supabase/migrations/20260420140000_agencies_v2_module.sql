-- =============================================================================
-- Agencies V2 module — moderation workflow + content fields + admin RPCs
--
-- Architecture decisions (session 2026-04-20):
--  D1  ENUM agency_status: pending_review | approved | rejected | suspended
--  D2  No listings.agency_id — appartenance reste transitive via
--      profiles.agency_id (single source of truth)
--  D3  Multi-users par agence déjà supporté côté DB (N profiles → 1 agency)
--  D4  Soft delete uniquement via status='suspended'
--  D5  Self-register (handle_new_user) continue, crée désormais en
--      pending_review (via DEFAULT de la nouvelle colonne status)
--  D6  RLS public restreint à status='approved'; owner voit son agence
--      quel que soit le status; admin voit tout
--  D7  verified = badge "Partenaire AutoNex" (en plus de approved)
--  D8  Champs UX user : bio, website, whatsapp, cover, logo, description,
--      opening_hours, social_links, email/phone contact
--      Champs admin-only : name, slug, nif, stat, reg_commerce, city,
--      region, address, commercial_contact_name, status, verified
--  D9  Canonical unifié sur /concessionnaires/:slug (handled côté front)
--  D10 /concessionnaires index = alias de /agences (front)
--
-- Pattern: mirrored after admin_user_detail_module + admin_pricing_module
-- (SECURITY DEFINER, immonex_is_admin guards, log_admin_action audit,
-- SELECT FOR UPDATE concurrency, no-op guards).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. ENUM agency_status
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.agency_status AS ENUM (
    'pending_review', 'approved', 'rejected', 'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- B. ALTER TABLE agencies — new columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS status           public.agency_status NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at     TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS website_url      TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_phone   TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS city             TEXT,
  ADD COLUMN IF NOT EXISTS region           TEXT,
  ADD COLUMN IF NOT EXISTS description_long TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links     JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.agencies.status IS 'Moderation workflow. Only approved rows are publicly readable via RLS.';
COMMENT ON COLUMN public.agencies.opening_hours IS 'Format: {"mon":"08:00-18:00","tue":"closed",...}';
COMMENT ON COLUMN public.agencies.social_links IS 'Format: {"facebook":"url","instagram":"url","linkedin":"url","youtube":"url","tiktok":"url"}';

-- -----------------------------------------------------------------------------
-- C. UNIQUE constraint on slug
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS agencies_slug_key ON public.agencies (slug);

-- -----------------------------------------------------------------------------
-- D. Perf indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agencies_status_created
  ON public.agencies (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agencies_approved_verified
  ON public.agencies (verified, updated_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_agencies_city_approved
  ON public.agencies (city) WHERE status = 'approved' AND city IS NOT NULL;

-- -----------------------------------------------------------------------------
-- E. RLS — drop v1 policies, install v2
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Agencies are publicly readable" ON public.agencies;
DROP POLICY IF EXISTS "Agencies can update own" ON public.agencies;

-- Public read: only approved.
CREATE POLICY "agencies_select_public_approved"
  ON public.agencies
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Owner read (any status) — lets users see their own agency while
-- pending_review/rejected so they can correct it.
CREATE POLICY "agencies_select_own"
  ON public.agencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.agency_id = agencies.id AND p.id = auth.uid()
    )
  );

-- Admin read everything.
CREATE POLICY "agencies_select_admin"
  ON public.agencies
  FOR SELECT
  TO authenticated
  USING (public.immonex_is_admin());

-- No INSERT/UPDATE/DELETE policies: all writes via SECURITY DEFINER RPCs
-- below, which run as postgres (BYPASSRLS).

-- -----------------------------------------------------------------------------
-- F. Helper: generate_agency_slug (centralises slug logic, replaces
--    inline md5-hash approach previously embedded in handle_new_user)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_agency_slug(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base      TEXT;
  v_candidate TEXT;
  v_counter   INT := 0;
BEGIN
  -- ASCII-fold common French/Malagasy accents (unaccent extension not
  -- installed on this project — translate() covers the dominant cases).
  v_base := translate(
    lower(COALESCE(p_name, '')),
    'àâäéèêëïîôöùûüç',
    'aaaeeeeiiioouuuc'
  );
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  IF v_base = '' THEN v_base := 'agence'; END IF;

  v_candidate := v_base;
  WHILE EXISTS (SELECT 1 FROM public.agencies WHERE slug = v_candidate) LOOP
    v_counter := v_counter + 1;
    v_candidate := v_base || '-' || v_counter::text;
    IF v_counter > 50 THEN
      -- Theoretical worst-case escape hatch.
      v_candidate := v_base || '-' || substr(md5(random()::text), 1, 6);
      EXIT;
    END IF;
  END LOOP;
  RETURN v_candidate;
END;
$$;

-- -----------------------------------------------------------------------------
-- G. Migrate handle_new_user trigger to use generate_agency_slug
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta                JSONB;
  r                   TEXT;
  agency_uuid         UUID;
  profile_full_name   TEXT;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  r := COALESCE(meta->>'role', 'particulier');

  IF r = 'agence' THEN
    profile_full_name := COALESCE(
      NULLIF(trim(meta->>'commercial_contact_name'), ''),
      NULLIF(trim(meta->>'full_name'), ''),
      ''
    );
  ELSE
    profile_full_name := COALESCE(
      NULLIF(trim(meta->>'full_name'), ''),
      NULLIF(trim(meta->>'name'), ''),
      ''
    );
  END IF;

  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    profile_full_name,
    CASE
      WHEN r IN ('particulier', 'agence', 'promoteur', 'admin') THEN r::public.user_role
      ELSE 'particulier'::public.user_role
    END,
    NULLIF(trim(meta->>'phone'), '')
  );

  IF r = 'agence' AND NULLIF(trim(meta->>'agency_name'), '') IS NOT NULL THEN
    INSERT INTO public.agencies (
      name, slug, phone, email, logo_url,
      address, commercial_contact_name, nif, stat, reg_commerce,
      submitted_at
      -- status defaults to 'pending_review' → awaits admin approval
    ) VALUES (
      trim(meta->>'agency_name'),
      public.generate_agency_slug(trim(meta->>'agency_name')),
      NULLIF(trim(meta->>'phone'), ''),
      NULLIF(trim(NEW.email), ''),
      NULLIF(trim(meta->>'agency_logo_url'), ''),
      NULLIF(trim(meta->>'agency_address'), ''),
      NULLIF(trim(meta->>'commercial_contact_name'), ''),
      NULLIF(trim(meta->>'nif'), ''),
      NULLIF(trim(meta->>'stat'), ''),
      NULLIF(trim(meta->>'reg_commerce'), ''),
      now()
    )
    RETURNING id INTO agency_uuid;

    UPDATE public.profiles SET agency_id = agency_uuid WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- I1. admin_create_agency (admin manual creation — auto-approved)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_agency(
  p_name                     TEXT,
  p_email                    TEXT,
  p_phone                    TEXT,
  p_commercial_contact_name  TEXT,
  p_address                  TEXT,
  p_city                     TEXT,
  p_region                   TEXT,
  p_nif                      TEXT,
  p_stat                     TEXT,
  p_reg_commerce             TEXT,
  p_logo_url                 TEXT,
  p_bio                      TEXT,
  p_website_url              TEXT,
  p_whatsapp_phone           TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_slug TEXT;
  v_id   UUID;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_name := trim(COALESCE(p_name, ''));
  IF char_length(v_name) = 0 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = '23514';
  END IF;

  v_slug := public.generate_agency_slug(v_name);

  INSERT INTO public.agencies (
    name, slug, email, phone, commercial_contact_name,
    address, city, region, nif, stat, reg_commerce,
    logo_url, bio, website_url, whatsapp_phone,
    status, verified, submitted_at, reviewed_at, reviewed_by
  ) VALUES (
    v_name, v_slug, p_email, p_phone, p_commercial_contact_name,
    p_address, p_city, p_region, p_nif, p_stat, p_reg_commerce,
    p_logo_url, p_bio, p_website_url, p_whatsapp_phone,
    'approved'::public.agency_status, false, now(), now(), auth.uid()
  )
  RETURNING id INTO v_id;

  PERFORM public.log_admin_action(
    'create_agency',
    NULL,
    'agency',
    v_id,
    jsonb_build_object(
      'agency_id',      v_id,
      'name',           v_name,
      'slug',           v_slug,
      'auto_approved',  true
    )
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_agency(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_agency(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- I2. admin_update_agency (full admin edit)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_agency(
  p_id                       UUID,
  p_name                     TEXT,
  p_slug                     TEXT,
  p_email                    TEXT,
  p_phone                    TEXT,
  p_commercial_contact_name  TEXT,
  p_address                  TEXT,
  p_city                     TEXT,
  p_region                   TEXT,
  p_nif                      TEXT,
  p_stat                     TEXT,
  p_reg_commerce             TEXT,
  p_logo_url                 TEXT,
  p_cover_image_url          TEXT,
  p_bio                      TEXT,
  p_description_long         TEXT,
  p_website_url              TEXT,
  p_whatsapp_phone           TEXT,
  p_opening_hours            JSONB,
  p_social_links             JSONB,
  p_verified                 BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.agencies%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR char_length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_old FROM public.agencies WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agency_not_found' USING ERRCODE = '23503';
  END IF;

  -- If slug is changing, check uniqueness manually (UNIQUE index will
  -- throw 23505 otherwise but we prefer a named error for the UI).
  IF p_slug IS NOT NULL AND p_slug <> v_old.slug THEN
    IF EXISTS (SELECT 1 FROM public.agencies WHERE slug = p_slug AND id <> p_id) THEN
      RAISE EXCEPTION 'slug_already_exists' USING ERRCODE = '23505';
    END IF;
  END IF;

  UPDATE public.agencies
    SET name                    = trim(p_name),
        slug                    = COALESCE(p_slug, v_old.slug),
        email                   = p_email,
        phone                   = p_phone,
        commercial_contact_name = p_commercial_contact_name,
        address                 = p_address,
        city                    = p_city,
        region                  = p_region,
        nif                     = p_nif,
        stat                    = p_stat,
        reg_commerce            = p_reg_commerce,
        logo_url                = p_logo_url,
        cover_image_url         = p_cover_image_url,
        bio                     = p_bio,
        description_long        = p_description_long,
        website_url             = p_website_url,
        whatsapp_phone          = p_whatsapp_phone,
        opening_hours           = COALESCE(p_opening_hours, v_old.opening_hours),
        social_links            = COALESCE(p_social_links, v_old.social_links),
        verified                = COALESCE(p_verified, v_old.verified)
    WHERE id = p_id;

  PERFORM public.log_admin_action(
    'update_agency',
    NULL,
    'agency',
    p_id,
    jsonb_build_object(
      'agency_id', p_id,
      'name_changed',     (v_old.name IS DISTINCT FROM trim(p_name)),
      'slug_changed',     (v_old.slug IS DISTINCT FROM COALESCE(p_slug, v_old.slug)),
      'verified_changed', (v_old.verified IS DISTINCT FROM COALESCE(p_verified, v_old.verified))
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_agency(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_agency(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, BOOLEAN) TO authenticated;

-- -----------------------------------------------------------------------------
-- I3. admin_approve_agency
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_agency(
  p_id        UUID,
  p_verified  BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.agencies%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old FROM public.agencies WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agency_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_old.status = 'approved' AND v_old.verified IS NOT DISTINCT FROM p_verified THEN
    RETURN;
  END IF;

  UPDATE public.agencies
    SET status           = 'approved'::public.agency_status,
        verified         = COALESCE(p_verified, false),
        reviewed_at      = now(),
        reviewed_by      = auth.uid(),
        rejection_reason = NULL
    WHERE id = p_id;

  PERFORM public.log_admin_action(
    'approve_agency',
    NULL,
    'agency',
    p_id,
    jsonb_build_object(
      'agency_id',  p_id,
      'old_status', v_old.status::text,
      'verified',   COALESCE(p_verified, false)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_agency(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_agency(UUID, BOOLEAN) TO authenticated;

-- -----------------------------------------------------------------------------
-- I4. admin_reject_agency
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reject_agency(
  p_id     UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.agencies%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR char_length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'reason_too_short' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_old FROM public.agencies WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agency_not_found' USING ERRCODE = '23503';
  END IF;

  UPDATE public.agencies
    SET status           = 'rejected'::public.agency_status,
        rejection_reason = trim(p_reason),
        reviewed_at      = now(),
        reviewed_by      = auth.uid()
    WHERE id = p_id;

  PERFORM public.log_admin_action(
    'reject_agency',
    NULL,
    'agency',
    p_id,
    jsonb_build_object('agency_id', p_id, 'reason', trim(p_reason), 'old_status', v_old.status::text)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_agency(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_agency(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- I5. admin_suspend_agency
-- NOTE: does NOT cascade to listings of linked users. Admin must suspend
-- those users individually via admin_suspend_user (user_detail module) if
-- removing their listings is required.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_suspend_agency(
  p_id     UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.agencies%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR char_length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'reason_too_short' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_old FROM public.agencies WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agency_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_old.status = 'suspended' THEN RETURN; END IF;

  UPDATE public.agencies
    SET status           = 'suspended'::public.agency_status,
        rejection_reason = trim(p_reason),
        reviewed_at      = now(),
        reviewed_by      = auth.uid()
    WHERE id = p_id;

  PERFORM public.log_admin_action(
    'suspend_agency',
    NULL,
    'agency',
    p_id,
    jsonb_build_object('agency_id', p_id, 'reason', trim(p_reason), 'old_status', v_old.status::text)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_suspend_agency(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_suspend_agency(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- I6. admin_unsuspend_agency
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unsuspend_agency(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.agencies%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old FROM public.agencies WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agency_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_old.status <> 'suspended' THEN RETURN; END IF;

  UPDATE public.agencies
    SET status           = 'approved'::public.agency_status,
        rejection_reason = NULL,
        reviewed_at      = now(),
        reviewed_by      = auth.uid()
    WHERE id = p_id;

  PERFORM public.log_admin_action(
    'unsuspend_agency',
    NULL,
    'agency',
    p_id,
    jsonb_build_object('agency_id', p_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unsuspend_agency(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_agency(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- I7. admin_link_user_to_agency
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_link_user_to_agency(
  p_user_id    UUID,
  p_agency_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_agency_id UUID;
  v_old_role      public.user_role;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = p_agency_id) THEN
    RAISE EXCEPTION 'agency_not_found' USING ERRCODE = '23503';
  END IF;

  SELECT agency_id, role INTO v_old_agency_id, v_old_role
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_old_agency_id IS NOT NULL AND v_old_agency_id <> p_agency_id THEN
    RAISE EXCEPTION 'user_already_linked_to_agency' USING ERRCODE = '23514';
  END IF;

  UPDATE public.profiles
    SET agency_id = p_agency_id,
        role      = 'agence'::public.user_role
    WHERE id = p_user_id;

  PERFORM public.log_admin_action(
    'link_user_to_agency',
    p_user_id,
    'agency',
    p_agency_id,
    jsonb_build_object(
      'user_id',       p_user_id,
      'agency_id',     p_agency_id,
      'previous_role', v_old_role::text
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_user_to_agency(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_link_user_to_agency(UUID, UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- I8. admin_unlink_user_from_agency
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unlink_user_from_agency(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_agency_id UUID;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT agency_id INTO v_old_agency_id FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_old_agency_id IS NULL THEN RETURN; END IF;

  UPDATE public.profiles
    SET agency_id = NULL,
        role      = 'particulier'::public.user_role
    WHERE id = p_user_id;

  PERFORM public.log_admin_action(
    'unlink_user_from_agency',
    p_user_id,
    'agency',
    v_old_agency_id,
    jsonb_build_object('user_id', p_user_id, 'previous_agency_id', v_old_agency_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unlink_user_from_agency(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unlink_user_from_agency(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- I9. admin_list_agencies_with_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_agencies_with_stats()
RETURNS TABLE (
  id                     UUID,
  name                   TEXT,
  slug                   TEXT,
  status                 public.agency_status,
  verified               BOOLEAN,
  created_at             TIMESTAMPTZ,
  city                   TEXT,
  members_count          INT,
  listings_count         INT,
  active_listings_count  INT,
  rejection_reason       TEXT,
  logo_url               TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.slug,
    a.status,
    a.verified,
    a.created_at,
    a.city,
    (SELECT COUNT(*)::INT FROM public.profiles p WHERE p.agency_id = a.id) AS members_count,
    (SELECT COUNT(*)::INT FROM public.listings l
       WHERE l.owner_id IN (SELECT id FROM public.profiles WHERE agency_id = a.id)
    ) AS listings_count,
    (SELECT COUNT(*)::INT FROM public.listings l
       WHERE l.owner_id IN (SELECT id FROM public.profiles WHERE agency_id = a.id)
         AND l.status = 'active'::public.listing_status
    ) AS active_listings_count,
    a.rejection_reason,
    a.logo_url
  FROM public.agencies a
  ORDER BY a.created_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_agencies_with_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_agencies_with_stats() TO authenticated;

-- -----------------------------------------------------------------------------
-- I10. admin_agency_detail — returns JSONB { agency: {...}, members: [...] }
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_agency_detail(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_agency  JSONB;
  v_members JSONB;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(a.*) INTO v_agency FROM public.agencies a WHERE a.id = p_id;
  IF v_agency IS NULL THEN
    RAISE EXCEPTION 'agency_not_found' USING ERRCODE = '23503';
  END IF;

  SELECT COALESCE(jsonb_agg(m ORDER BY m->>'created_at' DESC), '[]'::jsonb) INTO v_members
  FROM (
    SELECT jsonb_build_object(
      'id',         p.id,
      'full_name',  p.full_name,
      'email',      u.email::TEXT,
      'role',       p.role::text,
      'created_at', p.created_at,
      'phone',      p.phone
    ) AS m
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.agency_id = p_id
  ) sub;

  RETURN jsonb_build_object('agency', v_agency, 'members', v_members);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_agency_detail(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_agency_detail(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- J1. update_my_agency (user-facing, agency member only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_agency(
  p_email             TEXT,
  p_phone             TEXT,
  p_whatsapp_phone    TEXT,
  p_logo_url          TEXT,
  p_cover_image_url   TEXT,
  p_bio               TEXT,
  p_description_long  TEXT,
  p_website_url       TEXT,
  p_opening_hours     JSONB,
  p_social_links      JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_agency_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT agency_id INTO v_agency_id FROM public.profiles WHERE id = v_user_id;
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'not_agency_member' USING ERRCODE = '42501';
  END IF;

  UPDATE public.agencies
    SET email            = p_email,
        phone            = p_phone,
        whatsapp_phone   = p_whatsapp_phone,
        logo_url         = p_logo_url,
        cover_image_url  = p_cover_image_url,
        bio              = p_bio,
        description_long = p_description_long,
        website_url      = p_website_url,
        opening_hours    = COALESCE(p_opening_hours, opening_hours),
        social_links     = COALESCE(p_social_links, social_links)
    WHERE id = v_agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_agency(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_agency(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;

COMMENT ON FUNCTION public.update_my_agency IS
  'User-facing agency edit. Member-only (guarded by auth.uid() + profiles.agency_id). Legal identity fields (name, slug, nif, stat, reg_commerce, address, city, region, commercial_contact_name) are admin-only — not exposed here by design.';
