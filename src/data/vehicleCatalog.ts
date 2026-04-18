import type { VehicleCatalogEntry } from "@/lib/estimation/vehicleCatalog";

/**
 * @deprecated Legacy broad catalog snapshot.
 *
 * This file is intentionally not used by the current Estimation runtime path.
 * Visible estimation catalog source of truth is:
 * - src/data/vehicleUiCatalog.ts
 *
 * Keep this only as historical/supporting reference while DB tooling evolves.
 */

function legacyEntry(make: string, models: string[]): VehicleCatalogEntry {
  return { make, models, modelBodyTypes: {} };
}

export const LARGE_VEHICLE_CATALOG: VehicleCatalogEntry[] = [
  legacyEntry("Toyota", ["Agya", "Auris", "Avanza", "Camry", "Corolla", "Fortuner", "Hiace", "Hilux", "Land Cruiser", "Prado", "RAV4", "Rush", "Yaris"]),
  legacyEntry("Nissan", ["Almera", "Juke", "Micra", "Navara", "Patrol", "Qashqai", "Sentra", "Terrano", "X-Trail"]),
  legacyEntry("Mazda", ["BT-50", "CX-3", "CX-30", "CX-5", "CX-9", "Mazda 2", "Mazda 3", "Mazda 6"]),
  legacyEntry("Suzuki", ["Alto", "Baleno", "Celerio", "Ertiga", "Jimny", "S-Cross", "Swift", "Vitara"]),
  legacyEntry("Hyundai", ["Accent", "Creta", "Elantra", "i10", "i20", "Kona", "Santa Fe", "Sonata", "Tucson"]),
  legacyEntry("Kia", ["Cerato", "Picanto", "Rio", "Seltos", "Sorento", "Sportage"]),
  legacyEntry("Mitsubishi", ["ASX", "L200", "Outlander", "Pajero"]),
  legacyEntry("Ford", ["EcoSport", "Everest", "Explorer", "Focus", "Ranger"]),
  legacyEntry("Volkswagen", ["Amarok", "Golf", "Jetta", "Polo", "Tiguan", "Touareg"]),
  legacyEntry("Mercedes-Benz", ["A-Class", "C-Class", "E-Class", "GLA", "GLC", "GLE", "Sprinter"]),
  legacyEntry("BMW", ["Serie 1", "Serie 3", "Serie 5", "X1", "X3", "X5"]),
  legacyEntry("Peugeot", ["208", "2008", "3008", "301", "308", "5008", "Partner"]),
  legacyEntry("Renault", ["Captur", "Clio", "Duster", "Kadjar", "Kwid", "Logan", "Sandero"]),
  legacyEntry("Isuzu", ["D-Max", "MU-X"]),
  legacyEntry("Chevrolet", ["Captiva", "Colorado", "Spark", "Trailblazer"]),
  legacyEntry("Land Rover", ["Defender", "Discovery", "Range Rover", "Range Rover Evoque", "Range Rover Sport"]),
  legacyEntry("Honda", ["Accord", "CR-V", "Civic", "City", "Fit", "HR-V", "Jazz"]),
  legacyEntry("Subaru", ["Forester", "Impreza", "Outback", "XV"]),
  legacyEntry("Lexus", ["ES", "GX", "IS", "LX", "NX", "RX", "UX"]),
  legacyEntry("Infiniti", ["Q50", "Q60", "QX50", "QX60", "QX80"]),
  legacyEntry("Audi", ["A3", "A4", "A6", "Q3", "Q5", "Q7"]),
  legacyEntry("Jeep", ["Cherokee", "Compass", "Grand Cherokee", "Renegade", "Wrangler"]),
  legacyEntry("BYD", ["Atto 3", "Dolphin", "Han", "Tang"]),
  legacyEntry("Foton", ["Tunland", "View"]),
];
