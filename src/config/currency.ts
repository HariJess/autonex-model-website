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
