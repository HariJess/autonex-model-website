import { supabase } from "@/integrations/supabase/client";
import type { EstimationInput, EstimationOutput } from "@/types/estimation";
import type { EstimationAuditSnapshot } from "@/lib/estimation/telemetry";

export interface EstimationRequestInsertResult {
  id: string;
  submissionSecret: string;
}

export type EstimationRpcErrorCode =
  | "ESTIMATION_REQUEST_NOT_FOUND"
  | "ESTIMATION_WRITE_FORBIDDEN"
  | "ESTIMATION_RESULT_ALREADY_EXISTS"
  | "ESTIMATION_EVENT_TYPE_INVALID"
  | "unknown";

export function mapEstimationRpcError(message: string): EstimationRpcErrorCode {
  const ordered: EstimationRpcErrorCode[] = [
    "ESTIMATION_REQUEST_NOT_FOUND",
    "ESTIMATION_WRITE_FORBIDDEN",
    "ESTIMATION_RESULT_ALREADY_EXISTS",
    "ESTIMATION_EVENT_TYPE_INVALID",
  ];
  for (const code of ordered) {
    if (message.includes(code)) return code;
  }
  return "unknown";
}

export async function insertEstimationRequest(
  input: EstimationInput,
  userId: string | null,
): Promise<EstimationRequestInsertResult> {
  const payload = {
    user_id: userId,
    make_id: input.makeId ?? null,
    model_id: input.modelId ?? null,
    make_name_snapshot: input.makeName,
    model_name_snapshot: input.modelName,
    year: input.year,
    city: input.city,
    mileage: input.mileage,
    fuel_type: input.fuelType,
    transmission_type: input.transmissionType,
    body_type: input.bodyType,
    condition_label: input.conditionLabel,
    accident_declared: input.accidentDeclared,
    maintenance_level: input.maintenanceLevel,
    owner_count_label: input.ownerCountLabel,
    usage_type: input.usageType,
    raw_payload: input as unknown as Record<string, unknown>,
  };

  const { data, error } = await supabase
    .from("vehicle_estimation_requests")
    .insert(payload)
    .select("id, submission_secret")
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string; submission_secret: string };
  return { id: String(row.id), submissionSecret: String(row.submission_secret) };
}

export async function insertEstimationResult(
  estimationRequestId: string,
  submissionSecret: string,
  output: EstimationOutput,
  audit?: EstimationAuditSnapshot,
): Promise<string> {
  const calculationPayload = {
    legacy: output,
    audit: audit ?? null,
  } as unknown as Record<string, unknown>;

  const { data, error } = await supabase.rpc("record_vehicle_estimation_result", {
    p_estimation_request_id: estimationRequestId,
    p_submission_secret: submissionSecret,
    p_market_base_price: output.marketBasePrice,
    p_adjusted_price: output.adjustedPrice,
    p_low_range_price: output.lowRangePrice,
    p_high_range_price: output.highRangePrice,
    p_recommended_listing_price: output.recommendedListingPrice,
    p_quick_sale_price: output.quickSalePrice,
    p_confidence_score: output.confidenceScore,
    p_confidence_label: output.confidenceLabel,
    p_positive_factors: output.positiveFactors,
    p_negative_factors: output.negativeFactors,
    p_comparables_used_count: output.comparables.length,
    p_calculation_payload: calculationPayload,
  });

  if (error) throw new Error(error.message);
  return String(data as string);
}

export async function insertEstimationEvent(
  estimationRequestId: string,
  submissionSecret: string,
  eventType:
    | "estimation_started"
    | "estimation_completed"
    | "estimation_result_viewed"
    | "clicked_publish_after_estimation"
    | "clicked_refine_estimation"
    | "clicked_compare_after_estimation"
    | "viewed_similar_listings",
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc("record_vehicle_estimation_event", {
    p_estimation_request_id: estimationRequestId,
    p_submission_secret: submissionSecret,
    p_event_type: eventType,
    p_metadata: metadata ?? {},
  });
  if (error) throw new Error(error.message);
}
