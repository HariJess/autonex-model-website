export type AutoBrandGroup = {
  group: string;
  brands: string[];
};

export type AutoDiscoveryCategory = {
  id: string;
  label: string;
  href: string;
  iconKey?: "car" | "suv" | "truck" | "bike" | "van" | "bus" | "new" | "used" | "import" | "rent";
  description?: string;
};

export const AUTO_TRANSACTION_MODES = [
  { id: "acheter", label: "Acheter", href: "/recherche?transaction=vente" },
  { id: "vendre", label: "Vendre", href: "/recherche?transaction=location" },
  { id: "location_courte", label: "Louer court terme", href: "/recherche?transaction=location_vacances" },
  { id: "location_longue", label: "Louer long terme", href: "/recherche?transaction=location&rental_term=longue" },
  { id: "import", label: "Import", href: "/recherche?condition=neuf&seller=concessionnaire" },
  { id: "concessionnaires", label: "Concessionnaires", href: "/agences" },
] as const;

export const AUTO_DISCOVERY_CATEGORIES: AutoDiscoveryCategory[] = [
  { id: "voitures", label: "Voitures", href: "/recherche?type=maison", iconKey: "car", description: "Voitures polyvalentes ville et route" },
  { id: "suv4x4", label: "SUV / 4x4", href: "/recherche?type=villa", iconKey: "suv", description: "Routes difficiles et usages mixtes" },
  { id: "pickup", label: "Pick-up", href: "/recherche?type=local_commercial&drive=4x4", iconKey: "truck", description: "Travail, chantier, usage pro" },
  { id: "berlines", label: "Berlines", href: "/recherche?type=maison&drive=4x2", iconKey: "car", description: "Confort et usage quotidien" },
  { id: "citadines", label: "Citadines", href: "/recherche?type=appartement", iconKey: "car", description: "Compactes et économiques" },
  { id: "motos", label: "Motos", href: "/recherche?type=terrain", iconKey: "bike", description: "Route, piste et mobilité rapide" },
  { id: "scooters", label: "Scooters", href: "/recherche?type=terrain&model=scooter", iconKey: "bike", description: "Trajets urbains agiles" },
  { id: "utilitaires", label: "Utilitaires", href: "/recherche?type=local_commercial", iconKey: "van", description: "Livraison et logistique" },
  { id: "minibus", label: "Minibus / Bus", href: "/recherche?type=bureau&model=bus", iconKey: "bus", description: "Transport passagers" },
  { id: "camions", label: "Camions", href: "/recherche?type=bureau", iconKey: "truck", description: "Poids lourd et transport pro" },
  { id: "neufs", label: "Véhicules neufs", href: "/recherche?condition=neuf", iconKey: "new", description: "Zéro km et garanties" },
  { id: "occasion", label: "Véhicules d’occasion", href: "/recherche?condition=occasion", iconKey: "used", description: "Occasions sélectionnées" },
  { id: "importes", label: "Véhicules importés", href: "/recherche?condition=importe", iconKey: "import", description: "Arrivages import" },
  { id: "loc-courte", label: "Location courte durée", href: "/recherche?transaction=location_vacances", iconKey: "rent", description: "Jours à quelques semaines" },
  { id: "loc-longue", label: "Location longue durée", href: "/recherche?transaction=location&rental_term=longue", iconKey: "rent", description: "Long terme et flotte" },
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
