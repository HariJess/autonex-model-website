import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Car, Upload, Calculator, Flame, ChevronRight, type LucideIcon } from "lucide-react";
import { buildYasUrl } from "@/features/yas-app/lib/buildYasUrl";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { trackYasEvent, type YasEventName } from "@/features/yas-app/lib/yasTracking";
import { useDbListings } from "@/hooks/useListings";
import { getDealMeta } from "@/lib/deals";

type YasAction = {
  id: "buy" | "estimate" | "deals" | "sell";
  labelKey: string;
  fallbackLabel: string;
  helperKey: string;
  fallbackHelper: string;
  Icon: LucideIcon;
  /** Couleur tonale dédiée à chaque action (gradient + icône). */
  tone: "blue" | "violet" | "orange" | "emerald";
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
    tone: "blue",
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
    tone: "violet",
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
    tone: "orange",
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
    tone: "emerald",
    href: "/publier",
    eventName: "yas_action_sell_click",
  },
];

// Tone -> classes Tailwind statiques (les classes JIT doivent être complètes
// dans le source, pas concaténées dynamiquement, sinon Tailwind les purge).
const TONE_CLASSES: Record<YasAction["tone"], string> = {
  blue: "bg-gradient-to-br from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400",
  violet: "bg-gradient-to-br from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
  orange: "bg-gradient-to-br from-orange-500/15 to-orange-500/5 text-orange-600 dark:text-orange-400",
  emerald: "bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
};

// Layout vertical 1 colonne — design glassmorphisme premium (Apple/Stripe/Linear).
// Hauteur fixe + ombre douce + scale press + chevron qui glisse au hover.
const cardClass =
  "group flex min-h-[88px] items-center gap-4 rounded-2xl border border-border/40 bg-gradient-to-br from-card to-card/50 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 ease-out hover:border-border/70 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 active:scale-[0.98] sm:min-h-[96px] sm:p-5";

export function YasActionGrid() {
  const { t } = useTranslation();
  const yas = useYasContext();

  // Filtre dynamique : la card "Bonnes affaires" ne doit s'afficher que s'il y
  // a au moins une annonce avec un dealMeta valide (sinon dead-end UX — le user
  // tape la card, scroll vers `#deals`, et tombe sur "pas de bonne affaire").
  // Réutilise la même query que YasFeaturedDeals : React Query dédupe par
  // queryKey, donc pas de fetch supplémentaire.
  const { data: listings = [] } = useDbListings({ limit: 24 });
  const hasDeals = useMemo(() => {
    for (const listing of listings) {
      if (getDealMeta(listing)) return true;
    }
    return false;
  }, [listings]);

  const visibleActions = useMemo(
    () => ACTIONS.filter((a) => a.id !== "deals" || hasDeals),
    [hasDeals],
  );

  // Solution A : tracking d'analytics seul, et on laisse le navigateur faire
  // le saut natif via `<a href="#deals">`. La cible `<section id="deals">`
  // est désormais toujours rendue dans le DOM (cf. YasFeaturedDeals.tsx) même
  // sans listings, donc le saut hash natif fonctionne en local comme en prod.
  const handleAnchorClick = (action: YasAction) => () => {
    trackYasEvent(action.eventName, yas, { action_id: action.id });
  };

  const handleNavClick = (action: YasAction) => () => {
    trackYasEvent(action.eventName, yas, { action_id: action.id });
  };

  return (
    <section
      aria-label={t("yas.actions.sectionAria", "Actions principales")}
      className="grid grid-cols-1 gap-2.5"
    >
      {visibleActions.map((action) => {
        const Icon = action.Icon;
        const iconNode = (
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner sm:h-14 sm:w-14 ${TONE_CLASSES[action.tone]}`}
          >
            <Icon className="h-6 w-6 stroke-[1.75] sm:h-7 sm:w-7" aria-hidden />
          </span>
        );
        const labelNode = (
          <div className="min-w-0 flex-1">
            <h3 className="font-sans text-base font-semibold tracking-tight text-foreground sm:text-[17px]">
              {t(action.labelKey, action.fallbackLabel)}
            </h3>
            <p className="mt-1 font-sans text-sm leading-snug text-muted-foreground">
              {t(action.helperKey, action.fallbackHelper)}
            </p>
          </div>
        );
        const chevronNode = (
          <ChevronRight
            className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground"
            aria-hidden
          />
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
              {chevronNode}
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
            {chevronNode}
          </Link>
        );
      })}
    </section>
  );
}
