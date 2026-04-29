import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { CookieConsentModal } from "./CookieConsentModal";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";

/**
 * First-visit cookie consent banner. Appears only until the user makes a
 * choice (acceptAll / rejectAll / savePreferences via the modal). No dark
 * pattern: the three buttons share equivalent visual weight and layout.
 */
export function CookieConsentBanner() {
  const { t } = useTranslation();
  const { isEmbedded } = useYasContext();
  const {
    consent,
    hasDecided,
    preferencesOpen,
    openPreferences,
    closePreferences,
    acceptAll,
    rejectAll,
    savePreferences,
  } = useCookieConsent();

  // Mode mini-app YAS & Moi : on ne rend rien à l'écran (le hook
  // useCookieConsent reste monté pour préserver la logique de stockage).
  // YAS gère son propre consentement via l'app native côté partenaire.
  if (isEmbedded) return null;

  return (
    <>
      {!hasDecided ? (
        <div
          role="dialog"
          aria-live="polite"
          aria-label={t("cookies.bannerAriaLabel", "Bandeau de consentement cookies")}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/98 backdrop-blur-sm shadow-[0_-8px_24px_rgba(0,0,0,0.15)]"
        >
          <div className="container mx-auto py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl text-sm font-sans text-foreground">
              <p>
                {t("cookies.bannerBodyPrefix", "AutoNex utilise des cookies techniques nécessaires au service, ainsi que des cookies optionnels (analytics, fonctionnels) soumis à votre consentement. Vous pouvez tout accepter, tout refuser ou personnaliser vos choix. Détails sur la page")}{" "}
                <Link to="/legal/cookies" className="text-primary hover:underline">
                  {t("cookies.moreDetailsLink", "Cookies")}
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button type="button" variant="outline" onClick={rejectAll} className="font-sans">
                {t("cookies.rejectAll", "Tout refuser")}
              </Button>
              <Button type="button" variant="outline" onClick={openPreferences} className="font-sans">
                {t("cookies.customize", "Personnaliser")}
              </Button>
              <Button type="button" onClick={acceptAll} className="font-sans">
                {t("cookies.acceptAll", "Tout accepter")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <CookieConsentModal
        open={preferencesOpen}
        onOpenChange={(open) => (open ? openPreferences() : closePreferences())}
        initial={{ analytics: consent?.analytics ?? false, functional: consent?.functional ?? false }}
        onSave={(next) => {
          savePreferences(next);
          closePreferences();
        }}
      />
    </>
  );
}
