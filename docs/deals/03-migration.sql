-- =====================================================================
-- Migration : Feature « Bonnes affaires » (Deals) — Sprint 0 fondations
-- Fichier   : docs/deals/03-migration.sql
-- Auteur    : Ali Pirbay (alipirbay@gmail.com)
-- Date      : 2026-04-30
-- Status    : NOT YET APPLIED — à coller dans Supabase Studio > SQL Editor
--             puis exécuter en une seule transaction. Idempotent.
--
-- Description :
--   Ajoute les fondations DB pour permettre aux vendeurs d'activer un
--   « deal » (baisse de prix temporaire vérifiée) sur leurs annonces.
--   - 7 colonnes additionnelles sur public.listings
--   - 1 nouvelle table public.listing_deal_history (historique immutable)
--   - 1 trigger BEFORE UPDATE anti-fake-discount sur public.listings
--   - Indexes partiels pour performance des queries deals
--   - Policies RLS pour listing_deal_history (lecture owner + admin)
--
-- Ne MODIFIE PAS :
--   - Aucune policy existante sur public.listings
--   - Aucune colonne / type / contrainte existant
--   - Aucune fonction existante
--
-- Rollback   : section finale en commentaire (DROP en cas de besoin)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Ajout des colonnes deals sur public.listings
--    Toutes nullable / défaut sûr → pas de migration de données nécessaire
--    pour les ~milliers de listings existants. Aucune réécriture de table
--    en mode AccessExclusiveLock prolongé.
-- ---------------------------------------------------------------------

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS deal_active              boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_started_at          timestamptz,
  ADD COLUMN IF NOT EXISTS deal_ends_at             timestamptz,
  ADD COLUMN IF NOT EXISTS deal_duration_days       integer,
  ADD COLUMN IF NOT EXISTS deal_discount_percent    integer,
  ADD COLUMN IF NOT EXISTS deal_original_price_mga  numeric,
  ADD COLUMN IF NOT EXISTS deal_price_lock_until    timestamptz;

-- Contraintes de validité applicatives (idempotent : on drop puis recrée).
-- ALTER TABLE ... ADD CONSTRAINT ne supporte pas IF NOT EXISTS, on passe
-- par DO $$ ... $$ pour rester rejouable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_deal_duration_days_chk'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_deal_duration_days_chk
      CHECK (deal_duration_days IS NULL OR deal_duration_days IN (7, 14, 30));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_deal_discount_percent_chk'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_deal_discount_percent_chk
      CHECK (deal_discount_percent IS NULL OR deal_discount_percent BETWEEN 5 AND 30);
  END IF;

  -- Cohérence inter-champs : si deal_active=true, alors les snapshots clés
  -- doivent être renseignés. Évite les états zombies en cas d'INSERT/UPDATE
  -- direct via service_role buggué.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_deal_active_consistency_chk'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_deal_active_consistency_chk
      CHECK (
        deal_active = false
        OR (
          deal_started_at IS NOT NULL
          AND deal_ends_at IS NOT NULL
          AND deal_duration_days IS NOT NULL
          AND deal_discount_percent IS NOT NULL
          AND deal_original_price_mga IS NOT NULL
          AND deal_price_lock_until IS NOT NULL
        )
      );
  END IF;

  -- Décision Ali Q2 : les deals sont réservés aux annonces de vente.
  -- Une location longue/courte durée ne peut pas être en deal — la
  -- sémantique d'un loyer mensuel barré n'est pas comparable à un prix
  -- de vente barré. Enforcement DB en plus de la garde Edge Function.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_deal_only_for_vente_chk'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_deal_only_for_vente_chk
      CHECK (
        deal_active = false
        OR transaction = 'vente'
      );
  END IF;
END $$;

-- Documentation des colonnes (les contraintes parlent d'elles-mêmes mais on
-- explicite la sémantique pour les futurs lecteurs DB Studio).
COMMENT ON COLUMN public.listings.deal_active IS
  'Flag : annonce actuellement en deal. Source de vérité pour la page /bonnes-affaires et le filtre has_deal. Activé uniquement sur les annonces de vente (CHECK listings_deal_only_for_vente_chk).';
COMMENT ON COLUMN public.listings.deal_started_at IS
  'Snapshot de l''horodatage d''activation. Posé serveur-side par l''Edge Function activate-deal.';
COMMENT ON COLUMN public.listings.deal_ends_at IS
  'deal_started_at + deal_duration_days. Lu par le cron expire-deals quotidien.';
