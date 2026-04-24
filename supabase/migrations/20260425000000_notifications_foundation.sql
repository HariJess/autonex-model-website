-- Lot 10.1 — Foundation du système de notifications AutoNex
--
-- Cette migration crée :
--   1. Les enums (type / category / priority)
--   2. La table `notifications` avec RLS et indexes ciblés
--   3. La table `notification_preferences` (toggles par catégorie × canal)
--   4. Les helpers PL/pgSQL : create_notification + is_category_*_enabled + calculate_next_digest_time
--   5. Les triggers de création automatique sur :
--        - listings (publication, refus)
--        - credits_ledger (achat crédits)
--        - auth.users (auto-création des préférences à l'inscription)
--   6. La fonction scheduled `notify_expiring_listings()` (appelée par cron plus tard)
--   7. Les RPCs frontend : get_unread_notifications_count, mark_notification_read,
--      mark_all_notifications_read, archive_notification, send_welcome_notification_if_needed
--   8. Activation Realtime sur `notifications`
--
-- ⚠️  MIGRATION À APPLIQUER MANUELLEMENT via Supabase Dashboard > SQL Editor.
--     Les Edge Functions d'envoi d'emails sont POSÉES (email_queued_for) mais
--     non consommées dans ce lot — voir Lot 10.2 (Resend + cron).
--
-- Principe core : l'utilisateur contrôle tout (préférences granulaires,
-- digest anti-spam, RLS strict).

