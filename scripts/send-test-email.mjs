/**
 * Lot 10.2 — Script admin de prévisualisation des templates email.
 *
 * Usage :
 *   node scripts/send-test-email.mjs <template> <destinataire>
 *
 *   template ∈ { listing-published, listing-rejected, credits-purchased, digest-daily }
 *
 * Exemples :
 *   node scripts/send-test-email.mjs listing-published alipirbay@gmail.com
 *   node scripts/send-test-email.mjs digest-daily alipirbay@gmail.com
 *
 * Env requises (lues depuis .env.local ou l'environnement shell) :
 *   RESEND_API_KEY            — clé Resend
 *   NOTIFICATIONS_EMAIL_FROM  — sender vérifié (défaut : notifications@autonex.mg)
 *
 * Le script reproduit volontairement la logique des templates Deno
 * (`supabase/functions/send-queued-notification-emails/templates/`) en pur
 * Node, pour rester indépendant du runtime Deno et pouvoir ping Resend avec
 * des données de démo.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ----------------------------------------------------------------------------
// Mini-loader .env.local
// ----------------------------------------------------------------------------

function loadDotEnvLocal() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnvLocal();

// ----------------------------------------------------------------------------
// Constantes palette (miroir `supabase/functions/.../templates/layout.ts`)
// ----------------------------------------------------------------------------

const PRIMARY = "#1E4CC4";
const TEXT = "#0F172A";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const BG = "#F6F8FC";
const WHITE = "#FFFFFF";

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderButton(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td style="border-radius:8px;background-color:${PRIMARY};"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;color:${WHITE};text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function renderLayout({ previewText, contentHtml }) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>AutoNex</title></head><body style="margin:0;padding:0;background-color:${BG};color:${TEXT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none !important;color:transparent;opacity:0;max-height:0;max-width:0;">${escapeHtml(previewText)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BG};padding:32px 16px;"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:${WHITE};border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
      <tr><td style="padding:24px 32px;background-color:${WHITE};border-bottom:1px solid ${BORDER};"><a href="https://autonex.mg" style="text-decoration:none;color:${TEXT};font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:-0.02em;">AutoNex<span style="color:${PRIMARY};">.mg</span></a></td></tr>
      <tr><td style="padding:32px;">${contentHtml}</td></tr>
      <tr><td style="padding:20px 32px;background-color:${BG};border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};line-height:1.6;">
        <p style="margin:0 0 6px 0;">AutoNex — la marketplace automobile de référence à Madagascar.</p>
        <p style="margin:0;"><a href="https://autonex.mg/settings/notifications" style="color:${MUTED};">Préférences de notifications</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

// ----------------------------------------------------------------------------
// Templates (échantillons de démo)
// ----------------------------------------------------------------------------

function sampleListingPublished() {
  const listingTitle = "Toyota Hilux 2021 — très bon état à Ivandry";
  const listingId = "demo-listing-id-abc";
  const content = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:22px;color:${TEXT};">Bonne nouvelle !</h1>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:${TEXT};">
      Votre annonce <strong>${escapeHtml(listingTitle)}</strong> est désormais en ligne sur AutoNex.
    </p>
    ${renderButton("Voir mon annonce", `https://autonex.mg/annonce/${listingId}`)}
  `;
  return {
    subject: `Votre annonce « ${listingTitle} » est publiée ✓`,
    html: renderLayout({ previewText: `Votre annonce ${listingTitle} est en ligne sur AutoNex.`, contentHtml: content }),
  };
}

function sampleListingRejected() {
  const listingTitle = "Mazda MX-5 2024 — cabriolet";
  const listingId = "demo-listing-id-def";
  const content = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:22px;color:${TEXT};">Bonjour,</h1>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:${TEXT};">
      Nous avons examiné votre annonce <strong>${escapeHtml(listingTitle)}</strong>. Quelques ajustements sont nécessaires avant qu'elle puisse être publiée.
    </p>
    <div style="margin:16px 0;padding:14px 16px;background-color:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;">
      <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#92400E;">Raison du retour :</p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#78350F;">La photo de couverture est floue — veuillez en ajouter une nette.</p>
    </div>
    ${renderButton("Modifier mon annonce", `https://autonex.mg/publier?draft=${listingId}`)}
  `;
  return {
    subject: `Votre annonce « ${listingTitle} » nécessite des modifications`,
    html: renderLayout({ previewText: `Votre annonce ${listingTitle} nécessite quelques ajustements.`, contentHtml: content }),
  };
}

function sampleCreditsPurchased() {
  const content = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:22px;color:${TEXT};">Merci !</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${TEXT};">Votre achat de crédits est confirmé.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 16px 0;font-size:14px;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 14px;color:${MUTED};background-color:#F9FAFB;border-bottom:1px solid ${BORDER};">Crédits ajoutés</td><td style="padding:10px 14px;text-align:right;font-weight:600;color:${TEXT};border-bottom:1px solid ${BORDER};">+150 crédits</td></tr>
      <tr><td style="padding:10px 14px;color:${MUTED};background-color:#F9FAFB;">Nouveau solde</td><td style="padding:10px 14px;text-align:right;font-weight:700;color:${TEXT};font-size:16px;">320 crédits</td></tr>
    </table>
    ${renderButton("Publier une annonce", "https://autonex.mg/publier")}
  `;
  return {
    subject: "Paiement confirmé — 150 crédits AutoNex",
    html: renderLayout({ previewText: "+150 crédits ajoutés. Nouveau solde : 320 crédits.", contentHtml: content }),
  };
}

function sampleDigestDaily() {
  const dateLabel = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const sectionsHtml = `
    <h2 style="margin:18px 0 10px 0;font-family:Georgia,serif;font-size:16px;color:${TEXT};">Annonces <span style="color:${MUTED};font-size:13px;font-weight:400;">(2)</span></h2>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid ${BORDER};">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${MUTED};">Annonces</p>
        <p style="margin:4px 0 0 0;font-size:14px;font-weight:600;color:${TEXT};">Votre annonce expire dans 7 jours</p>
        <p style="margin:6px 0 0 0;font-size:13px;line-height:1.5;color:${MUTED};">Toyota RAV4 2021 — pensez à la renouveler.</p>
      </td></tr>
      <tr><td style="padding:14px 16px;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${MUTED};">Annonces</p>
        <p style="margin:4px 0 0 0;font-size:14px;font-weight:600;color:${TEXT};">Nouveau favori ajouté</p>
      </td></tr>
    </table>
  `;
  const content = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:22px;color:${TEXT};">Bonjour,</h1>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:${TEXT};">Voici votre résumé AutoNex du ${escapeHtml(dateLabel)} — <strong>2 notifications</strong> non lues.</p>
    ${sectionsHtml}
    ${renderButton("Voir toutes mes notifications", "https://autonex.mg/notifications")}
  `;
  return {
    subject: `Votre résumé AutoNex — ${dateLabel}`,
    html: renderLayout({ previewText: "2 notifications AutoNex cette journée.", contentHtml: content }),
  };
}

const TEMPLATES = {
  "listing-published": sampleListingPublished,
  "listing-rejected": sampleListingRejected,
  "credits-purchased": sampleCreditsPurchased,
  "digest-daily": sampleDigestDaily,
};

// ----------------------------------------------------------------------------
// Envoi
// ----------------------------------------------------------------------------

async function main() {
  const [, , templateName, to] = process.argv;
  if (!templateName || !to) {
    console.error("Usage: node scripts/send-test-email.mjs <template> <destinataire>");
    console.error("  templates : " + Object.keys(TEMPLATES).join(", "));
    process.exit(1);
  }

  const renderer = TEMPLATES[templateName];
  if (!renderer) {
    console.error(`Unknown template: ${templateName}`);
    console.error("  available: " + Object.keys(TEMPLATES).join(", "));
    process.exit(1);
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.NOTIFICATIONS_EMAIL_FROM || "notifications@autonex.mg";
  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY (via .env.local or shell env).");
    process.exit(1);
  }

  const { subject, html } = renderer();
  const previewPath = path.resolve(__dirname, "..", `.email-preview-${templateName}.html`);
  fs.writeFileSync(previewPath, html, "utf8");
  console.log(`Preview HTML saved to ${previewPath}`);

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error(`Resend ${resp.status}: ${text}`);
    process.exit(1);
  }
  console.log(`Sent "${subject}" to ${to}`);
  console.log(`Resend response: ${text}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
