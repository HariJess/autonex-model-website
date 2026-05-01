# Ingestion reference profiles vague v1

Date génération: 2026-05-01T08:25:24.543Z
Pipeline: `scripts/data/build-reference-profiles.ts`

## 1. Résumé exécutif

- **Profils générés**: 109
  - Tier A (strong): 12
  - Tier B (moderate): 44
  - Tier C (anchor): 53
- **Marques couvertes**: 25
- **Lignes lues**: 5509
- **Lignes rejetées**: 4681
- **Doublons FB éliminés**: 288
- **Lignes écartées par cap vendeur**: 385

## 2. Stats par source

| Source | Lignes lues |
|---|---:|
| fb_scrap | 5351 |
| manual_structured | 97 |
| dealer | 61 |

### Détail par `source_detail`

| source_detail | Lignes lues |
|---|---:|
| fb_scrap_llm | 5016 |
| VAROTRA FIARAKODIA MADA (Apify scrape 2026-04-30) | 335 |
| template_simple_occasions_autonex_1.xlsx | 97 |
| CT_Motors (Neuf) | 32 |
| Oceantrade (Neuf) | 15 |
| Sodiama (Neuf) | 9 |
| CT_Motors (Occasion) | 5 |

### Rejets par code

| Code | Description | Count |
|---|---|---:|
| CAP | cap vendeur dépassé | 385 |
| R-DROP | — | 2 |
| R-GEN | année hors bucket générationnel (passe 4) | 6 |
| R1 | brand non mappable | 334 |
| R2 | prix hors bornes ou non parsable | 2754 |
| R3 | année hors bornes | 8 |
| R7 | année manquante (dealer Neuf si REJECT) | 904 |
| R8 | doublon FB | 288 |

## 3. Top 20 profils Tier A

| Marque | Modèle | Body | Baseline year | Baseline prix | Decay/an | Sample | CV |
|---|---|---|---:|---:|---:|---:|---:|
| Audi | Q5 | suv | 2013 | 50.2 MAr | 10.00 % | 9 | 18.3 % |
| Chevrolet | Captiva | suv | 2015 | 37.2 MAr | 10.00 % | 21 | 11.2 % |
| Chevrolet | Cruze | sedan | 2015 | 26.8 MAr | 10.00 % | 16 | 10.2 % |
| Hyundai | Starex | van | 2013 | 48.4 MAr | 10.00 % | 10 | 26.4 % |
| Hyundai | Terracan | suv | 2007 | 25.4 MAr | 6.03 % | 6 | 15.6 % |
| Hyundai | Tucson (2004-2015) | suv | 2012 | 39.5 MAr | 10.00 % | 12 | 26.1 % |
| Kia | Picanto | hatchback | 2014 | 25.7 MAr | 10.00 % | 14 | 24.1 % |
| Kia | Sportage | suv | 2019 | 56.0 MAr | 10.00 % | 22 | 24.6 % |
| Peugeot | 307 | sedan | 2007 | 15.5 MAr | 10.00 % | 5 | 22.4 % |
| SsangYong | Rexton | suv | 2014 | 36.1 MAr | 10.00 % | 9 | 23.0 % |
| Suzuki | Jimny (2019-2026) | suv | 2025 | 113.0 MAr | 10.00 % | 9 | 7.9 % |
| Volkswagen | Tiguan | suv | 2014 | 54.1 MAr | 10.00 % | 12 | 16.9 % |

## 4. Profils Tier C (faible confiance)

