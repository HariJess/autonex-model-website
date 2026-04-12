import { BannerSlot } from "./BannerSlot";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";

export function SearchTopBanner() {
  if (!MONETIZATION_PLACEMENTS.searchTopBanner) return null;

  return (
    <div className="mb-4">
      <BannerSlot
        variant="inline"
        title="Partenaires ImmoNex"
        subtitle="Emplacement média au-dessus des résultats — idéal pour marques et services immobiliers."
        href="/dashboard"
        ctaLabel="En savoir plus"
      />
    </div>
  );
}
