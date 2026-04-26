// Supabase Edge Function — vpi-initiate-payment
// -----------------------------------------------------------------------------
// Mission P.2 — Vanilla Pay integration, user-side orchestrator.
//
// RÔLE
// Reçoit un POST du frontend (user authentifié) : { credit_pack_id,
// payment_mode, promo_code? }. Valide le pack et le promo, crée la transaction
// en DB via create_transaction_with_promo, puis appelle VPI
// /api/webpayment/v2/initiate pour obtenir une URL de checkout. Retourne l'URL
// au front qui redirige l'utilisateur vers Vanilla Pay.
//
// ARCHITECTURE 2 CLIENTS SUPABASE
// Cette fonction utilise DELIBEREMENT deux clients Supabase distincts :
//
//   - userClient (anon key + Authorization: Bearer <jwt>) :
//       utilisé pour auth.getUser() et pour les RPC qui reposent sur
//       auth.uid() en interne (validate_promo_code, create_transaction_with_promo).
//       Si on utilisait le service_role pour ces RPC, auth.uid() serait NULL
//       et les fonctions échoueraient ou créeraient des transactions orphelines.
//
//   - svcClient (service_role) :
//       utilisé pour lire credit_packs et UPDATE les colonnes provider_* de
//       transactions après création. Nécessaire car les RLS de transactions
//       n'autorisent pas l'utilisateur à modifier ces champs directement.
//
// GARDE-FOUS BETA
//   - VPI_MAX_AMOUNT_MGA (default 100000) : refuse toute transaction dépassant
//     ce plafond. Sécurité anti-fraude/bug pendant la phase beta.
//   - VPI_DRY_RUN=true : court-circuite l'appel VPI, génère une fake URL de
//     checkout pointant vers une edge function stub. Permet de tester le flow
//     complet (DB + front) sans consommer d'appel VPI réel.
//
// OWNERSHIP CHECK
// Chaque UPDATE sur transactions filtre par .eq('id', txId).eq('user_id', userId)
// — défense en profondeur au cas où une RLS permissive ou un bug ferait
// remonter une tx d'un autre user.
//
// PATTERN RETOUR JSON
// Toutes les réponses suivent { ok: boolean, ...payload } avec HTTP status
// sémantique. Erreurs côté front tombent sur le discriminant ok=false + error.
//
// SECRETS REQUIS (Supabase Edge Functions)
//   SUPABASE_URL                 (injecté)
//   SUPABASE_SERVICE_ROLE_KEY    (injecté)
//   SUPABASE_ANON_KEY            (injecté)
//   VPI_API_BASE_URL             ex. https://bo.vanilla-pay.net
//   VPI_CLIENT_ID                id client VPI
//   VPI_CLIENT_SECRET            secret VPI — NEVER LOG
//   VPI_VERSION                  ex. 2023-01-12
//   VPI_DRY_RUN                  "true" pour bypass appel VPI réel
//   VPI_MAX_AMOUNT_MGA           plafond beta, default 100000
//   SITE_URL                     ex. https://autonex.mg (redirect_url)
//
// DEPLOY
//   supabase functions deploy vpi-initiate-payment --project-ref wtkedamrmtvdoippqanc
//   (JWT verify ON par défaut — l'Authorization header est exigé.)
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

