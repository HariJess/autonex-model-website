export type AutoBrandGroup = {
  group: string;
  brands: string[];
};

export type AutoDiscoveryCategory = {
  id: string;
  label: string;
  href: string;
  iconKey?:
    | "citadine"
    | "berline"
    | "suv"
    | "crossover"
    | "pickup"
    | "coupe"
    | "cabriolet"
    | "moto"
    | "scooter"
    | "quad"
    | "buggy"
    | "utilitaire"
    | "van"
    | "bus"
    | "camion"
    | "electrique"
    | "hybride"
    | "hybride-rechargeable"
    | "thermique"
    | "new"
    | "used"
    | "rent-short"
    | "rent-long";
  description?: string;
};

export type AutoHomepageBrand = {
  id: string;
  label: string;
  href: string;
  /** Optional future brand-logo asset path in /public (e.g. /brands/toyota.svg). */
  logoAsset?: string;
};

export const AUTO_TRANSACTION_MODES = [
  { id: "acheter", label: "Acheter", href: "/recherche?transaction=vente" },
  { id: "vendre", label: "Vendre", href: "/recherche?transaction=location" },
  { id: "location_courte", label: "Louer court terme", href: "/recherche?transaction=location_vacances" },
  { id: "location_longue", label: "Louer long terme", href: "/recherche?transaction=location&rental_term=longue" },
  { id: "concessionnaires", label: "Concessionnaires", href: "/agences" },
] as const;

export const AUTO_DISCOVERY_CATEGORIES: AutoDiscoveryCategory[] = [
  { id: "citadine", label: "Citadine", href: "/recherche?type=appartement", iconKey: "citadine", description: "Compacte, urbaine et agile au quotidien." },
  { id: "berline", label: "Berline", href: "/recherche?type=maison&drive=4x2", iconKey: "berline", description: "Confort routier et usage familial." },
  { id: "suv4x4", label: "SUV / 4x4", href: "/recherche?type=villa", iconKey: "suv", description: "Polyvalence route/piste et garde au sol élevée." },
  { id: "crossover", label: "Crossover", href: "/recherche?type=villa&drive=4x2", iconKey: "crossover", description: "Style SUV, conduite urbaine optimisée." },
  { id: "pickup", label: "Pick-up", href: "/recherche?type=local_commercial&drive=4x4", iconKey: "pickup", description: "Charge utile et robustesse professionnelle." },
  { id: "coupe", label: "Coupé", href: "/recherche?type=maison&model=coupe", iconKey: "coupe", description: "Ligne sportive et sensations de conduite." },
  { id: "cabriolet", label: "Cabriolet", href: "/recherche?type=maison&model=cabriolet", iconKey: "cabriolet", description: "Plaisir de conduite à ciel ouvert." },
  { id: "moto", label: "Moto", href: "/recherche?type=terrain&model=moto", iconKey: "moto", description: "Route, trail ou sport selon usage." },
  { id: "scooter", label: "Scooter", href: "/recherche?type=terrain&model=scooter", iconKey: "scooter", description: "Mobilité fluide en ville." },
  { id: "quad", label: "Quad", href: "/recherche?type=terrain&model=quad", iconKey: "quad", description: "Loisir, piste et exploitation rurale." },
  { id: "buggy", label: "Buggy", href: "/recherche?type=terrain&model=buggy", iconKey: "buggy", description: "Véhicule léger tout-terrain récréatif." },
  { id: "utilitaire-leger", label: "Utilitaire léger", href: "/recherche?type=local_commercial", iconKey: "utilitaire", description: "Livraison urbaine et activité artisanale." },
  { id: "van-fourgon", label: "Van / Fourgon", href: "/recherche?type=local_commercial&model=fourgon", iconKey: "van", description: "Volume de chargement optimisé." },
  { id: "minibus", label: "Minibus / Bus", href: "/recherche?type=bureau&model=bus", iconKey: "bus", description: "Transport de passagers et navettes." },
  { id: "camion", label: "Camion", href: "/recherche?type=bureau&model=camion", iconKey: "camion", description: "Poids lourd et transport professionnel." },
  { id: "electrique", label: "Électrique", href: "/recherche?fuel=%C3%89lectrique", iconKey: "electrique", description: "Motorisation zéro émission locale." },
  { id: "hybride", label: "Hybride", href: "/recherche?fuel=Hybride", iconKey: "hybride", description: "Équilibre conso et polyvalence." },
  { id: "hybride-rechargeable", label: "Hybride rechargeable", href: "/recherche?fuel=Hybride%20rechargeable", iconKey: "hybride-rechargeable", description: "Mode électrique + autonomie thermique." },
  { id: "thermique", label: "Thermique", href: "/recherche?fuel=Essence&fuel=Diesel", iconKey: "thermique", description: "Essence ou diesel selon votre besoin." },
  { id: "neuf", label: "Neuf", href: "/recherche?condition=neuf", iconKey: "new", description: "Faible kilométrage, garantie et sérénité." },
  { id: "occasion", label: "Occasion", href: "/recherche?condition=occasion", iconKey: "used", description: "Offres sélectionnées à budget maîtrisé." },
  { id: "loc-courte", label: "Location courte durée", href: "/recherche?transaction=location_vacances", iconKey: "rent-short", description: "Jours à quelques semaines." },
  { id: "loc-longue", label: "Location longue durée", href: "/recherche?transaction=location&rental_term=longue", iconKey: "rent-long", description: "Abonnement, flotte et besoins pro." },
];

