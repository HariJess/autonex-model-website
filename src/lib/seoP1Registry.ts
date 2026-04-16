import type { TransactionType } from "@/types/listing";

export type SeoP1TransactionLanding = {
  slug: "acheter" | "location-longue-duree" | "location-courte-duree";
  transaction: TransactionType;
  label: string;
  title: string;
  intro: string;
};

export type SeoP1CategoryLanding = {
  slug: "suv-4x4" | "berline" | "citadine" | "pick-up" | "utilitaire" | "moto";
  vehicleTypeId: string;
  label: string;
  title: string;
  intro: string;
};

export type SeoP1CityLanding = {
  slug: "antananarivo" | "toamasina" | "mahajanga";
  city: string;
  title: string;
  intro: string;
  inventoryFloor: number;
};

export type SeoP1CategoryCityLanding = {
  categorySlug: SeoP1CategoryLanding["slug"];
  citySlug: SeoP1CityLanding["slug"];
  title: string;
  intro: string;
  inventoryFloor: number;
};

export const SEO_P1_TRANSACTIONS: readonly SeoP1TransactionLanding[] = [
  {
    slug: "acheter",
    transaction: "vente",
    label: "Acheter",
    title: "Véhicules à vendre à Madagascar",
    intro: "Sélection des annonces de véhicules à vendre avec signaux de confiance AutoNex pour comparer plus vite et mieux décider.",
  },
  {
    slug: "location-longue-duree",
    transaction: "location",
    label: "Location longue durée",
    title: "Véhicules en location longue durée à Madagascar",
    intro: "Offres de location longue durée pour particuliers et professionnels, avec lecture claire des options disponibles.",
  },
  {
    slug: "location-courte-duree",
    transaction: "location_vacances",
    label: "Location courte durée",
    title: "Véhicules en location courte durée à Madagascar",
    intro: "Annonces de location courte durée pour déplacements ponctuels, tourisme et besoins saisonniers.",
  },
];

export const SEO_P1_CATEGORIES: readonly SeoP1CategoryLanding[] = [
  {
    slug: "suv-4x4",
    vehicleTypeId: "suv_4x4",
    label: "SUV / 4x4",
    title: "SUV et 4x4 à Madagascar",
    intro: "Pages dédiées aux SUV et 4x4 pour un usage mixte ville-route-piste et des besoins de mobilité polyvalente.",
  },
  {
    slug: "berline",
    vehicleTypeId: "berline",
    label: "Berline",
    title: "Berlines à Madagascar",
    intro: "Offres de berlines orientées confort et usage quotidien avec comparaison simplifiée des annonces disponibles.",
  },
  {
    slug: "citadine",
    vehicleTypeId: "citadine",
    label: "Citadine",
    title: "Citadines à Madagascar",
    intro: "Sélection de citadines pour mobilité urbaine et budget maîtrisé.",
  },
  {
    slug: "pick-up",
    vehicleTypeId: "pick_up",
    label: "Pick-up",
    title: "Pick-up à Madagascar",
    intro: "Pages d'annonces pick-up pour transport, activité professionnelle et usages terrain.",
  },
  {
    slug: "utilitaire",
    vehicleTypeId: "utilitaire_leger",
    label: "Utilitaire",
    title: "Utilitaires à Madagascar",
    intro: "Véhicules utilitaires pour besoins logistiques, livraison et exploitation professionnelle.",
  },
  {
    slug: "moto",
    vehicleTypeId: "moto",
    label: "Moto",
    title: "Motos à Madagascar",
    intro: "Sélection de motos pour usage quotidien, loisir ou activité professionnelle légère.",
  },
];

