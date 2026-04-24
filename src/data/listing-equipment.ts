/**
 * Catalogue des équipements véhicule pour le flow publier (Lot 9.4).
 *
 * Convention :
 *   - `value`  : clé stockée en DB (snake_case ASCII, stable dans le temps).
 *   - `label`  : affichage UI en français (accents et typographie correctes).
 *   - `popular: true` met en avant l'option (ordre visuel ou pré-coche).
 *
 * Le format est structuré en 7 groupes sémantiquement distincts
 * (Confort · Technologie · Sécurité · Aide à la conduite · Extérieur
 *  · Utilitaire & Remorquage · Écologie & Électrification) pour un rendu en
 * accordéon côté UI — plus de flat list tronquée à 8 éléments.
 *
 * Back-compat : avant Lot 9.4, le catalogue stockait des LIBELLÉS DIRECTEMENT
 * comme valeurs (ex: "Climatisation", "Vitres electriques"). Les annonces
 * existantes en base contiennent ces chaînes. `LEGACY_EQUIPMENT_ALIASES` les
 * remappe silencieusement vers les nouvelles clés snake_case au chargement.
 */

export type ListingEquipmentIconName =
  | "Armchair"
  | "Smartphone"
  | "Shield"
  | "Navigation"
  | "Sun"
  | "Package"
  | "Leaf";

export type ListingEquipmentOption = {
  value: string;
  label: string;
  popular?: boolean;
};

export type ListingEquipmentGroup = {
  id: string;
  label: string;
  iconName?: ListingEquipmentIconName;
  description?: string;
  options: ListingEquipmentOption[];
};

