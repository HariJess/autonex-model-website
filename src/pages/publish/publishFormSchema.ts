import { z } from "zod";
import { LISTING_TYPES, TRANSACTION_TYPES, type ListingType, type TransactionType } from "@/types/listing";
import type { PurchasableBoostType } from "@/config/monetization";

/**
 * Publish form schema (react-hook-form + zod).
 *
 * Scope: the 45 listing fields (groups B + C + D + E from the P6.1 audit)
 * plus a permissive sub-schema for the 2 boost fields (selectedBoosts,
 * agencySpotlight). Lifecycle/UI state and the credit purchase mini-form
 * stay in local useState — see PublishPage.
 *
 * Validation policy here is intentionally MINIMAL:
 *   - structural typing (string / number / boolean / enum / array)
 *   - empty string is always acceptable for textual fields (a freshly
 *     created draft starts blank; full required-ness lives in
 *     usePublishStepValidation, which is unchanged)
 *   - cheap content checks via .refine (title min length, year range,
 *     whatsapp phone shape) only fire when the field is non-empty
 *
 * Validation messages are i18n keys ("publish.validation.*"), not literal
 * strings. They are resolved by the consumer (form's errors UI) via
 * useTranslation. Keep this file translation-agnostic.
 */

// ---------- Enum tuples reused across sub-schemas ---------------------------

/**
 * Listing type / transaction enums are reused from @/types/listing.
 * The literal "" is part of the form's pristine-draft state — a brand-new
 * draft has these fields blank until the user picks one. Step validation
 * (usePublishStepValidation) handles the "required to advance" rule.
 */
const transactionField = z.union([
  z.literal(""),
  z.enum(TRANSACTION_TYPES as unknown as [TransactionType, ...TransactionType[]]),
]);

const listingTypeField = z.union([
  z.literal(""),
  z.enum(LISTING_TYPES as unknown as [ListingType, ...ListingType[]]),
]);

/**
 * Local enum tuple mirroring PurchasableBoostType from @/config/monetization.
 * Kept as `as const` so z.infer collapses to the exact union type.
 */
const PURCHASABLE_BOOST_TUPLE = ["urgent", "daily_bump", "featured", "top"] as const;
type _AssertBoostTupleAlignedWithExport =
  (typeof PURCHASABLE_BOOST_TUPLE)[number] extends PurchasableBoostType ? true : false;
const _assertBoostTuple: _AssertBoostTupleAlignedWithExport = true;
void _assertBoostTuple;

// ---------- Per-domain sub-schemas ------------------------------------------

/** Identity: transaction kind + listing type + new-program toggle + agency-internal ref. */
export const vehicleIdentitySubSchema = z.object({
  transaction: transactionField,
  listingType: listingTypeField,
  isNewProgram: z.boolean(),
  internalRef: z.string(),
});
export type VehicleIdentityValues = z.infer<typeof vehicleIdentitySubSchema>;

/** Location: city + administrative subdivisions + map pin (nullable). */
export const vehicleLocationSubSchema = z.object({
  ville: z.string(),
  arrondissement: z.string(),
  quartier: z.string(),
  quartierLibre: z.string(),
  pinLat: z.number().nullable(),
  pinLng: z.number().nullable(),
});
export type VehicleLocationValues = z.infer<typeof vehicleLocationSubSchema>;

/** Description, body copy, listing price (kept as string — user types it raw). */
export const vehicleDescriptionSubSchema = z.object({
  title: z.string().refine((v) => v.length === 0 || v.trim().length >= 3, {
    message: "publish.validation.title.min",
  }),
  description: z.string(),
  priceMga: z.string(),
});
export type VehicleDescriptionValues = z.infer<typeof vehicleDescriptionSubSchema>;

/**
 * LEGACY ImmoNex specs columns — names kept for SQL alignment.
 * Vehicle-side semantics:
 *   - `surface`     → kilométrage (km)
 *   - `rooms`       → version / finition (index)
 *   - `bathrooms`   → nombre de portes
 *   - `toilets`     → nombre de sièges / places
 *
 * See docs/AUTONEX_LEGACY_SCHEMA.md and src/lib/legacyListingsDbColumns.ts
 * for the full mapping. Renaming requires a coordinated DB migration.
 */
