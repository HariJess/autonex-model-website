import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static sanity checks on Mission 2.B migrations. These do NOT hit a real
 * database — they guard against accidental deletion of critical SQL clauses
 * (RLS enable, unique constraint, trigger wiring, immonex_is_admin guards,
 * log_admin_action audit trail). When a migration file is legitimately
 * modified, update this test in the same commit.
 */

const root = resolve(__dirname, "..", "..");
const migration = (name: string) =>
  readFileSync(resolve(root, "supabase", "migrations", name), "utf8");

describe("Mission 2.B migration files — sanity", () => {
  const tableSql = migration("20260421110000_listing_reports_table.sql");
  const triggerSql = migration("20260421120000_listing_reports_auto_hide_trigger.sql");
  const createRpcSql = migration("20260421130000_rpc_create_listing_report.sql");
  const adminRpcSql = migration("20260421140000_rpc_admin_moderation_queue.sql");

  it("listing_reports table has RLS enabled and UNIQUE(listing_id, reporter_id)", () => {
    expect(tableSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.listing_reports/);
    expect(tableSql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(tableSql).toMatch(/UNIQUE \(listing_id, reporter_id\)/);
    expect(tableSql).toMatch(/details_required_for_other/);
    expect(tableSql).toMatch(/CHECK \(reason IN/);
  });

  it("listing_reports has the three RLS policies (insert, select, update)", () => {
    expect(tableSql).toMatch(/CREATE POLICY "users_can_insert_reports"/);
    expect(tableSql).toMatch(/CREATE POLICY "users_see_own_reports_admin_sees_all"/);
    expect(tableSql).toMatch(/CREATE POLICY "admin_can_update_reports"/);
  });

  it("auto-hide trigger fires AFTER INSERT only (unidirectional)", () => {
    expect(triggerSql).toMatch(/AFTER INSERT ON public\.listing_reports/);
    expect(triggerSql).not.toMatch(/AFTER UPDATE/);
    expect(triggerSql).not.toMatch(/AFTER DELETE/);
    expect(triggerSql).toMatch(/v_pending_count >= 3/);
    expect(triggerSql).toMatch(/hidden_pending_review/);
  });

  it("auto-hide writes a system audit entry with actor_user_id = NULL", () => {
    expect(triggerSql).toMatch(/INSERT INTO public\.admin_audit_log/);
    expect(triggerSql).toMatch(/system_auto_hide_listing_reports_threshold/);
  });

  it("create_listing_report RPC guards all business rules", () => {
    for (const code of [
      "unauthenticated",
      "invalid_reason",
      "details_required",
      "listing_not_found",
      "cannot_report_own_listing",
      "listing_not_active",
      "already_reported",
    ]) {
      expect(createRpcSql).toContain(code);
    }
    expect(createRpcSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.create_listing_report/);
  });

  it("admin RPCs are guarded by immonex_is_admin and SECURITY DEFINER", () => {
    expect(adminRpcSql).toMatch(/admin_moderation_queue/);
    expect(adminRpcSql).toMatch(/admin_dismiss_listing_reports/);
    expect(adminRpcSql).toMatch(/admin_validate_listing_reports/);
    // All three must guard.
    const guardMatches = adminRpcSql.match(/public\.immonex_is_admin\(\)/g) ?? [];
    expect(guardMatches.length).toBeGreaterThanOrEqual(3);
    const defMatches = adminRpcSql.match(/SECURITY DEFINER/g) ?? [];
    expect(defMatches.length).toBeGreaterThanOrEqual(3);
  });

  it("admin moderation queue supports the 4 documented filters", () => {
    expect(adminRpcSql).toMatch(/'new'/);
    expect(adminRpcSql).toMatch(/'reports'/);
    expect(adminRpcSql).toMatch(/'history'/);
    expect(adminRpcSql).toMatch(/'all'/);
  });

  it("dismiss / validate RPCs log admin actions + use SELECT FOR UPDATE", () => {
    expect(adminRpcSql).toMatch(/log_admin_action\(\s*'dismiss_listing_reports'/);
    expect(adminRpcSql).toMatch(/log_admin_action\(\s*'validate_listing_reports'/);
    const forUpdateCount = (adminRpcSql.match(/FOR UPDATE/g) ?? []).length;
    expect(forUpdateCount).toBeGreaterThanOrEqual(2);
  });
});
