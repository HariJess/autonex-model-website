export type AutoBrandGroup = {
  group: string;
  brands: string[];
};

export const AUTO_TRANSACTION_MODES = [
  { id: "acheter", label: "Acheter", href: "/recherche?transaction=vente" },
  { id: "vendre", label: "Vendre", href: "/recherche?transaction=location" },
  { id: "location_courte", label: "Louer court terme", href: "/recherche?transaction=location_vacances" },
  { id: "location_longue", label: "Louer long terme", href: "/recherche?transaction=location&rental_term=longue" },
  { id: "import", label: "Import", href: "/recherche?condition=neuf&seller=concessionnaire" },
  { id: "concessionnaires", label: "Concessionnaires", href: "/agences" },
] as const;

export const AUTO_DISCOVERY_CATEGORIES = [
  "Voitures",
  "SUV / 4x4",
  "Pick-up",
  "Berlines",
  "Citadines",
  "Motos",
  "Scooters",
  "Utilitaires",
  "Minibus / Bus",
  "Camions",
  "Véhicules neufs",
  "Véhicules d’occasion",
  "Véhicules importés",
  "Location courte durée",
  "Location longue durée",
] as const;

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
