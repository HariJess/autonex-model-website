// @ts-nocheck
// Supabase Edge Function helper — VPI token fetch + in-memory cache
// -----------------------------------------------------------------------------
// Mission P.2 — shared by vpi-initiate-payment and vpi-check-status.
//
// VPI authentifie chaque appel API avec un JWT de courte durée obtenu via
// GET /webpayment/token (cf. doc VPI §3). Le JWT est valable 20 minutes.
// On le cache en mémoire de l'instance Edge Function pendant 18 minutes (marge
// de 2 min) pour éviter un roundtrip VPI sur chaque appel.
//
// Edge Functions Supabase sont "warm" entre requêtes successives sur la même
// instance ; le cache hit fréquemment. Cold start → refetch, pas de retry
// loop. Pas de mutex concurrence : 2 fetchs simultanés sont idempotents
// (VPI renvoie le même token pour le même client_id pendant sa période de
// validité). Leçon workflow Ali : "fonctionnera la plupart du temps, sinon
// re-fetch OK".
//
// Required env :
//   VPI_API_BASE_URL    ex. https://bo.vanilla-pay.net
//   VPI_CLIENT_ID       identifiant client VPI
//   VPI_CLIENT_SECRET   secret VPI — NE JAMAIS LOGGER
//   VPI_VERSION         ex. 2023-01-12
//
// IMPORTANT : la valeur retournée inclut déjà le préfixe "Bearer " tel que
// fourni par VPI (ex. "Bearer eyJ..."). Les callers passent la string
// directement dans le header Authorization SANS re-préfixer "Bearer".
//
// Erreurs : throw avec message clair (prefix vpi_token_*). Le caller catche
// et renvoie 500/502 au client final.
// -----------------------------------------------------------------------------

const CACHE_TTL_MS = 18 * 60 * 1000; // 18 min (VPI expire à 20 min, marge 2 min)
const REFRESH_THRESHOLD_MS = 60 * 1000; // rafraîchir si < 60 s avant expiration

type TokenCache = {
  token: string | null;
  expiresAt: number | null;
};

const cache: TokenCache = {
  token: null,
  expiresAt: null,
};

function logTokenEvent(event: string, extra?: Record<string, unknown>): void {
  // Jamais de token ni client_secret dans les logs (contrainte sécurité Ali).
  // OK de logger CodeRetour, DescRetour (tronqué), expires_in_ms.
  console.log(`[vpi-token] ${event}`, extra ? JSON.stringify(extra) : "");
}

/**
 * Retourne un JWT VPI valide, string préfixée "Bearer ...".
 * Lève une Error si l'environnement est incomplet ou si VPI refuse.
 */
export async function getVpiToken(): Promise<string> {
  const now = Date.now();

  // Cache hit
  if (
    cache.token &&
    cache.expiresAt &&
    cache.expiresAt > now + REFRESH_THRESHOLD_MS
  ) {
    return cache.token;
  }

  const baseUrl = Deno.env.get("VPI_API_BASE_URL");
  const clientId = Deno.env.get("VPI_CLIENT_ID");
  const clientSecret = Deno.env.get("VPI_CLIENT_SECRET");
  const version = Deno.env.get("VPI_VERSION");

  if (!baseUrl || !clientId || !clientSecret || !version) {
    const missing = [
      !baseUrl && "VPI_API_BASE_URL",
      !clientId && "VPI_CLIENT_ID",
      !clientSecret && "VPI_CLIENT_SECRET",
      !version && "VPI_VERSION",
    ]
      .filter(Boolean)
      .join(",");
    throw new Error(`vpi_token_missing_env:${missing}`);
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/webpayment/token`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "*/*",
        "Client-Id": clientId,
        "Client-Secret": clientSecret,
        "VPI-Version": version,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown_network_error";
    throw new Error(`vpi_token_fetch_failed:${message}`);
  }

  if (!response.ok) {
    const bodySnippet = await response.text().catch(() => "");
    throw new Error(
      `vpi_token_http_${response.status}:${bodySnippet.slice(0, 200)}`,
    );
  }

  let payload: {
    CodeRetour?: number;
    DescRetour?: string;
    Data?: { Token?: string };
  };
  try {
    payload = await response.json();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown_json_error";
    throw new Error(`vpi_token_invalid_json:${message}`);
  }

  const code = payload?.CodeRetour;
  const desc = typeof payload?.DescRetour === "string" ? payload.DescRetour : "";

  if (code !== 200) {
    logTokenEvent("vpi_token_denied", {
      code,
      desc: desc.slice(0, 200),
    });
    throw new Error(`vpi_token_denied_code_${code}:${desc.slice(0, 200)}`);
  }

  const token = payload?.Data?.Token;
  if (!token || typeof token !== "string") {
    logTokenEvent("vpi_token_missing_in_response", { code });
    throw new Error("vpi_token_missing_in_response");
  }

  cache.token = token;
  cache.expiresAt = now + CACHE_TTL_MS;
  logTokenEvent("vpi_token_fetched", { expires_in_ms: CACHE_TTL_MS });

  return token;
}

/**
 * Réinitialise le cache — usage interne diagnostique uniquement.
 * Ni initiate ni webhook ne devraient appeler cette fonction en production.
 */
export function clearVpiTokenCache(): void {
  cache.token = null;
  cache.expiresAt = null;
}
