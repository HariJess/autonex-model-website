import { supabase } from "@/integrations/supabase/client";
import type { EstimationInput, EstimationOutput } from "@/types/estimation";

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
    .from("vehicle_estimation_requests" as never)
    .insert(payload as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return String((data as { id: string }).id);
}

export async function insertEstimationResult(
  estimationRequestId: string,
  output: EstimationOutput,
): Promise<string> {
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
    calculation_payload: output as unknown as Record<string, unknown>,
  };

  const { data, error } = await supabase
    .from("vehicle_estimation_results" as never)
    .insert(payload as never)
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
    | "clicked_publish_after_estimation"
    | "clicked_refine_estimation"
    | "viewed_similar_listings",
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("vehicle_estimation_events" as never).insert(
    {
      estimation_request_id: estimationRequestId,
      event_type: eventType,
      metadata: metadata ?? {},
    } as never,
  );
  if (error) throw new Error(error.message);
}
