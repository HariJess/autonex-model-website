export type AutoBrandGroup = {
  group: string;
  brands: string[];
};

export type HeroVehicleTypeOption = {
  id: string;
  label: string;
  /**
   * Legacy DB listing type fallback used by current query model.
   * Multiple values are allowed; they are sanitized later by search rules.
   */
  listingTypes?: string[];
  /** Optional search term fallback for model/body-style-like matching. */
  modelQuery?: string;
  /** Optional direct fuel filter for electric/hybrid shortcuts. */
  fuels?: string[];
};

type VehicleTypeFilterInput = {
  types?: string[];
  modelQuery?: string;
  fuels?: string[];
};
type VehicleTypeResolution = {
  listingTypes: string[];
  fuels: string[];
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
  { id: "louer", label: "Location longue durée", href: "/recherche?transaction=location" },
  { id: "location_courte", label: "Location courte durée", href: "/recherche?transaction=location_vacances" },
  { id: "location_longue", label: "Location longue durée", href: "/recherche?transaction=location" },
  { id: "concessionnaires", label: "Concessionnaires", href: "/agences" },
] as const;

export const AUTO_DISCOVERY_CATEGORIES: AutoDiscoveryCategory[] = [
  { id: "citadine", label: "Citadine", href: "/recherche?vtype=citadine", iconKey: "citadine", description: "Compacte, urbaine et agile au quotidien." },
  { id: "berline", label: "Berline", href: "/recherche?vtype=berline", iconKey: "berline", description: "Confort routier et usage familial." },
  { id: "suv4x4", label: "SUV / 4x4", href: "/recherche?vtype=suv_4x4", iconKey: "suv", description: "Polyvalence route/piste et garde au sol élevée." },
  { id: "crossover", label: "Crossover", href: "/recherche?vtype=crossover", iconKey: "crossover", description: "Style SUV, conduite urbaine optimisée." },
  { id: "pickup", label: "Pick-up", href: "/recherche?vtype=pick_up", iconKey: "pickup", description: "Charge utile et robustesse professionnelle." },
  { id: "coupe", label: "Coupé", href: "/recherche?vtype=coupe", iconKey: "coupe", description: "Ligne sportive et sensations de conduite." },
  { id: "cabriolet", label: "Cabriolet", href: "/recherche?vtype=cabriolet", iconKey: "cabriolet", description: "Plaisir de conduite à ciel ouvert." },
  { id: "moto", label: "Moto", href: "/recherche?vtype=moto", iconKey: "moto", description: "Route, trail ou sport selon usage." },
  { id: "scooter", label: "Scooter", href: "/recherche?vtype=scooter", iconKey: "scooter", description: "Mobilité fluide en ville." },
  { id: "quad", label: "Quad", href: "/recherche?vtype=quad", iconKey: "quad", description: "Loisir, piste et exploitation rurale." },
  { id: "buggy", label: "Buggy", href: "/recherche?vtype=buggy", iconKey: "buggy", description: "Véhicule léger tout-terrain récréatif." },
  { id: "utilitaire-leger", label: "Utilitaire léger", href: "/recherche?vtype=utilitaire_leger", iconKey: "utilitaire", description: "Livraison urbaine et activité artisanale." },
  { id: "van-fourgon", label: "Van / Fourgon", href: "/recherche?vtype=van_fourgon", iconKey: "van", description: "Volume de chargement optimisé." },
  { id: "minibus", label: "Minibus / Bus", href: "/recherche?vtype=minibus_bus", iconKey: "bus", description: "Transport de passagers et navettes." },
  { id: "camion", label: "Camion", href: "/recherche?vtype=camion", iconKey: "camion", description: "Poids lourd et transport professionnel." },
  { id: "electrique", label: "Électrique", href: "/recherche?fuel=%C3%89lectrique", iconKey: "electrique", description: "Motorisation zéro émission locale." },
  { id: "hybride", label: "Hybride", href: "/recherche?fuel=Hybride", iconKey: "hybride", description: "Équilibre conso et polyvalence." },
  { id: "hybride-rechargeable", label: "Hybride rechargeable", href: "/recherche?fuel=Hybride%20rechargeable", iconKey: "hybride-rechargeable", description: "Mode électrique + autonomie thermique." },
  { id: "thermique", label: "Thermique", href: "/recherche?fuel=Essence,Diesel", iconKey: "thermique", description: "Essence ou diesel selon votre besoin." },
  { id: "neuf", label: "Neuf", href: "/recherche?condition=neuf", iconKey: "new", description: "Faible kilométrage, garantie et sérénité." },
  { id: "occasion", label: "Occasion", href: "/recherche?condition=occasion", iconKey: "used", description: "Offres sélectionnées à budget maîtrisé." },
  { id: "loc-courte", label: "Location courte durée", href: "/recherche?transaction=location_vacances", iconKey: "rent-short", description: "Jours à quelques semaines." },
  { id: "loc-longue", label: "Location longue durée", href: "/recherche?transaction=location", iconKey: "rent-long", description: "Abonnement, flotte et besoins pro." },
];

