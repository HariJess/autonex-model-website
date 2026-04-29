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

  const publishUrl = buildYasUrl("/publier", {
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

          <section
            aria-label={t("yas.cta.sectionAria", "Publier une annonce")}
            className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-primary/[0.02] p-5 shadow-sm"
          >
            <p className="font-sans text-base font-semibold text-foreground sm:text-lg">
              {t("yas.cta.title", "Vendez votre voiture sur AutoNex")}
            </p>
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
              {t(
                "yas.cta.body",
                "Publication guidée, modération avant mise en ligne, paiement sécurisé en MGA.",
              )}
            </p>
            <Button
              asChild
              size="lg"
              className="mt-4 w-full font-sans"
              onClick={() => trackYasEvent("yas_publish_cta_click", yas)}
            >
              <Link to={publishUrl}>
                {t("yas.cta.button", "Publier mon véhicule")}
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
