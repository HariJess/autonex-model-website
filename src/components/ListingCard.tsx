import { Link } from "react-router-dom";
import { Gauge, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPriceCompact, mgaToEur } from "@/config/currency";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DisplayListing } from "@/types/listing";
import { getVehicleTypeLabel } from "@/data/vehicleTypes";
import { prefetchListing } from "@/hooks/useListings";
import { applyImageFallback } from "@/lib/imageFallback";
import { getOptimizedStorageUrl, getOptimizedSrcSet } from "@/lib/storageImage";
import {
  formatVehicleMileage,
  getVehicleDisplayTitle,
  getVehicleHeadline,
  getVehicleMileageValue,
} from "@/lib/vehiclePresentation";
import BrandLogo from "@/components/BrandLogo";
import { resolveBrandAsset } from "@/data/brandAssets";
import type { DealMeta } from "@/lib/deals";
import { NegotiableBadge } from "@/components/listings/NegotiableBadge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { VerifiedBadge } from "@/components/verification/VerifiedBadge";

/**
 * Contexte de feed pour décider quoi afficher en top-left de la photo
 * quand l'annonce n'a pas de deal (sinon le badge -X% prime toujours).
 *
 *   "mixed"    — feed avec plusieurs types de transaction (home, YAS) →
 *                badge "Acheter" / "Louer LD" / "Louer CD" pour repère
 *   "filtered" — page déjà filtrée par transaction (recherche, favoris,
 *                agence) → overlay year+km (info utile non redondante)
 *   "deals"    — /bonnes-affaires → comme "filtered" en fallback
 */
export type FeedContext = "mixed" | "filtered" | "deals";

interface ListingCardProps {
  listing: DisplayListing;
  agencyName?: string;
  agencyLogo?: string;
  /** When set (e.g. « résultats proches »), shows a subtle hint under the title */
  matchBadge?: string;
  variant?: "default" | "search";
  dealMeta?: DealMeta | null;
  /** Layout density. "compact" applies Facebook-marketplace-style density on mobile only (desktop stays default). */
  layout?: "default" | "compact";
  /**
   * Hint that this card is part of the LCP candidate set (e.g. first card of
   * the home rail). Skips lazy loading and adds `fetchpriority="high"` so the
   * cover starts downloading earlier.
   */
  priority?: boolean;
  /**
   * Contexte de feed pour la zone top-left (cf. type FeedContext).
   * Par défaut "filtered" — la page consommatrice doit explicitement passer
   * "mixed" sur les feeds home / YAS.
   */
  feedContext?: FeedContext;
}

const LOCAL_PLACEHOLDER = "/placeholder.svg";

