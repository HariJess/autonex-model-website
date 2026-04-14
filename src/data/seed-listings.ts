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
  { id: "ag1", name: "AutoCenter Madagascar", slug: "ofim-madagascar", bio: "Concessionnaire automobile à Madagascar. Véhicules neufs, occasions certifiées et accompagnement complet.", logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop", verified: true },
  { id: "ag2", name: "Drive Plus MG", slug: "immobilier-mg", bio: "Votre partenaire auto de confiance sur toute l'île. Achat, vente, reprise et financement.", logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop", verified: true },
  { id: "ag3", name: "Nosy Be Motors", slug: "nosy-be-properties", bio: "Spécialiste des véhicules premium, 4x4 et utilitaires à Nosy Be et dans les îles.", logo: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&h=100&fit=crop", verified: true },
];

export const seedListings: SeedListing[] = [
  { id: "l1", title: "Toyota RAV4 2021 — très bon état à Ivandry", description: "SUV 4x4 essence, entretien suivi, intérieur cuir, caméra de recul et écran tactile. Véhicule prêt à rouler.", type: "villa", transaction: "vente", price_mga: 350000000, surface: 68000, rooms: 3, bathrooms: 5, region: "Analamanga", city: "Antananarivo", lat: -18.8872, lng: 47.5342, features: ["Boîte automatique", "Caméra de recul", "Bluetooth", "4x4", "Climatisation"], images: ["https://images.unsplash.com/photo-1549924231-f129b911e442?w=800", "https://images.unsplash.com/photo-1493238792000-8113da705763?w=800"], agency_id: "ag1", badge: "boost" },
  { id: "l2", title: "Land Cruiser Prado 2020 — version premium", description: "4x4 robuste pour route et piste, historique d’entretien disponible, sellerie cuir et aides à la conduite.", type: "villa", transaction: "vente", price_mga: 1200000000, surface: 54000, rooms: 5, bathrooms: 5, region: "Analamanga", city: "Antananarivo", lat: -18.8985, lng: 47.5456, features: ["4x4", "GPS intégré", "Toit ouvrant", "Caméra 360", "Faible kilométrage"], images: ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800", "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800"], agency_id: "ag1", badge: "coup_de_coeur" },
  { id: "l3", title: "Mitsubishi Canter utilitaire — disponible immédiatement", description: "Camion léger idéal livraison urbaine et inter-ville. Châssis sain, moteur révisé, documents à jour.", type: "bureau", transaction: "location", price_mga: 8500000, surface: 121000, rooms: 1, bathrooms: 2, region: "Analamanga", city: "Antananarivo", lat: -18.8950, lng: 47.5215, features: ["Utilitaire", "Faible consommation", "Direction assistée", "Entretien à jour"], images: ["https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800", "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800"], agency_id: "ag2" },
  { id: "l4", title: "Hyundai Tucson 2019 — excellent rapport qualité/prix", description: "SUV confortable, motorisation fiable, parfait pour trajets quotidiens et longs déplacements à Madagascar.", type: "villa", transaction: "vente", price_mga: 280000000, surface: 79000, rooms: 4, bathrooms: 5, region: "Vakinankaratra", city: "Antsirabe", lat: -19.8659, lng: 47.0333, features: ["Boîte automatique", "Climatisation", "Bluetooth", "Capteurs de stationnement"], images: ["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800", "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800"], agency_id: "ag2", badge: "nouveau" },
  { id: "l5", title: "Suzuki Swift 2018 — citadine économique", description: "Voiture compacte, idéale ville, faible consommation, direction souple et entretien régulier.", type: "appartement", transaction: "location", price_mga: 1500000, surface: 93000, rooms: 2, bathrooms: 4, region: "Vakinankaratra", city: "Antsirabe", lat: -19.8700, lng: 47.0300, features: ["Faible consommation", "Climatisation", "Bluetooth"], images: ["https://images.unsplash.com/photo-1592853598064-65e05f3f6af1?w=800"], agency_id: "ag2" },
  { id: "l6", title: "Ford Ranger 4x4 — prêt pour routes difficiles", description: "Pick-up robuste, capacité de chargement élevée, idéal chantier, entreprise ou usage mixte.", type: "local_commercial", transaction: "vente", price_mga: 2500000000, surface: 46000, rooms: 4, bathrooms: 4, region: "DIANA", city: "Nosy Be", lat: -13.3167, lng: 48.2667, features: ["4x4", "Double cabine", "Caméra de recul", "Climatisation"], images: ["https://images.unsplash.com/photo-1597007030739-6d2e2d7baf0f?w=800", "https://images.unsplash.com/photo-1551830820-330a71b99659?w=800"], agency_id: "ag3", badge: "coup_de_coeur" },
  { id: "l7", title: "Yamaha NMAX 155 — scooter urbain récent", description: "Scooter confortable pour ville, faible entretien, consommation maîtrisée, parfait déplacements quotidiens.", type: "terrain", transaction: "location_vacances", price_mga: 250000, surface: 18000, rooms: 2, bathrooms: 2, region: "DIANA", city: "Nosy Be", lat: -13.3980, lng: 48.1980, features: ["Injection", "Frein ABS", "Faible consommation"], images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800"], agency_id: "ag3" },
  { id: "l8", title: "Kawasaki KLX 250 — trail polyvalent", description: "Moto fiable pour ville et piste, suspension rehaussée, entretien récent, papiers en règle.", type: "terrain", transaction: "vente", price_mga: 180000000, surface: 26000, rooms: 3, bathrooms: 0, region: "DIANA", city: "Antsiranana", lat: -12.2795, lng: 49.2913, features: ["Trail", "Suspension renforcée", "Pneus mixtes"], images: ["https://images.unsplash.com/photo-1558981403-c5f9891c8a2e?w=800"], agency_id: "ag3", badge: "boost" },
  { id: "l9", title: "Peugeot Boxer 2020 — utilitaire grand volume", description: "Fourgon spacieux, idéal logistique et livraisons inter-villes. Très bon état général.", type: "local_commercial", transaction: "vente", price_mga: 420000000, surface: 89000, rooms: 2, bathrooms: 2, region: "Analanjirofo", city: "Sainte-Marie", lat: -17.0833, lng: 49.85, features: ["Grand volume", "Porte latérale", "Climatisation cabine"], images: ["https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800"], agency_id: "ag3" },
  { id: "l10", title: "Nissan Navara 2019 — pick-up double cabine", description: "Pick-up polyvalent pour travail et usage personnel. Moteur fiable, carnet d’entretien disponible.", type: "local_commercial", transaction: "vente", price_mga: 650000000, surface: 74000, rooms: 3, bathrooms: 4, region: "Atsimo-Andrefana", city: "Toliara", lat: -23.15, lng: 43.62, features: ["Double cabine", "4x4", "Caméra de recul"], images: ["https://images.unsplash.com/photo-1551830820-330a71b99659?w=800"], agency_id: "ag1", badge: "nouveau" },
  { id: "l11", title: "Renault Duster 2018 — SUV économique", description: "SUV compact, adapté aux routes malgaches, bonne garde au sol et entretien simple.", type: "villa", transaction: "location", price_mga: 3500000, surface: 102000, rooms: 2, bathrooms: 4, region: "Atsimo-Andrefana", city: "Toliara", lat: -23.3516, lng: 43.6854, features: ["SUV", "Climatisation", "Faible consommation"], images: ["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800"], agency_id: "ag1" },
  { id: "l12", title: "Honda Civic 2020 — berline élégante", description: "Berline confortable avec intérieur premium, motorisation sobre et très bon comportement routier.", type: "maison", transaction: "vente", price_mga: 280000000, surface: 61000, rooms: 3, bathrooms: 4, region: "Boeny", city: "Mahajanga", lat: -15.7167, lng: 46.3167, features: ["Boîte automatique", "Bluetooth", "Caméra de recul"], images: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800"], agency_id: "ag2", badge: "boost" },
  { id: "l13", title: "Mazda CX-5 2019 — SUV familial", description: "SUV spacieux, confortable en ville et sur route, idéal pour une famille active.", type: "villa", transaction: "location", price_mga: 4500000, surface: 83000, rooms: 3, bathrooms: 5, region: "Boeny", city: "Mahajanga", lat: -15.7200, lng: 46.3200, features: ["SUV", "Toit ouvrant", "GPS intégré"], images: ["https://images.unsplash.com/photo-1493238792000-8113da705763?w=800"], agency_id: "ag2" },
  { id: "l14", title: "Isuzu NPR — camion de distribution", description: "Camion léger robuste pour distribution urbaine et périurbaine.", type: "bureau", transaction: "location", price_mga: 12000000, surface: 140000, rooms: 2, bathrooms: 2, region: "Atsinanana", city: "Toamasina", lat: -18.1443, lng: 49.3958, features: ["Grande capacité", "Cabine simple", "Entretien suivi"], images: ["https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800"], agency_id: "ag1" },
  { id: "l15", title: "Kia Rio 2019 — fiable et économique", description: "Citadine fiable avec coût d’usage maîtrisé, parfaite pour les trajets quotidiens.", type: "appartement", transaction: "vente", price_mga: 150000000, surface: 88000, rooms: 2, bathrooms: 4, region: "Atsinanana", city: "Toamasina", lat: -18.1500, lng: 49.4000, features: ["Faible consommation", "Bluetooth", "Airbags"], images: ["https://images.unsplash.com/photo-1592853598064-65e05f3f6af1?w=800"], agency_id: "ag1" },
  { id: "l16", title: "Subaru Forester 2017 — 4x4 polyvalent", description: "Véhicule polyvalent, sécurité renforcée et excellente tenue de route.", type: "villa", transaction: "vente", price_mga: 180000000, surface: 112000, rooms: 2, bathrooms: 5, region: "Haute Matsiatra", city: "Fianarantsoa", lat: -21.4425, lng: 47.0856, features: ["4x4", "ABS", "Aide en côte"], images: ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800"], agency_id: "ag2" },
  { id: "l17", title: "Yamaha YBR 125 — moto économique", description: "Moto légère, idéale pour trajets urbains, entretien facile et pièces accessibles.", type: "terrain", transaction: "vente", price_mga: 80000000, surface: 22000, rooms: 1, bathrooms: 0, region: "SAVA", city: "Sambava", lat: -14.2667, lng: 50.1667, features: ["Faible consommation", "Frein à disque", "Injection"], images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800"], agency_id: "ag1" },
  { id: "l18", title: "Honda CR-V 2018 — SUV confortable", description: "SUV fiable et spacieux, idéal ville et routes nationales.", type: "villa", transaction: "vente", price_mga: 350000000, surface: 97000, rooms: 3, bathrooms: 5, region: "SAVA", city: "Antalaha", lat: -14.9, lng: 50.28, features: ["SUV", "Climatisation", "Caméra de recul"], images: ["https://images.unsplash.com/photo-1493238792000-8113da705763?w=800"], agency_id: "ag1" },
  { id: "l19", title: "Mercedes Sprinter — minibus 16 places", description: "Minibus pour transport voyageurs, bon état mécanique, prêt pour activité professionnelle.", type: "bureau", transaction: "vente", price_mga: 200000000, surface: 210000, rooms: 4, bathrooms: 2, region: "Alaotra-Mangoro", city: "Ambatondrazaka", lat: -17.83, lng: 48.42, features: ["16 places", "Climatisation", "Entretien régulier"], images: ["https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800"], agency_id: "ag2" },
  { id: "l20", title: "Toyota Hilux 2017 — pick-up robuste", description: "Pick-up robuste et fiable pour usage mixte professionnel/personnel.", type: "local_commercial", transaction: "vente", price_mga: 120000000, surface: 135000, rooms: 2, bathrooms: 4, region: "Alaotra-Mangoro", city: "Moramanga", lat: -18.95, lng: 48.22, features: ["4x4", "Double cabine", "Charge utile élevée"], images: ["https://images.unsplash.com/photo-1597007030739-6d2e2d7baf0f?w=800"], agency_id: "ag2" },
  { id: "l21", title: "BMW X3 2020 — SUV premium", description: "SUV premium avec finition haut de gamme, conduite confortable et performante.", type: "villa", transaction: "vente", price_mga: 1500000000, surface: 42000, rooms: 5, bathrooms: 5, region: "Menabe", city: "Morondava", lat: -20.2833, lng: 44.2833, features: ["Premium", "Toit panoramique", "Aides à la conduite"], images: ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800"], agency_id: "ag3", badge: "coup_de_coeur" },
  { id: "l22", title: "Quad Polaris 570 — loisirs et pistes", description: "Quad polyvalent, performant sur pistes, idéal tourisme et activités de loisir.", type: "terrain", transaction: "location_vacances", price_mga: 350000, surface: 9000, rooms: 3, bathrooms: 0, region: "Anosy", city: "Tôlanaro (Fort-Dauphin)", lat: -25.0314, lng: 46.9825, features: ["Quad", "Suspension renforcée", "Pneus off-road"], images: ["https://images.unsplash.com/photo-1469285994282-454ceb49e63d?w=800"], agency_id: "ag1" },
  { id: "l23", title: "Dacia Sandero 2019 — budget malin", description: "Voiture compacte accessible et économique, idéale premier achat.", type: "appartement", transaction: "vente", price_mga: 80000000, surface: 101000, rooms: 1, bathrooms: 4, region: "Itasy", city: "Miarinarivo", lat: -19.0, lng: 46.9, features: ["Faible coût d’entretien", "Bluetooth", "ABS"], images: ["https://images.unsplash.com/photo-1592853598064-65e05f3f6af1?w=800"], agency_id: "ag2" },
  { id: "l24", title: "Nissan Sunny 2016 — berline fiable", description: "Berline simple et fiable, idéale pour usage quotidien et taxi premium.", type: "maison", transaction: "vente", price_mga: 95000000, surface: 142000, rooms: 1, bathrooms: 4, region: "Sofia", city: "Antsohihy", lat: -14.88, lng: 47.99, features: ["Faible consommation", "Direction assistée", "Climatisation"], images: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800"], agency_id: "ag1" },
  { id: "l25", title: "Toyota Coaster — bus touristique", description: "Bus moyen format pour activité touristique et transport privé.", type: "bureau", transaction: "vente", price_mga: 450000000, surface: 275000, rooms: 4, bathrooms: 2, region: "Boeny", city: "Mahajanga", lat: -15.76, lng: 46.27, features: ["Grande capacité", "Confort passagers", "Climatisation"], images: ["https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800"], agency_id: "ag3", badge: "nouveau" },
  { id: "l26", title: "KTM Duke 200 — look sportif", description: "Moto nerveuse et agile, idéale en ville et pour escapades week-end.", type: "terrain", transaction: "vente", price_mga: 160000000, surface: 18000, rooms: 4, bathrooms: 0, region: "Amoron'i Mania", city: "Ambositra", lat: -20.53, lng: 47.24, features: ["Sport", "ABS", "Injection"], images: ["https://images.unsplash.com/photo-1558981403-c5f9891c8a2e?w=800"], agency_id: "ag2" },
  { id: "l27", title: "Iveco Daily — utilitaire long", description: "Utilitaire long châssis pour transport de marchandises.", type: "local_commercial", transaction: "vente", price_mga: 110000000, surface: 198000, rooms: 2, bathrooms: 2, region: "Betsiboka", city: "Maevatanana", lat: -16.95, lng: 46.83, features: ["Long châssis", "Charge utile", "Entretien récent"], images: ["https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800"], agency_id: "ag1" },
  { id: "l28", title: "Suzuki Jimny 2015 — compact 4x4", description: "Petit 4x4 agile pour route et piste, idéal régions enclavées.", type: "villa", transaction: "vente", price_mga: 300000000, surface: 128000, rooms: 2, bathrooms: 3, region: "Ihorombe", city: "Ihosy", lat: -22.4, lng: 46.12, features: ["4x4", "Format compact", "Fiabilité"], images: ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800"], agency_id: "ag1" },
  { id: "l29", title: "Volkswagen Polo 2017 — citadine dynamique", description: "Citadine dynamique, bonne tenue de route et finition soignée.", type: "appartement", transaction: "vente", price_mga: 130000000, surface: 96000, rooms: 2, bathrooms: 4, region: "Vatovavy", city: "Mananjary", lat: -21.22, lng: 48.34, features: ["Bluetooth", "Climatisation", "Direction assistée"], images: ["https://images.unsplash.com/photo-1592853598064-65e05f3f6af1?w=800"], agency_id: "ag2" },
  { id: "l30", title: "Audi Q5 2021 — SUV haut de gamme", description: "SUV premium récent, équipements complets et faible kilométrage.", type: "villa", transaction: "location", price_mga: 6500000, surface: 39000, rooms: 5, bathrooms: 5, region: "Analamanga", city: "Antananarivo", lat: -18.885, lng: 47.530, features: ["Premium", "Toit panoramique", "Caméra 360", "GPS"], images: ["https://images.unsplash.com/photo-1493238792000-8113da705763?w=800", "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800"], agency_id: "ag1", badge: "boost" },
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
    id: "b1",
    slug: "acheter-voiture-occasion-madagascar-checklist-2026",
    title: "Acheter une voiture d’occasion à Madagascar : checklist complète 2026",
    seoTitle: "Acheter une voiture d’occasion à Madagascar : checklist complète 2026",
    metaDescription: "Vérifiez les documents, l’historique, l’état mécanique et le coût total avant d’acheter un véhicule d’occasion à Madagascar.",
    excerpt: "Une méthode claire pour éviter les mauvaises surprises et acheter un véhicule fiable au bon prix.",
    category: "Achat auto",
    published_at: "2026-04-13",
    updated_at: "2026-04-13",
    readingTime: "8 min",
    cover: "/blog-covers/location-antananarivo.jpg",
    coverAlt: "Inspection d’une voiture d’occasion",
    tags: ["voiture occasion madagascar", "checklist achat auto", "documents véhicule"],
    intro: "Avant d’acheter un véhicule d’occasion, prenez le temps de vérifier la mécanique, les papiers et le coût global. Cette checklist vous aide à décider en confiance.",
    sections: [
      {
        heading: "Les points à contrôler avant l’essai",
        paragraphs: [
          "Commencez par l’état extérieur, l’alignement des panneaux, l’usure des pneus et l’état de la carrosserie.",
          "À l’intérieur, vérifiez les équipements essentiels : climatisation, tableau de bord, éclairage, multimédia et commandes.",
        ],
        bulletsTitle: "Contrôles rapides",
        bullets: [
          "Carrosserie et corrosion",
          "Pneumatiques et freins",
          "Direction et suspensions",
          "Système électrique",
        ],
      },
      {
        heading: "Documents à demander",
        checklistTitle: "Checklist documents",
        checklist: [
          "Carte grise / certificat d’immatriculation",
          "Pièce d’identité du vendeur",
          "Historique d’entretien",
          "Preuve de non-opposition si applicable",
        ],
      },
    ],
    faq: [
      { question: "Faut-il faire un essai routier ?", answer: "Oui, c’est indispensable pour détecter bruits, vibrations et comportement moteur/freinage." },
      { question: "Dois-je vérifier le coût d’assurance avant achat ?", answer: "Oui, cela change fortement le coût total annuel de possession." },
    ],
    conclusion: "Un achat réussi repose sur trois piliers : contrôle technique, documents complets et budget global réaliste.",
  },
  {
    id: "b2",
    slug: "financement-auto-madagascar-2026",
    title: "Financement auto à Madagascar : comment bien calculer son budget",
    seoTitle: "Financement auto à Madagascar : budget, crédit et coûts cachés",
    metaDescription: "Comparez apport, mensualités, assurance et entretien pour choisir un financement auto adapté à votre situation.",
    excerpt: "Crédit auto, apport et charges réelles : les repères essentiels avant de vous engager.",
    category: "Financement",
    published_at: "2026-03-28",
    updated_at: "2026-04-13",
    readingTime: "7 min",
    cover: "/blog-covers/fiscalite-madagascar.jpg",
    coverAlt: "Calcul du budget auto",
    tags: ["financement auto", "budget voiture", "crédit automobile"],
    intro: "Un bon financement auto ne se résume pas à une mensualité faible. Il faut intégrer assurance, entretien et marge de sécurité.",
    sections: [
      {
        heading: "Construire un budget réaliste",
        paragraphs: [
          "Calculez le budget total mensuel : mensualité éventuelle, carburant, assurance, entretien et imprévus.",
          "Prévoyez une réserve pour les réparations non planifiées, surtout pour les véhicules d’occasion.",
        ],
        checklistTitle: "Postes à inclure",
        checklist: [
          "Mensualité / apport",
          "Assurance",
          "Entretien régulier",
          "Pneus et batterie",
        ],
      },
    ],
    faq: [
      { question: "Quel apport minimum viser ?", answer: "Plus l’apport est élevé, plus la mensualité et le coût total du crédit diminuent." },
    ],
    conclusion: "Choisissez un véhicule que vous pouvez assumer sur la durée, pas seulement à l’achat.",
  },
  {
    id: "b3",
    slug: "entretien-voiture-madagascar-astuces",
    title: "Entretien auto à Madagascar : 10 réflexes pour garder votre véhicule fiable",
    seoTitle: "Entretien auto à Madagascar : 10 réflexes pratiques",
    metaDescription: "Bons réflexes d’entretien pour prolonger la durée de vie de votre voiture et réduire les pannes imprévues.",
    excerpt: "Des gestes simples pour préserver performance, sécurité et valeur de revente.",
    category: "Conseils auto",
    published_at: "2026-03-05",
    updated_at: "2026-04-13",
    readingTime: "6 min",
    cover: "/blog-covers/terrain-madagascar.jpg",
    coverAlt: "Entretien de véhicule",
    tags: ["entretien voiture", "conseils auto", "fiabilité"],
    intro: "Un entretien régulier coûte moins cher qu’une panne majeure. Voici les priorités à suivre toute l’année.",
    sections: [
      {
        heading: "Les vérifications essentielles",
        bullets: [
          "Niveau d’huile moteur",
          "Liquide de refroidissement",
          "Pression des pneus",
          "État des freins",
          "Éclairage complet",
        ],
      },
    ],
    faq: [
      { question: "Tous les combien faire une vidange ?", answer: "Suivez le carnet d’entretien du constructeur et adaptez selon votre usage." },
    ],
    conclusion: "Un véhicule suivi régulièrement reste plus sûr, plus économique et se revend mieux.",
  },
  {
    id: "b4",
    slug: "choisir-4x4-madagascar-guide",
    title: "Comment choisir un 4x4 à Madagascar : guide terrain",
    seoTitle: "Choisir un 4x4 à Madagascar : guide terrain et budget",
    metaDescription: "Critères techniques et budgétaires pour choisir un 4x4 adapté aux routes de Madagascar.",
    excerpt: "Transmission, garde au sol, entretien et disponibilité des pièces : les clés d’un bon choix.",
    category: "4x4 & utilitaires",
    published_at: "2026-02-10",
    updated_at: "2026-04-13",
    readingTime: "9 min",
    cover: "/blog-covers/nosy-be-investissement.jpg",
    coverAlt: "4x4 sur route",
    tags: ["4x4 madagascar", "suv", "utilitaire"],
    intro: "Le bon 4x4 dépend de votre usage réel : ville, route nationale, piste ou activité professionnelle.",
    sections: [
      {
        heading: "Critères techniques prioritaires",
        paragraphs: [
          "Privilégiez une bonne garde au sol, une transmission adaptée et des pièces disponibles localement.",
          "Vérifiez la consommation réelle et la qualité du réseau d’entretien dans votre région.",
        ],
        bulletsTitle: "Priorités achat 4x4",
        bullets: [
          "Transmission adaptée",
          "Garde au sol",
          "Coût des pièces",
          "Historique d’entretien",
        ],
      },
    ],
    faq: [
      {
        question: "Faut-il forcément un 4x4 permanent ?",
        answer:
          "Pas toujours. Choisissez selon vos trajets réels et votre budget d’usage.",
      },
    ],
    conclusion: "Un 4x4 pertinent est celui qui répond à votre usage quotidien avec un coût d’entretien soutenable.",
  },
];
