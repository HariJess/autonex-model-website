-- M-CRON-SECRET fix — Audit 2026-04-26.
--
-- L'ancienne migration 20260425100001_lot_10_2_cron.sql a ete appliquee en
-- prod avec une vraie cle service_role hardcodee a la place du placeholder
-- <SERVICE_ROLE_KEY>. Consequence : la cle est en clair dans cron.job.command,
-- visible par toute requete SELECT sur cron.job (et exposee dans pg_dump).
--
-- Cette migration :
--   1. Desactive les 2 jobs existants (qui contiennent la cle en clair).
--   2. Recree les jobs avec une commande qui lit la cle depuis
--      vault.decrypted_secrets au moment de chaque execution.
--
-- Apres application, cron.job.command ne contiendra plus la cle en clair :
-- juste la requete SQL qui la recupere depuis Vault.
--
-- Prerequis (deja fait manuellement en dashboard, verifie) :
--   * Secret Vault `service_role_key` cree via vault.create_secret(...)
--     id = 44c2945b-729a-4c0c-94a9-a8e36385f384
--
-- /!\ Cette migration n'invalide PAS la cle service_role exposee dans
-- l'ancien cron.job — la rotation de la cle via le Dashboard Supabase
-- (Project Settings > API > Reset service_role secret) est l'etape
-- separee qui suivra cette migration.

BEGIN;

-- Nettoyage idempotent : retire les jobs precedents (ceux avec la cle en clair).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('send-immediate-notification-emails', 'send-digest-notification-emails');

-- ----------------------------------------------------------------------------
-- Envois immediats : toutes les 5 minutes, priorite critical.
-- La service_role key est lue depuis Vault a chaque execution.
-- ----------------------------------------------------------------------------
SELECT cron.schedule(
  'send-immediate-notification-emails',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wtkedamrmtvdoippqanc.supabase.co/functions/v1/send-queued-notification-emails?mode=immediate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'
      )
    )
  );
  $$
);

-- ----------------------------------------------------------------------------
-- Digests : tous les jours a 18h EAT (15h UTC), priorites high + normal.
-- ----------------------------------------------------------------------------
SELECT cron.schedule(
  'send-digest-notification-emails',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wtkedamrmtvdoippqanc.supabase.co/functions/v1/send-queued-notification-emails?mode=digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'
      )
    )
  );
  $$
);

COMMIT;
