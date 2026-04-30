/**
 * Validation et attribution des tiers de qualité aux profils calibrés.
 *
 * Critères :
 *   A_strong   : ≥ 5 obs, year_span ≥ 4, CV ≤ 0.30, decay ∈ [0.05, 0.15]
 *   B_moderate : ≥ 3 obs, year_span ≥ 2, CV ≤ 0.45
 *   C_anchor   : 1-2 obs avec dealer Neuf
 *   REJECTED   : 1 obs FB sans dealer, ou CV > 0.45 sur 3+ obs
 */

import type { CalibrationResult, Observation } from "./calibrate";

export type QualityTier = "A_strong" | "B_moderate" | "C_anchor" | "REJECTED";

export type TierThresholds = {
  A_strong: { min_obs: number; max_cv: number; min_year_span: number };
  B_moderate: { min_obs: number; max_cv: number; min_year_span: number };
};

export function assignTier(
  calibration: CalibrationResult,
  observations: Observation[],
  thresholds: TierThresholds,
): QualityTier {
  const sample = calibration.sample_size;
  const span = calibration.year_span;
  const cv = calibration.cv;

  if (calibration.kind === "regression") {
    const decay = calibration.annual_depreciation_rate;
    const decayPlausible = decay >= 0.05 && decay <= 0.15;
    if (
      sample >= thresholds.A_strong.min_obs &&
      span >= thresholds.A_strong.min_year_span &&
      cv <= thresholds.A_strong.max_cv &&
      decayPlausible
    ) {
      return "A_strong";
    }
  }

  if (calibration.kind === "regression" || calibration.kind === "median_anchor") {
    if (
      sample >= thresholds.B_moderate.min_obs &&
      span >= thresholds.B_moderate.min_year_span &&
      cv <= thresholds.B_moderate.max_cv
    ) {
      return "B_moderate";
    }
    // CV trop élevé sur 3+ obs => REJECTED
    if (sample >= 3 && cv > thresholds.B_moderate.max_cv) {
      return "REJECTED";
    }
  }

  if (calibration.kind === "neuf_anchor") {
    return "C_anchor";
  }

  // Fallback: si on a au moins 1 dealer Neuf parmi les observations, on accroche en C
  const hasNeuf = observations.some((o) => o.source === "dealer" && o.vehicle_status === "neuf");
  if (hasNeuf && sample <= 2) return "C_anchor";

  return "REJECTED";
}
