function normalizeSpaces(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeTitleCase(value) {
  const cleaned = normalizeSpaces(value);
  if (!cleaned) return cleaned;
  return cleaned
    .split(" ")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

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
];

function parseNumberishValue(raw) {
  const input = String(raw ?? "").trim();
  if (!input) return null;
  const compact = input
    .toLowerCase()
    .replace(/[,\s]/g, "")
    .replace(/ariary|ar|mga/g, "");
  const millionMatch = compact.match(/^(\d+(?:\.\d+)?)m$/);
  if (millionMatch) return Math.round(Number(millionMatch[1]) * 1_000_000);
  const digits = compact.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parsePriceMga(raw, notes) {
  if (!raw) {
    notes.push({ code: "price_missing", message: "Price not found in raw listing.", severity: "warning" });
    return null;
  }
  const parsed = parseNumberishValue(raw);
  if (parsed == null) {
    notes.push({ code: "price_parse_failed", message: `Unable to parse price "${raw}".`, severity: "warning" });
    return null;
  }
  return parsed;
}

function parseMileageKm(raw, notes) {
  if (!raw) return null;
  const parsed = parseNumberishValue(raw);
  if (parsed == null) {
    notes.push({ code: "mileage_parse_failed", message: `Unable to parse mileage "${raw}".`, severity: "warning" });
    return null;
  }
  return parsed;
}

function parseYearCandidate(value) {
  const years = String(value ?? "").match(/\b(19[5-9]\d|20\d{2}|2100)\b/g);
  if (!years || years.length === 0) return null;
  const parsed = Number(years[0]);
  if (!Number.isFinite(parsed) || parsed < 1950 || parsed > 2100) return null;
  return parsed;
}

function parseYear(yearRaw, title, description, notes) {
  const fromYearRaw = parseYearCandidate(yearRaw);
  if (fromYearRaw) return fromYearRaw;
  const fromTitle = parseYearCandidate(title);
  if (fromTitle) return fromTitle;
  const fromDescription = parseYearCandidate(description);
  if (fromDescription) return fromDescription;
  notes.push({ code: "year_missing", message: "Year not found from year_raw/title/description.", severity: "warning" });
  return null;
}

function normalizeFuelType(value) {
  const v = normalizeSpaces(value).toLowerCase();
  if (!v) return null;
  if (/(essence|petrol|gasoline)/.test(v)) return "essence";
  if (/(diesel|gazoil|gasoil)/.test(v)) return "diesel";
  if (/(hybrid|hybride)/.test(v)) return "hybrid";
  if (/(electric|electrique|électrique)/.test(v)) return "electric";
  return null;
}

function normalizeTransmission(value) {
  const v = normalizeSpaces(value).toLowerCase();
  if (!v) return null;
  if (/(automatique|automatic|auto)/.test(v)) return "automatic";
  if (/(manuelle|manuel|manual)/.test(v)) return "manual";
  return null;
}

function normalizeBodyStyle(value) {
  const v = normalizeSpaces(value).toLowerCase();
  if (!v) return null;
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

function normalizeSellerType(value) {
  const v = normalizeSpaces(value).toLowerCase();
  if (!v) return null;
  if (/(dealer|pro|garage|concessionnaire)/.test(v)) return "dealer";
  if (/(particulier|private|owner)/.test(v)) return "private";
  return null;
}

function extractFromPayload(payload) {
  if (!payload || typeof payload !== "object") return { make: null, model: null, trim: null };
  const make = typeof payload.make === "string" ? normalizeTitleCase(payload.make) : null;
  const model = typeof payload.model === "string" ? normalizeTitleCase(payload.model) : null;
  const trim = typeof payload.trim === "string" ? normalizeSpaces(payload.trim) : null;
  return { make, model, trim };
}

function extractMakeModelFromTitle(title) {
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

function buildYearBucket(year) {
  if (!year) return null;
  const bucketSize = 5;
  const start = year - (year % bucketSize);
  const end = start + bucketSize - 1;
  return `${start}-${end}`;
}

function buildComparableClusterKey({ make, model, bodyStyle, fuelType, transmission, year }) {
  if (!make || !model) return null;
  const yearBucket = buildYearBucket(year) ?? "unknown-year";
  return [
    make.toLowerCase().replace(/\s+/g, "-"),
    model.toLowerCase().replace(/\s+/g, "-"),
    bodyStyle ?? "any-body",
    fuelType ?? "any-fuel",
    transmission ?? "any-gearbox",
    yearBucket,
  ].join("|");
}

function buildFingerprint({ make, model, year, mileageKm, priceMga, city }) {
  if (!make || !model) return null;
  return [
    make.toLowerCase().replace(/\s+/g, "-"),
    model.toLowerCase().replace(/\s+/g, "-"),
    year ?? "unknown-year",
    mileageKm ?? "unknown-mileage",
    priceMga ?? "unknown-price",
    normalizeSpaces(city || "unknown-city").toLowerCase().replace(/\s+/g, "-"),
  ].join("|");
}

function computeConfidenceScore({ make, model, year, mileageKm, priceMga, fuelType, transmission, bodyStyle, city }) {
  const essentialValues = [make, model, year, mileageKm, priceMga, fuelType, transmission, bodyStyle, city];
  const found = essentialValues.filter((value) => value !== null && value !== undefined).length;
  return Number(((found / essentialValues.length) * 100).toFixed(2));
}

export function normalizeRawListingToClean(raw) {
  const notes = [];
  const title = normalizeSpaces(raw.title);
  const description = normalizeSpaces(raw.description_raw);
  const city = raw.city_raw ? normalizeTitleCase(raw.city_raw) : null;

  const fromTitle = extractMakeModelFromTitle(title);
  const fromPayload = extractFromPayload(raw.payload);
  const normalizedMake = fromTitle.make ?? fromPayload.make;
  const normalizedModel = fromTitle.model ?? fromPayload.model;
  const normalizedTrim = fromTitle.trim ?? fromPayload.trim;

  if (!normalizedMake) notes.push({ code: "make_missing", message: "Unable to detect make from title/payload.", severity: "warning" });
  if (!normalizedModel) notes.push({ code: "model_missing", message: "Unable to detect model from title/payload.", severity: "warning" });

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
  if (confidenceScore < 45) {
    notes.push({ code: "low_confidence", message: "Low confidence normalization due to missing essential fields.", severity: "warning" });
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
    fingerprint: buildFingerprint({
      make: normalizedMake,
      model: normalizedModel,
      year,
      mileageKm,
      priceMga,
      city,
    }),
    comparable_cluster_key: buildComparableClusterKey({
      make: normalizedMake,
      model: normalizedModel,
      bodyStyle,
      fuelType,
      transmission,
      year,
    }),
    parsing_notes: notes,
  };
}

