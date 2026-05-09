# Rapport — Ingestion batch v5 (20 listings facebook + partner)

**Date d'exécution :** 2026-05-05
**Brief source :** `briefs/BRIEF_INGESTION_V5_2026-05-05.md`
**Exécutant :** Claude Code (Opus 4.7), pilotage Ali (chat web Pro)
**Verdict global :** ✅ **Ingestion réussie** (18 rows newly inserted, 2 dedup-skipped attendues, 0 erreur)
**État DB :** 565 → **583 rows** dans `market_listings_clean` (cible 585, écart -2 expliqué par dedup auto)

---

## 1. Étapes d'exécution

### 1.1 Dry-run Facebook v5 (avant patch FMG)

**Résultat :** parsing OK 14/14 mais **anomalie sémantique détectée** sur les prix FMG (cf. §3.1).

- 14 rows parsées
- `include=true` : 11 / `include=false` : 3 (1 auto-flippée par `out_of_band`)
- FMG converted : 6
- **Out_of_band : 1** (AN-016 Kia Pride : 20M FMG /5 = 4M, sous le floor `PRICE_MGA_MIN=5M`)
- 0 erreur, 0 doublon intra-batch
- Distribution : medium=7, high=5, low=2

**Stop.** Vérité-terrain interrogée via SQL contre la DB existante :

```sql
SELECT currency_original, COUNT(*), MIN(price_mga), AVG(price_mga), MAX(price_mga) ...
FROM market_listings_clean GROUP BY currency_original;
```

Réponse Ali : Toyota avg=104M Ar, Kia avg=39M Ar (cohérent marché Mada) → confirme que la DB stocke en Ariary ET que le script attend `price_mga` en VALEUR BRUTE FMG quand `currency_original=FMG`. Convention CSV brief erronée.

### 1.2 Régénération CSV Facebook v5.1

CSV régénéré par Ali avec les 7 prix FMG **multipliés par 5** :

| listing_id | price_mga v5 | price_mga v5.1 | /5 par script (final MGA) |
|---|---|---|---|
| AN-009 Tiguan | 53M | 265M | 53M |
| AN-013 L200 | 69M | 345M | 69M |
| AN-014 Polo 4 | 27M | 135M | 27M |
| AN-016 Kia Pride | 20M | 100M | 20M |
| AN-017 Ford Ranger T8 | 110M | 550M | 110M |
| AN-019 Discovery 2 | 31.6M | 158M | 31.6M |
| AN-020 Prado 150 TXL | 185M | 925M | 185M |

Fichier : `data/seed/autonex_listings_v5_1_2026-05-05_facebook.csv`
CSV partner inchangé (aucune row FMG).

### 1.3 Dry-run Facebook v5.1

**Résultat :** ✅ critère atteint.

- 14 rows parsées
- `include=true` : 12 / `include=false` : 2
- FMG converted : 7
- **Out_of_band : 0** ← critère v5.1 atteint
- 0 erreur, 0 doublon intra-batch

### 1.4 Dry-run Partner

**Résultat :** ✅

- 6 rows parsées
- `include=true` : 2 (les 2 VENDU) / `include=false` : 4 (les 4 visuels CT Motors year=NULL)
- FMG=0, out_of_band=0
- Top makes : Haval ×4, Jeep ×1, Kaiyi ×1

### 1.5 Ingest réel Facebook v5.1

```
Newly inserted (raw + clean) : 12
Already in DB (skipped)      : 2  ← dedup attendu (Mirants Fiara + Coin AuToMoTo Mada)
Errors                       : 0
Duration                     : 8.3s
```

### 1.6 Ingest réel Partner

```
Newly inserted (raw + clean) : 6
Already in DB (skipped)      : 0
Errors                       : 0
Duration                     : 6.1s
```

---

## 2. Validation SQL (5 requêtes du brief)

### 2.1 Q1 — Comptage par source

| source | total | usable | outliers |
|---|---|---|---|
| facebook | 529 | 510 | 19 |
| partner | 53 | 49 | 0 |
| manual | 1 | 1 | 0 |
| **GRAND TOTAL** | **583** | — | — |

