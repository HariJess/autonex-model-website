/**
 * Shared FR translation for DB error codes raised by admin SECURITY DEFINER
 * RPCs (admin_user_detail_module, admin_pricing_module, ...).
 *
 * PostgREST surfaces raw RAISE EXCEPTION text in error.message with some
 * contextual prefix; `mapDbError` uses substring match so the code works
 * whether supabase-js returns "forbidden" plain or "... ERROR: 42501: forbidden".
 */
export const DB_ERROR_MESSAGES: Record<string, string> = {
  // Shared
  forbidden: "Action refusée : droits admin requis.",

  // admin user detail module
  cannot_self_demote: "Vous ne pouvez pas rétrograder votre propre compte.",
  cannot_self_suspend: "Vous ne pouvez pas suspendre votre propre compte.",
  cannot_self_delete: "Vous ne pouvez pas supprimer votre propre compte.",
  amount_required_non_zero: "Le montant doit être différent de zéro.",
  reason_required: "La raison est requise (au moins 3 caractères).",
  user_not_found: "Utilisateur introuvable.",
  confirmation_email_required: "L'email de confirmation est requis.",
  email_mismatch: "L'email de confirmation ne correspond pas à l'email du compte.",

  // admin pricing module
  invalid_key: "La clé est invalide.",
  invalid_amount: "Le montant doit être positif ou nul.",
  invalid_pack_id: "L'identifiant du pack est invalide.",
  invalid_pack_name: "Le nom du pack est requis.",
  invalid_credits_amount: "Le nombre de crédits doit être > 0.",
  invalid_price_mga: "Le prix en Ariary doit être > 0.",
  invalid_sort_order: "L'ordre de tri doit être >= 0.",
  pricing_key_not_found: "Clé de tarification introuvable.",
  pack_not_found: "Pack introuvable.",
};

export function mapDbError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  for (const key of Object.keys(DB_ERROR_MESSAGES)) {
    if (raw.includes(key)) return DB_ERROR_MESSAGES[key];
  }
  return raw || fallback;
}
