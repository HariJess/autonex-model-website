# Notifications email — architecture (Lot 10.1 + 10.2)

## Vue d'ensemble

```
┌────────────────┐   triggers SQL     ┌──────────────────┐
│  listings      │ ────────────────→  │  notifications   │
│  credits_ledger│                    │  (+ email_queued │
│  auth.users    │                    │    _for)          │
└────────────────┘                    └────────┬─────────┘
                                               │
                                               │  pg_cron (/5m + daily)
                                               ▼
                                      ┌──────────────────┐
                                      │  Edge Function   │
                                      │  send-queued-    │
                                      │  notification-   │
                                      │  emails          │
                                      └────────┬─────────┘
                                               │
                            ┌──────────────────┼──────────────────┐
                            ▼                  ▼                  ▼
                    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                    │  Resend API  │   │  email_log   │   │  notifications│
                    │  (SMTP)      │   │  (audit)     │   │  .email_sent │
                    └──────────────┘   └──────────────┘   │  _at          │
                                                          └──────────────┘
```

## Cycle de vie d'un email

1. **Déclenchement DB** — un `INSERT` / `UPDATE` sur `listings` ou `credits_ledger`
   déclenche un trigger PL/pgSQL (Lot 10.1 migration `20260425000000_notifications_foundation.sql`).
2. **Création notif** — le trigger appelle la fonction `create_notification(...)`.
3. **Routing email** — la fonction lit `notification_preferences` de l'user et
   pose `notifications.email_queued_for` :
   - `priority = 'critical'` + pref `email_immediate=true` → `NOW()` (envoi ASAP)
   - `priority IN ('high','normal')` + pref `email_digest=true` → prochaine heure `digest_time` (défaut 18h EAT)
   - sinon `NULL` (pas d'email)
4. **Cron trigger** — `pg_cron` POST sur l'Edge Function toutes les 5 min
   (mode immediate) / daily à 15h UTC (mode digest).
5. **Worker Deno** — Edge Function `send-queued-notification-emails` :
   - RPC `list_notification_emails_ready(mode, limit)` — notifs à traiter + email user + compteur quota
   - Pour chaque notif : vérification quota, routing template, POST Resend
   - Succès → RPC `mark_notification_email_sent` (journal `email_log` + set `email_sent_at`)
   - Échec → RPC `mark_notification_email_failed` (journal seul, `email_sent_at` reste NULL → retry possible)
   - Quota dépassé → RPC `mark_notification_email_skipped_quota`
6. **Journal** — la table `email_log` garde trace de tous les envois réussis,
   échecs, et skipped. RLS activée → user peut lire son propre historique.

## Templates

Fichiers : `supabase/functions/send-queued-notification-emails/templates/`

| Template | Déclencheur | Mode d'envoi |
|---|---|---|
| `listing-published.ts` | `notification_type = 'listing_published'` | immediate |
| `listing-rejected.ts` | `notification_type = 'listing_rejected'` | immediate |
| `credits-purchased.ts` | `notification_type = 'credits_purchased'` | immediate |
| `digest-daily.ts` | Agrégation des notifs `priority IN ('high','normal')` du jour | digest |

Tous utilisent `templates/layout.ts` : layout HTML tables + inline styles,
compatible Gmail / Outlook / iOS. Palette extraite de `src/index.css` (primary
`#1E4CC4`, background `#F6F8FC`, text `#0F172A`, muted `#6B7280`).

## Variables d'environnement requises

Dans les secrets Supabase :

- `RESEND_API_KEY` — clé Resend
- `NOTIFICATIONS_EMAIL_FROM` — sender vérifié (défaut : `notifications@autonex.mg`)
- `SUPABASE_URL` (auto-injecté)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injecté)

Commande de pose :

```bash
supabase secrets set RESEND_API_KEY=re_xxx --project-ref wtkedamrmtvdoippqanc
supabase secrets set NOTIFICATIONS_EMAIL_FROM=notifications@autonex.mg --project-ref wtkedamrmtvdoippqanc
```

## Checklist d'application

1. **Appliquer la migration 1** : `supabase/migrations/20260425100000_lot_10_2_email_log.sql`
   via Supabase Dashboard > SQL Editor.
