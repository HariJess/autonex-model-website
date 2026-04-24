// @ts-nocheck
// Layout commun pour les emails de notifications AutoNex (Lot 10.2).
//
// Palette extraite de src/index.css (mode clair) :
//   --primary:    hsl(218 83% 45%)  →  #1E4CC4 (bleu AutoNex)
//   --background: hsl(220 38% 98%)  →  #F6F8FC
//   --foreground: hsl(222 47% 10%)  →  #0F172A
//   --muted:                            #6B7280
//
// Architecture HTML : tables + inline styles pour compat Gmail / Outlook / iOS.
// Pas de React Email pour rester aligné avec les fonctions Deno existantes
// (cf. `send-contact-email/index.ts`).

export const PRIMARY = "#1E4CC4";
export const PRIMARY_DARK = "#1D3FA3";
export const TEXT = "#0F172A";
export const MUTED = "#6B7280";
export const BORDER = "#E5E7EB";
export const BG = "#F6F8FC";
export const WHITE = "#FFFFFF";

export function escapeHtml(input: string): string {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export type LayoutParams = {
  previewText: string;
  contentHtml: string;
  unsubscribeUrl?: string;
};

/**
 * Rend l'enveloppe HTML complète d'un email AutoNex.
 * - Logo texte `AutoNex.mg` en header.
 * - Lien "Préférences de notifications" + lien désabonnement (optionnel) en footer.
 */
export function renderLayout({ previewText, contentHtml, unsubscribeUrl }: LayoutParams): string {
  const unsubscribe = unsubscribeUrl
    ? `· <a href="${escapeHtml(unsubscribeUrl)}" style="color:${MUTED};">Se désabonner</a>`
    : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AutoNex</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};color:${TEXT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none !important;color:transparent;opacity:0;max-height:0;max-width:0;">${escapeHtml(previewText)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:${WHITE};border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
          <tr>
            <td style="padding:24px 32px;background-color:${WHITE};border-bottom:1px solid ${BORDER};">
              <a href="https://autonex.mg" style="text-decoration:none;color:${TEXT};font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:-0.02em;">AutoNex<span style="color:${PRIMARY};">.mg</span></a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:${BG};border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};line-height:1.6;">
              <p style="margin:0 0 6px 0;">AutoNex — la marketplace automobile de référence à Madagascar.</p>
              <p style="margin:0;">
                <a href="https://autonex.mg/settings/notifications" style="color:${MUTED};">Préférences de notifications</a>
                ${unsubscribe}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Rend un bouton CTA encadré. Usage : dans le `contentHtml` du layout.
 */
export function renderButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr>
    <td style="border-radius:8px;background-color:${PRIMARY};">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;color:${WHITE};text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}
