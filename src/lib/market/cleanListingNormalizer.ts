import type {
  MarketListingCleanInput,
  MarketListingCleanNormalized,
  MarketParsingNote,
} from "@/types/market";

const KNOWN_MAKES = [
  "Toyota",
  "Ford",
  "Mazda",
  "Hyundai",
  "Suzuki",
  "Nissan",
  "Volkswagen",
  "Isuzu",
  "Honda",
  "Peugeot",
  "BMW",
  "Mercedes-Benz",
  "Mitsubishi",
  "Renault",
  "Kia",
  "Audi",
] as const;

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTitleCase(value: string): string {
  const cleaned = normalizeSpaces(value);
  if (!cleaned) return cleaned;
  return cleaned
    .split(" ")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function parseNumberishValue(raw: string): number | null {
  const input = raw.trim();
  if (!input) return null;
  const compact = input
    .toLowerCase()
    .replace(/[,\s]/g, "")
    .replace(/ariary|ar|mga/g, "");
  const millionMatch = compact.match(/^(\d+(?:\.\d+)?)m$/);
  if (millionMatch) {
    const value = Number(millionMatch[1]);
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 1_000_000);
  }
  const digits = compact.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function parsePriceMga(raw: string | null, notes: MarketParsingNote[]): number | null {
  if (!raw) {
    notes.push({
      code: "price_missing",
      message: "Price not found in raw listing.",
      severity: "warning",
    });
    return null;
  }
  const parsed = parseNumberishValue(raw);
  if (parsed == null) {
    notes.push({
      code: "price_parse_failed",
      message: `Unable to parse price "${raw}".`,
      severity: "warning",
    });
    return null;
  }
  return parsed;
}

function parseMileageKm(raw: string | null, notes: MarketParsingNote[]): number | null {
  if (!raw) return null;
  const parsed = parseNumberishValue(raw);
  if (parsed == null) {
    notes.push({
      code: "mileage_parse_failed",
      message: `Unable to parse mileage "${raw}".`,
      severity: "warning",
    });
    return null;
  }
  return parsed;
}

function parseYearCandidate(value: string): number | null {
  const years = value.match(/\b(19[5-9]\d|20\d{2}|2100)\b/g);
  if (!years || years.length === 0) return null;
  const parsed = Number(years[0]);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1950 || parsed > 2100) return null;
  return parsed;
}

function parseYear(
  yearRaw: string | null,
  title: string | null,
  description: string | null,
  notes: MarketParsingNote[],
): number | null {
  const fromYearRaw = yearRaw ? parseYearCandidate(yearRaw) : null;
  if (fromYearRaw) return fromYearRaw;
  const fromTitle = title ? parseYearCandidate(title) : null;
  if (fromTitle) return fromTitle;
  const fromDescription = description ? parseYearCandidate(description) : null;
  if (fromDescription) return fromDescription;
  notes.push({
    code: "year_missing",
    message: "Year not found from year_raw/title/description.",
    severity: "warning",
  });
  return null;
}

function normalizeFuelType(value: string | null): "essence" | "diesel" | "hybrid" | "electric" | null {
  if (!value) return null;
  const v = normalizeSpaces(value).toLowerCase();
  if (/(essence|petrol|gasoline)/.test(v)) return "essence";
  if (/(diesel|gazoil|gasoil)/.test(v)) return "diesel";
  if (/(hybrid|hybride)/.test(v)) return "hybrid";
  if (/(electric|electrique|électrique)/.test(v)) return "electric";
  return null;
}

function normalizeTransmission(value: string | null): "automatic" | "manual" | null {
  if (!value) return null;
  const v = normalizeSpaces(value).toLowerCase();
  if (/(automatique|automatic|auto)/.test(v)) return "automatic";
  if (/(manuelle|manuel|manual)/.test(v)) return "manual";
  return null;
}

