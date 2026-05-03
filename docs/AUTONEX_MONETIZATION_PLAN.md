# AutoNex — Plan d'Implémentation Monétisation

> Document de référence + 8 prompts prêts à coller dans Claude Code.
> Pattern Claude Code : Phase 1 (autonex-graph-explorer) → Phase 2 (impl après GO) → Phase 3 (tsc + vitest + build) → Phase 4 (rapport diff + commit message) → Phase 5 (STOP, Ali commit).

---

## 0. Contexte & Décisions validées

### Décisions business actées
- **Crédits** : monnaie unique, ratio 1 crédit = 1 Ariary (transparence maximale)
- **Onboarding** : 100,000 crédits offerts à l'inscription = 4 listings 30j gratuits, expiration 90 jours
- **Listing 30j** : 25,000 crédits (renouvellement 15,000 crédits)
- **Listing 60j** : 40,000 crédits
- **Boost Remontée** (effet ponctuel ~48-72h) : 5,000 crédits
- **Boost À la une 7j** : 30,000 crédits
- **Boost Top Annonce 30j** : 100,000 crédits
- **Pack combo (À la une + Top)** : 120,000 crédits (économie 10k)
- **Verified Seller / an** : 75,000 crédits
- **Vidéo annonce** : 15,000 crédits
- **Vente Express** (pack combo + push ciblée) : 60,000 crédits

### Packs de crédits
- Pack Découverte : 10,000 Ar → 10,000 crédits (entry, 0 bonus)
- Pack Standard : 25,000 Ar → 27,500 crédits (+10% bonus)
- Pack Pro : 50,000 Ar → 60,000 crédits (+20% bonus)
- Pack Power : 100,000 Ar → 130,000 crédits (+30% bonus)

### Authentification & Trust
- **Inscription** : Email + password OU Google OAuth (PAS de phone OTP)
- **Email** : vérifié via magic link Supabase Auth
- **Phone** : optionnel (collecté, pas vérifié OTP par AutoNex — MVola valide naturellement au paiement)
- **Verified Badge** : CIN front/back + selfie tenant CIN + carte grise (validation manuelle + AI assistance)
- **Anti-spam** : rate limit 3 annonces actives simultanées sans Verified Badge, AI photo detection, community reporting

### Stack technique (rappel)
- React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Vercel deploy
- Supabase project ID : `wtkedamrmtvdoippqanc`

### Garde-fous STRICTS (intouchables)
- ❌ `src/pages/Publier.tsx`
- ❌ `src/pages/publish/*`
- ❌ `src/components/publish/*`
- ❌ `src/lib/publishDraft.ts`
- ❌ Hero baseline `"Le portail auto N°1 de Madagascar"`
- ❌ `e2e/yas-app-visual-audit.spec.ts` (sauf validation explicite)
- ❌ Aucun `git push` ou `git commit` automatique

**Conséquence architecturale** : la logique de débit de crédits sur création de listing **passe par un trigger DB** (BEFORE INSERT sur `listings`), pas par modification de code frontend. Le pre-check de balance avant entrée dans `/publier` se fait via un **wrapper de route** (`<CreditGuard>`) dans `App.tsx`, pas par modification de `Publier.tsx`.

---

## 1. Architecture cible

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  /dashboard/listings  /dashboard/credits  /dashboard/verification │
│  /publier (existant, NON MODIFIÉ — protégé par <CreditGuard>)   │
│  Header: <CreditBalanceChip />                                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Supabase JS
┌──────────────────────────────▼──────────────────────────────────┐
│                    BACKEND (Supabase)                            │
├─────────────────────────────────────────────────────────────────┤
│  AUTH: email + Google OAuth                                     │
│                                                                  │
│  TABLES:                                                         │
│   credits_balances         credits_transactions                  │
│   listings (existant +)    listing_boosts                        │
│   verifications            seller_badges                         │
│   listing_views_daily      listing_reports                       │
│   credit_pack_purchases    notification_queue                    │
│                                                                  │
│  TRIGGERS:                                                       │
│   on auth.users INSERT  → grant 100k credits (90j expiry)       │
│   BEFORE listings INSERT → check + debit credits                │
│   on listing_boosts INSERT → debit credits                      │
│   on listings UPDATE status='sold' → log analytics              │
│                                                                  │
│  EDGE FUNCTIONS:                                                 │
│   credit-pack-purchase-init   (crée pending purchase + VPI)     │
│   credit-pack-purchase-confirm (webhook VPI → grant credits)    │
│   listing-renew                                                  │
│   verification-submit                                            │
│   admin-verification-review                                      │
│                                                                  │
│  CRONS (pg_cron):                                                │
│   Every 5min  → expire boosts (set status=expired)              │
│   Daily 02:00 → expire listings (status active → expired)       │
│   Daily 02:30 → expire granted credits (>90j)                   │
│   Hourly      → process notification_queue                       │
└─────────────────────────────────────────────────────────────────┘
```

### Flow utilisateur principal

```
NOUVEL UTILISATEUR
  signup email/Google
  → trigger grant 100,000 crédits offerts (expire J+90)
  → email magic link confirmation
  → redirect /dashboard
  → CTA "Publier votre première annonce gratuite"

PUBLIER UNE ANNONCE
  click "Publier" → <CreditGuard> check balance >= 25,000
    ├─ insufficient → redirect /dashboard/credits avec banner "Recharge-toi pour publier"
    └─ sufficient → /publier (flow existant intact)
        → publishDraft.ts crée la row listing
        → trigger DB BEFORE INSERT débite 25,000 crédits
        → trigger crée transaction "spend"
        → si trigger fail (race condition) → INSERT rollback, draft preserved

POSTER UN BOOST
  /dashboard/listings → click "Booster" sur une carte
  → <BoostModal> ouvre, montre 3 options + pack
  → choix → check balance + debit + create boost record
  → effet immédiat (timestamp updated, badge visible)
  → countdown affiché

ACHETER DES CRÉDITS
  /dashboard/credits → 4 packs visibles
  → click pack → call edge fn credit-pack-purchase-init
  → redirect VPI checkout (existant)
  → webhook VPI → confirm-purchase → grant credits + log transaction
  → email confirmation

VERIFIED SELLER
  /dashboard/verification → upload CIN front/back + selfie + carte grise
  → status pending → admin review (autre interface)
  → approve → grant badge 12 mois + email
  → reject → email avec raison
