/**
 * Catalogue des modèles de véhicules par marque (Lot 9.3).
 *
 * Source : présence réelle sur le marché malgache (concessionnaires,
 * annonces Facebook Marketplace, imports courants depuis France / UAE /
 * Japon). Voir `docs/AUDIT_FINDINGS.md` et les articles blog du Lot 6/7
 * pour le contexte marketplace.
 *
 * Convention des clés :
 *   - La clé `VEHICLE_MODELS_BY_BRAND[brandKey]` est strictement
 *     `brand.trim().toLowerCase()` — elle correspond directement à ce que
 *     `getModelsForBrand()` reçoit depuis le form.
 *   - La valeur `VehicleModelSuggestion.value` est également en lowercase,
 *     stockée en base (évite les doublons « RAV4 » vs « rav4 »).
 *   - La valeur `VehicleModelSuggestion.label` est la capitalisation
 *     officielle du constructeur (affichage UI).
 *
 * Modèles `popular: true` → mis en avant dans le Combobox.
 */

export type VehicleModelCategory =
  | "berline"
  | "suv"
  | "pickup"
  | "citadine"
  | "coupe"
  | "cabriolet"
  | "moto"
  | "scooter"
  | "utilitaire"
  | "camion";

export type VehicleModelSuggestion = {
  value: string;
  label: string;
  popular?: boolean;
  category?: VehicleModelCategory;
};

