/**
 * Passe 4 — bucketing générationnel.
 *
 * Couvre :
 *   - applyGenerationBuckets : split correct, modèles non listés inchangés,
 *     années hors bucket rejetées, suffixe label correct.
 *   - getBucketsForModel : remontée correcte des buckets configurés (utilisé
 *     dans build-reference-profiles.ts pour enforcer min_obs).
 *   - validateModelGenerationsConfig : throw sur chevauchements / bornes
 *     invalides.
 *
 * Hors scope : le respect de `min_obs` est appliqué dans buildProfiles
 * (build-reference-profiles.ts) ; on vérifie ici que le bucket exposé par
 * getBucketsForModel porte bien la valeur attendue, l'enforcement lui-même
 * est testé indirectement par la régénération du pipeline.
 */

import { describe, expect, it } from "vitest";
import {
  applyGenerationBuckets,
  bucketedModelName,
  getBucketsForModel,
  parseBucketedModelName,
} from "../../scripts/data/lib/generation-buckets";
import {
  modelGenerationsConfig,
  validateModelGenerationsConfig,
  type ModelGenerationsConfig,
} from "../../scripts/data/lib/configs";

type TestRow = {
  brand_canonical: string | null;
  model_canonical: string | null;
  year: number | null;
  price_ar: number;
};

const tucsonRow = (year: number, price: number): TestRow => ({
  brand_canonical: "Hyundai",
  model_canonical: "Tucson",
  year,
  price_ar: price,
});

describe("applyGenerationBuckets", () => {
  it("splitte un modèle multi-génération en deux profils distincts", () => {
    const rows: TestRow[] = [
      tucsonRow(2010, 35_000_000),
      tucsonRow(2011, 38_000_000),
      tucsonRow(2012, 40_000_000),
      tucsonRow(2013, 42_000_000),
      tucsonRow(2014, 45_000_000),
      tucsonRow(2022, 140_000_000),
      tucsonRow(2023, 145_000_000),
      tucsonRow(2024, 150_000_000),
    ];
    const { kept, rejected } = applyGenerationBuckets(rows, modelGenerationsConfig);
    expect(rejected).toHaveLength(0);
    expect(kept).toHaveLength(8);
    const models = new Set(kept.map((r) => r.model_canonical));
    expect(models).toEqual(new Set(["Tucson (2004-2015)", "Tucson (2016-2026)"]));
    const oldGen = kept.filter((r) => r.model_canonical === "Tucson (2004-2015)");
    expect(oldGen).toHaveLength(5);
    expect(oldGen.every((r) => r._original_model === "Tucson")).toBe(true);
    expect(oldGen.every((r) => r._generation_bucket_label === "2004-2015")).toBe(true);
  });

  it("ne touche pas un modèle non listé dans model_generations.json", () => {
    const rows: TestRow[] = [
      { brand_canonical: "Kia", model_canonical: "Sorento", year: 2018, price_ar: 60_000_000 },
      { brand_canonical: "Kia", model_canonical: "Sorento", year: 2019, price_ar: 65_000_000 },
      { brand_canonical: "Kia", model_canonical: "Sorento", year: 2020, price_ar: 70_000_000 },
      { brand_canonical: "Kia", model_canonical: "Sorento", year: 2021, price_ar: 75_000_000 },
      { brand_canonical: "Kia", model_canonical: "Sorento", year: 2022, price_ar: 80_000_000 },
    ];
    const { kept, rejected } = applyGenerationBuckets(rows, modelGenerationsConfig);
    expect(rejected).toHaveLength(0);
    expect(kept).toHaveLength(5);
    expect(kept.every((r) => r.model_canonical === "Sorento")).toBe(true);
    expect(kept.every((r) => r._original_model === undefined)).toBe(true);
  });

  it("rejette une ligne dont l'année est hors de tous les buckets configurés", () => {
    const rows: TestRow[] = [tucsonRow(1990, 20_000_000)];
    const { kept, rejected } = applyGenerationBuckets(rows, modelGenerationsConfig);
    expect(kept).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toContain("hors buckets générationnels");
    expect(rejected[0].reason).toContain("Tucson");
  });

  it("préserve le suffixe `(YYYY-YYYY)` exact dans model_canonical", () => {
    const rows: TestRow[] = [tucsonRow(2010, 40_000_000)];
    const { kept } = applyGenerationBuckets(rows, modelGenerationsConfig);
    expect(kept[0].model_canonical).toBe("Tucson (2004-2015)");
    expect(parseBucketedModelName(kept[0].model_canonical!)).toEqual({
      originalModel: "Tucson",
      label: "2004-2015",
    });
  });

  it("expose le min_obs configuré pour un bucket donné (Tucson 2016-2026 = 3)", () => {
    const buckets = getBucketsForModel("Hyundai", "Tucson", modelGenerationsConfig);
    expect(buckets).not.toBeNull();
    const recent = buckets!.find((b) => b.label === "2016-2026");
    expect(recent).toBeDefined();
    expect(recent!.min_obs).toBe(3);
    const old = buckets!.find((b) => b.label === "2004-2015");
    expect(old!.min_obs).toBe(5);
  });
});

describe("validateModelGenerationsConfig", () => {
  it("accepte la config réelle livrée dans le repo", () => {
    expect(() => validateModelGenerationsConfig(modelGenerationsConfig)).not.toThrow();
  });

  it("throw sur des buckets aux années qui se chevauchent", () => {
    const bad: ModelGenerationsConfig = {
      generations: {
        Hyundai: {
          Tucson: [
            { from: 2010, to: 2015, label: "2010-2015", min_obs: 3 },
            { from: 2014, to: 2020, label: "2014-2020", min_obs: 3 },
          ],
        },
      },
    };
    expect(() => validateModelGenerationsConfig(bad)).toThrow(/chevauchement/);
  });

  it("throw si from > to", () => {
    const bad: ModelGenerationsConfig = {
      generations: {
        Hyundai: {
          Tucson: [{ from: 2020, to: 2010, label: "2020-2010", min_obs: 3 }],
        },
      },
    };
    expect(() => validateModelGenerationsConfig(bad)).toThrow(/from .* > to/);
  });

  it("throw si années hors bornes [1985, 2026]", () => {
    const bad: ModelGenerationsConfig = {
      generations: {
        Hyundai: {
          Tucson: [{ from: 1980, to: 1990, label: "1980-1990", min_obs: 3 }],
        },
      },
    };
    expect(() => validateModelGenerationsConfig(bad)).toThrow(/hors bornes/);
  });
});

describe("bucketedModelName", () => {
  it("formatte `Modèle (label)` correctement", () => {
    expect(bucketedModelName("Tucson", "2004-2015")).toBe("Tucson (2004-2015)");
    expect(bucketedModelName("Land Cruiser", "2010-2020")).toBe("Land Cruiser (2010-2020)");
  });
});
