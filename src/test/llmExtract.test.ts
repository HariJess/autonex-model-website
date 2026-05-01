/**
 * Tests Sprint 2 — pipeline d'extraction LLM des annonces FB.
 *
 * Stratégie de mock :
 *   - On injecte un faux client Anthropic via __setClientForTests, ce qui évite
 *     de mocker tout le module @anthropic-ai/sdk et reste lisible.
 *   - Le cache disque est redirigé vers un fichier temp via setCachePath.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  __setClientForTests,
  computeCostUsd,
  extractFromText,
  getPricingFor,
  type ExtractedVehicle,
  type ExtractionResult,
} from "../../scripts/data/lib/llm-extract";
import {
  __resetCacheForTests,
  getFromCache,
  persistCache,
  setCachePath,
  setInCache,
} from "../../scripts/data/lib/llm-extract-cache";
import { runBatch } from "../../scripts/data/lib/llm-batch";

type MockMessagesCreate = ReturnType<typeof vi.fn>;

function makeMockClient(create: MockMessagesCreate): unknown {
  return { messages: { create } };
}

function makeToolUseResponse(input: ExtractedVehicle, usage = { input_tokens: 250, output_tokens: 80 }) {
  return {
    content: [{ type: "tool_use", name: "extract_vehicle", input }],
    usage,
  };
}

function fixtureExtracted(overrides: Partial<ExtractedVehicle> = {}): ExtractedVehicle {
  return {
    is_vehicle_listing: true,
    is_buyer_post: false,
    brand: "Toyota",
    model: "Hilux",
    year: 2018,
    mileage_km: 120000,
    price_ar: 80_000_000,
    currency_original: "Ar",
    fuel_type: "diesel",
    transmission: "manual",
    body_style: "pickup",
    condition: "good",
    city: "Antananarivo",
    confidence: 0.85,
    ...overrides,
  };
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(resolve(tmpdir(), "autonex-llm-test-"));
  setCachePath(resolve(tmpDir, "cache.json"));
});

afterEach(() => {
  __setClientForTests(null);
  __resetCacheForTests();
  rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("getPricingFor / computeCostUsd", () => {
  it("retourne les tarifs Haiku 4.5 par défaut", () => {
    const p = getPricingFor("claude-haiku-4-5");
    expect(p).toEqual({ input: 1.0, output: 5.0 });
  });

  it("retourne les tarifs Haiku 3.5 (legacy)", () => {
    const p = getPricingFor("claude-3-5-haiku-20241022");
    expect(p).toEqual({ input: 0.8, output: 4.0 });
  });

  it("calcule le coût en $ d'après les tokens (Haiku 4.5)", () => {
    const cost = computeCostUsd("claude-haiku-4-5", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(6.0, 6);
  });

  it("fallback prudent ($1/$5) sur un modèle inconnu", () => {
    const p = getPricingFor("modele-mystere");
    expect(p).toEqual({ input: 1.0, output: 5.0 });
  });
});

describe("extractFromText (mock SDK)", () => {
  it("retourne ExtractionResult valide quand le LLM renvoie un tool_use", async () => {
    const create = vi.fn().mockResolvedValue(makeToolUseResponse(fixtureExtracted()));
    __setClientForTests(makeMockClient(create) as never);

    const r = await extractFromText("post-1", "Vends Toyota Hilux 2018 80M Ar TBE");
    expect(r.error).toBeNull();
    expect(r.extracted).not.toBeNull();
    expect(r.extracted?.brand).toBe("Toyota");
    expect(r.extracted?.price_ar).toBe(80_000_000);
    expect(r.inputTokens).toBe(250);
    expect(r.outputTokens).toBe(80);
    expect(r.costUsd).toBeGreaterThan(0);
    expect(create).toHaveBeenCalledOnce();
  });

  it("renvoie error='no_tool_use_in_response' si content ne contient pas de tool_use", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "désolé je ne comprends pas" }],
      usage: { input_tokens: 100, output_tokens: 20 },
    });
    __setClientForTests(makeMockClient(create) as never);

    const r = await extractFromText("post-2", "blah");
    expect(r.error).toBe("no_tool_use_in_response");
    expect(r.extracted).toBeNull();
    expect(r.inputTokens).toBe(100); // tokens consommés malgré l'absence de tool_use
  });

  it("capture les exceptions SDK dans error et coût=0", async () => {
    const create = vi.fn().mockRejectedValue(new Error("rate_limit_exceeded"));
    __setClientForTests(makeMockClient(create) as never);

    const r = await extractFromText("post-3", "blah");
    expect(r.error).toBe("rate_limit_exceeded");
    expect(r.extracted).toBeNull();
    expect(r.costUsd).toBe(0);
  });

  it("propage le price_ar (en Ariary) quand le LLM convertit Fmg→Ar côté prompt", async () => {
    // Le system prompt force le LLM à retourner price_ar en Ariary, currency_original = "Fmg".
    const create = vi.fn().mockResolvedValue(
      makeToolUseResponse(
        fixtureExtracted({ price_ar: 20_000_000, currency_original: "Fmg" }),
      ),
    );
    __setClientForTests(makeMockClient(create) as never);

    const r = await extractFromText("post-4", "100M Fmg");
    expect(r.extracted?.price_ar).toBe(20_000_000);
    expect(r.extracted?.currency_original).toBe("Fmg");
  });
});

describe("llm-extract-cache", () => {
  it("get/set par hash de texte trimé", () => {
    expect(getFromCache("Vends Hilux 2018")).toBeUndefined();
    setInCache("Vends Hilux 2018", fixtureExtracted());
    const cached = getFromCache("Vends Hilux 2018");
    expect(cached?.brand).toBe("Toyota");
  });

  it("le whitespace en bordure ne change pas le hash", () => {
    setInCache("Vends Hilux 2018", fixtureExtracted());
    expect(getFromCache("  Vends Hilux 2018  ")?.brand).toBe("Toyota");
  });

  it("persiste sur disque et recharge à l'init", () => {
    setInCache("post A", fixtureExtracted({ brand: "Hyundai" }));
    persistCache();

    // Force un reload depuis disque en réinitialisant le cache mémoire
    // tout en gardant le même fichier.
    const cachePath = resolve(tmpDir, "cache.json");
    const onDisk = JSON.parse(readFileSync(cachePath, "utf-8"));
    const keys = Object.keys(onDisk);
    expect(keys).toHaveLength(1);
    expect(onDisk[keys[0]].extracted.brand).toBe("Hyundai");
  });

  it("différencie undefined (jamais vu) et null (LLM a renvoyé null)", () => {
    setInCache("post-non-vehicle", null);
    expect(getFromCache("post-non-vehicle")).toBeNull();
    expect(getFromCache("autre-post")).toBeUndefined();
  });
});

describe("runBatch — orchestrateur", () => {
  function writeCsv(path: string, rows: Array<Record<string, string>>): void {
    const headers = ["text", "facebookUrl", "time", "groupTitle", "user/id", "user/name"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const fields = headers.map((h) => {
        const v = r[h] ?? "";
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      });
      lines.push(fields.join(","));
    }
    writeFileSync(path, lines.join("\n") + "\n", "utf-8");
  }

  function csvPath(name: string): string {
    return resolve(tmpDir, name);
  }

  it("exclut les is_buyer_post et is_vehicle_listing=false du CSV de sortie", async () => {
    const inputPath = csvPath("input.csv");
    writeCsv(inputPath, [
      { text: "Vends Toyota Hilux 2018 TBE 80M Ar", facebookUrl: "u1", time: "2026-01-01T00:00:00Z", groupTitle: "g", "user/id": "x", "user/name": "Alice" },
      { text: "Mitady Hyundai i10 occasion à acheter", facebookUrl: "u2", time: "2026-01-02T00:00:00Z", groupTitle: "g", "user/id": "y", "user/name": "Bob" },
      { text: "Promo cosmétiques chez Sephora venez voir absolument", facebookUrl: "u3", time: "2026-01-03T00:00:00Z", groupTitle: "g", "user/id": "z", "user/name": "Charlie" },
    ]);

    const extractFn = vi.fn(async (postId: string, text: string): Promise<ExtractionResult> => {
      if (text.startsWith("Vends")) {
        return { postId, extracted: fixtureExtracted(), error: null, inputTokens: 100, outputTokens: 30, costUsd: 0.001 };
      }
      if (text.startsWith("Mitady")) {
        return { postId, extracted: fixtureExtracted({ is_buyer_post: true }), error: null, inputTokens: 100, outputTokens: 30, costUsd: 0.001 };
      }
      return { postId, extracted: fixtureExtracted({ is_vehicle_listing: false }), error: null, inputTokens: 100, outputTokens: 30, costUsd: 0.001 };
    });

    const summary = await runBatch({
      inputs: [inputPath],
      outputCsvPath: csvPath("out.csv"),
      budgetLogPath: csvPath("budget.json"),
      extractFn,
      progressEvery: 999,
    });

    expect(summary.uniquePosts).toBe(3);
    expect(summary.llmCalls).toBe(3);
    expect(summary.vehicleListingsExtracted).toBe(1);
    expect(summary.buyersSkipped).toBe(1);
    expect(summary.nonVehicleSkipped).toBe(1);

    const outCsv = readFileSync(csvPath("out.csv"), "utf-8");
    expect(outCsv).toContain("Toyota");
    expect(outCsv).not.toContain("Mitady"); // les buyers ne sont pas dans le CSV
    const dataLines = outCsv.trim().split("\n");
    expect(dataLines).toHaveLength(2); // header + 1 row
  });

  it("le cache court-circuite l'appel LLM sur un re-run", async () => {
    const inputPath = csvPath("input.csv");
    writeCsv(inputPath, [
      { text: "Vends Toyota Hilux 2018 TBE 80M Ar", facebookUrl: "u1", time: "", groupTitle: "g", "user/id": "x", "user/name": "Alice" },
    ]);

    const extractFn = vi.fn(async (postId: string): Promise<ExtractionResult> => ({
      postId,
      extracted: fixtureExtracted(),
      error: null,
      inputTokens: 100,
      outputTokens: 30,
      costUsd: 0.001,
    }));

    // Premier run — le LLM est appelé une fois.
    await runBatch({ inputs: [inputPath], outputCsvPath: csvPath("out1.csv"), budgetLogPath: csvPath("b1.json"), extractFn, progressEvery: 999 });
    expect(extractFn).toHaveBeenCalledTimes(1);

    // Deuxième run sur les mêmes inputs → 0 appel, tout vient du cache.
    const summary = await runBatch({ inputs: [inputPath], outputCsvPath: csvPath("out2.csv"), budgetLogPath: csvPath("b2.json"), extractFn, progressEvery: 999 });
    expect(extractFn).toHaveBeenCalledTimes(1); // toujours 1 (pas de nouvel appel)
    expect(summary.cacheHits).toBe(1);
    expect(summary.llmCalls).toBe(0);
  });

  it("budget guard arrête la boucle quand le coût cumulé dépasse le plafond", async () => {
    const inputPath = csvPath("input.csv");
    const rows = Array.from({ length: 10 }, (_, i) => ({
      text: `Vends véhicule unique ${i} TBE 50M Ar lorem ipsum dolor sit amet`,
      facebookUrl: `u${i}`,
      time: "",
      groupTitle: "g",
      "user/id": "x",
      "user/name": `Seller${i}`,
    }));
    writeCsv(inputPath, rows);

    // Chaque appel coûte $0.05 — budget $0.10 ⇒ ≤ 2 appels avant blocage.
    const extractFn = vi.fn(async (postId: string): Promise<ExtractionResult> => ({
      postId,
      extracted: fixtureExtracted(),
      error: null,
      inputTokens: 1_000,
      outputTokens: 1_000,
      costUsd: 0.05,
    }));

    const summary = await runBatch({
      inputs: [inputPath],
      outputCsvPath: csvPath("out.csv"),
      budgetLogPath: csvPath("budget.json"),
      budgetMaxUsd: 0.1,
      extractFn,
      progressEvery: 999,
    });

    expect(summary.budgetReached).toBe(true);
    // Au moins un appel, mais < 10 (budget arrête bien avant la fin).
    expect(summary.llmCalls).toBeGreaterThan(0);
    expect(summary.llmCalls).toBeLessThan(10);
    expect(summary.totalCostUsd).toBeGreaterThanOrEqual(0.1);

    const log = JSON.parse(readFileSync(csvPath("budget.json"), "utf-8"));
    expect(log.budgetReached).toBe(true);
    expect(typeof log.run_date).toBe("string");
  });

  it("dédoublonne les posts identiques entre 2 CSV inputs", async () => {
    const a = csvPath("a.csv");
    const b = csvPath("b.csv");
    const sharedText = "Vends Toyota Hilux 2018 TBE 80M Ar lorem ipsum dolor";
    writeCsv(a, [{ text: sharedText, facebookUrl: "u1", time: "", groupTitle: "g", "user/id": "x", "user/name": "Alice" }]);
    writeCsv(b, [{ text: sharedText, facebookUrl: "u2", time: "", groupTitle: "g", "user/id": "y", "user/name": "Alice" }]);

    const extractFn = vi.fn(async (postId: string): Promise<ExtractionResult> => ({
      postId,
      extracted: fixtureExtracted(),
      error: null,
      inputTokens: 100,
      outputTokens: 30,
      costUsd: 0.001,
    }));

    const summary = await runBatch({
      inputs: [a, b],
      outputCsvPath: csvPath("out.csv"),
      budgetLogPath: csvPath("budget.json"),
      extractFn,
      progressEvery: 999,
    });

    expect(summary.totalRows).toBe(2);
    expect(summary.uniquePosts).toBe(1);
    expect(summary.llmCalls).toBe(1);
  });

  it("filtre les posts trop courts (< minTextLength)", async () => {
    const inputPath = csvPath("input.csv");
    writeCsv(inputPath, [
      { text: "Trop court", facebookUrl: "u1", time: "", groupTitle: "g", "user/id": "x", "user/name": "Alice" },
      { text: "Un peu plus de trente caractères dans ce texte", facebookUrl: "u2", time: "", groupTitle: "g", "user/id": "y", "user/name": "Bob" },
    ]);

    const extractFn = vi.fn(async (postId: string): Promise<ExtractionResult> => ({
      postId,
      extracted: fixtureExtracted(),
      error: null,
      inputTokens: 100,
      outputTokens: 30,
      costUsd: 0.001,
    }));

    const summary = await runBatch({
      inputs: [inputPath],
      outputCsvPath: csvPath("out.csv"),
      budgetLogPath: csvPath("budget.json"),
      extractFn,
      progressEvery: 999,
    });

    expect(summary.uniquePosts).toBe(1);
    expect(summary.llmCalls).toBe(1);
  });
});