export const VEHICLE_MODELS_BY_BRAND: Record<string, VehicleModelSuggestion[]> = {
  // ============================================================
  // PRIORITÉ 1 — Marques dominantes à Madagascar
  // ============================================================
  toyota: [
    // Pick-ups
    { value: "hilux", label: "Hilux", popular: true, category: "pickup" },
    { value: "hilux revo", label: "Hilux Revo", category: "pickup" },
    { value: "hilux vigo", label: "Hilux Vigo", category: "pickup" },
    { value: "tacoma", label: "Tacoma", category: "pickup" },
    { value: "tundra", label: "Tundra", category: "pickup" },
    // SUVs / 4x4
    { value: "land cruiser", label: "Land Cruiser", popular: true, category: "suv" },
    { value: "land cruiser 76", label: "Land Cruiser 76", category: "suv" },
    { value: "land cruiser 78", label: "Land Cruiser 78", category: "suv" },
    { value: "land cruiser 79", label: "Land Cruiser 79", category: "suv" },
    { value: "land cruiser 200", label: "Land Cruiser 200", category: "suv" },
    { value: "land cruiser 300", label: "Land Cruiser 300", category: "suv" },
    { value: "land cruiser prado", label: "Land Cruiser Prado", popular: true, category: "suv" },
    { value: "fortuner", label: "Fortuner", popular: true, category: "suv" },
    { value: "rav4", label: "RAV4", popular: true, category: "suv" },
    { value: "4runner", label: "4Runner", category: "suv" },
    { value: "sequoia", label: "Sequoia", category: "suv" },
    { value: "fj cruiser", label: "FJ Cruiser", category: "suv" },
    { value: "highlander", label: "Highlander", category: "suv" },
    { value: "c-hr", label: "C-HR", category: "suv" },
    { value: "corolla cross", label: "Corolla Cross", category: "suv" },
    { value: "urban cruiser", label: "Urban Cruiser", category: "suv" },
    { value: "yaris cross", label: "Yaris Cross", category: "suv" },
    { value: "venza", label: "Venza", category: "suv" },
    // Berlines & compactes
    { value: "corolla", label: "Corolla", popular: true, category: "berline" },
    { value: "camry", label: "Camry", category: "berline" },
    { value: "avensis", label: "Avensis", category: "berline" },
    { value: "crown", label: "Crown", category: "berline" },
    { value: "mark ii", label: "Mark II", category: "berline" },
    { value: "mark x", label: "Mark X", category: "berline" },
    { value: "prius", label: "Prius", category: "berline" },
    { value: "yaris", label: "Yaris", popular: true, category: "citadine" },
    { value: "aygo", label: "Aygo", category: "citadine" },
    { value: "vitz", label: "Vitz", category: "citadine" },
    { value: "etios", label: "Etios", category: "citadine" },
    { value: "probox", label: "Probox", category: "citadine" },
    { value: "succeed", label: "Succeed", category: "citadine" },
    // Vans / utilitaires
    { value: "hiace", label: "Hiace", popular: true, category: "utilitaire" },
    { value: "quantum", label: "Quantum", category: "utilitaire" },
    { value: "innova", label: "Innova", category: "utilitaire" },
    { value: "avanza", label: "Avanza", category: "utilitaire" },
    { value: "alphard", label: "Alphard", category: "utilitaire" },
    { value: "sienna", label: "Sienna", category: "utilitaire" },
    { value: "coaster", label: "Coaster", category: "utilitaire" },
    { value: "lite ace", label: "Lite Ace", category: "utilitaire" },
    { value: "town ace", label: "Town Ace", category: "utilitaire" },
    { value: "dyna", label: "Dyna", category: "camion" },
    { value: "rush", label: "Rush", category: "suv" },
    // Sport
    { value: "supra", label: "Supra", category: "coupe" },
    { value: "gr86", label: "GR86", category: "coupe" },
    { value: "86", label: "86", category: "coupe" },
    { value: "gr yaris", label: "GR Yaris", category: "citadine" },
  ],

  nissan: [
    // Pick-ups
    { value: "navara", label: "Navara", popular: true, category: "pickup" },
    { value: "np300 hardbody", label: "NP300 Hardbody", category: "pickup" },
    { value: "frontier", label: "Frontier", category: "pickup" },
    { value: "titan", label: "Titan", category: "pickup" },
    // 4x4 / SUVs
    { value: "patrol", label: "Patrol", popular: true, category: "suv" },
    { value: "pathfinder", label: "Pathfinder", category: "suv" },
    { value: "terrano", label: "Terrano", category: "suv" },
    { value: "x-trail", label: "X-Trail", popular: true, category: "suv" },
    { value: "qashqai", label: "Qashqai", popular: true, category: "suv" },
    { value: "juke", label: "Juke", category: "suv" },
    { value: "kicks", label: "Kicks", category: "suv" },
    { value: "murano", label: "Murano", category: "suv" },
    { value: "armada", label: "Armada", category: "suv" },
    { value: "rogue", label: "Rogue", category: "suv" },
    // Berlines & citadines
    { value: "sentra", label: "Sentra", category: "berline" },
    { value: "sunny", label: "Sunny", popular: true, category: "berline" },
    { value: "almera", label: "Almera", category: "berline" },
    { value: "tiida", label: "Tiida", category: "berline" },
    { value: "maxima", label: "Maxima", category: "berline" },
    { value: "altima", label: "Altima", category: "berline" },
    { value: "micra", label: "Micra", category: "citadine" },
    { value: "note", label: "Note", category: "citadine" },
    { value: "march", label: "March", category: "citadine" },
    // Utilitaires / vans
    { value: "nv200", label: "NV200", category: "utilitaire" },
    { value: "urvan", label: "Urvan", category: "utilitaire" },
    { value: "nv350", label: "NV350", category: "utilitaire" },
    { value: "caravan", label: "Caravan", category: "utilitaire" },
    { value: "serena", label: "Serena", category: "utilitaire" },
    { value: "elgrand", label: "Elgrand", category: "utilitaire" },
    // Électriques
    { value: "leaf", label: "Leaf", category: "berline" },
    { value: "ariya", label: "Ariya", category: "suv" },
    { value: "gt-r", label: "GT-R", category: "coupe" },
    { value: "370z", label: "370Z", category: "coupe" },
  ],

  hyundai: [
    // SUVs
    { value: "tucson", label: "Tucson", popular: true, category: "suv" },
    { value: "santa fe", label: "Santa Fe", popular: true, category: "suv" },
    { value: "kona", label: "Kona", category: "suv" },
    { value: "kona electric", label: "Kona Electric", category: "suv" },
    { value: "creta", label: "Creta", category: "suv" },
    { value: "palisade", label: "Palisade", category: "suv" },
    { value: "venue", label: "Venue", category: "suv" },
    { value: "ix35", label: "ix35", category: "suv" },
    { value: "terracan", label: "Terracan", category: "suv" },
    { value: "bayon", label: "Bayon", category: "suv" },
    // Pick-up
    { value: "santa cruz", label: "Santa Cruz", category: "pickup" },
    // Berlines & citadines
    { value: "accent", label: "Accent", popular: true, category: "berline" },
    { value: "elantra", label: "Elantra", category: "berline" },
    { value: "sonata", label: "Sonata", category: "berline" },
    { value: "azera", label: "Azera", category: "berline" },
    { value: "i10", label: "i10", popular: true, category: "citadine" },
    { value: "i20", label: "i20", category: "citadine" },
    { value: "i30", label: "i30", category: "berline" },
    { value: "getz", label: "Getz", category: "citadine" },
    { value: "atos", label: "Atos", category: "citadine" },
    { value: "matrix", label: "Matrix", category: "citadine" },
    // Utilitaires
    { value: "h1", label: "H1 / Starex", popular: true, category: "utilitaire" },
    { value: "staria", label: "Staria", category: "utilitaire" },
    { value: "h100", label: "H100", category: "utilitaire" },
    { value: "hd65", label: "HD65", category: "camion" },
    { value: "hd72", label: "HD72", category: "camion" },
    // Électriques
    { value: "ioniq 5", label: "IONIQ 5", category: "suv" },
    { value: "ioniq 6", label: "IONIQ 6", category: "berline" },
  ],

  mitsubishi: [
    // Pick-ups
    { value: "l200", label: "L200", popular: true, category: "pickup" },
    { value: "triton", label: "Triton", popular: true, category: "pickup" },
    // 4x4 / SUVs
    { value: "pajero", label: "Pajero", popular: true, category: "suv" },
    { value: "pajero sport", label: "Pajero Sport", popular: true, category: "suv" },
    { value: "montero", label: "Montero", category: "suv" },
    { value: "outlander", label: "Outlander", category: "suv" },
    { value: "asx", label: "ASX", category: "suv" },
    { value: "eclipse cross", label: "Eclipse Cross", category: "suv" },
    { value: "xpander", label: "Xpander", category: "suv" },
    { value: "xpander cross", label: "Xpander Cross", category: "suv" },
    // Berlines & citadines
    { value: "lancer", label: "Lancer", category: "berline" },
    { value: "galant", label: "Galant", category: "berline" },
    { value: "colt", label: "Colt", category: "citadine" },
    { value: "mirage", label: "Mirage", category: "citadine" },
    { value: "space star", label: "Space Star", category: "citadine" },
    { value: "attrage", label: "Attrage", category: "berline" },
    // Utilitaires & camions
    { value: "canter", label: "Canter", popular: true, category: "camion" },
    { value: "fuso", label: "Fuso", category: "camion" },
    { value: "delica", label: "Delica", category: "utilitaire" },
    { value: "l300", label: "L300", category: "utilitaire" },
    // Autres
    { value: "eclipse", label: "Eclipse", category: "coupe" },
    { value: "3000gt", label: "3000GT", category: "coupe" },
  ],

  ford: [
    // Pick-ups
    { value: "ranger", label: "Ranger", popular: true, category: "pickup" },
    { value: "ranger raptor", label: "Ranger Raptor", popular: true, category: "pickup" },
    { value: "ranger wildtrak", label: "Ranger Wildtrak", category: "pickup" },
    { value: "ranger xlt", label: "Ranger XLT", category: "pickup" },
    { value: "f-150", label: "F-150", category: "pickup" },
    { value: "maverick", label: "Maverick", category: "pickup" },
    // SUVs
    { value: "everest", label: "Everest", popular: true, category: "suv" },
    { value: "endeavour", label: "Endeavour", category: "suv" },
    { value: "escape", label: "Escape", category: "suv" },
    { value: "kuga", label: "Kuga", category: "suv" },
    { value: "ecosport", label: "EcoSport", category: "suv" },
    { value: "explorer", label: "Explorer", category: "suv" },
    { value: "expedition", label: "Expedition", category: "suv" },
    { value: "edge", label: "Edge", category: "suv" },
    { value: "bronco", label: "Bronco", category: "suv" },
    { value: "territory", label: "Territory", category: "suv" },
    // Berlines / citadines
    { value: "fiesta", label: "Fiesta", category: "citadine" },
    { value: "focus", label: "Focus", category: "berline" },
    { value: "mondeo", label: "Mondeo", category: "berline" },
    { value: "fusion", label: "Fusion", category: "berline" },
    { value: "mustang", label: "Mustang", popular: true, category: "coupe" },
    // Utilitaires
    { value: "transit", label: "Transit", popular: true, category: "utilitaire" },
    { value: "transit connect", label: "Transit Connect", category: "utilitaire" },
    { value: "transit custom", label: "Transit Custom", category: "utilitaire" },
    { value: "tourneo", label: "Tourneo", category: "utilitaire" },
  ],

  suzuki: [
    // 4x4 compacts & SUVs
    { value: "jimny", label: "Jimny", popular: true, category: "suv" },
    { value: "vitara", label: "Vitara", popular: true, category: "suv" },
    { value: "grand vitara", label: "Grand Vitara", category: "suv" },
    { value: "s-cross", label: "S-Cross", category: "suv" },
    { value: "sx4", label: "SX4", category: "suv" },
    { value: "escudo", label: "Escudo", category: "suv" },
    // Citadines & berlines
    { value: "swift", label: "Swift", popular: true, category: "citadine" },
    { value: "alto", label: "Alto", popular: true, category: "citadine" },
    { value: "celerio", label: "Celerio", category: "citadine" },
    { value: "ignis", label: "Ignis", category: "citadine" },
    { value: "baleno", label: "Baleno", category: "citadine" },
    { value: "dzire", label: "Dzire", category: "berline" },
    { value: "ciaz", label: "Ciaz", category: "berline" },
    // Utilitaires
    { value: "ertiga", label: "Ertiga", category: "utilitaire" },
    { value: "xl7", label: "XL7", category: "utilitaire" },
    { value: "apv", label: "APV", category: "utilitaire" },
    { value: "carry", label: "Carry", popular: true, category: "utilitaire" },
    { value: "super carry", label: "Super Carry", category: "utilitaire" },
    { value: "bolan", label: "Bolan", category: "utilitaire" },
  ],

  // ============================================================
  // PRIORITÉ 2 — Autres marques importantes
  // ============================================================
  mazda: [
    { value: "cx-3", label: "CX-3", category: "suv" },
    { value: "cx-30", label: "CX-30", category: "suv" },
    { value: "cx-5", label: "CX-5", popular: true, category: "suv" },
    { value: "cx-7", label: "CX-7", category: "suv" },
    { value: "cx-9", label: "CX-9", category: "suv" },
    { value: "cx-60", label: "CX-60", category: "suv" },
    { value: "cx-90", label: "CX-90", category: "suv" },
    { value: "mazda2", label: "Mazda2", category: "citadine" },
    { value: "mazda3", label: "Mazda3", popular: true, category: "berline" },
    { value: "mazda6", label: "Mazda6", category: "berline" },
    { value: "mx-5", label: "MX-5", popular: true, category: "cabriolet" },
    { value: "mx-30", label: "MX-30", category: "suv" },
    { value: "bt-50", label: "BT-50", category: "pickup" },
    { value: "demio", label: "Demio", category: "citadine" },
    { value: "tribute", label: "Tribute", category: "suv" },
  ],

  honda: [
    // SUVs
    { value: "cr-v", label: "CR-V", popular: true, category: "suv" },
    { value: "hr-v", label: "HR-V", popular: true, category: "suv" },
    { value: "pilot", label: "Pilot", category: "suv" },
    { value: "passport", label: "Passport", category: "suv" },
    { value: "br-v", label: "BR-V", category: "suv" },
    { value: "wr-v", label: "WR-V", category: "suv" },
    // Berlines / citadines
    { value: "civic", label: "Civic", popular: true, category: "berline" },
    { value: "accord", label: "Accord", category: "berline" },
    { value: "city", label: "City", category: "berline" },
    { value: "jazz", label: "Jazz", popular: true, category: "citadine" },
    { value: "fit", label: "Fit", category: "citadine" },
    { value: "insight", label: "Insight", category: "berline" },
    // Utilitaires & pickup
    { value: "odyssey", label: "Odyssey", category: "utilitaire" },
    { value: "ridgeline", label: "Ridgeline", category: "pickup" },
    // Motos Honda (section moto)
    { value: "cbr", label: "CBR", category: "moto" },
    { value: "crf", label: "CRF", category: "moto" },
    { value: "cb", label: "CB", category: "moto" },
    { value: "africa twin", label: "Africa Twin", category: "moto" },
    { value: "gold wing", label: "Gold Wing", category: "moto" },
    { value: "pcx", label: "PCX", category: "scooter" },
    { value: "forza", label: "Forza", category: "scooter" },
    { value: "adv", label: "ADV", category: "scooter" },
    { value: "wave", label: "Wave", popular: true, category: "moto" },
    { value: "xr", label: "XR", category: "moto" },
  ],

  kia: [
    // SUVs
    { value: "sportage", label: "Sportage", popular: true, category: "suv" },
    { value: "sorento", label: "Sorento", popular: true, category: "suv" },
    { value: "seltos", label: "Seltos", category: "suv" },
    { value: "stonic", label: "Stonic", category: "suv" },
    { value: "telluride", label: "Telluride", category: "suv" },
    { value: "niro", label: "Niro", category: "suv" },
    { value: "ev6", label: "EV6", category: "suv" },
    { value: "soul", label: "Soul", category: "suv" },
    { value: "soul ev", label: "Soul EV", category: "suv" },
    // Berlines / citadines
    { value: "rio", label: "Rio", popular: true, category: "citadine" },
    { value: "picanto", label: "Picanto", popular: true, category: "citadine" },
    { value: "morning", label: "Morning", category: "citadine" },
    { value: "cerato", label: "Cerato", category: "berline" },
    { value: "k3", label: "K3", category: "berline" },
    { value: "optima", label: "Optima", category: "berline" },
    { value: "k5", label: "K5", category: "berline" },
    { value: "stinger", label: "Stinger", category: "berline" },
    // Utilitaires
    { value: "carnival", label: "Carnival", category: "utilitaire" },
    { value: "sedona", label: "Sedona", category: "utilitaire" },
  ],

  peugeot: [
    { value: "108", label: "108", category: "citadine" },
    { value: "208", label: "208", popular: true, category: "citadine" },
    { value: "2008", label: "2008", popular: true, category: "suv" },
    { value: "301", label: "301", category: "berline" },
    { value: "308", label: "308", category: "berline" },
    { value: "3008", label: "3008", popular: true, category: "suv" },
    { value: "408", label: "408", category: "berline" },
    { value: "508", label: "508", category: "berline" },
    { value: "5008", label: "5008", category: "suv" },
    { value: "rifter", label: "Rifter", category: "utilitaire" },
    { value: "partner", label: "Partner", popular: true, category: "utilitaire" },
    { value: "expert", label: "Expert", category: "utilitaire" },
    { value: "boxer", label: "Boxer", popular: true, category: "utilitaire" },
    { value: "traveller", label: "Traveller", category: "utilitaire" },
    { value: "landtrek", label: "Landtrek", category: "pickup" },
    { value: "e-208", label: "e-208", category: "citadine" },
    { value: "e-2008", label: "e-2008", category: "suv" },
  ],

  renault: [
    { value: "clio", label: "Clio", popular: true, category: "citadine" },
    { value: "captur", label: "Captur", popular: true, category: "suv" },
    { value: "kwid", label: "Kwid", popular: true, category: "citadine" },
    { value: "logan", label: "Logan", category: "berline" },
    { value: "sandero", label: "Sandero", category: "citadine" },
    { value: "stepway", label: "Stepway", category: "suv" },
    { value: "duster", label: "Duster", popular: true, category: "suv" },
    { value: "koleos", label: "Koleos", category: "suv" },
    { value: "kadjar", label: "Kadjar", category: "suv" },
    { value: "megane", label: "Megane", category: "berline" },
    { value: "talisman", label: "Talisman", category: "berline" },
    { value: "kangoo", label: "Kangoo", popular: true, category: "utilitaire" },
    { value: "trafic", label: "Trafic", category: "utilitaire" },
    { value: "master", label: "Master", popular: true, category: "utilitaire" },
    { value: "alaskan", label: "Alaskan", category: "pickup" },
    { value: "express", label: "Express", category: "utilitaire" },
    { value: "zoe", label: "Zoe", category: "citadine" },
    { value: "twingo", label: "Twingo", category: "citadine" },
    { value: "arkana", label: "Arkana", category: "suv" },
  ],

  volkswagen: [
    { value: "polo", label: "Polo", popular: true, category: "citadine" },
    { value: "golf", label: "Golf", popular: true, category: "berline" },
    { value: "jetta", label: "Jetta", category: "berline" },
    { value: "passat", label: "Passat", category: "berline" },
    { value: "arteon", label: "Arteon", category: "berline" },
    { value: "tiguan", label: "Tiguan", popular: true, category: "suv" },
    { value: "touareg", label: "Touareg", category: "suv" },
    { value: "t-cross", label: "T-Cross", category: "suv" },
    { value: "t-roc", label: "T-Roc", category: "suv" },
    { value: "atlas", label: "Atlas", category: "suv" },
    { value: "amarok", label: "Amarok", popular: true, category: "pickup" },
    { value: "caddy", label: "Caddy", category: "utilitaire" },
    { value: "transporter", label: "Transporter", category: "utilitaire" },
    { value: "caravelle", label: "Caravelle", category: "utilitaire" },
    { value: "multivan", label: "Multivan", category: "utilitaire" },
    { value: "crafter", label: "Crafter", category: "utilitaire" },
    { value: "id.3", label: "ID.3", category: "citadine" },
    { value: "id.4", label: "ID.4", category: "suv" },
    { value: "id.5", label: "ID.5", category: "suv" },
  ],

  bmw: [
    // Séries
    { value: "serie 1", label: "Série 1", category: "berline" },
    { value: "serie 2", label: "Série 2", category: "coupe" },
    { value: "serie 3", label: "Série 3", popular: true, category: "berline" },
    { value: "serie 4", label: "Série 4", category: "coupe" },
    { value: "serie 5", label: "Série 5", popular: true, category: "berline" },
    { value: "serie 6", label: "Série 6", category: "coupe" },
    { value: "serie 7", label: "Série 7", category: "berline" },
    { value: "serie 8", label: "Série 8", category: "coupe" },
    // X
    { value: "x1", label: "X1", category: "suv" },
    { value: "x2", label: "X2", category: "suv" },
    { value: "x3", label: "X3", popular: true, category: "suv" },
    { value: "x4", label: "X4", category: "suv" },
    { value: "x5", label: "X5", popular: true, category: "suv" },
    { value: "x6", label: "X6", category: "suv" },
    { value: "x7", label: "X7", category: "suv" },
    // Sportives & électriques
    { value: "z4", label: "Z4", category: "cabriolet" },
    { value: "m2", label: "M2", category: "coupe" },
    { value: "m3", label: "M3", category: "berline" },
    { value: "m4", label: "M4", category: "coupe" },
    { value: "m5", label: "M5", category: "berline" },
    { value: "i3", label: "i3", category: "citadine" },
    { value: "i4", label: "i4", category: "berline" },
    { value: "ix", label: "iX", category: "suv" },
    { value: "ix3", label: "iX3", category: "suv" },
  ],

  "mercedes-benz": [
    // Classes
    { value: "classe a", label: "Classe A", popular: true, category: "berline" },
    { value: "classe b", label: "Classe B", category: "suv" },
    { value: "classe c", label: "Classe C", popular: true, category: "berline" },
    { value: "classe e", label: "Classe E", popular: true, category: "berline" },
    { value: "classe s", label: "Classe S", category: "berline" },
    { value: "cla", label: "CLA", category: "berline" },
    { value: "cls", label: "CLS", category: "coupe" },
    // GL / SUVs
    { value: "gla", label: "GLA", category: "suv" },
    { value: "glb", label: "GLB", category: "suv" },
    { value: "glc", label: "GLC", popular: true, category: "suv" },
    { value: "gle", label: "GLE", category: "suv" },
    { value: "gls", label: "GLS", category: "suv" },
    { value: "g-class", label: "Classe G", popular: true, category: "suv" },
    // Roadsters / coupés
    { value: "sl", label: "SL", category: "cabriolet" },
    { value: "slk", label: "SLK", category: "cabriolet" },
    { value: "slc", label: "SLC", category: "cabriolet" },
    { value: "amg gt", label: "AMG GT", category: "coupe" },
    // Vans / utilitaires
    { value: "classe v", label: "Classe V", category: "utilitaire" },
    { value: "vito", label: "Vito", popular: true, category: "utilitaire" },
    { value: "sprinter", label: "Sprinter", popular: true, category: "utilitaire" },
    { value: "citan", label: "Citan", category: "utilitaire" },
    // Pick-up
    { value: "x-class", label: "Classe X", category: "pickup" },
    // Électriques
    { value: "eqa", label: "EQA", category: "suv" },
    { value: "eqb", label: "EQB", category: "suv" },
    { value: "eqc", label: "EQC", category: "suv" },
    { value: "eqe", label: "EQE", category: "berline" },
    { value: "eqs", label: "EQS", category: "berline" },
  ],

  audi: [
    // A
    { value: "a1", label: "A1", category: "citadine" },
    { value: "a3", label: "A3", popular: true, category: "berline" },
    { value: "a4", label: "A4", popular: true, category: "berline" },
    { value: "a5", label: "A5", category: "coupe" },
    { value: "a6", label: "A6", popular: true, category: "berline" },
    { value: "a7", label: "A7", category: "coupe" },
    { value: "a8", label: "A8", category: "berline" },
    // Q
    { value: "q2", label: "Q2", category: "suv" },
    { value: "q3", label: "Q3", category: "suv" },
    { value: "q4 e-tron", label: "Q4 e-tron", category: "suv" },
    { value: "q5", label: "Q5", popular: true, category: "suv" },
    { value: "q7", label: "Q7", category: "suv" },
    { value: "q8", label: "Q8", category: "suv" },
    // Sport & électriques
    { value: "tt", label: "TT", category: "coupe" },
    { value: "r8", label: "R8", category: "coupe" },
    { value: "rs3", label: "RS3", category: "berline" },
    { value: "rs6", label: "RS6", category: "berline" },
    { value: "e-tron", label: "e-tron", category: "suv" },
    { value: "e-tron gt", label: "e-tron GT", category: "berline" },
  ],

  // ============================================================
  // PRIORITÉ 3 — Marques budget / émergentes
  // ============================================================
  dacia: [
    { value: "sandero", label: "Sandero", popular: true, category: "citadine" },
    { value: "logan", label: "Logan", popular: true, category: "berline" },
    { value: "duster", label: "Duster", popular: true, category: "suv" },
    { value: "lodgy", label: "Lodgy", category: "utilitaire" },
    { value: "dokker", label: "Dokker", category: "utilitaire" },
    { value: "jogger", label: "Jogger", category: "utilitaire" },
    { value: "spring", label: "Spring", category: "citadine" },
  ],

  chevrolet: [
    { value: "spark", label: "Spark", category: "citadine" },
    { value: "aveo", label: "Aveo", category: "citadine" },
    { value: "cruze", label: "Cruze", category: "berline" },
    { value: "captiva", label: "Captiva", category: "suv" },
    { value: "trailblazer", label: "Trailblazer", popular: true, category: "suv" },
    { value: "trax", label: "Trax", category: "suv" },
    { value: "tahoe", label: "Tahoe", category: "suv" },
    { value: "colorado", label: "Colorado", popular: true, category: "pickup" },
    { value: "silverado", label: "Silverado", category: "pickup" },
    { value: "camaro", label: "Camaro", category: "coupe" },
    { value: "corvette", label: "Corvette", category: "coupe" },
  ],

  isuzu: [
    { value: "d-max", label: "D-Max", popular: true, category: "pickup" },
    { value: "mu-x", label: "MU-X", popular: true, category: "suv" },
    { value: "trooper", label: "Trooper", category: "suv" },
    { value: "rodeo", label: "Rodeo", category: "pickup" },
    { value: "nlr", label: "NLR", category: "camion" },
    { value: "npr", label: "NPR", popular: true, category: "camion" },
    { value: "nqr", label: "NQR", category: "camion" },
    { value: "nps", label: "NPS", category: "camion" },
    { value: "forward", label: "Forward", category: "camion" },
  ],

  ssangyong: [
    { value: "rexton", label: "Rexton", popular: true, category: "suv" },
    { value: "tivoli", label: "Tivoli", category: "suv" },
    { value: "korando", label: "Korando", category: "suv" },
    { value: "actyon", label: "Actyon", category: "suv" },
    { value: "kyron", label: "Kyron", category: "suv" },
    { value: "musso", label: "Musso", popular: true, category: "pickup" },
    { value: "stavic", label: "Stavic", category: "utilitaire" },
  ],

  chery: [
    { value: "tiggo 2", label: "Tiggo 2", category: "suv" },
    { value: "tiggo 4", label: "Tiggo 4", category: "suv" },
    { value: "tiggo 7", label: "Tiggo 7", popular: true, category: "suv" },
    { value: "tiggo 8", label: "Tiggo 8", category: "suv" },
    { value: "arrizo 5", label: "Arrizo 5", category: "berline" },
    { value: "arrizo 6", label: "Arrizo 6", category: "berline" },
    { value: "qq", label: "QQ", category: "citadine" },
  ],

  // Sprint catalogue UI — Great Wall accessible via "great wall" (canonique) ET
  // "gwm" (alias rétro pour annonces legacy stockées sous l'ancien naming).
  gwm: [
    { value: "cannon", label: "Cannon", category: "pickup" },
    { value: "ora", label: "ORA", category: "citadine" },
    { value: "poer", label: "Poer", popular: true, category: "pickup" },
    { value: "poer-kingkong", label: "Poer Kingkong", category: "pickup" },
    { value: "poer-at", label: "POER AT", category: "pickup" },
    { value: "poer-mt", label: "POER MT", category: "pickup" },
    { value: "steed", label: "Steed", category: "pickup" },
    { value: "tank-300", label: "Tank 300", category: "suv" },
    { value: "tank-400", label: "Tank 400", category: "suv" },
    { value: "tank-500", label: "Tank 500", category: "suv" },
    { value: "tank-700", label: "Tank 700", category: "suv" },
    { value: "wey-80", label: "Wey 80", category: "suv" },
    { value: "wingle-5", label: "Wingle 5", category: "pickup" },
    { value: "wingle-5-neuf", label: "Wingle 5 (Neuf)", category: "pickup" },
    { value: "wingle-5-simple-cabine", label: "Wingle 5 Simple Cabine", category: "pickup" },
    { value: "wingle-5-upgrade", label: "Wingle 5 Upgrade", category: "pickup" },
    { value: "wingle-7", label: "Wingle 7", category: "pickup" },
  ],
  "great wall": [
    { value: "cannon", label: "Cannon", category: "pickup" },
    { value: "ora", label: "ORA", category: "citadine" },
    { value: "poer", label: "Poer", popular: true, category: "pickup" },
    { value: "poer-kingkong", label: "Poer Kingkong", category: "pickup" },
    { value: "poer-at", label: "POER AT", category: "pickup" },
    { value: "poer-mt", label: "POER MT", category: "pickup" },
    { value: "steed", label: "Steed", category: "pickup" },
    { value: "tank-300", label: "Tank 300", category: "suv" },
    { value: "tank-400", label: "Tank 400", category: "suv" },
    { value: "tank-500", label: "Tank 500", category: "suv" },
    { value: "tank-700", label: "Tank 700", category: "suv" },
    { value: "wey-80", label: "Wey 80", category: "suv" },
    { value: "wingle-5", label: "Wingle 5", category: "pickup" },
    { value: "wingle-5-neuf", label: "Wingle 5 (Neuf)", category: "pickup" },
    { value: "wingle-5-simple-cabine", label: "Wingle 5 Simple Cabine", category: "pickup" },
    { value: "wingle-5-upgrade", label: "Wingle 5 Upgrade", category: "pickup" },
    { value: "wingle-7", label: "Wingle 7", category: "pickup" },
  ],

  haval: [
    { value: "dargo", label: "Dargo", category: "suv" },
    { value: "h2", label: "H2", category: "suv" },
    { value: "h6", label: "H6", popular: true, category: "suv" },
    { value: "h6-3rd-gen", label: "H6 3rd Gen", category: "suv" },
    { value: "h6-gt", label: "H6 GT", category: "suv" },
    { value: "h6-hev", label: "H6 HEV", category: "suv" },
    { value: "h9", label: "H9", category: "suv" },
    { value: "jolion", label: "Jolion", category: "suv" },
    { value: "ora-good-cat", label: "Ora Good Cat", category: "citadine" },
  ],

  geely: [
    { value: "emgrand", label: "Emgrand", category: "berline" },
    { value: "coolray", label: "Coolray", popular: true, category: "suv" },
    { value: "atlas", label: "Atlas", category: "suv" },
    { value: "azkarra", label: "Azkarra", category: "suv" },
    { value: "tugella", label: "Tugella", category: "suv" },
    { value: "monjaro", label: "Monjaro", category: "suv" },
    { value: "panda", label: "Panda", category: "citadine" },
  ],

  jeep: [
    { value: "wrangler", label: "Wrangler", popular: true, category: "suv" },
    { value: "renegade", label: "Renegade", category: "suv" },
    { value: "compass", label: "Compass", category: "suv" },
    { value: "cherokee", label: "Cherokee", category: "suv" },
    { value: "grand cherokee", label: "Grand Cherokee", popular: true, category: "suv" },
    { value: "gladiator", label: "Gladiator", category: "pickup" },
    { value: "wagoneer", label: "Wagoneer", category: "suv" },
    { value: "avenger", label: "Avenger", category: "suv" },
  ],

  "land rover": [
    { value: "defender", label: "Defender", popular: true, category: "suv" },
    { value: "discovery", label: "Discovery", popular: true, category: "suv" },
    { value: "discovery sport", label: "Discovery Sport", category: "suv" },
    { value: "range rover", label: "Range Rover", popular: true, category: "suv" },
    { value: "range rover sport", label: "Range Rover Sport", category: "suv" },
    { value: "range rover evoque", label: "Range Rover Evoque", category: "suv" },
    { value: "range rover velar", label: "Range Rover Velar", category: "suv" },
    { value: "freelander", label: "Freelander", category: "suv" },
  ],

  jaguar: [
    { value: "xe", label: "XE", category: "berline" },
    { value: "xf", label: "XF", category: "berline" },
    { value: "xj", label: "XJ", category: "berline" },
    { value: "f-pace", label: "F-Pace", popular: true, category: "suv" },
    { value: "e-pace", label: "E-Pace", category: "suv" },
    { value: "i-pace", label: "I-Pace", category: "suv" },
    { value: "f-type", label: "F-Type", category: "coupe" },
  ],

  volvo: [
    { value: "xc40", label: "XC40", category: "suv" },
    { value: "xc60", label: "XC60", popular: true, category: "suv" },
    { value: "xc90", label: "XC90", popular: true, category: "suv" },
    { value: "v60", label: "V60", category: "berline" },
    { value: "v90", label: "V90", category: "berline" },
    { value: "s60", label: "S60", category: "berline" },
    { value: "s90", label: "S90", category: "berline" },
    { value: "c40", label: "C40", category: "suv" },
  ],

  porsche: [
    { value: "911", label: "911", popular: true, category: "coupe" },
    { value: "718 cayman", label: "718 Cayman", category: "coupe" },
    { value: "718 boxster", label: "718 Boxster", category: "cabriolet" },
    { value: "macan", label: "Macan", popular: true, category: "suv" },
    { value: "cayenne", label: "Cayenne", popular: true, category: "suv" },
    { value: "panamera", label: "Panamera", category: "berline" },
    { value: "taycan", label: "Taycan", category: "berline" },
  ],

  tesla: [
    { value: "model s", label: "Model S", category: "berline" },
    { value: "model 3", label: "Model 3", popular: true, category: "berline" },
    { value: "model x", label: "Model X", category: "suv" },
    { value: "model y", label: "Model Y", popular: true, category: "suv" },
    { value: "cybertruck", label: "Cybertruck", category: "pickup" },
  ],

  byd: [
    { value: "atto 3", label: "Atto 3", popular: true, category: "suv" },
    { value: "dolphin", label: "Dolphin", category: "citadine" },
    { value: "han", label: "Han", category: "berline" },
    { value: "seal", label: "Seal", category: "berline" },
    { value: "tang", label: "Tang", category: "suv" },
    { value: "yuan plus", label: "Yuan Plus", category: "suv" },
    { value: "song plus", label: "Song Plus", category: "suv" },
  ],

  opel: [
    { value: "corsa", label: "Corsa", popular: true, category: "citadine" },
    { value: "astra", label: "Astra", popular: true, category: "berline" },
    { value: "insignia", label: "Insignia", category: "berline" },
    { value: "crossland", label: "Crossland", category: "suv" },
    { value: "grandland", label: "Grandland", category: "suv" },
    { value: "mokka", label: "Mokka", category: "suv" },
    { value: "combo", label: "Combo", category: "utilitaire" },
    { value: "vivaro", label: "Vivaro", category: "utilitaire" },
    { value: "movano", label: "Movano", category: "utilitaire" },
  ],

  seat: [
    { value: "ibiza", label: "Ibiza", popular: true, category: "citadine" },
    { value: "leon", label: "Leon", popular: true, category: "berline" },
    { value: "arona", label: "Arona", category: "suv" },
    { value: "ateca", label: "Ateca", category: "suv" },
    { value: "tarraco", label: "Tarraco", category: "suv" },
  ],

  cupra: [
    { value: "formentor", label: "Formentor", popular: true, category: "suv" },
    { value: "born", label: "Born", category: "citadine" },
    { value: "leon", label: "Leon", category: "berline" },
    { value: "ateca", label: "Ateca", category: "suv" },
    { value: "tavascan", label: "Tavascan", category: "suv" },
  ],

  skoda: [
    { value: "fabia", label: "Fabia", popular: true, category: "citadine" },
    { value: "scala", label: "Scala", category: "berline" },
    { value: "octavia", label: "Octavia", popular: true, category: "berline" },
    { value: "superb", label: "Superb", category: "berline" },
    { value: "kamiq", label: "Kamiq", category: "suv" },
    { value: "karoq", label: "Karoq", category: "suv" },
    { value: "kodiaq", label: "Kodiaq", popular: true, category: "suv" },
    { value: "enyaq", label: "Enyaq", category: "suv" },
  ],

  fiat: [
    { value: "panda", label: "Panda", popular: true, category: "citadine" },
    { value: "500", label: "500", popular: true, category: "citadine" },
    { value: "500x", label: "500X", category: "suv" },
    { value: "500l", label: "500L", category: "utilitaire" },
    { value: "tipo", label: "Tipo", category: "berline" },
    { value: "punto", label: "Punto", category: "citadine" },
    { value: "ducato", label: "Ducato", popular: true, category: "utilitaire" },
    { value: "doblo", label: "Doblo", category: "utilitaire" },
    { value: "fiorino", label: "Fiorino", category: "utilitaire" },
    { value: "fullback", label: "Fullback", category: "pickup" },
  ],

  "alfa romeo": [
    { value: "giulia", label: "Giulia", popular: true, category: "berline" },
    { value: "stelvio", label: "Stelvio", popular: true, category: "suv" },
    { value: "tonale", label: "Tonale", category: "suv" },
    { value: "giulietta", label: "Giulietta", category: "berline" },
    { value: "mito", label: "MiTo", category: "citadine" },
  ],

  subaru: [
    { value: "forester", label: "Forester", popular: true, category: "suv" },
    { value: "outback", label: "Outback", popular: true, category: "suv" },
    { value: "xv", label: "XV", category: "suv" },
    { value: "crosstrek", label: "Crosstrek", category: "suv" },
    { value: "impreza", label: "Impreza", category: "berline" },
    { value: "legacy", label: "Legacy", category: "berline" },
    { value: "wrx", label: "WRX", category: "berline" },
    { value: "brz", label: "BRZ", category: "coupe" },
    { value: "ascent", label: "Ascent", category: "suv" },
  ],

  mini: [
    { value: "cooper", label: "Cooper", popular: true, category: "citadine" },
    { value: "cooper s", label: "Cooper S", category: "citadine" },
    { value: "countryman", label: "Countryman", popular: true, category: "suv" },
    { value: "clubman", label: "Clubman", category: "berline" },
    { value: "cabrio", label: "Cabrio", category: "cabriolet" },
    { value: "jcw", label: "John Cooper Works", category: "coupe" },
  ],

  lexus: [
    { value: "lx", label: "LX", popular: true, category: "suv" },
    { value: "gx", label: "GX", category: "suv" },
    { value: "rx", label: "RX", popular: true, category: "suv" },
    { value: "nx", label: "NX", category: "suv" },
    { value: "ux", label: "UX", category: "suv" },
    { value: "is", label: "IS", category: "berline" },
    { value: "es", label: "ES", category: "berline" },
    { value: "ls", label: "LS", category: "berline" },
    { value: "lc", label: "LC", category: "coupe" },
    { value: "rc", label: "RC", category: "coupe" },
  ],

  citroen: [
    { value: "c3", label: "C3", popular: true, category: "citadine" },
    { value: "c3 aircross", label: "C3 Aircross", category: "suv" },
    { value: "c4", label: "C4", category: "berline" },
    { value: "c4 cactus", label: "C4 Cactus", category: "suv" },
    { value: "c5 aircross", label: "C5 Aircross", popular: true, category: "suv" },
    { value: "c5 x", label: "C5 X", category: "berline" },
    { value: "berlingo", label: "Berlingo", popular: true, category: "utilitaire" },
    { value: "jumpy", label: "Jumpy", category: "utilitaire" },
    { value: "jumper", label: "Jumper", category: "utilitaire" },
  ],

  "citroën": [
    // Alias avec accent — même catalogue.
    { value: "c3", label: "C3", popular: true, category: "citadine" },
    { value: "c3 aircross", label: "C3 Aircross", category: "suv" },
    { value: "c4", label: "C4", category: "berline" },
    { value: "c5 aircross", label: "C5 Aircross", popular: true, category: "suv" },
    { value: "berlingo", label: "Berlingo", popular: true, category: "utilitaire" },
    { value: "jumpy", label: "Jumpy", category: "utilitaire" },
    { value: "jumper", label: "Jumper", category: "utilitaire" },
  ],

  tata: [
    { value: "nexon", label: "Nexon", popular: true, category: "suv" },
    { value: "punch", label: "Punch", category: "suv" },
    { value: "harrier", label: "Harrier", category: "suv" },
    { value: "safari", label: "Safari", category: "suv" },
    { value: "tiago", label: "Tiago", category: "citadine" },
    { value: "altroz", label: "Altroz", category: "citadine" },
    { value: "xenon", label: "Xenon", popular: true, category: "pickup" },
    { value: "prima", label: "Prima", category: "camion" },
  ],

  mahindra: [
    { value: "scorpio", label: "Scorpio", popular: true, category: "suv" },
    { value: "scorpio-n", label: "Scorpio N", category: "suv" },
    { value: "scorpio-classic", label: "Scorpio Classic", category: "suv" },
    { value: "scorpio-pik-up", label: "Scorpio Pik-Up", category: "pickup" },
    { value: "xuv300", label: "XUV300", category: "suv" },
    { value: "xuv3xo", label: "XUV3XO", category: "suv" },
    { value: "xuv500", label: "XUV500", category: "suv" },
    { value: "xuv700", label: "XUV700", category: "suv" },
    { value: "thar", label: "Thar", category: "suv" },
    { value: "pik-up", label: "Pik-Up", popular: true, category: "pickup" },
    { value: "bolero", label: "Bolero", category: "suv" },
    { value: "bolero-neo", label: "Bolero Neo", category: "suv" },
    { value: "kuv100", label: "KUV100", category: "suv" },
    { value: "genio", label: "Genio", category: "pickup" },
  ],

  mg: [
    { value: "mg3", label: "MG3", category: "citadine" },
    { value: "zs", label: "ZS", popular: true, category: "suv" },
    { value: "zs ev", label: "ZS EV", category: "suv" },
    { value: "hs", label: "HS", popular: true, category: "suv" },
    { value: "rx5", label: "RX5", category: "suv" },
    { value: "marvel r", label: "Marvel R", category: "suv" },
    { value: "mg5", label: "MG5", category: "berline" },
  ],

  foton: [
    { value: "tunland", label: "Tunland", popular: true, category: "pickup" },
    { value: "ollin", label: "Ollin", category: "camion" },
    { value: "aumark", label: "Aumark", category: "camion" },
    { value: "view", label: "View", category: "utilitaire" },
  ],

  gmc: [
    { value: "sierra", label: "Sierra", category: "pickup" },
    { value: "canyon", label: "Canyon", category: "pickup" },
    { value: "yukon", label: "Yukon", category: "suv" },
    { value: "terrain", label: "Terrain", category: "suv" },
    { value: "acadia", label: "Acadia", category: "suv" },
  ],

  ram: [
    { value: "1500", label: "1500", popular: true, category: "pickup" },
    { value: "2500", label: "2500", category: "pickup" },
    { value: "3500", label: "3500", category: "pickup" },
    { value: "promaster", label: "ProMaster", category: "utilitaire" },
  ],

  infiniti: [
    { value: "qx50", label: "QX50", category: "suv" },
    { value: "qx55", label: "QX55", category: "suv" },
    { value: "qx60", label: "QX60", category: "suv" },
    { value: "qx80", label: "QX80", category: "suv" },
    { value: "q50", label: "Q50", category: "berline" },
    { value: "q60", label: "Q60", category: "coupe" },
  ],

  acura: [
    { value: "mdx", label: "MDX", category: "suv" },
    { value: "rdx", label: "RDX", category: "suv" },
    { value: "tlx", label: "TLX", category: "berline" },
    { value: "integra", label: "Integra", category: "berline" },
  ],

  jmc: [
    { value: "vigus", label: "Vigus", category: "pickup" },
    { value: "n900", label: "N900", category: "camion" },
    { value: "n720", label: "N720", category: "camion" },
  ],

  // ============================================================
  // PRIORITÉ 4 — Motos et deux-roues
  // ============================================================
  yamaha: [
    { value: "yzf-r1", label: "YZF-R1", category: "moto" },
    { value: "yzf-r3", label: "YZF-R3", category: "moto" },
    { value: "yzf-r6", label: "YZF-R6", category: "moto" },
    { value: "mt-03", label: "MT-03", category: "moto" },
    { value: "mt-07", label: "MT-07", category: "moto" },
    { value: "mt-09", label: "MT-09", category: "moto" },
    { value: "mt-15", label: "MT-15", category: "moto" },
    { value: "tenere", label: "Ténéré", category: "moto" },
    { value: "tracer", label: "Tracer", category: "moto" },
    { value: "fz", label: "FZ", category: "moto" },
    { value: "xmax", label: "XMAX", category: "scooter" },
    { value: "tmax", label: "TMAX", category: "scooter" },
    { value: "nmax", label: "NMAX", popular: true, category: "scooter" },
    { value: "jog", label: "Jog", category: "scooter" },
    { value: "sirius", label: "Sirius", category: "moto" },
    { value: "ybr", label: "YBR", popular: true, category: "moto" },
    { value: "aerox", label: "Aerox", category: "scooter" },
  ],

  kawasaki: [
    { value: "ninja", label: "Ninja", popular: true, category: "moto" },
    { value: "ninja 400", label: "Ninja 400", category: "moto" },
    { value: "ninja 650", label: "Ninja 650", category: "moto" },
    { value: "ninja zx-6r", label: "Ninja ZX-6R", category: "moto" },
    { value: "ninja zx-10r", label: "Ninja ZX-10R", category: "moto" },
    { value: "z400", label: "Z400", category: "moto" },
    { value: "z650", label: "Z650", category: "moto" },
    { value: "z900", label: "Z900", category: "moto" },
    { value: "versys", label: "Versys", category: "moto" },
    { value: "klx", label: "KLX", popular: true, category: "moto" },
    { value: "klr", label: "KLR", category: "moto" },
    { value: "vulcan", label: "Vulcan", category: "moto" },
  ],

  "suzuki moto": [
    { value: "gsx-r", label: "GSX-R", popular: true, category: "moto" },
    { value: "gsx-s", label: "GSX-S", category: "moto" },
    { value: "v-strom", label: "V-Strom", category: "moto" },
    { value: "hayabusa", label: "Hayabusa", category: "moto" },
    { value: "burgman", label: "Burgman", category: "scooter" },
    { value: "address", label: "Address", category: "scooter" },
  ],

  ktm: [
    { value: "duke 200", label: "Duke 200", popular: true, category: "moto" },
    { value: "duke 390", label: "Duke 390", category: "moto" },
    { value: "duke 690", label: "Duke 690", category: "moto" },
    { value: "duke 890", label: "Duke 890", category: "moto" },
    { value: "rc 390", label: "RC 390", category: "moto" },
    { value: "adventure 390", label: "Adventure 390", category: "moto" },
    { value: "adventure 890", label: "Adventure 890", category: "moto" },
    { value: "adventure 1290", label: "Adventure 1290", category: "moto" },
    { value: "exc", label: "EXC", category: "moto" },
    { value: "sx-f", label: "SX-F", category: "moto" },
  ],

  ducati: [
    { value: "panigale", label: "Panigale", popular: true, category: "moto" },
    { value: "monster", label: "Monster", category: "moto" },
    { value: "streetfighter", label: "Streetfighter", category: "moto" },
    { value: "multistrada", label: "Multistrada", category: "moto" },
    { value: "scrambler", label: "Scrambler", category: "moto" },
    { value: "diavel", label: "Diavel", category: "moto" },
    { value: "desertx", label: "DesertX", category: "moto" },
  ],

  vespa: [
    { value: "primavera", label: "Primavera", popular: true, category: "scooter" },
    { value: "sprint", label: "Sprint", category: "scooter" },
    { value: "gts", label: "GTS", category: "scooter" },
    { value: "elettrica", label: "Elettrica", category: "scooter" },
  ],

  piaggio: [
    { value: "beverly", label: "Beverly", category: "scooter" },
    { value: "liberty", label: "Liberty", category: "scooter" },
    { value: "mp3", label: "MP3", category: "scooter" },
    { value: "ape", label: "Ape", category: "utilitaire" },
    { value: "porter", label: "Porter", category: "utilitaire" },
  ],

  aprilia: [
    { value: "rsv4", label: "RSV4", category: "moto" },
    { value: "tuono", label: "Tuono", category: "moto" },
    { value: "rs 660", label: "RS 660", category: "moto" },
    { value: "sr", label: "SR", category: "scooter" },
    { value: "scarabeo", label: "Scarabeo", category: "scooter" },
  ],

  "royal enfield": [
    { value: "classic 350", label: "Classic 350", popular: true, category: "moto" },
    { value: "classic 500", label: "Classic 500", category: "moto" },
    { value: "meteor 350", label: "Meteor 350", category: "moto" },
    { value: "himalayan", label: "Himalayan", popular: true, category: "moto" },
    { value: "interceptor 650", label: "Interceptor 650", category: "moto" },
    { value: "continental gt 650", label: "Continental GT 650", category: "moto" },
  ],

  tvs: [
    { value: "apache", label: "Apache", popular: true, category: "moto" },
    { value: "star", label: "Star", category: "moto" },
    { value: "sport", label: "Sport", category: "moto" },
    { value: "king", label: "King", category: "utilitaire" },
    { value: "ntorq", label: "NTorq", category: "scooter" },
    { value: "jupiter", label: "Jupiter", category: "scooter" },
    { value: "xl", label: "XL", category: "moto" },
  ],

  bajaj: [
    { value: "pulsar", label: "Pulsar", popular: true, category: "moto" },
    { value: "pulsar 150", label: "Pulsar 150", category: "moto" },
    { value: "pulsar 180", label: "Pulsar 180", category: "moto" },
    { value: "pulsar 220", label: "Pulsar 220", category: "moto" },
    { value: "discover", label: "Discover", popular: true, category: "moto" },
    { value: "boxer", label: "Boxer", popular: true, category: "moto" },
    { value: "ct100", label: "CT100", category: "moto" },
    { value: "avenger", label: "Avenger", category: "moto" },
    { value: "dominar", label: "Dominar", category: "moto" },
    { value: "re", label: "RE (tuk-tuk)", category: "utilitaire" },
  ],

  benelli: [
    { value: "tnt", label: "TNT", category: "moto" },
    { value: "trk 502", label: "TRK 502", popular: true, category: "moto" },
    { value: "leoncino", label: "Leoncino", category: "moto" },
    { value: "imperiale 400", label: "Imperiale 400", category: "moto" },
  ],

  cfmoto: [
    { value: "300nk", label: "300NK", category: "moto" },
    { value: "650nk", label: "650NK", category: "moto" },
    { value: "650mt", label: "650MT", category: "moto" },
    { value: "800mt", label: "800MT", category: "moto" },
  ],

  kymco: [
    { value: "agility", label: "Agility", category: "scooter" },
    { value: "downtown", label: "Downtown", category: "scooter" },
    { value: "xciting", label: "Xciting", category: "scooter" },
    { value: "like", label: "Like", category: "scooter" },
  ],

  // ============================================================
  // PRIORITÉ 5 — Camions / utilitaires lourds
  // ============================================================
  iveco: [
    { value: "daily", label: "Daily", popular: true, category: "utilitaire" },
    { value: "eurocargo", label: "Eurocargo", category: "camion" },
    { value: "stralis", label: "Stralis", category: "camion" },
    { value: "trakker", label: "Trakker", category: "camion" },
    { value: "s-way", label: "S-Way", category: "camion" },
  ],

  man: [
    { value: "tge", label: "TGE", category: "utilitaire" },
    { value: "tgl", label: "TGL", category: "camion" },
    { value: "tgm", label: "TGM", category: "camion" },
    { value: "tgs", label: "TGS", category: "camion" },
    { value: "tgx", label: "TGX", category: "camion" },
  ],

  scania: [
    { value: "serie r", label: "Série R", category: "camion" },
    { value: "serie s", label: "Série S", category: "camion" },
    { value: "serie p", label: "Série P", category: "camion" },
    { value: "serie g", label: "Série G", category: "camion" },
  ],

  // Sport & luxe (marques présentes par imports spécialisés)
  ferrari: [
    { value: "488", label: "488", category: "coupe" },
    { value: "f8", label: "F8", category: "coupe" },
    { value: "sf90", label: "SF90", category: "coupe" },
    { value: "296", label: "296", category: "coupe" },
    { value: "roma", label: "Roma", category: "coupe" },
    { value: "portofino", label: "Portofino", category: "cabriolet" },
  ],

  lamborghini: [
    { value: "huracan", label: "Huracán", category: "coupe" },
    { value: "aventador", label: "Aventador", category: "coupe" },
    { value: "urus", label: "Urus", category: "suv" },
    { value: "revuelto", label: "Revuelto", category: "coupe" },
  ],

  maserati: [
    { value: "ghibli", label: "Ghibli", category: "berline" },
    { value: "quattroporte", label: "Quattroporte", category: "berline" },
    { value: "levante", label: "Levante", category: "suv" },
    { value: "grecale", label: "Grecale", category: "suv" },
    { value: "mc20", label: "MC20", category: "coupe" },
  ],

  bentley: [
    { value: "continental gt", label: "Continental GT", category: "coupe" },
    { value: "flying spur", label: "Flying Spur", category: "berline" },
    { value: "bentayga", label: "Bentayga", category: "suv" },
  ],

  "rolls-royce": [
    { value: "phantom", label: "Phantom", category: "berline" },
    { value: "ghost", label: "Ghost", category: "berline" },
    { value: "cullinan", label: "Cullinan", category: "suv" },
    { value: "wraith", label: "Wraith", category: "coupe" },
    { value: "dawn", label: "Dawn", category: "cabriolet" },
    { value: "spectre", label: "Spectre", category: "coupe" },
  ],

  "aston martin": [
    { value: "vantage", label: "Vantage", category: "coupe" },
    { value: "db11", label: "DB11", category: "coupe" },
    { value: "dbx", label: "DBX", category: "suv" },
    { value: "dbs", label: "DBS", category: "coupe" },
  ],

  dodge: [
    { value: "challenger", label: "Challenger", category: "coupe" },
    { value: "charger", label: "Charger", category: "berline" },
    { value: "durango", label: "Durango", category: "suv" },
    { value: "ram 1500", label: "Ram 1500", category: "pickup" },
  ],

  // Sprint catalogue UI — marques chinoises ajoutées au front (Brilliance / Enranger /
  // Kaiyi / Jetta = marque autonome FAW-VW, à ne pas confondre avec le modèle
  // Volkswagen Jetta).
  brilliance: [
    { value: "v3", label: "V3", category: "suv" },
    { value: "v5", label: "V5", category: "suv" },
    { value: "v6", label: "V6", category: "suv" },
    { value: "v7", label: "V7", category: "suv" },
    { value: "h230", label: "H230", category: "berline" },
    { value: "h320", label: "H320", category: "berline" },
    { value: "h330", label: "H330", category: "berline" },
    { value: "h530", label: "H530", category: "berline" },
  ],

  enranger: [
    { value: "g3", label: "G3", category: "berline" },
    { value: "g5", label: "G5", category: "suv" },
  ],

  kaiyi: [
    { value: "x3", label: "X3", popular: true, category: "suv" },
    { value: "x3-pro", label: "X3 Pro", category: "suv" },
    { value: "e5", label: "E5", category: "berline" },
  ],

  jetta: [
    { value: "vs5", label: "VS5", category: "suv" },
    { value: "vs7", label: "VS7", category: "suv" },
    { value: "va3", label: "VA3", category: "berline" },
  ],
};

