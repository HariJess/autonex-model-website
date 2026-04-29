/**
 * Concatène les query params YAS sur n'importe quelle URL interne.
 *
 * Merge (pas écrasement) : si l'URL cible a déjà des params, ils sont
 * préservés. Les params YAS sont ajoutés *en plus*, sans dupliquer ceux qui
 * existent déjà côté cible.
 *
 * Exemple :
 *   buildYasUrl("/recherche?transaction=vente", { source: "yas", embedded: "true" })
 *   → "/recherche?transaction=vente&source=yas&embedded=true"
 */
export type YasQueryParams = {
  source?: string | null;
  embedded?: string | null;
  platform?: string | null;
  entry_point?: string | null;
};

export function buildYasUrl(targetUrl: string, params: YasQueryParams): string {
  const [path, existingQuery = ""] = targetUrl.split("?", 2);
  const searchParams = new URLSearchParams(existingQuery);

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (searchParams.has(key)) continue; // ne pas écraser un param déjà présent
    searchParams.set(key, String(value));
  }

  const qs = searchParams.toString();
  return qs ? `${path}?${qs}` : path;
}
