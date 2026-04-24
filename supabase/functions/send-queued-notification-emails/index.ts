// @ts-nocheck
// Supabase Edge Function — send-queued-notification-emails (Lot 10.2).
// -----------------------------------------------------------------------------
// Déclenchée par pg_cron :
//   * `?mode=immediate` toutes les 5 min  → envoi priorités `critical`
//   * `?mode=digest`    daily 18h EAT     → envoi groupé priorités high+normal
//
// Pipeline :
//   1. RPC `list_notification_emails_ready(mode, limit)` (service role)
//      → liste des notifs prêtes + email utilisateur + quota courant
//   2. Pour chaque notif :
//       a) Si quota atteint → RPC `mark_notification_email_skipped_quota`
//       b) Sinon : route vers le template approprié (selon notification_type)
//       c) POST Resend
//       d) Succès → RPC `mark_notification_email_sent`
//          Échec  → RPC `mark_notification_email_failed`
//   3. En mode `digest`, on agrège PAR USER : une seule notif envoyée par user
//      avec template `digest-daily` qui liste toutes les notifs pending.
//
// Env (Supabase Secrets) :
//   RESEND_API_KEY              — clé Resend
//   NOTIFICATIONS_EMAIL_FROM    — sender vérifié (défaut : "notifications@autonex.mg")
//   SUPABASE_URL                — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY   — auto-injected
//
// Déploiement (Ali) :
//   supabase functions deploy send-queued-notification-emails --project-ref wtkedamrmtvdoippqanc
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderListingPublishedEmail } from "./templates/listing-published.ts";
import { renderListingRejectedEmail } from "./templates/listing-rejected.ts";
import { renderCreditsPurchasedEmail } from "./templates/credits-purchased.ts";
import { renderDigestDailyEmail, type DigestNotification } from "./templates/digest-daily.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type ReadyNotification = {
  notification_id: string;
  user_id: string;
  email_to: string;
  priority: "critical" | "high" | "normal" | "low";
  category: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  action_url: string | null;
  icon: string;
  created_at: string;
  user_max_emails_per_day: number;
  user_emails_sent_today: number;
};

/**
 * Route une notif unique vers un template `single-send`.
 * Utilisé en mode `immediate`.
 */
function routeSingleTemplate(n: ReadyNotification):
  | { template: string; subject: string; html: string }
  | null {
  const meta = (n.metadata ?? {}) as Record<string, unknown>;
  const firstName = null; // Extension future : lire profiles.first_name via le JOIN.

  switch (n.type) {
    case "listing_published": {
      const rendered = renderListingPublishedEmail({
        firstName,
        listingTitle: String(meta.listing_title ?? n.title),
        listingId: String(meta.listing_id ?? ""),
      });
      return { template: "listing_published", subject: rendered.subject, html: rendered.html };
    }
    case "listing_rejected": {
      const rendered = renderListingRejectedEmail({
        firstName,
        listingTitle: String(meta.listing_title ?? n.title),
        listingId: String(meta.listing_id ?? ""),
        rejectionReason: meta.rejection_reason ? String(meta.rejection_reason) : null,
      });
      return { template: "listing_rejected", subject: rendered.subject, html: rendered.html };
    }
    case "credits_purchased": {
      const creditsAdded = Number(meta.delta ?? 0);
      const balanceAfter = Number(meta.balance_after ?? 0);
      const transactionId = meta.transaction_id ? String(meta.transaction_id) : null;
      const rendered = renderCreditsPurchasedEmail({
        firstName,
        creditsAdded,
        balanceAfter,
        transactionId,
      });
      return { template: "credits_purchased", subject: rendered.subject, html: rendered.html };
    }
    default:
      // Type sans template dédié pour l'envoi unitaire. En immédiat, on skip ;
      // en digest, ces notifs sont agrégées dans le template digest-daily.
      return null;
  }
}

/**
 * Rend le digest quotidien pour un user donné, à partir de ses notifs non
 * envoyées.
 */
