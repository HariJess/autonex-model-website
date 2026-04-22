// @ts-nocheck
// Supabase Edge Function — vpi-webhook
// -----------------------------------------------------------------------------
// Mission P.2 — Vanilla Pay callback receiver (server-to-server).
//
// RÔLE
// Endpoint PUBLIC invoqué par VPI après qu'un utilisateur termine (ou échoue)
// un paiement sur la checkout page Vanilla Pay. VPI POST le résultat ici.
// Selon l'état transmis on :
//   - approuve la transaction (service_approve_provider_transaction) →
//     crédite les crédits via la RPC idempotente (sentinel credits_granted_at
//     posée en Mission P.1)
//   - rejette la transaction (service_reject_provider_transaction)
//   - persiste juste l'état intermédiaire si PENDING
//
// RÈGLE D'OR — TOUJOURS 200 OK À VPI
// Ce webhook retourne 200 OK dans TOUS les cas sauf méthode non-POST (405).
// Pourquoi :
//   - Si on retourne 4xx/5xx sur erreur logique, VPI considère son callback
//     rejeté et retry en boucle, saturant nos logs + potentiellement créant
//     des doubles-crédits si l'idempotence de service_approve_* lâche.
//   - On encode le résultat logique dans le body { ok, reason } pour que
//     notre propre monitoring sache distinguer un succès d'un échec, sans
//     déclencher le retry VPI.
//   - L'état de la tx DB reste la source de vérité : en cas d'échec
//     d'approve/reject, on log CRITICAL et on traite manuellement.
// (Exception raisonnable : 405 sur méthode non-POST — VPI fait toujours POST,
//  et un 405 sur un GET est un rejet protocolaire pas un échec métier.)
//
// POURQUOI PAS DE JWT
// VPI est un serveur externe, il ne peut pas signer de JWT Supabase.
// L'authenticité du callback est prouvée UNIQUEMENT par le header
// `vpi-signature` = HMAC-SHA256(rawBody, VPI_KEY_SECRET) en HEX UPPERCASE.
// C'est notre barrière de sécurité unique → le body raw est lu AVANT
// tout parsing pour que le HMAC soit calculé sur l'exact même payload que
// VPI a signé (toute normalisation JSON côté serveur casserait la signature).
//
// CLIENT SUPABASE
// Un seul client `svcClient` en service_role. Le webhook est server-to-server
// sans user — pas de JWT user à propager. Le service_role est nécessaire pour
// appeler les RPC service_*_provider_transaction et pour UPDATE transactions
// dans le cas PENDING.
//
// IDEMPOTENCE
// Déléguée aux RPC service_approve_provider_transaction /
// service_reject_provider_transaction. La Mission P.1 a posé la sentinel
// credits_granted_at (nullable → non-null une fois crédité). Un double
// callback VPI SUCCESS pour la même tx → la deuxième RPC voit credits_granted_at
// déjà set et retourne { ok: true, noop: true } sans recréditer. On loggue
// la valeur telle que retournée par la RPC.
//
// PARSER DUAL-FORMAT
// Doc VPI §6.1 mentionne `application/x-www-form-urlencoded` mais les
// exemples utilisent du JSON. On tente JSON.parse d'abord (le happy path
// observé en dev) puis URLSearchParams en fallback. Si les deux échouent
// on log et retourne 200 { ok: false, reason: "unparseable_body" }.
//
// SECRETS / LOGS
//   - VPI_KEY_SECRET : jamais loggé
//   - SUPABASE_SERVICE_ROLE_KEY : jamais loggé
//   - Body webhook : tronqué à 500 chars dans les logs
//   - Signature : seulement les 16 premiers chars + longueur (jamais entière)
//   - tx id : tronqué 8 chars
//
// SECRETS REQUIS (Supabase Edge Functions)
//   SUPABASE_URL                 (injecté)
//   SUPABASE_SERVICE_ROLE_KEY    (injecté)
//   VPI_KEY_SECRET               clé HMAC partagée avec VPI
//
// DEPLOY
//   supabase functions deploy vpi-webhook --project-ref wtkedamrmtvdoippqanc --no-verify-jwt
//   (flag --no-verify-jwt OBLIGATOIRE : sans lui Supabase rejette faute de
//   Authorization header, et VPI n'en envoie pas.)
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyVpiSignature } from "../_shared/vpi-hmac.ts";
import { VPI_CORS_HEADERS, handleVpiOptionsPreflight } from "../_shared/vpi-cors.ts";

type JsonBody = Record<string, unknown>;

