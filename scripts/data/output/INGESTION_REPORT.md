# Ingestion reference profiles vague v1

Date génération: 2026-05-02T09:31:57.771Z
Pipeline: `scripts/data/build-reference-profiles.ts`

## 1. Résumé exécutif

- **Profils générés**: 134
  - Tier A (strong): 14
  - Tier B (moderate): 56
  - Tier C (anchor): 64
- **Marques couvertes**: 27
- **Lignes lues**: 5800
- **Lignes rejetées**: 4693
- **Doublons FB éliminés**: 287
- **Lignes écartées par cap vendeur**: 383

## 2. Stats par source

| Source | Lignes lues |
|---|---:|
| fb_scrap | 5351 |
| manual_structured | 97 |
| dealer | 61 |
| dealer_official | 118 |
| expert_curated | 97 |
| manual_curated | 76 |

### Détail par `source_detail`

| source_detail | Lignes lues |
|---|---:|
| fb_scrap_llm | 5016 |
| VAROTRA FIARAKODIA MADA (Apify scrape 2026-04-30) | 335 |
| dealer_template_dealer_official | 118 |
| template_simple_occasions_autonex_1.xlsx | 97 |
| dealer_template_expert_curated | 97 |
| manual_batch1_2026-05-01.csv | 53 |
| CT_Motors (Neuf) | 32 |
| manual_batch3_2026-05-01.csv | 20 |
| Oceantrade (Neuf) | 15 |
| Sodiama (Neuf) | 9 |
| CT_Motors (Occasion) | 5 |
| manual_batch2_2026-05-01.csv | 3 |

### Rejets par code

| Code | Description | Count |
|---|---|---:|
| CAP | cap vendeur dépassé | 383 |
| R-DROP | — | 2 |
| R-FLOOR-PREMIUM | obs sous le plancher de plausibilité segment (Sprint 8.1) | 7 |
| R-GEN | année hors bucket générationnel (passe 4) | 9 |
| R1 | brand non mappable | 334 |
| R2 | prix hors bornes ou non parsable | 2754 |
| R3 | année hors bornes | 8 |
| R7 | année manquante (dealer Neuf si REJECT) | 909 |
| R8 | doublon FB | 287 |

## 3. Top 20 profils Tier A

| Marque | Modèle | Body | Baseline year | Baseline prix | Decay/an | Sample | CV |
|---|---|---|---:|---:|---:|---:|---:|
| Chevrolet | Captiva | suv | 2015 | 37.4 MAr | 10.00 % | 24 | 9.8 % |
| Chevrolet | Cruze | sedan | 2015 | 26.7 MAr | 10.00 % | 18 | 9.7 % |
| Haval | Jolion | suv | 2025 | 126.3 MAr | 12.72 % | 7 | 17.3 % |
| Hyundai | iX35 | suv | 2014 | 28.1 MAr | 10.00 % | 10 | 18.8 % |
| Hyundai | Starex | van | 2013 | 49.4 MAr | 7.10 % | 11 | 29.6 % |
| Hyundai | Terracan | suv | 2007 | 25.4 MAr | 10.00 % | 6 | 15.6 % |
| Hyundai | Tucson (2004-2015) | suv | 2012 | 40.0 MAr | 10.27 % | 14 | 24.9 % |
| Kia | Picanto | hatchback | 2014 | 25.5 MAr | 10.00 % | 15 | 25.7 % |
| Kia | Sportage | suv | 2019 | 56.6 MAr | 5.61 % | 28 | 27.7 % |
| Mazda | CX-30 | suv | 2025 | 136.9 MAr | 9.46 % | 5 | 18.7 % |
| Renault | Clio (2005-2014) | hatchback | 2013 | 23.1 MAr | 6.09 % | 6 | 24.5 % |
| SsangYong | Rexton | suv | 2014 | 37.4 MAr | 5.47 % | 10 | 23.5 % |
| Suzuki | Jimny (2019-2026) | suv | 2025 | 115.1 MAr | 10.00 % | 12 | 7.6 % |
| Volkswagen | Tiguan | suv | 2014 | 54.1 MAr | 6.58 % | 12 | 16.9 % |

## 4. Profils Tier C (faible confiance)

