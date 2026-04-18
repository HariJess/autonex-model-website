import type { Json } from "@/integrations/supabase/types";

/** Serializes a value to Supabase `Json` safely (plain data only). */
export function toSupabaseJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
