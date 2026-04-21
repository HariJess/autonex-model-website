// @ts-nocheck
// Supabase Edge Function — send-deletion-notification-email
// -----------------------------------------------------------------------------
// Transactional email sent after a successful request_account_deletion() RPC.
// Invoked by the frontend (Mission 5.A.4 hook) with the user's email and the
// scheduled deletion timestamp. Does NOT touch the database — logging of the
// send status to profiles.deletion_email_sent_at / deletion_email_error is
// handled by the frontend call site so that send-success / send-failure is
// attributable to the same transaction context as the RPC call.
//
// Same pattern as send-contact-email (Mission 3): Resend API, CORS preflight,
// HTML inline. Deliberately stateless to keep the failure surface small — a
// failed email is a warning, never a blocker for the deletion request itself.
//
// Required env (Supabase Secrets):
//   RESEND_API_KEY       — Resend API key (shared with contact form)
//   CONTACT_EMAIL_FROM   — verified Resend sender (e.g. noreply@autonex.mg)
//
// Optional env:
//   SITE_URL             — used to build the cancellation link
//                          (default: https://autonex.mg)
//
// Deployment (Ali, post-commit):
//   supabase functions deploy send-deletion-notification-email \
//     --project-ref wtkedamrmtvdoippqanc --no-verify-jwt
//
// --no-verify-jwt rationale: the sensitive authority is the DB RPC
// request_account_deletion() which already runs as auth.uid() and writes the
// canonical state. This email is a courtesy notification; validating the JWT
// here would add no security (a malicious caller with someone's email can
// also just POST directly to Resend). Keep the surface minimal.
// -----------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL_FALLBACK = "https://autonex.mg";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function escapeHtml(input: string): string {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatFrenchMadagascarDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Indian/Antananarivo",
  }).format(d);
}

function buildEmailHtml(input: {
  full_name?: string;
  deletion_scheduled_for: string;
  site_url: string;
}): string {
  const { full_name, deletion_scheduled_for, site_url } = input;
  const formattedDate = formatFrenchMadagascarDate(deletion_scheduled_for);
  const greeting = full_name && full_name.trim().length > 0
    ? `Bonjour ${escapeHtml(full_name.trim())},`
    : "Bonjour,";
  const cancelLink = `${site_url.replace(/\/+$/, "")}/settings#zone-danger`;

  return `<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background:#F7F8FA;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0F172A;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="padding:0 0 20px 0;border-bottom:1px solid #E5E7EB;">
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#0F172A;">AutoNex</p>
      <p style="margin:4px 0 0 0;font-size:12px;color:#6B7280;">Marketplace automobile Madagascar</p>
    </div>

    <h1 style="font-size:20px;margin:28px 0 16px 0;line-height:1.3;">
      Votre compte sera supprimé le ${escapeHtml(formattedDate)}
    </h1>

    <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">${greeting}</p>

    <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">
      Nous avons bien enregistré votre demande de suppression de compte AutoNex.
      Votre compte restera accessible en lecture pour vous pendant 30 jours
      avant l'anonymisation définitive.
    </p>

    <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">
      <strong>Vous pouvez annuler cette demande à tout moment pendant les 30 prochains jours.</strong><br />
      Après le ${escapeHtml(formattedDate)} à minuit (heure Madagascar), la suppression
      sera effective et irréversible : vos données personnelles seront anonymisées
      conformément à l'article 17 du RGPD.
    </p>

    <div style="padding:12px 0 24px 0;">
      <a href="${escapeHtml(cancelLink)}"
         style="display:inline-block;padding:12px 22px;background:#0F172A;color:#FFFFFF;
                text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
        Annuler la suppression
      </a>
    </div>

    <div style="padding:16px;background:#F3F4F6;border-radius:8px;margin-bottom:24px;">
      <p style="font-size:13px;line-height:1.55;color:#374151;margin:0;">
        <strong>Conformité RGPD.</strong> APLi SARLU traite votre demande conformément
        à l'article 17 du Règlement Général sur la Protection des Données et à la loi
        malgache 2014-038 sur la protection des données à caractère personnel. Pour
        toute question, contactez-nous à
        <a href="mailto:info@autonex.mg" style="color:#0F172A;">info@autonex.mg</a>.
      </p>
    </div>

    <p style="font-size:14px;line-height:1.5;margin:0 0 8px 0;">
      L'équipe AutoNex<br />
      <span style="color:#6B7280;font-size:12px;">APLi SARLU — RCS Antananarivo 2025 B 00769</span>
    </p>

    <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 12px 0;" />

    <p style="font-size:11px;color:#9CA3AF;line-height:1.5;margin:0;">
      Email transactionnel envoyé automatiquement suite à votre demande de suppression.
      Aucun désabonnement n'est prévu : ce message est lié à une action précise de
      votre part et non à une liste de diffusion.
    </p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "method_not_allowed", statusCode: 405 }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const CONTACT_EMAIL_FROM = Deno.env.get("CONTACT_EMAIL_FROM") ?? "noreply@autonex.mg";
  const SITE_URL = Deno.env.get("SITE_URL") ?? SITE_URL_FALLBACK;

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: "missing_env", statusCode: 500 }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: {
    user_id?: string;
    email?: string;
    full_name?: string;
    deletion_scheduled_for?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "invalid_json", statusCode: 400 }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const user_id = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const full_name = typeof body.full_name === "string" ? body.full_name : undefined;
  const deletion_scheduled_for =
    typeof body.deletion_scheduled_for === "string" ? body.deletion_scheduled_for : "";

  if (!UUID_RE.test(user_id)) {
    return new Response(JSON.stringify({ success: false, error: "invalid_user_id", statusCode: 400 }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ success: false, error: "invalid_email", statusCode: 400 }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  const scheduledDate = new Date(deletion_scheduled_for);
  if (Number.isNaN(scheduledDate.getTime())) {
    return new Response(
      JSON.stringify({ success: false, error: "invalid_deletion_scheduled_for", statusCode: 400 }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const html = buildEmailHtml({ full_name, deletion_scheduled_for, site_url: SITE_URL });

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CONTACT_EMAIL_FROM,
      to: [email],
      subject: "[AutoNex] Votre demande de suppression de compte",
      html,
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text().catch(() => "");
    return new Response(
      JSON.stringify({
        success: false,
        error: errorText.slice(0, 500) || `resend_status_${resendResponse.status}`,
        statusCode: resendResponse.status,
      }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let resend_id: string | null = null;
  try {
    const payload = (await resendResponse.json()) as { id?: string };
    resend_id = payload?.id ?? null;
  } catch {
    /* Resend returned non-JSON on 2xx — ignore, delivery succeeded either way */
  }

  return new Response(JSON.stringify({ success: true, resend_id }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