| Marque | Modèle | Body | Baseline year | Baseline prix | Decay/an | Sample | CV |
|---|---|---|---:|---:|---:|---:|---:|
| Audi | A3 | sedan | 2009 | 64.6 MAr | 10.00 % | 3 | 32.3 % |
| BMW | X6 | suv | 2013 | 94.0 MAr | 10.00 % | 4 | 18.0 % |
| Chery | QQ | hatchback | 2012 | 8.2 MAr | 10.00 % | 2 | 5.3 % |
| Chevrolet | Aveo | hatchback | 2010 | 14.8 MAr | 10.00 % | 2 | 10.1 % |
| Chevrolet | Malibu | sedan | 2016 | 32.3 MAr | 10.00 % | 4 | 31.4 % |
| Chevrolet | Matiz | hatchback | 2007 | 9.9 MAr | 10.00 % | 2 | 33.8 % |
| Citroen | C2 | hatchback | 2025 | 10.6 MAr | 10.00 % | 2 | 5.9 % |
| Citroen | DS3 | other | 2014 | 53.6 MAr | 10.00 % | 2 | 3.6 % |
| Citroen | DS4 | other | 2014 | 58.5 MAr | 10.00 % | 2 | 3.6 % |
| Citroen | DS5 | other | 2016 | 65.3 MAr | 10.00 % | 2 | 3.6 % |
| Ford | Escape | suv | 2013 | 37.0 MAr | 10.00 % | 2 | 33.7 % |
| Ford | Fiesta | hatchback | 2011 | 19.8 MAr | 10.00 % | 2 | 28.3 % |
| Great Wall | Poer | pickup | 2025 | 169.9 MAr | 10.00 % | 6 | 11.4 % |
| Great Wall | Poer Kingkong | pickup | 2025 | 129.9 MAr | 10.00 % | 2 | 0.0 % |
| Great Wall | Tank 300 | suv | 2025 | 254.9 MAr | 10.00 % | 4 | 2.3 % |
| Great Wall | Tank 400 | suv | 2025 | 289.9 MAr | 10.00 % | 2 | 0.0 % |
| Great Wall | Tank 500 | suv | 2025 | 344.9 MAr | 10.00 % | 4 | 15.1 % |
| Great Wall | Tank 700 | suv | 2025 | 449.9 MAr | 10.00 % | 4 | 12.8 % |
| Great Wall | Wey 80 | suv | 2025 | 339.9 MAr | 10.00 % | 2 | 0.0 % |
| Great Wall | Wingle 5 (Neuf) | pickup | 2025 | 99.9 MAr | 10.00 % | 4 | 5.8 % |
| Great Wall | Wingle 7 | pickup | 2025 | 119.9 MAr | 10.00 % | 2 | 0.0 % |
| Haval | Dargo | suv | 2025 | 187.4 MAr | 10.00 % | 4 | 4.6 % |
| Haval | H6 GT | suv | 2025 | 199.9 MAr | 10.00 % | 2 | 0.0 % |
| Haval | Ora Good Cat | other | 2025 | 189.9 MAr | 10.00 % | 2 | 0.0 % |
| Honda | CR-V | suv | 2014 | 59.5 MAr | 10.00 % | 2 | 5.4 % |
| Hyundai | i20 | hatchback | 2023 | 42.9 MAr | 10.00 % | 2 | 58.7 % |
| Hyundai | Maxcruz | suv | 2014 | 63.4 MAr | 10.00 % | 2 | 0.0 % |
| Hyundai | Veloster | coupe | 2014 | 33.9 MAr | 10.00 % | 2 | 9.2 % |
| Isuzu | D-Max (Neuf) | pickup | 2025 | 190.7 MAr | 10.00 % | 4 | 13.6 % |
| Jetta | VS5 | suv | 2025 | 128.2 MAr | 10.00 % | 2 | 12.9 % |
| Land Rover | 110 | suv | 2006 | 165.8 MAr | 10.00 % | 2 | 3.6 % |
| Land Rover | 90 | suv | 1998 | 107.3 MAr | 10.00 % | 2 | 3.6 % |
| Mahindra | Scorpio | pickup | 2024 | 125.0 MAr | 10.00 % | 2 | 0.0 % |
| Mahindra | XUV300 | other | 2024 | 125.0 MAr | 10.00 % | 2 | 0.0 % |
| Mazda | BT-50 (Neuf) | pickup | 2025 | 210.7 MAr | 10.00 % | 2 | 12.9 % |
| Mazda | CX-9 | suv | 2019 | 135.0 MAr | 10.00 % | 2 | 15.7 % |
| Mazda | CX-90 | suv | 2025 | 289.8 MAr | 10.00 % | 4 | 15.9 % |
| Mercedes-Benz | A200 | other | 2002 | 25.4 MAr | 10.00 % | 2 | 3.6 % |
| Mercedes-Benz | B200 Cdi | hatchback | 2008 | 29.5 MAr | 10.00 % | 2 | 6.3 % |
| Mercedes-Benz | C200 | sedan | 2002 | 42.8 MAr | 10.00 % | 3 | 33.0 % |
| Mercedes-Benz | E200 | sedan | 2004 | 39.0 MAr | 10.00 % | 2 | 3.6 % |
| Mercedes-Benz | GLE | suv | 2015 | 175.9 MAr | 10.00 % | 2 | 49.4 % |
| Mercedes-Benz | GLK | suv | 2011 | 51.7 MAr | 10.00 % | 2 | 13.9 % |
| Mercedes-Benz | ML | suv | 2009 | 63.4 MAr | 10.00 % | 2 | 3.6 % |
| Mitsubishi | Pajero Sport | suv | 2017 | 83.6 MAr | 10.00 % | 2 | 67.0 % |
| Mitsubishi | Starex | van | 2004 | 22.5 MAr | 10.00 % | 2 | 0.0 % |
| Peugeot | 2008 | suv | 2013 | 36.1 MAr | 10.00 % | 2 | 3.6 % |
| Peugeot | 207 | other | 2010 | 24.4 MAr | 10.00 % | 2 | 3.6 % |
| Peugeot | 208 | other | 2014 | 43.9 MAr | 10.00 % | 2 | 3.6 % |
| Peugeot | 309 | hatchback | 1992 | 7.9 MAr | 10.00 % | 2 | 0.0 % |
| Renault | Avantime | van | 2002 | 8.4 MAr | 10.00 % | 2 | 7.4 % |
| Renault | Duster (Neuf) | suv | 2025 | 107.3 MAr | 10.00 % | 2 | 12.9 % |
| Renault | Koleos | suv | 2015 | 37.4 MAr | 10.00 % | 2 | 8.3 % |
| Renault | Scenic | van | 2004 | 11.7 MAr | 10.00 % | 2 | 2.7 % |
| Suzuki | Intruder 750 | other | 1997 | 10.6 MAr | 10.00 % | 2 | 0.0 % |
| Suzuki | Swift | other | 2012 | 63.4 MAr | 10.00 % | 2 | 3.6 % |
| Toyota | Land Cruiser (Neuf) | suv | 2025 | 450.0 MAr | 10.00 % | 1 | 0.0 % |
| Toyota | Prado | suv | 2008 | 77.9 MAr | 10.00 % | 4 | 67.7 % |
| Volkswagen | Amarok (Neuf) | pickup | 2025 | 267.5 MAr | 10.00 % | 8 | 13.2 % |
| Volkswagen | Amarok (Occasion) | pickup | 2025 | 225.2 MAr | 10.00 % | 5 | 5.8 % |
| Volkswagen | Caddy | van | 2007 | 16.7 MAr | 10.00 % | 2 | 44.7 % |
| Volkswagen | Jetta | other | 2016 | 28.6 MAr | 10.00 % | 2 | 45.7 % |
| Volkswagen | T-Cross | other | 2025 | 150.0 MAr | 10.00 % | 2 | 0.0 % |
| Volkswagen | Touareg (2015-2026) | suv | 2025 | 522.5 MAr | 10.00 % | 5 | 4.8 % |

