import { computeVehicleEstimationV2, toLegacyEstimationFromV2 } from "@/lib/estimation/engine";
import {
  insertEstimationEvent,
  insertEstimationRequest,
  insertEstimationResult,
} from "@/lib/estimation/repository";
import type { EstimationInput, EstimationRunResult } from "@/types/estimation";

async function safeInsertEstimationEvent(
  requestId: string,
  eventType:
    | "estimation_started"
    | "estimation_completed"
    | "clicked_publish_after_estimation"
    | "clicked_refine_estimation"
    | "viewed_similar_listings",
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await insertEstimationEvent(requestId, eventType, metadata);
  } catch (error) {
    // Event logging must never block estimation completion.
    if (import.meta.env.DEV) {
      console.warn("[estimation-events] non-blocking insert failure", { requestId, eventType, error });
    }
  }
}

export async function runVehicleEstimation(
  input: EstimationInput,
  userId: string | null,
): Promise<EstimationRunResult> {
  const requestId = await insertEstimationRequest(input, userId);
  await safeInsertEstimationEvent(requestId, "estimation_started");
  const outputV2 = await computeVehicleEstimationV2(input);
  const output = toLegacyEstimationFromV2(outputV2);
  const resultId = await insertEstimationResult(requestId, output);
  await safeInsertEstimationEvent(requestId, "estimation_completed", {
    confidenceLabel: output.confidenceLabel,
    confidenceScore: output.confidenceScore,
    comparables: output.comparables.length,
    evidenceTier: outputV2.tierDecision.tier,
    pricingMode: outputV2.modeGovernance.pricingMode,
  });
  return { requestId, resultId, output, outputV2 };
}