export const LISTING_EQUIPMENT_GROUPS: ListingEquipmentGroup[] = [
  {
    id: "confort",
    label: "Confort",
    iconName: "Armchair",
    description: "Aménagements intérieur et habitacle",
    options: [
      { value: "climatisation", label: "Climatisation", popular: true },
      { value: "climatisation_automatique", label: "Climatisation automatique", popular: true },
      { value: "climatisation_bi_zone", label: "Climatisation bi-zone" },
      { value: "climatisation_tri_zone", label: "Climatisation tri-zone" },
      { value: "climatisation_quadri_zone", label: "Climatisation quadri-zone" },
      { value: "sieges_tissu", label: "Sièges tissu" },
      { value: "sieges_cuir", label: "Sièges cuir", popular: true },
      { value: "sieges_cuir_partiel", label: "Sièges cuir partiel" },
      { value: "sieges_alcantara", label: "Sièges alcantara" },
      { value: "sieges_chauffants", label: "Sièges chauffants" },
      { value: "sieges_ventiles", label: "Sièges ventilés" },
      { value: "sieges_massants", label: "Sièges massants" },
      { value: "sieges_electriques", label: "Sièges électriques" },
      { value: "memoire_sieges", label: "Mémoire sièges conducteur" },
      { value: "volant_cuir", label: "Volant en cuir" },
      { value: "volant_chauffant", label: "Volant chauffant" },
      { value: "volant_reglable", label: "Volant réglable (hauteur + profondeur)" },
      { value: "accoudoir_central", label: "Accoudoir central" },
      { value: "vitres_teintees", label: "Vitres teintées" },
      { value: "vitres_electriques", label: "Vitres électriques", popular: true },
      { value: "toit_ouvrant", label: "Toit ouvrant" },
      { value: "toit_panoramique", label: "Toit panoramique" },
      { value: "toit_decapotable", label: "Toit décapotable" },
      { value: "pare_brise_athermique", label: "Pare-brise athermique" },
      { value: "ambiance_lumineuse", label: "Éclairage d'ambiance" },
      { value: "isolation_acoustique", label: "Isolation acoustique renforcée" },
    ],
  },
  {
    id: "technologie",
    label: "Technologie & Multimédia",
    iconName: "Smartphone",
    description: "Écrans, connectivité, audio",
    options: [
      { value: "ecran_tactile", label: "Écran tactile", popular: true },
      { value: "apple_carplay", label: "Apple CarPlay", popular: true },
      { value: "android_auto", label: "Android Auto", popular: true },
      { value: "bluetooth", label: "Bluetooth", popular: true },
      { value: "wifi_embarque", label: "Wi-Fi embarqué" },
      { value: "usb_a", label: "Prises USB-A" },
      { value: "usb_c", label: "Prises USB-C" },
      { value: "chargeur_induction", label: "Chargeur sans fil (induction)" },
      { value: "prise_12v", label: "Prise 12V" },
      { value: "prise_220v", label: "Prise 220V" },
      { value: "radio_fm", label: "Radio FM" },
      { value: "radio_dab", label: "Radio numérique DAB+" },
      { value: "systeme_audio_premium", label: "Système audio premium (Bose, Harman Kardon…)" },
      { value: "haut_parleurs_multi", label: "6 haut-parleurs ou plus" },
      { value: "commandes_volant", label: "Commandes au volant" },
      { value: "reconnaissance_vocale", label: "Reconnaissance vocale" },
      { value: "ordinateur_de_bord", label: "Ordinateur de bord" },
      { value: "tableau_bord_numerique", label: "Tableau de bord numérique" },
      { value: "affichage_tete_haute", label: "Affichage tête haute (HUD)" },
      { value: "navigation_gps", label: "GPS / navigation intégrée", popular: true },
      { value: "mises_a_jour_ota", label: "Mises à jour OTA" },
    ],
  },
  {
    id: "securite",
    label: "Sécurité",
    iconName: "Shield",
    description: "Aides à la conduite et protections",
    options: [
      { value: "airbags_frontaux", label: "Airbags frontaux", popular: true },
      { value: "airbags_lateraux", label: "Airbags latéraux" },
      { value: "airbags_rideaux", label: "Airbags rideaux" },
      { value: "airbags_genoux", label: "Airbags genoux" },
      { value: "abs", label: "ABS (antiblocage)", popular: true },
      { value: "esp", label: "ESP (contrôle de stabilité)", popular: true },
      { value: "tcs", label: "TCS (anti-patinage)" },
      { value: "antidemarrage", label: "Antidémarrage" },
      { value: "alarme", label: "Alarme" },
      { value: "verrouillage_centralise", label: "Verrouillage centralisé", popular: true },
      { value: "verrouillage_auto_vitesse", label: "Verrouillage auto à la vitesse" },
      { value: "fixation_isofix", label: "Fixation ISOFIX" },
      { value: "avertissement_ceinture", label: "Avertissement non-bouclage ceinture" },
      { value: "controle_pression_pneus", label: "Contrôle pression pneus (TPMS)" },
      { value: "aide_demarrage_cote", label: "Aide au démarrage en côte" },
      { value: "aide_descente", label: "Aide à la descente" },
      { value: "aide_freinage_urgence", label: "Aide au freinage d'urgence" },
      { value: "freinage_automatique_urgence", label: "Freinage automatique d'urgence (AEB)" },
      { value: "avertissement_collision", label: "Avertissement de collision avant" },
      { value: "avertissement_sortie_voie", label: "Avertissement de sortie de voie" },
      { value: "maintien_voie", label: "Maintien dans la voie actif (LKA)" },
      { value: "angle_mort", label: "Détection d'angle mort" },
      { value: "trafic_croise", label: "Alerte trafic croisé arrière" },
      { value: "reconnaissance_panneaux", label: "Reconnaissance des panneaux" },
      { value: "somnolence", label: "Détection de somnolence" },
      { value: "feux_stop_led", label: "Feux stop LED" },
      { value: "troisieme_feu_stop", label: "Troisième feu stop" },
    ],
  },
  {
    id: "aide_conduite",
    label: "Aide à la conduite",
    iconName: "Navigation",
    description: "Stationnement et pilotage assisté",
    options: [
      { value: "regulateur_vitesse", label: "Régulateur de vitesse", popular: true },
      { value: "regulateur_adaptatif", label: "Régulateur adaptatif (ACC)" },
      { value: "limiteur_vitesse", label: "Limiteur de vitesse" },
      { value: "camera_recul", label: "Caméra de recul", popular: true },
      { value: "camera_360", label: "Caméra 360°" },
      { value: "capteurs_avant", label: "Capteurs de stationnement avant" },
      { value: "capteurs_arriere", label: "Capteurs de stationnement arrière", popular: true },
      { value: "stationnement_automatique", label: "Stationnement automatique" },
      { value: "demarrage_sans_cle", label: "Démarrage sans clé (Start)", popular: true },
      { value: "cle_mains_libres", label: "Clé mains libres (keyless entry)" },
      { value: "frein_parking_electronique", label: "Frein de parking électronique" },
      { value: "auto_hold", label: "Auto Hold" },
      { value: "start_stop", label: "Système Start-Stop" },
      { value: "mode_eco", label: "Mode Éco" },
      { value: "mode_sport", label: "Mode Sport" },
      { value: "suspensions_reglables", label: "Suspensions réglables / adaptatives" },
      { value: "direction_assistee", label: "Direction assistée", popular: true },
      { value: "direction_variable", label: "Direction assistée variable" },
    ],
  },
  {
    id: "exterieur",
    label: "Extérieur & Éclairage",
    iconName: "Sun",
    description: "Carrosserie, phares, jantes",
    options: [
      { value: "jantes_alliage", label: "Jantes alliage", popular: true },
      { value: "jantes_tole", label: "Jantes tôle" },
      { value: "jantes_17", label: "Jantes 17 pouces" },
      { value: "jantes_18", label: "Jantes 18 pouces" },
      { value: "jantes_19", label: "Jantes 19 pouces" },
      { value: "jantes_20_plus", label: "Jantes 20 pouces ou plus" },
      { value: "phares_halogenes", label: "Phares halogènes" },
      { value: "phares_xenon", label: "Phares xénon" },
      { value: "phares_led", label: "Phares LED", popular: true },
      { value: "phares_matrix", label: "Phares matrix / laser" },
      { value: "phares_adaptatifs", label: "Phares adaptatifs / directionnels" },
      { value: "feux_de_jour", label: "Feux de jour LED" },
      { value: "antibrouillards_avant", label: "Antibrouillards avant" },
      { value: "antibrouillards_arriere", label: "Antibrouillards arrière" },
      { value: "detecteur_pluie", label: "Détecteur de pluie" },
      { value: "essuie_glace_auto", label: "Essuie-glaces automatiques" },
      { value: "allumage_phares_auto", label: "Allumage phares automatique" },
      { value: "retroviseurs_electriques", label: "Rétroviseurs électriques", popular: true },
      { value: "retroviseurs_rabattables", label: "Rétroviseurs rabattables électriquement" },
      { value: "retroviseurs_chauffants", label: "Rétroviseurs chauffants" },
      { value: "retroviseurs_memoire", label: "Rétroviseurs à mémoire" },
      { value: "poignees_couleur_caisse", label: "Poignées couleur caisse" },
      { value: "barres_de_toit", label: "Barres de toit / galerie" },
      { value: "becquet", label: "Becquet / aileron" },
      { value: "marchepieds", label: "Marchepieds" },
      { value: "protection_sous_caisse", label: "Protection sous-caisse" },
      { value: "peinture_metallisee", label: "Peinture métallisée" },
      { value: "peinture_mate", label: "Peinture mate" },
    ],
  },
  {
    id: "utilitaire",
    label: "Utilitaire & Remorquage",
    iconName: "Package",
    description: "Capacités pratiques et transport",
    options: [
      { value: "double_cabine", label: "Double cabine (pickup)" },
      { value: "benne_nue", label: "Benne nue (pickup)" },
      { value: "benne_bachee", label: "Benne bâchée" },
      { value: "hardtop", label: "Hard top" },
      { value: "canopy", label: "Canopy" },
      { value: "roll_bar", label: "Roll bar" },
      { value: "hayon_electrique", label: "Hayon électrique" },
      { value: "hayon_ouverture_pied", label: "Hayon ouverture mains libres (pied)" },
      { value: "coffre_modulable", label: "Coffre modulable" },
      { value: "banquette_rabattable", label: "Banquette rabattable" },
      { value: "3e_rangee", label: "3ᵉ rangée de sièges" },
      { value: "7_places", label: "7 places" },
      { value: "9_places", label: "9 places et plus" },
      { value: "attelage", label: "Attelage / crochet remorque" },
      { value: "attelage_lourd", label: "Attelage lourd (3500 kg)" },
      { value: "treuil", label: "Treuil" },
      { value: "roue_secours_pleine", label: "Roue de secours pleine" },
      { value: "roue_secours_galette", label: "Roue de secours galette" },
      { value: "kit_anti_crevaison", label: "Kit anti-crevaison" },
      { value: "prise_remorque", label: "Prise électrique remorque" },
      { value: "reducteur", label: "Réducteur / boîte de transfert" },
      { value: "blocage_differentiel", label: "Blocage de différentiel" },
    ],
  },
  {
    id: "ecologie",
    label: "Écologie & Électrification",
    iconName: "Leaf",
    description: "Motorisation propre",
    options: [
      { value: "prise_charge_type_2", label: "Prise de charge Type 2" },
      { value: "prise_charge_ccs", label: "Prise de charge CCS (rapide)" },
      { value: "prise_charge_chademo", label: "Prise CHAdeMO" },
      { value: "charge_rapide", label: "Charge rapide (DC)" },
      { value: "cable_charge_fourni", label: "Câble de charge fourni" },
      { value: "pompe_chaleur", label: "Pompe à chaleur" },
      { value: "prechauffage", label: "Préchauffage / pré-climatisation programmable" },
      { value: "vehicule_hybride", label: "Moteur hybride" },
      { value: "vehicule_electrique", label: "Moteur 100 % électrique" },
      { value: "recuperation_energie", label: "Récupération d'énergie au freinage" },
    ],
  },
];

