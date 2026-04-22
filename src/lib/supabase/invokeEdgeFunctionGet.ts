import { supabase } from "@/integrations/supabase/client";

type InvokeGetResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Call a Supabase Edge Function with a GET request and query-string params.
 *
 * Why this helper exists: `supabase.functions.invoke()` always issues a POST
 * with a JSON body, so Edge Functions that read params from the URL query
 * (e.g. vpi-check-status reads `?tx_id=...`) cannot be reached through it.
 * This helper does a plain fetch(), attaches the session access_token + anon
 * publishable key, and returns the same `{ data, error }` shape as invoke()
 * so callers can handle results uniformly.
 */
export async function invokeEdgeFunctionGet<T>(
  functionName: string,
  query: Record<string, string>,
): Promise<InvokeGetResult<T>> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").toString();
  const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").toString();
  if (!supabaseUrl || !anonKey) {
    return { data: null, error: new Error("missing_supabase_env") };
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    return { data: null, error: new Error(sessionErr.message) };
  }
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { data: null, error: new Error("unauthorized") };
  }

  const qs = new URLSearchParams(query).toString();
  const url = `${supabaseUrl}/functions/v1/${functionName}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    const body = (await res.json().catch(() => null)) as
      | (T & { error?: string; message?: string })
      | null;
    if (!res.ok) {
      const msg = body?.error ?? body?.message ?? `http_${res.status}`;
      return { data: null, error: new Error(msg) };
    }
    return { data: (body as T) ?? null, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network_error";
    return { data: null, error: new Error(msg) };
  }
}