## 5. Marques absentes / sous-représentées

Marques blacklistées vague 1 (calibrées mais retirées du seed, 8 profil(s) écarté(s)) :

- Brilliance _(blacklistée vague 1, hors catalogue UI)_
- Enranger _(blacklistée vague 1, hors catalogue UI)_
- Kaiyi _(blacklistée vague 1, hors catalogue UI)_

Autres marques canoniques sans profil calibré :

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
| Tantely Rasamison | 12 |
| Andrianjatovo Ando Tanjona | 12 |
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

Marques canoniques vérifiées contre `src/data/vehicleUiCatalog.ts`: 27.
Divergences (warning) :
- Marque `SsangYong` absente du catalogue UI

## 9. Termes inconnus loggés

- Marques non reconnues: 81
- Modèles non reconnus: 403
- Détail: `scripts/data/output/unknown_terms.csv`

## 10. Profils non finalisables

Total: 141 (sample insuffisant ou aucun ancrage)
Détail: `scripts/data/output/unfinishable_profiles.csv`

## 10b. Profils rejetés par filtres qualité (passe 3)

Total: 15

Répartition par cause :
- CV_TOO_HIGH : 11
- MODEL_BLACKLISTED : 2
- PRICE_BELOW_FLOOR : 1
- YEAR_SPAN_TOO_WIDE : 1

