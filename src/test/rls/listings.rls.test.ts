import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, createUserClient } from "./client-factory";
import {
  createTestUser,
  deleteTestUser,
  seedListingForUser,
  type TestUser,
} from "./setup";

describe("RLS — listings", () => {
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

  // S10 — Bob ne peut PAS modifier le listing d'Alice
  it("S10 — Bob cannot UPDATE alice's listing", async () => {
    const listing = await seedListingForUser(alice.id);
    await bobClient
      .from("listings")
      .update({ title: "Hacked" })
      .eq("id", listing.id);
    const service = createServiceClient();
    const { data: after } = await service
      .from("listings")
      .select("title")
      .eq("id", listing.id)
      .single();
    expect(after?.title).not.toBe("Hacked");
  });

  // S11 — Bob ne peut PAS supprimer le listing d'Alice
  it("S11 — Bob cannot DELETE alice's listing", async () => {
    const listing = await seedListingForUser(alice.id);
    await bobClient.from("listings").delete().eq("id", listing.id);
    const service = createServiceClient();
    const { data: after } = await service
      .from("listings")
      .select("id")
      .eq("id", listing.id)
      .maybeSingle();
    expect(after).not.toBeNull();
  });

  // S12 — Bob ne peut PAS insérer un listing pour Alice
  // Policy WITH CHECK (auth.uid() = owner_id) → 42501 si owner_id ≠ caller.
  it("S12 — Bob cannot INSERT a listing with owner_id=alice.id", async () => {
    const { error } = await bobClient.from("listings").insert({
      owner_id: alice.id,
      title: "Owned by alice but inserted by bob",
      description: "rls test impersonation",
      transaction: "vente",
      type: "berline",
      ville: "Antananarivo",
      price_mga: 5000000,
      status: "draft",
    });
    expect(error).toBeTruthy();
  });
});
