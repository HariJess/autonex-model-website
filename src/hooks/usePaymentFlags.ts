/**
 * Payment feature flags consumed from Vite public env vars.
 *
 * Opt-in pattern: default false, only the exact string "true" enables the flag.
 * Env vars are frozen at Vite build time — no runtime state, safe to call on every render.
 */
export function usePaymentFlags() {
  const isManualPaymentEnabled =
    (import.meta.env.VITE_ENABLE_MANUAL_PAYMENT ?? "false").toString().toLowerCase() === "true";

  return {
    isManualPaymentEnabled,
  };
}
