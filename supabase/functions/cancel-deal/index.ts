// @ts-nocheck
// Supabase Edge Function — cancel-deal
// -----------------------------------------------------------------------------
// Annule un deal actif. Wrapper Deno mince autour de la RPC SQL
// `public.cancel_deal_for_listing(uuid)`.
//
// Body JSON attendu : { listingId: uuid }
//
// Réponse 200 : { success: true, listing_id, cancelled_at, price_lock_until }
// Erreurs : 401 / 403 / 404 / 422 / 500
//
// Important : la RPC ne touche PAS à `price_mga` ni à `deal_price_lock_until`
// — le verrou anti-abus reste actif jusqu'à 30j après la fin théorique du
// deal originel.
//
// Déploiement : supabase functions deploy cancel-deal
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CancelDealSchema = z.object({
  listingId: z.string().uuid(),
});

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, message: string, extra: Record<string, unknown> = {}): Response {
  return jsonResponse(status, { success: false, error: message, ...extra });
}

function sqlstateToHttpStatus(code: string | undefined, message: string): number {
  if (code === "42501") return /authentification/i.test(message) ? 401 : 403;
  if (code === "P0002") return 404;
  if (code === "22023") return 422;
  if (code === "23514") return 422;
  return 500;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonError(405, "method_not_allowed");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("[cancel-deal] missing env", {
      hasUrl: !!supabaseUrl,
      hasAnon: !!anonKey,
    });
    return jsonError(500, "missing_env");
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
      return jsonError(401, "Authentification requise.");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Corps de requête JSON invalide.");
    }

    const parsed = CancelDealSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "Paramètres invalides.", {
        details: parsed.error.flatten(),
      });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("cancel_deal_for_listing", {
      p_listing_id: parsed.data.listingId,
    });

    if (error) {
      const status = sqlstateToHttpStatus(error.code, error.message);
      return jsonError(status, error.message, { code: error.code ?? null });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[cancel-deal] internal_error", msg.slice(0, 300));
    return jsonError(500, "Erreur serveur inattendue.");
  }
});
