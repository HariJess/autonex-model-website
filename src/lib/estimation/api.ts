import { computeVehicleEstimationV2, toLegacyEstimationFromV2 } from "@/lib/estimation/engine";
import {
  insertEstimationEvent,
  insertEstimationRequest,
  insertEstimationResult,
} from "@/lib/estimation/repository";
import { buildEstimationAuditSnapshot, buildEstimationEventContext } from "@/lib/estimation/telemetry";
import type { EstimationInput, EstimationRunResult } from "@/types/estimation";

async function safeInsertEstimationEvent(
  requestId: string,
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
  try {
    await insertEstimationEvent(requestId, submissionSecret, eventType, metadata);
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
  const { id: requestId, submissionSecret } = await insertEstimationRequest(input, userId);
  await safeInsertEstimationEvent(requestId, submissionSecret, "estimation_started", {
    hasMake: Boolean(input.makeName.trim()),
    hasModel: Boolean(input.modelName.trim()),
    hasCity: Boolean(input.city.trim()),
    hasYear: Number.isFinite(input.year),
    hasMileage: Number.isFinite(input.mileage),
  });
  const outputV2 = await computeVehicleEstimationV2(input);
  const output = toLegacyEstimationFromV2(outputV2);
  const audit = buildEstimationAuditSnapshot(outputV2);
  const resultId = await insertEstimationResult(requestId, submissionSecret, output, audit);
  await safeInsertEstimationEvent(
    requestId,
    submissionSecret,
    "estimation_completed",
    buildEstimationEventContext(outputV2, {
      resultId,
      comparablesDisplayed: output.comparables.length,
    }),
  );
  return { requestId, submissionSecret, resultId, output, outputV2 };
}
