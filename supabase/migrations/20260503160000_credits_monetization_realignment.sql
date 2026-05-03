-- =============================================================================
-- PROMPT 1 (révisé) — DB Foundation : réalignement monétisation 1:1 + verifications
--
-- Architecture (décisions actées avec Ali, 2026-05-03) :
--   - Ratio strict 1 crédit = 1 Ariary (refonte packs + pricing)
--   - Mécanisme grant + expiration via 2 colonnes additives sur credits_ledger
--     (is_granted, granted_expires_at) — la logique FIFO et le signup bonus
--     viendront au PROMPT 2 (modification consume_credits + handle_new_user)
--   - 4 nouveaux packs avec bonus % (discover, standard, pro, power)
--   - Nouveaux pricings : 30j/60j/renewal, bump, top_ad, video, express_pack,
--     verified_seller_year, signup_bonus
--   - 3 nouvelles tables : verifications, seller_badges, listing_views_daily
--   - 1 VIEW : active_seller_badges (filtre expires_at > now() à la lecture)
--   - 1 nouveau bucket Storage privé : verifications
--   - Wipe sélectif des données crédits/listings/tx/notifs sur tous les
--     comptes SAUF alipirbay@gmail.com (admin) et pirbayali@gmail.com (test)
--   - Reset balance à 0 + wipe ledger des 2 comptes préservés (clean slate
--     pour le nouveau modèle 1:1). Les LISTINGS des 2 comptes sont préservés
--     (utilisés pour tester l'UI).
--
-- ⚠️  DESTRUCTIVE pour les comptes non-préservés. Wipe protégé par lookup
--    email + RAISE EXCEPTION si l'un des 2 comptes manque.
--
-- ⚠️  EXÉCUTION EN 2 RUNS dans le SQL Editor Supabase :
--    Postgres refuse l'usage d'une nouvelle valeur d'enum dans la même
--    transaction où elle est ajoutée. Voir notes en haut de chaque section.
--    Run 1 = Sections A+B. Run 2 (nouveau onglet) = Sections C→K.
--    Si appliqué via `supabase db push`, la CLI exécute statement par
--    statement et le fichier passe d'un coup.
--
-- ⚠️  PAS dans cette migration (vient au PROMPT 2) :
--    - Modification de consume_credits pour FIFO granted-first
--    - Trigger handle_new_user étendu pour grant 100k crédits J+90 au signup
--    - Cron expiration listings/boosts/granted credits
--    - Helpers TS dans src/features/credits/lib/
--
-- Références :
--    - PROMPT_1_REVISED_DB_FOUNDATION.md (Sections A→L du brief)
--    - Diagnostic Phase 1 : 2026-05-03 (graphify + reads sur 18 migrations
--      monétisation existantes)
-- =============================================================================

-- =============================================================================
-- SECTION A — Préservation & wipe ciblé
-- =============================================================================

DO $$
DECLARE
  v_admin_id  uuid;
  v_test_id   uuid;
  v_keep_ids  uuid[];
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'alipirbay@gmail.com';
  SELECT id INTO v_test_id  FROM auth.users WHERE email = 'pirbayali@gmail.com';

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin user alipirbay@gmail.com not found — abort migration';
  END IF;
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'test user pirbayali@gmail.com not found — abort migration';
  END IF;

  v_keep_ids := ARRAY[v_admin_id, v_test_id];

  -- Wipe data crédits/listings/boosts/notifications/transactions sur tous SAUF les 2 préservés.
  -- Les LISTINGS des 2 comptes préservés ne sont PAS touchés (testing UI).
  DELETE FROM public.credits_ledger WHERE user_id <> ALL (v_keep_ids);
  DELETE FROM public.transactions   WHERE user_id <> ALL (v_keep_ids);

  -- listings : owner_id réfère profiles(id) qui partage l'UUID avec auth.users.id
  DELETE FROM public.boosts
    WHERE listing_id IN (
      SELECT id FROM public.listings WHERE owner_id <> ALL (v_keep_ids)
    );
  DELETE FROM public.listings WHERE owner_id <> ALL (v_keep_ids);

  DELETE FROM public.notifications WHERE user_id <> ALL (v_keep_ids);

  -- listing_reports.reporter_id est NOT NULL (CHECK schema 20260421110000)
  -- mais on garde la garde IS NOT NULL pour robustesse au cas où.
  DELETE FROM public.listing_reports
    WHERE reporter_id IS NOT NULL AND reporter_id <> ALL (v_keep_ids);

  -- Reset balances aux 2 comptes préservés (clean slate pour tester le nouveau modèle 1:1)
  -- Bypass du trigger tr_profiles_lock_credits via set_config.
  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  UPDATE public.profiles SET credits_balance = 0 WHERE id = ANY (v_keep_ids);
  PERFORM set_config('immonex.allow_credits_mutation', '', true);

  -- Wipe ledger des 2 comptes préservés aussi (clean slate, pas d'historique pre-1:1)
  DELETE FROM public.credits_ledger WHERE user_id = ANY (v_keep_ids);
END $$;

-- =============================================================================
-- SECTION B — ALTER ENUMs (additif uniquement)
--
-- ⚠️ ALTER TYPE ADD VALUE doit être suivi d'un nouveau statement / commit
--    avant que les nouvelles valeurs puissent être référencées (ex. dans un
--    index partiel WHERE status IN ('expiring_soon')). Si on exécute tout
--    le fichier en SQL Editor (transaction unique), Postgres refuse.
--    → Pour SQL Editor : runner Sections A+B d'abord, puis C→K dans un
--      nouveau onglet.
--    → Pour `supabase db push` : OK d'un coup (statement par statement).
-- =============================================================================

-- listing_status : ajouts pour le lifecycle V2 (expiring_soon = J-7, sold)
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'expiring_soon';
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'sold';

-- boost_type : nouveaux types V2. Les existants (urgent, daily_bump, featured,
-- top, agency_spotlight, newsletter) sont CONSERVÉS pour ne pas casser les
-- RPCs publish_listing_with_credits / purchase_listing_boosts.
ALTER TYPE public.boost_type ADD VALUE IF NOT EXISTS 'bump';
ALTER TYPE public.boost_type ADD VALUE IF NOT EXISTS 'top_ad';
ALTER TYPE public.boost_type ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE public.boost_type ADD VALUE IF NOT EXISTS 'express_pack';

-- notification_type : ajouts pour les events monétisation V2.
-- Les existants (listing_published, listing_rejected, listing_expiring_soon,
-- listing_expired, credits_purchased, credits_low, welcome,
-- admin_moderation_needed, system) sont CONSERVÉS.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'listing_expiring_7d';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'listing_expiring_3d';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'listing_expiring_1d';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'listing_renewed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'boost_ending_1d';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'boost_ended';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'credits_grant';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'credits_expiring_30d';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'credits_expired';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'verif_approved';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'verif_rejected';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'milestone_50_views';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'milestone_10_contacts';

-- =============================================================================
-- SECTION C — ALTER credits_ledger (granted credits)
-- =============================================================================

ALTER TABLE public.credits_ledger
  ADD COLUMN IF NOT EXISTS is_granted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS granted_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ledger_granted_active
  ON public.credits_ledger(user_id, granted_expires_at)
  WHERE is_granted = true AND delta > 0;

COMMENT ON COLUMN public.credits_ledger.is_granted IS
  'true = crédits offerts (signup bonus, promo). Soumis à expiration et consommés FIFO en priorité (logique au PROMPT 2).';
COMMENT ON COLUMN public.credits_ledger.granted_expires_at IS
  'Date d''expiration des crédits offerts. NULL si is_granted=false.';

-- =============================================================================
-- SECTION D — ALTER credit_packs (nouveaux champs)
-- =============================================================================

ALTER TABLE public.credit_packs
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bonus_credits integer NOT NULL DEFAULT 0 CHECK (bonus_credits >= 0),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill display_name = name pour les rows existantes (avant SET NOT NULL)
UPDATE public.credit_packs SET display_name = name WHERE display_name IS NULL;
ALTER TABLE public.credit_packs ALTER COLUMN display_name SET NOT NULL;

COMMENT ON COLUMN public.credit_packs.bonus_credits IS
  'Crédits bonus offerts en plus de credits_amount. Total délivré au paiement = credits_amount + bonus_credits.';
COMMENT ON COLUMN public.credit_packs.is_active IS
  'Pack visible et achetable côté UI. Désactivation = soft delete (pas de DROP, intégrité historique transactions.credit_pack_id).';

-- =============================================================================
-- SECTION E — Wipe + reseed packs (4 nouveaux packs au ratio 1:1)
--
-- transactions.credit_pack_id est TEXT plain (pas de FK) → DELETE safe.
-- Les transactions historiques des 2 comptes préservés (qui ont été wipe par
-- Section A) ne référencent plus les anciens cp_200..cp_1000 — pas d'orphelin.
-- =============================================================================

DELETE FROM public.credit_packs;

INSERT INTO public.credit_packs
  (id, name, display_name, credits_amount, bonus_credits, price_mga, sort_order, is_active)
VALUES
  ('discover', 'Pack Découverte', 'Pack Découverte', 10000,  0,     10000,  1, true),
  ('standard', 'Pack Standard',   'Pack Standard',   25000,  2500,  25000,  2, true),
  ('pro',      'Pack Pro',        'Pack Pro',        50000,  10000, 50000,  3, true),
  ('power',    'Pack Power',      'Pack Power',      100000, 30000, 100000, 4, true);

-- ⚠️  TODO PROMPT 2 : adapter le webhook VPI (admin_approve_credit_transaction
--    + vpi_webhook function) pour grant credits_amount + bonus_credits
--    (au lieu de juste credits_amount actuellement).

-- =============================================================================
-- SECTION F — UPDATE credit_pricing aux nouveaux prix 1:1
-- =============================================================================

-- Existant à mettre à jour
UPDATE public.credit_pricing SET amount = 25000  WHERE key = 'publish_listing';
UPDATE public.credit_pricing SET amount = 5000   WHERE key = 'boost_daily_bump';
UPDATE public.credit_pricing SET amount = 30000  WHERE key = 'boost_featured';
UPDATE public.credit_pricing SET amount = 100000 WHERE key = 'boost_top';
-- boost_urgent (=20) et agency_spotlight (=120) laissés tels quels.
-- Décision : leur place dans le modèle 1:1 sera tranchée au PROMPT 2.

-- Nouveaux pricings (additif)
INSERT INTO public.credit_pricing (key, amount, description) VALUES
  ('publish_listing_60d',  40000,  'Publication annonce 60 jours'),
  ('renewal_listing',      15000,  'Renouvellement annonce 30 jours'),
  ('boost_bump',           5000,   'Remontée ponctuelle (~48-72h)'),
  ('boost_top_ad',         100000, 'Top Annonce 30 jours'),
  ('boost_combo',          120000, 'Pack combo À la une + Top'),
  ('boost_video',          15000,  'Ajout vidéo annonce'),
  ('boost_express_pack',   60000,  'Vente Express'),
  ('verified_seller_year', 75000,  'Verified Seller Badge 12 mois'),
  ('signup_bonus',         100000, 'Crédits offerts à l''inscription')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- SECTION G — ALTER public.listings (colonnes additives)
--
-- Note : views_count existe déjà (NE PAS créer view_count). video_url existe
-- déjà. credits_spent_total existant sous le nom publication_credits_charged
-- — on garde l'existant.
-- =============================================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_duration_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorite_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_video boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.listing_duration_days IS
  'Durée de validité de l''annonce (30 ou 60 jours). expires_at = published_at + duration.';
COMMENT ON COLUMN public.listings.published_at IS
  'Timestamp de la première transition draft → active (NULL pour les rows pre-V2). PROMPT 2 la backfill.';
COMMENT ON COLUMN public.listings.sold_at IS
  'Timestamp de la transition vers status=sold. NULL si jamais vendu.';
COMMENT ON COLUMN public.listings.renewal_count IS
  'Nombre de renouvellements payants effectués sur cette annonce.';

-- Indexes hot-path
CREATE INDEX IF NOT EXISTS idx_listings_status
  ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at_active
  ON public.listings(expires_at)
  WHERE status IN ('active', 'expiring_soon');
CREATE INDEX IF NOT EXISTS idx_listings_owner_status
  ON public.listings(owner_id, status);

-- =============================================================================
-- SECTION H — CREATE TABLE verifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.verifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                text NOT NULL DEFAULT 'verified_seller'
                      CHECK (type IN ('verified_seller')),
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'expired')),
  cin_front_path      text NOT NULL,
  cin_back_path       text NOT NULL,
  selfie_path         text NOT NULL,
  carte_grise_path    text,
  full_name           text NOT NULL,
  cin_number          text NOT NULL,
  date_of_birth       date,
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES auth.users(id),
  rejection_reason    text,
  expires_at          timestamptz,
  credits_spent       integer NOT NULL DEFAULT 0,
  ledger_entry_id     uuid REFERENCES public.credits_ledger(id),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.verifications IS
  'Demandes de vérification d''identité (Verified Seller). CIN + selfie + carte grise. Modération manuelle par admin.';

