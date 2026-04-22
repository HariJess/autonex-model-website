-- =============================================================================
-- Migration : create_vehicle_estimation_request RPC
-- Purpose  : Allow anon + authenticated users to create an estimation request
--            without relying on PostgREST INSERT + SELECT pattern which fails
--            for anon users (SELECT post-INSERT blocked by RLS policy).
-- Pattern  : Matches style of record_vehicle_estimation_result RPC (typed
--            params, SECURITY DEFINER).
-- Security : user_id is forced from auth.uid() inside the function, never
--            trusted from client parameters. search_path is restricted.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_vehicle_estimation_request(
  p_make_name_snapshot  text,
  p_model_name_snapshot text,
  p_year                integer,
  p_city                text,
  p_mileage             integer,
  p_fuel_type           text,
  p_transmission_type   text,
  p_body_type           text,
  p_condition_label     text,
  p_accident_declared   boolean,
  p_maintenance_level   text,
  p_owner_count_label   text,
  p_usage_type          text,
  p_raw_payload         jsonb,
  p_make_id             uuid DEFAULT NULL,
  p_model_id            uuid DEFAULT NULL
)
RETURNS TABLE (request_id uuid, submission_secret uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_row_id uuid;
  v_submission_secret uuid;
BEGIN
  v_user_id := auth.uid();

  IF p_make_name_snapshot IS NULL OR length(trim(p_make_name_snapshot)) = 0 THEN
    RAISE EXCEPTION 'make_name_snapshot is required' USING ERRCODE = '22023';
  END IF;
  IF p_model_name_snapshot IS NULL OR length(trim(p_model_name_snapshot)) = 0 THEN
    RAISE EXCEPTION 'model_name_snapshot is required' USING ERRCODE = '22023';
  END IF;
  IF p_year IS NULL OR p_year < 1900 OR p_year > (extract(year from now())::int + 1) THEN
    RAISE EXCEPTION 'year is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_mileage IS NULL OR p_mileage < 0 OR p_mileage > 10000000 THEN
    RAISE EXCEPTION 'mileage is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_city IS NULL OR length(trim(p_city)) = 0 THEN
    RAISE EXCEPTION 'city is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.vehicle_estimation_requests (
    user_id,
    make_id,
    model_id,
    make_name_snapshot,
    model_name_snapshot,
    year,
    city,
    mileage,
    fuel_type,
    transmission_type,
    body_type,
    condition_label,
    accident_declared,
    maintenance_level,
    owner_count_label,
    usage_type,
    raw_payload
  ) VALUES (
    v_user_id,
    p_make_id,
    p_model_id,
    p_make_name_snapshot,
    p_model_name_snapshot,
    p_year,
    p_city,
    p_mileage,
    p_fuel_type,
    p_transmission_type,
    p_body_type,
    p_condition_label,
    p_accident_declared,
    p_maintenance_level,
    p_owner_count_label,
    p_usage_type,
    COALESCE(p_raw_payload, '{}'::jsonb)
  )
  RETURNING id, vehicle_estimation_requests.submission_secret
  INTO v_row_id, v_submission_secret;

  request_id := v_row_id;
  submission_secret := v_submission_secret;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_vehicle_estimation_request(
  text, text, integer, text, integer, text, text, text, text, boolean, text, text, text, jsonb, uuid, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_vehicle_estimation_request(
  text, text, integer, text, integer, text, text, text, text, boolean, text, text, text, jsonb, uuid, uuid
) TO anon, authenticated;

COMMENT ON FUNCTION public.create_vehicle_estimation_request IS
'Creates a vehicle_estimation_requests row on behalf of the calling user (anon or authenticated). Returns the created id and submission_secret. Bypasses RLS via SECURITY DEFINER but forces user_id from auth.uid() to prevent spoofing.';
