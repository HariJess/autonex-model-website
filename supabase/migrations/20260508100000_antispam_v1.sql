-- =============================================================================
-- PROMPT 8 — Anti-spam V1
--
-- Étend l'infrastructure Mission 2.B (avril 2026) :
--   - listing_reports table + RLS + auto-hide trigger ✅ existait
--   - create_listing_report RPC + admin_dismiss/validate ✅ existaient
--   - can_publish_listing rate limit (20/24h) ✅ existait
--
-- Modifications V1 :
--   1. notification_type +4 valeurs (report_received, listing_under_review,
--      listing_restored, listing_deleted_by_admin)
--   2. listing_reports.reason CHECK 5→7 (+wrong_category, +fake_photos)
--   3. create_listing_report : valider 7 reasons (préservation codes erreur existants)
--   4. can_publish_listing rewrite : 3/5/20 actifs + 3/24h + 30s cooldown + admin exempt
--   5. profiles.last_published_at + trigger auto-update on publish
--   6. listings.expires_at_paused_at + freeze logic
--   7. enforce_listing_auto_hide_on_reports : freeze expires_at + notif owner
--      + broadcast admins
--   8. admin_dismiss_listing_reports : restore expires_at + notif owner
--      (listing_restored)
--   9. admin_validate_listing_reports : notif owner (listing_deleted_by_admin)
--
-- Décisions stratégiques (Phase 1 Ali validé) :
--   - F.1 verified threshold = 5 actifs
--   - F.2 SLA 48h dans wording, pas de cron V1
--   - F.3 reports immutables (pas withdraw V1)
--   - F.4 status='rejected' (pas de nouveau enum value)
--   - F.5 24h limit = nouvelles publications, exclut renewals (filter created_at)
--   - Réutiliser hidden_pending_review (déjà câblé), pas under_review
--
-- Migration NON-DESTRUCTIVE.
-- Référence : PROMPT_8_phase2_implementation.md.
-- =============================================================================

-- =============================================================================
-- SECTION A — notification_type enum (4 nouvelles valeurs)
-- =============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'report_received';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'listing_under_review';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'listing_restored';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'listing_deleted_by_admin';

-- =============================================================================
-- SECTION B — listing_reports.reason CHECK 5 → 7 valeurs
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listing_reports_reason_check'
  ) THEN
    ALTER TABLE public.listing_reports DROP CONSTRAINT listing_reports_reason_check;
  END IF;

  ALTER TABLE public.listing_reports
    ADD CONSTRAINT listing_reports_reason_check
    CHECK (reason IN (
      'scam', 'inappropriate', 'duplicate', 'wrong_price', 'other',
      'wrong_category', 'fake_photos'
    ));
END $$;

-- =============================================================================
-- SECTION C — listings.expires_at_paused_at (freeze pendant under_review)
-- =============================================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS expires_at_paused_at timestamptz;

COMMENT ON COLUMN public.listings.expires_at_paused_at IS
  'Timestamp du début du freeze expires_at (status hidden_pending_review). '
  'NULL = pas de freeze actif. Rétabli à NULL au dismiss admin avec restore '
  'des jours perdus sur expires_at. PROMPT 8.';

-- =============================================================================
-- SECTION D — profiles.last_published_at + index
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_published_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_published_at
  ON public.profiles (last_published_at)
  WHERE last_published_at IS NOT NULL;

COMMENT ON COLUMN public.profiles.last_published_at IS
  'Timestamp de la dernière publication user (status passe à active/pending_review). '
  'Utilisé pour cooldown 30s anti-spam. PROMPT 8.';

