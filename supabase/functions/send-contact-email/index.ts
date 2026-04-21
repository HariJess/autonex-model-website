// @ts-nocheck
// Supabase Edge Function — send-contact-email
// -----------------------------------------------------------------------------
// Invoked by the frontend right after a successful submit_contact_message RPC
// call (fire-and-forget from useSubmitContactMessage). Fetches the message
// from the database using the service role, renders an HTML email, and
// delivers it via Resend.
//
// Delivery success / failure is recorded back on the message row (email_sent_at
// / email_error). Failures are NEVER surfaced to the user — the message is
// already persisted; Ali can investigate via the admin panel.
//
// Required env (Supabase Secrets):
//   RESEND_API_KEY        — Resend API key
//   CONTACT_EMAIL_TO      — inbox that receives the notification (e.g. info@autonex.mg)
//   CONTACT_EMAIL_FROM    — verified sender on Resend (e.g. noreply@autonex.mg)
//   SUPABASE_URL          — injected by default
//   SUPABASE_SERVICE_ROLE_KEY — injected by default (needed to read contact_messages rows)
//
// Deployment (Ali, after domain + DNS verification on Resend):
//   supabase functions deploy send-contact-email
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUBJECT_LABELS: Record<string, string> = {
  general: "Question générale",
  technical: "Support technique",
  dealers: "Concessionnaires",
  partnerships: "Partenariats",
  other: "Autre",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(input: string): string {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml(msg: {
  full_name: string;
  email: string;
  whatsapp_phone: string | null;
  subject: string;
  message: string;
  id: string;
}): string {
  const subjectLabel = SUBJECT_LABELS[msg.subject] ?? msg.subject;
  const whatsappRow = msg.whatsapp_phone
    ? `<tr><td style="padding:4px 0;color:#6B7280;">WhatsApp</td><td style="padding:4px 0;">${escapeHtml(msg.whatsapp_phone)}</td></tr>`
    : "";
  return `<!DOCTYPE html>
<html lang="fr"><body style="font-family:system-ui,sans-serif;color:#0F172A;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 16px 0;">Nouveau message de contact — AutoNex</h1>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:4px 0;color:#6B7280;width:120px;">Nom</td><td style="padding:4px 0;">${escapeHtml(msg.full_name)}</td></tr>
    <tr><td style="padding:4px 0;color:#6B7280;">Email</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(msg.email)}">${escapeHtml(msg.email)}</a></td></tr>
    ${whatsappRow}
    <tr><td style="padding:4px 0;color:#6B7280;">Sujet</td><td style="padding:4px 0;"><strong>${escapeHtml(subjectLabel)}</strong></td></tr>
  </table>
  <hr style="margin:16px 0;border:none;border-top:1px solid #E5E7EB;" />
  <div style="white-space:pre-wrap;line-height:1.55;font-size:14px;">${escapeHtml(msg.message)}</div>
  <hr style="margin:24px 0;border:none;border-top:1px solid #E5E7EB;" />
  <p style="font-size:12px;color:#9CA3AF;">Message ID : ${escapeHtml(msg.id)}<br />Envoyé automatiquement depuis le formulaire /contact AutoNex.</p>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const CONTACT_EMAIL_TO = Deno.env.get("CONTACT_EMAIL_TO") ?? "info@autonex.mg";
  const CONTACT_EMAIL_FROM = Deno.env.get("CONTACT_EMAIL_FROM") ?? "noreply@autonex.mg";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "missing_env" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: { message_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!body.message_id) {
    return new Response(JSON.stringify({ error: "missing_message_id" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: msg, error: fetchErr } = await supabase
    .from("contact_messages")
    .select("id, full_name, email, whatsapp_phone, subject, message")
    .eq("id", body.message_id)
    .single();

  if (fetchErr || !msg) {
    return new Response(JSON.stringify({ error: "message_not_found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const subjectLabel = SUBJECT_LABELS[msg.subject] ?? msg.subject;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CONTACT_EMAIL_FROM,
      to: [CONTACT_EMAIL_TO],
      reply_to: msg.email,
      subject: `[Contact AutoNex] ${subjectLabel} — de ${msg.full_name}`,
      html: buildEmailHtml(msg),
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text().catch(() => "");
    await supabase
      .from("contact_messages")
      .update({ email_error: errorText.slice(0, 500) || `status_${resendResponse.status}` })
      .eq("id", msg.id);

    return new Response(JSON.stringify({ error: "resend_failed", detail: errorText }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("contact_messages")
    .update({ email_sent_at: new Date().toISOString(), email_error: null })
    .eq("id", msg.id);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
