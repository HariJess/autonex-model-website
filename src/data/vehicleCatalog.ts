import type { VehicleCatalogEntry } from "@/lib/estimation/vehicleCatalog";

// Broad embedded fallback catalog to keep the estimation form operational
// even when DB catalog tables are unavailable.
export const LARGE_VEHICLE_CATALOG: VehicleCatalogEntry[] = [
  { make: "Toyota", models: ["Agya", "Auris", "Avanza", "Camry", "Corolla", "Fortuner", "Hiace", "Hilux", "Land Cruiser", "Prado", "RAV4", "Rush", "Yaris"] },
  { make: "Nissan", models: ["Almera", "Juke", "Micra", "Navara", "Patrol", "Qashqai", "Sentra", "Terrano", "X-Trail"] },
  { make: "Mazda", models: ["BT-50", "CX-3", "CX-30", "CX-5", "CX-9", "Mazda 2", "Mazda 3", "Mazda 6"] },
  { make: "Suzuki", models: ["Alto", "Baleno", "Celerio", "Ertiga", "Jimny", "S-Cross", "Swift", "Vitara"] },
  { make: "Hyundai", models: ["Accent", "Creta", "Elantra", "i10", "i20", "Kona", "Santa Fe", "Sonata", "Tucson"] },
  { make: "Kia", models: ["Cerato", "Picanto", "Rio", "Seltos", "Sorento", "Sportage"] },
  { make: "Mitsubishi", models: ["ASX", "L200", "Outlander", "Pajero"] },
  { make: "Ford", models: ["EcoSport", "Everest", "Explorer", "Focus", "Ranger"] },
  { make: "Volkswagen", models: ["Amarok", "Golf", "Jetta", "Polo", "Tiguan", "Touareg"] },
  { make: "Mercedes-Benz", models: ["A-Class", "C-Class", "E-Class", "GLA", "GLC", "GLE", "Sprinter"] },
  { make: "BMW", models: ["Serie 1", "Serie 3", "Serie 5", "X1", "X3", "X5"] },
  { make: "Peugeot", models: ["208", "2008", "3008", "301", "308", "5008", "Partner"] },
  { make: "Renault", models: ["Captur", "Clio", "Duster", "Kadjar", "Kwid", "Logan", "Sandero"] },
  { make: "Isuzu", models: ["D-Max", "MU-X"] },
  { make: "Chevrolet", models: ["Captiva", "Colorado", "Spark", "Trailblazer"] },
  { make: "Land Rover", models: ["Defender", "Discovery", "Range Rover", "Range Rover Evoque", "Range Rover Sport"] },
  { make: "Honda", models: ["Accord", "CR-V", "Civic", "City", "Fit", "HR-V", "Jazz"] },
  { make: "Subaru", models: ["Forester", "Impreza", "Outback", "XV"] },
  { make: "Lexus", models: ["ES", "GX", "IS", "LX", "NX", "RX", "UX"] },
  { make: "Infiniti", models: ["Q50", "Q60", "QX50", "QX60", "QX80"] },
  { make: "Audi", models: ["A3", "A4", "A6", "Q3", "Q5", "Q7"] },
  { make: "Jeep", models: ["Cherokee", "Compass", "Grand Cherokee", "Renegade", "Wrangler"] },
  { make: "BYD", models: ["Atto 3", "Dolphin", "Han", "Tang"] },
  { make: "Foton", models: ["Tunland", "View"] },
];
