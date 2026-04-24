# AUDIT FLOW PUBLIER — AutoNex Madagascar
_Date : 24 avril 2026 · Lot 9 · Mode audit uniquement · Aucun code modifié_

---

## 1. Contexte

Publication d'une annonce = cœur métier d'AutoNex. Depuis le Lot 8 (migration `listing_type` enum → TEXT libre), le flow /publier fonctionne techniquement mais souffre de nombreux problèmes UX, de champs mal placés, de duplications, et d'incohérences logiques visibles dès la première utilisation. Ce document cartographie l'intégralité du flow, liste les bugs, les manques, et propose un plan de refacto priorisé.

Test de référence : publication d'une Mazda MX-5 (Ali, 24 avril 2026) — publication OK, mais 10+ anomalies identifiées à l'œil nu.

Chiffres clés :
- **1093** lignes dans `PublishPage.tsx` (orchestrateur + `handleNext` + `handlePublish`).
- **746** lignes dans `PublishDetailsSection.tsx` (Étape 1, formulaire véhicule principal).
- **45** champs form (selon `publishFormSchema.ts`) + 2 champs boosts.
- **4** étapes dans le wizard.
- **27** équipements plats (5 groupes définis mais **non utilisés** dans l'UI, affichés en flat-list limitée à 8 en mobile).
- **70** marques dans `AUTO_BRANDS` (répartition OK).
- **0** modèles catalogués (le champ Modèle est un `Input` texte libre).

---

## 2. Cartographie des fichiers

```
src/pages/PublishPage.tsx                                 [1093 L] orchestrateur, FormProvider, handleNext/handlePublish, bootstrap, autosave
│
├─ src/pages/publish/
│  ├─ publishFormSchema.ts                                [186 L]  zod schema (45 champs + 2 boosts)
│  ├─ publishFormDefaults.ts                              [ 74 L]  valeurs initiales (PUBLISH_FORM_DEFAULTS)
│  ├─ publishValidation.ts                                [133 L]  validation par étape (texte d'erreur + i18n keys)
│  ├─ mapDbRowToFormValues.ts                             [ 80 L]  hydratation depuis une row DB
│  ├─ publishBackupPayload.ts                             [ 78 L]  sérialisation backup localStorage
│  ├─ publishPersistDraftOperation.ts                     [253 L]  autosave DB (PATCH draft)
│  ├─ publishProgressFingerprint.ts                       [ 60 L]  hash pour détection de changement
│  ├─ publishVehicleLegacyMirror.ts                       [ 19 L]  mapping km→surface, doors→bathrooms, seats→toilets
│  │
│  └─ components/                                          (composants d'étape)
│     ├─ PublishBasicInfoSection.tsx                      [181 L]  Étape 0 (transaction, type véhicule, localisation)
│     ├─ PublishDetailsSection.tsx                        [746 L]  Étape 1 (titre, prix, identité véhicule, équipements)
│     ├─ PublishMediaSection.tsx                          [173 L]  Étape 2 (photos + URL vidéo/visite)
│     ├─ PublishPageHeader.tsx                            [ 91 L]  header / bandeau coût crédits / save status
│     ├─ PublishProgressSteps.tsx                         [ 41 L]  stepper 1/4 2/4 3/4 4/4
│     ├─ PublishStepErrors.tsx                            [ 20 L]  bloc erreurs en haut d'étape
│     ├─ PublishStepGuideCard.tsx                         [ 30 L]  carte "guide" de l'étape
│     ├─ PublishStepNav.tsx                               [ 46 L]  boutons Précédent / Suivant
│     └─ PublishGuidanceAside.tsx                         [ 63 L]  aside "Publiez avec confiance" (Étape 0 uniquement)
│
├─ src/components/publish/
│  └─ PublishStepVisibility.tsx                           [349 L]  Étape 3 (boosts, récap, bouton Publier)
│
├─ src/hooks/publish/
│  ├─ usePublishBootstrap.ts                                       init : ?new / ?draft / ?edit
│  ├─ usePublishDraftLifecycle.ts                                  autosave debouncé, beforeunload backup
│  ├─ usePublishMedia.ts                                           upload photos, make-cover, remove
│  └─ usePublishStepValidation.ts                                  wrapper autour de publishValidation.ts
│
├─ src/data/
│  ├─ automotiveCatalog.ts                                [276 L]  AUTO_BRANDS (70), AUTO_SEARCH_FUEL_OPTIONS (5),
│  │                                                               AUTO_SEARCH_TRANSMISSION_OPTIONS (2),
│  │                                                               AUTO_SEARCH_DRIVETRAIN_OPTIONS (5),
│  │                                                               AUTO_SEARCH_VEHICLE_TYPE_OPTIONS (17)
│  ├─ vehicleTypes.ts                                              18 suggestions listing.type (Lot 8)
│  ├─ listing-equipment.ts                                [104 L]  LISTING_EQUIPMENT_GROUPS (5) + flat (27 total)
│  └─ brandAssets.ts                                               assets logos marques
│
├─ src/lib/
│  ├─ vehicleAttributes.ts                                         EXTERIOR_COLOR_OPTIONS (11)
│  ├─ vehicleMetaTags.ts                                           backfill attributes depuis features[]
│  ├─ publishDraft.ts                                              listingRowToFormState, formToListingUpdate, snapshots
│  ├─ publishWithCredits.ts                                        publication finale + décrément crédits
│  └─ listingRules.ts                                              listingTypesForTransaction, isTerrainRentalForbidden
│
├─ src/types/listing.ts                                            ListingType (= string depuis Lot 8)
└─ src/integrations/supabase/types.ts                              types générés (listings Row/Insert/Update)
```

Points d'entrée consommés indirectement : `src/contexts/AuthContext.tsx` (rôle `particulier|agence|promoteur|admin`), `src/hooks/usePricing.ts` (coût crédits publication), `src/hooks/useCreditsBalance.ts`.

---

## 3. Inventaire exhaustif des champs

Légende : **O** = obligatoire à la publication, **o** = optionnel.

### Étape 0 — Informations principales (`PublishBasicInfoSection.tsx`)

| Champ technique | Label UI | Type UI | Req. | Valeurs | Source | Validation |
|---|---|---|---|---|---|---|
| `transaction` | Type de transaction | `Select` | **O** | `vente` / `location` / `location_vacances` | hardcodé | `TRANSACTION_TYPES` enum zod |
| `listingType` | Type de véhicule | `VehicleTypeCombobox` (free text) | **O** | 18 suggestions + custom | `VEHICLE_TYPES` | `z.string()` + `publishValidation` |
| `isNewProgram` | Véhicule neuf / import | `Switch` | o | `true` / `false` | — | — |
| `internalRef` | Référence interne | `Input` | o | texte libre ≤ 80 | — | — |
| `ville` + `arrondissement` + `quartier` + `quartierLibre` | Localisation | `LocationPicker` composite | **O** (ville) | data `madagascar-locations` | — | `ville` non-vide |
| `pinLat` / `pinLng` | Pin carte | carte Leaflet `PublishLocationMap` | **O** | float | auto depuis ville, override user | `isValidListingCoordinates` |

### Étape 1 — Détails véhicule (`PublishDetailsSection.tsx`)

**Bloc « Informations essentielles »** (toujours visible)

| Champ | Label | Type | Req. | Valeurs | Validation |
|---|---|---|---|---|---|
| `title` | Titre | `Input` maxLength 120 | **O** | texte | min 8 chars (publishValidation) |
| `description` | Description (français) | `Textarea` maxLength 5000 | **O** | texte | min 10 chars |
| `priceMga` | Prix (Ar) | `NumberInput` | **O** | number | > 0 |
| `negotiable` | Prix négociable | `Checkbox` | o | bool | — |
| `surface` (= kilométrage) | Kilométrage (km) | `NumberInput` | o | number | ≥ 0 |

**Bloc « Identité véhicule »** (toujours visible)

| Champ | Label | Type | Req. | Valeurs | Validation |
|---|---|---|---|---|---|
| `vehicleMake` | Marque | `Combobox` (Command) + fallback `Input custom` | **O** | `AUTO_BRANDS` (70) + custom | non-vide |
| `vehicleModel` | Modèle | `Input` **texte libre** | **O** | — (free) | non-vide |
| `vehicleYear` | Année | `Input number` 1950-2100 | o | number | 1950 ≤ y ≤ currentYear+1 |
| `vehicleCondition` | État | `Select` | o | `neuf` / `occasion` | — |

**Bloc « Carburant / Boîte »** (toujours visible)

| Champ | Label | Type | Valeurs |
|---|---|---|---|
| `vehicleFuel` | Carburant | `Select` | Essence / Diesel / Hybride / Hybride rechargeable / Électrique |
| `vehicleTransmission` | Boîte | `Select` | Boîte manuelle / Boîte automatique |

**Bloc « Informations avancées (optionnel) »** (collapsible)

| Champ | Label | Type | Valeurs |
|---|---|---|---|
| `vehicleDoors` | Portes | `Input number` | — (libre) |
| `vehicleSeats` | Places | `Input number` | — |
| `vehicleDrivetrain` | Motricité | `Select` | 4x2 / 4x4 / Traction / Propulsion / AWD |
| `vehicleSellerType` | Type vendeur | `Select` | particulier / concessionnaire |
| `rooms` | Version / finition | `Input` **texte** | — (legacy DB col `rooms`) |
| `bathrooms` | Portes (2e fois !) | `Input` | — (legacy DB col `bathrooms`) |
| `toilets` | Places / capacité | `Input` | — (legacy DB col `toilets`) |
| `vehicleBodyStyle` | Carrosserie | `Select` (17 options) | citadine / berline / suv_4x4 / crossover / pick_up / coupe / cabriolet / utilitaire_leger / van_fourgon / minibus_bus / camion / moto / scooter / quad / buggy / electrique / hybride |
| `vehicleRentalMode` | Mode location | `Select` | Aucune / Courte durée / Longue durée |
| `vehicleExteriorColor` | Couleur extérieure | `Select` (11 + custom) | `EXTERIOR_COLOR_OPTIONS` |
| `vehicleEngineDisplacement` | **Cylindrée (L)** | `Input number` step 0.1 max 20 | float en **litres** |
| `vehicleInteriorColor` | Couleur intérieure | `Input` **texte libre** | asymétrique avec ext. |
| `vehicleAvailabilityStatus` | Disponibilité | `Select` | disponible / reserve / vendu / en_arrivage |
| `vehicleWhatsappPhone` | WhatsApp | `Input` | +2616… regex `[\d+\s().-]{6,20}` |
| `vehicleIsElectric` | Électrique | `Switch` | bool |
| `vehicleIsHybrid` | Hybride | `Switch` | bool |

**Bloc « Équipements (optionnel) »** (collapsible)

| Champ | Label | Type | Valeurs |
|---|---|---|---|
| `selectedFeatures[]` | Équipements | Liste de `Checkbox` | 27 options issues de `LISTING_EQUIPMENT_OPTIONS` (5 groupes définis mais affichés à plat). Mobile : 8 visibles + "Voir plus". |
| `customFeaturesInput` | Autres caractéristiques | `Textarea` | texte libre séparé par `,` |

### Étape 2 — Médias (`PublishMediaSection.tsx`)

| Champ | Label | Type | Req. |
|---|---|---|---|
| photos | (upload) | `<input type="file" multiple>` + grille | **O** (≥ 1) |
| `videoUrl` | Lien vidéo (YouTube…) | `Input URL` | o |
| `virtualTourUrl` | Visite virtuelle | `Input URL` | o |

### Étape 3 — Visibilité & envoi (`PublishStepVisibility.tsx`)

| Champ | Label | Type |
|---|---|---|
| `selectedBoosts[]` | Boosts (urgent / daily_bump / featured / top) | `Checkbox` × 4 |
| `agencySpotlight` | Spotlight agence (comptes agence uniquement) | `Checkbox` |
| — | Récap titre / type / ville / photo count | `Card` |
| — | Bouton "Publier maintenant" | `Button` |

---

## 4. Problèmes identifiés

### 4A. Bugs / incohérences logiques

| # | Description | Où | Sévérité |
|---|---|---|---|
| A1 | **« Portes » apparaît 2 fois.** `vehicleDoors` (Input direct) + `bathrooms` (Input legacy mirror — `listings.bathrooms` sémantique véhicule = portes). Le `showRooms` block affiche `bathrooms` alors que `vehicleDoors` au-dessus écrit déjà dans `bathrooms` via `onApplyVehicleLegacyMirror`. `PublishDetailsSection.tsx:510-520` + `:574-577`. | Étape 1 Advanced | **Bloquant** (UX) |
| A2 | **« Mode location » affiché même en transaction « Vendre »**. `vehicleRentalMode` est inconditionnel dans le bloc Advanced (`PublishDetailsSection.tsx:601-617`). Aucune logique ne le cache si `transaction === "vente"`. | Étape 1 Advanced | Majeur |
| A3 | **Type vendeur manuel alors qu'il est déjà auto-déduit du `profile.role`.** `PublishPage.tsx:522-534` infère `particulier` vs `concessionnaire` depuis le rôle user, mais le `Select` reste éditable. Un concessionnaire peut se faire passer pour un particulier — perte de fiabilité. | Étape 1 Advanced | Majeur |
| A4 | **Cylindrée en LITRES (`engine_displacement_l`)** alors que les fiches techniques malgaches et constructeurs asiatiques parlent en cm³ (« 1500 cc »). Pas de conversion, pas d'indication « 1.5 = 1500 cc ». Confusion quasi garantie pour un user qui lit 1500 sur sa carte grise. | Étape 1 Advanced | Majeur |
| A5 | **Doublon sémantique `listingType` vs `vehicleBodyStyle`.** Le Combobox listingType (Lot 8, 18 valeurs : suv, 4x4, citadine…) et le Select Carrosserie (17 valeurs : suv_4x4, citadine…) stockent la même info sous deux IDs différents. Le mapping `suv_4x4` vs `suv` + `4x4` est incohérent. | Étape 0 vs 1 | Majeur |
| A6 | **Switches « Électrique » + « Hybride » cumulables.** Aucune contrainte. Un véhicule hybride ne devrait pas être coché Électrique pur. Valeurs contradictoires possibles en DB. | Étape 1 Advanced | Mineur |
| A7 | **Triplet redondant `vehicleFuel` / `vehicleIsElectric` / `vehicleIsHybrid`.** Si `fuel = "Électrique"`, `isElectric` devrait être `true` automatiquement. Aucune synchro → données divergentes possibles. | Étape 1 | Mineur |
| A8 | **Couleur intérieure = `Input` libre, couleur extérieure = `Select`.** Asymétrie pure (cf `PublishDetailsSection.tsx:619-637` vs `:651-654`). | Étape 1 Advanced | Mineur |
| A9 | **Auto-title ne se met à jour que si `title` est vide** (`PublishPage.tsx:676-682`). Si l'user tape un titre puis change marque/modèle/année, le titre ne suit pas. Si l'user efface puis rechange, ça revient. Confus. | Étape 1 | Mineur |
| A10 | **Validation inline absente.** Tout est validé au clic « Suivant » et les erreurs s'accumulent dans `PublishStepErrors`. Pas de `FormField` RHF → pas de feedback sous le champ fautif. | Global | Mineur (UX) |

### 4B. Champs mal placés / ordre chaotique

| # | Champ | Placement actuel | Placement recommandé | Justification |
|---|---|---|---|---|
| B1 | `rooms` (Version / finition) | Advanced collapsible (Étape 1) | Identité véhicule (Étape 1, primaire) | MX-5 GT ≠ MX-5 Sport — critique pour acheteur |
| B2 | `vehicleDoors` | Advanced | Bloc Carburant/Boîte | Filtre SUV 5 portes vs citadine 3 portes = primaire |
| B3 | `vehicleSeats` | Advanced | idem | Minibus vs berline = critique |
| B4 | `vehicleDrivetrain` | Advanced | idem | Filtre de recherche primaire à Madagascar (4x4 piste) |
| B5 | `vehicleBodyStyle` | Advanced | Supprimer (doublon listingType) OU remonter primaire | Redondant et perdu |
| B6 | `vehicleExteriorColor` | Advanced | Identité véhicule | Les acheteurs filtrent par couleur |
| B7 | `vehicleEngineDisplacement` | Advanced, **avant** couleur intérieure | Regrouper avec fuel/transmission | Ordre cognitif cassé : « Cylindrée » puis « Couleur intérieure » |
| B8 | `vehicleWhatsappPhone` | Advanced (caché !) | Étape 3 visibilité OU dédié « Contact » | C'est le principal CTA de la fiche détail, caché dans l'Advanced |
| B9 | `vehicleAvailabilityStatus` | Advanced | Étape 3 OU bandeau toujours visible | Critique : réservé / vendu modifie drastiquement la fiche |
| B10 | `rentalMode` | Advanced | Étape 0 ou cacher en Vente | Champ conditionnel à `transaction` |

### 4C. Champs manquants critiques

Standards Leboncoin auto / La Centrale / AutoScout24 absents :

| # | Champ | Impact |
|---|---|---|
| C1 | **1ère mise en circulation** (mois/année) | Différent de l'année du modèle — critique assurance + occasion |
| C2 | **Nombre de propriétaires** (1re main / 2e main / 3e+) | Confiance achat |
| C3 | **Provenance / origine** (France / UAE / Japon / Afrique / Madagascar neuf) | ULTRA critique à Madagascar — signale la qualité du véhicule et la dispo des pièces |
| C4 | **Présence BSC / CIVIO** (toggle) | Légal — vérifie que le véhicule est bien dédouané |
| C5 | **Carnet d'entretien complet** (toggle) | Argument de vente fort |
| C6 | **Contrôle technique** (date + validité) | Obligatoire tous les 2 ans |
| C7 | **Garantie restante** (constructeur / concessionnaire) | Différenciant |
| C8 | **Historique accidents** (aucun / léger / important) | Transparence |
| C9 | **État mécanique global** (excellent / bon / moyen / à revoir) | Champ standard absent |
| C10 | **VIN / numéro de série** | Utile modération + vérification vol |
| C11 | **Puissance (ch / kW)** et **Couple (Nm)** | Fiche technique pro |
| C12 | **Consommation annoncée** (L/100 mixte) | Budget user |
| C13 | **Charge utile / PTAC** (utilitaires) | Critique pour Ranger, Hilux, camions |
| C14 | **Volume utile** (fourgons / vans) | Idem |
| C15 | **Kilométrage annuel moyen** | Info contextuelle |
| C16 | **Durée minimum / caution** (location uniquement) | Pré-requis location |
| C17 | **Type 4x4** (permanent / enclenchable / temporaire) | Voir article Lot 7 — critère n°1 pour piste Madagascar |

### 4D. Catalogue trop pauvre

**Marques (`AUTO_BRANDS`, 70 entrées)**
- ✅ Bon panel généraliste + premium + motos.
- ❌ Tesla **absente** (marché électrique).
- ❌ Chinoises en vogue absentes : NIO, XPeng, Zeekr, Aion, Omoda, Li Auto.
- ❌ Indiennes utilitaires : Ashok Leyland, Force Motors, Maruti Suzuki (explicite) absentes — marché pertinent à Madagascar.
- ❌ Camions pros : Scania, MAN, Mercedes Actros, Volvo Trucks absents.

**Modèles — AUCUN CATALOGUE**
- `vehicleModel` est un simple `Input` texte (ligne `PublishDetailsSection.tsx:413-426`), disabled tant que `vehicleMake` est vide, sinon free text.
- **Aucune structure `brand → [modèles]` nulle part dans `src/data/`.**
- Toyota a 40+ modèles, Mitsubishi 15+, Nissan 20+ : un dropdown cascadé manque cruellement.
- Conséquence : user tape « RAV4 » vs « Rav 4 » vs « Rav-4 » → triple clé, search cassée, analytics cassées.

**Équipements (`LISTING_EQUIPMENT_GROUPS`)**
- ✅ Déjà structuré en 5 groupes (confort 7, tech 6, sécurité 5, extérieur 5, utilitaire 4) = 27 total.
- ❌ UI affiche en **flat list** (lignes `PublishDetailsSection.tsx:711-718`) — la structure en groupes est ignorée visuellement.
- ❌ Mobile limite à 8 options par défaut avec "Voir plus" → user ne voit même pas ESP/ABS/airbags sans action.
- ❌ Trop pauvre vs La Centrale / Leboncoin (100+) : manquent sièges chauffants/ventilés, DAB+, USB-C, induction, pare-brise athermique, start-stop, assistance freinage urgence, régulateur adaptatif, LKA, AEB, HUD, attelage 3500 kg, coffre à ouverture pied, projecteurs laser/matrix, hayon électrique, cam 360, etc.

**Carburants (`FUEL_OPTIONS`, 5)** : OK mais manque **GPL** (encore répandu à Mada), Flex-E85.

**Transmissions (`TRANSMISSION_OPTIONS`, 2)** : OK mais manque **CVT**, **robotisée/DSG**, **séquentielle**.

**Motricités (`DRIVETRAIN_OPTIONS`, 5)** : catégories mélangées (4x2 vs Traction vs Propulsion) — incohérent. Manque **4x4 permanent** vs **enclenchable** (cf critère n°1 Lot 7).

**Couleurs (`EXTERIOR_COLOR_OPTIONS`, 11)** : manque violet, rose, or, bronze, turquoise, multicolore. Pas de qualificatif **métallisé / mat / nacré**.

**États (`CONDITION_OPTIONS`, 2)** : neuf / occasion. Trop binaire — manque « démo », « première main », « récent » (< 1 an).

### 4E. UX

| # | Constat | Niveau |
|---|---|---|
| E1 | **Pas de preview live de l'annonce.** L'utilisateur ne voit pas à quoi ressemble sa fiche avant la publication. Le récap étape 3 est ultra-minimaliste (titre / type / ville / photo count). | Critique |
| E2 | **Validation « au clic Suivant » uniquement.** Erreurs en bloc, pas au niveau du champ. `mode: "onBlur"` de RHF (`PublishPage.tsx:88`) n'affiche pas les erreurs côté UI — seul `usePublishStepValidation` parle. | Majeur |
| E3 | **Pas de tooltips d'aide.** Cylindrée en L ? Motricité 4x4 vs AWD ? Carrosserie suv_4x4 ? L'user est laissé à lui-même. | Majeur |
| E4 | **Upload photos** : pas de drag & drop pour sélectionner les fichiers, pas de drag-to-reorder (seul bouton « Couverture »), pas de suggestions d'angles (face avant, arrière, intérieur, tableau de bord, coffre, moteur). | Majeur |
| E5 | **Aucune limite de photos affichée** (min 1 seulement) ni indicateur « conseillé 6-10 ». | Mineur |
| E6 | **Brouillon** : save status en header (Sauvegarde… / Brouillon enregistré / dernière sauvegarde) — **bon point**. Mais pas d'indicateur par champ « OK ✓ », pas de progress ring sur le stepper. | Mineur |
| E7 | **Pas de suggestions contextuelles** : marque Toyota → modèles proposés ; km saisi → alerte si incohérent avec année ; prix saisi → comparatif moyen marché. | Majeur (différenciant) |
| E8 | **Messages d'erreur génériques** : « Type de véhicule requis » ne pointe pas vers le champ. Pas de scroll-to-error. | Mineur |
| E9 | **Pas de confirm modal avant « Publier maintenant »** — un clic suffit à débiter les crédits et publier. | Mineur |
| E10 | **Coût crédits affiché en bannière haute** uniquement. Pas d'affichage du coût **total** (publication + boosts sélectionnés) près du bouton Publier. | Mineur |
| E11 | **Auto-title** collé silencieusement — bon en soi, mais l'user ne sait pas qu'il peut l'éditer. Pas d'indication visuelle. | Mineur |
| E12 | Mobile : champs tassés, collapse sections Advanced et Équipements corrects mais le user doit cliquer pour TOUT voir. Bonne hiérarchie mais scroll long. | Mineur |

**Bons points à conserver :**
- ✅ Architecture RHF + zod propre et scalable (Phase 6.3/6.4 bien exécutée).
- ✅ Autosave brouillon robuste (fingerprint + beforeunload backup).
- ✅ Cascade transaction → listingType avec rule terrain-rental forbidden.
- ✅ Legacy mirror bien isolé (`publishVehicleLegacyMirror.ts`).
- ✅ Composant `VehicleTypeCombobox` propre (Lot 8).
- ✅ Séparation Étape 0/1/2/3 claire.
- ✅ Mode édition d'annonce publiée distinct du mode brouillon (`isPublishedListingEdit`).

### 4F. Adaptation profils

Rôles DB : `particulier`, `agence`, `promoteur`, `admin` (cf `user_role` enum).

**Existant**
- Inférence `sellerType` depuis `profile.role === "agence" || profile.agency_id` → `concessionnaire`, sinon `particulier` (`PublishPage.tsx:522-534`). **Bon point** mais insuffisant.
- `agencySpotlight` : Card masquée si `!hasAgency` (`PublishStepVisibility.tsx:256`). **Bon point**.

**Manques**
- **Particulier** devrait voir un formulaire **SIMPLIFIÉ** : titre, prix, marque, modèle, année, km, photos, description, contact. Pas besoin de référence interne, disponibilité "en arrivage", mode location LLD/LCD, cylindrée au litre près.
- **Concessionnaire / Agence** devrait voir le formulaire **complet** + champs pro : garantie, BSC/CIVIO, origine, stock, ref interne (déjà là mais perdu).
- **Admin** : pouvoir bypasser la modération, forcer le statut published, éditer les champs owner_id, pending_boost_types.
- Aucun toggle « mode simple / mode avancé » n'existe — tout le monde voit la même version.

### 4G. Cohérence DB

**Mapping colonnes `listings` ↔ champs form**

| Colonne DB | Champ form | Sémantique |
|---|---|---|
| `title` | `title` | OK |
| `description` | `description` | OK |
| `type` (TEXT post Lot 8) | `listingType` | OK |
| `transaction` (enum) | `transaction` | OK |
| `price_mga` | `priceMga` (string) | Coerce au submit |
| `negotiable` | `negotiable` | OK |
| `make` | `vehicleMake` | OK |
| `model` | `vehicleModel` | OK |
| `year` | `vehicleYear` (string) | Coerce |
| `mileage_km` | — | **Pas d'écriture directe** — l'UI écrit dans `surface` (legacy) qui est mirrorée |
| `fuel` | `vehicleFuel` | OK |
| `transmission_gearbox` | `vehicleTransmission` | OK |
| `drivetrain` | `vehicleDrivetrain` | OK |
| `body_style` | `vehicleBodyStyle` | **Doublon avec `type`** |
| `doors` | `vehicleDoors` | OK mais mirrored dans `bathrooms` |
| `seats` | `vehicleSeats` | OK mais mirrored dans `toilets` |
| `exterior_color` | `vehicleExteriorColor` | OK |
| `interior_color` | `vehicleInteriorColor` | OK |
| `engine_displacement_l` | `vehicleEngineDisplacement` | Unité L (cf A4) |
| `vehicle_condition` | `vehicleCondition` | OK |
| `seller_type` | `vehicleSellerType` | Devrait être auto (cf A3) |
| `rental_mode` | `vehicleRentalMode` | OK (conditionnel manquant cf A2) |
| `availability_status` | `vehicleAvailabilityStatus` | OK |
| `whatsapp_phone` | `vehicleWhatsappPhone` | OK |
| `is_electric` / `is_hybrid` | `vehicleIsElectric` / `vehicleIsHybrid` | **Triplet redondant avec `fuel`** (cf A7) |
| `is_new_program` | `isNewProgram` | OK |
| `internal_ref` | `internalRef` | OK |
| `features` (Json) | `selectedFeatures` + `customFeaturesInput` + meta tags | OK |
| `video_url` / `virtual_tour_url` | `videoUrl` / `virtualTourUrl` | OK |
| `ville` / `region` / `arrondissement` / `quartier` / `quartier_libre` / `lat` / `lng` | Localisation composite | OK |
| `surface` / `rooms` / `bathrooms` / `toilets` | Mirrors legacy | Volatiles — à déprécier |
| `draft_step` | géré par `persistDraft` | OK |
| `pending_boost_types` (Json) | `selectedBoosts` | OK |
| `original_price_mga` | calculé `computeOriginalPriceMgaForEdit` | OK |

**Colonnes DB NON exposées au form :**
- `region` — rempli côté serveur depuis `ville` (normal, mais aucun fallback côté form).
- `price_eur` — conversion côté serveur (normal).
- `search_vector` — géré par trigger DB.
- `expires_at`, `rejection_reason`, `views_count` — gérés modération / serveur (normal).

**Colonnes form NON présentes en DB :**
- Aucune — tout est persisté, **bon point**.

**Zod vs contraintes DB :**
- `listingType = z.string()` (free text) ↔ DB TEXT → cohérent post Lot 8.
- `vehicleYear` regex 1950..currentYear+1 ↔ DB `smallint` → OK.
- `vehicleWhatsappPhone` permissive `[\d+\s().-]{6,20}` ↔ DB text → OK mais pas de normalisation E.164.
- `priceMga` en string ↔ DB `number` → coerce sans validation de plafond (un user peut taper 999 999 999 999 999 → débordement ?).

---

## 5. Benchmark industrie

Éléments trouvés dans Leboncoin, La Centrale, AutoScout24, Auto Trader qu'AutoNex devrait considérer :

1. **Autocomplete intelligente marque + modèle + année** qui pré-remplit fiche technique (conso, puissance, couple, cylindrée, carrosserie). Existe chez La Centrale via API Argus. Gros différenciant pour particulier.
2. **Live preview** en colonne droite / panneau latéral sur desktop, accordéon en mobile. L'user voit sa fiche se construire.
3. **Estimateur de prix automatique** : « Votre prix est 12 % au-dessus de la moyenne pour un Hyundai Tucson 2019 80 000 km à Antananarivo » — basé sur median prix actifs/vendus récents.
4. **Import par plaque d'immatriculation** (API argus / CarVertical) : user tape sa plaque → fiche technique auto-remplie à 80 %.
5. **Upload drag & drop + reorder par drag**, avec slots pré-labellisés (« Face avant », « Arrière », « Profil gauche », « Tableau de bord », « Intérieur », « Moteur », « Coffre »).
6. **Mode rapide (5 champs) vs Mode complet** en particulier vs pro.
7. **Badges auto-calculés** : « Prix en-dessous du marché », « Vendu rapidement », « Nouvelle annonce », « Baisse de prix récente ».
8. **Validation progressive champ par champ** avec micro-animation ✓ en vert.
9. **Champs conditionnels intelligents** : garantie affichée uniquement si neuf ; carnet d'entretien si occasion ; durée min + caution si location.
10. **Confirm modal** avant publication avec récap complet + preview cover.

---

## 6. Plan de refacto proposé

Ordre recommandé (priorité × effort, du plus critique au moins urgent).

| Lot | Titre | Objectifs | Impact | Effort | Dépendances |
|---|---|---|---|---|---|
| **9.1** | **Fix bugs UX urgents** | Supprimer doublon Portes (A1) · Cacher Mode location si Vente (A2) · Locker Type vendeur auto (A3) · Ajouter indication « L = 1500 cc » sur cylindrée (A4) · Cohérence `fuel ↔ isElectric/isHybrid` (A7) · Empêcher Électrique + Hybride cumulés (A6) · Couleur intérieure → Select symétrique (A8) | **Bloquant** | **S** (~3-4 h) | aucune |
| **9.2** | **Réorganiser l'ordre des champs** | Remonter Version (rooms), Portes, Places, Drivetrain, Carrosserie, Couleur au niveau primaire · Déplacer WhatsApp vers contact · Supprimer doublon `bodyStyle` ou le lier à `listingType` · Réordonner Cylindrée après Boîte | Majeur | **M** (~1 j) | 9.1 |
| **9.3** | **Catalogue modèles par marque** | Créer `src/data/vehicleModelsCatalog.ts` : `Record<brand, string[]>` (Toyota 40+, Nissan 20+, Hyundai 15+, …) · Transformer `vehicleModel` en Combobox filtré par marque · Permettre custom · Capitaliser au blur | Majeur (UX + search quality) | **M-L** (~1,5 j) | 9.1 |
| **9.4** | **Équipements organisés** | Utiliser `LISTING_EQUIPMENT_GROUPS` dans l'UI (accordéon / tabs par groupe) · Étendre à 60-100 options · Mobile : accordéon par groupe au lieu de 8 flat | Majeur | **S-M** (~4-6 h) | aucune |
| **9.5** | **Adapter au profil user** | Mode « Rapide » (particulier, 12 champs essentiels) vs Mode « Complet » (concessionnaire / agence) · Locker `sellerType` sur role · Toggle « Mode avancé » visible · Masquer `internalRef` pour particulier | Majeur | **M-L** (~1-2 j) | 9.1, 9.2 |
| **9.6** | **Champs critiques manquants** | Migration SQL : `first_registration_date`, `owners_count`, `origin`, `has_warranty`, `has_bsc_civio`, `has_service_book`, `accident_history`, `mechanical_condition`, `payload_kg`, `power_hp` · UI correspondante · Validation Zod · Display fiche | Majeur (compétitivité) | **L-XL** (~2-3 j) | 9.1, 9.2 |
| **9.7** | **Live preview en colonne** | Panneau latéral desktop / modal mobile qui reflète `form.watch()` en temps réel · Card proche de celle affichée en search | Différenciant | **L** (~1-2 j) | 9.2 |
| **9.8** | **Drag & drop photos + suggestions angles** | `@dnd-kit/core` pour reorder · Slots pré-labellisés · Zone drop-zone pour l'upload multiple | Majeur (qualité annonces) | **M** (~6-8 h) | aucune |
| **9.9** | **Validation inline RHF** | Basculer `mode: "onChange"` + `FormField` / `FormMessage` sous chaque champ · Scroll-to-first-error · Micro-animations ✓/✗ | UX majeur | **M** (~1 j) | 9.1 |
| **9.10** | **Tooltips + aides contextuelles** | Composant `Tooltip` shadcn sur chaque champ technique (cylindrée, motricité, drivetrain, body_style…) · Textes courts | Mineur | **S** (~4 h) | 9.2 |
| **9.11** | **Confirm modal + coût total** | Modal avant submit avec récap complet + total crédits (publication + boosts) · Aperçu image principale | Mineur | **S** (~3-4 h) | aucune |
| **9.12** | **Estimateur prix en temps réel** | RPC Supabase `get_price_reference(make, model, year, km, region)` → mediane + fourchette · Banner sous le champ Prix « 12 % au-dessus médiane » | Différenciant (long terme) | **XL** (~3-5 j) | DB data + 9.3 |
| **9.13** | **Import par plaque / VIN** | API tierce (argus / CarVertical) · Champ plaque/VIN qui auto-remplit 80 % de la fiche | Premium (opt-in plus tard) | **XL** (~1 sem) | 9.3, 9.6 |

**Recommandation pour Ali — lancer en priorité :**
1. **9.1** d'abord (bloquant visible immédiatement sur MX-5).
2. **9.2** ensuite (cohérence générale, prépare le terrain).
3. **9.4** rapide et très visible (équipements).
4. **9.3** puis **9.5** (parallélisable).
5. Le reste selon budget temps.

---

## 7. Annexes

### 7.1 Schémas mentaux

**État actuel du wizard :**
```
[0] Transaction · Type vehicule (combobox) · Localisation · Map
     ↓
[1] [Titre · Description · Prix · Km]                ← essentiel (OK)
    [Marque · Modele · Annee · Etat]                 ← identité (OK mais Version manquante)
    [Carburant · Boite]                              ← (OK)
    [Advanced collapsible]
      ├─ Portes · Places · Motricité · Type vendeur  ← tout ça devrait être primaire
      ├─ Version · Portes(2) · Places(2)             ← DOUBLON Portes/Places (A1)
      ├─ Carrosserie · Mode location                 ← Carrosserie doublon, Mode location inconditionnel (A2, A5)
      ├─ Couleur ext · Cylindrée · Couleur int · Dispo · WhatsApp ← ordre chaotique, asymétrie (A8)
      └─ Switch Elec · Switch Hybride                ← cumulables (A6) + redondants (A7)
    [Equipements collapsible]
      └─ 8 checkboxes (+ Voir plus)                  ← flat list, groupes ignorés
    [Autres caractéristiques]
     ↓
[2] Photos · Video URL · Visite virtuelle URL
     ↓
[3] Boosts · Spotlight agence · Récap · Publier
```

**État cible après 9.1 + 9.2 + 9.3 + 9.4 :**
```
[0] Transaction · Type vehicule · Localisation · Map
     ↓
[1] [Titre · Description · Prix · Km]
    [Marque (Combobox) · Modèle (Combobox filtré par marque) · Année · Version · Etat]
    [Carburant · Boîte · Motricité · Cylindrée (L / cc) · Portes · Places]
    [Carrosserie · Couleur ext · Couleur int · Dispo · BSC/CIVIO · Carnet entretien]
    [Equipements (accordéon 5 groupes, 60+ options)]
    [Autres caractéristiques]
     ↓
[2] Photos (drag-drop + slots labellisés) · Video URL · Visite virtuelle URL
     ↓
[3] WhatsApp · Récap complet · Coût total · Boosts · Confirm modal · Publier
```

### 7.2 Liens code

- Orchestrateur : `src/pages/PublishPage.tsx`
- Bug A1 (doublon Portes) : `src/pages/publish/components/PublishDetailsSection.tsx:510-520` et `:574-577`
- Bug A2 (Mode location) : `src/pages/publish/components/PublishDetailsSection.tsx:601-617`
- Bug A3 (Type vendeur) : `src/pages/publish/components/PublishDetailsSection.tsx:551-566` + `src/pages/PublishPage.tsx:522-534`
- Bug A4 (cylindrée L) : `src/pages/publish/components/PublishDetailsSection.tsx:639-649`
- Bug A5 (doublon bodyStyle) : `src/pages/publish/components/PublishDetailsSection.tsx:585-600` vs `src/data/vehicleTypes.ts`
- Auto-title : `src/pages/PublishPage.tsx:676-682`
- Schema zod : `src/pages/publish/publishFormSchema.ts`
- Validation étape : `src/pages/publish/publishValidation.ts`
- Legacy mirror : `src/pages/publish/publishVehicleLegacyMirror.ts`
- Catalogue marques : `src/data/automotiveCatalog.ts:103-125`
- Catalogue équipements : `src/data/listing-equipment.ts:8-49`
- Catalogue types véhicule : `src/data/vehicleTypes.ts`

### 7.3 TODOs explicites

- [ ] Créer `src/data/vehicleModelsCatalog.ts` (Lot 9.3).
- [ ] Déprécier le doublon `listings.body_style` (Lot 9.2) — ou le lier automatiquement à `listings.type`.
- [ ] Déprécier / retirer les colonnes mirror legacy `surface` / `rooms` / `bathrooms` / `toilets` après backfill dans les colonnes véhicule natives (`mileage_km`, `doors`, `seats`).
- [ ] Décider côté produit : garder ou retirer le Switch `isElectric`/`isHybrid` (si `fuel` peut être source unique de vérité).
- [ ] Ajouter migration SQL pour colonnes C1-C17 (premier lot 9.6).
- [ ] Harmoniser l'unité cylindrée : soit accepter L et cm³ dans l'Input, soit forcer cm³ (plus cohérent avec cartes grises malgaches).

---

_Fin du rapport — prêt pour décision Ali sur les lots à lancer en priorité._
