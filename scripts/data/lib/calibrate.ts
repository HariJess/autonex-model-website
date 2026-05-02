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
  source:
    | "fb_scrap"
    | "manual_structured"
    | "dealer"
    | "dealer_official"
    | "expert_curated"
    | "manual_curated";
  vehicle_status: "neuf" | "occasion";
};

/**
 * Champs additionnels exposés sur tous les variants de CalibrationResult depuis
 * la passe 7 : signalent si le decay annuel a été calibré par régression
 * log-linéaire (vs fallback default rate) et le R² associé.
 */
type DecayCalibrationFields = {
  /** True si le decay vient d'une régression log-linéaire stable (R² OK et non clippé). */
  decay_calibrated: boolean;
  /** R² de la régression decay log-linéaire ; 0 si non applicable. */
  decay_r_squared: number;
};

export type CalibrationResult =
  | ({
      kind: "regression";
      baseline_year: number;
      baseline_price_ar: number;
      annual_depreciation_rate: number;
      r_squared: number;
      cv: number;
      sample_size: number;
      year_span: number;
      decay_clipped: boolean;
    } & DecayCalibrationFields)
  | ({
      kind: "median_anchor";
      baseline_year: number;
      baseline_price_ar: number;
      annual_depreciation_rate: number;
      cv: number;
      sample_size: number;
      year_span: number;
    } & DecayCalibrationFields)
  | ({
      kind: "neuf_anchor";
      baseline_year: number;
      baseline_price_ar: number;
      annual_depreciation_rate: number;
      cv: number;
      sample_size: number;
      year_span: number;
    } & DecayCalibrationFields);

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
  // Passe 7 — calibrage du decay par régression log-linéaire. Optionnel pour
  // rétrocompat des appelants existants (ex: tests). Si absent ou désactivé,
  // on garde le comportement legacy (regression path inline + default 10 %
  // pour les autres paths).
  decay_calibration?: {
    enabled: boolean;
    minObs: number;
    minYearSpan: number;
    minRSquared: number;
  };
};

export type DecayCalibrationOptions = {
  minObs: number;
  minYearSpan: number;
  defaultDecay: number;
  clipRange: [number, number];
  /** Seuil minimal de R² pour considérer la régression fiable. */
  minRSquared: number;
};

export type DecayCalibrationOutput = {
  decay: number;
  r_squared: number;
  calibrated: boolean;
};

/**
 * Régression log-linéaire pour calibrer le decay annuel.
 *
 * Modèle : log(price) = a + b × year
 *   donc price(year) = exp(a) × exp(b)^year
 *   et decay = 1 - exp(b) (proportion perdue par année qui passe)
 *
 * Garde-fous :
 *   - n_obs >= minObs et year_span >= minYearSpan
 *   - decay clippé dans `clipRange` ; si on a clippé, on retombe sur le default
 *     (la régression était trop instable / aberrante)
 *   - R² >= minRSquared sinon on retombe sur le default
 *
 * Retour :
 *   - `decay` : taux annuel à utiliser (calibré ou default)
 *   - `r_squared` : qualité de l'ajustement (toujours retourné, même si non
 *     calibrated, pour audit)
 *   - `calibrated` : true si la régression a été retenue, false si on a fallback
 */