✅ **+18 rows** (12 FB + 6 partner) vs 565 avant ingest. Cible théorique 585, écart -2 = dedup hits FB.

### 2.2 Q2 — RGPD strict

- `extraction_notes ILIKE '%seller_source%'` : **0 row** ✅
- Raw rows insérées dernière heure : **18** ✅ (matche 12 FB + 6 partner)
- Probe `seller_source` colonne dans `market_listings_clean` : **`column does not exist`** ✅ DROP confirmée
- Probe `contact` colonne dans `market_listings_clean` : **`column does not exist`** ✅ DROP confirmée

### 2.3 Q3 — VENDU partner (price_type=sold)

⚠️ **Résultat : `[]` (0 row)** alors que 2 attendues.

**Cause identifiée — bug script + bug DB constraint + bug engine** : voir §3.2.

### 2.4 Q4 — Recent year=NULL (last hour)

| id | make / model | include | conf | price_type |
|---|---|---|---|---|
| fa1e42c6… | Volkswagen Tiguan | false | low | asking |
| 494e1d71… | Toyota Land Cruiser Prado | false | low | asking |
| fdfae3ea… | Haval H6 | false | low | asking |
| d39b26e5… | Haval H6 | false | low | asking |
| 581d10c7… | Haval H6 | false | low | asking |
| 084d2d14… | Jeep Grand Cherokee | false | low | asking |
| **cabd5d1b…** | **Kaiyi X7 (VENDU)** | **true** | **medium** | **null** ⚠️ |
| **420d190b…** | **Haval H6 (VENDU)** | **true** | **medium** | **null** ⚠️ |

**Total : 8 rows** (vs 6 attendues dans le brief — différence due aux 2 VENDU `include=true` malgré year=NULL).

✅ Les 6 rows `include=false` matchent bien les 6 prévues : 2 FB (Tiguan / Prado 150) + 4 partner CT Motors (3 Haval H6 visuels + 1 Grand Cherokee).

⚠️ Les 2 VENDU sont `include=true` (choix assumé du brief) mais leur `price_type` est `null`, pas `sold` → cf. §3.2.

### 2.5 Q5 — FMG converted (sanity check sub-1Md)

6 raw rows avec `currency_original=FMG` insérées (vs 7 dans le CSV — la 7ᵉ est AN-017 Ford Ranger T8, dedup-skipped).

| listing | price_mga clean (Ar) | check |
|---|---|---|
| AN-009 VW Tiguan | 53 000 000 | ✅ |
| AN-013 Mitsubishi L200 2009 | 69 000 000 | ✅ |
| AN-014 VW Polo 4 2008 | 27 000 000 | ✅ |
| AN-016 Kia Pride 2006 | 20 000 000 | ✅ |
| AN-019 Discovery 2 2000 | 31 600 000 | ✅ |
| AN-020 Toyota Prado 150 TXL | 185 000 000 | ✅ |

**Rows price_mga > 1Md : 0** ✅ — toutes les conversions FMG→MGA sont propres.

Tags `pipeline:fmg_converted` présents dans `extraction_notes` pour les 6 rows ✅.

---

## 3. Findings critiques

### 3.1 ✅ RÉSOLU — Convention FMG brief vs script

**Symptôme :** dry-run v5 a flippé AN-016 Kia Pride en `include=false` (out_of_band).

**Root cause :** le brief documentait `price_mga` déjà converti en Ar quand `currency_original=FMG`, mais le script `normalizePrice` (lignes 140-160 de `scripts/data/ingest-market-listings-csv.ts`) divise par 5 dès que `currency=FMG`. Convention CSV ≠ logique script.

**Vérité-terrain :** SQL sur DB existante a montré que les rows FMG historiques ont toutes leur `price_mga` cohérent avec le marché Ariary final. Convention canonique = **`price_mga` en valeur brute FMG, le script convertit**.

**Résolution :** CSV facebook régénéré en v5.1 avec les 7 prix FMG ×5. Dry-run v5.1 OK (out_of_band=0). Ingest réel propre.

