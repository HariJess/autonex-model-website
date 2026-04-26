import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, createUserClient } from "./client-factory";
import { createTestUser, deleteTestUser, type TestUser } from "./setup";

/**
 * Schema rappel: public.agencies n'a PAS de colonne owner_id. L'ownership
 * est inférée via profiles.agency_id (plusieurs membres possibles par
 * agence). La policy UPDATE est:
 *   USING (EXISTS (SELECT 1 FROM profiles
 *                  WHERE agency_id = agencies.id AND profiles.id = auth.uid()))
 * → seul un user dont profiles.agency_id pointe vers l'agence peut update.
 *
 * Pour ces 2 tests, alice est une "agence-affiliée" (profiles.agency_id =
 * agency.id). Bob est un particulier classique. Bob tente UPDATE/DELETE de
 * l'agence d'Alice.
 */
describe("RLS — agencies", () => {
  let alice: TestUser;
  let bob: TestUser;
  let aliceAgencyId: string;
  let bobClient: SupabaseClient;

  beforeEach(async () => {
    alice = await createTestUser("agence", "alice-agency");
    bob = await createTestUser("particulier", "bob-rls");
    bobClient = await createUserClient(bob.email, bob.password);

    const service = createServiceClient();
    const slug = `alice-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: agency, error: insErr } = await service
      .from("agencies")
      .insert({ name: "Alice Auto", slug })
      .select()
      .single();
    if (insErr) throw new Error(`agency insert failed: ${insErr.message}`);
    aliceAgencyId = agency!.id;

    const { error: updErr } = await service
      .from("profiles")
      .update({ agency_id: aliceAgencyId })
      .eq("id", alice.id);
    if (updErr) throw new Error(`profile.agency_id link failed: ${updErr.message}`);
  });

  afterEach(async () => {
    const service = createServiceClient();
    await service.from("agencies").delete().eq("id", aliceAgencyId);
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  // S17 — Bob ne peut PAS modifier une agence à laquelle il n'est pas affilié
  it("S17 — Bob cannot UPDATE an agency he is not affiliated with", async () => {
    await bobClient
      .from("agencies")
      .update({ name: "Hacked" })
      .eq("id", aliceAgencyId);
    const service = createServiceClient();
    const { data: after } = await service
      .from("agencies")
      .select("name")
      .eq("id", aliceAgencyId)
      .single();
    expect(after?.name).not.toBe("Hacked");
  });

  // S18 — Bob ne peut PAS supprimer une agence à laquelle il n'est pas affilié
  // Aucune policy DELETE n'est définie sur public.agencies → RLS denies pour
  // tous les non-service-role. Le DELETE de Bob n'a aucun effet observable.
  it("S18 — Bob cannot DELETE an agency he is not affiliated with", async () => {
    await bobClient.from("agencies").delete().eq("id", aliceAgencyId);
    const service = createServiceClient();
    const { data: after } = await service
      .from("agencies")
      .select("id")
      .eq("id", aliceAgencyId)
      .maybeSingle();
    expect(after).not.toBeNull();
  });
});
