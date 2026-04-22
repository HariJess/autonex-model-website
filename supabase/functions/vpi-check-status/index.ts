// @ts-nocheck
// Supabase Edge Function — vpi-check-status
// -----------------------------------------------------------------------------
// Mission P.2 — Vanilla Pay status-polling endpoint (user-side safety net).
//
// RÔLE
// Invoqué par le front `/paiement/retour` après que VPI a redirect l'utilisateur
// de sa checkout page vers AutoNex. On interroge VPI pour savoir où en est la
// transaction, au cas où le webhook vpi-webhook :
//   - n'est pas encore arrivé (latence VPI quelques secondes typiques)
//   - n'arrivera jamais (indisponibilité réseau VPI → AutoNex, défaillance
//     intermittente)
//   - est arrivé mais a échoué côté DB (log CRITICAL à investiguer manuellement)
//
// Le webhook reste le chemin PRIMAIRE. Cet endpoint est un filet de sécurité
// qui permet au front de montrer un état cohérent et, si nécessaire, de
// synchroniser la DB à partir du status VPI. La réconciliation utilise les
// mêmes RPC idempotentes (credits_granted_at sentinel de Mission P.1) que
// le webhook → pas de double-crédit possible si les deux arrivent en parallèle.
//
// ARCHITECTURE 2 CLIENTS SUPABASE
// Mêmes principes que vpi-initiate-payment :
//   - userClient (anon key + JWT propagé) : SELECT transactions, l'ownership
//     est garanti par la RLS "Users see own transactions" (auth.uid() =
//     user_id). Si la tx existe mais n'appartient pas au caller, .maybeSingle()
//     retourne null → on renvoie 404 sans leak d'existence.
//   - svcClient (service_role) : appelle service_approve_provider_transaction /
//     service_reject_provider_transaction et UPDATE provider_response pour
//     l'état intermédiaire. Nécessaire car ces écritures côté DB sont réservées
//     au service_role.
//
// SHORTCUTS AVANT APPEL VPI
//   1. Si tx.status est terminal (approved / rejected / failed / cancelled) :
//      aucun changement possible → on skip VPI, on renvoie l'état DB tel quel.
//   2. Si provider_payment_id commence par "DRY_RUN_" : la tx n'existe pas
//      côté VPI → on skip aussi, on renvoie l'état DB.
// Ces shortcuts protègent notre quota d'appels VPI et évitent des timeouts
// inutiles sur des polls répétés du front après close de la page checkout.
//
// RÉCONCILIATION D'ÉTAT
// Si la DB dit "pending" et VPI dit "SUCCESS" → on appelle
// service_approve_provider_transaction. Idempotent via credits_granted_at,
// donc safe si le webhook arrive pile au même moment. Après sync on RELIT
// la tx depuis la DB pour renvoyer le VRAI status post-RPC (pas la valeur
// stale de l'étape 8).
//
// DÉPENDANCE AU mode_paiement
// L'endpoint VPI /api/webpayment/v2/status/{id}?mode_paiement=... exige le
// mode_paiement en query param. On le récupère dans provider_response, où
// vpi-initiate-payment l'a stampé (clé `mode_paiement`). Fallback
// "international" si absent — acceptable par la doc VPI et conservateur.
//
// SECRETS REQUIS
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (injectés)
//   VPI_API_BASE_URL, VPI_CLIENT_ID, VPI_CLIENT_SECRET, VPI_VERSION
//
// DEPLOY
//   supabase functions deploy vpi-check-status --project-ref wtkedamrmtvdoippqanc
//   (JWT verify ON par défaut — endpoint user-authentifié.)
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getVpiToken } from "../_shared/vpi-token.ts";
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

// Inclut "success" par défense en profondeur : l'enum DB payment_status a
// "success" (legacy pre-P.1, avant les RPC service_*). Aucune tx actuelle ne
// transite par "success" dans notre flow, mais une legacy row arrivant ici
// doit être traitée comme terminale — pas de réconciliation VPI inutile.
const TERMINAL_STATUSES = new Set([
  "approved",
  "rejected",
  "failed",
  "cancelled",
  "success",
]);