| Marque | Modèle | Baseline | Sample | CV | Span | Raison |
|---|---|---:|---:|---:|---:|---|
| BMW | X3 | 144.1 MAr | 7 | 81.2 % | 13 | CV_TOO_HIGH |
| Citroen | C3 | 39.6 MAr | 6 | 79.5 % | 9 | CV_TOO_HIGH |
| Great Wall | Wingle 5 (Occasion) | 12.7 MAr | 4 | 77.0 % | 0 | CV_TOO_HIGH |
| Hyundai | Tucson (2016-2026) | 127.6 MAr | 3 | 147.2 % | 3 | CV_TOO_HIGH |
| Nissan | X-Trail | 63.8 MAr | 6 | 83.7 % | 16 | CV_TOO_HIGH |
| Peugeot | 308 | 11.9 MAr | 2 | 72.6 % | 0 | CV_TOO_HIGH |
| Renault | Trafic | 11.6 MAr | 4 | 77.0 % | 0 | CV_TOO_HIGH |
| Toyota | Highlander | 20.1 MAr | 2 | 104.2 % | 0 | CV_TOO_HIGH |
| Toyota | RAV4 | 127.3 MAr | 16 | 91.4 % | 23 | CV_TOO_HIGH |
| Volkswagen | Golf | 49.4 MAr | 10 | 75.9 % | 29 | CV_TOO_HIGH |
| Volkswagen | T-roc R-line | 105.4 MAr | 2 | 94.3 % | 0 | CV_TOO_HIGH |
| Kia | Pride | 21.0 MAr | 19 | 26.6 % | 20 | MODEL_BLACKLISTED |
| Land Rover | Range Rover Evoque | 92.2 MAr | 7 | 9.8 % | 1 | MODEL_BLACKLISTED |
| Renault | Oroch | 44.0 MAr | 2 | 0.0 % | 0 | PRICE_BELOW_FLOOR |
| BMW | Serie 3 | 59.6 MAr | 15 | 58.3 % | 28 | YEAR_SPAN_TOO_WIDE |

## 10c. Profils générationnels (passe 4)

Total : 11 profil(s) issus de bucketing générationnel.
Lignes rejetées car année hors bucket (code R-GEN) : 9.

| Marque | Modèle (gen) | Sample | Baseline | Tier |
|---|---|---:|---:|---|
| Hyundai | Santa Fe (2001-2018) | 25 | 48.5 MAr | B_moderate |
| Hyundai | Tucson (2004-2015) | 14 | 40.0 MAr | A_strong |
| Nissan | Navara (2005-2015) | 4 | 43.1 MAr | B_moderate |
| Nissan | Navara (2016-2026) | 4 | 144.0 MAr | B_moderate |
| Nissan | NP300 (2005-2015) | 8 | 11.7 MAr | B_moderate |
| Nissan | Patrol (1995-2010) | 6 | 147.2 MAr | B_moderate |
| Nissan | Patrol (2011-2026) | 8 | 327.3 MAr | B_moderate |
| Renault | Clio (2005-2014) | 6 | 23.1 MAr | A_strong |
| Suzuki | Jimny (2019-2026) | 12 | 115.1 MAr | A_strong |
| Volkswagen | Touareg (2002-2014) | 7 | 84.9 MAr | B_moderate |
| Volkswagen | Touareg (2015-2026) | 5 | 522.5 MAr | C_anchor |

Buckets sans assez d'observations (rejetés en `INSUFFICIENT_BUCKET_OBS`) :

