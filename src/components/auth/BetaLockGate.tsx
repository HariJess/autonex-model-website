import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBetaAccess } from "@/hooks/useBetaAccess";

interface BetaLockGateProps {
  children: ReactNode;
}

/**
 * Wraps the app routes. Redirects to /beta-login when the lock is
 * enabled and the user has not entered the beta access code yet.
 *
 * - Disabled (env flag false) → pass-through.
 * - On /beta-login itself → pass-through (avoids redirect loop).
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

  // /yas-app est exposée à un partenaire externe (YAS & Moi) via WebView.
  // Le beta lock ne doit jamais bloquer cette route, sinon le partenaire est
  // redirigé vers /beta-login dont il ne possède pas le code.
  const shouldRedirect =
    isLockEnabled &&
    !isUnlocked &&
    location.pathname !== "/beta-login" &&
    location.pathname !== "/yas-app";

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
  // /yas-app est exposée à un partenaire externe (YAS & Moi) via WebView :
  // le rendu ne doit JAMAIS être bloqué par le beta lock, sinon le partenaire
  // voit une page blanche (le redirect vers /beta-login est déjà bypassé en
  // amont, mais le rendu était quand même null sans cookie d'unlock).
  if (location.pathname === "/yas-app") return <>{children}</>;
  if (!isUnlocked) return null;
  return <>{children}</>;
}

export default BetaLockGate;
