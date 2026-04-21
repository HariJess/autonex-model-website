import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..", "..");
const migration = (name: string) =>
  readFileSync(resolve(root, "supabase", "migrations", name), "utf8");

describe("Mission 3 migration files — sanity", () => {
  const tableSql = migration("20260421150000_contact_messages_table.sql");
  const rpcSql = migration("20260421160000_rpc_submit_contact_message.sql");

  it("contact_messages table has RLS + 3 policies (insert anon+auth, admin read, admin update)", () => {
    expect(tableSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.contact_messages/);
    expect(tableSql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(tableSql).toMatch(/CREATE POLICY "anyone_can_submit_contact"[\s\S]+?FOR INSERT[\s\S]+?TO anon, authenticated/);
    expect(tableSql).toMatch(/CREATE POLICY "admin_read_contact_messages"[\s\S]+?FOR SELECT/);
    expect(tableSql).toMatch(/CREATE POLICY "admin_update_contact_messages"[\s\S]+?FOR UPDATE/);
  });

  it("contact_messages enforces consent_given = true + subject + name/message length", () => {
    expect(tableSql).toMatch(/CONSTRAINT consent_required CHECK \(consent_given = true\)/);
    expect(tableSql).toMatch(/CHECK \(subject IN \('general', 'technical', 'dealers', 'partnerships', 'other'\)\)/);
    expect(tableSql).toMatch(/LENGTH\(TRIM\(full_name\)\) BETWEEN 2 AND 100/);
    expect(tableSql).toMatch(/LENGTH\(TRIM\(message\)\) BETWEEN 20 AND 2000/);
  });

  it("submit_contact_message RPC rate limits at 3/hour/email", () => {
    expect(rpcSql).toMatch(/v_recent_count >= 3/);
    expect(rpcSql).toMatch(/NOW\(\) - INTERVAL '1 hour'/);
    expect(rpcSql).toMatch(/rate_limit_exceeded/);
  });

  it("submit_contact_message RPC guards consent + subject validity", () => {
    expect(rpcSql).toMatch(/consent_required/);
    expect(rpcSql).toMatch(/invalid_subject/);
    expect(rpcSql).toMatch(/SECURITY DEFINER/);
    expect(rpcSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.submit_contact_message.+TO anon, authenticated/);
  });
});
