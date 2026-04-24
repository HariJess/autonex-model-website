/**
 * Transforme une erreur PostgREST / Supabase en message utilisateur lisible
 * en français. Utilisé dans le flow de publication (Lot 9.1c) pour éviter les
 * messages génériques du type « Erreur lors de la publication ».
 */

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

const CHECK_CONSTRAINT_MAP: Array<{ needle: string; message: string }> = [
  { needle: "description_too_short", message: "La description doit contenir au moins 20 caractères." },
  { needle: "title_too_short", message: "Le titre doit contenir au moins 8 caractères." },
  { needle: "price_invalid", message: "Le prix doit être supérieur à 0." },
  { needle: "price_mga_positive", message: "Le prix doit être supérieur à 0." },
];

export function parseSupabaseError(err: unknown): string {
  if (!err) return "Une erreur inconnue est survenue.";

  // Error natif JS
  if (err instanceof Error && !("code" in err)) {
    return err.message || "Une erreur est survenue.";
  }

  if (typeof err !== "object") {
    return String(err);
  }

  const error = err as SupabaseLikeError;

  // PGRST116 — single-row coerce : typiquement un UPDATE qui ne matche
  // aucune ligne (filtre sur `status = 'draft'` alors que la ligne a déjà
  // basculé en pending_review, par exemple).
  if (error.code === "PGRST116") {
    return "Impossible de finaliser la sauvegarde. Rafraîchissez la page puis réessayez.";
  }

  // 23514 — CHECK constraint violation. On tente de reconnaître les
  // contraintes nommées explicitement dans le schéma.
  if (error.code === "23514") {
    const combined = `${error.message ?? ""} ${error.details ?? ""}`;
    for (const entry of CHECK_CONSTRAINT_MAP) {
      if (combined.includes(entry.needle)) return entry.message;
    }
    return `Données invalides : ${error.message ?? "contrainte de base violée"}.`;
  }

  // 23502 — NOT NULL violation
  if (error.code === "23502") {
    return "Un champ obligatoire est manquant. Vérifiez le formulaire.";
  }

  // 23505 — UNIQUE violation
  if (error.code === "23505") {
    return "Cette valeur existe déjà. Choisissez-en une autre.";
  }

  // 42501 — insufficient_privilege
  if (error.code === "42501") {
    return "Vous n’avez pas les droits pour effectuer cette action.";
  }

  // P0001 — RAISE EXCEPTION (triggers custom Supabase)
  if (error.code === "P0001") {
    return error.message || "Action refusée par la validation serveur.";
  }

  // Fallback : afficher le message brut si disponible.
  return error.message || error.details || "Une erreur est survenue.";
}

/**
 * Détecte les erreurs « le PATCH sur le draft a matché 0 ligne » qu'on doit
 * silencieusement ignorer (typiquement après qu'une publication ait basculé
 * le statut en `pending_review` alors qu'un autosave debouncé est encore en
 * vol).
 */
export function isDraftNoLongerDraftError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const error = err as SupabaseLikeError;
  if (error.code === "PGRST116") return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("cannot coerce") ||
    message.includes("no rows") ||
    message.includes("0 rows")
  );
}
