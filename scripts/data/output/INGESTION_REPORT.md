# Ingestion reference profiles vague v1

Date génération: 2026-04-30T13:51:12.213Z
Pipeline: `scripts/data/build-reference-profiles.ts`

## 1. Résumé exécutif

- **Profils générés**: 53
  - Tier A (strong): 1
  - Tier B (moderate): 16
  - Tier C (anchor): 36
- **Marques couvertes**: 18
- **Lignes lues**: 493
- **Lignes rejetées**: 140
- **Doublons FB éliminés**: 78
- **Lignes écartées par cap vendeur**: 42

## 2. Stats par source

| Source | Lignes lues |
|---|---:|
| fb_scrap | 335 |
| manual_structured | 97 |
| dealer | 61 |

### Rejets par code

| Code | Description | Count |
|---|---|---:|
| CAP | cap vendeur dépassé | 42 |
| R-DROP | — | 2 |
| R2 | prix hors bornes ou non parsable | 13 |
| R7 | année manquante (dealer Neuf si REJECT) | 5 |
| R8 | doublon FB | 78 |

## 3. Top 20 profils Tier A

| Marque | Modèle | Body | Baseline year | Baseline prix | Decay/an | Sample | CV |
|---|---|---|---:|---:|---:|---:|---:|
| Chevrolet | Captiva | suv | 2015 | 36.3 MAr | 10.00 % | 11 | 12.4 % |

## 4. Profils Tier C (faible confiance)

| Marque | Modèle | Body | Baseline year | Baseline prix | Decay/an | Sample | CV |
|---|---|---|---:|---:|---:|---:|---:|
| Audi | A3 | other | 2012 | 48.5 MAr | 10.00 % | 2 | 56.8 % |
| Citroen | C3 | other | 2013 | 22.4 MAr | 10.00 % | 2 | 8.3 % |
| Citroen | C4 | other | 2014 | 22.9 MAr | 10.00 % | 3 | 71.3 % |
| Ford | Ranger | other | 2025 | 167.2 MAr | 10.00 % | 2 | 18.6 % |
| Great Wall | Poer | pickup | 2025 | 169.9 MAr | 10.00 % | 3 | 12.8 % |
| Great Wall | Poer Kingkong | pickup | 2025 | 129.9 MAr | 10.00 % | 1 | 0.0 % |
| Great Wall | Tank 300 | suv | 2025 | 254.9 MAr | 10.00 % | 2 | 2.8 % |
| Great Wall | Tank 400 | suv | 2025 | 289.9 MAr | 10.00 % | 1 | 0.0 % |
| Great Wall | Tank 500 | suv | 2025 | 344.9 MAr | 10.00 % | 2 | 18.4 % |
| Great Wall | Tank 700 | suv | 2025 | 449.9 MAr | 10.00 % | 2 | 15.7 % |
| Great Wall | Wey 80 | suv | 2025 | 339.9 MAr | 10.00 % | 1 | 0.0 % |
| Great Wall | Wingle 7 | pickup | 2025 | 119.9 MAr | 10.00 % | 1 | 0.0 % |
| Haval | Dargo | suv | 2025 | 187.4 MAr | 10.00 % | 2 | 5.7 % |
| Haval | H6 | suv | 2025 | 149.9 MAr | 10.00 % | 3 | 3.8 % |
| Haval | H6 GT | suv | 2025 | 199.9 MAr | 10.00 % | 1 | 0.0 % |
| Haval | Jolion | suv | 2025 | 139.9 MAr | 10.00 % | 3 | 4.2 % |
| Haval | M4 | other | 2016 | 28.6 MAr | 10.00 % | 2 | 10.9 % |
| Haval | Ora Good Cat | other | 2025 | 189.9 MAr | 10.00 % | 1 | 0.0 % |
| Hyundai | Galloper | suv | 2007 | 77.5 MAr | 10.00 % | 2 | 4.6 % |
| Hyundai | Getz | other | 2006 | 11.9 MAr | 10.00 % | 2 | 57.6 % |
| Hyundai | Terracan | other | 2003 | 30.8 MAr | 10.00 % | 3 | 65.0 % |
| Isuzu | MU-X | suv | 2025 | 258.2 MAr | 10.00 % | 1 | 0.0 % |
| Jeep | Wrangler | suv | 2015 | 90.0 MAr | 10.00 % | 2 | 7.9 % |
| Jetta | VS5 | suv | 2025 | 116.5 MAr | 10.00 % | 1 | 0.0 % |
| Kia | Picanto | other | 2012 | 18.5 MAr | 10.00 % | 6 | 70.8 % |
| Kia | Rio | other | 2010 | 28.5 MAr | 10.00 % | 2 | 12.4 % |
| Mahindra | Scorpio | pickup | 2024 | 125.0 MAr | 10.00 % | 1 | 0.0 % |
| Mahindra | XUV300 | other | 2024 | 125.0 MAr | 10.00 % | 1 | 0.0 % |
| Mazda | CX-30 | suv | 2025 | 144.8 MAr | 10.00 % | 2 | 4.9 % |
| Mazda | CX-60 | suv | 2025 | 249.8 MAr | 10.00 % | 1 | 0.0 % |
| Mazda | CX-90 | suv | 2025 | 289.8 MAr | 10.00 % | 2 | 19.5 % |
| Volkswagen | Amarok | pickup | 2025 | 232.5 MAr | 10.00 % | 6 | 16.2 % |
| Volkswagen | Jetta | other | 2016 | 28.6 MAr | 10.00 % | 2 | 45.7 % |
| Volkswagen | T-Cross | other | 2025 | 150.0 MAr | 10.00 % | 1 | 0.0 % |
| Volkswagen | Tiguan | other | 2012 | 35.2 MAr | 10.00 % | 5 | 71.2 % |
| Volkswagen | Touareg | suv | 2025 | 525.0 MAr | 10.00 % | 2 | 6.7 % |

