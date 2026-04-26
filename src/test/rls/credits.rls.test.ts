import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserClient } from "./client-factory";
import {
  createTestUser,
  deleteTestUser,
  seedCreditsForUser,
  type TestUser,
} from "./setup";

describe("RLS — credits_ledger / credits_balance", () => {
  let alice: TestUser;
  let bob: TestUser;
  let bobClient: SupabaseClient;

  beforeEach(async () => {
    alice = await createTestUser("particulier", "alice-rls");
    bob = await createTestUser("particulier", "bob-rls");
    bobClient = await createUserClient(bob.email, bob.password);
  });

  afterEach(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  // S4 — Bob ne peut PAS lire les entries ledger d'Alice
  it("S4 — Bob cannot SELECT alice's credits_ledger entries", async () => {
    await seedCreditsForUser(alice.id, 100);
    const { data } = await bobClient
      .from("credits_ledger")
      .select("*")
      .eq("user_id", alice.id);
    expect(data ?? []).toHaveLength(0);
  });

  // S5 — Bob ne peut PAS s'auto-créditer
  // La policy INSERT user-scoped a été DROPPED en 20260412140100 (les
  // écritures ledger sont 100% RPC SECURITY DEFINER). L'insert direct doit
  // échouer avec une erreur RLS.
  it("S5 — Bob cannot INSERT a self-credit row in credits_ledger (writes are RPC-only)", async () => {
    const { error } = await bobClient.from("credits_ledger").insert({
      user_id: bob.id,
      delta: 1000,
      reason: "self_grant",
    });
    expect(error).toBeTruthy();
  });

  // S6 — Bob ne peut PAS lire le balance d'Alice
  // NOTE: profiles SELECT est `USING (true)` (public). Si ce test échoue,
  // c'est un finding : credits_balance est lisible cross-user. Mitigation
  // possible: restreindre la policy SELECT aux colonnes non-sensibles ou
  // utiliser une vue publique distincte.
  it("S6 — Bob cannot SELECT alice's profile.credits_balance", async () => {
    await seedCreditsForUser(alice.id, 500);
    const { data } = await bobClient
      .from("profiles")
      .select("credits_balance")
      .eq("id", alice.id)
      .maybeSingle();
    expect(data?.credits_balance ?? null).toBeNull();
  });
});
