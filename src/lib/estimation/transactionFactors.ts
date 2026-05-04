/**
 * PROMPT 10A — Engine V2 transaction factors helper.
 *
 * Lit la config `estimation_transaction_factors_v2` depuis `app_config` (best
 * effort, fallback en cas d'absence/malformation). Expose le mapping
 * `seller_type observé → factor key canonique` + types stricts.
 *
 * Le moteur d'estimation applique ces facteurs PAR comparable AVANT le calcul
 * de la médiane pondérée (compensation du gap asking-price → transaction-price).
 * Les `price_format_multipliers` génèrent les 3 valeurs Argus-grade
 * (reprise pro / entre particuliers / en concession) depuis la valeur centrale.
 *
 * Pas de dépendance à `@supabase/supabase-js` au niveau type — on utilise une
 * interface duck-typed compatible legacy (engine.ts) ET Edge Function (Deno).
 */

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

/**
 * Origine du comparable dans le pipeline UNION engine V2.
 * - `market_clean` : ligne issue de `market_listings_clean` (scrap FB / partner / manual)
 * - `autonex_active` : ligne issue de `public.listings` avec status='active'
 * - `unknown` : fallback safe quand la source est ambiguë (ne devrait jamais arriver)
 */
export type ComparableSourceOrigin = "market_clean" | "autonex_active" | "unknown";

/**
 * Fallback hardcoded synchronisé avec la migration
 * `20260511120000_app_config_transaction_factors.sql`.
 *
 * Utilisé si :
 *   - La table `app_config` n'a pas la row `estimation_transaction_factors_v2`
 *   - Le payload JSON est mal formé (clé manquante, type invalide)
 *   - La query Supabase échoue (network, RLS, etc.)
 *
 * Tout dérive de la migration → modifier le SQL en parallèle.
 */
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

/**
 * Interface duck-typed minimale couvrant le call `from('app_config')...maybeSingle()`.
 * Compatible avec le client supabase-js v2 réel ET avec un mock de test.
 */
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

/**
 * Validation runtime que la valeur lue depuis app_config a bien la forme
 * attendue. Renvoie le config typé OU null si malformé.
 */
function parseConfigValue(raw: unknown): TransactionFactorsConfig | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const factorsRaw = obj.factors;
  const formatRaw = obj.price_format_multipliers;
  if (!factorsRaw || typeof factorsRaw !== "object") return null;
  if (!formatRaw || typeof formatRaw !== "object") return null;

  // Toutes les clés requises présentes ET numériques
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

/**
 * Lit la config depuis `app_config.estimation_transaction_factors_v2`.
 * Best-effort : tout échec retourne le FALLBACK hardcoded.
 *
 * Cache : volontairement absent en V1. La feature est tunée en heures/jours,
 * pas en secondes. Une fois le rollout v2 stabilisé, on pourra cacher 60s.
 */
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

/**
 * Mapping centralisé : seller_type observé (texte libre CSV / DB) → factor key
 * canonique. Robuste aux variantes de casing et punctuation.
 *
 * Stratégie :
 *   1. Si `sourceOrigin === 'autonex_active'` → factor `autonex_active`
 *      (override car l'annonce est sur AutoNex active, pas sur FB scrap).
 *   2. Sinon, parse `sellerType` :
 *      - Contient "particulier" + "facebook" → `facebook_particulier`
 *      - Contient "revendeur" + "facebook" → `facebook_revendeur`
 *      - Contient "concessionnaire" → `concessionnaire_officiel`
 *      - Égal à "partner" → `partner`
 *      - Égal à "manual" → `manual`
 *      - Contient "transaction" + "confirmed" → `transaction_confirmed`
 *      - Sinon → `unknown` (factor 0.90, conservateur)
 */
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
