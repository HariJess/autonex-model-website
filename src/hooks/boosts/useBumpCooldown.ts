import { useEffect, useState, useMemo } from "react";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

export type BumpCooldownState = {
  isOnCooldown: boolean;
  nextAvailableAt: Date | null;
  remainingMs: number;
  /** Pre-formatted "{H}h {M}min" / "{M}min" / "—" — i18n-agnostic format. */
  formatted: string;
};

/**
 * Format minimaliste indépendant de la locale (pas d'Intl, pas d'i18n appel).
 * Le composant consommateur peut surcharger via une string i18n
 * `boost.modal.cooldown.format` avec interp `{{hours}} {{minutes}}`.
 */
function formatRemaining(ms: number): string {
  if (ms <= 0) return "—";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}min`;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

/**
 * Computes the bump cooldown state for a listing.
 *
 * Re-evaluates every 30s while on cooldown. Stops the interval as soon as
 * the cooldown ends to avoid useless re-renders. The 30s tick granularity
 * is sufficient for a "X heures Y minutes" display — sub-minute precision
 * would only matter for a countdown_xx animation we don't need V1.
 */
export function useBumpCooldown(lastBumpedAtIso: string | null | undefined): BumpCooldownState {
  const lastBumpedAtMs = useMemo(() => {
    if (!lastBumpedAtIso) return null;
    const t = new Date(lastBumpedAtIso).getTime();
    return Number.isFinite(t) ? t : null;
  }, [lastBumpedAtIso]);

  const computeRemaining = (): number => {
    if (lastBumpedAtMs == null) return 0;
    const elapsed = Date.now() - lastBumpedAtMs;
    return Math.max(0, COOLDOWN_MS - elapsed);
  };

  const [remainingMs, setRemainingMs] = useState<number>(computeRemaining);

  useEffect(() => {
    setRemainingMs(computeRemaining());
    if (lastBumpedAtMs == null) return;
    if (computeRemaining() <= 0) return;

    const id = window.setInterval(() => {
      const next = computeRemaining();
      setRemainingMs(next);
      if (next <= 0) {
        window.clearInterval(id);
      }
    }, 30_000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBumpedAtMs]);

  const isOnCooldown = remainingMs > 0;
  const nextAvailableAt =
    lastBumpedAtMs != null && isOnCooldown ? new Date(lastBumpedAtMs + COOLDOWN_MS) : null;

  return {
    isOnCooldown,
    nextAvailableAt,
    remainingMs,
    formatted: formatRemaining(remainingMs),
  };
}
