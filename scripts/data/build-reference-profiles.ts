/**
 * Pipeline d'ingestion reference profiles AutoNex (vague 1).
 *
 * Lance:
 *   npx tsx scripts/data/build-reference-profiles.ts
 *
 * Entrées attendues dans `scripts/data/inputs/`:
 *   - fb_extractions_v1.csv
 *   - occasions_structured_v1.csv
 *   - dealers_v1.csv
 *
 * Sorties:
 *   - supabase/migrations/<TS>_extend_reference_profiles_metadata.sql (si nécessaire)
 *   - supabase/migrations/<TS>_seed_reference_profiles_v1.sql
 *   - scripts/data/output/INGESTION_REPORT.md
 *   - scripts/data/output/normalized_dataset.csv
 *   - scripts/data/output/calibrated_profiles.csv
 *   - scripts/data/output/rejected_rows.csv
 *   - scripts/data/output/unknown_terms.csv
 *   - scripts/data/output/unfinishable_profiles.csv
 *
 * Pipeline:
 *   1. lecture des 3 CSV → RawObservation[]
 *   2. normalisation marque/modèle/body/fuel/transmission
 *   3. filtrage qualité (R1..R8) avec log
 *   4. coefficient FB (-12% par défaut) + cap par vendeur (5) + dédoublonnage
 *   5. groupement par (marque, modèle) → calibration log-linéaire
 *   6. validation tier (A/B/C/REJECTED)
 *   7. génération migrations SQL (auxiliaire metadata + seed)
 *   8. rapport markdown
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseCsv,
  parsePriceToAriary,
  parseYear,
  parseKm,
  parseObservedAt,
} from "./lib/parse";
import {
  normalizeBrand,
  normalizeModel,
  normalizeBodyStyle,
  normalizeFuel,
  normalizeTransmission,
  modeOf,
} from "./lib/normalize";
import { calibrateGroup, type Observation } from "./lib/calibrate";
import { assignTier, type QualityTier } from "./lib/validate";
import {
  generateMetadataMigrationSql,
  generateSeedMigrationSql,
  formatMigrationTimestamp,
  type ProfileRow,
} from "./lib/generate-sql";

import { pipelineConfig, brandConfig, modelBlacklistConfig, type PlausibilityFloorRule } from "./lib/configs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const INPUTS_DIR = resolve(__dirname, "inputs");
const OUTPUT_DIR = resolve(__dirname, "output");
const MIGRATIONS_DIR = resolve(ROOT, "supabase", "migrations");

type Source = "fb_scrap" | "manual_structured" | "dealer";

type RawObservation = {
  source: Source;
  source_detail: string;
  vehicle_status: "neuf" | "occasion";
  brand_raw: string;
  model_raw: string | null;
  version: string | null;
  year: number | null;
  km: number | null;
  price_ar_raw: number | null;
  currency_detected: "AR" | "FMG" | "AR_DEFAULT";
  fuel_raw: string | null;
  transmission_raw: string | null;
  body_style_raw: string | null;
  city: string | null;
  condition: string | null;
  seller_name: string | null;
  source_url: string | null;
  observed_at: string | null;
  raw_text: string | null;
};

type NormalizedRow = RawObservation & {
  brand_canonical: string | null;
  model_canonical: string | null;
  body_canonical: string | null;
  fuel_canonical: string | null;
  transmission_canonical: string | null;
  price_ar_corrected: number | null;
};

type RejectedRow = NormalizedRow & {
  rejection_code: string;
  rejection_reason: string;
};

type UnknownTerm = {
  kind: "brand" | "model";
  brand_context: string | null;
  raw_value: string;
  source: Source;
  count: number;
};

type CalibratedProfile = ProfileRow & {
  tier: QualityTier;
  cv: number;
  year_span: number;
};

const VEHICLE_BUYER_PATTERNS = /\b(mitady|recherche|wanted|cherche|i'm looking|looking for)\b/i;

function readInputs(): RawObservation[] {
  const out: RawObservation[] = [];
  out.push(...readFb(resolve(INPUTS_DIR, "fb_extractions_v1.csv")));
  out.push(...readOccasions(resolve(INPUTS_DIR, "occasions_structured_v1.csv")));
  out.push(...readDealers(resolve(INPUTS_DIR, "dealers_v1.csv")));
  return out;
}

function readFb(path: string): RawObservation[] {
  if (!existsSync(path)) {
    console.warn(`[fb] fichier absent: ${path}`);
    return [];
  }
  const rows = parseCsv(readFileSync(path, "utf8"));
  console.log(`[fb] lignes lues: ${rows.length}`);
  return rows.map((r) => {
    const { price_ar, currency_detected } = parsePriceToAriary(r.price_ar, r.currency_detected);
    return {
      source: "fb_scrap" as const,
      source_detail: r.source_detail || "fb_scrap",
      vehicle_status: "occasion" as const,
      brand_raw: (r.brand_raw || "").trim(),
      model_raw: (r.model_raw || "").trim() || null,
      version: null,
      year: parseYear(r.year),
      km: parseKm(r.km),
      price_ar_raw: price_ar,
      currency_detected,
      fuel_raw: null,
      transmission_raw: null,
      body_style_raw: null,
      city: null,
      condition: null,
      seller_name: (r.seller_name || "").trim() || null,
      source_url: r.source_url || null,
      observed_at: parseObservedAt(r.observed_at),
      raw_text: r.raw_text || null,
    };
  });
}

function readOccasions(path: string): RawObservation[] {
  if (!existsSync(path)) {
    console.warn(`[occasions] fichier absent: ${path}`);
    return [];
  }
  const rows = parseCsv(readFileSync(path, "utf8"));
  console.log(`[occasions] lignes lues: ${rows.length}`);
  return rows.map((r) => {
    const { price_ar, currency_detected } = parsePriceToAriary(r.price_ar, r.currency_detected);
    return {
      source: "manual_structured" as const,
      source_detail: r.source_detail || "manual_structured",
      vehicle_status: "occasion" as const,
      brand_raw: (r.brand_raw || "").trim(),
      model_raw: (r.model_raw || "").trim() || null,
      version: r.version || null,
      year: parseYear(r.year),
      km: parseKm(r.km),
      price_ar_raw: price_ar,
      currency_detected,
      fuel_raw: r.fuel || null,
      transmission_raw: r.transmission || null,
      body_style_raw: r.body_style || null,
      city: r.city || null,
      condition: r.condition || null,
      seller_name: null,
      source_url: r.source_url || null,
      observed_at: null,
      raw_text: null,
    };
  });
}

function readDealers(path: string): RawObservation[] {
  if (!existsSync(path)) {
    console.warn(`[dealers] fichier absent: ${path}`);
    return [];
  }
  const rows = parseCsv(readFileSync(path, "utf8"));
  console.log(`[dealers] lignes lues: ${rows.length}`);
  return rows.map((r) => {
    const { price_ar, currency_detected } = parsePriceToAriary(r.price_ar, r.currency_detected);
    const status = (r.vehicle_status || "neuf").toLowerCase() === "occasion" ? "occasion" : "neuf";
    return {
      source: "dealer" as const,
      source_detail: r.source_detail || "dealer",
      vehicle_status: status,
      brand_raw: (r.brand_raw || "").trim(),
      model_raw: (r.model_raw || "").trim() || null,
      version: r.version || null,
      year: parseYear(r.year),
      km: parseKm(r.km),
      price_ar_raw: price_ar,
      currency_detected,
      fuel_raw: r.fuel || null,
      transmission_raw: r.transmission || null,
      body_style_raw: r.body_style || null,
      city: r.city || null,
      condition: r.condition || null,
      seller_name: r.seller_name || null,
      source_url: null,
      observed_at: null,
      raw_text: null,
    };
  });
}

function applyDealerNeufYearDefault(rows: RawObservation[]): RawObservation[] {
  if (pipelineConfig.dealer_neuf_year_default !== "ASSUME_CURRENT_YEAR") return rows;
  const currentYear = pipelineConfig.current_year_for_dealer_default;
  return rows.map((r) => {
    if (r.source === "dealer" && r.vehicle_status === "neuf" && r.year === null) {
      return { ...r, year: currentYear };
    }
    return r;
  });
}

function normalizeRows(
  rows: RawObservation[],
  unknownTerms: Map<string, UnknownTerm>,
): NormalizedRow[] {
  return rows.map((r) => {
    const brand = normalizeBrand(r.brand_raw);
    if (brand.unknown && r.brand_raw) {
      const key = `brand|${r.brand_raw.toLowerCase()}|${r.source}`;
      const prev = unknownTerms.get(key);
      unknownTerms.set(key, {
        kind: "brand",
        brand_context: null,
        raw_value: r.brand_raw,
        source: r.source,
        count: (prev?.count ?? 0) + 1,
      });
    }
    const model = normalizeModel(brand.value, r.model_raw);
    if (model.unknown && r.model_raw && brand.value) {
      const key = `model|${brand.value}|${r.model_raw.toLowerCase()}|${r.source}`;
      const prev = unknownTerms.get(key);
      unknownTerms.set(key, {
        kind: "model",
        brand_context: brand.value,
        raw_value: r.model_raw,
        source: r.source,
        count: (prev?.count ?? 0) + 1,
      });
    }
    const body = normalizeBodyStyle(r.body_style_raw);
    const fuel = normalizeFuel(r.fuel_raw);
    const trans = normalizeTransmission(r.transmission_raw);

    let priceCorrected: number | null = r.price_ar_raw;
    if (r.source === "fb_scrap" && r.price_ar_raw !== null) {
      priceCorrected = Math.round(r.price_ar_raw * (1 + pipelineConfig.coefficients.fb_listing_to_transaction));
    }

    return {
      ...r,
      brand_canonical: brand.value,
      model_canonical: model.value,
      body_canonical: body.value,
      fuel_canonical: fuel.value,
      transmission_canonical: trans.value,
      price_ar_corrected: priceCorrected,
    };
  });
}

function applyFilters(
  rows: NormalizedRow[],
): { kept: NormalizedRow[]; rejected: RejectedRow[] } {
  const kept: NormalizedRow[] = [];
  const rejected: RejectedRow[] = [];
  const filters = pipelineConfig.filters;

  for (const r of rows) {
    // R1: brand non-mappable
    if (!r.brand_canonical) {
      rejected.push({ ...r, rejection_code: "R1", rejection_reason: "brand non mappable" });
      continue;
    }
    // R-DROP: modèle parasite explicitement marqué "DROP" dans model_normalizations.json.
    // model_canonical == null après alias matching (ex: "Pride Bonn" → DROP) alors que model_raw était présent.
    if (r.model_canonical === null && r.model_raw && r.model_raw.trim() !== "") {
      rejected.push({ ...r, rejection_code: "R-DROP", rejection_reason: "modèle marqué DROP dans model_normalizations" });
      continue;
    }
    // R6: acheteur FB
    if (r.source === "fb_scrap" && r.raw_text) {
      const head = r.raw_text.slice(0, 200);
      if (VEHICLE_BUYER_PATTERNS.test(head)) {
        rejected.push({ ...r, rejection_code: "R6", rejection_reason: "FB acheteur (mitady/recherche)" });
        continue;
      }
    }
    // R2: prix hors bornes
    if (r.price_ar_corrected === null) {
      rejected.push({ ...r, rejection_code: "R2", rejection_reason: "prix manquant ou non parsable" });
      continue;
    }
    if (r.price_ar_corrected < filters.min_price_ar || r.price_ar_corrected > filters.max_price_ar) {
      rejected.push({
        ...r,
        rejection_code: "R2",
        rejection_reason: `prix hors bornes: ${r.price_ar_corrected} Ar`,
      });
      continue;
    }
    // R5: FB + currency AR_DEFAULT + prix > 200M (suspicion mauvaise détection devise)
    if (
      r.source === "fb_scrap" &&
      r.currency_detected === "AR_DEFAULT" &&
      r.price_ar_corrected > 200_000_000
    ) {
      rejected.push({
        ...r,
        rejection_code: "R5",
        rejection_reason: "FB devise non confirmée et prix > 200M (probable confusion FMG/Ar)",
      });
      continue;
    }
    // R3: année hors bornes
    if (r.year !== null && (r.year < filters.min_year || r.year > filters.max_year)) {
      rejected.push({ ...r, rejection_code: "R3", rejection_reason: `année hors bornes: ${r.year}` });
      continue;
    }
    // R4: km hors bornes
    if (r.km !== null && (r.km < filters.min_km || r.km > filters.max_km)) {
      rejected.push({ ...r, rejection_code: "R4", rejection_reason: `km hors bornes: ${r.km}` });
      continue;
    }
    // R7: dealer Neuf sans année (après application du défaut, donc seulement si REJECT)
    if (
      r.source === "dealer" &&
      r.vehicle_status === "neuf" &&
      r.year === null &&
      pipelineConfig.dealer_neuf_year_default === "REJECT"
    ) {
      rejected.push({ ...r, rejection_code: "R7", rejection_reason: "dealer Neuf sans année (REJECT)" });
      continue;
    }
    // Pour la calibration on a besoin d'une année dans tous les cas.
    if (r.year === null) {
      rejected.push({
        ...r,
        rejection_code: "R7",
        rejection_reason: "année manquante après normalisation",
      });
      continue;
    }
    kept.push(r);
  }
  return { kept, rejected };
}

function applySellerCap(
  rows: NormalizedRow[],
): { kept: NormalizedRow[]; capped: RejectedRow[]; topCappedSellers: { seller: string; dropped: number }[] } {
  const fb = rows.filter((r) => r.source === "fb_scrap");
  const others = rows.filter((r) => r.source !== "fb_scrap");

  const bySeller = new Map<string, NormalizedRow[]>();
  for (const r of fb) {
    const key = r.seller_name?.trim() || "__UNKNOWN_SELLER__";
    if (!bySeller.has(key)) bySeller.set(key, []);
    bySeller.get(key)!.push(r);
  }

  const cap = pipelineConfig.caps.max_listings_per_seller;
  const kept: NormalizedRow[] = [...others];
  const capped: RejectedRow[] = [];
  const topCappedSellers: { seller: string; dropped: number }[] = [];

  for (const [seller, list] of bySeller.entries()) {
    if (seller === "__UNKNOWN_SELLER__") {
      // pas de cap si seller inconnu
      kept.push(...list);
      continue;
    }
    if (list.length <= cap) {
      kept.push(...list);
      continue;
    }
    // Tri stable par observed_at desc, puis par prix desc pour idempotence sans dates
    const sorted = [...list].sort((a, b) => {
      const aT = a.observed_at ? Date.parse(a.observed_at) : 0;
      const bT = b.observed_at ? Date.parse(b.observed_at) : 0;
      if (bT !== aT) return bT - aT;
      return (b.price_ar_corrected ?? 0) - (a.price_ar_corrected ?? 0);
    });
    kept.push(...sorted.slice(0, cap));
    const dropped = sorted.slice(cap);
    for (const d of dropped) {
      capped.push({
        ...d,
        rejection_code: "CAP",
        rejection_reason: `seller cap (${cap}/seller) — ${seller}`,
      });
    }
    topCappedSellers.push({ seller, dropped: dropped.length });
  }

  topCappedSellers.sort((a, b) => b.dropped - a.dropped);
  return { kept, capped, topCappedSellers };
}

function dedupFb(rows: NormalizedRow[]): { kept: NormalizedRow[]; dups: RejectedRow[] } {
  const fb = rows.filter((r) => r.source === "fb_scrap");
  const others = rows.filter((r) => r.source !== "fb_scrap");
  const tol = pipelineConfig.deduplication.fb_price_tolerance_ratio;

  type Bucket = { canonical: string; rows: NormalizedRow[] };
  const buckets = new Map<string, Bucket>();
  for (const r of fb) {
    const seller = (r.seller_name || "").toLowerCase().trim();
    const brand = (r.brand_canonical || "").toLowerCase();
    const model = (r.model_canonical || "").toLowerCase();
    const year = r.year ?? "?";
    const key = `${seller}|${brand}|${model}|${year}`;
    if (!buckets.has(key)) buckets.set(key, { canonical: key, rows: [] });
    buckets.get(key)!.rows.push(r);
  }

  const kept: NormalizedRow[] = [...others];
  const dups: RejectedRow[] = [];
  for (const b of buckets.values()) {
    if (b.rows.length === 1) {
      kept.push(b.rows[0]);
      continue;
    }
    // tri par observed_at desc puis prix desc
    const sorted = [...b.rows].sort((a, c) => {
      const aT = a.observed_at ? Date.parse(a.observed_at) : 0;
      const cT = c.observed_at ? Date.parse(c.observed_at) : 0;
      if (cT !== aT) return cT - aT;
      return (c.price_ar_corrected ?? 0) - (a.price_ar_corrected ?? 0);
    });
    const survivors: NormalizedRow[] = [];
    for (const candidate of sorted) {
      const isDup = survivors.some((s) => {
        if (s.price_ar_corrected === null || candidate.price_ar_corrected === null) return false;
        const ratio = Math.abs(s.price_ar_corrected - candidate.price_ar_corrected) / s.price_ar_corrected;
        return ratio <= tol;
      });
      if (isDup) {
        dups.push({ ...candidate, rejection_code: "R8", rejection_reason: "doublon FB (seller+model+year+prix~5%)" });
      } else {
        survivors.push(candidate);
      }
    }
    kept.push(...survivors);
  }
  return { kept, dups };
}

type QualityRejection = {
  brand: string;
  model: string;
  baseline_price_ar: number | null;
  sample: number;
  cv: number | null;
  year_span: number | null;
  reason_code: "CV_TOO_HIGH" | "YEAR_SPAN_TOO_WIDE" | "PRICE_BELOW_FLOOR" | "MODEL_BLACKLISTED";
  reason_detail: string;
};

function buildProfiles(
  rows: NormalizedRow[],
): {
  profiles: CalibratedProfile[];
  unfinishable: { brand: string; model: string; reason: string; sample: number }[];
  qualityRejected: QualityRejection[];
} {
  // Groupement par (brand, model)
  const groups = new Map<string, NormalizedRow[]>();
  for (const r of rows) {
    if (!r.brand_canonical || !r.model_canonical) continue;
    const key = `${r.brand_canonical}|${r.model_canonical}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const profiles: CalibratedProfile[] = [];
  const unfinishable: { brand: string; model: string; reason: string; sample: number }[] = [];
  const qualityRejected: QualityRejection[] = [];

  const calibOpts = {
    default_annual_depreciation_rate: pipelineConfig.calibration.default_annual_depreciation_rate,
    decay_clip_min: pipelineConfig.decay_clip_range[0],
    decay_clip_max: pipelineConfig.decay_clip_range[1],
    year_pivot_cap: pipelineConfig.year_pivot_cap,
    min_observations_for_strong: pipelineConfig.calibration.min_observations_for_strong_profile,
    min_observations_for_weak: pipelineConfig.calibration.min_observations_for_weak_profile,
    min_year_range_for_decay: pipelineConfig.calibration.min_year_range_for_decay_calibration,
    // tier_c_policy.allow_fb_only : ancrage tier C sans dealer Neuf (médiane FB).
    allow_fb_only_anchor: pipelineConfig.tier_c_policy?.allow_fb_only ?? false,
    min_observations_fb_only: pipelineConfig.tier_c_policy?.min_observations_fb_only ?? 2,
  };

  const tierThresholds = {
    A_strong: pipelineConfig.tier_thresholds.A_strong,
    B_moderate: pipelineConfig.tier_thresholds.B_moderate,
  };

  for (const [key, list] of groups.entries()) {
    const [brand, model] = key.split("|");
    const obs: Observation[] = list
      .filter((r) => r.year !== null && r.price_ar_corrected !== null)
      .map((r) => ({
        year: r.year as number,
        price_ar: r.price_ar_corrected as number,
        source: r.source,
        vehicle_status: r.vehicle_status,
      }));
    const calib = calibrateGroup(obs, calibOpts);
    if (!calib) {
      unfinishable.push({
        brand,
        model,
        reason: "calibration impossible (obs < seuil ou aucun ancrage)",
        sample: obs.length,
      });
      continue;
    }
    // Hard quality filters (passe 3) — appliqués APRÈS calibration mais AVANT
    // tier_c_policy : un profil avec CV ou span aberrants ne doit pas être rescué.
    const qf = pipelineConfig.quality_filters;
    if (qf && calib.cv > qf.hard_reject_cv_above) {
      qualityRejected.push({
        brand,
        model,
        baseline_price_ar: calib.baseline_price_ar,
        sample: calib.sample_size,
        cv: calib.cv,
        year_span: calib.year_span,
        reason_code: "CV_TOO_HIGH",
        reason_detail: `cv=${calib.cv} > seuil ${qf.hard_reject_cv_above}`,
      });
      continue;
    }
    if (qf && calib.year_span > qf.hard_reject_year_span_above) {
      qualityRejected.push({
        brand,
        model,
        baseline_price_ar: calib.baseline_price_ar,
        sample: calib.sample_size,
        cv: calib.cv,
        year_span: calib.year_span,
        reason_code: "YEAR_SPAN_TOO_WIDE",
        reason_detail: `span=${calib.year_span} > seuil ${qf.hard_reject_year_span_above}`,
      });
      continue;
    }
    const initialTier = assignTier(calib, obs, tierThresholds);
    let tier = initialTier;
    let calibPrice = calib.baseline_price_ar;
    let calibYear = calib.baseline_year;
    let calibDecay = calib.annual_depreciation_rate;
    if (tier === "REJECTED") {
      // tier_c_policy.allow_fb_only : si la calibration succès mais a été rejetée
      // pour CV trop haut, on dégrade en tier C avec baseline = médiane et decay défaut.
      const policy = pipelineConfig.tier_c_policy;
      if (policy?.allow_fb_only && calib.sample_size >= policy.min_observations_fb_only) {
        const prices = obs.map((o) => o.price_ar).sort((a, b) => a - b);
        const yearsArr = obs.map((o) => o.year).sort((a, b) => a - b);
        const med = (arr: number[]) =>
          arr.length % 2 === 0 ? (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2 : arr[Math.floor(arr.length / 2)];
        calibPrice = Math.round(med(prices));
        calibYear = Math.min(Math.round(med(yearsArr)), pipelineConfig.year_pivot_cap);
        calibDecay = pipelineConfig.calibration.default_annual_depreciation_rate;
        tier = "C_anchor";
      } else {
        unfinishable.push({
          brand,
          model,
          reason: `tier REJECTED (sample=${calib.sample_size}, span=${calib.year_span}, cv=${calib.cv})`,
          sample: calib.sample_size,
        });
        continue;
      }
    }

    // Body / fuel / transmission par majorité
    const bodyMode = modeOf(list.map((r) => r.body_canonical));
    const fuelMode = modeOf(list.map((r) => r.fuel_canonical));
    const transMode = modeOf(list.map((r) => r.transmission_canonical));

    profiles.push({
      make_name: brand,
      model_name: model,
      body_type: bodyMode.mode ?? "other",
      fuel_type: fuelMode.mode,
      transmission_type: transMode.mode,
      baseline_year: calibYear,
      baseline_price_mga: calibPrice,
      annual_depreciation_rate: calibDecay,
      expected_km_per_year: pipelineConfig.expected_km_per_year_default,
      data_quality_tier: tier === "REJECTED" ? "C_anchor" : tier,
      sample_size: calib.sample_size,
      source_versions: [pipelineConfig.version],
      tier,
      cv: calib.cv,
      year_span: calib.year_span,
    });
  }

  // Tri stable
  profiles.sort((a, b) => a.make_name.localeCompare(b.make_name) || a.model_name.localeCompare(b.model_name));
  return { profiles, unfinishable, qualityRejected };
}

/**
 * Cherche la première règle de plausibility_floors qui matche un profil.
 * Retourne null si aucune règle ne matche.
 */
