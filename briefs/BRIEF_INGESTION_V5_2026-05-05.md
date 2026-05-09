# BRIEF — Ingestion batch v5 (20 listings facebook + partner)

**Date :** 2026-05-05
**Auteur du brief :** Claude (chat web), pour exécution Claude Code
**Source des données :** `info_manuel.pdf` — 20 annonces Facebook Madagascar (avril–mai 2025)

---

## 🛡️ Garde-fous (NE JAMAIS toucher)

- `src/pages/Publier.tsx`
- `src/pages/publish/**`
- `src/lib/publishDraft.ts`
- `e2e/yas-app-visual-audit.spec.ts`
- Hero homepage "Le portail auto N°1 de Madagascar"
- Aucun commit automatique. **Ali commit lui-même** après review.

---

## 🎯 Scope

Ingérer 20 nouveaux listings dans `market_listings_clean` via le pipeline existant
`scripts/data/ingest-market-listings-csv.ts` (1019 LOC, format 27 colonnes strict).

Répartition :
- **14 lignes** → `--source-tag=facebook`
- **6 lignes** → `--source-tag=partner` (concessionnaire CT Motors)

**Objectif DB après ingestion :** 565 → ~580 rows utilisables (après fingerprint dedup éventuel et outlier flagging auto).

---

## 📂 Fichiers d'entrée à placer

À déposer dans `data/seed/` :

```
data/seed/autonex_listings_v5_2026-05-05_facebook.csv     (14 rows)
data/seed/autonex_listings_v5_2026-05-05_partner.csv      (6 rows)
```

Format : 27 colonnes EXACTES, UTF-8, quoting=QUOTE_ALL (compatible parser script).
Validé en local : header conforme à la liste attendue par le script.

---

## 🚦 Étapes d'exécution (ordre strict)

### 1. Dry-run facebook
```bash
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --dry-run \
  --csv data/seed/autonex_listings_v5_2026-05-05_facebook.csv \
  --source-tag=facebook
```

**Critères de succès dry-run :**
- 14 rows parsées sans erreur "CSV header invalide"
- 0 row rejetée pour valeur source non autorisée
- Résumé fingerprint dedup affiché (combien de matches contre les 565 existants)
- Distribution `data_confidence` cohérente (high / medium / low)

### 2. Dry-run partner
```bash
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --dry-run \
  --csv data/seed/autonex_listings_v5_2026-05-05_partner.csv \
  --source-tag=partner
```

**Critères de succès :** idem (6 rows attendues).

### 3. Ingestion réelle facebook (si dry-run OK)
```bash
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --dry-run=false --reuse-supabase-env \
  --csv data/seed/autonex_listings_v5_2026-05-05_facebook.csv \
  --source-tag=facebook
```

### 4. Ingestion réelle partner (si dry-run OK)
```bash
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --dry-run=false --reuse-supabase-env \
  --csv data/seed/autonex_listings_v5_2026-05-05_partner.csv \
  --source-tag=partner
```

---

## ✅ Validation post-ingestion (SQL Supabase)

À lancer dans le SQL Editor Supabase (project ref `wtkedamrmtvdoippqanc`) :

### Vérif comptage
```sql
SELECT source, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE include_in_estimation = true) AS usable,
       COUNT(*) FILTER (WHERE outlier_flag = true) AS outliers
FROM market_listings_clean
GROUP BY source
ORDER BY source;
```
**Attendu :** facebook +14, partner +6.

### Vérif RGPD strict (seller_source et contact NULL en clean)
```sql
SELECT COUNT(*) AS rows_with_seller_source_leak
FROM market_listings_clean
WHERE extraction_notes ILIKE '%seller_source%'
   OR (raw_listing_id IN (
        SELECT id FROM market_listings_raw
        WHERE created_at > NOW() - INTERVAL '1 hour'
      ));
```
Croiser avec : `SELECT column_name FROM information_schema.columns WHERE table_name='market_listings_clean'` — confirmer absence colonnes `seller_source` / `contact`.

### Vérif des 2 VENDU (price_type=sold)
```sql
SELECT id, normalized_make, normalized_model, price_mga, price_type, extraction_notes
FROM market_listings_clean
WHERE source = 'partner' AND price_type = 'sold';
```
**Attendu :** 2 rows (Kaiyi X7 122M et Haval H6 1.5T 125M).

### Vérif des annonces sans année (include_in_estimation=false)
```sql
SELECT id, normalized_make, normalized_model, year, include_in_estimation, data_confidence
FROM market_listings_clean
WHERE raw_listing_id IN (
  SELECT id FROM market_listings_raw WHERE created_at > NOW() - INTERVAL '1 hour'
)
AND year IS NULL;
```
**Attendu :** 6 rows toutes avec `include_in_estimation = false` et `data_confidence = 'low'` :
- 4 visuels CT Motors (H6 HEV / H6 AT / H6 GT / Grand Cherokee)
- VW Tiguan phase 2 (BL AUTO)
- Toyota Prado 150 TXL (Mirants Fiara)

