import { useTranslation } from "react-i18next";
import autonexLogoDark from "@/assets/autonex-logo-dark.png";
import yasMoiLogo from "@/assets/yas-moi-logo.svg";

/**
 * Hero compact mini-app — pas de visuel lourd, focus sur la baseline + CTA
 * implicite via la grille d'actions juste en dessous.
 *
 * Co-branding visuel : logo AutoNex (variante dark, lisible sur fond clair)
 * × logo officiel YAS & Moi.
 */
export function YasHero() {
  const { t } = useTranslation();
  return (
    <header className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-primary/[0.02] px-5 py-7 sm:px-6 sm:py-8">
      <div className="flex items-center gap-2 sm:gap-3">
        <img src={autonexLogoDark} alt="AutoNex" className="h-8 w-auto sm:h-10" />
        <span aria-hidden className="text-2xl font-light text-muted-foreground">
          ×
        </span>
        <img src={yasMoiLogo} alt={t("yas.partnerLogoAlt", "YAS & Moi")} className="h-8 w-auto sm:h-10" />
      </div>
      <h1 className="mt-5 font-sans text-2xl font-bold leading-tight text-foreground sm:text-3xl">
        {t("yas.heroTitle", "Acheter, vendre ou estimer une voiture à Madagascar")}
      </h1>
      <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t("yas.heroSubtitle", "Le portail auto N°1 de Madagascar — accessible directement depuis YAS & Moi.")}
      </p>
    </header>
  );
}
