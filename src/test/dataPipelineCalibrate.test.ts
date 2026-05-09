import { describe, expect, it } from "vitest";
import { calibrateGroup, type Observation } from "../../scripts/data/lib/calibrate";

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

function syntheticDecaySeries(baselineYear: number, baselinePrice: number, decay: number, years: number[]): Observation[] {
  return years.map((y) => ({
    year: y,
    price_ar: Math.round(baselinePrice * Math.pow(1 - decay, baselineYear - y)),
    source: "fb_scrap" as const,
    vehicle_status: "occasion" as const,
  }));
}

describe("calibrateGroup", () => {
  it("retrouve un decay synthétique de 10% à epsilon près", () => {
    const obs = syntheticDecaySeries(2024, 100_000_000, 0.1, [2024, 2022, 2020, 2018, 2016, 2015]);
    const r = calibrateGroup(obs, baseOpts);
    expect(r).not.toBeNull();
    if (!r || r.kind !== "regression") throw new Error("attendu regression");
    expect(Math.abs(r.annual_depreciation_rate - 0.1)).toBeLessThan(0.01);
    expect(r.baseline_year).toBeLessThanOrEqual(2025);
    expect(Math.abs(r.baseline_price_ar - 100_000_000) / 100_000_000).toBeLessThan(0.05);
  });

  it("clippe les decays aberrants vers le défaut", () => {
    // série stable (decay ~ 0) → en dehors [0.04, 0.2] → clip
    const obs: Observation[] = [
      { year: 2018, price_ar: 50_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2019, price_ar: 50_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2020, price_ar: 50_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2021, price_ar: 50_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2022, price_ar: 50_000_000, source: "fb_scrap", vehicle_status: "occasion" },
    ];
    const r = calibrateGroup(obs, baseOpts);
    expect(r).not.toBeNull();
    if (!r || r.kind !== "regression") throw new Error("attendu regression");
    expect(r.decay_clipped).toBe(true);
    expect(r.annual_depreciation_rate).toBe(0.1);
  });

  it("utilise le median anchor quand obs >= 3 mais span insuffisant", () => {
    const obs: Observation[] = [
      { year: 2021, price_ar: 80_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2021, price_ar: 90_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2022, price_ar: 100_000_000, source: "fb_scrap", vehicle_status: "occasion" },
    ];
    const r = calibrateGroup(obs, baseOpts);
    expect(r).not.toBeNull();
    if (!r || r.kind !== "median_anchor") throw new Error("attendu median_anchor");
    expect(r.annual_depreciation_rate).toBe(0.1);
    expect(r.sample_size).toBe(3);
  });

  it("utilise le neuf anchor pour 1-2 obs avec dealer Neuf", () => {
    const obs: Observation[] = [
      { year: 2025, price_ar: 200_000_000, source: "dealer", vehicle_status: "neuf" },
    ];
    const r = calibrateGroup(obs, baseOpts);
    expect(r).not.toBeNull();
    if (!r || r.kind !== "neuf_anchor") throw new Error("attendu neuf_anchor");
    expect(r.baseline_price_ar).toBe(200_000_000);
  });

  it("retourne null si une seule observation FB sans dealer", () => {
    const obs: Observation[] = [
      { year: 2020, price_ar: 50_000_000, source: "fb_scrap", vehicle_status: "occasion" },
    ];
    const r = calibrateGroup(obs, baseOpts);
    expect(r).toBeNull();
  });

  it("autorise un ancrage FB-only quand tier_c_policy.allow_fb_only=true", () => {
    const obs: Observation[] = [
      { year: 2018, price_ar: 40_000_000, source: "fb_scrap", vehicle_status: "occasion" },
      { year: 2019, price_ar: 50_000_000, source: "fb_scrap", vehicle_status: "occasion" },
    ];
    const r = calibrateGroup(obs, { ...baseOpts, allow_fb_only_anchor: true, min_observations_fb_only: 2 });
    expect(r).not.toBeNull();
    if (!r || r.kind !== "neuf_anchor") throw new Error("attendu kind=neuf_anchor (FB-only fallback)");
    expect(r.sample_size).toBe(2);
  });
});
