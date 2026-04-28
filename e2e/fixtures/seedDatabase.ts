import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_USERS } from "./testUsers";

/**
 * Build an admin Supabase client that bypasses RLS via the service-role key.
 *
 * NEVER call this from app runtime code — only from E2E setup / cleanup.
 * The service-role key must live in env vars only (not in the client bundle).
 */
function adminClient(supabaseUrl: string, serviceRoleKey: string): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findUserByEmail(client: SupabaseClient, email: string): Promise<string | null> {
  // listUsers() is paginated — the test project should have well under 1000 users.
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  return data.users.find((u) => u.email === email)?.id ?? null;
}

/**
 * Idempotent seed of the buyer and admin test users.
 *
 * Schema notes:
 * - profiles.role is the user_role enum: "particulier" | "agence" | "promoteur" | "admin"
 *   (from migration 20260413130500_profiles_rls_hardening.sql).
 * - immonex_is_admin() checks profiles.role = 'admin'.
 * - profiles row is auto-created on signup by an existing trigger; we just
 *   bump the role to "admin" for the admin test user after creation.
 */
export async function seedE2EUsers(supabaseUrl: string, serviceRoleKey: string) {
  const admin = adminClient(supabaseUrl, serviceRoleKey);

  for (const role of ["buyer", "admin"] as const) {
    const user = TEST_USERS[role];
    let userId = await findUserByEmail(admin, user.email);

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.fullName, e2e: true },
      });
      if (error) throw new Error(`createUser ${role} failed: ${error.message}`);
      userId = data.user?.id ?? null;
      if (!userId) throw new Error(`createUser ${role} returned no id`);
    }

    if (role === "admin") {
      const { error: roleErr } = await admin
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", userId);
      if (roleErr) {
        // Non-fatal — log so the test run can surface this if admin-only RPCs fail.
        console.warn(
          `[E2E] Could not promote ${user.email} to admin role: ${roleErr.message}. ` +
            `Verify the profiles row exists for this user.`,
        );
      }
    }
  }
}

/**
 * Cleanup E2E artifacts created by tests.
 * Idempotent and bounded (last hour) so we don't accidentally delete real data.
 */
export async function cleanupE2EData(supabaseUrl: string, serviceRoleKey: string) {
  const admin = adminClient(supabaseUrl, serviceRoleKey);
  const buyerId = await findUserByEmail(admin, TEST_USERS.buyer.email);
  if (!buyerId) return;

  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

  // Order matters: delete events before transactions/listings to avoid FK clashes.
  await admin.from("partner_ad_events").delete().gte("occurred_at", oneHourAgo).is("user_id", null);
  await admin.from("transactions").delete().eq("user_id", buyerId).gte("created_at", oneHourAgo);
  await admin
    .from("credits_ledger")
    .delete()
    .eq("user_id", buyerId)
    .gte("created_at", oneHourAgo)
    .neq("reason", "e2e_test_grant");
  await admin
    .from("listings")
    .delete()
    .eq("owner_id", buyerId)
    .like("title", "E2E Test Listing%");
}

/**
 * Grant credits directly via the ledger for tests that need a positive balance
 * (e.g. publish-path). Idempotent: marked with reason="e2e_test_grant" so we
 * only insert once and cleanup leaves it alone.
 */
export async function grantE2ECredits(
  supabaseUrl: string,
  serviceRoleKey: string,
  delta: number,
): Promise<void> {
  const admin = adminClient(supabaseUrl, serviceRoleKey);
  const buyerId = await findUserByEmail(admin, TEST_USERS.buyer.email);
  if (!buyerId) throw new Error("Buyer not seeded");

  const { data: existing } = await admin
    .from("credits_ledger")
    .select("id")
    .eq("user_id", buyerId)
    .eq("reason", "e2e_test_grant")
    .maybeSingle();

  if (existing) return;

  const { error } = await admin.from("credits_ledger").insert({
    user_id: buyerId,
    delta,
    reason: "e2e_test_grant",
    ref_type: "e2e",
  });
  if (error) throw new Error(`grantE2ECredits failed: ${error.message}`);
}

/**
 * Insert a fake `pending` transaction so admin-approval tests can run without
 * actually triggering the vpi-initiate-payment edge function (which would talk
 * to vanilla-pay.net). Returns the inserted transaction id.
 */
export async function insertPendingTransaction(
  supabaseUrl: string,
  serviceRoleKey: string,
  packId: string,
  amountMga: number,
): Promise<string> {
  const admin = adminClient(supabaseUrl, serviceRoleKey);
  const buyerId = await findUserByEmail(admin, TEST_USERS.buyer.email);
  if (!buyerId) throw new Error("Buyer not seeded");

  const { data, error } = await admin
    .from("transactions")
    .insert({
      user_id: buyerId,
      credit_pack_id: packId,
      amount_mga: amountMga,
      status: "pending",
      method: "vanilla_pay",
      provider: "vanilla_pay",
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertPendingTransaction failed: ${error.message}`);
  return data.id;
}
