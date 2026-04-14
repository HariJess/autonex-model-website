-- Post-publish boost purchase: owner buys boosts for active/paused listings (no new moderation round).
-- Credits debited atomically with boost row creation (same transaction as consume_credits ledger write).

CREATE OR REPLACE FUNCTION public.purchase_listing_boosts(
  p_listing_id uuid,
  p_boost_types text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lst public.listings%ROWTYPE;
  bt text;
  total_cost int := 0;
  t_cost int;
  ends_at timestamptz;
  distinct_count int;
  total_len int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_boost_types IS NULL OR array_length(p_boost_types, 1) IS NULL OR array_length(p_boost_types, 1) = 0 THEN
    RAISE EXCEPTION 'no_boost_types' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(DISTINCT lower(trim(t)))
  INTO distinct_count
  FROM unnest(p_boost_types) AS u(t);

  SELECT array_length(p_boost_types, 1) INTO total_len;

  IF distinct_count IS DISTINCT FROM total_len THEN
    RAISE EXCEPTION 'duplicate_boost_types' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO lst FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF lst.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF lst.status NOT IN ('active'::public.listing_status, 'paused'::public.listing_status) THEN
    RAISE EXCEPTION 'listing_not_boostable' USING ERRCODE = 'P0001';
  END IF;

  FOREACH bt IN ARRAY p_boost_types LOOP
    bt := lower(trim(bt));
    t_cost := CASE bt
      WHEN 'urgent' THEN 20
      WHEN 'daily_bump' THEN 30
      WHEN 'featured' THEN 40
      WHEN 'top' THEN 60
      ELSE NULL
    END;

    IF t_cost IS NULL THEN
      RAISE EXCEPTION 'invalid_boost_type' USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.boosts b
      WHERE b.listing_id = p_listing_id
        AND b.type = bt::public.boost_type
        AND b.ends_at > now()
    ) THEN
      RAISE EXCEPTION 'boost_already_active' USING ERRCODE = 'P0001';
    END IF;

    total_cost := total_cost + t_cost;
  END LOOP;

  IF NOT public.consume_credits(
    auth.uid(),
    total_cost,
    'listing_boost_purchase',
    'listing',
    p_listing_id
  ) THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  FOREACH bt IN ARRAY p_boost_types LOOP
    bt := lower(trim(bt));
    ends_at := CASE bt
      WHEN 'urgent' THEN now() + interval '14 days'
      WHEN 'daily_bump' THEN now() + interval '7 days'
      WHEN 'featured' THEN now() + interval '14 days'
      WHEN 'top' THEN now() + interval '7 days'
    END;
    INSERT INTO public.boosts (listing_id, type, starts_at, ends_at)
    VALUES (p_listing_id, bt::public.boost_type, now(), ends_at);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'spent', total_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_listing_boosts(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_listing_boosts(uuid, text[]) TO authenticated;

COMMENT ON FUNCTION public.purchase_listing_boosts(uuid, text[])
  IS 'Owner: purchase boosts for active/paused listing; debits credits and inserts boost rows (same durations as moderation path).';
