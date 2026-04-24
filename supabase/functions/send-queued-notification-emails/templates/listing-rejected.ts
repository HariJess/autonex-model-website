// @ts-nocheck
import { escapeHtml, renderButton, renderLayout, TEXT, MUTED, BORDER } from "./layout.ts";

export type ListingRejectedProps = {
  firstName: string | null;
  listingTitle: string;
  listingId: string;
  rejectionReason: string | null;
};

export function renderListingRejectedEmail(props: ListingRejectedProps): {
  subject: string;
  html: string;
} {
  const { firstName, listingTitle, listingId, rejectionReason } = props;
  const subject = `Votre annonce « ${listingTitle} » nécessite des modifications`;
  const greeting = firstName ? `Bonjour ${escapeHtml(firstName)},` : "Bonjour,";
  const url = `https://autonex.mg/publier?draft=${encodeURIComponent(listingId)}`;

  const reasonBlock = rejectionReason
    ? `
      <div style="margin:16px 0;padding:14px 16px;background-color:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;">
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#92400E;">Raison du retour :</p>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#78350F;">${escapeHtml(rejectionReason)}</p>
      </div>`
    : "";

  const content = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:22px;color:${TEXT};">${greeting}</h1>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:${TEXT};">
      Nous avons examiné votre annonce <strong>${escapeHtml(listingTitle)}</strong>. Quelques ajustements sont nécessaires avant qu'elle puisse être publiée.
    </p>
    ${reasonBlock}
    <p style="margin:16px 0 0 0;font-size:14px;color:${MUTED};line-height:1.6;">
      Pas d'inquiétude : corrigez les points ci-dessus, puis relancez la publication. Votre brouillon est conservé tel quel.
    </p>
    ${renderButton("Modifier mon annonce", url)}
    <p style="margin:16px 0 0 0;font-size:12px;color:${MUTED};border-top:1px solid ${BORDER};padding-top:14px;">
      Besoin d'aide ? Répondez à cet email ou écrivez à <a href="mailto:support@autonex.mg" style="color:${MUTED};">support@autonex.mg</a>.
    </p>
  `;

  return {
    subject,
    html: renderLayout({
      previewText: `Votre annonce ${listingTitle} nécessite quelques ajustements.`,
      contentHtml: content,
    }),
  };
}
