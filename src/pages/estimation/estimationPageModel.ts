import type { EstimationInput } from "@/types/estimation";

export function getCurrentEstimationStepIndex(
  screen: "landing" | "vehicle" | "condition" | "result",
): number {
  if (screen === "landing") return 0;
  if (screen === "vehicle") return 1;
  if (screen === "condition") return 2;
  return 3;
}

export function getVehicleStepErrors(params: {
  form: EstimationInput;
  currentYear: number;
  t: (key: string, defaultValue: string) => string;
}): string[] {
  const { form, currentYear, t } = params;
  const errors: string[] = [];

  if (!form.makeName.trim()) {
    errors.push(t("estimation.errorMakeRequired", "La marque est obligatoire."));
  }
  if (!form.modelName.trim()) {
    errors.push(t("estimation.errorModelRequired", "Le modèle est obligatoire."));
  }
  if (!Number.isFinite(form.year) || form.year < 1950 || form.year > currentYear) {
    errors.push(
      t(
        "estimation.errorYearRange",
        "L'année doit être comprise entre 1950 et l'année en cours.",
      ),
    );
  }
  if (!form.city.trim()) {
    errors.push(t("estimation.errorCityRequired", "La ville / région est obligatoire."));
  }
  if (!Number.isFinite(form.mileage) || form.mileage < 0 || form.mileage > 1_500_000) {
    errors.push(
      t(
        "estimation.errorMileageRange",
        "Le kilométrage doit être entre 0 et 1 500 000 km.",
      ),
    );
  }

  return errors;
}
