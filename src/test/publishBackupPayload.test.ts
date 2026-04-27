import { describe, expect, it } from "vitest";
import { buildPublishLocalBackupPayload } from "@/pages/publish/publishBackupPayload";

describe("buildPublishLocalBackupPayload", () => {
  it("returns a payload compatible with local backup shape (draft + boosts)", () => {
    const p = buildPublishLocalBackupPayload({
      draftListingId: "550e8400-e29b-41d4-a716-446655440000",
      step: 2,
      transaction: "vente",
      listingType: "appartement",
      isNewProgram: false,
      internalRef: "",
      ville: "Antananarivo",
      arrondissement: "",
      quartier: "",
      quartierLibre: "",
      pinLat: null,
      pinLng: null,
      title: "Ma voiture",
      description: "Une description suffisamment longue pour les contraintes métier.",
      priceMga: "50000000",
      negotiable: false,
      mileageKmInput: "42000",
      doorsInput: "",
      seatsInput: "",
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: "2020",
      vehicleFuel: "Essence",
      vehicleTransmission: "",
      vehicleDrivetrain: "",
      vehicleCondition: "",
      vehicleSellerType: "particulier",
      vehicleRentalMode: "",
      vehicleBodyStyle: "",
      vehicleDoors: "",
      vehicleSeats: "",
      vehicleExteriorColor: "",
      vehicleEngineDisplacement: "",
      vehicleInteriorColor: "",
      vehicleAvailabilityStatus: "",
      vehicleWhatsappPhone: "",
      vehicleIsElectric: false,
      vehicleIsHybrid: false,
      selectedFeatures: [],
      videoUrl: "",
      virtualTourUrl: "",
      selectedBoosts: [],
      agencySpotlight: false,
    });

    expect(p.draftListingId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(p.step).toBe(2);
    expect(p.agencySpotlight).toBe(false);
  });

  it("accepts the same shape as PublishPage onBeforeUnloadBackup (spread + draftListingId + step)", () => {
    const persistDraftForm = {
      transaction: "vente" as const,
      listingType: "terrain" as const,
      isNewProgram: false,
      internalRef: "",
      ville: "Antananarivo",
      arrondissement: "",
      quartier: "",
      quartierLibre: "",
      pinLat: null,
      pinLng: null,
      title: "Titre",
      description: "Description assez longue pour les contraintes.",
      priceMga: "1000000",
      negotiable: false,
      mileageKmInput: "",
      doorsInput: "",
      seatsInput: "",
      vehicleMake: "",
      vehicleModel: "",
      vehicleYear: "",
      vehicleFuel: "",
      vehicleTransmission: "",
      vehicleDrivetrain: "",
      vehicleCondition: "",
      vehicleSellerType: "particulier",
      vehicleRentalMode: "",
      vehicleBodyStyle: "",
      vehicleDoors: "",
      vehicleSeats: "",
      vehicleExteriorColor: "",
      vehicleEngineDisplacement: "",
      vehicleInteriorColor: "",
      vehicleAvailabilityStatus: "",
      vehicleWhatsappPhone: "",
      vehicleIsElectric: false,
      vehicleIsHybrid: false,
      selectedFeatures: ["a"] as string[],
      videoUrl: "",
      virtualTourUrl: "",
      selectedBoosts: [] as [],
      agencySpotlight: false,
    };
    const draftListingId = "550e8400-e29b-41d4-a716-446655440000";
    const step = 1;
    const p = buildPublishLocalBackupPayload({
      draftListingId,
      step,
      ...persistDraftForm,
    });
    expect(p.draftListingId).toBe(draftListingId);
    expect(p.step).toBe(step);
    expect(p.selectedFeatures).toEqual(["a"]);
  });
});
