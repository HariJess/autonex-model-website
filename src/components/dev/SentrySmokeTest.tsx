/**
 * Dev-only smoke test: throws a synthetic error when visited with `?boom=1`
 * in development mode. Used to verify that the ErrorBoundary + Sentry pipeline
 * actually captures and reports exceptions end-to-end.
 *
 * Double guard: URL param AND import.meta.env.MODE === "development".
 * In any other mode (production, test, preview), this component is a no-op
 * and renders null — safe to leave mounted in the tree.
 */
const SentrySmokeTest = () => {
  if (import.meta.env.MODE !== "development") return null;
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  if (params.get("boom") === "1") {
    throw new Error("sentry-smoke-test");
  }

  return null;
};

export default SentrySmokeTest;