function findPlausibilityFloor(
  profile: CalibratedProfile,
  rules: PlausibilityFloorRule[],
): PlausibilityFloorRule | null {
  for (const rule of rules) {
    let ok = true;
    if (rule.match.body_type !== undefined && profile.body_type !== rule.match.body_type) ok = false;
    if (rule.match.baseline_year_min !== undefined && profile.baseline_year < rule.match.baseline_year_min) ok = false;
    if (rule.match.make_in !== undefined && !rule.match.make_in.includes(profile.make_name)) ok = false;
    if (ok) return rule;
  }
  return null;
}

function csvLine(fields: (string | number | null | undefined)[]): string {
  return fields
    .map((f) => {
      if (f === null || f === undefined) return "";
      const s = String(f);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(",");
}

function writeCsv(path: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const lines = [csvLine(headers), ...rows.map(csvLine)];
  writeFileSync(path, lines.join("\n") + "\n", "utf8");
}

function writeNormalizedDataset(rows: NormalizedRow[]): void {
  const headers = [
    "source",
    "source_detail",
    "vehicle_status",
    "brand_canonical",
    "model_canonical",
    "year",
    "km",
    "price_ar_raw",
    "price_ar_corrected",
    "currency_detected",
    "body_canonical",
    "fuel_canonical",
    "transmission_canonical",
    "seller_name",
    "observed_at",
  ];
  const data = rows.map((r) => [
    r.source,
    r.source_detail,
    r.vehicle_status,
    r.brand_canonical,
    r.model_canonical,
    r.year,
    r.km,
    r.price_ar_raw,
    r.price_ar_corrected,
    r.currency_detected,
    r.body_canonical,
    r.fuel_canonical,
    r.transmission_canonical,
    r.seller_name,
    r.observed_at,
  ]);
  writeCsv(resolve(OUTPUT_DIR, "normalized_dataset.csv"), headers, data);
}

function writeCalibratedProfiles(profiles: CalibratedProfile[]): void {
  const headers = [
    "make_name",
    "model_name",
    "body_type",
    "fuel_type",
    "transmission_type",
    "baseline_year",
    "baseline_price_mga",
    "annual_depreciation_rate",
    "tier",
    "sample_size",
    "year_span",
    "cv",
  ];
  const data = profiles.map((p) => [
    p.make_name,
    p.model_name,
    p.body_type,
    p.fuel_type,
    p.transmission_type,
    p.baseline_year,
    p.baseline_price_mga,
    p.annual_depreciation_rate,
    p.tier,
    p.sample_size,
    p.year_span,
    p.cv,
  ]);
  writeCsv(resolve(OUTPUT_DIR, "calibrated_profiles.csv"), headers, data);
}

function writeRejectedRows(rejected: RejectedRow[]): void {
  const headers = [
    "source",
    "source_detail",
    "brand_raw",
    "model_raw",
    "year",
    "price_ar_raw",
    "price_ar_corrected",
    "currency_detected",
    "seller_name",
    "rejection_code",
    "rejection_reason",
  ];
  const data = rejected.map((r) => [
    r.source,
    r.source_detail,
    r.brand_raw,
    r.model_raw,
    r.year,
    r.price_ar_raw,
    r.price_ar_corrected,
    r.currency_detected,
    r.seller_name,
    r.rejection_code,
    r.rejection_reason,
  ]);
  writeCsv(resolve(OUTPUT_DIR, "rejected_rows.csv"), headers, data);
}

function writeUnknownTerms(terms: Map<string, UnknownTerm>): void {
  const list = [...terms.values()].sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      (a.brand_context ?? "").localeCompare(b.brand_context ?? "") ||
      a.raw_value.localeCompare(b.raw_value),
  );
  const headers = ["kind", "brand_context", "raw_value", "source", "count"];
  const data = list.map((t) => [t.kind, t.brand_context ?? "", t.raw_value, t.source, t.count]);
  writeCsv(resolve(OUTPUT_DIR, "unknown_terms.csv"), headers, data);
}

function writeUnfinishable(
  unfinishable: { brand: string; model: string; reason: string; sample: number }[],
  qualityRejected: QualityRejection[],
): void {
  const headers = ["brand", "model", "rejection_code", "reason", "sample", "baseline_price_ar", "cv", "year_span"];
  const allRows: (string | number | null | undefined)[][] = [];
  for (const u of unfinishable) {
    allRows.push([u.brand, u.model, "INSUFFICIENT_DATA", u.reason, u.sample, "", "", ""]);
  }
  for (const q of qualityRejected) {
    allRows.push([q.brand, q.model, q.reason_code, q.reason_detail, q.sample, q.baseline_price_ar ?? "", q.cv ?? "", q.year_span ?? ""]);
  }
  allRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));
  writeCsv(resolve(OUTPUT_DIR, "unfinishable_profiles.csv"), headers, allRows);
}

