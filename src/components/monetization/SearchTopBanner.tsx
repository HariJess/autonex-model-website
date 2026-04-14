import { BannerSlot } from "./BannerSlot";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";

export function SearchTopBanner() {
  if (!MONETIZATION_PLACEMENTS.searchTopBanner) return null;

  return (
    <div className="mb-4">
      <BannerSlot
        variant="inline"
        title="Partenaires ImmoNex"
        subtitle="Campagnes partenaires sélectionnées par ImmoNex."
      />
    </div>
  );
}
