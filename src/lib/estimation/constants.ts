import type {
  BodyType,
  ConditionLabel,
  FuelType,
  MaintenanceLevel,
  OwnerCountLabel,
  TransmissionType,
  UsageType,
} from "@/types/estimation";

export const ESTIMATION_FUEL_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "petrol", label: "Essence" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybride" },
  { value: "electric", label: "Electrique" },
  { value: "other", label: "Autre" },
];

export const ESTIMATION_TRANSMISSION_OPTIONS: Array<{ value: TransmissionType; label: string }> = [
  { value: "manual", label: "Boite manuelle" },
  { value: "automatic", label: "Boite automatique" },
  { value: "cvt", label: "CVT" },
  { value: "other", label: "Autre" },
];

export const ESTIMATION_BODY_OPTIONS: Array<{ value: BodyType; label: string }> = [
  { value: "sedan", label: "Berline" },
  { value: "suv", label: "SUV / 4x4" },
  { value: "hatchback", label: "Citadine" },
  { value: "pickup", label: "Pick-up" },
  { value: "van", label: "Van / Fourgon" },
  { value: "wagon", label: "Break" },
  { value: "coupe", label: "Coupe" },
  { value: "other", label: "Autre" },
];

export const ESTIMATION_CONDITION_OPTIONS: Array<{ value: ConditionLabel; label: string }> = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Bon" },
  { value: "fair", label: "Correct" },
  { value: "needs_work", label: "A prevoir" },
];

export const ESTIMATION_MAINTENANCE_OPTIONS: Array<{ value: MaintenanceLevel; label: string }> = [
  { value: "full", label: "Oui, suivi complet" },
  { value: "partial", label: "Partiel" },
  { value: "unknown", label: "Non / inconnu" },
];

export const ESTIMATION_OWNER_COUNT_OPTIONS: Array<{ value: OwnerCountLabel; label: string }> = [
  { value: "1", label: "1 proprietaire" },
  { value: "2", label: "2 proprietaires" },
  { value: "3_plus", label: "3+" },
];

export const ESTIMATION_USAGE_OPTIONS: Array<{ value: UsageType; label: string }> = [
  { value: "personal", label: "Personnel" },
  { value: "professional", label: "Professionnel" },
  { value: "rental", label: "Location" },
  { value: "fleet", label: "Flotte" },
];

export function formatAriary(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString("fr-FR")} Ar`;
}
