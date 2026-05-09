// @ts-nocheck
// Supabase Edge Function — compute-estimation / index.ts
// -----------------------------------------------------------------------------
// HTTP entry point pour le moteur d'estimation v2.
//
// Architecture
//   - Reçoit un POST JSON décrivant le véhicule à estimer (`EstimationInput`).
//   - Construit un client Supabase service-role pour interroger
//     `listings`, `listing_photos`, `vehicle_price_reference_profiles`.
//   - Appelle le moteur pur `engine.ts` (port 1:1 du moteur legacy).
//   - Retourne `{ ok: true, data: EstimationOutputV2 }` ou `{ ok: false, error }`.
//
// Sécurité
//   - JWT verify reste ON par défaut (configurable côté Supabase si nécessaire).
//     Les RLS sur `listings` permettent déjà la lecture des annonces actives ;
//     le service-role est utilisé pour bypasser les éventuelles policies plus
//     strictes sur `vehicle_price_reference_profiles` (table de référentiel).
//   - Body limité par défaut par Supabase (~10MB) — pas de risque d'amplification.
//
// Déploiement
//   supabase functions deploy compute-estimation --project-ref wtkedamrmtvdoippqanc
//
// Variables d'env attendues (injectées par Supabase) :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// -----------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { computeVehicleEstimationV2 } from "./engine.ts";
import { parseEstimationInput } from "./validation.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "missing_supabase_credentials" }, 500);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (_err) {
    return jsonResponse({ ok: false, error: "validation: invalid_json" }, 400);
  }

  let input;
  try {
    input = parseEstimationInput(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "validation: unknown";
    return jsonResponse({ ok: false, error: message }, 400);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const result = await computeVehicleEstimationV2(client, input);
    return jsonResponse({ ok: true, data: result }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal_error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