| Marque | Modèle | Body | Baseline year | Baseline prix | Decay/an | Sample | CV |
|---|---|---|---:|---:|---:|---:|---:|
| BMW | X6 | suv | 2013 | 74.8 MAr | 10.00 % | 3 | 71.5 % |
| Chery | QQ | hatchback | 2012 | 8.2 MAr | 10.00 % | 2 | 5.3 % |
| Chevrolet | Aveo | hatchback | 2010 | 14.8 MAr | 10.00 % | 2 | 10.1 % |
| Chevrolet | Matiz | hatchback | 2007 | 9.9 MAr | 10.00 % | 2 | 33.8 % |
| Citroen | C2 | hatchback | 2025 | 10.6 MAr | 10.00 % | 2 | 5.9 % |
| Citroen | C3 | hatchback | 2014 | 23.8 MAr | 10.00 % | 6 | 79.5 % |
| Ford | Escape | suv | 2013 | 37.0 MAr | 10.00 % | 2 | 33.7 % |
| Great Wall | Poer | pickup | 2025 | 169.9 MAr | 10.00 % | 3 | 12.8 % |
| Great Wall | Poer Kingkong | pickup | 2025 | 129.9 MAr | 10.00 % | 1 | 0.0 % |
| Great Wall | Tank 300 | suv | 2025 | 254.9 MAr | 10.00 % | 2 | 2.8 % |
| Great Wall | Tank 400 | suv | 2025 | 289.9 MAr | 10.00 % | 1 | 0.0 % |
| Great Wall | Tank 500 | suv | 2025 | 344.9 MAr | 10.00 % | 2 | 18.4 % |
| Great Wall | Tank 700 | suv | 2025 | 449.9 MAr | 10.00 % | 2 | 15.7 % |
| Great Wall | Wey 80 | suv | 2025 | 339.9 MAr | 10.00 % | 1 | 0.0 % |
| Great Wall | Wingle 7 | pickup | 2025 | 119.9 MAr | 10.00 % | 1 | 0.0 % |
| Haval | Dargo | suv | 2025 | 187.4 MAr | 10.00 % | 2 | 5.7 % |
| Haval | H6 GT | suv | 2025 | 199.9 MAr | 10.00 % | 1 | 0.0 % |
| Haval | Ora Good Cat | other | 2025 | 189.9 MAr | 10.00 % | 1 | 0.0 % |
| Hyundai | i20 | hatchback | 2023 | 42.9 MAr | 10.00 % | 2 | 58.7 % |
| Hyundai | i40 | sedan | 2016 | 38.9 MAr | 10.00 % | 2 | 18.4 % |
| Hyundai | Maxcruz | suv | 2014 | 63.4 MAr | 10.00 % | 2 | 0.0 % |
| Hyundai | Veloster | coupe | 2014 | 33.9 MAr | 10.00 % | 2 | 9.2 % |
| Isuzu | MU-X | suv | 2025 | 258.2 MAr | 10.00 % | 1 | 0.0 % |
| Jeep | Cherokee | suv | 2002 | 31.7 MAr | 10.00 % | 4 | 67.0 % |
| Jeep | Grand Cherokee | suv | 2018 | 160.6 MAr | 10.00 % | 2 | 25.2 % |
| Jetta | VS5 | suv | 2025 | 116.5 MAr | 10.00 % | 1 | 0.0 % |
| Kia | Rio | other | 2010 | 28.5 MAr | 10.00 % | 2 | 12.4 % |
| Mahindra | Scorpio | pickup | 2024 | 125.0 MAr | 10.00 % | 1 | 0.0 % |
| Mahindra | XUV300 | other | 2024 | 125.0 MAr | 10.00 % | 1 | 0.0 % |
| Mazda | CX-30 | suv | 2025 | 144.8 MAr | 10.00 % | 2 | 4.9 % |
| Mazda | CX-60 | suv | 2025 | 249.8 MAr | 10.00 % | 1 | 0.0 % |
| Mazda | CX-90 | suv | 2025 | 289.8 MAr | 10.00 % | 2 | 19.5 % |
| Mercedes-Benz | B200 Cdi | hatchback | 2008 | 29.5 MAr | 10.00 % | 2 | 6.3 % |
| Mercedes-Benz | C200 | sedan | 2003 | 33.9 MAr | 10.00 % | 2 | 46.1 % |
| Mini | Cooper | coupe | 2008 | 20.2 MAr | 10.00 % | 2 | 24.6 % |
| Mitsubishi | Pajero | suv | 2015 | 57.6 MAr | 10.00 % | 2 | 72.3 % |
| Mitsubishi | Pajero Sport | suv | 2017 | 83.6 MAr | 10.00 % | 2 | 67.0 % |
| Mitsubishi | Starex | van | 2004 | 22.5 MAr | 10.00 % | 2 | 0.0 % |
| Peugeot | 206 | hatchback | 2004 | 15.2 MAr | 10.00 % | 2 | 26.5 % |
| Peugeot | 3008 | suv | 2021 | 67.1 MAr | 10.00 % | 2 | 25.5 % |
| Peugeot | 308 | sedan | 2010 | 11.9 MAr | 10.00 % | 2 | 72.6 % |
| Peugeot | 309 | hatchback | 1992 | 7.9 MAr | 10.00 % | 2 | 0.0 % |
| Renault | Avantime | van | 2002 | 8.4 MAr | 10.00 % | 2 | 7.4 % |
| Renault | Koleos | suv | 2015 | 37.4 MAr | 10.00 % | 2 | 8.3 % |
| Renault | Scenic | van | 2004 | 11.7 MAr | 10.00 % | 2 | 2.7 % |
| Suzuki | Intruder 750 | other | 1997 | 10.6 MAr | 10.00 % | 2 | 0.0 % |
| Toyota | Fortuner | suv | 2014 | 127.6 MAr | 10.00 % | 3 | 67.0 % |
| Toyota | Prado | suv | 2008 | 77.9 MAr | 10.00 % | 4 | 67.7 % |
| Volkswagen | Amarok | pickup | 2025 | 232.5 MAr | 10.00 % | 6 | 16.2 % |
| Volkswagen | Caddy | van | 2007 | 16.7 MAr | 10.00 % | 2 | 44.7 % |
| Volkswagen | Jetta | other | 2016 | 28.6 MAr | 10.00 % | 2 | 45.7 % |
| Volkswagen | T-Cross | other | 2025 | 150.0 MAr | 10.00 % | 1 | 0.0 % |
| Volkswagen | Touareg (2015-2026) | suv | 2025 | 500.0 MAr | 10.00 % | 3 | 65.2 % |

