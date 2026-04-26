import { describe, expect, it } from "vitest";
import {
  applyListingFilters,
  buildLocationSubareaOrFilter,
  sanitizeIlikeTerm,
  type FilterableListingQuery,
} from "@/lib/listingQueryFilters";

describe("sanitizeIlikeTerm", () => {
  it("strips PostgREST-breaking punctuation", () => {
    expect(sanitizeIlikeTerm("foo%bar_(test)")).toBe("foo bar test");
  });
});

describe("buildLocationSubareaOrFilter", () => {
  it("returns null when nothing usable remains", () => {
    expect(buildLocationSubareaOrFilter([], [])).toBeNull();
    expect(buildLocationSubareaOrFilter(["  ", "%"], [])).toBeNull();
  });

  it("builds ilike clauses for arrondissements and quartiers", () => {
    const s = buildLocationSubareaOrFilter(["Premier"], ["Mahamasina"]);
    expect(s).toContain("arrondissement.ilike.%Premier%");
    expect(s).toContain("quartier.ilike.%Mahamasina%");
    expect(s).toContain("quartier_libre.ilike.%Mahamasina%");
  });
});

describe("applyListingFilters", () => {
  function mockQuery(): FilterableListingQuery & {
    ops: Array<{ kind: string; payload: unknown }>;
  } {
    const ops: Array<{ kind: string; payload: unknown }> = [];
    const chain: FilterableListingQuery & { ops: typeof ops } = {
      ops,
      eq(col: string, val: unknown) {
        ops.push({ kind: "eq", payload: [col, val] });
        return chain;
      },
      gte(col: string, val: unknown) {
        ops.push({ kind: "gte", payload: [col, val] });
        return chain;
      },
      lte(col: string, val: unknown) {
        ops.push({ kind: "lte", payload: [col, val] });
        return chain;
      },
      or(s: string) {
        ops.push({ kind: "or", payload: s });
        return chain;
      },
      in(col: string, vals: readonly unknown[]) {
        ops.push({ kind: "in", payload: [col, vals] });
        return chain;
      },
      ilike(col: string, pattern: string) {
        ops.push({ kind: "ilike", payload: [col, pattern] });
        return chain;
      },
    };
    return chain;
  }

  it("adds location sub-area OR after ville when arr/quartiers present", () => {
    const q = mockQuery();
    applyListingFilters(q, {
      ville: "Antananarivo",
      arrondissements: ["Premier"],
      quartiers: [],
      searchRelaxation: false,
    });
    expect(q.ops.some((o) => o.kind === "eq" && (o.payload as string[])[0] === "ville")).toBe(true);
    expect(q.ops.some((o) => o.kind === "or" && String(o.payload).includes("arrondissement.ilike"))).toBe(true);
  });

  it("does not relax price max when searchRelaxation is false", () => {
    const q = mockQuery();
    applyListingFilters(q, {
      priceMax: 10_000_000,
      searchRelaxation: false,
    });
    const lte = q.ops.find((o) => o.kind === "lte");
    expect(lte?.payload).toEqual(["price_mga", 10_000_000]);
  });
});