function jsonResponse(status: number, body: JsonBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...VPI_CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function shortId(id: string): string {
  return typeof id === "string" && id.length >= 8 ? id.slice(0, 8) : "unknown";
}

function sigPreview(sig: string): string {
  if (!sig) return "(empty)";
  return `${sig.slice(0, 16)}...len=${sig.length}`;
}

/**
 * Tente de parser le raw body en JSON puis, en fallback, en form-urlencoded.
 * Retourne { parsed, format } si l'un des deux marche, sinon null.
 * Ne throw jamais.
 */
function tryParseBody(
  rawBody: string,
): { parsed: Record<string, unknown>; format: "json" | "form" } | null {
  if (typeof rawBody !== "string" || rawBody.length === 0) return null;

  // 1. JSON first
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { parsed: parsed as Record<string, unknown>, format: "json" };
    }
  } catch {
    // fall through
  }

  // 2. form-urlencoded fallback
  try {
    const params = new URLSearchParams(rawBody);
    const out: Record<string, unknown> = {};
    let hasAny = false;
    for (const [k, v] of params.entries()) {
      out[k] = v;
      hasAny = true;
    }
    if (hasAny) return { parsed: out, format: "form" };
  } catch {
    // fall through
  }

  return null;
}

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  const preflight = handleVpiOptionsPreflight(req);
  if (preflight) return preflight;

  // 2. Method check — seule exception à la règle 200 OK (VPI ne fait que POST)
  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  // 3. Env check
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const keySecret = Deno.env.get("VPI_KEY_SECRET");

  const missing = [
    !supabaseUrl && "SUPABASE_URL",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    !keySecret && "VPI_KEY_SECRET",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    // Config prod cassée — incident majeur, alerte.
    console.error(`[vpi-webhook] [CRITICAL] missing_env`, JSON.stringify({ missing }));
    return jsonResponse(200, { ok: false, reason: "missing_env", missing });
  }

  try {
    // 4. Read raw body FIRST (HMAC is computed on raw payload)
    const rawBody = await req.text();

    // 5. Read signature header (tolerate casing variations)
    const signature =
      req.headers.get("vpi-signature") ??
      req.headers.get("VPI-Signature") ??
      "";

    // 6. Missing signature
    if (!signature || signature.trim() === "") {
      console.log(
        `[vpi-webhook] missing_signature`,
        JSON.stringify({
          body_preview: rawBody.slice(0, 200),
          body_len: rawBody.length,
        }),
      );
      return jsonResponse(200, { ok: false, reason: "missing_signature" });
    }

    // 7. Verify HMAC
    let isValid = false;
    try {
      isValid = await verifyVpiSignature(rawBody, signature, keySecret);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error(
        `[vpi-webhook] [CRITICAL] hmac_verify_threw`,
        JSON.stringify({ msg: msg.slice(0, 200) }),
      );
      return jsonResponse(200, { ok: false, reason: "hmac_verify_error" });
    }

    if (!isValid) {
      console.warn(
        `[vpi-webhook] invalid_signature`,
        JSON.stringify({
          sig: sigPreview(signature),
          body_preview: rawBody.slice(0, 200),
          body_len: rawBody.length,
        }),
      );
      return jsonResponse(200, { ok: false, reason: "invalid_signature" });
    }

    // 8. Parse body (JSON then form-urlencoded)
    const parseRes = tryParseBody(rawBody);
    if (!parseRes) {
      console.warn(
        `[vpi-webhook] unparseable_body`,
        JSON.stringify({ body_preview: rawBody.slice(0, 500), body_len: rawBody.length }),
      );
      return jsonResponse(200, { ok: false, reason: "unparseable_body" });
    }
    const parsedBody = parseRes.parsed;

    // 9. Extract and validate core fields
    const referenceVpi = parsedBody.reference_VPI ?? parsedBody.reference_vpi;
    const reference = parsedBody.reference;
    const etat = parsedBody.etat;
    const montant = parsedBody.montant;

    const missingFields: string[] = [];
    if (typeof referenceVpi !== "string" || referenceVpi.trim() === "") {
      missingFields.push("reference_VPI");
    }
    if (typeof reference !== "string" || reference.trim() === "") {
      missingFields.push("reference");
    }
    if (typeof etat !== "string" || etat.trim() === "") {
      missingFields.push("etat");
    }
    // montant : accepter number ou string numérique
    const montantOk =
      typeof montant === "number" ||
      (typeof montant === "string" && montant.trim() !== "" && !Number.isNaN(Number(montant)));
    if (!montantOk) {
      missingFields.push("montant");
    }

    if (missingFields.length > 0) {
      console.warn(
        `[vpi-webhook] missing_fields`,
        JSON.stringify({
          missing: missingFields,
          format: parseRes.format,
          body_preview: rawBody.slice(0, 300),
        }),
      );
      return jsonResponse(200, {
        ok: false,
        reason: "missing_fields",
        missing: missingFields,
      });
    }

    const txId = String(reference).trim();
    const providerPaymentId = String(referenceVpi).trim();
    const normalizedEtat = String(etat).toUpperCase().trim();

    // 10. Service-role client
    const svcClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 11. Dispatch on etat
    if (normalizedEtat === "SUCCESS") {
      const { data: rpcResult, error: rpcErr } = await svcClient.rpc(
        "service_approve_provider_transaction",
        {
          p_transaction_id: txId,
          p_provider_response: parsedBody,
          p_provider_payment_id: providerPaymentId,
        },
      );

      if (rpcErr) {
        console.error(
          `[vpi-webhook] [CRITICAL] webhook_approve_rpc_failed`,
          JSON.stringify({
            tx: shortId(txId),
            msg: String(rpcErr.message ?? "").slice(0, 200),
          }),
        );
        return jsonResponse(200, { ok: false, reason: "rpc_failure" });
      }

      console.log(
        `[vpi-webhook] webhook_approve_ok`,
        JSON.stringify({
          tx: shortId(txId),
          rpc_ok: (rpcResult as any)?.ok ?? null,
          credits_granted: (rpcResult as any)?.credits_granted ?? null,
          noop: (rpcResult as any)?.noop ?? null,
        }),
      );

      return jsonResponse(200, {
        ok: true,
        received: true,
        state: "SUCCESS",
        rpc_result: rpcResult,
      });
    }

    if (normalizedEtat === "FAILED") {
      const { data: rpcResult, error: rpcErr } = await svcClient.rpc(
        "service_reject_provider_transaction",
        {
          p_transaction_id: txId,
          p_reason: `vpi_${normalizedEtat.toLowerCase()}`,
          p_provider_response: parsedBody,
        },
      );

      if (rpcErr) {
        console.error(
          `[vpi-webhook] [CRITICAL] webhook_reject_rpc_failed`,
          JSON.stringify({
            tx: shortId(txId),
            state: normalizedEtat,
            msg: String(rpcErr.message ?? "").slice(0, 200),
          }),
        );
        return jsonResponse(200, { ok: false, reason: "rpc_failure" });
      }

      console.log(
        `[vpi-webhook] webhook_reject_ok`,
        JSON.stringify({
          tx: shortId(txId),
          state: normalizedEtat,
          rpc_ok: (rpcResult as any)?.ok ?? null,
        }),
      );

      return jsonResponse(200, {
        ok: true,
        received: true,
        state: normalizedEtat,
        rpc_result: rpcResult,
      });
    }

    // Default branch : PENDING ou état inconnu → on trace juste provider_response.
    // On ne touche PAS au statut de la tx (la RPC approve/reject s'en chargera
    // au prochain callback). Pas d'ownership filter : webhook est service_role
    // et reference est un txId explicite et vérifié par HMAC.
    const { error: updateErr } = await svcClient
      .from("transactions")
      .update({ provider_response: parsedBody })
      .eq("id", txId);

    if (updateErr) {
      console.error(
        `[vpi-webhook] [CRITICAL] webhook_pending_update_failed`,
        JSON.stringify({
          tx: shortId(txId),
          state: normalizedEtat,
          msg: String(updateErr.message ?? "").slice(0, 200),
        }),
      );
      return jsonResponse(200, { ok: false, reason: "pending_update_failed" });
    }

    console.log(
      `[vpi-webhook] webhook_pending_ok`,
      JSON.stringify({ tx: shortId(txId), state: normalizedEtat }),
    );

    return jsonResponse(200, {
      ok: true,
      received: true,
      state: normalizedEtat,
    });
  } catch (e: unknown) {
    // 12. Global fallback — JAMAIS de 5xx vers VPI (retry loop).
    const msg = e instanceof Error ? e.message : "unknown";
    const stack =
      e instanceof Error && typeof e.stack === "string" ? e.stack.slice(0, 300) : "";
    console.error(
      `[vpi-webhook] [CRITICAL] webhook_internal_error`,
      JSON.stringify({ msg: msg.slice(0, 200), stack }),
    );
    return jsonResponse(200, { ok: false, reason: "internal_error" });
  }
});