2. **Poser les secrets** `RESEND_API_KEY` + `NOTIFICATIONS_EMAIL_FROM`.
3. **Déployer l'Edge Function** :
   ```bash
   supabase functions deploy send-queued-notification-emails --project-ref wtkedamrmtvdoippqanc
   ```
4. **Tester manuellement** via le script admin :
   ```bash
   node scripts/send-test-email.mjs listing-published alipirbay@gmail.com
   ```
   Vérifier la réception + aperçu HTML (fichier local `.email-preview-*.html`).
5. **Activer les extensions pg_cron + pg_net** si pas déjà fait (Supabase
   Dashboard > Database > Extensions).
6. **Remplacer `<SERVICE_ROLE_KEY>`** dans `supabase/migrations/20260425100001_lot_10_2_cron.sql`
   par la vraie clé (Project Settings > API > service_role secret), puis
   appliquer la migration via SQL Editor.
7. **Vérifier les jobs cron** :
   ```sql
   SELECT jobname, schedule, active FROM cron.job
    WHERE jobname LIKE 'send-%-notification-emails';
   ```
8. **Déclencher manuellement une fois pour smoke-test** (option) :
   ```bash
   curl -X POST \
     'https://wtkedamrmtvdoippqanc.supabase.co/functions/v1/send-queued-notification-emails?mode=immediate' \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
   ```

## Debug : un email ne part pas

1. **Vérifier que la notif a bien `email_queued_for` renseigné** :
   ```sql
   SELECT id, type, priority, email_queued_for, email_sent_at
   FROM notifications
   WHERE user_id = '<uuid>' ORDER BY created_at DESC LIMIT 5;
   ```
   - `email_queued_for IS NULL` → la pref a désactivé l'email (vérifier
     `notification_preferences`).
   - `email_queued_for > NOW()` → programmé plus tard (digest en attente).
   - `email_sent_at IS NOT NULL` → déjà envoyé.
2. **Vérifier la cron** :
   ```sql
   SELECT runid, status, return_message, start_time
   FROM cron.job_run_details
   WHERE jobname LIKE 'send-%-notification-emails'
   ORDER BY start_time DESC LIMIT 5;
   ```
3. **Consulter `email_log`** :
   ```sql
   SELECT template, subject, status, error_message, created_at
   FROM email_log
   WHERE user_id = '<uuid>' ORDER BY created_at DESC LIMIT 10;
   ```
   - `status = 'failed'` → lire `error_message` (souvent `status_4xx` de Resend).
   - `status = 'skipped_quota'` → l'user a dépassé son `max_emails_per_day`.
4. **Logs Edge Function** : Supabase Dashboard > Edge Functions > send-queued-notification-emails > Logs.
5. **Logs Resend** : dashboard Resend → Events pour l'email `to`.

## Anti-spam / protections

- `max_emails_per_day` (défaut : 5) par user. Les envois SKIPPÉS sont logués
  avec `status = 'skipped_quota'`.
- La RPC `list_notification_emails_ready` applique le quota AVANT de renvoyer
  les notifs — le worker ne voit pas celles qui dépassent.
- Les `low` priority n'ont jamais d'email (règle `create_notification`).
- `email_sent_at` est set dès qu'un envoi est « tenté avec succès » ou
  « skippé-quota ». Pas de re-tentative automatique pour l'instant — le retry
  peut être fait manuellement en remettant `email_sent_at = NULL` sur les
  rows en échec.

## TODOs post-Lot 10.2

- **Bouton « Se désabonner »** — générer un token signé par notif dans le pied
  de page de chaque email, pointant vers une route publique qui toggle les
  prefs email à `false`.
- **Templates Mahogany / Malagasy** — le content est en français uniquement
  pour ce lot. Ajouter un champ `language` sur `profiles` + router.
- **Retry automatique** — job cron séparé qui remet en queue les rows
  `email_log.status = 'failed'` plus anciennes que 1h, jusqu'à 3 tentatives.
- **Template `listing-expiring-soon`** — actuellement agrégé dans le digest.
  À extraire en single-send si les users se plaignent du délai.
