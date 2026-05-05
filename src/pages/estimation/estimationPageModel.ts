import type { EstimationInput } from "@/types/estimation";

export function getCurrentEstimationStepIndex(
  screen: "landing" | "vehicle" | "condition" | "result",
): number {
  if (screen === "landing") return 0;
  if (screen === "vehicle") return 1;
  if (screen === "condition") return 2;
  return 3;
}

export type VehicleFieldErrorKey = "make" | "model" | "year" | "city" | "mileage";
export type VehicleFieldErrors = Partial<Record<VehicleFieldErrorKey, string>>;

export type EstimationFormStateForValidation =
  Omit<EstimationInput, "mileage" | "year"> & {
    mileage: number | null;
    year: number | null;
  };

export function getVehicleFieldErrors(params: {
  form: EstimationFormStateForValidation;
  currentYear: number;
  t: (key: string, defaultValue: string) => string;
}): VehicleFieldErrors {
  const { form, currentYear, t } = params;
  const errors: VehicleFieldErrors = {};

  if (!form.makeName.trim()) {
    errors.make = t("estimation.fieldRequired", "Champ obligatoire");
  }
  if (!form.modelName.trim()) {
    errors.model = t("estimation.fieldRequired", "Champ obligatoire");
  }
  if (form.year === null) {
    errors.year = t("estimation.errorYearRequired", "Veuillez saisir l'année");
  } else if (!Number.isFinite(form.year) || form.year < 1950 || form.year > currentYear) {
    errors.year = t(
      "estimation.errorYearRangeShort",
      "Année invalide (1950 — {{year}}).",
    ).replace("{{year}}", String(currentYear));
  }
  if (!form.city.trim()) {
    errors.city = t("estimation.fieldRequired", "Champ obligatoire");
  }
  if (form.mileage === null) {
    errors.mileage = t("estimation.errorMileageRequired", "Veuillez saisir le kilométrage");
  } else if (!Number.isFinite(form.mileage) || form.mileage < 0 || form.mileage > 1_500_000) {
    errors.mileage = t(
      "estimation.errorMileageRangeShort",
      "Kilométrage invalide (0 — 1 500 000 km).",
    );
  }

  return errors;
}

/**
 * Conserve l'API string[] pour les rares appelants qui ne s'intéressent qu'à
 * `length === 0` (canSubmit). Réutilise `getVehicleFieldErrors` pour éviter
 * la duplication de règles métier.
 */
export function getVehicleStepErrors(params: {
  form: EstimationFormStateForValidation;
  currentYear: number;
  t: (key: string, defaultValue: string) => string;
}): string[] {
  return Object.values(getVehicleFieldErrors(params));
}
