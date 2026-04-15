import { computeVehicleEstimation } from "@/lib/estimation/engine";
import {
  insertEstimationEvent,
  insertEstimationRequest,
  insertEstimationResult,
} from "@/lib/estimation/repository";
import type { EstimationInput, EstimationRunResult } from "@/types/estimation";

export async function runVehicleEstimation(
  input: EstimationInput,
  userId: string | null,
): Promise<EstimationRunResult> {
  const requestId = await insertEstimationRequest(input, userId);
  await insertEstimationEvent(requestId, "estimation_started");
  const output = await computeVehicleEstimation(input);
  const resultId = await insertEstimationResult(requestId, output);
  await insertEstimationEvent(requestId, "estimation_completed", {
    confidenceLabel: output.confidenceLabel,
    confidenceScore: output.confidenceScore,
    comparables: output.comparables.length,
  });
  return { requestId, resultId, output };
}
