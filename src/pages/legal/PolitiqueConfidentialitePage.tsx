import { Link } from "react-router-dom";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalLayout
      title="Politique de confidentialité — AutoNex"
      description="Politique de confidentialité AutoNex : données collectées, finalités, base légale, destinataires, durées de conservation, droits des utilisateurs (RGPD + loi malgache 2014-038)."
      canonicalPath="/legal/confidentialite"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <h1>Politique de confidentialité</h1>

      <h2>Cadre légal applicable</h2>
      <ul>
        <li>Règlement Général sur la Protection des Données (RGPD) — applicable aux utilisateurs situés dans l'Union Européenne</li>
        <li>Loi malgache n°2014-038 du 9 janvier 2015 sur la protection des données à caractère personnel</li>
        <li>Loi malgache n°2014-025 sur la cybercriminalité</li>
      </ul>

      <h2>1. Responsable du traitement</h2>
      <ul>
        <li>APLi SARLU (identifiants complets en <Link to="/legal/mentions" className="text-primary hover:underline">Mentions légales</Link>)</li>
        <li>
          Délégué à la Protection des Données (DPO) : PIRBAY Ali As —{" "}
          <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>
        </li>
      </ul>

      <h2>2. Données collectées et finalités</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Données</th>
              <th>Finalité</th>
              <th>Base légale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Compte utilisateur</td>
              <td>Nom, prénom, email, téléphone WhatsApp, mot de passe (haché avec bcrypt)</td>
              <td>Fourniture du service marketplace, authentification</td>
              <td>Exécution du contrat</td>
            </tr>
            <tr>
              <td>Annonces</td>
              <td>Photos véhicule, description, prix, localisation GPS approximative, caractéristiques techniques</td>
              <td>Publication et diffusion des annonces</td>
              <td>Exécution du contrat</td>
            </tr>
            <tr>
              <td>Transactions</td>
              <td>IDs de transactions anonymisés, historique crédits AutoNex, statut publications boostées</td>
              <td>Facturation, historique utilisateur</td>
              <td>Exécution du contrat + Obligation légale (conservation comptable)</td>
            </tr>
            <tr>
              <td>Données de connexion</td>
              <td>Adresse IP, user-agent, logs de session</td>
              <td>Sécurité, prévention de la fraude, détection de bot</td>
              <td>Intérêt légitime</td>
            </tr>
            <tr>
              <td>Cookies et analytics</td>
              <td>Voir section "Cookies"</td>
              <td>Amélioration du service, statistiques anonymisées</td>
              <td>Consentement (analytics) / Intérêt légitime (techniques)</td>
            </tr>
            <tr>
              <td>Monitoring technique</td>
              <td>Logs d'erreurs, stack traces, user-agent, session ID (via Sentry)</td>
              <td>Détection et correction des bugs</td>
              <td>Intérêt légitime</td>
            </tr>
            <tr>
              <td>Modération et signalements</td>
              <td>Raisons de signalement, identifiant du signalant, décisions admin</td>
              <td>Prévention des fraudes, qualité de la plateforme</td>
              <td>Intérêt légitime + Obligation légale (conservation audit logs)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3. Données NON collectées</h2>
      <p>AutoNex ne stocke AUCUNE donnée bancaire sensible :</p>
      <ul>
        <li>Numéros de cartes bancaires</li>
        <li>Cryptogrammes visuels (CVV)</li>
        <li>Identifiants complets de comptes mobile money</li>
        <li>Codes secrets, mots de passe tiers</li>
      </ul>
      <p>
        Toutes les données de paiement sont traitées exclusivement par les prestataires de paiement tiers agréés (voir section
        "Destinataires"). Seuls les identifiants de transaction anonymisés et le statut (succès/échec) sont conservés.
      </p>

      <h2>4. Destinataires des données</h2>
      <h3>Personnel interne AutoNex</h3>
      <ul>
        <li>Gérant unique : PIRBAY Ali As (accès complet en qualité de DPO)</li>
        <li>Administrateurs désignés : accès aux données strictement nécessaires à leurs missions (modération, support)</li>
      </ul>
      <h3>Sous-traitants (responsables de traitement indépendants)</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Sous-traitant</th>
              <th>Finalité</th>
              <th>Données traitées</th>
              <th>Pays d'hébergement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase Inc.</td>
              <td>Hébergement base de données, authentification</td>
              <td>Ensemble des données utilisateurs, annonces, transactions</td>
              <td>Singapour</td>
            </tr>
            <tr>
              <td>Vercel Inc.</td>
              <td>Hébergement application web</td>
              <td>Logs techniques, cookies de session anonymes</td>
              <td>États-Unis</td>
            </tr>
            <tr>
              <td>Sentry</td>
              <td>Monitoring d'erreurs</td>
              <td>Logs d'erreurs, stack traces, user-agent, session ID anonymisé</td>
              <td>États-Unis</td>
            </tr>
            <tr>
              <td>Google LLC (Google Analytics 4)</td>
              <td>Statistiques d'usage</td>
              <td>IP tronquée (anonymisation activée), session analytics agrégées</td>
              <td>États-Unis</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Envoi emails transactionnels (formulaire contact)</td>
              <td>Nom, email, message de contact</td>
              <td>États-Unis</td>
            </tr>
            <tr>
              <td>Prestataire de paiement</td>
              <td>Traitement des paiements en ligne</td>
              <td>Données de paiement (hors AutoNex)</td>
              <td>Variable selon le prestataire</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>5. Transferts hors de Madagascar</h2>
      <p>
        Certains sous-traitants étant situés hors de Madagascar (États-Unis, Singapour), des transferts de données personnelles
        vers ces pays peuvent avoir lieu. Ces transferts sont encadrés par :
      </p>
      <ul>
        <li>Les Clauses Contractuelles Types (CCT) publiées par la Commission européenne (pour les utilisateurs UE)</li>
        <li>
          Les conditions contractuelles des sous-traitants, conformes aux standards internationaux de protection des données
        </li>
      </ul>

      <h2>6. Durées de conservation</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Compte utilisateur actif</td><td>Durée de vie du compte</td></tr>
            <tr><td>Compte utilisateur inactif</td><td>3 ans après dernière connexion, puis suppression automatique ou anonymisation</td></tr>
            <tr><td>Annonces actives</td><td>Durée de publication + 30 jours (pour les annonces expirées)</td></tr>
            <tr><td>Annonces archivées</td><td>12 mois puis suppression</td></tr>
            <tr><td>Logs techniques (IP, user-agent)</td><td>12 mois glissants</td></tr>
            <tr><td>Logs d'audit admin</td><td>5 ans (obligation comptable et traçabilité)</td></tr>
            <tr><td>Données de transactions</td><td>10 ans (obligation légale comptable et fiscale)</td></tr>
            <tr><td>Cookies analytics</td><td>13 mois maximum</td></tr>
            <tr><td>Messages de contact (contact_messages)</td><td>3 ans après dernière interaction</td></tr>
          </tbody>
        </table>
      </div>

      <h2>7. Droits des utilisateurs</h2>
      <p>Conformément au RGPD et à la loi malgache 2014-038, tout utilisateur dispose des droits suivants :</p>
      <ul>
        <li><strong>Droit d'accès</strong> : obtenir une copie des données le concernant</li>
        <li><strong>Droit de rectification</strong> : corriger des données inexactes ou incomplètes</li>
        <li><strong>Droit à l'effacement</strong> ("droit à l'oubli") : demander la suppression de ses données</li>
        <li><strong>Droit à la portabilité</strong> : recevoir ses données dans un format structuré, couramment utilisé et lisible par machine</li>
        <li><strong>Droit d'opposition</strong> : s'opposer au traitement pour motif légitime</li>
        <li><strong>Droit à la limitation</strong> : demander la limitation temporaire du traitement</li>
        <li><strong>Droit de retrait du consentement</strong> : à tout moment pour les traitements basés sur le consentement</li>
        <li><strong>Droit de ne pas faire l'objet d'une décision automatisée</strong> : AutoNex n'utilise actuellement aucun traitement automatisé avec effet juridique sur les utilisateurs</li>
      </ul>
      <h3>Procédure pour exercer ces droits</h3>
      <ul>
        <li>Email : <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a> avec copie d'une pièce d'identité en cours de validité</li>
        <li>Délai de réponse : 30 jours maximum à compter de la réception de la demande complète</li>
        <li>Gratuité : sauf demandes manifestement infondées ou excessives</li>
      </ul>
      <h3>Recours</h3>
      <ul>
        <li>Utilisateurs malgaches : CMIL (Commission Malagasy Informatique et Libertés) — cmil.mg (si créée à date de consultation)</li>
        <li>Utilisateurs UE : CNIL (France) — cnil.fr — ou autorité de contrôle du pays de résidence</li>
      </ul>

      <h2>8. Sécurité des données</h2>
      <p>AutoNex met en œuvre les mesures techniques et organisationnelles suivantes :</p>
      <ul>
        <li>Chiffrement TLS 1.3 pour toutes les communications (HTTPS obligatoire)</li>
        <li>Hachage des mots de passe (algorithme bcrypt)</li>
        <li>Row Level Security (RLS) activée sur toutes les tables Supabase contenant des données personnelles</li>
        <li>Audit logs pour toutes les actions administrateur</li>
        <li>Rate limiting anti-bot (20 publications maximum par utilisateur sur 24h)</li>
        <li>Système de modération a priori (particuliers) et signalement communautaire avec auto-masquage</li>
        <li>Monitoring des erreurs en temps réel via Sentry</li>
        <li>Sauvegardes automatiques quotidiennes de la base de données (via Supabase)</li>
      </ul>

      <h2>9. Cookies</h2>
      <p>
        Voir la page dédiée <Link to="/legal/cookies" className="text-primary hover:underline">/legal/cookies</Link>.
      </p>

      <h2>10. Modifications</h2>
      <p>
        La présente politique peut être mise à jour pour refléter les évolutions de la plateforme ou des obligations légales. La
        date de dernière mise à jour est indiquée en pied de page. Les utilisateurs sont informés par email de toute modification
        substantielle.
      </p>
    </LegalLayout>
  );
}
