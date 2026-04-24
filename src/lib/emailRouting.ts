/**
 * Routing email pour les notifications (Lot 10.2).
 *
 * Ce module est volontairement ISOMORPHE — il ne dépend ni de React ni de
 * Deno ni de Supabase. Il expose la logique de décision « quel template pour
 * quelle notif » et « quel subject / CTA » sous une forme testable.
 *
 * L'Edge Function (Deno) utilise les mêmes constantes via duplication
 * volontaire (pas d'import partagé entre Deno et Node pour rester indépendant).
 * Les TESTS vérifient que les constantes sont alignées avec celles attendues
 * côté Edge Function.
 */

import type { NotificationType, NotificationPriority } from "@/types/notification";

export type EmailTemplateName =
  | "listing_published"
  | "listing_rejected"
  | "credits_purchased"
  | "digest_daily"
  | null;

export type EmailSendMode = "immediate" | "digest";

/**
 * Mapping type de notif → template « single-send » (mode immédiat).
 * Renvoie `null` pour les types qui ne sont pas envoyés unitairement par email
 * (ex : welcome, system — ils peuvent apparaître en digest).
 */
export function getSingleTemplateForType(
  type: NotificationType,
): Exclude<EmailTemplateName, null> | null {
  switch (type) {
    case "listing_published":
      return "listing_published";
    case "listing_rejected":
      return "listing_rejected";
    case "credits_purchased":
      return "credits_purchased";
    default:
      return null;
  }
}

/**
 * Détermine le mode d'envoi attendu selon la priorité.
 *  - critical           → immediate (toutes les 5 min)
 *  - high / normal      → digest (daily 18h EAT)
 *  - low                → jamais d'email
 */
export function getEmailModeForPriority(priority: NotificationPriority): EmailSendMode | "none" {
  switch (priority) {
    case "critical":
      return "immediate";
    case "high":
    case "normal":
      return "digest";
    case "low":
      return "none";
  }
}

/**
 * Construit l'URL cible à afficher dans le CTA d'un email single-send.
 * Utilise `action_url` de la notif quand présent, sinon dérive depuis la
 * `metadata` selon le type.
 */
export function getEmailCtaUrl(
  type: NotificationType,
  metadata: Record<string, unknown>,
  actionUrl: string | null,
  origin: string = "https://autonex.mg",
): string | null {
  if (actionUrl) {
    // Si action_url est déjà absolue, on la garde telle quelle.
    if (/^https?:\/\//i.test(actionUrl)) return actionUrl;
    return `${origin}${actionUrl.startsWith("/") ? "" : "/"}${actionUrl}`;
  }
  const listingId = typeof metadata.listing_id === "string" ? metadata.listing_id : null;
  switch (type) {
    case "listing_published":
      return listingId ? `${origin}/annonce/${listingId}` : null;
    case "listing_rejected":
      return listingId ? `${origin}/publier?draft=${listingId}` : null;
    case "credits_purchased":
      return `${origin}/dashboard`;
    default:
      return null;
  }
}

/**
 * Vérifie si un user a encore du budget email pour la journée (quota côté
 * client / Edge Function). Utilisé pour feature-gate un envoi avant de taper
 * Resend, et pour les tests unitaires.
 */
export function hasEmailQuotaRemaining(params: {
  sentToday: number;
  maxPerDay: number;
}): boolean {
  return params.sentToday < params.maxPerDay;
}

/**
 * Liste ordonnée des modes gérés par la cron. Utilisée par les tests pour
 * vérifier qu'aucun mode n'est introduit sans handler côté Edge Function.
 */
export const SUPPORTED_EMAIL_MODES: readonly EmailSendMode[] = ["immediate", "digest"] as const;
