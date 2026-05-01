# Pipeline d'extraction LLM des annonces FB (Sprint 2)

> Date : 2026-04-30
> Statut : extraction batch, le moteur d'estimation n'est PAS modifié.
> Branche : `feat/llm-extraction-pipeline`

## Objectif

Le pipeline regex initial (sprint data 1) extrait les tuples
`{brand, model, year, mileage, price}` à partir du texte libre des annonces
FB Madagascar avec un rendement de **~5 %** seulement (335 tuples sur
6473 posts du groupe Varotra). Le texte FB est trop bruité pour des regex :
mélange français/malgache, abréviations locales (TBE, BVA, kkm), prix en
Fmg/Ar/USD/WhatsApp-only, marques/modèles écrits avec mille variantes
(« Mits L200 », « Hilux 4x4 single cab »).

**Solution** : Claude Haiku 4.5 lit le post, comprend le contexte, retourne
un JSON structuré garanti via `tool_use`. Cible : **30-50 % de rendement**.

## Architecture

```
scripts/data/
├── lib/
│   ├── llm-prompts.ts       ← system prompt FR + tool_use schema
│   ├── llm-extract.ts       ← un post → un ExtractionResult (lazy SDK init)
│   ├── llm-extract-cache.ts ← cache disque hash-based
│   ├── llm-batch.ts         ← orchestrateur (CSV → cache → CSV résultats)
│   └── parse.ts             ← parseCsv RFC-4180 (déjà présent, réutilisé)
├── run-llm-extraction.ts    ← entry point (charge .env.local, lance runBatch)
└── build-reference-profiles.ts (MOD)
                               ↑ détecte llm_extractions.csv et l'ajoute
                                 en source fb_scrap (source_detail = fb_scrap_llm)
```

```
scripts/data/inputs/                  ← CSV bruts FB (gitignored)
├── fb_scrap_v1_varotra_apr2026.csv          (~6473 lignes)
└── fb_scrap_v2_coinautomoto_jul2025_apr2026.csv (~5000 lignes)

scripts/data/output/                  ← gitignored
├── llm_extractions.csv     ← résultats structurés (input du build profils)
├── llm_cache.json          ← cache disque (re-run → 0 appel)
└── llm_budget_log.json     ← suivi tokens / coût / erreurs
```

## Schéma `tool_use`

Le system prompt force toujours un appel à `extract_vehicle` (`tool_choice =
{ type: "tool", name: "extract_vehicle" }`), donc le LLM ne peut PAS
répondre en texte libre — pas de parsing fragile à faire côté Node.

```ts
{
  is_vehicle_listing: boolean,    // false → pub, demande, hors-sujet
  is_buyer_post:      boolean,    // true → "Mitady" (recherche d'achat)
  brand:              string|null,
  model:              string|null,
  year:               integer|null,
  mileage_km:         integer|null,
  price_ar:           integer|null,  // TOUJOURS en Ariary (LLM convertit Fmg→Ar)
  currency_original:  "Ar"|"Fmg"|"USD"|"EUR"|null,
  fuel_type:          "petrol"|"diesel"|"hybrid"|"electric"|null,
  transmission:       "manual"|"automatic"|"cvt"|null,
  body_style:         "sedan"|"suv"|"pickup"|"wagon"|"hatchback"|"coupe"|"van"|"other"|null,
  condition:          "new"|"good"|"fair"|"poor"|null,
  city:               string|null,
  confidence:         number  // 0..1
}
```

Les unions `["string", "null"]` permettent au LLM de retourner explicitement
`null` plutôt que de deviner, ce qui est essentiel pour la qualité de la
calibration en aval.

## Cache disque

Clé = `sha256(text trimé)` tronqué à 16 hex chars. Le cache différencie :

- `getFromCache(text) === undefined` → jamais vu, il faut appeler le LLM
- `getFromCache(text) === null`      → LLM appelé, a renvoyé null (ne pas rappeler)
- `getFromCache(text) === ExtractedVehicle` → extraction valide