## 5. Marques absentes / sous-représentées

Marques blacklistées vague 1 (calibrées mais retirées du seed, 8 profil(s) écarté(s)) :

- Brilliance _(blacklistée vague 1, hors catalogue UI)_
- Enranger _(blacklistée vague 1, hors catalogue UI)_
- Kaiyi _(blacklistée vague 1, hors catalogue UI)_

Autres marques canoniques sans profil calibré :

- Honda
- Land Rover
- Subaru
- Volvo
- Lexus
- Jaguar
- Porsche
- BYD
- Geely
- MG
- Tata
- Daihatsu
- Opel
- Fiat
- Skoda
- SEAT
- Dacia
- Acura
- Alfa Romeo
- Infiniti
- Lifan
- Foton
- JAC
- JMC
- DFSK
- Datsun
- Lada
- Smart
- Oceantrade

## 6. Top vendeurs FB cappés

| Seller | Annonces écartées |
|---|---:|
| Fabien Cars | 29 |
| Her Ny Aina | 26 |
| Dadan'i TK | 23 |
| Lolitah De Haziel | 18 |
| Stuart AR | 15 |
| Hasnain Ali Raza | 15 |
| Ne Akbaraly | 13 |
| Andrianjatovo Ando Tanjona | 13 |
| Tantely Rasamison | 12 |
| Afera Milay | 12 |

## 7. Coefficients appliqués

```json
{
  "version": "v1",
  "fb_listing_to_transaction": -0.12,
  "max_listings_per_seller": 5,
  "filters": {
    "min_price_ar": 3000000,
    "max_price_ar": 1500000000,
    "min_year": 1985,
    "max_year": 2026,
    "min_km": 0,
    "max_km": 500000
  },
  "calibration": {
    "min_observations_for_strong_profile": 5,
    "min_observations_for_weak_profile": 3,
    "min_year_range_for_decay_calibration": 3,
    "default_annual_depreciation_rate": 0.1,
    "max_cv_for_acceptance": 0.65,
    "comment_cv": "Coefficient de variation. Sur le marché Mada le CV est naturellement élevé (état véhicules très hétérogène TBE/TBN/à retaper). 0.65 permet d'accepter Hilux/L200/Serie3/Picanto/Patrol etc. tout en flaggant tier B (qualité moyenne, fourchette élargie)."
  },
  "decay_clip_range": [
    0.04,
    0.2
  ],
  "dealer_neuf_year_default": "ASSUME_CURRENT_YEAR"
}
```

## 8. Cohérence catalogue UI

Marques canoniques vérifiées contre `src/data/vehicleUiCatalog.ts`: 25.
Divergences (warning) :
- Marque `SsangYong` absente du catalogue UI

