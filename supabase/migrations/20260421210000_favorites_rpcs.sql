-- =============================================================================
-- Mission 4 — Favoris full-stack
-- =============================================================================
-- Schéma de la table `favorites` déjà conforme en prod (PK composite + CASCADE +
-- RLS own-only). AUCUN DDL sur la table : cette migration ajoute uniquement
-- les RPCs SECURITY DEFINER nécessaires au front.
--
-- RPCs créées :
--   1. toggle_favorite(p_listing_id)  — ajoute / retire atomique (idempotent)
--   2. list_my_favorites()            — liste enrichie pour /favoris (status='active')
--
-- Contrat sécurité :
--   - auth.uid() IS NULL → RAISE 'not_authenticated'
--   - Toute écriture restreinte à auth.uid() côté RPC ; RLS déjà en place
--     par ailleurs (garde-fou double)
--   - Alias explicites (préfixe fav_ / lst_ / agency_ / owner_) — anti column
--     ambiguity (leçon Mission 5)
--   - Seul le rôle `authenticated` peut exécuter (REVOKE PUBLIC / anon)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. toggle_favorite — add ou remove atomique, idempotent, race-safe
-- -----------------------------------------------------------------------------
-- Retourne un seul row décrivant l'état post-toggle :
--   fav_is_favorite = TRUE  → le listing est maintenant favori
--   fav_is_favorite = FALSE → le listing n'est plus favori
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.toggle_favorite(p_listing_id UUID)
RETURNS TABLE (
  fav_listing_id   UUID,
  fav_user_id      UUID,
  fav_created_at   TIMESTAMPTZ,
  fav_is_favorite  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id             UUID;
  v_existing_created_at TIMESTAMPTZ;
  v_new_created_at      TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_id_required' USING ERRCODE = '22004';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = p_listing_id) THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Lock l'éventuelle ligne existante pour éviter toggle concurrent
  SELECT f.created_at INTO v_existing_created_at
  FROM public.favorites f
  WHERE f.user_id = v_user_id
    AND f.listing_id = p_listing_id
  FOR UPDATE;

  IF FOUND THEN
    -- Retrait
    DELETE FROM public.favorites
    WHERE user_id = v_user_id
      AND listing_id = p_listing_id;

    RETURN QUERY SELECT
      p_listing_id           AS fav_listing_id,
      v_user_id              AS fav_user_id,
      v_existing_created_at  AS fav_created_at,
      FALSE                  AS fav_is_favorite;
  ELSE
    -- Ajout (ON CONFLICT = safety net concurrence)
    INSERT INTO public.favorites (user_id, listing_id)
    VALUES (v_user_id, p_listing_id)
    ON CONFLICT (user_id, listing_id) DO NOTHING
    RETURNING created_at INTO v_new_created_at;

    -- Si ON CONFLICT a bloqué (race), récupérer le created_at existant
    IF v_new_created_at IS NULL THEN
      SELECT f.created_at INTO v_new_created_at
      FROM public.favorites f
      WHERE f.user_id = v_user_id
        AND f.listing_id = p_listing_id;
    END IF;

    RETURN QUERY SELECT
      p_listing_id       AS fav_listing_id,
      v_user_id          AS fav_user_id,
      v_new_created_at   AS fav_created_at,
      TRUE               AS fav_is_favorite;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_favorite(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_favorite(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_favorite(UUID) TO authenticated;

COMMENT ON FUNCTION public.toggle_favorite(UUID) IS
  'Mission 4 — Toggle atomique favori pour auth.uid(). Retourne l''état final.';


-- -----------------------------------------------------------------------------
-- 2. list_my_favorites — liste enrichie pour la page /favoris
-- -----------------------------------------------------------------------------
-- Filtre côté SQL : status = 'active' (les autres statuts sont masqués ;
-- la ligne en DB persiste, elle réapparaîtra si le listing redevient actif).
-- Enrichissements agrégés inline : photos, boosts actifs, agence, owner name.
-- Zéro refetch côté client : le mapping DisplayListing est fait client-side.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_my_favorites()
RETURNS TABLE (
  fav_listing_id             UUID,
  fav_created_at             TIMESTAMPTZ,

  lst_id                     UUID,
  lst_title                  TEXT,
  lst_description            TEXT,
  lst_type                   public.listing_type,
  lst_transaction            public.transaction_type,
  lst_price_mga              BIGINT,
  lst_price_eur              NUMERIC,
  lst_negotiable             BOOLEAN,
  lst_surface                INTEGER,
  lst_rooms                  INTEGER,
  lst_bathrooms              INTEGER,
  lst_toilets                INTEGER,
  lst_ville                  TEXT,
  lst_availability_status    TEXT,
  lst_body_style             TEXT,
  lst_doors                  INTEGER,
  lst_drivetrain             TEXT,
  lst_exterior_color         TEXT,
  lst_engine_displacement_l  NUMERIC,
  lst_fuel                   TEXT,
  lst_interior_color         TEXT,
  lst_is_electric            BOOLEAN,
  lst_is_hybrid              BOOLEAN,
  lst_make                   TEXT,
  lst_mileage_km             INTEGER,
  lst_model                  TEXT,
  lst_rental_mode            TEXT,
  lst_seats                  INTEGER,
  lst_seller_type            TEXT,
  lst_transmission_gearbox   TEXT,
  lst_vehicle_condition      TEXT,
  lst_whatsapp_phone         TEXT,
  lst_year                   INTEGER,
  lst_region                 TEXT,
  lst_arrondissement         TEXT,
  lst_quartier               TEXT,
  lst_quartier_libre         TEXT,
  lst_lat                    NUMERIC,
  lst_lng                    NUMERIC,
  lst_features               JSONB,
  lst_status                 public.listing_status,
  lst_views_count            INTEGER,
  lst_created_at             TIMESTAMPTZ,
  lst_owner_id               UUID,
  lst_original_price_mga     BIGINT,
  lst_video_url              TEXT,
  lst_virtual_tour_url       TEXT,
  lst_internal_ref           TEXT,
  lst_is_new_program         BOOLEAN,
  lst_rejection_reason       TEXT,
  lst_pending_boost_types    JSONB,

  lst_photos_urls            TEXT[],
  lst_active_boost_types     TEXT[],
  agency_name                TEXT,
  agency_slug                TEXT,
  agency_logo_url            TEXT,
  agency_verified            BOOLEAN,
  owner_full_name            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  SELECT
    f.listing_id                AS fav_listing_id,
    f.created_at                AS fav_created_at,

    l.id                        AS lst_id,
    l.title                     AS lst_title,
    l.description               AS lst_description,
    l.type                      AS lst_type,
    l.transaction               AS lst_transaction,
    l.price_mga                 AS lst_price_mga,
    l.price_eur                 AS lst_price_eur,
    l.negotiable                AS lst_negotiable,
    l.surface                   AS lst_surface,
    l.rooms                     AS lst_rooms,
    l.bathrooms                 AS lst_bathrooms,
    l.toilets                   AS lst_toilets,
    l.ville                     AS lst_ville,
    l.availability_status       AS lst_availability_status,
    l.body_style                AS lst_body_style,
    l.doors                     AS lst_doors,
    l.drivetrain                AS lst_drivetrain,
    l.exterior_color            AS lst_exterior_color,
    l.engine_displacement_l     AS lst_engine_displacement_l,
    l.fuel                      AS lst_fuel,
    l.interior_color            AS lst_interior_color,
    l.is_electric               AS lst_is_electric,
    l.is_hybrid                 AS lst_is_hybrid,
    l.make                      AS lst_make,
    l.mileage_km                AS lst_mileage_km,
    l.model                     AS lst_model,
    l.rental_mode               AS lst_rental_mode,
    l.seats                     AS lst_seats,
    l.seller_type               AS lst_seller_type,
    l.transmission_gearbox      AS lst_transmission_gearbox,
    l.vehicle_condition         AS lst_vehicle_condition,
    l.whatsapp_phone            AS lst_whatsapp_phone,
    l.year                      AS lst_year,
    l.region                    AS lst_region,
    l.arrondissement            AS lst_arrondissement,
    l.quartier                  AS lst_quartier,
    l.quartier_libre            AS lst_quartier_libre,
    l.lat                       AS lst_lat,
    l.lng                       AS lst_lng,
    l.features                  AS lst_features,
    l.status                    AS lst_status,
    l.views_count               AS lst_views_count,
    l.created_at                AS lst_created_at,
    l.owner_id                  AS lst_owner_id,
    l.original_price_mga        AS lst_original_price_mga,
    l.video_url                 AS lst_video_url,
    l.virtual_tour_url          AS lst_virtual_tour_url,
    l.internal_ref              AS lst_internal_ref,
    l.is_new_program            AS lst_is_new_program,
    l.rejection_reason          AS lst_rejection_reason,
    l.pending_boost_types       AS lst_pending_boost_types,

    COALESCE(
      (SELECT ARRAY_AGG(lp.url ORDER BY lp.position)
       FROM public.listing_photos lp
       WHERE lp.listing_id = l.id),
      ARRAY[]::TEXT[]
    )                           AS lst_photos_urls,
    COALESCE(
      (SELECT ARRAY_AGG(DISTINCT b.type)
       FROM public.boosts b
       WHERE b.listing_id = l.id
         AND b.ends_at > NOW()),
      ARRAY[]::TEXT[]
    )                           AS lst_active_boost_types,

    ag.name                     AS agency_name,
    ag.slug                     AS agency_slug,
    ag.logo_url                 AS agency_logo_url,
    ag.verified                 AS agency_verified,
    p.full_name                 AS owner_full_name
  FROM public.favorites f
  INNER JOIN public.listings l  ON l.id = f.listing_id
  LEFT  JOIN public.profiles p  ON p.id = l.owner_id
  LEFT  JOIN public.agencies ag ON ag.id = p.agency_id
  WHERE f.user_id = v_user_id
    AND l.status = 'active'::public.listing_status
  ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_favorites() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_favorites() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_my_favorites() TO authenticated;

COMMENT ON FUNCTION public.list_my_favorites() IS
  'Mission 4 — Liste enrichie des favoris actifs pour auth.uid(). Filtre status=active.';