BEGIN;

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'listing_published',
    'listing_rejected',
    'listing_expiring_soon',
    'listing_expired',
    'credits_purchased',
    'credits_low',
    'welcome',
    'admin_moderation_needed',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'listings',
    'payments',
    'activity',
    'searches',
    'admin',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM (
    'critical',
    'high',
    'normal',
    'low'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 2. TABLE notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  category notification_category NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',

  title TEXT NOT NULL,
  body TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_url TEXT,
  icon TEXT NOT NULL DEFAULT 'Bell',

  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  email_queued_for TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_email_queue
  ON notifications (email_queued_for, priority)
  WHERE email_sent_at IS NULL AND email_queued_for IS NOT NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE notifications IS 'Lot 10.1 — Notifications AutoNex (in-app + queue email)';

-- =============================================================================
-- 3. TABLE notification_preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  listings_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  listings_email_immediate BOOLEAN NOT NULL DEFAULT TRUE,
  listings_email_digest BOOLEAN NOT NULL DEFAULT TRUE,

  payments_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  payments_email_immediate BOOLEAN NOT NULL DEFAULT TRUE,
  payments_email_digest BOOLEAN NOT NULL DEFAULT FALSE,

  activity_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  activity_email_immediate BOOLEAN NOT NULL DEFAULT FALSE,
  activity_email_digest BOOLEAN NOT NULL DEFAULT TRUE,

  searches_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  searches_email_immediate BOOLEAN NOT NULL DEFAULT FALSE,
  searches_email_digest BOOLEAN NOT NULL DEFAULT TRUE,

  system_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  system_email_immediate BOOLEAN NOT NULL DEFAULT FALSE,
  system_email_digest BOOLEAN NOT NULL DEFAULT FALSE,

  digest_frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (digest_frequency IN ('daily', 'weekly', 'never')),
  digest_time TIME NOT NULL DEFAULT '18:00:00',

  max_emails_per_day INTEGER NOT NULL DEFAULT 5,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own preferences" ON notification_preferences;
CREATE POLICY "Users read own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own preferences" ON notification_preferences;
CREATE POLICY "Users update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own preferences" ON notification_preferences;
CREATE POLICY "Users insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE notification_preferences IS 'Lot 10.1 — Préférences utilisateur par catégorie × canal (in-app / email immédiat / email digest)';

-- Trigger : auto-création à l'inscription.
CREATE OR REPLACE FUNCTION create_notification_preferences_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_notification_preferences_for_user();

-- =============================================================================
-- 4. HELPERS
-- =============================================================================

CREATE OR REPLACE FUNCTION is_category_email_immediate_enabled(
  p_prefs notification_preferences,
  p_category notification_category
) RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_category
    WHEN 'listings' THEN p_prefs.listings_email_immediate
    WHEN 'payments' THEN p_prefs.payments_email_immediate
    WHEN 'activity' THEN p_prefs.activity_email_immediate
    WHEN 'searches' THEN p_prefs.searches_email_immediate
    WHEN 'system' THEN p_prefs.system_email_immediate
    ELSE FALSE
  END;
END;
$$;

CREATE OR REPLACE FUNCTION is_category_email_digest_enabled(
  p_prefs notification_preferences,
  p_category notification_category
) RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_category
    WHEN 'listings' THEN p_prefs.listings_email_digest
    WHEN 'payments' THEN p_prefs.payments_email_digest
    WHEN 'activity' THEN p_prefs.activity_email_digest
    WHEN 'searches' THEN p_prefs.searches_email_digest
    WHEN 'system' THEN p_prefs.system_email_digest
    ELSE FALSE
  END;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_next_digest_time(p_prefs notification_preferences)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_next TIMESTAMPTZ;
BEGIN
  -- Prochain digest_time (ou lendemain si déjà passé).
  v_next := (CURRENT_DATE + p_prefs.digest_time) AT TIME ZONE 'Indian/Antananarivo';
  IF v_next < NOW() THEN
    v_next := v_next + INTERVAL '1 day';
  END IF;
  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_category notification_category,
  p_priority notification_priority,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_action_url TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT 'Bell'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_email_queued_for TIMESTAMPTZ;
  v_prefs notification_preferences%ROWTYPE;
BEGIN
  -- Charger les préférences (créer si manquantes pour les users pré-Lot10).
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id) VALUES (p_user_id)
      ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
  END IF;

  -- Décider quand envoyer l'email (ou NULL).
  v_email_queued_for := CASE
    WHEN p_priority = 'critical'
         AND is_category_email_immediate_enabled(v_prefs, p_category)
      THEN NOW()
    WHEN p_priority IN ('high', 'normal')
         AND is_category_email_digest_enabled(v_prefs, p_category)
      THEN calculate_next_digest_time(v_prefs)
    ELSE NULL
  END;

  INSERT INTO notifications (
    user_id, type, category, priority, title, body, metadata, action_url, icon, email_queued_for
  ) VALUES (
    p_user_id, p_type, p_category, p_priority, p_title, p_body, p_metadata, p_action_url, p_icon, v_email_queued_for
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- =============================================================================
-- 5. TRIGGERS sur tables existantes
-- =============================================================================

-- 5A. Publication d'annonce (status → active)
CREATE OR REPLACE FUNCTION notify_listing_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM 'active'::public.listing_status)
     AND NEW.status = 'active'::public.listing_status
     AND NEW.owner_id IS NOT NULL THEN
    PERFORM create_notification(
      p_user_id := NEW.owner_id,
      p_type := 'listing_published',
      p_category := 'listings',
      p_priority := 'critical',
      p_title := 'Votre annonce est publiée !',
      p_body := 'Votre annonce « ' || NEW.title || ' » est maintenant visible sur AutoNex.',
      p_metadata := jsonb_build_object('listing_id', NEW.id, 'listing_title', NEW.title),
      p_action_url := '/annonce/' || NEW.id,
      p_icon := 'CheckCircle'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_listing_published ON listings;
CREATE TRIGGER trigger_notify_listing_published
  AFTER UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION notify_listing_published();

-- 5B. Refus d'annonce (status → rejected)
CREATE OR REPLACE FUNCTION notify_listing_rejected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM 'rejected'::public.listing_status)
     AND NEW.status = 'rejected'::public.listing_status
     AND NEW.owner_id IS NOT NULL THEN
    PERFORM create_notification(
      p_user_id := NEW.owner_id,
      p_type := 'listing_rejected',
      p_category := 'listings',
      p_priority := 'critical',
      p_title := 'Votre annonce n''a pas été validée',
      p_body := 'L''annonce « ' || NEW.title || ' » nécessite des modifications. Consultez le détail pour plus d''informations.',
      p_metadata := jsonb_build_object(
        'listing_id', NEW.id,
        'listing_title', NEW.title,
        'rejection_reason', NEW.rejection_reason
      ),
      p_action_url := '/publier?draft=' || NEW.id,
      p_icon := 'XCircle'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_listing_rejected ON listings;
CREATE TRIGGER trigger_notify_listing_rejected
  AFTER UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

-- 5C. Achat de crédits (credits_ledger insert avec entry_type 'purchase' + delta > 0)
CREATE OR REPLACE FUNCTION notify_credits_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_type = 'purchase' AND NEW.delta > 0 THEN
    PERFORM create_notification(
      p_user_id := NEW.user_id,
      p_type := 'credits_purchased',
      p_category := 'payments',
      p_priority := 'critical',
      p_title := NEW.delta || ' crédits ajoutés à votre compte',
      p_body := 'Votre achat de crédits a été confirmé. Nouveau solde : ' || NEW.balance_after || ' crédits.',
      p_metadata := jsonb_build_object(
        'delta', NEW.delta,
        'balance_after', NEW.balance_after,
        'transaction_id', NEW.transaction_id
      ),
      p_action_url := '/dashboard',
      p_icon := 'Coins'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_credits_purchased ON credits_ledger;
CREATE TRIGGER trigger_notify_credits_purchased
  AFTER INSERT ON credits_ledger
  FOR EACH ROW EXECUTE FUNCTION notify_credits_purchased();

-- 5D. Fonction scheduled (cron Lot 10.2) : annonces expirant dans ~7 jours.
CREATE OR REPLACE FUNCTION notify_expiring_listings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_listing IN
    SELECT l.id, l.owner_id, l.title, l.expires_at
    FROM listings l
    WHERE l.status = 'active'::public.listing_status
      AND l.expires_at BETWEEN NOW() + INTERVAL '6 days 23 hours'
                           AND NOW() + INTERVAL '7 days 1 hour'
      AND l.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = l.owner_id
          AND n.type = 'listing_expiring_soon'
          AND n.metadata->>'listing_id' = l.id::text
          AND n.created_at > NOW() - INTERVAL '2 days'
      )
  LOOP
    PERFORM create_notification(
      p_user_id := v_listing.owner_id,
      p_type := 'listing_expiring_soon',
      p_category := 'listings',
      p_priority := 'high',
      p_title := 'Votre annonce expire dans 7 jours',
      p_body := 'L''annonce « ' || v_listing.title || ' » expire bientôt. Renouvelez-la pour rester visible.',
      p_metadata := jsonb_build_object(
        'listing_id', v_listing.id,
        'listing_title', v_listing.title,
        'expires_at', v_listing.expires_at
      ),
      p_action_url := '/dashboard?listing=' || v_listing.id,
      p_icon := 'Clock'
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 5E. Flag welcome_notification_sent sur profiles (évite les doublons).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_notification_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- =============================================================================
-- 6. RPCs FRONTEND
-- =============================================================================

CREATE OR REPLACE FUNCTION get_unread_notifications_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM notifications
    WHERE user_id = auth.uid()
      AND read_at IS NULL
      AND archived_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW(), updated_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = NOW(), updated_at = NOW()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION archive_notification(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET archived_at = NOW(), updated_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION send_welcome_notification_if_needed()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_sent BOOLEAN;
  v_notification_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT welcome_notification_sent INTO v_already_sent
  FROM profiles WHERE id = v_user_id;

  IF v_already_sent THEN
    RETURN NULL;
  END IF;

  SELECT create_notification(
    p_user_id := v_user_id,
    p_type := 'welcome',
    p_category := 'system',
    p_priority := 'low',
    p_title := 'Bienvenue sur AutoNex !',
    p_body := 'Nous avons activé les notifications pour vous tenir informé de l''activité de vos annonces. Gérez vos préférences dans les paramètres.',
    p_metadata := '{}'::jsonb,
    p_action_url := '/settings/notifications',
    p_icon := 'Sparkles'
  ) INTO v_notification_id;

  UPDATE profiles SET welcome_notification_sent = TRUE WHERE id = v_user_id;

  RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unread_notifications_count() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION archive_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_welcome_notification_if_needed() TO authenticated;

-- =============================================================================
-- 7. REALTIME
-- =============================================================================

-- Activer le flux Realtime pour les mises à jour live de la cloche.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