- Renault Clio (2015-2026) — sample=2, INSUFFICIENT_BUCKET_OBS (sample=2 < min_obs=3 pour bucket 2015-2026)
- Suzuki Jimny (1998-2018) — sample=2, INSUFFICIENT_BUCKET_OBS (sample=2 < min_obs=5 pour bucket 1998-2018)

## 10d. Outliers rejetés par filtre MAD (passe 5)

Total : 34 observation(s) rejetée(s) sur 20 profil(s) calibré(s).
Méthode : mad_modified_zscore, threshold = 3.5, min_obs = 5, max_outlier_pct = 0.2.

| Marque | Modèle | Vendeur | Année | Prix observé | Médiane profil | Modified Z |
|---|---|---|---:|---:|---:|---:|
| Kia | Sportage | Jarëd Business | 2013 | 440.0 MAr | 37.0 MAr | 53.73 |
| Chevrolet | Captiva | Inona No Masaka Ao | 2009 | 96.8 MAr | 34.3 MAr | 23.94 |
| Chevrolet | Malibu | Printsy Nomena | 2015 | 154.0 MAr | 34.2 MAr | 21.04 |
| Chevrolet | Captiva | Faniry Rakoto | 2007 | 88.0 MAr | 34.3 MAr | 20.57 |
| Kia | Pride | Laza Rafanomezantsoa | 2010 | 101.2 MAr | 21.6 MAr | 19.05 |
| Hyundai | i30 | Prestige Occasion | 2021 | 175.6 MAr | 22.9 MAr | 12.32 |
| Volkswagen | Touareg (2015-2026) | Ni Aina | 2015 | 95.9 MAr | 511.3 MAr | 11.21 |
| Suzuki | Jimny (2019-2026) | Michael Ford | 2023 | 20.2 MAr | 115.0 MAr | 11.12 |
| Jeep | Wrangler | Prestige Occasion | 2021 | 294.3 MAr | 92.6 MAr | 10.75 |
| Audi | Q5 | Prestige Occasion | 2020 | 237.3 MAr | 52.8 MAr | 10.10 |
| Chevrolet | Cruze | Fabien Cars | 2011 | 4.0 MAr | 25.0 MAr | 10.07 |
| Kia | Sportage | Samoely Ramiliarijaona | 2006 | 110.0 MAr | 37.0 MAr | 9.74 |
| Hyundai | Santa Fe (2001-2018) | Anjara Ran | 2013 | 246.4 MAr | 37.5 MAr | 8.73 |
| Mazda | CX-3 | OceanTrade | 2018 | 75.0 MAr | 61.6 MAr | 7.29 |
| Nissan | Navara (2016-2026) | Prestige Occasion | 2024 | 61.6 MAr | 140.8 MAr | 6.07 |
| Kia | Picanto | Feedontheword Feed | 2012 | 4.0 MAr | 23.8 MAr | 5.04 |
| Kia | Picanto | Haja Keli | 2012 | 4.9 MAr | 23.8 MAr | 4.81 |
| Chevrolet | Captiva | Harmine Neny | 2007 | 22.2 MAr | 34.3 MAr | 4.65 |
| Mazda | CX-30 | OceanTrade | 2021 | 75.0 MAr | 139.8 MAr | 4.37 |
| Kia | Pride | Issayah Bnd | 2021 | 3.4 MAr | 21.6 MAr | 4.36 |
| Kia | Pride | ? | 2016 | 39.0 MAr | 21.6 MAr | 4.16 |
| Toyota | Land Cruiser (Occasion) | Akbaraly Akbaraly | 2025 | 522.5 MAr | 191.8 MAr | 4.08 |
| Chevrolet | Captiva | ? | 2007 | 23.8 MAr | 34.3 MAr | 4.05 |
| Ford | Ranger | OceanTrade | 2022 | 320.0 MAr | 112.2 MAr | 3.96 |
| Toyota | Land Cruiser (Occasion) | Sarah Sarah | 2025 | 509.5 MAr | 191.8 MAr | 3.92 |
| Hyundai | Terracan | Tahin Rnv | 2003 | 6.3 MAr | 31.7 MAr | 3.89 |
| Kia | Pride | ? | 2016 | 37.0 MAr | 21.6 MAr | 3.69 |
| Chevrolet | Spark | ? | 2010 | 28.0 MAr | 18.5 MAr | 3.65 |
| Volkswagen | Tiguan | Giovanni Rakotoson | 2010 | 7.9 MAr | 43.6 MAr | 3.64 |
| Toyota | Land Cruiser (Occasion) | Liinaa Asgaraly | 2025 | 484.0 MAr | 191.8 MAr | 3.61 |
| Toyota | Land Cruiser (Occasion) | Ne Akbaraly | 2025 | 484.0 MAr | 191.8 MAr | 3.61 |
| Toyota | Land Cruiser (Occasion) | Hassan Aly | 2025 | 484.0 MAr | 191.8 MAr | 3.61 |
| Chevrolet | Captiva | ? | 2007 | 25.0 MAr | 34.3 MAr | 3.57 |
| Volkswagen | Tiguan | Car for sell | 2012 | 8.6 MAr | 43.6 MAr | 3.57 |

