// @ts-nocheck
// Supabase Edge Functions — Vanilla Pay CORS helper
// -----------------------------------------------------------------------------
// Shared CORS headers + preflight handler for the three Vanilla Pay edge
// functions (vpi-initiate-payment, vpi-webhook, vpi-verify-status).
//
// Why Access-Control-Allow-Origin: *
//   These endpoints are stateless API functions. They do NOT rely on cookies
//   or any ambient browser credentials — auth is carried explicitly in the
//   Authorization header (Supabase anon/JWT) or, for vpi-webhook, via the
//   vpi-signature HMAC header. No credentials => wildcard origin is safe and
//   matches the existing send-contact-email / send-deletion-notification-email
//   pattern.
//
// Why vpi-signature is listed in Allow-Headers
//   Vanilla Pay signs webhook callbacks with an HMAC placed in the
//   vpi-signature request header. Browsers never send this header directly
//   (webhooks are server-to-server), but listing it here keeps the contract
//   explicit and avoids surprises if a debugging tool replays a call from a
//   browser.
//
// Why Max-Age: 86400
//   24h preflight cache. Cuts the number of OPTIONS round-trips the browser
//   issues during a payment flow (initiate + poll status), which matters on
//   the slower mobile connections common in Madagascar.
// -----------------------------------------------------------------------------

export const VPI_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, vpi-signature",
  "Access-Control-Max-Age": "86400",
};

export function handleVpiOptionsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: VPI_CORS_HEADERS });
  }
  return null;
}
