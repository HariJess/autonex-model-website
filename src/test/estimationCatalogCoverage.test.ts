import { describe, expect, it } from "vitest";
import { loadVehicleCatalog } from "@/lib/estimation/vehicleCatalog";
import { isCatalogOptionMatch } from "@/lib/estimation/catalogSearch";

function getModelsForMake(
  entries: Array<{ make: string; models: string[] }>,
  make: string,
): string[] {
  return entries.find((entry) => entry.make.toLowerCase() === make.toLowerCase())?.models ?? [];
}

describe("Estimation catalog coverage and discoverability", () => {
  it("keeps major priority makes materially populated", async () => {
    const payload = await loadVehicleCatalog();
    const counts = {
      Ford: getModelsForMake(payload.entries, "Ford").length,
      Toyota: getModelsForMake(payload.entries, "Toyota").length,
      Mazda: getModelsForMake(payload.entries, "Mazda").length,
      Hyundai: getModelsForMake(payload.entries, "Hyundai").length,
      Suzuki: getModelsForMake(payload.entries, "Suzuki").length,
      Nissan: getModelsForMake(payload.entries, "Nissan").length,
      Volkswagen: getModelsForMake(payload.entries, "Volkswagen").length,
      Isuzu: getModelsForMake(payload.entries, "Isuzu").length,
      Honda: getModelsForMake(payload.entries, "Honda").length,
      Peugeot: getModelsForMake(payload.entries, "Peugeot").length,
      BMW: getModelsForMake(payload.entries, "BMW").length,
    };

    Object.values(counts).forEach((count) => expect(count).toBeGreaterThanOrEqual(4));
    expect(counts.Ford).toBeGreaterThanOrEqual(12);
    expect(counts.Toyota).toBeGreaterThanOrEqual(14);
    expect(counts.Mazda).toBeGreaterThanOrEqual(12);
    expect(counts.Hyundai).toBeGreaterThanOrEqual(12);
  });

  it("contains expected flagship/common models for key makes", async () => {
    const payload = await loadVehicleCatalog();
    const ford = getModelsForMake(payload.entries, "Ford");
    const toyota = getModelsForMake(payload.entries, "Toyota");
    const mazda = getModelsForMake(payload.entries, "Mazda");

    expect(ford).toContain("EcoSport");
    expect(ford).toContain("Ranger");
    expect(toyota).toContain("Corolla");
    expect(toyota).toContain("Hilux");
    expect(mazda).toContain("Mazda 2");
    expect(mazda).toContain("MX-5");
  });

  it("ensures normalized search discoverability for critical inputs", async () => {
    const payload = await loadVehicleCatalog();
    const ford = getModelsForMake(payload.entries, "Ford");
    const toyota = getModelsForMake(payload.entries, "Toyota");
    const mazda = getModelsForMake(payload.entries, "Mazda");
    const nissan = getModelsForMake(payload.entries, "Nissan");
    const hyundai = getModelsForMake(payload.entries, "Hyundai");
    const suzuki = getModelsForMake(payload.entries, "Suzuki");
    const vw = getModelsForMake(payload.entries, "Volkswagen");

    expect(ford.some((m) => isCatalogOptionMatch(m, "ecosport"))).toBe(true);
    expect(ford.some((m) => isCatalogOptionMatch(m, "ranger"))).toBe(true);
    expect(toyota.some((m) => isCatalogOptionMatch(m, "corollacross"))).toBe(true);
    expect(mazda.some((m) => isCatalogOptionMatch(m, "mazda2"))).toBe(true);
    expect(mazda.some((m) => isCatalogOptionMatch(m, "mx5"))).toBe(true);
    expect(nissan.some((m) => isCatalogOptionMatch(m, "xtrail"))).toBe(true);
    expect(hyundai.some((m) => isCatalogOptionMatch(m, "grandi10"))).toBe(true);
    expect(suzuki.some((m) => isCatalogOptionMatch(m, "grandvitara"))).toBe(true);
    expect(vw.some((m) => isCatalogOptionMatch(m, "tcross"))).toBe(true);
  });
});
