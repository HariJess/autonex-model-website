/**
 * PROMPT 10E — Tests Couche 2 : modelProximity.
 */

import { describe, expect, it } from "vitest";
import {
  MODEL_PROXIMITY,
  PROXIMITY_SIMILARITY_CEILING,
  findProxyModels,
  proximityFactorMid,
  type ModelProximityConfig,
} from "@/lib/estimation/modelProximity";

describe("PROMPT 10E — findProxyModels", () => {
  it("retourne la config Toyota Land Cruiser Prado avec proxyModels non vide", () => {
    const cfg = findProxyModels("Toyota", "Land Cruiser Prado");
    expect(cfg).not.toBeNull();
    expect(cfg!.proxyModels.length).toBeGreaterThan(0);
    expect(cfg!.proximityLabel).toContain("Toyota");
  });

  it("retourne null pour un modèle inconnu", () => {
    expect(findProxyModels("Foo", "Bar")).toBeNull();
  });

  it("est case-insensitive sur le lookup", () => {
    expect(findProxyModels("toyota", "land cruiser prado")).not.toBeNull();
    expect(findProxyModels("TOYOTA", "LAND CRUISER PRADO")).not.toBeNull();
  });

  it("Toyota Hilux a au moins 4 proxy (incluant cross-marques)", () => {
    const cfg = findProxyModels("Toyota", "Hilux");
    expect(cfg).not.toBeNull();
    expect(cfg!.proxyModels.length).toBeGreaterThanOrEqual(4);
  });
});

describe("PROMPT 10E — MODEL_PROXIMITY structure", () => {
  it("toutes les configs ont la structure attendue", () => {
    for (const [key, cfg] of Object.entries(MODEL_PROXIMITY)) {
      expect(key).toMatch(/\|/);
      expect(Array.isArray(cfg.proxyModels)).toBe(true);
      expect(cfg.proxyModels.length).toBeGreaterThan(0);
      expect(cfg.priceFactorRange).toHaveLength(2);
      expect(typeof cfg.proximityLabel).toBe("string");
      expect(cfg.proximityLabel.length).toBeGreaterThan(0);
    }
  });

  // Borne haute relâchée à 2.0 (sprint engine v2 — extension full-size US +
  // Lexus). Garde-fou : au-delà de 2.0 = signal de proxy mal calibré.
  // Cas légitimes au-dessus de 1.5 :
  //   - Pickups full-size US (Silverado / F-150 / Ram 1500 / Sierra / Tundra)
  //     vs mid-size jap (Hilux / Ranger / Navara) = ratio prix réel 1.2-1.7×
  //   - Lexus LX vs Land Cruiser (sister technique luxury) = ratio 1.5-1.9×
  it("priceFactorRange : [min, max] valides et dans [0.5, 2.0]", () => {
    for (const cfg of Object.values(MODEL_PROXIMITY)) {
      const [min, max] = cfg.priceFactorRange;
      expect(min).toBeLessThanOrEqual(max);
      expect(min).toBeGreaterThanOrEqual(0.5);
      expect(max).toBeLessThanOrEqual(2.0);
    }
  });

  it("proxyModels : chaque entrée est au format Make|Model non vide", () => {
    for (const cfg of Object.values(MODEL_PROXIMITY)) {
      for (const proxy of cfg.proxyModels) {
        expect(proxy).toMatch(/^[^|]+\|[^|]+$/);
      }
    }
  });

  it("aucun modèle n'est son propre proxy", () => {
    for (const [key, cfg] of Object.entries(MODEL_PROXIMITY)) {
      expect(cfg.proxyModels.includes(key)).toBe(false);
    }
  });
});

describe("PROMPT 10E — proximityFactorMid", () => {
  it("retourne la moyenne du range", () => {
    const cfg: ModelProximityConfig = {
      proxyModels: ["Foo|Bar"],
      priceFactorRange: [0.85, 1.10],
      proximityLabel: "Test",
    };
    expect(proximityFactorMid(cfg)).toBeCloseTo(0.975, 3);
  });

  it("Toyota Land Cruiser Prado factor médian ~0.975", () => {
    const cfg = findProxyModels("Toyota", "Land Cruiser Prado")!;
    const mid = proximityFactorMid(cfg);
    expect(mid).toBeGreaterThan(0.9);
    expect(mid).toBeLessThan(1.05);
  });
});

describe("PROMPT 10E — PROXIMITY_SIMILARITY_CEILING", () => {
  it("plafond 75 (vs 100 pour exact)", () => {
    expect(PROXIMITY_SIMILARITY_CEILING).toBe(75);
  });
});