export const AUTO_BRAND_GROUPS: AutoBrandGroup[] = [
  {
    group: "Marques généralistes",
    brands: ["Toyota", "Nissan", "Hyundai", "Kia", "Mazda", "Suzuki", "Mitsubishi", "Isuzu", "Ford", "Renault", "Honda", "Subaru", "Volkswagen", "Peugeot", "Citroën", "Chevrolet", "Fiat", "Opel", "Dacia", "Skoda", "SEAT", "Cupra", "Tata", "Mahindra", "MG"],
  },
  {
    group: "Premium & luxe",
    brands: ["Mercedes-Benz", "BMW", "Audi", "Lexus", "Volvo", "Porsche", "MINI", "Infiniti", "Acura", "Land Rover", "Jaguar", "Alfa Romeo", "Bentley", "Rolls-Royce", "Aston Martin", "Maserati", "Ferrari", "Lamborghini", "Bugatti"],
  },
  {
    group: "Utilitaires & pros",
    brands: ["GMC", "Jeep", "Dodge", "RAM", "JMC", "Foton", "GWM", "Haval", "Geely", "Chery", "BYD"],
  },
  {
    group: "Moto & scooter",
    brands: ["Yamaha", "Honda", "Kawasaki", "Suzuki Moto", "KTM", "Ducati", "Vespa", "Piaggio", "Aprilia", "Royal Enfield", "TVS", "Bajaj", "Benelli", "CFMoto", "Kymco"],
  },
];

export const AUTO_BRANDS = [...new Set(AUTO_BRAND_GROUPS.flatMap((g) => g.brands))].sort((a, b) =>
  a.localeCompare(b, "fr"),
);

export const TOP_AUTO_BRANDS = [
  "Toyota",
  "Nissan",
  "Hyundai",
  "Kia",
  "Mazda",
  "Suzuki",
  "Mitsubishi",
  "Isuzu",
  "Ford",
  "Renault",
  "Honda",
  "Subaru",
  "Volkswagen",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Peugeot",
  "BYD",
  "Chery",
  "Yamaha",
] as const;

export const AUTO_HOMEPAGE_BRANDS: AutoHomepageBrand[] = [
  { id: "toyota", label: "Toyota", href: "/recherche?brand=Toyota" },
  { id: "nissan", label: "Nissan", href: "/recherche?brand=Nissan" },
  { id: "hyundai", label: "Hyundai", href: "/recherche?brand=Hyundai" },
  { id: "kia", label: "Kia", href: "/recherche?brand=Kia" },
  { id: "mazda", label: "Mazda", href: "/recherche?brand=Mazda" },
  { id: "suzuki", label: "Suzuki", href: "/recherche?brand=Suzuki" },
  { id: "mitsubishi", label: "Mitsubishi", href: "/recherche?brand=Mitsubishi" },
  { id: "isuzu", label: "Isuzu", href: "/recherche?brand=Isuzu" },
  { id: "ford", label: "Ford", href: "/recherche?brand=Ford" },
  { id: "renault", label: "Renault", href: "/recherche?brand=Renault" },
  { id: "honda", label: "Honda", href: "/recherche?brand=Honda" },
  { id: "subaru", label: "Subaru", href: "/recherche?brand=Subaru" },
  { id: "volkswagen", label: "Volkswagen", href: "/recherche?brand=Volkswagen" },
  { id: "mercedes-benz", label: "Mercedes-Benz", href: "/recherche?brand=Mercedes-Benz" },
  { id: "bmw", label: "BMW", href: "/recherche?brand=BMW" },
  { id: "audi", label: "Audi", href: "/recherche?brand=Audi" },
  { id: "peugeot", label: "Peugeot", href: "/recherche?brand=Peugeot" },
  { id: "citroen", label: "Citroën", href: "/recherche?brand=Citro%C3%ABn" },
  { id: "byd", label: "BYD", href: "/recherche?brand=BYD" },
  { id: "chery", label: "Chery", href: "/recherche?brand=Chery" },
  { id: "yamaha", label: "Yamaha", href: "/recherche?brand=Yamaha" },
];
