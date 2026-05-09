import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBetaAccess } from "@/hooks/useBetaAccess";
import { readYasContextFromStorage } from "@/features/yas-app/hooks/useYasContext";

interface BetaLockGateProps {
  children: ReactNode;
}

/**
 * Wraps the app routes. Redirects to /beta-login when the lock is
 * enabled and the user has not entered the beta access code yet.
 *
 * - Disabled (env flag false) → pass-through.
 * - On /beta-login itself → pass-through (avoids redirect loop).
 * - On a YAS flow (see `isYasFlow` below) → pass-through. Covers the
 *   /yas-app home AND every sub-page reached from it (e.g. /recherche,
 *   /estimation) carrying `?source=yas` / `?embedded=true` URL params, or
 *   any sub-page where the YAS sessionStorage context is present (handles
 *   the case where in-app `<Link>` chains drop the params). Prevents the
 *   white-page issue documented in `e2e/yas-app-visual-audit.spec.ts`
 *   (BUG #2 in AUDIT_YAS_WEBVIEW_FINAL).
 * - Unlocked (cookie set) → pass-through.
 * - Otherwise → redirect to /beta-login via useEffect + ref guard.
 *
 * The redirect is implemented via `useEffect + navigate` (ref-guarded)
 * rather than the declarative `<Navigate>` component because the
 * react-router v6 `<Navigate>` runs its navigate() inside a useEffect
 * with NO deps array — it re-fires on every re-render of its parent.
 * On iOS Safari, replaceState is rate-limited to 100/10s; any re-render
 * storm while the redirect condition still holds can hit that limit
 * and throw SecurityError. The ref guard ensures navigate fires at
 * most once per redirect episode.
 */
export function BetaLockGate({ children }: BetaLockGateProps) {
  const { isUnlocked, isLockEnabled } = useBetaAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // YAS flow detection — three sources, any one is enough:
  //   1. The /yas-app pathname itself (entry point of the WebView).
  //   2. URL params `source=yas` or `embedded=true` (sub-pages reached via
  //      <Link> from /yas-app — they carry the params forward).
  //   3. SessionStorage YAS context (fallback when a particular <Link>
  //      forgot to propagate the params).
  // Any of these mark the request as part of the YAS partnership flow and
  // exempt it from the beta lock.
  const isYasFlow = useMemo(() => {
    if (location.pathname === "/yas-app") return true;

    const params = new URLSearchParams(location.search);
    if (params.get("source") === "yas" || params.get("embedded") === "true") return true;

    const ctx = readYasContextFromStorage();
    return ctx.isEmbedded;
  }, [location.pathname, location.search]);

  const shouldRedirect =
    isLockEnabled &&
    !isUnlocked &&
    location.pathname !== "/beta-login" &&
    !isYasFlow;

  useEffect(() => {
    if (!shouldRedirect) {
      // Reset so a later lock/logout can trigger redirect again.
      hasRedirected.current = false;
      return;
    }
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    navigate("/beta-login", { replace: true });
  }, [shouldRedirect, navigate]);

  if (!isLockEnabled) return <>{children}</>;
  if (location.pathname === "/beta-login") return <>{children}</>;
  // YAS flow (home + sub-pages) must never be blocked by the beta lock,
  // otherwise the partner WebView shows a white page.
  if (isYasFlow) return <>{children}</>;
  if (!isUnlocked) return null;
  return <>{children}</>;
}

export default BetaLockGate;