/**
 * Back-compat : annonces publiées avant Lot 9.4 stockaient les labels bruts
 * dans `listings.features`. On les migre silencieusement vers les nouvelles
 * clés snake_case à la lecture (sanitize) et au rendu (getEquipmentOptionLabel).
 * Les cases à cocher restent ainsi bien pré-cochées sur édition d'un ancien draft.
 */
const LEGACY_EQUIPMENT_ALIASES: Record<string, string> = {
  // Confort
  "Climatisation": "climatisation",
  "Vitres electriques": "vitres_electriques",
  "Sieges cuir": "sieges_cuir",
  // Technologie
  "Bluetooth": "bluetooth",
  "GPS integre": "navigation_gps",
  "Ecran tactile": "ecran_tactile",
  "Apple CarPlay / Android Auto": "apple_carplay",
  "Camera de recul": "camera_recul",
  "Radar de recul": "capteurs_arriere",
  // Sécurité
  "ABS": "abs",
  "Airbags": "airbags_frontaux",
  "ESP": "esp",
  "Antibrouillards": "antibrouillards_avant",
  "Alarme": "alarme",
  "Verrouillage centralise": "verrouillage_centralise",
  "Direction assistee": "direction_assistee",
  "Demarrage sans cle": "demarrage_sans_cle",
  "Regulateur de vitesse": "regulateur_vitesse",
  // Extérieur
  "Jantes alliage": "jantes_alliage",
  "Toit ouvrant": "toit_ouvrant",
  "Phares LED": "phares_led",
  "Attelage": "attelage",
  "Galerie de toit": "barres_de_toit",
  // Utilitaire / 4x4
  "Double cabine": "double_cabine",
  "Hard top": "hardtop",
  "Treuil": "treuil",
  "Marchepieds": "marchepieds",
};

