import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { useYasHomeUrl } from "@/features/yas-app/hooks/useYasHomeUrl";

/**
 * Bouton « Retour à AutoNex » affiché *uniquement* en mode embedded YAS.
 *
 * Pensé pour les pages destination dépourvues de breadcrumb (ex. /estimation)
 * où l'utilisateur YAS se retrouverait sinon sans aucun moyen de revenir vers
 * la mini-app. Retourne `null` quand `isEmbedded === false` → zéro impact sur
 * le site normal.
 */
export function YasBackButton() {
  const { isEmbedded } = useYasContext();
  const { t } = useTranslation();
  const homeUrl = useYasHomeUrl();

  if (!isEmbedded) return null;

  const label = t("yas.backToYasApp", "Retour à AutoNex");

  return (
    <Link
      to={homeUrl}
      className="-ml-3 mb-3 inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