function normalizeBodyStyle(
  value: string | null,
):
  | "suv"
  | "sedan"
  | "hatchback"
  | "pickup"
  | "coupe"
  | "convertible"
  | "wagon"
  | "van"
  | null {
  if (!value) return null;
  const v = normalizeSpaces(value).toLowerCase();
  if (/(suv|4x4|crossover)/.test(v)) return "suv";
  if (/(sedan|berline)/.test(v)) return "sedan";
  if (/(hatchback|citadine|compacte)/.test(v)) return "hatchback";
  if (/(pickup|pick-up|pick up)/.test(v)) return "pickup";
  if (/(convertible|cabriolet|roadster|spyder)/.test(v)) return "convertible";
  if (/(coupe|coupé)/.test(v)) return "coupe";
  if (/(wagon|break)/.test(v)) return "wagon";
  if (/(van|minibus|fourgon)/.test(v)) return "van";
  return null;
}

function normalizeSellerType(value: string | null): "dealer" | "private" | null {
  if (!value) return null;
  const v = normalizeSpaces(value).toLowerCase();
  if (/(dealer|pro|garage|concessionnaire)/.test(v)) return "dealer";
  if (/(particulier|private|owner)/.test(v)) return "private";
  return null;
}

function extractFromPayload(
  payload: Record<string, unknown> | null | undefined,
): { make: string | null; model: string | null; trim: string | null } {
  if (!payload) return { make: null, model: null, trim: null };
  const make = typeof payload.make === "string" ? normalizeTitleCase(payload.make) : null;
  const model = typeof payload.model === "string" ? normalizeTitleCase(payload.model) : null;
  const trim = typeof payload.trim === "string" ? normalizeSpaces(payload.trim) : null;
  return { make, model, trim };
}

function extractMakeModelFromTitle(title: string | null): { make: string | null; model: string | null; trim: string | null } {
  if (!title) return { make: null, model: null, trim: null };
  const cleaned = normalizeSpaces(title);
  if (!cleaned) return { make: null, model: null, trim: null };
  const lower = cleaned.toLowerCase();
  const detectedMake =
    KNOWN_MAKES.find((make) => lower.startsWith(`${make.toLowerCase()} `) || lower === make.toLowerCase()) ?? null;
  if (!detectedMake) return { make: null, model: null, trim: null };

  const afterMake = cleaned.slice(detectedMake.length).trim();
  if (!afterMake) return { make: detectedMake, model: null, trim: null };
  const yearPos = afterMake.search(/\b(19[5-9]\d|20\d{2}|2100)\b/);
  const modelTrimChunk = yearPos >= 0 ? afterMake.slice(0, yearPos).trim() : afterMake;
  const parts = modelTrimChunk.split(" ").filter(Boolean);
  const model = parts.length > 0 ? normalizeTitleCase(parts.slice(0, Math.min(2, parts.length)).join(" ")) : null;
  const trim = parts.length > 2 ? parts.slice(2).join(" ") : null;
  return { make: detectedMake, model, trim };
}

function buildYearBucket(year: number | null): string | null {
  if (!year) return null;
  const bucketSize = 5;
  const start = year - (year % bucketSize);
  const end = start + bucketSize - 1;
  return `${start}-${end}`;
}

function buildComparableClusterKey(params: {
  make: string | null;
  model: string | null;
  bodyStyle: string | null;
  fuelType: string | null;
  transmission: string | null;
  year: number | null;
}): string | null {
  if (!params.make || !params.model) return null;
  const yearBucket = buildYearBucket(params.year) ?? "unknown-year";
  return [
    params.make.toLowerCase().replace(/\s+/g, "-"),
    params.model.toLowerCase().replace(/\s+/g, "-"),
    params.bodyStyle ?? "any-body",
    params.fuelType ?? "any-fuel",
    params.transmission ?? "any-gearbox",
    yearBucket,
  ].join("|");
}