COMMENT ON COLUMN public.listings.deal_duration_days IS
  'Durée choisie par le vendeur (7, 14 ou 30 jours).';
COMMENT ON COLUMN public.listings.deal_discount_percent IS
  'Pourcentage de réduction snapshotté (5-30). Sert à l''affichage et au tri.';
COMMENT ON COLUMN public.listings.deal_original_price_mga IS
  'Prix MGA AVANT le deal. Distinct de original_price_mga historique (snapshot organique de baisse spontanée). Utilisé par l''anti-fake-discount. Type numeric pour cohérence avec original_price_mga legacy et éviter les casts implicites dans getDealMeta() / cron expire-deals.';
COMMENT ON COLUMN public.listings.deal_price_lock_until IS
  'deal_ends_at + 30 jours. Tant que now() < cette valeur, le trigger enforce_deal_price_lock interdit price_mga > deal_original_price_mga.';

-- ---------------------------------------------------------------------
-- 2) Indexes partiels — sert /bonnes-affaires et le cron expire-deals
--    Partiels sur WHERE deal_active = true → ~50× plus petits qu'un index
--    complet vu le ratio attendu (<5% de listings en deal à un instant T).
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_listings_active_deals
  ON public.listings(deal_ends_at)
  WHERE deal_active = true;

-- Tri DESC par % réduction sur la page /bonnes-affaires. Index secondaire,
-- à monitorer après lancement (à droper si l'EXPLAIN ANALYZE montre que
-- l'index principal + sort en mémoire suffit).
CREATE INDEX IF NOT EXISTS idx_listings_active_deals_discount
  ON public.listings(deal_discount_percent DESC, deal_started_at DESC)
  WHERE deal_active = true;

-- ---------------------------------------------------------------------
-- 3) Table public.listing_deal_history (historique immutable)
--    Une ligne par activation de deal. UPDATE de outcome/ended_at lors de
--    la fin (cron expire-deals) ou cancel. Jamais d'écriture client direct.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.listing_deal_history (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          uuid        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  started_at          timestamptz NOT NULL,
  ended_at            timestamptz,
  discount_percent    integer     NOT NULL,
  duration_days       integer     NOT NULL,
  original_price_mga  bigint      NOT NULL,
  new_price_mga       bigint      NOT NULL,
  outcome             text        NOT NULL DEFAULT 'active',
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT listing_deal_history_discount_percent_chk
    CHECK (discount_percent BETWEEN 5 AND 30),
  CONSTRAINT listing_deal_history_duration_days_chk
    CHECK (duration_days IN (7, 14, 30)),
  CONSTRAINT listing_deal_history_original_price_chk
    CHECK (original_price_mga > 0),
  CONSTRAINT listing_deal_history_new_price_chk
    CHECK (new_price_mga > 0),
  CONSTRAINT listing_deal_history_outcome_chk
    CHECK (outcome IN ('active', 'expired', 'cancelled', 'sold'))
);

COMMENT ON TABLE public.listing_deal_history IS
  'Historique immutable des deals activés. Une ligne par activation. Lecture limitée au propriétaire ou admin.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listing_deal_history_user_id
  ON public.listing_deal_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_deal_history_listing_id
  ON public.listing_deal_history(listing_id, created_at DESC);

-- Index partiel : trouver le deal actif d'une annonce en O(log N) sans
-- scanner les lignes archivées.
CREATE INDEX IF NOT EXISTS idx_listing_deal_history_active
  ON public.listing_deal_history(listing_id)
  WHERE outcome = 'active';

-- RLS
ALTER TABLE public.listing_deal_history ENABLE ROW LEVEL SECURITY;

-- SELECT propriétaire
DROP POLICY IF EXISTS "Owner reads own deal history" ON public.listing_deal_history;
CREATE POLICY "Owner reads own deal history"
  ON public.listing_deal_history
  FOR SELECT
  USING (user_id = auth.uid());

-- SELECT admin (pour les futurs dashboards /admin/revenus, modération abus)
-- immonex_is_admin() est la fonction legacy renommée à terme par M-LEGACY-5
-- (cf. CLAUDE.md). On garde le nom courant pour rester aligné avec les autres
-- policies du repo.
DROP POLICY IF EXISTS "Admins read all deal history" ON public.listing_deal_history;
CREATE POLICY "Admins read all deal history"
  ON public.listing_deal_history
  FOR SELECT
  USING (public.immonex_is_admin());

-- Pas de policy INSERT/UPDATE/DELETE → bypass via service_role uniquement
-- (Edge Functions activate-deal / cancel-deal / expire-deals).

