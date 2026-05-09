/**
 * Passe 7 — calibrage du decay annuel par régression log-linéaire.
 *
 * Couvre :
 *   - régression linéaire pure → decay correct
 *   - n < min_obs → fallback default
 *   - year_span < min → fallback default
 *   - decay aberrant (>20%) → clippé + non calibré
 *   - R² < seuil → non calibré
 *   - prix tous identiques → fallback (denY = 0 → r² = 0)
 *
 * Note : le clipping se fait dans [0.04, 0.20] (pipeline default). Au-delà
 * de ces bornes la régression est jugée trop instable et on retombe sur le
 * default.
 */

import { describe, expect, it } from "vitest";
import {
  calibrateDecayLogLinear,
  type DecayCalibrationOptions,
} from "../../scripts/data/lib/calibrate";

const baseOpts: DecayCalibrationOptions = {
  minObs: 4,
  minYearSpan: 4,
  defaultDecay: 0.1,
  clipRange: [0.04, 0.2],
  minRSquared: 0.3,
};

/**
 * Génère une série synthétique price(year) = baselinePrice * (1 - decay)^(baselineYear - year).
 */
function syntheticSeries(
  baselineYear: number,
  baselinePrice: number,
  decay: number,
  years: number[],
): { year: number; price_ar: number }[] {
  return years.map((y) => ({
    year: y,
    price_ar: Math.round(baselinePrice * Math.pow(1 - decay, baselineYear - y)),
  }));
}

describe("calibrateDecayLogLinear", () => {
  it("retrouve un decay synthétique de 8% sur 6 obs propres", () => {
    const obs = syntheticSeries(2024, 100_000_000, 0.08, [
      2018,
      2019,
      2020,
      2021,
      2022,
      2023,
    ]);
    const result = calibrateDecayLogLinear(obs, baseOpts);
    expect(result.calibrated).toBe(true);
    expect(Math.abs(result.decay - 0.08)).toBeLessThan(0.005);
    expect(result.r_squared).toBeGreaterThan(0.95);
  });

  it("fallback default si n_obs < minObs", () => {
    const obs = [
      { year: 2020, price_ar: 50_000_000 },
      { year: 2021, price_ar: 45_000_000 },
      { year: 2022, price_ar: 40_000_000 },
    ];
    const result = calibrateDecayLogLinear(obs, baseOpts);
    expect(result.calibrated).toBe(false);
    expect(result.decay).toBe(baseOpts.defaultDecay);
  });

  it("fallback default si year_span < minYearSpan", () => {
    const obs = [
      { year: 2022, price_ar: 50_000_000 },
      { year: 2022, price_ar: 52_000_000 },
      { year: 2023, price_ar: 48_000_000 },
      { year: 2023, price_ar: 51_000_000 },
    ];
    const result = calibrateDecayLogLinear(obs, baseOpts);
    expect(result.calibrated).toBe(false);
    expect(result.decay).toBe(baseOpts.defaultDecay);
  });

  it("decay aberrant (régression > clipMax) → clippé et non calibré", () => {
    // Série qui chute de 50%/an : 100M → 50M → 25M → 12.5M sur 4 ans.
    const obs = syntheticSeries(2024, 100_000_000, 0.5, [2020, 2021, 2022, 2023, 2024]);
    const result = calibrateDecayLogLinear(obs, baseOpts);
    // Decay calculé ≈ 0.5, clip → 0.2, mais clamped !== raw donc non calibrated.
    expect(result.calibrated).toBe(false);
    expect(result.decay).toBe(baseOpts.defaultDecay);
  });

  it("R² < seuil → non calibré (data bruitée)", () => {
    // Prix complètement aléatoires sur des années diverses → R² faible.
    const obs = [
      { year: 2018, price_ar: 50_000_000 },
      { year: 2019, price_ar: 80_000_000 },
      { year: 2020, price_ar: 30_000_000 },
      { year: 2021, price_ar: 90_000_000 },
      { year: 2022, price_ar: 20_000_000 },
      { year: 2023, price_ar: 70_000_000 },
    ];
    const result = calibrateDecayLogLinear(obs, { ...baseOpts, minRSquared: 0.8 });
    expect(result.calibrated).toBe(false);
    expect(result.decay).toBe(baseOpts.defaultDecay);
  });

  it("prix tous identiques → r² = 0, non calibré, decay default", () => {
    const obs = [
      { year: 2018, price_ar: 50_000_000 },
      { year: 2019, price_ar: 50_000_000 },
      { year: 2020, price_ar: 50_000_000 },
      { year: 2021, price_ar: 50_000_000 },
      { year: 2022, price_ar: 50_000_000 },
    ];
    const result = calibrateDecayLogLinear(obs, baseOpts);
    expect(result.calibrated).toBe(false);
    expect(result.decay).toBe(baseOpts.defaultDecay);
    expect(result.r_squared).toBe(0);
  });

  it("decay calibré dans la zone [clipMin, clipMax] passe", () => {
    // Toyota Hilux profil typique : 5% decay sur 7 ans.
    const obs = syntheticSeries(2024, 150_000_000, 0.05, [
      2017,
      2018,
      2019,
      2020,
      2021,
      2022,
      2023,
    ]);
    const result = calibrateDecayLogLinear(obs, baseOpts);
    expect(result.calibrated).toBe(true);
    expect(result.decay).toBeGreaterThanOrEqual(0.04);
    expect(result.decay).toBeLessThanOrEqual(0.2);
    expect(Math.abs(result.decay - 0.05)).toBeLessThan(0.005);
  });
});
