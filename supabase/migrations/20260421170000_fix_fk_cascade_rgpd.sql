-- =============================================================================
-- Mission 5.0 — Fix FK cascade rules (RGPD "right to erasure" + compta)
--
-- Applied to prod: YES (21/04/2026 via Supabase SQL Editor). Ali validated
-- smoke tests before this file landed in Git. This file is the canonical
-- Git record of what already runs in prod.
--
-- Problem statement
-- -----------------
-- All user-linked tables were created with `ON DELETE CASCADE` on their
-- user_id / owner_id / reporter_id foreign keys. That behaviour is wrong
-- in two orthogonal ways:
--
--   1. Accounting / audit: credits_ledger and transactions hold financial
--      records that must survive account deletion for >=10 years (Malagasy
--      tax/compta retention rule). CASCADE would wipe them along with the
--      user row → we lose the audit trail and cannot reconcile balances
--      or refund disputes post-fact. Fix: ON DELETE RESTRICT (explicit
--      block — Ali must anonymise or archive first).
--
--   2. RGPD / UX: listings, phone_reveal_events, promo_code_redemptions,
--      and listing_reports hold content produced by a user that should
--      stay visible to the rest of the platform even if the author deletes
--      their account. CASCADE would wipe listings (breaking SEO, buyers'
--      bookmarks, agency relationships) and destroy audit-worthy reports.
--      Fix: ON DELETE SET NULL on the user column (make it NULLABLE), so
--      the row survives with an anonymous author.
--
-- Effect summary
-- --------------
--   credits_ledger.user_id             CASCADE → RESTRICT   (still NOT NULL)
--   transactions.user_id               CASCADE → RESTRICT   (still NOT NULL)
--   listings.owner_id                  CASCADE → SET NULL   (now NULLABLE)
--   phone_reveal_events.user_id        CASCADE → SET NULL   (now NULLABLE)
--   promo_code_redemptions.user_id     CASCADE → SET NULL   (now NULLABLE)
--   listing_reports.reporter_id        CASCADE → SET NULL   (now NULLABLE)
--
-- Idempotence note
-- ----------------
-- `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` with a deterministic name
-- makes the DDL replayable. `DROP NOT NULL` is naturally idempotent (no-op
-- on a column that is already nullable). Safe to re-run against any state.
--
-- Frontend / types impact
-- -----------------------
-- The 4 columns going NULLABLE change nothing at the TypeScript layer for
-- this migration (types regeneration deliberately deferred to Mission 5.1
-- where we add the deletion_* columns alongside). Application code that
-- dereferences listings.owner_id / listing_reports.reporter_id / etc.
-- without a null-check will be audited and fixed in Mission 5.2 or 5.A.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- A. credits_ledger.user_id — CASCADE → RESTRICT (compta 10-year retention)
-- -----------------------------------------------------------------------------
ALTER TABLE public.credits_ledger
  DROP CONSTRAINT IF EXISTS credits_ledger_user_id_fkey;
ALTER TABLE public.credits_ledger
  ADD CONSTRAINT credits_ledger_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- -----------------------------------------------------------------------------
-- B. transactions.user_id — CASCADE → RESTRICT (compta + fiscal retention)
-- -----------------------------------------------------------------------------
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- -----------------------------------------------------------------------------
-- C. listings.owner_id — CASCADE → SET NULL + NULLABLE
--    Rationale: keep the listing visible (SEO, bookmarks, agency strip)
--    even after its owner closes their account.
-- -----------------------------------------------------------------------------
ALTER TABLE public.listings
  ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_owner_id_fkey;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_owner_id_fkey
  FOREIGN KEY (owner_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- D. phone_reveal_events.user_id — CASCADE → SET NULL + NULLABLE
--    Rationale: preserve anti-fraud telemetry even if the viewer deletes
--    their account; row stays as an anonymous reveal event.
-- -----------------------------------------------------------------------------
ALTER TABLE public.phone_reveal_events
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.phone_reveal_events
  DROP CONSTRAINT IF EXISTS phone_reveal_events_user_id_fkey;
ALTER TABLE public.phone_reveal_events
  ADD CONSTRAINT phone_reveal_events_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- E. promo_code_redemptions.user_id — CASCADE → SET NULL + NULLABLE
--    Rationale: keep the redemption history attached to the promo code
--    for admin analytics / abuse detection; who redeemed it becomes
--    anonymous after account deletion, but the redemption itself survives.
-- -----------------------------------------------------------------------------
ALTER TABLE public.promo_code_redemptions
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.promo_code_redemptions
  DROP CONSTRAINT IF EXISTS promo_code_redemptions_user_id_fkey;
ALTER TABLE public.promo_code_redemptions
  ADD CONSTRAINT promo_code_redemptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- F. listing_reports.reporter_id — CASCADE → SET NULL + NULLABLE
--    Rationale: audit trail of community moderation must persist even if
--    the reporter deletes their account. Admin sees "anonymous reporter"
--    rather than losing the report entirely.
-- -----------------------------------------------------------------------------
ALTER TABLE public.listing_reports
  ALTER COLUMN reporter_id DROP NOT NULL;
ALTER TABLE public.listing_reports
  DROP CONSTRAINT IF EXISTS listing_reports_reporter_id_fkey;
ALTER TABLE public.listing_reports
  ADD CONSTRAINT listing_reports_reporter_id_fkey
  FOREIGN KEY (reporter_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

COMMIT;
