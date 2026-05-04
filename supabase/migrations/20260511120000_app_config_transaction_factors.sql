-- =============================================================================
-- PROMPT 10A — Engine V2 transaction factors + Argus-grade multipliers
--
-- Migration NON-DESTRUCTIVE, idempotente.
--
-- Seed dans public.app_config :
--   estimation_transaction_factors_v2 = {
--     version, factors (per seller_type), price_format_multipliers (3 Argus
--     prix : trade_in_pro / private_market / dealer_retail), last_updated, comment
--   }
--
-- Permet de tuner les coefficients depuis le SQL Editor (admin) sans
-- redéploiement code. Le moteur V2 lit cette config via le helper
-- src/lib/estimation/transactionFactors.ts (avec FALLBACK hardcoded en TS si
-- la config est absente ou malformée).
--
-- Pré-requis : la table public.app_config existe (créée par migration
--              20260430140000_app_config_table.sql).
--
-- Référence : briefs/PROMPT_10A_ENGINE_V2_CORE.md (Tâche 1).
-- =============================================================================

INSERT INTO public.app_config (key, value, description)
VALUES (
  'estimation_transaction_factors_v2',
  jsonb_build_object(
    'version', 'v2_2026_05_11',
    'factors', jsonb_build_object(
      'facebook_particulier', 0.93,
      'facebook_revendeur', 0.87,
      'autonex_active', 0.96,
      'concessionnaire_officiel', 0.97,
      'partner', 0.97,
      'manual', 0.95,
      'transaction_confirmed', 1.00,
      'unknown', 0.90
    ),
    'price_format_multipliers', jsonb_build_object(
      'trade_in_pro', 0.78,
      'private_market', 1.00,
      'dealer_retail', 1.15
    ),
    'last_updated', '2026-05-11T00:00:00Z',
    'comment', 'Transaction factor par source vendeur (compense le gap asking-price -> transaction-price). 3 multiplicateurs Argus-grade pour generer reprise pro / entre particuliers / en concession depuis la valeur centrale.'
  ),
  'PROMPT 10A — Transaction factors V2 (per seller type) + Argus-grade price format multipliers'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description;

-- Le trigger app_config_updated_at_trg synchronise updated_at automatiquement
-- (cf. migration 20260430140000).

-- Vérification : la valeur est bien lisible et a la forme attendue
DO $$
DECLARE
  v jsonb;
BEGIN
  SELECT value INTO v FROM public.app_config WHERE key = 'estimation_transaction_factors_v2';
  IF v IS NULL THEN
    RAISE EXCEPTION 'app_config seed failed: row missing for estimation_transaction_factors_v2';
  END IF;
  IF NOT (v ? 'factors') THEN
    RAISE EXCEPTION 'app_config seed failed: missing key "factors" in estimation_transaction_factors_v2';
  END IF;
  IF NOT (v ? 'price_format_multipliers') THEN
    RAISE EXCEPTION 'app_config seed failed: missing key "price_format_multipliers" in estimation_transaction_factors_v2';
  END IF;
  IF NOT (v -> 'factors' ? 'autonex_active') THEN
    RAISE EXCEPTION 'app_config seed failed: missing factor "autonex_active"';
  END IF;
END $$;
