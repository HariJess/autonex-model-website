/**
 * Format an amount in Malagasy Ariary (MGA). Output uses the "Ar" suffix to
 * stay consistent with the existing formatAriary helper used across the app.
 *
 *   formatMga(25000)   -> "25 000 Ar"
 *   formatMga(1234567) -> "1 234 567 Ar"
 *   formatMga(null)    -> "0 Ar"
 */
export function formatMga(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "0 Ar";
  return `${Math.round(amount).toLocaleString("fr-MG")} Ar`;
}

/**
 * Format a number with thousand separators (no currency).
 *   formatNumber(1234567) -> "1 234 567"
 */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0";
  return Math.round(n).toLocaleString("fr-MG");
}

/**
 * Format a delta percentage with explicit sign.
 *   formatDeltaPct(12.5) -> "+12.5%"
 *   formatDeltaPct(-3.2) -> "-3.2%"
 *   formatDeltaPct(0)    -> "+0.0%"
 */
export function formatDeltaPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
