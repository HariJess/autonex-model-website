import * as Sentry from "@sentry/react";

let isInitialized = false;

// 5% sample in prod, off in dev/test. 5% is the recommended starting point
// for a pre-launch app: enough signal on real-user latency without flooding
// the Sentry quota or making dev runs noisy. Revisit post-launch once we
// know the actual transaction volume.
export const SENTRY_TRACES_SAMPLE_RATE = import.meta.env.PROD ? 0.05 : 0;

export function initMonitoring(): void {
  if (isInitialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
  isInitialized = true;
}

export async function wrapRpc<TData, TError>(
  name: string,
  fn: () => PromiseLike<{ data: TData; error: TError }>,
): Promise<{ data: TData; error: TError }> {
  try {
    const result = await fn();
    if (isInitialized && result.error) {
      Sentry.captureException(result.error, { tags: { rpc: name } });
    }
    return result;
  } catch (err) {
    if (isInitialized) {
      Sentry.captureException(err, { tags: { rpc: name } });
    }
    throw err;
  }
}

export function captureHandledError(err: unknown, context?: Record<string, unknown>): void {
  if (!isInitialized) return;
  Sentry.captureException(err, { extra: context });
}

export function captureReactError(error: Error, componentStack: string): void {
  if (!isInitialized) return;
  Sentry.captureException(error, { contexts: { react: { componentStack } } });
}

/**
 * VPI-scoped exception capture. Auto-tags with `feature=vpi` + caller-provided
 * `action` so events can be filtered by the payment funnel step (initiate,
 * check_status_fetch, webhook, etc.). No-op when Sentry is not initialised.
 *
 * PII policy: never pass email, JWT, or user UUID in tags/extras. Internal
 * identifiers like transaction_id or credit_pack_id are fine.
 */
export function captureVpiError(
  err: unknown,
  action: string,
  tags: Record<string, string> = {},
  extra: Record<string, unknown> = {},
): void {
  if (!isInitialized) return;
  Sentry.captureException(err, {
    tags: { feature: "vpi", action, ...tags },
    extra,
  });
}

/**
 * VPI-scoped structured message capture (for non-exception events such as
 * polling timeouts or unusual entry paths). Same PII policy as captureVpiError.
 */
export function captureVpiMessage(
  message: string,
  level: "warning" | "info",
  action: string,
  extra: Record<string, unknown> = {},
): void {
  if (!isInitialized) return;
  Sentry.captureMessage(message, {
    level,
    tags: { feature: "vpi", action },
    extra,
  });
}
