import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, createUserClient } from "./client-factory";
import { createTestUser, deleteTestUser, type TestUser } from "./setup";

describe("RLS — profiles", () => {
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

  // S1 — Bob ne peut PAS lire le profile.phone d'Alice (PII)
  // NOTE: la policy actuelle est `SELECT USING (true)` (public). Si ce test
  // passe en "blocked", la policy a été durcie. S'il échoue, c'est un finding
  // réel : la phone est lisible par tout authentifié.
  it("S1 — Bob cannot SELECT alice's profile.phone (PII protected)", async () => {
    const { data } = await bobClient
      .from("profiles")
      .select("phone")
      .eq("id", alice.id)
      .maybeSingle();
    expect(data?.phone ?? null).toBeNull();
  });

  // S2 — Bob ne peut PAS modifier le profile d'Alice
  it("S2 — Bob cannot UPDATE alice's profile.full_name", async () => {
    await bobClient
      .from("profiles")
      .update({ full_name: "Hacked" })
      .eq("id", alice.id);
    const service = createServiceClient();
    const { data: after } = await service
      .from("profiles")
      .select("full_name")
      .eq("id", alice.id)
      .single();
    expect(after?.full_name).not.toBe("Hacked");
  });

  // S3 — Bob ne peut PAS s'auto-promouvoir admin
  // Le trigger `prevent_profile_privilege_escalation` raise 42501 quand role
  // change pour un user authentifié non-admin.
  it("S3 — Bob cannot self-promote to admin via UPDATE on his own profile.role", async () => {
    const { error } = await bobClient
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", bob.id);
    const service = createServiceClient();
    const { data: after } = await service
      .from("profiles")
      .select("role")
      .eq("id", bob.id)
      .single();
    expect(after?.role).not.toBe("admin");
    if (error) {
      expect(error.message.toLowerCase()).toMatch(
        /privilege|escalation|denied|admin|forbidden/,
      );
    }
  });
});
