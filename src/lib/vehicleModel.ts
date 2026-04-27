import type { DisplayListing } from "@/types/listing";
import { parseVehicleMetaTags } from "@/lib/vehicleMetaTags";

type VehicleCondition = "neuf" | "occasion" | null;
type SellerType = "concessionnaire" | "particulier" | null;

const KNOWN_MAKES = [
  "Toyota", "Nissan", "Hyundai", "Kia", "Honda", "Suzuki", "Mitsubishi", "Mazda", "Subaru",
  "Ford", "Renault", "Peugeot", "Volkswagen", "BMW", "Mercedes", "Audi", "Dacia", "Isuzu",
  "Yamaha", "Kawasaki", "KTM", "Iveco",
] as const;

function parseMakeModelYear(title: string): { make: string | null; model: string | null; year: number | null } {
  const clean = title.replace(/[—–-].*$/, "").trim();
  const yearMatch = clean.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { make: null, model: null, year };

  const makeToken = tokens[0];
  const known = KNOWN_MAKES.find((m) => m.toLowerCase() === makeToken.toLowerCase());
  const make = known ?? (makeToken.length > 1 ? makeToken : null);

  const modelTokens = tokens
    .slice(1)
    .filter((t) => !/^(19|20)\d{2}$/.test(t))
    .slice(0, 3);
  const model = modelTokens.length > 0 ? modelTokens.join(" ") : null;
  return { make, model, year };
}

function pickFromFeatures(features: string[], candidates: readonly string[]): string | null {
  const lower = features.map((f) => f.toLowerCase());
  const found = candidates.find((c) => lower.some((f) => f.includes(c.toLowerCase())));
  return found ?? null;
}

export function deriveVehicleFromLegacy(input: {
  title: string;
  mileageKm?: number | null | undefined;
  doors?: number | null | undefined;
  make?: string | null | undefined;
  model?: string | null | undefined;
  year?: number | null | undefined;
  fuel?: string | null | undefined;
  transmission?: string | null | undefined;
  drivetrain?: string | null | undefined;
  bodyStyle?: string | null | undefined;
  rentalMode?: string | null | undefined;
  seats?: number | null | undefined;
  exteriorColor?: string | null | undefined;
  engineDisplacementL?: number | null | undefined;
  interiorColor?: string | null | undefined;
  availabilityStatus?: string | null | undefined;
  isElectric?: boolean | null | undefined;
  isHybrid?: boolean | null | undefined;
  vehicleCondition?: string | null | undefined;
  sellerType?: string | null | undefined;
  isNewProgram?: boolean | null | undefined;
  features?: string[] | null | undefined;
  agencyName?: string | null | undefined;
}): NonNullable<DisplayListing["vehicle"]> {
  const features = Array.isArray(input.features) ? input.features : [];
  const tagged = parseVehicleMetaTags(features);
  const parsed = parseMakeModelYear(input.title);
  const mileageKm = input.mileageKm != null && input.mileageKm > 0 ? input.mileageKm : null;
  const doors = input.doors != null && input.doors > 0 ? input.doors : null;
  const fuel =
    input.fuel ??
    tagged.fuel ??
    pickFromFeatures(features, ["Diesel", "Essence", "Hybride", "Électrique", "GPL"]) ??
    null;
  const transmission =
    input.transmission ??
    tagged.transmission ??
    pickFromFeatures(features, ["Boîte automatique", "Automatique", "Boîte manuelle", "Manuelle"]) ??
    null;
  const drivetrain =
    input.drivetrain ??
    tagged.drivetrain ??
    pickFromFeatures(features, ["4x4", "4x2", "AWD", "Traction", "Propulsion"]) ??
    null;
  const condition: VehicleCondition =
    (input.vehicleCondition as VehicleCondition) ??
    (tagged.condition as VehicleCondition) ??
    (input.isNewProgram === true ? "neuf" : mileageKm != null ? "occasion" : null);
  const explicitSellerType =
    (input.sellerType as SellerType) ?? (tagged.sellerType as SellerType) ?? null;
  const sellerType: SellerType =
    explicitSellerType === "concessionnaire" && !input.agencyName
      ? "particulier"
      : explicitSellerType ?? (input.agencyName ? "concessionnaire" : "particulier");

  return {
    make: input.make ?? tagged.make ?? parsed.make,
    model: input.model ?? tagged.model ?? parsed.model,
    year: input.year ?? tagged.year ?? parsed.year,
    mileageKm,
    fuel,
    transmission: input.transmission ?? transmission,
    drivetrain,
    doors,
    bodyStyle: input.bodyStyle ?? null,
    rentalMode: input.rentalMode ?? null,
    seats: input.seats ?? null,
    exteriorColor: input.exteriorColor ?? null,
    engineDisplacementL: input.engineDisplacementL ?? tagged.engineDisplacementL ?? null,
    interiorColor: input.interiorColor ?? null,
    availabilityStatus: input.availabilityStatus ?? null,
    isElectric: input.isElectric === true || (fuel?.toLowerCase().includes("électrique") ?? false) || (fuel?.toLowerCase().includes("electrique") ?? false),
    isHybrid: input.isHybrid === true || (fuel?.toLowerCase().includes("hybride") ?? false),
    condition,
    sellerType,
  };
}
