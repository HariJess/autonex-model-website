-- Atomic owner publish flow:
-- draft listing -> active + credit debit + boost materialization in one transaction.

CREATE OR REPLACE FUNCTION public.publish_listing_with_credits(
  p_listing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lst public.listings%ROWTYPE;
  owner_agency uuid;
  pending jsonb;
  bt text;
  total_cost int := 100; -- LISTING_PUBLISH_CREDIT_COST
  boost_cost int;
  ends_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO lst
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF lst.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF lst.status = 'active'::public.listing_status THEN
    RAISE EXCEPTION 'already_published' USING ERRCODE = 'P0001';
  END IF;

  IF lst.status IS DISTINCT FROM 'draft'::public.listing_status THEN
    RAISE EXCEPTION 'invalid_listing_status' USING ERRCODE = 'P0001';
  END IF;

  pending := COALESCE(lst.pending_boost_types, '[]'::jsonb);

  FOR bt IN
    SELECT DISTINCT lower(trim(value))
    FROM jsonb_array_elements_text(pending) AS value
  LOOP
    boost_cost := CASE bt
      WHEN 'urgent' THEN 20
      WHEN 'daily_bump' THEN 30
      WHEN 'featured' THEN 40
      WHEN 'top' THEN 60
      WHEN 'agency_spotlight' THEN 120
      ELSE NULL
    END;

    IF boost_cost IS NULL THEN
      RAISE EXCEPTION 'invalid_boost_type' USING ERRCODE = 'P0001';
    END IF;

    total_cost := total_cost + boost_cost;
  END LOOP;

  IF NOT public.consume_credits(
    auth.uid(),
    total_cost,
    'listing_publish',
    'listing_publish',
    p_listing_id
  ) THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  SELECT agency_id INTO owner_agency
  FROM public.profiles
  WHERE id = lst.owner_id;

  UPDATE public.listings
  SET
    status = 'active'::public.listing_status,
    publication_credits_charged = total_cost,
    pending_boost_types = '[]'::jsonb,
    rejection_reason = NULL,
    expires_at = now() + interval '90 days'
  WHERE id = p_listing_id;

  FOR bt IN
    SELECT DISTINCT lower(trim(value))
    FROM jsonb_array_elements_text(pending) AS value
  LOOP
    IF bt = 'agency_spotlight' THEN
      IF owner_agency IS NOT NULL THEN
        UPDATE public.agencies
        SET spotlight_until = GREATEST(COALESCE(spotlight_until, to_timestamp(0)), now()) + interval '30 days'
        WHERE id = owner_agency;
      END IF;
    ELSE
      ends_at := CASE bt
        WHEN 'urgent' THEN now() + interval '14 days'
        WHEN 'daily_bump' THEN now() + interval '7 days'
        WHEN 'featured' THEN now() + interval '14 days'
        WHEN 'top' THEN now() + interval '7 days'
      END;

      INSERT INTO public.boosts (listing_id, type, starts_at, ends_at)
      VALUES (p_listing_id, bt::public.boost_type, now(), ends_at);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'listing_id', p_listing_id,
    'status', 'active',
    'spent_credits', total_cost,
    'message', 'published'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_listing_with_credits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_listing_with_credits(uuid) TO authenticated;

COMMENT ON FUNCTION public.publish_listing_with_credits(uuid)
  IS 'Owner publish RPC: atomically charges credits, activates draft listing, and materializes pending boosts.';
