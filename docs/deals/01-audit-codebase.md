# 01 — Audit du code existant (feature Deals vendeur)

> Audit en lecture seule, fait le 30 avril 2026. Aucun fichier applicatif modifié.
> Objectif : cartographier le cycle de vie d'une annonce + l'état actuel autour
> du concept de « deal » avant d'introduire l'UX vendeur du sprint 1.

---

## 1.1 — Mapping des fichiers listings

### Hooks de fetch
- `src/hooks/useListings.ts` — **source de vérité unique** pour la lecture des
  annonces côté front. Expose `useDbListings()` (liste filtrée), `useListing()`
  (détail), `prefetchListing()` (hover prefetch),
  `fetchFilteredActiveListingCount()` et `fetchActiveListingCountsByVille()`.
  La sélection des colonnes Postgres passe par la constante
  `LISTING_SELECT_COLUMN_NAMES` (lignes 20-68) qui inclut déjà
  `original_price_mga` (ligne 61) — donc tout nouveau champ deal devra être
  ajouté dans cette liste pour remonter jusqu'à `DisplayListing`.
- `src/hooks/useFavorites.ts` — fetch les favoris du user via la RPC
  `list_my_favorites` qui renvoie déjà `lst_original_price_mga` (utilisé par la
  page Favoris pour rejouer le `dealMeta`).
- `src/lib/listingQueryFilters.ts` (référencé par `useListings.ts:7-11`) —
  gère les filtres PostgREST appliqués à la requête `listings`. **C'est ici
  qu'il faudra brancher le futur filtre `has_deal=1`**.

### Logique CRUD côté client
- **CREATE** — `src/pages/PublishPage.tsx` (1144 lignes, refacto SPRINT-PUBLISH
  prévu post-launch). Insère via `supabase.from("listings").insert(...)` après
  validation par `useStepValidation`.
- **UPDATE (édition annonce)** — la même `PublishPage.tsx` quand
  `?edit=<listingId>` est présent. Fonction
  `computeOriginalPriceMgaForEdit()` (`src/lib/publishDraft.ts:862`) calcule
  automatiquement `original_price_mga` à chaque baisse de prix. **C'est une
  pièce critique à comprendre pour le sprint 1** :
  - Si le vendeur baisse `price_mga`, `original_price_mga` est snapshot avec
    l'ancien prix.
  - Si le vendeur remonte `price_mga` au-dessus de `original_price_mga`,
    `original_price_mga` est remis à `null`.
  - **Conséquence pour Deals** : ce champ se comporte déjà comme un « snapshot
    organique de baisse spontanée ». On va donc INTRODUIRE
    `deal_original_price_mga` à part pour ne pas polluer cette logique
    historique (cf. `02-schema-db.md` §2.1).
- **UPDATE (statut, pause, supprimer)** — `src/pages/Dashboard.tsx:216-268`,
  mutations `toggleStatus` (active ↔ paused) et `deleteListing`.
- **AUTOSAVE BROUILLON** — `src/pages/publish/publishPersistDraftOperation.ts`
  (90-101) — même pattern, persiste les patches avec
  `computeOriginalPriceMgaForEdit`.

### Page de publication & édition
- Route unique `/publier` (`src/pages/PublishPage.tsx`).
  - Création : `/publier`
  - Édition d'une annonce existante : `/publier?edit=<uuid>`
- Sous-composants : `src/pages/publish/components/*` (sections par étape).
- **Pas de page d'édition d'annonce séparée.** L'audit le confirme : le
  bouton « Modifier » du dashboard (`DashboardListingsSection.tsx:209-216`)
  navigue vers `/publier?edit=${listing.id}`. Donc le sprint 1 doit greffer le
  bouton « Mettre en bonne affaire » dans le **dashboard**, pas dans une page
  dédiée d'édition.

### Dashboard vendeur
- `src/pages/Dashboard.tsx` — orchestre le fetch (`my-listings` query),
  le calcul des leads, les mutations toggle/delete.
