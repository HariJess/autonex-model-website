import { z } from "zod";
import { TRANSACTION_TYPES, type TransactionType } from "@/types/listing";
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

// listing.type est désormais du TEXT libre en base (migration Lot 8) : la
// validation front accepte toute chaîne. La string vide représente « non
// renseigné » et est rattrapée par publishValidation qui affiche l'erreur.
const listingTypeField = z.string();

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

/**
 * Description, body copy, listing price (kept as string — user types it raw).
 *
 * Lot 9.9 — Alignement avec `validate_listing_content()` (DB, migration
 * `20260420180000_moderation_helpers.sql`). L'empty string est admise pour
 * garder le brouillon éditable ; les rules firent dès qu'un contenu non vide
 * est saisi. L'exigence « champ requis » est portée par `publishValidation.ts`
 * au moment du `handleNext` et par la RPC `validate_listing_content` en DB.
 */
export const PRICE_MIN_MGA = 100_000;
export const PRICE_MAX_MGA = 10_000_000_000;

export const vehicleDescriptionSubSchema = z.object({
  title: z
    .string()
    .refine((v) => v.length === 0 || v.trim().length >= 5, {
      message: "Le titre doit faire au moins 5 caractères.",
    })
    .refine((v) => v.length === 0 || v.length <= 120, {
      message: "Le titre ne peut pas dépasser 120 caractères.",
    }),
  description: z
    .string()
    .refine((v) => v.length === 0 || v.trim().length >= 40, {
      message: "La description doit faire au moins 40 caractères.",
    }),
  priceMga: z
    .string()
    .refine(
      (v) => {
        if (v === "") return true;
        const n = Number(v);
        return Number.isFinite(n) && n >= PRICE_MIN_MGA;
      },
      { message: "Le prix doit être au moins 100 000 Ar." },
    )
    .refine(
      (v) => {
        if (v === "") return true;
        const n = Number(v);
        return !Number.isFinite(n) || n <= PRICE_MAX_MGA;
      },
      { message: "Le prix ne peut pas dépasser 10 milliards d'Ariary." },
    ),
  negotiable: z.boolean(),
});
export type VehicleDescriptionValues = z.infer<typeof vehicleDescriptionSubSchema>;

/**
 * LEGACY ImmoNex specs columns — names kept for SQL alignment.
 * Vehicle-side semantics:
 *   - `surface`     → kilométrage (km)
 *   - `bathrooms`   → nombre de portes
 *   - `toilets`     → nombre de sièges / places
 *
 * Note (B4a, 2026-04-26): the `rooms` field has been removed from the form
 * schema since the Version/Trim concept was dead in prod (rooms_distinct=[0]
 * in mini-B3 audit). The DB column `listings.rooms` remains until B4b drops
 * it. The publishDraft.ts tee continues to write `null` to the column for
 * new listings.
 *
 * See docs/AUTONEX_LEGACY_SCHEMA.md and src/lib/legacyListingsDbColumns.ts
 * for the full mapping. Renaming requires a coordinated DB migration.
 */
export const vehicleSpecsLegacySubSchema = z.object({
  /** Kilométrage véhicule (km). Legacy column name `surface`. */
  surface: z.string(),
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
  /**
   * WhatsApp phone for direct chat CTA.
   * Lot 9.9 — format E.164 strict aligné sur `validate_listing_content()`
   * (DB) : `^\+[1-9]\d{6,14}$`. Pas d'espaces ni parenthèses côté persistance.
   */
  vehicleWhatsappPhone: z.string().refine(
    (v) => v === "" || /^\+[1-9]\d{6,14}$/.test(v),
    { message: "Le numéro WhatsApp doit être au format international (+261…)." },
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