export const vehicleSpecsLegacySubSchema = z.object({
  /** Kilométrage véhicule (km). Legacy column name `surface`. */
  surface: z.string(),
  /** Index version / finition véhicule. Legacy column name `rooms`. */
  rooms: z.string(),
  /** Nombre de portes. Legacy column name `bathrooms`. */
  bathrooms: z.string(),
  /** Nombre de sièges / places. Legacy column name `toilets`. */
  toilets: z.string(),
});
export type VehicleSpecsLegacyValues = z.infer<typeof vehicleSpecsLegacySubSchema>;

/** Vehicle-native attributes (make/model/year/...). All string-typed at form level
 *  (UI inputs produce strings); coercion happens at persist time. */
const CURRENT_YEAR = new Date().getFullYear();
export const vehicleAttrsSubSchema = z.object({
  vehicleMake: z.string(),
  vehicleModel: z.string(),
  vehicleYear: z.string().refine(
    (v) => {
      if (v === "") return true;
      if (!/^\d{4}$/.test(v)) return false;
      const n = Number(v);
      return n >= 1950 && n <= CURRENT_YEAR + 1;
    },
    { message: "publish.validation.year.range" },
  ),
  vehicleFuel: z.string(),
  vehicleTransmission: z.string(),
  vehicleDrivetrain: z.string(),
  vehicleCondition: z.string(),
  vehicleSellerType: z.string(),
  vehicleRentalMode: z.string(),
  vehicleBodyStyle: z.string(),
  vehicleDoors: z.string(),
  vehicleSeats: z.string(),
  vehicleExteriorColor: z.string(),
  vehicleEngineDisplacement: z.string(),
  vehicleInteriorColor: z.string(),
  vehicleAvailabilityStatus: z.string(),
  /** WhatsApp phone for direct chat CTA. Permissive shape: digits/spaces/+/(). */
  vehicleWhatsappPhone: z.string().refine(
    (v) => v === "" || /^[\d+\s().-]{6,20}$/.test(v),
    { message: "publish.validation.phone.format" },
  ),
  vehicleIsElectric: z.boolean(),
  vehicleIsHybrid: z.boolean(),
});
export type VehicleAttrsValues = z.infer<typeof vehicleAttrsSubSchema>;

/** Equipment selection + free-text custom features. */
export const vehicleFeaturesSubSchema = z.object({
  selectedFeatures: z.array(z.string()),
  customFeaturesInput: z.string(),
});
export type VehicleFeaturesValues = z.infer<typeof vehicleFeaturesSubSchema>;

/** Optional video / virtual tour URLs (raw strings; deeper validation
 *  happens server-side and via usePublishStepValidation). */
export const mediaSubSchema = z.object({
  videoUrl: z.string(),
  virtualTourUrl: z.string(),
});
export type MediaValues = z.infer<typeof mediaSubSchema>;

/**
 * Boost selections — intentionally permissive at the schema level (no
 * cross-field rules, no required checks). Kept inside the form so the
 * step-3 visibility section can use the same form context.
 */
export const boostsSubSchema = z.object({
  selectedBoosts: z.array(z.enum(PURCHASABLE_BOOST_TUPLE)),
  agencySpotlight: z.boolean(),
});
export type BoostsFormValues = z.infer<typeof boostsSubSchema>;

// ---------- Composite schema ------------------------------------------------

/** Full publish form schema = 45 strict listing fields + 2 permissive boost fields. */
export const publishFormSchema = vehicleIdentitySubSchema
  .merge(vehicleLocationSubSchema)
  .merge(vehicleDescriptionSubSchema)
  .merge(vehicleSpecsLegacySubSchema)
  .merge(vehicleAttrsSubSchema)
  .merge(vehicleFeaturesSubSchema)
  .merge(mediaSubSchema)
  .merge(boostsSubSchema);

export type PublishFormValues = z.infer<typeof publishFormSchema>;
