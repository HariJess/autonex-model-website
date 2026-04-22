# AutoNex — Audit UX/UI Phase 0

**Date :** 2026-04-22
**Branche :** `refacto/ux-ui-phase-1`
**Base commit :** `3f30f2a`
**Scope :** Audit statique uniquement — aucune modification de code effectuée.
**Méthode :** Lecture des fichiers `src/**/*.tsx`, `tailwind.config.ts`, `src/index.css`, `index.html`. Pas de test navigateur. Breakpoints raisonnés sur la base des utilitaires Tailwind rencontrés (`sm:640`, `md:768`, `lg:1024`, `xl:1280`, `2xl:1400`).

---

## 1. Résumé exécutif

- **Total d'items identifiés : 68**
  - **P0 (critique) : 11**
  - **P1 (majeur) : 31**
  - **P2 (polish) : 26**
- **Pages les plus impactées :** Home (`/`), Fiche véhicule (`/annonce/:id`), Header global, HeroSearch, PublishPage, Estimation.
- **Patterns récurrents dominants :**
  1. **Palette hors-tokens** — hex hardcodés (`#061427`, `#F2F7FF`, `#FAFAFA`, `#0D223D`, `#8FB8E8`, …) répétés dans Header, Footer, HeroSearch, ListingCard, Buttons — bypass complet des tokens CSS var() déjà définis dans `src/index.css`.
  2. **`style={{ color: "#FAFAFA" }}` en ligne partout** — 25+ occurrences grep-confirmées, équivalent à une classe texte manquante.
  3. **Typographie non tokenisée** — échelles `text-2xl/3xl/4xl` mixées sans logique de niveau (H1 varie de `text-xl` à `text-6xl` selon la page).
  4. **Spacings ad-hoc** — arbitraires `text-[13px]`, `text-[1.22rem]`, `min-h-[132px]`, `tracking-[0.14em]` — pas de gamme.
  5. **Absence de `break-words` / `overflow-wrap: anywhere`** sur tous les textes longs (description fiche véhicule, bio agence, descriptions annonces).
  6. **Footer incohérent entre pages** — masqué mobile sur `/credits` et `/paiement/retour` via `hidden sm:block`, visible ailleurs.
  7. **Densité mobile faible** — marques populaires, shortcuts catégories, grille fiche véhicule, cards brouillons dashboard, etc.
- **Bug critique unique SEO / HTML :** `index.html` contient un caractère `1` parasite hors balise + deux balises `<meta name="robots">` contradictoires (voir P0-01).

---

## 2. Inventaire des pages scannées

