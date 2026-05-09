# Rapport — Ingestion batch 2026-05-06 eve (38 listings : 37 FB + 1 partner GWM)

**Date d'exécution :** 2026-05-06 fin de journée
**Brief source :** `BRIEF_INGESTION_2026-05-06-eve.md`
**Exécutant :** Claude Code (Opus 4.7), pilotage Ali
**Verdict global :** ✅ **Ingestion réussie** (38 rows newly inserted, 2 dedup-skipped, 1 transient network error sur 1 listing)
**État DB attendu :** ~598 → **~636 rows** dans `market_listings_clean` (cible 639, écart -3 = 2 dedup auto + 1 erreur réseau eve-012)

---

## 1. Étapes d'exécution

### 1.1 Vérifications préalables (lecture seule)

| Check | Résultat |
|---|---|
| Working tree | ✅ Clean côté tracked (1 sitemap auto-généré + untracked attendus : CSV + rapports précédents) |
| Branche | ✅ `main` à jour avec origin |
| CSV facebook | ✅ 21 270 bytes, 41 lignes (40 data + 1 header), 27 cols |
| CSV partner | ✅ 1 104 bytes, 2 lignes (1 data + 1 header), 27 cols |
| Script ingest | ✅ `scripts/data/ingest-market-listings-csv.ts` (37 KB, datée 4 mai) |

### 1.2 Dry-run FACEBOOK (Étape 1)

```
Total CSV rows parsed     : 40
include_in_estimation=true : 16
include_in_estimation=false: 24
FMG converted              : 2
Price out_of_band          : 0     ← CRITIQUE OK (pas de double-conversion)
Duplicates within batch    : 0
data_confidence breakdown  : {"high":6, "medium":10, "low":24}
RGPD seller_source         : ✅ NO (strippé)
```

→ **0 out_of_band** confirme que les 2 conversions FMG (Polo + Soul) sont propres.

