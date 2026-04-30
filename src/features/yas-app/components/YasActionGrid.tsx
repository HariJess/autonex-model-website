import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Car, Upload, Calculator, Flame, type LucideIcon } from "lucide-react";
import { buildYasUrl } from "@/features/yas-app/lib/buildYasUrl";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { trackYasEvent, type YasEventName } from "@/features/yas-app/lib/yasTracking";

type YasAction = {
  id: "buy" | "estimate" | "deals" | "sell";
  labelKey: string;
  fallbackLabel: string;
  helperKey: string;
  fallbackHelper: string;
  Icon: LucideIcon;
  /** Chemin interne avant injection des params YAS, ou null pour un scroll vers une ancre interne. */
  href: string | null;
  /** Ancre cible pour scroll local (utilisé pour le CTA "Bonnes affaires" qui scroll vers la section preview en bas). */
  scrollTo?: string;
  eventName: YasEventName;
};

/**
 * Ordre Acheter / Estimer / Bonnes affaires / Vendre — choix Ali :
 *   1. Acheter (intent majoritaire, exploration)
 *   2. Estimer (différenciateur AutoNex, signal fort, CTA softer)
 *   3. Bonnes affaires (chasse opportuniste — scroll vers la section preview)
 *   4. Vendre (engagement plus fort, dernier dans le tunnel cognitif)
 */
const ACTIONS: YasAction[] = [
  {
    id: "buy",
    labelKey: "yas.actions.buy.label",
    fallbackLabel: "Acheter une voiture",
    helperKey: "yas.actions.buy.helper",
    fallbackHelper: "Parcourir les annonces vérifiées AutoNex.",
    Icon: Car,
    href: "/recherche?transaction=vente",
    eventName: "yas_action_buy_click",
  },
  {
    id: "estimate",
    labelKey: "yas.actions.estimate.label",
    fallbackLabel: "Estimer ma voiture",
    helperKey: "yas.actions.estimate.helper",
    fallbackHelper: "Obtenir une fourchette de prix argumentée.",
    Icon: Calculator,
    href: "/estimation",
    eventName: "yas_action_estimate_click",
  },
  {
    id: "deals",
    labelKey: "yas.actions.deals.label",
    fallbackLabel: "Voir les bonnes affaires",
    helperKey: "yas.actions.deals.helper",
    fallbackHelper: "Annonces avec prix réellement réduits.",
    Icon: Flame,
    href: null,
    scrollTo: "deals",
    eventName: "yas_action_deals_click",
  },
  {
    id: "sell",
    labelKey: "yas.actions.sell.label",
    fallbackLabel: "Vendre ma voiture",
    helperKey: "yas.actions.sell.helper",
    fallbackHelper: "Publier votre véhicule en quelques étapes.",
    Icon: Upload,
    href: "/publier",
    eventName: "yas_action_sell_click",
  },
];

const cardClass =
  "group flex min-h-[72px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 active:translate-y-0 active:bg-muted/40";

export function YasActionGrid() {
  const { t } = useTranslation();
  const yas = useYasContext();

  // Solution A : tracking d'analytics seul, et on laisse le navigateur faire
  // le saut natif via `<a href="#deals">`. `preventDefault + scrollIntoView`
  // était cassé en pratique (un effet React reset scrollY juste après) — le
  // saut hash natif est plus fiable et l'offset est géré par `scroll-mt-4`
  // sur la cible (cf. YasFeaturedDeals.tsx).
  const handleAnchorClick = (action: YasAction) => () => {
    trackYasEvent(action.eventName, yas, { action_id: action.id });
  };

  const handleNavClick = (action: YasAction) => () => {
    trackYasEvent(action.eventName, yas, { action_id: action.id });
  };

  return (
    <section
      aria-label={t("yas.actions.sectionAria", "Actions principales")}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {ACTIONS.map((action) => {
        const Icon = action.Icon;
        const labelNode = (
          <span className="min-w-0">
            <span className="block font-sans text-sm font-semibold text-foreground sm:text-base">
              {t(action.labelKey, action.fallbackLabel)}
            </span>
            <span className="mt-0.5 block font-sans text-[12px] leading-snug text-muted-foreground sm:text-[13px]">
              {t(action.helperKey, action.fallbackHelper)}
            </span>
          </span>
        );
        const iconNode = (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        );

        if (action.scrollTo) {
          return (
            <a
              key={action.id}
              href={`#${action.scrollTo}`}
              onClick={handleAnchorClick(action)}
              className={cardClass}
            >
              {iconNode}
              {labelNode}
            </a>
          );
        }

        const targetUrl = buildYasUrl(action.href ?? "/", {
          source: yas.source ?? "yas",
          embedded: yas.isEmbedded ? "true" : null,
          platform: yas.platform,
          entry_point: yas.entryPoint,
        });
        return (
          <Link
            key={action.id}
            to={targetUrl}
            onClick={handleNavClick(action)}
            className={cardClass}
          >
            {iconNode}
            {labelNode}
          </Link>
        );
      })}
    </section>
  );
}
