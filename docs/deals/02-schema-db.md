# 02 — Schéma DB (feature Deals vendeur)

> Concrétise les décisions DB en partant du squelette du brief Ali, avec les
> ajustements issus de l'audit (cf. `01-audit-codebase.md`).

---

## 2.1 — Champs à ajouter à `public.listings`

| Colonne | Type | Default | Contraintes | Justification |
|---|---|---|---|---|
| `deal_active` | `boolean` | `false` | `NOT NULL` | Flag explicite. Permet un index partiel ultra-rapide (`WHERE deal_active = true`) pour la page `/bonnes-affaires` et le filtre `has_deal=1`. Calculer ce booléen à la volée (via `now() < deal_ends_at`) imposerait un IMMUTABLE-failing predicate dans les vues/index — explicit beats implicit. |
| `deal_started_at` | `timestamptz` | `null` | nullable | Snapshot de la date d'activation. Sert d'audit (vérifier qu'on ne réactive pas un deal quotidien) + entrée pour `listing_deal_history`. |
| `deal_ends_at` | `timestamptz` | `null` | nullable | Calculé côté Edge Function : `deal_started_at + (deal_duration_days \|\| ' days')::interval`. C'est la valeur lue par le cron `expire-deals`. |
| `deal_duration_days` | `integer` | `null` | `CHECK (deal_duration_days IS NULL OR deal_duration_days IN (7, 14, 30))` | Durée fermée par produit. Si on veut élargir plus tard, on étend l'enum CHECK. |
| `deal_discount_percent` | `integer` | `null` | `CHECK (deal_discount_percent IS NULL OR deal_discount_percent BETWEEN 5 AND 30)` | Snapshot du % vu par l'acheteur. Utile pour tri DESC sans recalcul. |
| `deal_original_price_mga` | `numeric` | `null` | nullable | **Snapshot du prix avant baisse spécifique au deal.** Distinct de `original_price_mga` historique (cf. justification ci-dessous). Type `numeric` pour cohérence avec `original_price_mga` legacy — décision actée Q1. |
| `deal_price_lock_until` | `timestamptz` | `null` | nullable | **Anti-fake-discount** : `deal_ends_at + interval '30 days'`. Tant que `now() < deal_price_lock_until`, le trigger `BEFORE UPDATE` interdit `price_mga > deal_original_price_mga`. |

### Pourquoi `deal_original_price_mga` distinct de `original_price_mga` ?

✅ **Recommandation Ali validée — on garde les deux séparés.**

1. **Sémantique différente.**
   - `original_price_mga` est un snapshot **organique** maintenu par
     `computeOriginalPriceMgaForEdit()` (`src/lib/publishDraft.ts:862`).
     Il est posé/effacé à chaque baisse/remontée libre du prix par le
     vendeur, sans aucun engagement temporel.
   - `deal_original_price_mga` est un snapshot **contractuel** posé une
     unique fois à l'activation d'un deal et figé jusqu'à
     `deal_price_lock_until`.
2. **Risque de pollution si on fusionnait.**
   - L'autosave de `PublishPage.tsx` (lignes 779-787) appellerait
     `computeOriginalPriceMgaForEdit` qui pourrait écraser le snapshot deal
     dès que le vendeur édite ne serait-ce qu'une virgule du titre — la
     fonction ne sait rien des deals.
   - À l'inverse, si on faisait que `getDealMeta()` lise un champ "fusionné"
     qui sert aussi au snapshot organique, on afficherait un faux deal
     "permanent" pour toute annonce dont le vendeur a baissé le prix
     spontanément (situation actuelle non-régressée mais qu'on veut clarifier
     — voir §Question pour Ali #3).
3. **Type aligné avec `original_price_mga` legacy.** Décision Ali Q1 :
   `deal_original_price_mga numeric` (et non `bigint`) pour éviter les
   casts implicites lors des calculs
   `(deal_original_price_mga - price_mga) / deal_original_price_mga`
   côté `getDealMeta()` et le futur cron `expire-deals`. La cohabitation
   `price_mga bigint` ↔ `*_price_mga numeric` est déjà tolérée dans le
   repo (cf. `original_price_mga`).
4. **Restriction `transaction = 'vente'` enforced en DB.** Décision
   Ali Q2 : un CHECK partiel `listings_deal_only_for_vente_chk` empêche
   `deal_active = true` sur une annonce de location longue/courte durée.
   Sémantique : un loyer mensuel barré n'a pas la même promesse qu'un
   prix de vente barré. Garde DB en plus de la validation Edge Function.

### Décision actée à l'expiration

Quand `deal_ends_at <= now()` (cf. cron sprint 3) :
1. `deal_active = false`.
2. `price_mga` reste tel quel (le vendeur a réellement baissé, pas de
   restauration automatique).
3. `deal_price_lock_until = deal_ends_at + interval '30 days'` est *déjà*
   posé à l'activation, donc rien à faire.
4. Une ligne `outcome='expired'` est ajoutée à `listing_deal_history`.

---

## 2.2 — Nouvelle table `public.listing_deal_history`

```sql
CREATE TABLE public.listing_deal_history (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          uuid        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  started_at          timestamptz NOT NULL,
  ended_at            timestamptz,
  discount_percent    integer     NOT NULL CHECK (discount_percent BETWEEN 5 AND 30),
  duration_days       integer     NOT NULL CHECK (duration_days IN (7, 14, 30)),
  original_price_mga  bigint      NOT NULL CHECK (original_price_mga > 0),
  new_price_mga       bigint      NOT NULL CHECK (new_price_mga > 0),
  outcome             text        NOT NULL CHECK (outcome IN ('active', 'expired', 'cancelled', 'sold'))
                                  DEFAULT 'active',
  created_at          timestamptz NOT NULL DEFAULT now()
);
```

### Justifications / ajustements vs. brief

- ✅ **Ajouts mineurs** :
  - `outcome NOT NULL DEFAULT 'active'` (au lieu de nullable) — toute ligne a
    un état, pas de zombie.
  - `original_price_mga > 0` et `new_price_mga > 0` CHECKs — protection
    minimale pour éviter les valeurs sentinelles bizarres si quelqu'un INSERT
    direct via service_role.
- ❌ **Pas de FK ON DELETE SET NULL sur `user_id`.** Si l'utilisateur supprime
  son compte (RGPD), CASCADE supprime aussi son historique de deals — c'est
  ce qu'on veut, l'historique n'a aucune valeur produit après suppression.
- ❌ **Pas de colonne `ended_reason text`.** `outcome` suffit. Si plus tard on
  veut distinguer "expired_normal" vs "expired_market_correction" on étend
  l'enum CHECK.
- ✅ **`ended_at timestamptz NULL`** : posé au moment où `outcome` change
  (`expired`, `cancelled`, `sold`). Tant que `outcome = 'active'`,
  `ended_at = NULL`.

### Indexes recommandés

```sql
CREATE INDEX idx_listing_deal_history_user_id
  ON public.listing_deal_history(user_id, created_at DESC);
-- Sert la query "mon historique de deals" depuis le dashboard vendeur
-- (sprint 1 V1.1 ou plus tard).

CREATE INDEX idx_listing_deal_history_listing_id
  ON public.listing_deal_history(listing_id, created_at DESC);
-- Sert "tous les deals passés sur cette annonce" — utile pour anti-abus
-- (vendeur qui essaye de re-deal toutes les 4 semaines).

CREATE INDEX idx_listing_deal_history_active
  ON public.listing_deal_history(listing_id)
  WHERE outcome = 'active';
-- Index partiel — idéal pour "le deal actif sur cette annonce" en O(log N).
```

Pas d'index sur `outcome` global — la cardinalité est faible (4 valeurs)
et les autres indexes couvrent les cas vraiment chauds.

---

## 2.3 — Indexes sur `listings` pour les deals

Deux requêtes à servir :

1. **Page `/bonnes-affaires`** (et filtre `has_deal=1` dans `/recherche`) :
   ```sql
   SELECT ... FROM listings
   WHERE deal_active = true
     AND deal_ends_at > now()
     AND status = 'active'
   ORDER BY deal_discount_percent DESC, deal_started_at DESC;
   ```

2. **Cron `expire-deals` quotidien** :
   ```sql
   SELECT id, owner_id, deal_started_at, deal_ends_at,
          deal_discount_percent, deal_duration_days,
          deal_original_price_mga, price_mga
   FROM listings
   WHERE deal_active = true
     AND deal_ends_at <= now();
   ```

### Indexes proposés

```sql
-- Index partiel principal — sert les 2 queries
CREATE INDEX idx_listings_active_deals
  ON public.listings(deal_ends_at)
  WHERE deal_active = true;
-- Volumétrie : on s'attend à << 5% des listings en deal à un instant donné,
-- donc index partiel ~50× plus petit que B-Tree complet sur deal_ends_at.

-- Index secondaire pour le tri par % décroissant sur la page /bonnes-affaires
CREATE INDEX idx_listings_active_deals_discount
  ON public.listings(deal_discount_percent DESC, deal_started_at DESC)
  WHERE deal_active = true;
-- Optionnel — à mesurer après lancement. Si `idx_listings_active_deals`
-- + filter post-fetch ORDER BY suffit, on droppe cet index secondaire.
```

❌ **Pas d'index sur `deal_started_at` seul.** Pas de query qui le filtre.

❌ **Pas d'index couvrant `(deal_active, deal_ends_at, deal_discount_percent
DESC)`.** Coût d'écriture > gain. La règle « pas d'over-engineering » du brief
prévaut, on est sur quelques milliers de listings max.

---

## 2.4 — RLS pour `listing_deal_history`

```sql
ALTER TABLE public.listing_deal_history ENABLE ROW LEVEL SECURITY;

-- SELECT : le vendeur voit son propre historique
DROP POLICY IF EXISTS "Owner reads own deal history" ON public.listing_deal_history;
CREATE POLICY "Owner reads own deal history"
  ON public.listing_deal_history
  FOR SELECT
  USING (user_id = auth.uid());

-- SELECT bonus : un admin (immonex_is_admin) voit tout, pour le dashboard
-- /admin/revenus ou la modération abus
DROP POLICY IF EXISTS "Admins read all deal history" ON public.listing_deal_history;
CREATE POLICY "Admins read all deal history"
  ON public.listing_deal_history
  FOR SELECT
  USING (public.immonex_is_admin());

-- INSERT : interdit aux clients. La table est uniquement remplie par les
-- Edge Functions activate-deal / cancel-deal / expire-deals (qui passent en
-- service_role et bypass RLS, OU via une RPC SECURITY DEFINER si on préfère
-- éviter le service_role dans Deno).
-- → AUCUNE policy INSERT (= rejet implicite pour tous les rôles authent).

-- UPDATE / DELETE : interdits — table immutable côté client.
-- → AUCUNE policy. Les Edge Functions l'updateront via service_role.
```

### ⚠️ Liste explicite des policies créées (validation Ali requise par le brief)

1. ✅ `SELECT "Owner reads own deal history"` — `user_id = auth.uid()`
2. ✅ `SELECT "Admins read all deal history"` — `immonex_is_admin()`
3. ❌ AUCUNE INSERT/UPDATE/DELETE → **bypass via service_role uniquement**

### ⚠️ Listings — RLS NON modifiée par cette migration

Les policies existantes sur `public.listings` (cf. `01-audit-codebase.md`
§1.2) restent inchangées. Elles autorisent `auth.uid() = owner_id` à
UPDATE, ce qui suffit pour que le vendeur écrive ses champs `deal_*` —
mais on validera côté Edge Function qu'il ne triche pas (% out of range,
durée hors enum, original_price > current_price, etc.).

**Aucune nouvelle policy `listings` ajoutée.** Si un jour on veut empêcher
qu'un client patche `deal_*` directement (sans passer par Edge Function),
il faudra une policy UPDATE colonne-aware avec `current_setting('request.
jwt.claims')` — mais c'est V2 et hors scope sprint 0.

---

## 2.5 — Trigger anti-fake-discount

```sql
CREATE OR REPLACE FUNCTION public.enforce_deal_price_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Le lock ne s'applique que si on a une fenêtre de protection en cours
  -- (deal_price_lock_until renseigné ET pas encore dépassé) ET un prix
  -- de référence à comparer.
  IF NEW.deal_price_lock_until IS NOT NULL
     AND now() < NEW.deal_price_lock_until
     AND NEW.deal_original_price_mga IS NOT NULL
     AND NEW.price_mga > NEW.deal_original_price_mga
  THEN
    RAISE EXCEPTION
      'Prix verrouillé jusqu''au % : impossible de remonter au-dessus de % MGA (prix avant le deal). Cette protection contre les faux rabais expire % jours après la fin du deal.',
      to_char(NEW.deal_price_lock_until AT TIME ZONE 'Indian/Antananarivo', 'DD/MM/YYYY HH24:MI'),
      NEW.deal_original_price_mga,
      30
    USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_deal_price_lock ON public.listings;
CREATE TRIGGER trg_enforce_deal_price_lock
  BEFORE UPDATE OF price_mga, deal_price_lock_until, deal_original_price_mga
  ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_deal_price_lock();
```

### Notes design

- **`SET search_path = public` SANS `SECURITY DEFINER`** — un trigger
  BEFORE UPDATE qui ne lit que `NEW.*` n'a aucun besoin d'élévation de
  privilèges. On garde le pin search_path (bonne pratique
  search_path-injection) mais on évite le DEFINER cargo-culted depuis
  les autres fonctions du repo (qui, elles, font des INSERT inter-tables
  avec besoin réel — comme `handle_new_user`).
- **`BEFORE UPDATE OF` colonnes** — limite le firing aux UPDATE qui touchent
  vraiment ces colonnes (pas chaque save de description).
- **Message d'erreur en français + heure locale Antananarivo** — pour que le
  catch côté front (`parseSupabaseError`) puisse remonter un toast lisible.
- **`USING ERRCODE = 'check_violation'`** — code SQLSTATE 23514, distinct
  des erreurs RLS (42501) → le front peut différencier le toast "verrou
  prix actif" du toast "permission denied".
- **Pas de bypass admin.** Volontaire : si un admin baisse le prix sur une
  annonce verrouillée pour raison légitime, il devra d'abord clear le
  `deal_price_lock_until` manuellement. C'est volontairement frictionnant
  pour éviter qu'un admin "accidentel" casse la garantie acheteur.

---

## 2.6 — Côté applicatif : pourquoi une Edge Function pour activer/cancel ?

Bien que la policy UPDATE `listings` autorise déjà le vendeur, on impose le
passage par une Edge Function `activate-deal` (sprint 1) parce que :

1. **Validation centralisée** : l'EF check
   `discount_percent ∈ [5, 30]`, `duration_days ∈ {7,14,30}`,
   `now() - last_deal_ended_at >= 30 days` (anti-spam — un deal toutes les 4
   semaines max — à valider avec Ali, voir Q4).
2. **Atomicité** : un seul aller-retour réseau pour
   `UPDATE listings SET deal_*` + `INSERT INTO listing_deal_history`.
3. **Calculs serveur** : `deal_started_at = now()`, `deal_ends_at =
   now() + interval ?days`, `deal_price_lock_until = deal_ends_at + 30
   days`, `deal_original_price_mga = current price_mga`,
   `new price_mga = round(current * (1 - %/100))`. Le client ne fournit que
   `discount_percent` et `duration_days`.
4. **Horodatage source unique** : la fenêtre de validité se calcule sur
   l'horloge serveur Supabase, pas sur le device client (qui peut être
   désynchro de plusieurs minutes).

Sprint 0 ne livre PAS le code Edge Function — on livre la migration SQL
prête, et on documente ce contrat.

---

## Récap policies à valider par Ali

| Action | Table | Effet |
|---|---|---|
| ➕ ADD POLICY | `listing_deal_history` | SELECT pour `user_id = auth.uid()` |
| ➕ ADD POLICY | `listing_deal_history` | SELECT pour `immonex_is_admin()` |
| ➕ ADD TRIGGER | `listings` | `BEFORE UPDATE OF price_mga, deal_price_lock_until, deal_original_price_mga` → `enforce_deal_price_lock()` |
| ➕ ADD COLUMN ×7 | `listings` | `deal_active`, `deal_started_at`, `deal_ends_at`, `deal_duration_days`, `deal_discount_percent`, `deal_original_price_mga`, `deal_price_lock_until` |
| ➕ ADD INDEX ×2 | `listings` | partiels sur `deal_active = true` |
| ➕ CREATE TABLE | `listing_deal_history` | nouvelle table immutable |
| ➕ ADD INDEX ×3 | `listing_deal_history` | dont 1 partiel `outcome = 'active'` |
| ❌ ALTER POLICY | `listings` | **AUCUNE modification** des policies existantes |
| ❌ DROP/RENAME | n'importe | **AUCUN** changement destructeur |

✅ **Migration 100% additive non-destructive** — éligible au self-apply
selon la *DB Migration Policy v2* du `CLAUDE.md`. Mais conformément au
brief de ce sprint (« AUCUNE migration appliquée automatiquement »), Ali
l'appliquera manuellement après review.
