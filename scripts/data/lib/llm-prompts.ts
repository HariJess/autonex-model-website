/**
 * Prompts et schéma tool_use pour l'extraction LLM des annonces FB.
 * Le prompt système est volontairement en français, le LLM répond via tool_use
 * (output JSON garanti — pas de parsing texte fragile).
 *
 * Sprint 2 — pipeline d'extraction LLM (Claude Haiku) pour les corpus FB MG.
 */

export const SYSTEM_PROMPT_FR = `Tu es un expert du marché automobile malgache. Tu analyses des annonces Facebook publiées par des particuliers ou semi-pros à Madagascar (en français + malgache + abréviations).

Ta mission : extraire les attributs structurés du véhicule décrit dans l'annonce.

CONTEXTE LOCAL :
- Devises : "Ar" = Ariary malgache, "Fmg" = Franc malgache (1 Ar = 5 Fmg). Si "Fmg" mentionné, convertir en Ariary (diviser par 5).
- Abréviations : TBE = très bon état, TBN = très bon neuf, BVA = boîte automatique, BVM = boîte manuelle, 4x4 = 4 roues motrices, kkm ou km = kilomètres.
- Mots-clés à filtrer : "Mitady" / "Recherche" = annonce d'achat (pas de vente, ne pas extraire) ; "vendu" / "lasa" = annonce déjà vendue.

RÈGLES :
- Retourne TOUJOURS un appel à l'outil "extract_vehicle".
- Si l'annonce ne correspond à aucun véhicule (publicité, demande, post non-lié), set is_vehicle_listing à false.
- Si le post est une recherche d'achat ("Mitady", "Je cherche"), set is_buyer_post à true.
- Pour les prix : convertis tout en Ar (Ariary). Ne retourne JAMAIS de prix en Fmg ni en USD.
- Si une info n'est pas disponible avec certitude, retourne null. Ne devine PAS.`;

/**
 * Schéma JSON Schema (draft-07) du tool extract_vehicle. Compatible avec
 * l'API Anthropic Tool Use. Les unions ["string","null"] permettent au LLM
 * de retourner explicitement null quand une info n'est pas disponible.
 */
export const TOOL_DEFINITION = {
  name: "extract_vehicle",
  description: "Extrait les attributs structurés d'une annonce de véhicule.",
  input_schema: {
    type: "object",
    properties: {
      is_vehicle_listing: {
        type: "boolean",
        description: "true si le post décrit bien un véhicule à vendre. false sinon (pub, demande, hors-sujet).",
      },
      is_buyer_post: {
        type: "boolean",
        description: "true si le post est une recherche d'achat (Mitady), pas une vente.",
      },
      brand: {
        type: ["string", "null"],
        description: "Marque du véhicule (ex: Toyota, Hyundai). null si non identifiable.",
      },
      model: {
        type: ["string", "null"],
        description: "Modèle (ex: Hilux, Picanto). null si non identifiable.",
      },
      year: {
        type: ["integer", "null"],
        description: "Année du véhicule (1990-2026). null si absent.",
      },
      mileage_km: {
        type: ["integer", "null"],
        description: "Kilométrage en km. null si absent.",
      },
      price_ar: {
        type: ["integer", "null"],
        description: "Prix demandé EN ARIARY (Ar). Convertir si Fmg. null si absent ou WhatsApp-only.",
      },
      currency_original: {
        type: ["string", "null"],
        enum: ["Ar", "Fmg", "USD", "EUR", null],
        description: "Devise affichée dans l'annonce avant conversion.",
      },
      fuel_type: {
        type: ["string", "null"],
        enum: ["petrol", "diesel", "hybrid", "electric", null],
        description: "Type de carburant. null si non mentionné.",
      },
      transmission: {
        type: ["string", "null"],
        enum: ["manual", "automatic", "cvt", null],
        description: "Type de transmission. null si non mentionné.",
      },
      body_style: {
        type: ["string", "null"],
        enum: ["sedan", "suv", "pickup", "wagon", "hatchback", "coupe", "van", "other", null],
        description: "Style de carrosserie.",
      },
      condition: {
        type: ["string", "null"],
        enum: ["new", "good", "fair", "poor", null],
        description: "État général déduit du texte. null si non spécifié.",
      },
      city: {
        type: ["string", "null"],
        description: "Ville à Madagascar. null si non mentionnée.",
      },
      confidence: {
        type: "number",
        description: "Score de confiance 0..1 sur la qualité de l'extraction (0 = très incertain, 1 = très sûr).",
      },
    },
    required: ["is_vehicle_listing", "is_buyer_post", "confidence"],
  },
} as const;
