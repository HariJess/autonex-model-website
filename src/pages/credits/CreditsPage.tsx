import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CreditsBalanceHero } from "@/pages/credits/components/CreditsBalanceHero";
import { CreditsPurchaseFlow } from "@/components/credits/CreditsPurchaseFlow";
import { BetaPaymentBanner } from "@/components/payments/BetaPaymentBanner";

/**
 * Dedicated /credits route — auth-gated.
 *
 * Phase 11.b: extracts the credit purchase flow that previously lived
 * inside the publish step 3 wizard. The same purchase logic still powers
 * the in-publish fallback block via <CreditsPurchaseFlow variant="fallback-in-publish" />.
 */
const CreditsPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("credits.pageTitle", "Crédits AutoNex")} — AutoNex</title>
        <meta
          name="description"
          content={t(
            "credits.pageDescription",
            "Gérez votre solde de crédits AutoNex, achetez un pack et suivez vos transactions.",
          )}
        />
      </Helmet>
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("credits.pageOverline", "Espace crédits")}
          </p>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground">
            {t("credits.pageHeading", "Vos crédits AutoNex")}
          </h1>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {t(
              "credits.pageIntro",
              "Achetez un pack de crédits pour publier vos annonces et activer des boosts. Les crédits ne sont pas remboursables et expirent 12 mois après l'achat.",
            )}
          </p>
        </header>

        <BetaPaymentBanner />

        <CreditsBalanceHero />

        <section className="space-y-3">
          <h2 className="font-serif text-lg text-foreground">
            {t("credits.purchaseSectionTitle", "Choisissez votre pack")}
          </h2>
          <CreditsPurchaseFlow variant="standalone" />
        </section>
      </main>
      <Footer />
    </>
  );
};

export default CreditsPage;
