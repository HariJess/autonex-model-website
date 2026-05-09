import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AGENCY_SPOTLIGHT_CREDIT_COST,
  BOOST_CREDIT_COSTS,
  BOOST_DURATION_DAYS,
  CREDIT_PACKS_CANONICAL,
  LISTING_PUBLISH_CREDIT_COST,
} from "@/config/monetization";

/**
 * Audit fix M11 — sanity check that the TS fallback in src/config/monetization.ts
 * stays aligned with the canonical SQL migration seeds. If a developer tweaks
 * one side without the other, paid traffic drifts (the UI shows price A, the DB
 * grants credits B), which is a real-money bug. CI catches it before deploy.
 *
 * Strategy: read the relevant SQL migrations as text, regex-extract the literal
 * INSERT/UPDATE values, compare to the TS exports. No DB connection. Deterministic.
 *
 * Updated 2026-05-04 (PROMPT 2) : credit_pricing initial seed lives in
 * 20260418220000 mais les valeurs courantes viennent du PROMPT 1
 * (20260503160000) qui a fait UPDATE sur 4 clés et INSERT sur 9 nouvelles.
 * On merge les deux pour reconstituer l'état canonique. Pour credit_packs,
 * la migration PROMPT 1 fait DELETE + INSERT 4 nouveaux packs (discover/
 * standard/pro/power) — on lit uniquement celle-ci.
 */

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, "..", "..", "supabase", "migrations");

function readSql(filename: string): string {
  return readFileSync(resolve(migrationsDir, filename), "utf-8");
}

describe("monetization — credit_pricing TS ↔ SQL drift (M11, post-PROMPT 1)", () => {
  // 1. Initial seed (6 clés) depuis 20260418220000
  const initialSql = readSql("20260418220000_credit_pricing_single_source.sql");
  // 2. UPDATEs + nouveaux INSERTs depuis 20260503160000 (PROMPT 1 realignment)
  const realignSql = readSql("20260503160000_credits_monetization_realignment.sql");

  const seed: Record<string, number> = {};

  // Parse INSERT INTO public.credit_pricing (key, amount, description) VALUES
  //   ('publish_listing', 100, '...'),
  //   ...
  // Description peut contenir des apostrophes échappées en SQL (''). Le pattern
  // (?:[^']|'')* accepte n'importe quel caractère sauf une apostrophe simple,
  // ou bien deux apostrophes consécutives.
  const insertSeedRegex = /\(\s*'([a-z_0-9]+)'\s*,\s*(\d+)\s*,\s*'(?:[^']|'')*'\s*\)/g;
  for (const match of initialSql.matchAll(insertSeedRegex)) {
    seed[match[1]] = Number(match[2]);
  }
  for (const match of realignSql.matchAll(insertSeedRegex)) {
    seed[match[1]] = Number(match[2]);
  }

  // Parse UPDATE public.credit_pricing SET amount = N WHERE key = 'X';
  const updateRegex = /UPDATE\s+public\.credit_pricing\s+SET\s+amount\s*=\s*(\d+)\s+WHERE\s+key\s*=\s*'([a-z_0-9]+)'/gi;
  for (const match of realignSql.matchAll(updateRegex)) {
    seed[match[2]] = Number(match[1]);
  }

  it("merge initial seed + PROMPT 1 changes → 15 clés canoniques", () => {
    // 6 initiales (publish_listing + 4 boost_* + agency_spotlight)
    // + 9 nouvelles (publish_listing_60d, renewal_listing, boost_bump,
    //   boost_top_ad, boost_combo, boost_video, boost_express_pack,
    //   verified_seller_year, signup_bonus)
    expect(Object.keys(seed).sort()).toEqual([
      "agency_spotlight",
      "boost_bump",
      "boost_combo",
      "boost_daily_bump",
      "boost_express_pack",
      "boost_featured",
      "boost_top",
      "boost_top_ad",
      "boost_urgent",
      "boost_video",
      "publish_listing",
      "publish_listing_60d",
      "renewal_listing",
      "signup_bonus",
      "verified_seller_year",
    ]);
  });

  it("LISTING_PUBLISH_CREDIT_COST matches publish_listing post-PROMPT 1 (25000)", () => {
    expect(LISTING_PUBLISH_CREDIT_COST).toBe(seed.publish_listing);
    expect(seed.publish_listing).toBe(25_000);
  });

  it("BOOST_CREDIT_COSTS matches boost_* seeds post-PROMPT 1", () => {
    expect(BOOST_CREDIT_COSTS.urgent).toBe(seed.boost_urgent);
    expect(BOOST_CREDIT_COSTS.daily_bump).toBe(seed.boost_daily_bump);
    expect(BOOST_CREDIT_COSTS.featured).toBe(seed.boost_featured);
    expect(BOOST_CREDIT_COSTS.top).toBe(seed.boost_top);
  });

  it("AGENCY_SPOTLIGHT_CREDIT_COST matches agency_spotlight (inchangé PROMPT 1)", () => {
    expect(AGENCY_SPOTLIGHT_CREDIT_COST).toBe(seed.agency_spotlight);
  });
});

