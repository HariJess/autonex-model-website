-- =============================================================================
-- Mission 2.A — Moderation helpers
--
--  - is_verified_dealer(uuid): true when user is a member of an agency whose
--    status is 'approved' (agency.verified flag not required, per D4).
--  - moderation_blacklist_terms: admin-curated seed list of scam / money-
--    transfer terms flagged during content validation.
--  - validate_listing_content(title, description, price_mga, whatsapp_phone):
--    returns (valid, errors JSONB) — single-row. errors is a JSONB array of
--    {field, code, message} records. Called by the triggers added in 2.A/3.
--  - can_publish_listing(user_id): rolling 24h rate limit (20 publications).
--    Returns (allowed, reason, remaining, reset_at).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. is_verified_dealer — used in triggers + publish_listing_with_credits.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_verified_dealer(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN public.agencies a ON a.id = p.agency_id
     WHERE p.id = p_user_id
       AND a.status = 'approved'::public.agency_status
  );
$$;

COMMENT ON FUNCTION public.is_verified_dealer(UUID) IS
  'Returns true iff the user is linked to an agency with status=approved. Used by moderation triggers to grant dealer fast-track (listings skip pending_review).';

-- -----------------------------------------------------------------------------
-- B. moderation_blacklist_terms — seed + RLS.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_blacklist_terms (
  term        TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.moderation_blacklist_terms IS
  'Admin-curated blacklist of terms that fail listing content validation. Term stored lowercased for case-insensitive word-boundary regex match.';

ALTER TABLE public.moderation_blacklist_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blacklist_select_admin" ON public.moderation_blacklist_terms;
CREATE POLICY "blacklist_select_admin"
  ON public.moderation_blacklist_terms
  FOR SELECT
  TO authenticated
  USING (public.immonex_is_admin());
-- No INSERT/UPDATE/DELETE policy: seed via migration, admin RPC later (Mission 2.C).
-- validate_listing_content is SECURITY DEFINER so it reads blacklist even when
-- the caller is not admin.

-- Seed initial list (case-insensitive canonicalised: lowercase, no surrounding space)
INSERT INTO public.moderation_blacklist_terms (term) VALUES
  ('western union'),
  ('moneygram'),
  ('virement international'),
  ('bitcoin'),
  ('urgent cash'),
  ('transfert d''argent'),
  ('offre miracle'),
  ('argent rapide'),
  ('mobile money arnaque'),
  ('mvola arnaque'),
  ('orange money arnaque'),
  ('crypto'),
  ('investissement garanti'),
  ('double votre argent'),
  ('paiement à l''étranger'),
  ('envoyer procuration')
ON CONFLICT (term) DO NOTHING;

-- -----------------------------------------------------------------------------
-- C. validate_listing_content — pure validation, no write.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_listing_content(
  p_title           TEXT,
  p_description     TEXT,
  p_price_mga       BIGINT,
  p_whatsapp_phone  TEXT
)
RETURNS TABLE (
  valid   BOOLEAN,
  errors  JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors    JSONB := '[]'::jsonb;
  v_title     TEXT := COALESCE(p_title, '');
  v_desc      TEXT := COALESCE(p_description, '');
  v_haystack  TEXT;
  v_term      TEXT;
BEGIN
  -- Title: 5 to 120 chars.
  IF char_length(trim(v_title)) < 5 THEN
    v_errors := v_errors || jsonb_build_object(
      'field',   'title',
      'code',    'title_too_short',
      'message', 'Le titre doit faire au moins 5 caractères.'
    );
  ELSIF char_length(v_title) > 120 THEN
    v_errors := v_errors || jsonb_build_object(
      'field',   'title',
      'code',    'title_too_long',
      'message', 'Le titre ne peut pas dépasser 120 caractères.'
    );
  END IF;

  -- Description: min 40 chars.
  IF char_length(trim(v_desc)) < 40 THEN
    v_errors := v_errors || jsonb_build_object(
      'field',   'description',
      'code',    'description_too_short',
      'message', 'La description doit faire au moins 40 caractères.'
    );
  END IF;

  -- Price: 100_000 to 10_000_000_000 (100k to 10 billion Ar).
  IF p_price_mga IS NULL OR p_price_mga < 100000 THEN
    v_errors := v_errors || jsonb_build_object(
      'field',   'price_mga',
      'code',    'price_too_low',
      'message', 'Le prix doit être au moins 100 000 Ar.'
    );
  ELSIF p_price_mga > 10000000000 THEN
    v_errors := v_errors || jsonb_build_object(
      'field',   'price_mga',
      'code',    'price_too_high',
      'message', 'Le prix ne peut pas dépasser 10 milliards d''Ariary.'
    );
  END IF;

  -- WhatsApp (optional). If non-empty, enforce E.164-ish: +<1-9><6-14 digits>.
  IF p_whatsapp_phone IS NOT NULL
     AND char_length(trim(p_whatsapp_phone)) > 0
     AND p_whatsapp_phone !~ '^\+[1-9]\d{6,14}$' THEN
    v_errors := v_errors || jsonb_build_object(
      'field',   'whatsapp_phone',
      'code',    'whatsapp_invalid',
      'message', 'Le numéro WhatsApp doit être au format international (+261…).'
    );
  END IF;

  -- Blacklist terms: search in title + description.
  v_haystack := lower(v_title || ' ' || v_desc);
  FOR v_term IN
    SELECT t.term FROM public.moderation_blacklist_terms t
  LOOP
    -- Word-boundary regex match. escape_regexp avoided (terms are seed data,
    -- admin-curated — no user input). Accent-insensitive not applied here;
    -- seed terms are written in their natural form (é, à, etc.).
    IF v_haystack ~* ('\m' || v_term || '\M') THEN
      v_errors := v_errors || jsonb_build_object(
        'field',   'content',
        'code',    'blacklisted_term',
        'term',    v_term,
        'message', 'Le contenu contient un terme non autorisé : ' || v_term
      );
      EXIT; -- Stop at the first hit; one error is enough for the UI.
    END IF;
  END LOOP;

  RETURN QUERY SELECT (jsonb_array_length(v_errors) = 0), v_errors;
END;
$$;

COMMENT ON FUNCTION public.validate_listing_content(TEXT, TEXT, BIGINT, TEXT) IS
  'Pure content validator. Returns (valid, errors JSONB[]) for title/description/price/whatsapp. Called by moderation triggers (enforce listing rules before save).';

-- Read by validate via SECURITY DEFINER; expose to authenticated so the
-- moderation queue UI in Mission 2.C can preview errors client-side too.
REVOKE ALL ON FUNCTION public.validate_listing_content(TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_listing_content(TEXT, TEXT, BIGINT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- D. can_publish_listing — rolling 24h rate limit (20 publications per user).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_publish_listing(p_user_id UUID)
RETURNS TABLE (
  allowed     BOOLEAN,
  reason      TEXT,
  remaining   INTEGER,
  reset_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count         INTEGER;
  v_oldest_in_win TIMESTAMPTZ;
  v_limit         CONSTANT INTEGER := 20;
  v_window        CONSTANT INTERVAL := INTERVAL '24 hours';
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'auth_required'::TEXT, 0::INTEGER, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER, MIN(l.created_at)
    INTO v_count, v_oldest_in_win
    FROM public.listings l
   WHERE l.owner_id = p_user_id
     AND l.status <> 'draft'::public.listing_status
     AND l.created_at > (now() - v_window);

  IF v_count >= v_limit THEN
    RETURN QUERY SELECT
      false,
      'rate_limit_exceeded'::TEXT,
      0::INTEGER,
      (v_oldest_in_win + v_window)::TIMESTAMPTZ;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    NULL::TEXT,
    (v_limit - v_count)::INTEGER,
    NULL::TIMESTAMPTZ;
END;
$$;

COMMENT ON FUNCTION public.can_publish_listing(UUID) IS
  'Rolling 24h rate limit (20 listings/user). Excludes drafts. When blocked, reset_at = oldest in-window listing + 24h, so the UI can display a countdown.';

REVOKE ALL ON FUNCTION public.can_publish_listing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_publish_listing(UUID) TO authenticated;
