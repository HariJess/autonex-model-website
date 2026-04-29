import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";

/**
 * Hero compact mini-app — pas de visuel lourd, focus sur la baseline + CTA
 * implicite via la grille d'actions juste en dessous.
 */
export function YasHero() {
  const { t } = useTranslation();
  return (
    <header className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-primary/[0.02] px-5 py-7 sm:px-6 sm:py-8">
      <div className="flex items-center gap-3">
        <img src={logo} alt="AutoNex" className="h-10 w-auto" />
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          {t("yas.partnerBadge", "× YAS & Moi")}
        </span>
      </div>
      <h1 className="mt-4 font-sans text-2xl font-bold leading-tight text-foreground sm:text-3xl">
        {t("yas.heroTitle", "Acheter, vendre ou estimer une voiture à Madagascar")}
      </h1>
      <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t("yas.heroSubtitle", "Le portail auto N°1 de Madagascar — accessible directement depuis YAS & Moi.")}
      </p>
    </header>
  );
}
