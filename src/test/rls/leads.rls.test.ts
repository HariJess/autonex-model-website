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

  // S16 — Public CAN insert a lead. Si erreur, vérifier que ce n'est PAS un
  // refus RLS (rate-limit ou validation autre = OK; "policy" / "denied" / "rls"
  // dans le message = la policy publique a été cassée).
  it("S16 — Anon client CAN insert a lead (public-fillable contact form)", async () => {
    const aliceListing = await seedListingForUser(alice.id);
    const anon = createAnonClient();
    const { error } = await anon.from("leads").insert({
      listing_id: aliceListing.id,
      visitor_name: "Anonymous Bob",
      visitor_phone: "+261340000333",
      message: "From anon",
    });
    if (error) {
      expect(error.message.toLowerCase()).not.toMatch(/policy|denied|rls/);
    }
  });
});