export const LISTING_EQUIPMENT_OPTIONS: string[] = LISTING_EQUIPMENT_GROUPS.flatMap(
  (group) => group.options.map((o) => o.value),
);

const LISTING_EQUIPMENT_SET = new Set(LISTING_EQUIPMENT_OPTIONS);
const CUSTOM_FEATURE_PREFIX = "__custom:";

/**
 * Filtre les valeurs vers le whitelist du catalogue.
 * Au passage : migre silencieusement les anciennes chaînes (Lot < 9.4) vers
 * leur équivalent snake_case. Les values `__custom:...` et autres inconnues
 * sont rejetées (comportement inchangé depuis la V1).
 */
export function sanitizeListingEquipment(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const migrated = LEGACY_EQUIPMENT_ALIASES[raw] ?? raw;
    if (!LISTING_EQUIPMENT_SET.has(migrated)) continue;
    if (seen.has(migrated)) continue;
    seen.add(migrated);
    out.push(migrated);
  }
  return out;
}

/**
 * Retourne le label d'affichage d'un value. Migre automatiquement les
 * anciennes chaînes. Fallback capitalisation simple.
 */
export function getEquipmentOptionLabel(value: string | null | undefined): string {
  if (!value) return "";
  const migrated = LEGACY_EQUIPMENT_ALIASES[value] ?? value;
  for (const group of LISTING_EQUIPMENT_GROUPS) {
    for (const opt of group.options) {
      if (opt.value === migrated) return opt.label;
    }
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Sépare une liste `features` brute en (1) valeurs reconnues / migrées
 * (prêtes pour rendu dans les groupes) et (2) valeurs inconnues préservées
 * pour un rendu dans la section « Autres (conservées) ». Ignore les entrées
 * `__custom:` qui sont traitées séparément via `extractCustomFeatures`.
 */
export function classifyEquipmentValues(values: string[]): {
  known: string[];
  legacyUnknown: string[];
} {
  const known: string[] = [];
  const legacyUnknown: string[] = [];
  const seenKnown = new Set<string>();
  const seenUnknown = new Set<string>();
  for (const raw of values) {
    if (raw.startsWith(CUSTOM_FEATURE_PREFIX)) continue;
    const migrated = LEGACY_EQUIPMENT_ALIASES[raw] ?? raw;
    if (LISTING_EQUIPMENT_SET.has(migrated)) {
      if (!seenKnown.has(migrated)) {
        known.push(migrated);
        seenKnown.add(migrated);
      }
    } else {
      if (!seenUnknown.has(raw)) {
        legacyUnknown.push(raw);
        seenUnknown.add(raw);
      }
    }
  }
  return { known, legacyUnknown };
}

function sanitizeCustomFeatureLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function parseCustomFeaturesInput(value: string): string[] {
  const seen = new Set<string>();
  const parsed: string[] = [];
  for (const token of value.split(",")) {
    const label = sanitizeCustomFeatureLabel(token);
    if (!label) continue;
    const normalized = label.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    parsed.push(label);
  }
  return parsed;
}

export function encodeCustomFeature(value: string): string {
  const label = sanitizeCustomFeatureLabel(value);
  return `${CUSTOM_FEATURE_PREFIX}${label}`;
}

export function decodeCustomFeature(value: string): string | null {
  if (!value.startsWith(CUSTOM_FEATURE_PREFIX)) return null;
  const decoded = sanitizeCustomFeatureLabel(value.slice(CUSTOM_FEATURE_PREFIX.length));
  return decoded.length > 0 ? decoded : null;
}

export function extractCustomFeatures(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const decoded = decodeCustomFeature(raw);
    if (!decoded) continue;
    const normalized = decoded.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(decoded);
  }
  return out;
}
