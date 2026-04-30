-- =====================================================================
-- Seed reference profiles vague v1 — généré le 2026-04-30
-- Source pipeline: scripts/data/build-reference-profiles.ts
-- Total profils : 53
--   Tier A (strong)   : 1
--   Tier B (moderate) : 16
--   Tier C (anchor)   : 36
--
-- Idempotent: ON CONFLICT met à jour si re-seed avec data plus fraîche.
-- Les 10 profils initiaux du sprint estimation MVP sont préservés et seront
-- mis à jour si une nouvelle calibration les recouvre.
-- =====================================================================

BEGIN;

INSERT INTO public.vehicle_price_reference_profiles (
  make_name, model_name, body_type, fuel_type, transmission_type,
  baseline_year, baseline_price_mga, annual_depreciation_rate, expected_km_per_year,
  data_quality_tier, sample_size, source_versions, is_active
) VALUES
  ('Audi', 'A3', 'other', 'petrol', 'manual', 2012, 48520000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Audi', 'Q5', 'suv', 'diesel', 'automatic', 2012, 51040000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Chevrolet', 'Captiva', 'suv', 'diesel', 'automatic', 2015, 36344573, 0.1000, 15000, 'A_strong', 11, ARRAY['v1']::TEXT[], true),
  ('Chevrolet', 'Cruze', 'sedan', 'petrol', 'manual', 2014, 17262459, 0.1000, 15000, 'B_moderate', 10, ARRAY['v1']::TEXT[], true),
  ('Citroen', 'C3', 'other', NULL, NULL, 2013, 22440000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Citroen', 'C4', 'other', NULL, NULL, 2014, 22880000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true),
  ('Ford', 'Ranger', 'other', NULL, NULL, 2025, 167200000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Poer', 'pickup', NULL, 'automatic', 2025, 169900000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Poer Kingkong', 'pickup', NULL, NULL, 2025, 129900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Tank 300', 'suv', 'hybrid', NULL, 2025, 254900000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Tank 400', 'suv', 'hybrid', NULL, 2025, 289900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Tank 500', 'suv', 'hybrid', NULL, 2025, 344900000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Tank 700', 'suv', 'hybrid', NULL, 2025, 449900000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Wey 80', 'suv', NULL, NULL, 2025, 339900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Wingle 7', 'pickup', NULL, NULL, 2025, 119900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Haval', 'Dargo', 'suv', NULL, NULL, 2025, 187400000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Haval', 'H6', 'suv', 'hybrid', NULL, 2025, 149900000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true),
  ('Haval', 'H6 GT', 'suv', NULL, NULL, 2025, 199900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Haval', 'Jolion', 'suv', NULL, 'automatic', 2025, 139900000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true),
  ('Haval', 'M4', 'other', NULL, NULL, 2016, 28600000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Haval', 'Ora Good Cat', 'other', NULL, NULL, 2025, 189900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Galloper', 'suv', 'diesel', 'manual', 2007, 77500000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Getz', 'other', NULL, NULL, 2006, 11880000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Santa Fe', 'suv', 'diesel', 'automatic', 2011, 34240000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Terracan', 'other', NULL, NULL, 2003, 30800000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Tucson', 'suv', 'diesel', 'manual', 2012, 42304380, 0.1000, 15000, 'B_moderate', 5, ARRAY['v1']::TEXT[], true),
  ('Isuzu', 'D-Max', 'pickup', 'diesel', 'automatic', 2025, 137950000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Isuzu', 'MU-X', 'suv', 'diesel', 'automatic', 2025, 258166667, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Jeep', 'Wrangler', 'suv', 'diesel', 'manual', 2015, 90000000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Jetta', 'VS5', 'suv', 'petrol', 'automatic', 2025, 116500000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Kia', 'Picanto', 'other', 'petrol', 'manual', 2012, 18480000, 0.1000, 15000, 'C_anchor', 6, ARRAY['v1']::TEXT[], true),
  ('Kia', 'Rio', 'other', 'petrol', 'manual', 2010, 28500000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Kia', 'Sorento', 'suv', 'diesel', 'automatic', 2018, 42560916, 0.1000, 15000, 'B_moderate', 13, ARRAY['v1']::TEXT[], true),
  ('Mahindra', 'Scorpio', 'pickup', 'diesel', 'automatic', 2024, 125000000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Mahindra', 'XUV300', 'other', 'petrol', 'manual', 2024, 125000000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'BT-50', 'pickup', 'diesel', 'automatic', 2024, 123200000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'CX-30', 'suv', 'petrol', 'automatic', 2025, 144800000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'CX-60', 'suv', 'petrol', 'automatic', 2025, 249800000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'CX-90', 'suv', 'petrol', 'automatic', 2025, 289800000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'Navara', 'pickup', 'diesel', 'manual', 2018, 93500000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'NP300', 'pickup', 'diesel', 'manual', 2021, 57094900, 0.1000, 15000, 'B_moderate', 6, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'Pathfinder', 'suv', 'diesel', 'automatic', 2014, 55000000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'Patrol', 'suv', 'diesel', 'automatic', 2024, 315927537, 0.1000, 15000, 'B_moderate', 5, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Clio', 'other', 'petrol', 'manual', 2011, 22500000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Duster', 'suv', 'diesel', 'cvt', 2019, 67100000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Suzuki', 'Jimny', 'suv', 'diesel', 'automatic', 2025, 98934507, 0.1000, 15000, 'B_moderate', 8, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'Hilux', 'pickup', 'diesel', 'manual', 2025, 222914679, 0.1000, 15000, 'B_moderate', 7, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'Land Cruiser', 'wagon', 'diesel', 'automatic', 2025, 371868512, 0.1000, 15000, 'B_moderate', 19, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Amarok', 'pickup', 'diesel', 'automatic', 2025, 232500000, 0.1000, 15000, 'C_anchor', 6, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Jetta', 'other', NULL, NULL, 2016, 28600000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'T-Cross', 'other', 'petrol', 'automatic', 2025, 150000000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Tiguan', 'other', NULL, NULL, 2012, 35200000, 0.1000, 15000, 'C_anchor', 5, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Touareg', 'suv', 'diesel', 'automatic', 2025, 525000000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true)
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
