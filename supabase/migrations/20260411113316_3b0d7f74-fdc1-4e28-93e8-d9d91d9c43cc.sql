
-- Enums
CREATE TYPE public.user_role AS ENUM ('particulier', 'agence', 'promoteur', 'admin');
CREATE TYPE public.listing_type AS ENUM ('appartement', 'villa', 'maison', 'terrain', 'local_commercial', 'bureau');
CREATE TYPE public.transaction_type AS ENUM ('vente', 'location', 'location_vacances');
CREATE TYPE public.listing_status AS ENUM ('draft', 'active', 'paused', 'expired');
CREATE TYPE public.boost_type AS ENUM ('top', 'featured', 'newsletter');
CREATE TYPE public.lead_type AS ENUM ('contact_form', 'phone_reveal', 'whatsapp');
CREATE TYPE public.payment_method AS ENUM ('mvola', 'orange_money', 'airtel_money', 'stripe');
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed');

-- Agencies (no FK to profiles, so create first)
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  bio TEXT,
  phone TEXT,
  email TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agencies are publicly readable" ON public.agencies FOR SELECT USING (true);

-- Profiles (references agencies)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'particulier',
  full_name TEXT,
  phone TEXT,
  agency_id UUID REFERENCES public.agencies(id),
  credits_balance INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Now add agencies update policy (profiles exists now)
CREATE POLICY "Agencies can update own" ON public.agencies FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.agency_id = agencies.id AND profiles.id = auth.uid())
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'particulier'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Listings
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type public.listing_type NOT NULL DEFAULT 'appartement',
  transaction public.transaction_type NOT NULL DEFAULT 'vente',
  price_mga BIGINT NOT NULL DEFAULT 0,
  price_eur NUMERIC(12,2),
  surface INT,
  rooms INT,
  bathrooms INT,
  ville TEXT,
  arrondissement TEXT,
  quartier TEXT,
  quartier_libre TEXT,
  region TEXT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  features JSONB DEFAULT '[]'::jsonb,
  status public.listing_status DEFAULT 'draft',
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  search_vector TSVECTOR
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_listings_location ON public.listings(ville, arrondissement, quartier);
CREATE INDEX idx_listings_status_date ON public.listings(status, created_at DESC);
CREATE INDEX idx_listings_search ON public.listings USING GIN(search_vector);
CREATE INDEX idx_listings_features ON public.listings USING GIN(features);

CREATE POLICY "Active listings are public" ON public.listings FOR SELECT USING (status = 'active' OR owner_id = auth.uid());
CREATE POLICY "Users can insert own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = owner_id);

-- Search vector trigger
CREATE OR REPLACE FUNCTION public.update_listing_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.ville, '') || ' ' ||
    COALESCE(NEW.quartier, '') || ' ' ||
    COALESCE(NEW.quartier_libre, '') || ' ' ||
    COALESCE(NEW.region, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_listing_search
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_search_vector();

-- Listing photos
CREATE TABLE public.listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0
);
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photos are public" ON public.listing_photos FOR SELECT USING (true);
CREATE POLICY "Owner can insert photos" ON public.listing_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())
);
CREATE POLICY "Owner can update photos" ON public.listing_photos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())
);
CREATE POLICY "Owner can delete photos" ON public.listing_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())
);

-- Boosts
CREATE TABLE public.boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  type public.boost_type NOT NULL,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ
);
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Boosts are public" ON public.boosts FOR SELECT USING (true);
CREATE POLICY "Owner can manage boosts" ON public.boosts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())
);

-- Credits ledger
CREATE TABLE public.credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own credits" ON public.credits_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credits" ON public.credits_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  visitor_name TEXT,
  visitor_phone TEXT,
  visitor_email TEXT,
  message TEXT,
  type public.lead_type DEFAULT 'contact_form',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listing owner can see leads" ON public.leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())
);
CREATE POLICY "Anyone can create leads" ON public.leads FOR INSERT WITH CHECK (true);

-- Packs
CREATE TABLE public.packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_mga BIGINT DEFAULT 0,
  listings_quota INT DEFAULT 1,
  duration_days INT DEFAULT 30,
  features JSONB DEFAULT '[]'::jsonb
);
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Packs are public" ON public.packs FOR SELECT USING (true);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_mga BIGINT NOT NULL,
  method public.payment_method,
  status public.payment_status DEFAULT 'pending',
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Blog posts
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_url TEXT,
  category TEXT,
  author_id UUID REFERENCES public.profiles(id),
  published_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog posts are public" ON public.blog_posts FOR SELECT USING (true);

-- Favorites
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for listing photos
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-photos', 'listing-photos', true);

CREATE POLICY "Listing photos are public" ON storage.objects FOR SELECT USING (bucket_id = 'listing-photos');
CREATE POLICY "Auth users can upload listing photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listing-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own listing photos" ON storage.objects FOR UPDATE USING (bucket_id = 'listing-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own listing photos" ON storage.objects FOR DELETE USING (bucket_id = 'listing-photos' AND auth.role() = 'authenticated');

-- Increment views function
CREATE OR REPLACE FUNCTION public.increment_views(listing_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings SET views_count = views_count + 1 WHERE id = listing_uuid AND status = 'active';
END;
$$;
