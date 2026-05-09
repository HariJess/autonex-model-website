/**
 * Génération des fichiers SQL de migration:
 *  1) une migration auxiliaire qui ajoute les colonnes méta + un index unique
 *     sur (lower(make_name), lower(model_name)) — idempotente.
 *  2) une migration de seed qui upsert les profils calibrés.
 *
 * Idempotence: les profils sont triés par (make_name, model_name) et formatés
 * de façon stable pour produire un fichier byte-for-byte reproductible si les
 * inputs ne changent pas.
 */

export type ProfileRow = {
  make_name: string;
  model_name: string;
  body_type: string; // schéma DB: body_type (pas body_style)
  fuel_type: string | null;
  transmission_type: string | null;
  baseline_year: number;
  baseline_price_mga: number;
  annual_depreciation_rate: number;
  expected_km_per_year: number;
  data_quality_tier: "A_strong" | "B_moderate" | "C_anchor";
  sample_size: number;
  source_versions: string[];
};

export function generateMetadataMigrationSql(): string {
  return `-- =====================================================================
-- Extension métadonnées vehicle_price_reference_profiles
-- Ajoute: data_quality_tier, sample_size, source_versions, updated_at
-- + index unique (lower(make_name), lower(model_name)) requis pour ON CONFLICT
-- Idempotent.
-- =====================================================================

ALTER TABLE public.vehicle_price_reference_profiles
  ADD COLUMN IF NOT EXISTS data_quality_tier TEXT
    CHECK (data_quality_tier IN ('A_strong','B_moderate','C_anchor')),
  ADD COLUMN IF NOT EXISTS sample_size INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_versions TEXT[],
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_reference_profiles_make_model_lower
  ON public.vehicle_price_reference_profiles (LOWER(make_name), LOWER(model_name));

COMMENT ON COLUMN public.vehicle_price_reference_profiles.data_quality_tier IS
  'A_strong / B_moderate / C_anchor. Calculé par scripts/data/build-reference-profiles.ts.';
COMMENT ON COLUMN public.vehicle_price_reference_profiles.sample_size IS
  'Nombre d''observations utilisées pour calibrer ce profil.';
COMMENT ON COLUMN public.vehicle_price_reference_profiles.source_versions IS
  'Versions du pipeline ayant calibré ce profil (ex: [''v1'',''v2'']).';
`;
}

export type SeedMigrationMeta = {
  generated_at_iso: string;
  pipeline_version: string;
  total_profiles: number;
  tier_a_count: number;
  tier_b_count: number;
  tier_c_count: number;
  conflict_strategy: "DO_UPDATE" | "DO_NOTHING";
};

export function generateSeedMigrationSql(rows: ProfileRow[], meta: SeedMigrationMeta): string {
  const sorted = [...rows].sort((a, b) => {
    const cmp = a.make_name.localeCompare(b.make_name);
    if (cmp !== 0) return cmp;
    return a.model_name.localeCompare(b.model_name);
  });

  const valuesSql = sorted.map((r) => formatRow(r)).join(",\n  ");

  const conflictClause =
    meta.conflict_strategy === "DO_NOTHING"
      ? `ON CONFLICT (LOWER(make_name), LOWER(model_name)) DO NOTHING;`
      : `ON CONFLICT (LOWER(make_name), LOWER(model_name))
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
  updated_at = now();`;

  return `-- =====================================================================
-- Seed reference profiles vague ${meta.pipeline_version} — généré le ${meta.generated_at_iso}
-- Source pipeline: scripts/data/build-reference-profiles.ts
-- Total profils : ${meta.total_profiles}
--   Tier A (strong)   : ${meta.tier_a_count}
--   Tier B (moderate) : ${meta.tier_b_count}
--   Tier C (anchor)   : ${meta.tier_c_count}
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
  ${valuesSql}
${conflictClause}

COMMIT;
`;
}

function formatRow(r: ProfileRow): string {
  const sources = `ARRAY[${r.source_versions.map(sqlString).join(", ")}]::TEXT[]`;
  return `(${[
    sqlString(r.make_name),
    sqlString(r.model_name),
    sqlString(r.body_type),
    r.fuel_type === null ? "NULL" : sqlString(r.fuel_type),
    r.transmission_type === null ? "NULL" : sqlString(r.transmission_type),
    String(r.baseline_year),
    String(r.baseline_price_mga),
    r.annual_depreciation_rate.toFixed(4),
    String(r.expected_km_per_year),
    sqlString(r.data_quality_tier),
    String(r.sample_size),
    sources,
    "true",
  ].join(", ")})`;
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * Construit un nom de fichier de migration timestampé. Le timestamp utilisé est
 * passé en paramètre pour permettre l'idempotence (le pipeline réutilise
 * `now()` une seule fois par run et le passe à toutes les étapes).
 */
export function migrationFilename(prefix: string, timestamp: string): string {
  return `${timestamp}_${prefix}.sql`;
}

/**
 * Format YYYYMMDDHHMMSS depuis une Date.
 */
export function formatMigrationTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}