## 10e. Profils splittés Neuf/Occasion (passe 6)

Total : 6 modèle(s) splitté(s).

| Marque | Modèle original | n_dealer | n_fb | → Neuf baseline | → Occasion baseline | Decay neuf | Decay occasion |
|---|---|---:|---:|---:|---:|---:|---:|
| Great Wall | Wingle 5 | 4 | 4 | 99.9 MAr (2025) | — | 10.0 % | — |
| Isuzu | D-Max | 4 | 11 | 190.7 MAr (2025) | 99.4 MAr (2025) | 10.0 % | 5.4 % * |
| Mazda | BT-50 | 2 | 16 | 210.7 MAr (2025) | 146.4 MAr (2025) | 10.0 % | 8.8 % * |
| Renault | Duster | 2 | 11 | 107.3 MAr (2025) | 61.5 MAr (2022) | 10.0 % | 6.4 % * |
| Toyota | Land Cruiser | 1 | 40 | 450.0 MAr (2025) | 241.6 MAr (2024) | 10.0 % | 4.1 % * |
| Volkswagen | Amarok | 8 | 5 | 267.5 MAr (2025) | 225.2 MAr (2025) | 10.0 % | 10.0 % |

*`*` = decay calibré par régression log-linéaire (passe 7), sinon default 10 %.*

## 10f. Decays calibrés vs default (passe 7)

Total : 40 profil(s) avec decay calibré, 94 profil(s) avec decay default.

Top decays calibrés (les plus éloignés du 10% générique) :

| Marque | Modèle | Decay calibré | R² | Sample | Tier |
|---|---|---:|---:|---:|---|
| Haval | H6 | 17.5 % | 0.91 | 8 | B_moderate |
| BMW | 320d | 16.4 % | 0.93 | 5 | B_moderate |
| Toyota | Land Cruiser (Occasion) | 4.1 % | 0.35 | 35 | B_moderate |
| Kia | Rio | 4.3 % | 0.92 | 4 | B_moderate |
| Mitsubishi | Pajero | 4.9 % | 0.96 | 4 | B_moderate |
| Nissan | Patrol (2011-2026) | 5.1 % | 0.68 | 8 | B_moderate |
| Isuzu | D-Max (Occasion) | 5.4 % | 0.03 | 11 | B_moderate |
| SsangYong | Rexton | 5.5 % | 0.51 | 10 | A_strong |
| Kia | Sportage | 5.6 % | 0.82 | 28 | A_strong |
| Renault | Clio (2005-2014) | 6.1 % | 0.24 | 6 | A_strong |
| Hyundai | Accent | 6.1 % | 0.39 | 7 | B_moderate |
| Peugeot | 3008 | 6.2 % | 0.99 | 4 | B_moderate |
| Citroen | C4 | 13.8 % | 0.84 | 6 | B_moderate |
| Renault | Duster (Occasion) | 6.4 % | 0.34 | 11 | B_moderate |
| Volkswagen | Tiguan | 6.6 % | 0.71 | 12 | A_strong |

## 11. Migrations SQL

- **Métadonnées (idempotente)**: `supabase/migrations/20260430130703_extend_reference_profiles_metadata.sql`
- **Seed profils (upsert)**: `supabase/migrations/20260430130704_seed_reference_profiles_v1.sql`

À coller dans Supabase Studio → SQL Editor (métadonnées d'abord, puis seed).

## 12. Commande pour relancer

```bash
npx tsx scripts/data/build-reference-profiles.ts
```
