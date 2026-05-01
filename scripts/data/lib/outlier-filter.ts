/**
 * Filtre outlier basé sur MAD (Median Absolute Deviation).
 *
 * Pourquoi MAD plutôt que écart-type :
 * Le MAD est robuste aux outliers (1 obs aberrante ne le fait pas exploser),
 * contrairement à l'écart-type. Indispensable pour le marché auto Mada où
 * 1-2 obs aberrantes par modèle sont fréquentes (typos prix, posts pros mal
 * extraits, hallucinations LLM résiduelles, conversions Fmg/Ar ratées).
 *
 * Référence : Iglewicz B., Hoaglin D. (1993). « Volume 16: How to Detect and
 * Handle Outliers », The ASQC Basic References in Quality Control. La constante
 * 0.6745 est le quantile 0.75 de la distribution normale standard : pour des
 * données gaussiennes, MAD ≈ écart-type × 0.6745.
 */

export type OutlierFilterResult<T> = {
  kept: T[];
  rejected: Array<{ row: T; modifiedZ: number; reason: string }>;
  median: number;
  mad: number;
  applied: boolean;
  reason_not_applied?: string;
};

export type OutlierFilterOptions = {
  enabled: boolean;
  threshold: number;
  minObservationsForFilter: number;
  maxOutlierPct: number;
};

/**
 * Médiane d'un tableau de nombres (sans muter l'original). NaN si vide.
 */
function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * MAD = median(|x_i - median(x)|).
 */
function computeMad(values: number[], med: number): number {
  if (values.length === 0) return 0;
  const absDeviations = values.map((v) => Math.abs(v - med));
  return median(absDeviations);
}

/**
 * Modified Z-score : 0.6745 × |x - median| / MAD.
 * Si MAD = 0 (toutes les valeurs identiques) on retourne 0 — la fonction
 * appelante doit déjà avoir court-circuité ce cas, mais on garde un fallback
 * sûr pour éviter une division par zéro.
 */
function modifiedZScore(value: number, med: number, mad: number): number {
  if (mad === 0) return 0;
  return (0.6745 * Math.abs(value - med)) / mad;
}

/**
 * Applique le filtre outlier MAD sur un ensemble d'observations.
 *
 * Comportement :
 *   - Si filtre désactivé : `applied: false`, toutes les obs gardées
 *   - Si moins de `minObservationsForFilter` obs : `applied: false`
 *     (pas assez de signal pour calculer une médiane fiable)
 *   - Si MAD = 0 (toutes les obs identiques) : `applied: false`
 *   - Si % outliers > `maxOutlierPct` : on N'APPLIQUE PAS le filtre
 *     (suspect — peut-être que la médiane elle-même est fausse, ou que
 *     les données sont bimodales et qu'il faudrait splitter en buckets
 *     plutôt que filtrer)
 *   - Sinon : on rejette toutes les obs avec modified Z-score > threshold
 *
 * @param rows Observations à filtrer (génériques)
 * @param getValue Fonction d'accès à la valeur numérique (typiquement le prix)
 * @param options Configuration du filtre
 * @returns Résultat avec obs gardées + rejetées + stats
 */
export function applyMadOutlierFilter<T>(
  rows: T[],
  getValue: (row: T) => number,
  options: OutlierFilterOptions,
): OutlierFilterResult<T> {
  if (!options.enabled) {
    return {
      kept: rows,
      rejected: [],
      median: Number.NaN,
      mad: Number.NaN,
      applied: false,
      reason_not_applied: "filter_disabled",
    };
  }

  if (rows.length < options.minObservationsForFilter) {
    return {
      kept: rows,
      rejected: [],
      median: Number.NaN,
      mad: Number.NaN,
      applied: false,
      reason_not_applied: `n=${rows.length} < min=${options.minObservationsForFilter}`,
    };
  }

  const values = rows.map(getValue).filter((v) => Number.isFinite(v));
  if (values.length === 0) {
    return {
      kept: rows,
      rejected: [],
      median: Number.NaN,
      mad: Number.NaN,
      applied: false,
      reason_not_applied: "no_finite_values",
    };
  }

  const med = median(values);
  const mad = computeMad(values, med);

  if (mad === 0) {
    return {
      kept: rows,
      rejected: [],
      median: med,
      mad: 0,
      applied: false,
      reason_not_applied: "mad_zero",
    };
  }

  // 1ère passe : identifier les outliers candidats.
  const candidates = rows.map((row) => {
    const v = getValue(row);
    const mz = Number.isFinite(v) ? modifiedZScore(v, med, mad) : 0;
    return { row, value: v, modifiedZ: mz };
  });

  const outlierCandidates = candidates.filter((c) => c.modifiedZ > options.threshold);
  const outlierPct = outlierCandidates.length / rows.length;

  // Garde-fou : trop d'outliers détectés = signal que la médiane elle-même est
  // probablement fausse (données bimodales, bucket à splitter, etc.). On n'applique
  // pas le filtre (mieux vaut laisser passer le profil et le rejeter plus tard
  // via CV_TOO_HIGH si vraiment incalibrable).
  if (outlierPct > options.maxOutlierPct) {
    return {
      kept: rows,
      rejected: [],
      median: med,
      mad,
      applied: false,
      reason_not_applied: `too_many_outliers_${(outlierPct * 100).toFixed(0)}pct_>_max_${(options.maxOutlierPct * 100).toFixed(0)}pct`,
    };
  }

  const rejected = outlierCandidates.map((c) => ({
    row: c.row,
    modifiedZ: c.modifiedZ,
    reason: `OUTLIER_MAD (value=${c.value.toLocaleString()}, median=${med.toLocaleString()}, modified_z=${c.modifiedZ.toFixed(2)} > ${options.threshold})`,
  }));

  const rejectedSet = new Set(rejected.map((r) => r.row));
  const kept = rows.filter((r) => !rejectedSet.has(r));

  return { kept, rejected, median: med, mad, applied: true };
}
