-- Vehicle estimation write hardening (MVP): close open INSERT on results/events;
-- anonymous ownership via submission_secret; authenticated ownership via user_id.

alter table public.vehicle_estimation_requests
  add column if not exists submission_secret uuid not null default gen_random_uuid();

-- Authenticated clients must bind requests to their profile (no null user_id for logged-in users).
drop policy if exists "estimation_requests_insert_public" on public.vehicle_estimation_requests;
create policy "estimation_requests_insert_public"
on public.vehicle_estimation_requests
for insert
to anon, authenticated
with check (
  (auth.uid() is null and user_id is null)
  or (auth.uid() is not null and user_id = auth.uid())
);

-- Remove permissive INSERT policies (previously with check (true)).
drop policy if exists "estimation_results_insert_public" on public.vehicle_estimation_results;
drop policy if exists "estimation_events_insert_public" on public.vehicle_estimation_events;

-- Writes go through SECURITY DEFINER RPCs below only.

create or replace function public.record_vehicle_estimation_result(
  p_estimation_request_id uuid,
  p_submission_secret uuid,
  p_market_base_price bigint,
  p_adjusted_price bigint,
  p_low_range_price bigint,
  p_high_range_price bigint,
  p_recommended_listing_price bigint,
  p_quick_sale_price bigint,
  p_confidence_score integer,
  p_confidence_label text,
  p_positive_factors jsonb,
  p_negative_factors jsonb,
  p_comparables_used_count integer,
  p_calculation_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.vehicle_estimation_requests%rowtype;
  v_id uuid;
begin
  select *
  into v_req
  from public.vehicle_estimation_requests
  where id = p_estimation_request_id
  for update;

  if not found then
    raise exception 'ESTIMATION_REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_req.user_id is not null then
    if auth.uid() is null or auth.uid() <> v_req.user_id then
      raise exception 'ESTIMATION_WRITE_FORBIDDEN' using errcode = 'P0001';
    end if;
  else
    if p_submission_secret is null or p_submission_secret <> v_req.submission_secret then
      raise exception 'ESTIMATION_WRITE_FORBIDDEN' using errcode = 'P0001';
    end if;
  end if;

  if exists (
    select 1
    from public.vehicle_estimation_results r
    where r.estimation_request_id = p_estimation_request_id
  ) then
    raise exception 'ESTIMATION_RESULT_ALREADY_EXISTS' using errcode = 'P0001';
  end if;

  insert into public.vehicle_estimation_results (
    estimation_request_id,
    market_base_price,
    adjusted_price,
    low_range_price,
    high_range_price,
    recommended_listing_price,
    quick_sale_price,
    confidence_score,
    confidence_label,
    positive_factors,
    negative_factors,
    comparables_used_count,
    calculation_payload
  )
  values (
    p_estimation_request_id,
    p_market_base_price,
    p_adjusted_price,
    p_low_range_price,
    p_high_range_price,
    p_recommended_listing_price,
    p_quick_sale_price,
    p_confidence_score,
    p_confidence_label,
    coalesce(p_positive_factors, '[]'::jsonb),
    coalesce(p_negative_factors, '[]'::jsonb),
    p_comparables_used_count,
    coalesce(p_calculation_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.record_vehicle_estimation_event(
  p_estimation_request_id uuid,
  p_submission_secret uuid,
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.vehicle_estimation_requests%rowtype;
begin
  if p_event_type is null
    or trim(p_event_type) = ''
    or p_event_type not in (
      'estimation_started',
      'estimation_completed',
      'estimation_result_viewed',
      'clicked_publish_after_estimation',
      'clicked_refine_estimation',
      'clicked_compare_after_estimation',
      'viewed_similar_listings'
    )
  then
    raise exception 'ESTIMATION_EVENT_TYPE_INVALID' using errcode = 'P0001';
  end if;

  select *
  into v_req
  from public.vehicle_estimation_requests
  where id = p_estimation_request_id;

  if not found then
    raise exception 'ESTIMATION_REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_req.user_id is not null then
    if auth.uid() is null or auth.uid() <> v_req.user_id then
      raise exception 'ESTIMATION_WRITE_FORBIDDEN' using errcode = 'P0001';
    end if;
  else
    if p_submission_secret is null or p_submission_secret <> v_req.submission_secret then
      raise exception 'ESTIMATION_WRITE_FORBIDDEN' using errcode = 'P0001';
    end if;
  end if;

  insert into public.vehicle_estimation_events (
    estimation_request_id,
    event_type,
    metadata
  )
  values (
    p_estimation_request_id,
    p_event_type,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.record_vehicle_estimation_result(
  uuid,
  uuid,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  integer,
  text,
  jsonb,
  jsonb,
  integer,
  jsonb
) to anon, authenticated;

grant execute on function public.record_vehicle_estimation_event(
  uuid,
  uuid,
  text,
  jsonb
) to anon, authenticated;
