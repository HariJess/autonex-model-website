-- Lot 10.2 — Journal d'envoi d'emails + RPCs du worker (Resend).
--
-- Dépendances : Lot 10.1 (tables `notifications`, `notification_preferences`,
-- colonne `notifications.email_queued_for`). Cette migration ajoute :
--
--   * Table `email_log` : journal persistant des envois (succès / erreurs /
--     quotas skipés).
--   * RPC `list_notification_emails_ready(mode, limit)` : renvoie les notifs
--     prêtes à partir par email, selon le mode (immediate = critical,
--     digest = high + normal), en JOIN avec `auth.users.email`. La RPC
--     applique le quota `max_emails_per_day` par user (compte les envois
--     SUCCESS dans les dernières 24h via `email_log`).
--   * RPC `mark_notification_email_sent(notif_id, email_to, subject, template,
--     resend_id)` : insère une ligne `email_log` + met à jour
--     `notifications.email_sent_at`.
--   * RPC `mark_notification_email_failed(notif_id, email_to, subject,
--     template, error)` : insère une ligne `email_log` avec `status=failed`
--     (laisse `email_sent_at` NULL pour autoriser un retry manuel).
--   * RPC `mark_notification_email_skipped_quota(notif_id, email_to)` :
--     log quota dépassé, idem.
--
-- ⚠️  MIGRATION À APPLIQUER MANUELLEMENT via Supabase Dashboard > SQL Editor.
--     La migration cron (20260425100001) n'est à appliquer qu'APRÈS déploiement
--     de l'Edge Function.

BEGIN;

-- =============================================================================
-- 0. INVARIANT — convention d'écriture dans `notifications`
-- =============================================================================
--
-- Tous les INSERT dans `notifications` DOIVENT transiter par la RPC
-- `create_notification(...)` (définie en Lot 10.1). C'est elle qui calcule
-- `email_queued_for` selon la priorité + les préférences utilisateur.
--
-- Un INSERT direct dans la table contourne ce calcul et l'email ne partira
-- jamais. Voir `docs/notifications-email.md` section « Gotchas » pour le
-- détail du pattern à suivre (et la logique à reproduire manuellement si un
-- INSERT bulk est incontournable).

COMMENT ON FUNCTION create_notification(
  UUID, notification_type, notification_category, notification_priority,
  TEXT, TEXT, JSONB, TEXT, TEXT
) IS
  'Lot 10.1 + 10.2 — Point d''entrée UNIQUE pour l''insertion de notifications. '
  'Calcule `email_queued_for` selon la priorité et les préférences utilisateur '
  '(critical → NOW() si email_immediate activé ; high|normal → calculate_next_digest_time() '
  'si email_digest activé ; low → NULL). '
  'Convention : tout INSERT direct dans `notifications` depuis l''application '
  'contourne ce routing et doit être évité. Voir docs/notifications-email.md.';

-- =============================================================================
-- 1. TABLE email_log
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE email_log_status AS ENUM ('sent', 'failed', 'skipped_quota');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status email_log_status NOT NULL,
  resend_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_created
  ON email_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_log_notification
  ON email_log (notification_id);

-- Historique consultable par l'utilisateur (read-only côté client).
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own email log" ON email_log;
CREATE POLICY "Users read own email log"
  ON email_log FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE email_log IS 'Lot 10.2 — Journal Resend : un envoi = une ligne (success / failed / quota).';

-- =============================================================================
-- 2. HELPER : compte d'envois réussis des 24 dernières heures
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_email_sent_today_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM email_log
    WHERE user_id = p_user_id
      AND status = 'sent'
      AND created_at > NOW() - INTERVAL '24 hours'
  );
END;
$$;

-- =============================================================================
-- 3. RPC list_notification_emails_ready(mode, limit)
-- =============================================================================

-- Renvoie les notifs prêtes pour envoi, selon le mode :
--   * 'immediate' : priority = 'critical' AND email_queued_for <= NOW()
--   * 'digest'    : priority IN ('high', 'normal') AND email_queued_for <= NOW()
--
-- Applique le quota max_emails_per_day en comparant le compte courant au
-- plafond de l'user. Les notifs dépassant le quota sont EXCLUES (le worker
-- peut appeler mark_notification_email_skipped_quota plus tard si besoin).

