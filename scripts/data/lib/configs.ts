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
  conflict_strategy: "DO_UPDATE" | "DO_NOTHING";
  expected_km_per_year_default: number;
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

export const pipelineConfig = loadJson<PipelineConfig>("pipeline.config.json");
export const brandConfig = loadJson<BrandConfig>("brand_normalizations.json");
export const modelConfig = loadJson<ModelConfig>("model_normalizations.json");
export const bodyStyleConfig = loadJson<SimpleNormalizationConfig>("body_style_normalizations.json");
export const fuelConfig = loadJson<SimpleNormalizationConfig>("fuel_normalizations.json");
export const transmissionConfig = loadJson<SimpleNormalizationConfig>("transmission_normalizations.json");
export const modelBlacklistConfig = loadJson<ModelBlacklistConfig>("model_blacklist.json");
