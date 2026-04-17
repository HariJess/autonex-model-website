export type VehicleUiCatalogEntry = {
  make: string;
  models: string[];
};

/**
 * Authoritative visible catalog for Estimation UI make/model selectors.
 *
 * This is the single runtime source of truth for visible user selection.
 * It must stay curated (passenger-vehicle focused) and UX-safe.
 *
 * Notes:
 * - Do not replace this directly with raw imported manufacturer feeds.
 * - DB catalog tables/scripts remain supporting infrastructure for maintenance/enrichment.
 */
const normalizeName = (value: string): string => value.trim().replace(/\s+/g, " ");

/**
 * Sprint 1 hardening:
 * - material expansion of high-frequency models for existing brands
 * - normalization/cleanup to avoid duplicates and naming drift
 * - map shape kept simple and future-safe for model metadata extension
 */
const VEHICLE_UI_CATALOG_BY_MAKE: Record<string, string[]> = {
  Acura: ["ILX", "Integra", "MDX", "NSX", "RDX", "RLX", "TLX", "ZDX"],
  "Alfa Romeo": ["4C", "Giulia", "Giulietta", "Stelvio", "Tonale"],
  Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "RS3", "RS6", "TT"],
  BMW: ["116i", "118i", "120i", "218i", "320i", "330i", "520i", "530i", "M3", "M5", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4"],
  BYD: ["Atto 3", "Dolphin", "Han", "Seagull", "Seal", "Song Plus", "Tang", "Yuan Plus"],
  Chery: ["Arrizo 5", "Arrizo 8", "Omoda 5", "Tiggo 2", "Tiggo 4", "Tiggo 7", "Tiggo 8"],
  Chevrolet: ["Aveo", "Captiva", "Colorado", "Cruze", "Equinox", "Malibu", "Spark", "Tahoe", "Trailblazer"],
  Citroen: ["Berlingo", "C-Elysee", "C1", "C3", "C3 Aircross", "C4", "C4 Cactus", "C5 Aircross"],
  Dacia: ["Duster", "Jogger", "Logan", "Sandero", "Spring"],
  Fiat: ["500", "500X", "Doblo", "Panda", "Punto", "Tipo"],
  Ford: [
    "Bronco",
    "EcoSport",
    "Edge",
    "Escape",
    "Everest",
    "Expedition",
    "Explorer",
    "F-150",
    "Fiesta",
    "Focus",
    "Kuga",
    "Mustang",
    "Mustang Mach-E",
    "Puma",
    "Ranger",
    "Tourneo",
  ],
  Geely: ["Azkarra", "Coolray", "Emgrand", "GX3 Pro", "Monjaro", "Okavango"],
  "Great Wall": ["Cannon", "H6", "Poer", "Steed", "Wingle"],
  Haval: ["H1", "H2", "H6", "H9", "Jolion"],
  Honda: ["Accord", "BR-V", "CR-V", "City", "Civic", "Fit", "HR-V", "Jazz", "Pilot", "WR-V"],
  Hyundai: [
    "Accent",
    "Alcazar",
    "Creta",
    "Elantra",
    "Grand i10",
    "H1",
    "Kona",
    "Porter",
    "Palisade",
    "Santa Fe",
    "Sonata",
    "Stargazer",
    "Staria",
    "Tucson",
    "Venue",
    "i10",
    "i20",
    "i30",
  ],
  Infiniti: ["Q30", "Q50", "Q60", "QX50", "QX60", "QX80"],
  Isuzu: ["D-Max", "F-Series", "MU-7", "MU-X", "N-Series"],
  Jaguar: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF"],
  Jeep: ["Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Renegade", "Wrangler"],
  Kia: ["Carnival", "Cerato", "Picanto", "Rio", "Seltos", "Sonet", "Sorento", "Sportage"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  Lexus: ["ES", "GX", "IS", "LX", "NX", "RX", "UX"],
  MG: ["HS", "MG3", "MG4", "MG5", "MG6", "Marvel R", "ZS"],
  Mahindra: ["Bolero", "KUV100", "Scorpio", "Thar", "XUV300", "XUV500", "XUV700"],
  Mazda: [
    "BT-50",
    "CX-3",
    "CX-30",
    "CX-5",
    "CX-50",
    "CX-60",
    "CX-70",
    "CX-80",
    "CX-9",
    "CX-90",
    "Mazda 2",
    "Mazda 3",
    "Mazda 6",
    "Premacy",
    "MX-5",
    "RX-7",
  ],
  "Mercedes-Benz": ["A-Class", "C-Class", "CLA", "E-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "S-Class"],
  Mini: ["Clubman", "Cooper", "Countryman", "Paceman"],
  Mitsubishi: ["ASX", "L200", "Mirage", "Outlander", "Pajero", "Pajero Sport", "Triton"],
  Nissan: [
    "Almera",
    "Armada",
    "Juke",
    "Kicks",
    "Micra",
    "Murano",
    "Navara",
    "Note",
    "Pathfinder",
    "Patrol",
    "Qashqai",
    "Sunny",
    "Terra",
    "Tiida",
    "Urvan",
    "X-Trail",
  ],
  Opel: ["Astra", "Corsa", "Crossland", "Grandland", "Insignia", "Mokka"],
  Peugeot: ["2008", "206", "207", "208", "3008", "301", "307", "308", "408", "5008", "Expert", "Partner"],
  Porsche: ["718", "911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Renault: ["Captur", "Clio", "Duster", "Kadjar", "Koleos", "Logan", "Megane", "Sandero"],
  SEAT: ["Arona", "Ateca", "Ibiza", "Leon", "Tarraco"],
  Skoda: ["Fabia", "Kamiq", "Karoq", "Kodiaq", "Octavia", "Superb"],
  Subaru: ["Crosstrek", "Forester", "Impreza", "Legacy", "Outback", "WRX", "XV"],
  Suzuki: [
    "Alto",
    "Baleno",
    "Carry",
    "Celerio",
    "Dzire",
    "Ertiga",
    "Fronx",
    "Grand Vitara",
    "Ignis",
    "Jimny",
    "S-Cross",
    "Swift",
    "Vitara",
    "XL7",
  ],
  Tata: ["Altroz", "Harrier", "Nexon", "Punch", "Safari", "Tiago", "Tigor"],
  Toyota: [
    "4Runner",
    "Agya",
    "Aqua",
    "Avanza",
    "Camry",
    "C-HR",
    "Corolla",
    "Corolla Cross",
    "Fortuner",
    "Hiace",
    "Hilux",
    "Land Cruiser",
    "Land Cruiser 70",
    "Land Cruiser 200",
    "Land Cruiser 300",
    "Prado",
    "Prius",
    "RAV4",
    "Rush",
    "Veloz",
    "Vios",
    "Yaris",
  ],
  Volkswagen: ["Amarok", "Golf", "Jetta", "Passat", "Polo", "T-Cross", "Taigo", "Tiguan", "Touareg", "Transporter", "Virtus"],
  Volvo: ["C40", "S60", "S90", "V60", "XC40", "XC60", "XC90"],
};

export const VEHICLE_UI_CATALOG: VehicleUiCatalogEntry[] = Object.entries(VEHICLE_UI_CATALOG_BY_MAKE)
  .map(([make, models]) => ({
    make: normalizeName(make),
    models: Array.from(new Set(models.map((model) => normalizeName(model)).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    ),
  }))
  .sort((a, b) => a.make.localeCompare(b.make));
