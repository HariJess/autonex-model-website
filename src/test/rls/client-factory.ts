import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL_TEST;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY_TEST;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_TEST;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  const missing = [
    !SUPABASE_URL && "VITE_SUPABASE_URL_TEST",
    !ANON_KEY && "VITE_SUPABASE_PUBLISHABLE_KEY_TEST",
    !SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY_TEST",
  ]
    .filter(Boolean)
    .join(", ");
  throw new Error(
    `Missing test env vars (${missing}). Add them to .env.test at the repo root. ` +
      `See src/test/rls/README.md for setup instructions.`,
  );
}

const url = SUPABASE_URL;
const anonKey = ANON_KEY;
const serviceKey = SERVICE_ROLE_KEY;

/**
 * Service-role client — bypasses ALL RLS. Use ONLY for setup, seed, cleanup.
 * Never share with test bodies that simulate user actions.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Anon client, no auth context — for testing public-readable resources or
 * unauthenticated public endpoints (e.g. lead form INSERT).
 */
export function createAnonClient(): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * User-scoped client — anon key + JWT obtained via signInWithPassword.
 * This client is subject to RLS as the authenticated user.
 */
export async function createUserClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn failed for ${email}: ${error.message}`);
  return client;
}
