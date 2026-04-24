// @ts-nocheck
import { escapeHtml, renderButton, renderLayout, TEXT, MUTED, BORDER } from "./layout.ts";

export type CreditsPurchasedProps = {
  firstName: string | null;
  creditsAdded: number;
  balanceAfter: number;
  transactionId: string | null;
};

function formatCredits(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function renderCreditsPurchasedEmail(props: CreditsPurchasedProps): {
  subject: string;
  html: string;
} {
  const { firstName, creditsAdded, balanceAfter, transactionId } = props;
  const subject = `Paiement confirmé — ${formatCredits(creditsAdded)} crédits AutoNex`;
  const greeting = firstName ? `Merci ${escapeHtml(firstName)} !` : "Merci !";
  const url = "https://autonex.mg/publier";

  const txBlock = transactionId
    ? `<p style="margin:12px 0 0 0;font-size:11px;color:${MUTED};">Référence transaction : ${escapeHtml(transactionId)}</p>`
    : "";

  const content = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:22px;color:${TEXT};">${greeting}</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${TEXT};">
      Votre achat de crédits est confirmé. Voici le récapitulatif :
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 16px 0;font-size:14px;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:10px 14px;color:${MUTED};background-color:#F9FAFB;border-bottom:1px solid ${BORDER};">Crédits ajoutés</td>
        <td style="padding:10px 14px;text-align:right;font-weight:600;color:${TEXT};border-bottom:1px solid ${BORDER};">+${formatCredits(creditsAdded)} crédits</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:${MUTED};background-color:#F9FAFB;">Nouveau solde</td>
        <td style="padding:10px 14px;text-align:right;font-weight:700;color:${TEXT};font-size:16px;">${formatCredits(balanceAfter)} crédits</td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${MUTED};">
      Vous pouvez désormais publier vos annonces ou activer des boosts de visibilité.
    </p>
    ${renderButton("Publier une annonce", url)}
    ${txBlock}
  `;

  return {
    subject,
    html: renderLayout({
      previewText: `+${formatCredits(creditsAdded)} crédits ajoutés. Nouveau solde : ${formatCredits(balanceAfter)} crédits.`,
      contentHtml: content,
    }),
  };
}