function routeDigest(userNotifs: ReadyNotification[]): {
  template: string;
  subject: string;
  html: string;
} {
  const items: DigestNotification[] = userNotifs.map((n) => ({
    id: n.notification_id,
    title: n.title,
    body: n.body,
    category: n.category,
    actionUrl: n.action_url,
    createdAt: n.created_at,
  }));
  const dateLabel = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const rendered = renderDigestDailyEmail({
    firstName: null,
    dateLabel,
    notifications: items,
  });
  return { template: "digest_daily", subject: rendered.subject, html: rendered.html };
}

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, error: `status_${resp.status}: ${text.slice(0, 400)}` };
    }
    const data = await resp.json().catch(() => ({}));
    return { ok: true, id: data?.id ? String(data.id) : null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch_failed" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "immediate";
  if (mode !== "immediate" && mode !== "digest") {
    return new Response(JSON.stringify({ error: "invalid_mode" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FROM = Deno.env.get("NOTIFICATIONS_EMAIL_FROM") ?? "notifications@autonex.mg";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "missing_env" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Fetch des notifs prêtes.
  const { data: readyRows, error: fetchErr } = await supabase.rpc(
    "list_notification_emails_ready",
    { p_mode: mode, p_limit: 200 },
  );

  if (fetchErr) {
    return new Response(JSON.stringify({ error: "rpc_failed", detail: fetchErr.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const ready: ReadyNotification[] = Array.isArray(readyRows) ? readyRows : [];

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  if (mode === "digest") {
    // 2-digest. Agrégation PAR user (un seul email par user par run).
    const byUser = new Map<string, ReadyNotification[]>();
    for (const n of ready) {
      const arr = byUser.get(n.user_id) ?? [];
      arr.push(n);
      byUser.set(n.user_id, arr);
    }
    for (const [userId, notifs] of byUser.entries()) {
      // Quota : si l'user a déjà atteint sa limite, skip tout son bucket.
      const first = notifs[0];
      if (first.user_emails_sent_today >= first.user_max_emails_per_day) {
        for (const n of notifs) {
          await supabase.rpc("mark_notification_email_skipped_quota", {
            p_notification_id: n.notification_id,
            p_email_to: n.email_to,
          });
          skippedCount += 1;
        }
        continue;
      }
      const rendered = routeDigest(notifs);
      const result = await sendViaResend(RESEND_API_KEY, FROM, first.email_to, rendered.subject, rendered.html);
      if (result.ok) {
        // On marque TOUTES les notifs agrégées comme envoyées (elles ont
        // toutes fait l'objet du même email).
        for (const n of notifs) {
          await supabase.rpc("mark_notification_email_sent", {
            p_notification_id: n.notification_id,
            p_email_to: n.email_to,
            p_subject: rendered.subject,
            p_template: rendered.template,
            p_resend_message_id: result.id,
          });
          sentCount += 1;
        }
      } else {
        for (const n of notifs) {
          await supabase.rpc("mark_notification_email_failed", {
            p_notification_id: n.notification_id,
            p_email_to: n.email_to,
            p_subject: rendered.subject,
            p_template: rendered.template,
            p_error_message: result.error,
          });
          failedCount += 1;
        }
      }
    }
  } else {
    // 2-immediate. Un email par notif.
    for (const n of ready) {
      if (n.user_emails_sent_today >= n.user_max_emails_per_day) {
        await supabase.rpc("mark_notification_email_skipped_quota", {
          p_notification_id: n.notification_id,
          p_email_to: n.email_to,
        });
        skippedCount += 1;
        continue;
      }
      const routed = routeSingleTemplate(n);
      if (!routed) {
        // Pas de template pour ce type. On skip sans log (pas une erreur).
        continue;
      }
      const result = await sendViaResend(RESEND_API_KEY, FROM, n.email_to, routed.subject, routed.html);
      if (result.ok) {
        await supabase.rpc("mark_notification_email_sent", {
          p_notification_id: n.notification_id,
          p_email_to: n.email_to,
          p_subject: routed.subject,
          p_template: routed.template,
          p_resend_message_id: result.id,
        });
        sentCount += 1;
      } else {
        await supabase.rpc("mark_notification_email_failed", {
          p_notification_id: n.notification_id,
          p_email_to: n.email_to,
          p_subject: routed.subject,
          p_template: routed.template,
          p_error_message: result.error,
        });
        failedCount += 1;
      }
    }
  }

  return new Response(
    JSON.stringify({
      mode,
      sent: sentCount,
      failed: failedCount,
      skipped_quota: skippedCount,
      total_candidates: ready.length,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
