import { describe, expect, it } from "vitest";
import {
  normalizeBrand,
  normalizeModel,
  normalizeBodyStyle,
  normalizeFuel,
  normalizeTransmission,
  modeOf,
} from "../../scripts/data/lib/normalize";

describe("normalizeBrand", () => {
  it("mappe les alias courants vers la marque canonique", () => {
    expect(normalizeBrand("VW").value).toBe("Volkswagen");
    expect(normalizeBrand("hundai").value).toBe("Hyundai");
    expect(normalizeBrand("citroën").value).toBe("Citroen");
    expect(normalizeBrand("HYUNDAI").value).toBe("Hyundai");
  });

  it("retourne la marque canonique inchangée si déjà normalisée", () => {
    expect(normalizeBrand("Toyota").value).toBe("Toyota");
    expect(normalizeBrand("Mercedes-Benz").value).toBe("Mercedes-Benz");
  });

  it("retourne null + unknown=true pour une marque non reconnue", () => {
    const r = normalizeBrand("UnknownBrandXYZ");
    expect(r.value).toBeNull();
    expect(r.unknown).toBe(true);
  });
});

describe("normalizeModel", () => {
  it("corrige les fautes de frappe fréquentes", () => {
    expect(normalizeModel("Nissan", "Quashqai").value).toBe("Qashqai");
    expect(normalizeModel("Kia", "Sorrento").value).toBe("Sorento");
    expect(normalizeModel("Hyundai", "Galoper").value).toBe("Galloper");
  });

  it("normalise X-Trail dans toutes ses variantes", () => {
    expect(normalizeModel("Nissan", "X-trail").value).toBe("X-Trail");
    expect(normalizeModel("Nissan", "Xtrail").value).toBe("X-Trail");
    expect(normalizeModel("Nissan", "X TRAIL").value).toBe("X-Trail");
  });

  it("normalise Land Cruiser dans toutes ses variantes", () => {
    expect(normalizeModel("Toyota", "Land cruiser").value).toBe("Land Cruiser");
    expect(normalizeModel("Toyota", "LandCruiser").value).toBe("Land Cruiser");
    expect(normalizeModel("Toyota", "Land-Cruiser").value).toBe("Land Cruiser");
  });

  it("normalise RAV-4 et RAV 4 vers RAV4", () => {
    expect(normalizeModel("Toyota", "RAV-4").value).toBe("RAV4");
    expect(normalizeModel("Toyota", "RAV 4").value).toBe("RAV4");
  });
});

describe("normalizeBodyStyle / Fuel / Transmission", () => {
  it("normalise les variantes body style", () => {
    expect(normalizeBodyStyle("Pick-up").value).toBe("pickup");
    expect(normalizeBodyStyle("4x4").value).toBe("suv");
    expect(normalizeBodyStyle("Berline").value).toBe("sedan");
  });

  it("normalise les variantes carburant", () => {
    expect(normalizeFuel("Essence").value).toBe("petrol");
    expect(normalizeFuel("DIESEL").value).toBe("diesel");
    expect(normalizeFuel("Hybride").value).toBe("hybrid");
  });

  it("normalise les variantes transmission", () => {
    expect(normalizeTransmission("BVA").value).toBe("automatic");
    expect(normalizeTransmission("BVM").value).toBe("manual");
    expect(normalizeTransmission("Manuelle").value).toBe("manual");
  });
});

describe("modeOf", () => {
  it("retourne la valeur la plus fréquente, en ignorant null", () => {
    expect(modeOf(["pickup", "suv", "pickup", null, "pickup"]).mode).toBe("pickup");
  });

  it("est déterministe (tie-break lexicographique)", () => {
    const r = modeOf(["b", "a", "b", "a"]);
    expect(r.mode).toBe("a");
    expect(r.isAmbiguous).toBe(true);
  });

  it("retourne null si tableau vide ou tout null", () => {
    expect(modeOf([]).mode).toBeNull();
    expect(modeOf([null, null]).mode).toBeNull();
  });
});