-- =============================================================================
-- SECTION E — Trigger update_profile_last_published_at
--
-- AFTER INSERT/UPDATE OF status. Fire si :
--   - INSERT direct avec status non-draft (rare, probablement legacy)
--   - UPDATE OLD.status='draft' AND NEW.status<>'draft' (publish flow)
-- Filtre `created_at > now() - 1 minute` pour exclure les renewals (créés bien
-- avant) — sécurité supplémentaire vs cas edge.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_last_published_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN (
       'active'::public.listing_status,
       'pending_review'::public.listing_status
     )
     AND (
       TG_OP = 'INSERT'
       OR (OLD.status = 'draft'::public.listing_status
           AND NEW.status <> 'draft'::public.listing_status)
     )
     AND NEW.created_at > now() - interval '1 minute' THEN
    UPDATE public.profiles
    SET last_published_at = now()
    WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_last_published_at ON public.listings;
CREATE TRIGGER tr_update_last_published_at
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_last_published_at();

-- =============================================================================
-- SECTION F — can_publish_listing rewrite (V1 rate limits)
--
-- Returns TABLE pour exposer remaining counts au front (RateLimitStatusCard).
-- Admin exempt. Mesures :
--   - Active listings : 3 (non-verified) / 5 (verified) / 20 (agency)
--   - Publishes 24h rolling : 3 max (renewals exclus via created_at filter)
--   - Cooldown : 30s entre 2 publications (via profiles.last_published_at)
-- =============================================================================

DROP FUNCTION IF EXISTS public.can_publish_listing(uuid);

