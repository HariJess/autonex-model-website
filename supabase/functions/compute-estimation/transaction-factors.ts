// Supabase Edge Function — compute-estimation / transaction-factors.ts
// -----------------------------------------------------------------------------
// PROMPT 10A — Port 1:1 de `src/lib/estimation/transactionFactors.ts`.
//
// La logique (FALLBACK, parser, resolveFactorKey) est strictement identique
// pour préserver la parité legacy↔Edge. Toute évolution doit être faite ICI ET
// dans le module legacy en parallèle.
//
// Pas d'import Deno-only → ce module est consommable par Vitest côté Node.
// -----------------------------------------------------------------------------

export type TransactionFactorKey =
  | "facebook_particulier"
  | "facebook_revendeur"
  | "autonex_active"
  | "concessionnaire_officiel"
  | "partner"
  | "manual"
  | "transaction_confirmed"
  | "unknown";

export type PriceFormatKey = "trade_in_pro" | "private_market" | "dealer_retail";

export type TransactionFactorsConfig = {
  version: string;
  factors: Record<TransactionFactorKey, number>;
  price_format_multipliers: Record<PriceFormatKey, number>;
  last_updated: string;
};

export type ComparableSourceOrigin = "market_clean" | "autonex_active" | "unknown";

export const FALLBACK_TRANSACTION_FACTORS: TransactionFactorsConfig = {
  version: "fallback_v1",
  factors: {
    facebook_particulier: 0.93,
    facebook_revendeur: 0.87,
    autonex_active: 0.96,
    concessionnaire_officiel: 0.97,
    partner: 0.97,
    manual: 0.95,
    transaction_confirmed: 1.0,
    unknown: 0.9,
  },
  price_format_multipliers: {
    trade_in_pro: 0.78,
    private_market: 1.0,
    dealer_retail: 1.15,
  },
  last_updated: "fallback",
};

export type AppConfigSupabaseClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{
          data: { value: unknown } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

function parseConfigValue(raw: unknown): TransactionFactorsConfig | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const factorsRaw = obj.factors;
  const formatRaw = obj.price_format_multipliers;
  if (!factorsRaw || typeof factorsRaw !== "object") return null;
  if (!formatRaw || typeof formatRaw !== "object") return null;

  const factors = factorsRaw as Record<string, unknown>;
  const requiredFactors: TransactionFactorKey[] = [
    "facebook_particulier",
    "facebook_revendeur",
    "autonex_active",
    "concessionnaire_officiel",
    "partner",
    "manual",
    "transaction_confirmed",
    "unknown",
  ];
  for (const key of requiredFactors) {
    if (typeof factors[key] !== "number") return null;
  }
  const fmt = formatRaw as Record<string, unknown>;
  const requiredFormats: PriceFormatKey[] = ["trade_in_pro", "private_market", "dealer_retail"];
  for (const key of requiredFormats) {
    if (typeof fmt[key] !== "number") return null;
  }

  return {
    version: typeof obj.version === "string" ? obj.version : "unknown",
    factors: {
      facebook_particulier: factors.facebook_particulier as number,
      facebook_revendeur: factors.facebook_revendeur as number,
      autonex_active: factors.autonex_active as number,
      concessionnaire_officiel: factors.concessionnaire_officiel as number,
      partner: factors.partner as number,
      manual: factors.manual as number,
      transaction_confirmed: factors.transaction_confirmed as number,
      unknown: factors.unknown as number,
    },
    price_format_multipliers: {
      trade_in_pro: fmt.trade_in_pro as number,
      private_market: fmt.private_market as number,
      dealer_retail: fmt.dealer_retail as number,
    },
    last_updated: typeof obj.last_updated === "string" ? obj.last_updated : "unknown",
  };
}

export async function fetchTransactionFactors(
  client: AppConfigSupabaseClient,
): Promise<TransactionFactorsConfig> {
  try {
    const { data, error } = await client
      .from("app_config")
      .select("value")
      .eq("key", "estimation_transaction_factors_v2")
      .maybeSingle();
    if (error || !data) return FALLBACK_TRANSACTION_FACTORS;
    const parsed = parseConfigValue((data as { value: unknown }).value);
    return parsed ?? FALLBACK_TRANSACTION_FACTORS;
  } catch (_err) {
    return FALLBACK_TRANSACTION_FACTORS;
  }
}

export function resolveFactorKey(
  sellerType: string | null | undefined,
  sourceOrigin: ComparableSourceOrigin,
): TransactionFactorKey {
  if (sourceOrigin === "autonex_active") return "autonex_active";

  if (!sellerType) return "unknown";
  const v = sellerType.toLowerCase().trim();

  if (v.includes("particulier") && v.includes("facebook")) return "facebook_particulier";
  if (v.includes("revendeur") && v.includes("facebook")) return "facebook_revendeur";
  if (v.includes("concessionnaire")) return "concessionnaire_officiel";
  if (v === "partner") return "partner";
  if (v === "manual") return "manual";
  if (v.includes("transaction") && v.includes("confirmed")) return "transaction_confirmed";

  return "unknown";
}
