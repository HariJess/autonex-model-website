import type { TFunction } from "i18next";
import { LISTING_TYPE_LABELS, TRANSACTION_LABELS, type DisplayListing } from "@/types/listing";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import { toApproximatePublicCoordinates } from "@/lib/mapPrivacy";
import { buildCanonicalUrl, composePageTitle, toAbsoluteUrl, truncateMetaDescription } from "@/lib/seo";
import { getDealMeta } from "@/lib/deals";
import { getCanonicalVehicleAttributes } from "@/lib/vehicleCanonical";
import {
  formatVehicleDoors,
  formatVehicleEngineDisplacement,
  formatVehicleMileage,
  formatVehicleVersion,
  getVehicleDisplayTitle,
  getVehicleHeadline,
  getVehicleDoorsValue,
  getVehicleMileageValue,
  getVehicleVersionValue,
} from "@/lib/vehiclePresentation";
import { getExteriorColorLabel } from "@/lib/vehicleAttributes";
import { sanitizeListingEquipment, extractCustomFeatures } from "@/data/listing-equipment";
import { resolveBrandAsset } from "@/data/brandAssets";
import {
  buildContactTrustHints,
  buildListingTrustProofs,
  buildVehicleSpecRows,
  getOwnerStatusHint,
  getSellerLabel,
} from "@/pages/listing-detail/listingDetailPresentation";

export type ListingDetailViewModel = {
  images: string[];
  hasMultipleImages: boolean;
  transactionLabel: string;
  typeLabel: string;
  addressLine: string;
  mapPublic: { lat: number; lng: number } | null;
  hasApproxMap: boolean;
  canonicalVehicle: ReturnType<typeof getCanonicalVehicleAttributes>;
  displayTitle: string;
  versionLabel: string | null;
  mileageLabel: string | null;
  doorsLabel: string | null;
  engineDisplacementLabel: string | null;
  exteriorColorLabel: string | null;
  vehicleSummary: string | null;
  sellerLabel: ReturnType<typeof getSellerLabel>;
  vehicleSpecRows: ReturnType<typeof buildVehicleSpecRows>;
  visibleSpecRowsMobile: ReturnType<typeof buildVehicleSpecRows>;
  contactTrustHints: ReturnType<typeof buildContactTrustHints>;
  listingTrustProofs: ReturnType<typeof buildListingTrustProofs>;
  ownerStatusHint: ReturnType<typeof getOwnerStatusHint>;
  displayBrand: string | null;
  displayBrandAsset: ReturnType<typeof resolveBrandAsset>;
  allFeatureBadges: string[];
  visibleFeatureBadgesMobile: string[];
  activeDeal: ReturnType<typeof getDealMeta>;
  canonical: string;
  listingTitle: string;
  listingDescription: string;
  seoImage: string | undefined;
  listingJsonLd: Record<string, unknown>;
};

export type BuildListingDetailViewModelParams = {
  listing: DisplayListing;
  t: TFunction<"translation", undefined>;
  isOwner: boolean;
  showAllSpecsMobile: boolean;
  showAllFeaturesMobile: boolean;
};

