export interface SeedListing {
  id: string;
  title: string;
  description: string;
  type: 'appartement' | 'villa' | 'maison' | 'terrain' | 'local_commercial' | 'bureau';
  transaction: 'vente' | 'location' | 'location_vacances';
  price_mga: number;
  surface: number;
  rooms: number;
  bathrooms: number;
  region: string;
  city: string;
  lat: number;
  lng: number;
  features: string[];
  images: string[];
  agency_id: string;
  badge?: 'boost' | 'coup_de_coeur' | 'nouveau';
}

export const seedAgencies = [
  { id: "ag1", name: "Ofim Madagascar", slug: "ofim-madagascar", bio: "Leader de l'immobilier à Madagascar depuis 2005. Plus de 500 biens en portefeuille.", logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop", verified: true },
  { id: "ag2", name: "Immobilier.mg", slug: "immobilier-mg", bio: "Votre partenaire immobilier de confiance sur toute l'île. Vente, location et gestion locative.", logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop", verified: true },
  { id: "ag3", name: "Nosy Be Properties", slug: "nosy-be-properties", bio: "Spécialiste de l'immobilier touristique et résidentiel à Nosy Be et les îles.", logo: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&h=100&fit=crop", verified: true },
];

export const seedListings: SeedListing[] = [
  // Analamanga - Antananarivo
  { id: "l1", title: "Appartement moderne à Ivandry", description: "Bel appartement T3 avec vue panoramique sur la ville. Résidence sécurisée avec gardien 24h/24. Proche ambassades et centres commerciaux.", type: "appartement", transaction: "vente", price_mga: 350000000, surface: 95, rooms: 3, bathrooms: 2, region: "Analamanga", city: "Antananarivo", lat: -18.8872, lng: 47.5342, features: ["Ascenseur", "Parking", "Gardien", "Balcon", "Vue panoramique"], images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"], agency_id: "ag1", badge: "boost" },
  { id: "l2", title: "Villa de standing à Ambatobe", description: "Superbe villa de 5 chambres avec piscine et jardin tropical. Quartier résidentiel prisé, proche lycée français.", type: "villa", transaction: "vente", price_mga: 1200000000, surface: 350, rooms: 5, bathrooms: 4, region: "Analamanga", city: "Antananarivo", lat: -18.8985, lng: 47.5456, features: ["Piscine", "Jardin", "Garage double", "Alarme", "Cuisine équipée"], images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800", "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"], agency_id: "ag1", badge: "coup_de_coeur" },
  { id: "l3", title: "Bureau open-space Ankorondrano", description: "Plateau de bureaux modernes dans le quartier d'affaires. Climatisation centrale, fibre optique, parking sous-sol.", type: "bureau", transaction: "location", price_mga: 8500000, surface: 200, rooms: 1, bathrooms: 2, region: "Analamanga", city: "Antananarivo", lat: -18.8950, lng: 47.5215, features: ["Climatisation", "Fibre optique", "Parking", "Sécurité"], images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800"], agency_id: "ag2" },
  // Vakinankaratra - Antsirabe
  { id: "l4", title: "Maison coloniale à Antsirabe", description: "Charmante maison coloniale rénovée avec cachet d'origine. Grand jardin arboré, proche centre thermal.", type: "villa", transaction: "vente", price_mga: 280000000, surface: 220, rooms: 4, bathrooms: 2, region: "Vakinankaratra", city: "Antsirabe", lat: -19.8659, lng: 47.0333, features: ["Jardin", "Cheminée", "Cave", "Véranda"], images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800", "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"], agency_id: "ag2", badge: "nouveau" },
  { id: "l5", title: "Appartement T2 centre Antsirabe", description: "Appartement lumineux au cœur de la ville thermale. Idéal pour investissement locatif.", type: "appartement", transaction: "location", price_mga: 1500000, surface: 55, rooms: 2, bathrooms: 1, region: "Vakinankaratra", city: "Antsirabe", lat: -19.8700, lng: 47.0300, features: ["Meublé", "Eau chaude", "Proche commerces"], images: ["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"], agency_id: "ag2" },
  // DIANA - Nosy Be
  { id: "l6", title: "Villa pieds dans l'eau Nosy Be", description: "Villa d'exception avec accès direct plage. Vue imprenable sur le canal de Mozambique. Parfait pour location saisonnière.", type: "villa", transaction: "vente", price_mga: 2500000000, surface: 280, rooms: 4, bathrooms: 3, region: "DIANA", city: "Nosy Be", lat: -13.3167, lng: 48.2667, features: ["Plage privée", "Piscine à débordement", "Terrasse", "Personnel de maison"], images: ["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800", "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800"], agency_id: "ag3", badge: "coup_de_coeur" },
  { id: "l7", title: "Bungalow tropical Ambatoloaka", description: "Charmant bungalow dans un cadre tropical. Idéal pour location vacances. À 5 min de la plage.", type: "villa", transaction: "location_vacances", price_mga: 250000, surface: 60, rooms: 2, bathrooms: 1, region: "DIANA", city: "Nosy Be", lat: -13.3980, lng: 48.1980, features: ["Climatisation", "Wi-Fi", "Terrasse", "Jardin tropical"], images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"], agency_id: "ag3" },
  { id: "l8", title: "Terrain vue mer Diego Suarez", description: "Terrain constructible de 2000m² avec vue spectaculaire sur la baie de Diego. Titre foncier en règle.", type: "terrain", transaction: "vente", price_mga: 180000000, surface: 2000, rooms: 0, bathrooms: 0, region: "DIANA", city: "Antsiranana", lat: -12.2795, lng: 49.2913, features: ["Vue mer", "Titre foncier", "Accès route bitumée", "Eau et électricité"], images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"], agency_id: "ag3", badge: "boost" },
  // Analanjirofo - Sainte-Marie
  { id: "l9", title: "Lodge bord de mer Sainte-Marie", description: "Ensemble de 6 bungalows sur la côte est de l'île Sainte-Marie. Activité hôtelière rentable.", type: "local_commercial", transaction: "vente", price_mga: 1800000000, surface: 500, rooms: 6, bathrooms: 6, region: "Analanjirofo", city: "Sainte-Marie", lat: -17.0833, lng: 49.85, features: ["Bord de mer", "Restaurant", "Kayaks", "Générateur"], images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800"], agency_id: "ag3" },
  // Atsimo-Andrefana - Toliara
  { id: "l10", title: "Villa bord de plage Ifaty", description: "Belle villa à Ifaty face au lagon. Idéale pour résidence secondaire ou hébergement touristique.", type: "villa", transaction: "vente", price_mga: 650000000, surface: 180, rooms: 3, bathrooms: 2, region: "Atsimo-Andrefana", city: "Toliara", lat: -23.15, lng: 43.62, features: ["Plage", "Terrasse", "Panneau solaire", "Citerne d'eau"], images: ["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800"], agency_id: "ag1", badge: "nouveau" },
  { id: "l11", title: "Local commercial centre Toliara", description: "Local commercial sur l'avenue principale. Fort passage piéton. Idéal commerce ou bureau.", type: "local_commercial", transaction: "location", price_mga: 3500000, surface: 120, rooms: 1, bathrooms: 1, region: "Atsimo-Andrefana", city: "Toliara", lat: -23.3516, lng: 43.6854, features: ["Vitrine", "Climatisation", "Stockage"], images: ["https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800"], agency_id: "ag1" },
  // Boeny - Mahajanga
  { id: "l12", title: "Appartement vue mer Mahajanga", description: "T3 avec terrasse face à la Corniche. Coucher de soleil spectaculaire chaque soir.", type: "appartement", transaction: "vente", price_mga: 280000000, surface: 85, rooms: 3, bathrooms: 1, region: "Boeny", city: "Mahajanga", lat: -15.7167, lng: 46.3167, features: ["Vue mer", "Terrasse", "Parking", "Gardien"], images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"], agency_id: "ag2", badge: "boost" },
  { id: "l13", title: "Villa avec jardin Grand Pavois", description: "Villa familiale dans le quartier Grand Pavois. Jardin clôturé, proche plage et restaurants.", type: "villa", transaction: "location", price_mga: 4500000, surface: 160, rooms: 4, bathrooms: 2, region: "Boeny", city: "Mahajanga", lat: -15.7200, lng: 46.3200, features: ["Jardin", "Garage", "Groupe électrogène", "Forage"], images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"], agency_id: "ag2" },
  // Atsinanana - Toamasina
  { id: "l14", title: "Entrepôt zone portuaire Toamasina", description: "Entrepôt de 800m² dans la zone industrielle proche du port. Accès conteneurs facile.", type: "local_commercial", transaction: "location", price_mga: 12000000, surface: 800, rooms: 1, bathrooms: 1, region: "Atsinanana", city: "Toamasina", lat: -18.1443, lng: 49.3958, features: ["Quai de chargement", "Sécurité 24h", "Grande hauteur sous plafond"], images: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800"], agency_id: "ag1" },
  { id: "l15", title: "Appartement T2 boulevard Joffre", description: "Appartement rénové sur le boulevard principal. Proche port, banques et commerces.", type: "appartement", transaction: "vente", price_mga: 150000000, surface: 65, rooms: 2, bathrooms: 1, region: "Atsinanana", city: "Toamasina", lat: -18.1500, lng: 49.4000, features: ["Rénové", "Climatisation", "Proche port"], images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"], agency_id: "ag1" },
  // Haute Matsiatra - Fianarantsoa
  { id: "l16", title: "Maison haute-ville Fianarantsoa", description: "Maison de caractère dans la vieille ville. Architecture traditionnelle, vue sur les rizières.", type: "villa", transaction: "vente", price_mga: 180000000, surface: 150, rooms: 3, bathrooms: 1, region: "Haute Matsiatra", city: "Fianarantsoa", lat: -21.4425, lng: 47.0856, features: ["Vue rizières", "Cour intérieure", "Proche cathédrale"], images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"], agency_id: "ag2" },
  // SAVA
  { id: "l17", title: "Plantation de vanille Sambava", description: "Exploitation de vanille de 5 hectares. Production certifiée, infrastructure de séchage. Investissement rentable.", type: "terrain", transaction: "vente", price_mga: 800000000, surface: 50000, rooms: 0, bathrooms: 0, region: "SAVA", city: "Sambava", lat: -14.2667, lng: 50.1667, features: ["Plantation active", "Infrastructure", "Personnel formé", "Certification"], images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"], agency_id: "ag1" },
  { id: "l18", title: "Maison de maître Antalaha", description: "Grande maison coloniale à Antalaha, cœur de la région vanille. Potentiel chambres d'hôtes.", type: "villa", transaction: "vente", price_mga: 350000000, surface: 300, rooms: 6, bathrooms: 3, region: "SAVA", city: "Antalaha", lat: -14.9, lng: 50.28, features: ["Colonial", "Grand terrain", "Dépendances", "Proche centre"], images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"], agency_id: "ag1" },
  // Alaotra-Mangoro
  { id: "l19", title: "Terrain agricole Ambatondrazaka", description: "Terrain rizicole de 10 hectares dans le grenier à riz de Madagascar. Irrigation assurée.", type: "terrain", transaction: "vente", price_mga: 200000000, surface: 100000, rooms: 0, bathrooms: 0, region: "Alaotra-Mangoro", city: "Ambatondrazaka", lat: -17.83, lng: 48.42, features: ["Irrigué", "Accès route", "Titre foncier", "Sol fertile"], images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"], agency_id: "ag2" },
  { id: "l20", title: "Maison Moramanga proche gare", description: "Maison rénovée proche de la gare et de la RN2. Idéal pour commerce ou habitation.", type: "villa", transaction: "vente", price_mga: 120000000, surface: 100, rooms: 3, bathrooms: 1, region: "Alaotra-Mangoro", city: "Moramanga", lat: -18.95, lng: 48.22, features: ["Proche gare", "RN2", "Rénovée", "Cour"], images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"], agency_id: "ag2" },
  // Menabe - Morondava
  { id: "l21", title: "Lodge Allée des Baobabs", description: "Écolodge de charme à proximité de l'Allée des Baobabs. 4 bungalows, restaurant, excellent taux d'occupation.", type: "local_commercial", transaction: "vente", price_mga: 1500000000, surface: 400, rooms: 4, bathrooms: 4, region: "Menabe", city: "Morondava", lat: -20.2833, lng: 44.2833, features: ["Proche Baobabs", "Restaurant", "Panneaux solaires", "Forage"], images: ["https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800"], agency_id: "ag3", badge: "coup_de_coeur" },
  // Anosy - Fort-Dauphin
  { id: "l22", title: "Villa Libanona Fort-Dauphin", description: "Villa avec vue sur la baie de Libanona. Proche des plus belles plages du sud.", type: "villa", transaction: "location_vacances", price_mga: 350000, surface: 120, rooms: 3, bathrooms: 2, region: "Anosy", city: "Tôlanaro (Fort-Dauphin)", lat: -25.0314, lng: 46.9825, features: ["Vue mer", "Terrasse", "Climatisation", "Parking"], images: ["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800"], agency_id: "ag1" },
  // Itasy
  { id: "l23", title: "Terrain lac Itasy", description: "Beau terrain au bord du lac Itasy. Cadre naturel exceptionnel, idéal projet éco-tourisme.", type: "terrain", transaction: "vente", price_mga: 80000000, surface: 5000, rooms: 0, bathrooms: 0, region: "Itasy", city: "Miarinarivo", lat: -19.0, lng: 46.9, features: ["Bord de lac", "Vue", "Accès route", "Calme"], images: ["https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800"], agency_id: "ag2" },
  // Sofia
  { id: "l24", title: "Maison Antsohihy centre", description: "Maison en dur au centre-ville d'Antsohihy. Proche marché et services administratifs.", type: "villa", transaction: "vente", price_mga: 95000000, surface: 110, rooms: 3, bathrooms: 1, region: "Sofia", city: "Antsohihy", lat: -14.88, lng: 47.99, features: ["Centre-ville", "Titre foncier", "Eau courante"], images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"], agency_id: "ag1" },
  // Boeny
  { id: "l25", title: "Terrain bord de mer Katsepy", description: "Grand terrain en front de mer à Katsepy, face à Mahajanga. Projet hôtelier ou résidentiel.", type: "terrain", transaction: "vente", price_mga: 450000000, surface: 8000, rooms: 0, bathrooms: 0, region: "Boeny", city: "Mahajanga", lat: -15.76, lng: 46.27, features: ["Front de mer", "Grande superficie", "Vue canal Mozambique"], images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"], agency_id: "ag3", badge: "nouveau" },
  // Amoron'i Mania
  { id: "l26", title: "Maison artisanale Ambositra", description: "Maison traditionnelle Zafimaniry à Ambositra, capitale de l'artisanat. Boiseries sculptées d'exception.", type: "villa", transaction: "vente", price_mga: 160000000, surface: 140, rooms: 3, bathrooms: 1, region: "Amoron'i Mania", city: "Ambositra", lat: -20.53, lng: 47.24, features: ["Boiseries", "Artisanat", "Jardin", "Centre-ville"], images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"], agency_id: "ag2" },
  // Betsiboka
  { id: "l27", title: "Propriété Maevatanana", description: "Grande propriété avec terrain agricole. Climat chaud, sols fertiles pour cultures tropicales.", type: "terrain", transaction: "vente", price_mga: 110000000, surface: 15000, rooms: 0, bathrooms: 0, region: "Betsiboka", city: "Maevatanana", lat: -16.95, lng: 46.83, features: ["Sol fertile", "Eau disponible", "Accès RN4"], images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"], agency_id: "ag1" },
  // Ihorombe
  { id: "l28", title: "Ranch Ihosy", description: "Propriété de 20 hectares adaptée à l'élevage de zébus. Pâturages naturels, point d'eau.", type: "terrain", transaction: "vente", price_mga: 300000000, surface: 200000, rooms: 0, bathrooms: 0, region: "Ihorombe", city: "Ihosy", lat: -22.4, lng: 46.12, features: ["Pâturages", "Point d'eau", "Clôturé", "Accès route"], images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"], agency_id: "ag1" },
  // Vatovavy
  { id: "l29", title: "Maison coloniale Mananjary", description: "Ancienne demeure coloniale à Mananjary. Potentiel de rénovation, grand terrain, proche canal.", type: "villa", transaction: "vente", price_mga: 130000000, surface: 200, rooms: 4, bathrooms: 2, region: "Vatovavy", city: "Mananjary", lat: -21.22, lng: 48.34, features: ["Colonial", "Grand terrain", "Proche canal", "À rénover"], images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"], agency_id: "ag2" },
  // Analamanga - more
  { id: "l30", title: "Duplex luxe Ivandry", description: "Magnifique duplex de 180m² dans résidence haut standing. Piscine commune, salle de sport, sécurité.", type: "appartement", transaction: "location", price_mga: 6500000, surface: 180, rooms: 4, bathrooms: 3, region: "Analamanga", city: "Antananarivo", lat: -18.885, lng: 47.530, features: ["Duplex", "Piscine", "Salle de sport", "Sécurité 24h", "Standing"], images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800", "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"], agency_id: "ag1", badge: "boost" },
];

export type SeedBlogSection = {
  heading: string;
  paragraphs?: string[];
  checklistTitle?: string;
  checklist?: string[];
  bulletsTitle?: string;
  bullets?: string[];
};

export type SeedBlogFaqItem = {
  question: string;
  answer: string;
};

export type SeedBlogPost = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  category: string;
  published_at: string;
  updated_at: string;
  readingTime: string;
  cover: string;
  coverAlt: string;
  tags: string[];
  intro: string;
  sections: SeedBlogSection[];
  faq: SeedBlogFaqItem[];
  conclusion: string;
};

export const seedBlogPosts: SeedBlogPost[] = [
  {
    id: "b5",
    slug: "frais-agence-immobiliere-madagascar",
    title: "Frais d’agence immobilière à Madagascar : qui paie, combien, et à quel moment ?",
    seoTitle:
      "Frais d’agence immobilière à Madagascar : qui paie, combien et quand ? (guide pratique 2026)",
    metaDescription:
      "Guide clair sur les frais d’agence immobilière à Madagascar : commission vente, frais location, mandat exclusif ou simple, paiement et points à vérifier avant signature.",
    excerpt:
      "Honoraires, commission, mandat exclusif, location ou vente : ce guide explique les pratiques observées à Madagascar et ce que vous devez vérifier avant de vous engager.",
    category: "Marché immobilier",
    published_at: "2026-04-13",
    updated_at: "2026-04-13",
    readingTime: "10 min",
    cover: "/blog-covers/frais-agence-madagascar.svg",
    coverAlt: "Documents de contrat immobilier et commission d'agence à Madagascar",
    tags: [
      "frais d’agence immobilière Madagascar",
      "commission agence immobilière Madagascar",
      "honoraires agence immobilière Madagascar",
      "frais agence location Madagascar",
      "frais agence vente Madagascar",
      "mandat exclusif immobilier Madagascar",
    ],
    intro:
      "À Madagascar, il n’existe pas un tarif unique et officiel qui s’applique à toutes les agences immobilières. En pratique, les frais varient selon l’agence, le type d’opération (vente ou location), le mandat signé et les services réellement fournis. L’objectif de ce guide est simple : vous aider à comprendre qui paie, combien cela peut représenter et à quel moment c’est dû, sans confusion.",
    sections: [
      {
        heading: "À quoi correspondent les frais d’agence ?",
        paragraphs: [
          "Les honoraires d’agence ne rémunèrent pas seulement la mise en relation. Selon les dossiers, ils couvrent aussi la préparation commerciale du bien (photos, diffusion d’annonce), les visites, la qualification des acquéreurs ou locataires, la négociation et une partie de l’accompagnement administratif.",
          "En location, certaines agences incluent aussi la préparation du bail, l’état des lieux et un suivi d’entrée dans les lieux. Le périmètre exact doit toujours être écrit noir sur blanc.",
        ],
        bulletsTitle: "Services généralement inclus (selon les agences)",
        bullets: [
          "Mise en relation vendeur/bailleur et acquéreur/locataire",
          "Organisation des visites",
          "Diffusion et valorisation de l’annonce",
          "Préqualification des candidats",
          "Négociation commerciale",
          "Accompagnement administratif (bail, état des lieux, formalités)",
        ],
      },
      {
        heading: "Vente : qui paie et combien ?",
        paragraphs: [
          "Dans de nombreuses pratiques observées, les frais de vente sont supportés par le vendeur, mais ce n’est pas une règle universelle : cela dépend de la convention de mandat et de la structuration de l’offre.",
          "Sur le marché malgache, on voit souvent des fourchettes constatées autour de 5% à 10% pour certaines agences. D’autres publient des modèles différenciés (mandat exclusif vs non exclusif), des frais fixes ou des barèmes dégressifs selon le montant de la transaction.",
        ],
        checklistTitle: "Ce qu’il faut retenir pour une vente",
        checklist: [
          "La commission n’est pas uniforme d’une agence à l’autre",
          "Le mode de calcul peut être au pourcentage, fixe ou hybride",
          "Le payeur (vendeur, acquéreur ou partage) doit être explicitement indiqué",
          "La base de calcul doit être précisée (prix net, prix acte, etc.)",
        ],
      },
      {
        heading: "Location : quelles pratiques observe-t-on ?",
        paragraphs: [
          "En location, les pratiques sont souvent encore plus variées. On peut rencontrer des frais équivalents à un mois de loyer, des fractions de mois, des pourcentages, ou des services facturés séparément selon les cas.",
          "Il est donc essentiel de vérifier le détail avant signature : montant exact, personne qui paie, date d’exigibilité et liste des prestations incluses.",
        ],
        bulletsTitle: "Points à contrôler en location",
        bullets: [
          "Montant des frais d’agence",
          "Qui paie (bailleur, locataire, ou répartition)",
          "Moment de paiement (signature, entrée, après validation)",
          "Inclus / non inclus : visites, dossier, bail, état des lieux",
        ],
      },
      {
        heading: "Mandat exclusif ou non exclusif : pourquoi les frais changent ?",
        paragraphs: [
          "Un mandat exclusif signifie qu’une seule agence est missionnée pour commercialiser le bien sur une période donnée. En contrepartie de cette exclusivité, certaines agences appliquent des taux plus compétitifs.",
          "En mandat non exclusif, plusieurs intermédiaires peuvent intervenir : la concurrence peut accélérer la visibilité, mais certaines agences affichent alors des niveaux de commission plus élevés pour couvrir l’incertitude commerciale.",
          "On trouve ainsi, dans des exemples publiés, des modèles type 3% en exclusif vs 5% en non exclusif. Ces chiffres restent des exemples observés, pas une norme générale.",
        ],
      },
      {
        heading: "Ce qu’il faut absolument vérifier avant de signer",
        checklistTitle: "Checklist contractuelle",
        checklist: [
          "Montant exact des honoraires",
          "Partie qui paie les frais",
          "Moment précis d’exigibilité",
          "Services inclus dans les honoraires",
          "Durée du mandat",
          "Exclusivité ou non",
          "Conditions de remboursement (ou non)",
          "Document écrit clair et signé",
        ],
      },
      {
        heading: "Peut-on négocier les frais d’agence ?",
        paragraphs: [
          "Oui, dans certains cas. La négociation est souvent plus probable sur les actifs de valeur élevée, les biens faciles à commercialiser ou les mandats apportant une forte visibilité à l’agence.",
          "Mais ce n’est pas automatique : une agence structurée avec un vrai service (qualité de diffusion, tri des candidats, rigueur documentaire, accompagnement jusqu’à la signature) peut justifier des honoraires plus élevés.",
        ],
      },
      {
        heading: "Comment savoir si les frais sont justifiés ?",
        bullets: [
          "Transparence du barème et du contrat",
          "Qualité des photos et de la diffusion",
          "Connaissance réelle du marché local",
          "Capacité à filtrer les visiteurs/candidats",
          "Niveau d’accompagnement administratif",
          "Clarté sur les délais et engagements",
        ],
        paragraphs: [
          "Le bon critère n’est pas seulement “le taux le plus bas”, mais le rapport entre coût, sécurité et efficacité de la transaction.",
        ],
      },
    ],
    faq: [
      {
        question: "Les frais d’agence sont-ils obligatoires à Madagascar ?",
        answer:
          "Ils ne sont pas automatiques par nature : ils résultent d’un accord contractuel avec une agence. Ce qui compte, c’est ce qui est écrit dans le mandat ou la convention.",
      },
      {
        question: "Qui paie les frais d’agence pour une location ?",
        answer:
          "Selon les pratiques observées, cela varie : bailleur, locataire ou répartition. Il faut vérifier le contrat avant engagement.",
      },
      {
        question: "Peut-on négocier les honoraires d’une agence immobilière ?",
        answer:
          "Oui dans certains dossiers, surtout sur des biens à forte valeur ou des mandats attractifs, mais ce n’est pas systématique.",
      },
      {
        question: "Mandat exclusif ou simple : quelle différence ?",
        answer:
          "Le mandat exclusif confie la vente/location à une seule agence pendant une durée donnée ; le simple (non exclusif) permet plusieurs agences. Cela influence souvent la structure de frais.",
      },
      {
        question: "Les visites sont-elles payantes ?",
        answer:
          "Selon les agences, les visites peuvent être incluses ou indirectement intégrées dans les honoraires globaux. Vérifiez ce point dans l’offre.",
      },
      {
        question: "Quand les honoraires doivent-ils être payés ?",
        answer:
          "Le moment d’exigibilité varie (signature, finalisation, entrée dans les lieux, etc.). Il doit être précisé clairement dans l’accord.",
      },
    ],
    conclusion:
      "Sur les frais d’agence immobilière à Madagascar, la règle clé est la transparence contractuelle : il n’y a pas de tarif unique valable partout. Comparez les offres, vérifiez les termes écrits et évaluez la qualité de service autant que le pourcentage affiché.",
  },
  {
    id: "b1",
    slug: "acheter-terrain-madagascar",
    title: "Acheter un terrain à Madagascar : ce qu'il faut savoir",
    seoTitle: "Acheter un terrain à Madagascar : guide pratique 2026 (étapes, frais, pièges)",
    metaDescription:
      "Guide complet pour acheter un terrain à Madagascar : CSJ, vérifications cadastrales, acte de vente, enregistrement, mutation, budget et checklist acheteur.",
    excerpt:
      "Avant de signer, sécurisez votre achat avec une méthode claire : documents à vérifier, étapes officielles, coûts à anticiper et erreurs fréquentes à éviter.",
    category: "Acheter",
    published_at: "2026-03-15",
    updated_at: "2026-04-13",
    readingTime: "12 min",
    cover: "/blog-covers/terrain-madagascar.svg",
    coverAlt: "Illustration d'un terrain cadastral avec documents de vente",
    tags: ["terrain", "achat", "cadastre", "mutation", "notaire", "immobilier madagascar"],
    intro:
      "Acheter un terrain à Madagascar peut être une excellente décision patrimoniale, à condition de respecter une discipline stricte de vérification. Dans la pratique, la plupart des litiges viennent d’un contrôle documentaire insuffisant ou d’un enchaînement d’étapes mal exécuté. Ce guide vous donne une feuille de route concrète pour avancer avec méthode.",
    sections: [
      {
        heading: "Pourquoi les achats de terrain tournent parfois mal",
        paragraphs: [
          "Le risque n’est pas seulement “juridique” au sens abstrait : il est opérationnel. Un dossier incomplet, un certificat ancien, une incohérence entre le vendeur et le titre ou un retard de formalisation peut suffire à bloquer votre projet plusieurs mois.",
          "À Madagascar, il faut raisonner en séquence : vérifier, formaliser, enregistrer, puis muter. Sauter une étape pour aller plus vite revient souvent à déplacer le problème vers l’aval, quand il est plus coûteux à corriger.",
        ],
        bulletsTitle: "Les causes les plus fréquentes de blocage",
        bullets: [
          "CSJ obsolète ou non demandé avant la signature",
          "Absence de cohérence entre le titre, le vendeur et la parcelle réellement vendue",
          "Acte de vente incomplet ou imprécis sur la désignation du bien",
          "Enregistrement tardif et mutation non finalisée",
        ],
      },
      {
        heading: "Documents à vérifier avant toute signature",
        paragraphs: [
          "Commencez par le Certificat de Situation Juridique (CSJ) et assurez-vous qu’il est récent. C’est la base pour confirmer la situation du bien au moment de l’opération.",
          "Vérifiez ensuite le titre et les éléments cadastraux, puis demandez la prescription d’urbanisme / autorisation de transaction lorsque le cas l’exige. L’objectif est d’éliminer les ambiguïtés avant l’acte.",
        ],
        checklistTitle: "Checklist documentaire minimale",
        checklist: [
          "CSJ récent",
          "Titre foncier et identité du titulaire concordants",
          "Références cadastrales cohérentes avec la parcelle visitée",
          "Prescription d’urbanisme / autorisation de transaction (si applicable)",
          "Pièces d’identité des parties et pouvoirs valides",
        ],
      },
      {
        heading: "Processus officiel étape par étape (vente entre particuliers)",
        paragraphs: [
          "1) Vérifications préalables : CSJ, titre/cadastre, capacité des parties. 2) Prescription d’urbanisme / autorisation de transaction : dans certains guides pratiques, le délai indicatif observé est d’environ 2 jours.",
          "3) Acte de vente : formalisation écrite complète (désignation du bien, prix, parties, modalités). Délai indicatif observé dans certains parcours : environ 48 heures. 4) Enregistrement : souvent autour de 5 jours dans des parcours standards.",
          "5) Mutation / changement de propriétaire : c’est une étape indispensable, et non un “détail administratif”. Tant qu’elle n’est pas finalisée, votre sécurité juridique reste incomplète.",
        ],
      },
      {
        heading: "Frais et budget : comment raisonner sans mauvaise surprise",
        paragraphs: [
          "Les montants exacts varient selon la nature du bien, la zone, l’acte et le cadre fiscal des parties. Dans certains guides de référence sur l’achat de terrain, on retrouve à titre indicatif : acte de vente autour de 2,5%, enregistrement autour de 5% pour l’acheteur et 5% pour le vendeur.",
          "Utilisez ces repères comme des ordres de grandeur et validez toujours les montants actualisés avec votre notaire / professionnel local avant signature.",
        ],
        checklistTitle: "Budget à préparer en amont",
        checklist: [
          "Prix du terrain",
          "Frais d’acte",
          "Droits d’enregistrement",
          "Frais administratifs de mutation",
          "Marge de sécurité pour délai et imprévus",
        ],
      },
      {
        heading: "Erreurs à éviter absolument",
        bullets: [
          "Signer sur la base de copies non vérifiées",
          "Payer sans traçabilité claire et sans acte prêt",
          "Reporter l’enregistrement et la mutation à “plus tard”",
          "Confondre vitesse de négociation et sécurité juridique",
        ],
      },
    ],
    faq: [
      {
        question: "Le CSJ est-il vraiment indispensable avant achat ?",
        answer:
          "Oui, c’est l’un des documents clés pour valider la situation juridique du bien au moment de la vente.",
      },
      {
        question: "La mutation peut-elle être faite plus tard ?",
        answer:
          "Techniquement, certains dossiers prennent du temps, mais la mutation ne doit pas être négligée : elle sécurise réellement votre propriété.",
      },
      {
        question: "Les pourcentages de frais sont-ils fixes ?",
        answer:
          "Non. Les chiffres cités sont des repères indicatifs observés dans des guides pratiques. Vérifiez systématiquement les conditions en vigueur.",
      },
    ],
    conclusion:
      "Un achat terrain réussi à Madagascar repose sur une logique simple : vérifiez d’abord, formalisez proprement, enregistrez sans délai, puis finalisez la mutation. Cette rigueur protège votre investissement bien mieux qu’une négociation “rapide”.",
  },
  {
    id: "b2",
    slug: "fiscalite-immobiliere-madagascar-2026",
    title: "Fiscalité immobilière à Madagascar 2026",
    seoTitle: "Fiscalité immobilière à Madagascar 2026 : impôts, taxes et points de vigilance",
    metaDescription:
      "Comprendre la fiscalité immobilière à Madagascar en 2026 : IFT, IFPB, location, détention, revente, documents à vérifier et logique de budget.",
    excerpt:
      "Un guide pratique pour anticiper les taxes immobilières à Madagascar sans confusion : achat, détention, location, revente et vérifications clés avant transaction.",
    category: "Fiscalité",
    published_at: "2026-02-28",
    updated_at: "2026-04-13",
    readingTime: "11 min",
    cover: "/blog-covers/fiscalite-madagascar.svg",
    coverAlt: "Illustration de fiscalité immobilière avec documents et calculs",
    tags: ["fiscalité", "IFT", "IFPB", "location", "revente", "DGI"],
    intro:
      "La fiscalité immobilière influence directement la rentabilité d’un bien. Le bon réflexe est de raisonner en cycle de vie : achat, détention, location éventuelle, puis revente ou transmission. Ce guide vous donne un cadre clair pour budgéter et éviter les mauvaises surprises.",
    sections: [
      {
        heading: "Les taxes à connaître lors de l’achat",
        paragraphs: [
          "Au moment d’acheter, la fiscalité ne se limite pas au prix affiché. Selon la nature de l’acte et le statut des parties, des droits et frais s’ajoutent.",
          "Le plus important n’est pas d’apprendre une liste théorique, mais de demander un chiffrage écrit prévisionnel avant de signer.",
        ],
      },
      {
        heading: "Les taxes en phase de détention",
        paragraphs: [
          "Deux repères sont fréquemment cités dans le cadre local : l’IFT (Impôt foncier sur les terrains), souvent présenté autour de 1% de la valeur vénale du terrain, et l’IFPB (Impôt foncier sur la propriété bâtie), souvent évoqué dans une fourchette d’environ 5% à 10% de la valeur locative.",
          "Ces repères restent indicatifs : selon la commune, la qualification du bien et les textes applicables, le résultat concret peut varier.",
        ],
        bulletsTitle: "Ce qu’il faut vérifier pour chaque bien",
        bullets: [
          "Base de calcul retenue localement",
          "Périodicité de déclaration et échéances",
          "Éventuelles exonérations/abattements applicables",
          "Situation fiscale antérieure du bien",
        ],
      },
      {
        heading: "Si vous mettez le bien en location",
        paragraphs: [
          "La mise en location crée des obligations de suivi : loyers déclarés, justificatifs, cohérence entre bail et encaissements. Votre rentabilité nette dépend autant de la fiscalité que du taux d’occupation.",
          "Un loyer “élevé” sans maîtrise des charges, vacance et fiscalité peut produire un rendement réel inférieur à un bien plus modeste mais mieux géré.",
        ],
      },
      {
        heading: "Avant revente ou transfert : anticiper au lieu de subir",
        paragraphs: [
          "La sortie (revente, cession, transfert) est souvent sous-estimée. Pourtant, c’est là que des écarts de fiscalité ou de formalisation peuvent réduire fortement la marge.",
          "Préparez cette étape en amont avec vos pièces à jour et un scénario chiffré conservateur.",
        ],
        checklistTitle: "Documents à demander / consolider",
        checklist: [
          "Justificatifs fiscaux récents",
          "Pièces de propriété et historique d’actes",
          "Éléments de valorisation du bien",
          "Estimation de fiscalité de sortie par professionnel",
        ],
      },
      {
        heading: "Exemples de logique budgétaire (pratique)",
        bullets: [
          "Scénario prudent : loyers modérés + vacance partielle + fiscalité haute",
          "Scénario médian : occupation stable + fiscalité conforme au budget",
          "Scénario optimiste : bonne occupation + maîtrise des charges",
        ],
        paragraphs: [
          "Comparer ces scénarios avant achat aide à éviter des projections trop optimistes.",
        ],
      },
    ],
    faq: [
      {
        question: "Les taux IFT/IFPB sont-ils identiques partout ?",
        answer:
          "Non, ce sont des repères indicatifs utiles. Le traitement réel dépend du cadre applicable et des autorités compétentes.",
      },
      {
        question: "Peut-on boucler une transaction sans conseil fiscal local ?",
        answer:
          "C’est fortement déconseillé. Une validation DGI / notaire / comptable réduit fortement le risque d’erreur coûteuse.",
      },
      {
        question: "La fiscalité est-elle secondaire face au prix d’achat ?",
        answer:
          "Non. Sur la durée, elle peut modifier significativement la rentabilité nette d’un investissement.",
      },
    ],
    conclusion:
      "En immobilier, la fiscalité n’est pas un détail administratif. C’est un facteur de performance et de sécurité. Restez prudent sur les chiffres “généraux” et validez toujours votre cas concret avant engagement.",
  },
  {
    id: "b3",
    slug: "investir-nosy-be-guide-complet",
    title: "Investir à Nosy Be : guide complet",
    seoTitle: "Investir à Nosy Be : analyse 2026 (demande, risques, stratégie locative)",
    metaDescription:
      "Guide complet pour investir à Nosy Be : dynamique touristique 2025, potentiel locatif, saisonnalité, risques, due diligence et stratégie long terme.",
    excerpt:
      "Nosy Be attire les investisseurs, mais la performance dépend d’une vraie analyse locale : demande, saisonnalité, contraintes d’exploitation et gestion du risque.",
    category: "Investir",
    published_at: "2026-01-20",
    updated_at: "2026-04-13",
    readingTime: "13 min",
    cover: "/blog-covers/nosy-be-investissement.svg",
    coverAlt: "Illustration de côte à Nosy Be avec analyse d'investissement immobilier",
    tags: ["nosy be", "investissement", "location saisonnière", "tourisme", "rendement"],
    intro:
      "Nosy Be n’est pas seulement une destination “carte postale”. C’est un micro-marché immobilier tiré par le tourisme, avec des opportunités réelles mais aussi des risques spécifiques. Investir efficacement suppose de traiter l’île comme un actif économique, pas comme une promesse abstraite.",
    sections: [
      {
        heading: "Pourquoi Nosy Be attire les investisseurs",
        paragraphs: [
          "Les données de trafic et d’arrivées confirment une dynamique positive. Sur janvier-août 2025, les arrivées autour de 79 659 (vs 64 095 en 2024) et les mouvements passagers autour de 160 188 (vs 132 832) traduisent une montée de la demande.",
          "Des rapports locaux mentionnent également un volume d’environ 264 604 passagers en 2025 et une progression d’environ +13% des arrivées touristiques versus 2024. Le poids des clientèles internationales (notamment italienne et française) est un facteur structurant.",
        ],
      },
      {
        heading: "Ce qui soutient vraiment la demande locative",
        bulletsTitle: "Drivers clés",
        bullets: [
          "Attractivité touristique internationale",
          "Durées de séjour variables selon saison",
          "Demande de biens meublés bien situés",
          "Recherche d’expériences premium et de services",
        ],
        paragraphs: [
          "Le rendement dépend souvent plus de la qualité d’exploitation (gestion, entretien, commercialisation) que du simple achat du bien.",
        ],
      },
      {
        heading: "Quels actifs privilégier selon votre stratégie",
        paragraphs: [
          "Pour la location saisonnière, privilégiez les biens lisibles commercialement : accès, état, équipements, qualité visuelle, facilité de maintenance.",
          "Pour une stratégie plus défensive, un mix partiel avec location longue durée peut lisser la saisonnalité et stabiliser les revenus.",
        ],
      },
      {
        heading: "Risques à ne pas sous-estimer",
        bullets: [
          "Saisonnalité et variabilité du taux d’occupation",
          "Dépendance forte au trafic aérien et au contexte touristique",
          "Pression sur services/infrastructure selon zones",
          "Risque opérationnel (gestion, maintenance, vacance)",
        ],
        paragraphs: [
          "Un projet rentable sur tableur peut devenir fragile si ces paramètres sont ignorés.",
        ],
      },
      {
        heading: "Évaluer un bien à Nosy Be : méthode de due diligence",
        checklistTitle: "Checklist investisseur",
        checklist: [
          "Documents de propriété et situation juridique à jour",
          "Historique locatif (si disponible) et saisonnalité réelle",
          "Coûts d’exploitation (entretien, personnel, commercialisation)",
          "Scénario prudent de remplissage et de prix moyen",
          "Plan de sortie (revente, repositionnement, long terme)",
        ],
      },
      {
        heading: "Saisonnier vs long terme : choisir sans dogme",
        paragraphs: [
          "Le saisonnier peut offrir un meilleur revenu brut, mais avec plus de volatilité et d’intensité opérationnelle. Le long terme réduit le turnover et simplifie la gestion.",
          "Beaucoup d’investisseurs performants utilisent une stratégie hybride selon la localisation, la saison et le profil de bien.",
        ],
      },
    ],
    faq: [
      {
        question: "Nosy Be est-il automatiquement rentable ?",
        answer:
          "Non. Le marché est attractif, mais la performance dépend de l’actif, de la gestion et de votre discipline financière.",
      },
      {
        question: "Faut-il viser uniquement la location courte durée ?",
        answer:
          "Pas forcément. Une approche mixte peut améliorer la résilience du projet selon votre tolérance au risque.",
      },
      {
        question: "Quelle est l’erreur la plus fréquente ?",
        answer:
          "Surpayer un bien en supposant une occupation élevée constante sans scénario prudent d’exploitation.",
      },
    ],
    conclusion:
      "Nosy Be peut être un excellent terrain d’investissement, à condition d’être piloté comme un actif professionnel : hypothèses réalistes, contrôle des coûts, gestion opérationnelle solide et stratégie claire selon la saison.",
  },
  {
    id: "b4",
    slug: "louer-antananarivo-quartiers-prix",
    title: "Louer à Antananarivo : quartiers et prix",
    seoTitle: "Louer à Antananarivo : quartiers, loyers observés et checklist locataire",
    metaDescription:
      "Guide pratique pour louer à Antananarivo : profils de quartiers (Ivandry, Ambatobe, Ankorondrano, Ivato…), loyers observés et vérifications avant bail.",
    excerpt:
      "Un guide concret pour choisir votre quartier à Antananarivo selon votre style de vie, votre budget et vos contraintes de mobilité, avec loyers observés sur les annonces.",
    category: "Louer",
    published_at: "2026-01-05",
    updated_at: "2026-04-13",
    readingTime: "12 min",
    cover: "/blog-covers/location-antananarivo.svg",
    coverAlt: "Illustration urbaine d'Antananarivo pour un guide de location",
    tags: ["location antananarivo", "quartiers", "loyers", "ivandry", "ambatobe"],
    intro:
      "Louer à Antananarivo ne se résume pas à “trouver un bon prix”. Le quartier influence votre qualité de vie, votre sécurité perçue, votre temps de trajet et vos coûts indirects. Ce guide vous aide à comparer intelligemment les zones clés avec des loyers observés sur les annonces.",
    sections: [
      {
        heading: "Comment choisir un quartier avant de regarder le prix",
        bullets: [
          "Temps de trajet quotidien réel (heures de pointe)",
          "Accès aux services (écoles, commerces, santé)",
          "Niveau de bruit et circulation",
          "Sécurité perçue et type d’immeuble/résidence",
        ],
        paragraphs: [
          "Commencez par définir vos non-négociables. Le loyer “moins cher” devient vite coûteux si la localisation dégrade fortement votre quotidien.",
        ],
      },
      {
        heading: "Profils de quartiers clés à Antananarivo",
        paragraphs: [
          "Ivandry, Ambatobe, Ankorondrano et certains secteurs comme Androhibe ou Ankerana sont souvent recherchés pour leur équilibre entre accessibilité, services et image résidentielle/professionnelle.",
          "Des zones comme Ivato, Nanisana ou Talatamaty peuvent proposer des points d’entrée plus accessibles selon le type de bien et l’état du marché.",
        ],
        bulletsTitle: "Lecture rapide par zone",
        bullets: [
          "Ivandry / Ambatobe : demande premium, loyers plus élevés",
          "Ankorondrano : pratique pour profils actifs/pro",
          "Androhibe / Ankerana : secteurs attractifs mais hétérogènes",
          "Ivato / Talatamaty / Nanisana : options plus abordables selon offre",
        ],
      },
      {
        heading: "Loyers observés (annonces) : comment les interpréter",
        paragraphs: [
          "Les montants ci-dessous sont des observations de marché sur les annonces, pas des statistiques officielles. Début 2026, on observe des entrées à quelques centaines d’euros/mois dans des secteurs plus accessibles, et des niveaux pouvant monter vers 900 € à 1 800 €+ pour des villas ou grands biens mieux situés.",
          "La dispersion est forte selon : surface réelle, état du bien, sécurité de la résidence, ameublement, équipements et accès.",
        ],
        checklistTitle: "Pour comparer deux loyers correctement",
        checklist: [
          "Inclure charges, sécurité, parking, internet",
          "Comparer l’état réel et non uniquement les photos",
          "Vérifier la durée minimale et clauses de révision",
          "Évaluer le coût transport/temps au quotidien",
        ],
      },
      {
        heading: "Avant de signer un bail : points de contrôle",
        bullets: [
          "État des lieux précis (photos + écrit)",
          "Dépôt de garantie et conditions de restitution",
          "Qui paie quoi (charges, maintenance, réparations)",
          "Conditions de sortie et préavis",
        ],
      },
      {
        heading: "Meublé vs non meublé : quel arbitrage ?",
        paragraphs: [
          "Le meublé facilite une installation rapide mais coûte souvent plus cher et peut inclure des standards très variables.",
          "Le non meublé offre parfois un meilleur équilibre long terme si vous prévoyez une installation durable.",
        ],
      },
      {
        heading: "Checklist locataire (version terrain)",
        checklist: [
          "Visiter à deux horaires différents (jour + fin de journée)",
          "Tester eau, électricité, réseau mobile/internet",
          "Demander les charges réelles des 3 derniers mois",
          "Confirmer le montant total d’entrée (loyer + dépôt + frais)",
          "Relire toutes les clauses avant signature",
        ],
      },
    ],
    faq: [
      {
        question: "Les loyers indiqués sont-ils des moyennes officielles ?",
        answer:
          "Non, ce sont des fourchettes observées sur les annonces. Elles servent de repère pratique, pas de référence statistique officielle.",
      },
      {
        question: "Quel quartier choisir pour un budget serré ?",
        answer:
          "Regardez en priorité les secteurs à entrée plus basse (selon l’offre du moment), tout en vérifiant transport, sécurité et charges.",
      },
      {
        question: "Faut-il privilégier uniquement les quartiers premium ?",
        answer:
          "Pas nécessairement. Le bon choix est celui qui équilibre budget, confort quotidien et contraintes de mobilité.",
      },
    ],
    conclusion:
      "Pour bien louer à Antananarivo, comparez d’abord les quartiers selon votre vie réelle, puis négociez le prix avec une grille de lecture complète (charges, état, accès, sécurité). C’est ce qui fait la différence entre “logement trouvé” et “location réussie”.",
  },
];
