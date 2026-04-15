import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

let cachedClient: SupabaseClient<Database> | null = null;

function hasValidSupabaseConfig(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;
}

function createRuntimeConfigError(): Error {
  return new Error(
    "⚠️ Variables d'environnement Supabase manquantes ou invalides. Vérifie .env (VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY)."
  );
}

/**
 * Returns the app Supabase client.
 * - Safe for tests: does not throw at module import time.
 * - Fails explicitly at runtime when the client is actually used with invalid env.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;
  if (!hasValidSupabaseConfig()) {
    throw createRuntimeConfigError();
  }

  const authStorage =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : undefined;

  cachedClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cachedClient;
}

/**
 * Backward-compatible lazy proxy.
 * Existing imports (`import { supabase } ...`) stay unchanged while
 * preventing import-time crashes in tests.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    return Reflect.get(client, prop, receiver);
  },
});