// ============================================================
// Helpers
// ============================================================

/**
 * Retourne les modèles catalogués pour une marque donnée, ou un tableau vide
 * si la marque n'est pas référencée (saisie custom possible).
 */
export function getModelsForBrand(
  brand: string | null | undefined,
): VehicleModelSuggestion[] {
  if (!brand) return [];
  const key = brand.trim().toLowerCase();
  return VEHICLE_MODELS_BY_BRAND[key] ?? [];
}

/**
 * Normalise une valeur de modèle saisie (trim + lowercase) pour éviter les
 * doublons DB « RAV4 » vs « rav4 » vs « Rav 4 ».
 */
export function normalizeVehicleModel(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Retourne le label officiel (capitalisation constructeur) pour un couple
 * marque / modèle. Fallback : capitalisation titre-case de la saisie brute.
 */
export function getVehicleModelLabel(
  brand: string | null | undefined,
  value: string | null | undefined,
): string {
  if (!value) return "";
  const models = getModelsForBrand(brand);
  const match = models.find((m) => m.value === value.toLowerCase());
  if (match) return match.label;
  // Fallback : title-case (mot à mot) sans détruire la casse des chiffres.
  return value
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

/**
 * Retourne les suggestions populaires en premier, puis le reste par ordre
 * alphabétique (stable pour le Combobox).
 */
export function getSortedModelsForBrand(
  brand: string | null | undefined,
): VehicleModelSuggestion[] {
  const models = getModelsForBrand(brand);
  const popular = models.filter((m) => m.popular);
  const rest = models
    .filter((m) => !m.popular)
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return [...popular, ...rest];
}
