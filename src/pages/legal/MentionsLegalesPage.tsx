import { useTranslation, Trans } from "react-i18next";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "APLi SARLU",
  alternateName: "AutoNex",
  legalName: "APLi",
  url: "https://autonex.mg",
  email: "info@autonex.mg",
  address: {
    "@type": "PostalAddress",
    streetAddress: "LOGT 51 CITE AMPEFILOHA CUA ANTANANARIVO I",
    postalCode: "10101",
    addressLocality: "Antananarivo Renivohitra",
    addressRegion: "Analamanga",
    addressCountry: "MG",
  },
};

export default function MentionsLegalesPage() {
  const { t } = useTranslation();
  return (
    <LegalLayout
      title={t("legal.mentions.pageTitle")}
      description={t("legal.mentions.pageDescription")}
      canonicalPath="/legal/mentions"
      lastUpdated={LEGAL_LAST_UPDATED}
      jsonLd={jsonLd}
    >
      <h1>{t("legal.mentions.heading")}</h1>

      <h2>{t("legal.mentions.editor.title")}</h2>
      <ul>
        <li>{t("legal.mentions.editor.item1")}</li>
        <li>{t("legal.mentions.editor.item2")}</li>
        <li>RCS Antananarivo 2025 B 00769</li>
        <li>NIF : 4019287505</li>
        <li>Numéro Statistique : 62011 11 2025 0 10781</li>
        <li>{t("legal.mentions.editor.address")}</li>
        <li>
          Email : <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>
        </li>
        <li>{t("legal.mentions.editor.brand")}</li>
      </ul>

      <h2>{t("legal.mentions.publisher.title")}</h2>
      <p>{t("legal.mentions.publisher.body")}</p>

      <h2>{t("legal.mentions.hosting.title")}</h2>
      <ul>
        <li>
          <Trans i18nKey="legal.mentions.hosting.frontend">
            <strong>Application front-end</strong> : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA —{" "}
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              vercel.com
            </a>
          </Trans>
        </li>
        <li>
          <Trans i18nKey="legal.mentions.hosting.database">
            <strong>Base de données et authentification</strong> : Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992 —{" "}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              supabase.com
            </a>
          </Trans>
        </li>
      </ul>

      <h2>{t("legal.mentions.ip.title")}</h2>
      <ul>
        <li>{t("legal.mentions.ip.item1")}</li>
        <li>{t("legal.mentions.ip.item2")}</li>
        <li>{t("legal.mentions.ip.item3")}</li>
      </ul>

      <h2>{t("legal.mentions.responsibility.title")}</h2>
      <ul>
        <li>{t("legal.mentions.responsibility.item1")}</li>
        <li>{t("legal.mentions.responsibility.item2")}</li>
        <li>{t("legal.mentions.responsibility.item3")}</li>
        <li>{t("legal.mentions.responsibility.item4")}</li>
      </ul>

      <h2>{t("legal.mentions.links.title")}</h2>
      <ul>
        <li>{t("legal.mentions.links.item1")}</li>
        <li>{t("legal.mentions.links.item2")}</li>
        <li>{t("legal.mentions.links.item3")}</li>
      </ul>

      <h2>{t("legal.mentions.credits.title")}</h2>
      <ul>
        <li>{t("legal.mentions.credits.item1")}</li>
        <li>{t("legal.mentions.credits.item2")}</li>
      </ul>

      <h2>{t("legal.mentions.law.title")}</h2>
      <ul>
        <li>{t("legal.mentions.law.item1")}</li>
        <li>{t("legal.mentions.law.item2")}</li>
      </ul>
    </LegalLayout>
  );
}
