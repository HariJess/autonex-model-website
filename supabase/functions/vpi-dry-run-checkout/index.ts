// @ts-nocheck
// Supabase Edge Function — vpi-dry-run-checkout
// -----------------------------------------------------------------------------
// Mission P.2 — Mock de la checkout page Vanilla Pay pour tests DRY_RUN.
//
// RÔLE
// VPI n'offre pas d'environnement sandbox accessible. Cette fonction simule
// la page de paiement VPI afin de tester le pipeline complet côté AutoNex :
//
//   vpi-initiate-payment (DRY_RUN=true)
//     → checkout_url = .../vpi-dry-run-checkout?tx={UUID}
//     → user clique un bouton Success/Failed dans cette page
//     → on signe un body webhook et on appelle vpi-webhook
//     → vpi-webhook dispatche vers service_approve_* ou service_reject_*
//     → redirect 302 vers SITE_URL/paiement/retour?tx={UUID}
//     → le front appelle vpi-check-status et voit la tx à jour
//
// Aucune communication avec VPI n'est faite. Le mock produit un payload
// webhook qui ressemble à un vrai callback VPI et le signe avec la même
// VPI_KEY_SECRET — le webhook lui-même ne voit aucune différence entre ce
// mock et un vrai callback, ce qui garantit qu'on teste le CODE RÉEL du
// webhook sans branche spéciale.
//
// POURQUOI PAS DE JWT
// C'est le mock d'un service externe. VPI réel n'envoie pas de JWT Supabase
// quand il redirige le user sur sa checkout page ; à fortiori le mock non plus.
// Fonction déployée avec --no-verify-jwt.
//
// DOUBLE GARDE-FOU
//   1. VPI_DRY_RUN doit valoir "true" — sinon la fonction retourne 403
//      immédiatement, AVANT même la lecture des autres env vars.
//   2. En Mission P.5 (activation prod), VPI_DRY_RUN est retiré côté secrets
//      et vpi-initiate-payment n'émet plus de checkout_url pointant vers ce
//      mock. Les deux couches doivent être désactivées pour accidentellement
//      router du trafic vers ici en prod → pratiquement impossible.
//
// SIGNATURE HMAC
// On utilise computeVpiSignature du helper _shared/vpi-hmac.ts, identique au
// code de vérification côté webhook. Clé VPI_KEY_SECRET partagée. Garantit
// que le webhook lit un HMAC valide et exécute le happy path de signature
// comme pour un vrai callback.
//
// SECRETS REQUIS
//   VPI_DRY_RUN = "true"                  garde-fou
//   SUPABASE_URL                          pour calculer l'URL du webhook
//   VPI_KEY_SECRET                        pour signer le body webhook
//   SITE_URL                              pour construire l'URL redirect
//
// DEPLOY
//   supabase functions deploy vpi-dry-run-checkout --project-ref wtkedamrmtvdoippqanc --no-verify-jwt
// -----------------------------------------------------------------------------