```

---

## 2. Database Schema

Tous les nouveaux objets dans schema `public`. RLS activé partout. Migrations à placer dans `supabase/migrations/` avec timestamp.

### 2.1 Table `credits_balances`

Solde actuel par user. Une ligne par user (créée au signup).

```sql
CREATE TABLE public.credits_balances (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance           integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  granted_balance   integer NOT NULL DEFAULT 0 CHECK (granted_balance >= 0),
  granted_expires_at timestamptz,
  total_purchased   integer NOT NULL DEFAULT 0,
  total_spent       integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credits_balances_granted_expires ON public.credits_balances(granted_expires_at) 
  WHERE granted_balance > 0;

-- RLS
ALTER TABLE public.credits_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_balance" ON public.credits_balances 
  FOR SELECT USING (auth.uid() = user_id);
-- writes only via SECURITY DEFINER functions
```

**Règle de spend** : `granted_balance` est consommé EN PRIORITÉ avant `balance` (pour que les crédits payants ne soient jamais consommés tant que les offerts ne sont pas épuisés/expirés).

### 2.2 Table `credits_transactions`

Ledger immuable de toutes les opérations sur les crédits.

```sql
CREATE TYPE public.credit_tx_type AS ENUM (
  'grant_signup',      -- 100k offerts à l'inscription
  'grant_promo',       -- crédits promotionnels custom
  'purchase',          -- achat pack
  'spend_listing',     -- création annonce
  'spend_renewal',     -- renouvellement annonce
  'spend_boost',       -- achat boost
  'spend_verified',    -- achat Verified Badge
  'spend_video',       -- ajout vidéo
  'spend_express',     -- pack Vente Express
  'refund',            -- remboursement (admin)
  'expire_granted'     -- expiration crédits offerts non-utilisés
);

CREATE TABLE public.credits_transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_type             public.credit_tx_type NOT NULL,
  amount              integer NOT NULL,  -- positif = entrée, négatif = sortie
  granted_amount      integer NOT NULL DEFAULT 0,  -- portion sur granted_balance
  paid_amount         integer NOT NULL DEFAULT 0,  -- portion sur balance payant
  balance_after       integer NOT NULL,
  granted_after       integer NOT NULL,
  related_entity      text,  -- 'listing'|'boost'|'pack_purchase'|...
  related_entity_id   uuid,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credits_tx_user_created ON public.credits_transactions(user_id, created_at DESC);
CREATE INDEX idx_credits_tx_entity ON public.credits_transactions(related_entity, related_entity_id);

ALTER TABLE public.credits_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_tx" ON public.credits_transactions 
  FOR SELECT USING (auth.uid() = user_id);
-- inserts only via SECURITY DEFINER functions
```

### 2.3 Table `credit_packs` (catalogue)

Configuration des packs achetables. Une ligne par pack.

```sql
CREATE TABLE public.credit_packs (
  id                text PRIMARY KEY,  -- 'discover'|'standard'|'pro'|'power'
  display_name      text NOT NULL,
  price_ariary      integer NOT NULL CHECK (price_ariary > 0),
  base_credits      integer NOT NULL CHECK (base_credits > 0),
  bonus_credits     integer NOT NULL DEFAULT 0,
  total_credits     integer GENERATED ALWAYS AS (base_credits + bonus_credits) STORED,
  bonus_pct         integer GENERATED ALWAYS AS (
    CASE WHEN base_credits = 0 THEN 0 
         ELSE (bonus_credits * 100 / base_credits) END
  ) STORED,
  display_order     integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_active_packs" ON public.credit_packs 
  FOR SELECT USING (is_active = true);

INSERT INTO public.credit_packs (id, display_name, price_ariary, base_credits, bonus_credits, display_order) VALUES
  ('discover',  'Pack Découverte', 10000,   10000,   0,     1),
  ('standard',  'Pack Standard',   25000,   25000,   2500,  2),
  ('pro',       'Pack Pro',        50000,   50000,   10000, 3),
  ('power',     'Pack Power',      100000,  100000,  30000, 4);
```

### 2.4 Table `credit_pack_purchases`

Achats en cours (pending) et complétés.

```sql
CREATE TYPE public.purchase_status AS ENUM ('pending', 'paid', 'failed', 'cancelled', 'refunded');

CREATE TABLE public.credit_pack_purchases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id             text NOT NULL REFERENCES public.credit_packs(id),
  price_ariary        integer NOT NULL,
  credits_to_grant    integer NOT NULL,  -- snapshotté au moment de l'achat
  status              public.purchase_status NOT NULL DEFAULT 'pending',
  payment_method      text,  -- 'mvola'|'card_vpi'|'card_other'
  payment_provider_id text,  -- ID VPI ou MVola
  paid_at             timestamptz,
  failed_reason       text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchases_user ON public.credit_pack_purchases(user_id, created_at DESC);
CREATE INDEX idx_purchases_status ON public.credit_pack_purchases(status) WHERE status = 'pending';
CREATE INDEX idx_purchases_provider ON public.credit_pack_purchases(payment_provider_id);

ALTER TABLE public.credit_pack_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_purchases" ON public.credit_pack_purchases 
  FOR SELECT USING (auth.uid() = user_id);
```

### 2.5 Table `listings` — additions

⚠️ **`listings` existe déjà**. Ne PAS recréer la table. Seules les colonnes additives ci-dessous, via `ALTER TABLE`.

```sql
-- Status enum (vérifier si existe déjà, sinon créer)
DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM (
    'draft', 'active', 'expiring_soon', 'expired', 'sold', 'archived', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS status public.listing_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS listing_duration_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_spent_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorite_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_url text;

CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON public.listings(expires_at) 
  WHERE status IN ('active', 'expiring_soon');
CREATE INDEX IF NOT EXISTS idx_listings_user_status ON public.listings(user_id, status);
```

### 2.6 Table `listing_boosts`

Tracking des boosts actifs et historiques par annonce.

```sql
CREATE TYPE public.boost_type AS ENUM ('bump', 'featured', 'top_ad', 'video', 'express_pack');
CREATE TYPE public.boost_status AS ENUM ('active', 'expired', 'cancelled');

CREATE TABLE public.listing_boosts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boost_type        public.boost_type NOT NULL,
  status            public.boost_status NOT NULL DEFAULT 'active',
  starts_at         timestamptz NOT NULL DEFAULT now(),
  ends_at           timestamptz,  -- NULL pour bump (effet ponctuel)
  duration_days     integer,
  credits_spent     integer NOT NULL CHECK (credits_spent > 0),
  transaction_id    uuid REFERENCES public.credits_transactions(id),
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_boosts_listing_active ON public.listing_boosts(listing_id, status, ends_at);
CREATE INDEX idx_boosts_ends_at ON public.listing_boosts(ends_at) WHERE status = 'active';
CREATE INDEX idx_boosts_user ON public.listing_boosts(user_id, created_at DESC);

-- Contrainte : une seule À la une active à la fois par listing
CREATE UNIQUE INDEX idx_one_featured_per_listing ON public.listing_boosts(listing_id) 
  WHERE status = 'active' AND boost_type = 'featured';

-- Contrainte : une seule Top Annonce active à la fois par listing
CREATE UNIQUE INDEX idx_one_top_per_listing ON public.listing_boosts(listing_id) 
  WHERE status = 'active' AND boost_type = 'top_ad';

ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_boosts" ON public.listing_boosts 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "anyone_read_active_boosts" ON public.listing_boosts 
  FOR SELECT USING (status = 'active');
```

### 2.7 Table `verifications`

Soumissions Verified Badge (KYC light Madagascar).

```sql
CREATE TYPE public.verification_type AS ENUM ('verified_seller');
CREATE TYPE public.verification_status AS ENUM ('pending', 'reviewing', 'approved', 'rejected', 'expired');

CREATE TABLE public.verifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                public.verification_type NOT NULL DEFAULT 'verified_seller',
  status              public.verification_status NOT NULL DEFAULT 'pending',
  cin_front_path      text NOT NULL,  -- Supabase Storage path
  cin_back_path       text NOT NULL,
  selfie_path         text NOT NULL,
  carte_grise_path    text,  -- optionnel selon politique
  full_name           text NOT NULL,
  cin_number          text NOT NULL,
  date_of_birth       date,
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES auth.users(id),
  rejection_reason    text,
  expires_at          timestamptz,  -- 12 mois après approval
  credits_spent       integer NOT NULL DEFAULT 0,
  transaction_id      uuid REFERENCES public.credits_transactions(id),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_verif_user_status ON public.verifications(user_id, status);
CREATE INDEX idx_verif_pending ON public.verifications(submitted_at) WHERE status = 'pending';
CREATE INDEX idx_verif_expires ON public.verifications(expires_at) WHERE status = 'approved';

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_verif" ON public.verifications 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_verif" ON public.verifications 
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admins_full_verif" ON public.verifications 
  FOR ALL USING (public.immonex_is_admin());
```

### 2.8 Table `seller_badges`

Badges actifs (computed view simplifiable, mais table dédiée = plus rapide en lecture pour search/listings).

```sql
CREATE TABLE public.seller_badges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type        text NOT NULL,  -- 'verified_seller'
  granted_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  verification_id   uuid REFERENCES public.verifications(id),
  is_active         boolean GENERATED ALWAYS AS (expires_at > now()) STORED,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_badges_user_active ON public.seller_badges(user_id) WHERE is_active = true;
CREATE UNIQUE INDEX idx_one_active_badge_per_type ON public.seller_badges(user_id, badge_type) 
  WHERE is_active = true;

ALTER TABLE public.seller_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_active_badges" ON public.seller_badges 
  FOR SELECT USING (is_active = true);
```

### 2.9 Tables analytics & moderation

```sql
-- Vues quotidiennes (rollup)
CREATE TABLE public.listing_views_daily (
  listing_id        uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  view_date         date NOT NULL,
  view_count        integer NOT NULL DEFAULT 0,
  unique_visitors   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (listing_id, view_date)
);
CREATE INDEX idx_views_daily_date ON public.listing_views_daily(view_date);

-- Reports
CREATE TYPE public.report_reason AS ENUM (
  'fake_listing', 'wrong_price', 'sold_already', 'scam', 'inappropriate', 'duplicate', 'other'
);
CREATE TYPE public.report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

CREATE TABLE public.listing_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason          public.report_reason NOT NULL,
  comment         text,
  status          public.report_status NOT NULL DEFAULT 'open',
  reviewed_by     uuid REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  resolution      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_listing ON public.listing_reports(listing_id);
CREATE INDEX idx_reports_open ON public.listing_reports(status) WHERE status = 'open';

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_insert_report" ON public.listing_reports 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "admins_full_reports" ON public.listing_reports 
  FOR ALL USING (public.immonex_is_admin());
```

### 2.10 Table `notification_queue`

File d'attente pour notifications cycle de vie.

```sql
CREATE TYPE public.notif_kind AS ENUM (
  'listing_expiring_7d', 'listing_expiring_3d', 'listing_expiring_1d',
  'listing_expired', 'listing_renewed',
  'boost_ending_1d', 'boost_ended',
  'credits_grant', 'credits_expiring_30d', 'credits_expired',
  'pack_purchase_confirmed', 'pack_purchase_failed',
  'verif_approved', 'verif_rejected',
  'milestone_50_views', 'milestone_10_contacts'
);

CREATE TYPE public.notif_channel AS ENUM ('email', 'push', 'in_app');
CREATE TYPE public.notif_status AS ENUM ('pending', 'sent', 'failed', 'skipped');

CREATE TABLE public.notification_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind            public.notif_kind NOT NULL,
  channel         public.notif_channel NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at    timestamptz NOT NULL DEFAULT now(),
  status          public.notif_status NOT NULL DEFAULT 'pending',
  attempts        integer NOT NULL DEFAULT 0,
  sent_at         timestamptz,
  error           text,
  dedupe_key      text UNIQUE,  -- ex: "listing_expiring_7d:<listing_id>"
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_pending ON public.notification_queue(scheduled_at) 
  WHERE status = 'pending';
```

---

## 3. Machines d'états

### 3.1 Listing lifecycle

```
[draft] ──publish──▶ [active] ──J-7──▶ [expiring_soon] ──expires──▶ [expired]
   │                    │                                              │
   │                    ├──mark_sold──▶ [sold]                        │
   │                    │                                              │
   │                    └──admin_reject──▶ [rejected]                  │
   │                                                                    │
   └──delete──▶ (gone)                                                  │
                                                                        │
   [expired] ──renew──▶ [active] (15k crédits, +30j, renewal_count++) ◀┘
```

**Règles** :
- `draft` → `active` : trigger BEFORE INSERT vérifie balance, débite, set `published_at = now()`, `expires_at = now() + duration_days`
- `active` → `expiring_soon` : cron daily, quand `expires_at - now() <= 7 days`
- `expiring_soon` → `expired` : cron daily, quand `expires_at <= now()`
- `expired` → `active` (renewal) : edge function, débite 15k crédits, `expires_at += 30 days`, `renewal_count++`
- `active`/`expired` → `sold` : user click "Marquer vendue", boosts actifs deviennent `expired`

### 3.2 Boost lifecycle

```
[active] ──ends_at_passed──▶ [expired]
   │
   └──cancel(rare)──▶ [cancelled]   (admin only, refund possible)
```

**Règles cumulabilité** :
- `bump` (Remontée) : effet ponctuel, ne crée pas de boost actif persistent — il met à jour `published_at = now()` du listing pour le re-ranger en tête de tri "récent". Il est tout de même loggué dans `listing_boosts` avec `status='expired'` et `ends_at = now() + 72h` pour analytics.
- `featured` (À la une) : 1 seul actif à la fois par listing (unique index)
- `top_ad` (Top Annonce) : 1 seul actif à la fois par listing (unique index)
- `featured` + `top_ad` peuvent coexister sur le même listing (pack combo achat ces deux ensemble avec économie).

### 3.3 Verification lifecycle

```
[pending] ──admin_review_start──▶ [reviewing] ──approve──▶ [approved] ──+12mois──▶ [expired]
                                       │
                                       └──reject──▶ [rejected]
```

---

## 4. Backend Logic — DB Functions & Triggers

### 4.1 Fonction de spend de crédits (atomique, SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_tx_type public.credit_tx_type,
  p_related_entity text DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_balance        integer;
  v_granted        integer;
  v_granted_expires timestamptz;
  v_use_granted    integer := 0;
  v_use_paid       integer := 0;
  v_tx_id          uuid;
BEGIN
  -- Verrouillage row pour éviter race conditions
  SELECT balance, granted_balance, granted_expires_at
    INTO v_balance, v_granted, v_granted_expires
  FROM public.credits_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_balance_row' USING ERRCODE = 'P0001';
  END IF;

  -- Expirer granted si nécessaire (best-effort inline)
  IF v_granted_expires IS NOT NULL AND v_granted_expires <= now() THEN
    v_granted := 0;
    UPDATE public.credits_balances
      SET granted_balance = 0, granted_expires_at = NULL, updated_at = now()
      WHERE user_id = p_user_id;
  END IF;

  -- Vérifier fonds suffisants
  IF (v_balance + v_granted) < p_amount THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0002',
      DETAIL = format('balance=%s, granted=%s, required=%s', v_balance, v_granted, p_amount);
  END IF;

  -- Consommer granted en priorité
  IF v_granted >= p_amount THEN
    v_use_granted := p_amount;
    v_use_paid := 0;
  ELSE
    v_use_granted := v_granted;
    v_use_paid := p_amount - v_granted;
  END IF;

  -- Update balance
  UPDATE public.credits_balances
    SET balance = balance - v_use_paid,
        granted_balance = granted_balance - v_use_granted,
        total_spent = total_spent + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING balance, granted_balance INTO v_balance, v_granted;

  -- Log transaction
  INSERT INTO public.credits_transactions(
    user_id, tx_type, amount, granted_amount, paid_amount,
    balance_after, granted_after, related_entity, related_entity_id, metadata
  ) VALUES (
    p_user_id, p_tx_type, -p_amount, v_use_granted, v_use_paid,
    v_balance, v_granted, p_related_entity, p_related_entity_id, p_metadata
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.spend_credits TO authenticated;
```

### 4.2 Fonction grant de crédits (achats, signup, promo)

```sql
CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_tx_type public.credit_tx_type,
  p_is_granted boolean DEFAULT false,  -- true pour signup/promo (expire), false pour achat
  p_granted_expires_at timestamptz DEFAULT NULL,
  p_related_entity text DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_balance integer;
  v_granted integer;
  v_tx_id uuid;
BEGIN
  -- Upsert balance row
  INSERT INTO public.credits_balances(user_id, balance, granted_balance, granted_expires_at)
    VALUES (p_user_id, 0, 0, NULL)
    ON CONFLICT (user_id) DO NOTHING;

  IF p_is_granted THEN
    UPDATE public.credits_balances
      SET granted_balance = granted_balance + p_amount,
          granted_expires_at = COALESCE(p_granted_expires_at, granted_expires_at),
          updated_at = now()
      WHERE user_id = p_user_id
      RETURNING balance, granted_balance INTO v_balance, v_granted;
  ELSE
    UPDATE public.credits_balances
      SET balance = balance + p_amount,
          total_purchased = total_purchased + p_amount,
          updated_at = now()
      WHERE user_id = p_user_id
      RETURNING balance, granted_balance INTO v_balance, v_granted;
  END IF;

  INSERT INTO public.credits_transactions(
    user_id, tx_type, amount, granted_amount, paid_amount,
    balance_after, granted_after, related_entity, related_entity_id, metadata
  ) VALUES (
    p_user_id, p_tx_type, p_amount,
    CASE WHEN p_is_granted THEN p_amount ELSE 0 END,
    CASE WHEN p_is_granted THEN 0 ELSE p_amount END,
    v_balance, v_granted, p_related_entity, p_related_entity_id, p_metadata
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.grant_credits TO authenticated;
```

### 4.3 Trigger : grant 100k crédits au signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger AS $$
BEGIN
  PERFORM public.grant_credits(
    p_user_id := NEW.id,
    p_amount := 100000,
    p_tx_type := 'grant_signup',
    p_is_granted := true,
    p_granted_expires_at := now() + interval '90 days',
    p_metadata := jsonb_build_object('source', 'signup_bonus')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_grant_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();
```

### 4.4 Trigger : débit crédits sur création listing

```sql
CREATE OR REPLACE FUNCTION public.handle_listing_create_debit()
RETURNS trigger AS $$
DECLARE
  v_cost integer;
  v_tx_id uuid;
BEGIN
  -- Ne s'applique que pour publication réelle (pas draft)
  IF NEW.status NOT IN ('active', 'expiring_soon') THEN
    RETURN NEW;
  END IF;

  -- Coût selon durée
  v_cost := CASE 
    WHEN NEW.listing_duration_days = 30 THEN 25000
    WHEN NEW.listing_duration_days = 60 THEN 40000
    ELSE 25000
  END;

  -- Spend (raise si insuffisant → INSERT rolled back)
  v_tx_id := public.spend_credits(
    p_user_id := NEW.user_id,
    p_amount := v_cost,
    p_tx_type := 'spend_listing',
    p_related_entity := 'listing',
    p_related_entity_id := NEW.id,
    p_metadata := jsonb_build_object('duration_days', NEW.listing_duration_days)
  );

  -- Set published_at, expires_at, credits_spent_total
  NEW.published_at := now();
  NEW.expires_at := now() + (NEW.listing_duration_days || ' days')::interval;
  NEW.credits_spent_total := COALESCE(NEW.credits_spent_total, 0) + v_cost;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_listing_create_debit
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_listing_create_debit();
```

### 4.5 Cron : expiration listings & boosts & crédits

À configurer via `pg_cron` (extension Supabase). Exemples :

```sql
-- Activer pg_cron (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily 02:00 UTC : passer expired
SELECT cron.schedule(
  'autonex-expire-listings',
  '0 2 * * *',
  $$
    UPDATE public.listings
      SET status = 'expired'
      WHERE status IN ('active', 'expiring_soon')
        AND expires_at <= now();

    UPDATE public.listings
      SET status = 'expiring_soon'
      WHERE status = 'active'
        AND expires_at - now() <= interval '7 days';
  $$
);

-- Toutes les 5min : expirer boosts
SELECT cron.schedule(
  'autonex-expire-boosts',
  '*/5 * * * *',
  $$
    UPDATE public.listing_boosts
      SET status = 'expired'
      WHERE status = 'active'
        AND ends_at IS NOT NULL
        AND ends_at <= now();
  $$
);

-- Daily 02:30 : expirer granted credits
SELECT cron.schedule(
  'autonex-expire-granted-credits',
  '30 2 * * *',
  $$
    WITH expired_users AS (
      SELECT user_id, granted_balance
      FROM public.credits_balances
      WHERE granted_expires_at IS NOT NULL
        AND granted_expires_at <= now()
        AND granted_balance > 0
    )
    INSERT INTO public.credits_transactions(
      user_id, tx_type, amount, granted_amount, paid_amount,
      balance_after, granted_after, metadata
    )
    SELECT 
      eu.user_id, 'expire_granted', -eu.granted_balance, eu.granted_balance, 0,
      cb.balance, 0,
      jsonb_build_object('expired_at', now())
    FROM expired_users eu
    JOIN public.credits_balances cb ON cb.user_id = eu.user_id;

    UPDATE public.credits_balances
      SET granted_balance = 0,
          granted_expires_at = NULL,
          updated_at = now()
      WHERE granted_expires_at IS NOT NULL
        AND granted_expires_at <= now()
        AND granted_balance > 0;
  $$
);

-- Daily 03:00 : enfile notifications de cycle de vie
SELECT cron.schedule(
  'autonex-enqueue-notifications',
  '0 3 * * *',
  $$ SELECT public.enqueue_lifecycle_notifications(); $$
);
```

### 4.6 Edge functions (specs)

À créer dans `supabase/functions/` :

#### `credit-pack-purchase-init`
- **Input** : `{ pack_id }`
- **Auth** : user JWT requis
- **Logic** :
  1. Lookup pack actif
  2. Insert `credit_pack_purchases` (status `pending`)
  3. Init paiement VPI (réutiliser helper existant `invokeEdgeFunctionGet.ts`)
  4. Retourner `{ purchase_id, payment_url }`

#### `credit-pack-purchase-confirm`
- **Input** : webhook VPI signé
- **Logic** :
  1. Vérifier signature webhook
  2. Charger purchase, vérifier status `pending`
  3. Update status → `paid`
  4. Call `grant_credits()` avec amount = `credits_to_grant`, `is_granted=false`
  5. Enqueue notification `pack_purchase_confirmed`

#### `listing-renew`
- **Input** : `{ listing_id }`
- **Auth** : owner only
- **Logic** :
  1. Vérifier listing exists, status `expired` (ou autre éligible)
  2. Call `spend_credits(15000, 'spend_renewal')`
  3. Update listing : `status='active'`, `expires_at = now() + 30d`, `renewal_count++`
  4. Retourner listing mis à jour

#### `boost-purchase`
- **Input** : `{ listing_id, boost_type, with_pack_combo? }`
- **Auth** : owner only
- **Logic** :
  1. Vérifier listing actif
  2. Vérifier pas de conflit (uniqueness featured/top_ad)
  3. Calculer coût selon type (5k bump / 30k featured / 100k top_ad / 120k pack combo)
  4. Call `spend_credits()`
  5. Si bump : update `listings.published_at = now()`, insert boost row avec `status='expired'` et `ends_at = now() + 72h` (analytics seulement)
  6. Si featured/top_ad : insert boost row, `status='active'`, `ends_at` selon durée
  7. Si pack combo : 2 inserts featured + top_ad
  8. Enqueue notification

#### `verification-submit`
- **Input** : multipart form (CIN front, CIN back, selfie, carte grise) + `{ full_name, cin_number, date_of_birth }`
- **Auth** : user JWT requis
- **Logic** :
  1. Upload files vers Supabase Storage bucket `verifications` (privé)
  2. Insert `verifications` (status `pending`)
  3. Spend 75,000 crédits
  4. Notify admins (channel `in_app`)
  5. Retourner `{ verification_id }`

#### `admin-verification-review`
- **Auth** : admin only (`immonex_is_admin()`)
- **Input** : `{ verification_id, action: 'approve'|'reject', reason? }`
- **Logic** :
  1. Update verification status
  2. Si approve : insert `seller_badges` avec `expires_at = now() + 12 months`
  3. Si reject : refund 75k crédits via `grant_credits` avec tx_type `refund`
  4. Enqueue notification

---

## 5. Frontend Architecture

### Routes (additions / modifications)

| Route | Composant | Description |
|---|---|---|
| `/dashboard` | `DashboardHome.tsx` | Existant — ajouter `<CreditBalanceCard />` |
| `/dashboard/listings` | `MyListingsPage.tsx` | NEW — liste des annonces utilisateur |
| `/dashboard/credits` | `CreditsPage.tsx` | NEW — solde, historique, packs |
| `/dashboard/verification` | `VerificationPage.tsx` | NEW — soumission Verified Badge |
| `/publier` | (existant intact) | Wrappé par `<CreditGuard>` dans App.tsx |
| `/admin/verifications` | `AdminVerificationsPage.tsx` | NEW — review queue |

### Composants nouveaux

```
src/features/credits/
├── components/
│   ├── CreditBalanceChip.tsx          # Header chip (solde courant)
│   ├── CreditBalanceCard.tsx          # Dashboard hero card
│   ├── CreditPackGrid.tsx             # Grid 4 packs
│   ├── CreditPackCard.tsx             # 1 pack
│   ├── CreditPurchaseModal.tsx        # Confirmation + paiement
│   ├── TransactionHistoryTable.tsx    # Historique
│   └── CreditGuard.tsx                # Route wrapper, check balance
├── hooks/
│   ├── useCreditBalance.ts
│   ├── useCreditTransactions.ts
│   ├── usePurchasePack.ts
│   └── useCreditPacks.ts
├── lib/
│   ├── creditCosts.ts                 # Constants : LISTING_30D=25000, etc.
│   ├── creditFormatting.ts            # formatCredits(), formatAriary()
│   └── creditPaymentFlow.ts           # VPI integration
└── types.ts

src/features/listings-mgmt/
├── components/
│   ├── MyListingCard.tsx              # Card avec status, countdown, perf
│   ├── ListingStatusBadge.tsx         # Badge couleur
│   ├── ListingExpiryProgress.tsx      # Bar + countdown
│   ├── ListingPerfMetrics.tsx         # Vues / contacts / favs
│   ├── ListingTabs.tsx                # Active/Expiring/Expired/Sold/Drafts
│   ├── RenewListingModal.tsx
│   └── MarkAsSoldModal.tsx
├── hooks/
│   ├── useMyListings.ts
│   ├── useRenewListing.ts
│   └── useMarkAsSold.ts
└── lib/
    └── listingHelpers.ts              # daysRemaining(), statusLabel()

src/features/boosts/
├── components/
│   ├── BoostModal.tsx                 # 3 options + pack combo
│   ├── BoostOptionCard.tsx            # 1 option
│   ├── BoostActiveBadge.tsx           # "À la une jusqu'au..."
│   └── BoostROIChart.tsx              # +312% vues depuis boost
├── hooks/
│   ├── usePurchaseBoost.ts
│   └── useActiveBoosts.ts
└── lib/
    └── boostRules.ts                  # cumulability rules

src/features/verification/
├── components/
│   ├── VerifiedBadge.tsx              # ✓ icon (réutilisé partout)
│   ├── VerificationForm.tsx           # Multi-step form
│   ├── DocumentUpload.tsx             # File picker + preview
│   └── VerificationStatus.tsx         # Pending/Reviewing/Approved
├── hooks/
│   └── useSubmitVerification.ts
└── lib/
    └── verificationValidation.ts
```

### Architecture state management

- **React Query** pour lectures (balance, transactions, listings, boosts)
- **Mutations** avec invalidation appropriée (after spend → invalidate balance + listings)
- Pas de Redux/Zustand nouveau (rester simple)

### Conventions visuelles (cohérence avec existant)

- Status badges :
  - 🟢 Active : `bg-green-100 text-green-800 border-green-200`
  - 🟡 Expire bientôt : `bg-amber-100 text-amber-800 border-amber-200`
  - 🔴 Expirée : `bg-red-100 text-red-800 border-red-200`
  - ⭐ À la une : `bg-yellow-100 text-yellow-800 border-yellow-200` + icon star
  - 👑 Top Annonce : `bg-purple-100 text-purple-800 border-purple-200` + icon crown
  - ✅ Vendue : `bg-gray-100 text-gray-700 border-gray-200`
  - ✓ Verified Seller : `bg-blue-100 text-blue-800` + icon check-shield
- Tous via shadcn/ui `<Badge>` variants custom
- Icons : `lucide-react`

---

## 6. Specs UI détaillées

### 6.1 `<CreditBalanceChip />` (header)

```
┌─────────────────────────────┐
│ 💰 127,500 crédits   [+]   │  ← click [+] → /dashboard/credits
└─────────────────────────────┘
```
- Affiché en permanence dans le header (à côté de l'avatar user)
- Click → navigue vers `/dashboard/credits`
- Si granted_balance > 0 et expire dans <30j → tooltip "🎁 X crédits offerts expirent le DD/MM"

### 6.2 `<MyListingCard />`

```
┌─────────────────────────────────────────────────────┐
│ ┌─────┐  Toyota RAV4 2018                          │
│ │ img │  45,000,000 Ar                             │
│ │     │  📍 Antananarivo                           │
│ └─────┘                                             │
│                                                      │
│ 🟢 Active  ⭐ À la une jusqu'au 10/05/26            │
│ 🕐 Expire dans 23 jours                             │
│ ▓▓▓▓▓▓▓░░░ 70%                                      │
│                                                      │
│ 👁 234 vues  💬 12 contacts  ❤️ 18 favoris          │
│                                                      │
│ [🚀 Booster] [✏️ Modifier] [✅ Marquer vendue]       │
└─────────────────────────────────────────────────────┘
```

### 6.3 `<BoostModal />`

```
┌──────────────────────────────────────────────────┐
│ Booster votre annonce                       [×] │
├──────────────────────────────────────────────────┤
│ Toyota RAV4 2018 — 45,000,000 Ar               │
├──────────────────────────────────────────────────┤
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 🚀 Remontée               5,000 crédits   │  │
│ │ Repasse en tête de liste maintenant       │  │
│ │ Effet ~48-72h                              │  │
│ │                              [Choisir] →   │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ ⭐ À la une 7 jours       30,000 crédits  │  │
│ │ Badge + placement haut de catégorie       │  │
│ │ Visible pendant 7 jours                    │  │
│ │                              [Choisir] →   │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 👑 Top Annonce 30 jours  100,000 crédits  │  │
│ │ Slot premium tout en haut                  │  │
│ │ Maximum visibilité 30 jours                │  │
│ │                              [Choisir] →   │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 🎁 Pack Combo (À la une + Top)            │  │
│ │             120,000 crédits (économie 10k)│  │
│ │                              [Choisir] →   │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ Solde actuel : 127,500 crédits                  │
│ [Voir mon historique →]                         │
└──────────────────────────────────────────────────┘
```

### 6.4 `<CreditGuard />` wrapper

```tsx
// src/features/credits/components/CreditGuard.tsx
// Wrappe les routes nécessitant un minimum de crédits.

<Route path="/publier" element={
  <CreditGuard requiredCredits={25000} redirectTo="/dashboard/credits">
    <PublierPage />  {/* INTACT - jamais modifié */}
  </CreditGuard>
} />
```

Logique : check balance, si insuffisant → redirect avec banner explicatif. Si suffisant → render children.

### 6.5 `<CreditPackGrid />`

```
┌────────────┬────────────┬────────────┬────────────┐
│ Découverte │  Standard  │    Pro     │   Power    │
│            │ ⭐ POPULAIRE│            │ 💎 BEST    │
│ 10,000 Ar  │ 25,000 Ar  │ 50,000 Ar  │ 100,000 Ar │
│            │            │            │            │
│ 10,000     │ 27,500     │ 60,000     │ 130,000    │
│ crédits    │ crédits    │ crédits    │ crédits    │
│            │            │            │            │
│ Pas de     │ +10% bonus │ +20% bonus │ +30% bonus │
│ bonus      │ (2,500)    │ (10,000)   │ (30,000)   │
│            │            │            │            │
│ [Acheter]  │ [Acheter]  │ [Acheter]  │ [Acheter]  │
└────────────┴────────────┴────────────┴────────────┘
```

---

## 7. Anti-spam & Trust — Couches de défense

1. **Quality gates au INSERT** :
   - Prix `> 0` obligatoire
   - `photos.length >= 3`
   - `make`, `model`, `year` non-null
   - Trigger DB check ces conditions avant publication

2. **Rate limit annonces actives** :
   - Sans Verified Badge : max 3 listings simultanés en `status IN ('active','expiring_soon')`
   - Avec Verified Badge : illimité
   - Implémenté via trigger BEFORE INSERT qui count les listings actifs

3. **AI Photo Detection** :
   - Edge function appelée à upload pour scorer les photos (stock, watermark, copie web)
   - Score < seuil → flag listing pour review manuel (status `pending` au lieu de `active`)
   - Provider : à choisir (Cloudflare, Replicate, ou modèle Supabase Edge)

4. **Community reporting** :
   - Bouton "Signaler" sur chaque annonce
   - Insert dans `listing_reports`
   - 3+ reports same listing → auto-flag pour admin review

5. **Verified Badge** :
   - Statut visible (badge bleu sur listings + profil)
   - Vendeurs avec Badge ont meilleure ranking (boost natif gratuit dans algo de tri)
   - Boost de confiance acheteur → meilleure conversion

---

## 8. Notifications — cycle de vie

### Templates email à créer

| Kind | Subject | Trigger |
|---|---|---|
| `listing_expiring_7d` | Votre annonce expire dans 7 jours | Cron daily |
| `listing_expiring_3d` | Votre annonce expire dans 3 jours | Cron daily |
| `listing_expiring_1d` | Dernier jour pour votre annonce | Cron daily |
| `listing_expired` | Votre annonce a expiré — renouveler en 1 clic | Cron daily |
| `boost_ending_1d` | Votre boost se termine demain | Cron daily |
| `pack_purchase_confirmed` | Recharge de X crédits confirmée | Webhook VPI |
| `verif_approved` | Vous êtes Vendeur Vérifié AutoNex ! | Edge fn admin |
| `verif_rejected` | Demande de vérification : action requise | Edge fn admin |
| `milestone_50_views` | 🔥 Votre annonce dépasse 50 vues | Cron hourly |
| `credits_expiring_30d` | X crédits offerts expirent dans 30j | Cron daily |

### Implémentation

- Table `notification_queue` (déjà spec'ée section 2.10)
- Cron `enqueue_lifecycle_notifications()` détecte les conditions et insère dedupe
- Cron `process_notification_queue()` (hourly) consomme la queue → appelle Resend/SendGrid
- Templates HTML dans `supabase/functions/notifications/templates/`

---

## 9. PROMPTS POUR CLAUDE CODE

> Chaque prompt suit le pattern 5-phases. À coller un par un, dans l'ordre. Attendre validation Phase 4 avant de lancer le prompt suivant.

---

### PROMPT 1 — DB Foundation : tables, RLS, types, migrations

```
Contexte : on lance la monétisation AutoNex (crédits + boosts + verification + analytics).
Spec complète : voir docs/AUTONEX_MONETIZATION_PLAN.md sections 0-3.

Objectif de ce prompt : créer toute la fondation DB (tables, types, indexes, RLS, packs seed),
PAS de logique métier (functions/triggers viendront au PROMPT 2).

Phase 1 — DIAGNOSTIC LECTURE SEULE (autonex-graph-explorer)
Lance le subagent autonex-graph-explorer pour cartographier :
- Le schema actuel de la table public.listings (colonnes, types, contraintes, indexes existants)
- Les types ENUM publics existants (listing_status notamment — éviter les doublons)
- La fonction public.immonex_is_admin() (existe-t-elle ? signature ?)
- Toute table existante portant un nom proche : credits_*, boosts*, verifications*, badges*
- Les conventions de migration utilisées dans supabase/migrations/ (timestamp, naming)

Rapport attendu : tableau récap des conflits potentiels et naming à respecter.
STOP ici. J'attends ton diagnostic avant Phase 2.

Phase 2 — IMPLÉMENTATION (après mon GO explicite)
Crée une nouvelle migration `supabase/migrations/<timestamp>_credits_monetization_foundation.sql` qui :

1. Crée les ENUMs (avec garde DO $$ BEGIN ... EXCEPTION duplicate_object) :
   - credit_tx_type, purchase_status, listing_status (additif si existe), boost_type, boost_status,
     verification_type, verification_status, report_reason, report_status, notif_kind,
     notif_channel, notif_status

2. Crée les tables (CREATE TABLE IF NOT EXISTS) avec PK/FK/CHECK/indexes :
   - public.credits_balances
   - public.credits_transactions
   - public.credit_packs (avec seed data des 4 packs : discover/standard/pro/power — INSERT ON CONFLICT DO NOTHING)
   - public.credit_pack_purchases
   - public.listing_boosts (+ unique indexes featured/top_ad)
   - public.verifications
   - public.seller_badges
   - public.listing_views_daily
   - public.listing_reports
   - public.notification_queue

3. ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS pour les colonnes additives :
   status, listing_duration_days, published_at, expires_at, sold_at, renewal_count,
   credits_spent_total, view_count, contact_count, favorite_count, has_video, video_url

4. Active RLS sur toutes les nouvelles tables et applique les policies définies dans le plan
   (section 2). Les policies doivent permettre :
   - users SELECT own data
   - admins (via public.immonex_is_admin()) full access où pertinent
   - public read sur seller_badges actifs et listing_boosts actifs
   - public read sur credit_packs actifs

5. Crée le bucket Storage `verifications` (privé) si absent — via supabase/storage migration ou note 
   manuelle dans le rapport.

Régénère ensuite les types TypeScript :
- Run `supabase gen types typescript --project-id wtkedamrmtvdoippqanc --schema public > src/integrations/supabase/types.ts`
  (ou méthode équivalente déjà en place dans le projet)

Phase 3 — VALIDATION
- `npx tsc --noEmit` doit passer
- `npm run build` doit passer
- Si vitest existe avec tests qui touchent listings → run et confirm OK

Phase 4 — RAPPORT
- Diff résumé (fichiers créés/modifiés, lignes ajoutées)
- Bundle delta (devrait être ~0, juste types)
- Liste des migrations à exécuter manuellement sur prod (si pas de CI auto)
- Commit message proposé : `feat(credits): DB foundation for monetization (tables, RLS, packs seed)`

Phase 5 — STOP
NE COMMIT PAS. NE PUSH PAS. Je commit moi-même après revue.

Garde-fous :
- ❌ Ne touche pas src/pages/Publier.tsx, src/pages/publish/*, src/components/publish/*, src/lib/publishDraft.ts
- ❌ Ne change pas le hero baseline
- ❌ Ne lance aucune migration en prod sans mon OK
```

---

### PROMPT 2 — Credits Engine : fonctions, triggers, crons

```
Contexte : Phase 1 (DB foundation) shippée. Maintenant on ajoute la logique métier crédits.
Spec complète : voir docs/AUTONEX_MONETIZATION_PLAN.md section 4.

Objectif : créer toutes les fonctions Postgres + triggers + crons pour gérer crédits.

Phase 1 — DIAGNOSTIC (autonex-graph-explorer)
- Vérifie que la migration du PROMPT 1 a bien tourné (toutes les tables existent)
- Liste les triggers existants sur auth.users et public.listings (pour éviter conflits)
- Vérifie que pg_cron est disponible (`SELECT installed_version FROM pg_available_extensions WHERE name='pg_cron'`)
- Liste les fonctions existantes commençant par "spend_", "grant_", "handle_"

STOP. J'attends ton diagnostic.

Phase 2 — IMPLÉMENTATION (après GO)
Crée `supabase/migrations/<timestamp>_credits_engine.sql` :

1. Functions SECURITY DEFINER (cf section 4.1 / 4.2 du plan) :
   - public.spend_credits(p_user_id, p_amount, p_tx_type, p_related_entity, p_related_entity_id, p_metadata)
   - public.grant_credits(p_user_id, p_amount, p_tx_type, p_is_granted, p_granted_expires_at, p_related_entity, p_related_entity_id, p_metadata)
   - GRANT EXECUTE TO authenticated

2. Triggers :
   - public.handle_new_user_credits() + trigger AFTER INSERT ON auth.users
     → grant 100,000 crédits, is_granted=true, expire 90j
   - public.handle_listing_create_debit() + trigger BEFORE INSERT ON public.listings
     → débite selon listing_duration_days (25k/30j ou 40k/60j)
     → set published_at, expires_at
   - public.handle_listing_quality_gates() + trigger BEFORE INSERT ON public.listings
     → check price > 0, photos count >= 3, make/model/year non-null
     → si user n'a PAS de Verified Badge actif : check 3 listings actifs max simultanés
     → raise exception clair sur fail (pour UI feedback)

3. Fonction `enqueue_lifecycle_notifications()` (PLPGSQL) qui :
   - Détecte listings dont expires_at - now() est dans [6.5, 7.5] jours → enqueue listing_expiring_7d
   - Idem pour 3j et 1j
   - Détecte listings expirées non encore notifiées → listing_expired
   - Détecte boosts ends_at dans [22h, 26h] → boost_ending_1d
   - Détecte granted_expires_at dans [29.5, 30.5]j → credits_expiring_30d
   - Utilise dedupe_key pour éviter doublons

4. Crons pg_cron (cf section 4.5) :
   - autonex-expire-listings (daily 02:00 UTC)
   - autonex-expire-boosts (every 5 min)
   - autonex-expire-granted-credits (daily 02:30)
   - autonex-enqueue-notifications (daily 03:00)

Crée ensuite des helpers TypeScript dans `src/features/credits/lib/creditCosts.ts` :
- export const CREDIT_COSTS = { LISTING_30D: 25000, LISTING_60D: 40000, RENEWAL: 15000, ... } as const
- export type CreditCostKey = keyof typeof CREDIT_COSTS

Phase 3 — VALIDATION
- tsc + build OK
- Test rapide local Supabase : créer un user de test, vérifier que les 100k crédits sont bien grantés
  (instructions dans le rapport, pas exécution auto en prod)

Phase 4 — RAPPORT
- Diff résumé
- Liste des migrations à appliquer en prod (avec commande exacte `supabase db push` ou SQL manuel)
- Test plan manuel pour validation post-deploy
- Commit message : `feat(credits): engine — spend/grant fns, triggers, expiration crons`

Phase 5 — STOP

Garde-fous identiques au PROMPT 1.
```

---

### PROMPT 3 — Onboarding & CreditBalanceChip : signup flow + header chip

```
Contexte : engine crédits opérationnel. Maintenant on rend visible le solde + on intègre le 
parcours onboarding utilisateur (les 100k offerts au signup).

Phase 1 — DIAGNOSTIC (autonex-graph-explorer)
- Trouve le composant Header actuel (src/components/Header.tsx) et liste ses sections
- Identifie comment l'avatar utilisateur / menu user est rendu
- Vérifie le flow signup actuel (Supabase Auth UI ou custom ? OAuth Google activé ?)
- Liste les hooks d'auth déjà en place (useAuth ? useUser ? useSession ?)

STOP.

Phase 2 — IMPLÉMENTATION (après GO)

A) Hook `src/features/credits/hooks/useCreditBalance.ts`
   - React Query, queryKey ['credit-balance', userId]
   - SELECT * FROM credits_balances WHERE user_id = auth.uid()
   - staleTime 30s, refetchOnWindowFocus true
   - Retourne { balance, granted_balance, granted_expires_at, total: balance + granted, isLoading }
   - Subscribe en realtime aux changements (Supabase realtime channel sur la row)

B) Composant `src/features/credits/components/CreditBalanceChip.tsx`
   - Affiche "💰 X crédits"
   - Si total === 0 → "Recharger" (CTA)
   - Si granted_expires_at < now() + 30d → tooltip warning
   - Click → navigate to /dashboard/credits

C) Intégrer `<CreditBalanceChip />` dans le Header existant, à gauche de l'avatar.
   Ne pas casser le mobile responsive — sur écrans <sm, n'afficher que l'icône + nombre court (ex: "💰 127k").

D) Composant `src/features/credits/components/CreditWelcomeBanner.tsx`
   - Affiché sur /dashboard pendant les 7 premiers jours après signup ou tant que granted_balance > 80,000 (n'a pas commencé à utiliser)
   - "🎁 Bienvenue ! Tu as reçu 100,000 crédits offerts (= 4 annonces gratuites). Expire dans X jours."
   - CTA "Publier ma première annonce" → /publier

E) i18n : ajouter clés credits.balance.*, credits.welcome.* (fr/en/mg, conformément à la convention du projet)

Phase 3 — VALIDATION
- tsc + vitest + build
- Test manuel : login user existant → chip s'affiche avec son solde réel

Phase 4 — RAPPORT
- Bundle delta attendu : ~3-5 KB gzip max (juste UI)
- Commit message : `feat(credits): header balance chip + welcome banner + onboarding hook`

Phase 5 — STOP

Garde-fous identiques.
```

---

### PROMPT 4 — Mes Annonces Dashboard : page complète + cycle de vie UI

```
Contexte : crédits visibles. Maintenant le user doit pouvoir gérer ses annonces (status, 
expiration, perf, actions rapides).

Phase 1 — DIAGNOSTIC (autonex-graph-explorer)
- Page /dashboard existante : structure, layout, composants enfants
- Hook actuel pour récupérer les listings d'un user (s'il existe)
- Routes Dashboard existantes (sous-pages, layouts imbriqués)
- Composants ListingCard existants côté public — voir s'il y a quelque chose à réutiliser pour MyListingCard

STOP.

Phase 2 — IMPLÉMENTATION

A) Route `/dashboard/listings` → composant `MyListingsPage.tsx`
   - Tabs : Toutes / Actives / Expire bientôt / Expirées / Vendues / Brouillons
   - Filtres : par marque, par statut boost, par date de publication
   - Recherche locale par titre

B) Hook `src/features/listings-mgmt/hooks/useMyListings.ts`
   - React Query, queryKey ['my-listings', userId, filters]
   - SELECT listings + LEFT JOIN listing_boosts (active) WHERE user_id = auth.uid()
   - Groupe par status

C) Composant `MyListingCard.tsx` (cf section 6.2 du plan)
   - Photo cover + titre + prix + ville
   - Badge statut (vert/orange/rouge selon J-X)
   - Badges boosts actifs (⭐ À la une / 👑 Top)
   - Compteur "Expire dans X jours" + barre de progression
   - 3 chiffres perf : 👁 vues / 💬 contacts / ❤️ favoris
   - 3 boutons actions : Booster / Modifier / Marquer vendue

D) Sous-composants :
   - `<ListingStatusBadge status={...} />`
   - `<ListingExpiryProgress publishedAt expiresAt />`
   - `<ListingPerfMetrics views contacts favorites />`
   - `<RenewListingModal listingId />` — call edge fn listing-renew, debit 15k, refresh
   - `<MarkAsSoldModal listingId />` — update listings status='sold', sold_at=now()

E) Gestion des actions :
   - "Modifier" → redirect vers /publier?edit=<listingId> (route existante, on ne touche pas)
   - "Booster" → ouvre BoostModal (PROMPT 6, mais squelette du modal vide ici si nécessaire)
   - "Marquer vendue" → confirmation puis update DB

F) Notifications J-7/J-3/J-1 : afficher banner orange en haut de chaque card concernée

G) Mobile responsive : grid-cols-1 sur sm, grid-cols-2 sur lg, conserver lisibilité des badges.

Phase 3 — VALIDATION
- tsc + vitest + build
- Test e2e léger (Playwright) sur le filtrage et le tri si infra présente

Phase 4 — RAPPORT
- Bundle delta attendu : 8-15 KB gzip
- Commit message : `feat(listings): My Listings dashboard with lifecycle UI`

Phase 5 — STOP

Garde-fous : surtout NE TOUCHE PAS Publier.tsx ni publish/* ni publishDraft.ts.
La page /publier reste celle existante. La modification d'annonce passe par cette page existante.
```

---

### PROMPT 5 — Credit Packs Purchase + VPI Integration

```
Contexte : user voit son solde et veut le recharger. On branche les 4 packs sur le flow de paiement
VPI déjà fonctionnel (cf historique commits VPI).

Phase 1 — DIAGNOSTIC (autonex-graph-explorer)
- Localise le helper `invokeEdgeFunctionGet.ts` et son usage actuel pour VPI
- Liste les Edge Functions VPI existantes (init, callback, etc.)
- Vérifie comment le webhook VPI est sécurisé (signature ?)
- Identifie où sont stockées les variables d'env VPI (.env.local + Supabase secrets)

STOP.

Phase 2 — IMPLÉMENTATION

A) Edge Function `supabase/functions/credit-pack-purchase-init/index.ts`
   - Auth user JWT
   - Input : { pack_id }
   - Lookup pack actif → if not found 404
   - Insert credit_pack_purchases (status pending, snapshotter price + credits_to_grant)
   - Init paiement VPI (réutilise pattern existant) avec metadata { purchase_id }
   - Return { purchase_id, payment_url }

B) Edge Function `supabase/functions/credit-pack-purchase-confirm/index.ts`
   - Webhook VPI (signed)
   - Vérifie signature
   - Lookup purchase via payment_provider_id
   - If status !== pending → idempotent (return 200 silently)
   - Update purchase status='paid', paid_at=now()
   - Call public.grant_credits(amount=credits_to_grant, tx_type='purchase', is_granted=false, related_entity='pack_purchase', related_entity_id=purchase.id)
   - Insert notification_queue (pack_purchase_confirmed)

C) Page `/dashboard/credits` → `CreditsPage.tsx`
   - Section 1 : "Mon solde" → balance + granted (avec date d'expiration si applicable)
   - Section 2 : "Recharger" → `<CreditPackGrid />` (4 cards, cf section 6.5)
   - Section 3 : "Historique" → `<TransactionHistoryTable />` paginé

D) Composants :
   - `<CreditPackCard />` : prix Ar, total crédits, bonus pct, CTA "Acheter"
   - `<CreditPurchaseModal />` : confirmation + récap + bouton Payer
   - `<TransactionHistoryTable />` : date, type (icon + label fr), montant, balance après, lien entité (si listing → vers /dashboard/listings)

E) Hook `usePurchasePack`
   - mutation : POST /functions/v1/credit-pack-purchase-init
   - Sur succès : window.location.href = payment_url
   - Sur erreur : toast d'erreur

F) Page de retour post-paiement `/dashboard/credits/success?purchase_id=...`
   - Polling sur `credit_pack_purchases.status` jusqu'à 'paid' (max 30s)
   - Affiche "✅ Recharge confirmée — 27,500 crédits ajoutés"
   - Sinon "⏳ En cours de traitement, on te notifie par email"

Phase 3 — VALIDATION
- tsc + vitest + build
- Test E2E : init purchase, mock webhook, vérifier credits grantés

Phase 4 — RAPPORT
- Liste des secrets à configurer en prod (si nouveaux)
- Bundle delta : 10-15 KB gzip
- Commit message : `feat(credits): pack purchase flow + VPI integration + history`

Phase 5 — STOP
```

---

### PROMPT 6 — Boost Flow : modal, edge function, search ranking

```
Contexte : crédits + listings visibles. Maintenant on permet de booster.

Phase 1 — DIAGNOSTIC (autonex-graph-explorer)
- Composants existants pour le tri/sort des listings côté public (search results)
- Algorithme de ranking actuel (ORDER BY published_at DESC ?)
- Localise SearchResultsGrid et le hook qui l'alimente

STOP.

Phase 2 — IMPLÉMENTATION

A) Edge Function `supabase/functions/boost-purchase/index.ts`
   - Auth user JWT, owner check
   - Input : { listing_id, boost_type, with_pack_combo? }
   - Lookup listing : doit être status IN ('active', 'expiring_soon')
   - Calcul coût :
     - bump → 5000
     - featured → 30000
     - top_ad → 100000
     - pack_combo → 120000 (= featured 30k + top_ad 100k - 10k discount, débité en une seule transaction)
   - Vérifie unicité (pas de featured/top_ad déjà actif sur le listing)
   - Call spend_credits()
   - Si bump :
     - UPDATE listings SET published_at = now() WHERE id = listing_id
     - INSERT listing_boosts (boost_type='bump', status='expired', ends_at = now() + interval '72 hours', credits_spent=5000)
       (status expired direct car bump n'est pas un boost actif persistent — c'est un timestamp reset, log analytics seulement)
   - Si featured :
     - INSERT listing_boosts (boost_type='featured', status='active', starts_at=now(), ends_at=now()+7d, duration_days=7, credits_spent=30000)
   - Si top_ad :
     - idem avec ends_at = now() + 30d, duration_days=30, credits_spent=100000
   - Si pack_combo :
     - 2 INSERT (featured + top_ad), même transaction_id
     - credits_spent dans chaque row = 60000 + 60000 (réparti) ou 30000 + 90000 (à choisir)
   - Return updated listing + active boosts

B) Composant `<BoostModal />` (cf section 6.3 plan)
   - 4 cards (3 boosts + 1 pack combo)
   - Chaque card désactivée si conflit (ex: featured déjà actif → "Déjà À la une jusqu'au DD/MM")
   - Footer : solde actuel + lien historique
   - Sur sélection : confirmation → call edge fn → toast succès → fermer modal → invalidate React Query

C) Hook `usePurchaseBoost`

D) Composant `<BoostActiveBadge />` :
   - Reçoit boost_type et ends_at → affiche "⭐ À la une jusqu'au DD/MM" / "👑 Top jusqu'au DD/MM"

E) Mise à jour ranking SQL (search results) :
   - Crée une vue ou function `public.listings_with_ranking` qui calcule un score :
     - top_ad actif → +1000
     - featured actif → +100
     - bump récent (<72h) → +10 (déjà couvert par published_at)
     - tri ORDER BY rank_score DESC, published_at DESC
   - Mettre à jour le hook côté front qui alimente SearchResultsGrid pour utiliser cette source

F) Composant `<BoostROIChart />` (optionnel ce prompt, peut être différé) :
   - Petit graphe courbe vues avant/après boost
   - Affiché dans la card MyListingCard quand un boost actif

Phase 3 — VALIDATION
- tsc + vitest + build
- Test : créer listing test, acheter chaque type de boost, vérifier UI + DB

Phase 4 — RAPPORT
- Commit message : `feat(boosts): purchase flow + 3 boost types + pack combo + search ranking`

Phase 5 — STOP

Garde-fou : ne casse pas le tri actuel pour les utilisateurs sans boost. Le ranking par défaut 
(par published_at DESC) doit rester pour les listings sans boost actif.
```

---

### PROMPT 7 — Verified Seller Badge : submission + admin review

```
Contexte : trust = différenciateur clé vs FB Marketplace. Le badge Verified est le marqueur
visuel. On crée le flow de soumission user et la review admin.

Phase 1 — DIAGNOSTIC (autonex-graph-explorer)
- AdminRoute / AdminLayout existants (depuis dashboard YAS analytics)
- Flow d'upload Storage existant (vers quel bucket ? quelles RLS ?)
- Composant existant `VerifiedBadge` ? (sinon à créer)

STOP.

Phase 2 — IMPLÉMENTATION

A) Storage bucket `verifications` (privé)
   - RLS : user can INSERT into own folder (path commence par auth.uid())
   - admins SELECT all
   - Nettoyage manuel sur reject possible plus tard

B) Edge Function `verification-submit`
   - Auth user JWT
   - Multipart input : cin_front, cin_back, selfie, carte_grise (optionnel) + JSON { full_name, cin_number, date_of_birth }
   - Upload chaque fichier vers verifications/<user_id>/<timestamp>_<role>.jpg
   - Check si user a déjà une verification 'pending' ou 'approved' active → reject
   - Call spend_credits(75000, 'spend_verified')
   - Insert verifications (status='pending')
   - Insert notification_queue côté admin (in_app)
   - Return { verification_id }

C) Page `/dashboard/verification` → `VerificationPage.tsx`
   - Si user a un Verified Badge actif → afficher "Vous êtes Vendeur Vérifié" + expires_at + CTA "Renouveler"
   - Si verification pending → "En cours de revue, sous 48h"
   - Si rejected → reason + CTA "Soumettre à nouveau"
   - Sinon → form multi-step :
     1. Infos identité (full_name, cin_number, date_of_birth)
     2. Upload CIN front (preview + retake)
     3. Upload CIN back
     4. Upload selfie tenant CIN (consigne claire)
     5. Upload carte grise (optionnel)
     6. Récap + checkbox "Je confirme l'exactitude" + CTA "Soumettre (75,000 crédits)"

D) Edge Function `admin-verification-review`
   - Auth admin only (immonex_is_admin())
   - Input : { verification_id, action: 'approve'|'reject', reason? }
   - Si approve :
     - Update verifications status='approved', reviewed_at, reviewed_by, expires_at = now() + 12 months
     - Insert seller_badges (badge_type='verified_seller', expires_at = verifications.expires_at)
     - Enqueue notif verif_approved
   - Si reject :
     - Update verifications status='rejected', rejection_reason, reviewed_at, reviewed_by
     - grant_credits(75000, 'refund', is_granted=false) → remboursement intégral
     - Enqueue notif verif_rejected

E) Page `/admin/verifications` → `AdminVerificationsPage.tsx`
   - Table : pending d'abord, puis reviewing
   - Click row → drawer/modal avec photos haute def + infos + boutons Approve / Reject (avec reason)
   - Reuse `<AdminLayout />` existant

F) Composant `<VerifiedBadge />` (réutilisable partout)
   - Variant inline : ✓ icon bleu + "Vérifié"
   - Variant card : icon + "Vendeur Vérifié AutoNex"
   - Tooltip : "Identité vérifiée par AutoNex (CIN + carte grise)"

G) Intégrer `<VerifiedBadge />` :
   - Dans MyListingCard et ListingDetail (si user du listing a un seller_badge actif)
   - Sur la page profil vendeur public

Phase 3 — VALIDATION
- tsc + vitest + build

Phase 4 — RAPPORT
- Bundle delta : 12-18 KB gzip
- Commit message : `feat(verification): Verified Seller Badge submission + admin review`

Phase 5 — STOP
```

---

### PROMPT 8 — Anti-spam, rate limits, AI photo detection scaffolding

```
Contexte : on protège la qualité de la marketplace. Ali's argument fort vs FB Marketplace.

Phase 1 — DIAGNOSTIC
- Vérifier que le quality gates trigger (PROMPT 2) est bien en place
- Lister composants ListingCard / SearchResultsGrid pour ajouter le bouton Signaler
- Identifier providers AI image detection accessibles (Cloudflare AI, Replicate, OpenAI Vision, ou modèle local)

STOP.

Phase 2 — IMPLÉMENTATION

A) Composant `<ReportListingButton />` :
   - Bouton "Signaler" en bas de chaque ListingCard public
   - Modal avec liste raisons (report_reason enum) + champ libre
   - Insert listing_reports (status='open')
   - Si user anonyme → reporter_id = NULL
   - Toast "Merci pour le signalement"

B) Auto-flag listings avec 3+ open reports :
   - Function `flag_overreported_listings()` (PLPGSQL)
   - Cron toutes les heures :
     UPDATE listings SET status='archived' WHERE id IN (
       SELECT listing_id FROM listing_reports
       WHERE status='open' GROUP BY listing_id HAVING count(*) >= 3
     ) AND status IN ('active','expiring_soon')
   - Notify admin

C) Page `/admin/reports` → `AdminReportsPage.tsx`
   - Liste reports open / reviewing
   - Click row → context (listing photos, prix, vendeur, autres reports same listing)
   - Boutons : Resolve (listing OK, dismiss reports) / Take Down (archive listing) / Refund (refund credits si fraud)

D) Edge Function `photo-quality-check` (scaffolding seulement, peut être stub initial)
   - Input : { listing_id, photo_urls[] }
   - Pour chaque photo, appel provider AI (à choisir : Cloudflare Workers AI gratuit pour démarrer)
   - Score : "stock_photo_likelihood" + "watermark_detected"
   - Si score > seuil → update listings.metadata + notification admin pour review
   - Pas de blocage automatique de la publication (review humain en V1)

E) Mise à jour subtle : ajouter un check côté UI avant submit dans le flow Publier… 
   ⚠️ ATTENTION — ne PAS modifier Publier.tsx. À la place :
   - Le check qualité côté DB (trigger handle_listing_quality_gates) gère déjà prix/photos/marque
   - Pour le rate limit 3 listings, le trigger raise exception → publishDraft.ts (intact) recevra l'erreur, l'UI existante l'affichera (toast d'erreur générique)
   - Améliorer l'UX du message d'erreur : ajouter une fonction utilitaire `parseListingError(err)` 
     qui détecte les codes d'erreur custom (insufficient_credits, rate_limit_exceeded, missing_quality) et retourne un message FR clair
   - Brancher ce parser DANS l'UI existante côté publishDraft où l'erreur est affichée — uniquement le composant qui display l'erreur, pas Publier.tsx ni publishDraft.ts directement

F) Tests unitaires : règles d'évaluation des reports + parser d'erreurs

Phase 3 — VALIDATION
- tsc + vitest + build

Phase 4 — RAPPORT
- Liste TODO V2 (AI photo full integration, ML moderation)
- Commit message : `feat(trust): listing reports + auto-flag + AI photo scaffolding`

Phase 5 — STOP

Garde-fous :
- Ne touche PAS Publier.tsx, publish/*, publishDraft.ts directement
- Le parser d'erreur est ajouté DANS un composant d'affichage d'erreur, pas dans la logique de publish
```

---

## 10. Validation post-implémentation

### Tests d'intégration manuels (à faire après chaque PROMPT en prod)

1. **PROMPT 1** : 
   - `\d public.credits_balances` confirme la table
   - SELECT de credit_packs retourne les 4 packs

2. **PROMPT 2** :
   - Créer un nouveau user test → vérifier balance row à 100,000 granted, expires 90j
   - Insert un listing avec status='active' et user qui a 0 crédit → fail correct

3. **PROMPT 3** :
   - Login → chip visible avec bon solde

4. **PROMPT 4** :
   - /dashboard/listings affiche les annonces existantes
   - Tabs filtrent correctement
   - Action "Marquer vendue" change le status

5. **PROMPT 5** :
   - Acheter Pack Découverte → redirect VPI → callback → +10,000 crédits
   - Voir transaction dans historique

6. **PROMPT 6** :
   - Booster une annonce → solde décrémenté + boost actif visible
   - Tri search met bien le boosted en haut

7. **PROMPT 7** :
   - Soumettre verification → upload OK + status pending + 75k débités
   - Approve via admin → badge actif + email notif

8. **PROMPT 8** :
   - Signaler 3 fois une annonce test → auto-archived
   - Tenter de publier sans crédits → erreur claire en français

### KPIs à monitorer après lancement

- Taux de conversion signup → première annonce publiée (cible >40%)
- Taux d'achat de pack après épuisement granted (cible >25%)
- Taux d'achat de boost par listing actif (cible >15%)
- Taux d'approval Verified Badge (cible >70%)
- Délai moyen review verification (cible <48h)
- Volume reports / 1000 listings (signal de qualité)

---

## 11. Backlog post-MVP

À ne PAS faire dans ces 8 prompts :
- Subscription mensuelle dealer (PROMPT 9 futur)
- Bulk import CSV pour dealers
- Push notifications mobile (Phase 2)
- Système de référral / parrainage (PROMPT 10 futur)
- Code promo / réduction
- Multi-currency (USD pour expat)
- Page dealer brandée (logo, couleurs, slogan)
- Auto-boost sur baisse de prix (Price Drop Alerts)
- Analytics ROI charts détaillées par boost (différé volontairement, scaffolding suffit)

---

## 12. Rappels critiques avant de lancer

✅ Tester chaque prompt sur branche dédiée (ex: `feat/credits-prompt-1`)
✅ Backup DB prod avant migration
✅ Variables d'env à configurer en prod : aucune nouvelle pour PROMPTS 1-4. PROMPT 5 réutilise les VPI existantes. PROMPT 8 ajoutera potentiellement une clé AI (Cloudflare Workers AI gratuit recommandé pour MVP).
✅ Migration SQL `yas_tracking_events` : déjà loggué comme dette schema sync. À régulariser dans Git lors d'une migration future.
✅ Quota Supabase : sujet sensible, ne pas lancer si pas serein.
✅ Hero baseline `"Le portail auto N°1 de Madagascar"` : INTOUCHABLE.

---

**Fin du plan.** 8 prompts à exécuter dans l'ordre, validation Phase 4 entre chaque.
