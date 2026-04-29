import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YasAppLayout } from "@/features/yas-app/YasAppLayout";
import { YasHero } from "@/features/yas-app/components/YasHero";
import { YasActionGrid } from "@/features/yas-app/components/YasActionGrid";
import { YasWhySection } from "@/features/yas-app/components/YasWhySection";
import { YasFeaturedDeals } from "@/features/yas-app/components/YasFeaturedDeals";
import { YasFooterMini } from "@/features/yas-app/components/YasFooterMini";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { trackYasEvent } from "@/features/yas-app/lib/yasTracking";
import { buildYasUrl } from "@/features/yas-app/lib/buildYasUrl";

/**
 * Page principale de la mini-app `/yas-app`.
 *
 * Cible : utilisateur qui découvre AutoNex via une WebView dans l'app
 * « YAS & Moi ». L'expérience est condensée, mobile-first, sans header
 * desktop ni footer long. Les 4 actions principales redirigent vers les
 * routes réelles du site (recherche / publier / estimer / recherche
 * triée bonnes affaires) en conservant les query params YAS pour que le
 * mode embedded persiste côté Header/Footer/CookieConsent.
 */
export default function YasAppPage() {
  const { t } = useTranslation();
  const yas = useYasContext();

  useEffect(() => {
    trackYasEvent("yas_autonex_open", yas);
    // L'event ne doit firer qu'une fois par mount, mais le contexte peut
    // être enrichi un tick plus tard quand parseFromQuery écrit en session.
    // Volontairement sans deps : une seule émission par mount suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estimationUrl = buildYasUrl("/estimation", {
    source: yas.source ?? "yas",
    embedded: yas.isEmbedded ? "true" : null,
    platform: yas.platform,
    entry_point: yas.entryPoint,
  });

  return (
    <>
      <Helmet>
        <title>AutoNex × YAS & Moi</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Mini-app AutoNex intégrée à YAS & Moi : acheter, vendre ou estimer une voiture à Madagascar."
        />
      </Helmet>
      <YasAppLayout>
        <div className="space-y-5">
          <YasHero />
          <YasActionGrid />
          <YasWhySection />
          <YasFeaturedDeals />

          {/*
           * Card de réassurance — angle psychologique différent de l'action
           * "Estimer" du haut. Vise les utilisateurs hésitants qui n'ont pas
           * encore cliqué : "tu hésites à vendre ? Découvre la valeur d'abord,
           * sans engagement". Cross-sell vers l'outil estimation = différencia-
           * teur AutoNex (Marketplace n'a pas ça).
           */}
          <section
            aria-label={t("yas.cta.sectionAria", "Découvrir la valeur de mon véhicule")}
            className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-primary/[0.02] p-5 shadow-sm"
          >
            <p className="font-sans text-base font-semibold text-foreground sm:text-lg">
              {t("yas.cta.title", "Hésitant à vendre ?")}
            </p>
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
              {t(
                "yas.cta.body",
                "Découvrez la vraie valeur de votre voiture en 2 minutes — sans engagement.",
              )}
            </p>
            <Button
              asChild
              size="lg"
              className="mt-4 w-full font-sans"
              onClick={() => trackYasEvent("yas_publish_cta_click", yas, { variant: "estimate_reassurance" })}
            >
              <Link to={estimationUrl}>
                {t("yas.cta.button", "Estimer ma voiture")}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </section>

          <YasFooterMini />
        </div>
      </YasAppLayout>
    </>
  );
}
