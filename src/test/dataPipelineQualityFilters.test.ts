import { describe, expect, it } from "vitest";
import { calibrateGroup, type Observation } from "../../scripts/data/lib/calibrate";
import { normalizeModel } from "../../scripts/data/lib/normalize";
import { modelBlacklistConfig, pipelineConfig } from "../../scripts/data/lib/configs";

const baseOpts = {
  default_annual_depreciation_rate: 0.1,
  decay_clip_min: 0.04,
  decay_clip_max: 0.2,
  year_pivot_cap: 2025,
  min_observations_for_strong: 5,
  min_observations_for_weak: 3,
  min_year_range_for_decay: 3,
  allow_fb_only_anchor: false,
  min_observations_fb_only: 2,
};

describe("Filtres qualité passe 3 (config)", () => {
  it("quality_filters.hard_reject_cv_above est défini", () => {
    expect(pipelineConfig.quality_filters?.hard_reject_cv_above).toBeGreaterThan(0);
    expect(pipelineConfig.quality_filters?.hard_reject_cv_above).toBeLessThanOrEqual(1);
  });

  it("quality_filters.hard_reject_year_span_above est défini", () => {
    expect(pipelineConfig.quality_filters?.hard_reject_year_span_above).toBeGreaterThan(0);
  });

  it("plausibility_floors expose au moins une règle pickup et une règle SUV", () => {
    const rules = pipelineConfig.plausibility_floors?.rules ?? [];
    expect(rules.some((r) => r.match.body_type === "pickup")).toBe(true);
    expect(rules.some((r) => r.match.body_type === "suv")).toBe(true);
  });

  it("plausibility_floors a une règle premium-brands à 12M Ar", () => {
    const rules = pipelineConfig.plausibility_floors?.rules ?? [];
    const premium = rules.find((r) => Array.isArray(r.match.make_in));
    expect(premium).toBeDefined();
    expect(premium?.min_price_ar).toBeGreaterThanOrEqual(10_000_000);
    expect(premium?.match.make_in).toContain("BMW");
  });

  it("model_blacklist.json est chargé et expose un objet blacklist", () => {
    expect(modelBlacklistConfig.blacklist).toBeDefined();
    expect(typeof modelBlacklistConfig.blacklist).toBe("object");
  });
});

describe("Filtres qualité passe 3 (comportement calibration synthétique)", () => {
  it("CV synthétique > 0.85 est calculé correctement", () => {
    // Prix très dispersés : 5M, 50M, 100M, 200M, 500M sur 5 obs span=4
    const obs: Observation[] = [
      { year: 2020, price_ar: 5_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2021, price_ar: 50_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2022, price_ar: 100_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2023, price_ar: 200_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2024, price_ar: 500_000_000, source: "fb_scrap", vehicle_status: "occasion" },
    ];
    const r = calibrateGroup(obs, baseOpts);
    expect(r).not.toBeNull();
    expect(r!.cv).toBeGreaterThan(0.85);
  });

  it("year_span synthétique > 22 est calculé correctement", () => {
    const obs: Observation[] = [
      { year: 1998, price_ar: 8_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2005, price_ar: 20_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2015, price_ar: 60_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2020, price_ar: 90_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2024, price_ar: 130_000_000, source: "fb_scrap", vehicle_status: "occasion" },
    ];
    const r = calibrateGroup(obs, baseOpts);
    expect(r).not.toBeNull();
    expect(r!.year_span).toBeGreaterThan(22);
  });
});

describe("DROP marker dans model_normalizations", () => {
  it("alias 'pride bonn' est marqué DROP → value=null + unknown=false", () => {
    const r = normalizeModel("Kia", "Pride Bonn");
    expect(r.value).toBeNull();
    expect(r.unknown).toBe(false);
  });

  it("alias 'pride slx' est fusionné vers Pride", () => {
    const r = normalizeModel("Kia", "Pride Slx");
    expect(r.value).toBe("Pride");
  });

  it("alias 'wingles' est fusionné vers 'Wingle 5'", () => {
    const r = normalizeModel("Great Wall", "Wingles");
    expect(r.value).toBe("Wingle 5");
  });

  it("alias 'cx90' est renommé en 'CX-90'", () => {
    const r = normalizeModel("Mazda", "Cx90");
    expect(r.value).toBe("CX-90");
  });

  it("alias 'glk' est renommé en 'GLK'", () => {
    const r = normalizeModel("Mercedes-Benz", "Glk");
    expect(r.value).toBe("GLK");
  });
});
