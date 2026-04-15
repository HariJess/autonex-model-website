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
const CUSTOM_FEATURE_PREFIX = "__custom:";

export function sanitizeListingEquipment(values: string[]): string[] {
  return values.filter((value) => LISTING_EQUIPMENT_SET.has(value));
}

function sanitizeCustomFeatureLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function parseCustomFeaturesInput(value: string): string[] {
  const seen = new Set<string>();
  const parsed: string[] = [];
  for (const token of value.split(",")) {
    const label = sanitizeCustomFeatureLabel(token);
    if (!label) continue;
    const normalized = label.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    parsed.push(label);
  }
  return parsed;
}

export function encodeCustomFeature(value: string): string {
  const label = sanitizeCustomFeatureLabel(value);
  return `${CUSTOM_FEATURE_PREFIX}${label}`;
}

export function decodeCustomFeature(value: string): string | null {
  if (!value.startsWith(CUSTOM_FEATURE_PREFIX)) return null;
  const decoded = sanitizeCustomFeatureLabel(value.slice(CUSTOM_FEATURE_PREFIX.length));
  return decoded.length > 0 ? decoded : null;
}

export function extractCustomFeatures(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const decoded = decodeCustomFeature(raw);
    if (!decoded) continue;
    const normalized = decoded.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(decoded);
  }
  return out;
}
