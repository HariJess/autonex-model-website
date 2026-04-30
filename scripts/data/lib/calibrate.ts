/**
 * Calibration log-linéaire des reference profiles.
 *
 * Pour un groupe (brand, model), on ajuste log(price) = a + b*year + ε.
 * On en déduit:
 *   annual_depreciation_rate = 1 - exp(b)
 *   baseline_price@year_pivot = exp(a + b*year_pivot)
 *
 * Le year_pivot est le max(year) observé, capé à `year_pivot_cap` pour éviter
 * d'extrapoler vers le futur.
 */

export type Observation = {
  year: number;
  price_ar: number;
  source: "fb_scrap" | "manual_structured" | "dealer";
  vehicle_status: "neuf" | "occasion";
};

export type CalibrationResult =
  | {
      kind: "regression";
      baseline_year: number;
      baseline_price_ar: number;
      annual_depreciation_rate: number;
      r_squared: number;
      cv: number;
      sample_size: number;
      year_span: number;
      decay_clipped: boolean;
    }
  | {
      kind: "median_anchor";
      baseline_year: number;
      baseline_price_ar: number;
      annual_depreciation_rate: number;
      cv: number;
      sample_size: number;
      year_span: number;
    }
  | {
      kind: "neuf_anchor";
      baseline_year: number;
      baseline_price_ar: number;
      annual_depreciation_rate: number;
      cv: number;
      sample_size: number;
      year_span: number;
    };

export type CalibrationOptions = {
  default_annual_depreciation_rate: number;
  decay_clip_min: number;
  decay_clip_max: number;
  year_pivot_cap: number;
  min_observations_for_strong: number;
  min_observations_for_weak: number;
  min_year_range_for_decay: number;
  // tier_c_policy.allow_fb_only : autorise un ancrage tier C avec ≥ N obs FB
  // sans dealer Neuf (médiane + decay défaut). Désactivé par défaut.
  allow_fb_only_anchor: boolean;
  min_observations_fb_only: number;
};

/**
 * Calibre un groupe d'observations. La logique de tier (A/B/C/REJECTED) reste
 * dans validate.ts ; ici on calcule juste les paramètres mathématiques.
 */
export function calibrateGroup(
  observations: Observation[],
  opts: CalibrationOptions,
): CalibrationResult | null {
  const obs = observations.filter((o) => Number.isFinite(o.year) && Number.isFinite(o.price_ar) && o.price_ar > 0);
  if (obs.length === 0) return null;

  const years = obs.map((o) => o.year);
  const prices = obs.map((o) => o.price_ar);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearSpan = maxYear - minYear;
  const meanPrice = prices.reduce((s, x) => s + x, 0) / prices.length;
  const variance =
    prices.length > 1
      ? prices.reduce((s, x) => s + (x - meanPrice) ** 2, 0) / (prices.length - 1)
      : 0;
  const std = Math.sqrt(variance);
  const cv = meanPrice > 0 ? std / meanPrice : 0;

  // Cas 1 : régression log-linéaire
  if (obs.length >= opts.min_observations_for_strong && yearSpan >= opts.min_year_range_for_decay) {
    const logs = obs.map((o) => Math.log(o.price_ar));
    const ys = obs.map((o) => o.year);
    const reg = linearRegression(ys, logs);
    let decay = 1 - Math.exp(reg.slope);
    let decay_clipped = false;
    if (decay < opts.decay_clip_min || decay > opts.decay_clip_max || !Number.isFinite(decay)) {
      decay = opts.default_annual_depreciation_rate;
      decay_clipped = true;
    }
    const yearPivot = Math.min(maxYear, opts.year_pivot_cap);
    const logBaseline = reg.intercept + reg.slope * yearPivot;
    let baseline = Math.round(Math.exp(logBaseline));
    if (!Number.isFinite(baseline) || baseline <= 0) {
      baseline = Math.round(median(prices));
    }
    return {
      kind: "regression",
      baseline_year: yearPivot,
      baseline_price_ar: baseline,
      annual_depreciation_rate: round4(decay),
      r_squared: reg.rSquared,
      cv: round4(cv),
      sample_size: obs.length,
      year_span: yearSpan,
      decay_clipped,
    };
  }

  // Cas 2 : observations partielles → médiane
  if (obs.length >= opts.min_observations_for_weak) {
    const yearPivot = Math.min(Math.round(median(years)), opts.year_pivot_cap);
    const baseline = Math.round(median(prices));
    return {
      kind: "median_anchor",
      baseline_year: yearPivot,
      baseline_price_ar: baseline,
      annual_depreciation_rate: round4(opts.default_annual_depreciation_rate),
      cv: round4(cv),
      sample_size: obs.length,
      year_span: yearSpan,
    };
  }

  // Cas 3 : 1-2 observations dont au moins une dealer Neuf
  const neuf = obs.filter((o) => o.source === "dealer" && o.vehicle_status === "neuf");
  if (neuf.length > 0) {
    const yearPivot = Math.min(Math.max(...neuf.map((o) => o.year)), opts.year_pivot_cap);
    const baseline = Math.round(median(neuf.map((o) => o.price_ar)));
    return {
      kind: "neuf_anchor",
      baseline_year: yearPivot,
      baseline_price_ar: baseline,
      annual_depreciation_rate: round4(opts.default_annual_depreciation_rate),
      cv: round4(cv),
      sample_size: obs.length,
      year_span: yearSpan,
    };
  }

  // Cas 4 : tier C FB-only — ≥ N obs FB, pas de dealer Neuf, baseline = médiane.
  // Activé par tier_c_policy.allow_fb_only dans pipeline.config.json.
  if (opts.allow_fb_only_anchor && obs.length >= opts.min_observations_fb_only) {
    const yearPivot = Math.min(Math.max(...years), opts.year_pivot_cap);
    const baseline = Math.round(median(prices));
    return {
      kind: "neuf_anchor",
      baseline_year: yearPivot,
      baseline_price_ar: baseline,
      annual_depreciation_rate: round4(opts.default_annual_depreciation_rate),
      cv: round4(cv),
      sample_size: obs.length,
      year_span: yearSpan,
    };
  }

  return null;
}

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = xs.length;
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = ys.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yPred = intercept + slope * xs[i];
    ssRes += (ys[i] - yPred) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 1;
  return { slope, intercept, rSquared };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
