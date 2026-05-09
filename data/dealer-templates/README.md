# Dealer Templates — Corpus de référence dealer & expert

Sources de prix officielles (concessionnaires) et expert-curated (connaisseurs marché Madagascar) pour calibrer le moteur d'estimation AutoNex.

## Différence avec `data/manual-reference-batches/`

| Aspect | `manual-reference-batches/` | `dealer-templates/` |
|--------|----------------------------|---------------------|
| Source | Annonces Facebook scrappées manuellement | XLSX remplis par concessionnaires officiels et expert |
| Format | CSV plat (1 ligne = 1 annonce FB) | XLSX multi-onglets (Neuf / Occasion / Listes) |
| Qualité | Marketplace, prix d'annonce, bruit élevé | Officiel dealer (TTC) ou expert (prix réel marché) |
| Volume | 75 annonces (avril-mai 2026) | 158 records (avril 2026) |
| `source_quality_weight` dans le pipeline | 0.70 | 1.00 (dealer) / 0.95 (expert) |

## Fichiers actuels

| Fichier | Source | Lignes | Type |
|---------|--------|--------|------|
| `Ct motors.xlsx` | CT Motors | 32 Neuf + 5 Occasion | dealer_official (KAIYI, HAVAL, GreatWall) |
| `OT new.xlsx` | OceanTrade | 15 Neuf | dealer_official (Mazda, Enranger, Brilliance, Renault, Jetta, Isuzu) |
| `Sodiama.xlsx` | SODIAMA | 9 Neuf | dealer_official (Volkswagen) |
| `occasion ts.xlsx` | Ami expert (connaisseur marché) | 97 Occasion | expert_curated (Toyota, Nissan, Kia, etc.) |
| `_compiled.csv` | **Généré** par le script ingest | 158 records unifiés | Tout |

## Format des templates

Trois formats sont gérés par le parser :

### v1_neuf (CT Motors, OceanTrade, Sodiama — onglet "Neuf")
22 colonnes. Colonnes prix critiques :
- `Prix_affiche_MGA` = prix HTVA (hors TVA)
- `Prix_net_MGA` = prix TTC client final ⭐
- Pour les véhicules hybrides exonérés de TVA : les deux colonnes sont identiques
- Pour les véhicules thermiques : Prix_net = Prix_affiche × 1.20 (env)

**Le pipeline utilise `Prix_net_MGA` comme `price_listing_mga`** (prix client final).

### v1_occasion (CT Motors — onglet "Occasion")
24 colonnes. Inclut `Annee` et `Kilometrage_km`. Une seule colonne prix utilisée (`Prix_affiche_MGA`).

### v0_ts (occasion ts.xlsx — template ami expert)
19 colonnes en français pur. **Convention de saisie particulière :**
- Quand plusieurs lignes consécutives concernent la même `Marque + Modèle` (différentes années / versions), seule la **première ligne** porte la marque/modèle
- Les lignes suivantes laissent ces colonnes vides (héritage implicite)
- → Le parser applique un **forward-fill** automatique pour récupérer ces lignes orphelines

Sans le forward-fill, on perd ~85% des données expert.

## Pipeline d'ingestion

Script : `scripts/data/ingest-dealer-templates.ts`

Lance :
```bash
npx tsx scripts/data/ingest-dealer-templates.ts
```

Sortie :
- `_compiled.csv` (158 records × 19 colonnes) — corpus unifié, dédoublonné, normalisé
- Stats console : par source, par marque, marques absentes du corpus FB, etc.

### Patches appliqués (v2)
1. **Year imputation** : si `condition='new'` et année manquante → impute à `2025` (avec flag `year_imputed=true`)
2. **Dédoublonnage** sur clé composite `(source_file, brand, model, version, year, mileage_km, price_listing)`
3. **Sémantique TTC/HTVA** : `price_listing_mga = Prix_net (TTC)`, `price_excl_tax_mga = Prix_affiche (HTVA)` pour traçabilité

### Normalisations
- **Marques** : `MAZDA`/`mazda` → `Mazda`, `VW` → `Volkswagen`, `Mercedes` → `Mercedes-Benz`, etc.
- **Carburant** : `Essence` → `petrol`, `Diesel` → `diesel`, `Hybride` → `hybrid`, etc.
- **Transmission** : `Automatique`/`BVA`/`CVT` → `automatic`, `Manuelle`/`BVM` → `manual`
- **Carrosserie** : `4x4`/`Station Wagon` → `suv`, `Pick-up` → `pickup`, etc.

## Marques nouvelles vs corpus Facebook manuel

Ces 9 marques sont absentes du corpus FB et **probablement aussi du catalogue UI** d'autonex.mg :

```
Brilliance, Citroen, Enranger, GreatWall, Haval, Isuzu, Jetta, Kaiyi, Mahindra
```

→ À considérer pour étendre le dropdown marques de l'estimateur.

## Workflow de mise à jour

1. Recevoir un nouveau XLSX d'un dealer (CFAO, Madauto, Sicam, Materauto, Bamada, etc.)
2. Le déposer dans ce dossier (respecter le template v1)
3. Relancer `npx tsx scripts/data/ingest-dealer-templates.ts`
4. Vérifier les stats de sortie (nouveaux records, marques nouvelles)
5. Le `_compiled.csv` se régénère automatiquement
6. Commit du nouveau XLSX (le `_compiled.csv` peut être commité aussi pour traçabilité)

## TODO / sujets ouverts

- [ ] Intégrer `_compiled.csv` dans `scripts/data/build-reference-profiles.ts` (Sprint patch passe 8)
- [ ] Coefficients différenciés par `source_kind` dans la régénération des profils v2
- [ ] Ajouter flag `is_tax_advantaged` (hybrides exonérés TVA) dans le schéma reference_profiles
- [ ] Compléter les 5 occasions HAVAL/KAIYI sans année chez CT Motors (relancer le dealer)
- [ ] Étendre la collecte : CFAO, Madauto, Sicam, Materauto, Bamada (marques prioritaires : Honda, Mercedes-Benz, Land Rover, Subaru, Lexus, Volvo, Toyota)
