import type { DisplayListing } from "@/types/listing";
import { parseVehicleMetaTags } from "@/lib/vehicleMetaTags";

type VehicleCondition = "neuf" | "occasion" | null;
type SellerType = "concessionnaire" | "particulier";

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
  surface: number | null | undefined;
  bathrooms: number | null | undefined;
  isNewProgram?: boolean | null | undefined;
  features?: string[] | null | undefined;
  agencyName?: string | null | undefined;
}): NonNullable<DisplayListing["vehicle"]> {
  const features = Array.isArray(input.features) ? input.features : [];
  const tagged = parseVehicleMetaTags(features);
  const parsed = parseMakeModelYear(input.title);
  const mileageKm = input.surface != null && input.surface > 0 ? input.surface : null;
  const doors = input.bathrooms != null && input.bathrooms > 0 ? input.bathrooms : null;
  const fuel =
    tagged.fuel ??
    pickFromFeatures(features, ["Diesel", "Essence", "Hybride", "Électrique", "GPL"]) ??
    null;
  const transmission =
    tagged.transmission ??
    pickFromFeatures(features, ["Boîte automatique", "Automatique", "Boîte manuelle", "Manuelle"]) ??
    null;
  const drivetrain =
    tagged.drivetrain ??
    pickFromFeatures(features, ["4x4", "4x2", "AWD", "Traction", "Propulsion"]) ??
    null;
  const condition: VehicleCondition =
    (tagged.condition as VehicleCondition) ?? (input.isNewProgram === true ? "neuf" : mileageKm != null ? "occasion" : null);
  const sellerType: SellerType = (tagged.sellerType as SellerType) ?? (input.agencyName ? "concessionnaire" : "particulier");

  return {
    make: tagged.make ?? parsed.make,
    model: tagged.model ?? parsed.model,
    year: tagged.year ?? parsed.year,
    mileageKm,
    fuel,
    transmission,
    drivetrain,
    doors,
    condition,
    sellerType,
  };
}