- `src/pages/dashboard/components/DashboardListingsSection.tsx` — **c'est là
  que vit la liste des annonces actives du vendeur**.
  - Deux variantes responsive :
    - **Mobile** (`md:hidden`, lignes 168-251) : cartes empilées avec un
      bloc d'actions `<div className="flex items-center justify-end gap-1.5
      flex-wrap">` (ligne 197) regroupant : bouton « Booster » (Sparkles) →
      bouton « Modifier » (Pencil) → bouton play/pause → bouton supprimer.
    - **Desktop** (`hidden md:block`, lignes 253-352) : tableau, dernière
      colonne `<td className="p-4">` avec le même cluster d'actions
      (lignes 296-344).
  - Conditions d'affichage des actions actuelles :
    - « Booster » : `isListingEligibleForPostPublishBoost(listing.status)`
    - « Modifier » : `isEditablePublishedListingStatus(listing.status)`
    - Play/Pause : `["active", "paused"].includes(listing.status ?? "")`
- **Greffe sprint 1** : ajouter un bouton « 🔥 Mettre en bonne affaire »
  (ou « Annonce en deal » si c'est déjà actif) à côté du bouton « Booster ».
  - Condition d'affichage proposée :
    `listing.status === "active" && listing.transaction === "vente"` (les
    deals n'ont pas de sens en location longue/courte durée — à valider).
  - Variantes possibles :
    - Si `deal_active === false` → CTA primaire « 🔥 Mettre en bonne
      affaire » qui ouvre `<DealActivationModal />`.
    - Si `deal_active === true` → CTA secondaire « Deal actif jusqu'au …
      (Annuler) ».
  - Greffe à faire **dans les deux variantes** (mobile + desktop) — cf. §1.6
    pour l'ascii-DOM ciblé.

### Card listing (composants d'affichage des annonces dans les grilles)
- `src/components/ListingCard.tsx` — **composant unique** utilisé par toutes
  les grilles publiques (`/recherche`, home, `/yas-app`, `/favoris`,
  `/agences/:slug`, etc.). Une seule variante par prop `variant: "default"
  | "search"` et une densité par `layout: "default" | "compact"`.
  - Accepte déjà `dealMeta?: DealMeta | null` (ligne 31) et l'affiche :
    - Badge rouge `-{discountPercent}%` (lignes 154-160).
    - Prix barré avec `formatPrice(dealMeta.originalPriceMga)` (lignes
      241-245).
  - **Conséquence** : pas besoin de refacto carte au sprint 2. Il suffira que
    la grille parente lui passe le bon `dealMeta` calculé via `getDealMeta()`.

### `src/lib/deals.ts`
- Seul point d'entrée logique — `getDealMeta(listing): DealMeta | null`.
- Source : `current = listing.price_mga`, `original =
  listing.original_price_mga`. Calcule
  `((original - current) / original) * 100`, arrondit, retourne
  `{ originalPriceMga, discountPercent }` si conditions OK.
- Appels actuels :
  - `src/pages/Index.tsx:233` (section home « Bonnes affaires »)
  - `src/features/yas-app/components/YasFeaturedDeals.tsx:33` (mini-app YAS)
  - `src/pages/ListingDetail.tsx` (page détail)
  - `src/pages/listing-detail/buildListingDetailViewModel.ts`
- **Décision sprint 0** : `getDealMeta()` reste tel quel pour la rétro-compat.
  Mais on va vouloir une variante « strict » qui regarde
  `listing.deal_active === true` ET `now() < listing.deal_ends_at` pour la
  page `/bonnes-affaires` officielle du sprint 2 (cf. `04-plan-sprints.md`).
  Le sprint 0 ne touche pas à ce fichier — c'est une question pour Ali §
  Questions.

---

## 1.2 — Mapping de la table `listings`

### Colonnes actuelles (depuis `src/integrations/supabase/types.ts:652-814`)

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `owner_id` | uuid \| null | FK `profiles(id)` ON DELETE CASCADE (cf. init) |
| `title` | text | NOT NULL |
| `description` | text \| null | |
| `type` | text \| null | (legacy enum `listing_type` converti en text le 2026-04-24) |
| `transaction` | enum `transaction_type` | NOT NULL, default `'vente'` |
| `price_mga` | bigint | NOT NULL, default 0 |
| `price_eur` | numeric \| null | |
| `original_price_mga` | numeric \| null | **AJOUTÉ par migration `20260417141000_add_original_price_for_deals.sql`** — utilisé par `getDealMeta()`. ⚠️ type `numeric`, pas `bigint` (incohérent avec `price_mga`). |
| `negotiable` | boolean | NOT NULL, default false (migration 20260420160000) |
| `status` | enum `listing_status` | `draft \| active \| paused \| expired \| pending_review \| pending_payment \| pending_payment_verification \| rejected \| hidden` |
| `views_count` | int \| null | default 0 |
| `created_at` | timestamptz \| null | |
| `updated_at` | timestamptz | NOT NULL |
| `expires_at` | timestamptz \| null | |
| `whatsapp_phone` | text \| null | |
| `make`, `model`, `year`, `mileage_km`, `doors`, `seats`, `body_style`, `fuel`, `transmission_gearbox`, `drivetrain`, `vehicle_condition`, `seller_type`, `rental_mode`, `is_electric`, `is_hybrid`, `engine_displacement_l`, `availability_status`, `exterior_color`, `interior_color` | divers | colonnes véhicule natives |
| `region`, `ville`, `arrondissement`, `quartier`, `quartier_libre`, `lat`, `lng` | géoloc | |
| `features` | jsonb \| null | array d'équipements |
| `internal_ref`, `is_new_program`, `rejection_reason`, `pending_boost_types`, `publication_credits_charged`, `draft_step`, `video_url`, `virtual_tour_url`, `search_vector` | meta | |

✅ `price_mga` et `original_price_mga` confirmés présents.

⚠️ **Incohérence de type repérée** : `original_price_mga numeric` alors que
`price_mga bigint`. Le sprint 0 ne corrige pas (pas de migration destructrice
sans GO Ali) mais **le nouveau champ `deal_original_price_mga` doit être
`bigint`** pour s'aligner avec `price_mga`. Voir Question pour Ali #1.

🔍 **Pas de colonne `featured_until`** — j'ai grep, rien dans `src/`. La
visibilité boost passe par la table séparée `boosts(listing_id, type,
starts_at, ends_at)`. Donc **aucune interaction** entre `deal_ends_at` et
un éventuel `featured_until` à craindre.

### RLS actuel sur `listings` (depuis `20260411113316_init`)

```sql
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active listings are public"
  ON public.listings FOR SELECT
  USING (status = 'active' OR owner_id = auth.uid());

CREATE POLICY "Users can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = owner_id);
```

Plus tard étendues :
- `20260420170000_listing_status_hidden_pending_review.sql` étend le SELECT
  pour autoriser admin (`immonex_is_admin()`) à voir tous les statuts.
- Migrations modération (20260420180000…20260421140000) ajoutent des helpers
  RPC SECURITY DEFINER utilisés par l'admin queue.

✅ **Conséquence sprint 1** : la policy UPDATE `auth.uid() = owner_id` autorise
déjà le vendeur à mettre à jour ses propres `deal_*`. Mais ce n'est PAS
suffisant — un client malveillant pourrait écrire `deal_active = true`,
`deal_discount_percent = 999`, etc. **D'où la nécessité d'une Edge Function
`activate-deal` SECURITY DEFINER côté serveur** pour valider les inputs et
faire le snapshot — la policy UPDATE reste, mais le client appellera la
function plutôt qu'un `update()` direct (cf. `02-schema-db.md` §2.5 et §2.6).

### Indexes existants sur `listings`

Depuis `20260411113316_init` :
- `idx_listings_location (ville, arrondissement, quartier)`
- `idx_listings_status_date (status, created_at DESC)`
- `idx_listings_search` GIN sur `search_vector`
- `idx_listings_features` GIN sur `features`

Depuis `20260414124551_init_autonex_core_schema.sql` :
- `idx_listings_make`, `idx_listings_model`, `idx_listings_year`,
  `idx_listings_mileage_km`, `idx_listings_fuel`, `idx_listings_body_style`,
  `idx_listings_availability_status`, `idx_listings_make_model_year`

Aucun index actuel ne couvre `deal_active`, `deal_ends_at`,
`deal_discount_percent`. **À créer** dans la migration sprint 0 (cf. §2.3).

---

## 1.3 — Recherche d'usages existants de `original_price_mga`

`grep -rn original_price_mga src/` — résultats compilés :

| Fichier | Ligne | Contexte |
|---|---|---|
| `src/integrations/supabase/types.ts` | 679, 733, 787 | déclarations Row/Insert/Update générées |
| `src/integrations/supabase/types.ts` | 2885 | `lst_original_price_mga` dans le type retour de la RPC `list_my_favorites` (préfixé `lst_` pour disambiguer) |
| `src/types/listing.ts` | 101 | `original_price_mga?: number \| null` sur `DisplayListing` |
| `src/lib/deals.ts` | 10 | source de `getDealMeta()` |
| `src/hooks/useListings.ts` | 61 | colonne SELECTed |
| `src/hooks/useListings.ts` | 161 | mappée dans `mapListingRowToDisplayListing` |
| `src/hooks/useFavorites.ts` | 81 | mappée depuis le retour RPC |
| `src/pages/PublishPage.tsx` | 302-303 | hydrate `editOriginalPriceRef` au chargement de l'édition |
| `src/pages/PublishPage.tsx` | 786 | `computeOriginalPriceMgaForEdit` lors d'un PUT publication |
| `src/pages/publish/publishPersistDraftOperation.ts` | 100 | idem côté autosave brouillon |
| `src/test/buildListingDetailViewModel.test.ts` | 28 | `original_price_mga: null` dans un fixture |
| `src/test/searchResultsModel.test.ts` | 28 | idem |
| `src/test/favoritesPage.test.tsx` | 121 | `lst_original_price_mga: null` |

**Conclusion** : `original_price_mga` est lu/écrit en 5 endroits métier
(`useListings`, `useFavorites`, `PublishPage`, `publishPersistDraftOperation`,
`getDealMeta`). Ne pas y toucher dans cette feature. Le nouveau champ
`deal_original_price_mga` cohabite proprement.

---

## 1.4 — Vérification du cron Supabase (pg_cron)

`grep -rn "pg_cron\|cron.schedule" supabase/ src/` :

✅ **pg_cron est ACTIVÉ et déjà utilisé en production**. Preuves :

- `supabase/migrations/20260421180000_rgpd_deletion_schema_and_rpcs.sql`
  ligne 524 : `PERFORM cron.schedule(...)` pour
  `execute_scheduled_deletions()` nightly (J+30 RGPD).
- `supabase/migrations/20260425100001_lot_10_2_cron.sql` lignes 23 & 40 :
  deux `cron.schedule(...)` actifs pour les emails notifications
  (5 min + daily digest).
- `supabase/migrations/20260426150000_fix_cron_use_vault.sql` ligne 36 & 55 :
  hotfix pour utiliser le Vault Supabase pour les secrets dans les
  pg_cron (donc le pattern est déjà rodé).
- Doc associée : `docs/notifications-email.md` ligne 12, 61, 117 décrit
  l'architecture pg_cron + pg_net.

📂 **Edge Functions schedulées** :
- `supabase/functions/send-queued-notification-emails/index.ts:4` → déclenchée
  par `pg_cron` toutes les 5 min via `pg_net` HTTP POST.
- Autres Edge Functions : `send-contact-email`, `send-deletion-notification-
  email`, `vpi-check-status`, `vpi-dry-run-checkout`, `vpi-initiate-payment`,
  `vpi-webhook` (non schedulées).

➡️ **Bonne nouvelle pour le sprint 3** : on a déjà le pattern complet
(pg_cron + pg_net + Vault pour les secrets + Edge Function appelée). Il
suffira d'ajouter une nouvelle Edge Function `expire-deals` et un
`cron.schedule(...)` daily dans une migration. Pas besoin de demander à Ali
d'activer une extension.

---

## 1.5 — Vérification i18n

Fichiers : `src/i18n/fr.json`, `src/i18n/en.json`, `src/i18n/mg.json`.

Comptage des clés feuilles (script récursif) :
- **fr** : 1950 clés
- **en** : 1950 clés
- **mg** : 1950 clés

✅ Parité parfaite à 1950 clés (le brief mentionnait ~1944, il y a eu de
légers ajouts depuis). Les clés `deals.*` ajoutées au sprint 1 devront être
présentes dans les 3 langues avec les mêmes paths.

⚠️ Les fichiers sont **monolithiques** (un seul JSON par langue). Le
chantier 4.3 « lazy-load i18n par langue » est en cours mais **n'éclate pas
les namespaces** — donc les nouvelles clés deals iront dans le tronc commun.

---

## 1.6 — Récap dashboard vendeur (greffe du bouton)

### Variante mobile (`md:hidden`, ligne 168 de `DashboardListingsSection.tsx`)

```tsx
<Card className="rounded-2xl">
  <CardContent className="p-4 space-y-3">
    <div className="space-y-1">
      <Link to={`/annonce/${listing.id}`}>{listing.title}</Link>
      <p>{listing.ville} • {listing.quartier}</p>
      <p>{formatPrice(listing.price_mga)}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Badge>{statusLabels[...]}</Badge>
      <span>{views_count} vues</span>
    </div>
    <ListingBoostNotes ... />

    <!-- 👇 GREFFE SPRINT 1 ICI : entre les notes de boost et le row d'actions -->

    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {/* SPRINT 1 — nouveau bouton, AVANT « Booster » */}
      {/* listing.status === "active" && transaction === "vente" :
          si listing.deal_active → "Deal actif (annuler ?)" en outline rouge
          sinon → "🔥 Mettre en bonne affaire" en outline orange */}
      <Button variant="outline" size="sm">
        <Flame /> Mettre en bonne affaire
      </Button>

      {isListingEligibleForPostPublishBoost(...) && <Button>Booster</Button>}
      {isEditablePublishedListingStatus(...) && <Button>Modifier</Button>}
      <Button>Pause/Play</Button>
      <Button>Trash</Button>
    </div>
  </CardContent>
</Card>
```

### Variante desktop (`hidden md:block`, ligne 253)

```tsx
<table>
  <thead>...</thead>
  <tbody>
    <tr>
      <td>{title + ville + boostNotes}</td>
      <td>{formatPrice(price_mga)}</td>
      <td>{statusBadge}</td>
      <td>{views_count}</td>
      <td>
        <div className="flex items-center gap-1 flex-wrap">
          {/* SPRINT 1 — même bouton, AVANT « Booster » */}
          <Button size="sm">🔥 Mettre en bonne affaire</Button>
          <Button>Booster</Button>
          <Button>Modifier</Button>
          <Button>Pause/Play</Button>
          <Button>Trash</Button>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

### Affichage prix barré + badge deal côté vendeur

Ce qui n'existe PAS aujourd'hui dans `DashboardListingsSection.tsx` mais sera
attendu au sprint 1 (ou différé en V1.1) :
- Sur la ligne « prix » de chaque annonce (ligne 182 mobile, 288 desktop),
  afficher `formatPrice(deal_original_price_mga)` barré + `formatPrice
  (price_mga)` actif si `deal_active`.
- Indicateur « Deal -X% — fin le DD/MM/AAAA » en sous-ligne.

### Pourquoi greffer ici plutôt que dans PublishPage (édition annonce)

Trois raisons :
1. La modification de prix est **déjà intégrée à l'autosave** de
   `PublishPage` via `computeOriginalPriceMgaForEdit`. Mélanger un workflow
   "deal" (snapshot ferme + lock 30j) à un workflow "édition" (autosave
   liberal) créerait des race conditions et un UX confus.
2. Le mental model vendeur : « Mes annonces » → « Cette annonce → Action ».
   Beaucoup plus naturel qu'une étape supplémentaire dans le wizard
   `/publier`.
3. Le bouton `Modifier` du dashboard reste utile pour changer titre, photos,
   description sans toucher au prix. On veut clairement séparer.

---

## Synthèse rapide

| Question | Réponse |
|---|---|
| Page `/edit-listing` séparée ? | ❌ Non — édition = `/publier?edit=<id>` |
| `original_price_mga` déjà utilisé ? | ✅ Oui, en 5 fichiers métier — ne pas casser |
| `featured_until` qui pourrait conflicter avec `deal_ends_at` ? | ❌ Non — pas de tel champ ; les boosts vivent dans `boosts` |
| pg_cron actif ? | ✅ Oui — déjà 3 jobs schedulés |
| Edge Functions schedulées ? | ✅ `send-queued-notification-emails` (5 min) |
| Parité i18n ? | ✅ 1950 clés × fr/en/mg |
| `ListingCard` accepte `dealMeta` ? | ✅ Déjà — pas de refacto sprint 2 |
| Filtre `has_deal` côté `/recherche` ? | ❌ Pas implémenté — à ajouter dans `listingQueryFilters.ts` au sprint 2 |
| Page `/bonnes-affaires` ? | ❌ N'existe pas — à créer au sprint 2 |
| Bouton « Mettre en bonne affaire » au dashboard ? | ❌ À greffer au sprint 1 dans `DashboardListingsSection.tsx` (variantes mobile + desktop) |
