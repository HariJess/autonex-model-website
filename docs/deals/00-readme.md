# Feature « Bonnes affaires » (Deals vendeur) — Index sprint 0

> Sprint 0 = fondations. Audit + schéma DB + migration SQL prête à coller.
> Aucun code applicatif modifié. Aucun commit, aucun push.

## Résumé exécutif (10 lignes)

1. **Pourquoi** : `/bonnes-affaires` et la section deals YAS sont vides
   parce qu'il n'y a aucune UX vendeur pour activer un deal. On ajoute la
   feature.
2. **Sprint 0 (ici)** = DB only. Sprint 1 = UI vendeur. Sprint 2 = UI
   acheteur. Sprint 3 = cron expiration + notif. Sprints 4 et 5 = options.
3. **DB** : 7 colonnes `deal_*` ajoutées à `public.listings`, 1 nouvelle
   table `public.listing_deal_history` immutable, 1 trigger
   anti-fake-discount, 2 indexes partiels. Migration 100% additive,
   non-destructive, idempotente, ~140 lignes SQL.
4. **Garantie acheteur** : un `deal_price_lock_until = deal_ends_at + 30j`
   couplé au trigger `enforce_deal_price_lock` empêche le vendeur de
   remonter le prix au-dessus de `deal_original_price_mga` pendant 30j
   après la fin du deal. Pas de faux rabais possible.
5. **Greffe UI** : le bouton « 🔥 Mettre en bonne affaire » va dans le
   dashboard vendeur (`DashboardListingsSection.tsx`, mobile + desktop), pas
   dans une page d'édition (qui n'existe pas — l'édition se fait via
   `/publier?edit=<id>`).
6. **`ListingCard` accepte déjà `dealMeta`** → pas de refacto carte au
   sprint 2. Il suffit que les grilles parentes lui passent le bon meta.
7. **pg_cron actif** + Edge Functions schedulées → pattern déjà rodé
   (cf. `send-queued-notification-emails`). Pas d'extension à activer
   pour le sprint 3.
8. **Hygiène DB** : on garde `original_price_mga` historique (snapshot
   organique) ET on introduit `deal_original_price_mga` (snapshot
   contractuel). Sémantiques différentes, ne pas fusionner.
9. **i18n parité** actuelle 1950 clés × fr/en/mg. Sprint 1 ajoutera ~15-20
   clés `deals.*` à maintenir en parité.
10. **Action immédiate Ali** : appliquer `03-migration.sql` dans Supabase
    Studio, vérifier les smoke-tests en commentaire, répondre aux
    `Questions pour Ali avant Sprint 1` ci-dessous.

## Fichiers livrés

| # | Fichier | Contenu |
|---|---|---|
| 1 | [`01-audit-codebase.md`](./01-audit-codebase.md) | Mapping listings, RLS, indexes, pg_cron, i18n, dashboard greffe |
| 2 | [`02-schema-db.md`](./02-schema-db.md) | Schéma DB final + justifications + RLS + trigger |
| 3 | [`03-migration.sql`](./03-migration.sql) | Migration prête à coller dans Supabase Studio |
| 4 | [`04-plan-sprints.md`](./04-plan-sprints.md) | Plan détaillé Sprints 1 à 5 |
| 5 | `00-readme.md` (ce fichier) | Index + résumé exécutif + questions Ali |

## Décisions actées Ali (sprint 0)

Les 4 questions ouvertes du brief initial ont été tranchées. Audit trail :
patch reçu sous forme du prompt `patch-sprint-0-pre-migration.md` daté
2026-04-30, intégré dans les livrables ci-dessus.

| Q | Décision actée |
|---|---|
| **Q1** | `deal_original_price_mga` → **`numeric`** (pas `bigint`). Cohérence avec `original_price_mga numeric` legacy pour éviter les casts implicites dans `getDealMeta()` et le futur cron `expire-deals`. |
| **Q2** | Deals **réservés à `transaction = 'vente'`**. Enforced en DB par `listings_deal_only_for_vente_chk` ET dans l'Edge Function `activate-deal`. |
| **Q3** | **Pas d'anti-spam temporel en V1.** Le verrou `deal_price_lock_until` (30j) suffit. À monitorer via `listing_deal_history`, à réévaluer V1.5 si abus détectés. |
| **Q4** | Page `/bonnes-affaires` → **`deal_active = true AND deal_ends_at > now()` UNIQUEMENT**. La home et YAS conservent leur logique `getDealMeta()` legacy (snapshot organique de baisse spontanée). |

Conséquences appliquées dans cette release de docs :
- `03-migration.sql` : type `numeric`, trigger sans `SECURITY DEFINER`,
  CHECK `transaction = 'vente'`, smoke-tests déplacés après le `COMMIT;`.
- `02-schema-db.md` : tableau §2.1 mis à jour, justifications 3 et 4
  ajoutées, §2.5 sans DEFINER.
- `04-plan-sprints.md` : sprint 1 retire l'anti-spam temporel ; sprint 2
  spécifie le filtre strict `deal_active = true AND deal_ends_at > now()`.

---

## Action immédiate Ali

1. **Preflight timezone** — exécuter dans Supabase Studio > SQL Editor :
   ```sql
   SELECT now() AT TIME ZONE 'Indian/Antananarivo' AS antananarivo_now;
   ```
   Si ça renvoie un timestamp valide → migration OK telle quelle.
   Si ça plante → ping moi, on patche le `RAISE EXCEPTION` en fallback UTC.
2. **Coller `03-migration.sql`** dans Supabase Studio > SQL Editor et
   exécuter (transaction unique, idempotente).
3. **Exécuter les 5 smoke-tests** (en session séparée, après le `COMMIT;`).
4. **Confirmer « migration appliquée »** dans le chat → je démarre le
   sprint 1 (UI vendeur).