CREATE INDEX IF NOT EXISTS idx_verif_user_status
  ON public.verifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_verif_pending
  ON public.verifications(submitted_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_verif_expires
  ON public.verifications(expires_at) WHERE status = 'approved';

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_verif" ON public.verifications;
CREATE POLICY "users_read_own_verif" ON public.verifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_verif" ON public.verifications;
CREATE POLICY "users_insert_own_verif" ON public.verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "admins_full_verif" ON public.verifications;
CREATE POLICY "admins_full_verif" ON public.verifications
  FOR ALL USING (public.immonex_is_admin())
  WITH CHECK (public.immonex_is_admin());

-- =============================================================================
-- SECTION I — CREATE TABLE seller_badges
--
-- ⚠️ Postgres refuse les fonctions non-immutables (now()) dans :
--    - Les colonnes GENERATED (ex. is_active GENERATED AS (expires_at > now()))
--    - Les index partiels (ex. WHERE expires_at > now())
--    On passe par une VIEW pour exposer "is_active" calculé à la lecture.
--    L'unicité métier (1 badge actif par user) sera enforced par la RPC
--    verification_approve (PROMPT 7) qui expirera tout badge actif avant
--    d'en créer un nouveau pour le même user.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.seller_badges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type        text NOT NULL DEFAULT 'verified_seller'
                    CHECK (badge_type IN ('verified_seller')),
  granted_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  verification_id   uuid REFERENCES public.verifications(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.seller_badges IS
  'Badges Verified Seller. Activité = expires_at > now() (calculé à la lecture). Voir VIEW active_seller_badges.';

-- VIEW pour requêter facilement les badges actifs (remplace la GENERATED column)
CREATE OR REPLACE VIEW public.active_seller_badges AS
SELECT
  id,
  user_id,
  badge_type,
  granted_at,
  expires_at,
  verification_id,
  created_at
FROM public.seller_badges
WHERE expires_at > now();

COMMENT ON VIEW public.active_seller_badges IS
  'Badges actifs (expires_at > now()). À utiliser pour les SELECT côté front/RPC.';

-- Indexes simples (pas de WHERE not-immutable)
CREATE INDEX IF NOT EXISTS idx_badges_user_expires
  ON public.seller_badges(user_id, expires_at);

-- Note : pas d'unique index "1 badge actif par user" car ça nécessiterait now()
-- dans le predicate, refusé par Postgres. L'unicité est enforced par la RPC
-- verification_approve (PROMPT 7) qui expirera tout badge actif avant d'en
-- créer un nouveau pour le même user.

ALTER TABLE public.seller_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_active_badges" ON public.seller_badges;
CREATE POLICY "anyone_read_active_badges" ON public.seller_badges
  FOR SELECT USING (expires_at > now());

DROP POLICY IF EXISTS "users_read_own_badges" ON public.seller_badges;
CREATE POLICY "users_read_own_badges" ON public.seller_badges
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_full_badges" ON public.seller_badges;
CREATE POLICY "admins_full_badges" ON public.seller_badges
  FOR ALL USING (public.immonex_is_admin())
  WITH CHECK (public.immonex_is_admin());

GRANT SELECT ON public.active_seller_badges TO anon, authenticated;

-- =============================================================================
-- SECTION J — CREATE TABLE listing_views_daily (rollup analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.listing_views_daily (
  listing_id        uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  view_date         date NOT NULL,
  view_count        integer NOT NULL DEFAULT 0,
  unique_visitors   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (listing_id, view_date)
);

COMMENT ON TABLE public.listing_views_daily IS
  'Rollup quotidien des vues par annonce. Alimenté par job cron au PROMPT 2 depuis phone_reveal_events / search_analytics_events.';

CREATE INDEX IF NOT EXISTS idx_views_daily_date
  ON public.listing_views_daily(view_date);

ALTER TABLE public.listing_views_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_own_views" ON public.listing_views_daily;
CREATE POLICY "owner_read_own_views" ON public.listing_views_daily
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_views_daily.listing_id AND l.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins_full_views" ON public.listing_views_daily;
CREATE POLICY "admins_full_views" ON public.listing_views_daily
  FOR ALL USING (public.immonex_is_admin())
  WITH CHECK (public.immonex_is_admin());

-- =============================================================================
-- SECTION K — Storage bucket verifications
--
-- Pattern policies aligné sur payment-proofs : name LIKE auth.uid()::text || '/%'
-- (cohérence avec la convention existante du projet, pas storage.foldername()).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verifications',
  'verifications',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "users_upload_own_verif_files" ON storage.objects;
CREATE POLICY "users_upload_own_verif_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verifications'
    AND name LIKE auth.uid()::text || '/%'
  );

DROP POLICY IF EXISTS "users_read_own_verif_files" ON storage.objects;
CREATE POLICY "users_read_own_verif_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verifications'
    AND name LIKE auth.uid()::text || '/%'
  );

DROP POLICY IF EXISTS "admins_read_all_verif_files" ON storage.objects;
CREATE POLICY "admins_read_all_verif_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verifications'
    AND public.immonex_is_admin()
  );
