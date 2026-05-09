-- =============================================================================
-- PROMPT 4 — My Listings Dashboard : RPCs lifecycle (renew + sold) + sold_price
--
-- Page /mes-annonces (PROMPT 4) introduit 2 actions propriétaire critiques :
--   1. Renouveler une annonce expirée pour 30 jours (15 000 crédits, FIFO)
--   2. Marquer une annonce comme vendue (sold_at + sold_price + expire boosts)
--
-- Cette migration ajoute :
--   A. ALTER listings ADD COLUMN sold_price numeric (optionnel, déclaré par seller)
--   B. RPC renew_listing(uuid) → JSONB : check ownership, débite via consume_credits,
--      UPDATE expires_at + status='active' + renewal_count++ + sold_at=NULL,
--      notif listing_renewed
--   C. RPC mark_listing_sold(uuid, numeric) → JSONB : check ownership, UPDATE
--      status='sold' + sold_at + sold_price, expire boosts actifs (UPDATE ends_at),
--      notif system 'Annonce marquée vendue'
--   D. Extension trigger notify_listing_published pour SKIP si la GUC
--      'autonex.suppress_publish_notif' = '1' (utilisée par renew_listing pour
--      éviter une notif "annonce publiée" parasite quand on passe expired→active).
--      Notre notif listing_renewed reste, le user reçoit 1 seule notif sémantique.
--
-- Migration NON destructive : ALTER ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE
-- FUNCTION (idempotent), CREATE OR REPLACE TRIGGER. Safe à re-runner.
-- =============================================================================

-- =============================================================================
-- A. ALTER listings : ADD sold_price
-- =============================================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS sold_price numeric;

COMMENT ON COLUMN public.listings.sold_price IS
  'Prix de vente déclaré par le seller (optionnel, set par mark_listing_sold). '
  'NULL si non renseigné. Utile pour analytics market price futur.';

