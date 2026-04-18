/**
 * mg.json (from git) can contain extra keys not in fr.json. Add French + English
 * so all three files support the same key set (FR/EN = product copy, MG = existing).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function flatten2(obj, prefix = "", out = {}) {
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      flatten2(obj[k], p, out);
    }
  } else out[prefix] = obj;
  return out;
}

function unflatten(flat) {
  const rootObj = {};
  for (const key of Object.keys(flat).sort()) {
    const parts = key.split(".");
    let cur = rootObj;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = flat[key];
  }
  return rootObj;
}

/** MG-only keys → French product copy */
const FR_SUPPLEMENT = {
  "estimation.estimateMyVehicle": "Estimer mon véhicule",
  "estimation.estimatedRange": "Fourchette estimée",
  "estimation.estimatedValue": "Valeur estimée",
  "estimation.inProgress": "Estimation en cours…",
  "estimation.marketAnalysis": "Analyse du marché",
  "estimation.quickFlow": "Parcours express",
  "estimation.referenceReady": "Référentiel prêt",
  "estimation.reliableInput": "Saisie fiable",
  "estimation.report": "Rapport d’estimation",
  "hero.brand": "Marque",
  "hero.fuel": "Carburant",
  "hero.locationPlaceholder": "Ville, quartier, région…",
  "hero.model": "Modèle",
  "hero.year": "Année",
  "listing.phone": "Numéro de téléphone",
  "listing.send": "Envoyer",
  "listing.trustHint": "Un message clair favorise une réponse plus rapide.",
  "listing.trustTitle": "Pourquoi cette annonce inspire confiance",
  "publish.advancedInfoDesc":
    "Complétez ces détails pour renforcer la qualité perçue de votre annonce.",
  "publish.advancedInfoTitle": "Informations complémentaires (optionnel)",
  "publish.back": "Retour",
  "publish.brandPlaceholder": "Ex. Toyota, Nissan, Hyundai…",
  "publish.descriptionCounter": "{{count}}/5000 — minimum 40 caractères",
  "publish.descriptionHint":
    "Détaillez surtout : carburant, boîte, état général et historique d’entretien.",
  "publish.descriptionPlaceholderLong": "Rédigez une description complète en français…",
  "publish.essentialInfoDesc":
    "Commencez par les champs les plus importants pour la compréhension et la conversion.",
  "publish.essentialInfoTitle": "Informations essentielles",
  "publish.mainFeaturesDesc":
    "Elles aident l’acheteur à filtrer et à comparer plus vite vos annonces.",
  "publish.mainFeaturesTitle": "Caractéristiques principales",
  "publish.modelPlaceholder": "Ex. RAV4, Hilux, Ranger…",
  "publish.modelPlaceholderWithBrand": "Modèle {{brand}}",
  "publish.moderation": "Modération",
  "publish.otherFeaturesHint":
    "Séparez les éléments par des virgules si vous indiquez plusieurs options.",
  "publish.otherFeaturesPlaceholder":
    "Ex. suspension adaptative, sièges ventilés, affichage tête haute…",
  "publish.otherFeaturesTitle": "Autres points (optionnel)",
  "publish.selectAvailability": "Choisir la disponibilité",
  "publish.selectBodyStyle": "Choisir la carrosserie",
  "publish.selectCondition": "Choisir l’état",
  "publish.selectDrivetrain": "Choisir la transmission intégrale",
  "publish.selectFuel": "Choisir le carburant",
  "publish.selectRentalMode": "Choisir le mode",
  "publish.selectSellerType": "Choisir le type de vendeur",
  "publish.selectTransmission": "Choisir la boîte",
  "publish.titleExample": "Ex. Toyota RAV4 2021 — automatique, 68 000 km",
  "publish.vehicleIdentityDesc":
    "Choisissez une marque du catalogue AutoNex, puis précisez le modèle.",
  "publish.vehicleIdentityTitle": "Identité du véhicule",
  "search.resetFiltersToRetry": "Réinitialisez les filtres et relancez la recherche",
  "states.backHome": "Retour à l’accueil",
  "states.empty": "Aucun résultat à afficher",
  "states.error": "Une erreur est survenue",
  "states.loading": "Chargement…",
  "states.notFound": "Page introuvable",
  "states.pleaseWait": "Veuillez patienter",
  "states.retry": "Réessayer",
};

