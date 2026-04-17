export const MARKET_LISTING_SOURCES = [
  "fiarakodia",
  "autonex",
  "facebook",
  "partner",
  "manual",
  "other",
] as const;

export type MarketListingSource = (typeof MARKET_LISTING_SOURCES)[number];

export type MarketListingRawInput = {
  source: MarketListingSource | string;
  sourceListingId?: string | null;
  sourceUrl: string;
  title?: string | null;
  descriptionRaw?: string | null;
  priceRaw?: string | null;
  currencyRaw?: string | null;
  cityRaw?: string | null;
  postedAtRaw?: string | null;
  yearRaw?: string | null;
  mileageRaw?: string | null;
  fuelTypeRaw?: string | null;
  transmissionRaw?: string | null;
  bodyStyleRaw?: string | null;
  sellerNameRaw?: string | null;
  sellerTypeRaw?: string | null;
  phoneRaw?: string | null;
  payload?: Record<string, unknown> | null;
  htmlSnapshot?: string | null;
  scrapedAt?: string | Date | null;
  lastSeenAt?: string | Date | null;
};

export type MarketListingRawRecord = {
  id: string;
  source: MarketListingSource;
  source_listing_id: string | null;
  source_url: string;
  title: string | null;
  description_raw: string | null;
  price_raw: string | null;
  currency_raw: string | null;
  city_raw: string | null;
  posted_at_raw: string | null;
  year_raw: string | null;
  mileage_raw: string | null;
  fuel_type_raw: string | null;
  transmission_raw: string | null;
  body_style_raw: string | null;
  seller_name_raw: string | null;
  seller_type_raw: string | null;
  phone_raw: string | null;
  payload: Record<string, unknown>;
  html_snapshot: string | null;
  scraped_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type MarketIngestionResult = {
  success: boolean;
  total: number;
  upserted: number;
  failed: number;
  records: MarketListingRawRecord[];
  errors: string[];
};

export type MarketParsingSeverity = "info" | "warning";

export type MarketParsingNote = {
  code: string;
  message: string;
  severity: MarketParsingSeverity;
};

export type MarketListingCleanInput = MarketListingRawRecord;

export type MarketListingCleanNormalized = {
  raw_listing_id: string;
  source: MarketListingSource;
  source_listing_id: string | null;
  source_url: string;
  normalized_make: string | null;
  normalized_model: string | null;
  normalized_trim: string | null;
  normalized_generation: string | null;
  year: number | null;
  mileage_km: number | null;
  price_mga: number | null;
  fuel_type: "essence" | "diesel" | "hybrid" | "electric" | null;
  transmission: "automatic" | "manual" | null;
  body_style:
    | "suv"
    | "sedan"
    | "hatchback"
    | "pickup"
    | "coupe"
    | "convertible"
    | "wagon"
    | "van"
    | null;
  city: string | null;
  seller_type: "dealer" | "private" | null;
  posted_at: string | null;
  listing_status: "active" | "inactive" | "sold" | "unknown" | "duplicate" | "invalid";
  confidence_score: number;
  outlier_flag: boolean;
  duplicate_of: string | null;
  fingerprint: string | null;
  comparable_cluster_key: string | null;
  parsing_notes: MarketParsingNote[];
};

export type MarketCleanProcessResult = {
  success: boolean;
  total: number;
  processed: number;
  failed: number;
  records: MarketListingCleanNormalized[];
  errors: string[];
};

export type MarketStatsCleanInput = {
  id: string;
  comparable_cluster_key: string | null;
  normalized_make: string | null;
  normalized_model: string | null;
  body_style: string | null;
  fuel_type: string | null;
  transmission: string | null;
  city: string | null;
  year: number | null;
  mileage_km: number | null;
  price_mga: number | null;
  listing_status: "active" | "inactive" | "sold" | "unknown" | "duplicate" | "invalid";
  outlier_flag: boolean;
};

export type MarketComparableGroup = {
  comparable_cluster_key: string;
  listings: MarketStatsCleanInput[];
};

export type MarketPriceStatsComputed = {
  comparable_cluster_key: string;
  make: string;
  model: string;
  body_style: string | null;
  fuel_type: string | null;
  transmission: string | null;
  city: string | null;
  year_min: number | null;
  year_max: number | null;
  sample_size: number;
  min_price_mga: number | null;
  p25_price_mga: number | null;
  median_price_mga: number | null;
  p75_price_mga: number | null;
  max_price_mga: number | null;
  avg_price_mga: number | null;
  avg_year: number | null;
  avg_mileage_km: number | null;
  price_stddev: number | null;
  confidence_score: number;
  last_calculated_at: string;
};

export type MarketStatsBatchResult = {
  success: boolean;
  total_clean_read: number;
  groups_computed: number;
  upserted: number;
  failed: number;
  records: MarketPriceStatsComputed[];
  errors: string[];
};

