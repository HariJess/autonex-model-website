# AutoNex — Launch Checklist

À cocher PHYSIQUEMENT le jour du launch public. Ne pas push tant que tout n'est pas validé.

## Pré-launch (1h avant)

- [ ] **Retirer `<meta name="robots" content="noindex, nofollow">`** dans `index.html` ligne ~14
- [ ] Vérifier `og-image.png` existe et est 1200×630 PNG (pas SVG temporaire)
- [ ] Vérifier `VITE_SENTRY_DSN` rempli en prod (Vercel env)
- [ ] Vérifier `VITE_PAYMENT_BETA_BANNER_ENABLED` (true pour J+72h, false ensuite)
- [ ] Vérifier `VITE_GA4_MEASUREMENT_ID` rempli si GA4 souhaité
- [ ] Vérifier que `VITE_ENABLE_MANUAL_PAYMENT` est `false` (VPI seul)
- [ ] Sentry `tracesSampleRate` à 0.05 minimum
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
1. Remettre `<meta name="robots" content="noindex, nofollow">`
2. Désactiver le DSN Sentry pour stopper la collecte si nécessaire
3. Communiquer aux dealers beta via le WhatsApp dédié