-- =============================================================================
-- B. Extension trigger notify_listing_published — guard via GUC
--
-- Avant : fire sur OLD.status DISTINCT FROM 'active' AND NEW.status = 'active'.
-- Problème : renew_listing UPDATE expired→active déclenche cette notif "annonce
-- publiée" alors que sémantiquement c'est un renouvellement (notre RPC envoie
-- déjà sa propre notif listing_renewed).
--
-- Fix : skip si current_setting('autonex.suppress_publish_notif', true) = '1'.
-- La RPC renew_listing set cette GUC localement (transaction-scoped) avant
-- l'UPDATE et la reset après.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_listing_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suppress TEXT;
BEGIN
  -- Guard : si renew_listing (ou autre code SECURITY DEFINER) a set cette GUC,
  -- on skip la notif "annonce publiée" pour éviter doublon avec listing_renewed.
  v_suppress := current_setting('autonex.suppress_publish_notif', true);
  IF v_suppress = '1' THEN
    RETURN NEW;
  END IF;

  IF (OLD.status IS DISTINCT FROM 'active'::public.listing_status)
     AND NEW.status = 'active'::public.listing_status
     AND NEW.owner_id IS NOT NULL THEN
    PERFORM create_notification(
      p_user_id := NEW.owner_id,
      p_type := 'listing_published',
      p_category := 'listings',
      p_priority := 'critical',
      p_title := 'Votre annonce est publiée !',
      p_body := 'Votre annonce « ' || NEW.title || ' » est maintenant visible sur AutoNex.',
      p_metadata := jsonb_build_object('listing_id', NEW.id, 'listing_title', NEW.title),
      p_action_url := '/annonce/' || NEW.id,
      p_icon := 'CheckCircle'
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_listing_published() IS
  'Trigger AFTER UPDATE listings. Crée une notif listing_published sur transition '
  'vers active, sauf si la GUC autonex.suppress_publish_notif=1 (ex. renew_listing). '
  'PROMPT 4 (2026-05-05) : ajout du guard GUC.';

-- =============================================================================
-- C. RPC renew_listing(p_listing_id) → JSONB
-- =============================================================================

CREATE OR REPLACE FUNCTION public.renew_listing(p_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_renewal_cost int;
  v_consumed boolean;
  v_new_expires timestamptz;
  v_listing_title text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Lock la row + vérifier l'existence + ownership
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

  -- Lookup coût depuis credit_pricing (single source of truth)
  SELECT amount INTO v_renewal_cost
  FROM public.credit_pricing
  WHERE key = 'renewal_listing';

  IF v_renewal_cost IS NULL OR v_renewal_cost <= 0 THEN
    RAISE EXCEPTION 'pricing_not_configured' USING ERRCODE = 'P0001';
  END IF;

  -- Débit FIFO via consume_credits (PROMPT 2)
  v_consumed := public.consume_credits(
    auth.uid(),
    v_renewal_cost,
    'renew_listing',
    'listing',
    p_listing_id
  );

  IF NOT v_consumed THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  -- Suppress notif "annonce publiée" pour cette transaction (cf. trigger).
  -- Notre notif listing_renewed est plus précise sémantiquement.
  PERFORM set_config('autonex.suppress_publish_notif', '1', true);

  v_new_expires := now() + interval '30 days';

  UPDATE public.listings
  SET
    status = 'active'::public.listing_status,
    expires_at = v_new_expires,
    renewal_count = COALESCE(renewal_count, 0) + 1,
    sold_at = NULL
  WHERE id = p_listing_id;

  -- Reset la GUC pour ne pas affecter d'autres updates dans la même transaction
  PERFORM set_config('autonex.suppress_publish_notif', '', true);

  -- Notif sémantique listing_renewed (silencieuse en cas d'échec)
  BEGIN
    PERFORM public.create_notification(
      p_user_id := v_owner_id,
      p_type := 'listing_renewed'::notification_type,
      p_category := 'listings'::notification_category,
      p_priority := 'normal'::notification_priority,
      p_title := 'Annonce renouvelée pour 30 jours',
      p_body := format('« %s » est de nouveau visible jusqu''au %s.',
                       v_listing_title,
                       to_char(v_new_expires, 'DD/MM/YYYY')),
      p_metadata := jsonb_build_object(
        'listing_id', p_listing_id,
        'listing_title', v_listing_title,
        'new_expires_at', v_new_expires,
        'credits_consumed', v_renewal_cost
      ),
      p_action_url := '/annonce/' || p_listing_id,
      p_icon := 'RefreshCw'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'listing_renewed notification failed for listing %: %', p_listing_id, SQLERRM;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'listing_id', p_listing_id,
    'expires_at', v_new_expires,
    'credits_consumed', v_renewal_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.renew_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_listing(uuid) TO authenticated;

COMMENT ON FUNCTION public.renew_listing(uuid) IS
  'Owner renew RPC : débite renewal_listing crédits (FIFO) + UPDATE listing '
  'status=active + expires_at=now+30j + renewal_count++. Notif listing_renewed. '
  'GUC suppress_publish_notif évite doublon avec trigger. PROMPT 4 (2026-05-05).';

-- =============================================================================
-- D. RPC mark_listing_sold(p_listing_id, p_sold_price) → JSONB
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
  v_owner_id uuid;
  v_listing_title text;
  v_boosts_expired int;
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

  -- Garde-fou prix : doit être >= 0 si fourni (NULL accepté = optionnel)
  IF p_sold_price IS NOT NULL AND p_sold_price < 0 THEN
    RAISE EXCEPTION 'invalid_sold_price' USING ERRCODE = 'P0001';
  END IF;

  -- UPDATE principal
  UPDATE public.listings
  SET
    status = 'sold'::public.listing_status,
    sold_at = now(),
    sold_price = p_sold_price
  WHERE id = p_listing_id;

  -- Expire les boosts actifs liés (la table boosts n'a pas de colonne status,
  -- "actif" = ends_at > now()). On reset ends_at à now() pour signifier "terminé".
  UPDATE public.boosts
  SET ends_at = now()
  WHERE listing_id = p_listing_id
    AND ends_at > now();
  GET DIAGNOSTICS v_boosts_expired = ROW_COUNT;

  -- Notif système (silencieuse en cas d'échec)
  BEGIN
    PERFORM public.create_notification(
      p_user_id := v_owner_id,
      p_type := 'system'::notification_type,
      p_category := 'listings'::notification_category,
      p_priority := 'normal'::notification_priority,
      p_title := 'Annonce marquée vendue 🎉',
      p_body := format('« %s » a été retirée des résultats de recherche. Bravo !',
                       v_listing_title),
      p_metadata := jsonb_build_object(
        'listing_id', p_listing_id,
        'listing_title', v_listing_title,
        'sold_price', p_sold_price,
        'boosts_expired', v_boosts_expired
      ),
      p_action_url := '/mes-annonces',
      p_icon := 'CheckCircle'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'mark_listing_sold notification failed for listing %: %', p_listing_id, SQLERRM;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'listing_id', p_listing_id,
    'sold_at', now(),
    'sold_price', p_sold_price,
    'boosts_expired', v_boosts_expired
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_listing_sold(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_listing_sold(uuid, numeric) TO authenticated;

COMMENT ON FUNCTION public.mark_listing_sold(uuid, numeric) IS
  'Owner mark sold RPC : UPDATE status=sold + sold_at=now + sold_price (optionnel) '
  '+ expire boosts actifs liés. Notif system. PROMPT 4 (2026-05-05).';

-- =============================================================================
-- TEST PLAN SQL post-deploy (à runner par Ali pour smoke test)
-- =============================================================================
-- -- Test 1 : RPC existence
-- SELECT proname FROM pg_proc WHERE proname IN ('renew_listing', 'mark_listing_sold');
-- -- Attendu : 2 rows
--
-- -- Test 2 : sold_price column existe
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='listings' AND column_name='sold_price';
-- -- Attendu : 1 row, data_type='numeric'
--
-- -- Test 3 : not_owner — appel par un autre user (à tester via SQL Editor en
-- -- impersonating un user, ou via la RLS native auth.uid())
--
-- -- Test 4 : insufficient_credits — forcer balance < 15000 puis renew
-- -- (le test smoke réel se fait via /mes-annonces avec un listing expired et
-- -- un user à balance insuffisante)
--
-- -- Test 5 : flow nominal renew sur compte préservé alipirbay@gmail.com
-- --   (a) Forcer expire d'un listing :
-- --       UPDATE public.listings SET expires_at = '2026-01-01', status = 'expired'
-- --       WHERE owner_id = (SELECT id FROM auth.users WHERE email='alipirbay@gmail.com')
-- --       LIMIT 1 RETURNING id, title;
-- --   (b) Via /mes-annonces → tab Expirées → click Renouveler → modal → Confirmer
-- --   (c) Vérifier toast success + balance débitée 15000 + listing en tab Actives
