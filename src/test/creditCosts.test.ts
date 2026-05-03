/**
 * Drift detector — vérifie la cohérence entre :
 *   - CREDIT_PACKS_CANONICAL (catalogue canonique des packs)
 *   - CREDIT_PACK_BONUSES (map id → breakdown utilisé en UI)
 *   - constantes individuelles de coûts (LISTING_PUBLISH_*, BOOST_*, etc.)
 *
 * Si un dev change un pack dans CREDIT_PACKS_CANONICAL mais oublie de
 * mettre à jour CREDIT_PACK_BONUSES, ce test casse → on rattrape avant prod.
 *
 * NOTE : la cohérence avec la DB (`credit_pricing` table) ne peut pas être
 * vérifiée en unit test sans secrets Supabase. Voir le test plan manuel
 * post-deploy dans le rapport Phase 4 du PROMPT 2.
 */

import { describe, expect, it } from "vitest";
import {
  BOOST_COSTS_V2,
  BOOST_CREDIT_COSTS,
  CREDIT_PACK_BONUSES,
  CREDIT_PACKS_CANONICAL,
  LISTING_PUBLISH_60D_CREDIT_COST,
  LISTING_PUBLISH_CREDIT_COST,
  LISTING_RENEWAL_CREDIT_COST,
  SIGNUP_BONUS_CREDIT_AMOUNT,
  SIGNUP_GRANT_EXPIRY_DAYS,
  VERIFIED_SELLER_YEAR_CREDIT_COST,
} from "@/config/monetization";
import {
  describeCreditCost,
  describePackBreakdown,
  formatAriary,
  formatCredits,
} from "@/features/credits/lib/creditFormatting";

describe("monetization constants — drift detector", () => {
  it("CREDIT_PACK_BONUSES match CREDIT_PACKS_CANONICAL pour chaque id", () => {
    for (const pack of CREDIT_PACKS_CANONICAL) {
      const bonus = CREDIT_PACK_BONUSES[pack.id];
      expect(bonus, `bonuses missing for pack ${pack.id}`).toBeDefined();
      expect(bonus.base).toBe(pack.credits_amount);
      expect(bonus.bonus).toBe(pack.bonus_credits);
      expect(bonus.total).toBe(pack.credits_amount + pack.bonus_credits);
    }
  });

  it("CREDIT_PACK_BONUSES n'a pas d'id orphelin", () => {
    const canonicalIds = new Set(CREDIT_PACKS_CANONICAL.map((p) => p.id));
    for (const id of Object.keys(CREDIT_PACK_BONUSES)) {
      expect(canonicalIds.has(id as (typeof CREDIT_PACKS_CANONICAL)[number]["id"])).toBe(true);
    }
  });

  it("bonusPct est cohérent avec base + bonus", () => {
    for (const [id, b] of Object.entries(CREDIT_PACK_BONUSES)) {
      const expectedPct = b.base === 0 ? 0 : Math.round((b.bonus / b.base) * 100);
      expect(b.bonusPct, `bonusPct mismatch for ${id}`).toBe(expectedPct);
    }
  });

  it("ratio 1:1 strict — price_mga === credits_amount pour chaque pack", () => {
    for (const pack of CREDIT_PACKS_CANONICAL) {
      expect(pack.price_mga).toBe(pack.credits_amount);
    }
  });

  it("4 packs canonical (post-PROMPT 1)", () => {
    expect(CREDIT_PACKS_CANONICAL).toHaveLength(4);
    expect(CREDIT_PACKS_CANONICAL.map((p) => p.id)).toEqual([
      "discover",
      "standard",
      "pro",
      "power",
    ]);
  });

  it("constantes lifecycle alignées avec PROMPT 1+2", () => {
    expect(LISTING_PUBLISH_CREDIT_COST).toBe(25_000);
    expect(LISTING_PUBLISH_60D_CREDIT_COST).toBe(40_000);
    expect(LISTING_RENEWAL_CREDIT_COST).toBe(15_000);
    expect(SIGNUP_BONUS_CREDIT_AMOUNT).toBe(100_000);
    expect(VERIFIED_SELLER_YEAR_CREDIT_COST).toBe(75_000);
    expect(SIGNUP_GRANT_EXPIRY_DAYS).toBe(90);
  });

  it("BOOST_COSTS_V2 valeurs alignées avec credit_pricing", () => {
    expect(BOOST_COSTS_V2.bump).toBe(5_000);
    expect(BOOST_COSTS_V2.featured_7d).toBe(30_000);
    expect(BOOST_COSTS_V2.top_ad_30d).toBe(100_000);
    expect(BOOST_COSTS_V2.combo).toBe(120_000);
    expect(BOOST_COSTS_V2.video).toBe(15_000);
    expect(BOOST_COSTS_V2.express_pack).toBe(60_000);
  });

  it("BOOST_CREDIT_COSTS legacy : valeurs alignées avec credit_pricing post-PROMPT 1", () => {
    // boost_urgent et agency_spotlight non touchés par PROMPT 1
    expect(BOOST_CREDIT_COSTS.urgent).toBe(20);
    // Aligned avec UPDATE PROMPT 1
    expect(BOOST_CREDIT_COSTS.daily_bump).toBe(5_000);
    expect(BOOST_CREDIT_COSTS.featured).toBe(30_000);
    expect(BOOST_CREDIT_COSTS.top).toBe(100_000);
  });
});

describe("creditFormatting helpers", () => {
  it("formatCredits gère pluriel et séparateur fr-MG", () => {
    expect(formatCredits(0)).toMatch(/0\s*crédit/);
    expect(formatCredits(1)).toMatch(/1\s*crédit/);
    expect(formatCredits(2)).toMatch(/2\s*crédits/);
    expect(formatCredits(127_500)).toMatch(/crédits$/);
    expect(formatCredits(127_500)).toContain("127");
  });

  it("formatCredits robuste face aux entrées invalides", () => {
    expect(formatCredits(NaN)).toBe("0 crédit");
    expect(formatCredits(Infinity)).toBe("0 crédit");
  });

  it("formatAriary suffixe Ar et arrondi", () => {
    expect(formatAriary(0)).toBe("0 Ar");
    expect(formatAriary(127_500)).toMatch(/Ar$/);
    expect(formatAriary(127_500.7)).toMatch(/127\D?501\s*Ar/);
  });

  it("describeCreditCost retourne libellé FR pour clés connues", () => {
    expect(describeCreditCost("publish_listing")).toContain("Publication");
    expect(describeCreditCost("signup_bonus")).toContain("offerts");
    expect(describeCreditCost("boost_top_ad")).toContain("Top Annonce");
  });

  it("describeCreditCost fallback non-fatal sur clé inconnue", () => {
    expect(describeCreditCost("unknown_key")).toBe("unknown_key");
  });

  it("describePackBreakdown affiche base + bonus pour packs avec bonus", () => {
    expect(describePackBreakdown("discover")).toMatch(/10\D?000\s*crédits/);
    expect(describePackBreakdown("standard")).toContain("bonus");
    expect(describePackBreakdown("power")).toContain("130");
  });
});