export function buildListingDetailViewModel(params: BuildListingDetailViewModelParams): ListingDetailViewModel {
  const { listing, t, isOwner, showAllSpecsMobile, showAllFeaturesMobile } = params;

  const images = listing.images.length > 0 ? listing.images : ["/placeholder.svg"];
  const hasMultipleImages = images.length > 1;

  const transactionLabel =
    listing.transaction === "vente"
      ? t("publish.sell", "Vente")
      : listing.transaction === "location"
        ? t("publish.rent", "Location")
        : listing.transaction === "location_vacances"
          ? t("publish.shortTermRental", "Location courte durée")
          : TRANSACTION_LABELS[listing.transaction] ?? listing.transaction;
  const typeLabel = LISTING_TYPE_LABELS[listing.type] ?? listing.type;
  const addressLine = [listing.ville, listing.arrondissement, listing.quartier, listing.region].filter(Boolean).join(", ");
  const hasExactCoords =
    listing.lat != null && listing.lng != null && isValidListingCoordinates(listing.lat, listing.lng);
  const mapPublic =
    hasExactCoords && listing.lat != null && listing.lng != null
      ? toApproximatePublicCoordinates(listing.lat, listing.lng, listing.id)
      : null;
  const hasApproxMap =
    mapPublic != null && isValidListingCoordinates(mapPublic.lat, mapPublic.lng);

  const canonicalVehicle = getCanonicalVehicleAttributes(listing);
  const displayTitle = getVehicleDisplayTitle(listing);
  const versionLabel = formatVehicleVersion(getVehicleVersionValue(listing));
  const mileageKmForJson = canonicalVehicle.mileageKm ?? getVehicleMileageValue(listing);
  const mileageLabel = formatVehicleMileage(mileageKmForJson);
  const doorsValue = canonicalVehicle.doors ?? getVehicleDoorsValue(listing);
  const doorsLabel = formatVehicleDoors(doorsValue);
  const engineDisplacementLabel = formatVehicleEngineDisplacement(canonicalVehicle.engineDisplacementL);
  const exteriorColorLabel = getExteriorColorLabel(canonicalVehicle.exteriorColor, t);
  const vehicleSummary = getVehicleHeadline(listing);
  const sellerLabel = getSellerLabel(canonicalVehicle.sellerType, t);
  const vehicleSpecRows = buildVehicleSpecRows(
    canonicalVehicle,
    sellerLabel,
    mileageLabel,
    doorsLabel,
    exteriorColorLabel,
    engineDisplacementLabel,
    t,
  );
  const visibleSpecRowsMobile = showAllSpecsMobile ? vehicleSpecRows : vehicleSpecRows.slice(0, 8);

  const contactTrustHints = buildContactTrustHints(
    {
      sellerLabel,
      availabilityStatus: canonicalVehicle.availabilityStatus,
      hasWhatsappContact: listing.has_whatsapp_contact,
    },
    t,
  );
  const listingTrustProofs = buildListingTrustProofs(listing, sellerLabel, hasApproxMap, t);
  const ownerStatusHint = getOwnerStatusHint(listing, isOwner, t);
  const displayBrand = canonicalVehicle.make ?? (displayTitle.trim() || null);
  const displayBrandAsset = resolveBrandAsset(displayBrand);
  const listingFeatureBadges = sanitizeListingEquipment(listing.features);
  const customFeatureBadges = extractCustomFeatures(listing.features);
  const allFeatureBadges = [...listingFeatureBadges, ...customFeatureBadges];
  const visibleFeatureBadgesMobile = showAllFeaturesMobile ? allFeatureBadges : allFeatureBadges.slice(0, 8);

  const activeDeal = getDealMeta(listing);
  const canonical = buildCanonicalUrl(`/annonce/${listing.id}`);
  const listingTitle = composePageTitle(displayTitle);
  const listingDescription = truncateMetaDescription(
    [
      `${typeLabel} ${transactionLabel} a ${listing.ville || "Madagascar"}`,
      listing.price_mga ? `${listing.price_mga.toLocaleString("fr-FR")} Ar` : "",
      listing.description || "",
    ]
      .filter(Boolean)
      .join(" — "),
  );
  const seoImage = toAbsoluteUrl(images[0] || "/placeholder.svg");
  const listingJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayTitle,
    description: listingDescription,
    url: canonical,
    image: seoImage ? [seoImage] : undefined,
    datePosted: listing.created_at || undefined,
    address: listing.ville || listing.region
      ? {
          "@type": "PostalAddress",
          addressLocality: listing.ville || undefined,
          addressRegion: listing.region || undefined,
          addressCountry: "MG",
        }
      : undefined,
    category: typeLabel,
    brand: canonicalVehicle.make ? { "@type": "Brand", name: canonicalVehicle.make } : undefined,
    model: canonicalVehicle.model ?? undefined,
    vehicleModelDate: canonicalVehicle.year ?? undefined,
    mileageFromOdometer:
      mileageKmForJson && mileageKmForJson > 0
        ? {
            "@type": "QuantitativeValue",
            value: mileageKmForJson,
            unitText: "km",
          }
        : undefined,
    offers: {
      "@type": "Offer",
      price: listing.price_mga,
      priceCurrency: "MGA",
      availability: listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: canonical,
    },
  };

  return {
    images,
    hasMultipleImages,
    transactionLabel,
    typeLabel,
    addressLine,
    mapPublic,
    hasApproxMap,
    canonicalVehicle,
    displayTitle,
    versionLabel,
    mileageLabel,
    doorsLabel,
    engineDisplacementLabel,
    exteriorColorLabel,
    vehicleSummary,
    sellerLabel,
    vehicleSpecRows,
    visibleSpecRowsMobile,
    contactTrustHints,
    listingTrustProofs,
    ownerStatusHint,
    displayBrand,
    displayBrandAsset,
    allFeatureBadges,
    visibleFeatureBadgesMobile,
    activeDeal,
    canonical,
    listingTitle,
    listingDescription,
    seoImage,
    listingJsonLd,
  };
}
