# Moteur d'estimation — architecture v1 (legacy) / v2 (Edge Function)

> Branche : `feat/estimation-engine-v2`
> Statut : Sprint 1 livré (portage technique, ZERO impact user-facing).
> Feature flag DB : `app_config.estimation_engine_version` — défaut `legacy`.

---

## 1. Vue d'ensemble

| Aspect | v1 — legacy (client) | v2 — Edge Function |
|---|---|---|
| Localisation du calcul | Navigateur de l'utilisateur (`src/lib/estimation/engine.ts`) | Supabase Edge Function (`supabase/functions/compute-estimation/`) |
| Client Supabase utilisé | `anon key` (RLS) | `service_role key` (bypass RLS sur référentiels) |
| Lecture `listings` | RLS public sur `status='active'` | service_role |
| Lecture `vehicle_price_reference_profiles` | RLS public | service_role (préparation montée en charge) |
| Latence typique | Calcul local + 2-3 round-trips Supabase | 1 round-trip + calcul serveur |
| Avantages | Aucune dépendance réseau supplémentaire | Fait foi côté serveur, audit logs natifs Supabase, prêt pour ML futur |
| Inconvénients | Logique exposée client, dépend du device | +1 round-trip ; coût Edge Function |

**Parité comportementale stricte** : Sprint 1 a porté le moteur 1:1, sans changer une seule constante, coefficient, ou règle. 30 cas de test (`src/test/estimationEngineParity.test.ts`) vérifient que pour des entrées + données identiques, les deux moteurs renvoient des prix, tier, confiance, mode governance strictement égaux (différence absolue 0).

---

## 2. Feature flag `estimation_engine_version`

Stocké dans `public.app_config` :

```jsonc
{
  "key": "estimation_engine_version",
  "value": {
    "mode": "legacy" | "v2" | "rollout",
    "rollout_pct": 0,            // 0-100, utilisé uniquement si mode=rollout
    "v2_enabled_for_users": []   // user IDs forcés en v2 (canary, test interne)
  }
}
```

### Décision côté client (`runVehicleEstimation`)

1. `mode === "legacy"` → tout le monde reste sur le client.
2. `mode === "v2"` → tout le monde sur Edge Function.
3. `mode === "rollout"` →
   - Si `userId` est dans `v2_enabled_for_users` → `v2`.
   - Sinon hash déterministe de `requestId` modulo 100 ; si `< rollout_pct` → `v2`.

Le hash déterministe garantit que pour un même requestId, la décision est stable (utile QA / reproductibilité). La table `vehicle_estimation_requests` peut donc être analysée pour vérifier la répartition réelle.

### Fallback v2 → legacy

Si l'appel `supabase.functions.invoke("compute-estimation")` échoue (timeout, 5xx, JSON corrompu) :

- Le moteur legacy est exécuté à la place.
- Sentry capture l'événement avec `feature=estimation`, `action=estimation_v2_fallback`.
- L'événement telemetry `estimation_completed` porte `engine_version="legacy"` ET `v2_fallback_to_legacy=true`.
- L'utilisateur ne voit AUCUNE différence.

C'est l'invariant clé du sprint : **v2 ne peut jamais dégrader l'UX**.

---

## 3. Procédures opérationnelles

### Activer v2 pour soi (test interne / canary)

```sql
-- Test interne sur un seul user (récupérer son user_id depuis la table profiles ou auth.users)
UPDATE public.app_config
SET value = jsonb_set(
  value,
  '{v2_enabled_for_users}',
  '["00000000-0000-0000-0000-000000000000"]'::jsonb
)
WHERE key = 'estimation_engine_version';
```

### Démarrer un rollout progressif

```sql
-- 10% du trafic en v2
UPDATE public.app_config
SET value = '{"mode":"rollout","rollout_pct":10,"v2_enabled_for_users":[]}'::jsonb
WHERE key = 'estimation_engine_version';
```

Augmenter par paliers (10 → 25 → 50 → 100) en surveillant :

