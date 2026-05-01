/**
 * Extraction LLM d'un post FB → tuple véhicule structuré.
 *
 * - Lazy-init du client Anthropic (pas d'erreur si ANTHROPIC_API_KEY absente
 *   à l'import — utile pour les tests qui mockent le SDK).
 * - Pricing par modèle pour estimer le coût USD avec une marge de prudence
 *   (Claude Haiku 4.5 : 1 $/MTok input, 5 $/MTok output au 2026-04).
 * - Aucune exception ne remonte : tout cas d'erreur produit un ExtractionResult
 *   avec `error` rempli — le batch peut continuer.
 */

import Anthropic from "@anthropic-ai/sdk";

import { SYSTEM_PROMPT_FR, TOOL_DEFINITION } from "./llm-prompts";

export type ExtractedVehicle = {
  is_vehicle_listing: boolean;
  is_buyer_post: boolean;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage_km: number | null;
  price_ar: number | null;
  currency_original: "Ar" | "Fmg" | "USD" | "EUR" | null;
  fuel_type: "petrol" | "diesel" | "hybrid" | "electric" | null;
  transmission: "manual" | "automatic" | "cvt" | null;
  body_style: "sedan" | "suv" | "pickup" | "wagon" | "hatchback" | "coupe" | "van" | "other" | null;
  condition: "new" | "good" | "fair" | "poor" | null;
  city: string | null;
  confidence: number;
};

export type ExtractionResult = {
  postId: string;
  extracted: ExtractedVehicle | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

/**
 * Tarifs (USD par million de tokens) — vérifiés auprès d'Anthropic
 * au 2026-04. À mettre à jour si Anthropic change la grille.
 */
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-3-5-haiku-latest": { input: 0.8, output: 4.0 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
};

const DEFAULT_PRICING = { input: 1.0, output: 5.0 };

export function getPricingFor(model: string): { input: number; output: number } {
  return PRICING_PER_MTOK[model] ?? DEFAULT_PRICING;
}

export function computeCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = getPricingFor(model);
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

let cachedClient: Anthropic | null = null;

/**
 * Surcharge utilisée par les tests : permet d'injecter un faux client SDK
 * sans devoir mocker le module entier via vi.mock.
 */
export function __setClientForTests(c: Anthropic | null): void {
  cachedClient = c;
}

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cachedClient;
}

function getModel(): string {
  return process.env.ANTHROPIC_MODEL_PRIMARY ?? "claude-haiku-4-5";
}

/**
 * Appelle Claude pour extraire les attributs d'un post FB.
 * Le résultat est toujours bien formé même en cas d'erreur — le caller
 * peut accumuler les coûts en lisant `costUsd` (0 quand erreur).
 */
export async function extractFromText(postId: string, text: string): Promise<ExtractionResult> {
  const model = getModel();
  try {
    const client = getClient();
    // Le SDK type Tool de manière stricte ; on cast en `any` parce que notre
    // schéma JSON est défini comme `as const` (compatible mais pas inférable).
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT_FR,
      tools: [TOOL_DEFINITION as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "extract_vehicle" },
      messages: [{ role: "user", content: text }],
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const costUsd = computeCostUsd(model, inputTokens, outputTokens);

    const toolUse = response.content.find((b) => b.type === "tool_use") as
      | { type: "tool_use"; input: ExtractedVehicle }
      | undefined;
    if (!toolUse) {
      return {
        postId,
        extracted: null,
        error: "no_tool_use_in_response",
        inputTokens,
        outputTokens,
        costUsd,
      };
    }

    return {
      postId,
      extracted: toolUse.input,
      error: null,
      inputTokens,
      outputTokens,
      costUsd,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return {
      postId,
      extracted: null,
      error: message,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    };
  }
}
