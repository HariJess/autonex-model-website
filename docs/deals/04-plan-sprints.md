# 04 — Plan de sprints — Feature Deals vendeur

> Réf. : `01-audit-codebase.md` (audit) · `02-schema-db.md` (schéma) ·
> `03-migration.sql` (migration prête à appliquer).
> Dépendance dure : la migration `03-migration.sql` doit être appliquée par
> Ali sur la prod **AVANT** de démarrer le sprint 1.

---

## Sprint 0 — Fondations (CE sprint, livré sous forme docs)

- ✅ Audit + cartographie (`01-audit-codebase.md`)
- ✅ Schéma DB consolidé (`02-schema-db.md`)
- ✅ Migration SQL prête à coller (`03-migration.sql`)
- ✅ Plan de sprints (ce fichier)
- ✅ Index et résumé exécutif (`00-readme.md`)
- ❌ Aucun code applicatif modifié, aucun commit, aucun push

**Output Ali** : appliquer `03-migration.sql` dans Supabase Studio > SQL
Editor (paste, run, vérifier les smoke-tests en commentaire). Confirmer la
liste des 2 policies `listing_deal_history` créées + 1 trigger
`trg_enforce_deal_price_lock`.

---

## Sprint 1 — UI vendeur (1-2 j) — bloqué par migration appliquée

### Livrables

#### 1. Composant `<DealActivationModal />`
- Localisation : `src/features/deals/components/DealActivationModal.tsx`
  (nouveau dossier `src/features/deals/`).
- Props : `{ listing: Listing; open: boolean; onOpenChange: (b)=>void;
  onSuccess?: () => void }`.
- UI :
  - Presets discount : `[5, 10, 15, 20, 25, 30]` en chips cliquables,
    plus champ « custom » (input number 5-30).
  - Presets duration : `[7, 14, 30]` en radio cards.
  - Récap dynamique : « Prix actuel `X` MGA → Nouveau prix `Y` MGA ·
    Économie `Z` MGA · Visible jusqu'au `DD/MM/AAAA` ».
  - CTA primaire « Activer le deal » → call Edge Function `activate-deal`.
  - Mention de garantie « Pendant 30 jours après la fin du deal, vous ne
    pourrez pas remonter le prix au-dessus de `X` MGA ».
- Validation client : zod schema (déjà dépendance du repo, OK).

#### 2. Bouton dashboard
- Toucher `src/pages/dashboard/components/DashboardListingsSection.tsx`
  - Variante mobile (lignes 197-246) : ajouter un bouton AVANT le bouton
    « Booster ».
  - Variante desktop (lignes 296-344) : idem.
- État du bouton :
  - `listing.status === "active" && listing.transaction === "vente" &&
    !listing.deal_active` → CTA orange « 🔥 Mettre en bonne affaire »
  - `listing.deal_active` → badge inline
    « Deal -X% jusqu'au DD/MM » + bouton « Annuler » (call `cancel-deal`)
  - Sinon → bouton caché.
- Affichage prix (lignes 182 mobile / 288 desktop) : si `deal_active`,
  afficher prix barré + nouveau prix.

#### 3. Edge Function `supabase/functions/activate-deal/index.ts`
- Auth : JWT Supabase (verify_jwt = true par défaut).
- Inputs validés (zod) :
  ```ts
  { listingId: string (uuid), discountPercent: int 5..30,
    durationDays: 7|14|30 }
  ```
- Vérifs serveur-side :
  - `owner_id = jwt.user_id`
  - `status = 'active'`
  - `transaction = 'vente'` (décision Ali Q2 — aussi enforced en DB par
    `listings_deal_only_for_vente_chk`)
  - `deal_active = false` (pas double-activation)
  - (Anti-spam temporel volontairement omis en V1 — décision Ali Q3 — le
    verrou `deal_price_lock_until` 30j suffit. À réévaluer V1.5 si abus
    détectés via `listing_deal_history`.)
- Calculs :
  - `deal_started_at = now()`
  - `deal_ends_at = now() + (durationDays || ' days')::interval`
  - `deal_price_lock_until = deal_ends_at + interval '30 days'`
  - `deal_original_price_mga = current.price_mga`
  - `new_price_mga = floor(current.price_mga * (1 - discountPercent / 100))`
- Atomicité : `UPDATE listings SET deal_*, price_mga = new_price_mga` +
  `INSERT INTO listing_deal_history` dans la même transaction (via SQL
  RPC `activate_deal_for_listing(...)` SECURITY DEFINER, c'est plus simple
  que jongler avec deux requêtes en Deno).

