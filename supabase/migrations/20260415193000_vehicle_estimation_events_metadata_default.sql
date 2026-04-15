-- Defensive hardening for estimation event metadata.
-- Ensures metadata is always an object and never null.

update public.vehicle_estimation_events
set metadata = '{}'::jsonb
where metadata is null;

alter table public.vehicle_estimation_events
  alter column metadata set default '{}'::jsonb;

alter table public.vehicle_estimation_events
  alter column metadata set not null;
