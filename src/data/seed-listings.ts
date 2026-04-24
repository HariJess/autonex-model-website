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

export type SeedBlogCallout = {
  type: "tip" | "warning" | "info";
  title?: string;
  text: string;
};

export type SeedBlogTable = {
  caption?: string;
  headers: string[];
  rows: string[][];
};

export type SeedBlogSection = {
  heading: string;
  paragraphs?: string[];
  checklistTitle?: string;
  checklist?: string[];
  bulletsTitle?: string;
  bullets?: string[];
  numbered?: boolean;
  table?: SeedBlogTable;
  callout?: SeedBlogCallout;
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
    title: "Acheter une voiture d’occasion à Madagascar : le guide complet pour éviter les pièges (2026)",
    seoTitle: "Acheter une voiture d’occasion à Madagascar : guide complet 2026",
    metaDescription: "Guide pratique pour acheter votre voiture d’occasion à Madagascar : prix réels, vérifications clés, arnaques à éviter. Checklist complète 2026.",
    excerpt: "Prix du marché, canaux d’achat, checklist d’inspection, arnaques à éviter : tout ce qu’il faut savoir pour acheter sereinement en 2026.",
    category: "Achat auto",
    published_at: "2026-04-13",
    updated_at: "2026-04-24",
    readingTime: "10 min",
    cover: "/blog-covers/location-antananarivo.jpg",
    coverAlt: "Inspection d’une voiture d’occasion à Antananarivo",
    tags: [
      "acheter voiture occasion madagascar",
      "checklist achat auto",
      "prix voiture occasion madagascar",
      "arnaques voiture madagascar",
      "import véhicule madagascar",
      "CIVIO BSC madagascar",
      "carte grise madagascar",
    ],
    intro: "Vous venez de tomber sur une Toyota Hilux à prix cassé sur Facebook, et quelque chose au fond de vous hésite. Vous avez raison. Le marché de l’occasion à Madagascar regorge de bonnes affaires, mais aussi de pièges que la plupart des acheteurs découvrent trop tard — une fois le chèque encaissé. Compteurs trafiqués, cartes grises douteuses, véhicules importés sans dédouanement valide, vendeurs qui disparaissent après la vente : acheter une voiture ici demande plus de méthode qu’ailleurs. La bonne nouvelle : avec la bonne checklist et quelques vérifications simples, vous pouvez acheter un véhicule fiable, au prix du marché, sans mauvaise surprise. Ce guide rassemble tout ce qu’il faut savoir en 2026 — prix réels, canaux d’achat, inspections, arnaques courantes et formalités — pour que votre prochaine voiture soit une bonne décision, pas une leçon coûteuse.",
    sections: [
      {
        heading: "Le marché de l’occasion à Madagascar en 2026",
        paragraphs: [
          "Le parc automobile malgache a bondi ces dernières années, tiré par une classe moyenne urbaine en expansion et par la disponibilité croissante de véhicules importés d’Asie, d’Europe et du Moyen-Orient. Antananarivo concentre à elle seule la majorité des transactions, suivie par Antsirabe, Toamasina, Mahajanga et Toliara. La demande reste forte, mais l’offre aussi : c’est un marché d’acheteur averti.",
          "Les marques dominantes reflètent trois critères très concrets : fiabilité mécanique, simplicité d’entretien, et surtout disponibilité des pièces détachées sur place. Toyota arrive largement en tête — la référence pour 4x4, pick-ups et berlines, avec pièces disponibles partout et mécaniciens qui connaissent. Nissan suit avec un bon rapport prix/fiabilité, puis Hyundai, de plus en plus populaire. Suzuki domine les citadines économiques et le compact 4x4 (Jimny). Mitsubishi, Ford, Renault et Peugeot complètent le paysage, mais vous dépendrez plus d’importateurs spécialisés pour les pièces.",
          "Côté prix, la fourchette reste large selon l’année, le kilométrage et l’état. Un même modèle peut coûter du simple au double selon l’historique : une Toyota Hilux de 2016 à 180 000 km n’a pas la même valeur qu’une Hilux de 2020 à 40 000 km. N’achetez jamais sur la base du modèle seul.",
        ],
        table: {
          caption: "Prix moyens occasion Madagascar 2026",
          headers: ["Type de véhicule", "Gamme de prix (MGA)", "Exemples de modèles"],
          rows: [
            ["Citadine", "30 – 80 M", "Suzuki Swift, Kia Rio, Dacia Sandero"],
            ["Berline moyenne", "60 – 120 M", "Toyota Corolla, Nissan Sunny, Honda Civic"],
            ["SUV compact", "180 – 350 M", "Hyundai Tucson, Honda CR-V, Mazda CX-5"],
            ["Pick-up 4x4", "90 – 650 M", "Toyota Hilux, Ford Ranger, Mitsubishi L200, Nissan Navara"],
            ["Premium", "350 M – 1,5 Md", "BMW X3, Audi Q5, Land Cruiser Prado"],
          ],
        },
      },
      {
        heading: "Particulier, concessionnaire ou import personnel : quel canal choisir ?",
        paragraphs: [
          "Trois canaux existent pour acheter d’occasion à Madagascar, et chacun a ses règles. Le plus courant est l’achat entre particuliers, via Facebook Marketplace, les petites annonces ou le bouche-à-oreille. Vous y trouvez les meilleurs prix — jusqu’à 20 à 30 % en dessous des concessionnaires — et une vraie marge de négociation. La contrepartie : aucune garantie, aucun recours en cas de vice caché, et une vigilance maximale requise sur les papiers.",
          "Le concessionnaire occasion, lui, vend plus cher mais offre un filet de sécurité : véhicule inspecté, carte grise propre, parfois garantie de quelques mois, et souvent une solution de financement associée. Pour un premier achat auto ou pour quelqu’un qui ne connaît pas bien la mécanique, c’est l’option la plus sereine. Les noms historiques du marché incluent Madauto (près d’un siècle d’activité sur place) et Materauto, tous deux publiant régulièrement des guides d’achat utiles.",
          "L’import personnel est la troisième voie, souvent choisie pour dénicher un modèle précis à meilleur prix (Dubai, Japon, France). C’est techniquement possible mais plus complexe, et régi par des règles strictes. Pour importer légalement, vous devez passer par un transitaire agréé et obtenir deux documents obligatoires : le BSC (Bordereau de Suivi des Cargaisons) et le CIVIO (Contrôle d’Identification des Véhicules Importés d’Occasion). Sans ces papiers, votre véhicule est bloqué au port — ou pire, confisqué.",
          "Le calcul fiscal à anticiper : droits de douane 20 %, TVA 20 %, plus frais annexes. Pour une voiture achetée 3 500 € à l’étranger avec 1 500 € de fret, comptez environ 2 000 € supplémentaires de taxes et frais, soit un coût total avoisinant 7 900 €. Autrement dit : une bonne affaire à l’étranger n’est pas toujours une bonne affaire une fois importée.",
        ],
        table: {
          caption: "Comparatif des canaux d’achat",
          headers: ["Canal", "Prix", "Garantie", "Risque principal"],
          rows: [
            ["Particulier", "Bas (−20 à −30 %)", "Aucune", "Arnaques, vices cachés"],
            ["Concessionnaire", "Élevé", "Oui (3–12 mois)", "Faible"],
            ["Import personnel", "Variable", "Aucune", "Complexité douane, règle 5 ans"],
          ],
        },
        callout: {
          type: "warning",
          title: "Attention à la règle des 5 ans",
          text: "Un véhicule d’occasion importé à Madagascar pour un usage particulier ne peut pas avoir plus de 5 ans depuis sa première mise en circulation. 15 ans max pour le transport de marchandises, 10 ans pour le transport en commun. Acheter en ignorant cette règle peut mener à la confiscation au port de Tamatave.",
        },
      },
      {
        heading: "La checklist complète avant d’acheter",
        paragraphs: [
          "Douze vérifications à faire systématiquement, dans l’ordre. Prenez le temps : une heure d’inspection bien conduite vous épargne des mois de galères.",
        ],
        numbered: true,
        bullets: [
          "Vérifiez la carte grise en original — jamais de photocopie. L’adresse du vendeur doit correspondre à sa pièce d’identité, et le numéro de châssis imprimé sur la carte doit être identique à celui gravé sur la voiture. Ce seul contrôle élimine 80 % des arnaques.",
          "Exigez le BSC et le rapport CIVIO pour tout véhicule importé. Ces deux documents prouvent que le véhicule a été dédouané légalement. Sans eux, vous héritez des ennuis administratifs.",
          "Contrôlez physiquement le numéro de châssis. Il est gravé sur la carrosserie (souvent au niveau du pare-brise ou sous le capot) et doit matcher la carte grise et le bloc moteur. Incohérence = véhicule suspect.",
          "Vérifiez le kilométrage avec l’historique. Un carnet d’entretien, des factures de garagistes ou simplement l’usure de l’intérieur (volant, pédales, siège conducteur) doivent être cohérents avec le compteur.",
          "Inspectez la carrosserie point par point. Bas de portes, passages de roue, plancher sous les tapis, coffre : la rouille commence dans les angles. Zones côtières (Toliara, Toamasina, Nosy Be, Diego Suarez) = vigilance maximale.",
          "Testez tous les équipements. Climatisation absolument obligatoire à Madagascar, mais aussi vitres électriques, essuie-glaces, clignotants, phares, feux de recul, plafonnier, radio. Un équipement HS se cache souvent dans ceux qu’on teste le moins.",
          "Faites un essai routier de 15 minutes minimum. Incluez ville (démarrages/arrêts), côte (montée forte pour sonder moteur et embrayage) et route dégagée (vibrations à 80-90 km/h). Écoutez plus que vous ne regardez.",
          "Écoutez le moteur à froid. Un démarrage à froid révèle beaucoup : cognements, fumée anormale (bleue = huile, blanche = joint de culasse), régime instable. Si le vendeur a chauffé le moteur avant votre arrivée, méfiance.",
          "Testez direction, embrayage et freins. Volant qui tire, embrayage qui patine, freinage spongieux : chacun est un poste de réparation à 500 000 – 1,5 M MGA. À déduire du prix ou fuir.",
          "Demandez l’historique des grosses réparations. Accident déjà réparé, boîte de vitesses changée, distribution récente : ce n’est pas forcément rédhibitoire, mais c’est une information de négociation.",
          "Faites inspecter par un mécanicien indépendant. Environ 50 000 à 100 000 MGA la visite. C’est la meilleure assurance possible : un pro neutre détectera ce que vous ne voyez pas. Si le vendeur refuse cette inspection, passez au suivant.",
          "Négociez sur du factuel. Partez de la cote du modèle (ce que vous avez vu vendu ailleurs) et déduisez pour chaque défaut identifié. Une négociation chiffrée tient, une négociation émotionnelle s’effondre.",
        ],
      },
      {
        heading: "Les 7 arnaques les plus courantes à Madagascar",
        paragraphs: [
          "Tous les vendeurs ne sont pas malhonnêtes, mais les arnaques existent et se répètent. Les reconnaître à l’avance vous évite de devenir la prochaine anecdote triste d’un groupe Facebook.",
        ],
        numbered: true,
        bullets: [
          "Compteur kilométrique trafiqué. Facile à faire sur les voitures d’avant 2015, plus complexe ensuite mais toujours possible. Signes : usure intérieure (volant, pédales, siège conducteur) qui ne colle pas avec les kilomètres affichés, kilométrage du dernier entretien incohérent avec le compteur actuel.",
          "Véhicule volé remis en circulation. Le numéro de châssis est gratté, repeint ou poinçonné différemment de la carte grise. Vérifiez systématiquement : châssis sur carrosserie, sur moteur et sur carte grise — les trois doivent matcher à l’identique.",
          "Carte grise falsifiée ou photocopiée. Toute carte grise présentée en photocopie, plastifiée, froissée ou avec des caractères étranges est suspecte. L’original est un document sécurisé — demandez à le voir et à le photographier.",
          "Vente sans BSC/CIVIO valide. Le vendeur prétend avoir « perdu les papiers d’import ». Résultat : vous héritez d’un véhicule potentiellement non dédouané, impossible à revendre légalement, et risquez une confiscation.",
          "Le vendeur pressé. « Je pars demain, il faut conclure ce soir, c’est pour ça que je baisse le prix. » Un vendeur honnête vous laisse le temps de vérifier. La pression = drapeau rouge.",
          "Le 4x4 « à moitié prix cause départ étranger ». C’est l’arnaque classique. Véhicule souvent sorti d’un accident grave, d’un import illégal, ou pas du tout à vendre (usurpation). Si le prix est 30 % sous la cote sans explication solide, il y a une explication cachée.",
          "Acompte demandé avant inspection. Aucune raison légitime d’exiger un versement avant que vous ayez vu, essayé et fait contrôler le véhicule. Quiconque vous demande de « bloquer » la voiture par virement avant visite veut votre argent, pas vous vendre une voiture.",
        ],
        callout: {
          type: "tip",
          title: "La règle des trois « oui »",
          text: "Un vendeur honnête vous laisse le temps d’inspecter, présente sans hésiter la carte grise originale, et accepte une visite chez un mécanicien indépendant. Un refus sur un seul de ces trois points suffit à renoncer à l’achat.",
        },
      },
      {
        heading: "Après l’achat : les formalités à ne pas négliger",
        paragraphs: [
          "La signature ne clôt pas la transaction. Quelques démarches restent à faire dans les semaines qui suivent, et les négliger peut transformer votre bonne affaire en casse-tête administratif.",
          "Certificat de cession : faites-le signer en deux exemplaires originaux. L’un reste chez vous, l’autre part avec le vendeur. C’est la preuve légale du transfert — indispensable pour changer la carte grise et pour vous protéger si le véhicule a un ennui avant que la mutation ne soit enregistrée.",
          "Changement de carte grise : à effectuer dans les 30 jours auprès du service des immatriculations. Documents requis : certificat de cession, ancienne carte grise, pièce d’identité, justificatif de domicile récent. Comptez quelques semaines pour récupérer la nouvelle carte à votre nom — pendant ce temps, roulez avec le récépissé de demande.",
          "Assurance auto : obligatoire dès que vous prenez le volant. Les assureurs historiques incluent ARO, Ny Havana, MAMA, ou encore les filiales d’assurance de BNI Madagascar. Comparez au moins trois devis : les écarts peuvent aller du simple au double selon les profils et garanties. Prenez au minimum la tierce pour un véhicule qui vaut plus de 30 millions MGA.",
          "Contrôle technique : obligatoire tous les 2 ans pour les véhicules de plus de 4 ans. Si le contrôle du vendeur datait d’il y a plus d’un an, budgétez-en un nouveau rapidement.",
        ],
      },
    ],
    faq: [
      {
        question: "Quel est le prix moyen d’une voiture d’occasion à Madagascar ?",
        answer: "Il dépend fortement de la catégorie. Comptez 30 à 80 millions MGA pour une citadine, 60 à 120 millions pour une berline moyenne, 180 à 350 millions pour un SUV compact, et jusqu’à 650 millions pour un pick-up 4x4 premium récent. Ces fourchettes intègrent l’état, le kilométrage et l’année du véhicule.",
      },
      {
        question: "Peut-on importer une voiture de plus de 5 ans à Madagascar ?",
        answer: "Non pour un usage particulier. La réglementation malgache limite l’importation de véhicules particuliers d’occasion à 5 ans maximum depuis leur première mise en circulation. Au-delà, la confiscation au port est possible. Les véhicules de transport de marchandises bénéficient de règles plus souples (jusqu’à 15 ans) et le transport en commun jusqu’à 10 ans.",
      },
      {
        question: "Quelles sont les marques les plus fiables à Madagascar ?",
        answer: "Toyota arrive largement en tête, tant pour la fiabilité mécanique que pour la disponibilité des pièces. Nissan, Hyundai et Suzuki complètent le podium des marques où vous trouverez facilement un mécanicien qui connaît et des pièces en stock à un prix raisonnable.",
      },
      {
        question: "Comment vérifier si une voiture est volée ?",
        answer: "Le contrôle se fait via le numéro de châssis : il doit être identique entre la carte grise, la gravure sur la carrosserie et le marquage sur le bloc moteur. En cas de doute, le service d’immatriculation peut vérifier si le véhicule fait l’objet d’une opposition ou d’une déclaration de vol.",
      },
      {
        question: "Faut-il acheter chez un particulier ou un concessionnaire ?",
        answer: "Chez un particulier si vous maîtrisez les vérifications (ou si vous êtes accompagné d’un mécanicien) : les prix sont 20 à 30 % plus bas. Chez un concessionnaire si c’est votre premier achat ou si vous voulez éviter les risques : véhicule inspecté et souvent une garantie courte.",
      },
      {
        question: "Quels sont les frais cachés à anticiper lors de l’achat ?",
        answer: "Prévoyez au-delà du prix d’achat : changement de carte grise (~200 000 à 400 000 MGA), assurance annuelle (1 à 3 % de la valeur), contrôle technique si périmé, éventuels petits travaux révélés à l’inspection, et quelques pleins d’essence initiaux. Compter 5 à 10 % du prix d’achat en plus est réaliste.",
      },
    ],
    conclusion: "Acheter une voiture d’occasion à Madagascar demande du temps et un peu de méthode — mais pas de chance. Un vendeur transparent, des papiers en règle, une inspection par un mécanicien de confiance et une négociation basée sur des faits : avec ces quatre piliers, vous signez sereinement et vous repartez avec un véhicule qui va vous servir des années. Chez AutoNex, chaque annonce est modérée pour réduire ces risques, et vous retrouvez les prix du marché mis à jour en continu pour évaluer chaque offre en quelques secondes.",
  },
  {
    id: "b2",
    slug: "financement-auto-madagascar-2026",
    title: "Financement auto à Madagascar : comparer les banques et calculer son budget (guide 2026)",
    seoTitle: "Financement auto Madagascar 2026 : comparer BNI, SG, BOA",
    metaDescription: "Tout sur le crédit auto à Madagascar en 2026 : taux BNI, BOA, Société Générale, apport, mensualités, LOA/LLD. Guide complet et exemples chiffrés.",
    excerpt: "Taux 2026 des grandes banques, calcul de capacité d’emprunt, comparaison crédit / LOA / LLD et erreurs à éviter.",
    category: "Financement",
    published_at: "2026-03-28",
    updated_at: "2026-04-24",
    readingTime: "9 min",
    cover: "/blog-covers/fiscalite-madagascar.jpg",
    coverAlt: "Calcul du budget auto et crédit à Madagascar",
    tags: [
      "crédit auto madagascar",
      "financement voiture madagascar",
      "BNI crédit auto",
      "BOA crédit véhicule",
      "LOA LLD madagascar",
      "budget voiture madagascar",
      "taux crédit madagascar",
    ],
    intro: "Il existe encore un mythe tenace à Madagascar : pour acheter une voiture, il faudrait payer comptant. Beaucoup renoncent à l’idée avant même d’avoir poussé la porte d’une banque. Pourtant, les principales banques de la place — BNI Madagascar, Société Générale (BFV-SG), Bank of Africa, BMOI — financent chaque année des milliers de véhicules à des conditions parfois très correctes. Le vrai sujet n’est pas « est-ce possible ? », mais « à quelles conditions et pour quel budget ? ». Ce guide compare les offres 2026, détaille comment calculer votre capacité de remboursement sans vous endetter au-delà de vos moyens, et passe en revue les alternatives (LOA, LLD) pour choisir la solution la mieux adaptée à votre situation.",
    sections: [
      {
        heading: "Les banques qui financent votre voiture à Madagascar",
        paragraphs: [
          "Quatre grands groupes bancaires dominent le marché du crédit automobile malgache. Leurs offres évoluent — les taux affichés ci-dessous sont des repères 2026, à confirmer en agence car ils varient selon votre profil, votre ancienneté de salaire et l’usage du véhicule (neuf ou occasion).",
          "BNI Madagascar propose l’un des taux les plus compétitifs sur le véhicule neuf (autour de 7 %), avec un crédit personnel classique à 7-9,5 % utilisable pour l’occasion. Durées : 3 à 4 ans pour le crédit véhicule neuf, jusqu’à 7 ans pour le crédit personnel.",
          "Société Générale Madagasikara (BFV-SG) offre la gamme Soafeno, crédits moyen terme adaptables à l’achat d’un véhicule. Les taux dépendent étroitement du profil et de l’ancienneté dans l’entreprise.",
          "Bank of Africa (BOA Madagascar) dispose d’une offre crédit particulier finançant aussi bien l’occasion que le neuf, avec demandes d’apport classiques (20 % minimum). BMOI complète le panorama, avec des politiques proches de ses concurrents mais des critères d’éligibilité parfois plus souples pour les professionnels libéraux.",
          "Conditions générales communes : salaire domicilié dans l’établissement prêteur (ou à y domicilier), CDI validé depuis au moins 3 à 6 mois (ou statut professionnel stable pour les indépendants), apport personnel minimum de 20 à 30 % du prix d’achat, et pièces justificatives classiques — 3 derniers bulletins de salaire, avis d’imposition, RIB, justificatif de domicile, devis du véhicule, carte d’identité.",
          "Pour les professionnels libéraux et entrepreneurs, les banques demandent en général 3 bilans comptables récents et un justificatif d’activité. L’obtention est possible mais le taux s’ajuste à la hausse (12-15 % plutôt que 8-10 %), reflet du risque perçu. Un conseil qui vaut de l’or : ne vous arrêtez jamais au premier taux affiché. Sur un crédit de 50 millions MGA sur 4 ans, deux points de taux en moins représentent environ 2 millions d’économies totales.",
        ],
        table: {
          caption: "Comparatif des grandes banques (repères 2026)",
          headers: ["Banque", "Taux véhicule neuf", "Taux prêt perso", "Durée max", "Apport requis"],
          rows: [
            ["BNI Madagascar", "~7 %", "7 – 9,5 %", "3-4 ans neuf / 7 ans perso", "20 – 30 %"],
            ["BFV-SG (Société Générale)", "Variable", "Crédit Soafeno", "Selon profil", "25 – 30 %"],
            ["BOA Madagascar", "Variable", "Oui", "Selon profil", "20 %"],
            ["BMOI", "Variable", "Oui", "Selon profil", "20 – 30 %"],
          ],
        },
      },
      {
        heading: "Calculer son budget réaliste",
        paragraphs: [
          "Une banque acceptera votre dossier si votre capacité de remboursement est suffisante. Vous devez la calculer avant d’y aller — pas l’inverse. La règle d’or : vos mensualités totales de crédits (voiture, immobilier, conso) ne doivent jamais dépasser 33 % de vos revenus nets mensuels. Au-delà, les banques refusent, et elles ont raison : vous vous mettriez en difficulté.",
          "Une fois ce plafond connu, trois éléments décident de votre budget voiture réel. D’abord, l’apport personnel : plus il est élevé, plus votre emprunt baisse, plus la mensualité est légère — et plus le coût total du crédit diminue. Visez 25 à 30 % minimum si votre épargne le permet. Ensuite, la durée du prêt : un crédit de 5 ans a des mensualités plus faibles qu’un crédit de 3 ans, mais vous payez beaucoup plus d’intérêts sur la durée. Règle pratique : prenez la durée la plus courte que votre budget permet sans étrangler votre fin de mois. Enfin, les frais annexes oubliés — et c’est ici que beaucoup d’acheteurs se plantent.",
          "Prenons un scénario concret : vous gagnez 2 millions MGA nets par mois et vous envisagez une Toyota Corolla d’occasion à 100 millions MGA. Vous apportez 30 millions, empruntez 70 millions sur 4 ans à 9 %. La mensualité de crédit tombe autour de 1,74 million. Ajoutez-y assurance (~150 000 MGA), entretien et essence (~110 000 MGA pour 15 000 km/an) : votre charge voiture mensuelle réelle est d’environ 2 millions. Soit 100 % de vos revenus — c’est évidemment infaisable.",
        ],
        table: {
          caption: "Exemple chiffré : Toyota Corolla 100 M MGA, revenus 2 M MGA/mois",
          headers: ["Poste", "Montant mensuel (MGA)"],
          rows: [
            ["Mensualité crédit (30 M apport, 70 M emprunt, 4 ans, 9 %)", "~1 740 000"],
            ["Assurance tous risques", "~150 000"],
            ["Entretien + essence (15 000 km/an)", "~110 000"],
            ["Total charges véhicule", "~2 000 000"],
          ],
        },
        callout: {
          type: "tip",
          title: "La mensualité n’est que la moitié de l’histoire",
          text: "La mensualité du crédit n’est que la moitié du coût réel. Ajoutez l’assurance (1 à 3 % de la valeur par an), l’entretien (~500 000 MGA/an) et l’essence (~800 000 MGA/an pour 15 000 km) avant de décider. Un budget qui ne tient pas compte de ces charges explose au troisième mois.",
        },
      },
      {
        heading: "Crédit classique ou LOA/LLD : que choisir ?",
        paragraphs: [
          "Au-delà du crédit classique, deux alternatives se développent sur le marché malgache, principalement chez les concessionnaires partenaires des banques : la Location avec Option d’Achat (LOA) et la Location Longue Durée (LLD).",
          "Le crédit classique reste le plus répandu. Vous contractez un prêt, vous devenez propriétaire dès le premier jour, vous remboursez une mensualité fixe incluant capital et intérêts. À la fin du prêt, le véhicule est à vous. C’est la formule qui construit du patrimoine : même après 7 à 8 ans, la voiture garde une valeur de revente.",
          "La LOA fonctionne différemment. Vous louez le véhicule pendant 3 à 5 ans avec des mensualités souvent plus basses qu’un crédit, puis vous avez le choix à la fin : soit vous achetez le véhicule à la valeur résiduelle (prédéfinie au contrat), soit vous le rendez et changez pour un neuf. Avantage : mensualité lissée, souplesse. Inconvénient : si vous ne levez pas l’option, vous avez loué sans rien capitaliser.",
          "La LLD va plus loin : pas d’option d’achat à la fin, vous louez tout simplement pour une durée déterminée, souvent avec entretien et assurance inclus. Idéal pour les entreprises et les particuliers qui veulent zéro tracas administratif et qui changent régulièrement de véhicule.",
          "Laquelle choisir ? Vous gardez votre voiture longtemps (6-10 ans) : crédit classique, clairement. Vous changez tous les 3-4 ans : LOA, la mensualité basse compense bien le fait de ne pas capitaliser. Vous êtes chef d’entreprise ou profession libérale : LLD pour la simplicité comptable (tout en charges) et l’absence d’immobilisation au bilan. Vous achetez une occasion d’un particulier : seul le crédit classique fonctionne, les autres formules passent uniquement par un concessionnaire partenaire.",
          "Un point à ne pas rater : en LOA comme en LLD, un kilométrage maximum est contractuel. Le dépasser déclenche des pénalités à la restitution. Estimez honnêtement votre usage avant de signer.",
        ],
      },
      {
        heading: "Les 5 erreurs qui coûtent cher",
        numbered: true,
        bullets: [
          "Ne pas comparer au moins trois offres. Entre la meilleure offre BNI et un crédit opportuniste pris en urgence ailleurs, l’écart peut atteindre 10 points de taux (8 % vs 18 %). Sur un crédit de 50 M MGA sur 4 ans, c’est plus de 10 millions d’écart total. Prendre deux semaines pour comparer est toujours rentable.",
          "Oublier l’assurance emprunteur. Souvent obligatoire, elle couvre le remboursement en cas de décès ou d’invalidité. Elle ajoute 0,3 à 1 % au coût total, mais ce n’est pas négligeable. Demandez toujours le TAEG (taux annuel effectif global) qui intègre ce coût, pas seulement le taux nominal.",
          "Ne pas anticiper l’entretien tropical. Le climat et les routes imposent des vidanges plus fréquentes, des pneus plus usés, des recharges climatisation régulières. Budgétez 500 000 à 1 million MGA par an pour un entretien correct — à intégrer dans votre projection mensuelle.",
          "S’endetter au-delà de 33 %. Certains organismes accepteront 40 % si votre dossier le permet, mais vous jouez avec le feu : au moindre aléa (maladie, licenciement, dépense imprévue), vous ne vous en sortez plus. La règle des 33 % existe pour une raison.",
          "Allonger le crédit au maximum. Un crédit sur 7 ans rend la mensualité plus douce, mais vous payez beaucoup plus d’intérêts, et votre véhicule se déprécie plus vite que la dette ne diminue — vous pouvez vous retrouver à devoir plus cher que la valeur réelle. Privilégiez 3 à 5 ans maximum pour un véhicule particulier.",
        ],
      },
      {
        heading: "Documents et procédure",
        paragraphs: [
          "Pour maximiser vos chances d’acceptation et réduire les délais, préparez votre dossier avant même de prendre rendez-vous.",
        ],
        checklistTitle: "Documents à préparer",
        checklist: [
          "Pièce d’identité en cours de validité (CIN ou passeport)",
          "Justificatif de domicile récent (moins de 3 mois)",
          "Trois derniers bulletins de salaire (ou 3 bilans pour indépendants)",
          "Dernier avis d’imposition",
          "RIB du compte où est domicilié le salaire",
          "Devis ou facture pro forma du véhicule (dossier concessionnaire)",
          "Carte grise du véhicule (achat d’occasion auprès d’un particulier)",
          "Attestation d’assurance auto (à fournir à la signature)",
        ],
      },
      {
        heading: "Délais d’obtention",
        paragraphs: [
          "Comptez généralement 1 semaine pour une étude de dossier et un accord de principe, 2 à 3 semaines entre le dépôt et le déblocage des fonds si votre profil est standard, et 4 à 6 semaines pour un dossier plus complexe (indépendants, profils atypiques, véhicule importé).",
          "Pendant l’instruction, évitez d’engager des frais non remboursables ou de verser un acompte définitif au vendeur — certaines demandes sont refusées en dernière minute. Une fois les fonds débloqués, la banque verse directement au vendeur ou au concessionnaire : vous n’avez en principe pas à manipuler l’argent vous-même.",
        ],
      },
    ],
    faq: [
      {
        question: "Quel est le meilleur taux crédit auto à Madagascar ?",
        answer: "Autour de 7 % chez BNI Madagascar sur véhicule neuf pour les meilleurs profils. Sur occasion ou pour des profils plus courants, comptez 8 à 12 %. Au-dessus de 15 %, demandez-vous s’il ne vaut pas mieux attendre et épargner quelques mois de plus.",
      },
      {
        question: "Peut-on obtenir un crédit auto sans apport à Madagascar ?",
        answer: "C’est rare et réservé à des profils très stables (fonctionnaires, cadres avec ancienneté, salaire élevé domicilié depuis plusieurs années). La plupart des banques exigent 20 à 30 % d’apport, et pour de bonnes raisons : cela réduit leur risque et protège votre budget.",
      },
      {
        question: "Combien de temps pour avoir un crédit auto approuvé ?",
        answer: "Deux à quatre semaines en moyenne, de l’instruction du dossier au déblocage des fonds. Un dossier bien préparé (documents complets, pas de découverts récents, fiche de paie stable) accélère le traitement.",
      },
      {
        question: "Quelle banque prête aux indépendants et entrepreneurs ?",
        answer: "Toutes les grandes banques malgaches le font, mais à des taux plus élevés (+3 à +5 points par rapport aux salariés). BOA et BFV-SG ont des offres plus accessibles pour les professionnels libéraux. Préparez trois bilans comptables et une situation fiscale à jour.",
      },
      {
        question: "Peut-on financer un véhicule d’occasion ?",
        answer: "Oui, mais souvent dans un cadre différent : les banques utilisent leur formule « crédit personnel » plutôt que « crédit véhicule neuf », avec un taux légèrement plus élevé (1 à 2 points). L’apport demandé est en général plus important (30 % et plus).",
      },
      {
        question: "Est-il possible de rembourser par anticipation ?",
        answer: "Oui, la loi l’autorise. Des frais peuvent s’appliquer (généralement 1 à 3 % du capital restant dû), mentionnés dans le contrat. Sur des crédits récents et des montants élevés, le remboursement anticipé reste souvent rentable.",
      },
    ],
    conclusion: "Un crédit auto à Madagascar n’est ni un luxe ni un piège — c’est un outil financier qui doit coller à votre situation réelle. Comparez au moins deux banques, respectez la règle des 33 %, anticipez les charges cachées et privilégiez la durée la plus courte que votre budget permet. Avant de vous présenter en agence, définissez votre cible précise (modèle, budget max, apport disponible) : votre conseiller vous accompagnera bien mieux avec un projet clair qu’avec une demande vague. Chez AutoNex, les fiches véhicules mises à jour vous aident à cadrer votre projet avant le rendez-vous banque.",
  },
  {
    id: "b3",
    slug: "entretien-voiture-madagascar-astuces",
    title: "Entretien voiture à Madagascar : 12 règles d’or pour une fiabilité maximale",
    seoTitle: "Entretien auto Madagascar : 12 règles climat tropical",
    metaDescription: "Guide complet entretien auto Madagascar : vidange, climatisation, pneus adaptés. Fréquences spécifiques au climat tropical et aux routes malgaches.",
    excerpt: "Vidange tous les 5 000 km, batterie à 3-4 ans, signes d’alerte à connaître : le guide terrain pour garder votre voiture fiable à Madagascar.",
    category: "Entretien",
    published_at: "2026-03-05",
    updated_at: "2026-04-24",
    readingTime: "8 min",
    cover: "/blog-covers/terrain-madagascar.jpg",
    coverAlt: "Entretien de véhicule à Madagascar",
    tags: [
      "entretien voiture madagascar",
      "vidange madagascar",
      "climatisation voiture madagascar",
      "pneus madagascar",
      "corrosion véhicule côte",
      "garage tana",
      "pannes auto madagascar",
    ],
    intro: "Rouler à Madagascar n’a rien à voir avec rouler en Europe, et votre voiture le sait mieux que vous. Chaleur tropicale qui dépasse régulièrement 32 °C, humidité élevée, pluies diluviennes pendant six mois, poussière rouge omniprésente sur les pistes, routes nationales parsemées de nids-de-poule : chaque composant de votre véhicule encaisse plus que ce pour quoi il a été conçu par le constructeur. Résultat concret : vos vidanges doivent être plus fréquentes, vos pneus s’usent 20 à 30 % plus vite, votre batterie souffre, votre carrosserie se corrode aux abords des côtes. Appliquer les fréquences d’usine prévues pour un climat tempéré européen, c’est organiser sa propre panne. Ce guide rassemble les 12 règles d’or à suivre pour garder votre véhicule fiable, sûr et rentable à la revente.",
    sections: [
      {
        heading: "Pourquoi Madagascar exige un entretien spécifique",
        paragraphs: [
          "Trois facteurs expliquent pourquoi l’entretien automobile à Madagascar doit être plus fréquent et plus rigoureux qu’ailleurs.",
          "Le climat tropical. Températures qui tournent régulièrement autour de 30 à 35 °C dans les plaines, humidité relative souvent supérieure à 70 %, saisons des pluies intenses : cette combinaison attaque le véhicule sur plusieurs fronts. L’huile moteur se dégrade plus vite, les liquides de refroidissement travaillent à leurs limites, les joints de portes et de pare-brise vieillissent. La climatisation, elle, tourne presque en permanence 10 mois par an — chose inconnue en Europe.",
          "Les routes. Les nationales principales sont correctes mais se dégradent vite en saison des pluies. Dès que vous quittez le réseau bitumé principal, vous êtes sur piste, en latérite rouge, avec nids-de-poule, ornières et franchissements variables. Chaque trajet sollicite lourdement suspensions, amortisseurs, parallélisme, dessous de caisse. La poussière rouge, très fine, pénètre partout : filtres, aérations, mécanismes.",
          "L’environnement côtier. Si vous roulez régulièrement à Toliara, Toamasina, Mahajanga, Nosy Be ou Antsiranana, l’air salin accélère massivement la corrosion. Les bas de caisse, passages de roue et dessous de véhicule subissent une oxydation continue. Sans traitement antirouille régulier, la carrosserie se dégrade bien plus vite que sur les Hauts Plateaux secs.",
          "La conséquence pratique : ce que votre carnet d’entretien constructeur annonce pour 10 000 ou 15 000 km devient en réalité 5 000 à 8 000 km à Madagascar. Cela semble cher à court terme, mais c’est ce qui sépare un véhicule fiable à 200 000 km d’un véhicule qui a vécu ses derniers kilomètres à 80 000.",
        ],
      },
      {
        heading: "Le calendrier d’entretien idéal à Madagascar",
        paragraphs: [
          "Voici le calendrier de référence, basé sur les retours terrain des garagistes de Tana et des grandes villes. Les fréquences constructeur (colonne « Standard ») sont données à titre de comparaison : vous verrez qu’elles sont presque toutes doublées.",
        ],
        table: {
          caption: "Calendrier entretien Madagascar vs. fréquence standard",
          headers: ["Opération", "Fréquence Madagascar", "Fréquence standard", "Coût moyen (MGA)"],
          rows: [
            ["Vidange huile + filtre", "5 000 km", "10 – 15 000 km", "200 – 400 000"],
            ["Filtre à air", "5 000 km", "20 000 km", "50 – 100 000"],
            ["Filtre habitacle", "10 000 km", "15 000 km", "80 – 150 000"],
            ["Rotation des pneus", "10 000 km", "10 000 km", "~50 000"],
            ["Remplacement pneus (x4)", "40 – 60 000 km", "60 – 80 000 km", "800 000 – 2 M"],
            ["Plaquettes de frein", "30 – 40 000 km", "40 – 50 000 km", "300 – 500 000"],
            ["Recharge climatisation", "2 ans", "2 ans", "150 – 300 000"],
            ["Batterie", "3 – 4 ans", "4 – 5 ans", "400 – 800 000"],
            ["Courroie de distribution", "80 – 100 000 km", "100 – 150 000 km", "1 – 2,5 M"],
            ["Révision complète", "Tous les 6 mois", "Tous les 12 mois", "500 000 – 1 M"],
          ],
        },
      },
      {
        heading: "Les chiffres clés à mémoriser",
        paragraphs: [
          "Vidange moteur tous les 5 000 km. C’est la règle numéro un, et elle seule évite à votre moteur 80 % des problèmes classiques à Madagascar. La poussière s’infiltre dans l’huile et accélère l’usure des pièces internes : plus vous vidangez, plus vous protégez. 200 000 à 400 000 MGA tous les 5 000 km vs. un moteur à changer à 3 millions MGA : le calcul est vite fait.",
          "Filtre à air tous les 5 000 km également. Sur piste ou en ville poussiéreuse, un filtre obstrué étouffe le moteur, augmente la consommation et accélère l’usure. Un filtre neuf (50 000 à 100 000 MGA) est l’investissement le moins cher et le plus rentable de votre entretien.",
          "Pneus. Rotation (inversion avant/arrière) tous les 10 000 km pour une usure équilibrée. Remplacement tous les 40 à 60 000 km, contre 60 à 80 000 km annoncés par les fabricants — la chaleur et les routes rugueuses raccourcissent la durée de vie réelle. Vérifiez la pression une fois par mois : la chaleur la fait monter, une pression incorrecte accélère l’usure de 15 à 20 %.",
          "Recharge climatisation tous les 2 ans. C’est le rythme standard partout, mais à Madagascar la clim fonctionne presque toute l’année — ne sautez pas cette étape.",
          "Batterie tous les 3 à 4 ans. Les coupures électriques répétées (délestages), couplées à la chaleur, raccourcissent sensiblement la durée de vie par rapport aux 4-5 ans annoncés. Surveillez les symptômes : démarrages lents, éclairage qui faiblit.",
          "Courroie de distribution tous les 80 à 100 000 km. La vraie urgence : une rupture de courroie casse le moteur. Ne dépassez jamais l’intervalle recommandé par votre constructeur — et à Madagascar, anticipez-le plutôt que l’inverse.",
        ],
      },
      {
        heading: "Les 12 réflexes pour préserver votre véhicule",
        numbered: true,
        bullets: [
          "Lavez la carrosserie régulièrement. Une fois par semaine minimum en zone côtière, toutes les deux semaines en ville. La poussière rouge et les projections salines sont corrosives : elles doivent partir avant de pénétrer la peinture.",
          "Vérifiez la pression des pneus chaque mois. Chaleur et variations d’altitude (Tana à 1 250 m) jouent sur la pression. Un pneu sous-gonflé use plus vite et consomme plus ; un pneu surgonflé perd en adhérence.",
          "Contrôlez le niveau de liquide de refroidissement tous les 15 jours. La surchauffe moteur est la panne numéro un à Madagascar. Trois minutes de vérification vous évitent un radiateur ou une pompe à eau à remplacer.",
          "Changez le filtre à air tous les 5 000 km. Spécialement si vous roulez souvent sur piste. Le gain en performance et en consommation est immédiat.",
          "Faites recharger la climatisation tous les 2 ans. Un circuit mal rempli abîme le compresseur (pièce à 1 à 2 millions MGA). Et vous voulez vraiment rouler sans clim 10 mois par an ?",
          "Inspectez les courroies tous les 20 000 km. Fissures, effilochage, jeu excessif : autant de signes d’usure. La chaleur les durcit et les craquèle plus vite qu’en Europe.",
          "Vérifiez la batterie deux fois par an. Bornes propres, niveau d’électrolyte (pour les batteries non scellées), tension de charge. Les coupures secteur multiplient les cycles de charge/décharge.",
          "Traitez la corrosion dès le premier point. Une petite tache de rouille ignorée devient un trou en 6 mois en zone côtière. Poncez, traitez à l’antirouille, repeignez : 50 000 MGA aujourd’hui ou 500 000 plus tard.",
          "Changez l’huile moteur tous les 5 000 km. Oui, c’est plus fréquent que ce que dit le carnet. Non, ce n’est pas négociable. C’est la différence entre un moteur qui dure 300 000 km et un moteur qui lâche à 120 000.",
          "Vérifiez le parallélisme après chaque gros nid-de-poule. Volant qui tire, usure inégale des pneus : deux signes qu’il faut passer chez un réparateur. Le contrôle coûte environ 50 000 MGA, il en sauve plusieurs millions en pneumatiques.",
          "Gardez une trousse de dépannage dans le coffre. Cric, clé de roue, roue de secours gonflée, triangle, gilet jaune, torche. Un incident à 50 km de Tana, la nuit, n’est pas le moment de découvrir qu’il vous manque quelque chose.",
          "Évitez les stations-service douteuses. Un carburant mal filtré (eau, impuretés) encrasse la pompe à injection et les injecteurs — pannes à cinq chiffres. Privilégiez les grandes stations des marques connues (Shell, Total, Jovenna).",
        ],
        callout: {
          type: "tip",
          title: "La règle la plus rentable de toutes",
          text: "À Madagascar, une vidange à 5 000 km plutôt qu’à 10 000 est votre meilleur investissement. La poussière rouge s’infiltre partout et contamine l’huile bien plus vite qu’en Europe — votre moteur vous remercie tous les kilomètres supplémentaires qu’il tiendra.",
        },
      },
      {
        heading: "Garages de confiance à Madagascar",
        paragraphs: [
          "Trois catégories de garages coexistent, chacune avec ses usages.",
          "Les concessionnaires de marque (Toyota via Madauto, Mitsubishi via Materauto, Renault via Sicam Auto, etc.) offrent des pièces d’origine, un outillage adapté à chaque modèle et une main-d’œuvre spécialisée. Le coût est plus élevé (20 à 40 % de plus qu’un garage indépendant), mais pour les opérations techniques lourdes (distribution, boîte de vitesses, électronique moteur), c’est souvent l’option la plus sûre.",
          "Les garages indépendants réputés font le gros du marché. Leur prix est plus raisonnable et les bons mécaniciens connaissent mieux les spécificités locales que les manuels constructeurs. Le risque : la qualité varie énormément. Fiez-vous au bouche-à-oreille, aux avis Google, et observez avant de confier : locaux propres, outillage sérieux, devis écrit.",
          "Les stations-service pour l’entretien courant. Shell Madagascar propose par exemple des baies de vidange sur plusieurs sites. Pratique pour les opérations simples (vidange, filtres), avec des produits garantis et une traçabilité claire. Évitez pour les diagnostics complexes.",
          "Le bon réflexe, quel que soit le prestataire : demandez systématiquement un devis écrit avant l’intervention, et une facture détaillée après. Ces deux documents sont votre protection en cas de litige et votre historique d’entretien pour la revente.",
        ],
      },
      {
        heading: "Signes d’alerte à ne jamais ignorer",
        paragraphs: [
          "Votre voiture vous parle avant de tomber en panne. Apprendre à reconnaître les signaux, c’est la différence entre une réparation à 500 000 MGA et une remorque à 2 millions.",
        ],
        table: {
          caption: "Signes d’alerte et réactions recommandées",
          headers: ["Signe", "Que faire", "Urgence"],
          rows: [
            ["Voyant moteur orange", "Diagnostic sous 48 h", "Moyenne"],
            ["Voyant moteur rouge", "Arrêter immédiatement", "Critique"],
            ["Bruit métallique sous la voiture", "Inspection rapide", "Élevée"],
            ["Fumée bleue à l’échappement", "Consultation mécanicien", "Élevée"],
            ["Surchauffe (aiguille rouge)", "Arrêter, laisser refroidir", "Critique"],
            ["Freinage spongieux", "Inspection immédiate", "Critique"],
            ["Direction qui tire", "Parallélisme sous 1 semaine", "Moyenne"],
          ],
        },
      },
      {
        heading: "Règles de lecture rapide",
        paragraphs: [
          "Voyants rouges = arrêter immédiatement. Moteur, huile, température : les voyants rouges signifient un risque de casse imminente. Continuer à rouler peut multiplier la facture par dix.",
          "Voyants oranges = consulter sous 48 h. Moins critiques mais pas à ignorer : le véhicule vous dit qu’un système ne fonctionne plus dans ses tolérances. Un scan électronique (30 000 à 80 000 MGA) identifie la cause en quelques minutes.",
          "Bruits nouveaux = attention particulière. Cliquetis, sifflement, grondement : un bruit qui n’était pas là hier est toujours un signal. À froid (distribution, roulement) ou à chaud (surchauffe), à l’avant ou à l’arrière, prenez l’habitude d’écouter.",
          "Fumées à l’échappement. Noire = injection/combustion. Bleue = consommation d’huile. Blanche épaisse = joint de culasse (grave). Un léger panache blanc par temps humide au démarrage est normal — une fumée blanche dense à chaud ne l’est pas.",
          "Comportement dynamique. Freinage spongieux, volant qui tire, vibration au-dessus d’une vitesse, direction qui grince : chacun est un signal. Aucun ne justifie d’attendre « pour voir ».",
        ],
      },
    ],
    faq: [
      {
        question: "À quelle fréquence faire la vidange à Madagascar ?",
        answer: "Tous les 5 000 km, même si votre carnet d’entretien annonce 10 000 ou 15 000 km. La poussière, la chaleur et les conditions de conduite dégradent l’huile beaucoup plus vite que les conditions tempérées pour lesquelles ces intervalles ont été calculés.",
      },
      {
        question: "Combien coûte un entretien annuel complet à Antananarivo ?",
        answer: "Pour un véhicule récent sans gros problème, comptez 1,5 à 2,5 millions MGA par an incluant deux vidanges, un contrôle, les petits consommables et une révision complète annuelle. Pour un véhicule plus âgé avec remplacements (pneus, batterie, distribution), le budget monte à 3 à 5 millions.",
      },
      {
        question: "Quels pneus choisir pour les routes malgaches ?",
        answer: "Pour un usage mixte ville + nationales, restez sur du tourisme classique en privilégiant des marques solides (Michelin, Bridgestone, Hankook). Si vous sortez régulièrement du bitume ou avez un 4x4, optez pour des pneus AT (All Terrain) : compromis idéal entre adhérence sur route et tenue sur piste. Évitez les pneus MT (Mud Terrain) sauf usage majoritairement off-road.",
      },
      {
        question: "Comment protéger ma voiture de la corrosion côté océan ?",
        answer: "Trois habitudes essentielles : lavage sous caisse au moins hebdomadaire (eau claire pour rincer le sel), application d’un traitement antirouille tous les deux ans chez un professionnel, et inspection visuelle mensuelle des bas de caisse et passages de roue. Dès la première tache de rouille, traitez-la.",
      },
      {
        question: "Faut-il faire entretenir sa voiture chez le concessionnaire ?",
        answer: "Pour les véhicules sous garantie et pour les grosses interventions (distribution, électronique, boîte), oui — vous payez plus cher mais vous évitez les problèmes. Pour l’entretien courant (vidanges, filtres, freins) d’un véhicule plus ancien, un bon garage indépendant fait aussi bien pour moins cher. L’essentiel : gardez une traçabilité écrite (facture, détail des pièces).",
      },
    ],
    conclusion: "L’entretien automobile à Madagascar obéit à une règle simple : anticipez plutôt que réparez. La plupart des pannes graves se signalent des centaines de kilomètres à l’avance, par un bruit, un voyant, une fuite, une sensation au volant. Ceux qui écoutent leur véhicule dépensent deux à trois fois moins en réparations que ceux qui attendent la panne — et leur voiture se revend dans de bien meilleures conditions quelques années plus tard. Un carnet d’entretien tenu à jour avec les factures de chaque intervention vaut 10 à 15 % de valeur à la revente. Sur AutoNex, les véhicules avec historique complet partent plus vite et au meilleur prix.",
  },
];
