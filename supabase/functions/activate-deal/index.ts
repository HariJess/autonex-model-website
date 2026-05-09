// @ts-nocheck
// Supabase Edge Function — activate-deal
// -----------------------------------------------------------------------------
// Active un deal sur une annonce. Wrapper Deno mince autour de la RPC SQL
// `public.activate_deal_for_listing(uuid, integer, integer)` :
//   - valide le body via zod (belt + suspenders côté DB aussi)
//   - relaie le JWT utilisateur pour que `auth.uid()` fonctionne dans la RPC
//   - mappe les codes SQLSTATE → status HTTP sémantiques
//
// Body JSON attendu :
//   { listingId: uuid, discountPercent: 5..30, durationDays: 7|14|30 }
//
// Réponse en cas de succès :
//   200 { success: true, listing_id, history_id, deal_started_at,
//         deal_ends_at, deal_price_lock_until, discount_percent,
//         original_price_mga, new_price_mga }
//
// Réponse en cas d'erreur :
//   401 / 403 / 404 / 422 / 500  { success: false, error: string, code?: string }
//
// Secrets requis (Supabase Edge Functions, injectés par défaut) :
//   SUPABASE_URL, SUPABASE_ANON_KEY
//
// Déploiement (côté Ali, après merge) :
//   supabase functions deploy activate-deal
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ActivateDealSchema = z.object({
  listingId: z.string().uuid(),
  discountPercent: z.number().int().min(5).max(30),
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
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

// Mappe les codes SQLSTATE remontés par PostgreSQL vers des status HTTP
// sémantiques. Voir spec RPC pour les codes utilisés :
//   42501 → permission/auth → 401 ou 403 selon le message
//   P0002 → row not found  → 404
//   22023 → invalid params (validation métier) → 422
//   23514 → CHECK violation (trigger anti-fake-discount, contrainte) → 422
function sqlstateToHttpStatus(code: string | undefined, message: string): number {
  if (code === "42501") {
    // 42501 sert à la fois pour "Authentification requise" et pour
    // "pas propriétaire". On peut différencier en regardant le message,
    // mais les deux retournent 403 (Forbidden) en HTTP — l'utilisateur
    // est connu mais l'opération lui est interdite.
    return /authentification/i.test(message) ? 401 : 403;
  }
  if (code === "P0002") return 404;
  if (code === "22023") return 422;
  if (code === "23514") return 422;
  return 500;
}

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // 2. Method check
  if (req.method !== "POST") {
    return jsonError(405, "method_not_allowed");
  }

  // 3. Env check
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("[activate-deal] missing env", {
      hasUrl: !!supabaseUrl,
      hasAnon: !!anonKey,
    });
    return jsonError(500, "missing_env");
  }

  try {
    // 4. Auth — JWT utilisateur (anon = pas d'auth.uid() côté RPC, donc reject)
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
      return jsonError(401, "Authentification requise.");
    }

    // 5. Parse + validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Corps de requête JSON invalide.");
    }

    const parsed = ActivateDealSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "Paramètres invalides.", {
        details: parsed.error.flatten(),
      });
    }

    // 6. Client Supabase porteur du JWT user (auth.uid() OK côté RPC)
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 7. Appel RPC atomique
    const { data, error } = await supabase.rpc("activate_deal_for_listing", {
      p_listing_id: parsed.data.listingId,
      p_discount_percent: parsed.data.discountPercent,
      p_duration_days: parsed.data.durationDays,
    });

    if (error) {
      const status = sqlstateToHttpStatus(error.code, error.message);
      return jsonError(status, error.message, { code: error.code ?? null });
    }

    // 8. Forward du payload retourné par la RPC (déjà au format
    // { success: true, ... }).
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[activate-deal] internal_error", msg.slice(0, 300));
    return jsonError(500, "Erreur serveur inattendue.");
  }
});
