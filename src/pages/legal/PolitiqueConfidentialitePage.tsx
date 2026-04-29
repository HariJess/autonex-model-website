import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

export default function PolitiqueConfidentialitePage() {
  const { t } = useTranslation();
  return (
    <LegalLayout
      title={t("legal.privacy.pageTitle")}
      description={t("legal.privacy.pageDescription")}
      canonicalPath="/legal/confidentialite"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <h1>{t("legal.privacy.heading")}</h1>

      <h2>{t("legal.privacy.framework.title")}</h2>
      <ul>
        <li>{t("legal.privacy.framework.item1")}</li>
        <li>{t("legal.privacy.framework.item2")}</li>
        <li>{t("legal.privacy.framework.item3")}</li>
      </ul>

      <h2>{t("legal.privacy.controller.title")}</h2>
      <ul>
        <li>
          <Trans i18nKey="legal.privacy.controller.item1">
            APLi SARLU (identifiants complets en <Link to="/legal/mentions" className="text-primary hover:underline">Mentions légales</Link>)
          </Trans>
        </li>
        <li>
          <Trans i18nKey="legal.privacy.controller.item2">
            Délégué à la Protection des Données (DPO) : PIRBAY Ali As —{" "}
            <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>
          </Trans>
        </li>
      </ul>

      <h2>{t("legal.privacy.data.title")}</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>{t("legal.privacy.data.colCategory")}</th>
              <th>{t("legal.privacy.data.colData")}</th>
              <th>{t("legal.privacy.data.colPurpose")}</th>
              <th>{t("legal.privacy.data.colBasis")}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{t("legal.privacy.data.row1Cat")}</td><td>{t("legal.privacy.data.row1Data")}</td><td>{t("legal.privacy.data.row1Purpose")}</td><td>{t("legal.privacy.data.row1Basis")}</td></tr>
            <tr><td>{t("legal.privacy.data.row2Cat")}</td><td>{t("legal.privacy.data.row2Data")}</td><td>{t("legal.privacy.data.row2Purpose")}</td><td>{t("legal.privacy.data.row2Basis")}</td></tr>
            <tr><td>{t("legal.privacy.data.row3Cat")}</td><td>{t("legal.privacy.data.row3Data")}</td><td>{t("legal.privacy.data.row3Purpose")}</td><td>{t("legal.privacy.data.row3Basis")}</td></tr>
            <tr><td>{t("legal.privacy.data.row4Cat")}</td><td>{t("legal.privacy.data.row4Data")}</td><td>{t("legal.privacy.data.row4Purpose")}</td><td>{t("legal.privacy.data.row4Basis")}</td></tr>
            <tr><td>{t("legal.privacy.data.row5Cat")}</td><td>{t("legal.privacy.data.row5Data")}</td><td>{t("legal.privacy.data.row5Purpose")}</td><td>{t("legal.privacy.data.row5Basis")}</td></tr>
            <tr><td>{t("legal.privacy.data.row6Cat")}</td><td>{t("legal.privacy.data.row6Data")}</td><td>{t("legal.privacy.data.row6Purpose")}</td><td>{t("legal.privacy.data.row6Basis")}</td></tr>
            <tr><td>{t("legal.privacy.data.row7Cat")}</td><td>{t("legal.privacy.data.row7Data")}</td><td>{t("legal.privacy.data.row7Purpose")}</td><td>{t("legal.privacy.data.row7Basis")}</td></tr>
          </tbody>
        </table>
      </div>

      <h2>{t("legal.privacy.notCollected.title")}</h2>
      <p>{t("legal.privacy.notCollected.intro")}</p>
      <ul>
        <li>{t("legal.privacy.notCollected.item1")}</li>
        <li>{t("legal.privacy.notCollected.item2")}</li>
        <li>{t("legal.privacy.notCollected.item3")}</li>
        <li>{t("legal.privacy.notCollected.item4")}</li>
      </ul>
      <p>{t("legal.privacy.notCollected.note")}</p>

      <h2>{t("legal.privacy.recipients.title")}</h2>
      <h3>{t("legal.privacy.recipients.staff.title")}</h3>
      <ul>
        <li>{t("legal.privacy.recipients.staff.item1")}</li>
        <li>{t("legal.privacy.recipients.staff.item2")}</li>
      </ul>
      <h3>{t("legal.privacy.recipients.processors.title")}</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>{t("legal.privacy.recipients.colProcessor")}</th>
              <th>{t("legal.privacy.recipients.colPurpose")}</th>
              <th>{t("legal.privacy.recipients.colData")}</th>
              <th>{t("legal.privacy.recipients.colCountry")}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Supabase Inc.</td><td>{t("legal.privacy.recipients.row1Purpose")}</td><td>{t("legal.privacy.recipients.row1Data")}</td><td>Singapour</td></tr>
            <tr><td>Vercel Inc.</td><td>{t("legal.privacy.recipients.row2Purpose")}</td><td>{t("legal.privacy.recipients.row2Data")}</td><td>États-Unis</td></tr>
            <tr><td>Sentry</td><td>{t("legal.privacy.recipients.row3Purpose")}</td><td>{t("legal.privacy.recipients.row3Data")}</td><td>États-Unis</td></tr>
            <tr><td>Google LLC (Google Analytics 4)</td><td>{t("legal.privacy.recipients.row4Purpose")}</td><td>{t("legal.privacy.recipients.row4Data")}</td><td>États-Unis</td></tr>
            <tr><td>Resend</td><td>{t("legal.privacy.recipients.row5Purpose")}</td><td>{t("legal.privacy.recipients.row5Data")}</td><td>États-Unis</td></tr>
            <tr><td>{t("legal.privacy.recipients.row6Processor")}</td><td>{t("legal.privacy.recipients.row6Purpose")}</td><td>{t("legal.privacy.recipients.row6Data")}</td><td>{t("legal.privacy.recipients.row6Country")}</td></tr>
          </tbody>
        </table>
      </div>

      <h2>{t("legal.privacy.transfers.title")}</h2>
      <p>{t("legal.privacy.transfers.intro")}</p>
      <ul>
        <li>{t("legal.privacy.transfers.item1")}</li>
        <li>{t("legal.privacy.transfers.item2")}</li>
      </ul>

      <h2>{t("legal.privacy.retention.title")}</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>{t("legal.privacy.retention.colCategory")}</th>
              <th>{t("legal.privacy.retention.colDuration")}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{t("legal.privacy.retention.row1Cat")}</td><td>{t("legal.privacy.retention.row1Duration")}</td></tr>
            <tr><td>{t("legal.privacy.retention.row2Cat")}</td><td>{t("legal.privacy.retention.row2Duration")}</td></tr>
            <tr><td>{t("legal.privacy.retention.row3Cat")}</td><td>{t("legal.privacy.retention.row3Duration")}</td></tr>
            <tr><td>{t("legal.privacy.retention.row4Cat")}</td><td>{t("legal.privacy.retention.row4Duration")}</td></tr>
            <tr><td>{t("legal.privacy.retention.row5Cat")}</td><td>{t("legal.privacy.retention.row5Duration")}</td></tr>
            <tr><td>{t("legal.privacy.retention.row6Cat")}</td><td>{t("legal.privacy.retention.row6Duration")}</td></tr>
            <tr><td>{t("legal.privacy.retention.row7Cat")}</td><td>{t("legal.privacy.retention.row7Duration")}</td></tr>
            <tr><td>{t("legal.privacy.retention.row8Cat")}</td><td>{t("legal.privacy.retention.row8Duration")}</td></tr>
            <tr><td>{t("legal.privacy.retention.row9Cat")}</td><td>{t("legal.privacy.retention.row9Duration")}</td></tr>
          </tbody>
        </table>
      </div>

      <h2>{t("legal.privacy.rights.title")}</h2>
      <p>{t("legal.privacy.rights.intro")}</p>
      <ul>
        <li><strong>{t("legal.privacy.rights.access.label")}</strong> {t("legal.privacy.rights.access.desc")}</li>
        <li><strong>{t("legal.privacy.rights.rectify.label")}</strong> {t("legal.privacy.rights.rectify.desc")}</li>
        <li><strong>{t("legal.privacy.rights.erasure.label")}</strong> {t("legal.privacy.rights.erasure.desc")}</li>
        <li><strong>{t("legal.privacy.rights.portability.label")}</strong> {t("legal.privacy.rights.portability.desc")}</li>
        <li><strong>{t("legal.privacy.rights.object.label")}</strong> {t("legal.privacy.rights.object.desc")}</li>
        <li><strong>{t("legal.privacy.rights.limitation.label")}</strong> {t("legal.privacy.rights.limitation.desc")}</li>
        <li><strong>{t("legal.privacy.rights.withdraw.label")}</strong> {t("legal.privacy.rights.withdraw.desc")}</li>
        <li><strong>{t("legal.privacy.rights.automated.label")}</strong> {t("legal.privacy.rights.automated.desc")}</li>
      </ul>
      <h3>{t("legal.privacy.rights.procedure.title")}</h3>
      <ul>
        <li>
          <Trans i18nKey="legal.privacy.rights.procedure.item1">
            Email : <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a> avec copie d'une pièce d'identité en cours de validité
          </Trans>
        </li>
        <li>{t("legal.privacy.rights.procedure.item2")}</li>
        <li>{t("legal.privacy.rights.procedure.item3")}</li>
      </ul>
      <h3>{t("legal.privacy.rights.recourse.title")}</h3>
      <ul>
        <li>{t("legal.privacy.rights.recourse.item1")}</li>
        <li>{t("legal.privacy.rights.recourse.item2")}</li>
      </ul>

      <h2>{t("legal.privacy.security.title")}</h2>
      <p>{t("legal.privacy.security.intro")}</p>
      <ul>
        <li>{t("legal.privacy.security.item1")}</li>
        <li>{t("legal.privacy.security.item2")}</li>
        <li>{t("legal.privacy.security.item3")}</li>
        <li>{t("legal.privacy.security.item4")}</li>
        <li>{t("legal.privacy.security.item5")}</li>
        <li>{t("legal.privacy.security.item6")}</li>
        <li>{t("legal.privacy.security.item7")}</li>
        <li>{t("legal.privacy.security.item8")}</li>
      </ul>

      <h2>{t("legal.privacy.cookies.title")}</h2>
      <p>
        <Trans i18nKey="legal.privacy.cookies.body">
          Voir la page dédiée <Link to="/legal/cookies" className="text-primary hover:underline">/legal/cookies</Link>.
        </Trans>
      </p>

      <h2>{t("legal.privacy.changes.title")}</h2>
      <p>{t("legal.privacy.changes.body")}</p>
    </LegalLayout>
  );
}