- Le taux d'événements `estimation_v2_fallback` dans Sentry (cible : < 0.5 %).
- Les comparatifs telemetry `engine_version` (skew des prix médians, etc.).
- La latence p95 du flow d'estimation côté front.

### Bascule full v2

```sql
UPDATE public.app_config
SET value = '{"mode":"v2","rollout_pct":100,"v2_enabled_for_users":[]}'::jsonb
WHERE key = 'estimation_engine_version';
```

### Rollback total

```sql
UPDATE public.app_config
SET value = '{"mode":"legacy","rollout_pct":0,"v2_enabled_for_users":[]}'::jsonb
WHERE key = 'estimation_engine_version';
```

Le flag est lu avec `staleTime = 5 min` côté React Query ; le rollback est donc effectif sous 5 min sans déploiement front.

---

## 4. Déploiement de l'Edge Function

```bash
# Pré-requis : CLI Supabase installée + login sur le projet AutoNex.
supabase functions deploy compute-estimation --project-ref wtkedamrmtvdoippqanc
```

Variables d'environnement requises (auto-injectées par Supabase) :

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Vérification post-deploy (curl / supabase functions invoke) :

```bash
supabase functions invoke compute-estimation \
  --project-ref wtkedamrmtvdoippqanc \
  --no-verify-jwt \
  --body '{
    "makeName":"Toyota","modelName":"Corolla","year":2020,"city":"Antananarivo",
    "mileage":75000,"fuelType":"diesel","transmissionType":"manual",
    "bodyType":"sedan","conditionLabel":"good","accidentDeclared":false,
    "maintenanceLevel":"partial","ownerCountLabel":"2","usageType":"personal"
  }'
```

La réponse attendue est `{ "ok": true, "data": { ... EstimationOutputV2 ... } }`.

---

## 5. Tests

### Parité (CRITIQUE)

`src/test/estimationEngineParity.test.ts` exécute 30 cas représentatifs :

- 5 Tier A (strong comparable set)
- 8 Tier B (moderate comparable set)
- 9 Tier C (reference assisted)
- 8 Tier D (heuristic only)

Chaque cas alimente le MÊME store de fixtures aux deux moteurs (legacy via `vi.mock("@/integrations/supabase/client")`, v2 via paramètre direct). Tolérance : différence absolue 0 sur `estimatedValue`, `lowEstimate`, `highEstimate`, `quickSalePrice`, `recommendedListingPrice`, `confidenceScore`, `tier`, `anchorBlendMode`, `modeGovernance`.

Toute évolution du moteur DOIT mettre à jour les deux côtés et passer ces 30 tests.

### Tests d'intégration HTTP (optionnels, à exécuter via `supabase functions serve`)

Pas exécutés en CI Node — l'Edge Function tourne sur Deno. Pour tester localement :

```bash
supabase functions serve compute-estimation
# Dans un autre terminal :
curl -X POST http://localhost:54321/functions/v1/compute-estimation \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d @path/to/payload.json
```

---

## 6. Limitations connues / dette restante

- Le typage TypeScript de la table `app_config` n'est pas encore régénéré dans `src/integrations/supabase/types.ts` (la migration n'a pas été appliquée à prod). Le hook + l'orchestrateur castent au minimum nécessaire ; à nettoyer dès que la migration est appliquée.
- L'Edge Function utilise `service_role` pour lire les comparables. Ce n'est pas strictement nécessaire pour `listings` (RLS le permet déjà), mais centralise les permissions et simplifie les futures évolutions (vue matérialisée, segment-aware queries, etc.).
- Le moteur legacy reste **intact et opérationnel**. Il sera dépréciable uniquement après plusieurs semaines de rollout v2 à 100 % et un check des KPIs (p95 latence, taux de fallback Sentry, distribution de prix).

---

## 7. Migration DB associée

`supabase/migrations/20260430140000_app_config_table.sql` — table + RLS + seed initial. **Idempotente, à appliquer manuellement** dans Supabase Studio par Ali (cf. policy v2 du `CLAUDE.md`).
