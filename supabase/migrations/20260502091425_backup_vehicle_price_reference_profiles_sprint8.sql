-- =====================================================================
-- Backup avant Sprint 8
-- Ingestion dealer-templates (_compiled.csv, 214 records) + manual-reference-batches/ (77 records)
-- vers public.vehicle_price_reference_profiles.
--
-- Snapshot non-destructif de l'état pré-Sprint 8 (~113 profils calibrés vague v1).
-- À appliquer MANUELLEMENT dans Supabase SQL Editor avant de lancer la migration
-- de seed régénérée par scripts/data/build-reference-profiles.ts.
--
-- Reversal : DROP TABLE public.vehicle_price_reference_profiles_backup_2026_05_02;
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_price_reference_profiles_backup_2026_05_02
  AS SELECT * FROM public.vehicle_price_reference_profiles;

-- Vérification post-backup (à exécuter dans le même run) :
--   SELECT COUNT(*) FROM public.vehicle_price_reference_profiles_backup_2026_05_02;
--   -- Attendu : ~113 lignes (état seed v1 du 2026-05-01)