const ListingCard = ({ listing, agencyName, agencyLogo, matchBadge, variant = "default", dealMeta = null, layout = "default", priority = false, feedContext = "filtered" }: ListingCardProps) => {
  const { t } = useTranslation();
  const images = useMemo(
    () => (listing.images.length > 0 ? listing.images : [LOCAL_PLACEHOLDER]),
    [listing.images],
  );
  const [imgIndex, setImgIndex] = useState(0);
  const { currency } = useCurrency();
  const queryClient = useQueryClient();
  const indicatorIndexes = useMemo(() => {
    if (images.length <= 5) return images.map((_, i) => i);
    const start = Math.max(0, Math.min(imgIndex - 2, images.length - 5));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [images, imgIndex]);

  const badgeLabels: Record<string, { labelKey: string; className: string }> = {
    // PROMPT 6 V1 boost badges (priorité top_ad > featured > legacy)
    top_ad: { labelKey: "listing.badge.topAd", className: "bg-violet-600 text-white" },
    featured: { labelKey: "listing.badge.featured", className: "bg-amber-500 text-white" },
    // Legacy aliases — conservés pour backward compat avec listings ayant encore
    // un type "top"/"featured" dans la table boosts pré-PROMPT 6.
    boost: { labelKey: "listing.badge.boost", className: "gradient-primary" },
    coup_de_coeur: { labelKey: "listing.badge.coupDeCoeur", className: "bg-accent" },
    nouveau: { labelKey: "listing.badge.nouveau", className: "bg-success" },
    urgent: { labelKey: "listing.badge.urgent", className: "bg-destructive" },
  };

  const displayAgencyName = agencyName ?? listing.agency_name;
  const displayAgencyLogo = agencyLogo ?? listing.agency_logo;
  const city = listing.ville ?? "";
  const region = listing.region ?? "";
  const displayTitle = getVehicleDisplayTitle(listing);
  const mileageLabel = formatVehicleMileage(getVehicleMileageValue(listing));
  const vehicleHeadline = getVehicleHeadline(listing);
  const displayBrand = listing.vehicle?.make || displayTitle;
  const displayBrandAsset = resolveBrandAsset(displayBrand);
  const isSearchVariant = variant === "search";
  const isCompactLayout = layout === "compact";

  const handlePrefetchDetail = () => {
    void prefetchListing(queryClient, listing.id);
  };

  // Helper local — convertit le montant MGA dans la devise active avant le
  // formatage compact. Le `listing.price_mga` est toujours stocké en MGA
  // côté DB ; en mode EUR on le convertit puis on délègue au formatter.
  const formatPriceForCard = (mgaAmount: number) =>
    currency === "EUR"
      ? formatPriceCompact(mgaToEur(mgaAmount), "EUR")
      : formatPriceCompact(mgaAmount, "MGA");

  return (
    <div
      className={`group rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 ${
        isSearchVariant
          ? "bg-gradient-to-br from-card via-card to-secondary/20 border-border/70 hover:-translate-y-0.5 hover:shadow-xl"
          : "bg-card border-border hover:shadow-lg"
      }`}
    >
      {/* Image area — fully clickable */}
      <Link
        to={`/annonce/${listing.id}`}
        className={`block relative overflow-hidden ${
          isCompactLayout ? "aspect-[4/3] md:aspect-[4/3]" : "aspect-[4/3]"
        }`}
        onMouseEnter={handlePrefetchDetail}
        onFocus={handlePrefetchDetail}
        onTouchStart={handlePrefetchDetail}
      >
        {/* Mobile + tablet cover (< lg): single first photo, no carousel */}
        <picture>
          <source
            srcSet={getOptimizedSrcSet(images[0], [400, 800, 1200])}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <img
            src={getOptimizedStorageUrl(images[0], { width: 800, quality: 75 }) || images[0]}
            alt={displayTitle}
            className="lg:hidden w-full h-full object-cover"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            onError={(e) => {
              applyImageFallback(e.currentTarget, LOCAL_PLACEHOLDER);
            }}
          />
        </picture>
        {/* Desktop (>= lg): carousel-driven image (mobile cover already conveys alt) */}
        <picture>
          <source
            srcSet={getOptimizedSrcSet(images[imgIndex], [400, 800, 1200])}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <img
            src={getOptimizedStorageUrl(images[imgIndex], { width: 800, quality: 75 }) || images[imgIndex]}
            alt=""
            aria-hidden="true"
            className={`hidden lg:block w-full h-full object-cover transition-transform duration-500 ${
              isSearchVariant ? "group-hover:scale-[1.045]" : "group-hover:scale-105"
            }`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            onError={(e) => {
              applyImageFallback(e.currentTarget, LOCAL_PLACEHOLDER);
            }}
          />
        </picture>
        {/* Top-left — règle de priorité (sprint 6 + PROMPT 6 V1 fusion) :
              1) deal actif → -X% rouge SEUL (Vérifié retiré).
              2) feed mixte (home, YAS) sans deal → badge transaction.
              3) PROMPT 6 V1 boost actif (top_ad / featured / boost legacy) → badge boost.
              4) feeds filtered / deals sans deal et sans boost → vide. */}
        {dealMeta ? (
          <div className={`absolute z-[2] ${
            isCompactLayout ? "top-2 left-2 md:top-3 md:left-3" : "top-3 left-3"
          }`}>
            <Badge
              className="bg-destructive text-[11px] font-semibold px-2 py-1 rounded-md shadow-sm border-transparent"
              style={{ color: "#FAFAFA" }}
            >
              -{dealMeta.discountPercent}%
            </Badge>
          </div>
        ) : feedContext === "mixed" ? (
          <div className={`absolute z-[2] ${
            isCompactLayout ? "top-2 left-2 md:top-3 md:left-3" : "top-3 left-3"
          }`}>
            <Badge className="bg-white/95 text-slate-900 backdrop-blur-sm text-[11px] font-semibold px-2 py-1 rounded-md shadow-sm border-transparent hover:bg-white/95 dark:bg-slate-800/95 dark:text-slate-100">
              {listing.transaction === "vente"
                ? t("transaction.sale", "Acheter")
                : listing.transaction === "location"
                  ? t("transaction.rent", "Louer LD")
                  : listing.transaction === "location_vacances"
                    ? t("transaction.vacation", "Louer CD")
                    : listing.transaction}
            </Badge>
          </div>
        ) : listing.badge && badgeLabels[listing.badge] ? (
          <div className={`absolute z-[2] ${
            isCompactLayout ? "top-2 left-2 md:top-3 md:left-3" : "top-3 left-3"
          }`}>
            <Badge className={`${badgeLabels[listing.badge].className} text-[11px] font-semibold px-2 py-1 rounded-md shadow-sm border-transparent`}>
              {t(badgeLabels[listing.badge].labelKey)}
            </Badge>
          </div>
        ) : null}
        {/* Top-right — favori */}
        <div className={`absolute z-10 ${
          isCompactLayout ? "top-2 right-2 md:top-3 md:right-3" : "top-3 right-3"
        }`}>
          <FavoriteButton listingId={listing.id} size="sm" variant="overlay" />
        </div>
        {/* Bottom-right — compteur photos (visible uniquement à partir de
            2 photos pour éviter le bruit sur les annonces avec 1 cover). */}
        {images.length >= 2 && (
          <span
            className={`absolute bottom-2 right-2 z-[2] inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1 rounded-md shadow-sm`}
            aria-label={t("listing.card.photoCount", { count: images.length })}
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            {images.length}
          </span>
        )}
        {images.length > 1 && (
          <>
            {/* Desktop-only carousel controls (>= lg), arrows revealed on card hover */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex((i) => (i > 0 ? i - 1 : images.length - 1)); }}
              className="hidden lg:inline-flex absolute left-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 items-center justify-center rounded-full bg-card/85 backdrop-blur-sm shadow-sm border border-border/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 active:scale-95"
              aria-label={t("listing.card.photoPrevious", "Photo précédente")}
              tabIndex={-1}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex((i) => (i < images.length - 1 ? i + 1 : 0)); }}
              className="hidden lg:inline-flex absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 items-center justify-center rounded-full bg-card/85 backdrop-blur-sm shadow-sm border border-border/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 active:scale-95"
              aria-label={t("listing.card.photoNext", "Photo suivante")}
              tabIndex={-1}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Dot indicators (desktop only) */}
            <div className="hidden lg:flex absolute bottom-2 left-1/2 -translate-x-1/2 gap-1">
              {indicatorIndexes.map((idx) => (
                <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === imgIndex ? "bg-white" : "bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
        {displayAgencyLogo && (
          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full overflow-hidden border-2 border-card shadow-sm">
            <img
              src={getOptimizedStorageUrl(displayAgencyLogo, { width: 96, quality: 80 }) || displayAgencyLogo}
              alt={displayAgencyName ?? ""}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                applyImageFallback(e.currentTarget, LOCAL_PLACEHOLDER);
              }}
            />
          </div>
        )}
      </Link>

      <Link
        to={`/annonce/${listing.id}`}
        className={`block ${
          isCompactLayout
            ? "p-2.5 space-y-1.5 md:p-4 md:space-y-2.5 max-lg:md:p-4.5 min-h-[120px] md:min-h-[150px]"
            : "p-4 max-lg:p-4.5 space-y-2.5 min-h-[150px]"
        } ${isSearchVariant ? "md:p-4.5" : ""}`}
        onMouseEnter={handlePrefetchDetail}
        onFocus={handlePrefetchDetail}
        onTouchStart={handlePrefetchDetail}
      >
        <div className={isSearchVariant ? "space-y-0.5" : ""}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-sans tracking-tight text-primary ${
              isSearchVariant
                ? "text-[1.35rem] font-semibold leading-none"
                : isCompactLayout
                  ? "text-[15px] md:text-xl font-bold leading-tight"
                  : "text-xl max-sm:text-[1.22rem] font-bold"
            }`}>
              {formatPriceForCard(listing.price_mga)}
            </p>
            {listing.negotiable ? <NegotiableBadge size="sm" /> : null}
            {/* PROMPT 7 — Verified Seller badge.
                Anti-cumul : si l'annonce a une agency (déjà signal de trust),
                on n'affiche pas le badge seller pour éviter de surcharger. */}
            {listing.seller_verified && !listing.agency_name ? (
              <VerifiedBadge size="sm" label={!isCompactLayout} />
            ) : null}
          </div>
          {dealMeta && (
            <p className="text-xs font-sans text-muted-foreground line-through">
              {formatPriceForCard(dealMeta.originalPriceMga)}
            </p>
          )}
          {/* Prix secondaire (devise non-active) — affiché uniquement en
              mode EUR pour rappeler la valeur en MGA aux expats. En mode
              MGA (défaut), on masque la conversion EUR pour désaturer. */}
          {currency === "EUR" && (
            <p className={`font-sans text-muted-foreground/90 ${
              isCompactLayout ? "hidden md:block text-sm" : "text-sm"
            }`}>{formatPriceCompact(listing.price_mga, "MGA")}</p>
          )}
          </div>
        <div className="flex items-start gap-2">
          {displayBrandAsset?.logoPath ? (
            <BrandLogo
              brand={displayBrand}
              className={`shrink-0 rounded-md border border-border/80 bg-background p-0.5 mt-0.5 ${
                isCompactLayout ? "hidden md:flex h-6 w-9" : "h-6 w-9"
              }`}
              imgClassName="max-h-4"
              showFallbackLabel={false}
            />
          ) : displayBrandAsset?.label ? (
            <span
              className={`shrink-0 rounded-md border border-border/80 bg-muted/60 mt-0.5 inline-flex items-center justify-center text-[11px] font-sans font-bold text-muted-foreground ${
                isCompactLayout ? "hidden md:inline-flex h-6 w-9" : "h-6 w-9"
              }`}
              title={displayBrandAsset.label}
              aria-label={displayBrandAsset.label}
            >
              {displayBrandAsset.label.charAt(0).toUpperCase()}
            </span>
          ) : null}
          <h3 className={`flex-1 font-sans text-foreground leading-snug break-words font-semibold ${
            isSearchVariant
              ? "text-[1.03rem] line-clamp-2"
              : isCompactLayout
                ? "text-[13px] md:text-base line-clamp-1 md:line-clamp-2"
                : "text-base max-lg:text-[1rem] line-clamp-2"
          }`}>
            {displayTitle}
          </h3>
        </div>
        {vehicleHeadline && (
          <p className={`font-sans text-muted-foreground -mt-1 line-clamp-1 ${
            isCompactLayout ? "hidden md:block text-[13px]" : "text-[13px]"
          }`}>{vehicleHeadline}</p>
        )}
        {matchBadge && (
          <p className="text-xs font-sans text-muted-foreground border border-border/70 rounded-md px-2 py-0.5 w-fit bg-background/80">
            {matchBadge}
          </p>
        )}
        <div className={`flex items-center gap-x-2 md:gap-x-3 gap-y-1 md:gap-y-1.5 text-muted-foreground font-sans flex-wrap ${
          isCompactLayout ? "text-[11px] md:text-[13px]" : "text-[13px]"
        } ${isSearchVariant ? "pt-0.5" : ""}`}>
          {mileageLabel && (
            <span className="flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {mileageLabel}
            </span>
          )}
          {!isSearchVariant && !isCompactLayout && <span className="capitalize">{getVehicleTypeLabel(listing.type)}</span>}
          {!isCompactLayout && listing.vehicle?.fuel && <span className={isSearchVariant ? "hidden sm:inline" : ""}>{listing.vehicle.fuel}</span>}
          {!isCompactLayout && listing.vehicle?.transmission && <span className={isSearchVariant ? "hidden sm:inline" : ""}>{listing.vehicle.transmission}</span>}
        </div>
        <div className={`flex items-center justify-between ${
          isCompactLayout ? "pt-1.5 md:pt-2.5 md:border-t md:border-border/55" : "border-t border-border/55 pt-2.5"
        }`}>
          <p className={`text-muted-foreground font-sans font-medium truncate ${
            isCompactLayout ? "text-[11px] md:text-[13px]" : "text-[13px]"
          }`}>
            {city}
            {isCompactLayout ? "" : (region ? `, ${region}` : "")}
          </p>
          {isSearchVariant && listing.vehicle?.condition && (
            <span className="text-[11px] capitalize font-sans text-foreground/85 rounded-md border border-border/60 bg-background/75 px-2 py-0.5">
              {listing.vehicle.condition}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
};

export default ListingCard;
