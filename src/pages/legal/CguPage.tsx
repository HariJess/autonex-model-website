import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

export default function CguPage() {
  const { t } = useTranslation();
  return (
    <LegalLayout
      title={t("legal.terms.pageTitle")}
      description={t("legal.terms.pageDescription")}
      canonicalPath="/legal/cgu"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <h1>{t("legal.terms.heading")}</h1>

      <h2>{t("legal.terms.preamble.title")}</h2>
      <p>{t("legal.terms.preamble.body1")}</p>
      <p>
        <Trans i18nKey="legal.terms.preamble.body2">
          AutoNex est un <strong>intermédiaire technique</strong> qui met en relation des acheteurs et des vendeurs de véhicules
          (particuliers et concessionnaires). AutoNex n'est jamais partie aux transactions conclues entre utilisateurs.
        </Trans>
      </p>

      <h2>{t("legal.terms.art1.title")}</h2>
      <ul>
        <li><strong>{t("legal.terms.art1.user.label")}</strong> {t("legal.terms.art1.user.desc")}</li>
        <li><strong>{t("legal.terms.art1.listing.label")}</strong> {t("legal.terms.art1.listing.desc")}</li>
        <li><strong>{t("legal.terms.art1.individual.label")}</strong> {t("legal.terms.art1.individual.desc")}</li>
        <li><strong>{t("legal.terms.art1.dealer.label")}</strong> {t("legal.terms.art1.dealer.desc")}</li>
        <li><strong>{t("legal.terms.art1.credits.label")}</strong> {t("legal.terms.art1.credits.desc")}</li>
        <li><strong>{t("legal.terms.art1.boost.label")}</strong> {t("legal.terms.art1.boost.desc")}</li>
        <li><strong>{t("legal.terms.art1.report.label")}</strong> {t("legal.terms.art1.report.desc")}</li>
      </ul>

      <h2>{t("legal.terms.art2.title")}</h2>
      <ul>
        <li>{t("legal.terms.art2.item1")}</li>
        <li>{t("legal.terms.art2.item2")}</li>
        <li>{t("legal.terms.art2.item3")}</li>
        <li>{t("legal.terms.art2.item4")}</li>
        <li>{t("legal.terms.art2.item5")}</li>
      </ul>

      <h2>{t("legal.terms.art3.title")}</h2>
      <h3>{t("legal.terms.art3.signup.title")}</h3>
      <ul>
        <li>{t("legal.terms.art3.signup.item1")}</li>
        <li>{t("legal.terms.art3.signup.item2")}</li>
        <li>{t("legal.terms.art3.signup.item3")}</li>
        <li>{t("legal.terms.art3.signup.item4")}</li>
      </ul>
      <h3>{t("legal.terms.art3.unique.title")}</h3>
      <p>{t("legal.terms.art3.unique.body")}</p>
      <h3>{t("legal.terms.art3.confidentiality.title")}</h3>
      <ul>
        <li>{t("legal.terms.art3.confidentiality.item1")}</li>
        <li>
          <Trans i18nKey="legal.terms.art3.confidentiality.item2">
            Toute utilisation suspecte doit être signalée immédiatement à <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>
          </Trans>
        </li>
      </ul>
      <h3>{t("legal.terms.art3.refusal.title")}</h3>
      <p>{t("legal.terms.art3.refusal.body")}</p>

      <h2>{t("legal.terms.art4.title")}</h2>
      <h3>{t("legal.terms.art4.individual.title")}</h3>
      <ul>
        <li>{t("legal.terms.art4.individual.item1")}</li>
        <li>{t("legal.terms.art4.individual.item2")}</li>
        <li>{t("legal.terms.art4.individual.item3")}</li>
      </ul>
      <h3>{t("legal.terms.art4.dealer.title")}</h3>
      <p>{t("legal.terms.art4.dealer.intro")}</p>
      <ul>
        <li>{t("legal.terms.art4.dealer.item1")}</li>
        <li>{t("legal.terms.art4.dealer.item2")}</li>
        <li>{t("legal.terms.art4.dealer.item3")}</li>
        <li>{t("legal.terms.art4.dealer.item4")}</li>
      </ul>
      <ul>
        <li>{t("legal.terms.art4.dealer.item5")}</li>
        <li>{t("legal.terms.art4.dealer.item6")}</li>
      </ul>
      <h3>{t("legal.terms.art4.revoke.title")}</h3>
      <p>{t("legal.terms.art4.revoke.body")}</p>

      <h2>{t("legal.terms.art5.title")}</h2>
      <h3>{t("legal.terms.art5.allowed.title")}</h3>
      <ul>
        <li>{t("legal.terms.art5.allowed.item1")}</li>
        <li>{t("legal.terms.art5.allowed.item2")}</li>
        <li>{t("legal.terms.art5.allowed.item3")}</li>
      </ul>
      <h3>{t("legal.terms.art5.forbidden.title")}</h3>
      <ul>
        <li>{t("legal.terms.art5.forbidden.item1")}</li>
        <li>{t("legal.terms.art5.forbidden.item2")}</li>
        <li>{t("legal.terms.art5.forbidden.item3")}</li>
        <li>{t("legal.terms.art5.forbidden.item4")}</li>
        <li>{t("legal.terms.art5.forbidden.item5")}</li>
        <li>{t("legal.terms.art5.forbidden.item6")}</li>
        <li>{t("legal.terms.art5.forbidden.item7")}</li>
      </ul>
      <h3>{t("legal.terms.art5.veracity.title")}</h3>
      <ul>
        <li>{t("legal.terms.art5.veracity.item1")}</li>
        <li>{t("legal.terms.art5.veracity.item2")}</li>
      </ul>
      <h3>{t("legal.terms.art5.photoRights.title")}</h3>
      <ul>
        <li>{t("legal.terms.art5.photoRights.item1")}</li>
        <li>{t("legal.terms.art5.photoRights.item2")}</li>
      </ul>
      <h3>{t("legal.terms.art5.limits.title")}</h3>
      <ul>
        <li>{t("legal.terms.art5.limits.item1")}</li>
        <li>{t("legal.terms.art5.limits.item2")}</li>
      </ul>
      <h3>{t("legal.terms.art5.moderation.title")}</h3>
      <ul>
        <li>{t("legal.terms.art5.moderation.item1")}</li>
        <li>{t("legal.terms.art5.moderation.item2")}</li>
        <li>{t("legal.terms.art5.moderation.item3")}</li>
      </ul>

      <h2>{t("legal.terms.art6.title")}</h2>
      <h3>{t("legal.terms.art6.mechanic.title")}</h3>
      <ul>
        <li>{t("legal.terms.art6.mechanic.item1")}</li>
        <li>{t("legal.terms.art6.mechanic.item2")}</li>
      </ul>
      <h3>{t("legal.terms.art6.providers.title")}</h3>
      <ul>
        <li>{t("legal.terms.art6.providers.item1")}</li>
        <li>{t("legal.terms.art6.providers.item2")}</li>
        <li>{t("legal.terms.art6.providers.item3")}</li>
        <li>
          <Trans i18nKey="legal.terms.art6.providers.item4">
            La liste des prestataires de paiement actuellement utilisés est disponible sur demande à <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>
          </Trans>
        </li>
      </ul>
      <h3>{t("legal.terms.art6.payments.title")}</h3>
      <ul>
        <li>{t("legal.terms.art6.payments.item1")}</li>
        <li>{t("legal.terms.art6.payments.item2")}</li>
        <li>{t("legal.terms.art6.payments.item3")}</li>
      </ul>
      <h3>{t("legal.terms.art6.boosts.title")}</h3>
      <ul>
        <li>{t("legal.terms.art6.boosts.item1")}</li>
        <li>{t("legal.terms.art6.boosts.item2")}</li>
        <li>{t("legal.terms.art6.boosts.item3")}</li>
      </ul>
      <h3>{t("legal.terms.art6.refunds.title")}</h3>
      <ul>
        <li>{t("legal.terms.art6.refunds.item1")}</li>
        <li>{t("legal.terms.art6.refunds.item2")}</li>
        <li>{t("legal.terms.art6.refunds.item3")}</li>
      </ul>
      <h3>{t("legal.terms.art6.promo.title")}</h3>
      <ul>
        <li>{t("legal.terms.art6.promo.item1")}</li>
        <li>{t("legal.terms.art6.promo.item2")}</li>
        <li>{t("legal.terms.art6.promo.item3")}</li>
      </ul>
      <h3>{t("legal.terms.art6.invoices.title")}</h3>
      <ul>
        <li>
          <Trans i18nKey="legal.terms.art6.invoices.item1">
            Les factures sont émises sur demande à <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>, dans un délai de 15 jours ouvrés
          </Trans>
        </li>
        <li>{t("legal.terms.art6.invoices.item2")}</li>
      </ul>

      <h2>{t("legal.terms.art7.title")}</h2>
      <h3>{t("legal.terms.art7.right.title")}</h3>
      <ul>
        <li>{t("legal.terms.art7.right.item1")}</li>
        <li>{t("legal.terms.art7.right.item2")}</li>
        <li>{t("legal.terms.art7.right.item3")}</li>
      </ul>
      <h3>{t("legal.terms.art7.reasons.title")}</h3>
      <ul>
        <li>{t("legal.terms.art7.reasons.item1")}</li>
        <li>{t("legal.terms.art7.reasons.item2")}</li>
        <li>{t("legal.terms.art7.reasons.item3")}</li>
        <li>{t("legal.terms.art7.reasons.item4")}</li>
        <li>{t("legal.terms.art7.reasons.item5")}</li>
      </ul>
      <h3>{t("legal.terms.art7.process.title")}</h3>
      <ul>
        <li>{t("legal.terms.art7.process.item1")}</li>
        <li>{t("legal.terms.art7.process.item2")}</li>
        <li>{t("legal.terms.art7.process.item3")}</li>
      </ul>
      <h3>{t("legal.terms.art7.abuse.title")}</h3>
      <p>{t("legal.terms.art7.abuse.body")}</p>

      <h2>{t("legal.terms.art8.title")}</h2>
      <h3>{t("legal.terms.art8.role.title")}</h3>
      <ul>
        <li>{t("legal.terms.art8.role.item1")}</li>
        <li>{t("legal.terms.art8.role.item2")}</li>
        <li>{t("legal.terms.art8.role.item3")}
          <ul>
            <li>{t("legal.terms.art8.role.sub1")}</li>
            <li>{t("legal.terms.art8.role.sub2")}</li>
            <li>{t("legal.terms.art8.role.sub3")}</li>
            <li>{t("legal.terms.art8.role.sub4")}</li>
          </ul>
        </li>
      </ul>
      <h3>{t("legal.terms.art8.users.title")}</h3>
      <p>{t("legal.terms.art8.users.intro")}</p>
      <ul>
        <li>{t("legal.terms.art8.users.item1")}</li>
        <li>{t("legal.terms.art8.users.item2")}</li>
        <li>{t("legal.terms.art8.users.item3")}</li>
        <li>{t("legal.terms.art8.users.item4")}</li>
      </ul>
      <h3>{t("legal.terms.art8.safety.title")}</h3>
      <p>{t("legal.terms.art8.safety.intro")}</p>
      <ul>
        <li>{t("legal.terms.art8.safety.item1")}</li>
        <li>{t("legal.terms.art8.safety.item2")}</li>
        <li>{t("legal.terms.art8.safety.item3")}</li>
        <li>{t("legal.terms.art8.safety.item4")}</li>
        <li>{t("legal.terms.art8.safety.item5")}</li>
        <li>{t("legal.terms.art8.safety.item6")}</li>
        <li>{t("legal.terms.art8.safety.item7")}</li>
      </ul>
      <h3>{t("legal.terms.art8.limit.title")}</h3>
      <ul>
        <li>{t("legal.terms.art8.limit.item1")}</li>
        <li>{t("legal.terms.art8.limit.item2")}</li>
      </ul>

      <h2>{t("legal.terms.art9.title")}</h2>
      <h3>{t("legal.terms.art9.autonex.title")}</h3>
      <ul>
        <li>{t("legal.terms.art9.autonex.item1")}</li>
        <li>{t("legal.terms.art9.autonex.item2")}</li>
      </ul>
      <h3>{t("legal.terms.art9.user.title")}</h3>
      <ul>
        <li>{t("legal.terms.art9.user.item1")}</li>
        <li>{t("legal.terms.art9.user.item2")}</li>
        <li>{t("legal.terms.art9.user.item3")}</li>
      </ul>

      <h2>{t("legal.terms.art10.title")}</h2>
      <p>
        <Trans i18nKey="legal.terms.art10.body">
          La collecte et le traitement des données personnelles sont régis par la{" "}
          <Link to="/legal/confidentialite" className="text-primary hover:underline">Politique de Confidentialité</Link>.
        </Trans>
      </p>

      <h2>{t("legal.terms.art11.title")}</h2>
      <h3>{t("legal.terms.art11.duration.title")}</h3>
      <p>{t("legal.terms.art11.duration.body")}</p>
      <h3>{t("legal.terms.art11.userExit.title")}</h3>
      <ul>
        <li>
          <Trans i18nKey="legal.terms.art11.userExit.item1">
            L'utilisateur peut supprimer son compte à tout moment depuis son espace personnel (fonctionnalité en cours de
            déploiement — entretemps, demande par email à <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>)
          </Trans>
        </li>
        <li>{t("legal.terms.art11.userExit.item2")}</li>
      </ul>
      <h3>{t("legal.terms.art11.platformExit.title")}</h3>
      <ul>
        <li>{t("legal.terms.art11.platformExit.item1")}</li>
        <li>{t("legal.terms.art11.platformExit.item2")}</li>
        <li>{t("legal.terms.art11.platformExit.item3")}</li>
      </ul>

      <h2>{t("legal.terms.art12.title")}</h2>
      <p>{t("legal.terms.art12.body")}</p>

      <h2>{t("legal.terms.art13.title")}</h2>
      <h3>{t("legal.terms.art13.mediation.title")}</h3>
      <ul>
        <li>{t("legal.terms.art13.mediation.item1")}</li>
        <li>
          <Trans i18nKey="legal.terms.art13.mediation.item2">
            Contact initial : <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>
          </Trans>
        </li>
      </ul>
      <h3>{t("legal.terms.art13.law.title")}</h3>
      <p>{t("legal.terms.art13.law.body")}</p>
      <h3>{t("legal.terms.art13.jurisdiction.title")}</h3>
      <p>{t("legal.terms.art13.jurisdiction.body")}</p>

      <h2>{t("legal.terms.art14.title")}</h2>
      <p>
        <Trans i18nKey="legal.terms.art14.body">
          Pour toute question relative aux présentes CGU :{" "}
          <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>
        </Trans>
      </p>
    </LegalLayout>
  );
}