## 5. Marques absentes / sous-représentées

Marques blacklistées vague 1 (calibrées mais retirées du seed, 9 profil(s) écarté(s)) :

- Brilliance _(blacklistée vague 1, hors catalogue UI)_
- Enranger _(blacklistée vague 1, hors catalogue UI)_
- Kaiyi _(blacklistée vague 1, hors catalogue UI)_

Autres marques canoniques sans profil calibré :

- Peugeot
- Mitsubishi
- Honda
- Mercedes-Benz
- BMW
- Land Rover
- Subaru
- Volvo
- Lexus
- Mini
- Jaguar
- Porsche
- BYD
- Chery
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
- SsangYong
- Oceantrade

## 6. Top vendeurs FB cappés

| Seller | Annonces écartées |
|---|---:|
| Fabien Cars | 21 |
| Lolitah De Haziel | 6 |
| Stuart AR | 3 |
| Sera Rehetra | 3 |
| Ne Akbaraly | 2 |
| Andrianjatovo Ando Tanjona | 2 |
| Aaron’s Car | 1 |
| Joany | 1 |
| Vidy Varotra | 1 |
| Giovanni Rakotoson | 1 |

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

Marques canoniques vérifiées contre `src/data/vehicleUiCatalog.ts`: 18.
Aucune divergence majeure détectée.

## 9. Termes inconnus loggés

- Marques non reconnues: 0
- Modèles non reconnus: 23
- Détail: `scripts/data/output/unknown_terms.csv`

## 10. Profils non finalisables

Total: 70 (sample insuffisant ou aucun ancrage)
Détail: `scripts/data/output/unfinishable_profiles.csv`

## 10b. Profils rejetés par filtres qualité (passe 3)

Total: 16

Répartition par cause :
- CV_TOO_HIGH : 12
- MODEL_BLACKLISTED : 3
- YEAR_SPAN_TOO_WIDE : 1

| Marque | Modèle | Baseline | Sample | CV | Span | Raison |
|---|---|---:|---:|---:|---:|---|
| BMW | X3 | 5.6 MAr | 3 | 134.8 % | 1 | CV_TOO_HIGH |
| BMW | X6 | 62.7 MAr | 2 | 106.5 % | 2 | CV_TOO_HIGH |
| Chevrolet | Malibu | 36.0 MAr | 3 | 108.8 % | 1 | CV_TOO_HIGH |
| Great Wall | Wingle 5 | 49.6 MAr | 4 | 106.4 % | 4 | CV_TOO_HIGH |
| Hyundai | i30 | 16.7 MAr | 8 | 88.7 % | 7 | CV_TOO_HIGH |
| Hyundai | iX35 | 22.9 MAr | 2 | 105.6 % | 0 | CV_TOO_HIGH |
| Jeep | Cherokee | 49.2 MAr | 2 | 88.3 % | 14 | CV_TOO_HIGH |
| Kia | Sportage | 37.6 MAr | 12 | 179.3 % | 26 | CV_TOO_HIGH |
| Mercedes-Benz | GLK | 27.5 MAr | 2 | 93.5 % | 0 | CV_TOO_HIGH |
| Mitsubishi | L200 | 24.5 MAr | 8 | 87.5 % | 16 | CV_TOO_HIGH |
| Nissan | X-Trail | 25.0 MAr | 3 | 108.1 % | 16 | CV_TOO_HIGH |
| Toyota | RAV4 | 112.1 MAr | 7 | 103.8 % | 23 | CV_TOO_HIGH |
| Kia | Pride | 7.7 MAr | 7 | 61.7 % | 15 | MODEL_BLACKLISTED |
| Land Rover | Range Rover Evoque | 17.2 MAr | 2 | 1.4 % | 0 | MODEL_BLACKLISTED |
| Renault | Trafic | 3.9 MAr | 2 | 0.0 % | 0 | MODEL_BLACKLISTED |
| BMW | Serie 3 | 51.9 MAr | 6 | 65.9 % | 25 | YEAR_SPAN_TOO_WIDE |

## 11. Migrations SQL

- **Métadonnées (idempotente)**: `supabase/migrations/20260430130703_extend_reference_profiles_metadata.sql`
- **Seed profils (upsert)**: `supabase/migrations/20260430130704_seed_reference_profiles_v1.sql`

À coller dans Supabase Studio → SQL Editor (métadonnées d'abord, puis seed).

## 12. Commande pour relancer

```bash
npx tsx scripts/data/build-reference-profiles.ts
```