export const AUTO_BRAND_GROUPS: AutoBrandGroup[] = [
  {
    group: "Marques généralistes",
    brands: ["Toyota", "Nissan", "Hyundai", "Kia", "Suzuki", "Mitsubishi", "Isuzu", "Mazda", "Ford", "Renault", "Peugeot", "Volkswagen", "Honda", "Dacia", "Citroen", "Chevrolet", "Fiat", "Opel", "Skoda", "SEAT", "Cupra", "Tata", "Mahindra", "MG", "Subaru", "Brilliance", "Enranger", "Jetta", "Kaiyi"],
  },
  {
    group: "Premium & luxe",
    brands: ["Mercedes-Benz", "BMW", "Audi", "Lexus", "Volvo", "Porsche", "MINI", "Infiniti", "Acura", "Land Rover", "Jaguar", "Alfa Romeo", "Bentley", "Rolls-Royce", "Aston Martin", "Maserati", "Ferrari", "Lamborghini", "Bugatti"],
  },
  {
    group: "Utilitaires & pros",
    brands: ["GMC", "Jeep", "Dodge", "RAM", "JMC", "Foton", "Great Wall", "Haval", "Geely", "Chery", "BYD"],
  },
  {
    group: "Moto & scooter",
    brands: ["Yamaha", "Honda", "Kawasaki", "Suzuki Moto", "KTM", "Ducati", "Vespa", "Piaggio", "Aprilia", "Royal Enfield", "TVS", "Bajaj", "Benelli", "CFMoto", "Kymco"],
  },
];

export const AUTO_BRANDS = [...new Set(AUTO_BRAND_GROUPS.flatMap((g) => g.brands))].sort((a, b) =>
  a.localeCompare(b, "fr"),
);

/**
 * Retourne la capitalisation officielle de la marque (depuis AUTO_BRANDS)
 * à partir d'une valeur saisie ou stockée. Fallback : capitalisation par
 * première lettre.
 */
