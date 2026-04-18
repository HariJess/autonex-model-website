/**
 * Normalized estimation flow errors for UI + logging.
 * Keeps phases explicit so a future server-side engine can reuse the same surface.
 */

export type EstimationRpcErrorCode =
  | "ESTIMATION_REQUEST_NOT_FOUND"
  | "ESTIMATION_WRITE_FORBIDDEN"
  | "ESTIMATION_RESULT_ALREADY_EXISTS"
  | "ESTIMATION_EVENT_TYPE_INVALID"
  | "unknown";

export type EstimationFlowPhase =
  | "create_request"
  | "telemetry_started"
  | "compute"
  | "record_result"
  | "telemetry_completed"
  /** Product analytics events after the main run (same RPC, distinct phase for errors). */
  | "record_event";

/** High-level failure category for messaging and metrics. */
export type EstimationFailureKind =
  | "network"
  | "timeout"
  | "rpc_forbidden"
  | "rpc_not_found"
  | "rpc_conflict"
  | "rpc_invalid_event"
  | "compute"
  | "unexpected_response"
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

function classifyMessageKind(message: string, code?: string): EstimationFailureKind {
  const lower = message.toLowerCase();
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("etimedout") ||
    code === "57014"
  ) {
    return "timeout";
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("failed to fetch") ||
    lower.includes("load failed") ||
    lower.includes("networkerror") ||
    lower.includes("connection") ||
    code === "503"
  ) {
    return "network";
  }
  const rpc = mapEstimationRpcError(message);
  if (rpc === "ESTIMATION_WRITE_FORBIDDEN") return "rpc_forbidden";
  if (rpc === "ESTIMATION_REQUEST_NOT_FOUND") return "rpc_not_found";
  if (rpc === "ESTIMATION_RESULT_ALREADY_EXISTS") return "rpc_conflict";
  if (rpc === "ESTIMATION_EVENT_TYPE_INVALID") return "rpc_invalid_event";
  if (lower.includes("invalid") && lower.includes("response")) return "unexpected_response";
  return "unknown";
}

export class EstimationAppError extends Error {
  readonly name = "EstimationAppError";

  constructor(
    message: string,
    readonly phase: EstimationFlowPhase,
    readonly kind: EstimationFailureKind,
    readonly cause?: unknown,
    readonly rpcCode: EstimationRpcErrorCode = "unknown",
  ) {
    super(message);
    if (cause instanceof Error && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }

  static fromUnknown(
    err: unknown,
    phase: EstimationFlowPhase,
    fallbackMessage = "Une erreur inattendue s'est produite.",
  ): EstimationAppError {
    if (err instanceof EstimationAppError) return err;
    const message = err instanceof Error ? err.message : String(err);
    const rpcCode = mapEstimationRpcError(message);
    let kind = classifyMessageKind(message);
    if (message.toLowerCase().includes("abort")) {
      kind = "unknown";
    } else if (phase === "compute") {
      kind = "compute";
    }
    if (rpcCode !== "unknown") {
      if (rpcCode === "ESTIMATION_WRITE_FORBIDDEN") kind = "rpc_forbidden";
      else if (rpcCode === "ESTIMATION_REQUEST_NOT_FOUND") kind = "rpc_not_found";
      else if (rpcCode === "ESTIMATION_RESULT_ALREADY_EXISTS") kind = "rpc_conflict";
      else if (rpcCode === "ESTIMATION_EVENT_TYPE_INVALID") kind = "rpc_invalid_event";
    }
    return new EstimationAppError(message || fallbackMessage, phase, kind, err, rpcCode);
  }

  static fromSupabaseLike(
    err: { message: string; code?: string },
    phase: EstimationFlowPhase,
  ): EstimationAppError {
    const msg = err.message ?? "";
    const rpcCode = mapEstimationRpcError(msg);
    let kind = classifyMessageKind(msg, err.code);
    if (rpcCode !== "unknown") {
      if (rpcCode === "ESTIMATION_WRITE_FORBIDDEN") kind = "rpc_forbidden";
      else if (rpcCode === "ESTIMATION_REQUEST_NOT_FOUND") kind = "rpc_not_found";
      else if (rpcCode === "ESTIMATION_RESULT_ALREADY_EXISTS") kind = "rpc_conflict";
      else if (rpcCode === "ESTIMATION_EVENT_TYPE_INVALID") kind = "rpc_invalid_event";
    }
    return new EstimationAppError(msg, phase, kind, err, rpcCode);
  }
}

/** Narrow callback so pages can bridge `react-i18next` `t` without overload friction. */
export type EstimationTranslator = (key: string, defaultValue?: string) => string;

/** User-visible description for toasts / inline alerts (French defaults via second arg pattern). */
export function describeEstimationErrorForUi(error: unknown, t?: EstimationTranslator): string {
  const retry =
    t?.("estimation.retryHintShort", "Réessayez dans quelques instants.") ?? "Réessayez dans quelques instants.";
  if (error instanceof EstimationAppError) {
    switch (error.kind) {
      case "network":
        return (
          t?.("estimation.errorNetwork", "Problème de connexion. Vérifiez le réseau puis réessayez.") ??
          "Problème de connexion. Vérifiez le réseau puis réessayez."
        );
      case "timeout":
        return (
          t?.("estimation.errorTimeout", "La requête a expiré. Réessayez dans quelques instants.") ??
          "La requête a expiré. Réessayez dans quelques instants."
        );
      case "rpc_forbidden":
        return (
          t?.("estimation.errorForbidden", "Impossible d'enregistrer cette estimation (accès refusé).") ??
          "Impossible d'enregistrer cette estimation (accès refusé)."
        );
      case "rpc_not_found":
        return (
          t?.("estimation.errorRequestMissing", "La demande d'estimation est introuvable ou a expiré.") ??
          "La demande d'estimation est introuvable ou a expiré."
        );
      case "rpc_conflict":
        return (
          t?.("estimation.errorDuplicateResult", "Un résultat existe déjà pour cette estimation.") ??
          "Un résultat existe déjà pour cette estimation."
        );
      case "rpc_invalid_event":
        return (
          t?.("estimation.errorInvalidEvent", "Événement d'analyse refusé par le serveur.") ??
          "Événement d'analyse refusé par le serveur."
        );
      case "compute":
        return `${error.message} ${retry}`;
      case "unexpected_response":
        return (
          t?.("estimation.errorUnexpectedResponse", "Réponse serveur inattendue.") ??
          "Réponse serveur inattendue."
        );
      default:
        break;
    }
    return `${error.message} ${retry}`;
  }
  if (error instanceof Error) {
    return `${error.message} ${retry}`;
  }
  return t?.("states.genericErrorRetry", "Une erreur est survenue. Réessayez dans quelques instants.") ??
    "Une erreur est survenue. Réessayez dans quelques instants.";
}