## 9. Termes inconnus loggés

- Marques non reconnues: 81
- Modèles non reconnus: 390
- Détail: `scripts/data/output/unknown_terms.csv`

## 10. Profils non finalisables

Total: 146 (sample insuffisant ou aucun ancrage)
Détail: `scripts/data/output/unfinishable_profiles.csv`

## 10b. Profils rejetés par filtres qualité (passe 3)

Total: 15

Répartition par cause :
- CV_TOO_HIGH : 8
- MODEL_BLACKLISTED : 3
- PRICE_BELOW_FLOOR : 2
- YEAR_SPAN_TOO_WIDE : 2

| Marque | Modèle | Baseline | Sample | CV | Span | Raison |
|---|---|---:|---:|---:|---:|---|
| BMW | X3 | 16.9 MAr | 4 | 107.3 % | 1 | CV_TOO_HIGH |
| Chevrolet | Malibu | 33.2 MAr | 4 | 108.2 % | 1 | CV_TOO_HIGH |
| Great Wall | Wingle 5 | 55.3 MAr | 6 | 109.7 % | 4 | CV_TOO_HIGH |
| Hyundai | Tucson (2016-2026) | 127.6 MAr | 3 | 147.2 % | 3 | CV_TOO_HIGH |
| Mercedes-Benz | GLK | 28.0 MAr | 2 | 94.3 % | 0 | CV_TOO_HIGH |
| Nissan | X-Trail | 22.4 MAr | 4 | 103.0 % | 16 | CV_TOO_HIGH |
| Toyota | Highlander | 20.1 MAr | 2 | 104.2 % | 0 | CV_TOO_HIGH |
| Volkswagen | T-roc R-line | 105.4 MAr | 2 | 94.3 % | 0 | CV_TOO_HIGH |
| Kia | Pride | 21.1 MAr | 21 | 77.4 % | 20 | MODEL_BLACKLISTED |
| Land Rover | Range Rover Evoque | 84.5 MAr | 6 | 57.2 % | 1 | MODEL_BLACKLISTED |
| Renault | Trafic | 11.6 MAr | 4 | 77.0 % | 0 | MODEL_BLACKLISTED |
| Mitsubishi | L200 | 37.1 MAr | 18 | 59.8 % | 20 | PRICE_BELOW_FLOOR |
| Renault | Oroch | 44.0 MAr | 2 | 0.0 % | 0 | PRICE_BELOW_FLOOR |
| BMW | Serie 3 | 56.4 MAr | 11 | 55.5 % | 28 | YEAR_SPAN_TOO_WIDE |
| Volkswagen | Golf | 49.4 MAr | 10 | 75.9 % | 29 | YEAR_SPAN_TOO_WIDE |

## 10c. Profils générationnels (passe 4)

Total : 10 profil(s) issus de bucketing générationnel.
Lignes rejetées car année hors bucket (code R-GEN) : 6.

| Marque | Modèle (gen) | Sample | Baseline | Tier |
|---|---|---:|---:|---|
| Hyundai | Santa Fe (2001-2018) | 22 | 49.8 MAr | B_moderate |
| Hyundai | Tucson (2004-2015) | 12 | 39.5 MAr | A_strong |
| Nissan | Navara (2016-2026) | 3 | 140.8 MAr | B_moderate |
| Nissan | NP300 (2005-2015) | 7 | 9.6 MAr | B_moderate |
| Nissan | Patrol (1995-2010) | 5 | 137.1 MAr | B_moderate |
| Nissan | Patrol (2011-2026) | 3 | 240.0 MAr | B_moderate |
| Renault | Clio (2005-2014) | 4 | 22.2 MAr | B_moderate |
| Suzuki | Jimny (2019-2026) | 9 | 113.0 MAr | A_strong |
| Volkswagen | Touareg (2002-2014) | 4 | 29.0 MAr | B_moderate |
| Volkswagen | Touareg (2015-2026) | 3 | 500.0 MAr | C_anchor |

Buckets sans assez d'observations (rejetés en `INSUFFICIENT_BUCKET_OBS`) :