function findExistingMigration(suffix: string): string | null {
  if (!existsSync(MIGRATIONS_DIR)) return null;
  const files = readdirSync(MIGRATIONS_DIR);
  const match = files.find((f) => f.endsWith(`_${suffix}.sql`));
  return match ?? null;
}

function writeMigrations(
  metadataSql: string,
  seedSql: string,
  now: Date,
): { metadataPath: string; seedPath: string; metadataExisting: boolean; seedExisting: boolean } {
  const ts = formatMigrationTimestamp(now);
  const metaSuffix = "extend_reference_profiles_metadata";
  const seedSuffix = `${pipelineConfig.outputs.migration_filename_prefix}`;

  const existingMeta = findExistingMigration(metaSuffix);
  const existingSeed = findExistingMigration(seedSuffix);

  const metadataPath = existingMeta
    ? resolve(MIGRATIONS_DIR, existingMeta)
    : resolve(MIGRATIONS_DIR, `${ts}_${metaSuffix}.sql`);
  const seedTs = existingSeed ? existingSeed.split("_")[0] : (Number.parseInt(ts, 10) + 1).toString();
  const seedPath = existingSeed
    ? resolve(MIGRATIONS_DIR, existingSeed)
    : resolve(MIGRATIONS_DIR, `${seedTs}_${seedSuffix}.sql`);

  writeFileSync(metadataPath, metadataSql, "utf8");
  writeFileSync(seedPath, seedSql, "utf8");
  return {
    metadataPath,
    seedPath,
    metadataExisting: existingMeta !== null,
    seedExisting: existingSeed !== null,
  };
}