#### 4. Edge Function `supabase/functions/cancel-deal/index.ts`
- Annulation manuelle par le vendeur avant `deal_ends_at`.
- Update : `deal_active = false`, garde le `price_mga` actuel (le vendeur
  a déjà baissé, on ne restaure pas — décision actée brief §2.1).
- ⚠️ Conserve `deal_price_lock_until` tel quel pour empêcher l'abus :
  « j'active un deal, je l'annule 1 minute après, je remonte le prix » →
  bloqué par le trigger.
- `UPDATE listing_deal_history SET outcome = 'cancelled', ended_at = now()
  WHERE listing_id = $1 AND outcome = 'active'`.

#### 5. i18n
- Ajouter clés sous `deals.*` dans les 3 locales (parité 1950 → 1950+N).
- Au minimum :
  - `deals.modal.title`, `deals.modal.subtitle`
  - `deals.modal.discountLabel`, `deals.modal.durationLabel`
  - `deals.modal.recap.before`, `deals.modal.recap.after`,
    `deals.modal.recap.savings`
  - `deals.modal.guarantee30d`
  - `deals.modal.cta.activate`, `deals.modal.cta.cancel`
  - `deals.dashboardButton.activate`, `deals.dashboardButton.active`,
    `deals.dashboardButton.cancel`
  - `deals.toast.activated`, `deals.toast.cancelled`,
    `deals.toast.priceLocked` (catch erreur trigger)

#### 6. Tests (vitest)
- `src/test/dealActivationModal.test.tsx` : preset selection, preview
  calcul, validation zod.
- `src/test/dealsRpcContract.test.ts` : check shape réponse Edge Function
  (mock fetch).
- ⚠️ Pas de test E2E migration → c'est un sprint 0 différé Playwright.

### Critères de succès Sprint 1
- [ ] Vendeur peut activer un deal depuis son dashboard en < 30s
- [ ] `deal_active = true`, `price_mga` baissé, ligne dans
  `listing_deal_history`
- [ ] Tentative d'augmenter le prix au-dessus de `deal_original_price_mga`
  pendant le lock → toast d'erreur clair en français
- [ ] `npm run typecheck && npm run test` passent

---

## Sprint 2 — UI acheteur (1 j) — peut démarrer en parallèle de S1

### Livrables

#### 1. Composant `<DealBadge />`
- `src/features/deals/components/DealBadge.tsx` — extrait du badge inline
  actuel de `ListingCard.tsx:154-160`. Réutilisable sur la page détail.

#### 2. Mise à jour de toutes les variantes ListingCard
- ✅ Bonne nouvelle (audit) : un seul `ListingCard.tsx` couvre toutes les
  grilles. Pas de duplication.
- Le composant accepte déjà `dealMeta`. Le seul changement : la grille
  parente doit passer `dealMeta` calculé via `getDealMeta()`. Vérifier que
  `Index.tsx`, `YasFeaturedDeals.tsx`, `ListingDetail.tsx` le font déjà ;
  étendre à `SearchResultsGrid`, `FavoritesPage`, `AgencyProfile`.

#### 3. Filtre `has_deal=1` dans `/recherche`
- Toucher `src/lib/listingQueryFilters.ts` pour ajouter le filtre
  `.eq("deal_active", true).gt("deal_ends_at", new Date().toISOString())`.
- Toucher `src/pages/SearchPage.tsx` + `SearchToolbar` pour ajouter une
  chip « Bonnes affaires » filtrante.
- Toucher `src/lib/listingsSearchUrl.ts` (si présent) pour serializer/
  parser le query param.

#### 4. Page `/bonnes-affaires` (SEO indexable)
- `src/pages/BonnesAffairesPage.tsx`
- H1 : « Bonnes affaires véhicules à Madagascar »
- Meta : `<Helmet>` avec title, description, og:*
- **Filtre strict (décision Ali Q4)** : page alimentée UNIQUEMENT par
  `deal_active = true AND deal_ends_at > now() AND status = 'active'`.
  Pas de fallback `getDealMeta()` legacy (qui reste dédié aux baisses
  spontanées affichées sur la home et YAS).
- Grid `ListingCard` triée `deal_discount_percent DESC, deal_started_at
  DESC` via un nouveau hook `useActiveDeals` dans `src/hooks/useDeals.ts`.
