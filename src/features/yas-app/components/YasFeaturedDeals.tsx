import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { useDbListings } from "@/hooks/useListings";
import ListingCard from "@/components/ListingCard";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import { getDealMeta, type DealMeta } from "@/lib/deals";
import type { DisplayListing } from "@/types/listing";
import { buildYasUrl } from "@/features/yas-app/lib/buildYasUrl";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { trackYasEvent } from "@/features/yas-app/lib/yasTracking";

type DealEntry = { listing: DisplayListing; deal: DealMeta };

const PREVIEW_COUNT = 4;

/**
 * Aperçu inline « bonnes affaires » pour la mini-app YAS.
 *
 * Réutilise `useDbListings` + `getDealMeta` (logique identique à
 * `Index.tsx:467-491`) et le composant `ListingCard` en `layout="compact"`,
 * déjà optimisé Marketplace-style sur mobile. Pas de duplication métier.
 */
export function YasFeaturedDeals() {
  const { t } = useTranslation();
  const yas = useYasContext();
  const { data: listings = [], isLoading } = useDbListings({ limit: 24 });

  const deals: DealEntry[] = useMemo(() => {
    const filtered: DealEntry[] = [];
    for (const listing of listings) {
      const deal = getDealMeta(listing);
      if (deal) filtered.push({ listing, deal });
      if (filtered.length >= PREVIEW_COUNT) break;
    }
    return filtered;
  }, [listings]);

  const seeAllUrl = buildYasUrl("/recherche?sort=recent", {
    source: yas.source ?? "yas",
    embedded: yas.isEmbedded ? "true" : null,
    platform: yas.platform,
    entry_point: yas.entryPoint,
  });

  if (!isLoading && deals.length === 0) return null;

  return (
    <section
      id="deals"
      aria-label={t("yas.deals.sectionAria", "Aperçu bonnes affaires")}
      className="scroll-mt-4 space-y-3"
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-sans text-base font-bold text-foreground sm:text-lg">
            {t("yas.deals.heading", "Bonnes affaires")}
          </h2>
          <p className="mt-0.5 font-sans text-[12px] leading-snug text-muted-foreground sm:text-[13px]">
            {t("yas.deals.subtitle", "Annonces avec prix réellement réduits, vérifiés sur AutoNex.")}
          </p>
        </div>
        <Link
          to={seeAllUrl}
          onClick={() => trackYasEvent("yas_action_deals_click", yas, { source_block: "deals_section_seeall" })}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/[0.04] px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/[0.08]"
        >
          {t("yas.deals.seeAll", "Voir tout")}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <WheelSpinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {deals.map((entry) => (
            <div
              key={entry.listing.id}
              onClick={() => trackYasEvent("yas_featured_deal_click", yas, { listing_id: entry.listing.id })}
            >
              <ListingCard listing={entry.listing} dealMeta={entry.deal} layout="compact" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
