/**
 * Normalisation des champs catégoriels (marque, modèle, body, fuel, transmission)
 * à partir des fichiers de config JSON.
 *
 * Toutes les fonctions sont pures: elles ne loggent pas, mais retournent en plus
 * un éventuel `unknown` pour que l'orchestrateur puisse aggréger les warnings.
 */

import {
  brandConfig,
  modelConfig,
  bodyStyleConfig as bodyConfig,
  fuelConfig,
  transmissionConfig,
} from "./configs";

export type NormalizationResult<T> = {
  value: T | null;
  unknown: boolean;
};

const compactKey = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Normalise une marque vers son nom canonique. Retourne null si non mappable.
 */
export function normalizeBrand(raw: string | null | undefined): NormalizationResult<string> {
  if (!raw) return { value: null, unknown: true };
  const key = compactKey(raw);
  const aliases = brandConfig.alias_to_canonical;
  const direct = aliases[key];
  if (direct) return { value: direct, unknown: false };
  // fallback: marque déjà canonique (case-insensitive)
  const canonicalLower = brandConfig.canonical_brands.find((b) => b.toLowerCase() === key);
  if (canonicalLower) return { value: canonicalLower, unknown: false };
  return { value: null, unknown: true };
}

/**
 * Normalise un modèle pour une marque canonique donnée.
 * Ne valide PAS contre le catalogue UI (c'est fait séparément lors de la phase de génération SQL).
 */
export function normalizeModel(
  brandCanonical: string | null,
  rawModel: string | null | undefined,
): NormalizationResult<string> {
  if (!brandCanonical || !rawModel) return { value: null, unknown: true };
  const cleaned = rawModel.trim();
  if (!cleaned) return { value: null, unknown: true };
  const key = compactKey(cleaned);
  const map = modelConfig.alias_to_canonical[brandCanonical];
  if (map) {
    if (map[key]) {
      // Marker "DROP" : modèle parasite à supprimer (ex: "Pride Bonn"). On retourne
      // value=null avec unknown=false pour signaler un drop intentionnel.
      if (map[key] === "DROP") return { value: null, unknown: false };
      return { value: map[key], unknown: false };
    }
    // recherche prefix: "x trail something" → "X-Trail", "captiva phase" → "Captiva"
    // On scanne les alias par longueur décroissante pour préférer le match le plus spécifique.
    const aliasesByLen = Object.keys(map).sort((a, b) => b.length - a.length);
    for (const alias of aliasesByLen) {
      if (key === alias || key.startsWith(alias + " ") || key.startsWith(alias + "-")) {
        if (map[alias] === "DROP") return { value: null, unknown: false };
        return { value: map[alias], unknown: false };
      }
    }
  }
  // fallback: capitaliser le brut "civic" → "Civic"
  const capitalized = cleaned
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
  return { value: capitalized, unknown: true };
}

export function normalizeBodyStyle(raw: string | null | undefined): NormalizationResult<string> {
  if (!raw) return { value: null, unknown: false };
  const key = raw.trim();
  const aliases = bodyConfig.alias_to_canonical;
  if (aliases[key]) return { value: aliases[key], unknown: false };
  // recherche case-insensitive
  for (const k of Object.keys(aliases)) {
    if (k.toLowerCase() === key.toLowerCase()) return { value: aliases[k], unknown: false };
  }
  if (bodyConfig.canonical_values.includes(key.toLowerCase())) {
    return { value: key.toLowerCase(), unknown: false };
  }
  return { value: null, unknown: true };
}

export function normalizeFuel(raw: string | null | undefined): NormalizationResult<string> {
  if (!raw) return { value: null, unknown: false };
  const key = raw.trim();
  const aliases = fuelConfig.alias_to_canonical;
  if (aliases[key]) return { value: aliases[key], unknown: false };
  for (const k of Object.keys(aliases)) {
    if (k.toLowerCase() === key.toLowerCase()) return { value: aliases[k], unknown: false };
  }
  if (fuelConfig.canonical_values.includes(key.toLowerCase())) {
    return { value: key.toLowerCase(), unknown: false };
  }
  return { value: null, unknown: true };
}

export function normalizeTransmission(raw: string | null | undefined): NormalizationResult<string> {
  if (!raw) return { value: null, unknown: false };
  const key = raw.trim();
  const aliases = transmissionConfig.alias_to_canonical;
  if (aliases[key]) return { value: aliases[key], unknown: false };
  for (const k of Object.keys(aliases)) {
    if (k.toLowerCase() === key.toLowerCase()) return { value: aliases[k], unknown: false };
  }
  if (transmissionConfig.canonical_values.includes(key.toLowerCase())) {
    return { value: key.toLowerCase(), unknown: false };
  }
  return { value: null, unknown: true };
}

/**
 * Mode statistique sur un tableau de strings, en ignorant null. Retourne null si vide.
 * Tie-break: ordre lexicographique pour idempotence.
 */
export function modeOf(values: (string | null)[]): { mode: string | null; isAmbiguous: boolean } {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (v === null || v === undefined) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return { mode: null, isAmbiguous: false };
  let best: { value: string; count: number } | null = null;
  let isAmbiguous = false;
  const sortedEntries = [...counts.entries()].sort((a, b) =>
    b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0]),
  );
  best = { value: sortedEntries[0][0], count: sortedEntries[0][1] };
  if (sortedEntries.length > 1 && sortedEntries[1][1] === best.count) {
    isAmbiguous = true;
  }
  return { mode: best.value, isAmbiguous };
}
