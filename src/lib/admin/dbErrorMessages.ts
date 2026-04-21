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

  // agencies v2 module
  slug_already_exists: "Ce slug est déjà utilisé par une autre agence.",
  reason_too_short: "La raison doit faire au moins 10 caractères.",
  user_already_linked_to_agency: "Cet utilisateur est déjà lié à une autre agence.",
  agency_not_found: "Agence introuvable.",
  not_agency_member: "Vous n'êtes pas membre d'une agence.",
  invalid_name: "Le nom de l'agence est requis.",

  // moderation / reports (Mission 2.B)
  invalid_filter: "Filtre de modération invalide.",
  listing_not_found: "Annonce introuvable.",

  // promo codes module
  auth_required: "Connexion requise pour cette action.",
  invalid_code: "Le code est invalide (A-Z, 0-9, tirets uniquement, 50 car. max).",
  invalid_percentage: "Le pourcentage doit être compris entre 1 et 100.",
  invalid_bonus_credits: "Le nombre de crédits bonus doit être > 0.",
  invalid_type_fields: "Les champs doivent correspondre au type choisi.",
  invalid_max_redemptions: "La limite d'utilisations doit être > 0.",
  max_redemptions_below_current: "La limite ne peut pas être inférieure au nombre d'utilisations déjà enregistrées.",
  code_already_exists: "Ce code promo existe déjà.",
  code_not_found: "Code promo introuvable ou désactivé.",
  code_expired: "Ce code promo a expiré.",
  code_exhausted: "Ce code promo a atteint sa limite d'utilisations.",
  code_not_applicable_to_pack: "Ce code n'est pas applicable à ce pack.",
  code_already_used: "Vous avez déjà utilisé ce code.",
  promo_code_not_found: "Code promo introuvable.",
  redemption_already_recorded: "Cette transaction a déjà un code promo appliqué.",
  transaction_not_found: "Transaction introuvable.",
};

export function mapDbError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  for (const key of Object.keys(DB_ERROR_MESSAGES)) {
    if (raw.includes(key)) return DB_ERROR_MESSAGES[key];
  }
  return raw || fallback;
}