CREATE OR REPLACE FUNCTION list_notification_emails_ready(
  p_mode TEXT,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE (
  notification_id UUID,
  user_id UUID,
  email_to TEXT,
  priority notification_priority,
  category notification_category,
  type notification_type,
  title TEXT,
  body TEXT,
  metadata JSONB,
  action_url TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ,
  user_max_emails_per_day INTEGER,
  user_emails_sent_today INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_mode NOT IN ('immediate', 'digest') THEN
    RAISE EXCEPTION 'invalid_mode' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    n.id AS notification_id,
    n.user_id,
    u.email::TEXT AS email_to,
    n.priority,
    n.category,
    n.type,
    n.title,
    n.body,
    n.metadata,
    n.action_url,
    n.icon,
    n.created_at,
    COALESCE(p.max_emails_per_day, 5) AS user_max_emails_per_day,
    get_user_email_sent_today_count(n.user_id) AS user_emails_sent_today
  FROM notifications n
  JOIN auth.users u ON u.id = n.user_id
  LEFT JOIN notification_preferences p ON p.user_id = n.user_id
  WHERE n.email_sent_at IS NULL
    AND n.email_queued_for IS NOT NULL
    AND n.email_queued_for <= NOW()
    AND u.email IS NOT NULL
    -- Routage priorité → canal (convention Lot 10.1/10.2) :
    --   * critical          → mode 'immediate' (cron */5 min)
    --   * high + normal     → mode 'digest'    (cron daily 18h EAT / 15h UTC)
    --   * low               → jamais d'email  (email_queued_for reste NULL
    --                         dès l'insert dans create_notification)
    -- Ce mapping reste ALIGNÉ avec le CASE `v_email_queued_for` de la RPC
    -- `create_notification` (migration Lot 10.1) qui fixe la valeur de
    -- `email_queued_for` au moment de l'insertion de la notif. Changer l'un
    -- des deux sans l'autre casse la queue email.
    AND (
      (p_mode = 'immediate' AND n.priority = 'critical')
      OR (p_mode = 'digest' AND n.priority IN ('high', 'normal'))
    )
    AND get_user_email_sent_today_count(n.user_id) < COALESCE(p.max_emails_per_day, 5)
  ORDER BY n.priority, n.created_at ASC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 4. RPC : marquer un envoi comme réussi
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_notification_email_sent(
  p_notification_id UUID,
  p_email_to TEXT,
  p_subject TEXT,
  p_template TEXT,
  p_resend_message_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM notifications WHERE id = p_notification_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'notification_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO email_log (
    notification_id, user_id, email_to, template, subject, status,
    resend_message_id, sent_at
  )
  VALUES (
    p_notification_id, v_user_id, p_email_to, p_template, p_subject, 'sent',
    p_resend_message_id, NOW()
  )
  RETURNING id INTO v_log_id;

  UPDATE notifications
  SET email_sent_at = NOW(), updated_at = NOW()
  WHERE id = p_notification_id;

  RETURN v_log_id;
END;
$$;

-- =============================================================================
-- 5. RPC : marquer un envoi comme échoué
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_notification_email_failed(
  p_notification_id UUID,
  p_email_to TEXT,
  p_subject TEXT,
  p_template TEXT,
  p_error_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM notifications WHERE id = p_notification_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'notification_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO email_log (
    notification_id, user_id, email_to, template, subject, status,
    error_message
  )
  VALUES (
    p_notification_id, v_user_id, p_email_to, p_template, p_subject, 'failed',
    LEFT(p_error_message, 1000)
  )
  RETURNING id INTO v_log_id;

  -- Laisse email_sent_at NULL — le worker peut retry plus tard si besoin.
  RETURN v_log_id;
END;
$$;

-- =============================================================================
-- 6. RPC : marquer un envoi comme skipped (quota dépassé)
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_notification_email_skipped_quota(
  p_notification_id UUID,
  p_email_to TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM notifications WHERE id = p_notification_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'notification_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO email_log (
    notification_id, user_id, email_to, template, subject, status,
    error_message
  )
  VALUES (
    p_notification_id, v_user_id, p_email_to, 'quota', '[skipped]', 'skipped_quota',
    'max_emails_per_day reached'
  )
  RETURNING id INTO v_log_id;

  -- Quota : on « consomme » la queue pour ne pas retry indéfiniment.
  UPDATE notifications
  SET email_sent_at = NOW(), updated_at = NOW()
  WHERE id = p_notification_id;

  RETURN v_log_id;
END;
$$;

-- Grants — seuls le service_role (worker) et authenticated (lecture log) consomment.
GRANT EXECUTE ON FUNCTION get_user_email_sent_today_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION list_notification_emails_ready(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_email_sent(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_email_failed(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_email_skipped_quota(UUID, TEXT) TO service_role;

COMMIT;
