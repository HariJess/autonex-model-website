import type { ShareUrlParams } from "./shareChannels";

export interface ShareListingInput {
  id: string;
  title: string;
  url: string;
  priceMga: number;
  location?: string | null;
}

export function formatPriceMga(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "Prix non précisé";
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${formatted}M Ar`;
  }
  return `${price.toLocaleString("fr-FR")} Ar`;
}

export function buildShareParams(listing: ShareListingInput): ShareUrlParams {
  const priceFormatted = formatPriceMga(listing.priceMga);
  const headline = `${listing.title} - ${priceFormatted}`;

  const textParts: string[] = [`🚗 ${headline}`];
  if (listing.location) textParts.push(`📍 ${listing.location}`);
  textParts.push(`👉 ${listing.url}`, "", "Vu sur AutoNex 🌟");

  const emailSubject = "Une voiture qui pourrait t'intéresser sur AutoNex";
  const emailBodyParts: string[] = [
    "Salut,",
    "",
    "J'ai vu cette annonce et j'ai pensé à toi :",
    "",
    listing.title,
    `Prix : ${priceFormatted}`,
  ];
  if (listing.location) emailBodyParts.push(`Localisation : ${listing.location}`);
  emailBodyParts.push("", `Voir l'annonce complète : ${listing.url}`, "", "Bonne journée !");

  return {
    url: listing.url,
    title: headline,
    text: textParts.join("\n"),
    emailSubject,
    emailBody: emailBodyParts.join("\n"),
  };
}