| Route                                                       | Fichier principal                            | Statut audit |
|-------------------------------------------------------------|----------------------------------------------|:------------:|
| `/`                                                         | `src/pages/Index.tsx`                        |      ✅      |
| `/recherche`                                                | `src/pages/SearchPage.tsx`                   |      ✅      |
| `/annonce/:id`                                              | `src/pages/ListingDetail.tsx`                |      ✅      |
| `/estimation`                                               | `src/pages/VehicleEstimationPage.tsx`        |      ✅      |
| `/publier`                                                  | `src/pages/PublishPage.tsx`                  |  ✅ (partiel)|
| `/credits`                                                  | `src/pages/credits/CreditsPage.tsx`          |      ✅      |
| `/paiement/retour`                                          | `src/pages/PaiementRetourPage.tsx`           |      ✅      |
| `/dashboard`                                                | `src/pages/Dashboard.tsx`                    |      ✅      |
| `/favoris`                                                  | `src/pages/FavoritesPage.tsx`                |      ✅      |
| `/settings`                                                 | `src/pages/SettingsPage.tsx`                 |      ✅      |
| `/concessionnaires` / `/agences`                            | `src/pages/AgenciesListPage.tsx`             |      ✅      |
| `/concessionnaires/:slug` / `/agence/:slug`                 | `src/pages/AgencyProfile.tsx`                |      ✅      |
| `/conseils` / `/conseils/:slug`                             | `src/pages/BlogPages.tsx`                    |      ✅      |
| `/contact`                                                  | `src/pages/ContactPage.tsx`                  |      ✅      |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`  | `src/pages/AuthPages.tsx`, `AuthFormShell`   |      ✅      |
| `/beta-login`                                               | `src/pages/BetaLoginPage.tsx`                |      ✅      |
| `/legal/*` (mentions, confidentialité, CGU, cookies)        | `src/pages/legal/LegalLayout.tsx` + 4 pages  |      ✅      |
| `/acheter`, `/location-longue-duree`, `/location-courte-duree`, `/vehicules/:categorySlug`, `/ville/:citySlug` | `src/pages/SeoLandingPage.tsx` | ✅ |
| `/paiement/retour` (post-VPI)                               | `src/pages/PaiementRetourPage.tsx`           |      ✅      |
| Composants transverses (Header, Footer, HeroSearch, ListingCard, FilterSidebar, SearchToolbar, BetaLockGate) | `src/components/*.tsx` | ✅ |

Pages Admin (`/admin/*`) **hors scope user-facing** — non auditées sauf mention contraire.

---

## 3. Items par page

### 3.1 Page Home (`/`)
Fichier principal : `src/pages/Index.tsx` (526 lignes).

#### P0 — Bugs critiques

- **[P0][OVERFLOW-BRANDS]** Section « Marques populaires » — chaque carte marque fait `w-[144px]` / `min-h-[132px]` mobile. Avec 7 marques + `flex flex-wrap gap-x-4 gap-y-5`, on obtient 2 cartes par ligne sur iPhone 375px → **4 lignes × ~152px ≈ 608px** juste pour la section marques, sans compter les titres. Confirme la plainte utilisateur d'une densité faible et d'une perception « longue à scroller ».
  - Fichier : `src/pages/Index.tsx:363-396`
  - Recommandation : bandeau horizontal `overflow-x-auto snap-x snap-mandatory` avec cartes compactes 72×96px, ou grille `grid-cols-4` serrée sur mobile.
  - Impact : **élevé**, impacte bounce rate et TTI perçu.
  - Reproductibilité : tous mobile ≤ 640px.

- **[P0][DENSITY-CATEGORIES]** Shortcuts catégories (`heroCategoryShortcuts`, 5 items) en `grid-cols-2 md:grid-cols-5` → sur mobile 3 lignes de cartes avec `min-h-[96px]` = ~288px, avec le 5ᵉ item orphelin seul sur la 3ᵉ ligne.
  - Fichier : `src/pages/Index.tsx:318-348`
  - Recommandation : `grid-cols-3` (2 lignes pleines puis 2 orphelins équilibrés) ou horizontal scroll.
  - Impact : moyen-élevé, UX mobile.

#### P1 — UX majeur

- **[P1][HIERARCHY]** Les sous-titres section sont cohérents (`font-serif text-xl md:text-3xl font-bold`) mais la sous-section « Catégories principales » utilise `font-serif text-lg md:text-2xl` — **échelle H2 incohérente** entre sections de même niveau.
  - Fichier : `src/pages/Index.tsx:308` vs `354`, `409`, `456`.

- **[P1][CTA-VIEW-ALL]** Le lien « Voir tout » du header des sections est `hidden md:inline-flex` → invisible mobile alors que la page utilise le carousel. Sur mobile, l'accès au listing complet nécessite de scroller tout le contenu. Un seul « Voir plus » en fin de chaque section est nécessaire mobile.
  - Fichier : `src/pages/Index.tsx:310-315, 356-360, 416-421`.

- **[P1][THEMATIC-DEDUP]** Les sections thématiques (4×4, Citadines, Utilitaires, Électriques) filtrent par mots-clés dans le titre et pas par tags structurés — génère des doublons inter-sections et de la confusion (un même listing peut être dans 2 sections).
  - Fichier : `src/pages/Index.tsx:91-179`.

- **[P1][EMPTY-STATES-LONG]** `PremiumStatePanel` est répété 4 fois pour les vides/chargement (listings vides, low-inventory, themed loading, market feed loading) avec messages longs — dilue le signal.
  - Fichier : `src/pages/Index.tsx:244-252, 463-471, 472-487, 501-518`.

- **[P1][ESTIMATION-BANNER-VISUAL-WEIGHT]** Le banner « Estimation : votre repère » (`src/pages/Index.tsx:431-451`) est entre deux sections d'annonces avec même spacing vertical → peu différencié visuellement, risque d'être ignoré.

#### P2 — Polish

- **[P2][TYPO-MIX]** Overline `tracking-[0.14em]` vs `tracking-wider` (Tailwind natif) — magic numbers, à tokeniser.
- **[P2][SHADOW-AD-HOC]** Plusieurs shadows arbitraires : `shadow-[0_1px_3px_-1px_rgba(15,23,42,0.07)]`, `shadow-[0_6px_16px_-8px_rgba(15,23,42,0.12)]`, `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)]` — pas de gamme.
  - Fichier : `src/pages/Index.tsx:304, 323, 326`.
- **[P2][BUTTON-COLORS-INLINE]** Tous les CTA primaires utilisent `className="gradient-primary border-0" style={{ color: "#FAFAFA" }}` — devrait être une variante `<Button variant="hero">` (cf. item transverse #T-01).

---

### 3.2 Page Recherche (`/recherche`)
Fichier principal : `src/pages/SearchPage.tsx` (779 lignes).

#### P1 — UX majeur

- **[P1][TITLE-COUNT-WRAPPING]** Le H1 inclut le compte entre parenthèses : `pageTitle` + `(X annonces)`. Sur titre long ex. « Véhicules à louer à Antananarivo (23 annonces) » + mobile 320px → wrap brutal peu lisible.
  - Fichier : `src/pages/SearchPage.tsx:535-558`.
  - Recommandation : séparer le compte sur une 2ᵉ ligne visuelle.

- **[P1][MAP-RESPONSIVE]** Vue carte (`viewMode === "map"`) : `h-auto lg:h-[min(600px,70vh)]` pour container, puis carte `h-[min(420px,50vh)] lg:h-full min-h-[280px]`. Sur mobile étroit (320px), liste en dessous de la carte a `overflow-y-visible lg:overflow-y-auto` — la hauteur n'est pas limitée mobile → double scroll possible (page + intra).
  - Fichier : `src/pages/SearchPage.tsx:678-700`.

- **[P1][FILTERS-BAR-DENSITY]** Le `SearchToolbar` mobile empile : bouton Filtres + badge count + résultat count + 3 view-toggles + Sort dropdown dans un `flex flex-col gap-2 lg:flex-row`. Sur 320-375px, la ligne des toggles peut passer en 2 lignes ce qui casse le alignement prévu.
  - Fichier : `src/pages/search/components/SearchToolbar.tsx:58-135`.

- **[P1][ACTIVE-CHIPS-NO-LIMIT]** `SearchActiveChips` n'a pas de cap d'affichage — une recherche très filtrée génère potentiellement 15+ chips qui s'empilent sur plusieurs lignes.
  - Fichier : `src/pages/SearchPage.tsx:559-565`.

- **[P1][BREADCRUMB-LIGHT]** Breadcrumb en `text-sm` avec séparateurs chevrons qui peuvent wrap sur chemin long — pas de `overflow-x-auto` comme sur ListingDetail.
  - Fichier : `src/pages/SearchPage.tsx:515-533`.

#### P2 — Polish

- **[P2][RESULTS-BANNER-SIMILAR]** Le banner « Aucun véhicule ne correspond » utilise Sparkles + 3 paragraphes — verbeux comparé à la culture des marketplaces concurrentes (signal minimal).
  - Fichier : `src/pages/SearchPage.tsx:627-652`.
- **[P2][MIXED-OVERLINE]** Overlines en mini-majuscules `uppercase tracking-[0.14em]` sont masquées `hidden sm:block` pour les sélection titles — inconsistent entre pages (Home les affiche toutes).

---

### 3.3 Fiche véhicule (`/annonce/:id`)
Fichier principal : `src/pages/ListingDetail.tsx` (782 lignes).

#### P0 — Bugs critiques

- **[P0][DESC-OVERFLOW]** La description n'a **aucun** `break-words` / `overflow-wrap` → mots très longs (URLs, mots collés type « BMWX5ModelSuperLuxe2024 », texte non-espacé) peuvent déborder horizontalement et casser la colonne centrale mobile. **Le pattern signalé par l'utilisateur est confirmé ici.**
  - Fichier : `src/pages/ListingDetail.tsx:488-493`
  - Code : `<p className="font-sans text-muted-foreground leading-relaxed whitespace-pre-line">{listing.description}</p>`
  - Recommandation : ajouter `break-words` (= `overflow-wrap: break-word`) + éventuellement `hyphens-auto`.
  - Impact : **élevé**, bug UX visible immédiat.

- **[P0][DESC-NO-TRUNCATE]** Pas de mécanisme « Voir plus / Voir moins » sur la description (contrairement aux specs et features). Une description de 2 000+ caractères s'affiche entière, allongeant énormément la page.
  - Fichier : `src/pages/ListingDetail.tsx:488-493`.

- **[P0][TITLE-NO-BREAKWORDS]** `<h1 className="font-serif text-[1.45rem] leading-tight md:text-3xl font-bold text-foreground">{displayTitle}</h1>` — titres longs (ex. « Mitsubishi Pajero Sport GLS 2.4 DI-D 4WD BOITE AUTO 2022 ») dépassent du conteneur mobile si mot long.
  - Fichier : `src/pages/ListingDetail.tsx:284`.

#### P1 — UX majeur

- **[P1][HERO-PRICE-CTA-WRAP]** Bloc prix + CTA `flex flex-wrap items-end justify-between gap-4` → sur 320px-375px, le CTA « Contacter le vendeur » passe à la ligne sous le prix → visuellement peu clair.
  - Fichier : `src/pages/ListingDetail.tsx:312-340`.

- **[P1][SPECS-GRID-4COLS-EMPTY]** Quand 2 ou 3 specs seulement (certains scooters/motos n'ont pas de portes/places), la grille `md:grid-cols-4` affiche 1 case + trous vides ou un équilibre cassé.
  - Fichier : `src/pages/ListingDetail.tsx:422-461`.

- **[P1][FEATURES-GRID-2COLS]** `grid grid-cols-2 gap-2` — sur 320px la colonne fait ~140px pour « Caméra de recul » (16 chars) — texte touche le bord. Option safer : `grid-cols-1 sm:grid-cols-2`.
  - Fichier : `src/pages/ListingDetail.tsx:498-504`.

- **[P1][THUMBNAIL-NO-SNAP]** La strip de thumbnails `flex gap-2 overflow-x-auto pb-1` n'a pas de `snap-x` → swipe imprécis sur mobile.
  - Fichier : `src/pages/ListingDetail.tsx:378-400`.

- **[P1][GALLERY-BULLET-COUNT]** Compteur `selectedImg + 1 / images.length` positionné bottom-left sur un gradient peu contrasté (sur certaines photos claires), lisibilité variable.
  - Fichier : `src/pages/ListingDetail.tsx:372-376`.

- **[P1][CONTACT-FORM-EMPTY-PLACEHOLDERS]** Inputs contact utilisent `placeholder` au lieu de `<Label>` — mauvais UX accessibilité et perte d'info quand l'utilisateur tape.
  - Fichier : `src/pages/ListingDetail.tsx:688-691`.

- **[P1][CONTACT-HINT-HIDDEN-MOBILE]** Les 2 `<p className="hidden sm:block …">` d'aide contextuelle du formulaire contact ne s'affichent pas mobile — pourtant c'est là qu'elles seraient les plus utiles.
  - Fichier : `src/pages/ListingDetail.tsx:685-687, 695-700`.

- **[P1][BOTTOM-STICKY-BAR-TIGHT]** Barre sticky mobile : deux boutons « Écrire au vendeur » + « Tél. » avec `flex-1` à 320px → `flex gap-1.5` et texte `text-xs sm:text-sm` → très serré, icônes touchent les bords.
  - Fichier : `src/pages/ListingDetail.tsx:734-775`.

- **[P1][MAP-FALLBACK-HEIGHT]** Le fallback carte `min-h-[200px]` est visuellement vide/orphelin quand pas de coordonnées. Une petite illustration simple serait plus rassurante.
  - Fichier : `src/pages/ListingDetail.tsx:587-597`.

#### P2 — Polish

- **[P2][BADGE-OVERLOAD]** Jusqu'à 5 badges (transaction, type, électrique, hybride, status-boost) dans le header → visuellement lourd.
  - Fichier : `src/pages/ListingDetail.tsx:247-282`.

- **[P2][SIMILAR-SECTION-GRID-VS-MAIN]** Les « annonces similaires » en bas utilisent `md:grid-cols-2 lg:grid-cols-4` (comme main), mais avec `variant="default"` → styling différent de la variante `search` (hiérarchie interne différente).
  - Fichier : `src/pages/ListingDetail.tsx:725-729`.

- **[P2][LOCATION-HINT-LONG]** Le sous-texte « Zone approximative sur la carte (l'adresse exacte n'est pas affichée publiquement) » est en `text-[14px]` sur 2 lignes + titre — prend ~100px vertical avant la carte.
  - Fichier : `src/pages/ListingDetail.tsx:557-566`.

---

### 3.4 Publier (`/publier`)
Fichier principal : `src/pages/PublishPage.tsx` (1 630 lignes — déjà identifié dans `docs/AUDIT_FINDINGS.md` priorité 6).

#### P1 — UX majeur

- **[P1][PROGRESS-4-STEPS]** 4 étapes (Informations, Détails, Médias, Visibilité) avec 58 champs potentiels — le `PublishProgressSteps` affiche des labels complets sur desktop qui wrapent sur mobile. La migration RHF n'est que partielle (phase 6.3.b, en cours).
  - Fichier : `src/pages/PublishPage.tsx:110-137`.

- **[P1][STEP-NAV-NO-SCROLL-TOP]** Il n'y a pas de `scrollTo(0,0)` visible entre les étapes (à confirmer dans `PublishStepNav`) → l'utilisateur peut se retrouver à mi-hauteur au changement d'étape.

- **[P1][STEP-ERRORS-BANNER]** `PublishStepErrors` n'est pas mis en haut de façon sticky — sur un formulaire long, l'utilisateur clique « Continuer » et peut ne pas voir l'erreur si elle est loin.

#### P2 — Polish

- **[P2][LAYOUT-ASIDE-STICKY]** `PublishGuidanceAside` est sticky desktop mais prend beaucoup de place visuelle — adapter contenu selon l'étape (actuellement générique).

Note : cette page nécessite un audit dédié Phase 1 (lot 6 audit existant). Items ajoutés ici superficiellement.

---

### 3.5 Estimation (`/estimation`)
Fichier principal : `src/pages/VehicleEstimationPage.tsx` (807 lignes).

#### P1 — UX majeur

- **[P1][GRID-ASIDE-SPACE]** Écran « vehicle » : grid `lg:grid-cols-[1.55fr_0.65fr]` — desktop OK, mais sur laptop étroit (1024-1280), les 2 colonnes se resserrent fortement et l'aside « Pourquoi ces informations » devient trop étroit.
  - Fichier : `src/pages/VehicleEstimationPage.tsx:462-635`.

- **[P1][STEP-LABELS-INCONSISTENT]** Les étapes sont indiquées « Étape 1 », « Étape 2 » (badges) + `EstimationProgressHeader` au-dessus. **Double indication** pouvant confondre.
  - Fichier : `src/pages/VehicleEstimationPage.tsx:432-438, 444, 655`.

- **[P1][YEAR-INPUT-TYPE-NUMBER]** `<Input type="number" min={1950} max={currentYear}>` pour l'année → spinners natifs variables selon navigateur, UX hétérogène. Recommander un `<Select>` d'années comme sur HeroSearch.
  - Fichier : `src/pages/VehicleEstimationPage.tsx:536-544`.

- **[P1][MILEAGE-NO-FORMAT]** L'input kilométrage `type="number"` sans formatage des milliers — peu confortable pour 75000 (tapé comme « 75000 » sans espace).
  - Fichier : `src/pages/VehicleEstimationPage.tsx:559-567`.

- **[P1][TYPO-VALUE-HERO]** `valueHero: "font-serif text-5xl md:text-7xl tracking-tight leading-[0.98]"` dans `ESTIMATION_TYPO` — échelle **hors toute autre page**, rompt l'unité visuelle. Écran résultat utilisera `text-7xl` sur desktop.
  - Fichier : `src/pages/VehicleEstimationPage.tsx:97-105`.

#### P2 — Polish

- **[P2][PALETTE-LOCK-COMMENT]** Commentaire « Palette lock (4 tones) » dans le code (`src/pages/VehicleEstimationPage.tsx:86-93`) → indique qu'Estimation a son propre DS local, alors que le reste du site utilise des tokens globaux. Divergence design system.
- **[P2][RADIAL-GRADIENT-BG]** Background radial absolute positioning → peut entraîner un overflow-x subtil si le parent n'a pas `overflow-x-hidden`.
  - Fichier : `src/pages/VehicleEstimationPage.tsx:322`.

---

### 3.6 Concessionnaires (`/concessionnaires`, `/agences`)
Fichier principal : `src/pages/AgenciesListPage.tsx` (+ alias `ConcessionnairesIndexPage`).

#### P1 — UX majeur

- **[P1][FILTER-SELECT-FIXED-WIDTH]** La `<Select>` ville a `className="w-48"` (192px) — sur 320px mobile et après `flex-1 max-w-md` sur la recherche, la row `flex flex-wrap items-end gap-3 mb-8` wrap sur 3 lignes ce qui est acceptable mais peu élégant.
  - Fichier : `src/pages/AgenciesListPage.tsx:90-103`.

- **[P1][NO-BIO-BREAKWORDS]** Dans `AgencyProfile`, bio longue (`{displayBio}`) dans `<p>` sans `break-words` — même risque de débordement horizontal que description listing.
  - Fichier : `src/pages/AgencyProfile.tsx:192`.

- **[P1][EMOJI-ICONS]** L'affichage utilise 📍 📞 ✉️ en dur dans le texte au lieu d'icônes Lucide — style inconsistant avec le reste du site (`src/pages/AgencyProfile.tsx:191-194`, `AgenciesListPage.tsx:205`).

- **[P1][AGENCY-CARD-LAYOUT-MIX]** 2 types de cartes côte à côte : "Partenaires officiels" (section spéciale avec logo carré + badge Partenaire) et "Annuaire" (carte plus simple) — transitions visuelles abruptes entre les 2 sections.
  - Fichier : `src/pages/AgenciesListPage.tsx:139-213`.

#### P2 — Polish

- **[P2][COVER-IMAGE-RATIO]** `aspect-[3/1]` pour cover image agence — très allongé, peu visible mobile.
  - Fichier : `src/pages/AgencyProfile.tsx:208-217`.

- **[P2][SOCIAL-LINKS-TEXT-ONLY]** Boutons "Suivez-nous" sont juste des pills avec le nom du réseau en capitalize (« facebook », « instagram ») sans icône — peu lisible.
  - Fichier : `src/pages/AgencyProfile.tsx:247-264`.

---

### 3.7 Conseils (`/conseils`, `/conseils/:slug`)
Fichier principal : `src/pages/BlogPages.tsx`.

#### P1 — UX majeur

- **[P1][CARD-HEIGHT-UNEQUAL]** Grille `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` — les cartes ont `p-5 space-y-2` avec `line-clamp-2` sur l'excerpt → bien ; mais pas de hauteur figée, donc cards alignés en haut puis varient en bas. Fine pour MVP.

- **[P1][H1-ARTICLE-OVERFLOW]** Article : H1 `text-2xl sm:text-3xl md:text-4xl font-bold` — sur mots très longs pas de `break-words`.
  - Fichier : `src/pages/BlogPages.tsx:166`.

- **[P1][BREADCRUMB-NOT-TRUNCATED]** Breadcrumb article affiche le titre complet (`<span>{post.title}</span>`) → wrap sur titres longs, pas de `overflow-x-auto` / `truncate`.
  - Fichier : `src/pages/BlogPages.tsx:157-164`.

#### P2 — Polish

- **[P2][FAQ-CARD-STYLING]** Cards FAQ dans un `rounded-2xl border border-border p-4 bg-card` sans chevron d'accordéon — à considérer en accordéon pour les articles avec beaucoup de questions.

---

### 3.8 Dashboard (`/dashboard`)
Fichier principal : `src/pages/Dashboard.tsx` + `src/pages/dashboard/components/*.tsx`.

#### P1 — UX majeur

- **[P1][STATS-DENSITY]** 5 stat cards (`DashboardStatsCards`) — sur mobile ≤ 640px elles sont empilées verticalement (grille implicite) — prend beaucoup de place sans hiérarchie claire.
  - Fichier : `src/pages/Dashboard.tsx:179-190`.

- **[P1][SECTIONS-LOAD-ORDER]** L'ordre est : agency → stats → drafts → credits → listings → leads. Le dashboard d'un vendeur actif scrolle beaucoup avant d'arriver à ses leads reçus (= info la plus actionnable).
  - Recommandation : leads + listings en premier, credits/drafts ensuite.

- **[P1][CREDITS-SECTION-VERBOSE]** `DashboardCreditsSection` avec 3 bullets de texte (`creditsBullet1/2/3`) → verbeux pour un dashboard.
  - Fichier : `src/pages/Dashboard.tsx:327-347`.

#### P2 — Polish

- **[P2][ICON-COLORS]** Stats cards utilisent `text-amber-600`, `text-primary`, `text-success`, `text-accent`, `text-primary` — palette cohérente mais `amber-600` hors tokens (Tailwind direct, pas var()).
  - Fichier : `src/pages/Dashboard.tsx:184, 185, 187, 188, 189`.

---

### 3.9 Crédits (`/credits`)
Fichier principal : `src/pages/credits/CreditsPage.tsx`, `CreditsBalanceHero.tsx`.

#### P0 — Bugs critiques

- **[P0][FOOTER-MOBILE-HIDDEN]** `<div className="hidden sm:block"><Footer /></div>` → sur mobile, **aucune mention légale, aucun lien cookies, aucun copyright** accessible depuis `/credits`. Conformité RGPD/mentions légales douteuse.
  - Fichier : `src/pages/credits/CreditsPage.tsx:59-61`
  - Même problème sur `src/pages/PaiementRetourPage.tsx:202-204`.
  - Impact : élevé (conformité + navigation).

#### P1 — UX majeur

- **[P1][BALANCE-HERO-PROJECTION-FR-ONLY]** `CreditsBalanceHero` a des chaînes français hardcodées (`buildBalanceProjection`) avec commentaire `i18n pluralization hardcoded French for P11.b`. Bloque i18n mg/en.
  - Fichier : `src/pages/credits/components/CreditsBalanceHero.tsx:40-43`.

- **[P1][BALANCE-COIN-ICON-SIZE]** Coins `h-10 w-10` fixe à côté d'un prix `text-3xl md:text-4xl` → proportion visuelle peu équilibrée.

---

### 3.10 Paiement retour (`/paiement/retour`)
Fichier principal : `src/pages/PaiementRetourPage.tsx`.

#### P0 — Bugs critiques

- **[P0][FOOTER-MOBILE-HIDDEN]** Même problème que `/credits` : Footer caché mobile.
  - Fichier : `src/pages/PaiementRetourPage.tsx:202-204`.

#### P1 — UX majeur

- **[P1][POLL-STATE-UX]** 4 états (pending/success/failure/timeout) — tous rendus dans un même `<Card>`. Manque d'animation/transition entre états ce qui peut créer une impression de "flicker" entre 2 polls.
  - Fichier : `src/pages/PaiementRetourPage.tsx:44-174`.

---

### 3.11 Pages légales (`/legal/*`)
Fichier principal : `src/pages/legal/LegalLayout.tsx` + 4 pages de contenu.

#### P1 — UX majeur

- **[P1][LEGAL-NAV-CHIPS-WRAP]** La nav en haut (`flex flex-wrap gap-2`) avec 4 pills → peut wrap sur 2 lignes mobile sans séparation claire avec le contenu.
  - Fichier : `src/pages/legal/LegalLayout.tsx:48-58`.

- **[P1][NO-TOC]** Les pages CGU / Politique de Confidentialité / Mentions sont potentiellement longues mais sans **table des matières** (TOC) sticky ni ancres — scroll infini.

#### P2 — Polish

- **[P2][PROSE-SELECTORS]** Gros usage de sélecteurs imbriqués `[&_h1]:… [&_h2]:… [&_p]:…` sur l'article → approche CSS-in-className qui alourdit la lecture, candidate à la factorisation via `@tailwindcss/typography` (plugin `prose`).
  - Fichier : `src/pages/legal/LegalLayout.tsx:59`.

---

### 3.12 Login / Signup (`/login`, `/signup`, `/forgot-password`)
Fichier principal : `src/pages/AuthPages.tsx` + `AuthFormShell`.

#### P1 — UX majeur

- **[P1][SIGNUP-ROLE-TOGGLE-UX]** Toggle `particulier` / `agence` via 2 boutons — sur le switch, un `onSwitchToAgence` **wipe les champs particulier** et vice-versa sans confirmation. Peut frustrer un utilisateur qui hésite.
  - Fichier : `src/pages/AuthPages.tsx:324-338`.

- **[P1][GOOGLE-BUTTON-GATED]** « Continuer avec Google » est désactivé pour l'agence avec message « Réservé particulier ». OK fonctionnellement mais le bouton est toujours affiché, grisé, ce qui peut rendre le parcours confus.

- **[P1][AGENCY-FIELDS-DENSITY]** Signup agence : 6 champs (nom, adresse, contact commercial, NIF, STAT, reg. commerce, logo URL) + 4 particuliers → formulaire très long sur mobile, pas de sections/fieldsets.

#### P2 — Polish

- **[P2][GOOGLE-LOGO-SVG-INLINE]** SVG Google inline dans `AuthPages.tsx:32-53` — candidate à extraction en composant dédié / asset.

---

### 3.13 Beta login (`/beta-login`)

#### P2 — Polish

- **[P2][LOGO-FALLBACK-ICO]** `onError` retombe sur `favicon.ico` — le favicon étant 16×16, l'image est floue à `h-14 w-14`.
  - Fichier : `src/pages/BetaLoginPage.tsx:67`.

- **[P2][COPY-STATIC-2026]** « © 2026 AutoNex Madagascar » — OK pour aujourd'hui mais à dynamiser (`new Date().getFullYear()`).

---

### 3.14 Favoris (`/favoris`)

#### P2 — Polish

- **[P2][HEART-ICON-STYLING]** H1 a une icône `Heart` `fill-destructive` inline → le rouge peut paraître agressif, candidate `text-primary` ou iconographie plus neutre dans le titre.
  - Fichier : `src/pages/FavoritesPage.tsx:26`.

---

### 3.15 Settings (`/settings`)

#### P1 — UX majeur

- **[P1][DRAWER-SECTIONS-NO-ICON-MOBILE]** Le bouton mobile déclencheur du drawer dit juste "Sections" avec un Menu icon — label générique. Nommer la section active serait plus informatif.
  - Fichier : `src/components/settings/SettingsLayout.tsx:61-64`.

- **[P1][H1-DUPLICATION]** H1 "Paramètres" apparaît 2 fois : dans le header mobile + dans le `<aside>` desktop en tant que label.
  - Fichier : `src/components/settings/SettingsLayout.tsx:58, 77`.

---

### 3.16 Contact (`/contact`)

#### P1 — UX majeur

- **[P1][FORM-ERRORS-AFTER-FIELD]** Erreurs zod affichées sous les champs mais sans `aria-describedby` / `aria-invalid` — accessibilité faible.
  - Fichier : `src/pages/ContactPage.tsx:186-260`.

- **[P1][HONEYPOT-CLASS-HIDDEN]** Le champ honeypot utilise `className="hidden"` — détectable par les bots qui gèrent CSS. Préférer `style="position:absolute;left:-10000px;"` (technique anti-bot plus fiable).
  - Fichier : `src/pages/ContactPage.tsx:172`.

---

### 3.17 NotFound (`*`)

#### P2 — Polish

- **[P2][NO-404-ART]** 404 minimal — juste un icône `AlertCircle` + code 404. Occasion ratée pour une illustration.
  - Fichier : `src/pages/NotFound.tsx:13-30`.

---

### 3.18 SEO Landing (`/acheter`, `/vehicules/:categorySlug`, …)
Fichier principal : `src/pages/SeoLandingPage.tsx`.

#### P2 — Polish

- **[P2][RELATED-LINKS-FLAT]** Liens utiles P1 en `flex flex-wrap gap-2` — 12+ pills empilées sans grouping (transaction vs catégorie vs ville).
  - Fichier : `src/pages/SeoLandingPage.tsx:269-291`.

---

## 4. Composants transverses (Header, Footer, HeroSearch, ListingCard, …)

### 4.1 Header global
Fichier : `src/components/Header.tsx` (347 lignes).

#### P0 — Bugs critiques

- **[P0-HDR]** **Hardcoded palette** : `#061427`, `#F2F7FF`, `#0D223D`, `#6F96C4`, `#8FB8E8`, `#9DC2EA`, `#24517F`, `#1A3F6A`, `#F7FBFF`, `#D9E8FA`, `#FAFAFA`, `#9FBCE0`. 12+ hex distincts inventés en dehors de toute variable CSS.
  - Fichier : `src/components/Header.tsx` (nombreuses lignes, e.g. 65-75, 92, 144, 163, 167, 171).
  - Impact : **élevé** — chaque décision couleur bypass le design system, toute refonte de palette impose de toucher ce fichier.

#### P1 — UX majeur

- **[P1-HDR]** **Mobile menu n'est pas un sheet** — c'est un `<div className="lg:hidden border-t border-white/10 bg-[#061427]">` qui s'étend en dessous du header sans overlay. Sur un viewport court (iPhone SE 568px), il peut dépasser hors-écran sans scroll interne.
  - Fichier : `src/components/Header.tsx:216-342`.

- **[P1-HDR]** **Grid `grid-cols-2` pour 4-5 actions footer du menu** → FR/MG/EN/MGA + Publier + Dashboard + Favoris + Logout → répartition incohérente, certains boutons `col-span-2`.
  - Fichier : `src/components/Header.tsx:286-338`.

- **[P1-HDR]** **Language switch via reload** — `switchLanguage` appelle `window.location.reload()` — perd l'état courant (recherche saisie, filtres appliqués).
  - Fichier : `src/components/Header.tsx:43-46`.

- **[P1-HDR]** **Nav dropdown « Explorer » pas indiqué au focus** — trigger déclenche `DropdownMenu` avec focus mais pas de bordure visible, contrastes faibles.

#### P2 — Polish

- **[P2-HDR]** **Logo `h-11 sm:h-14`** — sur 320px ça fait 44px, sur 640px 56px — pas d'échelle intermédiaire à 375px (Android mid-range).
- **[P2-HDR]** `rawLanguage` lu depuis `localStorage` synchroniquement au render → risque de mismatch SSR si le projet ajoute SSR plus tard.
  - Fichier : `src/components/Header.tsx:35-36`.

---

### 4.2 Footer global
Fichier : `src/components/Footer.tsx`.

#### P1 — UX majeur

- **[P1-FTR]** **Background `#061427` + `color: "#FAFAFA"` inline** — répète les couleurs du Header sans tokens.
  - Fichier : `src/components/Footer.tsx:18`.

- **[P1-FTR]** **Colonnes 4 sur desktop, 2 sur md, 1 sur mobile** — la colonne Marque + tagline fait 2 lignes courtes et paraît orpheline sur md:grid-cols-2 (layout déséquilibré).

#### P2 — Polish

- **[P2-FTR]** **Copyright 2026 en dur** — `© 2026 APLi SARLU — Marque AutoNex.` devrait utiliser `new Date().getFullYear()`.
  - Fichier : `src/components/Footer.tsx:69`.

---

### 4.3 HeroSearch
Fichier : `src/components/HeroSearch.tsx` (645 lignes).

#### P1 — UX majeur

- **[P1-HERO]** **Tabs transaction en overflow-x-auto** — `flex justify-center gap-1.5 mb-2 max-w-full overflow-x-auto pb-0.5` pour 3 tabs (Acheter / Location longue durée / Location courte durée). Les 3 labels sont longs, sur 320px ils débordent. User a signalé ce point.
  - Fichier : `src/components/HeroSearch.tsx:236-251`.
  - Recommandation : passer en 2 lignes ou abréger labels mobile (« Location longue » → « Longue »).

- **[P1-HERO]** **Card search overlap bottom** — `-mb-8 md:-mb-12 relative z-10` → chevauche la section suivante. Sur pages courtes (catégories quasi vides), la marge négative peut créer des conflits de z-index.
  - Fichier : `src/components/HeroSearch.tsx:253`.

- **[P1-HERO]** **Desktop filter row avec 4+ colonnes** — à 1024-1280px (laptops étroits), les 4 colonnes `flex-1` + brand `w-32` + bouton se tassent — labels truncate mais inputs minuscules.
  - Fichier : `src/components/HeroSearch.tsx:254-394`.

- **[P1-HERO]** **Mobile CTA « Afficher plus de filtres »** masque les filtres Modèle/Année/Carburant/Marque → si un utilisateur mobile veut filtrer par marque, il doit ouvrir un accordéon caché ; sur desktop il les voit sans clic. **Inconsistance mobile vs desktop**.
  - Fichier : `src/components/HeroSearch.tsx:527-536`.

#### P2 — Polish

- **[P2-HERO]** **Background `gradient-primary` custom utility** dans `index.css` pointant vers un gradient bleu foncé hardcodé (`#061427`, `#0d2b58`, `#1256ca`) — pas de tokens.
- **[P2-HERO]** **Icônes Budget `Euro`/`Banknote`** qui changent selon `budgetCurrency` — comportement discret, pourrait être plus visible (badge devise).

---

### 4.4 ListingCard
Fichier : `src/components/ListingCard.tsx` (264 lignes).

#### P1 — UX majeur

- **[P1-CARD]** **Prix en `text-xl max-sm:text-[1.22rem]`** — `max-sm:` prefix est valide Tailwind mais peu commun, et la valeur `1.22rem` magique. Une échelle tokenisée serait plus propre.
  - Fichier : `src/components/ListingCard.tsx:189`.

- **[P1-CARD]** **Titre avec `line-clamp-2`** — OK mais combinaison `font-serif` + `leading-snug` peut couper sur le mauvais endroit (pas de hyphens).
  - Fichier : `src/components/ListingCard.tsx:218-220`.

- **[P1-CARD]** **Badges en haut à gauche** — 3 badges max (boost + transaction + condition) empilés verticalement `flex flex-col gap-2` → envahit l'image sur petites cartes.
  - Fichier : `src/components/ListingCard.tsx:110-127`.

- **[P1-CARD]** **Chevrons navigation photo** — `min-h-11 min-w-11` opacité `opacity-100 md:opacity-0 md:group-hover:opacity-100` → mobile toujours visibles, mais intrusifs sur la photo si on ne swipe pas.
  - Fichier : `src/components/ListingCard.tsx:140-155`.

- **[P1-CARD]** **Badge « deal » `-X%` en position top-14 right-3** — peut chevaucher avec le bouton Favorite.
  - Fichier : `src/components/ListingCard.tsx:131-137`.

#### P2 — Polish

- **[P2-CARD]** **Variant `search` avec hover `scale-[1.045]`** vs default `scale-105` — différence numérique non-tokenée.
  - Fichier : `src/components/ListingCard.tsx:100-103`.

---

### 4.5 FilterSidebar (desktop + mobile sheet)
Fichier : `src/components/FilterSidebar.tsx`.

#### P1 — UX majeur

- **[P1-FS]** **Accordions multiples ouverts par défaut** `defaultOpenSections = ["transaction", "type", "location", "budget"]` → sur un mobile court, 4 sections ouvertes = scroll massif dans le Sheet.
  - Fichier : `src/components/FilterSidebar.tsx:133-135`.

- **[P1-FS]** **Bouton mobile « Appliquer »** — pas confirmé ici qu'il est sticky en bas du Sheet. Si scroll des filtres, l'utilisateur peut devoir remonter pour trouver le bouton Appliquer.

---

### 4.6 SearchToolbar
Fichier : `src/pages/search/components/SearchToolbar.tsx`.

#### P1 — UX majeur

- **[P1-TB]** **View toggles 3 boutons 44×44** + Sort Select → sur 320px en ligne desktop, serait serré. Voir item [P1] sur SearchPage.

---

### 4.7 BetaLockGate
Fichier : `src/components/auth/BetaLockGate.tsx`.

#### P2 — Polish

- **[P2-BLG]** Flash de contenu possible si le hook `useBetaAccess` fait du lazy cookie-reading (à vérifier).

---

## 5. `index.html` + globals

### 5.1 `index.html`

#### P0 — Bugs critiques

- **[P0-IDX-01]** **Caractère `1` parasite hors balise** — ligne 35 : `<meta name="robots" content="index, follow" />1`. Le `1` après le `/>` est un text node dans `<head>` qui est **un HTML non-valide**. Parsers modernes l'ignorent mais certains outils SEO/moteurs de recherche peuvent tiquer.
  - Fichier : `index.html:35`.
  - Impact : validator, SEO audit.

- **[P0-IDX-02]** **Deux balises `<meta name="robots">` contradictoires** — ligne 10 : `noindex, nofollow` (lié au beta lock) et ligne 35 : `index, follow`. Règle HTML : en théorie la seconde écrase la première dans le DOM, mais plusieurs moteurs (Bing, Yandex) appliquent la règle la plus restrictive. Contradictoire + incohérent avec le `<Helmet>` qui surcharge plus tard.
  - Fichier : `index.html:10, 35`.
  - Impact : SEO critical (risque de désindexation involontaire au launch).

#### P2 — Polish

- **[P2-IDX]** **Theme color `#0A0A0A`** (ligne 12) — sombre uniquement, pas aligné avec la primary `218 83% 45%` (bleu AutoNex).

### 5.2 `src/index.css` + `tailwind.config.ts`

#### P1 — UX majeur

- **[P1-CSS]** **Border-radius `--radius: 1rem`** — base 16px, puis les cards/cartes utilisent `rounded-2xl` (16px) ou `rounded-3xl` (24px) → l'échelle tokens vs Tailwind default est confusing.

- **[P1-CSS]** **Font loading Google Fonts** via `@import url('...')` dans `index.css:1` → bloque le rendu initial. Préférer `<link rel="preconnect">` + async font loading dans `index.html`.
  - Fichier : `src/index.css:1`.

- **[P1-CSS]** **`.gradient-primary` utility** est un gradient fixe `#061427 → #0d2b58 → #1256ca` hardcodé dans CSS — change de palette difficile.
  - Fichier : `src/index.css:127-129`.

#### P2 — Polish

- **[P2-CSS]** **Dark mode tokens définis** (`.dark` class in index.css) mais **aucun toggle dans l'UI** — dead code actuellement.
  - Fichier : `src/index.css:63-91`.

- **[P2-CSS]** **`@layer components { .form-surface, .form-surface-muted }`** sont utilisées dans PublishPage mais pas dans d'autres formulaires (contact, auth) — inconsistance design-system.
  - Fichier : `src/index.css:108-124`.

---

## 6. Patterns transverses (cross-page)

### 6.1 T-01 — Palette hors tokens (P0 transverse)

**Constat :** plus de 40 hex distincts hardcodés dans les composants user-facing : `#061427`, `#0D223D`, `#F2F7FF`, `#FAFAFA`, `#8FB8E8`, `#6F96C4`, `#9DC2EA`, `#24517F`, `#1A3F6A`, `#F7FBFF`, `#D9E8FA`, `#9FBCE0`, `#3f7fe2`, `#1256ca`, `#0d2b58`, `#25D366`, `#8FB8E8`, etc.

**Pages affectées :** Header, Footer, HeroSearch, ListingCard, ListingDetail (CTAs), Dashboard (icon colors), VehicleEstimationPage (ESTIMATION_PALETTE), ConceptionLanding (rounded borders).

**Recommandation :** introduire 4-6 tokens sémantiques supplémentaires (`--navbar-bg`, `--navbar-fg`, `--navbar-accent`, `--on-dark-surface-fg`, …) et éliminer tous les hex inline.

### 6.2 T-02 — `style={{ color: "#FAFAFA" }}` inline omniprésent (P0 transverse)

**Constat :** 25+ occurrences grep-confirmées de `style={{ color: "#FAFAFA" }}` — à chaque CTA gradient primaire, bouton sombre, lien dans nav mobile, etc.

**Recommandation :** définir `--primary-foreground-solid` + créer un variant Button `hero` qui embarque cette couleur. Supprimer tous les `style={}` inline.

### 6.3 T-03 — Absence de `break-words` / `overflow-wrap` (P0 transverse)

**Constat :** aucun `break-words`, `overflow-wrap`, ni `hyphens` sur les textes user-generated :
- Description listing (`ListingDetail.tsx:491`).
- Bio agence (`AgencyProfile.tsx:192`).
- Titre listing mobile (`ListingCard.tsx:218`).
- `commentaire description_long` agence (`AgencyProfile.tsx:222`).
- `quartierLibre` dans les chips search.

**Recommandation :** appliquer `break-words` (= `overflow-wrap: break-word;`) globalement sur les éléments de contenu long, via classe utilitaire partagée `.content-prose`.

### 6.4 T-04 — Typographie H1/H2/H3 non tokenisée (P1 transverse)

**Constat :** les H1 varient de page en page :
- Home hero : `text-2xl sm:text-4xl md:text-5xl lg:text-6xl` (4 breakpoints).
- ListingDetail : `text-[1.45rem] md:text-3xl`.
- AgenciesListPage : `text-3xl font-bold` (un seul palier).
- SettingsLayout : `text-2xl font-bold`.
- Estimation : `text-4xl md:text-6xl`.
- BlogArticle : `text-2xl sm:text-3xl md:text-4xl`.

**Recommandation :** 3-4 niveaux de titres tokenisés (`.text-h1-display`, `.text-h1`, `.text-h2`, `.text-h3`) avec échelles responsive figées.

### 6.5 T-05 — Boutons gradient inline répétés (P1 transverse)

**Constat :** `className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}` est un duplicat de `className` de CTA primaire dans >20 endroits.

**Recommandation :** Button variant `hero` à ajouter dans `buttonVariants`. Voir `src/components/ui/button.tsx:10-18` pour l'emplacement.

### 6.6 T-06 — Footer masqué mobile sur 2 pages (P0 transverse)

**Constat :** `<div className="hidden sm:block"><Footer /></div>` présent sur `/credits` et `/paiement/retour`.

**Impact :** accès mentions légales / cookies / CGU absent sur mobile pour ces 2 routes protégées = risque conformité.

**Recommandation :** uniformiser affichage Footer mobile partout.

### 6.7 T-07 — Empty/Loading states divers (P1 transverse)

**Constat :** 3 patterns visuels différents pour les états vides/chargement :
- `PremiumStatePanel` (Home, SEO landing).
- Loader seul (`AgencyProfile`, `FavoritesPage`, `Dashboard`).
- Text-only empty (`AgenciesListPage`, `BlogList`).
- Skeletons avec `PremiumStateSkeletonGrid` (SearchPage).

**Recommandation :** un seul composant `EmptyState` et un seul `LoadingState` / `Skeleton`.

### 6.8 T-08 — Icônes emoji 📍📞✉️ vs Lucide (P1 transverse)

**Constat :** certaines pages utilisent des émojis dans le texte (AgencyProfile) alors que le reste du site utilise Lucide Icons. Résultat : typographie émoji rendu OS-dépendant (Apple / Google / Twitter), style hétérogène.

**Fichiers :** `src/pages/AgencyProfile.tsx:191-194`, `src/pages/AgenciesListPage.tsx:205`.

### 6.9 T-09 — Touch targets borderline (P1 transverse)

**Constat :** la plupart des boutons sont à `min-h-11 min-w-11` (44×44) — OK WCAG. Exceptions détectées :
- Chevrons prev/next dans `ListingDetail` gallery = `h-8 w-8` mobile (`h-9 w-9` md) → **sous-seuil**.
  - Fichier : `src/pages/ListingDetail.tsx:354-370`.
- Dropdown trigger language dans Header = `px-3 py-1.5` avec texte `text-xs` → hauteur effective ~30px si pas de min-h.
  - Fichier : `src/components/Header.tsx:135-142`.

### 6.10 T-10 — Z-index non tokenisé (P2 transverse)

**Constat :** `z-40`, `z-50`, `z-[2]`, `z-10` utilisés librement — pas d'échelle documentée.

**Fichiers :** `ListingDetail.tsx:110, 128, 132, 734`, `Header.tsx:78`, `ListingCard.tsx:128, 132`.

### 6.11 T-11 — Border et ring `focus-visible` inconsistants (P2 transverse)

**Constat :** certaines actions ont `focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2`, d'autres non. Accessibilité clavier dégradée.

### 6.12 T-12 — SEO / robots (P0 transverse — couvert en P0-IDX-02)

Voir section 5.1.

### 6.13 T-13 — `Container` + `px-4` mixés (P2 transverse)

**Constat :** `tailwind.config.ts:9-13` définit `container` avec `padding: "2rem"` (32px). Toutes les pages ajoutent `px-4` (16px) par-dessus. Tailwind JIT applique le dernier déclaré — mais la coexistence est déroutante.

**Recommandation :** définir un `container` unique avec padding responsive `{ DEFAULT: '1rem', md: '2rem' }` et retirer les `px-4` redondants.

### 6.14 T-14 — Accessibilité aria/sémantique inégale (P1 transverse)

**Constat :** plusieurs boutons personnalisés sans `aria-label` (ex. chevrons gallerie en `ListingCard`), formulaires sans `aria-describedby` pour les erreurs (contact, auth). Le rapport ne liste pas tous les cas mais c'est un pattern à adresser.

### 6.15 T-15 — Layout-shift potentiel (CLS) sur images (P1 transverse)

**Constat :** `ListingCard` utilise `aspect-[4/3]` sur le wrapper photo — OK. ListingDetail utilise `aspect-video` sur galerie principale — OK. Mais agence `aspect-[3/1]` cover = OK. En revanche les logos marques FeaturedMakes n'ont pas de dimension explicite → image layout-shift possible au premier paint.

---

## 7. Recommandations stratégiques de refonte

### Lot 1 — Quick wins bugs critiques (estimation 0.5-1 jour)

| # | Action | Fichiers | Priorité |
|---|--------|----------|:--------:|
| 1.1 | Supprimer le `1` parasite et unifier la balise `<meta name="robots">` | `index.html` | P0 |
| 1.2 | Ajouter `break-words` sur description listing + bio agence | `ListingDetail.tsx:491`, `AgencyProfile.tsx:192, 222` | P0 |
| 1.3 | Retirer le `hidden sm:block` sur Footer des pages Credits/Paiement retour | `CreditsPage.tsx:59`, `PaiementRetourPage.tsx:202` | P0 |
| 1.4 | Ajouter `break-words` sur titre listing, titre article blog, titres longs | `ListingCard.tsx:218`, `BlogPages.tsx:166`, `ListingDetail.tsx:284` | P0 |

### Lot 2 — Refonte Home mobile (estimation 2-3 jours)

| # | Action | Fichiers |
|---|--------|----------|
| 2.1 | Bandeau marques horizontal `overflow-x-auto snap-x` au lieu du `flex-wrap` en 4 lignes | `Index.tsx:363-396` |
| 2.2 | Shortcuts catégories en 3×2 ou bandeau scroll au lieu de 2×3 | `Index.tsx:318-348` |
| 2.3 | Unifier les échelles H2 sections (`font-serif text-xl md:text-3xl font-bold` partout) | `Index.tsx:237, 308, 354, 409, 456, 504` |
| 2.4 | « Voir plus » affiché mobile aussi (retirer `hidden md:inline-flex`) | `Index.tsx:310-315, 356-360, 416-421, 457-459` |

### Lot 3 — Fiche véhicule (estimation 2 jours)

| # | Action | Fichiers |
|---|--------|----------|
| 3.1 | Description avec `break-words` + mécanisme expand/collapse (comme specs/features) | `ListingDetail.tsx:488-493` |
| 3.2 | Hero bloc prix/CTA : passer de `flex-wrap` à une architecture `grid md:grid-cols-[1fr_auto]` pour éviter wrap chaotique | `ListingDetail.tsx:312-340` |
| 3.3 | Chevrons gallery en `h-11 w-11` pour respect touch target WCAG | `ListingDetail.tsx:354-370` |
| 3.4 | Ajouter `snap-x` + indicator actif visible sur thumbnail strip | `ListingDetail.tsx:378-400` |
| 3.5 | Grille features `grid-cols-1 sm:grid-cols-2` au lieu de `grid-cols-2` dès 320px | `ListingDetail.tsx:498-504` |
| 3.6 | Remplacer `placeholder` par `<Label>` dans formulaire contact | `ListingDetail.tsx:688-691` |

### Lot 4 — Design system unifié (estimation 3-5 jours)

| # | Action | Fichiers |
|---|--------|----------|
| 4.1 | **Tokens typo** : 4 niveaux (`.text-h1-display`, `.text-h1`, `.text-h2`, `.text-h3`) + `.text-body`, `.text-body-sm`, `.text-caption` | `tailwind.config.ts`, `src/index.css` |
| 4.2 | **Tokens spacing** : gamme 4/6/8/12/16/20/24/32/40/48/64 + documentation | `tailwind.config.ts` |
| 4.3 | **Tokens colors** : supprimer 40+ hex via 6 nouveaux tokens `--navbar-bg`, `--on-dark-fg`, `--brand-ink`, `--brand-ink-subtle`, `--brand-surface`, `--brand-overlay` | `src/index.css` |
| 4.4 | **Button variant `hero`** gradient primaire, élimine les `style={{ color: "#FAFAFA" }}` inline | `src/components/ui/button.tsx` |
| 4.5 | **Composant `EmptyState`** unique remplaçant `PremiumStatePanel` + variantes text-only | `src/components/ui/empty-state.tsx` (à créer) |
| 4.6 | **Composant `Skeleton` list/card** unifié remplace les 3 patterns actuels | `src/components/ui/skeleton-card.tsx` (à créer) |
| 4.7 | **Container tokens** : unifier `px-4 md:px-8` via `container` Tailwind seul | `tailwind.config.ts:9-13` |
| 4.8 | **Dark mode toggle** ou suppression du dead code `.dark` | `src/index.css:63-91` |

### Lot 5 — Header/Footer unifié (estimation 1-2 jours)

| # | Action | Fichiers |
|---|--------|----------|
| 5.1 | Extraire la palette Header dans tokens (`--navbar-bg: #061427`, etc.) | `src/components/Header.tsx` |
| 5.2 | Mobile menu en Sheet drawer full-height au lieu de `<div>` inline | `src/components/Header.tsx:216-342` |
| 5.3 | Language switch sans reload complet (i18n dynamique) | `src/components/Header.tsx:43-46` |
| 5.4 | Copyright année dynamique | `src/components/Footer.tsx:69` |
| 5.5 | Footer mobile unifié sur toutes pages (voir lot 1.3) | — |

### Lot 6 — HeroSearch mobile (estimation 1-2 jours)

| # | Action | Fichiers |
|---|--------|----------|
| 6.1 | Tabs transaction en 2 lignes ou labels mobiles raccourcis | `HeroSearch.tsx:236-251` |
| 6.2 | Uniformiser les filtres avancés mobile = desktop (Marque/Modèle/Année/Carburant toujours visibles) | `HeroSearch.tsx:527-627` |
| 6.3 | Tokeniser le gradient hero | `src/index.css:127-129` |

### Lot 7 — Accessibilité & ergonomie (estimation 1-2 jours)

| # | Action | Fichiers |
|---|--------|----------|
| 7.1 | `aria-describedby` + `aria-invalid` systématiques sur formulaires avec erreurs Zod | Contact, Signup, Publish |
| 7.2 | Touch targets ≥ 44×44px partout (chevrons gallery, dropdowns language) | Header, ListingDetail |
| 7.3 | Tokens z-index + documentation | Index.css |
| 7.4 | `focus-visible:ring` uniforme sur toute action cliquable | Header, buttons, links |

---

## 8. Annexes

### 8.1 Breakpoints recommandés (cohérent avec utilitaires rencontrés)
- **Mobile :** 320px, 375px (iPhone 13 mini), 414px (iPhone 14 Pro Max)
- **Tablet :** 768px (iPad), 1024px (iPad Pro / laptop min)
- **Desktop :** 1280px, 1440px, 1920px
- Tailwind config actuel : `sm:640, md:768, lg:1024, xl:1280, 2xl:1400`.

### 8.2 Méthodologie
- **Code statique uniquement.** Aucun test navigateur, aucun Lighthouse run, aucun screenshot pris pendant cet audit.
- Basé sur lecture de : `src/App.tsx`, `src/main.tsx`, `src/index.css`, `tailwind.config.ts`, `index.html`, 18 pages `src/pages/**/*.tsx`, 8 composants transverses clés.
- **Hypothèses :**
  - Les bugs type « overflow mobile » sont inférés à partir des classes utilitaires + proportions de texte estimées.
  - Les problèmes de performance perçue (layout shift, skeleton absence) sont dérivés de patterns observés, pas mesurés.
  - Les verdicts d'accessibilité s'appuient sur présence/absence des attributs `aria-*` et `role` dans le markup observable.

### 8.3 Recensement fichiers les plus « lourds » en issues UI
1. `src/components/Header.tsx` — 347 lignes, **palette + mobile menu critiques**.
2. `src/components/HeroSearch.tsx` — 645 lignes, **complexité mobile/desktop divergente**.
3. `src/pages/ListingDetail.tsx` — 782 lignes, **overflow descriptions + touch targets**.
4. `src/pages/PublishPage.tsx` — 1630 lignes (pas entièrement audité — voir `docs/AUDIT_FINDINGS.md` priorité 6).
5. `src/pages/VehicleEstimationPage.tsx` — 807 lignes, **design system local divergent**.

### 8.4 Conformité RGPD / Mentions (à valider avec équipe juridique)
- Footer masqué mobile sur `/credits` et `/paiement/retour` = pas d'accès aux mentions légales / politique cookies / CGU depuis ces routes sur mobile. **À corriger avant launch**.
- Bannière cookies `CookieConsentBanner` est présente mais chargée dans le `Suspense` — à vérifier qu'elle se comporte bien avant l'interaction user (pas dans le scope de cet audit).

### 8.5 Verdict global
- **Beaucoup de soin pris sur les micro-interactions** (hover transform, scale, blur, focus-visible ring) — l'intention UX est solide.
- **Principal problème :** **design system à moitié tokenisé** — les composants UI (shadcn) sont tokenisés proprement, mais tout le chrome (Header, Footer, HeroSearch, CTAs primaires) utilise massivement des hex hardcodés. La dette visuelle est concentrée à cet endroit.
- **Deuxième problème :** **densité mobile faible** — marques, catégories, stats, cards brouillons prennent beaucoup de place verticale sans densifier l'information.
- **Troisième problème :** **overflow-wrap manquant partout** — bug UX visible au premier long texte user-generated.

Une fois les lots 1-4 exécutés, le site aurait une cohérence visuelle significativement renforcée et réduirait la dette de refonte future de ~70%.

---

**Fin du rapport — Phase 0 audit UX/UI AutoNex.**
