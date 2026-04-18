import { computeVehicleEstimationV2, toLegacyEstimationFromV2 } from "@/lib/estimation/engine";
import { EstimationAppError, type EstimationFlowPhase } from "@/lib/estimation/errors";
import {
  createVehicleEstimationRequest,
  recordVehicleEstimationEvent,
  recordVehicleEstimationResult,
} from "@/lib/estimation/repository";
import { buildEstimationAuditSnapshot, buildEstimationEventContext } from "@/lib/estimation/telemetry";
import type { EstimationInput, EstimationRunResult } from "@/types/estimation";

export type RunVehicleEstimationOptions = {
  /** When provided, long steps check abort between stages (navigation away, rapid cancel). */
  signal?: AbortSignal;
};

function assertNotAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

/**
 * Client-side valuation only. Swap implementation later for a server RPC without changing UI call sites.
 */
export async function computeVehicleEstimationClient(
  input: EstimationInput,
  signal?: AbortSignal,
): Promise<{
  outputV2: EstimationRunResult["outputV2"];
  output: EstimationRunResult["output"];
  audit: ReturnType<typeof buildEstimationAuditSnapshot>;
}> {
  signal?.throwIfAborted();
  try {
    const outputV2 = await computeVehicleEstimationV2(input);
    signal?.throwIfAborted();
    const output = toLegacyEstimationFromV2(outputV2);
    const audit = buildEstimationAuditSnapshot(outputV2);
    return { outputV2, output, audit };
  } catch (err) {
    throw EstimationAppError.fromUnknown(err, "compute", "Le calcul de l'estimation a échoué.");
  }
}

/**
 * Telemetry must never fail the main estimation path.
 */
async function recordTelemetryNonBlocking(
  requestId: string,
  submissionSecret: string,
  eventType: Parameters<typeof recordVehicleEstimationEvent>[2],
  metadata: Record<string, unknown> | undefined,
  flowPhase: EstimationFlowPhase,
): Promise<void> {
  try {
    await recordVehicleEstimationEvent(requestId, submissionSecret, eventType, metadata, flowPhase);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[estimation-telemetry] non-blocking failure", { requestId, eventType, flowPhase, error });
    }
  }
}

/**
 * Single orchestrated estimation run: persist request → telemetry (best-effort) → client compute → persist result → telemetry (best-effort).
 * Ordering is intentional and ready for replacing `computeVehicleEstimationClient` with a server round-trip.
 */
export async function runVehicleEstimation(
  input: EstimationInput,
  userId: string | null,
  options?: RunVehicleEstimationOptions,
): Promise<EstimationRunResult> {
  const signal = options?.signal;

  assertNotAborted(signal);

  const { requestId, submissionSecret } = await createVehicleEstimationRequest(input, userId);

  assertNotAborted(signal);

  await recordTelemetryNonBlocking(
    requestId,
    submissionSecret,
    "estimation_started",
    {
      hasMake: Boolean(input.makeName.trim()),
      hasModel: Boolean(input.modelName.trim()),
      hasCity: Boolean(input.city.trim()),
      hasYear: Number.isFinite(input.year),
      hasMileage: Number.isFinite(input.mileage),
    },
    "telemetry_started",
  );

  assertNotAborted(signal);

  const { outputV2, output, audit } = await computeVehicleEstimationClient(input, signal);

  assertNotAborted(signal);

  const resultId = await recordVehicleEstimationResult(requestId, submissionSecret, output, audit);

  assertNotAborted(signal);

  await recordTelemetryNonBlocking(
    requestId,
    submissionSecret,
    "estimation_completed",
    buildEstimationEventContext(outputV2, {
      resultId,
      comparablesDisplayed: output.comparables.length,
    }),
    "telemetry_completed",
  );

  return { requestId, submissionSecret, resultId, output, outputV2 };
}