function writeReport(args: {
  totalLinesPerSource: Record<Source, number>;
  rejectedPerCode: Record<string, number>;
  cappedSellers: { seller: string; dropped: number }[];
  cappedTotal: number;
  dupsTotal: number;
  profiles: CalibratedProfile[];
  unfinishable: { brand: string; model: string; reason: string; sample: number }[];
  unknownBrands: number;
  unknownModels: number;
  metadataPath: string;
  seedPath: string;
  catalogConsistency: { divergences: string[]; brandsCheckedAgainstCatalog: number };
  blacklistedBrands: string[];
  blacklistedProfilesCount: number;
  qualityRejected: QualityRejection[];
}): void {
  const { profiles } = args;
  const tierA = profiles.filter((p) => p.tier === "A_strong");
  const tierB = profiles.filter((p) => p.tier === "B_moderate");
  const tierC = profiles.filter((p) => p.tier === "C_anchor");
  const brandsCovered = new Set(profiles.map((p) => p.make_name));

  const formatProfile = (p: CalibratedProfile) =>
    `| ${p.make_name} | ${p.model_name} | ${p.body_type} | ${p.baseline_year} | ${(p.baseline_price_mga / 1_000_000).toFixed(1)} MAr | ${(p.annual_depreciation_rate * 100).toFixed(2)} % | ${p.sample_size} | ${(p.cv * 100).toFixed(1)} % |`;

  const totalLines = Object.values(args.totalLinesPerSource).reduce((a, b) => a + b, 0);
  const rejectedTotal = Object.values(args.rejectedPerCode).reduce((a, b) => a + b, 0);

  const lines: string[] = [];
  lines.push(`# Ingestion reference profiles vague ${pipelineConfig.version}`);
  lines.push("");
  lines.push(`Date génération: ${new Date().toISOString()}`);
  lines.push(`Pipeline: \`scripts/data/build-reference-profiles.ts\``);
  lines.push("");
  lines.push("## 1. Résumé exécutif");
  lines.push("");
  lines.push(`- **Profils générés**: ${profiles.length}`);
  lines.push(`  - Tier A (strong): ${tierA.length}`);
  lines.push(`  - Tier B (moderate): ${tierB.length}`);
  lines.push(`  - Tier C (anchor): ${tierC.length}`);
  lines.push(`- **Marques couvertes**: ${brandsCovered.size}`);
  lines.push(`- **Lignes lues**: ${totalLines}`);
  lines.push(`- **Lignes rejetées**: ${rejectedTotal}`);
  lines.push(`- **Doublons FB éliminés**: ${args.dupsTotal}`);
  lines.push(`- **Lignes écartées par cap vendeur**: ${args.cappedTotal}`);
  lines.push("");
  lines.push("## 2. Stats par source");
  lines.push("");
  lines.push("| Source | Lignes lues |");
  lines.push("|---|---:|");
  for (const src of Object.keys(args.totalLinesPerSource) as Source[]) {
    lines.push(`| ${src} | ${args.totalLinesPerSource[src]} |`);
  }
  lines.push("");
  lines.push("### Rejets par code");
  lines.push("");
  lines.push("| Code | Description | Count |");
  lines.push("|---|---|---:|");
  const codeDescs: Record<string, string> = {
    R1: "brand non mappable",
    R2: "prix hors bornes ou non parsable",
    R3: "année hors bornes",
    R4: "km hors bornes",
    R5: "FB devise AR_DEFAULT et prix > 200M",
    R6: "FB acheteur (mitady/recherche)",
    R7: "année manquante (dealer Neuf si REJECT)",
    R8: "doublon FB",
    CAP: "cap vendeur dépassé",
  };
  for (const [code, count] of Object.entries(args.rejectedPerCode).sort()) {
    lines.push(`| ${code} | ${codeDescs[code] ?? "—"} | ${count} |`);
  }
  lines.push("");
  lines.push("## 3. Top 20 profils Tier A");
  lines.push("");
  lines.push("| Marque | Modèle | Body | Baseline year | Baseline prix | Decay/an | Sample | CV |");
  lines.push("|---|---|---|---:|---:|---:|---:|---:|");
  for (const p of tierA.slice(0, 20)) lines.push(formatProfile(p));
  if (tierA.length === 0) lines.push("*(aucun Tier A — vague 1 manque de profondeur, à enrichir vague 2)*");
  lines.push("");
  lines.push("## 4. Profils Tier C (faible confiance)");
  lines.push("");
  if (tierC.length === 0) {
    lines.push("*(aucun)*");
  } else {
    lines.push("| Marque | Modèle | Body | Baseline year | Baseline prix | Decay/an | Sample | CV |");
    lines.push("|---|---|---|---:|---:|---:|---:|---:|");
    for (const p of tierC) lines.push(formatProfile(p));
  }
  lines.push("");
  lines.push("## 5. Marques absentes / sous-représentées");
  lines.push("");
  if (args.blacklistedBrands.length > 0) {
    lines.push(`Marques blacklistées vague 1 (calibrées mais retirées du seed, ${args.blacklistedProfilesCount} profil(s) écarté(s)) :`);
    lines.push("");
    for (const b of args.blacklistedBrands) lines.push(`- ${b} _(blacklistée vague 1, hors catalogue UI)_`);
    lines.push("");
  }
  const allCanonical = brandConfig.canonical_brands;
  const blacklistSet = new Set(args.blacklistedBrands);
  const absent = allCanonical.filter((b) => !brandsCovered.has(b) && !blacklistSet.has(b));
  if (absent.length === 0) lines.push("*(toutes les autres marques canoniques sont couvertes)*");
  else {
    lines.push("Autres marques canoniques sans profil calibré :");
    lines.push("");
    for (const b of absent) lines.push(`- ${b}`);
  }
  lines.push("");
  lines.push("## 6. Top vendeurs FB cappés");
  lines.push("");
  if (args.cappedSellers.length === 0) {
    lines.push("*(aucun cap appliqué)*");
  } else {
    lines.push("| Seller | Annonces écartées |");
    lines.push("|---|---:|");
    for (const s of args.cappedSellers.slice(0, 10)) lines.push(`| ${s.seller} | ${s.dropped} |`);
  }
  lines.push("");
  lines.push("## 7. Coefficients appliqués");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify({
    version: pipelineConfig.version,
    fb_listing_to_transaction: pipelineConfig.coefficients.fb_listing_to_transaction,
    max_listings_per_seller: pipelineConfig.caps.max_listings_per_seller,
    filters: pipelineConfig.filters,
    calibration: pipelineConfig.calibration,
    decay_clip_range: pipelineConfig.decay_clip_range,
    dealer_neuf_year_default: pipelineConfig.dealer_neuf_year_default,
  }, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## 8. Cohérence catalogue UI");
  lines.push("");
  lines.push(`Marques canoniques vérifiées contre \`src/data/vehicleUiCatalog.ts\`: ${args.catalogConsistency.brandsCheckedAgainstCatalog}.`);
  if (args.catalogConsistency.divergences.length === 0) {
    lines.push("Aucune divergence majeure détectée.");
  } else {
    lines.push("Divergences (warning) :");
    for (const d of args.catalogConsistency.divergences) lines.push(`- ${d}`);
  }
  lines.push("");
  lines.push("## 9. Termes inconnus loggés");
  lines.push("");
  lines.push(`- Marques non reconnues: ${args.unknownBrands}`);
  lines.push(`- Modèles non reconnus: ${args.unknownModels}`);
  lines.push(`- Détail: \`scripts/data/output/unknown_terms.csv\``);
  lines.push("");
  lines.push("## 10. Profils non finalisables");
  lines.push("");
  lines.push(`Total: ${args.unfinishable.length} (sample insuffisant ou aucun ancrage)`);
  lines.push(`Détail: \`scripts/data/output/unfinishable_profiles.csv\``);
  lines.push("");
  // Section passe 3 — profils rejetés par les filtres qualité (CV, year_span, plausibility floor, model_blacklist)
  lines.push("## 10b. Profils rejetés par filtres qualité (passe 3)");
  lines.push("");
  lines.push(`Total: ${args.qualityRejected.length}`);
  if (args.qualityRejected.length > 0) {
    const byCode = args.qualityRejected.reduce<Record<string, number>>((acc, q) => {
      acc[q.reason_code] = (acc[q.reason_code] ?? 0) + 1;
      return acc;
    }, {});
    lines.push("");
    lines.push("Répartition par cause :");
    for (const [code, count] of Object.entries(byCode).sort()) lines.push(`- ${code} : ${count}`);
    lines.push("");
    lines.push("| Marque | Modèle | Baseline | Sample | CV | Span | Raison |");
    lines.push("|---|---|---:|---:|---:|---:|---|");
    const sorted = [...args.qualityRejected].sort(
      (a, b) => a.reason_code.localeCompare(b.reason_code) || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model),
    );
    for (const q of sorted) {
      const baseline = q.baseline_price_ar !== null ? `${(q.baseline_price_ar / 1_000_000).toFixed(1)} MAr` : "—";
      const cv = q.cv !== null ? `${(q.cv * 100).toFixed(1)} %` : "—";
      const span = q.year_span !== null ? `${q.year_span}` : "—";
      lines.push(`| ${q.brand} | ${q.model} | ${baseline} | ${q.sample} | ${cv} | ${span} | ${q.reason_code} |`);
    }
  }
  lines.push("");
  lines.push("## 11. Migrations SQL");
  lines.push("");
  const toRel = (p: string) =>
    p.replace(ROOT + "\\", "").replace(ROOT + "/", "").replaceAll("\\", "/");
  lines.push(`- **Métadonnées (idempotente)**: \`${toRel(args.metadataPath)}\``);
  lines.push(`- **Seed profils (upsert)**: \`${toRel(args.seedPath)}\``);
  lines.push("");
  lines.push("À coller dans Supabase Studio → SQL Editor (métadonnées d'abord, puis seed).");
  lines.push("");
  lines.push("## 12. Commande pour relancer");
  lines.push("");
  lines.push("```bash");
  lines.push("npx tsx scripts/data/build-reference-profiles.ts");
  lines.push("```");
  lines.push("");
  writeFileSync(resolve(OUTPUT_DIR, "INGESTION_REPORT.md"), lines.join("\n"), "utf8");
}

