import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
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
 * - Otherwise → <Navigate to="/beta-login" replace />.
 */
export function BetaLockGate({ children }: BetaLockGateProps) {
  const { isUnlocked, isLockEnabled } = useBetaAccess();
  const location = useLocation();

  if (!isLockEnabled) return <>{children}</>;
  if (location.pathname === "/beta-login") return <>{children}</>;
  if (!isUnlocked) return <Navigate to="/beta-login" replace />;
  return <>{children}</>;
}

export default BetaLockGate;
