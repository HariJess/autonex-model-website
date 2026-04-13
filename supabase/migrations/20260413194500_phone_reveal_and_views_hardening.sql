-- Targeted hardening: phone reveal scoping + public-safe view counting.

-- -----------------------------------------------------------------------------
-- 1) Phone reveal scoping: require authenticated caller and scoped reveal trace.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_listing_owner_phone(p_listing_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.phone
  FROM public.listings l
  JOIN public.profiles p ON p.id = l.owner_id
  WHERE l.id = p_listing_id
    AND l.status = 'active'
    AND auth.uid() IS NOT NULL
    AND (
      auth.uid() = l.owner_id
      OR public.immonex_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.leads ld
        WHERE ld.listing_id = l.id
          AND ld.type = 'phone_reveal'::public.lead_type
          AND ld.visitor_name = auth.uid()::text
          AND ld.created_at >= now() - interval '15 minutes'
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_listing_owner_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_owner_phone(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Public view counting with dedupe cooldown (30 min) per listing/session.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_view_events (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_view_events_viewed_at
  ON public.listing_view_events (viewed_at DESC);

ALTER TABLE public.listing_view_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_view_events_no_select" ON public.listing_view_events;
CREATE POLICY "listing_view_events_no_select"
  ON public.listing_view_events
  FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "listing_view_events_no_insert" ON public.listing_view_events;
CREATE POLICY "listing_view_events_no_insert"
  ON public.listing_view_events
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "listing_view_events_no_update" ON public.listing_view_events;
CREATE POLICY "listing_view_events_no_update"
  ON public.listing_view_events
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "listing_view_events_no_delete" ON public.listing_view_events;
CREATE POLICY "listing_view_events_no_delete"
  ON public.listing_view_events
  FOR DELETE
  USING (false);

CREATE OR REPLACE FUNCTION public.increment_views_public(
  p_listing_id uuid,
  p_session_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session text;
  v_last_seen timestamptz;
BEGIN
  IF p_listing_id IS NULL THEN
    RETURN;
  END IF;

  -- Use provided session id when available; fallback to auth uid for logged users.
  v_session := NULLIF(trim(COALESCE(p_session_id, '')), '');
  IF v_session IS NULL AND auth.uid() IS NOT NULL THEN
    v_session := auth.uid()::text;
  END IF;

  -- Without any actor marker we do nothing (prevents blind anonymous inflation).
  IF v_session IS NULL OR length(v_session) < 8 OR length(v_session) > 128 THEN
    RETURN;
  END IF;

  SELECT e.viewed_at
  INTO v_last_seen
  FROM public.listing_view_events e
  WHERE e.listing_id = p_listing_id
    AND e.session_id = v_session;

  IF v_last_seen IS NULL OR v_last_seen < now() - interval '30 minutes' THEN
    INSERT INTO public.listing_view_events (listing_id, session_id, viewed_at)
    VALUES (p_listing_id, v_session, now())
    ON CONFLICT (listing_id, session_id)
    DO UPDATE SET viewed_at = EXCLUDED.viewed_at;

    UPDATE public.listings
    SET views_count = views_count + 1
    WHERE id = p_listing_id
      AND status = 'active';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_views_public(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_views_public(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.increment_views_public(uuid, text)
  IS 'Counts one view per listing/session every 30 minutes for active listings.';

