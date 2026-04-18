import type { TFunction } from "i18next";

export const EXTERIOR_COLOR_OPTIONS = [
  { value: "black", labelKey: "vehicleColor.black", fallback: "Noir" },
  { value: "white", labelKey: "vehicleColor.white", fallback: "Blanc" },
  { value: "gray", labelKey: "vehicleColor.gray", fallback: "Gris" },
  { value: "silver", labelKey: "vehicleColor.silver", fallback: "Argent" },
  { value: "blue", labelKey: "vehicleColor.blue", fallback: "Bleu" },
  { value: "red", labelKey: "vehicleColor.red", fallback: "Rouge" },
  { value: "green", labelKey: "vehicleColor.green", fallback: "Vert" },
  { value: "beige", labelKey: "vehicleColor.beige", fallback: "Beige" },
  { value: "brown", labelKey: "vehicleColor.brown", fallback: "Marron" },
  { value: "orange", labelKey: "vehicleColor.orange", fallback: "Orange" },
  { value: "yellow", labelKey: "vehicleColor.yellow", fallback: "Jaune" },
] as const;

export function normalizeEngineDisplacementInput(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  if (numeric <= 0 || numeric > 20) return null;
  return Math.round(numeric * 100) / 100;
}

export function formatEngineDisplacementLiters(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const normalized = Math.round(value * 10) / 10;
  return `${normalized.toFixed(1)} L`;
}

export function getExteriorColorLabel(value: string | null | undefined, t: TFunction): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  for (const option of EXTERIOR_COLOR_OPTIONS) {
    if (option.value === normalized) {
      return t(option.labelKey, option.fallback);
    }
  }
  return value.trim();
}
