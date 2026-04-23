import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import {
  assertValidTransactionType,
  isTerrainRentalForbidden,
} from "@/lib/listingRules";
import { normalizeEngineDisplacementInput } from "@/lib/vehicleAttributes";
import type { ListingType, TransactionType } from "@/types/listing";

export type PublishValidationInput = {
  transaction: TransactionType | "";
  listingType: ListingType | "";
  ville: string;
  pinLat: number | null;
  pinLng: number | null;
  title: string;
  description: string;
  priceMga: string;
  surface: string;
  vehicleYear: string;
  vehicleDoors: string;
  vehicleSeats: string;
  vehicleEngineDisplacement: string;
  vehicleMake: string;
  vehicleModel: string;
  photoCount: number;
};

type TranslateFn = (key: string, fallback: string) => string;

export function validatePublishStep(
  step: number,
  input: PublishValidationInput,
  t: TranslateFn,
): string[] {
  const errors: string[] = [];
  switch (step) {
    case 0:
      if (!input.transaction || !assertValidTransactionType(input.transaction)) {
        errors.push(t("publish.transactionRequired", "Type de transaction requis"));
      }
      if (!input.listingType) errors.push(t("publish.typeRequired", "Type de véhicule requis"));
      if (
        input.transaction &&
        input.listingType &&
        isTerrainRentalForbidden(input.transaction, input.listingType)
      ) {
        errors.push(
          t(
            "publish.terrainNoRent",
            "Cette catégorie n’est pas disponible pour ce type d’annonce.",
          ),
        );
      }
      if (!input.ville) errors.push(t("publish.villeRequired", "Ville requise"));
      if (
        input.pinLat == null ||
        input.pinLng == null ||
        !isValidListingCoordinates(input.pinLat, input.pinLng)
      ) {
        errors.push(t("publish.mapRequired", "Position sur la carte requise"));
      }
      break;
    case 1:
      if (!input.title.trim() || input.title.trim().length < 8) {
        errors.push(
          t("publish.titleRequired", "Titre requis (min. 8 caractères)"),
        );
      }
      if (input.description.trim().length < 10) {
        errors.push(
          t(
            "publish.descFrenchRequired",
            "Description en français requise (min. 10 caractères)",
          ),
        );
      }
      if (!input.priceMga || Number(input.priceMga) <= 0) {
        errors.push(t("publish.priceRequired", "Prix valide requis"));
      }
      if (input.surface && Number(input.surface) < 0) {
        errors.push(t("publish.surfaceInvalid", "Kilométrage invalide"));
      }
      if (input.vehicleYear) {
        const y = Number(input.vehicleYear);
        const currentYear = new Date().getFullYear() + 1;
        if (!Number.isFinite(y) || y < 1950 || y > currentYear) {
          errors.push(t("publish.yearInvalid", "Année invalide"));
        }
      }
      if (input.vehicleDoors && Number(input.vehicleDoors) < 0) {
        errors.push(t("publish.doorsInvalid", "Nombre de portes invalide"));
      }
      if (input.vehicleSeats && Number(input.vehicleSeats) < 0) {
        errors.push(t("publish.seatsInvalid", "Nombre de places invalide"));
      }
      if (
        input.vehicleEngineDisplacement &&
        normalizeEngineDisplacementInput(input.vehicleEngineDisplacement) == null
      ) {
        errors.push(
          t("publish.engineDisplacementInvalid", "Cylindrée invalide"),
        );
      }
      if (!input.vehicleMake.trim()) errors.push(t("publish.makeRequired", "Marque requise"));
      if (!input.vehicleModel.trim()) errors.push(t("publish.modelRequired", "Modèle requis"));
      break;
    case 2:
      if (input.photoCount < 1) {
        errors.push(
          t(
            "publish.photoRequired",
            "Au moins une photo (photo principale) est requise",
          ),
        );
      }
      break;
    default:
      break;
  }
  return errors;
}

export function getFirstInvalidPublishStep(
  input: PublishValidationInput,
  t: TranslateFn,
): { step: number; errors: string[] } | null {
  const checks: Array<{ step: number; errors: string[] }> = [
    { step: 0, errors: validatePublishStep(0, input, t) },
    { step: 1, errors: validatePublishStep(1, input, t) },
    { step: 2, errors: validatePublishStep(2, input, t) },
  ];
  return checks.find((entry) => entry.errors.length > 0) ?? null;
}
