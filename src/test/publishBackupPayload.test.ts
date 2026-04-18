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
      surface: "42000",
      rooms: "",
      bathrooms: "",
      toilets: "",
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
});
