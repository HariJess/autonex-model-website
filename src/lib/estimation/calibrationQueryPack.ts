export type CalibrationQuery = {
  id: string;
  title: string;
  description: string;
  sql: string;
};

export const ESTIMATION_CALIBRATION_QUERY_PACK: CalibrationQuery[] = [
  {
    id: "tier_distribution_30d",
    title: "Evidence Tier Distribution (30 days)",
    description: "Measures how often each evidence tier appears in completed estimations.",
    sql: `
SELECT
  metadata->>'evidenceTier' AS evidence_tier,
  COUNT(*) AS total
FROM vehicle_estimation_events
WHERE event_type = 'estimation_completed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY metadata->>'evidenceTier'
ORDER BY total DESC;`,
  },
  {
    id: "mode_distribution_30d",
    title: "Pricing / Claim Mode Distribution (30 days)",
    description: "Tracks product framing exposure by pricing and claim modes.",
    sql: `
SELECT
  metadata->>'pricingMode' AS pricing_mode,
  metadata->>'claimMode' AS claim_mode,
  COUNT(*) AS total
FROM vehicle_estimation_events
WHERE event_type = 'estimation_completed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY metadata->>'pricingMode', metadata->>'claimMode'
ORDER BY total DESC;`,
  },
  {
    id: "fallback_and_caps_30d",
    title: "Fallback and Confidence Cap Rates (30 days)",
    description: "Detects reliability pressure points: fallback usage and confidence capping.",
    sql: `
SELECT
  AVG(CASE WHEN (metadata->>'fallbackUsed')::boolean THEN 1 ELSE 0 END) AS fallback_rate,
  AVG(CASE WHEN (metadata->>'confidenceCapped')::boolean THEN 1 ELSE 0 END) AS confidence_cap_rate
FROM vehicle_estimation_events
WHERE event_type = 'estimation_completed'
  AND created_at >= NOW() - INTERVAL '30 days';`,
  },
  {
    id: "support_patterns_30d",
    title: "Comparable Support Pattern Summary (30 days)",
    description: "Highlights common comparable evidence profiles to guide calibration priorities.",
    sql: `
SELECT
  CASE
    WHEN (metadata->>'comparableCountStrong')::int >= 6 THEN 'strong_support'
    WHEN (metadata->>'comparableCountStrong')::int >= 3 THEN 'moderate_support'
    WHEN (metadata->>'comparableCountUsed')::int >= 1 THEN 'limited_support'
    ELSE 'weak_support'
  END AS support_bucket,
  COUNT(*) AS total
FROM vehicle_estimation_events
WHERE event_type = 'estimation_completed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY support_bucket
ORDER BY total DESC;`,
  },
  {
    id: "action_by_tier_30d",
    title: "Post-Estimate Actions by Tier (30 days)",
    description: "Compares publish/refine/compare actions by evidence tier for behavioral calibration.",
    sql: `
WITH completion AS (
  SELECT
    estimation_request_id,
    metadata->>'evidenceTier' AS evidence_tier
  FROM vehicle_estimation_events
  WHERE event_type = 'estimation_completed'
    AND created_at >= NOW() - INTERVAL '30 days'
),
actions AS (
  SELECT
    estimation_request_id,
    event_type
  FROM vehicle_estimation_events
  WHERE event_type IN (
    'clicked_publish_after_estimation',
    'clicked_refine_estimation',
    'clicked_compare_after_estimation'
  )
    AND created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  c.evidence_tier,
  a.event_type,
  COUNT(*) AS total
FROM actions a
JOIN completion c
  ON c.estimation_request_id = a.estimation_request_id
GROUP BY c.evidence_tier, a.event_type
ORDER BY c.evidence_tier, total DESC;`,
  },
  {
    id: "weak_moderate_publish_propensity_30d",
    title: "Publish Propensity for Moderate/Weak States (30 days)",
    description: "Measures whether moderate/weak states still drive publish clicks at high rates.",
    sql: `
WITH completion AS (
  SELECT
    estimation_request_id,
    metadata->>'evidenceTier' AS evidence_tier
  FROM vehicle_estimation_events
  WHERE event_type = 'estimation_completed'
    AND created_at >= NOW() - INTERVAL '30 days'
    AND metadata->>'evidenceTier' IN ('B_MODERATE_MARKET', 'C_REFERENCE_ASSISTED', 'D_HEURISTIC_ONLY')
),
publish_clicks AS (
  SELECT DISTINCT estimation_request_id
  FROM vehicle_estimation_events
  WHERE event_type = 'clicked_publish_after_estimation'
    AND created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  c.evidence_tier,
  COUNT(*) AS completed_total,
  COUNT(p.estimation_request_id) AS publish_clicked_total,
  ROUND(COUNT(p.estimation_request_id)::numeric / NULLIF(COUNT(*), 0), 4) AS publish_click_rate
FROM completion c
LEFT JOIN publish_clicks p
  ON p.estimation_request_id = c.estimation_request_id
GROUP BY c.evidence_tier
ORDER BY c.evidence_tier;`,
  },
];

