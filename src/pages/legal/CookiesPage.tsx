import { useTranslation } from "react-i18next";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { Button } from "@/components/ui/button";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

export default function CookiesPage() {
  const { t } = useTranslation();
  const { openPreferences } = useCookieConsent();

  return (
    <LegalLayout
      title={t("legal.cookies.pageTitle")}
      description={t("legal.cookies.pageDescription")}
      canonicalPath="/legal/cookies"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <h1>{t("legal.cookies.heading")}</h1>

      <h2>{t("legal.cookies.what.title")}</h2>
      <p>{t("legal.cookies.what.body")}</p>

      <h2>{t("legal.cookies.used.title")}</h2>

      <h3>{t("legal.cookies.technical.title")}</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>{t("legal.cookies.colCookie")}</th>
              <th>{t("legal.cookies.colPurpose")}</th>
              <th>{t("legal.cookies.colDuration")}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{t("legal.cookies.technical.row1Name")}</td><td>{t("legal.cookies.technical.row1Purpose")}</td><td>{t("legal.cookies.technical.row1Duration")}</td></tr>
            <tr><td>{t("legal.cookies.technical.row2Name")}</td><td>{t("legal.cookies.technical.row2Purpose")}</td><td>{t("legal.cookies.technical.row2Duration")}</td></tr>
            <tr><td>{t("legal.cookies.technical.row3Name")}</td><td>{t("legal.cookies.technical.row3Purpose")}</td><td>{t("legal.cookies.technical.row3Duration")}</td></tr>
          </tbody>
        </table>
      </div>
      <p>{t("legal.cookies.technical.note")}</p>

      <h3>{t("legal.cookies.analytics.title")}</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>{t("legal.cookies.colCookie")}</th>
              <th>{t("legal.cookies.colPurpose")}</th>
              <th>{t("legal.cookies.colDuration")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Google Analytics 4 (<code>_ga</code>, <code>_ga_*</code>)</td>
              <td>{t("legal.cookies.analytics.row1Purpose")}</td>
              <td>{t("legal.cookies.analytics.row1Duration")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>{t("legal.cookies.analytics.note")}</p>

      <h3>{t("legal.cookies.functional.title")}</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>{t("legal.cookies.colCookie")}</th>
              <th>{t("legal.cookies.colPurpose")}</th>
              <th>{t("legal.cookies.colDuration")}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{t("legal.cookies.functional.row1Name")}</td><td>{t("legal.cookies.functional.row1Purpose")}</td><td>{t("legal.cookies.functional.row1Duration")}</td></tr>
          </tbody>
        </table>
      </div>

      <h3>{t("legal.cookies.monitoring.title")}</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>{t("legal.cookies.colCookie")}</th>
              <th>{t("legal.cookies.colPurpose")}</th>
              <th>{t("legal.cookies.colDuration")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sentry session replay</td>
              <td>{t("legal.cookies.monitoring.row1Purpose")}</td>
              <td>{t("legal.cookies.monitoring.row1Duration")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>{t("legal.cookies.management.title")}</h2>
      <ul>
        <li>{t("legal.cookies.management.item1")}</li>
        <li>{t("legal.cookies.management.item2")}</li>
        <li>{t("legal.cookies.management.item3")}</li>
        <li>{t("legal.cookies.management.item4")}</li>
      </ul>

      <div className="not-prose flex justify-center py-2">
        <Button type="button" variant="outline" onClick={openPreferences} className="font-sans">
          {t("legal.cookies.managePreferencesButton")}
        </Button>
      </div>

      <h2>{t("legal.cookies.thirdParty.title")}</h2>
      <ul>
        <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">policies.google.com/privacy</a></li>
        <li><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vercel.com/legal/privacy-policy</a></li>
        <li><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/privacy</a></li>
        <li><a href="https://sentry.io/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">sentry.io/privacy</a></li>
      </ul>
    </LegalLayout>
  );
}
