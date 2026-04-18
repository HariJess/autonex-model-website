/**
 * Borne supérieure des lignes `listings` chargées pour la recherche « relaxed »
 * (filtres SQL élargis + affinage côté client). Sans limite, PostgREST peut
 * renvoyer l’intégralité du catalogue actif — non scalable.
 */
export const SEARCH_RELAXED_DB_ROW_CAP = 500;

/** Page agence publique : évite un fetch illimité par agents. */
export const AGENCY_PROFILE_LISTINGS_CAP = 240;
