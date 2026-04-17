-- Market estimation foundation (database only)
-- Scope: raw ingest, cleaned comparables, aggregated market stats.

-- Keep updated_at coherent across new market tables.
create or replace function public.set_market_tables_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.market_listings_raw (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('fiarakodia', 'autonex', 'facebook', 'partner', 'manual', 'other')),
  source_listing_id text null,
  source_url text not null check (char_length(trim(source_url)) > 0),
  title text null,
  description_raw text null,
  price_raw text null,
  currency_raw text null,
  city_raw text null,
  posted_at_raw text null,
  year_raw text null,
  mileage_raw text null,
  fuel_type_raw text null,
  transmission_raw text null,
  body_style_raw text null,
  seller_name_raw text null,
  seller_type_raw text null,
  phone_raw text null,
  payload jsonb not null default '{}'::jsonb,
  html_snapshot text null,
  scraped_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_listings_raw_source_url_unique unique (source, source_url)
);

create table if not exists public.market_listings_clean (
  id uuid primary key default gen_random_uuid(),
  raw_listing_id uuid not null references public.market_listings_raw(id) on delete cascade,
  source text not null check (source in ('fiarakodia', 'autonex', 'facebook', 'partner', 'manual', 'other')),
  source_listing_id text null,
  source_url text not null check (char_length(trim(source_url)) > 0),
  normalized_make text null,
  normalized_model text null,
  normalized_trim text null,
  normalized_generation text null,
  year integer null check (year between 1950 and 2100),
  mileage_km integer null check (mileage_km >= 0),
  price_mga bigint null check (price_mga >= 0),
  fuel_type text null,
  transmission text null,
  body_style text null,
  city text null,
  seller_type text null,
  posted_at timestamptz null,
  listing_status text not null default 'active' check (listing_status in ('active', 'inactive', 'sold', 'unknown', 'duplicate', 'invalid')),
  confidence_score numeric(5,2) null check (confidence_score between 0 and 100),
  outlier_flag boolean not null default false,
  duplicate_of uuid null references public.market_listings_clean(id) on delete set null,
  fingerprint text null,
  comparable_cluster_key text null,
  parsing_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_listings_clean_raw_listing_unique unique (raw_listing_id)
);

create table if not exists public.market_price_stats (
  id uuid primary key default gen_random_uuid(),
  comparable_cluster_key text not null,
  make text not null,
  model text not null,
  body_style text null,
  fuel_type text null,
  transmission text null,
  city text null,
  year_min integer null,
  year_max integer null,
  sample_size integer not null default 0 check (sample_size >= 0),
  min_price_mga bigint null check (min_price_mga >= 0),
  p25_price_mga bigint null check (p25_price_mga >= 0),
  median_price_mga bigint null check (median_price_mga >= 0),
  p75_price_mga bigint null check (p75_price_mga >= 0),
  max_price_mga bigint null check (max_price_mga >= 0),
  avg_price_mga numeric(14,2) null check (avg_price_mga >= 0),
  avg_year numeric(6,2) null,
  avg_mileage_km numeric(12,2) null check (avg_mileage_km >= 0),
  price_stddev numeric(14,2) null check (price_stddev >= 0),
  confidence_score numeric(5,2) null check (confidence_score between 0 and 100),
  last_calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_price_stats_cluster_unique unique (comparable_cluster_key),
  constraint market_price_stats_year_min_check check (year_min is null or year_min between 1950 and 2100),
  constraint market_price_stats_year_max_check check (year_max is null or year_max between 1950 and 2100),
  constraint market_price_stats_year_range_check check (
    year_min is null
    or year_max is null
    or year_max >= year_min
  )
);

-- Raw indexes
create index if not exists idx_market_listings_raw_source_source_listing_id
  on public.market_listings_raw(source, source_listing_id);
create unique index if not exists uq_market_listings_raw_source_source_listing_id_not_null
  on public.market_listings_raw(source, source_listing_id)
  where source_listing_id is not null;
create index if not exists idx_market_listings_raw_scraped_at
  on public.market_listings_raw(scraped_at desc);
create index if not exists idx_market_listings_raw_last_seen_at
  on public.market_listings_raw(last_seen_at desc);
create index if not exists idx_market_listings_raw_payload_gin
  on public.market_listings_raw using gin (payload);

-- Clean indexes
create index if not exists idx_market_listings_clean_normalized_make
  on public.market_listings_clean(normalized_make);
create index if not exists idx_market_listings_clean_normalized_model
  on public.market_listings_clean(normalized_model);
create index if not exists idx_market_listings_clean_make_model_year
  on public.market_listings_clean(normalized_make, normalized_model, year);
create index if not exists idx_market_listings_clean_price_mga
  on public.market_listings_clean(price_mga);
create index if not exists idx_market_listings_clean_mileage_km
  on public.market_listings_clean(mileage_km);
create index if not exists idx_market_listings_clean_comparable_cluster_key
  on public.market_listings_clean(comparable_cluster_key);
create index if not exists idx_market_listings_clean_listing_status
  on public.market_listings_clean(listing_status);
create index if not exists idx_market_listings_clean_city
  on public.market_listings_clean(city);
create index if not exists idx_market_listings_clean_fingerprint
  on public.market_listings_clean(fingerprint);

-- Stats indexes
create index if not exists idx_market_price_stats_make
  on public.market_price_stats(make);
create index if not exists idx_market_price_stats_model
  on public.market_price_stats(model);
create index if not exists idx_market_price_stats_make_model
  on public.market_price_stats(make, model);
create index if not exists idx_market_price_stats_city
  on public.market_price_stats(city);
create index if not exists idx_market_price_stats_comparable_cluster_key
  on public.market_price_stats(comparable_cluster_key);

-- updated_at triggers
drop trigger if exists tr_market_listings_raw_updated_at on public.market_listings_raw;
create trigger tr_market_listings_raw_updated_at
  before update on public.market_listings_raw
  for each row
  execute function public.set_market_tables_updated_at();

drop trigger if exists tr_market_listings_clean_updated_at on public.market_listings_clean;
create trigger tr_market_listings_clean_updated_at
  before update on public.market_listings_clean
  for each row
  execute function public.set_market_tables_updated_at();

drop trigger if exists tr_market_price_stats_updated_at on public.market_price_stats;
create trigger tr_market_price_stats_updated_at
  before update on public.market_price_stats
  for each row
  execute function public.set_market_tables_updated_at();

-- RLS enabled; policies intentionally omitted in this foundational migration.
alter table public.market_listings_raw enable row level security;
alter table public.market_listings_clean enable row level security;
alter table public.market_price_stats enable row level security;