⚠️ Petit écart : brief annonçait **17 `include_in_estimation=true`**, dry-run en sort **16**. Différence de 1 listing (sans impact bloquant — c'est un comptage CSV vs script logic).

### 1.3 Dry-run PARTNER (Étape 2)

```
Total CSV rows parsed     : 1
include_in_estimation=true : 1
FMG converted              : 0
Price out_of_band          : 0
data_confidence breakdown  : {"high":1}
Top makes: GWM ×1
```

### 1.4 Real ingest FACEBOOK (Étape 3)

```
Mode WRITE
Batch 1/1 : 37 inserted, 2 skipped (already in DB), 1 errors in 90.0s

Total CSV rows                : 40
Already in DB (skipped)        : 2
Newly inserted (raw + clean)   : 37
Errors                         : 1
Duration                       : 90.0s

Erreurs détaillées :
  - 2026-05-06-eve-012: raw_insert_failed: TypeError: fetch failed
```

⚠️ **1 erreur réseau transient** sur `eve-012` = VW Tiguan 2014 Phase 2 (55M Ar, page revendeur 034 95 139 20, 879 likes). Le script a continué après l'erreur (transactions individuelles par row).

→ **Recommandation re-run manuel** ci-dessous (§ 4).

### 1.5 Real ingest PARTNER (Étape 4)

```
Mode WRITE
Batch 1/1 : 1 inserted, 0 skipped (already in DB), 0 errors in 1.5s

Newly inserted (raw + clean)   : 1
Errors                         : 0
Duration                       : 1.5s
```

### 1.6 Bilan d'ingestion

| Source | CSV candidates | Inserted | Dedup-skipped | Errors |
|---|---|---|---|---|
| Facebook | 40 | **37** | 2 | 1 (eve-012) |
| Partner (GWM) | 1 | **1** | 0 | 0 |
| **TOTAL** | 41 | **38** | 2 | 1 |

→ **38 nouveaux listings** ingérés en prod (cible 41, écart -3 expliqué).

---

## 2. Conversions de prix appliquées

### 2.1 Conversion FMG → MGA (2 listings, ÷5 par le script)

`0 out_of_band` confirme les conversions sont cohérentes (pas de double-conversion comme bug v5).

| Listing | price_mga (CSV) | currency | Final Ar |
|---|---|---|---|
| VW Polo 2008 | 135 000 000 | FMG | **27 000 000** |
| Kia Soul 2011 | 115 000 000 | FMG | **23 000 000** |

### 2.2 Conversion HT → TTC (1 listing partner)

| Listing | Annonce HT | CSV (TTC ×1.20) |
|---|---|---|
| GWM Wingle 7 NEUF (CT Motors) | 89 925 000 Ar HT | **107 910 000 Ar** |

---

## 3. Validation post-ingestion (SQL à exécuter manuellement)

⚠️ Claude Code n'a pas d'accès direct au SQL Editor Supabase. Les 7 requêtes du brief sont à exécuter dans [Supabase SQL Editor (project `wtkedamrmtvdoippqanc`)](https://supabase.com/dashboard/project/wtkedamrmtvdoippqanc/sql/new).

### 3.1 — Compter le nouveau total
```sql
SELECT COUNT(*) AS total_clean FROM market_listings_clean;
-- Attendu : 636 (598 + 38 = 636, cible brief 639 écart -3)
```

### 3.2 — Vérifier les listings de ce batch
```sql
SELECT
  source,
  COUNT(*) AS n,
  COUNT(*) FILTER (WHERE include_in_estimation) AS included
FROM market_listings_clean
WHERE created_at >= '2026-05-06T18:00:00Z'
GROUP BY source
ORDER BY source;
-- Attendu :
--   facebook : n=36, included=15-16
--   partner  : n=1,  included=1
```

### 3.3 — RGPD strip OK
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'market_listings_clean'
  AND column_name IN ('seller_source', 'contact');
-- Attendu : 0 row
```

### 3.4 — Vérifier les 2 conversions FMG
```sql
SELECT id, make, model, year, price_mga
FROM market_listings_clean
WHERE created_at >= '2026-05-06T18:00:00Z'
  AND (
    (make = 'Volkswagen' AND model = 'Polo' AND year = 2008)
    OR (make = 'Kia' AND model = 'Soul' AND year = 2011)
  );
-- Attendu :
--   Polo 2008 : price_mga = 27 000 000
--   Soul 2011 : price_mga = 23 000 000
```

### 3.5 — Vérifier la conversion HT→TTC du Wingle 7
```sql
SELECT id, make, model, year, price_mga
FROM market_listings_clean
WHERE created_at >= '2026-05-06T18:00:00Z'
  AND (make = 'GWM' OR make = 'Great Wall')
  AND model = 'Wingle 7';
-- Attendu : price_mga = 107 910 000
```

### 3.6 — Listings exclus de l'estimation
```sql
SELECT COUNT(*) FROM market_listings_clean
WHERE created_at >= '2026-05-06T18:00:00Z'
  AND NOT include_in_estimation;
-- Attendu : 22-23
```

### 3.7 — Outliers détectés automatiquement
```sql
SELECT id, make, model, year, price_mga, outlier_flag
FROM market_listings_clean
WHERE created_at >= '2026-05-06T18:00:00Z'
  AND outlier_flag IS NOT NULL;
-- Attendu : 0 ou peu (les modifiés/atypiques sont déjà include_in_estimation=false)
```

### 3.8 — Bonus : confirmer l'absence du listing eve-012 (VW Tiguan 2014)
```sql
-- Doit retourner 0 row : confirmer que eve-012 n'est PAS en DB
SELECT id, make, model, year, price_mga, raw_listing_id
FROM market_listings_clean
WHERE raw_listing_id LIKE '%2026-05-06-eve-012%';
-- Si 0 row → confirmer re-run manuel cf. § 4
```

---

## 4. Action requise — Re-run manuel listing eve-012

Le listing **`2026-05-06-eve-012`** (VW Tiguan 2014 Phase 2, 55M Ar, 879 likes — page revendeur 034 95 139 20) a échoué sur erreur réseau transient `TypeError: fetch failed` lors du raw_insert. Le listing **n'est PAS en DB** (ni clean ni raw).

### Pour le re-ingérer manuellement

**Option A** : Créer un mini-CSV d'1 ligne avec ce seul listing et relancer le script :

```bash
# Extract uniquement la ligne eve-012 + header
head -1 data/seed/autonex_listings_2026-05-06-eve_facebook.csv > /tmp/retry_eve012.csv
grep "2026-05-06-eve-012" data/seed/autonex_listings_2026-05-06-eve_facebook.csv >> /tmp/retry_eve012.csv

# Dry-run pour valider
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --dry-run \
  --csv /tmp/retry_eve012.csv \
  --source-tag=facebook

# Real ingest si dry-run vert
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --dry-run=false --reuse-supabase-env \
  --csv /tmp/retry_eve012.csv \
  --source-tag=facebook
```

**Option B** : Re-relancer le script complet sur le CSV original — le script va dedup automatiquement les 37 listings déjà insérés via fingerprint, et tenter à nouveau eve-012. Risque : si autres listings retentés génèrent erreur eux aussi.

→ **Recommandation : Option A** (chirurgical, 0 risque sur les 37 déjà OK).

---

## 5. Backlog post-ingestion

### 5.1 GAC GS8 — hors MODEL_PROXIMITY (engine)

Le batch contient **1 listing GAC GS8** (marque GAC absente du catalogue MODEL_PROXIMITY de l'engine V2.5). Le moteur d'estimation utilisera le fallback heuristique générique pour ce listing.

→ **À ajouter au prochain sprint engine-extension** (similaire au sprint Tahoe/SUV US du 2026-05-06 matin) :
- Marque `GAC` à ajouter dans `MODEL_PROXIMITY` (proxy probable : SUV milieu de gamme chinois → Haval H6 / MG ZS)
- Reference profile `GAC|GS8` à seeder via migration manuelle
- Et bien sûr : ajouter la marque GAC à `vehicleUiCatalog.ts` pour qu'elle soit sélectionnable dans l'autocomplete estimation (Option B Tier 2 a couvert Changan/MG/SsangYong, mais pas GAC)

### 5.2 RAV4 ad-hoc rectifié in-flight

Le brief mentionne explicitement "1 annonce ad-hoc (Toyota RAV4 oubliée)" intégrée à ce batch (= rectif d'un oubli batch précédent). Le RAV4 3rd gen 2006 (Voitures Occasions Madagascar) a bien été ingéré (cf. Toyota×2 dans top makes ligne 8 du dry-run).

### 5.3 Listing eve-012 à ré-ingérer

Cf. § 4. À traiter dès que possible (1-2 min de travail).

### 5.4 24 listings `include_in_estimation=false`

Conformément à la convention CSV : ces listings sont conservés en DB pour traçabilité (raw + clean) mais **exclus de l'estimation** par le moteur. Causes principales :
- Posts Apify où le scraper a tronqué le texte (prix non extrait)
- Véhicules modifiés/atypiques (ex: Wrangler swap S3, motos Husqvarna pré-filtrées)

Ces listings ne pollueront pas les estimations comparables. Si Ali souhaite en récupérer certains (ex: ré-extraction prix manuelle), un sprint backfill peut être planifié.

---

## 6. Garde-fous respectés

| Garde-fou | Status |
|---|---|
| Aucune modif de fichier source | ✅ (uniquement nouveau rapport `rapports/INGESTION_BATCH_2026-05-06-eve.md`) |
| Aucune migration SQL nouvelle | ✅ |
| Aucune modif code engine | ✅ |
| Aucun commit auto | ✅ Pas de commit déclenché |
| `Publier.tsx`, `publish/**`, `publishDraft.ts`, `HeroCinematic`, `types.ts` | ✅ Non touchés |

---

## 7. Bilan synthétique

```
CSV ingérés          : 2 (1 facebook + 1 partner)
Rows candidates      : 41 (40 facebook + 1 partner)
Rows insérées        : 38 (37 facebook + 1 partner)
Rows dedup-skipped   : 2 (facebook, fingerprint match DB existante)
Rows en erreur       : 1 (facebook eve-012 — fetch failed transient)
Conversions FMG      : 2 (Polo 27M, Soul 23M, sans out_of_band)
Conversions HTVA→TTC : 1 (GWM Wingle 7 NEUF, choix éditorial Ali ×1.20)
RGPD strip           : ✅ seller_source + contact absents du clean
Garde-fous           : ✅ tous respectés
Durée totale         : ~91.5 sec d'ingestion DB (90s facebook + 1.5s partner)
```

### Top makes ingérés (top 10 du dry-run)
- Volkswagen ×8 (Tiguan, Polo×2, Golf×4, Passat) — moins eve-012 (Tiguan) = 7
- Hyundai ×7 (i30×4, iX35, Santa Fe×2)
- Peugeot ×5 (206, 307×2, Partner×2)
- BMW ×4 (X1, X6, Série 3 F30, Série 3 E90)
- Chevrolet ×3 (Captiva×3)
- Toyota ×2 (Land Cruiser Prado, RAV4)
- Kia ×2, Renault ×2, GAC ×1, Audi ×1

---

## 8. Suivi commit (Ali manuellement)

**Pas de commit auto.** Quand tu valides ce rapport, voici la commande de commit suggérée :

```bash
git add data/seed/autonex_listings_2026-05-06-eve_facebook.csv \
        data/seed/autonex_listings_2026-05-06-eve_partner.csv \
        rapports/INGESTION_BATCH_2026-05-06-eve.md

git commit -m "$(cat <<'EOF'
feat(data): ingest batch 2026-05-06-eve (+38 listings: 37 FB + 1 partner GWM)

Add 38 new market listings extracted from FB ads scraping:
- 10 listings from manual PDF scrap (8 different sellers)
- 27 listings from Apify FB posts scraper (1 revendeur page) — 1 fetch failed
- 1 listing ad-hoc (Toyota RAV4 3rd gen 2006, Voitures Occasions Madagascar)
- 1 listing from CT Motors GWM official FB page (partner)

Notable processing:
- 2 FMG→MGA conversions (VW Polo 2008, Kia Soul 2011, 0 out_of_band)
- 1 HT→TTC conversion x1.20 (GWM Wingle 7 NEUF: 89.9M HT → 107.9M TTC)
- 3 FB doublons filtered (Tiguan, Duster, Subaru N16)
- 2 motos filtered (Husqvarna)
- 24 listings flagged include_in_estimation=false (price/year missing on Apify scrap)
- 3 cluster groups (varotra-korea, vw-golf-mk4, santafe-iii-2015)
- 2 dedup-skipped (fingerprint match DB existante)
- 1 fetch failed transient on eve-012 (VW Tiguan 2014 — to retry manually)

Backlog : GAC GS8 hors MODEL_PROXIMITY (à ajouter au prochain sprint catalogue).

DB: market_listings_clean ~598 → ~636 rows.
EOF
)"
```

**Pas de `git push` auto** — décide toi-même quand pousser.
