import type { TFunction } from "i18next";

export type HeroCategoryShortcut = {
  key: string;
  label: string;
  to: string;
  iconSrc: string;
  iconAlt: string;
};

/**
 * Factory function for Home hero category shortcuts.
 *
 * Requires `t` from `useTranslation()` because labels are i18n-bound and
 * must resolve at render time in the current language context. Export as a
 * builder (not a static array) so both `HeroSearch` (desktop grid inside
 * the search card) and `Index` (mobile horizontal scroll bandeau) share a
 * single source of truth.
 */
export function buildHeroCategoryShortcuts(t: TFunction): HeroCategoryShortcut[] {
  return [
    {
      key: "suv-pickup",
      label: t("home.categorySuvPickup", "SUV & Pick-up"),
      to: "/recherche?vtype=suv_4x4,pick_up",
      iconSrc: "/category-icons/category-suv-pickup.svg.svg",
      iconAlt: t("home.categorySuvPickupAlt", "Silhouette SUV et Pick-up"),
    },
    {
      key: "berline",
      label: t("home.categorySedan", "Berline"),
      to: "/recherche?vtype=berline",
      iconSrc: "/category-icons/category-sedan.svg.svg",
      iconAlt: t("home.categorySedanAlt", "Silhouette berline"),
    },
    {
      key: "citadine",
      label: t("home.categoryCity", "Citadine"),
      to: "/recherche?vtype=citadine",
      iconSrc: "/category-icons/category-citadine.svg",
      iconAlt: t("home.categoryCityAlt", "Silhouette citadine"),
    },
    {
      key: "utilitaire",
      label: t("home.categoryUtility", "Utilitaire"),
      to: "/recherche?vtype=utilitaire_leger",
      iconSrc: "/category-icons/category-utilitaire.svg.svg",
      iconAlt: t("home.categoryUtilityAlt", "Silhouette utilitaire"),
    },
    {
      key: "scooter",
      label: t("home.categoryMoto", "Moto"),
      to: "/recherche?vtype=moto",
      iconSrc: "/category-icons/category-scooter.svg.svg",
      iconAlt: t("home.categoryMotoAlt", "Silhouette scooter"),
    },
  ];
}