-- ---------------------------------------------------------------------
-- 4) Trigger anti-fake-discount sur public.listings
--    Empêche le vendeur de remonter price_mga au-dessus de
--    deal_original_price_mga pendant les 30 jours suivant la fin du deal.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_deal_price_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.deal_price_lock_until IS NOT NULL
     AND now() < NEW.deal_price_lock_until
     AND NEW.deal_original_price_mga IS NOT NULL
     AND NEW.price_mga > NEW.deal_original_price_mga
  THEN
    RAISE EXCEPTION
      'Prix verrouillé jusqu''au % : impossible de remonter au-dessus de % MGA (prix avant le deal). Cette protection contre les faux rabais expire 30 jours après la fin du deal.',
      to_char(NEW.deal_price_lock_until AT TIME ZONE 'Indian/Antananarivo', 'DD/MM/YYYY HH24:MI'),
      NEW.deal_original_price_mga
    USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_deal_price_lock() IS
  'Trigger BEFORE UPDATE — bloque toute remontée de price_mga au-dessus de deal_original_price_mga pendant la fenêtre deal_price_lock_until. Source de la confiance acheteur.';

DROP TRIGGER IF EXISTS trg_enforce_deal_price_lock ON public.listings;
CREATE TRIGGER trg_enforce_deal_price_lock
  BEFORE UPDATE OF price_mga, deal_price_lock_until, deal_original_price_mga
  ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_deal_price_lock();

COMMIT;

-- =====================================================================
-- SMOKE-TESTS — à exécuter SÉPARÉMENT après le COMMIT ci-dessus.
-- Ne PAS décommenter dans le même run que la migration : le test 5
-- (INSERT volontairement faisant échouer pour confirmer la FK)
-- déclencherait un ROLLBACK complet de la transaction de migration s'il
-- s'exécutait dans la même session.
-- =====================================================================

-- Test 1 — 7 colonnes deal_* sur listings
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'listings'
--     AND column_name LIKE 'deal\_%';
--   -> Doit lister 7 colonnes.

-- Test 2 — 2 indexes partiels actifs
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename = 'listings'
--     AND indexname LIKE 'idx_listings_active_deals%';
--   -> 2 lignes.

-- Test 3 — Trigger anti-fake-discount présent
-- SELECT tgname FROM pg_trigger
--   WHERE tgrelid = 'public.listings'::regclass
--     AND tgname = 'trg_enforce_deal_price_lock';
--   -> 1 ligne.

-- Test 4 — 2 policies SELECT sur listing_deal_history
-- SELECT polname FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'listing_deal_history';
--   -> 2 lignes ("Owner reads own deal history", "Admins read all deal history").

-- Test 5 — FK listing_id active (INSERT VOLONTAIREMENT FAILANT)
-- INSERT INTO public.listing_deal_history (
--   listing_id, user_id, started_at, discount_percent, duration_days,
--   original_price_mga, new_price_mga
-- ) VALUES (
--   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
--   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
--   now(), 10, 14, 100000000, 90000000
-- );
--   -> Doit ÉCHOUER avec FK violation listing_id.

-- =====================================================================
-- ROLLBACK (à exécuter manuellement en cas de besoin — DESTRUCTIF)
-- =====================================================================
-- BEGIN;
--   DROP TRIGGER  IF EXISTS trg_enforce_deal_price_lock ON public.listings;
--   DROP FUNCTION IF EXISTS public.enforce_deal_price_lock();
--   DROP TABLE    IF EXISTS public.listing_deal_history;
--   DROP INDEX    IF EXISTS public.idx_listings_active_deals_discount;
--   DROP INDEX    IF EXISTS public.idx_listings_active_deals;
--   ALTER TABLE public.listings
--     DROP CONSTRAINT IF EXISTS listings_deal_active_consistency_chk,
--     DROP CONSTRAINT IF EXISTS listings_deal_discount_percent_chk,
--     DROP CONSTRAINT IF EXISTS listings_deal_duration_days_chk,
--     DROP COLUMN IF EXISTS deal_price_lock_until,
--     DROP COLUMN IF EXISTS deal_original_price_mga,
--     DROP COLUMN IF EXISTS deal_discount_percent,
--     DROP COLUMN IF EXISTS deal_duration_days,
--     DROP COLUMN IF EXISTS deal_ends_at,
--     DROP COLUMN IF EXISTS deal_started_at,
--     DROP COLUMN IF EXISTS deal_active;
-- COMMIT;
-- =====================================================================
