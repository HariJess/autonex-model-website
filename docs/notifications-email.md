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

## Routage priorité → canal → délai

| Priorité | Canal | Délai d'envoi | Exemples de types |
|---|---|---|---|
| `critical` | immediate | **≤ 5 minutes** (cron `*/5 * * * *`) | `listing_published`, `listing_rejected`, `credits_purchased` |
| `high` | digest | **Daily 18h EAT** (cron `0 15 * * *` UTC) | `listing_expiring_soon` |
| `normal` | digest | Daily 18h EAT (agrégé avec les `high`) | futurs types non urgents |
| `low` | — (in-app seul) | Jamais d'email — `email_queued_for` reste `NULL` | `welcome`, `system` info |

Ce routage est posé à deux endroits qui doivent rester synchronisés :

1. **Lot 10.1 / `create_notification`** — fixe `notifications.email_queued_for`
   au moment de l'INSERT (CASE sur `priority` + préférences catégorie).
2. **Lot 10.2 / `list_notification_emails_ready`** — filtre les notifs éligibles
   pour le worker (`WHERE (p_mode = 'immediate' AND priority = 'critical') OR
   (p_mode = 'digest' AND priority IN ('high','normal'))`).

Si tu veux basculer `high` en immediate un jour, il faut modifier les **deux**
endroits simultanément, sinon les emails `high` seront invisibles pour le
worker (queue fixée en digest_time, WHERE qui ne les voit pas en immediate).

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

## Gotchas

### ⚠️ Tout INSERT dans `notifications` DOIT passer par `create_notification(...)`

La colonne `notifications.email_queued_for` est calculée **inline dans la RPC
`create_notification`** (Lot 10.1), pas via un trigger `AFTER INSERT`.

**Conséquence** : un `INSERT INTO notifications (...)` direct (admin tool,
import batch, script ad-hoc, seed) laissera `email_queued_for = NULL`.
L'email ne partira **jamais**, même si les préférences email sont activées
côté utilisateur.

**Pattern correct** (à utiliser systématiquement depuis n'importe quel call-site) :

```sql
SELECT create_notification(
  p_user_id := '<uuid>',
  p_type := 'system',
  p_category := 'system',
  p_priority := 'normal',
  p_title := 'Titre',
  p_body := 'Corps...',
  p_metadata := jsonb_build_object('foo', 'bar'),
  p_action_url := '/dashboard',
  p_icon := 'Bell'
);
```

**Pattern INTERDIT** :

```sql
-- ⛔ email_queued_for reste NULL → email jamais envoyé
INSERT INTO notifications (user_id, type, category, priority, title, ...)
VALUES (...);
```

**Si un INSERT direct est vraiment incontournable** (migration bulk, backfill
manuel), il faut reproduire LOGIQUEMENT le CASE de `create_notification` :

```sql
INSERT INTO notifications (user_id, type, category, priority, title, email_queued_for)
SELECT
  '<uuid>', 'system', 'system', 'normal', 'Titre',
  CASE
    WHEN 'normal' IN ('high', 'normal')
         AND EXISTS (SELECT 1 FROM notification_preferences
                     WHERE user_id = '<uuid>' AND system_email_digest = TRUE)
      THEN calculate_next_digest_time(
             (SELECT p FROM notification_preferences p WHERE user_id = '<uuid>'))
    ELSE NULL
  END;
```

À terme, un trigger `AFTER INSERT ON notifications` qui appelle un helper
`route_notification_to_email()` serait plus robuste (couvrirait tous les
INSERT indépendamment du call-site). Reporté à un lot futur — voir TODOs.

Le pragma SQL `COMMENT ON FUNCTION create_notification` (migration Lot 10.2)
rappelle cette convention directement dans le schéma pour les devs qui
consulteraient la fonction via `\df+` ou le Dashboard Supabase.

### ⚠️ Les triggers sur `credits_ledger` doivent matcher le schéma réel

La table `credits_ledger` a le schéma suivant (source de vérité) :

| column | type |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `delta` | `integer` (signé : positif = crédit, négatif = débit) |
| `reason` | `text` |
| `ref_type` | `text` |
| `ref_id` | `uuid` |
| `created_at` | `timestamptz` |

**Elle N'A PAS** de colonnes `entry_type`, `balance_after`, `transaction_id`
(malgré des noms qu'on pourrait supposer par convention).

Valeurs `ref_type` observées en production (grep sur les migrations) :

| `ref_type` | Usage | Delta |
|---|---|---|
| `'transaction'` | Achat de crédits via VPI webhook ou admin approve | `+` |
| `'admin_adjustment'` | Grant/débit admin manuel | `+` ou `-` |
| `'listing_publish'` | Débit pour publication d'annonce | `-` |
| `'listing_reject_refund'` | Remboursement technique après refus modération | `+` |

**Tout trigger / fonction qui lit `NEW.xxx` sur `credits_ledger` doit
impérativement utiliser les colonnes réelles ci-dessus.** Un mismatch
lève une erreur Postgres `42703 (record "new" has no field "xxx")` qui
**rollback la transaction entière**. En pratique, cela casse à la fois :

- l'achat de crédits (webhook VPI qui plante en aval),
- toute publication d'annonce (débit `listing_publish` qui plante),
- tout grant admin (idem),
- donc **l'app entière** dès que l'utilisateur essaie de payer quoi que ce soit.

**Checklist avant d'écrire un trigger sur `credits_ledger`** :

```sql
-- Vérifier les colonnes effectivement présentes :
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'credits_ledger'
ORDER BY ordinal_position;

-- Et les valeurs ref_type réellement insérées :
SELECT ref_type, COUNT(*), SUM(delta)
FROM public.credits_ledger
GROUP BY ref_type
ORDER BY COUNT(*) DESC;
```

**Protection supplémentaire** — envelopper l'appel à `create_notification`
(ou toute logique side-effect) dans un bloc `EXCEPTION WHEN OTHERS` qui
ne `RAISE` pas, mais `RAISE WARNING` + `RETURN NEW`. Ainsi, un bug dans
la notification ne casse jamais la transaction de crédit.

**Incident de référence** — 25 avril 2026 : le trigger d'origine
`notify_credits_purchased` (Lot 10.1) lisait `NEW.entry_type`,
`NEW.balance_after`, `NEW.transaction_id`. Chaque INSERT plantait, toute
publication échouait en prod. Fix dans la migration
`20260425110000_hotfix_notify_credits_purchased.sql`.

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