export const SEO_P1_CITIES: readonly SeoP1CityLanding[] = [
  {
    slug: "antananarivo",
    city: "Antananarivo",
    title: "Véhicules à Antananarivo",
    intro: "Annonces automobiles à Antananarivo avec focus sur disponibilité locale et comparaison rapide.",
    inventoryFloor: 8,
  },
  {
    slug: "toamasina",
    city: "Toamasina",
    title: "Véhicules à Toamasina",
    intro: "Offres de véhicules à Toamasina, structurées pour faciliter la recherche locale.",
    inventoryFloor: 6,
  },
  {
    slug: "mahajanga",
    city: "Mahajanga",
    title: "Véhicules à Mahajanga",
    intro: "Sélection locale de véhicules à Mahajanga pour achat et location selon disponibilité.",
    inventoryFloor: 4,
  },
];

export const SEO_P1_CATEGORY_CITY: readonly SeoP1CategoryCityLanding[] = [
  {
    categorySlug: "suv-4x4",
    citySlug: "antananarivo",
    title: "SUV / 4x4 à Antananarivo",
    intro: "Offres SUV / 4x4 à Antananarivo pour besoins urbains et déplacements hors route.",
    inventoryFloor: 5,
  },
  {
    categorySlug: "citadine",
    citySlug: "antananarivo",
    title: "Citadines à Antananarivo",
    intro: "Annonces de citadines à Antananarivo orientées mobilité urbaine.",
    inventoryFloor: 5,
  },
  {
    categorySlug: "pick-up",
    citySlug: "toamasina",
    title: "Pick-up à Toamasina",
    intro: "Pick-up disponibles à Toamasina pour usage mixte personnel et professionnel.",
    inventoryFloor: 3,
  },
  {
    categorySlug: "moto",
    citySlug: "mahajanga",
    title: "Motos à Mahajanga",
    intro: "Annonces de motos à Mahajanga pour déplacement quotidien et besoins locaux.",
    inventoryFloor: 3,
  },
];

export function getTransactionLandingBySlug(slug: string | undefined) {
  return SEO_P1_TRANSACTIONS.find((entry) => entry.slug === slug);
}

export function getCategoryLandingBySlug(slug: string | undefined) {
  return SEO_P1_CATEGORIES.find((entry) => entry.slug === slug);
}

export function getCityLandingBySlug(slug: string | undefined) {
  return SEO_P1_CITIES.find((entry) => entry.slug === slug);
}

export function getCategoryCityLanding(categorySlug: string | undefined, citySlug: string | undefined) {
  return SEO_P1_CATEGORY_CITY.find((entry) => entry.categorySlug === categorySlug && entry.citySlug === citySlug);
}

export function getOwnedSeoLandingPathForSearchParams(params: URLSearchParams): string | null {
  const allowed = new Set(["transaction", "vtype", "ville"]);
  for (const key of params.keys()) {
    if (!allowed.has(key)) return null;
  }

  const transaction = params.get("transaction")?.trim();
  const vtype = params.get("vtype")?.trim();
  const ville = params.get("ville")?.trim();
  if (!transaction && !vtype && !ville) return null;

  if (transaction && !vtype && !ville) {
    const tx = SEO_P1_TRANSACTIONS.find((entry) => entry.transaction === transaction);
    return tx ? `/${tx.slug}` : null;
  }

  if (!transaction && vtype && !ville) {
    const category = SEO_P1_CATEGORIES.find((entry) => entry.vehicleTypeId === vtype);
    return category ? `/vehicules/${category.slug}` : null;
  }

  if (!transaction && !vtype && ville) {
    const city = SEO_P1_CITIES.find((entry) => entry.city === ville);
    return city ? `/ville/${city.slug}` : null;
  }

  if (!transaction && vtype && ville) {
    const category = SEO_P1_CATEGORIES.find((entry) => entry.vehicleTypeId === vtype);
    const city = SEO_P1_CITIES.find((entry) => entry.city === ville);
    if (!category || !city) return null;
    const combo = getCategoryCityLanding(category.slug, city.slug);
    return combo ? `/vehicules/${category.slug}/ville/${city.slug}` : null;
  }

  return null;
}

