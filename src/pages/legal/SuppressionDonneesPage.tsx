import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

export default function SuppressionDonneesPage() {
  const { t } = useTranslation();
  return (
    <LegalLayout
      title={t("legal.dataDeletion.pageTitle")}
      description={t("legal.dataDeletion.pageDescription")}
      canonicalPath="/legal/suppression-donnees"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <h1>{t("legal.dataDeletion.heading")}</h1>

      <p>{t("legal.dataDeletion.intro")}</p>

      <h2>{t("legal.dataDeletion.what.title")}</h2>
      <p>{t("legal.dataDeletion.what.intro")}</p>
      <ul>
        <li>{t("legal.dataDeletion.what.item1")}</li>
        <li>{t("legal.dataDeletion.what.item2")}</li>
        <li>
          <Trans i18nKey="legal.dataDeletion.what.item3">
            Suppression de votre solde de crédits restant, qui est non remboursable conformément
            aux <Link to="/legal/cgu" className="text-primary hover:underline">CGU</Link>.
          </Trans>
        </li>
        <li>{t("legal.dataDeletion.what.item4")}</li>
        <li>{t("legal.dataDeletion.what.item5")}</li>
        <li>{t("legal.dataDeletion.what.item6")}</li>
      </ul>

      <h2>{t("legal.dataDeletion.kept.title")}</h2>
      <p>{t("legal.dataDeletion.kept.intro")}</p>
      <ul>
        <li>{t("legal.dataDeletion.kept.item1")}</li>
        <li>{t("legal.dataDeletion.kept.item2")}</li>
        <li>{t("legal.dataDeletion.kept.item3")}</li>
      </ul>

      <h2>{t("legal.dataDeletion.how.title")}</h2>

      <h3>{t("legal.dataDeletion.how.dashboard.title")}</h3>
      <p>{t("legal.dataDeletion.how.dashboard.body")}</p>

      <h3>{t("legal.dataDeletion.how.email.title")}</h3>
      <p>
        <Trans i18nKey="legal.dataDeletion.how.email.body">
          Envoyez un email à{" "}
          <a href="mailto:info@autonex.mg?subject=Demande%20de%20suppression%20de%20compte" className="text-primary hover:underline">
            info@autonex.mg
          </a>{" "}
          depuis l'adresse associée à votre compte AutoNex, avec pour objet{" "}
          <em>« Demande de suppression de compte »</em>. Indiquez votre email de connexion et,
          si possible, l'identifiant de votre compte (visible dans Paramètres &gt; Mon profil).
        </Trans>
      </p>
      <p>{t("legal.dataDeletion.how.email.followup")}</p>

      <h2>{t("legal.dataDeletion.oauth.title")}</h2>
      <p>{t("legal.dataDeletion.oauth.intro")}</p>
      <ul>
        <li>
          <Trans i18nKey="legal.dataDeletion.oauth.google">
            Google :{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              myaccount.google.com/permissions
            </a>
            {" "}→ rechercher AutoNex → <em>Supprimer l'accès</em>.
          </Trans>
        </li>
        <li>
          <Trans i18nKey="legal.dataDeletion.oauth.facebook">
            Facebook : Paramètres &amp; confidentialité → Paramètres → Apps et sites web → AutoNex
            → <em>Supprimer</em>. Lien direct :{" "}
            <a href="https://www.facebook.com/settings?tab=applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              facebook.com/settings?tab=applications
            </a>
            .
          </Trans>
        </li>
      </ul>
      <p>{t("legal.dataDeletion.oauth.note")}</p>

      <h2>{t("legal.dataDeletion.delay.title")}</h2>
      <p>{t("legal.dataDeletion.delay.body")}</p>

      <h2>{t("legal.dataDeletion.recourse.title")}</h2>
      <p>{t("legal.dataDeletion.recourse.intro")}</p>
      <ul>
        <li>
          <Trans i18nKey="legal.dataDeletion.recourse.item1">
            Nous contacter à{" "}
            <a href="mailto:info@autonex.mg" className="text-primary hover:underline">
              info@autonex.mg
            </a>{" "}
            pour ouvrir une réclamation interne.
          </Trans>
        </li>
        <li>{t("legal.dataDeletion.recourse.item2")}</li>
      </ul>

      <h2>{t("legal.dataDeletion.contact.title")}</h2>
      <p>
        <Trans i18nKey="legal.dataDeletion.contact.body">
          Pour toute question relative à la suppression de vos données, contactez notre Délégué à
          la Protection des Données (DPO) : PIRBAY Ali As —{" "}
          <a href="mailto:info@autonex.mg" className="text-primary hover:underline">
            info@autonex.mg
          </a>
          . Voir aussi notre{" "}
          <Link to="/legal/confidentialite" className="text-primary hover:underline">
            Politique de confidentialité
          </Link>
          {" "}pour la liste complète des données collectées et leurs finalités.
        </Trans>
      </p>
    </LegalLayout>
  );
}
