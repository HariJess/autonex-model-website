import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { CookieConsentModal } from "@/components/cookies/CookieConsentModal";

const Footer = () => {
  const { t } = useTranslation();
  const {
    consent,
    preferencesOpen,
    openPreferences,
    closePreferences,
    savePreferences,
  } = useCookieConsent();

  return (
    <footer className="border-t border-white/10 bg-navbar text-navbar-foreground">
      <div className="container mx-auto py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logo} alt="AutoNex" className="h-12 sm:h-14 w-auto" />
            <p className="text-[0.95rem] leading-relaxed opacity-75 font-sans">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Automotive links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-base md:text-lg">{t("footer.automotive", "Automobile")}</h4>
            <div className="flex flex-col gap-1.5 text-[0.95rem] leading-relaxed font-sans opacity-75">
              <Link to="/recherche?transaction=vente" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">{t("nav.buy")}</Link>
              <Link to="/recherche?transaction=location" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">{t("nav.rent")}</Link>
              <Link to="/agences" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">{t("nav.agencies")}</Link>
              <Link to="/publier" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">{t("nav.publish")}</Link>
            </div>
          </div>

          {/* Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-base md:text-lg">{t("footer.information")}</h4>
            <div className="flex flex-col gap-1.5 text-[0.95rem] leading-relaxed font-sans opacity-75">
              <Link to="/conseils" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">{t("nav.advice")}</Link>
              <Link to="/contact" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">Contact</Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="font-semibold text-base md:text-lg">Informations légales</h4>
            <div className="flex flex-col gap-1.5 text-[0.95rem] leading-relaxed font-sans opacity-75">
              <Link to="/legal/mentions" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">Mentions légales</Link>
              <Link to="/legal/confidentialite" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">Politique de confidentialité</Link>
              <Link to="/legal/cgu" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">Conditions générales d'utilisation</Link>
              <Link to="/legal/cookies" className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity">Gestion des cookies</Link>
              <button
                type="button"
                onClick={openPreferences}
                className="inline-flex min-h-10 items-center hover:opacity-100 transition-opacity text-left"
              >
                Gérer mes cookies
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 md:mt-12 pt-6 border-t border-muted-foreground/20 text-center text-sm font-sans opacity-60 space-y-1">
          <p>© 2026 APLi SARLU — Marque AutoNex. Tous droits réservés.</p>
          <p className="text-xs opacity-80">RCS Antananarivo 2025 B 00769 — NIF 4019287505</p>
        </div>

        <div className="mt-4 pt-4 border-t border-muted-foreground/10 text-center text-xs font-sans text-muted-foreground/70">
          <span>Conçu et développé par </span>
          <a
            href="https://www.linkedin.com/company/aplisarlu/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navbar-foreground/80 hover:text-navbar-foreground hover:underline underline-offset-2 transition-colors"
          >
            APli
          </a>
        </div>
      </div>

      <CookieConsentModal
        open={preferencesOpen}
        onOpenChange={(open) => (open ? openPreferences() : closePreferences())}
        initial={{ analytics: consent?.analytics ?? false, functional: consent?.functional ?? false }}
        onSave={(next) => {
          savePreferences(next);
          closePreferences();
        }}
      />
    </footer>
  );
};

export default Footer;
