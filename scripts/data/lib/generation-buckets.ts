/**
 * Bucketing générationnel — passe 4.
 *
 * Pour les modèles multi-génération (ex: Hyundai Tucson, Suzuki Jimny), on ne
 * peut pas calibrer toutes les années dans un seul profil : un Tucson 2010
 * (~40M Ar) et un Tucson 2024 (~145M Ar) ont des baselines complètement
 * différentes, et les calibrer ensemble produit un CV>1.0 qui fait planter les
 * filtres qualité (le profil entier est rejeté).
 *
 * Solution : on splitte ces modèles en buckets d'années via
 * `model_generations.json`. Chaque bucket devient un (make, model+suffix)
 * distinct dans la table reference_profiles. Exemple :
 *
 *   "Tucson"  →  "Tucson (2004-2015)"  (anciennes générations, baseline ~40M)
 *             →  "Tucson (2016-2026)"  (générations récentes, baseline ~145M)
 *
 * Les modèles non listés dans `model_generations.json` conservent leur
 * comportement actuel (un seul profil par modèle).
 */

import type {
  GenerationBucket,
  ModelGenerationsConfig,
} from "./configs";

export type BucketedRow<T> = T & {
  /** Modèle d'origine avant suffixage (ex: "Tucson"). Conservé pour traçabilité. */
  _original_model?: string;
  /** Label du bucket appliqué (ex: "2004-2015"). Permet le lookup `min_obs` plus tard. */
  _generation_bucket_label?: string;
};

export type BucketingRowInput = {
  brand_canonical: string | null;
  model_canonical: string | null;
  year: number | null;
};

export type BucketingResult<T> = {
  kept: T[];
  rejected: { row: T; reason: string }[];
};

/**
 * Construit le `model_canonical` suffixé pour un bucket donné.
 * Convention : "Tucson" + label "2004-2015" → "Tucson (2004-2015)".
 */
export function bucketedModelName(originalModel: string, label: string): string {
  return `${originalModel} (${label})`;
}

/**
 * Trouve le bucket qui couvre `year` parmi `buckets`. Retourne null si aucun.
 * Bornes inclusives des deux côtés.
 */
export function findBucketForYear(
  year: number,
  buckets: GenerationBucket[],
): GenerationBucket | null {
  return buckets.find((b) => year >= b.from && year <= b.to) ?? null;
}

/**
 * Retourne la liste des buckets pour (make, originalModel), ou null si le
 * modèle n'est pas configuré pour le bucketing.
 */
export function getBucketsForModel(
  make: string,
  originalModel: string,
  config: ModelGenerationsConfig,
): GenerationBucket[] | null {
  const byMake = config.generations[make];
  if (!byMake) return null;
  const buckets = byMake[originalModel];
  if (!buckets || buckets.length === 0) return null;
  return buckets;
}

/**
 * Applique le bucketing générationnel à une liste de lignes normalisées.
 *
 * Pour chaque ligne :
 *   - si (make, model) n'est pas configuré → ligne inchangée, conservée
 *   - si configuré et année dans un bucket → on ré-écrit `model_canonical`
 *     avec le suffixe et on annote `_original_model` / `_generation_bucket_label`
 *   - si configuré mais année hors de tous les buckets → ligne rejetée
 *     (raison : `année hors buckets générationnels`)
 *
 * Les lignes sans `brand_canonical`, sans `model_canonical` ou sans `year`
 * passent inchangées (elles seront rejetées plus tard par les filtres standard
 * ou ne matchent simplement aucun bucket).
 */
export function applyGenerationBuckets<T extends BucketingRowInput>(
  rows: T[],
  config: ModelGenerationsConfig,
): BucketingResult<BucketedRow<T>> {
  const kept: BucketedRow<T>[] = [];
  const rejected: { row: BucketedRow<T>; reason: string }[] = [];

  for (const row of rows) {
    if (!row.brand_canonical || !row.model_canonical) {
      kept.push(row as BucketedRow<T>);
      continue;
    }
    const buckets = getBucketsForModel(row.brand_canonical, row.model_canonical, config);
    if (!buckets) {
      kept.push(row as BucketedRow<T>);
      continue;
    }
    if (row.year === null || !Number.isFinite(row.year)) {
      // Sans année on ne peut pas attribuer de bucket → rejet (les modèles
      // bucketés exigent une année exploitable).
      rejected.push({
        row: row as BucketedRow<T>,
        reason: "année manquante pour modèle bucketé",
      });
      continue;
    }
    const bucket = findBucketForYear(row.year, buckets);
    if (!bucket) {
      rejected.push({
        row: row as BucketedRow<T>,
        reason: `année ${row.year} hors buckets générationnels (${row.brand_canonical} ${row.model_canonical})`,
      });
      continue;
    }
    const originalModel = row.model_canonical;
    kept.push({
      ...row,
      model_canonical: bucketedModelName(originalModel, bucket.label),
      _original_model: originalModel,
      _generation_bucket_label: bucket.label,
    });
  }

  return { kept, rejected };
}

/**
 * Détecte le suffixe `(YYYY-YYYY)` dans un nom de modèle bucketé et retourne
 * `{ originalModel, label }`. Retourne null si le nom ne ressemble pas à un
 * modèle bucketé.
 *
 * Ex: "Tucson (2004-2015)" → { originalModel: "Tucson", label: "2004-2015" }
 *     "Sorento"            → null
 */
export function parseBucketedModelName(
  modelName: string,
): { originalModel: string; label: string } | null {
  const match = modelName.match(/^(.+?)\s+\((\d{4}-\d{4})\)$/);
  if (!match) return null;
  return { originalModel: match[1], label: match[2] };
}
