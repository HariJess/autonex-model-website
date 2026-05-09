// Supabase Edge Function — compute-estimation / validation.ts
// -----------------------------------------------------------------------------
// Schéma zod pour valider/parser le body POST côté Edge Function.
// Reflète exactement le type `EstimationInputV2` côté front pour éviter toute
// divergence silencieuse de contrat.
//
// L'erreur lancée commence par le préfixe `validation:` pour que `index.ts`
// puisse répondre 400 (vs 500 sur erreur interne).
// -----------------------------------------------------------------------------

// @ts-ignore — esm.sh URL import résolu par Deno, ignoré par Node/Vitest.
import { z } from "https://esm.sh/zod@3.23.8";
import type { EstimationInput } from "./types.ts";

// Énums alignés sur `src/types/estimation.ts`. Toute évolution doit être
// répliquée des deux côtés (le test de parité catchera la divergence si l'un
// des moteurs reçoit une valeur que l'autre rejette).
const fuelType = z.enum(["petrol", "diesel", "hybrid", "electric", "other"]);
const transmissionType = z.enum(["manual", "automatic", "cvt", "other"]);
const bodyType = z.enum([
  "sedan",
  "suv",
  "hatchback",
  "pickup",
  "van",
  "wagon",
  "coupe",
  "convertible",
  "other",
]);
const conditionLabel = z.enum(["excellent", "good", "fair", "needs_work"]);
const maintenanceLevel = z.enum(["full", "partial", "unknown"]);
const ownerCountLabel = z.enum(["1", "2", "3_plus"]);
const usageType = z.enum(["personal", "professional", "rental", "fleet"]);

const estimationInputSchema = z.object({
  makeId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  makeName: z.string().trim().min(1).max(120),
  modelName: z.string().trim().min(1).max(120),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
  city: z.string().trim().min(0).max(120),
  mileage: z.number().int().min(0).max(1_500_000),
  fuelType,
  transmissionType,
  bodyType,
  conditionLabel,
  accidentDeclared: z.boolean(),
  maintenanceLevel,
  ownerCountLabel,
  usageType,
});

export function parseEstimationInput(payload: unknown): EstimationInput {
  const parsed = estimationInputSchema.safeParse(payload);
  if (!parsed.success) {
    const summary = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`validation: ${summary}`);
  }
  return parsed.data as EstimationInput;
}
