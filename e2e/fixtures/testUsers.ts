// Credentials for the seeded E2E users. The seed runs in global-setup.ts
// against the Supabase project pointed at by SUPABASE_URL / VITE_SUPABASE_URL,
// using the service-role key. Keep these values stable so the seed is idempotent.

export const TEST_USERS = {
  buyer: {
    email: "e2e-buyer@autonex-test.local",
    password: "E2E-Test-Buyer-2026",
    fullName: "E2E Buyer Test",
  },
  admin: {
    email: "e2e-admin@autonex-test.local",
    password: "E2E-Test-Admin-2026",
    fullName: "E2E Admin Test",
  },
} as const;

// cp_200 is the canonical 200-credit pack defined in src/config/monetization.ts
// (CREDIT_PACKS_CANONICAL). It exists in production today; using it avoids
// having to seed a separate pack.
export const TEST_PACK = {
  id: "cp_200",
  expectedCreditsAfterApprove: 200,
  amountMga: 25_000,
} as const;
