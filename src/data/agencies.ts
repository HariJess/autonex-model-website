export type PartnerDealer = {
  id: string;
  slug: string;
  name: string;
  logoPath: string;
  city: string;
  area: string;
  phone: string;
  description: string;
  brands: string[];
  isPartner: boolean;
  /** Explicitly linked listing owners for this dealer stock. */
  listingOwnerIds?: string[];
};

export const PARTNER_DEALERS: PartnerDealer[] = [
  {
    id: "partner-oceantrade",
    slug: "oceantrade",
    name: "OceanTrade",
    logoPath: "/agencies/oceantrade.png",
    city: "Antananarivo",
    area: "Andraharo",
    phone: "034 11 303 05",
    description:
      "Ocean Trade s'est faconnee une image professionnelle et performante en devenant un leader a Madagascar dans le domaine de la concession automobile et commercialise une large gamme de vehicules tels que les camions, les minibus, les SUV, les pickups, ainsi que les engins repondant a tous besoins de mobilite.",
    brands: ["Mazda", "Foton", "Infiniti"],
    isPartner: true,
    listingOwnerIds: [],
  },
];

export function getPartnerDealerBySlug(slug: string | undefined | null): PartnerDealer | null {
  if (!slug) return null;
  return PARTNER_DEALERS.find((dealer) => dealer.slug === slug) ?? null;
}
