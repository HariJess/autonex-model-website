-- =============================================================================
-- Mission 3 — submit_contact_message RPC
--
-- User-facing write path for the /contact form. Bypasses RLS via SECURITY
-- DEFINER so anon users can submit without authentication, while still being
-- rate-limited (3 messages per hour per email).
--
-- Error codes (RAISE EXCEPTION message):
--   consent_required       — p_consent_given = false
--   invalid_subject        — subject not in the allowed 5-value list
--   rate_limit_exceeded    — same email submitted ≥3 times in the last hour
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_contact_message(
  p_full_name      TEXT,
  p_email          TEXT,
  p_subject        TEXT,
  p_message        TEXT,
  p_consent_given  BOOLEAN,
  p_whatsapp_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id           UUID;
  v_recent_count     INTEGER;
  v_normalized_email TEXT;
BEGIN
  IF NOT p_consent_given THEN
    RAISE EXCEPTION 'consent_required'
      USING HINT = 'Consent to data processing is required to submit a contact message';
  END IF;

  IF p_subject NOT IN ('general', 'technical', 'dealers', 'partnerships', 'other') THEN
    RAISE EXCEPTION 'invalid_subject';
  END IF;

  v_normalized_email := LOWER(TRIM(p_email));

  SELECT COUNT(*) INTO v_recent_count
    FROM public.contact_messages cm
   WHERE LOWER(cm.email) = v_normalized_email
     AND cm.created_at > (NOW() - INTERVAL '1 hour');

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Vous avez soumis trop de messages récemment. Merci de patienter avant de réessayer.';
  END IF;

  INSERT INTO public.contact_messages (
    full_name, email, whatsapp_phone, subject, message, consent_given
  ) VALUES (
    TRIM(p_full_name),
    v_normalized_email,
    NULLIF(TRIM(p_whatsapp_phone), ''),
    p_subject,
    TRIM(p_message),
    p_consent_given
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success',    true,
    'message_id', v_new_id
  );
END;
$$;

COMMENT ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) IS
  'Contact form write path. Rate-limited 3/hour/email. Mission 3.';

REVOKE ALL ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated;
