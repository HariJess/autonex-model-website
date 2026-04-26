import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, createUserClient } from "./client-factory";
import {
  createTestUser,
  deleteTestUser,
  seedListingForUser,
  type TestUser,
} from "./setup";

/**
 * Schema rappel (20260419120000_phone_reveal_events.sql):
 *   columns = id, user_id (viewer), listing_id, kind ('phone_reveal'|'whatsapp'), created_at
 *   INSERT policy: WITH CHECK (auth.uid() = user_id)
 *   SELECT policy: auth.uid() = user_id OR is_admin OR listing.owner_id = auth.uid()
 *   No UPDATE / DELETE policies (denied for everyone).
 */
describe("RLS — phone_reveal_events", () => {
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

  // S13 — Bob ne peut PAS lire les events d'Alice sur des listings que Bob
  // ne possède pas. (Si Bob est owner du listing concerné, il PEUT lire —
  // by design, c'est la branche listing.owner_id = auth.uid() de la policy.)
  it("S13 — Bob cannot SELECT phone_reveal_events of alice on listings he doesn't own", async () => {
    const aliceListing = await seedListingForUser(alice.id);
    const service = createServiceClient();
    await service.from("phone_reveal_events").insert({
      user_id: alice.id,
      listing_id: aliceListing.id,
      kind: "phone_reveal",
    });
    const { data } = await bobClient
      .from("phone_reveal_events")
      .select("*")
      .eq("user_id", alice.id);
    expect(data ?? []).toHaveLength(0);
  });

  // S14 — Bob ne peut PAS insérer un event en se faisant passer pour Alice
  // (user_id != auth.uid()).
  it("S14 — Bob cannot INSERT a phone_reveal_event with user_id != his own auth.uid", async () => {
    const aliceListing = await seedListingForUser(alice.id);
    const { error } = await bobClient.from("phone_reveal_events").insert({
      user_id: alice.id,
      listing_id: aliceListing.id,
      kind: "phone_reveal",
    });
    expect(error).toBeTruthy();
  });
});
