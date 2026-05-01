/**
 * Passe 6 — split neuf vs occasion.
 *
 * Couvre :
 *   - 1 dealer + 5 FB → 2 profils suffixés (Neuf) / (Occasion)
 *   - 0 dealer → pas de split
 *   - 1 dealer + 1 FB → pas de split (min_obs_fb=3)
 *   - config disabled → pas de split même si éligible
 *   - combinaison avec bucketing : "Tucson (2004-2015)" → "Tucson (2004-2015) (Occasion)"
 */

import { describe, expect, it } from "vitest";
import {
  applyNewUsedSplit,
  type SplitInputRow,
} from "../../scripts/data/lib/new-used-split";
import type { NewUsedSplitConfig } from "../../scripts/data/lib/configs";

const enabledConfig: NewUsedSplitConfig = {
  enabled: true,
  min_obs_dealer_for_split: 1,
  min_obs_fb_for_split: 3,
};

const dealerNeuf = (model: string): SplitInputRow => ({
  brand_canonical: "Toyota",
  model_canonical: model,
  source: "dealer",
  vehicle_status: "neuf",
});
const fbOccasion = (model: string): SplitInputRow => ({
  brand_canonical: "Toyota",
  model_canonical: model,
  source: "fb_scrap",
  vehicle_status: "occasion",
});

describe("applyNewUsedSplit", () => {
  it("splitte un modèle avec 1 dealer + 5 FB en deux profils suffixés", () => {
    const rows: SplitInputRow[] = [
      dealerNeuf("Hilux"),
      fbOccasion("Hilux"),
      fbOccasion("Hilux"),
      fbOccasion("Hilux"),
      fbOccasion("Hilux"),
      fbOccasion("Hilux"),
    ];
    const { rows: out, splitsApplied } = applyNewUsedSplit(rows, enabledConfig);
    expect(splitsApplied).toHaveLength(1);
    expect(splitsApplied[0]).toMatchObject({
      brand: "Toyota",
      original_model: "Hilux",
      n_dealer: 1,
      n_fb: 5,
    });
    const models = out.map((r) => r.model_canonical);
    expect(models).toContain("Hilux (Neuf)");
    expect(models).toContain("Hilux (Occasion)");
    expect(models.filter((m) => m === "Hilux (Neuf)")).toHaveLength(1);
    expect(models.filter((m) => m === "Hilux (Occasion)")).toHaveLength(5);
    // Traçabilité : chaque ligne suffixée garde son nom d'origine.
    for (const r of out) {
      expect(r._original_model_pre_split).toBe("Hilux");
    }
  });

  it("ne splitte pas un modèle sans aucune obs dealer", () => {
    const rows: SplitInputRow[] = [
      fbOccasion("Sorento"),
      fbOccasion("Sorento"),
      fbOccasion("Sorento"),
      fbOccasion("Sorento"),
    ];
    const { rows: out, splitsApplied } = applyNewUsedSplit(rows, enabledConfig);
    expect(splitsApplied).toHaveLength(0);
    expect(out.every((r) => r.model_canonical === "Sorento")).toBe(true);
    expect(out.every((r) => r._original_model_pre_split === undefined)).toBe(true);
  });

  it("ne splitte pas si moins de min_obs_fb_for_split obs FB (1+1)", () => {
    const rows: SplitInputRow[] = [dealerNeuf("Amarok"), fbOccasion("Amarok")];
    const { rows: out, splitsApplied } = applyNewUsedSplit(rows, enabledConfig);
    expect(splitsApplied).toHaveLength(0);
    expect(out.every((r) => r.model_canonical === "Amarok")).toBe(true);
  });

  it("est un no-op total quand config.enabled = false", () => {
    const rows: SplitInputRow[] = [
      dealerNeuf("Hilux"),
      fbOccasion("Hilux"),
      fbOccasion("Hilux"),
      fbOccasion("Hilux"),
    ];
    const { rows: out, splitsApplied } = applyNewUsedSplit(rows, {
      ...enabledConfig,
      enabled: false,
    });
    expect(splitsApplied).toHaveLength(0);
    expect(out.every((r) => r.model_canonical === "Hilux")).toBe(true);
  });

  it("compose proprement avec un suffixe générationnel pré-existant", () => {
    // Cas d'enchaînement passe 4 (bucketing) → passe 6 (split) :
    // model_canonical entrant déjà suffixé en "(2004-2015)".
    const rows: SplitInputRow[] = [
      {
        brand_canonical: "Hyundai",
        model_canonical: "Tucson (2004-2015)",
        source: "dealer",
        vehicle_status: "neuf",
      },
      {
        brand_canonical: "Hyundai",
        model_canonical: "Tucson (2004-2015)",
        source: "fb_scrap",
        vehicle_status: "occasion",
      },
      {
        brand_canonical: "Hyundai",
        model_canonical: "Tucson (2004-2015)",
        source: "fb_scrap",
        vehicle_status: "occasion",
      },
      {
        brand_canonical: "Hyundai",
        model_canonical: "Tucson (2004-2015)",
        source: "fb_scrap",
        vehicle_status: "occasion",
      },
    ];
    const { rows: out, splitsApplied } = applyNewUsedSplit(rows, enabledConfig);
    expect(splitsApplied).toHaveLength(1);
    const models = new Set(out.map((r) => r.model_canonical));
    expect(models).toContain("Tucson (2004-2015) (Neuf)");
    expect(models).toContain("Tucson (2004-2015) (Occasion)");
  });

  it("traite une obs manual_structured comme une obs FB occasion", () => {
    const rows: SplitInputRow[] = [
      dealerNeuf("Ranger"),
      {
        brand_canonical: "Toyota",
        model_canonical: "Ranger",
        source: "manual_structured",
        vehicle_status: "occasion",
      },
      fbOccasion("Ranger"),
      fbOccasion("Ranger"),
    ];
    const { splitsApplied } = applyNewUsedSplit(rows, enabledConfig);
    expect(splitsApplied[0]?.n_fb).toBe(3);
    expect(splitsApplied[0]?.n_dealer).toBe(1);
  });
});