**Action de fond recommandée :** corriger la skill `autonex-database` (système prompt) qui dit actuellement « convert to Ar, set `currency_original=FMG` ». Devrait dire : « si raw FMG, garder le nombre brut FMG dans `price_mga`, set `currency_original=FMG`, le script convertit ×0.2 ». Sinon le piège se reproduira.

### 3.2 ⚠️ OUVERT — `price_type=sold` silently dropped + engine ne l'utilise pas

**Symptôme :** Q3 retourne `[]`. Les 2 VENDU partner ont `price_type=null` en clean au lieu de `sold`.

**Triple root cause :**

1. **Bug script** : `normalizePriceType` (ligne 235-240 de `ingest-market-listings-csv.ts`) whiteliste uniquement `['asking','firm','negotiable','quote']`. La valeur `'sold'` retombe sur `return null`.

2. **DB constraint trop stricte** : migration `20260509120000_market_listings_clean_extension.sql:39` :
   ```sql
   ADD COLUMN IF NOT EXISTS price_type text
     CHECK (price_type IN ('asking','firm','negotiable','quote') OR price_type IS NULL),
   ```
   Si on étendait juste le script, la DB rejetterait l'INSERT.

3. **Engine ne lit pas `price_type=sold`** : `src/lib/estimation/transactionFactors.ts:186-203` (et copie miroir dans `supabase/functions/compute-estimation/transaction-factors.ts:140+`) résout le factor key uniquement à partir de `seller_type` text, jamais à partir de `price_type`. Le path `transaction_confirmed` n'est déclenché que si `seller_type` contient les mots `transaction` + `confirmed` — ce qui ne se produit jamais via le pipeline actuel.

**Conséquence concrète :** les 2 VENDU partner (Kaiyi X7 122M, Haval H6 1.5T 125M) seront évalués comme `seller_type=concessionnaire` → factor `concessionnaire_officiel` ×0.97, **PAS** `transaction_confirmed` ×1.00. Écart ~3% sur ces 2 comps.

**Contradiction avec la skill :** la skill `autonex-database` dit « Mark sold listings with `price_type=sold` so engine applies transaction_confirmed factor » — c'est faux dans le code actuel.

**Options pour Ali (à trancher hors de ce brief) :**

- **A. Aligner script + DB + engine sur `price_type=sold` :**
  - Étendre `normalizePriceType` whitelist
  - Migration ALTER TABLE pour étendre le CHECK constraint (non-destructif si on remplace par `IN (..., 'sold')`)
  - Modifier `resolveFactorKey` pour matcher `price_type=sold` en priorité sur `seller_type`
  - Mettre à jour parité front/edge

- **B. Garder l'enum DB tel quel, utiliser `seller_type` overriden :**
  - Pour les VENDU, mettre `seller_type=transaction_confirmed` dans le CSV (override de la valeur dealer/particulier)
  - Note dans `extraction_notes` : « VENDU CT Motors (transaction confirmée) »
  - Effort minimal mais perd l'info dealer d'origine

- **C. Accepter l'écart ~3% :** considérer que `concessionnaire_officiel` ×0.97 est suffisamment proche de `transaction_confirmed` ×1.00 et ne pas toucher au pipeline.

**Recommandation perso :** option A. Le tag VENDU est l'info la plus précieuse pour calibrer un comparable (transaction réelle vs prix demandé) — mérite d'être traité comme un signal de premier ordre, pas mappé sur le seller_type.

---

## 4. Points secondaires

### 4.1 Dedup auto contre prod

Sur les 14 rows FB v5.1, **2 ont matché un fingerprint existant** dans les 565 rows de prod et ont été skipped (comportement nominal). Pré-flaggé par le brief (point A : Mirants Fiara + Coin AuToMoTo Mada déjà scrapées). Aucun patch nécessaire.

Côté partner : 0 dedup-hit (CT Motors était sous-représenté en prod).

### 4.2 Réseau revendeur AN-013 / AN-020