CREATE OR REPLACE FUNCTION public.can_publish_listing(p_user_id uuid)
RETURNS TABLE (
  allowed                     boolean,
  reason                      text,
  active_listings_count       integer,
  active_listings_limit       integer,
  publishes_24h_count         integer,
  publishes_24h_limit         integer,
  cooldown_remaining_seconds  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_is_admin            boolean;
  v_is_agency           boolean;
  v_is_verified         boolean;
  v_active_count        integer;
  v_active_limit        integer;
  v_publish_24h_count   integer;
  v_publish_24h_limit   constant integer := 3;
  v_last_published      timestamptz;
  v_cooldown_seconds    constant integer := 30;
  v_cooldown_remaining  integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT
      false, 'auth_required'::text, 0, 0, 0, v_publish_24h_limit, 0;
    RETURN;
  END IF;

  -- 1. Admin exempt (skip toutes les vérifications)
  v_is_admin := public.immonex_is_admin();
  IF v_is_admin THEN
    RETURN QUERY SELECT
      true, NULL::text, 0, 999, 0, 999, 0;
    RETURN;
  END IF;

  -- 2. User type detection : agency (priorité) > verified > standard
  v_is_agency := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND agency_id IS NOT NULL
  );
  v_is_verified := EXISTS (
    SELECT 1 FROM public.active_seller_badges
    WHERE user_id = p_user_id
  );

  v_active_limit := CASE
    WHEN v_is_agency   THEN 20
    WHEN v_is_verified THEN 5
    ELSE 3
  END;

  -- 3. Active listings count (statuts visibles ou en queue)
  SELECT COUNT(*)::int INTO v_active_count
  FROM public.listings
  WHERE owner_id = p_user_id
    AND status IN (
      'active'::public.listing_status,
      'expiring_soon'::public.listing_status,
      'pending_review'::public.listing_status,
      'hidden_pending_review'::public.listing_status
    );

  IF v_active_count >= v_active_limit THEN
    RETURN QUERY SELECT
      false, 'rate_limit_active_listings'::text,
      v_active_count, v_active_limit,
      0, v_publish_24h_limit, 0;
    RETURN;
  END IF;

  -- 4. 24h publishes (nouvelles publications uniquement, exclut renewals via
  --    le filter created_at — un renewal ne change pas created_at)
  SELECT COUNT(*)::int INTO v_publish_24h_count
  FROM public.listings
  WHERE owner_id = p_user_id
    AND status <> 'draft'::public.listing_status
    AND created_at > now() - interval '24 hours';

  IF v_publish_24h_count >= v_publish_24h_limit THEN
    RETURN QUERY SELECT
      false, 'rate_limit_publish_24h'::text,
      v_active_count, v_active_limit,
      v_publish_24h_count, v_publish_24h_limit, 0;
    RETURN;
  END IF;

  -- 5. Cooldown 30s
  SELECT last_published_at INTO v_last_published
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_last_published IS NOT NULL THEN
    v_cooldown_remaining := GREATEST(0,
      v_cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_last_published))::int
    );
    IF v_cooldown_remaining > 0 THEN
      RETURN QUERY SELECT
        false, 'rate_limit_cooldown'::text,
        v_active_count, v_active_limit,
        v_publish_24h_count, v_publish_24h_limit,
        v_cooldown_remaining;
      RETURN;
    END IF;
  END IF;

  -- 6. All checks passed
  RETURN QUERY SELECT
    true, NULL::text,
    v_active_count, v_active_limit,
    v_publish_24h_count, v_publish_24h_limit, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.can_publish_listing(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.can_publish_listing(uuid) TO authenticated;

COMMENT ON FUNCTION public.can_publish_listing(uuid) IS
  'V1 anti-spam rate limit. 3/5/20 actifs + 3/24h + 30s cooldown. Admin exempt. '
  'Returns TABLE avec compteurs pour RateLimitStatusCard. PROMPT 8.';

-- =============================================================================
-- SECTION G — create_listing_report : valider 7 reasons
--
-- PRÉSERVE intégralement les codes d'erreur existants pour ne pas casser
-- le frontend (KNOWN_CODES dans useCreateListingReport.ts) :
--   - 'unauthenticated'              (pas 'auth_required')
--   - 'invalid_reason'
--   - 'details_required'             (pas 'details_required_for_other')
--   - 'listing_not_found'
--   - 'cannot_report_own_listing'
--   - 'listing_not_active'
--   - 'already_reported'
--
-- Étend simplement la liste de reasons à 7 + check anti-self-report renforcé.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_listing_report(
  p_listing_id UUID,
  p_reason     TEXT,
  p_details    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id     UUID := auth.uid();
  v_listing_owner   UUID;
  v_listing_status  public.listing_status;
  v_existing_report UUID;
  v_new_report_id   UUID;
BEGIN
  IF v_reporter_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated'
      USING HINT = 'User must be authenticated to report a listing';
  END IF;

  -- 7 reasons V1 (étendu de 5 → 7)
  IF p_reason NOT IN ('scam', 'inappropriate', 'duplicate', 'wrong_price',
                      'other', 'wrong_category', 'fake_photos') THEN
    RAISE EXCEPTION 'invalid_reason'
      USING HINT = 'Reason must be one of: scam, inappropriate, duplicate, wrong_price, wrong_category, fake_photos, other';
  END IF;

  IF p_reason = 'other' AND (p_details IS NULL OR LENGTH(TRIM(p_details)) = 0) THEN
    RAISE EXCEPTION 'details_required'
      USING HINT = 'Details field is required when reason = other';
  END IF;

  SELECT l.owner_id, l.status
    INTO v_listing_owner, v_listing_status
    FROM public.listings l
   WHERE l.id = p_listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;

  IF v_listing_owner = v_reporter_id THEN
    RAISE EXCEPTION 'cannot_report_own_listing';
  END IF;

  IF v_listing_status <> 'active'::public.listing_status THEN
    RAISE EXCEPTION 'listing_not_active'
      USING HINT = 'Only active listings can be reported';
  END IF;

  SELECT lr.id INTO v_existing_report
    FROM public.listing_reports lr
   WHERE lr.listing_id = p_listing_id
     AND lr.reporter_id = v_reporter_id;

  IF v_existing_report IS NOT NULL THEN
    RAISE EXCEPTION 'already_reported'
      USING HINT = 'You have already reported this listing';
  END IF;

  INSERT INTO public.listing_reports (listing_id, reporter_id, reason, details)
  VALUES (p_listing_id, v_reporter_id, p_reason, NULLIF(TRIM(p_details), ''))
  RETURNING id INTO v_new_report_id;

  RETURN jsonb_build_object(
    'success',   true,
    'report_id', v_new_report_id
  );
END;
$$;

COMMENT ON FUNCTION public.create_listing_report(UUID, TEXT, TEXT) IS
  'User submits a report on a listing. 7 reasons (Mission 2.B + PROMPT 8 +wrong_category, +fake_photos). '
  'Validates auth, ownership, active status, dedup. Codes erreur préservés.';

REVOKE ALL ON FUNCTION public.create_listing_report(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_listing_report(UUID, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- SECTION H — Auto-hide trigger : freeze expires_at + notif owner + broadcast admin
--
-- Préserve la logique existante (Mission 2.B) + ajoute :
--   1. set listings.expires_at_paused_at = now() au moment du hide
--   2. notif owner type listing_under_review
--   3. broadcast notif aux admins type report_received
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_listing_auto_hide_on_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_count  INTEGER;
  v_listing_status public.listing_status;
  v_listing_title  text;
  v_owner_id       uuid;
  v_admin_rec      RECORD;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
    FROM public.listing_reports lr
   WHERE lr.listing_id = NEW.listing_id
     AND lr.status = 'pending';

  SELECT l.status, l.title, l.owner_id
    INTO v_listing_status, v_listing_title, v_owner_id
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  IF v_pending_count >= 3 AND v_listing_status = 'active'::public.listing_status THEN
    -- 1. Hide listing + freeze expires_at
    UPDATE public.listings
       SET status                = 'hidden_pending_review'::public.listing_status,
           expires_at_paused_at  = now(),
           updated_at            = now()
     WHERE id = NEW.listing_id
       AND status = 'active'::public.listing_status;

    -- 2. Audit log (system action — actor_user_id = NULL)
    INSERT INTO public.admin_audit_log (
      actor_user_id, action, target_entity_type, target_entity_id, metadata
    ) VALUES (
      NULL,
      'system_auto_hide_listing_reports_threshold',
      'listing',
      NEW.listing_id,
      jsonb_build_object(
        'pending_reports_count', v_pending_count,
        'trigger_report_id',     NEW.id,
        'reporter_id',           NEW.reporter_id
      )
    );

    -- 3. Notif owner (silencieuse en cas d'échec)
    IF v_owner_id IS NOT NULL THEN
      BEGIN
        PERFORM public.create_notification(
          p_user_id    := v_owner_id,
          p_type       := 'listing_under_review'::public.notification_type,
          p_category   := 'listings'::public.notification_category,
          p_priority   := 'high'::public.notification_priority,
          p_title      := 'Votre annonce est en cours de revue',
          p_body       := format(
            'Votre annonce « %s » a été temporairement masquée suite à %s signalements. Notre équipe vous répond sous 48h.',
            v_listing_title, v_pending_count
          ),
          p_metadata   := jsonb_build_object(
            'listing_id',           NEW.listing_id,
            'reports_count',        v_pending_count
          ),
          p_action_url := '/mes-annonces',
          p_icon       := 'ShieldAlert'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'auto_hide notif owner failed for listing %: %', NEW.listing_id, SQLERRM;
      END;
    END IF;

    -- 4. Broadcast admins (loop sur profiles.role = 'admin')
    FOR v_admin_rec IN
      SELECT p.id FROM public.profiles p WHERE p.role = 'admin'::public.user_role
    LOOP
      BEGIN
        PERFORM public.create_notification(
          p_user_id    := v_admin_rec.id,
          p_type       := 'report_received'::public.notification_type,
          p_category   := 'admin'::public.notification_category,
          p_priority   := 'high'::public.notification_priority,
          p_title      := 'Nouveaux signalements à modérer',
          p_body       := format(
            'L''annonce « %s » a atteint %s signalements en attente.',
            v_listing_title, v_pending_count
          ),
          p_metadata   := jsonb_build_object(
            'listing_id',    NEW.listing_id,
            'reports_count', v_pending_count
          ),
          p_action_url := '/admin/moderation',
          p_icon       := 'Flag'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'auto_hide notif admin % failed for listing %: %',
          v_admin_rec.id, NEW.listing_id, SQLERRM;
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_listing_auto_hide_on_reports IS
  'Auto-hide à 3+ pending reports + freeze expires_at + notif owner + broadcast admin. '
  'Mission 2.B + PROMPT 8 extension.';

-- Trigger lui-même reste inchangé (la fonction a été remplacée par CREATE OR REPLACE).

-- =============================================================================
-- SECTION I — admin_dismiss_listing_reports : restore expires_at + notif owner
--
-- Préserve la logique existante :
--   - Move pending → reviewed_invalid
--   - Restore status hidden_pending_review → active (only if hidden)
--   - log_admin_action
-- + Ajoute :
--   - Si listing était paused (expires_at_paused_at non-null), recalculer
--     expires_at = expires_at + (now() - expires_at_paused_at), reset paused_at
--   - Notif owner type listing_restored
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_dismiss_listing_reports(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing          public.listings%ROWTYPE;
  v_dismissed_count  INTEGER := 0;
  v_restored         BOOLEAN := false;
  v_pause_duration   interval;
  v_new_expires_at   timestamptz;
  v_notif_id         uuid;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT l.* INTO v_listing
    FROM public.listings l
   WHERE l.id = p_listing_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Move pending reports to reviewed_invalid
  WITH updated AS (
    UPDATE public.listing_reports lr
       SET status      = 'reviewed_invalid',
           reviewed_at = now(),
           reviewed_by = auth.uid()
     WHERE lr.listing_id = p_listing_id
       AND lr.status = 'pending'
    RETURNING lr.id
  )
  SELECT COUNT(*)::INTEGER INTO v_dismissed_count FROM updated;

  -- Restore + recalc expires_at si listing était hidden_pending_review
  IF v_listing.status = 'hidden_pending_review'::public.listing_status THEN
    v_new_expires_at := v_listing.expires_at;
    IF v_listing.expires_at_paused_at IS NOT NULL AND v_listing.expires_at IS NOT NULL THEN
      v_pause_duration := now() - v_listing.expires_at_paused_at;
      -- Crédite la durée du pause sur expires_at
      v_new_expires_at := v_listing.expires_at + v_pause_duration;
    END IF;

    UPDATE public.listings l
       SET status                = 'active'::public.listing_status,
           expires_at            = v_new_expires_at,
           expires_at_paused_at  = NULL,
           updated_at            = now()
     WHERE l.id = p_listing_id
       AND l.status = 'hidden_pending_review'::public.listing_status;

    IF FOUND THEN
      v_restored := true;
    END IF;

    -- Notif owner (silencieuse si échec)
    BEGIN
      v_notif_id := public.create_notification(
        p_user_id    := v_listing.owner_id,
        p_type       := 'listing_restored'::public.notification_type,
        p_category   := 'listings'::public.notification_category,
        p_priority   := 'normal'::public.notification_priority,
        p_title      := 'Votre annonce a été restaurée',
        p_body       := format(
          'Votre annonce « %s » a été restaurée après examen des signalements. Aucune sanction.',
          COALESCE(v_listing.title, '')
        ),
        p_metadata   := jsonb_build_object(
          'listing_id',          p_listing_id,
          'dismissed_count',     v_dismissed_count,
          'pause_duration_secs', COALESCE(EXTRACT(EPOCH FROM v_pause_duration)::int, 0)
        ),
        p_action_url := '/mes-annonces',
        p_icon       := 'CheckCircle'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'admin_dismiss notif owner failed for listing %: %', p_listing_id, SQLERRM;
      v_notif_id := NULL;
    END;
  END IF;

  PERFORM public.log_admin_action(
    'dismiss_listing_reports',
    v_listing.owner_id,
    'listing',
    p_listing_id,
    jsonb_build_object(
      'dismissed_count', v_dismissed_count,
      'restored',        v_restored,
      'prior_status',    v_listing.status,
      'pause_duration_secs', COALESCE(EXTRACT(EPOCH FROM v_pause_duration)::int, 0)
    )
  );

  RETURN jsonb_build_object(
    'success',          true,
    'dismissed_count',  v_dismissed_count,
    'restored',         v_restored
  );
END;
$$;

COMMENT ON FUNCTION public.admin_dismiss_listing_reports(UUID) IS
  'Admin dismiss reports + restore listing (active) + recalc expires_at + notif owner '
  '(listing_restored). Mission 2.B + PROMPT 8 extension.';

REVOKE ALL ON FUNCTION public.admin_dismiss_listing_reports(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_dismiss_listing_reports(UUID) TO authenticated;

-- =============================================================================
-- SECTION J — admin_validate_listing_reports : notif owner deletion
--
-- Préserve la logique existante (move pending → reviewed_valid + status='rejected'
-- + log_admin_action) + ajoute notif owner type listing_deleted_by_admin.
-- Pas de refund crédits (sanction).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_validate_listing_reports(
  p_listing_id       UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing          public.listings%ROWTYPE;
  v_validated_count  INTEGER := 0;
  v_trimmed_reason   TEXT;
  v_notif_id         uuid;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_trimmed_reason := NULLIF(TRIM(COALESCE(p_rejection_reason, '')), '');
  IF v_trimmed_reason IS NULL OR length(v_trimmed_reason) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '23514';
  END IF;

  SELECT l.* INTO v_listing
    FROM public.listings l
   WHERE l.id = p_listing_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  WITH updated AS (
    UPDATE public.listing_reports lr
       SET status      = 'reviewed_valid',
           reviewed_at = now(),
           reviewed_by = auth.uid()
     WHERE lr.listing_id = p_listing_id
       AND lr.status = 'pending'
    RETURNING lr.id
  )
  SELECT COUNT(*)::INTEGER INTO v_validated_count FROM updated;

  UPDATE public.listings l
     SET status              = 'rejected'::public.listing_status,
         rejection_reason    = v_trimmed_reason,
         pending_boost_types = '[]'::jsonb,
         expires_at_paused_at = NULL,  -- clear le freeze (listing rejeté)
         updated_at          = now()
   WHERE l.id = p_listing_id;

  -- Notif owner (silencieuse si échec)
  BEGIN
    v_notif_id := public.create_notification(
      p_user_id    := v_listing.owner_id,
      p_type       := 'listing_deleted_by_admin'::public.notification_type,
      p_category   := 'listings'::public.notification_category,
      p_priority   := 'high'::public.notification_priority,
      p_title      := 'Votre annonce a été rejetée par modération',
      p_body       := format(
        'Votre annonce « %s » a été rejetée suite aux signalements confirmés. Raison : %s. Les crédits engagés ne sont pas remboursés.',
        COALESCE(v_listing.title, ''), v_trimmed_reason
      ),
      p_metadata   := jsonb_build_object(
        'listing_id',       p_listing_id,
        'validated_count',  v_validated_count,
        'rejection_reason', v_trimmed_reason
      ),
      p_action_url := '/mes-annonces',
      p_icon       := 'XCircle'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_validate notif owner failed for listing %: %', p_listing_id, SQLERRM;
    v_notif_id := NULL;
  END;

  PERFORM public.log_admin_action(
    'validate_listing_reports',
    v_listing.owner_id,
    'listing',
    p_listing_id,
    jsonb_build_object(
      'validated_count',  v_validated_count,
      'rejection_reason', v_trimmed_reason,
      'prior_status',     v_listing.status
    )
  );

  RETURN jsonb_build_object(
    'success',          true,
    'validated_count',  v_validated_count
  );
END;
$$;

COMMENT ON FUNCTION public.admin_validate_listing_reports(UUID, TEXT) IS
  'Admin valide reports → status=rejected + raison + notif owner '
  '(listing_deleted_by_admin, no refund). Mission 2.B + PROMPT 8.';

REVOKE ALL ON FUNCTION public.admin_validate_listing_reports(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_validate_listing_reports(UUID, TEXT) TO authenticated;
