import { supabase } from "@/integrations/supabase/client";
import type { EstimationInput, EstimationOutput } from "@/types/estimation";
import type { EstimationAuditSnapshot } from "@/lib/estimation/telemetry";

export async function insertEstimationRequest(input: EstimationInput, userId: string | null): Promise<string> {
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
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return String((data as { id: string }).id);
}

export async function insertEstimationResult(
  estimationRequestId: string,
  output: EstimationOutput,
  audit?: EstimationAuditSnapshot,
): Promise<string> {
  const calculationPayload = {
    legacy: output,
    audit: audit ?? null,
  } as unknown as Record<string, unknown>;
  const payload = {
    estimation_request_id: estimationRequestId,
    market_base_price: output.marketBasePrice,
    adjusted_price: output.adjustedPrice,
    low_range_price: output.lowRangePrice,
    high_range_price: output.highRangePrice,
    recommended_listing_price: output.recommendedListingPrice,
    quick_sale_price: output.quickSalePrice,
    confidence_score: output.confidenceScore,
    confidence_label: output.confidenceLabel,
    positive_factors: output.positiveFactors,
    negative_factors: output.negativeFactors,
    comparables_used_count: output.comparables.length,
    calculation_payload: calculationPayload,
  };

  const { data, error } = await supabase
    .from("vehicle_estimation_results")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return String((data as { id: string }).id);
}

export async function insertEstimationEvent(
  estimationRequestId: string,
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
  const { error } = await supabase.from("vehicle_estimation_events").insert(
    {
      estimation_request_id: estimationRequestId,
      event_type: eventType,
      metadata: metadata ?? {},
    },
  );
  if (error) throw new Error(error.message);
}
