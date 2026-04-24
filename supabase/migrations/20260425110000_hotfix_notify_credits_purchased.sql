-- Hotfix — Trigger notify_credits_purchased cassé (Lot 10.1).
--
-- Contexte : le trigger d'origine (migration Lot 10.1 du 25 avril) lisait
-- les colonnes `NEW.entry_type`, `NEW.balance_after`, `NEW.transaction_id`
-- qui n'existent PAS dans la vraie table `credits_ledger`. Chaque INSERT
-- dans la table déclenchait une erreur 42703 et un rollback, bloquant
-- toutes les publications d'annonces (le débit de 100 crédits fait un
-- INSERT via la RPC `publish_listing_with_credits`).
--
-- Schéma RÉEL de `credits_ledger` (source de vérité) :
--   id UUID, user_id UUID, delta INTEGER, reason TEXT,
--   created_at TIMESTAMPTZ, ref_type TEXT, ref_id UUID
--
-- Ref_type observés dans les INSERT existants (grep sur supabase/migrations) :
--   * 'transaction'           → achat de crédits (VPI webhook + admin approve)
--   * 'admin_adjustment'      → grant/débit admin manuel
--   * 'listing_publish'       → débit publication (delta < 0, déjà exclu par delta > 0)
--   * 'listing_reject_refund' → remboursement technique après refus modération
--                               (delta > 0 mais PAS un achat user-facing)
--
-- Fix :
--   1. Whitelist `ref_type IN ('transaction', 'admin_adjustment')` — seuls les
--      achats / grants sont notifiés comme « achat de crédits ».
--      `listing_reject_refund` est volontairement exclu (pas un achat user).
--   2. Solde courant calculé via `SUM(delta)` sur `credits_ledger` (pas de
--      colonne `balance_after` en DB).
--   3. `EXCEPTION WHEN OTHERS` autour de l'appel à `create_notification` :
--      si la création de notif échoue pour n'importe quelle raison (quota,
--      prefs manquantes, bug downstream), on NE DOIT PAS casser la transaction
--      d'achat/débit. On logge un WARNING et on laisse passer.
--   4. Convention Lot 10.1 respectée : passe par `create_notification(...)`
--      pour que `email_queued_for` soit calculé correctement.

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_credits_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_after INTEGER;
  v_title TEXT;
  v_body TEXT;
  v_is_purchase BOOLEAN;
BEGIN
  -- Détection achat user-facing. Les remboursements techniques
  -- (listing_reject_refund) et les débits (delta <= 0) sont exclus.
  v_is_purchase := NEW.delta IS NOT NULL
                   AND NEW.delta > 0
                   AND NEW.ref_type IN ('transaction', 'admin_adjustment');

  IF NOT v_is_purchase THEN
    RETURN NEW;
  END IF;

  -- Solde après transaction : somme complète du ledger user (trigger AFTER
  -- INSERT donc NEW est déjà persistée dans la table).
  BEGIN
    SELECT COALESCE(SUM(delta), 0)::INTEGER
    INTO v_balance_after
    FROM public.credits_ledger
    WHERE user_id = NEW.user_id;

    v_title := format('Paiement confirmé — %s crédits AutoNex', NEW.delta);
    v_body := format(
      'Votre achat de %s crédits est confirmé. Nouveau solde : %s crédits.',
      NEW.delta,
      v_balance_after
    );

    PERFORM public.create_notification(
      p_user_id    := NEW.user_id,
      p_type       := 'credits_purchased'::notification_type,
      p_category   := 'payments'::notification_category,
      p_priority   := 'critical'::notification_priority,
      p_title      := v_title,
      p_body       := v_body,
      p_metadata   := jsonb_build_object(
        'delta',         NEW.delta,
        'balance_after', v_balance_after,
        'ref_type',      NEW.ref_type,
        'ref_id',        NEW.ref_id,
        'ledger_id',     NEW.id
      ),
      p_action_url := '/dashboard',
      p_icon       := 'Coins'
    );
  EXCEPTION WHEN OTHERS THEN
    -- SÉCURITÉ : l'échec de la notif ne doit JAMAIS casser la transaction
    -- d'achat/débit de crédits. Le paiement est déjà validé en amont ; une
    -- notif manquée se debug via Sentry + email_log, pas en remontant au user.
    RAISE WARNING 'notify_credits_purchased failed for ledger_id=% user_id=%: %',
      NEW.id, NEW.user_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_credits_purchased() IS
  'Trigger AFTER INSERT sur credits_ledger. Crée une notif ''credits_purchased'' '
  'uniquement pour les ACHATS user-facing (delta > 0 + ref_type in '
  '(''transaction'', ''admin_adjustment'')). Calcule balance_after via '
  'SUM(delta) car credits_ledger n''a pas de colonne balance_after. '
  'EXCEPTION WHEN OTHERS pour garantir que l''échec de notif ne casse jamais '
  'la transaction crédit. Hotfix du 25 avril 2026 (remplace l''impl Lot 10.1 '
  'qui lisait des colonnes fantômes entry_type/balance_after/transaction_id).';

COMMIT;
