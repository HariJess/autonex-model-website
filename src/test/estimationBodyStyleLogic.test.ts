import { describe, expect, it } from "vitest";
import { loadVehicleCatalog, resolveModelBodyTypes } from "@/lib/estimation/vehicleCatalog";

describe("Estimation body-style intelligence", () => {
  it("auto-resolves unique body styles for obvious models", async () => {
    const { entries } = await loadVehicleCatalog();

    expect(resolveModelBodyTypes(entries, "Ford", "Ranger")).toEqual(["pickup"]);
    expect(resolveModelBodyTypes(entries, "Ford", "EcoSport")).toEqual(["suv"]);
    expect(resolveModelBodyTypes(entries, "Mazda", "MX-5")).toEqual(["convertible"]);
  });

  it("keeps multi-body models selectable when ambiguity is real", async () => {
    const { entries } = await loadVehicleCatalog();

    expect(resolveModelBodyTypes(entries, "Toyota", "Corolla")).toEqual(
      expect.arrayContaining(["sedan", "hatchback"]),
    );
    expect(resolveModelBodyTypes(entries, "Mazda", "Mazda 3")).toEqual(
      expect.arrayContaining(["sedan", "hatchback"]),
    );
  });

  it("falls back safely when model has no curated body-style metadata", async () => {
    const { entries } = await loadVehicleCatalog();

    expect(resolveModelBodyTypes(entries, "Audi", "A1")).toEqual([]);
    expect(resolveModelBodyTypes(entries, "Unknown", "Model")).toEqual([]);
  });
});

