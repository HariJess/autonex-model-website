export const MARKET_LISTING_SOURCES = new Set([
  "fiarakodia",
  "autonex",
  "facebook",
  "partner",
  "manual",
  "other",
]);

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeOptionalString(value) {
  if (!isNonEmptyString(value)) return null;
  return value.trim();
}

export function normalizeSource(value) {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) throw new Error("Market ingestion: source is required.");
  if (!MARKET_LISTING_SOURCES.has(normalized)) {
    throw new Error(`Market ingestion: unsupported source "${normalized}".`);
  }
  return normalized;
}

function normalizeTimestamp(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}

export function buildRawListingPayload(input) {
  const source = normalizeSource(input.source);
  const sourceUrl = normalizeOptionalString(input.sourceUrl);
  if (!sourceUrl) throw new Error("Market ingestion: source_url is required.");

  return {
    source,
    source_listing_id: normalizeOptionalString(input.sourceListingId),
    source_url: sourceUrl,
    title: normalizeOptionalString(input.title),
    description_raw: normalizeOptionalString(input.descriptionRaw),
    price_raw: normalizeOptionalString(input.priceRaw),
    currency_raw: normalizeOptionalString(input.currencyRaw),
    city_raw: normalizeOptionalString(input.cityRaw),
    posted_at_raw: normalizeOptionalString(input.postedAtRaw),
    year_raw: normalizeOptionalString(input.yearRaw),
    mileage_raw: normalizeOptionalString(input.mileageRaw),
    fuel_type_raw: normalizeOptionalString(input.fuelTypeRaw),
    transmission_raw: normalizeOptionalString(input.transmissionRaw),
    body_style_raw: normalizeOptionalString(input.bodyStyleRaw),
    seller_name_raw: normalizeOptionalString(input.sellerNameRaw),
    seller_type_raw: normalizeOptionalString(input.sellerTypeRaw),
    phone_raw: normalizeOptionalString(input.phoneRaw),
    payload: input.payload ?? {},
    html_snapshot: normalizeOptionalString(input.htmlSnapshot),
    scraped_at: normalizeTimestamp(input.scrapedAt),
    last_seen_at: normalizeTimestamp(input.lastSeenAt),
  };
}

