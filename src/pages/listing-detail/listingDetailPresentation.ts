import type { TFunction } from "i18next";
import type { CanonicalVehicleAttributes } from "@/lib/vehicleCanonical";
import type { DisplayListing } from "@/types/listing";

function cleanSpec(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const asString = String(value).trim();
  return asString.length > 0 ? asString : null;
}

export function getSellerLabel(
  sellerType: CanonicalVehicleAttributes["sellerType"],
  t: TFunction<"translation", undefined>,
): string | null {
  return sellerType === "concessionnaire"
    ? t("listing.sellerDealer", "Concessionnaire")
    : sellerType === "particulier"
      ? t("listing.sellerPrivate", "Particulier")
      : null;
}

export function buildVehicleSpecRows(
  canonicalVehicle: CanonicalVehicleAttributes,
  sellerLabel: string | null,
  mileageLabel: string | null,
  doorsLabel: string | null,
  exteriorColorLabel: string | null,
  engineDisplacementLabel: string | null,
  t: TFunction<"translation", undefined>,
) {
  return [
    { label: t("search.brand", "Marque"), value: cleanSpec(canonicalVehicle.make) },
    { label: t("search.model", "Modèle"), value: cleanSpec(canonicalVehicle.model) },
    { label: t("search.year", "Année"), value: cleanSpec(canonicalVehicle.year) },
    { label: t("search.mileageKm", "Kilométrage"), value: cleanSpec(mileageLabel) },
    { label: t("search.fuel", "Carburant"), value: cleanSpec(canonicalVehicle.fuel) },
    {
      label: t("search.transmission", "Boîte de vitesse"),
      value: cleanSpec(canonicalVehicle.transmission),
    },
    { label: t("listing.drivetrain", "Motricité"), value: cleanSpec(canonicalVehicle.drivetrain) },
    { label: t("listing.doors", "Portes"), value: cleanSpec(doorsLabel) },
    {
      label: t("listing.seats", "Places"),
      value:
        canonicalVehicle.seats != null && canonicalVehicle.seats > 0
          ? `${canonicalVehicle.seats}`
          : null,
    },
    { label: t("listing.bodyStyle", "Carrosserie"), value: cleanSpec(canonicalVehicle.bodyStyle) },
    { label: t("listing.condition", "État"), value: cleanSpec(canonicalVehicle.condition) },
    { label: t("listing.sellerType", "Type vendeur"), value: cleanSpec(sellerLabel) },
    {
      label: t("listing.exteriorColor", "Couleur ext."),
      value: cleanSpec(exteriorColorLabel),
    },
    {
      label: t("listing.engineDisplacement", "Cylindrée"),
      value: cleanSpec(engineDisplacementLabel),
    },
    {
      label: t("listing.interiorColor", "Couleur int."),
      value: cleanSpec(canonicalVehicle.interiorColor),
    },
    {
      label: t("listing.availability", "Disponibilité"),
      value: cleanSpec(canonicalVehicle.availabilityStatus),
    },
    { label: t("listing.rentalMode", "Mode location"), value: cleanSpec(canonicalVehicle.rentalMode) },
  ].filter((item) => item.value);
}

export function buildContactTrustHints(
  params: {
    sellerLabel: string | null;
    availabilityStatus: string | null;
    hasWhatsappContact: boolean | undefined;
  },
  t: TFunction<"translation", undefined>,
) {
  return [
    params.sellerLabel ? `${t("listing.seller", "Vendeur")} : ${params.sellerLabel}` : null,
    params.availabilityStatus
      ? `${t("listing.availability", "Disponibilité")} : ${params.availabilityStatus}`
      : null,
    params.hasWhatsappContact
      ? t("listing.whatsappReady", "Réponse WhatsApp disponible")
      : null,
  ].filter(Boolean);
}

export function buildListingTrustProofs(
  listing: DisplayListing,
  sellerLabel: string | null,
  hasApproxMap: boolean,
  t: TFunction<"translation", undefined>,
) {
  return [
    sellerLabel
      ? t("listing.trustSellerType", "Vendeur identifié : {{label}}", { label: sellerLabel })
      : null,
    listing.agency_verified
      ? t("listing.trustAgencyVerified", "Profil vendeur vérifié par AutoNex")
      : null,
    listing.images.length >= 3
      ? t("listing.trustPhotosCount", "Galerie détaillée ({{count}} photos)", {
          count: listing.images.length,
        })
      : null,
    hasApproxMap
      ? t("listing.trustLocation", "Zone de localisation disponible sur la carte")
      : null,
    listing.status === "active"
      ? t("listing.trustStatus", "Annonce active dans le catalogue public")
      : null,
  ].filter(Boolean);
}

export function getOwnerStatusHint(
  listing: DisplayListing,
  isOwner: boolean,
  t: TFunction<"translation", undefined>,
): string | null {
  const s = listing.status;
  if (!isOwner || s === "active") return null;
  if (s === "pending_review")
    return t(
      "listing.ownerPendingReview",
      "Votre annonce est en cours de modération. Elle ne sera visible publiquement qu’après validation par notre équipe.",
    );
  if (s === "pending_payment")
    return t(
      "listing.ownerPendingPayment",
      "Paiement ou justificatif en attente de vérification. L’annonce reste hors ligne jusqu’à confirmation.",
    );
  if (s === "pending_payment_verification")
    return t(
      "listing.ownerPendingPaymentVerification",
      "Votre paiement est en cours de vérification par nos équipes. Les crédits seront attribués après validation du justificatif.",
    );
  if (s === "rejected")
    return listing.rejection_reason?.trim()
      ? `${t("listing.ownerRejectedPrefix", "Annonce refusée")} : ${listing.rejection_reason.trim()}`
      : t(
          "listing.ownerRejected",
          "Cette annonce a été refusée. Contactez le support pour plus d’informations.",
        );
  if (s === "draft")
    return t(
      "listing.ownerDraft",
      "Brouillon — terminez la publication depuis votre tableau de bord.",
    );
  if (s === "paused")
    return t(
      "listing.ownerPaused",
      "Annonce en pause — elle n’apparaît pas dans la recherche.",
    );
  if (s === "expired") return t("listing.ownerExpired", "Annonce expirée.");
  return t("listing.ownerNonActive", "Cette annonce n’est pas publiée actuellement.");
}

export function getDisplayedPhone(
  phoneRevealed: boolean,
  revealedPhone: string | null,
  listing: DisplayListing,
  t: TFunction<"translation", undefined>,
) {
  if (!phoneRevealed) return t("listing.revealPhone");
  return revealedPhone ?? listing.owner_phone ?? t("listing.noPhone", "Non renseigné");
}
