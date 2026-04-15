export type ListingEquipmentGroup = {
  id: string;
  label: string;
  options: string[];
};

/** Automotive-only publish equipment taxonomy (stored in listing.features JSON). */
export const LISTING_EQUIPMENT_GROUPS: ListingEquipmentGroup[] = [
  {
    id: "comfort",
    label: "Confort / usage",
    options: [
      "Climatisation",
      "Vitres electriques",
      "Verrouillage centralise",
      "Direction assistee",
      "Demarrage sans cle",
      "Regulateur de vitesse",
      "Sieges cuir",
    ],
  },
  {
    id: "technology",
    label: "Technologie / multimedia",
    options: [
      "Bluetooth",
      "GPS integre",
      "Ecran tactile",
      "Apple CarPlay / Android Auto",
      "Camera de recul",
      "Radar de recul",
    ],
  },
  {
    id: "safety",
    label: "Securite",
    options: ["ABS", "Airbags", "ESP", "Antibrouillards", "Alarme"],
  },
  {
    id: "exterior",
    label: "Exterieur / equipements",
    options: ["Jantes alliage", "Toit ouvrant", "Phares LED", "Attelage", "Galerie de toit"],
  },
  {
    id: "utility",
    label: "4x4 / utilitaire",
    options: ["Double cabine", "Hard top", "Treuil", "Marchepieds"],
  },
];

export const LISTING_EQUIPMENT_OPTIONS: string[] = LISTING_EQUIPMENT_GROUPS.flatMap(
  (group) => group.options,
);

const LISTING_EQUIPMENT_SET = new Set(LISTING_EQUIPMENT_OPTIONS);

export function sanitizeListingEquipment(values: string[]): string[] {
  return values.filter((value) => LISTING_EQUIPMENT_SET.has(value));
}
