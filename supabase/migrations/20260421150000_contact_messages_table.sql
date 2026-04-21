-- =============================================================================
-- Mission 3 — contact_messages table + RLS
--
-- Stores submissions from the /contact form. Anyone (anon or authenticated)
-- can INSERT as long as they attest consent_given = true (CHECK constraint
-- + RLS policy). Reads and updates are admin-only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL CHECK (LENGTH(TRIM(full_name)) BETWEEN 2 AND 100),
  email           TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  whatsapp_phone  TEXT,
  subject         TEXT NOT NULL CHECK (subject IN ('general', 'technical', 'dealers', 'partnerships', 'other')),
  message         TEXT NOT NULL CHECK (LENGTH(TRIM(message)) BETWEEN 20 AND 2000),
  consent_given   BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived', 'spam')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  notes           TEXT,
  email_sent_at   TIMESTAMPTZ,
  email_error     TEXT,
  CONSTRAINT consent_required CHECK (consent_given = true)
);

COMMENT ON TABLE public.contact_messages IS
  'Contact form submissions. Mission 3. Write: anon + authenticated with consent_given=true. Read/update: admin only.';

CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created
  ON public.contact_messages (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email
  ON public.contact_messages (LOWER(email));

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_submit_contact" ON public.contact_messages;
CREATE POLICY "anyone_can_submit_contact"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (consent_given = true);

DROP POLICY IF EXISTS "admin_read_contact_messages" ON public.contact_messages;
CREATE POLICY "admin_read_contact_messages"
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (public.immonex_is_admin());

DROP POLICY IF EXISTS "admin_update_contact_messages" ON public.contact_messages;
CREATE POLICY "admin_update_contact_messages"
  ON public.contact_messages
  FOR UPDATE
  TO authenticated
  USING (public.immonex_is_admin())
  WITH CHECK (public.immonex_is_admin());
