# Audit complet AutoNex Madagascar — 28 avril 2026

**Auditeur** : Claude (Opus 4.7, 1M context).
**Mode** : diagnostic uniquement, aucune modification de code, aucun commit.
**Périmètre** : repo `autonex-madagascar` état branch `main`, 79 migrations, 432 fichiers TS/TSX, 448 tests verts.

---

## Résumé exécutif

**Note globale : 6.5/10**

AutoNex est une stack mature et propre pour son âge (~2-3 semaines de prod active sur la version véhicule). Le code TypeScript est **strict de bout en bout** (presque zéro `any`, 2 `@ts-ignore` dans tout le repo, 3 TODOs), la sécurité applicative est sérieuse (RLS hardenée, RPC SECURITY DEFINER systématiques, profiles non-publiques, vercel.json avec CSP serrée), et les tests sont au-dessus de la moyenne pour une marketplace de cette taille (448 tests dont 7 d'intégration RLS contre une vraie DB).

Les **trois faiblesses systémiques** qui plombent la note :

1. **Aucune CI/CD** : `.github/workflows/` n'existe pas. Vercel auto-déploie chaque push sur `main` sans typecheck, lint, test ni build préalable. Un développeur (ou un assistant LLM) qui pousse du code cassé met le site en panne sans qu'aucune barrière ne l'arrête.
2. **Une view leakée** : `listings_vehicle_semantics` n'a pas `security_invoker = true`, donc s'exécute avec les privilèges du créateur et bypass la RLS de `listings`. Même bug que celui qu'on vient de fixer sur `partner_ad_campaign_stats`. À corriger cette semaine.
3. **Index DB manquants sur les tables hot** : `transactions` n'a qu'un seul index secondaire (`idx_transactions_provider`), `credits_ledger` n'en a aucun. Mes nouveaux RPC dashboard scannent ces tables. Tant que le volume reste bas (~hundreds de tx) ça passe. À 10k+ ça devient un problème mesurable.

Bien à part : la documentation dans `CLAUDE.md` contient plusieurs assertions **fausses** (priorité 4 marquée à faire mais déjà faite, ESLint marqué permissif alors qu'il est en `error`). Le doc rot là.

### Notes par catégorie

| Catégorie | Note | Verdict |
|-----------|------|---------|
| Architecture & code | 7/10 | TS strict, peu de dette, mais 5 fichiers > 800 lignes |
| Sécurité | 7/10 | RLS solide, mais 1 view non-invoker + service-role key dans `src/lib/` |
| Performance | 6/10 | Lazy partout, mais main bundle 140 KB gzip + recharts 105 KB + pas de PWA |
| Database | 6.5/10 | Migrations propres mais index manquants sur tables hot |
| Tests & qualité | 7.5/10 | 448 tests + RLS, manque coverage et E2E paiement |
| UX & accessibilité | 8/10 | Zero `<div onClick>`, aria-* généreux, ErrorBoundary avec Sentry |
| DevOps & monitoring | 4/10 | Sentry OK, mais aucune CI/CD, aucun uptime monitoring |

### Top 10 priorités (par ROI)

| # | Finding | Sévérité | Effort | Impact | Phase |
|---|---------|----------|--------|--------|-------|
| 1 | View `listings_vehicle_semantics` doit passer en `security_invoker=true` | Critical | S | Très haut | Sécurité |
| 2 | Mettre en place GitHub Actions (typecheck + lint + test + build sur PR/push) | Critical | S | Très haut | DevOps |
| 3 | Ajouter index sur `transactions(created_at, status)` et `credits_ledger(user_id, created_at DESC)` | Critical | S | Haut | Database |
| 4 | Déplacer `src/lib/market/*Repository.ts` hors de `src/` (service-role key footgun) | High | S | Très haut | Sécurité |
| 5 | Auditer + ajouter `SET search_path = public` sur les ~22 SECURITY DEFINER manquantes | High | M | Haut | Sécurité |
| 6 | Wire Husky + lint-staged (pre-commit typecheck + tests touchés) | High | S | Haut | Tests |
| 7 | Convertir les 4 blog covers JPG (200-350 KB) en WebP + srcset responsive | High | S | Haut (3G MG) | Performance |
| 8 | Refactor `PublishPage.tsx` (1144 lignes, 58 useState) vers react-hook-form (priorité 6 CLAUDE.md) | High | L | Haut maintenance | Architecture |
| 9 | Ajouter Playwright E2E sur le funnel paiement (publish → tx → admin approve) | High | L | Haut (revenu) | Tests |
| 10 | Lazy-load i18n par langue (priorité 3 CLAUDE.md, gain ~85 KB) | Medium | M | Moyen | Performance |

---

## Phase 1 — Architecture & code

**Note : 7/10**

Architecture cohérente et conventions stables. La séparation `pages/`, `components/`, `hooks/`, `lib/`, `integrations/` tient debout. Les composants UI ne tapent presque jamais Supabase directement (1 seule occurrence : `src/components/settings/sections/SecuriteSection.tsx`), tout le reste passe par des hooks. TypeScript strict est activé, `noUnusedLocals` et `noUnusedParameters` aussi, et la règle ESLint `no-unused-vars` est en `error` (pas `off` comme l'affirme `CLAUDE.md`). Quasi zéro dette de typage : 11 occurrences de `any` au total dans tout `src/`, dont la plupart dans des fichiers data ou des mocks de tests, et seulement 2 `@ts-ignore` (1 dans un commentaire — pas une vraie suppression — et 1 dans un test).

Le vrai problème d'architecture est que **5 fichiers dépassent 800 lignes** (sans compter les data files et le `types.ts` auto-généré). Ce sont des pages monolithiques qui gèrent fetching, state, validation et rendu en un seul bloc — typique de la dérive d'une page qui grossit organiquement. Le top file (`PublishPage.tsx` 1144 lignes / 58 `useState`) est déjà identifié dans le backlog (priorité 6 CLAUDE.md), mais d'autres comme `HeroSearch.tsx` (837 lignes) ou `VehicleEstimationPage.tsx` (805) ne le sont pas.

Statistiques :
- 432 fichiers TS/TSX dans `src/`
- 125 composants, 36 hooks custom, 77 pages
- 77 fichiers de tests
- Total LOC : ~62 500 (incluant `types.ts` 3386 et data files)

### Findings

#### [HIGH] PublishPage.tsx + PublishDetailsSection.tsx : 2200 lignes cumulées
- **Description** : `src/pages/PublishPage.tsx` (1144 lignes, 58 `useState`) et son extrait `src/pages/publish/components/PublishDetailsSection.tsx` (1058 lignes). State manuel partout, pas de `react-hook-form` (pourtant déjà dépendance du projet). Chaque champ rajouté = un `useState` de plus.
- **Localisation** : `src/pages/PublishPage.tsx`, `src/pages/publish/components/PublishDetailsSection.tsx`
- **Impact** : maintenance coûteuse, validation dispersée, tests difficiles à écrire (aucun test unitaire sur PublishPage existant). Risque de régression sur chaque ajout de champ.
- **Fix proposé** : refacto progressif vers `react-hook-form` + Zod schema. Migrer section par section (Détails / Médias / Visibilité / Contact). Voir priorité 6 du CLAUDE.md.
- **Effort** : L (sprint complet).

#### [HIGH] `src/lib/market/*Repository.ts` créent un client Supabase avec service-role key, mais sont dans `src/`
- **Description** : `cleanListingRepository.ts`, `marketStatsRepository.ts`, `rawListingRepository.ts` exportent `createMarketAdminClientFromEnv()` qui lit `process.env.SUPABASE_SERVICE_ROLE_KEY` et instancie un client admin. Ces fichiers vivent dans `src/lib/market/` — donc dans le périmètre Vite/build. Aujourd'hui ils ne sont importés que par eux-mêmes (auto-imports dans le dossier), donc tree-shakés du bundle. Mais le jour où un dev fait `import { ... } from "@/lib/market/marketStatsRepository"` depuis un composant, **le bundle client embarque le code qui lit la service-role key** — et même si la clé n'est pas en env client, la simple présence de cette logique dans le bundle est un gros red flag de sécurité.
- **Localisation** : `src/lib/market/cleanListingRepository.ts:14`, `src/lib/market/marketStatsRepository.ts:13`, `src/lib/market/rawListingRepository.ts:101`
- **Impact** : footgun. Pas de vulnérabilité aujourd'hui (vérifié : non importé par les pages, non présent dans `dist/`), mais une seule ligne d'import accidentelle créera une fuite. Aussi : duplication avec `scripts/market/*.mjs` qui font le même travail mais en Node.
- **Fix proposé** : déplacer les `*Repository.ts` vers `scripts/market/*.ts` (compilés via `tsx`) ou vers `supabase/functions/`. Supprimer la duplication `.mjs/.ts`.
- **Effort** : S (déplacement + adapter les chemins d'import dans les scripts qui les utilisent).

#### [MEDIUM] HeroSearch.tsx : 837 lignes, pas dans le backlog
- **Description** : composant de recherche home, gère plusieurs étapes UI + filtres + auto-complétion. Contrairement à PublishPage, n'est pas listé dans les priorités. Devrait être éclaté en sous-composants (FilterStep, LocationPicker, BrandPicker).
- **Localisation** : `src/components/HeroSearch.tsx`
- **Impact** : difficile à modifier sans tout casser, risque de régression à chaque update.
- **Fix proposé** : extraire sous-composants par concern, garder un orchestrateur < 300 lignes.
- **Effort** : M.

#### [MEDIUM] VehicleEstimationPage / SearchPage / ListingDetail : 770-805 lignes
- **Description** : 3 pages avec rendu inline lourd. SearchPage en particulier mélange URL state, filtres locaux, pagination, fetching et UI. Lisible mais fragile.
- **Localisation** : `src/pages/VehicleEstimationPage.tsx`, `src/pages/SearchPage.tsx`, `src/pages/ListingDetail.tsx`
- **Impact** : modifs risquées, copy-paste bugs probables.
- **Fix proposé** : extraire des sous-composants par section (header, filtres, résultats, pagination). Aucune urgence si pas en feu.
- **Effort** : M par page.

#### [MEDIUM] `src/data/vehicleModelsCatalog.ts` : 1132 lignes hardcodées dans le bundle
- **Description** : catalogue véhicules en TS embarqué dans le bundle JS principal.
- **Localisation** : `src/data/vehicleModelsCatalog.ts`
- **Impact** : ~50-80 KB inutile dans le bundle initial pour des users qui ne publient pas. Devrait être lazy-fetché par PublishPage uniquement.
- **Fix proposé** : sérialiser en `public/vehicle-models.json` + fetch lazy depuis PublishPage (avec React Query).
- **Effort** : M.

#### [MEDIUM] `CLAUDE.md` contient des affirmations fausses
- **Description** :
  - Priorité 4 ("Consolider 3x useDbListings en 1 sur src/pages/Index.tsx") : déjà faite, le fichier appelle `useDbListings` 1 seule fois (ligne 35).
  - "Les règles ESLint `@typescript-eslint/no-unused-vars: off` et `noUnusedLocals: false` sont VOLONTAIREMENT permissives" : faux. `eslint.config.js` met `no-unused-vars` en `error`, et `tsconfig.app.json` a `noUnusedLocals: true`.
- **Localisation** : `CLAUDE.md` priorités 4 et 5, section "Gotchas connus".
- **Impact** : un futur agent IA (ou Ali lui-même) prend des décisions basées sur des info fausses. Décrédibilise le doc.
- **Fix proposé** : passe rapide pour réconcilier `CLAUDE.md` avec l'état réel du code.
- **Effort** : S (30 min).

#### [LOW] `src/components/ui/chart.tsx` est dead code
- **Description** : wrapper shadcn pour recharts (`ChartContainer`, `ChartTooltip`, etc.). Aucun fichier de l'app ne l'importe (vérifié par grep). Mes nouveaux dashboards importent directement depuis `recharts`.
- **Localisation** : `src/components/ui/chart.tsx` (~250 lignes)
- **Impact** : ~3-5 KB de code mort tree-shaké mais qui apparaît en review.
- **Fix proposé** : supprimer le fichier.
- **Effort** : S (1 commit).

#### [LOW] `src/data/seed-listings.ts` (725 lignes) garde un nom legacy
- **Description** : fichier seed conservé sous l'ancien nom (héritage ImmoNex). Le contenu est aujourd'hui des seeds pour les blog posts, pas des listings. Identifié dans le backlog post-launch.
- **Localisation** : `src/data/seed-listings.ts`
- **Impact** : confusion mineure pour les nouveaux contributeurs.
- **Fix proposé** : `git mv seed-listings.ts seed-blog.ts` + adapter les imports (probablement 0-2 fichiers).
- **Effort** : S.

#### [LOW] 3 TODOs dispersés, pas de FIXME ni HACK
- **Description** : juste 3 TODOs dans tout `src/` (1 lien T&C placeholder dans `CreditPurchaseForm.tsx`, 1 cleanup futur de colonne `body_style` dans publish, et 1 commentaire). Très propre.
- **Fix** : tracker les 2 résiduels (CGU crédits + colonne body_style) dans un backlog formel.
- **Effort** : S.

---

## Phase 2 — Sécurité

**Note : 7/10**

Le terrain de jeu sécu est globalement en ordre : RLS activée sur 32+ tables (les seules sans RLS sont les tables de catalogue véhicules `vehicle_makes/models/trims/generations` qui sont des données publiques de référence — légitime), `profiles` durcie pour ne plus exposer `phone` ou `credits_balance` à un anonyme (la migration `20260413130500_profiles_rls_hardening.sql` a remplacé la policy "Public profiles readable" par des policies restrictives + RPC SECURITY DEFINER avec projections étroites). 7 fichiers de tests d'intégration RLS contre une vraie instance Supabase (`src/test/rls/*`) — c'est rare et c'est très bien.

Les RPC SECURITY DEFINER sont systématiquement utilisées comme barrière privilégiée, avec 238 `RAISE EXCEPTION` au total dans les migrations (validation côté serveur sérieuse). `vercel.json` configure CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy et Permissions-Policy. Sentry est wired avec helpers PII-safe (`captureVpiError` documenté).

Mais trois faiblesses sérieuses et un pattern à risque :

1. La view `listings_vehicle_semantics` n'a **pas** `security_invoker = true`. C'est exactement le bug qu'on a corrigé sur `partner_ad_campaign_stats` la semaine dernière. Pas exploitée critique en pratique (la view ne contient pas de PII, juste des coalesces de colonnes véhicule), mais la même classe de bug peut récidiver — pattern à standardiser.
2. `src/lib/market/*Repository.ts` réfèrent `SUPABASE_SERVICE_ROLE_KEY` dans le périmètre Vite/build. Bombe à retardement (cf. Phase 1).
3. ~22 fonctions SECURITY DEFINER ne déclarent pas `SET search_path = public` (155 SECURITY DEFINER vs 133 SET search_path dans les migrations). Risque de search-path hijacking par une fonction homonyme dans `pg_temp` ou un schéma extension.

Audit complémentaire nécessaire (ne tient pas dans 60 min sans accès SQL prod) :
- Confirmer qu'aucune RPC ne lit `auth.users` sans authentification
- Vérifier les policies storage (`payment-proofs` doit être strictement privé)

### Findings

#### [CRITICAL] View `listings_vehicle_semantics` bypass RLS de `listings`
- **Description** : la view est créée dans `20260418194500_listings_vehicle_semantics_view.sql` puis re-créée dans `20260426200000_patch_legacy_dependencies_pre_drop.sql`. Aucune des deux migrations ne déclare `WITH (security_invoker = true)`. Postgres exécute donc la view avec les permissions du créateur (postgres role), donc bypass la RLS de la table `listings` sous-jacente.
- **Localisation** : `supabase/migrations/20260418194500_listings_vehicle_semantics_view.sql`, `supabase/migrations/20260426200000_patch_legacy_dependencies_pre_drop.sql`
- **Impact** : aujourd'hui la view ne contient que des coalesces de colonnes véhicule (`mileage_km_effective`, `doors_effective`, etc.) — pas de PII, pas de prix, pas d'owner_id. Donc l'exploitation pratique est faible. Mais : (a) le pattern est cassé et reviendra mordre, (b) si demain quelqu'un ajoute `owner_id` ou `price_mga` à la view, la fuite est instantanée et silencieuse.
- **Fix proposé** : migration `ALTER VIEW public.listings_vehicle_semantics SET (security_invoker = true)`. Idempotente, additive, sûre.
- **Effort** : S (la migration prend 2 minutes à écrire, comme celle qu'on a déjà faite sur `partner_ad_campaign_stats`).

#### [HIGH] Service-role Supabase client défini dans `src/lib/` (cf. Phase 1, doublon ici parce que c'est aussi un risque sécu)
- **Description** : `src/lib/market/*Repository.ts` exportent `createMarketAdminClientFromEnv()` qui crée un client Supabase avec `SUPABASE_SERVICE_ROLE_KEY`. Le bundle Vite traite `src/` comme code client. Aujourd'hui non importé par les pages → tree-shaké → pas dans `dist/`. Mais un import accidentel = key embarquée dans le JS public.
- **Localisation** : `src/lib/market/cleanListingRepository.ts:14`, `src/lib/market/marketStatsRepository.ts:13`, `src/lib/market/rawListingRepository.ts:101`
- **Impact** : zéro aujourd'hui, mais latent. La service-role bypass toutes les RLS — exposition catastrophique si la clé fuit en bundle public.
- **Fix proposé** : `git mv src/lib/market/{cleanListingRepository,marketStatsRepository,rawListingRepository}.ts scripts/market/`. Supprimer les `.mjs` doublons. Adapter les imports relatifs.
- **Effort** : S.

#### [HIGH] ~22 SECURITY DEFINER functions sans `SET search_path = public`
- **Description** : `grep -c "SECURITY DEFINER"` retourne 155 occurrences, `grep -c "SET search_path"` retourne 133. Différence : ~22 fonctions sans search_path explicite (l'écart inclut quelques faux positifs — comments ou paths fixés autrement, mais l'ordre de grandeur est correct).
- **Localisation** : à identifier précisément via un script. Suspects probables : migrations anciennes (`20260411-20260413`).
- **Impact** : Postgres résout les noms non-qualifiés via `search_path` du caller. Si un attaquant avec accès `pg_temp` (extension malicieuse, function override) crée un `pg_temp.profiles`, une fonction SECURITY DEFINER sans search_path `SET` peut résoudre vers la mauvaise table et accorder des privilèges. Faible probabilité sur Supabase managé (pas d'extensions tierces installées par défaut), mais mauvais hygiène.
- **Fix proposé** : script qui audit `pg_proc` pour `prosecdef = true AND proconfig IS NULL`, génère une migration `ALTER FUNCTION ... SET search_path = public` pour chaque cas. Test post-migration que toutes les fonctions admin existantes répondent toujours.
- **Effort** : M (audit + migration + smoke test sur staging).

#### [MEDIUM] `npm audit` : 6 vulnérabilités (3 low, 3 moderate)
- **Description** : toutes rootées dans `vite <= 6.4.1` (l'app est sur 5.4.21). Aucune high/critical. Fix nécessite bump majeur (vite 8).
- **Localisation** : output `npm audit`
- **Impact** : surface d'attaque limitée (vulns dev-time, pas runtime), mais bump différé indéfiniment finit par s'accumuler.
- **Fix proposé** : planifier un sprint d'upgrade dépendances majeures (vite 5 → 8, react 18 → 19, react-router 6 → 7, recharts 2 → 3, tailwind 3 → 4, zod 3 → 4, sonner 1 → 2). Pas tout d'un coup. Commencer par vite (build only, peu de risque).
- **Effort** : M (vite seul). L (upgrade groupé avec react 19).

#### [MEDIUM] Pas de rate limiting visible côté code
- **Description** : pas de mécanisme custom de rate limiting sur les endpoints sensibles (login, signup, achat crédits, contact). Supabase a un rate limit intégré sur `auth` (login attempts) mais c'est faible (~10/min). Pas de protection sur les RPC métier (création listing, soumission rapport).
- **Localisation** : transversal (toutes les RPC qui acceptent des données utilisateur).
- **Impact** : un attaquant peut spam la création de listings ou de signalements. Coûteux en write DB et pollue la modération.
- **Fix proposé** : Vercel Edge Middleware avec @upstash/ratelimit OU Supabase Edge Function intermédiaire. Phase post-launch.
- **Effort** : M.

#### [MEDIUM] Pas de SRI / external script integrity
- **Description** : CSP autorise `https://www.googletagmanager.com` mais le tag `<script>` GA4 ne semble pas avoir de `integrity=...` (à vérifier dans `index.html` après chargement réel).
- **Impact** : si GTM est compromis (improbable) ou MITM (très improbable sur HTTPS), pas de défense en profondeur.
- **Fix proposé** : ajouter `integrity` au tag GA4 si chargé via balise. Si chargé via gtag.js dynamique, ignorer.
- **Effort** : S.

#### [LOW] Migration `20260428130000_partner_ad_campaign_stats_security_invoker.sql` non encore poussée en prod
- **Description** : commit `7534c99` créé le fichier, mais la migration n'a pas été appliquée à prod (en attente de `supabase db push`). La view `partner_ad_campaign_stats` continue donc à bypass RLS jusqu'à l'application.
- **Localisation** : `supabase/migrations/20260428130000_*.sql`
- **Impact** : faible (view aggrège des compteurs, pas de PII), mais la fix attend.
- **Fix proposé** : `npx supabase db push` (action Ali).
- **Effort** : S.

#### [LOW] CSP autorise `script-src 'unsafe-inline'`
- **Description** : `vercel.json` CSP contient `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com`. `'unsafe-inline'` annule la protection contre XSS via injection de balise script.
- **Localisation** : `vercel.json:11`
- **Impact** : surface XSS résiduelle. Vite injecte du runtime inline (Hot Module Replacement en dev, hydration markers en prod) → difficile à supprimer sans nonce.
- **Fix proposé** : V2 — passer en CSP avec `nonce` ou `'strict-dynamic'`. Nécessite hash de chaque inline script SRI ou nonce per-request via Vercel Edge.
- **Effort** : M.

---

## Phase 3 — Performance & bundle

**Note : 6/10**

Le bundle initial atteint 466 kB raw / 140 kB gzip pour `index.js` seul, plus 197 kB / 51 kB pour `supabase`, plus 157 kB / 51 kB pour `react-vendor`, plus 120 kB / 38 kB pour `radix`. Le total premier-paint pour un visiteur anonyme tombe autour de **350-400 kB gzip de JS** avant interactivité — c'est lourd pour Madagascar où la 3G/4G n'est pas garantie. Vite manualChunks fait son travail (recharts isolé en chunk de 382 kB / 105 kB gzip réservé aux pages admin, leaflet 154/45 réservé aux pages avec carte, libphonenumber 119/29 lazy aussi), et 41 lazy imports couvrent essentiellement toutes les routes — donc les pages individuelles sont raisonnables (`SearchPage` 52 kB / 14 gzip, `ListingDetail` 45 kB / 14 gzip, `Dashboard` 44 kB / 12 gzip).

Les vrais gains sont accessibles : convertir 4 blog covers JPG (200-348 kB chacun) en WebP/AVIF + responsive srcset = 60-70% de réduction sur le payload images du `/conseils/`. Lazy-load les locales i18n par langue (priorité 3 du backlog, jamais faite) = ~85 kB de moins au premier chargement. Pas de PWA ni de service worker — gros manque pour MG : un service worker précaché donnerait des navigations quasi-instantanées sur retour visite et gérerait les coupures réseau.

### Findings

#### [HIGH] Main bundle `index.js` 466 kB raw / 140 kB gzip
- **Description** : le chunk principal contient le shell de l'app + le router + tout ce qui n'a pas été manualChunked. 140 kB gzip avant même la page demandée.
- **Localisation** : output `npm run build`
- **Impact** : ~3-5s de chargement sur 3G, ~1-2s sur 4G dégradé. Sur Madagascar c'est tangible. Aussi, ce chunk doit être parsé/exécuté avant tout — le TBT (Total Blocking Time) en pâtit.
- **Fix proposé** : (1) installer `rollup-plugin-visualizer`, identifier les dépendances qui n'ont pas leur propre chunk, (2) extraire dans manualChunks le top 10 des modules par taille, (3) déplacer hors du chunk principal tout ce qui n'est pas requis pour le first paint.
- **Effort** : M.

#### [HIGH] Recharts 382 kB / 105 kB gzip
- **Description** : recharts pèse plus que tout l'i18n stack combiné. Utilisé seulement par 2 pages admin (`AdminRevenuesPage`, `CampaignStatsPanel`). Le manualChunk isole correctement, mais le chunk reste énorme.
- **Localisation** : `dist/assets/charts-DZ7XHwsi.js`, importé par `src/pages/AdminRevenuesPage.tsx`, `src/pages/admin/CampaignStatsPanel.tsx`
- **Impact** : un admin charge 105 kB gzip à la première visite admin. Acceptable. Mais recharts 3.x a un meilleur tree-shaking ESM (réduction estimée -30%), et un `dynamic import` sur le composant chart au sein de la lazy page peut différer encore plus.
- **Fix proposé** : (1) upgrade recharts 2 → 3 (changement majeur, à tester), OU (2) wrapper le `<LineChart>` dans un composant local `LazyChart` lui-même chargé en `React.lazy`, ce qui garantit que le chunk recharts ne charge pas tant que l'admin ne déplie pas le panel stats.
- **Effort** : M (option 1) ou S (option 2).

#### [HIGH] 4 blog covers JPG 200-348 kB
- **Description** : `public/blog-covers/{fiscalite,guide-4x4,location-antananarivo,terrain}-madagascar.jpg`. Format JPG, full-size, pas de variante mobile.
- **Localisation** : `public/blog-covers/*.jpg`
- **Impact** : page `/conseils` charge ~1 MB d'images si les 4 sont visibles. 3G coince.
- **Fix proposé** : convertir en WebP (~50% réduction) + générer 2 tailles via un script (640w mobile, 1280w desktop) + utiliser `<picture>` avec srcset.
- **Effort** : S.

#### [MEDIUM] Pas de PWA / manifest / service worker
- **Description** : `public/manifest.json` et `public/sw.js` n'existent pas.
- **Localisation** : absent.
- **Impact** : pas d'install-on-home-screen, pas de cache offline pour les navigations répétées, pas de fallback réseau. Pour Madagascar c'est un manque significatif (4G intermittente).
- **Fix proposé** : ajouter `vite-plugin-pwa` avec un manifest minimal + une stratégie cache `NetworkFirst` pour les routes API et `CacheFirst` pour les assets.
- **Effort** : M.

#### [MEDIUM] i18n locales chargées d'un bloc
- **Description** : `src/i18n/index.ts` (vérifier l'implémentation exacte) charge fr + en + mg dès le boot. Build output montre `mg-D5Ex` (40 kB) et `en-CwFK` (36 kB) en chunks séparés mais ce sont deux fichiers chargés dès l'init. Priorité 3 du backlog.
- **Localisation** : `src/i18n/index.ts`
- **Impact** : ~85 kB de JSON i18n parsé au boot pour des langues que l'utilisateur ne va pas changer. Sur 3G, +200ms de TTI.
- **Fix proposé** : i18next supporte `lazy resources` via `i18next-http-backend` ou via `import()` dynamique du namespace. Charger uniquement la locale active + précharger l'autre en `idle`.
- **Effort** : M.

#### [MEDIUM] libphonenumber-js full bundle (119 kB / 29 kB gzip)
- **Description** : utilise `libphonenumber-js` complet alors que l'app n'a besoin que des règles MG (et peut-être FR, BE pour les diaspora).
- **Localisation** : dépendance `libphonenumber-js@1.12.41` + `parsePhoneNumber_-Cg49MS9h.js` chunk.
- **Impact** : 29 kB gzip persistant.
- **Fix proposé** : `libphonenumber-js/min` ou `libphonenumber-js/mobile` (sous-modules avec metadata réduite). Test que la validation MG fonctionne toujours.
- **Effort** : S.

#### [LOW] Pas de bundle visualizer
- **Description** : aucun outil pour mesurer les régressions de bundle (rollup-plugin-visualizer ou bundle-analyzer).
- **Impact** : on ne sait pas si une PR ajoute 50 kB jusqu'à ce qu'on regarde le build output ligne par ligne.
- **Fix proposé** : ajouter `rollup-plugin-visualizer` en devDep + script `npm run build:analyze` qui génère un treemap HTML.
- **Effort** : S.

#### [LOW] `<img>` natifs sans `loading="lazy"` : 0 occurrence
- **Description** : grep des `<img...src=...>` sans `loading=` retourne 0. Très bonne hygiène.
- **Fix** : rien.
- **Effort** : N/A.

---

## Phase 4 — Database (Supabase)

**Note : 6.5/10**

79 migrations en ~17 jours, c'est dense mais structuré chronologiquement et chaque fichier est nommé clairement (préfixe timestamp + description). 13 migrations contiennent "fix", "hotfix" ou "patch" dans leur nom — soit ~16% de rework. Pour un projet en lancement c'est dans la moyenne haute mais acceptable. La structure RLS est solide, les RPC SECURITY DEFINER sont la norme, 47 indexes au total bien répartis sur les tables critiques (sauf `transactions` et `credits_ledger` — voir critical findings).

Le vrai red flag DB est l'absence d'index secondaires sur `transactions` et `credits_ledger`. Mes propres RPC du dashboard revenus (committées la semaine dernière) font des `WHERE created_at >= ... AND status = 'approved'` sur `transactions` — full scan. Tant que la table fait quelques centaines de rows c'est invisible. À 10k+ rows c'est mesurable, à 100k+ c'est un problème.

Autre point : la fonction `immonex_is_admin()` est appelée par presque toutes les RPC SECURITY DEFINER admin (47 fichiers de migration). Le rename vers `autonex_is_admin()` (M-LEGACY-5 dans le backlog) sera un sprint à part — il faut soit créer un alias temporaire, soit synchroniser le rename avec une migration globale. À planifier sérieusement, pas un cosmetic.

### Findings

#### [CRITICAL] `transactions` table : 1 seul index secondaire (`idx_transactions_provider`)
- **Description** : `get_monetization_overview`, `get_monetization_summary`, `get_monetization_top_users`, `get_monetization_breakdowns` font tous des scans avec `WHERE status = 'approved' AND created_at >= ... AND credit_pack_id IS NOT NULL`. Sans index sur `(created_at, status)` ou `(status, created_at DESC)`, c'est full scan.
- **Localisation** : `transactions` table, migrations à scanner (rien de listé sur cette colonne).
- **Impact** : aujourd'hui : invisible. À 10k tx : ~50-200ms par requête dashboard. À 100k : ~1-5s. Le dashboard admin devient frustrant à utiliser.
- **Fix proposé** : 
  ```sql
  CREATE INDEX IF NOT EXISTS idx_transactions_status_created_at
    ON public.transactions(status, created_at DESC)
    WHERE credit_pack_id IS NOT NULL;
  ```
  Index partiel pour ne pas grossir avec les transactions hors-pack.
- **Effort** : S.

#### [CRITICAL] `credits_ledger` table : zéro index secondaire
- **Description** : la query la plus chaude du système est `SELECT delta FROM credits_ledger WHERE user_id = X ORDER BY created_at DESC` (calcul du solde, historique). Sans index, full scan à chaque appel.
- **Localisation** : `credits_ledger` table.
- **Impact** : à 1k users actifs avec 10 ledger entries chacun = 10k rows. Calcul de solde déjà ~50ms. À 10k users = 500ms par calcul de solde.
- **Fix proposé** :
  ```sql
  CREATE INDEX IF NOT EXISTS idx_credits_ledger_user_id_created_at
    ON public.credits_ledger(user_id, created_at DESC);
  ```
- **Effort** : S.

#### [HIGH] 16% des migrations sont des "fix" / "hotfix" / "patch"
- **Description** : 13 migrations sur 79 contiennent ces termes dans leur nom. Indique des bugs DB qui sont passés en prod et ont nécessité une correction urgente (`fix_promo_code_column_ambiguity`, `fix_request_deletion_listing_status`, `fix_admin_user_overview_email_cast`, etc.).
- **Localisation** : transversal `supabase/migrations/`.
- **Impact** : signal de qualité — le SQL n'est pas systématiquement reviewé/testé avant push prod. Pas dramatique en phase early, mais à mesure que la table de tx grossit chaque migration ratée coûte plus cher.
- **Fix proposé** : (1) pre-commit qui valide les migrations avec `supabase db diff` sur une copie staging, (2) règle "toute nouvelle migration doit avoir un test sanity dans `src/test/`" (pattern déjà commencé avec `listingReportsMigrationSanity.test.ts`).
- **Effort** : M.

#### [HIGH] `immonex_is_admin()` est legacy et utilisé partout
- **Description** : 47+ migrations appellent `immonex_is_admin()`. Connue comme dette (M-LEGACY-5). Le rename vers `autonex_is_admin()` doit être atomique : créer la nouvelle fonction, mettre à jour toutes les policies/RPC dans la même migration, drop l'ancienne. Sinon période de fail.
- **Localisation** : 47+ migrations + types Supabase.
- **Impact** : nom incohérent avec le projet AutoNex. Tout admin dev futur va se demander "c'est quoi immonex". Cosmetic mais récurrent.
- **Fix proposé** : sprint dédié. (1) Créer `autonex_is_admin()` qui appelle `immonex_is_admin()` (alias). (2) Migration qui réécrit toutes les RPC pour appeler le nouveau nom. (3) Migration qui drop `immonex_is_admin()`. À faire en une PR pour atomicité.
- **Effort** : M (M-LEGACY-5 backlog).

#### [MEDIUM] `listings_vehicle_semantics` view créée 2 fois sans DROP intermédiaire
- **Description** : `20260418194500_listings_vehicle_semantics_view.sql` fait `CREATE OR REPLACE VIEW`, puis `20260426200000_patch_legacy_dependencies_pre_drop.sql` fait `CREATE VIEW` (sans OR REPLACE). Si la première a déjà créé la view en prod, la deuxième échoue.
- **Localisation** : `supabase/migrations/20260418194500_*.sql`, `supabase/migrations/20260426200000_*.sql`
- **Impact** : risque de migration cassée. À vérifier en prod si la deuxième a effectivement tourné.
- **Fix proposé** : vérifier l'état réel via Supabase Studio, et si besoin émettre une migration corrective `CREATE OR REPLACE VIEW`.
- **Effort** : S (vérification + fix éventuel).

#### [MEDIUM] M-DB-DESYNC-INVESTIGATION : email_log RPCs untracked dans Git
- **Description** : memory utilisateur signale que des RPC autour de `email_log` ont été créées en prod sans migration commitée (drift Git/DB).
- **Localisation** : `email_log` table + RPC associés (à identifier).
- **Impact** : si Ali doit reset/recréer l'instance, ces RPC manquent.
- **Fix proposé** : `supabase db diff` contre un nouveau snapshot, capturer les RPC manquantes dans une migration corrective.
- **Effort** : M.

#### [LOW] Tous les PK en UUID (16 bytes)
- **Description** : choix systémique. À l'échelle de la marketplace MG (estimation : 50k listings, 500k tx max sur 3 ans), aucun impact mesurable.
- **Impact** : zéro à court terme.
- **Fix** : rien.
- **Effort** : N/A.

#### [LOW] Pas de triggers `updated_at` automatiques
- **Description** : `updated_at` doit être set explicitement par l'application/RPC. Pas de trigger DB qui le fait au UPDATE. Risque d'oubli.
- **Localisation** : transversal.
- **Impact** : `updated_at` peut diverger de la réalité.
- **Fix proposé** : trigger générique `set_updated_at_trigger` appliqué à toutes les tables avec colonne `updated_at`.
- **Effort** : M.

---

## Phase 5 — Tests & qualité

**Note : 7.5/10**

448 tests passants, 70 fichiers de tests, dont 7 tests d'intégration RLS contre une vraie instance Supabase staging (`src/test/rls/`). C'est au-dessus de la moyenne pour une marketplace — l'investissement RLS testing est rare et solide. La couverture en pourcentage de fichiers est ~22% (77 tests pour 354 fichiers source) mais beaucoup des fichiers source sont des composants UI dont la logique est dans des hooks testables — donc la couverture *fonctionnelle* est probablement bien meilleure.

Mais : pas de coverage report, pas de seuil minimum, pas de E2E sur les flows métier critiques (paiement, publication d'annonce). Et **pas de CI** pour exécuter les tests automatiquement avant push. Donc tout repose sur la discipline humaine (et la mienne) de lancer `npm run test` avant chaque commit. Sur un projet à plusieurs contributeurs ça craque vite.

`tsconfig` est strict (`strict: true`, `noUnusedLocals`, `noUnusedParameters`). ESLint a `no-unused-vars: error`. Hygiène TS impeccable.

### Findings

#### [HIGH] Pas de CI/CD (cf. Phase 7)
- Voir Phase 7 — bloquant, qualité & tests = même cause racine.

#### [HIGH] Pas de Husky / lint-staged / pre-commit
- **Description** : `package.json` ne contient ni husky ni lint-staged ni `prepare` script.
- **Localisation** : `package.json`
- **Impact** : un commit avec un test cassé ou un fichier qui ne typecheck pas peut atterrir sur main sans aucun avertissement (jusqu'à ce que quelqu'un d'autre clone et essaie).
- **Fix proposé** : `npx husky init` + `.husky/pre-commit` qui exécute `npm run typecheck && npm run lint -- --quiet --fix-dry-run` (rapide). Tests pas en pre-commit (trop lent), mais en pre-push.
- **Effort** : S.

#### [HIGH] Pas d'E2E pour le funnel paiement
- **Description** : aucun test Playwright ni Cypress. Le flow critique "user → choix pack → paiement vanilla_pay → admin approuve → crédits crédités → publication annonce" n'a aucune couverture end-to-end.
- **Localisation** : absent.
- **Impact** : un changement dans une RPC paiement (ou un changement de schéma `transactions`) peut casser silencieusement le funnel revenue. Détecté seulement par un user qui n'arrive pas à payer.
- **Fix proposé** : Playwright + 1 happy path + 1 path "rejet admin". Mock vanilla_pay via un endpoint dummy qui simule un webhook. Lancer en CI avant chaque deploy.
- **Effort** : L.

#### [MEDIUM] Pas de coverage measurée
- **Description** : `npm run test --coverage` n'est pas dans les scripts. Pas de seuil. Pas de visualisation.
- **Localisation** : `package.json`
- **Impact** : on ne peut pas suivre l'évolution de la couverture, ni savoir quels modules sont sous-testés.
- **Fix proposé** : `vitest --coverage` (déjà supporté nativement) + script `npm run test:coverage` + report HTML dans `coverage/`. Optionnel : seuil minimum dans `vitest.config.ts` (par exemple 60% lines pour `src/lib/`).
- **Effort** : S.

#### [MEDIUM] Mocks lourds dans les tests hooks
- **Description** : pattern récurrent `vi.mock("@/integrations/supabase/client", ...)` avec mock manuel des `rpc`, `from`, etc. Les tests hooks vérifient surtout que le bon RPC est appelé, pas que le résultat agrégé est correct.
- **Localisation** : `src/test/usePartnerCampaignStats.test.tsx`, `src/test/useMonetizationDashboard.test.tsx`, etc.
- **Impact** : refactoriser une RPC ne fera pas casser les tests si le nom RPC change pas. Utile mais incomplet.
- **Fix proposé** : compléter avec des tests d'intégration (style RLS tests existants) qui tapent une vraie DB staging avec des fixtures, pour les RPC critiques.
- **Effort** : M.

#### [LOW] `vitest run` ne pèse pas le résultat
- **Description** : 448 tests en ~10s. Très rapide. Pas un problème — observation.

---

## Phase 6 — UX & accessibilité

**Note : 8/10**

UX-tech rigoureux. **ZÉRO `<div onClick=>`** dans tout `src/` — chaque interaction passe par un `<button>` ou un `<a>`. 72 `aria-*` attributs. Tous les `<img>` ont un attribut `loading=` (pas un seul oublié). ErrorBoundary global avec fallback UI lisible et bouton retour, intégré à Sentry. Sonner pour toasts. Form labels via `Label` shadcn (qui pose `htmlFor` proprement). `vercel.json` Permissions-Policy bloque géolocalisation/caméra hors `self`.

Quelques bricoles à nettoyer mais rien de dramatique. Le plus gros manque : les locales ne sont pas lazy par langue (cf. Phase 3), donc un user MG charge fr+en pour rien.

### Findings

#### [LOW] ErrorBoundary fallback contient un emoji littéral
- **Description** : ligne 44 du fallback render `<div className="text-6xl">😕</div>`. CLAUDE.md interdit les emoji dans le code. Le rendu UI est légitime mais l'instruction CLAUDE.md ne distingue pas comments/string/JSX. Cohérence à choisir.
- **Localisation** : `src/components/ErrorBoundary.tsx:44`
- **Impact** : nul fonctionnellement.
- **Fix proposé** : remplacer par `<Frown className="h-16 w-16 text-muted-foreground" />` de Lucide pour rester en cohérence + pas dépendre du rendu emoji par OS.
- **Effort** : S.

#### [LOW] `alert()` natif dans `CampaignStatsPanel` (commit récent, mon code)
- **Description** : sur erreur d'export CSV, `alert("L'export a échoué...")`. Pas dans la philosophie du reste de l'app qui utilise Sonner pour les toasts.
- **Localisation** : `src/pages/admin/CampaignStatsPanel.tsx`
- **Impact** : modal bloquante qui rompt l'UX admin.
- **Fix proposé** : remplacer par `toast.error(...)` (Sonner déjà importé ailleurs).
- **Effort** : S.

#### [LOW] `<img alt="">` (alt vide explicite)
- **Description** : 3 occurrences avec `alt=""` (PublishDetailsSection, PublishMediaSection). Format légitime pour images décoratives, mais à vérifier que le contexte le justifie.
- **Localisation** : `src/pages/publish/components/PublishDetailsSection.tsx`, `src/pages/publish/components/PublishMediaSection.tsx`
- **Impact** : faible si vraiment décoratives.
- **Fix proposé** : audit visuel des 3 cas, garder `alt=""` si décoratif sinon ajouter texte.
- **Effort** : S.

#### [MEDIUM] Pas de skip-link / navigation clavier explicite
- **Description** : pas de `<a href="#main-content" className="sr-only focus:not-sr-only">Aller au contenu principal</a>` dans le header. WCAG 2.1 Level A demande ce raccourci.
- **Localisation** : `src/components/Header.tsx`
- **Impact** : utilisateurs clavier doivent tabber à travers tout le menu pour atteindre le contenu.
- **Fix proposé** : ajouter le skip-link en première position dans `<body>`.
- **Effort** : S.

#### [LOW] i18n hardcodé en français pour les toasts/messages d'erreur
- **Description** : `toast.error("Champs obligatoires manquants...")` et compagnie sont en français pur. i18next existe mais les toasts ne passent pas par lui.
- **Localisation** : transversal (toutes les mutations React Query).
- **Impact** : si la version EN/MG part en prod, les toasts restent FR.
- **Fix proposé** : passer toutes les chaînes utilisateur par `t()`.
- **Effort** : M.

---

## Phase 7 — DevOps, monitoring, observabilité

**Note : 4/10**

Sentry est correctement wired (`initMonitoring` au boot, ErrorBoundary route les erreurs React via `captureReactError`, helpers `wrapRpc` / `captureVpiError` / `captureVpiMessage` dispo pour le tracking métier). `vercel.json` est complet (CSP, X-Frame-Options DENY, Permissions-Policy, Referrer-Policy strict-origin-when-cross-origin). Le build est rapide (10.6s).

Mais le verdict est sévère parce que **rien n'automatise rien**. Pas de `.github/workflows/`. Vercel auto-deploy sur push to main = aucun gate. Pas de pre-commit. Pas d'uptime monitoring externe. Pas de funnel analytics au-delà de GA4 basique. C'est un site qui fait du paiement et qui pourrait tomber sans que personne ne le sache jusqu'au prochain user qui ouvre Twitter pour râler.

### Findings

#### [CRITICAL] Aucune CI/CD
- **Description** : `.github/workflows/` n'existe pas. Vercel détecte les push sur main et déploie sans typecheck, lint, test, ou build de validation préalable côté GitHub.
- **Localisation** : absent.
- **Impact** : un push qui passe localement mais casse CI = pas détecté. Un push qui pète Vercel build = détecté trop tard. Aucun gate sur les PR (qui n'existent même pas, le workflow est push-direct sur main).
- **Fix proposé** : `.github/workflows/ci.yml` avec jobs : (1) `npm ci`, (2) `npm run typecheck`, (3) `npm run lint`, (4) `npm run test`, (5) `npm run build`. Trigger sur `pull_request` et `push` to main. Bloquer le merge sur fail.
- **Effort** : S.

#### [CRITICAL] Pas de branch protection sur main
- **Description** : non-vérifiable depuis le code, mais à vérifier sur GitHub. Vu l'absence de CI, je doute que la branche soit protégée.
- **Localisation** : GitHub repo settings.
- **Impact** : push direct sur main accidentel = production cassée.
- **Fix proposé** : activer branch protection : require PR, require CI green, require 1 review (ou au moins 1 status check).
- **Effort** : S (5 min sur UI GitHub, après que la CI existe).

#### [HIGH] Pas d'uptime monitoring
- **Description** : aucune sonde externe sur autonex.mg.
- **Localisation** : absent.
- **Impact** : si Vercel est down ou si Supabase a un incident, personne ne sait jusqu'à un user.
- **Fix proposé** : UptimeRobot (gratuit, 50 monitors) ou Better Uptime (gratuit jusqu'à 10 monitors). Ping toutes les 5 min sur `/`, `/recherche`, `/api/health`. Notifier par email/Slack/SMS.
- **Effort** : S.

#### [HIGH] Pas de funnel analytics au-delà de GA4
- **Description** : GA4 mesure pages vues. Pas de tracking d'événements métier (purchase intent, abandon panier, étapes du funnel publish, conversion crédits).
- **Localisation** : absent.
- **Impact** : impossible de savoir où users abandonnent. Décisions produit à l'aveugle.
- **Fix proposé** : ajouter `gtag('event', ...)` aux étapes clés (vue pack crédit, click "Acheter", complétion paiement, soumission listing, complétion listing). Construire un funnel report dans GA4.
- **Effort** : M.

#### [MEDIUM] Sentry traces 5% en prod, pas de RUM Core Web Vitals
- **Description** : `SENTRY_TRACES_SAMPLE_RATE = 0.05`. Suffisant pour erreurs, insuffisant pour mesurer le LCP/INP/CLS.
- **Localisation** : `src/lib/monitoring.ts:9`
- **Impact** : pas de visibilité sur la perf perçue par les vrais users.
- **Fix proposé** : option (a) Vercel Analytics (gratuit jusqu'à 2.5k events/mois), option (b) activer Sentry Performance avec sampling adaptatif, option (c) `web-vitals` package + envoi vers GA4.
- **Effort** : S.

#### [MEDIUM] `console.error` dans le code mais pas tous routés vers Sentry
- **Description** : 10 occurrences de `console.error/warn` dans `src/`. Le helper `captureHandledError` existe dans `monitoring.ts` mais n'est utilisé que dans 1 fichier.
- **Localisation** : transversal.
- **Impact** : erreurs non-fatales (catch dans un try/catch) loggées en console mais invisibles en prod.
- **Fix proposé** : passer les `console.error` métier par `captureHandledError(err, { context: ... })`. Garder `console.error` pour le dev/debug.
- **Effort** : S.

#### [LOW] Pas de logs structurés côté Vercel (no edge function visible)
- **Description** : pas d'audit possible sans accès aux logs Vercel/Supabase. À vérifier que les edge functions Supabase loggent bien les erreurs de webhook paiement.
- **Localisation** : `supabase/functions/`
- **Fix proposé** : audit séparé.
- **Effort** : S.

---

## Annexes

### A. Statistiques code

| Métrique | Valeur |
|----------|--------|
| Total fichiers TS/TSX dans `src/` | 432 |
| Composants (`src/components/`) | 125 |
| Hooks custom (`src/hooks/`) | 36 |
| Pages (`src/pages/`) | 77 |
| Migrations SQL (`supabase/migrations/`) | 79 |
| Tests Vitest | 70 fichiers / 448 tests passing |
| Lignes totales (sans node_modules / dist) | ~62 500 |
| Occurrences `: any` strictes | ~11 (dont la plupart en data files / mocks) |
| `@ts-ignore` | 2 (dont 1 dans un commentaire, 1 dans test) |
| TODOs / FIXMEs / HACKs | 3 |
| `<div onClick=>` | 0 |
| `dangerouslySetInnerHTML` | 1 (shadcn chart, contenu) |
| `alert()` | 1 (mon code récent, à fixer) |

### B. Top 10 fichiers les plus gros (hors `types.ts` auto-gen)

| Fichier | LOC | Note |
|---------|-----|------|
| `src/pages/PublishPage.tsx` | 1144 | Priorité 6 backlog |
| `src/data/vehicleModelsCatalog.ts` | 1132 | Data file, à externaliser |
| `src/lib/estimation/engine.ts` | 1064 | Logique estimation, OK si bien découpé |
| `src/pages/publish/components/PublishDetailsSection.tsx` | 1058 | À démonter avec PublishPage |
| `src/lib/publishDraft.ts` | 939 | Cohérent (autosave logic centralisé) |
| `src/components/HeroSearch.tsx` | 837 | À éclater |
| `src/pages/VehicleEstimationPage.tsx` | 805 | À éclater |
| `src/pages/SearchPage.tsx` | 774 | À éclater |
| `src/pages/ListingDetail.tsx` | 770 | À éclater |
| `src/data/seed-listings.ts` | 725 | Cosmetic rename backlog |

### C. Bundle (top 15 chunks par taille raw)

| Chunk | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `index.js` | 467 KB | 140 KB | Main app shell |
| `charts` (recharts) | 382 KB | 105 KB | Admin only |
| `supabase` | 197 KB | 52 KB | Client + auth |
| `react-vendor` | 157 KB | 52 KB | React + ReactDOM + Router |
| `leaflet` | 154 KB | 45 KB | Carte (lazy) |
| `radix` | 121 KB | 38 KB | Radix UI primitives |
| `parsePhoneNumber_` | 119 KB | 30 KB | libphonenumber-js full |
| `PublishPage` | 102 KB | 28 KB | Page lazy |
| `BlogPages` | 79 KB | 29 KB | Page lazy |
| `forms` | 78 KB | 21 KB | RHF + zod |
| `VehicleEstimationPage` | 71 KB | 21 KB | Page lazy |
| `SearchPage` | 53 KB | 15 KB | Page lazy |
| `SettingsPage` | 51 KB | 14 KB | Page lazy |
| `i18n` | 49 KB | 16 KB | i18next core |
| `query` | 47 KB | 15 KB | TanStack Query |

Total `dist/` : 5.3 MB.

### D. Dépendances obsolètes (sélection)

Versions actuelles → dernières stables :

| Package | Actuel | Dernière | Bump |
|---------|--------|----------|------|
| react | 18.3.1 | 19.2.5 | majeur |
| react-dom | 18.3.1 | 19.2.5 | majeur |
| react-router-dom | 6.30.3 | 7.14.2 | majeur |
| recharts | 2.15.4 | 3.8.1 | majeur |
| zod | 3.25.76 | 4.3.6 | majeur |
| tailwindcss | 3.4.17 | 4.2.4 | majeur |
| vite | 5.4.21 | 8.0.10 | 3 majeurs |
| eslint | 9.32.0 | 10.2.1 | majeur |
| typescript | 5.8.3 | 6.0.3 | majeur |
| @supabase/supabase-js | 2.103.0 | 2.105.0 | mineur |
| @tanstack/react-query | 5.83.0 | 5.100.5 | mineur |
| sonner | 1.7.4 | 2.0.7 | majeur |
| lucide-react | 0.462.0 | 1.11.0 | majeur |
| date-fns | 3.6.0 | 4.1.0 | majeur |
| react-leaflet | 4.2.1 | 5.0.0 | majeur |
| react-hook-form | 7.61.1 | 7.74.0 | mineur |

L'écart cumulé est important. Pas urgent mais mérite un sprint de mise à jour groupée d'ici 6-8 semaines.

### E. Vulnérabilités npm

`npm audit` :
- 0 critical
- 0 high
- 3 moderate (toutes vite ≤ 6.4.1)
- 3 low (toutes vite ≤ 6.4.1)
- Total : 6 vulnérabilités

Fix recommandé : bump vite vers 8.x (changement majeur, à tester).

### F. Migrations qui méritent un re-look

| Migration | Pourquoi |
|-----------|----------|
| `20260418194500_listings_vehicle_semantics_view.sql` | View sans `security_invoker` |
| `20260426200000_patch_legacy_dependencies_pre_drop.sql` | `CREATE VIEW` sans `OR REPLACE`, possible fail si la précédente a tourné |
| `20260428130000_partner_ad_campaign_stats_security_invoker.sql` | Commitée mais pas appliquée prod |

### G. Liste des SECURITY DEFINER sans `SET search_path` (à investiguer)

Estimation : ~22 fonctions. Liste exhaustive nécessite query SQL `SELECT proname FROM pg_proc WHERE prosecdef = true AND proconfig IS NULL` sur la DB. Suspects probables : migrations early (`20260411-20260413`).

### H. Plan d'action recommandé sur 4 semaines

**Semaine 1 (sécurité critique + plomberie)**
- Migration `security_invoker = true` sur `listings_vehicle_semantics`
- Pousser la migration `partner_ad_campaign_stats_security_invoker` en prod
- Déplacer `src/lib/market/*Repository.ts` vers `scripts/`
- Wire GitHub Actions CI : typecheck + lint + test + build
- Wire Husky pre-commit (typecheck rapide)
- Branch protection sur main

**Semaine 2 (perf quick wins)**
- Convertir blog covers JPG → WebP + srcset
- Lazy-load i18n par langue (priorité 3)
- Utiliser `libphonenumber-js/min`
- Ajouter `rollup-plugin-visualizer`
- Ajouter UptimeRobot

**Semaine 3 (DB + observabilité)**
- Index `transactions(status, created_at)` partial
- Index `credits_ledger(user_id, created_at DESC)`
- Audit + ajout `SET search_path = public` sur toutes les SECURITY DEFINER manquantes
- Vercel Analytics ou web-vitals → GA4
- Vérifier état migration `listings_vehicle_semantics` en prod

**Semaine 4 (refacto + bump deps)**
- Refacto PublishPage step 1 (extraire détails section avec react-hook-form)
- Bump vite 5 → 8 (et résoudre les 6 vulns npm)
- Reconcilier `CLAUDE.md` avec l'état réel du code
- Supprimer `src/components/ui/chart.tsx` (dead code)
- Premier test E2E Playwright sur la home + recherche

À programmer après ces 4 semaines : E2E paiement complet, M-LEGACY-5 (rename `immonex_is_admin`), PWA / service worker, refacto pages > 800 lignes restantes, upgrade React 19.

---

**Fin du rapport.**
