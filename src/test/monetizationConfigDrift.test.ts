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
 * INSERT values, compare to the TS exports. No DB connection. Deterministic.
 */

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, "..", "..", "supabase", "migrations");

function readSql(filename: string): string {
  return readFileSync(resolve(migrationsDir, filename), "utf-8");
}

describe("monetization — credit_pricing TS ↔ SQL drift (M11)", () => {
  const sql = readSql("20260418220000_credit_pricing_single_source.sql");

  // INSERT INTO public.credit_pricing (key, amount, description) VALUES
  //   ('publish_listing',   100, '...'),
  //   ...
  // ON CONFLICT (key) DO NOTHING;
  const seed: Record<string, number> = {};
  const seedRegex = /\(\s*'([a-z_]+)'\s*,\s*(\d+)\s*,\s*'[^']*'\s*\)/g;
  for (const match of sql.matchAll(seedRegex)) {
    seed[match[1]] = Number(match[2]);
  }

  it("extracts the 6 expected keys from the seed", () => {
    expect(Object.keys(seed).sort()).toEqual([
      "agency_spotlight",
      "boost_daily_bump",
      "boost_featured",
      "boost_top",
      "boost_urgent",
      "publish_listing",
    ]);
  });

  it("LISTING_PUBLISH_CREDIT_COST matches publish_listing seed", () => {
    expect(LISTING_PUBLISH_CREDIT_COST).toBe(seed.publish_listing);
  });

  it("BOOST_CREDIT_COSTS matches boost_* seeds", () => {
    expect(BOOST_CREDIT_COSTS.urgent).toBe(seed.boost_urgent);
    expect(BOOST_CREDIT_COSTS.daily_bump).toBe(seed.boost_daily_bump);
    expect(BOOST_CREDIT_COSTS.featured).toBe(seed.boost_featured);
    expect(BOOST_CREDIT_COSTS.top).toBe(seed.boost_top);
  });

  it("AGENCY_SPOTLIGHT_CREDIT_COST matches agency_spotlight seed", () => {
    expect(AGENCY_SPOTLIGHT_CREDIT_COST).toBe(seed.agency_spotlight);
  });
});

describe("monetization — credit_packs TS ↔ SQL drift (M11)", () => {
  // 20260411160000_monetization_packs_ladder.sql is the canonical 5-pack
  // ladder (it replaces the earlier 4-pack seed from 20260411140000). If a
  // future migration adds/edits packs, this test must read it instead.
  // Search for: INSERT INTO public.credit_packs across migrations.
  const sql = readSql("20260411160000_monetization_packs_ladder.sql");

  // ('cp_200', 'Pack 200 crédits', 200, 25000, 1)
  const packRegex =
    /\(\s*'(cp_\d+)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  type SqlPack = {
    id: string;
    name: string;
    credits_amount: number;
    price_mga: number;
    sort_order: number;
  };
  const seedPacks: SqlPack[] = [];
  for (const match of sql.matchAll(packRegex)) {
    seedPacks.push({
      id: match[1],
      name: match[2],
      credits_amount: Number(match[3]),
      price_mga: Number(match[4]),
      sort_order: Number(match[5]),
    });
  }

  it("extracts exactly 5 packs from the seed", () => {
    expect(seedPacks).toHaveLength(5);
  });

  it("CREDIT_PACKS_CANONICAL has the same length as the SQL seed", () => {
    expect(CREDIT_PACKS_CANONICAL).toHaveLength(seedPacks.length);
  });

  it("each TS pack matches the SQL pack of the same id (name, credits, price, sort)", () => {
    for (const tsPack of CREDIT_PACKS_CANONICAL) {
      const sqlPack = seedPacks.find((p) => p.id === tsPack.id);
      expect(sqlPack, `no SQL pack for id ${tsPack.id}`).toBeDefined();
      expect(tsPack.name).toBe(sqlPack!.name);
      expect(tsPack.credits_amount).toBe(sqlPack!.credits_amount);
      expect(tsPack.price_mga).toBe(sqlPack!.price_mga);
      expect(tsPack.sort_order).toBe(sqlPack!.sort_order);
    }
  });
});

describe("monetization — boost durations TS ↔ SQL drift (M11)", () => {
  // BOOST_DURATION_DAYS in src/config/monetization.ts must match the
  // `interval 'N days'` branches in purchase_listing_boosts (and the parallel
  // moderation-approve path uses identical durations by design).
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
