import { Link } from "react-router-dom";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

export default function CguPage() {
  return (
    <LegalLayout
      title="Conditions Générales d'Utilisation — AutoNex"
      description="CGU AutoNex : accès, inscription, publication d'annonces, crédits, signalements, responsabilités, résiliation, médiation. Marketplace véhicules Madagascar."
      canonicalPath="/legal/cgu"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <h1>Conditions Générales d'Utilisation</h1>

      <h2>Préambule</h2>
      <p>
        Les présentes Conditions Générales d'Utilisation (ci-après "CGU") régissent l'accès et l'utilisation de la plateforme
        AutoNex, exploitée par APLi SARLU, marketplace de véhicules à Madagascar.
      </p>
      <p>
        AutoNex est un <strong>intermédiaire technique</strong> qui met en relation des acheteurs et des vendeurs de véhicules
        (particuliers et concessionnaires). AutoNex n'est jamais partie aux transactions conclues entre utilisateurs.
      </p>

      <h2>Article 1 — Définitions</h2>
      <ul>
        <li><strong>Utilisateur</strong> : toute personne physique majeure utilisant la plateforme AutoNex, qu'elle soit inscrite ou non</li>
        <li><strong>Annonce / Listing</strong> : publication par un utilisateur décrivant un véhicule proposé à la vente ou à la location</li>
        <li><strong>Particulier</strong> : utilisateur publiant des annonces à titre non-professionnel</li>
        <li><strong>Concessionnaire vérifié</strong> : utilisateur professionnel ayant fourni les justificatifs nécessaires à la validation de son statut (voir article 4)</li>
        <li><strong>Crédits AutoNex</strong> : unité de valeur permettant d'accéder aux services payants (publication avancée, boosts)</li>
        <li><strong>Boost / Mise en avant</strong> : service payant permettant d'augmenter la visibilité d'une annonce</li>
        <li><strong>Signalement</strong> : action par laquelle un utilisateur signale une annonce qu'il estime problématique</li>
      </ul>

      <h2>Article 2 — Acceptation et modifications des CGU</h2>
      <ul>
        <li>L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU</li>
        <li>AutoNex se réserve le droit de modifier les CGU à tout moment</li>
        <li>Les modifications substantielles seront notifiées par email aux utilisateurs inscrits, avec un préavis de 15 jours</li>
        <li>En cas de désaccord avec les nouvelles CGU, l'utilisateur peut fermer son compte avant l'entrée en vigueur des modifications</li>
        <li>L'utilisation continue de la plateforme après l'entrée en vigueur vaut acceptation des nouvelles CGU</li>
      </ul>

      <h2>Article 3 — Inscription et compte utilisateur</h2>
      <h3>3.1 Conditions d'inscription</h3>
      <ul>
        <li>Être âgé d'au moins 18 ans</li>
        <li>Disposer de la capacité juridique</li>
        <li>Fournir des informations exactes, complètes et à jour</li>
        <li>Disposer d'une adresse email valide</li>
      </ul>
      <h3>3.2 Unicité du compte</h3>
      <p>Un utilisateur ne peut créer qu'un seul compte par personne physique.</p>
      <h3>3.3 Confidentialité des identifiants</h3>
      <ul>
        <li>L'utilisateur est seul responsable de la confidentialité de son mot de passe et des activités réalisées depuis son compte</li>
        <li>Toute utilisation suspecte doit être signalée immédiatement à <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a></li>
      </ul>
      <h3>3.4 Refus, suspension, suppression</h3>
      <p>
        AutoNex se réserve le droit de refuser une inscription, suspendre ou supprimer tout compte en cas de violation des CGU,
        sans préavis pour les infractions graves (fraude, contenu illégal).
      </p>

      <h2>Article 4 — Statut particulier vs concessionnaire</h2>
      <h3>4.1 Particulier</h3>
      <ul>
        <li>Publie à titre non-professionnel</li>
        <li>Soumis à modération a priori pour chaque nouvelle annonce</li>
        <li>Soumis à modération des modifications sur les champs sensibles (titre, description, prix, photos)</li>
      </ul>
      <h3>4.2 Concessionnaire vérifié</h3>
      <p>Statut accordé après validation par AutoNex des justificatifs suivants :</p>
      <ul>
        <li>NIF (Numéro d'Identification Fiscale) professionnel</li>
        <li>Numéro RCS ou document équivalent</li>
        <li>Pièce d'identité du représentant légal</li>
        <li>Justificatif de local professionnel (bail, titre de propriété, facture d'utilité)</li>
      </ul>
      <ul>
        <li>Bénéficie d'une modération allégée (publications et modifications en temps réel)</li>
        <li>Tenu aux mêmes règles de contenu que les particuliers</li>
      </ul>
      <h3>4.3 Révocation du statut dealer</h3>
      <p>
        En cas de violation répétée des CGU ou de pratiques frauduleuses, AutoNex peut révoquer le statut de concessionnaire
        vérifié et réappliquer la modération a priori.
      </p>

      <h2>Article 5 — Publication d'annonces</h2>
      <h3>5.1 Contenus autorisés</h3>
      <ul>
        <li>Véhicules légalement commercialisables à Madagascar</li>
        <li>Véhicules possédés par l'utilisateur ou pour lesquels l'utilisateur dispose d'un mandat de vente valide</li>
        <li>Véhicules disposant des papiers réguliers (carte grise, contrôle technique si applicable)</li>
      </ul>
      <h3>5.2 Contenus strictement interdits</h3>
      <ul>
        <li>Véhicules volés, sans papiers, ou dont l'origine ne peut être justifiée</li>
        <li>Fraudes, arnaques ou tentatives d'escroquerie</li>
        <li>Contenus discriminatoires, injurieux, diffamatoires ou illégaux</li>
        <li>Mentions incitant à des paiements par Western Union, MoneyGram, crypto-monnaies, virements internationaux non sécurisés</li>
        <li>Usurpation d'identité ou publication au nom d'un tiers sans autorisation</li>
        <li>Contenu protégé par le droit d'auteur sans autorisation</li>
        <li>Données personnelles de tiers sans leur consentement</li>
      </ul>
      <h3>5.3 Véracité des informations</h3>
      <ul>
        <li>L'utilisateur garantit l'exactitude des informations publiées</li>
        <li>Les sanctions en cas de fausses informations vont du retrait de l'annonce à la suppression du compte</li>
      </ul>
      <h3>5.4 Droits sur les photos</h3>
      <ul>
        <li>L'utilisateur garantit qu'il possède tous les droits (propriété, reproduction, diffusion) sur les photos publiées</li>
        <li>AutoNex décline toute responsabilité en cas de réclamation de tiers sur les photos publiées par les utilisateurs</li>
      </ul>
      <h3>5.5 Limites de publication</h3>
      <ul>
        <li>Maximum 20 nouvelles publications par utilisateur sur 24 heures glissantes</li>
        <li>Cette limite vise à prévenir le spam et les abus automatisés</li>
      </ul>
      <h3>5.6 Modération</h3>
      <ul>
        <li>AutoNex se réserve le droit, à sa seule discrétion, de refuser, modifier ou supprimer toute annonce contraire aux présentes CGU ou aux lois en vigueur</li>
        <li>Aucun préavis n'est requis pour les contenus manifestement illégaux ou dangereux</li>
        <li>Un message de rejet motivé est envoyé à l'utilisateur par email</li>
      </ul>

      <h2>Article 6 — Crédits AutoNex et services payants</h2>
      <h3>6.1 Mécanique des crédits</h3>
      <ul>
        <li>Les Crédits AutoNex sont une unité interne utilisable pour accéder aux services payants</li>
        <li>Les tarifs sont affichés dans l'espace "Monétisation" du site et peuvent évoluer</li>
      </ul>
      <h3>6.2 Prestataires de paiement</h3>
      <ul>
        <li>Les paiements sont traités par des prestataires tiers agréés à Madagascar</li>
        <li>AutoNex ne stocke AUCUNE donnée bancaire sensible : seuls les identifiants de transactions anonymisés sont conservés pour traçabilité</li>
        <li>Les transactions sont conformes aux normes de sécurité en vigueur (PCI-DSS pour les cartes bancaires)</li>
        <li>La liste des prestataires de paiement actuellement utilisés est disponible sur demande à <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a></li>
      </ul>
      <h3>6.3 Moyens de paiement acceptés</h3>
      <ul>
        <li>Mobile Money : MVola, Orange Money, Airtel Money</li>
        <li>Cartes bancaires : Visa, Mastercard</li>
        <li>D'autres moyens pourront être ajoutés à l'avenir</li>
      </ul>
      <h3>6.4 Boosts et mises en avant</h3>
      <ul>
        <li>Nature : augmentation de la visibilité d'une annonce (placement prioritaire, badge, épinglage homepage)</li>
        <li>Durée : variable selon le type de boost (affichée au moment de l'achat)</li>
        <li>Prix : affiché en Crédits AutoNex au moment de l'achat</li>
      </ul>
      <h3>6.5 Remboursements</h3>
      <ul>
        <li>Crédits AutoNex non consommés : remboursables sur demande dans un délai de 14 jours à compter de leur achat, à l'exception des crédits acquis via des codes promotionnels</li>
        <li>Crédits AutoNex déjà consommés : non remboursables sauf défaut de service imputable à AutoNex (exemples : panne prolongée de la plateforme, erreur technique d'activation)</li>
        <li>Procédure : email à info@autonex.mg avec justification et coordonnées de paiement</li>
      </ul>
      <h3>6.6 Codes promotionnels</h3>
      <ul>
        <li>Chaque code promo précise ses conditions d'usage (unicité, expiration, montant, catégorie applicable)</li>
        <li>Les codes promo ne sont pas remboursables en numéraire</li>
        <li>Un code promo est non-cumulable avec un autre code promo sauf mention contraire</li>
      </ul>
      <h3>6.7 Factures</h3>
      <ul>
        <li>Les factures sont émises sur demande à <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>, dans un délai de 15 jours ouvrés</li>
        <li>Factures conformes aux exigences fiscales malgaches</li>
      </ul>

      <h2>Article 7 — Signalement d'annonces</h2>
      <h3>7.1 Droit de signaler</h3>
      <ul>
        <li>Tout utilisateur authentifié peut signaler une annonce publiée par un autre utilisateur</li>
        <li>Les utilisateurs ne peuvent pas signaler leurs propres annonces</li>
        <li>Un utilisateur ne peut signaler qu'une seule fois une même annonce</li>
      </ul>
      <h3>7.2 Motifs de signalement</h3>
      <ul>
        <li>Arnaque / Fraude</li>
        <li>Contenu inapproprié</li>
        <li>Doublon d'annonce</li>
        <li>Prix aberrant</li>
        <li>Autre (avec justification obligatoire)</li>
      </ul>
      <h3>7.3 Traitement des signalements</h3>
      <ul>
        <li>Auto-masquage : lorsqu'une annonce atteint 3 signalements en attente, elle est automatiquement masquée en attente de révision administrateur</li>
        <li>Révision : l'équipe de modération traite les signalements dans les meilleurs délais</li>
        <li>Décision finale : valider (annonce rejetée) ou rejeter (annonce réactivée)</li>
      </ul>
      <h3>7.4 Abus de signalement</h3>
      <p>
        Les signalements abusifs (répétés, infondés, concurrence déloyale) peuvent entraîner des sanctions : avertissement,
        suspension temporaire, voire suppression du compte.
      </p>

      <h2>Article 8 — Responsabilités</h2>
      <h3>8.1 Rôle d'AutoNex</h3>
      <ul>
        <li>AutoNex est un intermédiaire technique, pas vendeur</li>
        <li>AutoNex ne conclut aucune transaction avec les utilisateurs</li>
        <li>AutoNex ne garantit pas :
          <ul>
            <li>L'exactitude des informations des annonces</li>
            <li>La solvabilité des utilisateurs</li>
            <li>Le bon déroulement des transactions</li>
            <li>La conformité légale des véhicules vendus</li>
          </ul>
        </li>
      </ul>
      <h3>8.2 Responsabilité des utilisateurs</h3>
      <p>Les utilisateurs sont seuls responsables :</p>
      <ul>
        <li>De la véracité de leurs annonces</li>
        <li>De la légalité des transactions qu'ils concluent</li>
        <li>De la fiscalité éventuellement due (TVA, droits d'importation, revente professionnelle)</li>
        <li>Du respect de la réglementation applicable aux véhicules concernés</li>
      </ul>
      <h3>8.3 Recommandations de sécurité</h3>
      <p>AutoNex recommande vivement aux utilisateurs :</p>
      <ul>
        <li>D'organiser les rencontres en lieu public et de préférence de jour</li>
        <li>D'exiger et de vérifier les documents officiels (carte grise, pièce d'identité) avant tout paiement</li>
        <li>De ne jamais payer avant d'avoir inspecté physiquement le véhicule</li>
        <li>De faire essayer le véhicule avant achat</li>
        <li>De faire réaliser un contrôle technique indépendant si nécessaire</li>
        <li>De se méfier des demandes de virements internationaux, mobile money vers l'étranger, ou cryptomonnaies</li>
        <li>De signaler toute annonce suspecte via le bouton "Signaler"</li>
      </ul>
      <h3>8.4 Limitation de responsabilité</h3>
      <ul>
        <li>
          Dans les limites autorisées par le droit malgache, la responsabilité d'AutoNex est limitée au montant des sommes
          effectivement perçues par AutoNex au titre des services fournis à l'utilisateur sur les 12 mois précédant le dommage
        </li>
        <li>Exclusions : préjudices indirects, pertes de profits, perte de chance, préjudices immatériels</li>
      </ul>

      <h2>Article 9 — Propriété intellectuelle</h2>
      <h3>9.1 Propriété d'AutoNex</h3>
      <ul>
        <li>Marque AutoNex, logo, design, contenus éditoriaux, code source sont la propriété exclusive d'APLi SARLU</li>
        <li>Toute reproduction non autorisée est interdite</li>
      </ul>
      <h3>9.2 Contenus utilisateurs</h3>
      <ul>
        <li>Les utilisateurs conservent la propriété de leurs contenus (photos, descriptions, etc.)</li>
        <li>
          En publiant un contenu sur AutoNex, l'utilisateur concède à APLi SARLU une licence non-exclusive, mondiale, gratuite et
          pour la durée légale des droits, d'utiliser, reproduire, représenter, adapter et diffuser ledit contenu dans le cadre du
          service AutoNex et de sa promotion
        </li>
        <li>Cette licence cesse à la suppression du contenu par l'utilisateur, sous réserve des sauvegardes légales obligatoires</li>
      </ul>

      <h2>Article 10 — Données personnelles</h2>
      <p>
        La collecte et le traitement des données personnelles sont régis par la{" "}
        <Link to="/legal/confidentialite" className="text-primary hover:underline">Politique de Confidentialité</Link>.
      </p>

      <h2>Article 11 — Durée et résiliation</h2>
      <h3>11.1 Durée</h3>
      <p>Les CGU sont applicables tant que l'utilisateur dispose d'un compte actif sur la plateforme.</p>
      <h3>11.2 Résiliation par l'utilisateur</h3>
      <ul>
        <li>
          L'utilisateur peut supprimer son compte à tout moment depuis son espace personnel (fonctionnalité en cours de
          déploiement — entretemps, demande par email à <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>)
        </li>
        <li>La suppression entraîne l'effacement des annonces actives et l'anonymisation des données conservées pour raisons légales</li>
      </ul>
      <h3>11.3 Résiliation par AutoNex</h3>
      <ul>
        <li>En cas de violation des CGU : suspension temporaire puis suppression du compte, avec préavis proportionné à la gravité</li>
        <li>En cas d'infraction grave (fraude, contenu illégal, atteinte à la sécurité) : suppression immédiate sans préavis</li>
        <li>Le solde de Crédits AutoNex au moment de la suspension/suppression fait l'objet d'un traitement individuel selon la cause de la résiliation</li>
      </ul>

      <h2>Article 12 — Force majeure</h2>
      <p>
        Aucune des parties ne pourra être tenue responsable de l'inexécution de ses obligations en cas de force majeure
        (catastrophe naturelle, guerre, pandémie, panne d'infrastructure tiers majeure, décision administrative contraignante,
        etc.). La partie affectée notifiera l'autre dans les meilleurs délais.
      </p>

      <h2>Article 13 — Médiation et litiges</h2>
      <h3>13.1 Médiation préalable</h3>
      <ul>
        <li>En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire</li>
        <li>Contact initial : <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a></li>
      </ul>
      <h3>13.2 Droit applicable</h3>
      <p>Les présentes CGU sont régies par le droit malgache.</p>
      <h3>13.3 Juridiction compétente</h3>
      <p>
        Tout litige relatif à l'interprétation ou à l'exécution des présentes CGU relève de la compétence exclusive du Tribunal de
        Première Instance d'Antananarivo, sous réserve des règles impératives de procédure applicables.
      </p>

      <h2>Article 14 — Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU :{" "}
        <a href="mailto:info@autonex.mg" className="text-primary hover:underline">info@autonex.mg</a>
      </p>
    </LegalLayout>
  );
}
