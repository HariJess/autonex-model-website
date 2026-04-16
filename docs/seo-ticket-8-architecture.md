# SEO Ticket 8 - SEO Architecture & Indexable Page Map

## 1. Overall SEO architecture strategy

AutoNex should use a **two-layer SEO architecture**:

- **Layer A (Indexable landing templates):** curated, stable, intent-based pages that represent real search demand and commercial value.
- **Layer B (Search UX utilities):** exploratory filter URLs for user browsing, generally non-indexable to avoid duplication/thin pages.

Decision model:

- Index pages only when they have:
  - clear standalone intent,
  - stable inventory support,
  - unique page purpose (not a slight variant of another URL),
  - canonical ownership in the architecture.
- Keep “infinite combinations” out of index by default.
- Grow with a controlled whitelist (not open-ended faceted indexing).

---

## 2. Indexable page map

**Should be indexable now or as defined rollout surfaces:**

- **Homepage (`/`)**
  - Role: brand + trust + primary navigation hub.
- **Listing detail pages (`/annonce/:id`)**
  - Role: highest commercial intent and unique inventory pages.
- **Transaction landings**
  - `acheter`, `location-longue-duree`, `location-courte-duree`
  - Role: high-intent commercial entry pages.
- **Vehicle category landings**
  - SUV/4x4, berline, citadine, pick-up, utilitaire, moto
  - Role: category-intent acquisition.
- **City landings (priority cities first)**
  - Role: local intent capture.
- **Category + city landings (curated combinations)**
  - Role: strongest blend of local + commercial demand.
- **Make pages (curated makes only)**
  - Role: brand-intent acquisition.
- **Make + model pages (curated)**
  - Role: high-specificity intent with conversion potential.
- **Agency/dealer pages (`/agence/:slug`, canonicalized from alternate route family)**
  - Role: dealer trust + stock discovery.
- **Estimation core page (`/estimation`)**
  - Role: product USP page and qualified acquisition entry.
- **High-quality guide pages (`/conseils/:slug`)**
  - Role: informational funnel support and internal linking.

Indexability guardrail per family:

- Require minimum inventory floor for inventory-driven pages.
- Require template quality and unique value blocks.
- Remove/redirect/noindex pages when inventory drops persistently below floor.

---

## 3. Noindex / canonical / UX-only page map

**Should not be primary index targets:**

- **Raw faceted search URLs** (`/recherche?...`)
  - Rule: `noindex,follow` by default for exploratory combinations.
- **Sort/view param variants** (`sort`, `view`)
  - Rule: canonicalize to base intended landing; do not index.
- **Deep filter stacks / multi-facet combinations**
  - Rule: noindex; do not create standalone SEO ownership.
- **Low-volume long-tail combinations**
  - Rule: noindex or do not publish as SEO pages.
- **Duplicate route families for same entity**
  - Rule: one canonical owner route (e.g., agencies).
- **Temporary campaign/search experiment pages**
  - Rule: noindex unless explicitly promoted to stable SEO template.

UX-only principle:

- If URL’s main purpose is “interactive filtering session,” it remains a UX utility URL, not an SEO landing page.

---

## 4. Priority page families (P1 / P2 / P3)

### P1 (highest priority)

- Listing detail pages (`/annonce/:id`)
- Transaction pages (acheter / location longue durée / location courte durée)
- Category pages
- Priority city pages
- Category + city curated pages

Why P1: strongest commercial signal, best alignment with existing inventory marketplace model.

### P2 (secondary growth)

- Make pages (curated, demand-backed)
- Make + model pages (only where inventory floor is consistently met)
- Agency/dealer pages
- Estimation core page optimization as marketplace feeder
- Top evergreen guides supporting P1/P2 pages

### P3 (later expansion)

- Make/model + city pages at broader scale (strict quality gates)
- Larger editorial cluster expansion
- Estimation derivative pages (make/model estimation) only after strong unique template proof

---

## 5. Recommended URL architecture

Target URL family design (clean, readable, canonical-safe):

- Homepage: `/`
- Search utility: `/recherche?...` (UX, mostly non-indexable)
- Transaction:
  - `/acheter`
  - `/location-longue-duree`
  - `/location-courte-duree`
- Category:
  - `/vehicules/suv-4x4`
  - `/vehicules/berline`
  - `/vehicules/citadine`
  - `/vehicules/pick-up`
  - `/vehicules/utilitaire`
  - `/vehicules/moto`
- City:
  - `/ville/antananarivo`
  - `/ville/toamasina`
  - `/ville/mahajanga`
- Category + city:
  - `/vehicules/suv-4x4/ville/antananarivo`
- Make:
  - `/marque/toyota`
- Make + model:
  - `/marque/toyota/modele/rav4`
- (Later) Make/model + city:
  - `/marque/toyota/modele/rav4/ville/antananarivo`
- Listing detail:
  - `/annonce/:id`
- Agency/dealer:
  - canonical owner: `/agence/:slug`
  - alternate route family canonicalized to owner
- Estimation:
  - `/estimation`
- Guides:
  - `/conseils/:slug`

URL rules:

- lowercase slugs, stable delimiters, one canonical per intent.
- no query-string dependence for indexable template ownership.

---

## 6. Facet policy alignment

Define ownership clearly:

- **Curated landing templates** -> indexable, internally linked, tracked as SEO assets.
- **Search filter combinations** -> UX exploration, noindex/canonicalized, not treated as SEO assets.

Policy:

- Keep whitelist of indexable template combinations.
- Any combination outside whitelist defaults to noindex.
- Canonical from filter variants to nearest owned landing template where applicable.
- Never let faceted URL count define SEO architecture.

This prevents:

- crawl budget waste,
- duplicate intent clusters,
- thin-page index bloat.

---

## 7. Estimation SEO positioning

Estimation should be positioned as a **core product page first**, not a mass long-tail farm.

Recommended sequence:

- **Now:** keep `/estimation` as a strong indexable flagship page.
- **Next:** connect estimation page contextually to marketplace hubs (transaction/category/city) via internal linking and user flow.
- **Later (conditional):** consider make/model estimation pages only if:
  - content is materially differentiated,
  - methodology/context is explicit,
  - thin template risk is controlled.

Avoid:

- mass “estimation by keyword” rollout before content and quality controls are proven.

---

## 8. Top risks to avoid

- Indexing raw faceted search URLs at scale.
- Launching long-tail landing families without inventory minimum thresholds.
- Canonical ambiguity across route families covering same intent/entity.
- Expanding make/model/city pages before template quality and uniqueness are established.
- Treating existence of pages as success instead of measuring indexable quality and commercial utility.
- Turning estimation into thin keyword pages disconnected from real product value.

---

## 9. SEO Ticket 9 recommendation

Implement the **P1 architecture only** with strict governance:

1. Launch canonical template families for:
   - transaction,
   - category,
   - city (priority set),
   - category + city (curated set),
   - listing details hardening.
2. Build/maintain a whitelist registry for indexable combinations.
3. Enforce inventory floor gating per template before indexation.
4. Align search URL policy so exploratory filter URLs remain noindex/canonicalized.
5. Add internal linking modules from homepage and key templates into P1 pages.
6. Keep tracking/reporting tied to template families (not random facet URLs).

Ticket 9 should produce implementation-ready rules and first production rollout for these P1 template families, without opening uncontrolled programmatic expansion.