import { computeVpiSignature } from "../_shared/vpi-hmac.ts";
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
  console.log(`[vpi-dry-run] ${event}`, extra ? JSON.stringify(extra) : "");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Échappe les 5 caractères dangereux HTML. txId est déjà validé UUID (donc
 * ASCII alphanum + tirets), mais on échappe quand même par défense en
 * profondeur au cas où ce helper serait réutilisé ailleurs avec d'autres
 * inputs un jour.
 */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDryRunHtml(txId: string): string {
  const safeTx = escapeHtml(txId);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>DRY RUN — Simulation Paiement Vanilla Pay</title>
<style>
  body {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    background: #f3f4f6;
    color: #111827;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
  }
  .card {
    background: #ffffff;
    max-width: 600px;
    width: 100%;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
    padding: 32px 24px;
    text-align: center;
  }
  .banner {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 20px;
    letter-spacing: 0.02em;
  }
  h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 8px;
  }
  .subtitle {
    color: #6b7280;
    font-size: 14px;
    margin: 0 0 4px;
  }
  .tx-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    color: #374151;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 8px;
    display: inline-block;
    margin: 12px 0 24px;
    word-break: break-all;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 24px 0 16px;
  }
  @media (min-width: 480px) {
    .actions { flex-direction: row; }
    .actions form { flex: 1; }
  }
  button {
    width: 100%;
    padding: 14px 16px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.15s;
  }
  button:hover { filter: brightness(0.95); }
  button:focus { outline: 3px solid #60a5fa; outline-offset: 2px; }
  .btn-success { background: #10b981; color: #ffffff; }
  .btn-failed  { background: #ef4444; color: #ffffff; }
  .footer {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 16px;
    line-height: 1.5;
  }
</style>
</head>
<body>
  <main class="card" role="main">
    <div class="banner">⚠️ DRY RUN — AUCUN PAIEMENT RÉEL</div>
    <h1>Simulation Paiement Vanilla Pay</h1>
    <p class="subtitle">Transaction ID</p>
    <div class="tx-id">${safeTx}</div>

    <div class="actions">
      <form method="POST" action="?tx=${safeTx}&amp;action=success">
        <button type="submit" class="btn-success" aria-label="Simuler un paiement réussi">
          ✅ Simuler SUCCESS
        </button>
      </form>
      <form method="POST" action="?tx=${safeTx}&amp;action=failed">
        <button type="submit" class="btn-failed" aria-label="Simuler un paiement échoué">
          ❌ Simuler FAILED
        </button>
      </form>
    </div>

    <p class="footer">
      Ceci est un mock local. Aucun appel à Vanilla Pay n'est fait.<br>
      Le clic déclenche un webhook signé vers AutoNex puis un redirect
      vers la page de retour.
    </p>
  </main>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  const preflight = handleVpiOptionsPreflight(req);
  if (preflight) return preflight;

  // 2. DOUBLE GARDE-FOU — refuse tout request si DRY_RUN pas explicitement activé
  if (Deno.env.get("VPI_DRY_RUN") !== "true") {
    return jsonResponse(403, { ok: false, error: "dry_run_disabled" });
  }

  // 3. Env check
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const keySecret = Deno.env.get("VPI_KEY_SECRET");
  const siteUrl = Deno.env.get("SITE_URL");

  const missing = [
    !supabaseUrl && "SUPABASE_URL",
    !keySecret && "VPI_KEY_SECRET",
    !siteUrl && "SITE_URL",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    logEvent("missing_env", { missing });
    return jsonResponse(500, { ok: false, error: "missing_env", missing });
  }

  try {
    // 4. Parse + validate tx
    const url = new URL(req.url);
    const txId = url.searchParams.get("tx");
    if (!txId || !UUID_RE.test(txId)) {
      return jsonResponse(400, { ok: false, error: "invalid_tx" });
    }

    // 5. GET : render HTML page
    if (req.method === "GET") {
      return new Response(renderDryRunHtml(txId), {
        status: 200,
        headers: {
          ...VPI_CORS_HEADERS,
          "Content-Type": "text/html; charset=utf-8",
          // Page de mock → ne jamais indexer ou cacher.
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    // POST : execute the simulated action
    if (req.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "method_not_allowed" });
    }

    // 5b. Read action — query string first, form body as fallback
    let action = (url.searchParams.get("action") ?? "").trim().toLowerCase();
    if (!action) {
      try {
        const ct = req.headers.get("Content-Type") ?? "";
        const rawBody = await req.text();
        if (ct.includes("application/x-www-form-urlencoded") && rawBody.length > 0) {
          const params = new URLSearchParams(rawBody);
          action = (params.get("action") ?? "").trim().toLowerCase();
        }
      } catch {
        // fall through — action restera vide → invalid_action ci-dessous
      }
    }

    if (action !== "success" && action !== "failed") {
      return jsonResponse(400, { ok: false, error: "invalid_action" });
    }

    // 6. Build simulated webhook payload (shape aligned on VPI doc §6.1)
    const etat = action === "success" ? "SUCCESS" : "FAILED";
    const webhookPayload = {
      reference_VPI: `MOCK_${txId}`,
      reference: txId,
      panier: `DryRun-${shortId(txId)}`,
      montant: 1000,
      etat,
      initiateur: "0341234567",
      referenceMM: `MM_MOCK_${Date.now()}`,
    };
    const bodyStr = JSON.stringify(webhookPayload);

    // 7. Sign body with VPI_KEY_SECRET (same helper the webhook uses to verify)
    let signature: string;
    try {
      signature = await computeVpiSignature(bodyStr, keySecret);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error(
        `[vpi-dry-run] [CRITICAL] sign_failed`,
        JSON.stringify({ tx: shortId(txId), msg: msg.slice(0, 200) }),
      );
      return jsonResponse(500, { ok: false, error: "sign_failed" });
    }

    // 8. POST to the real vpi-webhook (same code path as a real VPI callback)
    const webhookUrl = `${supabaseUrl!.replace(/\/+$/, "")}/functions/v1/vpi-webhook`;
    let webhookResponse: Response;
    try {
      webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "vpi-signature": signature,
        },
        body: bodyStr,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "network_error";
      console.error(
        `[vpi-dry-run] [CRITICAL] webhook_call_failed`,
        JSON.stringify({ tx: shortId(txId), msg: msg.slice(0, 200) }),
      );
      return jsonResponse(502, { ok: false, error: "webhook_call_failed" });
    }

    // 9. Log outcome (the webhook's body already encodes ok/reason internally;
    //    we only care that it answered 200 and took the call)
    logEvent("dry_run_webhook_called", {
      tx: shortId(txId),
      action,
      webhook_status: webhookResponse.status,
      webhook_ok: webhookResponse.ok,
    });

    // 10. Redirect 302 to /paiement/retour?tx={txId}
    const returnUrl = `${siteUrl!.replace(/\/+$/, "")}/paiement/retour?tx=${encodeURIComponent(txId)}`;
    return new Response(null, {
      status: 302,
      headers: {
        ...VPI_CORS_HEADERS,
        Location: returnUrl,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    // 11. Global fallback
    const msg = e instanceof Error ? e.message : "unknown";
    const stack =
      e instanceof Error && typeof e.stack === "string" ? e.stack.slice(0, 300) : "";
    console.error(
      `[vpi-dry-run] [CRITICAL] internal_error`,
      JSON.stringify({ msg: msg.slice(0, 200), stack }),
    );
    return jsonResponse(500, { ok: false, error: "internal_error" });
  }
});
