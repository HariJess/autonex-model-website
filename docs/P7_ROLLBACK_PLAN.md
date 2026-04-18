# P7 — Plan de rollback : centralisation des prix crédits

Référence : migration `supabase/migrations/20260418220000_credit_pricing_single_source.sql`.

Deux options selon la sévérité du problème constaté après push.

---

## Option 1 — Migration inverse (préférée si le souci est local aux 2 RPCs)

Utiliser si : les RPCs `publish_listing_with_credits` ou `purchase_listing_boosts` renvoient une erreur inattendue, ou si les prix lus depuis `credit_pricing` ne sont pas corrects.

**Pas de perte de données** : cette approche n'écrase que les fonctions introduites/modifiées par la migration P7, et supprime la nouvelle table `credit_pricing` (qui ne contient que des prix, pas de données utilisateur).

### Étapes

1. Créer une nouvelle migration datée (ex: `20260418230000_p7_rollback.sql`) au format suivant :

```sql
-- Rollback P7: restore hardcoded pricing in revenue RPCs and drop credit_pricing.

DROP FUNCTION IF EXISTS public.get_pricing();
DROP FUNCTION IF EXISTS public.pricing_for(TEXT);
DROP TABLE IF EXISTS public.credit_pricing CASCADE;
DROP FUNCTION IF EXISTS public.credit_pricing_touch_audit();

-- Re-apply the pre-P7 versions of the two revenue RPCs.
-- Copy-paste the bodies from:
--   supabase/migrations/20260418113000_publish_listing_with_credits.sql
--   supabase/migrations/20260414143000_purchase_listing_boosts.sql
-- (Both files remain untouched in git; use `git show` on the commit
-- 34f73c5 or earlier if you need to retrieve them cleanly.)
```

2. Coller les corps exacts des 2 RPCs depuis les migrations pré-P7 (`20260418113000_*` et `20260414143000_*`), sans modification. Git garantit qu'ils sont intacts : la règle CLAUDE.md interdit la modification de migrations existantes.

3. `supabase db push` depuis PowerShell.

4. Vérifier depuis le SQL Editor :

```sql
-- Doit renvoyer "ERROR: relation public.credit_pricing does not exist"
SELECT * FROM public.credit_pricing;

-- Doit renvoyer un corps de fonction SANS référence à pricing_for
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'publish_listing_with_credits';
```

5. Côté front, si la Phase B avait déjà été déployée : le hook `usePricing` renverra une erreur réseau mais le fallback local dans `monetization.ts` prendra le relais. Aucune action immédiate requise.

**Temps estimé** : 10-15 minutes.

---

## Option 2 — Restore du backup Supabase (préférée si incident grave et urgent)

Utiliser si : corruption de données inattendue au-delà de `credit_pricing`, erreurs RLS généralisées, ou si l'Option 1 a elle-même échoué.

**Conséquence** : toute modification de la DB postérieure au backup sera perdue (annonces créées, crédits achetés, profils mis à jour, etc.). À éviter si du trafic réel a eu lieu entre le backup et le push.

### Backup disponible

- Date : **2026-04-18, 04:16 UTC**
- Projet : `wtkedamrmtvdoippqanc`

### Étapes

1. Ouvrir le dashboard Supabase : https://supabase.com/dashboard/project/wtkedamrmtvdoippqanc
2. Aller dans **Database → Backups**
3. Sélectionner le backup du 18 avril 04:16 UTC
4. Cliquer **Restore** et confirmer (un modal de confirmation demande de saisir le nom du projet)
5. Attendre la fin de la restauration (quelques minutes selon la taille)
6. Vérifier via SQL Editor :

```sql
-- Doit renvoyer "ERROR" (la table n'existait pas avant P7)
SELECT * FROM public.credit_pricing LIMIT 1;

-- Doit renvoyer le corps de fonction version pré-P7
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'publish_listing_with_credits';
```

7. Côté front : si Phase B déployée, le hook `usePricing` renverra une erreur réseau → fallback local pris en compte. Aucun utilisateur n'est bloqué sur l'achat/publication (les prix fallback sont identiques aux valeurs seedées).

**Temps estimé** : 15-30 minutes incluant la restauration elle-même.

---

## Critère de décision rapide

| Symptôme | Option conseillée |
|---|---|
| RPC renvoie une erreur inconnue côté front | Option 1 |
| Prix incorrects affichés ou débitement du mauvais montant | Option 1 |
| Incohérence RLS sur credit_pricing (user non-admin voit des prix qu'il ne devrait pas voir) | Option 1 (mais peu probable : SELECT est intentionnellement public) |
| Erreur systémique qui touche d'autres tables / policies / fonctions | Option 2 |
| Option 1 appliquée mais le système reste cassé | Option 2 |

---

## Après un rollback

1. Analyser la cause avant de retenter le push — ne pas re-pousser aveuglément.
2. Si Option 2 utilisée : vérifier que toutes les migrations postérieures au backup sont bien re-appliquées (Supabase les re-joue automatiquement après restore, mais confirmer dans `supabase/migrations/`).
3. Documenter l'incident dans `docs/AUDIT_FINDINGS.md` ou un journal d'incident dédié.
