-- =====================================================================
-- Migration : RPC activate_deal_for_listing + cancel_deal_for_listing
-- Sprint    : Deals — Sprint 1 (UI vendeur)
-- Date      : 2026-04-30
-- Status    : NOT YET APPLIED — à coller dans Supabase Studio > SQL Editor
--             puis exécuter (transaction unique, idempotente).
--
-- Description :
--   Crée les deux RPC SECURITY DEFINER appelées par les Edge Functions
--   `activate-deal` et `cancel-deal` pour faire respectivement passer une
--   annonce en deal et annuler un deal actif. Les RPC sont atomiques :
--   un seul UPDATE listings + un INSERT/UPDATE listing_deal_history dans
--   la même transaction.
--
-- Pré-requis : migration sprint 0 (`docs/deals/03-migration.sql`) appliquée.
--   - 7 colonnes deal_* sur public.listings
--   - public.listing_deal_history créée
--   - trigger trg_enforce_deal_price_lock actif
--
-- Permissions :
--   - REVOKE FROM PUBLIC, GRANT EXECUTE TO authenticated
--   - SECURITY DEFINER → bypass RLS, vérification owner_id en interne
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) public.activate_deal_for_listing(...)
--    Snapshot du prix actuel, calcul des dates, baisse du price_mga,
--    INSERT history. Atomique.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_deal_for_listing(
  p_listing_id        uuid,
  p_discount_percent  integer,
  p_duration_days     integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id            uuid;
  v_listing            public.listings%ROWTYPE;
  v_now                timestamptz := now();
  v_deal_ends_at       timestamptz;
  v_lock_until         timestamptz;
  v_new_price          numeric;
  v_history_id         uuid;
BEGIN
  -- 1. Récupérer l'utilisateur courant via JWT
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.' USING ERRCODE = '42501';
  END IF;

  -- 2. Validation des inputs (belt + suspenders avec zod côté Edge Function)
  IF p_discount_percent IS NULL OR p_discount_percent < 5 OR p_discount_percent > 30 THEN
    RAISE EXCEPTION 'Pourcentage de remise invalide (doit être entre 5 et 30, reçu : %).', p_discount_percent
      USING ERRCODE = '22023';
  END IF;
  IF p_duration_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Durée invalide (doit être 7, 14 ou 30 jours, reçu : %).', p_duration_days
      USING ERRCODE = '22023';
  END IF;

  -- 3. Lock + chargement de l'annonce (FOR UPDATE pour éviter les races)
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Annonce introuvable.' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Vérifs métier
  IF v_listing.owner_id <> v_user_id THEN
    RAISE EXCEPTION 'Vous n''êtes pas propriétaire de cette annonce.' USING ERRCODE = '42501';
  END IF;
  IF v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'L''annonce doit être active pour activer un deal (statut actuel : %).', v_listing.status
      USING ERRCODE = '22023';
  END IF;
  IF v_listing.transaction <> 'vente' THEN
    RAISE EXCEPTION 'Les deals sont réservés aux annonces de vente.' USING ERRCODE = '22023';
  END IF;
  IF v_listing.deal_active = true THEN
    RAISE EXCEPTION 'Un deal est déjà actif sur cette annonce.' USING ERRCODE = '22023';
  END IF;
  IF v_listing.price_mga IS NULL OR v_listing.price_mga <= 0 THEN
    RAISE EXCEPTION 'Prix de l''annonce invalide.' USING ERRCODE = '22023';
  END IF;

  -- 5. Calculs serveur-side (source unique de vérité)
  v_deal_ends_at := v_now + (p_duration_days || ' days')::interval;
  v_lock_until   := v_deal_ends_at + interval '30 days';
  -- floor pour ne jamais sortir de 0.99 MGA — on arrondit au MGA inférieur,
  -- ce qui est cohérent avec le preview client (Math.floor(price * (1 - %/100))).
  v_new_price    := floor(v_listing.price_mga::numeric * (1 - p_discount_percent::numeric / 100));

  IF v_new_price <= 0 THEN
    RAISE EXCEPTION 'Le nouveau prix calculé est invalide (%).', v_new_price
      USING ERRCODE = '22023';
  END IF;

  -- 6. UPDATE atomique de listings (un seul SET pour respecter la
  -- contrainte listings_deal_active_consistency_chk : deal_active=true
  -- exige tous les snapshots renseignés en même temps).
  UPDATE public.listings
  SET
    deal_active             = true,
    deal_started_at         = v_now,
    deal_ends_at            = v_deal_ends_at,
    deal_duration_days      = p_duration_days,
    deal_discount_percent   = p_discount_percent,
    deal_original_price_mga = v_listing.price_mga,
    deal_price_lock_until   = v_lock_until,
    price_mga               = v_new_price,
    updated_at              = v_now
  WHERE id = p_listing_id;

  -- 7. INSERT historique (outcome='active' par défaut)
  INSERT INTO public.listing_deal_history (
    listing_id, user_id, started_at, discount_percent, duration_days,
    original_price_mga, new_price_mga, outcome
  ) VALUES (
    p_listing_id, v_user_id, v_now, p_discount_percent, p_duration_days,
    v_listing.price_mga, v_new_price, 'active'
  )
  RETURNING id INTO v_history_id;

  -- 8. Retour structuré pour l'Edge Function (forward au client)
  RETURN jsonb_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'history_id', v_history_id,
    'deal_started_at', v_now,
    'deal_ends_at', v_deal_ends_at,
    'deal_price_lock_until', v_lock_until,
    'discount_percent', p_discount_percent,
    'original_price_mga', v_listing.price_mga,
    'new_price_mga', v_new_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_deal_for_listing(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_deal_for_listing(uuid, integer, integer) TO authenticated;

COMMENT ON FUNCTION public.activate_deal_for_listing(uuid, integer, integer) IS
  'Active un deal sur une annonce (snapshot prix, calcul nouvelles dates, INSERT history). Atomique. Appelée uniquement via Edge Function activate-deal.';

-- ---------------------------------------------------------------------
-- 2) public.cancel_deal_for_listing(...)
--    Désactive un deal actif. Garde price_mga + deal_price_lock_until pour
--    bloquer l'abus « activer / annuler / remonter ».
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_deal_for_listing(
  p_listing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid;
  v_listing  public.listings%ROWTYPE;
  v_now      timestamptz := now();
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Annonce introuvable.' USING ERRCODE = 'P0002';
  END IF;
  IF v_listing.owner_id <> v_user_id THEN
    RAISE EXCEPTION 'Vous n''êtes pas propriétaire de cette annonce.' USING ERRCODE = '42501';
  END IF;
  IF v_listing.deal_active = false THEN
    RAISE EXCEPTION 'Aucun deal actif sur cette annonce.' USING ERRCODE = '22023';
  END IF;

  -- Important : on garde price_mga tel quel (le vendeur a déjà baissé,
  -- pas de restauration auto). On garde aussi deal_price_lock_until pour
  -- empêcher l'abus « j'active / j'annule / je remonte le prix ».
  --
  -- ⚠️ NB : la contrainte listings_deal_active_consistency_chk est
  -- uni-directionnelle (deal_active=false OR snapshots remplis).
  -- Le passage true → false avec snapshots remplis satisfait la branche
  -- « deal_active=false » → CHECK OK.
  UPDATE public.listings
  SET
    deal_active = false,
    updated_at  = v_now
  WHERE id = p_listing_id;

  UPDATE public.listing_deal_history
  SET
    outcome  = 'cancelled',
    ended_at = v_now
  WHERE listing_id = p_listing_id
    AND outcome = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'cancelled_at', v_now,
    'price_lock_until', v_listing.deal_price_lock_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_deal_for_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_deal_for_listing(uuid) TO authenticated;

COMMENT ON FUNCTION public.cancel_deal_for_listing(uuid) IS
  'Annule un deal actif (deal_active=false, history.outcome=cancelled). price_mga et deal_price_lock_until conservés pour anti-abus.';

COMMIT;

-- =====================================================================
-- SMOKE-TESTS — à exécuter SÉPARÉMENT après le COMMIT ci-dessus
-- =====================================================================

-- Test 1 — Les 2 fonctions sont créées
-- SELECT proname, pronargs FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace
--     AND proname IN ('activate_deal_for_listing', 'cancel_deal_for_listing');
--   -> 2 lignes (pronargs = 3 pour activate, 1 pour cancel).

-- Test 2 — `authenticated` a bien EXECUTE
-- SELECT routine_name, grantee, privilege_type
--   FROM information_schema.role_routine_grants
--   WHERE routine_name LIKE '%_deal_for_listing'
--     AND grantee = 'authenticated';
--   -> 2 lignes EXECUTE.

-- Test 3 — `public` n'a PAS EXECUTE (REVOKE OK)
-- SELECT routine_name, grantee
--   FROM information_schema.role_routine_grants
--   WHERE routine_name LIKE '%_deal_for_listing'
--     AND grantee = 'PUBLIC';
--   -> 0 ligne.

-- =====================================================================
-- ROLLBACK (à exécuter manuellement en cas de besoin)
-- =====================================================================
-- BEGIN;
--   DROP FUNCTION IF EXISTS public.cancel_deal_for_listing(uuid);
--   DROP FUNCTION IF EXISTS public.activate_deal_for_listing(uuid, integer, integer);
-- COMMIT;
