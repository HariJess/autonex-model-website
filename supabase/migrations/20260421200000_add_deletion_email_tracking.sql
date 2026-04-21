-- ============================================================================
-- MISSION 5.A.4 — Tracking email deletion notification
-- ============================================================================
-- Ajoute 2 colonnes sur profiles pour tracer l'envoi de l'email de
-- notification par la Edge Function send-deletion-notification-email.
-- Peuplées par le frontend après call Edge Function.
--
-- deletion_email_sent_at : timestamp du succès d'envoi (Resend ID reçu)
-- deletion_email_error   : message d'erreur si Resend fail
--                          (ex: "Resend API error: ..." ou "fetch failed")
--
-- Ces colonnes sont purement informationelles (debug/monitoring) et n'ont
-- pas de policy RLS dédiée — les policies existantes sur profiles couvrent
-- déjà les accès (user peut lire son propre profile, admin peut tout lire).
--
-- Applied to prod : YES (21/04/2026)
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_email_error TEXT;

COMMIT;