const EN_SUPPLEMENT = {
  "estimation.estimateMyVehicle": "Estimate my vehicle",
  "estimation.estimatedRange": "Estimated range",
  "estimation.estimatedValue": "Estimated value",
  "estimation.inProgress": "Estimating…",
  "estimation.marketAnalysis": "Market analysis",
  "estimation.quickFlow": "Quick flow",
  "estimation.referenceReady": "Reference data ready",
  "estimation.reliableInput": "Reliable inputs",
  "estimation.report": "Estimation report",
  "hero.brand": "Make",
  "hero.fuel": "Fuel",
  "hero.locationPlaceholder": "City, district, region…",
  "hero.model": "Model",
  "hero.year": "Year",
  "listing.phone": "Phone number",
  "listing.send": "Send",
  "listing.trustHint": "A clear message helps you get a faster reply.",
  "listing.trustTitle": "Why this listing feels trustworthy",
  "publish.advancedInfoDesc": "Add these details to improve how your listing is perceived.",
  "publish.advancedInfoTitle": "Additional details (optional)",
  "publish.back": "Back",
  "publish.brandPlaceholder": "e.g. Toyota, Nissan, Hyundai…",
  "publish.descriptionCounter": "{{count}}/5000 — minimum 40 characters",
  "publish.descriptionHint":
    "Focus on fuel type, gearbox, overall condition and maintenance history.",
  "publish.descriptionPlaceholderLong": "Write a complete description in French…",
  "publish.essentialInfoDesc": "Start with the fields that drive understanding and conversions.",
  "publish.essentialInfoTitle": "Essential information",
  "publish.mainFeaturesDesc": "They help buyers filter and compare listings faster.",
  "publish.mainFeaturesTitle": "Main features",
  "publish.modelPlaceholder": "e.g. RAV4, Hilux, Ranger…",
  "publish.modelPlaceholderWithBrand": "Model {{brand}}",
  "publish.moderation": "Moderation",
  "publish.otherFeaturesHint": "Separate items with commas when listing multiple options.",
  "publish.otherFeaturesPlaceholder":
    "e.g. adaptive suspension, ventilated seats, head-up display…",
  "publish.otherFeaturesTitle": "Other items (optional)",
  "publish.selectAvailability": "Select availability",
  "publish.selectBodyStyle": "Select body style",
  "publish.selectCondition": "Select condition",
  "publish.selectDrivetrain": "Select drivetrain",
  "publish.selectFuel": "Select fuel type",
  "publish.selectRentalMode": "Select rental mode",
  "publish.selectSellerType": "Select seller type",
  "publish.selectTransmission": "Select transmission",
  "publish.titleExample": "e.g. Toyota RAV4 2021 — automatic, 68,000 km",
  "publish.vehicleIdentityDesc":
    "Pick a make from the AutoNex catalog, then specify the model.",
  "publish.vehicleIdentityTitle": "Vehicle identity",
  "search.resetFiltersToRetry": "Reset filters and search again",
  "states.backHome": "Back to home",
  "states.empty": "Nothing to display",
  "states.error": "Something went wrong",
  "states.loading": "Loading…",
  "states.notFound": "Page not found",
  "states.pleaseWait": "Please wait",
  "states.retry": "Try again",
};

const frPath = path.join(root, "src/i18n/fr.json");
const enPath = path.join(root, "src/i18n/en.json");

const frFlat = flatten2(JSON.parse(fs.readFileSync(frPath, "utf8")));
const enFlat = flatten2(JSON.parse(fs.readFileSync(enPath, "utf8")));

for (const [k, v] of Object.entries(FR_SUPPLEMENT)) {
  frFlat[k] = v;
}
for (const [k, v] of Object.entries(EN_SUPPLEMENT)) {
  enFlat[k] = v;
}

fs.writeFileSync(frPath, JSON.stringify(unflatten(frFlat), null, 2) + "\n", "utf8");
fs.writeFileSync(enPath, JSON.stringify(unflatten(enFlat), null, 2) + "\n", "utf8");

console.log("Merged", Object.keys(FR_SUPPLEMENT).length, "superset keys into fr.json and en.json");
