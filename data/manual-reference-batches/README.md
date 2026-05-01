# Manual Reference Batches

Corpus d'annonces véhicules collectées manuellement à Madagascar (Facebook
Marketplace, pages dealers/revendeurs) pour servir de **dataset de
calibration** au pipeline `scripts/data/build-reference-profiles.ts`.

Ce corpus est versionné dans le repo pour traçabilité. Il **n'est pas
consommé en runtime** par l'engine d'estimation : il sert uniquement à
régénérer périodiquement les seeds SQL des `vehicle_price_reference_profiles`.

## Format CSV

Chaque batch est un fichier CSV avec ces 17 colonnes (ordre strict) :

| Colonne             | Type    | Description                                                        |
|---------------------|---------|--------------------------------------------------------------------|
| `facebookUrl`       | string  | URL ou identifiant interne (`manual_batchN_NNN`) si pas d'URL FB.  |
| `time`              | date    | Date de capture / publication (ISO `YYYY-MM-DD`).                  |
| `sellerName`        | string  | Nom du vendeur ou de la page (ex: `Prestige Occasion`, `Madauto`). |
| `seller_type`       | enum    | `private` / `reseller` / `dealer`. Voir section ci-dessous.        |
| `brand`             | string  | Marque normalisée (ex: `Mercedes-Benz`, `Toyota`).                 |
| `model`             | string  | Modèle + variante si pertinent (ex: `Patrol Y62 LE`).              |
| `year`              | int     | Année de mise en circulation.                                      |
| `mileage_km`        | int     | Kilométrage en km. `0` pour véhicule neuf.                         |
| `price_ar`          | int     | Prix en Ariary (sans séparateur).                                  |
| `currency_original` | string  | Devise affichée (`Ar`, `EUR`, `USD`...). Conversion attendue en Ar.|
| `fuel_type`         | enum    | `petrol` / `diesel` / `hybrid` / `electric`.                       |
| `transmission`      | enum    | `manual` / `automatic` / `cvt`.                                    |
| `body_style`        | enum    | `sedan` / `suv` / `hatchback` / `pickup` / `van` / `coupe` / `wagon` / `other`. |
| `condition`         | enum    | `new` / `excellent` / `good` / `fair`.                             |
| `city`              | string  | Ville (ex: `Antananarivo`).                                        |
| `confidence`        | float   | Confiance de l'extraction LLM (0.00–1.00).                         |
| `notes`             | string  | Détails libres (motorisation, provenance, options, sortie/entretien).|

## Convention `seller_type`

| Valeur     | Définition                                                                       | Coefficient prévu |
|------------|----------------------------------------------------------------------------------|-------------------|
| `private`  | Particulier vendant directement (pas une page commerciale).                      | -12 %             |
| `reseller` | Revendeur indépendant / showroom de revente (ex: Prestige Occasion, AutoBoss).   | -18 %             |
| `dealer`   | Concessionnaire de marque (Madauto, Sodiama, Sicam, Materauto, Bamada, CT_Motors).| 0 % (référence)   |

Les coefficients ci-dessus **n'ont pas encore été appliqués** au pipeline. Ils
seront intégrés lors du sprint patch passe 8 (cf. `docs/` interne).

## Cas spéciaux

- **Reseller listant du neuf** (showroom occasion qui revend du véhicule neuf
  importé) : laisser `seller_type=reseller` mais marquer `condition=new` et
  `mileage_km=0`. Un futur flag `is_new_dealer_listing` pourra forcer le
  traitement comme `dealer` au moment du calcul de profil.
- **Véhicules électriques** : `fuel_type=electric`, le decay et le bucketing
  thermique standard ne s'appliquent pas. À traiter à part dans le pipeline.

## Cumul actuel

| Batch  | Date       | Annonces | Privates | Resellers | Dealers |
|--------|------------|----------|----------|-----------|---------|
| 1      | 2026-05-01 | 54       | 14       | 39        | 1       |
| 2      | 2026-05-01 | 3        | 1        | 1         | 1       |
| 3      | 2026-05-01 | 20       | 0        | 20        | 0       |
| **Total** |         | **77**   | **15**   | **60**    | **2**   |

> Les chiffres par `seller_type` ci-dessus sont indicatifs. Le script
> `scripts/data/ingest-manual-batches.ts` produit la décomposition exacte.

## Cible

Objectif : **200 à 500 annonces** avant régénération des reference profiles
(sprint patch passe 8). Marques sous-représentées à chasser en priorité :
Honda (thermique), Mercedes, Land Rover, Subaru, Lexus, Volvo, Toyota
(Corolla / Camry / RAV4 / Yaris), Suzuki (Vitara / Swift). Cible secondaire :
prix dealer neufs (Madauto, Sodiama, Sicam, Materauto, Bamada, CT_Motors).

## Workflow

1. Capturer des screenshots Facebook / pages dealer.
2. Extraction LLM → CSV (format ci-dessus).
3. Déposer le CSV dans ce dossier sous le nom `manual_batchN_YYYY-MM-DD.csv`.
4. Lancer `npm run ingest:manual-batches` (ou `bun run`) pour valider le
   format et obtenir des stats agrégées.
5. Quand le seuil cible est atteint, lancer le sprint patch passe 8 pour
   régénérer les reference profiles avec les coefficients `seller_type`.