describe("monetization — credit_packs TS ↔ SQL drift (M11, post-PROMPT 3.5)", () => {
  // PROMPT 3.5 (20260504160000) fait DELETE FROM credit_packs puis INSERT
  // les 6 nouveaux packs (discover, standard, pro, power, business, enterprise)
  // avec colonnes : (id, name, display_name, credits_amount, bonus_credits,
  // price_mga, sort_order, is_active)
  const sql = readSql("20260504160000_credit_packs_recalibration_v2.sql");

  // Match 8-tuples : ('discover', 'Pack Découverte', 'Pack Découverte', 10000, 0, 10000, 1, true)
  const packRegex =
    /\(\s*'([a-z_]+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(true|false)\s*\)/g;
  type SqlPack = {
    id: string;
    name: string;
    display_name: string;
    credits_amount: number;
    bonus_credits: number;
    price_mga: number;
    sort_order: number;
    is_active: boolean;
  };
  const seedPacks: SqlPack[] = [];
  for (const match of sql.matchAll(packRegex)) {
    seedPacks.push({
      id: match[1],
      name: match[2],
      display_name: match[3],
      credits_amount: Number(match[4]),
      bonus_credits: Number(match[5]),
      price_mga: Number(match[6]),
      sort_order: Number(match[7]),
      is_active: match[8] === "true",
    });
  }

  it("extracts exactly 6 packs from PROMPT 3.5 seed", () => {
    expect(seedPacks).toHaveLength(6);
    expect(seedPacks.map((p) => p.id)).toEqual([
      "discover",
      "standard",
      "pro",
      "power",
      "business",
      "enterprise",
    ]);
  });

  it("CREDIT_PACKS_CANONICAL has the same length as the SQL seed", () => {
    expect(CREDIT_PACKS_CANONICAL).toHaveLength(seedPacks.length);
  });

  it("each TS pack matches the SQL pack of the same id (name, credits, bonus, price, sort)", () => {
    for (const tsPack of CREDIT_PACKS_CANONICAL) {
      const sqlPack = seedPacks.find((p) => p.id === tsPack.id);
      expect(sqlPack, `no SQL pack for id ${tsPack.id}`).toBeDefined();
      expect(tsPack.name).toBe(sqlPack!.name);
      expect(tsPack.credits_amount).toBe(sqlPack!.credits_amount);
      expect(tsPack.bonus_credits).toBe(sqlPack!.bonus_credits);
      expect(tsPack.price_mga).toBe(sqlPack!.price_mga);
      expect(tsPack.sort_order).toBe(sqlPack!.sort_order);
    }
  });

  it("ratio 1:1 strict — price_mga === credits_amount pour chaque pack du seed", () => {
    for (const pack of seedPacks) {
      expect(pack.price_mga).toBe(pack.credits_amount);
    }
  });
});

describe("monetization — boost durations TS ↔ SQL drift (M11)", () => {
  // BOOST_DURATION_DAYS in src/config/monetization.ts must match the
  // `interval 'N days'` branches in purchase_listing_boosts (and the parallel
  // moderation-approve path uses identical durations by design).
  // Inchangé par PROMPT 1+2 (purchase_listing_boosts pas modifiée).
  const sql = readSql("20260414143000_purchase_listing_boosts.sql");

  // WHEN 'urgent' THEN now() + interval '14 days'
  const durationRegex =
    /WHEN\s+'([a-z_]+)'\s+THEN\s+now\(\)\s*\+\s*interval\s+'(\d+)\s+days?'/g;
  const seedDurations: Record<string, number> = {};
  for (const match of sql.matchAll(durationRegex)) {
    seedDurations[match[1]] = Number(match[2]);
  }

  it("extracts the 4 boost durations from the SQL", () => {
    expect(Object.keys(seedDurations).sort()).toEqual([
      "daily_bump",
      "featured",
      "top",
      "urgent",
    ]);
  });

  it("BOOST_DURATION_DAYS matches the SQL CASE branches", () => {
    expect(BOOST_DURATION_DAYS.urgent).toBe(seedDurations.urgent);
    expect(BOOST_DURATION_DAYS.daily_bump).toBe(seedDurations.daily_bump);
    expect(BOOST_DURATION_DAYS.featured).toBe(seedDurations.featured);
    expect(BOOST_DURATION_DAYS.top).toBe(seedDurations.top);
  });
});
