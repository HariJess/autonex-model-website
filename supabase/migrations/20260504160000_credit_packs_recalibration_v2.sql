-- =============================================================================
-- PROMPT 3.5 — Pricing recalibration v2 : 6 packs avec bonus agressifs
--
-- Audit post-PROMPT 3 a révélé 4 problèmes business :
--   1. Pack Découverte 10k Ar < prix annonce 25k Ar → dead-end UX
--   2. Seulement 4 packs, max 4 annonces → trop restreint
--   3. Bonus invisibles dans les cards UI → argument de vente perdu
--   4. Box "Votre solde" mathématiquement fausse et illisible
--
-- Décisions actées (Ali, 2026-05-04) :
--   - Découverte 25k Ar = prix exact d'1 annonce (pas de friction)
--   - 6 packs au lieu de 4 (ajoute Business + Enterprise pour pré-dealer self-serve)
--   - Bonus jusqu'à +67% (Enterprise) = vrai effet "plus tu achètes, plus tu économises"
--   - Ratio strict 1:1 (price_mga = credits_amount), bonus catalogue séparé
--
-- Migration DESTRUCTIVE pour public.credit_packs (DELETE + INSERT 6).
-- Safe car aucune transaction live n'a été processée avec les packs PROMPT 1
-- (discover/standard/pro/power v1 livrés il y a < 24h, comptes préservés ont
-- juste reçu leur backfill signup grant). Les transactions historiques
-- pointant vers des IDs de packs anciens restent valides syntaxiquement
-- (credit_pack_id est TEXT plain, pas FK).
--
-- Le webhook VPI grant déjà credits_amount + bonus_credits depuis PROMPT 2,
-- donc cette migration n'a PAS besoin de modifier les RPCs.
--
-- Référence : PROMPT_3_5_PRICING_RECALIBRATION.md
-- =============================================================================

DELETE FROM public.credit_packs;

INSERT INTO public.credit_packs
  (id, name, display_name, credits_amount, bonus_credits, price_mga, sort_order, is_active)
VALUES
  ('discover',   'Pack Découverte',  'Pack Découverte',   25000,   0,        25000,   1, true),
  ('standard',   'Pack Standard',    'Pack Standard',     75000,   12500,    75000,   2, true),
  ('pro',        'Pack Pro',         'Pack Pro',          150000,  50000,    150000,  3, true),
  ('power',      'Pack Power',       'Pack Power',        300000,  150000,   300000,  4, true),
  ('business',   'Pack Business',    'Pack Business',     750000,  450000,   750000,  5, true),
  ('enterprise', 'Pack Enterprise',  'Pack Enterprise',   1500000, 1000000,  1500000, 6, true);

-- Audit invariant : ratio 1:1 strict + total = base + bonus correct.
-- Si une de ces vérifications échoue, RAISE EXCEPTION pour annuler la migration.
DO $$
DECLARE
  v_count INT;
  v_invalid_ratio INT;
BEGIN
  SELECT count(*) INTO v_count FROM public.credit_packs;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'Expected 6 credit_packs after reseed, got %', v_count;
  END IF;

  SELECT count(*) INTO v_invalid_ratio
  FROM public.credit_packs
  WHERE price_mga <> credits_amount;
  IF v_invalid_ratio > 0 THEN
    RAISE EXCEPTION 'Some packs violate 1:1 ratio (price_mga ≠ credits_amount), count = %', v_invalid_ratio;
  END IF;
END $$;
