/**
 * Feature flags pour la mini-app AutoNex × YAS & Moi.
 *
 * `embeddedPaymentEnabled` doit rester `true` en MVP : Vanilla Pay, achat
 * crédits, boost et spotlight fonctionnent normalement même en mode embedded.
 * Ce flag existe uniquement pour permettre une coupure circuit *propre* si
 * un problème WebView spécifique (SFSafariViewController, Custom Tabs) est
 * détecté en prod sans toucher au site principal — passer à `false` masque
 * les CTA paiement uniquement quand `useYasContext().isEmbedded === true`.
 */
export const yasConfig = {
  embeddedPaymentEnabled: true,
} as const;

export type YasConfig = typeof yasConfig;
