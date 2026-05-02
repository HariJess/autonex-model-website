import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import ListingCard from "@/components/ListingCard";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import { buildYasUrl } from "@/features/yas-app/lib/buildYasUrl";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { useYasDeals } from "@/features/yas-app/hooks/useYasDeals";
import { trackYasEvent } from "@/features/yas-app/lib/yasTracking";

/**
 * Aperçu inline « bonnes affaires » pour la mini-app YAS.
 *
 * La logique de fetch + filter (limit 24, `getDealMeta`, cap PREVIEW_COUNT) est
 * mutualisée dans `useYasDeals` — partagée avec `YasActionGrid` qui s'en sert
 * pour décider si la card menu "Bonnes affaires" est affichée. React Query
 * dédoublonne naturellement la query via la queryKey, et le hook centralise la
 * logique métier (cf. INC #2 du Plan 2/4).
 */
export function YasFeaturedDeals() {
  const { t } = useTranslation();
  const yas = useYasContext();
  const { deals, hasDeals, isLoading } = useYasDeals();

  const seeAllUrl = buildYasUrl("/recherche?sort=recent", {
    source: yas.source ?? "yas",
    embedded: yas.isEmbedded ? "true" : null,
    platform: yas.platform,
    entry_point: yas.entryPoint,
  });

  // On garde TOUJOURS la section avec id="deals" même quand il n'y a pas de
  // deals à montrer : la card "Voir les bonnes affaires" pointe vers `#deals`
  // via un saut hash natif, et si l'ancre n'existe pas dans le DOM, le
  // navigateur ne scrolle pas (root cause du bug #deals identifié à l'audit).
  // Quand aucun deal n'est dispo, on affiche un fallback minimal + lien vers
  // toutes les annonces — meilleur UX que de masquer la section silencieusement.

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
      ) : hasDeals ? (
        <div className="grid grid-cols-2 gap-2.5">
          {deals.map((entry, idx) => (
            <div
              key={entry.listing.id}
              onClick={() => trackYasEvent("yas_featured_deal_click", yas, { listing_id: entry.listing.id })}
            >
              <ListingCard
                listing={entry.listing}
                dealMeta={entry.deal}
                layout="compact"
                priority={idx === 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 px-4 py-5 text-center">
          <p className="font-sans text-[13px] text-muted-foreground">
            {t("yas.deals.empty", "Pas de bonne affaire pour l'instant. Reviens plus tard !")}
          </p>
        </div>
      )}
    </section>
  );
}
