import { useTranslation } from "react-i18next";
import autonexLogoDark from "@/assets/autonex-logo-dark.png";
import yasMoiLogo from "@/assets/yas-moi-logo.svg";

/**
 * Hero compact mini-app — co-branding visuel AutoNex × YAS & Moi.
 *
 * Choix d'équilibrage des logos : AutoNex (texte horizontal, ratio 2.4) à
 * h-10 sm:h-12 ; YAS (logo carré dense, ratio 1.13) à h-8 sm:h-10. AutoNex
 * domine légèrement, ce qui colle au business : c'est le site, le partenariat
 * est mis en avant mais reste secondaire.
 *
 * Border-radius `rounded-2xl` aligné avec les autres cards de la mini-app.
 */
export function YasHero() {
  const { t } = useTranslation();
  return (
    <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-primary/[0.02] px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <img src={autonexLogoDark} alt="AutoNex" className="h-10 w-auto sm:h-12" />
        <span aria-hidden className="text-2xl font-light text-muted-foreground sm:text-3xl">
          ×
        </span>
        <img
          src={yasMoiLogo}
          alt={t("yas.partnerLogoAlt", "YAS & Moi")}
          className="h-8 w-auto sm:h-10"
        />
      </div>
      <h1 className="mt-5 font-sans text-[22px] font-bold leading-tight text-foreground sm:text-3xl">
        {t("yas.heroTitle", "Acheter, vendre ou estimer une voiture à Madagascar")}
      </h1>
      <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t("yas.heroSubtitle", "Le portail auto N°1 de Madagascar.")}
      </p>
    </header>
  );
}
