/**
 * Chargeur centralisé des configs JSON du pipeline.
 * Utilise readFileSync pour rester compatible Node ESM / tsx / vitest sans
 * dépendre des import attributes (`with { type: "json" }`).
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, "..", "config");

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(CONFIG_DIR, filename), "utf8")) as T;
}

export type PipelineConfig = {
  version: string;
  outputs: { migration_filename_prefix: string };
  coefficients: { fb_listing_to_transaction: number; comment: string };
  caps: { max_listings_per_seller: number; comment: string };
  filters: {
    min_price_ar: number;
    max_price_ar: number;
    min_year: number;
    max_year: number;
    min_km: number;
    max_km: number;
  };
  calibration: {
    min_observations_for_strong_profile: number;
    min_observations_for_weak_profile: number;
    min_year_range_for_decay_calibration: number;
    default_annual_depreciation_rate: number;
    max_cv_for_acceptance: number;
    comment_cv: string;
  };
  tier_thresholds: {
    A_strong: { min_obs: number; max_cv: number; min_year_span: number };
    B_moderate: { min_obs: number; max_cv: number; min_year_span: number };
    C_anchor_only: { comment: string };
  };
  tier_c_policy: {
    allow_fb_only: boolean;
    min_observations_fb_only: number;
    comment: string;
  };
  brand_blacklist_for_seed: {
    brands: string[];
    comment: string;
  };
  quality_filters: {
    hard_reject_cv_above: number;
    hard_reject_year_span_above: number;
    comment_cv: string;
    comment_year_span: string;
  };
  plausibility_floors: {
    comment: string;
    rules: PlausibilityFloorRule[];
  };
  dealer_neuf_year_default: "ASSUME_CURRENT_YEAR" | "REJECT";
  current_year_for_dealer_default: number;
  year_pivot_cap: number;
  decay_clip_range: [number, number];
  deduplication: { fb_price_tolerance_ratio: number; comment: string };
  new_used_split?: NewUsedSplitConfig;
  decay_calibration?: DecayCalibrationConfig;
  outlier_filter?: OutlierFilterConfig;
  conflict_strategy: "DO_UPDATE" | "DO_NOTHING";
  expected_km_per_year_default: number;
};

export type NewUsedSplitConfig = {
  enabled: boolean;
  min_obs_dealer_for_split: number;
  min_obs_fb_for_split: number;
  comment?: string;
};

export type DecayCalibrationConfig = {
  enabled: boolean;
  min_obs_for_calibration: number;
  min_year_span_for_calibration: number;
  min_r_squared: number;
  default_decay_rate: number;
  decay_clip_range: [number, number];
  comment?: string;
};

export type OutlierFilterConfig = {
  enabled: boolean;
  method: "mad_modified_zscore";
  threshold: number;
  min_observations_for_filter: number;
  max_outlier_pct: number;
  log_rejected: boolean;
  comment?: string;
};

export type BrandConfig = {
  alias_to_canonical: Record<string, string>;
  canonical_brands: string[];
};

export type ModelConfig = {
  alias_to_canonical: Record<string, Record<string, string>>;
};

export type SimpleNormalizationConfig = {
  alias_to_canonical: Record<string, string>;
  canonical_values: string[];
};

export type PlausibilityFloorRule = {
  match: {
    body_type?: string;
    baseline_year_min?: number;
    make_in?: string[];
  };
  min_price_ar: number;
  label: string;
};

export type ModelBlacklistConfig = {
  comment?: string;
  blacklist: Record<string, string[]>;
};

export type GenerationBucket = {
  from: number;
  to: number;
  label: string;
  min_obs: number;
};

export type ModelGenerationsConfig = {
  comment?: string;
  rationale?: string;
  generations: Record<string, Record<string, GenerationBucket[]>>;
};

const GENERATION_YEAR_MIN = 1985;
const GENERATION_YEAR_MAX = 2026;

/**
 * Valide la config des buckets générationnels :
 *  - chaque bucket : `from <= to`, `from >= 1985`, `to <= 2026`
 *  - pas de chevauchement d'années entre buckets d'un même modèle
 * Throw avec un message explicite si invalide.
 */
export function validateModelGenerationsConfig(config: ModelGenerationsConfig): void {
  const generations = config.generations ?? {};
  for (const [make, modelMap] of Object.entries(generations)) {
    for (const [model, buckets] of Object.entries(modelMap)) {
      if (!Array.isArray(buckets) || buckets.length === 0) {
        throw new Error(
          `[model_generations] ${make} / ${model} : aucun bucket défini`,
        );
      }
      for (const bucket of buckets) {
        if (bucket.from > bucket.to) {
          throw new Error(
            `[model_generations] ${make} / ${model} bucket "${bucket.label}" : from (${bucket.from}) > to (${bucket.to})`,
          );
        }
        if (bucket.from < GENERATION_YEAR_MIN || bucket.to > GENERATION_YEAR_MAX) {
          throw new Error(
            `[model_generations] ${make} / ${model} bucket "${bucket.label}" : années hors bornes [${GENERATION_YEAR_MIN}, ${GENERATION_YEAR_MAX}] (from=${bucket.from}, to=${bucket.to})`,
          );
        }
        if (!Number.isFinite(bucket.min_obs) || bucket.min_obs < 1) {
          throw new Error(
            `[model_generations] ${make} / ${model} bucket "${bucket.label}" : min_obs invalide (${bucket.min_obs})`,
          );
        }
      }
      // Détection chevauchement : tri par `from` puis vérif que `to` du précédent < `from` du suivant.
      const sorted = [...buckets].sort((a, b) => a.from - b.from);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        if (cur.from <= prev.to) {
          throw new Error(
            `[model_generations] ${make} / ${model} : chevauchement entre "${prev.label}" (${prev.from}-${prev.to}) et "${cur.label}" (${cur.from}-${cur.to})`,
          );
        }
      }
    }
  }
}

export const pipelineConfig = loadJson<PipelineConfig>("pipeline.config.json");
export const brandConfig = loadJson<BrandConfig>("brand_normalizations.json");
export const modelConfig = loadJson<ModelConfig>("model_normalizations.json");
export const bodyStyleConfig = loadJson<SimpleNormalizationConfig>("body_style_normalizations.json");
export const fuelConfig = loadJson<SimpleNormalizationConfig>("fuel_normalizations.json");
export const transmissionConfig = loadJson<SimpleNormalizationConfig>("transmission_normalizations.json");
export const modelBlacklistConfig = loadJson<ModelBlacklistConfig>("model_blacklist.json");
export const modelGenerationsConfig = loadJson<ModelGenerationsConfig>("model_generations.json");

// Validation au chargement : si la config est invalide, le pipeline (et les
// tests qui importent ce module) s'arrête immédiatement avec un message clair.
validateModelGenerationsConfig(modelGenerationsConfig);