- Nissan Navara (2005-2015) — sample=2, INSUFFICIENT_BUCKET_OBS (sample=2 < min_obs=3 pour bucket 2005-2015)
- Renault Clio (2015-2026) — sample=1, INSUFFICIENT_BUCKET_OBS (sample=1 < min_obs=3 pour bucket 2015-2026)
- Suzuki Jimny (1998-2018) — sample=2, INSUFFICIENT_BUCKET_OBS (sample=2 < min_obs=5 pour bucket 1998-2018)

## 10d. Outliers rejetés par filtre MAD (passe 5)

Total : 23 observation(s) rejetée(s) sur 14 profil(s) calibré(s).
Méthode : mad_modified_zscore, threshold = 3.5, min_obs = 5, max_outlier_pct = 0.2.

| Marque | Modèle | Vendeur | Année | Prix observé | Médiane profil | Modified Z |
|---|---|---|---:|---:|---:|---:|
| Kia | Sportage | Jarëd Business | 2013 | 440.0 MAr | 37.4 MAr | 58.78 |
| Chevrolet | Captiva | Inona No Masaka Ao | 2009 | 96.8 MAr | 34.1 MAr | 21.36 |
| Chevrolet | Captiva | Faniry Rakoto | 2007 | 88.0 MAr | 34.1 MAr | 18.36 |
| Suzuki | Jimny (2019-2026) | Michael Ford | 2023 | 20.2 MAr | 116.0 MAr | 16.65 |
| Toyota | RAV4 | ? | 2019 | 170.0 MAr | 26.4 MAr | 15.72 |
| Kia | Sportage | Samoely Ramiliarijaona | 2006 | 110.0 MAr | 37.4 MAr | 10.60 |
| Hyundai | Santa Fe (2001-2018) | Anjara Ran | 2013 | 246.4 MAr | 40.5 MAr | 9.28 |
| Chevrolet | Cruze | Fabien Cars | 2011 | 4.0 MAr | 24.3 MAr | 6.49 |
| Toyota | RAV4 | ? | 2014 | 85.0 MAr | 26.4 MAr | 6.42 |
| Volkswagen | Touareg (2002-2014) | Auto Select Occasion MG | 2013 | 78.8 MAr | 29.9 MAr | 6.24 |
| Kia | Picanto | Feedontheword Feed | 2012 | 4.0 MAr | 23.8 MAr | 5.04 |
| Kia | Picanto | Haja Keli | 2012 | 4.9 MAr | 23.8 MAr | 4.81 |
| Toyota | Land Cruiser | Sarah Sarah | 2025 | 509.5 MAr | 187.4 MAr | 4.23 |
| Peugeot | 307 | ? | 2007 | 28.0 MAr | 11.9 MAr | 4.12 |
| Chevrolet | Captiva | Harmine Neny | 2007 | 22.2 MAr | 34.1 MAr | 4.06 |
| Toyota | Land Cruiser | Liinaa Asgaraly | 2025 | 484.0 MAr | 187.4 MAr | 3.89 |
| Toyota | Land Cruiser | Ne Akbaraly | 2025 | 484.0 MAr | 187.4 MAr | 3.89 |
| Toyota | Land Cruiser | Hassan Aly | 2025 | 484.0 MAr | 187.4 MAr | 3.89 |
| Hyundai | Terracan | Tahin Rnv | 2003 | 6.3 MAr | 31.7 MAr | 3.89 |
| Nissan | Qashqai | Andrimahenintsoa Todisoa Rkt | 2008 | 22.0 MAr | 65.0 MAr | 3.72 |
| Volkswagen | Tiguan | Giovanni Rakotoson | 2010 | 7.9 MAr | 43.6 MAr | 3.64 |
| Volkswagen | Tiguan | Car for sell | 2012 | 8.6 MAr | 43.6 MAr | 3.57 |
| Audi | Q5 | ? | 2015 | 95.0 MAr | 51.0 MAr | 3.55 |

## 11. Migrations SQL

- **Métadonnées (idempotente)**: `supabase/migrations/20260430130703_extend_reference_profiles_metadata.sql`
- **Seed profils (upsert)**: `supabase/migrations/20260430130704_seed_reference_profiles_v1.sql`

À coller dans Supabase Studio → SQL Editor (métadonnées d'abord, puis seed).

## 12. Commande pour relancer

```bash
npx tsx scripts/data/build-reference-profiles.ts
```
