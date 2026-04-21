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
  return (
    <LegalLayout
      title="Mentions légales — AutoNex"
      description="Mentions légales de la plateforme AutoNex, exploitée par APLi SARLU — éditeur, hébergeurs, propriété intellectuelle, responsabilité."
      canonicalPath="/legal/mentions"
      lastUpdated={LEGAL_LAST_UPDATED}
      jsonLd={jsonLd}
    >
      <h1>Mentions légales</h1>

      <h2>1. Éditeur du site</h2>
      <ul>
        <li>APLi SARLU (Société à Responsabilité Limitée Unipersonnelle)</li>
        <li>Capital social : 1 000 000 MGA</li>
        <li>RCS Antananarivo 2025 B 00769</li>
        <li>NIF : 4019287505</li>
        <li>Numéro Statistique : 62011 11 2025 0 10781</li>
        <li>Siège social : LOGT 51 CITE AMPEFILOHA CUA ANTANANARIVO I, 10101 Antananarivo Renivohitra, Analamanga, Madagascar</li>
        <li>Email : <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a></li>
        <li>Site exploité sous la marque commerciale "AutoNex"</li>
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p>PIRBAY Ali As, gérant unique d'APLi SARLU.</p>

      <h2>3. Hébergeurs</h2>
      <ul>
        <li>
          <strong>Application front-end</strong> : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA —{" "}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            vercel.com
          </a>
        </li>
        <li>
          <strong>Base de données et authentification</strong> : Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992 —{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            supabase.com
          </a>
        </li>
      </ul>

      <h2>4. Propriété intellectuelle</h2>
      <ul>
        <li>
          La marque "AutoNex" ainsi que le logo, l'identité visuelle et l'ensemble des contenus éditoriaux originaux publiés sur le
          site sont la propriété exclusive d'APLi SARLU.
        </li>
        <li>
          Les annonces publiées sur la plateforme restent la propriété de leurs auteurs respectifs qui concèdent à AutoNex une
          licence non-exclusive pour leur affichage public dans le cadre du service (voir article 9 des CGU).
        </li>
        <li>
          Toute reproduction, diffusion ou exploitation non autorisée des contenus protégés est strictement interdite et
          susceptible de poursuites.
        </li>
      </ul>

      <h2>5. Responsabilité du contenu des annonces</h2>
      <ul>
        <li>AutoNex agit en qualité d'intermédiaire technique.</li>
        <li>
          Les annonces publiées le sont sous la responsabilité exclusive de leurs auteurs (particuliers ou concessionnaires).
        </li>
        <li>
          AutoNex ne peut être tenu responsable de l'exactitude, de la complétude ou de la légalité des informations publiées par
          les utilisateurs.
        </li>
        <li>
          Un système de modération a priori (pour les particuliers) et de signalement communautaire est en place pour préserver la
          qualité de la plateforme.
        </li>
      </ul>

      <h2>6. Liens hypertextes</h2>
      <ul>
        <li>Les liens sortants vers des sites tiers sont proposés à titre informatif.</li>
        <li>
          AutoNex n'exerce aucun contrôle sur le contenu de ces sites et décline toute responsabilité quant à leur contenu.
        </li>
        <li>
          Les liens entrants vers le site autonex.mg sont autorisés à condition de ne pas créer de confusion sur l'origine ou la
          nature du contenu.
        </li>
      </ul>

      <h2>7. Crédits</h2>
      <ul>
        <li>Photos et visuels d'annonces : fournis par les utilisateurs ayant attesté détenir les droits nécessaires.</li>
        <li>Icônes et composants UI : shadcn/ui, lucide-react (licences open source).</li>
      </ul>

      <h2>8. Loi applicable et juridiction compétente</h2>
      <ul>
        <li>Les présentes Mentions légales sont régies par le droit malgache.</li>
        <li>
          Tout litige relatif à l'interprétation ou l'exécution des présentes relève de la compétence exclusive du Tribunal de
          Première Instance d'Antananarivo, sous réserve des règles impératives de procédure.
        </li>
      </ul>
    </LegalLayout>
  );
}
