-- =====================================================================
-- Seed reference profiles v2 — 15 SUV/pickups premium US + Toyota US + Lexus
-- Cf. brief 2026-05-06 : fix bug Tahoe + couverture catalogue marché Mada.
--
-- Ces 15 modèles complètent le seed v1 (134 profils, migration
-- 20260430130704). Ils étaient absents → fallback heuristique sortait
-- 51-58M Ar pour un Tahoe 2023 (cf. rapports/DIAGNOSTIC_ENGINE_ESTIMATION_2026-05-06.md).
--
-- Calibration baselines :
--   - Prix US MSRP × facteur import Madagascar 1.5-1.7
--   - Cross-check sur annonces réelles DB (Wrangler Rubicon 2012=145M ✓,
--     Gladiator 2023=235M ✓)
--   - Décotes différenciées par segment :
--       Lifestyle 4×4 (Wrangler / Gladiator / Lexus LX) : 0.07/an
--       Toyota US (Tundra / Sequoia)                   : 0.08/an
--       SUV full-size US (Tahoe / Suburban / Yukon /
--                         Expedition / Armada)         : 0.10/an
--       Pickups utilitaires US (Silverado / Sierra /
--                               F-150 / Ram 1500)      : 0.11/an
--
-- Tier C_anchor + sample_size=0 : seed manuel (pas d'observations
-- calibrées). Sera écrasé par le pipeline build-reference-profiles.ts si
-- de futures observations Tahoe/etc. arrivent en DB (ON CONFLICT DO UPDATE
-- préserve la traçabilité via union des source_versions).
--
-- Idempotent : ON CONFLICT (LOWER(make_name), LOWER(model_name)) DO UPDATE.
-- =====================================================================

BEGIN;