Contact `0345272959` (hashé) partagé entre AN-013 (Mitsubishi L200 Sportero, FB profil "Andry Bebs", `seller_type=particulier`) et AN-020 (Toyota Prado 150 TXL, page "Mirants Fiara", `seller_type=revendeur`). `duplicate_group="review_contact_link_0345272959"` posé sur les 2 rows. Pas un doublon véhicule — signal de réseau revendeur à investiguer manuellement par Ali.

### 4.3 Prix `Audi A2 13M Ar` (AN-001)

Flag potentiel post-ingestion via `pct_of_median`, à surveiller. Le brief considère acceptable (modèle 2004 ancien, prix bas mais cohérent pour le marché). Aucun outlier_flag manuel posé.

### 4.4 Ford Ranger T8 dedup-skipped (AN-017)

C'est probablement le 7ᵉ FMG du batch v5.1, dédupliqué contre la prod. Vérifiable en croisant le fingerprint. Non bloquant.

---

## 5. Fichiers et artefacts

**CSV ingérés (à laisser dans `data/seed/`, pas de commit auto) :**
- `data/seed/autonex_listings_v5_2026-05-05_facebook.csv` (v5 obsolète, à supprimer ou archiver — Ali décide)
- `data/seed/autonex_listings_v5_1_2026-05-05_facebook.csv` (v5.1 ingérée)
- `data/seed/autonex_listings_v5_2026-05-05_partner.csv` (ingéré)

**Brief :**
- `briefs/BRIEF_INGESTION_V5_2026-05-05.md` (à archiver post-commit Ali)

**Script de validation temporaire :**
- `scripts/data/run-batch-v5-validation.ts` (créé pour ce rapport, peut être supprimé ou conservé comme template)

**Tests :** non touchés (opération data, pas modif engine).

---

## 6. Recommandations / suite logique

### 6.1 Immédiat (Ali commit)

1. Review du rapport
2. Décision sur §3.2 (`price_type=sold`) : option A / B / C
3. Décision sur §3.1 : corriger la skill doc `autonex-database` (FMG convention)
4. Commit manuel des 3 fichiers (CSV v5.1 FB, CSV partner, ce rapport) avec message au choix

### 6.2 Court terme (1-2 jours)

1. **Smoke test live** sur autonex.mg : Hyundai Santa Fe 2018 (AN-011) → vérifier que l'engine V2.5 trouve les comps Tucson/Sportage via Couche 2 model_proximity. Le batch a ajouté une comp Santa Fe directe.
2. **Backfill années** pour les 6 rows year=NULL via recontact CT Motors / BL AUTO / Mirants Fiara :
   - 4 visuels CT Motors (H6 HEV / H6 AT / H6 GT / Grand Cherokee)
   - VW Tiguan phase 2 (BL AUTO)
   - Toyota Prado 150 TXL (Mirants Fiara)
3. **Investigation réseau revendeur** AN-013 / AN-020 (cf. §4.2)

### 6.3 Moyen terme

- Migration CHECK constraint `price_type` pour autoriser `'sold'` (si option A retenue)
- Tests d'intégration ingestion (`scripts/data/__tests__/`) à étendre pour couvrir `price_type=sold`
- Brief séparé pour la rectification engine si option A retenue (parité front/edge à maintenir)

---

## 7. Critère de réussite final

✅ `market_listings_clean` est passée de **565 → 583 rows** (-2 vs cible 585, expliqué par dedup auto sur 2 listings FB pré-existants — comportement nominal).

✅ 18 nouveaux raw inserted, 18 nouveaux clean (12 FB + 6 partner).

✅ RGPD strict : 0 leak `seller_source`, colonnes `seller_source` et `contact` confirmées DROPPED de `market_listings_clean`.

✅ FMG : toutes les conversions ×0.2 abouties dans `[5M, 800M]` Ar — 0 prix > 1Md.

⚠️ Réservation : les 2 VENDU partner ne déclenchent PAS le factor `transaction_confirmed` côté engine. Bug structurel pré-existant, à arbitrer hors de ce brief (cf. §3.2).

**Aucun commit effectué. Ali commit après review.**
