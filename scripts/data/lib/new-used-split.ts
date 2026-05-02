/**
 * Split neuf vs occasion (passe 6).
 *
 * Pour chaque (make, model) ayant des obs dealer (Neuf) ET des obs FB
 * (Occasion), on crée 2 groupes distincts qui seront calibrés séparément.
 *
 * Justification : un Hilux neuf concessionnaire à 220M et un Hilux occasion
 * 2018 à 95M ne sont pas le même produit. Les calibrer ensemble produit une
 * baseline polluée (compromis bâtard) et un CV gonflé qui fait perdre des
 * Tier A. Splitter les deux permet :
 *   - une baseline Neuf ancrée sur dealer year=current_year (~220M)
 *   - une baseline Occasion calibrée sur FB avec decay réaliste (~5-7%/an
 *     pour Toyota, ~12-15% pour les premium européens)
 *
 * Implémentation : on suffixe le model_canonical par "(Neuf)" pour les obs
 * dealer et "(Occasion)" pour les obs FB / manual_structured. Le pipeline
 * existant (groupement → calibration) traite alors 2 profils distincts.
 *
 * Note : le modèle peut déjà avoir un suffixe générationnel (passe 4, ex:
 * "Tucson (2004-2015)"). Dans ce cas la composition reste lisible :
 * "Tucson (2004-2015) (Occasion)".
 */

import type { NewUsedSplitConfig } from "./configs";

export type SplitInputRow = {
  brand_canonical: string | null;
  model_canonical: string | null;
  source:
    | "fb_scrap"
    | "manual_structured"
    | "dealer"
    | "dealer_official"
    | "expert_curated"
    | "manual_curated";
  vehicle_status: "neuf" | "occasion";
};

export type SplitAppliedEntry = {
  brand: string;
  original_model: string;
  n_dealer: number;
  n_fb: number;
};

export type SplitOutputRow<T extends SplitInputRow> = T & {
  /** Nom du modèle avant l'application du split (passe 6). */
  _original_model_pre_split?: string;
};

export type SplitResult<T extends SplitInputRow> = {
  rows: SplitOutputRow<T>[];
  splitsApplied: SplitAppliedEntry[];
};

/**
 * Identifie les groupes (brand, model) éligibles au split et applique le
 * suffixe Neuf/Occasion sur `model_canonical`.
 *
 * Règles :
 *   - Le modèle est éligible si :
 *       n_dealer >= config.min_obs_dealer_for_split
 *     ET n_fb (FB scrap + occasions structurées) >= config.min_obs_fb_for_split
 *   - Pour les obs dealer (`source === "dealer"`) avec `vehicle_status === "neuf"`
 *     → suffixe "(Neuf)"
 *   - Pour les obs FB (`source === "fb_scrap"`) et occasions structurées
 *     (`source === "manual_structured"`) → suffixe "(Occasion)"
 *   - Les obs dealer avec `vehicle_status === "occasion"` (concessionnaires
 *     vendant aussi de l'occasion) sont comptées et suffixées comme occasion
 *     pour la cohérence économique du profil.
 *   - Si non éligible : aucune modification.
 *
 * Si `config.enabled === false`, no-op total : on retourne les lignes telles
 * quelles avec une liste de splits vide.
 */
export function applyNewUsedSplit<T extends SplitInputRow>(
  rows: T[],
  config: NewUsedSplitConfig,
): SplitResult<T> {
  if (!config.enabled) {
    return { rows: rows as SplitOutputRow<T>[], splitsApplied: [] };
  }

  type Bucket = { dealerNeuf: T[]; occasion: T[]; other: T[] };
  const byKey = new Map<string, Bucket>();

  for (const row of rows) {
    if (!row.brand_canonical || !row.model_canonical) {
      const orphans = byKey.get("__orphans__") ?? { dealerNeuf: [], occasion: [], other: [] };
      orphans.other.push(row);
      byKey.set("__orphans__", orphans);
      continue;
    }
    const key = `${row.brand_canonical}__${row.model_canonical}`;
    if (!byKey.has(key)) {
      byKey.set(key, { dealerNeuf: [], occasion: [], other: [] });
    }
    const bucket = byKey.get(key)!;
    // Sprint 8 — `dealer_official` se comporte comme `dealer` (corpus
    // _compiled.csv issu d'OT/CT/Sodiama, condition='new' = stock dealer).
    // `expert_curated` (occasion ts.xlsx) et `manual_curated` (FB annoté
    // manuellement) sont rangés selon vehicle_status.
    const isDealerLike = row.source === "dealer" || row.source === "dealer_official";
    const isOccasionLike =
      row.source === "fb_scrap" ||
      row.source === "manual_structured" ||
      row.source === "expert_curated" ||
      row.source === "manual_curated";

    if (isDealerLike && row.vehicle_status === "neuf") {
      bucket.dealerNeuf.push(row);
    } else if (isOccasionLike || (isDealerLike && row.vehicle_status === "occasion")) {
      bucket.occasion.push(row);
    } else {
      bucket.other.push(row);
    }
  }

  const result: SplitOutputRow<T>[] = [];
  const splitsApplied: SplitAppliedEntry[] = [];

  for (const [key, group] of byKey.entries()) {
    if (key === "__orphans__") {
      result.push(...(group.other as SplitOutputRow<T>[]));
      continue;
    }
    const eligible =
      group.dealerNeuf.length >= config.min_obs_dealer_for_split &&
      group.occasion.length >= config.min_obs_fb_for_split;

    if (!eligible) {
      result.push(
        ...(group.dealerNeuf as SplitOutputRow<T>[]),
        ...(group.occasion as SplitOutputRow<T>[]),
        ...(group.other as SplitOutputRow<T>[]),
      );
      continue;
    }

    const sample = group.dealerNeuf[0] ?? group.occasion[0]!;
    const brand = sample.brand_canonical!;
    const originalModel = sample.model_canonical!;

    for (const r of group.dealerNeuf) {
      result.push({
        ...r,
        model_canonical: `${r.model_canonical} (Neuf)`,
        _original_model_pre_split: r.model_canonical ?? originalModel,
      });
    }
    for (const r of group.occasion) {
      result.push({
        ...r,
        model_canonical: `${r.model_canonical} (Occasion)`,
        _original_model_pre_split: r.model_canonical ?? originalModel,
      });
    }
    // `other` (sources non classables) passe inchangé pour rester rétro-compatible.
    result.push(...(group.other as SplitOutputRow<T>[]));

    splitsApplied.push({
      brand,
      original_model: originalModel,
      n_dealer: group.dealerNeuf.length,
      n_fb: group.occasion.length,
    });
  }

  splitsApplied.sort(
    (a, b) =>
      a.brand.localeCompare(b.brand) || a.original_model.localeCompare(b.original_model),
  );

  return { rows: result, splitsApplied };
}