Le cache est sérialisé en JSON pretty pour faciliter inspection et diff
(`scripts/data/output/llm_cache.json`, gitignored).

**Invalider le cache** : supprimer le fichier et relancer.

## Budget guard

`LLM_BUDGET_USD_MAX` (défaut $5) : dès que le coût cumulé atteint le
plafond, la boucle s'arrête proprement, le cache est persisté et le CSV de
sortie est écrit avec ce qu'on a déjà extrait. Le log JSON contient
`budgetReached: true`.

Pricing (USD par million de tokens) configuré dans `llm-extract.ts` :

| Modèle                   | Input | Output |
|--------------------------|------:|-------:|
| claude-haiku-4-5         | 1.00  | 5.00   |
| claude-3-5-haiku-20241022| 0.80  | 4.00   |
| claude-sonnet-4-5        | 3.00  | 15.00  |

Modèle inconnu → fallback prudent ($1/$5).

## Coût attendu

Sur un post FB type :
- ~280 tokens input (system prompt FR + texte tronqué à 3000 chars)
- ~80 tokens output (JSON tool_use)
- coût Haiku 4.5 ≈ `(280 × 1 + 80 × 5) / 1_000_000` = **~$0.00068 / post**

Pour ~6064 posts uniques estimés :
- Coût total estimé : **~$4.10**
- Marge de sécurité : budget $5 par défaut → s'arrête avant dérapage
- Re-run = $0 grâce au cache disque

## Workflow opérationnel

```bash
# 1. Extraire (1 fois — protégé par cache + budget)
npm run data:llm-extract

# 2. Vérifier le coût réel et la qualité du CSV
cat scripts/data/output/llm_budget_log.json
head -5 scripts/data/output/llm_extractions.csv

# 3. Calibrer les profils en intégrant les nouvelles extractions
npm run data:build-profiles

# 4. Lire le rapport
cat scripts/data/output/INGESTION_REPORT.md
```

## Ajouter un nouveau groupe FB

1. Scraper le groupe avec un outil tiers (Apify, etc.) en respectant les
   8 colonnes : `text, facebookUrl, likesCount, commentsCount, time, groupTitle, user/id, user/name`.
2. Déposer le CSV dans `scripts/data/inputs/`.
3. Ajouter le chemin au tableau `DEFAULT_INPUTS` dans
   `scripts/data/lib/llm-batch.ts`, OU passer `inputs: [...]` à `runBatch()`
   dans un script ad-hoc.
4. Relancer `npm run data:llm-extract` — le cache existant n'est pas invalidé,
   seuls les nouveaux posts uniques sont envoyés au LLM.

## Limites connues

- **Le LLM n'est jamais 100 % fiable** : les `confidence < 0.5` doivent être
  monitorés (champ `confidence` du CSV). Vague 2 : ajouter un seuil de
  confidence minimum pour entrer en calibration.
- **Pricing Anthropic** : la table dans `llm-extract.ts` doit être tenue à
  jour. Une dérive de pricing inflera le `costUsd` reporté mais le budget
  guard reste sécurisant tant qu'on est conservateur.
- **Pas de retry SDK** : une erreur réseau → ce post est perdu pour ce run.
  Le cache ne stocke PAS les erreurs, donc un re-run réessaiera. Vague 2 :
  envisager un retry exponentiel.
- **Truncation** : les posts > 3000 chars sont coupés avant envoi au LLM.
  La queue (rare en pratique) n'est pas vue. Ajustable via
  `runBatch({ truncateChars })`.

## Tests

`src/test/llmExtract.test.ts` couvre :
- Tarifs / cost computation par modèle
- `extractFromText` avec SDK mocké (succès, malformed, exception)
- Cache : get/set, hash trimming, persistance disque, distinction null/undefined
- `runBatch` : exclusion buyers / non-vehicles, cache hit, budget guard,
  dédoublonnage cross-CSV, filtre `minTextLength`
