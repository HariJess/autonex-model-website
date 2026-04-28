import { Link } from "react-router-dom";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

export default function SuppressionDonneesPage() {
  return (
    <LegalLayout
      title="Suppression des données — AutoNex"
      description="Procédure de suppression du compte et des données personnelles sur AutoNex Madagascar : depuis le tableau de bord ou par email, conservation légale, révocation des connexions Google et Facebook."
      canonicalPath="/legal/suppression-donnees"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <h1>Suppression de vos données</h1>

      <p>
        AutoNex respecte votre droit à la suppression de vos données personnelles, conformément
        au Règlement général sur la protection des données (RGPD), à la loi malgache n°2014-038
        sur la protection des données à caractère personnel, et aux pratiques internationales.
      </p>

      <h2>1. Ce que la suppression implique</h2>
      <p>Quand vous demandez la suppression de votre compte, nous procédons aux actions suivantes :</p>
      <ul>
        <li>Suppression de votre profil utilisateur (nom, prénom, téléphone, email).</li>
        <li>Suppression de vos annonces publiées et de leurs photos.</li>
        <li>
          Suppression de votre solde de crédits restant, qui est non remboursable conformément
          aux <Link to="/legal/cgu" className="text-primary hover:underline">CGU</Link>.
        </li>
        <li>Suppression de votre historique de transactions et de messages côté front.</li>
        <li>Suppression des liaisons OAuth Google et Facebook.</li>
        <li>
          Anonymisation de vos avis et signalements éventuels (le contenu reste mais aucun
          identifiant ne pointe plus vers vous).
        </li>
      </ul>

      <h2>2. Ce qui peut être conservé</h2>
      <p>
        Pour des raisons légales, fiscales et comptables, certaines informations peuvent être
        conservées de manière anonymisée pendant la durée prévue par la loi malgache et
        européenne :
      </p>
      <ul>
        <li>
          Factures et reçus de paiement liés à l'achat de crédits AutoNex : conservation 10 ans
          (obligation comptable).
        </li>
        <li>
          Logs techniques anonymisés (adresses IP partielles, métadonnées de session) : 12 mois,
          pour la sécurité du service et la lutte contre la fraude.
        </li>
        <li>
          Identifiants techniques de transactions auprès de notre prestataire de paiement,
          conservés conformément à la réglementation bancaire applicable.
        </li>
      </ul>

      <h2>3. Comment demander la suppression</h2>

      <h3>3.1. Depuis votre tableau de bord (recommandé)</h3>
      <p>
        Connectez-vous à votre compte → menu Paramètres → section "Zone de danger" →{" "}
        <em>Supprimer mon compte</em>. Vous recevez un email de confirmation à l'adresse associée
        à votre compte. La suppression devient effective sous 7 jours après confirmation.
      </p>

      <h3>3.2. Par email</h3>
      <p>
        Envoyez un email à{" "}
        <a href="mailto:info@autonex.mg?subject=Demande%20de%20suppression%20de%20compte" className="text-primary hover:underline">
          info@autonex.mg
        </a>{" "}
        depuis l'adresse associée à votre compte AutoNex, avec pour objet{" "}
        <em>« Demande de suppression de compte »</em>. Indiquez votre email de connexion et,
        si possible, l'identifiant de votre compte (visible dans Paramètres &gt; Mon profil).
      </p>
      <p>
        Nous traitons les demandes par email sous 30 jours maximum (généralement sous 7 jours).
        Vous recevez une confirmation écrite une fois la suppression effective.
      </p>

      <h2>4. Suppression des connexions Google ou Facebook</h2>
      <p>
        Si vous vous êtes connecté(e) à AutoNex via Google ou Facebook, la suppression de votre
        compte AutoNex révoque automatiquement le lien entre votre compte tiers et notre service.
        Vous pouvez aussi révoquer ce lien à tout moment, indépendamment de la suppression de
        votre compte AutoNex :
      </p>
      <ul>
        <li>
          Google :{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            myaccount.google.com/permissions
          </a>
          {" "}→ rechercher AutoNex → <em>Supprimer l'accès</em>.
        </li>
        <li>
          Facebook : Paramètres &amp; confidentialité → Paramètres → Apps et sites web → AutoNex
          → <em>Supprimer</em>. Lien direct :{" "}
          <a
            href="https://www.facebook.com/settings?tab=applications"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            facebook.com/settings?tab=applications
          </a>
          .
        </li>
      </ul>
      <p>
        Cette révocation côté Google ou Facebook empêche AutoNex d'accéder à nouveau à ces
        données, mais ne supprime pas votre compte AutoNex existant — pour cela, suivez la
        section 3 ci-dessus.
      </p>

      <h2>5. Délai et confirmation</h2>
      <p>
        Le délai légal maximum de traitement est de 30 jours à compter de la réception de votre
        demande. En pratique, AutoNex traite les demandes sous 7 jours. Vous recevez une
        confirmation écrite par email une fois la suppression terminée.
      </p>

      <h2>6. Recours</h2>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez :
      </p>
      <ul>
        <li>
          Nous contacter à{" "}
          <a href="mailto:info@autonex.mg" className="text-primary hover:underline">
            info@autonex.mg
          </a>{" "}
          pour ouvrir une réclamation interne.
        </li>
        <li>
          Saisir la Commission Malgache de l'Informatique et des Libertés (CMIL) ou, pour les
          utilisateurs européens, la CNIL ou l'autorité de protection des données de votre pays
          de résidence.
        </li>
      </ul>

      <h2>7. Contact</h2>
      <p>
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
      </p>
    </LegalLayout>
  );
}