- Pagination simple (load more 12 par 12).
- Lien depuis :
  - Footer (entrée nav)
  - `/yas-app` : remplacer le scroll `#deals` par un Link vers
    `/bonnes-affaires` (cf. `YasActionGrid.tsx`).
  - Index home : remplacer le `Link to="/recherche?sort=recent"`
    (Index.tsx:479) par `Link to="/bonnes-affaires"`.

#### 5. i18n
- Page nouvelle : `bonnesAffaires.title`, `bonnesAffaires.subtitle`,
  `bonnesAffaires.empty`, `bonnesAffaires.seoMeta.*`.

### Critères de succès Sprint 2
- [ ] `/bonnes-affaires` listée dans le sitemap.xml
- [ ] Filtre `?has_deal=1` fonctionne sur `/recherche`
- [ ] Lien YAS → `/bonnes-affaires` (route dédiée, plus de scroll hash)

---

## Sprint 3 — Cron expiration + notif vendeur (0.5 j)

### Livrables

#### 1. Edge Function `supabase/functions/expire-deals/index.ts`
- Auth : interne (verify_jwt = false, déclenchée par pg_net depuis pg_cron).
- Logique :
  ```sql
  -- Pour chaque listing dont le deal a expiré
  UPDATE public.listings
  SET deal_active = false
  WHERE deal_active = true AND deal_ends_at <= now()
  RETURNING id, owner_id, deal_started_at, deal_ends_at;

  -- Update l'historique correspondant
  UPDATE public.listing_deal_history
  SET outcome = 'expired', ended_at = now()
  WHERE outcome = 'active'
    AND listing_id IN (SELECT unnest($expired_ids));

  -- Note : deal_price_lock_until reste tel quel (déjà = deal_ends_at + 30j)
  ```
- Pour chaque vendeur impacté → enqueue un email
  `notification_queue` (table existante du système emails) avec template
  `deal_expired_seller_fr/en/mg`.

#### 2. Migration cron
- Nouveau fichier `supabase/migrations/<timestamp>_deals_cron.sql` :
  ```sql
  SELECT cron.schedule(
    'expire-deals-daily',
    '15 3 * * *',  -- tous les jours 03:15 UTC = 06:15 Antananarivo
    $$ SELECT net.http_post(
         url := 'https://vdarzzevkgcstmwytyht.supabase.co/functions/v1/expire-deals',
         headers := jsonb_build_object(
           'Authorization', 'Bearer ' || current_setting('vault.functions_invoke_token')
         )
       ) $$
  );
  ```
- ⚠️ Réutilise le pattern `vault.functions_invoke_token` du fix
  `20260426150000_fix_cron_use_vault.sql`.

#### 3. Templates email
- Ajouter `deal_expired_seller` dans le système emails existant
  (`src/lib/email/*` ou `supabase/functions/_shared/email/*`).

### Critères de succès Sprint 3
- [ ] À 03:15 chaque nuit, les deals dont `deal_ends_at <= now()` passent
  à `deal_active = false`
- [ ] Le vendeur reçoit un email l'informant de l'expiration
- [ ] Le verrou de prix continue 30 jours

---

## Sprint 4 (V1.5) — Notif acheteurs sur favoris (1 j, optionnel)

À l'activation d'un deal :
- SELECT users qui ont l'annonce en favori (`favorites WHERE listing_id =
  $1`)
- Pour chaque user, enqueue notification
  `notification_queue(kind='favorite_deal_activated', user_id, listing_id)`
- Template email + push (selon `notification_preferences` du user).

⚠️ Vérifier d'abord que le système favoris est stable et que le rate
limiting envoi email est OK (pour ne pas exploser le quota Resend si
300 users ont 50 favoris en deal).

---

## Sprint 5 (V2) — Monétisation (TBD)

Si V1 prouve son ROI (mesurer : taux d'activation, durée moyenne, taux
de leads sur deals vs. non-deals dans `partner_ad_events` / leads), passer
à 1 crédit par tranche de 7 jours (i.e. 1, 2 ou 4 crédits pour 7/14/30j).

Ajouter dans `src/config/monetization.ts` un coût explicite, et appeler
`spendCredits` dans `activate-deal` avant le UPDATE listings — pattern
identique aux boosts existants (`purchase_listing_boosts`).

---

## Récap dépendances inter-sprints

```
Sprint 0 (docs)
   │
   ▼
[Apply migration manuelle Ali]
   │
   ▼
Sprint 1 (UI vendeur) ───► Sprint 3 (cron) ───► Sprint 4 (notif favoris)
   │                                    
   └─► Sprint 2 (UI acheteur) ─ peut démarrer en parallèle
```
