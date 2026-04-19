-- Replace the visitor_name = auth.uid()::text hack on public.leads with a
-- proper phone_reveal_events table. Closes the legacy door via a guard
-- in enforce_lead_submission_rules. No data migration: leads is empty.

-- -----------------------------------------------------------------------------
-- 1) New table: phone_reveal_events (one row per user × listing × kind × tick)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_reveal_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('phone_reveal', 'whatsapp')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_reveal_events_lookup
  ON public.phone_reveal_events (listing_id, user_id, kind, created_at DESC);

ALTER TABLE public.phone_reveal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phone_reveal_events_insert_self" ON public.phone_reveal_events;
CREATE POLICY "phone_reveal_events_insert_self"
  ON public.phone_reveal_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "phone_reveal_events_select_scoped" ON public.phone_reveal_events;
CREATE POLICY "phone_reveal_events_select_scoped"
  ON public.phone_reveal_events
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.immonex_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = phone_reveal_events.listing_id
        AND l.owner_id = auth.uid()
    )
  );

-- No UPDATE / DELETE policies: RLS denies both for everyone (incl. authenticated).

COMMENT ON TABLE public.phone_reveal_events
  IS 'Tracks per-user phone reveal and WhatsApp clicks. Replaces the legacy leads.visitor_name=auth.uid()::text hack.';

-- -----------------------------------------------------------------------------
-- 2) Anti-spam trigger: same (user, listing, kind) within 30s is rejected
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_phone_reveal_event_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.phone_reveal_events e
    WHERE e.user_id = NEW.user_id
      AND e.listing_id = NEW.listing_id
      AND e.kind = NEW.kind
      AND e.created_at >= now() - interval '30 seconds'
  ) THEN
    RAISE EXCEPTION 'phone_reveal_rate_limited' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_phone_reveal_event_rate_limit ON public.phone_reveal_events;
CREATE TRIGGER trg_enforce_phone_reveal_event_rate_limit
BEFORE INSERT ON public.phone_reveal_events
FOR EACH ROW
EXECUTE FUNCTION public.enforce_phone_reveal_event_rate_limit();

-- -----------------------------------------------------------------------------
-- 3) Rewire get_listing_owner_phone: read phone_reveal_events
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
        FROM public.phone_reveal_events e
        WHERE e.listing_id = l.id
          AND e.user_id = auth.uid()
          AND e.kind = 'phone_reveal'
          AND e.created_at >= now() - interval '15 minutes'
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_listing_owner_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_owner_phone(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) Rewire get_listing_whatsapp_phone: read phone_reveal_events
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_listing_whatsapp_phone(p_listing_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.agency_id IS NOT NULL THEN NULLIF(trim(a.phone), '')
    ELSE NULLIF(trim(p.phone), '')
  END
  FROM public.listings l
  JOIN public.profiles p ON p.id = l.owner_id
  LEFT JOIN public.agencies a ON a.id = p.agency_id
  WHERE l.id = p_listing_id
    AND l.status = 'active'
    AND auth.uid() IS NOT NULL
    AND (
      auth.uid() = l.owner_id
      OR public.immonex_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.phone_reveal_events e
        WHERE e.listing_id = l.id
          AND e.user_id = auth.uid()
          AND e.kind = 'whatsapp'
          AND e.created_at >= now() - interval '15 minutes'
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_listing_whatsapp_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_whatsapp_phone(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5) Hard guard on public.leads: phone_reveal/whatsapp must use the new table.
--    Full redefinition of enforce_lead_submission_rules to add the guard while
--    keeping every existing rule (sanitize, contact_form contact requirement,
--    message length, 30s dedup) intact. The previous "message := NULL for
--    phone_reveal/whatsapp" branch is dropped: those rows now error out early.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_lead_submission_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.visitor_name  := NULLIF(trim(COALESCE(NEW.visitor_name, '')), '');
  NEW.visitor_email := NULLIF(lower(trim(COALESCE(NEW.visitor_email, ''))), '');
  NEW.visitor_phone := NULLIF(trim(COALESCE(NEW.visitor_phone, '')), '');
  NEW.message       := NULLIF(trim(COALESCE(NEW.message, '')), '');
  NEW.type          := COALESCE(NEW.type, 'contact_form'::public.lead_type);

  IF NEW.type = 'phone_reveal'::public.lead_type
     OR NEW.type = 'whatsapp'::public.lead_type THEN
    RAISE EXCEPTION 'lead_type_obsolete_use_phone_reveal_events'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.type = 'contact_form'::public.lead_type
     AND NEW.visitor_name IS NULL
     AND NEW.visitor_email IS NULL
     AND NEW.visitor_phone IS NULL THEN
    RAISE EXCEPTION 'lead_contact_required' USING ERRCODE = '23514';
  END IF;

  IF NEW.message IS NOT NULL AND length(NEW.message) > 1000 THEN
    RAISE EXCEPTION 'lead_message_too_long' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.listing_id = NEW.listing_id
      AND COALESCE(l.type, 'contact_form'::public.lead_type) = NEW.type
      AND COALESCE(lower(l.visitor_email), '') = COALESCE(NEW.visitor_email, '')
      AND COALESCE(l.visitor_phone, '') = COALESCE(NEW.visitor_phone, '')
      AND COALESCE(l.visitor_name,  '') = COALESCE(NEW.visitor_name,  '')
      AND l.created_at >= now() - interval '30 seconds'
  ) THEN
    RAISE EXCEPTION 'lead_rate_limited' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
