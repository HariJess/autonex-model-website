-- AutoNex vehicle estimation MVP schema

create table if not exists public.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_makes(id) on delete cascade,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (make_id, slug)
);

create table if not exists public.vehicle_price_reference_profiles (
  id uuid primary key default gen_random_uuid(),
  make_name text not null,
  model_name text not null,
  body_type text not null,
  fuel_type text,
  transmission_type text,
  baseline_year integer not null,
  baseline_price_mga bigint not null,
  annual_depreciation_rate numeric(6,4) not null default 0.1000,
  expected_km_per_year integer not null default 15000,
  popularity_score integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_generations (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id) on delete cascade,
  name text not null,
  start_year integer,
  end_year integer,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_trims (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.vehicle_generations(id) on delete cascade,
  name text not null,
  fuel_type text,
  transmission_type text,
  body_type text,
  drivetrain text,
  engine_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_estimation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  make_id uuid references public.vehicle_makes(id) on delete set null,
  model_id uuid references public.vehicle_models(id) on delete set null,
  make_name_snapshot text not null,
  model_name_snapshot text not null,
  year integer not null,
  city text not null,
  mileage integer not null,
  fuel_type text not null,
  transmission_type text not null,
  body_type text not null,
  condition_label text not null,
  accident_declared boolean not null default false,
  maintenance_level text not null,
  owner_count_label text not null,
  usage_type text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint vehicle_estimation_requests_year_check check (year between 1950 and extract(year from now())::int),
  constraint vehicle_estimation_requests_mileage_check check (mileage between 0 and 1500000)
);

create table if not exists public.vehicle_estimation_results (
  id uuid primary key default gen_random_uuid(),
  estimation_request_id uuid not null references public.vehicle_estimation_requests(id) on delete cascade,
  market_base_price bigint not null,
  adjusted_price bigint not null,
  low_range_price bigint not null,
  high_range_price bigint not null,
  recommended_listing_price bigint not null,
  quick_sale_price bigint not null,
  confidence_score integer not null,
  confidence_label text not null,
  positive_factors jsonb not null default '[]'::jsonb,
  negative_factors jsonb not null default '[]'::jsonb,
  comparables_used_count integer not null default 0,
  calculation_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_listing_price_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  price bigint not null,
  source text not null default 'listing_update',
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_estimation_events (
  id uuid primary key default gen_random_uuid(),
  estimation_request_id uuid not null references public.vehicle_estimation_requests(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_vehicle_models_make_id on public.vehicle_models(make_id);
create index if not exists idx_vehicle_price_reference_profiles_lookup
  on public.vehicle_price_reference_profiles(lower(make_name), lower(model_name), body_type);
create index if not exists idx_vehicle_generations_model_id on public.vehicle_generations(model_id);
create index if not exists idx_vehicle_trims_generation_id on public.vehicle_trims(generation_id);
create index if not exists idx_vehicle_estimation_requests_user_id on public.vehicle_estimation_requests(user_id);
create index if not exists idx_vehicle_estimation_requests_created_at on public.vehicle_estimation_requests(created_at desc);
create index if not exists idx_vehicle_estimation_results_request_id on public.vehicle_estimation_results(estimation_request_id);
create index if not exists idx_vehicle_estimation_events_request_id on public.vehicle_estimation_events(estimation_request_id);
create index if not exists idx_vehicle_listing_price_history_listing_id on public.vehicle_listing_price_history(listing_id);

alter table public.vehicle_estimation_requests enable row level security;
alter table public.vehicle_estimation_results enable row level security;
alter table public.vehicle_estimation_events enable row level security;
alter table public.vehicle_price_reference_profiles enable row level security;

drop policy if exists "vehicle_price_reference_profiles_public_read" on public.vehicle_price_reference_profiles;
create policy "vehicle_price_reference_profiles_public_read"
on public.vehicle_price_reference_profiles
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "estimation_requests_insert_public" on public.vehicle_estimation_requests;
create policy "estimation_requests_insert_public"
on public.vehicle_estimation_requests
for insert
to anon, authenticated
with check (user_id is null or auth.uid() = user_id);

drop policy if exists "estimation_requests_select_owner" on public.vehicle_estimation_requests;
create policy "estimation_requests_select_owner"
on public.vehicle_estimation_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "estimation_results_insert_public" on public.vehicle_estimation_results;
create policy "estimation_results_insert_public"
on public.vehicle_estimation_results
for insert
to anon, authenticated
with check (true);

drop policy if exists "estimation_results_select_owner" on public.vehicle_estimation_results;
create policy "estimation_results_select_owner"
on public.vehicle_estimation_results
for select
to authenticated
using (
  exists (
    select 1
    from public.vehicle_estimation_requests r
    where r.id = estimation_request_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "estimation_events_insert_public" on public.vehicle_estimation_events;
create policy "estimation_events_insert_public"
on public.vehicle_estimation_events
for insert
to anon, authenticated
with check (true);

drop policy if exists "estimation_events_select_owner" on public.vehicle_estimation_events;
create policy "estimation_events_select_owner"
on public.vehicle_estimation_events
for select
to authenticated
using (
  exists (
    select 1
    from public.vehicle_estimation_requests r
    where r.id = estimation_request_id
      and r.user_id = auth.uid()
  )
);

insert into public.vehicle_price_reference_profiles
  (make_name, model_name, body_type, fuel_type, transmission_type, baseline_year, baseline_price_mga, annual_depreciation_rate, expected_km_per_year, popularity_score, is_active)
values
  ('Toyota', 'RAV4', 'suv', 'diesel', 'automatic', 2021, 165000000, 0.0850, 15000, 92, true),
  ('Toyota', 'Hilux', 'pickup', 'diesel', 'manual', 2021, 178000000, 0.0820, 18000, 95, true),
  ('Toyota', 'Corolla', 'sedan', 'petrol', 'automatic', 2021, 98000000, 0.0900, 14000, 90, true),
  ('Nissan', 'Navara', 'pickup', 'diesel', 'manual', 2020, 148000000, 0.0860, 17000, 78, true),
  ('Hyundai', 'Tucson', 'suv', 'diesel', 'automatic', 2021, 132000000, 0.0890, 15000, 75, true),
  ('Kia', 'Sportage', 'suv', 'diesel', 'automatic', 2021, 126000000, 0.0900, 15000, 72, true),
  ('Mazda', 'BT-50', 'pickup', 'diesel', 'manual', 2020, 138000000, 0.0870, 17500, 70, true),
  ('Suzuki', 'Swift', 'hatchback', 'petrol', 'manual', 2021, 62000000, 0.0950, 13000, 79, true),
  ('Mitsubishi', 'Pajero', 'suv', 'diesel', 'automatic', 2020, 142000000, 0.0900, 16000, 73, true),
  ('Renault', 'Duster', 'suv', 'diesel', 'manual', 2021, 97000000, 0.0920, 15000, 68, true)
on conflict do nothing;
