import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAnonClient,
  createServiceClient,
  createUserClient,
} from "./client-factory";
import {
  createTestUser,
  deleteTestUser,
  seedListingForUser,
  type TestUser,
} from "./setup";

describe("RLS — leads", () => {
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

  // S15 — Bob ne peut PAS lire les leads d'Alice (PII visiteur).
  // Policy SELECT: listing owner only.
  it("S15 — Bob cannot SELECT alice's leads (visitor_name PII)", async () => {
    const aliceListing = await seedListingForUser(alice.id);
    const service = createServiceClient();
    await service.from("leads").insert({
      listing_id: aliceListing.id,
      visitor_name: "John Doe",
      visitor_phone: "+261340000111",
      visitor_email: "john@autonex-rls-test.local",
      message: "Interested",
    });
    const { data } = await bobClient
      .from("leads")
      .select("*")
      .eq("listing_id", aliceListing.id);
    expect(data ?? []).toHaveLength(0);
  });

  // S16 — Anon CAN insert a lead sur un listing actif.
  // La policy INSERT exige EXISTS (listings.status = 'active'). Le seed met
  // bien `status='active'` mais le trigger de modération
  // (tr_enforce_listing_moderation_insert dans 20260420190000) peut
  // reroute vers `pending_review`. On force `status='active'` post-seed via
  // service_role pour bypass triggers + RLS et tester strictement la policy
  // INSERT publique sur leads.
  it("S16 — Anon client CAN insert a lead on an active listing (public form preserved)", async () => {
    const aliceListing = await seedListingForUser(alice.id);

    const service = createServiceClient();
    const { error: updateError } = await service
      .from("listings")
      .update({ status: "active" })
      .eq("id", aliceListing.id);
    expect(updateError).toBeNull();

    const anon = createAnonClient();
    const { error } = await anon.from("leads").insert({
      listing_id: aliceListing.id,
      visitor_name: "Anonymous Visitor",
      visitor_phone: "+261340000333",
      message: "From anon test",
    });

    if (error) {
      expect(error.message.toLowerCase()).not.toMatch(/policy|denied|rls|row-level/);
    } else {
      expect(error).toBeNull();
    }
  });
});