function isTerminal(status: string | null | undefined): boolean {
  return typeof status === "string" && TERMINAL_STATUSES.has(status);
}

/**
 * Extrait l'état VPI depuis provider_response (le JSONB stocké côté tx).
 * Utilisé pour informer le front du dernier état VPI connu, indépendamment
 * du status DB. Retourne une string uppercase ou null si inextractible.
 */
function extractProviderState(providerResponse: unknown): string | null {
  if (!providerResponse || typeof providerResponse !== "object") return null;
  const etat = (providerResponse as Record<string, unknown>).etat;
  if (typeof etat !== "string" || etat.trim() === "") return null;
  return etat.toUpperCase().trim();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function logEvent(event: string, extra?: Record<string, unknown>): void {
  console.log(`[vpi-check-status] ${event}`, extra ? JSON.stringify(extra) : "");
}

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  const preflight = handleVpiOptionsPreflight(req);
  if (preflight) return preflight;

  // 2. Method check
  if (req.method !== "GET") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  // 3. Env check
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const vpiBaseUrl = Deno.env.get("VPI_API_BASE_URL");

  const missing = [
    !supabaseUrl && "SUPABASE_URL",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    !anonKey && "SUPABASE_ANON_KEY",
    !vpiBaseUrl && "VPI_API_BASE_URL",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    logEvent("missing_env", { missing });
    return jsonResponse(500, { ok: false, error: "missing_env", missing });
  }

  let userId = "unknown";

  try {
    // 4. JWT extract
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
      return jsonResponse(401, { ok: false, error: "unauthorized" });
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return jsonResponse(401, { ok: false, error: "unauthorized" });
    }

    // 5. tx_id query param + UUID validation
    const url = new URL(req.url);
    const txId = url.searchParams.get("tx_id");
    if (!txId || !UUID_RE.test(txId)) {
      return jsonResponse(400, {
        ok: false,
        error: "invalid_tx_id",
        details: "missing or not a valid UUID",
      });
    }

    // 6. User client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 7. auth.getUser
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return jsonResponse(401, { ok: false, error: "invalid_jwt" });
    }
    userId = userData.user.id;

    // 8. SELECT tx (RLS enforces ownership)
    const { data: tx, error: txErr } = await userClient
      .from("transactions")
      .select(
        "id, user_id, status, provider, provider_payment_id, provider_response, credits_granted_at",
      )
      .eq("id", txId)
      .maybeSingle();

    if (txErr) {
      logEvent("tx_lookup_error", {
        user: shortId(userId),
        tx: shortId(txId),
        msg: String(txErr.message ?? "").slice(0, 200),
      });
      return jsonResponse(500, { ok: false, error: "tx_lookup_failed" });
    }
    if (!tx) {
      return jsonResponse(404, { ok: false, error: "tx_not_found" });
    }

    const providerPaymentId: string | null =
      typeof tx.provider_payment_id === "string" ? tx.provider_payment_id : null;
    const isDryRun = providerPaymentId !== null && providerPaymentId.startsWith("DRY_RUN_");

    // 11. Shortcut : terminal status
    if (isTerminal(tx.status)) {
      return jsonResponse(200, {
        ok: true,
        status: tx.status,
        transaction_id: txId,
        terminal: true,
        dry_run: isDryRun,
        provider_state: extractProviderState(tx.provider_response),
      });
    }

    // 12. Shortcut : DRY_RUN transaction
    if (isDryRun) {
      return jsonResponse(200, {
        ok: true,
        status: tx.status,
        transaction_id: txId,
        terminal: isTerminal(tx.status),
        dry_run: true,
        provider_state: extractProviderState(tx.provider_response),
      });
    }

    // 13. Determine mode + guard against missing providerPaymentId
    const providerResponseObj =
      tx.provider_response && typeof tx.provider_response === "object"
        ? (tx.provider_response as Record<string, unknown>)
        : {};
    const modeRaw = providerResponseObj.mode_paiement;
    const mode =
      typeof modeRaw === "string" && modeRaw.trim() !== "" ? modeRaw.trim() : "international";

    if (!providerPaymentId) {
      // Initiate a créé la tx mais n'a pas pu stamper provider_payment_id.
      // Le webhook peut toujours match via reference=txId. On renvoie l'état
      // DB sans appel VPI distant (impossible sans providerPaymentId).
      return jsonResponse(200, {
        ok: true,
        status: tx.status,
        transaction_id: txId,
        terminal: false,
        dry_run: false,
        provider_state: extractProviderState(tx.provider_response),
        warning: "provider_payment_id_missing",
      });
    }

    // 14. Fetch VPI status
    let token: string;
    try {
      token = await getVpiToken();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error(
        `[vpi-check-status] [CRITICAL] vpi_token_error`,
        JSON.stringify({
          user: shortId(userId),
          tx: shortId(txId),
          msg: msg.slice(0, 200),
        }),
      );
      return jsonResponse(502, { ok: false, error: "vpi_token_error" });
    }

    const baseUrl = vpiBaseUrl!.replace(/\/+$/, "");
    const vpiUrl = `${baseUrl}/api/webpayment/v2/status/${encodeURIComponent(providerPaymentId)}?mode_paiement=${encodeURIComponent(mode)}`;

    let vpiResponse: Response;
    try {
      vpiResponse = await fetch(vpiUrl, {
        method: "GET",
        headers: {
          "Accept": "*/*",
          "VPI-Version": Deno.env.get("VPI_VERSION") ?? "",
          "Authorization": token,
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "network_error";
      console.error(
        `[vpi-check-status] [CRITICAL] vpi_network_error`,
        JSON.stringify({
          user: shortId(userId),
          tx: shortId(txId),
          msg: msg.slice(0, 200),
        }),
      );
      return jsonResponse(502, { ok: false, error: "vpi_network_error" });
    }

    if (!vpiResponse.ok) {
      const bodySnippet = await vpiResponse.text().catch(() => "");
      console.warn(
        `[vpi-check-status] vpi_http_failure`,
        JSON.stringify({
          user: shortId(userId),
          tx: shortId(txId),
          status: vpiResponse.status,
          body: bodySnippet.slice(0, 200),
        }),
      );
      return jsonResponse(502, {
        ok: false,
        error: "vpi_http_failure",
        status: vpiResponse.status,
      });
    }

    let vpiPayload: {
      CodeRetour?: number;
      DescRetour?: string;
      Data?: { etat?: string; [k: string]: unknown };
    };
    try {
      vpiPayload = await vpiResponse.json();
    } catch {
      console.warn(
        `[vpi-check-status] vpi_invalid_json`,
        JSON.stringify({ user: shortId(userId), tx: shortId(txId) }),
      );
      return jsonResponse(502, { ok: false, error: "vpi_invalid_json" });
    }

    if (vpiPayload?.CodeRetour !== 200) {
      const desc = typeof vpiPayload?.DescRetour === "string" ? vpiPayload.DescRetour : "";
      console.warn(
        `[vpi-check-status] vpi_denied`,
        JSON.stringify({
          user: shortId(userId),
          tx: shortId(txId),
          code: vpiPayload?.CodeRetour,
          desc: desc.slice(0, 200),
        }),
      );
      // VPI a répondu proprement mais refuse de nous renseigner (auth, pack
      // expiré, etc.). On renvoie l'état DB avec warning — le front peut
      // réessayer ou afficher un fallback.
      return jsonResponse(200, {
        ok: true,
        status: tx.status,
        transaction_id: txId,
        terminal: false,
        dry_run: false,
        provider_state: null,
        warning: "vpi_denied",
        code: vpiPayload?.CodeRetour ?? null,
      });
    }

    // 15. Extract VPI etat
    const vpiData = vpiPayload?.Data ?? {};
    const vpiEtat = String(vpiData?.etat ?? "").toUpperCase().trim();

    // 16. Reconcile if needed
    const svcClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let didSync = false;

    if (vpiEtat === "SUCCESS" && tx.status !== "approved") {
      const { error: approveErr } = await svcClient.rpc(
        "service_approve_provider_transaction",
        {
          p_transaction_id: txId,
          p_provider_response: vpiData,
          p_provider_payment_id: providerPaymentId,
        },
      );

      if (approveErr) {
        console.error(
          `[vpi-check-status] [CRITICAL] sync_approve_failed`,
          JSON.stringify({
            user: shortId(userId),
            tx: shortId(txId),
            msg: String(approveErr.message ?? "").slice(0, 200),
          }),
        );
        // On tombe sur le fallback : retourne l'état pre-sync + provider_state.
      } else {
        didSync = true;
        logEvent("sync_approve_ok", { user: shortId(userId), tx: shortId(txId) });
      }
    } else if (vpiEtat === "FAILED" && tx.status !== "rejected") {
      const { error: rejectErr } = await svcClient.rpc(
        "service_reject_provider_transaction",
        {
          p_transaction_id: txId,
          p_reason: "vpi_failed",
          p_provider_response: vpiData,
        },
      );

      if (rejectErr) {
        console.error(
          `[vpi-check-status] [CRITICAL] sync_reject_failed`,
          JSON.stringify({
            user: shortId(userId),
            tx: shortId(txId),
            msg: String(rejectErr.message ?? "").slice(0, 200),
          }),
        );
      } else {
        didSync = true;
        logEvent("sync_reject_ok", { user: shortId(userId), tx: shortId(txId) });
      }
    } else if (vpiEtat === "PENDING" || vpiEtat === "INITIATED") {
      // Pas de changement de status, on rafraîchit juste la trace.
      const { error: traceErr } = await svcClient
        .from("transactions")
        .update({ provider_response: vpiData })
        .eq("id", txId);

      if (traceErr) {
        // Non-critical : la trace est informationnelle, le status reste inchangé.
        logEvent("sync_pending_trace_failed", {
          user: shortId(userId),
          tx: shortId(txId),
          msg: String(traceErr.message ?? "").slice(0, 200),
        });
      } else {
        logEvent("sync_pending_ok", {
          user: shortId(userId),
          tx: shortId(txId),
          etat: vpiEtat,
        });
      }
    }

    // 17. Re-query tx if we applied a terminal sync, to return fresh status
    let finalTx = tx;
    if (didSync) {
      const { data: refreshed, error: refreshErr } = await svcClient
        .from("transactions")
        .select(
          "id, user_id, status, provider, provider_payment_id, provider_response, credits_granted_at",
        )
        .eq("id", txId)
        .maybeSingle();

      if (refreshErr || !refreshed) {
        // Sync a réussi mais re-read échoué → on renvoie quand même une valeur
        // cohérente en projetant la transition qu'on vient de déclencher.
        logEvent("post_sync_reread_failed", {
          user: shortId(userId),
          tx: shortId(txId),
          msg: String(refreshErr?.message ?? "no_row").slice(0, 200),
        });
        finalTx = {
          ...tx,
          status: vpiEtat === "SUCCESS" ? "approved" : "rejected",
        };
      } else {
        finalTx = refreshed as typeof tx;
      }
    }

    return jsonResponse(200, {
      ok: true,
      status: finalTx.status,
      transaction_id: txId,
      terminal: isTerminal(finalTx.status),
      dry_run: false,
      provider_state: vpiEtat || null,
    });
  } catch (e: unknown) {
    // 18. Global fallback
    const msg = e instanceof Error ? e.message : "unknown";
    const stack =
      e instanceof Error && typeof e.stack === "string" ? e.stack.slice(0, 300) : "";
    console.error(
      `[vpi-check-status] [CRITICAL] internal_error`,
      JSON.stringify({
        user: shortId(userId),
        msg: msg.slice(0, 200),
        stack,
      }),
    );
    return jsonResponse(500, { ok: false, error: "internal_error" });
  }
});
