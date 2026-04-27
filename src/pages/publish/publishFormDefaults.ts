import type { PublishFormValues } from "@/pages/publish/publishFormSchema";

/**
 * Default values for the publish form.
 *
 * Mirrors exactly the initial state of the 47 useState calls in the legacy
 * PublishPage (45 listing fields + 2 boost fields). Used both as the
 * `defaultValues` argument to useForm and as the target of `form.reset(...)`
 * when bootstrap creates a fresh draft (no DB row to hydrate from).
 *
 * When hydrating from an existing DB row, callers compose this default
 * with the result of listingRowToFormState (publishDraft.ts) — the row
 * values overwrite the defaults field-by-field.
 */
export const PUBLISH_FORM_DEFAULTS: PublishFormValues = {
  // Identity
  transaction: "",
  listingType: "",
  isNewProgram: false,
  internalRef: "",

  // Location
  ville: "",
  arrondissement: "",
  quartier: "",
  quartierLibre: "",
  pinLat: null,
  pinLng: null,

  // Description
  title: "",
  description: "",
  priceMga: "",
  negotiable: false,

  // Vehicle specs (km / portes / sièges)
  mileageKmInput: "",
  doorsInput: "",
  seatsInput: "",

  // Vehicle attributes
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleFuel: "",
  vehicleTransmission: "",
  vehicleDrivetrain: "",
  vehicleCondition: "",
  vehicleSellerType: "",
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

  // Features
  selectedFeatures: [],
  customFeaturesInput: "",

  // Media
  videoUrl: "",
  virtualTourUrl: "",

  // Boosts (permissive sub-schema)
  selectedBoosts: [],
  agencySpotlight: false,
};