function checkCatalogConsistency(profiles: CalibratedProfile[]): { divergences: string[]; brandsCheckedAgainstCatalog: number } {
  const catalogPath = resolve(ROOT, "src", "data", "vehicleUiCatalog.ts");
  if (!existsSync(catalogPath)) {
    return { divergences: ["src/data/vehicleUiCatalog.ts introuvable"], brandsCheckedAgainstCatalog: 0 };
  }
  const txt = readFileSync(catalogPath, "utf8");
  const divergences: string[] = [];
  const profileBrands = new Set(profiles.map((p) => p.make_name));
  let checked = 0;
  for (const brand of profileBrands) {
    checked += 1;
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Le catalogue utilise des clés TS soit nues (`Toyota:`) soit entre guillemets (`"Land Rover":`).
    const reQuoted = new RegExp(`["']${escaped}["']\\s*:`);
    const reBare = new RegExp(`(^|[\\s,{])${escaped}\\s*:`, "m");
    if (!reQuoted.test(txt) && !reBare.test(txt)) {
      divergences.push(`Marque \`${brand}\` absente du catalogue UI`);
    }
  }
  return { divergences, brandsCheckedAgainstCatalog: checked };
}

async function main(): Promise<void> {
  console.log("=== AutoNex reference profiles pipeline ===");
  console.log(`Version: ${pipelineConfig.version}`);

  const rawAll = readInputs();
  const totalLinesPerSource: Record<Source, number> = {
    fb_scrap: rawAll.filter((r) => r.source === "fb_scrap").length,
    manual_structured: rawAll.filter((r) => r.source === "manual_structured").length,
    dealer: rawAll.filter((r) => r.source === "dealer").length,
  };

  const rawWithDefault = applyDealerNeufYearDefault(rawAll);
  const unknownTerms = new Map<string, UnknownTerm>();
  const normalized = normalizeRows(rawWithDefault, unknownTerms);

  const { kept: keptAfterFilters, rejected: rejectedFilters } = applyFilters(normalized);
  console.log(`[filters] kept=${keptAfterFilters.length} rejected=${rejectedFilters.length}`);

  const { kept: keptAfterCap, capped, topCappedSellers } = applySellerCap(keptAfterFilters);
  console.log(`[cap] kept=${keptAfterCap.length} dropped=${capped.length}`);

  const { kept: keptAfterDedup, dups } = dedupFb(keptAfterCap);
  console.log(`[dedup] kept=${keptAfterDedup.length} dups=${dups.length}`);

  const { profiles: rawProfiles, unfinishable, qualityRejected } = buildProfiles(keptAfterDedup);
  console.log(`[calib] profiles=${rawProfiles.length} unfinishable=${unfinishable.length} qualityRejected=${qualityRejected.length}`);

  // Filtres qualité passe 3 — appliqués après calibration et tier assignment :
  //   1. plausibility_floors  → rejet si baseline_price < floor segment
  //   2. model_blacklist      → modèles individuels exclus (infrastructure vide passe 3)
  //   3. brand_blacklist      → marques hors catalogue UI (Brilliance/Enranger/Kaiyi)
  const floorRules = pipelineConfig.plausibility_floors?.rules ?? [];
  const modelBlacklistMap: Record<string, Set<string>> = {};
  for (const [make, models] of Object.entries(modelBlacklistConfig.blacklist ?? {})) {
    modelBlacklistMap[make] = new Set(models);
  }
  const brandBlacklist = new Set(pipelineConfig.brand_blacklist_for_seed?.brands ?? []);

  const profilesAfterQuality: CalibratedProfile[] = [];
  for (const p of rawProfiles) {
    // 1. Plausibility floor
    const floor = findPlausibilityFloor(p, floorRules);
    if (floor && p.baseline_price_mga < floor.min_price_ar) {
      qualityRejected.push({
        brand: p.make_name,
        model: p.model_name,
        baseline_price_ar: p.baseline_price_mga,
        sample: p.sample_size,
        cv: p.cv,
        year_span: p.year_span,
        reason_code: "PRICE_BELOW_FLOOR",
        reason_detail: `baseline ${p.baseline_price_mga} Ar < ${floor.min_price_ar} (${floor.label})`,
      });
      continue;
    }
    // 2. Model blacklist
    if (modelBlacklistMap[p.make_name]?.has(p.model_name)) {
      qualityRejected.push({
        brand: p.make_name,
        model: p.model_name,
        baseline_price_ar: p.baseline_price_mga,
        sample: p.sample_size,
        cv: p.cv,
        year_span: p.year_span,
        reason_code: "MODEL_BLACKLISTED",
        reason_detail: "modèle individuel exclu via model_blacklist.json",
      });
      continue;
    }
    profilesAfterQuality.push(p);
  }

  const profiles = profilesAfterQuality.filter((p) => !brandBlacklist.has(p.make_name));
  const blacklistedProfiles = profilesAfterQuality.filter((p) => brandBlacklist.has(p.make_name));
  if (qualityRejected.length > 0) {
    const byCode = qualityRejected.reduce<Record<string, number>>((acc, q) => {
      acc[q.reason_code] = (acc[q.reason_code] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`[quality-filters] ${qualityRejected.length} profil(s) rejeté(s) :`, byCode);
  }
  if (blacklistedProfiles.length > 0) {
    console.log(`[blacklist] ${blacklistedProfiles.length} profil(s) retiré(s) du seed: ${[...new Set(blacklistedProfiles.map((p) => p.make_name))].join(", ")}`);
  }

  // Outputs
  writeNormalizedDataset(keptAfterDedup);
  writeCalibratedProfiles(profiles);
  writeRejectedRows([...rejectedFilters, ...capped, ...dups]);
  writeUnknownTerms(unknownTerms);
  writeUnfinishable(unfinishable, qualityRejected);

  // Migrations
  const tierACount = profiles.filter((p) => p.tier === "A_strong").length;
  const tierBCount = profiles.filter((p) => p.tier === "B_moderate").length;
  const tierCCount = profiles.filter((p) => p.tier === "C_anchor").length;
  const metadataSql = generateMetadataMigrationSql();
  const seedSql = generateSeedMigrationSql(
    profiles.map((p) => ({
      make_name: p.make_name,
      model_name: p.model_name,
      body_type: p.body_type,
      fuel_type: p.fuel_type,
      transmission_type: p.transmission_type,
      baseline_year: p.baseline_year,
      baseline_price_mga: p.baseline_price_mga,
      annual_depreciation_rate: p.annual_depreciation_rate,
      expected_km_per_year: p.expected_km_per_year,
      data_quality_tier: p.data_quality_tier,
      sample_size: p.sample_size,
      source_versions: p.source_versions,
    })),
    {
      generated_at_iso: new Date().toISOString().slice(0, 10),
      pipeline_version: pipelineConfig.version,
      total_profiles: profiles.length,
      tier_a_count: tierACount,
      tier_b_count: tierBCount,
      tier_c_count: tierCCount,
      conflict_strategy: pipelineConfig.conflict_strategy as "DO_UPDATE" | "DO_NOTHING",
    },
  );

  const now = new Date();
  const { metadataPath, seedPath, metadataExisting, seedExisting } = writeMigrations(metadataSql, seedSql, now);
  if (metadataExisting) console.log(`[sql] migration metadata existante mise à jour: ${metadataPath}`);
  else console.log(`[sql] migration metadata créée: ${metadataPath}`);
  if (seedExisting) console.log(`[sql] migration seed existante mise à jour: ${seedPath}`);
  else console.log(`[sql] migration seed créée: ${seedPath}`);

  // Report
  const rejectedPerCode: Record<string, number> = {};
  for (const r of [...rejectedFilters, ...capped, ...dups]) {
    rejectedPerCode[r.rejection_code] = (rejectedPerCode[r.rejection_code] ?? 0) + 1;
  }

  const catalogConsistency = checkCatalogConsistency(profiles);
  const unknownBrands = [...unknownTerms.values()].filter((t) => t.kind === "brand").length;
  const unknownModels = [...unknownTerms.values()].filter((t) => t.kind === "model").length;

  writeReport({
    totalLinesPerSource,
    rejectedPerCode,
    cappedSellers: topCappedSellers,
    cappedTotal: capped.length,
    dupsTotal: dups.length,
    profiles,
    unfinishable,
    unknownBrands,
    unknownModels,
    metadataPath,
    seedPath,
    catalogConsistency,
    blacklistedBrands: pipelineConfig.brand_blacklist_for_seed?.brands ?? [],
    blacklistedProfilesCount: blacklistedProfiles.length,
    qualityRejected,
  });

  console.log("=== Pipeline terminé ===");
  console.log(`Profils: ${profiles.length} (A:${tierACount} B:${tierBCount} C:${tierCCount})`);
  console.log(`Rapport: scripts/data/output/INGESTION_REPORT.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
