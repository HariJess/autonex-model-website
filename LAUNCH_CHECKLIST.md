# AutoNex — Launch Checklist

État au 2026-04-26 après M-LAUNCH-MODE : le projet est désormais en **mode production publique** côté code (noindex retiré, robots.txt ouvert, banner beta paiement OFF par défaut). Le **beta lock** (`VITE_BETA_LOCK_ENABLED`) reste à activer manuellement par Ali sur Vercel le jour J pour ouvrir aux inscriptions publiques. Cocher chaque item physiquement avant communication launch.

## Pré-launch (1h avant)

- [x] **noindex/nofollow retiré** dans `index.html` (M-LAUNCH-MODE, commit `<TBD>`)
- [x] **`public/robots.txt` ouvert** à l'indexation publique avec allowlist /admin//auth//dashboard//publier//beta-login//api/ (M-LAUNCH-MODE)
- [x] **Banner beta paiement** désactivé par défaut côté code (M-LAUNCH-MODE)
- [ ] **Vercel env** : retirer ou mettre à `false` `VITE_PAYMENT_BETA_BANNER_ENABLED`, puis trigger un redeploy
- [ ] **Vercel env** : basculer `VITE_BETA_LOCK_ENABLED=false` quand Ali décide d'ouvrir les inscriptions publiques
- [ ] Vérifier `og-image.png` existe et est 1200×630 PNG (les SVG actuels — base + Twitter + square — restent en place mais Facebook ancien préfère PNG)
- [ ] Vérifier `VITE_SENTRY_DSN` rempli en prod (Vercel env)
- [ ] Vérifier `VITE_GA4_MEASUREMENT_ID` rempli si GA4 souhaité
- [ ] Vérifier que `VITE_ENABLE_MANUAL_PAYMENT` est `false` (VPI seul)
- [ ] **Supabase Edge Function env** `VPI_MAX_AMOUNT_MGA` : décider si on garde 100 000 Ar (= pack max actuel `cp_1000`) ou bumpe à 500 000 pour packs Pro futurs. Modifier via Supabase Dashboard → Edge Functions → vpi-initiate-payment → Settings → Secrets (no redeploy needed, lue à runtime)
- [ ] **Rotation clé `service_role`** : Dashboard → Project Settings → API → Reset (item M-KEY-ROTATION, suivi de M-CRON-SECRET)
- [ ] Sentry `tracesSampleRate` à 0.05 minimum (déjà fait via M3)
- [ ] CSP testée sans erreur console en dev ET en preview prod

## Tests fonctionnels (30 min avant)

- [ ] Publish flow particulier en DRY_RUN → bascule pending_review
- [ ] Publish flow dealer en DRY_RUN → bascule active
- [ ] Paiement VPI prod 1000 Ar (pack le moins cher) → credits accrédités
- [ ] Phone reveal → événement enregistré dans phone_reveal_events
- [ ] Cookie consent banner s'affiche en première visite
- [ ] Test mobile sur vrai téléphone (3G simulé si possible)

## Post-launch (J+1)

- [ ] Vérifier Search Console : sitemap accepté, pas d'erreur d'indexation
- [ ] Sentry : pas de spike d'erreurs anormal
- [ ] Premiers retours WhatsApp dealers beta (s'ils continuent à utiliser le produit)
- [ ] Stats GA4 : sessions, bounce rate

## Rollback plan

Si problème majeur :
1. Remettre `<meta name="robots" content="noindex, nofollow">` dans `index.html` + `Disallow: /` global dans `public/robots.txt`, redéployer (Google met 24-72h pour désindexer)
2. Désactiver le DSN Sentry pour stopper la collecte si nécessaire
3. Re-cocher `VITE_BETA_LOCK_ENABLED=true` sur Vercel + redeploy pour fermer les inscriptions
4. Communiquer aux dealers beta via le WhatsApp dédié
