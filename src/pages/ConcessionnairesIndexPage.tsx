import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import AgenciesListPage from "./AgenciesListPage";

/**
 * /concessionnaires — alias SEO de /agences.
 *
 * Décision V2 (D10) : on expose les 2 URLs pour maximiser le long-tail FR
 * ("concessionnaire" est plus cherché que "agence automobile" sur le marché
 * malgache). Même contenu, canonical distinct par page.
 */
const ConcessionnairesIndexPage = () => {
  const { t } = useTranslation();
  const canonical =
    typeof window !== "undefined"
      ? `${window.location.origin}/concessionnaires`
      : "https://autonex.mg/concessionnaires";

  return (
    <>
      <Helmet>
        <title>Concessionnaires automobiles à Madagascar — AutoNex</title>
        <meta
          name="description"
          content="Annuaire des concessionnaires automobiles à Madagascar : découvrez les professionnels vérifiés, consultez leur stock et contactez-les directement."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <AgenciesListPage heading={t("agencies.headingConcessionnairesRoute")} />
    </>
  );
};

export default ConcessionnairesIndexPage;
