-- Lot 10.2 — Cron déclenchement du worker d'envoi d'emails.
--
-- Prérequis :
--   * Extension pg_cron activée (Supabase Dashboard > Database > Extensions).
--   * Extension pg_net activée (idem).
--   * Edge Function `send-queued-notification-emails` déployée :
--       supabase functions deploy send-queued-notification-emails --project-ref wtkedamrmtvdoippqanc
--
-- ⚠️  AVANT D'APPLIQUER : remplacer `<SERVICE_ROLE_KEY>` par la vraie clé
-- (Supabase Dashboard > Project Settings > API > service_role secret).
-- Ne JAMAIS committer la vraie clé dans Git.

BEGIN;

-- Nettoyage idempotent : retire d'éventuels jobs précédents avec le même nom.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('send-immediate-notification-emails', 'send-digest-notification-emails');

-- ─────────────────────────────────────────────────────────────────────────────
-- Envois immédiats : toutes les 5 minutes, priorité critical.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'send-immediate-notification-emails',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wtkedamrmtvdoippqanc.supabase.co/functions/v1/send-queued-notification-emails?mode=immediate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Digests : tous les jours à 18h EAT (15h UTC), priorités high + normal.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'send-digest-notification-emails',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wtkedamrmtvdoippqanc.supabase.co/functions/v1/send-queued-notification-emails?mode=digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);

COMMIT;
