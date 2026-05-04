-- =============================================================================
-- PROMPT 11 — Validation post-ingestion CSV → market_listings_clean
--
-- À runner par Ali dans Supabase SQL Editor APRÈS :
--   1. Apply migration 20260509120000_market_listings_clean_extension.sql
--   2. Run script ingest-market-listings-csv.ts en mode write (--reuse-supabase-env)
--
-- Source tag attendu : 'csv_seed_v1_2026'
-- =============================================================================

-- 1. Total ingéré + utilisable
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN include_in_estimation THEN 1 ELSE 0 END) AS usable,
  SUM(CASE WHEN outlier_flag THEN 1 ELSE 0 END) AS outliers
FROM public.market_listings_clean
WHERE source = 'csv_seed_v1_2026';
-- Expected : total ≈ 105, usable ≥ 75, outliers 0-15

-- 2. Distribution par make (top 15)
SELECT normalized_make, COUNT(*) AS n
FROM public.market_listings_clean
WHERE source = 'csv_seed_v1_2026'
GROUP BY normalized_make
ORDER BY n DESC
LIMIT 15;
-- Expected : Toyota / Hyundai / Kia / VW / Nissan en tête (selon CSV)

-- 3. Distribution data_confidence
SELECT data_confidence, COUNT(*) AS n
FROM public.market_listings_clean
WHERE source = 'csv_seed_v1_2026'
GROUP BY data_confidence
ORDER BY n DESC;
-- Expected : high majoritaire, medium et low minoritaires

-- 4. Outliers détectés (post-pass batch)
SELECT
  normalized_make, normalized_model, year,
  COUNT(*) FILTER (WHERE outlier_flag) AS outliers,
  COUNT(*) AS total_in_cluster
FROM public.market_listings_clean
WHERE source = 'csv_seed_v1_2026'
GROUP BY normalized_make, normalized_model, year
HAVING COUNT(*) >= 5
ORDER BY outliers DESC;
-- Expected : outliers 0-3 par cluster significatif

-- 5. Doublons détectés (rows non-includes pour cause de fingerprint conflict)
SELECT COUNT(*) AS duplicates_skipped
FROM public.market_listings_clean
WHERE source = 'csv_seed_v1_2026'
  AND extraction_notes ILIKE '%duplicate%';
-- Expected : 0-5 (CSV deduplifié en source par Ali, mais le script catch les
-- quasi-doublons via fingerprint banding)

-- 6. RGPD audit : aucun contact en clear ne fuite dans clean
-- (cherche pattern numéro de téléphone Madagascar 03X XX XXX XX)
SELECT COUNT(*) AS leaks
FROM public.market_listings_clean
WHERE source = 'csv_seed_v1_2026'
  AND (
    extraction_notes ~ '\d{3}\s?\d{2}\s?\d{3}\s?\d{2}'
    OR options_summary ~ '\d{3}\s?\d{2}\s?\d{3}\s?\d{2}'
    OR condition_notes ~ '\d{3}\s?\d{2}\s?\d{3}\s?\d{2}'
  );
-- Expected : 0

-- 7. Conversion FMG correcte (pipeline note)
SELECT COUNT(*) AS fmg_converted
FROM public.market_listings_clean
WHERE source = 'csv_seed_v1_2026'
  AND extraction_notes ILIKE '%fmg_converted%';
-- Expected : ≈ nombre de lignes FMG dans le CSV (à confirmer côté CSV source)

-- 8. EXPLAIN ANALYZE — l'index composite est utilisé sur les filtres engine V2
EXPLAIN ANALYZE
SELECT id, price_mga, year, mileage_km, data_confidence, seller_type
FROM public.market_listings_clean
WHERE normalized_make ILIKE 'Toyota'
  AND normalized_model ILIKE 'Hilux'
  AND year BETWEEN 2014 AND 2020
  AND include_in_estimation = true
  AND outlier_flag = false;
-- Expected : "Index Scan using idx_market_clean_make_model_year_active"

-- 9. Bonus — vérification raw : aucun contact en clear non plus
SELECT COUNT(*) AS raw_leaks
FROM public.market_listings_raw
WHERE source = 'csv_seed_v1_2026'
  AND payload::text ~ '\d{3}\s?\d{2}\s?\d{3}\s?\d{2}';
-- Expected : 0 (le script hashe avant insert raw)

-- 10. Bonus — distribution par seller_type
SELECT seller_type, COUNT(*) AS n
FROM public.market_listings_clean
WHERE source = 'csv_seed_v1_2026'
GROUP BY seller_type
ORDER BY n DESC;
-- Expected : Particulier Facebook majoritaire, Concessionnaire / Revendeur secondaires
