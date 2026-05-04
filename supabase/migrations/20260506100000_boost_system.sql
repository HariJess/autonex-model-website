-- =============================================================================
-- PROMPT 6 — Boost System V1 : Bump + Featured + Top Ad
--
-- Scope figé V1 : 3 boosts orthogonaux cumulables.
--   - Bump        : 5 000 crédits, one-shot, cooldown 24h via last_bumped_at
--   - Featured    : 30 000 crédits, +7 jours (extension cumule)
--   - Top Ad      : 100 000 crédits, +30 jours (extension cumule)
--
-- Hiérarchie tri feed public : top_ad > featured > last_bumped_at > created_at.
-- Cumul autorisé : les 3 colonnes denormalized peuvent coexister.
-- Pas de refund prorata si listing vendu (mark_listing_sold reset *_until columns).
--
-- Migration NON-DESTRUCTIVE :
--   - ADD COLUMN IF NOT EXISTS sur listings/boosts
--   - CREATE INDEX IF NOT EXISTS
--   - CREATE OR REPLACE FUNCTION
--   - ALTER TYPE ADD VALUE IF NOT EXISTS (safe sur Postgres 15+ avec IF NOT EXISTS)
--
-- Référence : PROMPT_6_phase2_implementation.md (validé par Ali post-Phase 1).
-- =============================================================================

-- =============================================================================
-- SECTION A — Extension table listings (colonnes denormalized pour tri feed)
-- =============================================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS last_bumped_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS top_ad_until   timestamptz;

COMMENT ON COLUMN public.listings.last_bumped_at IS
  'Timestamp du dernier Bump appliqué. Utilisé pour cooldown 24h + tri feed. NULL = jamais bumpé.';
COMMENT ON COLUMN public.listings.featured_until IS
  'Fin de la période Featured (badge ⭐ « À la une »). NULL ou <= now() = pas actif. Étendu en cumulant la durée à chaque achat.';
COMMENT ON COLUMN public.listings.top_ad_until IS
  'Fin de la période Top Ad (badge 👑 « Top »). NULL ou <= now() = pas actif. Étendu en cumulant la durée.';

-- =============================================================================
-- SECTION B — Extension table boosts (audit trail)
-- =============================================================================

ALTER TABLE public.boosts
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credits_charged integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.boosts.created_by IS
  'User qui a appliqué le boost (audit). ON DELETE SET NULL pour préserver l''historique.';
COMMENT ON COLUMN public.boosts.credits_charged IS
  'Crédits débités au moment du boost. 0 sur les anciennes rows pré-PROMPT 6 (backfill safe).';

-- =============================================================================
-- SECTION C — Index perf
-- =============================================================================

-- Index sur boosts pour les queries "boost actif par listing"
-- (utilisé par useFeaturedBoostListingIds, get_active_top_ad_listings,
-- enqueue_lifecycle_notifications). Pas de WHERE partial avec now() — non-immutable.
CREATE INDEX IF NOT EXISTS idx_boosts_lookup
  ON public.boosts (listing_id, type, ends_at);

-- Composite index pour tri feed homepage. NULLS LAST = NULL en queue,
-- DESC = plus récent en tête. status = 'active' filtre les inactifs.
CREATE INDEX IF NOT EXISTS idx_listings_feed_rank
  ON public.listings (
    status,
    top_ad_until DESC NULLS LAST,
    featured_until DESC NULLS LAST,
    last_bumped_at DESC NULLS LAST,
    created_at DESC
  )
  WHERE status = 'active';

-- =============================================================================
-- SECTION D — notification_type enum : ADD 'boost_activated'
-- =============================================================================
-- IF NOT EXISTS = idempotent. Le CREATE FUNCTION ci-dessous référence cette
-- valeur dans son corps mais Postgres ne valide pas les enum values au parse
-- time du CREATE FUNCTION → safe en single-file. Si l'apply remonte une erreur
-- "unsafe use of new value" sur certaines versions Postgres anciennes, splitter
-- cette migration en deux fichiers : (1) ALTER TYPE seul, (2) le reste.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'boost_activated';

