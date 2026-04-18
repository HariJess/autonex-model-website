import * as Sentry from "@sentry/react";

let isInitialized = false;

export function initMonitoring(): void {
  if (isInitialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: 0,
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
