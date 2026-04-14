-- WhatsApp contact on listing detail: public "has contact" probe + authenticated phone fetch after lead.

-- -----------------------------------------------------------------------------
-- 1) Public: whether listing has a WhatsApp-eligible phone (agency line or owner)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listing_has_whatsapp_contact(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    JOIN public.profiles p ON p.id = l.owner_id
    LEFT JOIN public.agencies a ON a.id = p.agency_id
    WHERE l.id = p_listing_id
      AND l.status = 'active'
      AND (
        CASE
          WHEN p.agency_id IS NOT NULL THEN NULLIF(trim(a.phone), '')
          ELSE NULLIF(trim(p.phone), '')
        END
      ) IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.listing_has_whatsapp_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listing_has_whatsapp_contact(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.listing_has_whatsapp_contact(uuid)
  IS 'True when active listing has agency or owner phone on file (for showing WhatsApp CTA; number not returned).';

-- -----------------------------------------------------------------------------
-- 2) Authenticated: resolve WhatsApp dial target after user intent (whatsapp lead)
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
        FROM public.leads ld
        WHERE ld.listing_id = l.id
          AND ld.type = 'whatsapp'::public.lead_type
          AND ld.visitor_name = auth.uid()::text
          AND ld.created_at >= now() - interval '15 minutes'
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_listing_whatsapp_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_whatsapp_phone(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_listing_whatsapp_phone(uuid)
  IS 'Agency phone when listing owner is an agent; else owner profile phone. Requires auth + recent whatsapp lead (or owner/admin).';

-- -----------------------------------------------------------------------------
-- 3) Leads: treat whatsapp like phone_reveal (no message body stored)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_lead_submission_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.visitor_name := NULLIF(trim(COALESCE(NEW.visitor_name, '')), '');
  NEW.visitor_email := NULLIF(lower(trim(COALESCE(NEW.visitor_email, ''))), '');
  NEW.visitor_phone := NULLIF(trim(COALESCE(NEW.visitor_phone, '')), '');
  NEW.message := NULLIF(trim(COALESCE(NEW.message, '')), '');
  NEW.type := COALESCE(NEW.type, 'contact_form'::public.lead_type);

  IF NEW.type = 'contact_form'::public.lead_type
     AND NEW.visitor_name IS NULL
     AND NEW.visitor_email IS NULL
     AND NEW.visitor_phone IS NULL THEN
    RAISE EXCEPTION 'lead_contact_required' USING ERRCODE = '23514';
  END IF;

  IF NEW.message IS NOT NULL AND length(NEW.message) > 1000 THEN
    RAISE EXCEPTION 'lead_message_too_long' USING ERRCODE = '23514';
  END IF;

  IF NEW.type = 'phone_reveal'::public.lead_type
     OR NEW.type = 'whatsapp'::public.lead_type THEN
    NEW.message := NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.listing_id = NEW.listing_id
      AND COALESCE(l.type, 'contact_form'::public.lead_type) = NEW.type
      AND COALESCE(lower(l.visitor_email), '') = COALESCE(NEW.visitor_email, '')
      AND COALESCE(l.visitor_phone, '') = COALESCE(NEW.visitor_phone, '')
      AND COALESCE(l.visitor_name, '') = COALESCE(NEW.visitor_name, '')
      AND l.created_at >= now() - interval '30 seconds'
  ) THEN
    RAISE EXCEPTION 'lead_rate_limited' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
