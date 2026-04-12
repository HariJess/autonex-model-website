/**
 * Deterministic offset so public maps show approximate area, not exact pin.
 * Same listing id → same offset (stable marker position between loads).
 */
export function toApproximatePublicCoordinates(
  lat: number,
  lng: number,
  listingId: string
): { lat: number; lng: number } {
  let h = 2166136261;
  for (let i = 0; i < listingId.length; i++) {
    h = Math.imul(h ^ listingId.charCodeAt(i), 16777619);
  }
  const h2 = h >>> 0;
  const angle = (h2 % 628) / 100; // 0–6.28 rad
  const dist = 0.002 + (h2 % 800) / 400000; // ~0.002–0.004° ≈ 200–450 m
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + Math.cos(angle) * dist,
    lng: lng + (Math.sin(angle) * dist) / cosLat,
  };
}
