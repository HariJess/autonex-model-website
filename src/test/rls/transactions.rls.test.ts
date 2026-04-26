import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, createUserClient } from "./client-factory";
import { createTestUser, deleteTestUser, type TestUser } from "./setup";

/**
 * Schema rappel: public.transactions colonnes = id, user_id, amount_mga
 * BIGINT, method, status, reference, created_at (+ reviewed_at/by colonnes
 * ajoutées en 20260412140100).
 */
describe("RLS — transactions", () => {
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

  // S7 — Bob ne peut PAS lire les transactions d'Alice
  it("S7 — Bob cannot SELECT alice's transactions", async () => {
    const service = createServiceClient();
    await service.from("transactions").insert({
      user_id: alice.id,
      amount_mga: 10000,
      method: "vanilla_pay",
      status: "pending",
      reference: `rls-test-${Date.now()}`,
    });
    const { data } = await bobClient
      .from("transactions")
      .select("*")
      .eq("user_id", alice.id);
    expect(data ?? []).toHaveLength(0);
  });

  // S8 — Bob ne peut PAS auto-approuver une transaction
  // Aucune policy UPDATE n'est définie sur public.transactions: RLS
  // denies UPDATE par défaut pour tout client authenticated.
  it("S8 — Bob cannot UPDATE his own transaction.status to 'approved'", async () => {
    const service = createServiceClient();
    const { data: tx } = await service
      .from("transactions")
      .insert({
        user_id: bob.id,
        amount_mga: 10000,
        method: "vanilla_pay",
        status: "pending",
        reference: `rls-test-${Date.now()}`,
      })
      .select()
      .single();
    await bobClient
      .from("transactions")
      .update({ status: "approved" })
      .eq("id", tx!.id);
    const { data: after } = await service
      .from("transactions")
      .select("status")
      .eq("id", tx!.id)
      .single();
    expect(after?.status).not.toBe("approved");
  });

  // S9 — Bob ne peut PAS appeler service_approve_provider_transaction
  // Cette RPC est SECURITY DEFINER mais doit gate la logique sur service_role
  // (l'appel doit échouer en authenticated user-context).
  it("S9 — Bob cannot RPC service_approve_provider_transaction (requires service_role)", async () => {
    const { error } = await bobClient.rpc(
      "service_approve_provider_transaction",
      {
        p_transaction_id: "00000000-0000-0000-0000-000000000000",
        p_provider_response: {},
        p_callback_signature: "fake",
      },
    );
    expect(error).toBeTruthy();
  });
});