export function getVehicleMakeLabel(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  const match = AUTO_BRANDS.find((b) => b.toLowerCase() === normalized);
  if (match) return match;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const TOP_AUTO_BRANDS = [
  "Toyota",
  "Nissan",
  "Hyundai",
  "Kia",
  "Suzuki",
  "Mitsubishi",
  "Isuzu",
  "Mazda",
  "Ford",
  "Renault",
  "Peugeot",
  "Volkswagen",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Honda",
  "Yamaha",
  "BYD",
  "Chery",
] as const;

export const AUTO_SEARCH_FUEL_OPTIONS = [
  "Essence",
  "Diesel",
  "Hybride",
  "Hybride rechargeable",
  "Électrique",
] as const;

export const AUTO_SEARCH_TRANSMISSION_OPTIONS = ["Boîte manuelle", "Boîte automatique"] as const;

export const AUTO_SEARCH_DRIVETRAIN_OPTIONS = ["4x2", "4x4", "Traction", "Propulsion", "AWD"] as const;

export const AUTO_SEARCH_CONDITION_OPTIONS = ["Neuf", "Occasion"] as const;

export const AUTO_SEARCH_SELLER_OPTIONS = ["Particulier", "Concessionnaire"] as const;

// Post Lot 8 : listing.type est free-text. Les `listingTypes` ci-dessous
// incluent les nouvelles valeurs véhicule (src/data/vehicleTypes.ts) en plus
// des anciennes valeurs immobilières — rétrocompat pour des listings legacy.
export const AUTO_SEARCH_VEHICLE_TYPE_OPTIONS: HeroVehicleTypeOption[] = [
  { id: "citadine", label: "Citadine", listingTypes: ["citadine", "appartement"], modelQuery: "citadine" },
  { id: "berline", label: "Berline", listingTypes: ["berline", "maison"], modelQuery: "berline" },
  { id: "suv_4x4", label: "SUV / 4x4", listingTypes: ["suv", "4x4", "villa"], modelQuery: "suv" },
  { id: "crossover", label: "Crossover", listingTypes: ["suv", "villa"], modelQuery: "crossover" },
  { id: "pick_up", label: "Pick-up", listingTypes: ["pickup", "local_commercial"], modelQuery: "pick-up" },
  { id: "coupe", label: "Coupé", listingTypes: ["coupe", "maison"], modelQuery: "coupe" },
  { id: "cabriolet", label: "Cabriolet", listingTypes: ["cabriolet", "maison"], modelQuery: "cabriolet" },
  { id: "utilitaire_leger", label: "Utilitaire léger", listingTypes: ["fourgon", "local_commercial"], modelQuery: "utilitaire" },
  { id: "van_fourgon", label: "Van / Fourgon", listingTypes: ["fourgon", "local_commercial", "bureau"], modelQuery: "fourgon" },
  { id: "minibus_bus", label: "Minibus / Bus", listingTypes: ["minibus", "bureau"], modelQuery: "minibus" },
  { id: "camion", label: "Camion", listingTypes: ["camion", "bureau"], modelQuery: "camion" },
  { id: "moto", label: "Moto", listingTypes: ["moto", "terrain"], modelQuery: "moto" },
  { id: "scooter", label: "Scooter", listingTypes: ["scooter", "terrain"], modelQuery: "scooter" },
  { id: "quad", label: "Quad", listingTypes: ["quad", "terrain"], modelQuery: "quad" },
  { id: "buggy", label: "Buggy", listingTypes: ["quad", "terrain"], modelQuery: "buggy" },
  { id: "electrique", label: "Électrique", fuels: ["Électrique"] },
  { id: "hybride", label: "Hybride", fuels: ["Hybride", "Hybride rechargeable"] },
];

export const AUTO_HERO_VEHICLE_TYPE_OPTIONS: HeroVehicleTypeOption[] = [
  { id: "all", label: "Tous types" },
  ...AUTO_SEARCH_VEHICLE_TYPE_OPTIONS,
];

const normalizeVehicleToken = (value: string | null | undefined): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const hasTokenMatch = (needle: string, haystack: string) =>
  normalizeVehicleToken(haystack).includes(normalizeVehicleToken(needle));

export function inferVehicleTypeOptionIdFromFilters({
  types = [],
  modelQuery = "",
  fuels = [],
}: VehicleTypeFilterInput): string | null {
  if (fuels.length > 0) {
    const wanted = new Set(fuels.map((v) => normalizeVehicleToken(v)));
    const fuelMatch = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.find(
      (opt) => opt.fuels && opt.fuels.some((fuel) => wanted.has(normalizeVehicleToken(fuel))),
    );
    if (fuelMatch) return fuelMatch.id;
  }

  const normalizedModelQuery = normalizeVehicleToken(modelQuery);
  if (normalizedModelQuery) {
    const modelMatch = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.find(
      (opt) => opt.modelQuery && hasTokenMatch(opt.modelQuery, normalizedModelQuery),
    );
    if (modelMatch) return modelMatch.id;
  }

  if (types.length > 0) {
    const wanted = new Set(types);
    const exactTypeMatch = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.find((opt) => {
      if (!opt.listingTypes?.length) return false;
      return opt.listingTypes.length === wanted.size && opt.listingTypes.every((tp) => wanted.has(tp));
    });
    if (exactTypeMatch) return exactTypeMatch.id;

    const partialTypeMatch = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.find(
      (opt) => opt.listingTypes && opt.listingTypes.some((tp) => wanted.has(tp)),
    );
    if (partialTypeMatch) return partialTypeMatch.id;
  }

  return null;
}

export function getVehicleTypeLabelFromFilters(filters: VehicleTypeFilterInput): string | null {
  const id = inferVehicleTypeOptionIdFromFilters(filters);
  if (!id) return null;
  return AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.find((opt) => opt.id === id)?.label ?? null;
}

export function resolveVehicleTypeFilters(vehicleTypeIds: string[]): VehicleTypeResolution {
  if (!vehicleTypeIds.length) return { listingTypes: [], fuels: [] };
  const selected = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.filter((opt) => vehicleTypeIds.includes(opt.id));
  const listingTypes = Array.from(new Set(selected.flatMap((opt) => opt.listingTypes ?? [])));
  const fuels = Array.from(new Set(selected.flatMap((opt) => opt.fuels ?? [])));
  return { listingTypes, fuels };
}

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
  { id: "citroen", label: "Citroen", href: "/recherche?brand=Citroen" },
  { id: "byd", label: "BYD", href: "/recherche?brand=BYD" },
  { id: "chery", label: "Chery", href: "/recherche?brand=Chery" },
  { id: "yamaha", label: "Yamaha", href: "/recherche?brand=Yamaha" },
];