### Vérif des deux VENDU CT Motors (year=NULL mais include_in_estimation=true)
```sql
SELECT id, normalized_make, normalized_model, year, mileage_km,
       price_mga, price_type, include_in_estimation, data_confidence
FROM market_listings_clean
WHERE price_type = 'sold' AND source = 'partner';
```
**Attendu :** 2 rows avec `include_in_estimation = true` malgré year=NULL — c'est un choix assumé (transactions confirmées valent comme comps même sans année exacte, à condition qu'on calibre l'engine pour). **Si l'engine refuse year=NULL, repasser à false ici.**

---

## 🔍 Points d'attention spécifiques

### A. Doublons potentiels avec la DB existante
Le script gère le fingerprint dedup auto sur `make+model+year+price`. Mais 2 annonces de notre batch viennent de pages déjà scrapées (Mirants Fiara, Coin AuToMoTo Mada). Surveiller le résumé dedup du dry-run.

### B. Contact partagé (review_contact_link_0345272959)
Deux rows partagent `duplicate_group = "review_contact_link_0345272959"` :
- AN-013 Mitsubishi L200 (FB profil "Andry Bebs", marqué `particulier`)
- AN-020 Toyota Prado 150 TXL (page "Mirants Fiara", marqué `revendeur`)

→ Ce n'est **pas** un doublon de véhicule. C'est un signal de réseau revendeur à investiguer.
**Action proposée :** ajouter une note dans le rapport, ne PAS bloquer l'ingestion.

### C. Conversions de devise
8 lignes sont arrivées en FMG. Toutes ont `currency_original = FMG` et `price_mga` déjà converti en Ar (ratio strict 1:5). À cross-check post-ingestion :
```sql
SELECT id, price_mga, extraction_notes
FROM market_listings_clean
WHERE raw_listing_id IN (
  SELECT id FROM market_listings_raw
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND currency_original = 'FMG'
);
```
Aucun price_mga ne doit être >1Md (un milliard) — sinon c'est qu'un FMG a été ingéré sans conversion.

### D. Erreur de désignation corrigée
- Annonce vendeur "Ford T8" → corrigé en `make=Ford / model=Ranger / trim_generation=T8 2.2 6speed`. Cohérent avec convention du dataset (T8 = génération Ranger 2015-2022).

### E. Outliers à surveiller (post-ingestion auto)
Aucun outlier évident dans les 20 rows mais surveiller :
- AN-001 Audi A2 2004 à 13M Ar : prix bas mais cohérent pour modèle ancien rare
- AN-019 Land Rover Discovery 2 (2000) à 31.6M Ar : ancien mais 4x4 robuste, prix plausible

Si le check `pct_of_median` post-ingestion les flag, accepter le flag (le système marche correctement).

---

## 📦 Livrables attendus de Claude Code

1. **`rapports/INGESTION_BATCH_V5_2026-05-05.md`** contenant :
   - Résumé dry-run facebook (rows parsées, dedup, warnings)
   - Résumé dry-run partner
   - Résultat ingestion réelle (rows insérées, fingerprint matches)
   - Résultats des 5 requêtes SQL de validation
   - Liste des éventuels flags outlier auto-détectés
   - Recommandation pour AN-007 / AN-008 si engine refuse year=NULL avec include=true

2. **Pas de commit.** Laisser les CSV dans `data/seed/` et le rapport dans `rapports/`. Ali commit après review.

3. **Si erreur en dry-run** : stop immédiat, rapport d'erreur sans tenter de patch créatif sur les CSV — on revient discuter avant.

---

## 🧪 Tests à NE PAS toucher

Pas de modification de tests existants. Pas de nouveaux tests dans ce brief — c'est une opération data, pas un changement d'engine.

Si le pipeline a des tests d'intégration sur l'ingestion (`scripts/data/__tests__/`), les laisser tels quels et juste vérifier qu'ils passent toujours après.

---

## ⏭️ Suite logique (hors scope de ce brief)

Une fois ces 20 rows ingérées :
- Smoke test live sur autonex.mg : Hyundai Santa Fe 2018 (AN-011) → vérifier que l'engine V2.5 trouve les comps Tucson/Sportage via Couche 2 model_proximity
- Backfill années pour les 6 rows year=NULL via recontact CT Motors / BL AUTO / Mirants Fiara
- Décision sur AN-013/AN-020 : confirmer ou infirmer le lien revendeur

Ces points ne sont **pas** dans ce brief — ils nécessitent intervention Ali (calls/MP) ou nouveaux briefs.
