import { describe, expect, it } from "vitest";
import fr from "@/i18n/fr.json";
import en from "@/i18n/en.json";
import mg from "@/i18n/mg.json";

function flattenStrings(obj: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      const p = prefix ? `${prefix}.${k}` : k;
      flattenStrings((obj as Record<string, unknown>)[k], p, out);
    }
  } else if (typeof obj === "string") {
    out[prefix] = obj;
  }
  return out;
}

describe("i18n locale parity", () => {
  it("fr, en, and mg expose the same leaf keys", () => {
    const frFlat = flattenStrings(fr);
    const enFlat = flattenStrings(en);
    const mgFlat = flattenStrings(mg);

    const frKeys = Object.keys(frFlat).sort();
    const enKeys = Object.keys(enFlat).sort();
    const mgKeys = Object.keys(mgFlat).sort();

    expect(enKeys).toEqual(frKeys);
    expect(mgKeys).toEqual(frKeys);
  });

  it("covers critical namespaces used at runtime", () => {
    const frFlat = flattenStrings(fr);
    for (const key of [
      "nav.publish",
      "nav.estimation",
      "common.language",
      "publish.title",
      "listing.contact",
      "search.applyFilters",
      "estimation.start",
    ]) {
      expect(frFlat[key]).toBeTruthy();
    }
  });
});
