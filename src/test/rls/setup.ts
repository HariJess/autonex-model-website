import { createServiceClient } from "./client-factory";

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Crée un user via service_role + attend la matérialisation du profile par
 * le trigger `handle_new_user`. Le trigger crée toujours `role='particulier'`
 * par défaut — pour `role='admin'` ou `role='agence'` on UPDATE après coup.
 */
export async function createTestUser(
  role: "particulier" | "agence" | "admin" = "particulier",
  emailPrefix = "rls-test",
): Promise<TestUser> {
  const service = createServiceClient();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${emailPrefix}-${uniqueId}@autonex-rls-test.local`;
  const password = `TestPassword!${uniqueId}`;

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Test User ${uniqueId}`,
      phone: "+261340000000",
    },
  });

  if (error) throw new Error(`createUser failed: ${error.message}`);
  if (!data.user) throw new Error("createUser returned no user");

  await new Promise((r) => setTimeout(r, 300));

  if (role !== "particulier") {
    const { error: updErr } = await service
      .from("profiles")
      .update({ role })
      .eq("id", data.user.id);
    if (updErr) throw new Error(`update role ${role} failed: ${updErr.message}`);
  }

  return { id: data.user.id, email, password };
}

/**
 * Cleanup: deletes the auth.users row, which cascades to profiles + all
 * user-owned data via FK ON DELETE CASCADE chains set up in migrations.
 * "User not found" is silenced because tests may double-cleanup defensively.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error && !/not found/i.test(error.message)) {
    console.warn(`deleteTestUser warning for ${userId}: ${error.message}`);
  }
}

/**
 * Cleanup users from previous test runs that crashed before afterEach.
 * "Orphan" = email matches the test pattern AND created more than 5 minutes
 * ago (so we never delete a user from a currently-running parallel test).
 *
 * Called once via beforeAll global setup so each run starts from a clean
 * staging DB and Supabase Auth rate limits don't accumulate over time.
 *
 * Returns the number of users actually deleted.
 */
export async function cleanupOrphanTestUsers(): Promise<number> {
  const service = createServiceClient();
  const cutoff = Date.now() - 5 * 60 * 1000;
  let page = 1;
  let totalDeleted = 0;

  while (true) {
    const { data: pageData, error: pageError } = await service.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (pageError) {
      console.warn(`cleanupOrphanTestUsers list error page ${page}: ${pageError.message}`);
      break;
    }
    if (!pageData?.users?.length) break;

    const candidates = pageData.users.filter(
      (u) =>
        u.email?.endsWith("@autonex-rls-test.local") &&
        u.created_at &&
        new Date(u.created_at).getTime() < cutoff,
    );
    for (const candidate of candidates) {
      const { error: delError } = await service.auth.admin.deleteUser(candidate.id);
      if (!delError) totalDeleted += 1;
    }

    if (pageData.users.length < 100) break;
    page += 1;
  }

  return totalDeleted;
}

/**
 * Insère un listing détenu par `ownerId` en bypass RLS via service_role.
 * Schema véhicule (post-2026-04-24): `type` est TEXT libre — on utilise des
 * valeurs auto natives (suv, berline...). Les champs surface/rooms/etc. sont
 * legacy ImmoNex (cf. CLAUDE.md) — laissés à NULL pour rester minimal.
 */
export async function seedListingForUser(
  ownerId: string,
  overrides: Partial<{
    title: string;
    status: string;
    transaction: string;
    type: string;
    price_mga: number;
  }> = {},
) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("listings")
    .insert({
      owner_id: ownerId,
      title: overrides.title ?? "RLS Test Listing",
      description: "Created by RLS test, will be cleaned up.",
      transaction: overrides.transaction ?? "vente",
      type: overrides.type ?? "berline",
      ville: "Antananarivo",
      price_mga: overrides.price_mga ?? 10000000,
      status: overrides.status ?? "active",
    })
    .select()
    .single();

  if (error) throw new Error(`seedListing failed: ${error.message}`);
  return data;
}

/**
 * Insère une entrée ledger directement (bypass RPC, via service_role).
 * Le ledger n'a pas de policy INSERT user-scoped (la policy a été DROPPED
 * en 20260412140100): toute écriture user-side passe par RPC SECURITY DEFINER.
 */
export async function seedCreditsForUser(userId: string, amount: number) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("credits_ledger")
    .insert({
      user_id: userId,
      delta: amount,
      reason: "rls_test_seed",
    })
    .select()
    .single();

  if (error) throw new Error(`seedCredits failed: ${error.message}`);
  return data;
}