function logEvent(event: string, extra?: Record<string, unknown>): void {
  // Jamais de JWT, jamais de token VPI, jamais de client_secret.
  // user_id tronqué à 8 chars, messages d'erreur tronqués à 300 chars.
  console.log(`[vpi-initiate] ${event}`, extra ? JSON.stringify(extra) : "");
}

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  const preflight = handleVpiOptionsPreflight(req);
  if (preflight) return preflight;

  // 2. Method check
  if (req.method !== "POST") {
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
    // 4. Extract JWT
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
      return jsonResponse(401, { ok: false, error: "unauthorized" });
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return jsonResponse(401, { ok: false, error: "unauthorized" });
    }

    // 5. User client (anon key + forwarded JWT)
    // `!` justifié : la garde missing-env (lignes 102-112) a déjà retourné
    // 500 si supabaseUrl ou anonKey étaient absents — TS ne traverse pas le
    // filter(Boolean) tableau pour le narrowing.
    const userClient = createClient(supabaseUrl!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 6. Get user
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return jsonResponse(401, { ok: false, error: "invalid_jwt" });
    }
    userId = userData.user.id;

    // 7. Parse + validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { ok: false, error: "invalid_json" });
    }

    const creditPackId = body?.credit_pack_id;
    const paymentMode = body?.payment_mode;
    const promoCodeRaw = body?.promo_code;

    if (typeof creditPackId !== "string" || creditPackId.trim() === "") {
      return jsonResponse(400, {
        ok: false,
        error: "invalid_body",
        details: "credit_pack_id required (non-empty string)",
      });
    }
    if (paymentMode !== "mobile_money" && paymentMode !== "international") {
      return jsonResponse(400, {
        ok: false,
        error: "invalid_body",
        details: "payment_mode must be 'mobile_money' or 'international'",
      });
    }
    let promoCode: string | null = null;
    if (promoCodeRaw !== undefined && promoCodeRaw !== null && promoCodeRaw !== "") {
      if (typeof promoCodeRaw !== "string") {
        return jsonResponse(400, {
          ok: false,
          error: "invalid_body",
          details: "promo_code must be a string if provided",
        });
      }
      promoCode = promoCodeRaw.trim();
      if (promoCode === "") promoCode = null;
    }

    // 8. Service client (cf. note `!` plus haut)
    const svcClient = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 9. Fetch credit_pack
    const { data: pack, error: packErr } = await svcClient
      .from("credit_packs")
      .select("id, name, credits_amount, price_mga")
      .eq("id", creditPackId)
      .maybeSingle();

    if (packErr) {
      logEvent("pack_lookup_error", {
        user: shortId(userId),
        msg: String(packErr.message ?? "").slice(0, 200),
      });
      return jsonResponse(500, { ok: false, error: "pack_lookup_failed" });
    }
    if (!pack) {
      return jsonResponse(404, { ok: false, error: "pack_not_found", pack_id: creditPackId });
    }

    // 10. Cap garde-fou beta
    const maxAmount = parseInt(Deno.env.get("VPI_MAX_AMOUNT_MGA") ?? "100000", 10);
    if (Number.isFinite(maxAmount) && pack.price_mga > maxAmount) {
      return jsonResponse(400, {
        ok: false,
        error: "amount_exceeds_beta_limit",
        max: maxAmount,
        requested: pack.price_mga,
      });
    }

    // 11. Promo validation (optional)
    let finalAmount: number = pack.price_mga;
    let bonusCredits = 0;

    if (promoCode) {
      const { data: promoRows, error: promoErr } = await userClient.rpc("validate_promo_code", {
        p_code: promoCode,
        p_credit_pack_id: creditPackId,
      });

      if (promoErr) {
        logEvent("promo_rpc_error", {
          user: shortId(userId),
          msg: String(promoErr.message ?? "").slice(0, 200),
        });
        return jsonResponse(500, { ok: false, error: "promo_validation_failed" });
      }

      const promoRes = Array.isArray(promoRows) ? promoRows[0] : promoRows;
      if (!promoRes || promoRes.valid !== true) {
        return jsonResponse(400, {
          ok: false,
          error: "invalid_promo",
          reason: promoRes?.error_code ?? "unknown",
        });
      }

      if (typeof promoRes.final_price_mga === "number") {
        finalAmount = promoRes.final_price_mga;
      }
      if (typeof promoRes.bonus_credits === "number") {
        bonusCredits = promoRes.bonus_credits;
      }
    }

    // 12. Create transaction via user client (needs auth.uid())
    const { data: txIdRaw, error: txErr } = await userClient.rpc("create_transaction_with_promo", {
      p_credit_pack_id: creditPackId,
      p_method: "vanilla_pay",
      p_amount_mga: finalAmount,
      p_payment_proof_url: null,
      p_reference: null,
      p_promo_code: promoCode,
    });

    if (txErr || !txIdRaw) {
      logEvent("tx_creation_failed", {
        user: shortId(userId),
        msg: String(txErr?.message ?? "no_id_returned").slice(0, 200),
      });
      return jsonResponse(500, {
        ok: false,
        error: "tx_creation_failed",
        details: String(txErr?.message ?? "no_id_returned").slice(0, 200),
      });
    }
    const txId = String(txIdRaw);

    // 13. Stamp provider metadata (service role)
    const initiatedAt = new Date().toISOString();
    const initialProviderResponse = {
      mode_paiement: paymentMode,
      initiated_at_client: initiatedAt,
    };

    const { error: stampErr } = await svcClient
      .from("transactions")
      .update({
        provider: "vanilla_pay",
        provider_initiated_at: initiatedAt,
        provider_response: initialProviderResponse,
      })
      .eq("id", txId)
      .eq("user_id", userId);

    if (stampErr) {
      // CRITICAL : tx créée mais provider metadata pas stampée. Cohérence
      // DB/VPI potentiellement dégradée → remontée en console.error pour
      // déclencher les alertes Supabase. On continue quand même : la tx
      // existe et le webhook pourra renseigner provider_response plus tard.
      console.error(`[vpi-initiate] [CRITICAL] provider_stamp_failed`, JSON.stringify({
        user: shortId(userId),
        tx: shortId(txId),
        msg: String(stampErr.message ?? "").slice(0, 200),
      }));
    }

    // 14. DRY_RUN bypass
    const dryRun = Deno.env.get("VPI_DRY_RUN") === "true";
    if (dryRun) {
      const fakeCheckoutUrl = `${supabaseUrl}/functions/v1/vpi-dry-run-checkout?tx=${txId}`;
      const fakeVpiId = `DRY_RUN_${txId}`;

      await svcClient
        .from("transactions")
        .update({
          provider_checkout_url: fakeCheckoutUrl,
          provider_payment_id: fakeVpiId,
        })
        .eq("id", txId)
        .eq("user_id", userId);

      logEvent("dry_run_ok", {
        user: shortId(userId),
        tx: shortId(txId),
        amount: finalAmount,
        bonus: bonusCredits,
      });

      return jsonResponse(200, {
        ok: true,
        checkout_url: fakeCheckoutUrl,
        transaction_id: txId,
        amount_mga: finalAmount,
        bonus_credits: bonusCredits,
        pack_credits: pack.credits_amount,
        total_credits_expected: pack.credits_amount + bonusCredits,
        dry_run: true,
      });
    }

    // 15. Real VPI call
    let token: string;
    try {
      token = await getVpiToken();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      logEvent("vpi_token_error", { user: shortId(userId), tx: shortId(txId), msg: msg.slice(0, 200) });
      await svcClient.rpc("service_reject_provider_transaction", {
        p_transaction_id: txId,
        p_reason: "vpi_token_error",
        p_provider_response: { error: msg.slice(0, 300) },
      });
      return jsonResponse(502, { ok: false, error: "vpi_token_error" });
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://autonex.mg";
    const baseUrl = vpiBaseUrl!.replace(/\/+$/, "");
    const notifUrl = `${supabaseUrl}/functions/v1/vpi-webhook`;
    const redirectUrl = `${siteUrl.replace(/\/+$/, "")}/paiement/retour`;

    const vpiPayload = {
      montant: finalAmount,
      reference: txId,
      panier: `${pack.name} - ${shortId(userId)}`,
      notif_url: notifUrl,
      redirect_url: redirectUrl,
      devise: "MGA",
      mode_paiement: paymentMode,
    };

    let vpiResponse: Response;
    try {
      vpiResponse = await fetch(`${baseUrl}/api/webpayment/v2/initiate`, {
        method: "POST",
        headers: {
          "Accept": "*/*",
          "VPI-Version": Deno.env.get("VPI_VERSION") ?? "",
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vpiPayload),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "network_error";
      logEvent("vpi_network_error", { user: shortId(userId), tx: shortId(txId), msg: msg.slice(0, 200) });
      await svcClient.rpc("service_reject_provider_transaction", {
        p_transaction_id: txId,
        p_reason: "vpi_network_error",
        p_provider_response: { error: msg.slice(0, 300) },
      });
      return jsonResponse(502, { ok: false, error: "vpi_network_error" });
    }

    // 16. Parse VPI response
    if (!vpiResponse.ok) {
      const bodySnippet = await vpiResponse.text().catch(() => "");
      logEvent("vpi_http_failure", {
        user: shortId(userId),
        tx: shortId(txId),
        status: vpiResponse.status,
      });
      await svcClient.rpc("service_reject_provider_transaction", {
        p_transaction_id: txId,
        p_reason: `vpi_http_${vpiResponse.status}`,
        p_provider_response: {
          status: vpiResponse.status,
          body: bodySnippet.slice(0, 500),
        },
      });
      return jsonResponse(502, {
        ok: false,
        error: "vpi_http_failure",
        status: vpiResponse.status,
      });
    }

    let vpiPayloadOut: {
      CodeRetour?: number;
      DescRetour?: string;
      Data?: { url?: string };
    };
    try {
      vpiPayloadOut = await vpiResponse.json();
    } catch {
      await svcClient.rpc("service_reject_provider_transaction", {
        p_transaction_id: txId,
        p_reason: "vpi_invalid_json",
        p_provider_response: { note: "response not parseable as json" },
      });
      return jsonResponse(502, { ok: false, error: "vpi_invalid_json" });
    }

    if (vpiPayloadOut?.CodeRetour !== 200) {
      const desc = typeof vpiPayloadOut?.DescRetour === "string" ? vpiPayloadOut.DescRetour : "";
      logEvent("vpi_denied", {
        user: shortId(userId),
        tx: shortId(txId),
        code: vpiPayloadOut?.CodeRetour,
      });
      await svcClient.rpc("service_reject_provider_transaction", {
        p_transaction_id: txId,
        p_reason: `vpi_denied_${vpiPayloadOut?.CodeRetour ?? "unknown"}`,
        p_provider_response: {
          CodeRetour: vpiPayloadOut?.CodeRetour ?? null,
          DescRetour: desc.slice(0, 300),
        },
      });
      return jsonResponse(502, {
        ok: false,
        error: "vpi_denied",
        code: vpiPayloadOut?.CodeRetour ?? null,
        desc: desc.slice(0, 200),
      });
    }

    const checkoutUrl = vpiPayloadOut?.Data?.url;
    if (!checkoutUrl || typeof checkoutUrl !== "string") {
      await svcClient.rpc("service_reject_provider_transaction", {
        p_transaction_id: txId,
        p_reason: "vpi_missing_url",
        p_provider_response: { note: "CodeRetour=200 but Data.url missing" },
      });
      return jsonResponse(502, { ok: false, error: "vpi_missing_url" });
    }

    const idMatch = checkoutUrl.match(/[?&]id=([^&]+)/);
    const providerId = idMatch?.[1] ?? checkoutUrl;

    // 17. Update tx with provider URL + id
    const { error: updateErr } = await svcClient
      .from("transactions")
      .update({
        provider_checkout_url: checkoutUrl,
        provider_payment_id: providerId,
      })
      .eq("id", txId)
      .eq("user_id", userId);

    if (updateErr) {
      // CRITICAL : VPI a le checkout mais on n'a pas pu persister l'URL côté
      // DB. Le user peut toujours payer (le webhook matchera via reference
      // = txId) mais le lien côté app est perdu → remontée en console.error
      // pour alertes Supabase.
      console.error(`[vpi-initiate] [CRITICAL] provider_url_update_failed`, JSON.stringify({
        user: shortId(userId),
        tx: shortId(txId),
        msg: String(updateErr.message ?? "").slice(0, 200),
      }));
    }

    logEvent("initiate_ok", {
      user: shortId(userId),
      tx: shortId(txId),
      amount: finalAmount,
      bonus: bonusCredits,
      mode: paymentMode,
    });

    // 18. Success
    return jsonResponse(200, {
      ok: true,
      checkout_url: checkoutUrl,
      transaction_id: txId,
      amount_mga: finalAmount,
      bonus_credits: bonusCredits,
      pack_credits: pack.credits_amount,
      total_credits_expected: pack.credits_amount + bonusCredits,
      dry_run: false,
    });
  } catch (e: unknown) {
    // 19. Global fallback
    const msg = e instanceof Error ? e.message : "unknown";
    const stack = e instanceof Error && typeof e.stack === "string" ? e.stack.slice(0, 300) : "";
    logEvent("internal_error", {
      user: shortId(userId),
      msg: msg.slice(0, 200),
      stack,
    });
    return jsonResponse(500, { ok: false, error: "internal_error" });
  }
});