function buildFingerprint(params: {
  make: string | null;
  model: string | null;
  year: number | null;
  mileageKm: number | null;
  priceMga: number | null;
  city: string | null;
}): string | null {
  if (!params.make || !params.model) return null;
  return [
    params.make.toLowerCase().replace(/\s+/g, "-"),
    params.model.toLowerCase().replace(/\s+/g, "-"),
    params.year ?? "unknown-year",
    params.mileageKm ?? "unknown-mileage",
    params.priceMga ?? "unknown-price",
    (params.city ?? "unknown-city").toLowerCase().replace(/\s+/g, "-"),
  ].join("|");
}

function computeConfidenceScore(data: {
  make: string | null;
  model: string | null;
  year: number | null;
  mileageKm: number | null;
  priceMga: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  city: string | null;
}): number {
  const essentialValues = [
    data.make,
    data.model,
    data.year,
    data.mileageKm,
    data.priceMga,
    data.fuelType,
    data.transmission,
    data.bodyStyle,
    data.city,
  ];
  const found = essentialValues.filter((value) => value !== null && value !== undefined).length;
  return Number(((found / essentialValues.length) * 100).toFixed(2));
}

export function normalizeRawListingToClean(raw: MarketListingCleanInput): MarketListingCleanNormalized {
  const notes: MarketParsingNote[] = [];
  const title = raw.title ? normalizeSpaces(raw.title) : null;
  const description = raw.description_raw ? normalizeSpaces(raw.description_raw) : null;
  const city = raw.city_raw ? normalizeTitleCase(raw.city_raw) : null;

  const fromTitle = extractMakeModelFromTitle(title);
  const fromPayload = extractFromPayload(raw.payload);

  const normalizedMake = fromTitle.make ?? fromPayload.make;
  const normalizedModel = fromTitle.model ?? fromPayload.model;
  const normalizedTrim = fromTitle.trim ?? fromPayload.trim;

  if (!normalizedMake) {
    notes.push({
      code: "make_missing",
      message: "Unable to detect make from title/payload.",
      severity: "warning",
    });
  }
  if (!normalizedModel) {
    notes.push({
      code: "model_missing",
      message: "Unable to detect model from title/payload.",
      severity: "warning",
    });
  }

  const year = parseYear(raw.year_raw, title, description, notes);
  const mileageKm = parseMileageKm(raw.mileage_raw, notes);
  const priceMga = parsePriceMga(raw.price_raw, notes);
  const fuelType = normalizeFuelType(raw.fuel_type_raw);
  const transmission = normalizeTransmission(raw.transmission_raw);
  const bodyStyle = normalizeBodyStyle(raw.body_style_raw);
  const sellerType = normalizeSellerType(raw.seller_type_raw);
  const confidenceScore = computeConfidenceScore({
    make: normalizedMake,
    model: normalizedModel,
    year,
    mileageKm,
    priceMga,
    fuelType,
    transmission,
    bodyStyle,
    city,
  });
  const fingerprint = buildFingerprint({
    make: normalizedMake,
    model: normalizedModel,
    year,
    mileageKm,
    priceMga,
    city,
  });
  const comparableClusterKey = buildComparableClusterKey({
    make: normalizedMake,
    model: normalizedModel,
    bodyStyle,
    fuelType,
    transmission,
    year,
  });

  if (confidenceScore < 45) {
    notes.push({
      code: "low_confidence",
      message: "Low confidence normalization due to missing essential fields.",
      severity: "warning",
    });
  }

  return {
    raw_listing_id: raw.id,
    source: raw.source,
    source_listing_id: raw.source_listing_id,
    source_url: raw.source_url,
    normalized_make: normalizedMake,
    normalized_model: normalizedModel,
    normalized_trim: normalizedTrim,
    normalized_generation: null,
    year,
    mileage_km: mileageKm,
    price_mga: priceMga,
    fuel_type: fuelType,
    transmission,
    body_style: bodyStyle,
    city,
    seller_type: sellerType,
    posted_at: null,
    listing_status: "active",
    confidence_score: confidenceScore,
    outlier_flag: false,
    duplicate_of: null,
    fingerprint,
    comparable_cluster_key: comparableClusterKey,
    parsing_notes: notes,
  };
}

