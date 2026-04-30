import { computeVehicleEstimationV2, toLegacyEstimationFromV2 } from "@/lib/estimation/engine";
import { EstimationAppError, type EstimationFlowPhase } from "@/lib/estimation/errors";
import {
  createVehicleEstimationRequest,
  recordVehicleEstimationEvent,
  recordVehicleEstimationResult,
} from "@/lib/estimation/repository";
import {
  buildEstimationAuditSnapshot,
  buildEstimationEventContext,
  type EstimationEngineTelemetry,
} from "@/lib/estimation/telemetry";
import { supabase } from "@/integrations/supabase/client";
import { captureHandledError } from "@/lib/monitoring";
import type {
  EstimationInput,
  EstimationOutputV2,
  EstimationRunResult,
} from "@/types/estimation";

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
 * v2 path : invoque l'Edge Function `compute-estimation` qui exécute le moteur
 * porté côté Deno avec une connexion service-role. Retourne le même triplet
 * `outputV2 / output / audit` que la voie legacy pour rester swap-in.
 *
 * En cas d'échec (timeout, 5xx, erreur de validation côté Edge Function),
 * cette fonction lance — c'est le caller (`runVehicleEstimation`) qui décide
 * de fallback vers legacy.
 */
export async function runVehicleEstimationV2(
  input: EstimationInput,
  signal?: AbortSignal,
): Promise<{
  outputV2: EstimationOutputV2;
  output: EstimationRunResult["output"];
  audit: ReturnType<typeof buildEstimationAuditSnapshot>;
}> {
  signal?.throwIfAborted();
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    data?: EstimationOutputV2;
    error?: string;
  }>("compute-estimation", { body: input });
  signal?.throwIfAborted();
  if (error) {
    throw new Error(`compute-estimation_invoke_failed: ${error.message ?? "unknown"}`);
  }
  if (!data || data.ok !== true || !data.data) {
    throw new Error(`compute-estimation_bad_response: ${data?.error ?? "no_data"}`);
  }
  const outputV2 = data.data;
  const output = toLegacyEstimationFromV2(outputV2);
  const audit = buildEstimationAuditSnapshot(outputV2);
  return { outputV2, output, audit };
}

/**
 * Lit la feature flag `estimation_engine_version` depuis `app_config`.
 * Best-effort : sur erreur, on renvoie `legacy` (le défaut sécurisé).
 *
 * Volontairement isolé du hook React Query pour pouvoir l'appeler depuis
 * un orchestrateur non-React (api.ts), sans dépendance au QueryClient global.
 */
type AppConfigEngineFlag = {
  mode: "legacy" | "v2" | "rollout";
  rollout_pct: number;
  v2_enabled_for_users: string[];
};

async function fetchEngineConfig(): Promise<AppConfigEngineFlag> {
  const fallback: AppConfigEngineFlag = { mode: "legacy", rollout_pct: 0, v2_enabled_for_users: [] };
  try {
    const { data, error } = await (
      supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: { value: Partial<AppConfigEngineFlag> } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      }
    )
      .from("app_config")
      .select("value")
      .eq("key", "estimation_engine_version")
      .maybeSingle();
    if (error || !data) return fallback;
    return { ...fallback, ...(data.value ?? {}) };
  } catch (_err) {
    return fallback;
  }
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function decideEngine(
  config: AppConfigEngineFlag,
  userId: string | null,
  requestId: string,
): "legacy" | "v2" {
  if (config.mode === "legacy") return "legacy";
  if (config.mode === "v2") return "v2";
  if (userId && config.v2_enabled_for_users.includes(userId)) return "v2";
  if (config.rollout_pct <= 0) return "legacy";
  if (config.rollout_pct >= 100) return "v2";
  return simpleHash(requestId) % 100 < config.rollout_pct ? "v2" : "legacy";
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
 * Single orchestrated estimation run: persist request → telemetry (best-effort) → compute → persist result → telemetry (best-effort).
 *
 * Routing legacy vs v2 :
 *   1. Lit `app_config.estimation_engine_version` (fail-soft → legacy).
 *   2. Si v2 sélectionné, tente l'Edge Function `compute-estimation`.
 *   3. Si v2 échoue (timeout / 5xx / mauvais JSON), fallback automatique vers
 *      le moteur legacy + log Sentry "estimation_v2_fallback".
 *   4. Telemetry `engine_version` + `v2_fallback_to_legacy` enregistrés sur
 *      l'événement `estimation_completed`.
 *
 * Cette fonction NE LÈVE JAMAIS de v2-related error vers l'UI : la promesse
 * de fallback transparent est essentielle au sprint de portage (zéro impact
 * user-facing si v2 a un souci).
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

  const config = await fetchEngineConfig();
  const decided = decideEngine(config, userId, requestId);
  
  
  let engineUsed: "legacy" | "v2" = "legacy";
  let v2FallbackToLegacy = false;
  let computeResult: {
    outputV2: EstimationOutputV2;
    output: EstimationRunResult["output"];
    audit: ReturnType<typeof buildEstimationAuditSnapshot>;
  };

  if (decided === "v2") {
    try {
      computeResult = await runVehicleEstimationV2(input, signal);
      engineUsed = "v2";
    } catch (v2Err) {
      // Fallback transparent : on ne casse jamais l'UX à cause de v2.
      v2FallbackToLegacy = true;
      engineUsed = "legacy";
      captureHandledError(v2Err, {
        feature: "estimation",
        action: "estimation_v2_fallback",
        requestId,
        configMode: config.mode,
      });
      computeResult = await computeVehicleEstimationClient(input, signal);
    }
  } else {
    computeResult = await computeVehicleEstimationClient(input, signal);
  }

  const { outputV2, output, audit } = computeResult;

  assertNotAborted(signal);

  const resultId = await recordVehicleEstimationResult(requestId, submissionSecret, output, audit);

  assertNotAborted(signal);

  const engineTelemetry: EstimationEngineTelemetry = {
    engineVersion: engineUsed,
    v2FallbackToLegacy,
  };

  await recordTelemetryNonBlocking(
    requestId,
    submissionSecret,
    "estimation_completed",
    buildEstimationEventContext(outputV2, {
      resultId,
      comparablesDisplayed: output.comparables.length,
      engine_version: engineTelemetry.engineVersion,
      v2_fallback_to_legacy: engineTelemetry.v2FallbackToLegacy,
      engine_config_mode: config.mode,
    }),
    "telemetry_completed",
  );

  return { requestId, submissionSecret, resultId, output, outputV2 };
}
