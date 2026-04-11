
# ImmoNex Madagascar — Implementation Plan

## Brand & Design
- Upload and use the provided logo (h-12, dark background header)
- Color system: orange→violet gradient, violet primary, orange accent, dark/light backgrounds
- Typography: Playfair Display (headings) + Inter (body)
- Rounded-2xl cards, soft shadows, mobile-first, premium feel

## Core Data & Config
- `src/data/madagascar-regions.ts` — all 22 regions with main cities
- `src/config/currency.ts` — MGA/EUR conversion (1 EUR = 5050 MGA)
- i18n setup with FR (default) and EN translations

## Database (Supabase)
- Tables: profiles, agencies, listings, listing_photos, boosts, credits_ledger, leads, packs, transactions, blog_posts, favorites
- RLS: public read for active listings/blog, owner-only for dashboard data/leads
- Seed: 30 listings across regions, 3 agencies, 4 blog posts, test users

## Pages

### 1. Homepage (/)
- Dark header with logo, nav (Acheter/Louer/Projets neufs/Agences/Conseils), FR/EN toggle, gradient "Publier" CTA, login
- Hero with gradient bg, Playfair headline, search bar (type/région/budget with MGA/EUR toggle)
- Sections: featured listings carousel, projets neufs, régions photo grid (12 tiles), partner agencies, blog cards, dark footer

### 2. Search Results (/recherche)
- Left sidebar filters: type, transaction, rooms, surface, price, region dropdown, proximity tags
- Results grid (3-col desktop, 1-col mobile) with sort dropdown
- Listing cards: photo carousel, badges (Boost/Coup de cœur/Nouveau), dual-currency price, specs, favorite heart
- Leaflet/OpenStreetMap toggle with pins
- Pagination

### 3. Listing Detail (/annonce/[id])
- Photo gallery with lightbox, breadcrumbs, price, key specs row
- Description, features checklist, embedded Leaflet map
- Agency sidebar card with "Voir le numéro" (phone reveal tracking)
- Contact form, similar listings carousel

### 4. Publish Flow (/publier) — 6-step wizard
- Step 1: Pack selection (Découverte/Pro/Agence/Promoteur)
- Step 2: Property details form (React Hook Form + Zod)
- Step 3: Photo upload (Supabase Storage)
- Step 4: Location with map picker
- Step 5: Upsells (Boost/Coup de cœur/Newsletter)
- Step 6: Payment method selection (mock) + confirmation

### 5. Agency Profile (/agence/[slug])
- Agency bio, logo, all listings grid, contact form

### 6. Dashboard (/dashboard) — protected
- 4 stat cards (views, contacts, phone reveals, active listings)
- Listings table with edit/pause/boost/delete
- Credits balance + buy credits button
- Lead inbox

### 7. Auth (/login, /signup, /forgot-password)
- Supabase Auth (email+password)
- Signup with role: particulier/agence/promoteur

### 8. Blog (/conseils)
- Article list with category filters
- Article detail page
- Categories: Acheter, Louer, Construire, Investir, Fiscalité

## Technical Details
- React Router for all routes
- react-helmet-async for SEO meta tags
- react-i18next for FR/EN
- Leaflet + react-leaflet for maps
- Postgres full-text search with boost ranking
- Unsplash URLs for seed listing photos