export function calibrateDecayLogLinear(
  observations: { year: number; price_ar: number }[],
  options: DecayCalibrationOptions,
): DecayCalibrationOutput {
  const valid = observations.filter(
    (o) => Number.isFinite(o.year) && Number.isFinite(o.price_ar) && o.price_ar > 0,
  );
  if (valid.length < options.minObs) {
    return { decay: options.defaultDecay, r_squared: 0, calibrated: false };
  }
  const years = valid.map((v) => v.year);
  const yearSpan = Math.max(...years) - Math.min(...years);
  if (yearSpan < options.minYearSpan) {
    return { decay: options.defaultDecay, r_squared: 0, calibrated: false };
  }

  const xs = years;
  const ys = valid.map((v) => Math.log(v.price_ar));
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0) {
    return { decay: options.defaultDecay, r_squared: 0, calibrated: false };
  }

  const slope = num / denX;
  // Convention : log(price) = a + slope*year. Pour des voitures, slope > 0
  // (voiture plus récente = prix plus élevé). Le decay annuel est la
  // proportion de valeur perdue quand on prend une voiture d'un an plus
  // ancienne, soit `1 - price(year-1)/price(year) = 1 - exp(-slope)`.
  const decayRaw = 1 - Math.exp(-slope);
  const r_squared = denY === 0 ? 0 : (num * num) / (denX * denY);

  const [clipMin, clipMax] = options.clipRange;
  const clamped = Math.max(clipMin, Math.min(clipMax, decayRaw));
  const wasClipped = !Number.isFinite(decayRaw) || clamped !== decayRaw;
  const passesRSquared = r_squared >= options.minRSquared;
  const calibrated = !wasClipped && passesRSquared;

  return {
    decay: calibrated ? clamped : options.defaultDecay,
    r_squared: round4(r_squared),
    calibrated,
  };
}

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

  // Passe 7 — tentative de calibrer le decay par régression log-linéaire
  // robuste, indépendamment du chemin de calibration choisi (regression /
  // median / neuf). Si le résultat est calibré (R² ok et pas clippé), on
  // l'utilise comme `annual_depreciation_rate` même quand on prend un chemin
  // « median anchor » qui historiquement utilisait le default 10 %.
  const decayCalib =
    opts.decay_calibration?.enabled
      ? calibrateDecayLogLinear(
          obs.map((o) => ({ year: o.year, price_ar: o.price_ar })),
          {
            minObs: opts.decay_calibration.minObs,
            minYearSpan: opts.decay_calibration.minYearSpan,
            defaultDecay: opts.default_annual_depreciation_rate,
            clipRange: [opts.decay_clip_min, opts.decay_clip_max],
            minRSquared: opts.decay_calibration.minRSquared,
          },
        )
      : { decay: opts.default_annual_depreciation_rate, r_squared: 0, calibrated: false };

  // Cas 1 : régression log-linéaire
  if (obs.length >= opts.min_observations_for_strong && yearSpan >= opts.min_year_range_for_decay) {
    const logs = obs.map((o) => Math.log(o.price_ar));
    const ys = obs.map((o) => o.year);
    const reg = linearRegression(ys, logs);
    // Même convention que `calibrateDecayLogLinear` : decay = 1 - exp(-slope).
    // Avec slope positif (cas normal d'une voiture qui se déprécie avec l'âge),
    // on obtient un decay positif borné par le clip [0.04, 0.20].
    let decay = 1 - Math.exp(-reg.slope);
    let decay_clipped = false;
    if (decay < opts.decay_clip_min || decay > opts.decay_clip_max || !Number.isFinite(decay)) {
      decay = opts.default_annual_depreciation_rate;
      decay_clipped = true;
    }
    // Si la passe 7 a calibré un decay (R² ≥ seuil et non clippé), on la
    // priorise — elle est plus stable car elle a un seuil R² explicite.
    if (decayCalib.calibrated) {
      decay = decayCalib.decay;
      decay_clipped = false;
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
      r_squared: round4(reg.rSquared),
      cv: round4(cv),
      sample_size: obs.length,
      year_span: yearSpan,
      decay_clipped,
      // Regressed decay used (not default fallback). Le R² brut reste exposé
      // via `decay_r_squared` pour permettre un audit de la confiance.
      decay_calibrated: !decay_clipped,
      decay_r_squared: round4(reg.rSquared),
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
      annual_depreciation_rate: round4(decayCalib.calibrated ? decayCalib.decay : opts.default_annual_depreciation_rate),
      cv: round4(cv),
      sample_size: obs.length,
      year_span: yearSpan,
      decay_calibrated: decayCalib.calibrated,
      decay_r_squared: decayCalib.r_squared,
    };
  }

  // Cas 3 : 1-2 observations dont au moins une dealer Neuf
  // Sprint 8 — `dealer_official` (corpus _compiled.csv) compte aussi comme ancrage Neuf.
  const neuf = obs.filter(
    (o) =>
      (o.source === "dealer" || o.source === "dealer_official") &&
      o.vehicle_status === "neuf",
  );
  if (neuf.length > 0) {
    const yearPivot = Math.min(Math.max(...neuf.map((o) => o.year)), opts.year_pivot_cap);
    const baseline = Math.round(median(neuf.map((o) => o.price_ar)));
    return {
      kind: "neuf_anchor",
      baseline_year: yearPivot,
      baseline_price_ar: baseline,
      annual_depreciation_rate: round4(decayCalib.calibrated ? decayCalib.decay : opts.default_annual_depreciation_rate),
      cv: round4(cv),
      sample_size: obs.length,
      year_span: yearSpan,
      decay_calibrated: decayCalib.calibrated,
      decay_r_squared: decayCalib.r_squared,
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
      annual_depreciation_rate: round4(decayCalib.calibrated ? decayCalib.decay : opts.default_annual_depreciation_rate),
      cv: round4(cv),
      sample_size: obs.length,
      year_span: yearSpan,
      decay_calibrated: decayCalib.calibrated,
      decay_r_squared: decayCalib.r_squared,
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
