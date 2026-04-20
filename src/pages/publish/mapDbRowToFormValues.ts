import type { Tables } from "@/integrations/supabase/types";
import { listingRowToFormState } from "@/lib/publishDraft";
import { sanitizeListingTypeForTransaction } from "@/lib/listingRules";
import { sanitizeListingEquipment, extractCustomFeatures } from "@/data/listing-equipment";
import { parseVehicleMetaTags } from "@/lib/vehicleMetaTags";
import type { ListingType } from "@/types/listing";
import type { PublishFormValues } from "@/pages/publish/publishFormSchema";

/**
 * Converts a `listings` DB row into the form values shape consumed by RHF.
 *
 * Wraps `listingRowToFormState` and applies the same fallbacks the legacy
 * `applyListingRowToFormState` callback used to do inline:
 *   - sanitize feature whitelist
 *   - rebuild `customFeaturesInput` from the row's features array
 *   - back-fill vehicle attributes from the meta-tag parser when the
 *     dedicated columns are empty (older rows seeded before columns existed)
 *   - normalize the listing type against the chosen transaction
 *
 * `step`, `draftListingId`, and the price refs are NOT part of the form
 * values — callers handle those separately (they live in useState / refs,
 * not in the publish schema).
 */
export function mapDbRowToFormValues(row: Tables<"listings">): PublishFormValues {
  const fs = listingRowToFormState(row);

  const features = Array.isArray(row.features)
    ? row.features.filter((x): x is string => typeof x === "string")
    : [];
  const customFeaturesInput = extractCustomFeatures(features).join(", ");
  const meta = parseVehicleMetaTags(features);

  return {
    transaction: fs.transaction,
    listingType: sanitizeListingTypeForTransaction(fs.transaction, fs.listingType) as ListingType | "",
    isNewProgram: fs.isNewProgram,
    internalRef: fs.internalRef,
    ville: fs.ville,
    arrondissement: fs.arrondissement,
    quartier: fs.quartier,
    quartierLibre: fs.quartierLibre,
    pinLat: fs.pinLat,
    pinLng: fs.pinLng,
    title: fs.title,
    description: fs.description,
    priceMga: fs.priceMga,
    negotiable: fs.negotiable,
    surface: fs.surface,
    rooms: fs.rooms,
    bathrooms: fs.bathrooms,
    toilets: fs.toilets,
    selectedFeatures: sanitizeListingEquipment(fs.selectedFeatures),
    customFeaturesInput,
    vehicleMake: fs.vehicleMake || meta.make || "",
    vehicleModel: fs.vehicleModel || meta.model || "",
    vehicleYear: fs.vehicleYear || (meta.year != null ? String(meta.year) : ""),
    vehicleFuel: fs.vehicleFuel || meta.fuel || "",
    vehicleTransmission: fs.vehicleTransmission || meta.transmission || "",
    vehicleDrivetrain: fs.vehicleDrivetrain || meta.drivetrain || "",
    vehicleCondition: fs.vehicleCondition || meta.condition || "",
    vehicleSellerType: fs.vehicleSellerType || meta.sellerType || "",
    vehicleRentalMode: fs.vehicleRentalMode,
    vehicleBodyStyle: fs.vehicleBodyStyle,
    vehicleDoors: fs.vehicleDoors,
    vehicleSeats: fs.vehicleSeats,
    vehicleExteriorColor: fs.vehicleExteriorColor,
    vehicleEngineDisplacement:
      fs.vehicleEngineDisplacement ||
      (meta.engineDisplacementL != null ? String(meta.engineDisplacementL) : ""),
    vehicleInteriorColor: fs.vehicleInteriorColor,
    vehicleAvailabilityStatus: fs.vehicleAvailabilityStatus,
    vehicleWhatsappPhone: fs.vehicleWhatsappPhone,
    vehicleIsElectric: fs.vehicleIsElectric,
    vehicleIsHybrid: fs.vehicleIsHybrid,
    videoUrl: fs.videoUrl,
    virtualTourUrl: fs.virtualTourUrl,
    selectedBoosts: fs.selectedBoosts,
    agencySpotlight: fs.agencySpotlight,
  };
}
