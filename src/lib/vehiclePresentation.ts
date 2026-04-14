export function formatVehicleMileage(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value.toLocaleString("fr-FR")} km`;
}

export function formatVehicleVersion(value: number | null | undefined): string | null {
  if (value == null || value < 0) return null;
  if (value === 0) return "Base";
  return `Version ${value}`;
}

export function formatVehicleDoors(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value}${value >= 4 ? "+" : ""} portes`;
}
