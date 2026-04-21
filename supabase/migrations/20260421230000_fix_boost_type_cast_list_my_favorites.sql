-- =============================================================================
-- Mission 4 — Hotfix 2 list_my_favorites (erreur 42846 boost_type[] → text[])
-- =============================================================================
-- La version précédente (`20260421220000`) produisait encore un 400 côté RPC :
--
--   "COALESCE could not convert type text[] to boost_type[]"  (code 42846)
--
-- Cause : la colonne `boosts.type` est un ENUM `boost_type` (valeurs top /
-- featured / urgent / newsletter / daily_bump / agency_spotlight). Le
-- `ARRAY_AGG(DISTINCT b.type)` produit un `boost_type[]`, que COALESCE avec
-- l'alternative `ARRAY[]::TEXT[]` ne peut pas unifier (pas de cast implicite
-- enum[] ↔ text[]).
--
-- Fix : cast explicite `b.type::TEXT` à l'intérieur du ARRAY_AGG, qui donne
-- directement un `text[]` compatible avec la branche COALESCE et avec la
-- signature de retour `lst_active_boost_types TEXT[]`.
--
-- Le cast de `lp.url` (listing_photos.url) reste inutile — la colonne est
-- TEXT natif, ARRAY_AGG produit déjà un text[].
--
-- Non destructif : DROP FUNCTION IF EXISTS + CREATE OR REPLACE, idempotent.
-- Aucun DDL sur `favorites`.
--
-- NOTE : DROP préalable nécessaire car Postgres refuse un CREATE OR REPLACE
-- dont la RETURNS TABLE diverge de la version précédente.
-- =============================================================================

DROP FUNCTION IF EXISTS public.list_my_favorites();

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
  lst_original_price_mga     NUMERIC,
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
      (SELECT ARRAY_AGG(DISTINCT b.type::TEXT)
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
  'Mission 4 (hotfix 2) — Liste enrichie des favoris actifs pour auth.uid(). Cast boost_type::TEXT dans ARRAY_AGG pour éviter erreur COALESCE boost_type[] → text[].';
