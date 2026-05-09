import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_TRANSACTION_FACTORS,
  fetchTransactionFactors,
  resolveFactorKey,
  type AppConfigSupabaseClient,
  type TransactionFactorsConfig,
} from "@/lib/estimation/transactionFactors";

/**
 * PROMPT 10A — Tests Tâche 2 : helper transactionFactors.ts (9 cas + bonus).
 */

describe("PROMPT 10A — resolveFactorKey", () => {
  it("TF-1 : 'Particulier Facebook' → facebook_particulier", () => {
    expect(resolveFactorKey("Particulier Facebook", "market_clean")).toBe("facebook_particulier");
  });

  it("TF-2 : 'Revendeur Facebook' → facebook_revendeur", () => {
    expect(resolveFactorKey("Revendeur Facebook", "market_clean")).toBe("facebook_revendeur");
  });

  it("TF-3 : 'REVENDEUR FACEBOOK' (uppercase) → facebook_revendeur (tolérance casing)", () => {
    expect(resolveFactorKey("REVENDEUR FACEBOOK", "market_clean")).toBe("facebook_revendeur");
  });

  it("TF-4 : 'Concessionnaire officiel' → concessionnaire_officiel", () => {
    expect(resolveFactorKey("Concessionnaire officiel", "market_clean")).toBe(
      "concessionnaire_officiel",
    );
  });

  it("TF-5 : null seller + sourceOrigin='autonex_active' → autonex_active (override)", () => {
    expect(resolveFactorKey(null, "autonex_active")).toBe("autonex_active");
    expect(resolveFactorKey(undefined, "autonex_active")).toBe("autonex_active");
    // Override prend le pas même si sellerType est explicite
    expect(resolveFactorKey("Revendeur Facebook", "autonex_active")).toBe("autonex_active");
  });

  it("TF-6 : null seller + sourceOrigin='unknown' → unknown (safe default)", () => {
    expect(resolveFactorKey(null, "unknown")).toBe("unknown");
    expect(resolveFactorKey(undefined, "unknown")).toBe("unknown");
    expect(resolveFactorKey("", "unknown")).toBe("unknown");
  });

  it("TF-bonus : 'partner' → partner, 'manual' → manual", () => {
    expect(resolveFactorKey("partner", "market_clean")).toBe("partner");
    expect(resolveFactorKey("manual", "market_clean")).toBe("manual");
  });

  it("TF-bonus : 'transaction confirmed' → transaction_confirmed", () => {
    expect(resolveFactorKey("transaction confirmed", "market_clean")).toBe("transaction_confirmed");
    expect(resolveFactorKey("Transaction Confirmed Notary", "market_clean")).toBe(
      "transaction_confirmed",
    );
  });

  it("TF-bonus : seller libre non reconnu → unknown", () => {
    expect(resolveFactorKey("Random Seller XYZ", "market_clean")).toBe("unknown");
  });
});

describe("PROMPT 10A — FALLBACK_TRANSACTION_FACTORS shape sanity", () => {
  it("TF-7 : FALLBACK contient toutes les clés factors + price_format_multipliers", () => {
    const f = FALLBACK_TRANSACTION_FACTORS;
    expect(f.version).toBeDefined();
    expect(f.factors.facebook_particulier).toBe(0.93);
    expect(f.factors.facebook_revendeur).toBe(0.87);
    expect(f.factors.autonex_active).toBe(0.96);
    expect(f.factors.concessionnaire_officiel).toBe(0.97);
    expect(f.factors.partner).toBe(0.97);
    expect(f.factors.manual).toBe(0.95);
    expect(f.factors.transaction_confirmed).toBe(1.0);
    expect(f.factors.unknown).toBe(0.9);
    expect(f.price_format_multipliers.trade_in_pro).toBe(0.78);
    expect(f.price_format_multipliers.private_market).toBe(1.0);
    expect(f.price_format_multipliers.dealer_retail).toBe(1.15);
  });

  it("TF-7-bonus : tous les factors sont dans [0.65, 1.10] (sanity bornes)", () => {
    const f = FALLBACK_TRANSACTION_FACTORS;
    for (const v of Object.values(f.factors)) {
      expect(v).toBeGreaterThanOrEqual(0.65);
      expect(v).toBeLessThanOrEqual(1.1);
    }
  });
});

describe("PROMPT 10A — fetchTransactionFactors (mocked supabase)", () => {
  function makeMockClient(opts: {
    data?: { value: unknown } | null;
    error?: { message: string } | null;
    throws?: unknown;
  }): AppConfigSupabaseClient {
    return {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (opts.throws) throw opts.throws;
              return {
                data: opts.data ?? null,
                error: opts.error ?? null,
              };
            }),
          })),
        })),
      })),
    };
  }

  it("TF-8 : valid payload → config parsée correctement", async () => {
    const validValue: TransactionFactorsConfig = {
      version: "v2_2026_05_11",
      factors: {
        facebook_particulier: 0.93,
        facebook_revendeur: 0.87,
        autonex_active: 0.96,
        concessionnaire_officiel: 0.97,
        partner: 0.97,
        manual: 0.95,
        transaction_confirmed: 1.0,
        unknown: 0.9,
      },
      price_format_multipliers: {
        trade_in_pro: 0.78,
        private_market: 1.0,
        dealer_retail: 1.15,
      },
      last_updated: "2026-05-11T00:00:00Z",
    };
    const client = makeMockClient({ data: { value: validValue } });
    const cfg = await fetchTransactionFactors(client);
    expect(cfg.version).toBe("v2_2026_05_11");
    expect(cfg.factors.facebook_revendeur).toBe(0.87);
    expect(cfg.price_format_multipliers.dealer_retail).toBe(1.15);
  });

  it("TF-9a : Supabase error → return FALLBACK (resilience)", async () => {
    const client = makeMockClient({ error: { message: "RLS denied" } });
    const cfg = await fetchTransactionFactors(client);
    expect(cfg).toBe(FALLBACK_TRANSACTION_FACTORS);
  });

  it("TF-9b : data null (row missing) → return FALLBACK", async () => {
    const client = makeMockClient({ data: null });
    const cfg = await fetchTransactionFactors(client);
    expect(cfg).toBe(FALLBACK_TRANSACTION_FACTORS);
  });

  it("TF-9c : malformed payload (missing factors) → return FALLBACK", async () => {
    const client = makeMockClient({
      data: { value: { version: "x", factors: { facebook_particulier: 0.93 } } },
    });
    const cfg = await fetchTransactionFactors(client);
    expect(cfg).toBe(FALLBACK_TRANSACTION_FACTORS);
  });

  it("TF-9d : query throws (network) → return FALLBACK (catch)", async () => {
    const client = makeMockClient({ throws: new Error("network down") });
    const cfg = await fetchTransactionFactors(client);
    expect(cfg).toBe(FALLBACK_TRANSACTION_FACTORS);
  });
});
