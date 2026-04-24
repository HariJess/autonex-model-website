// @ts-nocheck
import { escapeHtml, renderButton, renderLayout, TEXT, MUTED } from "./layout.ts";

export type ListingPublishedProps = {
  firstName: string | null;
  listingTitle: string;
  listingId: string;
};

export function renderListingPublishedEmail(props: ListingPublishedProps): {
  subject: string;
  html: string;
} {
  const { firstName, listingTitle, listingId } = props;
  const subject = `Votre annonce « ${listingTitle} » est publiée ✓`;
  const greeting = firstName ? `Bonne nouvelle ${escapeHtml(firstName)} !` : "Bonne nouvelle !";
  const url = `https://autonex.mg/annonce/${encodeURIComponent(listingId)}`;

  const content = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:22px;color:${TEXT};">${greeting}</h1>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:${TEXT};">
      Votre annonce <strong>${escapeHtml(listingTitle)}</strong> est désormais en ligne sur AutoNex. Elle est visible par tous les acheteurs, et vous recevrez les demandes de contact directement.
    </p>
    <p style="margin:0 0 8px 0;font-size:14px;color:${MUTED};">
      Vérifiez que la photo de couverture est bien celle que vous souhaitez mettre en avant. Un bon visuel fait la différence.
    </p>
    ${renderButton("Voir mon annonce", url)}
  `;

  return {
    subject,
    html: renderLayout({
      previewText: `Votre annonce ${listingTitle} est en ligne sur AutoNex.`,
      contentHtml: content,
    }),
  };
}