INSERT INTO public.vehicle_price_reference_profiles (
  make_name, model_name, body_type, fuel_type, transmission_type,
  baseline_year, baseline_price_mga, annual_depreciation_rate, expected_km_per_year,
  data_quality_tier, sample_size, source_versions, is_active
) VALUES
  -- SUV full-size US (Tahoe-family — décote 10 %/an)
  -- Full-size SUV US, V8 5.3-6.2L. Cross-check avec Land Cruiser baseline marché Mada.
  ('Chevrolet', 'Tahoe',          'suv',    'petrol', 'automatic', 2026, 380000000, 0.1000, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Tahoe rallongé +8 %. Concurrent Toyota Sequoia.
  ('Chevrolet', 'Suburban',       'suv',    'petrol', 'automatic', 2026, 410000000, 0.1000, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Jumeau Tahoe avec premium positioning GMC.
  ('GMC',       'Yukon',          'suv',    'petrol', 'automatic', 2026, 390000000, 0.1000, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Concurrent direct Tahoe, $55-85k US.
  ('Ford',      'Expedition',     'suv',    'petrol', 'automatic', 2026, 380000000, 0.1000, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Patrol US-spec, $55-80k US.
  ('Nissan',    'Armada',         'suv',    'petrol', 'automatic', 2026, 340000000, 0.1000, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),

  -- Toyota US (décote 8 %/an — fiabilité Toyota)
  -- Pickup full-size Toyota US, $42-80k US.
  ('Toyota',    'Tundra',         'pickup', 'petrol', 'automatic', 2026, 320000000, 0.0800, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- SUV full-size Toyota US, $61-82k US.
  ('Toyota',    'Sequoia',        'suv',    'petrol', 'automatic', 2026, 380000000, 0.0800, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),

  -- Pickups full-size US utilitaires (décote 11 %/an — usage chargé)
  -- Pickup full-size $40-75k US ×1.5 import Mada.
  ('Chevrolet', 'Silverado',      'pickup', 'petrol', 'automatic', 2026, 290000000, 0.1100, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Jumeau Silverado.
  ('GMC',       'Sierra',         'pickup', 'petrol', 'automatic', 2026, 290000000, 0.1100, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Le pickup le plus vendu US, $38-90k.
  ('Ford',      'F-150',          'pickup', 'petrol', 'automatic', 2026, 290000000, 0.1100, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Concurrent F-150 / Silverado.
  ('Dodge',     'Ram 1500',       'pickup', 'petrol', 'automatic', 2026, 290000000, 0.1100, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),

  -- Jeep — lifestyle 4×4 / SUV mid-size premium
  -- SUV mid-size premium Jeep.
  ('Jeep',      'Grand Cherokee', 'suv',    'petrol', 'automatic', 2026, 290000000, 0.1000, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Lifestyle 4×4 iconique. Décote lente. Cross-check Rubicon 2012=145M ✓.
  ('Jeep',      'Wrangler',       'suv',    'petrol', 'automatic', 2026, 380000000, 0.0700, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),
  -- Pickup Wrangler-based. Cross-check 2023=235M ✓.
  ('Jeep',      'Gladiator',      'pickup', 'petrol', 'automatic', 2026, 330000000, 0.0700, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true),

  -- Lexus LX — ultra-premium (Land Cruiser luxury sister)
  -- LX 600/570. Décote luxury très lente.
  ('Lexus',     'LX',             'suv',    'petrol', 'automatic', 2026, 700000000, 0.0700, 15000, 'C_anchor', 0, ARRAY['v2_premium_us_2026_05_06']::TEXT[], true)
ON CONFLICT (LOWER(make_name), LOWER(model_name))
DO UPDATE SET
  body_type = EXCLUDED.body_type,
  fuel_type = EXCLUDED.fuel_type,
  transmission_type = EXCLUDED.transmission_type,
  baseline_year = EXCLUDED.baseline_year,
  baseline_price_mga = EXCLUDED.baseline_price_mga,
  annual_depreciation_rate = EXCLUDED.annual_depreciation_rate,
  expected_km_per_year = EXCLUDED.expected_km_per_year,
  data_quality_tier = EXCLUDED.data_quality_tier,
  sample_size = EXCLUDED.sample_size,
  source_versions = (
    SELECT ARRAY(
      SELECT DISTINCT v
      FROM unnest(COALESCE(public.vehicle_price_reference_profiles.source_versions, ARRAY[]::TEXT[]) || EXCLUDED.source_versions) AS v
      ORDER BY v
    )
  ),
  is_active = true,
  updated_at = now();

COMMIT;

-- =====================================================================
-- Validation post-application (à lancer dans Supabase SQL Editor)
-- =====================================================================
--
-- 1. Doit retourner 15 lignes (les 15 nouveaux profils) :
--
-- SELECT make_name, model_name, baseline_year, baseline_price_mga,
--        annual_depreciation_rate, body_type, data_quality_tier
-- FROM vehicle_price_reference_profiles
-- WHERE (LOWER(make_name), LOWER(model_name)) IN (
--   ('chevrolet','tahoe'), ('chevrolet','suburban'), ('chevrolet','silverado'),
--   ('gmc','yukon'), ('gmc','sierra'),
--   ('ford','expedition'), ('ford','f-150'),
--   ('dodge','ram 1500'),
--   ('jeep','grand cherokee'), ('jeep','wrangler'), ('jeep','gladiator'),
--   ('toyota','tundra'), ('toyota','sequoia'),
--   ('nissan','armada'),
--   ('lexus','lx')
-- )
-- ORDER BY make_name, model_name;
--
-- 2. Doit retourner 149 (134 v1 + 15 v2) :
--
-- SELECT COUNT(*) FROM vehicle_price_reference_profiles;
--
-- 3. Vérifier la traçabilité source_versions (doit contenir 'v2_premium_us_2026_05_06') :
--
-- SELECT make_name, model_name, source_versions
-- FROM vehicle_price_reference_profiles
-- WHERE 'v2_premium_us_2026_05_06' = ANY(source_versions);
