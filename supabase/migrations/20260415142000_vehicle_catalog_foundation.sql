-- Broad vehicle input catalog foundation (decoupled from pricing support).

create table if not exists public.vehicle_catalog_makes (
  id uuid primary key default gen_random_uuid(),
  external_source text not null default 'manual',
  external_make_id text,
  name text not null,
  normalized_name text not null,
  slug text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create table if not exists public.vehicle_catalog_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_catalog_makes(id) on delete cascade,
  external_source text not null default 'manual',
  external_model_id text,
  name text not null,
  normalized_name text not null,
  slug text not null,
  year_start integer,
  year_end integer,
  body_type_hint text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (make_id, normalized_name)
);

create table if not exists public.vehicle_catalog_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('make', 'model')),
  canonical_id uuid not null,
  alias text not null,
  alias_normalized text not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (entity_type, alias_normalized)
);

create index if not exists idx_vehicle_catalog_makes_slug on public.vehicle_catalog_makes(slug);
create index if not exists idx_vehicle_catalog_makes_external on public.vehicle_catalog_makes(external_source, external_make_id);
create index if not exists idx_vehicle_catalog_models_make_id on public.vehicle_catalog_models(make_id);
create index if not exists idx_vehicle_catalog_models_external on public.vehicle_catalog_models(external_source, external_model_id);
create index if not exists idx_vehicle_catalog_aliases_lookup on public.vehicle_catalog_aliases(entity_type, alias_normalized);

alter table public.vehicle_catalog_makes enable row level security;
alter table public.vehicle_catalog_models enable row level security;
alter table public.vehicle_catalog_aliases enable row level security;

drop policy if exists "vehicle_catalog_makes_public_read" on public.vehicle_catalog_makes;
create policy "vehicle_catalog_makes_public_read"
on public.vehicle_catalog_makes
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "vehicle_catalog_models_public_read" on public.vehicle_catalog_models;
create policy "vehicle_catalog_models_public_read"
on public.vehicle_catalog_models
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "vehicle_catalog_aliases_public_read" on public.vehicle_catalog_aliases;
create policy "vehicle_catalog_aliases_public_read"
on public.vehicle_catalog_aliases
for select
to anon, authenticated
using (true);
