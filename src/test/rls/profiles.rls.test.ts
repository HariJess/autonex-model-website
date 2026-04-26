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

  // S1 — Bob ne peut PAS lire le profile d'Alice (RLS scopée à auth.uid).
  // Diagnostic SQL sur staging : les policies SELECT sur profiles sont toutes
  // scopées (`auth.uid() = id`, `immonex_is_admin()`, anti-anonymized self).
  // Le test précédent comparait `data?.phone` à null mais ne distinguait pas
  // "RLS bloque" (data=null) de "Bob lit son propre profile par erreur" (où
  // le téléphone seed est le même hardcodé pour tous les users de test).
  // On vérifie maintenant `count` et `data.length` qui sont sans ambiguïté.
  it("S1 — Bob cannot SELECT alice's profile (RLS scope to auth.uid)", async () => {
    const { data, count, error } = await bobClient
      .from("profiles")
      .select("id, phone, full_name", { count: "exact" })
      .eq("id", alice.id);

    expect(error).toBeNull();
    expect(count).toBe(0);
    expect(data ?? []).toHaveLength(0);
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
