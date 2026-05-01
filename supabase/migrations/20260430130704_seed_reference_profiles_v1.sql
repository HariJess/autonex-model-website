-- =====================================================================
-- Seed reference profiles vague v1 — généré le 2026-05-01
-- Source pipeline: scripts/data/build-reference-profiles.ts
-- Total profils : 109
--   Tier A (strong)   : 12
--   Tier B (moderate) : 44
--   Tier C (anchor)   : 53
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
  ('Audi', 'A3', 'sedan', 'diesel', 'manual', 2009, 35200000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Audi', 'A4', 'sedan', 'diesel', 'automatic', 2007, 26400000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Audi', 'A6', 'sedan', 'diesel', 'automatic', 2016, 76844374, 0.1000, 15000, 'B_moderate', 6, ARRAY['v1']::TEXT[], true),
  ('Audi', 'Q5', 'suv', 'diesel', 'automatic', 2013, 50239065, 0.1000, 15000, 'A_strong', 9, ARRAY['v1']::TEXT[], true),
  ('BMW', '320d', 'sedan', 'diesel', 'manual', 2011, 32120000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('BMW', 'X5', 'suv', 'diesel', 'automatic', 2010, 48400000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('BMW', 'X6', 'suv', 'diesel', 'automatic', 2013, 74800000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true),
  ('Chery', 'QQ', 'hatchback', 'petrol', 'manual', 2012, 8228000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Chevrolet', 'Aveo', 'hatchback', 'petrol', NULL, 2010, 14784000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Chevrolet', 'Captiva', 'suv', 'diesel', 'automatic', 2015, 37224456, 0.1000, 15000, 'A_strong', 21, ARRAY['v1']::TEXT[], true),
  ('Chevrolet', 'Cruze', 'sedan', 'diesel', 'automatic', 2015, 26763707, 0.1000, 15000, 'A_strong', 16, ARRAY['v1']::TEXT[], true),
  ('Chevrolet', 'Matiz', 'hatchback', 'petrol', 'manual', 2007, 9944000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Chevrolet', 'Spark', 'hatchback', 'petrol', 'automatic', 2011, 17864000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Citroen', 'Berlingo', 'van', 'diesel', 'manual', 2006, 22000000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Citroen', 'C2', 'hatchback', 'petrol', 'manual', 2025, 10560000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Citroen', 'C3', 'hatchback', 'petrol', 'manual', 2014, 23760000, 0.1000, 15000, 'C_anchor', 6, ARRAY['v1']::TEXT[], true),
  ('Citroen', 'C4', 'coupe', 'petrol', 'manual', 2017, 34386064, 0.1000, 15000, 'B_moderate', 6, ARRAY['v1']::TEXT[], true),
  ('Ford', 'EcoSport', 'suv', 'petrol', 'manual', 2014, 40480000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Ford', 'Escape', 'suv', 'petrol', 'automatic', 2013, 36960000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Ford', 'Ranger', 'pickup', 'diesel', 'manual', 2025, 173113336, 0.1000, 15000, 'B_moderate', 8, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Poer', 'pickup', NULL, 'automatic', 2025, 169900000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Poer Kingkong', 'pickup', NULL, NULL, 2025, 129900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Tank 300', 'suv', 'hybrid', NULL, 2025, 254900000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Tank 400', 'suv', 'hybrid', NULL, 2025, 289900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Tank 500', 'suv', 'hybrid', NULL, 2025, 344900000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Tank 700', 'suv', 'hybrid', NULL, 2025, 449900000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Wey 80', 'suv', NULL, NULL, 2025, 339900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Great Wall', 'Wingle 7', 'pickup', NULL, NULL, 2025, 119900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Haval', 'Dargo', 'suv', NULL, NULL, 2025, 187400000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Haval', 'H6', 'suv', 'petrol', 'automatic', 2025, 127623362, 0.1000, 15000, 'B_moderate', 5, ARRAY['v1']::TEXT[], true),
  ('Haval', 'H6 GT', 'suv', NULL, NULL, 2025, 199900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Haval', 'Jolion', 'suv', 'petrol', 'automatic', 2025, 134900000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Haval', 'Ora Good Cat', 'other', NULL, NULL, 2025, 189900000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Accent', 'sedan', 'diesel', 'automatic', 2014, 21926901, 0.1000, 15000, 'B_moderate', 7, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Avante', 'sedan', 'petrol', 'automatic', 2008, 19360000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Galloper', 'suv', 'diesel', 'manual', 2003, 54836000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Getz', 'hatchback', 'diesel', 'manual', 2006, 10736000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Grand Starex', 'van', 'diesel', 'manual', 2008, 39600000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'i20', 'hatchback', 'petrol', 'automatic', 2023, 42900000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'i30', 'hatchback', 'diesel', 'manual', 2015, 25039274, 0.1000, 15000, 'B_moderate', 15, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'i40', 'sedan', 'diesel', 'automatic', 2016, 38940000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'iX35', 'suv', 'diesel', 'manual', 2014, 27512296, 0.0732, 15000, 'B_moderate', 8, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Maxcruz', 'suv', 'diesel', 'automatic', 2014, 63360000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Santa Fe (2001-2018)', 'suv', 'diesel', 'automatic', 2014, 49794904, 0.1000, 15000, 'B_moderate', 22, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Starex', 'van', 'diesel', 'manual', 2013, 48443648, 0.1000, 15000, 'A_strong', 10, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Terracan', 'suv', 'diesel', 'automatic', 2007, 25443065, 0.0603, 15000, 'A_strong', 6, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Tucson (2004-2015)', 'suv', 'diesel', 'manual', 2012, 39530936, 0.1000, 15000, 'A_strong', 12, ARRAY['v1']::TEXT[], true),
  ('Hyundai', 'Veloster', 'coupe', 'petrol', 'automatic', 2014, 33880000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Isuzu', 'D-Max', 'pickup', 'diesel', 'automatic', 2025, 125413178, 0.1000, 15000, 'B_moderate', 6, ARRAY['v1']::TEXT[], true),
  ('Isuzu', 'MU-X', 'suv', 'diesel', 'automatic', 2025, 258166667, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Jeep', 'Cherokee', 'suv', 'petrol', 'automatic', 2002, 31680000, 0.1000, 15000, 'C_anchor', 4, ARRAY['v1']::TEXT[], true),
  ('Jeep', 'Grand Cherokee', 'suv', 'diesel', 'automatic', 2018, 160600000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Jeep', 'Wrangler', 'suv', 'diesel', 'manual', 2014, 90000000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Jetta', 'VS5', 'suv', 'petrol', 'automatic', 2025, 116500000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Kia', 'Picanto', 'hatchback', 'petrol', 'automatic', 2014, 25656813, 0.1000, 15000, 'A_strong', 14, ARRAY['v1']::TEXT[], true),
  ('Kia', 'Rio', 'other', 'petrol', 'manual', 2010, 28500000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Kia', 'Sorento', 'suv', 'diesel', 'automatic', 2018, 58044749, 0.1000, 15000, 'B_moderate', 32, ARRAY['v1']::TEXT[], true),
  ('Kia', 'Sportage', 'suv', 'diesel', 'automatic', 2019, 56023530, 0.1000, 15000, 'A_strong', 22, ARRAY['v1']::TEXT[], true),
  ('Mahindra', 'Scorpio', 'pickup', 'diesel', 'automatic', 2024, 125000000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Mahindra', 'XUV300', 'other', 'petrol', 'manual', 2024, 125000000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'BT-50', 'pickup', 'diesel', 'automatic', 2025, 151334316, 0.1000, 15000, 'B_moderate', 7, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'CX-3', 'suv', 'petrol', 'automatic', 2019, 61600000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'CX-30', 'suv', 'petrol', 'automatic', 2025, 144800000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'CX-5', 'suv', 'petrol', 'automatic', 2022, 114400000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'CX-60', 'suv', 'petrol', 'automatic', 2025, 249800000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Mazda', 'CX-90', 'suv', 'petrol', 'automatic', 2025, 289800000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Mercedes-Benz', 'B200 Cdi', 'hatchback', 'diesel', 'manual', 2008, 29480000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Mercedes-Benz', 'C200', 'sedan', 'diesel', 'manual', 2003, 33940000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Mini', 'Cooper', 'coupe', 'petrol', 'manual', 2008, 20240000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Mitsubishi', 'Pajero', 'suv', 'diesel', 'automatic', 2015, 57640000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Mitsubishi', 'Pajero Sport', 'suv', 'diesel', NULL, 2017, 83600000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Mitsubishi', 'Starex', 'van', 'diesel', 'manual', 2004, 22528000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'Navara (2016-2026)', 'pickup', 'diesel', 'manual', 2024, 140800000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'NP300 (2005-2015)', 'pickup', 'diesel', 'manual', 2013, 9567560, 0.1934, 15000, 'B_moderate', 7, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'Pathfinder', 'suv', 'diesel', 'automatic', 2014, 55000000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'Patrol (1995-2010)', 'suv', 'diesel', 'manual', 2009, 137099559, 0.1000, 15000, 'B_moderate', 5, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'Patrol (2011-2026)', 'suv', 'diesel', 'automatic', 2023, 240000000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Nissan', 'Qashqai', 'suv', 'diesel', 'manual', 2015, 66380000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Peugeot', '206', 'hatchback', 'diesel', 'manual', 2004, 15160000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Peugeot', '3008', 'suv', 'petrol', 'automatic', 2021, 67100000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Peugeot', '307', 'sedan', 'petrol', 'manual', 2007, 15496042, 0.1000, 15000, 'A_strong', 5, ARRAY['v1']::TEXT[], true),
  ('Peugeot', '308', 'sedan', 'diesel', 'manual', 2010, 11863500, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Peugeot', '309', 'hatchback', 'petrol', NULL, 1992, 7920000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Avantime', 'van', 'diesel', 'manual', 2002, 8360000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Clio (2005-2014)', 'hatchback', 'petrol', 'manual', 2013, 22200000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Duster', 'suv', 'petrol', 'manual', 2025, 81410332, 0.1000, 15000, 'B_moderate', 9, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Kangoo', 'van', 'diesel', 'manual', 2007, 14168000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Koleos', 'suv', 'petrol', 'automatic', 2015, 37400000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Mégane', 'coupe', 'diesel', 'manual', 2003, 39600000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Renault', 'Scenic', 'van', 'petrol', NULL, 2004, 11660000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('SsangYong', 'Rexton', 'suv', 'diesel', 'manual', 2014, 36114048, 0.1000, 15000, 'A_strong', 9, ARRAY['v1']::TEXT[], true),
  ('Suzuki', 'Intruder 750', 'other', 'petrol', NULL, 1997, 10560000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Suzuki', 'Jimny (2019-2026)', 'suv', 'petrol', 'automatic', 2025, 112965768, 0.1000, 15000, 'A_strong', 9, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'Corolla', 'sedan', 'petrol', 'automatic', 2008, 14960000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'Fortuner', 'suv', 'diesel', 'automatic', 2014, 127600000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'Hilux', 'pickup', 'diesel', 'manual', 2025, 174365043, 0.1000, 15000, 'B_moderate', 13, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'Land Cruiser', 'wagon', 'diesel', 'automatic', 2024, 221396294, 0.1000, 15000, 'B_moderate', 22, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'Prado', 'suv', 'diesel', 'automatic', 2008, 77880000, 0.1000, 15000, 'C_anchor', 4, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'RAV4', 'suv', 'diesel', 'manual', 2009, 33967359, 0.1000, 15000, 'B_moderate', 9, ARRAY['v1']::TEXT[], true),
  ('Toyota', 'Yaris', 'hatchback', 'petrol', 'automatic', 2009, 24640000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Amarok', 'pickup', 'diesel', 'automatic', 2025, 232500000, 0.1000, 15000, 'C_anchor', 6, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Bora', 'wagon', 'diesel', 'manual', 2003, 15840000, 0.1000, 15000, 'B_moderate', 3, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Caddy', 'van', 'diesel', 'manual', 2007, 16720000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Jetta', 'other', NULL, NULL, 2016, 28600000, 0.1000, 15000, 'C_anchor', 2, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Polo', 'hatchback', 'petrol', 'manual', 2013, 18297833, 0.1000, 15000, 'B_moderate', 6, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'T-Cross', 'other', 'petrol', 'automatic', 2025, 150000000, 0.1000, 15000, 'C_anchor', 1, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Tiguan', 'suv', 'diesel', 'automatic', 2014, 54071379, 0.1000, 15000, 'A_strong', 12, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Touareg (2002-2014)', 'suv', 'diesel', 'automatic', 2006, 29040000, 0.1000, 15000, 'B_moderate', 4, ARRAY['v1']::TEXT[], true),
  ('Volkswagen', 'Touareg (2015-2026)', 'suv', 'diesel', 'automatic', 2025, 500000000, 0.1000, 15000, 'C_anchor', 3, ARRAY['v1']::TEXT[], true)
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
