export const EXCHANGE_RATE = 5050; // 1 EUR = 5050 MGA

export function mgaToEur(mga: number): number {
  return Math.round((mga / EXCHANGE_RATE) * 100) / 100;
}

export function eurToMga(eur: number): number {
  return Math.round(eur * EXCHANGE_RATE);
}

export function formatMGA(amount: number): string {
  return new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

/**
 * Formatage compact des prix pour les cards de feed — la place y est limitée
 * et 9-10 chiffres en MGA sont illisibles. Préserve `formatMGA`/`formatEUR`
 * pour la page détail et les modals (où on garde le format complet engageant).
 *
 * Règles MGA :
 *   ≥ 1 milliard : "1,2 Md Ar"   (rare, véhicules pro)
 *   ≥ 1 million  : "237,5 M Ar"  (cas dominant)
 *   ≥ 1 mille    : "850 K Ar"    (rare, occasions très anciennes)
 *   sinon        : "950 Ar"
 *
 * Règles EUR (uniquement quand currency === 'EUR' côté UI) :
 *   ≥ 1 million : "1,5 M €"
 *   sinon       : format Intl.NumberFormat normal sans décimales
 *
 * Cas spéciaux :
 *   amount null/0/<0 → "—" (tiret cadratin) pour signaler l'absence de prix.
 *
 * 1 décimale uniquement quand la précision est commerciale (`237,5 M` vs
 * `237 M`). Quand la valeur est entière (250 M pile), pas de `,0` superflu.
 */
export function formatPriceCompact(
  amount: number | null | undefined,
  currency: 'MGA' | 'EUR',
): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return '—';

  if (currency === 'MGA') {
    if (amount >= 1_000_000_000) {
      const value = amount / 1_000_000_000;
      const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1).replace('.', ',');
      return `${formatted} Md Ar`;
    }
    if (amount >= 1_000_000) {
      const value = amount / 1_000_000;
      const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1).replace('.', ',');
      return `${formatted} M Ar`;
    }
    if (amount >= 1_000) {
      const value = Math.round(amount / 1_000);
      return `${value} K Ar`;
    }
    return `${Math.round(amount)} Ar`;
  }

  // EUR
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000;
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1).replace('.', ',');
    return `${formatted} M €`;
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formate les kilomètres en compact pour l'overlay year+km des cards filtrées.
 *   45_000 → "45k km"
 *    5_500 → "5,5k km"
 *      850 → "850 km"
 * Retourne "" pour les valeurs invalides ou nulles.
 */
export function formatMileageCompact(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km) || km < 0) return '';
  if (km >= 1000) {
    const value = km / 1000;
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1).replace('.', ',');
    return `${formatted}k km`;
  }
  return `${Math.round(km)} km`;
}