-- =============================================================================
-- SECTION E — RPC apply_boost(p_listing_id uuid, p_boost_type text)
--
-- Owner achète un boost pour son listing actif. Atomicité :
--   1. Lock listing FOR UPDATE
--   2. Validate boost_type → pricing key + duration
--   3. Cooldown check (Bump only)
--   4. Pricing lookup (credit_pricing)
--   5. Consume credits FIFO (PROMPT 2 engine)
--   6. INSERT boost row (audit)
--   7. UPDATE listings denormalized columns (extension cumule durée)
--   8. Notif boost_activated via create_notification (queueing email géré)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_boost(
  p_listing_id uuid,
  p_boost_type text  -- 'bump' | 'featured' | 'top_ad'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id            uuid := auth.uid();
  v_listing            record;
  v_cost               integer;
  v_pricing_key        text;
  v_duration_days      integer;
  v_now                timestamptz := now();
  v_new_featured_until timestamptz;
  v_new_top_ad_until   timestamptz;
  v_new_last_bumped_at timestamptz;
  v_consumed           boolean;
  v_boost_id           uuid;
  v_notif_id           uuid;
  v_notif_body         text;
  v_notif_title        text;
BEGIN
  -- 1. Auth
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate boost_type + map to pricing key + duration
  CASE p_boost_type
    WHEN 'bump' THEN
      v_pricing_key   := 'boost_bump';
      v_duration_days := 0;       -- one-shot, ends_at = now (effet immédiat, expiré immédiatement)
    WHEN 'featured' THEN
      v_pricing_key   := 'boost_featured';
      v_duration_days := 7;
    WHEN 'top_ad' THEN
      v_pricing_key   := 'boost_top_ad';
      v_duration_days := 30;
    ELSE
      RAISE EXCEPTION 'invalid_boost_type: %', p_boost_type USING ERRCODE = 'P0001';
  END CASE;

  -- 3. Lock listing + ownership + status check
  SELECT id, owner_id, status, last_bumped_at, featured_until, top_ad_until, title
  INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_listing.owner_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF v_listing.status NOT IN ('active'::public.listing_status,
                              'expiring_soon'::public.listing_status) THEN
    RAISE EXCEPTION 'listing_not_boostable: status=%', v_listing.status
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Cooldown check (Bump only)
  IF p_boost_type = 'bump'
     AND v_listing.last_bumped_at IS NOT NULL
     AND (v_now - v_listing.last_bumped_at) < interval '24 hours' THEN
    RAISE EXCEPTION 'bump_cooldown_active: next_available_at=%',
      to_char(v_listing.last_bumped_at + interval '24 hours',
              'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Pricing lookup
  SELECT amount INTO v_cost
  FROM public.credit_pricing
  WHERE key = v_pricing_key;

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'pricing_not_found: %', v_pricing_key USING ERRCODE = 'P0002';
  END IF;

  -- 6. Consume credits FIFO (PROMPT 2 engine — granted first, paid next)
  SELECT public.consume_credits(
    v_user_id,
    v_cost,
    'boost_purchase',
    'listing',
    p_listing_id
  ) INTO v_consumed;

  IF NOT v_consumed THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  -- 7. INSERT boost row (audit trail)
  INSERT INTO public.boosts (
    listing_id, type, starts_at, ends_at, created_by, credits_charged
  ) VALUES (
    p_listing_id,
    p_boost_type::public.boost_type,
    v_now,
    CASE
      WHEN p_boost_type = 'bump' THEN v_now
      ELSE v_now + (v_duration_days || ' days')::interval
    END,
    v_user_id,
    v_cost
  )
  RETURNING id INTO v_boost_id;

  -- 8. UPDATE listings denormalized columns
  IF p_boost_type = 'bump' THEN
    v_new_last_bumped_at := v_now;
    UPDATE public.listings
    SET last_bumped_at = v_new_last_bumped_at
    WHERE id = p_listing_id;

  ELSIF p_boost_type = 'featured' THEN
    -- Extension cumule la durée : si déjà actif, on ajoute 7 jours à la fin
    -- existante. Sinon on part de now.
    v_new_featured_until := GREATEST(COALESCE(v_listing.featured_until, v_now), v_now)
                          + interval '7 days';
    UPDATE public.listings
    SET featured_until = v_new_featured_until
    WHERE id = p_listing_id;

  ELSIF p_boost_type = 'top_ad' THEN
    v_new_top_ad_until := GREATEST(COALESCE(v_listing.top_ad_until, v_now), v_now)
                        + interval '30 days';
    UPDATE public.listings
    SET top_ad_until = v_new_top_ad_until
    WHERE id = p_listing_id;
  END IF;

  -- 9. Notif boost_activated via create_notification (gère email queueing)
  v_notif_title := CASE p_boost_type
    WHEN 'bump'     THEN 'Annonce remontée 🚀'
    WHEN 'featured' THEN 'Boost « À la une » activé ⭐'
    WHEN 'top_ad'   THEN 'Top Annonce activé 👑'
  END;

  v_notif_body := format(
    '« %s » : %s',
    v_listing.title,
    CASE p_boost_type
      WHEN 'bump'     THEN 'votre annonce vient de remonter en tête du feed.'
      WHEN 'featured' THEN format('mise en avant ⭐ jusqu''au %s.',
                                  to_char(v_new_featured_until, 'DD/MM/YYYY'))
      WHEN 'top_ad'   THEN format('épinglée 👑 en haut du feed jusqu''au %s.',
                                  to_char(v_new_top_ad_until, 'DD/MM/YYYY'))
    END
  );

  BEGIN
    v_notif_id := public.create_notification(
      p_user_id    := v_user_id,
      p_type       := 'boost_activated'::public.notification_type,
      p_category   := 'listings'::public.notification_category,
      p_priority   := 'normal'::public.notification_priority,
      p_title      := v_notif_title,
      p_body       := v_notif_body,
      p_metadata   := jsonb_build_object(
        'boost_id',         v_boost_id,
        'listing_id',       p_listing_id,
        'boost_type',       p_boost_type,
        'credits_charged',  v_cost
      ),
      p_action_url := '/mes-annonces',
      p_icon       := 'Rocket'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Échec notif n'invalide pas le boost. Logger en WARNING.
    RAISE WARNING 'apply_boost notification failed for listing %: %', p_listing_id, SQLERRM;
    v_notif_id := NULL;
  END;

  -- 10. Return
  RETURN jsonb_build_object(
    'ok',               true,
    'boost_id',         v_boost_id,
    'boost_type',       p_boost_type,
    'credits_charged',  v_cost,
    'last_bumped_at',   v_new_last_bumped_at,
    'featured_until',   v_new_featured_until,
    'top_ad_until',     v_new_top_ad_until,
    'notification_id',  v_notif_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_boost(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_boost(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.apply_boost(uuid, text) IS
  'Owner achète un boost (bump/featured/top_ad) sur son listing actif. '
  'FIFO consume_credits + INSERT boost (audit) + UPDATE listings (denormalized) '
  '+ notif boost_activated. Cooldown 24h sur Bump. Extension cumule la durée. '
  'PROMPT 6 (2026-05-06).';

-- =============================================================================
-- SECTION F — Extend mark_listing_sold pour reset *_until columns
--
-- Préserve TOUTE la logique PROMPT 4 existante. Seul ajout : reset
-- featured_until + top_ad_until à NULL pour que le tri feed ne fasse plus
-- remonter une annonce vendue. last_bumped_at PRÉSERVÉ (info historique).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_listing_sold(
  p_listing_id uuid,
  p_sold_price numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id        uuid;
  v_listing_title   text;
  v_boosts_expired  int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id, title INTO v_owner_id, v_listing_title
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF p_sold_price IS NOT NULL AND p_sold_price < 0 THEN
    RAISE EXCEPTION 'invalid_sold_price' USING ERRCODE = 'P0001';
  END IF;

  -- UPDATE principal — étend PROMPT 4 avec reset des denormalized cols.
  UPDATE public.listings
  SET
    status         = 'sold'::public.listing_status,
    sold_at        = now(),
    sold_price     = p_sold_price,
    featured_until = NULL,
    top_ad_until   = NULL
    -- last_bumped_at intentionnellement PRÉSERVÉ (historique)
  WHERE id = p_listing_id;

  -- Expire les boosts actifs (la table boosts n'a pas de status,
  -- "actif" = ends_at > now()). Reset ends_at à now().
  UPDATE public.boosts
  SET ends_at = now()
  WHERE listing_id = p_listing_id
    AND ends_at > now();
  GET DIAGNOSTICS v_boosts_expired = ROW_COUNT;

  -- Notif système (silencieuse en cas d'échec)
  BEGIN
    PERFORM public.create_notification(
      p_user_id    := v_owner_id,
      p_type       := 'system'::public.notification_type,
      p_category   := 'listings'::public.notification_category,
      p_priority   := 'normal'::public.notification_priority,
      p_title      := 'Annonce marquée vendue 🎉',
      p_body       := format('« %s » a été retirée des résultats de recherche. Bravo !',
                             v_listing_title),
      p_metadata   := jsonb_build_object(
        'listing_id',     p_listing_id,
        'listing_title',  v_listing_title,
        'sold_price',     p_sold_price,
        'boosts_expired', v_boosts_expired
      ),
      p_action_url := '/mes-annonces',
      p_icon       := 'CheckCircle'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'mark_listing_sold notification failed for listing %: %', p_listing_id, SQLERRM;
  END;

  RETURN jsonb_build_object(
    'ok',             true,
    'listing_id',     p_listing_id,
    'sold_at',        now(),
    'sold_price',     p_sold_price,
    'boosts_expired', v_boosts_expired
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_listing_sold(uuid, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.mark_listing_sold(uuid, numeric) TO authenticated;

COMMENT ON FUNCTION public.mark_listing_sold(uuid, numeric) IS
  'Owner mark sold RPC : UPDATE status=sold + sold_at + sold_price + reset '
  'featured_until/top_ad_until (PROMPT 6) + expire boosts actifs. '
  'last_bumped_at préservé. Pas de refund prorata. Notif system. '
  'PROMPT 4 (2026-05-05) + PROMPT 6 extension (2026-05-06).';

-- =============================================================================
-- SECTION G — RPC helper get_active_top_ad_listings (rail "Top Ads" cap)
--
-- Retourne jusqu'à p_limit listing_ids ayant un Top Ad actif, triés par
-- date d'activation desc (DISTINCT ON garantit 1 ID par listing même si
-- plusieurs Top Ads cumulés sur la même annonce).
--
-- Utilisé par FeaturedListingsSection si on veut une rotation cap=8.
-- Optionnel V1 : peut être appelé OU non par le front (filtre direct
-- sur boosts type IN (...) reste possible via useFeaturedBoostListingIds).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_active_top_ad_listings(p_limit integer DEFAULT 8)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (b.listing_id) b.listing_id
  FROM public.boosts b
  JOIN public.listings l ON l.id = b.listing_id
  WHERE b.type = 'top_ad'::public.boost_type
    AND b.ends_at > now()
    AND l.status = 'active'::public.listing_status
  ORDER BY b.listing_id, b.starts_at DESC
  LIMIT GREATEST(p_limit, 0);
$$;

REVOKE ALL ON FUNCTION public.get_active_top_ad_listings(integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_active_top_ad_listings(integer) TO anon, authenticated;

COMMENT ON FUNCTION public.get_active_top_ad_listings(integer) IS
  'Retourne jusqu''à N listing_ids ayant un Top Ad actif (DISTINCT ON listing_id, '
  'sort starts_at DESC). PROMPT 6 (2026-05-06).';
