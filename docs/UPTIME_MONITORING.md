# Uptime monitoring — UptimeRobot setup (action manuelle)

UptimeRobot est un service externe gratuit qui ping le site toutes les 5 min et alerte par email/SMS/Slack quand le site répond non-200 ou lui répond trop lentement. Indispensable pour savoir qu'autonex.mg est en panne avant qu'un user le découvre.

## Setup

1. Créer un compte gratuit sur https://uptimerobot.com (50 monitors gratuits, plus que ce dont AutoNex aura besoin pendant des années).
2. Add New Monitor :
   - Monitor Type : **HTTP(s)**
   - Friendly Name : `AutoNex Madagascar — Home`
   - URL : `https://autonex.mg`
   - Monitoring Interval : `5 minutes`
   - Monitor Timeout : `30 seconds`
3. Répéter pour les pages critiques :
   - `https://autonex.mg/recherche`
   - `https://autonex.mg/admin/login` (vérifier qu'elle retourne bien un 200, pas un 5xx)
   - `https://autonex.mg/conseils` (blog public, sanity check pour le routing)

## Alerting

- Settings > Alert Contacts > Add Alert Contact
- Email : `alipirbay@gmail.com`
- SMS optionnel (5 SMS/mois gratuits, à réserver pour les alertes Home + Recherche)
- Optionnel : Slack/Discord webhook si tu en as un actif. UptimeRobot envoie un payload JSON simple, supporté nativement par les deux.
- Sur chaque monitor : Edit > Alert Contacts To Notify > cocher au moins email + SMS pour Home et Recherche.

## Status page publique (optionnel mais recommandé)

UptimeRobot offre une status page gratuite à `https://stats.uptimerobot.com/<id>` que tu peux partager avec annonceurs/users en cas d'incident. Ça transforme une panne en "incident géré transparenté", au lieu de silence radio.

- My Settings > Public Status Pages > Add New Status Page
- Branding : logo AutoNex
- Custom domain optionnel : `status.autonex.mg` via CNAME (Vercel n'interfère pas avec ce sous-domaine).

## Quoi faire quand UptimeRobot alerte

1. Vérifier d'abord le dashboard Vercel (déploiement récent en échec ?)
2. Vérifier le dashboard Supabase (incident provider ?) — https://status.supabase.com/
3. Vérifier le DNS Cloudflare/Vercel (TTL court suffit pour identifier une régression DNS récente)
4. Si tout est OK côté infra mais le site répond non-200 : cause applicative. Regarder Sentry pour les erreurs récentes correspondant au timestamp de l'alerte.
5. Si rien n'apparaît dans Sentry : peut-être un cold-start Vercel ou un timeout réseau côté UptimeRobot (faux positif). Confirmer en navigant sur le site avant d'agir.

## Quand revisiter

- Quand le trafic dépasse 1k visiteurs/jour : envisager un plan payant ($7/mois) pour : monitoring 1-min interval + monitoring multi-region (vérifier qu'autonex.mg répond depuis l'Europe ET l'Afrique du Sud, pas juste depuis l'US par défaut).
- Quand l'app a une vraie API (pas seulement Supabase) : ajouter un monitor sur `/api/health` qui exécute une mini RPC.
