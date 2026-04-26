// Supabase Edge Function helper — HMAC-SHA256 compute + verify for VPI webhook
// -----------------------------------------------------------------------------
// Mission P.2 — shared by vpi-webhook (verification) and vpi-dry-run-checkout
// (compute, for simulating a real VPI callback in dev).
//
// VPI signe chaque callback webhook avec HMAC-SHA256 du raw body, clé
// partagée = VPI_KEY_SECRET, résultat encodé en HEX UPPERCASE, transmis dans
// le header `VPI-Signature` (doc VPI §7). On recalcule côté serveur avec la
// même clé et on compare. Zéro secret traverse le réseau — le header ne
// contient que le digest, pas la clé.
//
// Choix techniques :
// - Web Crypto API (`crypto.subtle`) : disponible nativement dans Deno et
//   dans Supabase Edge Runtime. Pas de dépendance externe (node-forge, etc.)
//   → surface d'attaque minimale, alignement avec les 2 edge functions
//   existantes qui ne tirent aucun hasher custom.
// - Encodage UTF-8 via TextEncoder : VPI hache la string telle-quelle, pas
//   les bytes d'une autre représentation. Le raw body réseau est déjà UTF-8.
// - Sortie HEX UPPERCASE : conforme à l'exemple doc VPI §7
//   (`.toUpperCase()` cité). On normalise aussi le header entrant en
//   upper-case avant comparaison, au cas où VPI varierait le casing d'une
//   release à l'autre.
// - Comparaison directe des chaînes HEX : les deux sont de taille fixe
//   (64 chars pour SHA-256) et déterministes. Le risque timing-attack sur
//   une comparaison de hex fixe est négligeable dans ce contexte
//   (attaquant devrait deviner la signature au byte près = 256-bit brute-
//   force avant d'exploiter un side-channel timing). Pas de `crypto.subtle.
//   timingSafeEqual` — API non dispo en Deno standard de toute façon.
//
// Required env :
//   VPI_KEY_SECRET  clé symétrique partagée avec VPI — NE JAMAIS LOGGER
//
// API :
//   computeVpiSignature(payload, secret) → "AB12EF..." (HEX UPPERCASE)
//   verifyVpiSignature(payload, signatureHeader, secret) → true|false
//     (false aussi si signatureHeader est vide/null, sans throw)
//
// Erreurs :
//   throw new Error("vpi_hmac_empty_secret") si secret vide/null (compute OU
//   verify). Les autres erreurs (crypto.subtle échoue, TextEncoder échoue)
//   propagent telles quelles — extrêmement improbables, signalent un env
//   runtime cassé.
// -----------------------------------------------------------------------------

/**
 * Comparaison à temps constant de deux chaînes de même longueur.
 *
 * Audit fix M2 (2026-04-26) — la comparaison `===` JavaScript court-circuit
 * au premier mismatch ; un attaquant peut donc dériver octet par octet la
 * signature attendue en mesurant le temps de réponse du webhook public.
 * Ici on parcourt TOUJOURS les deux chaînes en entier via XOR-OR, le temps
 * d'exécution ne dépend que de la longueur, pas du contenu.
 *
 * Si les longueurs diffèrent on retourne false immédiatement : ça leak
 * "longueur ≠" mais pas le contenu, et les digests SHA-256 hex font
 * toujours 64 chars donc la branche n'est jamais empruntée en pratique.
 *
 * Pure TypeScript (pas de dépendance Deno std) → testable côté Vitest.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Convertit un ArrayBuffer en chaîne HEX UPPERCASE (ex. "AB12EF...").
 * Implémentation locale pour éviter une dépendance à un lib tiers.
 * Résultat : 2 chars par byte → SHA-256 donne 32 bytes → 64 chars.
 */
function bufferToHexUpper(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // Chaque byte → 2 chars hex uppercase, zero-padding si < 0x10
    hex += (b < 0x10 ? "0" : "") + b.toString(16).toUpperCase();
  }
  return hex;
}

/**
 * Calcule HMAC-SHA256(payload, secret) et retourne le digest en HEX UPPERCASE.
 * Lève `vpi_hmac_empty_secret` si secret est vide/null.
 */
export async function computeVpiSignature(
  payload: string,
  secret: string,
): Promise<string> {
  if (!secret || secret.length === 0) {
    throw new Error("vpi_hmac_empty_secret");
  }

  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(secret);
  const payloadBytes = encoder.encode(payload ?? "");

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, payloadBytes);

  return bufferToHexUpper(signatureBuffer);
}

/**
 * Vérifie que `signatureHeader` correspond bien au HMAC-SHA256 calculé du
 * payload avec le secret. Normalise le header en UPPERCASE avant comparaison
 * (tolérance de casing côté émetteur VPI).
 *
 * Retourne `false` (sans throw) si `signatureHeader` est vide/null.
 * Lève `vpi_hmac_empty_secret` si `secret` est vide/null.
 */
export async function verifyVpiSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || signatureHeader.length === 0) {
    return false;
  }
  // computeVpiSignature throw si secret vide → laisser propager.
  const expected = await computeVpiSignature(payload, secret);

  // Normalisation casing. trim() au cas où VPI ajouterait un espace parasite.
  const received = signatureHeader.trim().toUpperCase();

  // Comparaison constant-time pour résister aux timing attacks sur le
  // webhook public (cf. constantTimeEqual ci-dessus).
  return constantTimeEqual(received, expected);
}
