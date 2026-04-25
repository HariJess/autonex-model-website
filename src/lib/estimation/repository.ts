import { supabase } from "@/integrations/supabase/client";
import { EstimationAppError, type EstimationFlowPhase } from "@/lib/estimation/errors";
import type { EstimationInput, EstimationOutput } from "@/types/estimation";
import type { VehicleEstimationRequestCreated, VehicleEstimationTelemetryEventType } from "@/types/estimation";
import type { EstimationAuditSnapshot } from "@/lib/estimation/telemetry";
import { toSupabaseJson } from "@/lib/supabase/json";

/** Re-export for callers that only need RPC code mapping without pulling `errors.ts`. */
export { mapEstimationRpcError, type EstimationRpcErrorCode } from "@/lib/estimation/errors";

export async function createVehicleEstimationRequest(
  input: EstimationInput,
  // NOTE: userId parameter kept for backward compatibility with callers, but
  // now ignored: the RPC reads auth.uid() server-side to prevent spoofing.
  // Anon users get user_id=NULL, authenticated users get user_id=auth.uid().
  _userId: string | null,
): Promise<VehicleEstimationRequestCreated> {
  const { data, error } = await supabase
    .rpc("create_vehicle_estimation_request", {
      p_make_name_snapshot: input.makeName,
      p_model_name_snapshot: input.modelName,
      p_year: input.year,
      p_city: input.city,
      p_mileage: input.mileage,
      p_fuel_type: input.fuelType,
      p_transmission_type: input.transmissionType,
      p_body_type: input.bodyType,
      p_condition_label: input.conditionLabel,
      p_accident_declared: input.accidentDeclared,
      p_maintenance_level: input.maintenanceLevel,
      p_owner_count_label: input.ownerCountLabel,
      p_usage_type: input.usageType,
      p_raw_payload: toSupabaseJson(input) as never,
      p_make_id: input.makeId ?? undefined,
      p_model_id: input.modelId ?? undefined,
    })
    .single();

  if (error) {
    throw EstimationAppError.fromSupabaseLike(error, "create_request");
  }
  const row = data as { request_id: string; submission_secret: string } | null;
  if (!row) {
    throw new EstimationAppError(
      "Réponse vide du serveur lors de la création de l'estimation.",
      "create_request",
      "unexpected_response",
    );
  }
  return {
    requestId: String(row.request_id),
    submissionSecret: String(row.submission_secret),
  };
}

export async function recordVehicleEstimationResult(
  estimationRequestId: string,
  submissionSecret: string,
  output: EstimationOutput,
  audit?: EstimationAuditSnapshot,
): Promise<string> {
  const calculationPayload = toSupabaseJson({
    legacy: output,
    audit: audit ?? null,
  });

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

  if (error) {
    throw EstimationAppError.fromSupabaseLike(error, "record_result");
  }
  if (data === null || data === undefined) {
    throw new EstimationAppError(
      "Réponse vide du serveur lors de l'enregistrement du résultat.",
      "record_result",
      "unexpected_response",
    );
  }
  return String(data as string);
}

export async function recordVehicleEstimationEvent(
  estimationRequestId: string,
  submissionSecret: string,
  eventType: VehicleEstimationTelemetryEventType,
  metadata?: Record<string, unknown>,
  flowPhase: EstimationFlowPhase = "record_event",
): Promise<void> {
  const { error } = await supabase.rpc("record_vehicle_estimation_event", {
    p_estimation_request_id: estimationRequestId,
    p_submission_secret: submissionSecret,
    p_event_type: eventType,
    p_metadata: metadata ? toSupabaseJson(metadata) : {},
  });
  if (error) {
    throw EstimationAppError.fromSupabaseLike(error, flowPhase);
  }
}
