/**
 * Passe 5 — filtre outlier MAD (Median Absolute Deviation).
 *
 * Couvre :
 *   - applyMadOutlierFilter : détecte 1 outlier extrême parmi 9 normales
 *   - filtre désactivé → no-op
 *   - n < min_observations → pas appliqué
 *   - MAD = 0 (toutes valeurs identiques) → pas appliqué
 *   - % outliers > max_outlier_pct → pas appliqué (signal de bimodalité)
 *   - threshold respecté
 *   - cas réel Tucson 1.4 milliard Ar (bimodal → filtre auto-désactivé)
 */

import { describe, expect, it } from "vitest";
import {
  applyMadOutlierFilter,
  type OutlierFilterOptions,
} from "../../scripts/data/lib/outlier-filter";

const opts: OutlierFilterOptions = {
  enabled: true,
  threshold: 3.5,
  minObservationsForFilter: 5,
  maxOutlierPct: 0.2,
};

describe("applyMadOutlierFilter", () => {
  it("rejette 1 outlier extrême parmi 9 normales", () => {
    // Cas Santa Fe 2013-2014 : prix entre 38 et 70M, 1 outlier à 280M.
    const rows = [
      { id: 1, price: 38_000_000 },
      { id: 2, price: 40_000_000 },
      { id: 3, price: 47_000_000 },
      { id: 4, price: 47_000_000 },
      { id: 5, price: 60_000_000 },
      { id: 6, price: 60_000_000 },
      { id: 7, price: 62_000_000 },
      { id: 8, price: 70_000_000 },
      { id: 9, price: 280_000_000 },
    ];
    const result = applyMadOutlierFilter(rows, (r) => r.price, opts);
    expect(result.applied).toBe(true);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].row.id).toBe(9);
    expect(result.rejected[0].modifiedZ).toBeGreaterThan(opts.threshold);
    expect(result.kept).toHaveLength(8);
    expect(result.kept.map((r) => r.id)).not.toContain(9);
  });

  it("n'applique pas le filtre si n < min_observations", () => {
    const rows = [{ price: 10 }, { price: 20 }, { price: 30 }];
    const result = applyMadOutlierFilter(rows, (r) => r.price, opts);
    expect(result.applied).toBe(false);
    expect(result.reason_not_applied).toContain("n=3");
    expect(result.kept).toHaveLength(3);
  });

  it("n'applique pas le filtre si filtre désactivé", () => {
    const rows = [
      { price: 10 },
      { price: 20 },
      { price: 30 },
      { price: 40 },
      { price: 1000 },
    ];
    const result = applyMadOutlierFilter(rows, (r) => r.price, { ...opts, enabled: false });
    expect(result.applied).toBe(false);
    expect(result.reason_not_applied).toBe("filter_disabled");
    expect(result.kept).toHaveLength(5);
    expect(result.rejected).toHaveLength(0);
  });

  it("n'applique pas si MAD = 0 (toutes obs identiques)", () => {
    const rows = [
      { price: 100 },
      { price: 100 },
      { price: 100 },
      { price: 100 },
      { price: 100 },
    ];
    const result = applyMadOutlierFilter(rows, (r) => r.price, opts);
    expect(result.applied).toBe(false);
    expect(result.reason_not_applied).toBe("mad_zero");
    expect(result.kept).toHaveLength(5);
  });

  it("n'applique pas si trop d'outliers (signal bimodal, > max_outlier_pct)", () => {
    // 5 obs « normales » très resserrées (MAD petit) + 2 obs très éloignées.
    // 2/7 = 28.6% > max_outlier_pct (20%) → filtre auto-désactivé.
    const rows = [
      { price: 100 },
      { price: 102 },
      { price: 104 },
      { price: 106 },
      { price: 108 },
      { price: 1000 },
      { price: 1010 },
    ];
    const result = applyMadOutlierFilter(rows, (r) => r.price, opts);
    expect(result.applied).toBe(false);
    expect(result.reason_not_applied).toContain("too_many_outliers");
    expect(result.kept).toHaveLength(7);
  });

  it("garde une obs juste sous le threshold", () => {
    // Échantillon avec faible dispersion + une obs légèrement au-dessus.
    // Avec threshold 3.5, l'obs à 110 n'est pas un outlier (modified_z < 3.5).
    const rows = [
      { id: 1, price: 95 },
      { id: 2, price: 98 },
      { id: 3, price: 100 },
      { id: 4, price: 102 },
      { id: 5, price: 105 },
      { id: 6, price: 110 },
    ];
    const result = applyMadOutlierFilter(rows, (r) => r.price, opts);
    expect(result.applied).toBe(true);
    expect(result.rejected).toHaveLength(0);
    expect(result.kept).toHaveLength(6);
  });

  it("Tucson outlier 1.4 milliard : auto-désactivation (3/8 = 37.5% > 20%)", () => {
    // Cas réel Sprint 2 : 5 obs autour de 145M + 3 typos à 1.4-1.45 milliards.
    // On simule une légère variabilité dans le cluster « normal » pour avoir
    // MAD > 0 (sinon le code court-circuite avec `mad_zero` avant de tester
    // le pourcentage d'outliers — ce qui est aussi une protection valide,
    // mais ici on valide spécifiquement la garde `too_many_outliers`).
    // 3/8 = 37.5% > max_outlier_pct (20%) → filtre PAS appliqué.
    const rows = [
      { price: 140_000_000 },
      { price: 142_000_000 },
      { price: 145_000_000 },
      { price: 146_000_000 },
      { price: 148_000_000 },
      { price: 1_400_000_000 },
      { price: 1_400_000_000 },
      { price: 1_450_000_000 },
    ];
    const result = applyMadOutlierFilter(rows, (r) => r.price, opts);
    expect(result.applied).toBe(false);
    expect(result.reason_not_applied).toContain("too_many_outliers");
    expect(result.kept).toHaveLength(8);
  });

  it("renvoie médiane et MAD calculés même quand pas appliqué (sauf cas désactivé/n<min)", () => {
    // Cas mad_zero : on retourne quand même la médiane.
    const rows = [{ price: 50 }, { price: 50 }, { price: 50 }, { price: 50 }, { price: 50 }];
    const result = applyMadOutlierFilter(rows, (r) => r.price, opts);
    expect(result.median).toBe(50);
    expect(result.mad).toBe(0);
  });
});
