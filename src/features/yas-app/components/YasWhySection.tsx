import { useTranslation } from "react-i18next";
import { ShieldCheck, BadgeCheck, Sparkles, MapPin, type LucideIcon } from "lucide-react";

type WhyItem = {
  Icon: LucideIcon;
  titleKey: string;
  fallbackTitle: string;
  bodyKey: string;
  fallbackBody: string;
};

const ITEMS: WhyItem[] = [
  {
    Icon: ShieldCheck,
    titleKey: "yas.why.moderated.title",
    fallbackTitle: "Annonces modérées",
    bodyKey: "yas.why.moderated.body",
    fallbackBody: "Chaque annonce est vérifiée avant publication.",
  },
  {
    Icon: BadgeCheck,
    titleKey: "yas.why.estimation.title",
    fallbackTitle: "Estimation transparente",
    bodyKey: "yas.why.estimation.body",
    fallbackBody: "Une fourchette argumentée, un niveau de confiance explicite.",
  },
  {
    Icon: MapPin,
    titleKey: "yas.why.local.title",
    fallbackTitle: "100% Madagascar",
    bodyKey: "yas.why.local.body",
    fallbackBody: "Pensé pour le marché malgache : MGA, villes, concessionnaires locaux.",
  },
  {
    Icon: Sparkles,
    titleKey: "yas.why.fast.title",
    fallbackTitle: "Rapide à utiliser",
    bodyKey: "yas.why.fast.body",
    fallbackBody: "Mini-app fluide intégrée à YAS & Moi, pas d'app à installer.",
  },
];

export function YasWhySection() {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t("yas.why.sectionAria", "Pourquoi AutoNex")}
      className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5"
    >
      <h2 className="font-sans text-base font-bold text-foreground sm:text-lg">
        {t("yas.why.heading", "Pourquoi AutoNex ?")}
      </h2>
      <ul className="space-y-2.5">
        {ITEMS.map((item) => {
          const Icon = item.Icon;
          return (
            <li key={item.titleKey} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-sans text-sm font-semibold text-foreground">
                  {t(item.titleKey, item.fallbackTitle)}
                </span>
                <span className="mt-0.5 block font-sans text-[13px] leading-snug text-muted-foreground">
                  {t(item.bodyKey, item.fallbackBody)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
