import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SITE_URL = "https://autonex.mg";
const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const MAX_URLS_PER_SITEMAP = 45000;
const PAGE_SIZE = 1000;
const PRERENDER_LISTING_LIMIT = Number.parseInt(process.env.PRERENDER_LISTING_LIMIT || "5000", 10);
const PRERENDER_AGENCY_LIMIT = Number.parseInt(process.env.PRERENDER_AGENCY_LIMIT || "1000", 10);
const LISTING_HTML_LIMIT = Number.parseInt(process.env.LISTING_HTML_LIMIT || "50000", 10);

// Must match `src/data/agencies.ts` seed. Kept local to avoid TS import at build time.
const PARTNER_DEALER_SLUGS = ["oceantrade"];

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function isoDate(d) {
  if (!d) return undefined;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

function makeUrl(loc, { lastmod, changefreq, priority } = {}) {
  const items = [
    `<loc>${escapeXml(loc)}</loc>`,
    lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : "",
    changefreq ? `<changefreq>${escapeXml(changefreq)}</changefreq>` : "",
    typeof priority === "number" ? `<priority>${priority.toFixed(1)}</priority>` : "",
  ].filter(Boolean);
  return `<url>${items.join("")}</url>`;
}

function makeUrlset(urlEntries) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urlEntries,
    `</urlset>`,
    ``,
  ].join("\n");
}

function makeSitemapIndex(sitemaps) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...sitemaps.map(({ loc, lastmod }) => {
      const items = [`<loc>${escapeXml(loc)}</loc>`, lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""].filter(
        Boolean,
      );
      return `<sitemap>${items.join("")}</sitemap>`;
    }),
    `</sitemapindex>`,
    ``,
  ].join("\n");
}

function normalizeSiteUrl(url) {
  return String(url || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

async function writePublicFile(rel, content) {
  const root = path.resolve(__dirname, "..", "..");
  const outPath = path.resolve(root, "public", rel);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, content, "utf8");
  return outPath;
}

async function appendPublicFile(rel, content) {
  const root = path.resolve(__dirname, "..", "..");
  const outPath = path.resolve(root, "public", rel);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.appendFile(outPath, content, "utf8");
  return outPath;
}

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function listSitemapFiles(relDir, prefix) {
  const root = path.resolve(__dirname, "..", "..");
  const absDir = path.resolve(root, "public", relDir);
  try {
    const files = await fs.readdir(absDir);
    return files.filter((f) => f.startsWith(prefix) && f.endsWith(".xml")).map((f) => path.join(relDir, f));
  } catch {
    return [];
  }
}

function canonicalAgencyPath(slug) {
  return PARTNER_DEALER_SLUGS.includes(slug) ? `/concessionnaires/${slug}` : `/agence/${slug}`;
}

function truncateText(s, max = 160) {
  const raw = String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trimEnd()}…`;
}

async function main() {
  const root = path.resolve(__dirname, "..", "..");
  const publicDir = path.resolve(root, "public");
  const nowIso = new Date().toISOString();

  const sitemaps = [];
  const staticUrls = [
    makeUrl(`${SITE_URL}/`, { changefreq: "daily", priority: 1.0 }),
    makeUrl(`${SITE_URL}/recherche`, { changefreq: "hourly", priority: 0.8 }),
    makeUrl(`${SITE_URL}/agences`, { changefreq: "daily", priority: 0.7 }),
    makeUrl(`${SITE_URL}/estimation`, { changefreq: "weekly", priority: 0.6 }),
    makeUrl(`${SITE_URL}/conseils`, { changefreq: "weekly", priority: 0.5 }),
  ];

  await writePublicFile("sitemaps/static.xml", makeUrlset(staticUrls));
  sitemaps.push({ loc: `${SITE_URL}/sitemaps/static.xml`, lastmod: nowIso });

  const hasSupabase = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

  // Always generate a prerender data+routes file if cache exists.
  const cachedListingDataPath = path.join(publicDir, "sitemaps", "listings-prerender-data-cache.json");
  const cachedAgencyDataPath = path.join(publicDir, "sitemaps", "agencies-prerender-data-cache.json");
  const cachedPrerenderRoutesPath = path.join(publicDir, "sitemaps", "prerender-routes.json");
  const cachedListingData = await readJsonSafe(cachedListingDataPath, null);
  const cachedAgencyData = await readJsonSafe(cachedAgencyDataPath, null);
  const cachedPrerenderRoutes = await readJsonSafe(cachedPrerenderRoutesPath, null);

  if (!hasSupabase) {
    // Production-safety: do not drop inventory sitemaps if they already exist.
    const listingSitemapFiles = await listSitemapFiles("sitemaps", "listings-");
    const agencySitemapFiles = await listSitemapFiles("sitemaps", "agencies-");

    // Keep existing listing/agencies sitemaps in index when present.
    for (const rel of [...listingSitemapFiles, ...agencySitemapFiles]) {
      const abs = path.resolve(root, "public", rel);
      const st = fssync.existsSync(abs) ? fssync.statSync(abs) : null;
      const lastmod = st?.mtime ? st.mtime.toISOString() : nowIso;
      sitemaps.push({ loc: `${SITE_URL}/${rel.replace(/\\/g, "/")}`, lastmod });
    }

    await writePublicFile("sitemap.xml", makeSitemapIndex(sitemaps));

    const staticRoutes = ["/", "/recherche", "/agences", "/estimation", "/conseils"];
    const listingRoutes = cachedListingData && typeof cachedListingData === "object"
      ? Object.keys(cachedListingData).map((id) => `/annonce/${id}`)
      : [];
    const agencyRoutes = cachedAgencyData && typeof cachedAgencyData === "object"
      ? Object.keys(cachedAgencyData).map((slug) => canonicalAgencyPath(slug))
      : [];

    const prerenderRoutes = Array.from(new Set([...staticRoutes, ...listingRoutes, ...agencyRoutes]));
    await writePublicFile("sitemaps/prerender-routes.json", JSON.stringify(prerenderRoutes, null, 2));

    console.warn(
      `[generate-sitemaps] Missing env (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). Kept existing inventory sitemaps if any, and used cached prerender data if available. indexSitemaps=${sitemaps.length}`,
    );
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const listingSitemapRefs = [];
  const agencySitemapRefs = [];

  // Inventory prerender data (meta/structured data) for HTML injection.
  let listingsPrerender = cachedListingData && typeof cachedListingData === "object" ? cachedListingData : {};
  let agenciesPrerender = cachedAgencyData && typeof cachedAgencyData === "object" ? cachedAgencyData : {};

  const listingPrerenderIds = Object.keys(listingsPrerender).slice(0, PRERENDER_LISTING_LIMIT);
  const agencyPrerenderSlugs = Object.keys(agenciesPrerender).slice(0, PRERENDER_AGENCY_LIMIT);

  // Prune cached maps so route coverage stays aligned with postbuild data volume.
  listingsPrerender = Object.fromEntries(listingPrerenderIds.map((id) => [id, listingsPrerender[id]]));
  agenciesPrerender = Object.fromEntries(agencyPrerenderSlugs.map((slug) => [slug, agenciesPrerender[slug]]));

  // --- Listings sitemaps (stream/chunk) ---
  let listingChunk = [];
  let listingChunkIndex = 1;
  let listingCount = 0;
  let listingHtmlCount = 0;

  // Reset HTML data export at each successful env-present run.
  await writePublicFile("sitemaps/listings-html-data.jsonl", "");

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("listings")
      .select(
        [
          "id",
          "updated_at",
          "created_at",
          "status",
          "title",
          "description",
          "transaction",
          "type",
          "ville",
          "region",
          "price_mga",
          "mileage_km",
          "year",
          "make",
          "model",
          "fuel",
          "body_style",
          "vehicle_condition",
        ].join(","),
      )
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!row?.id) continue;
      listingCount += 1;

      const loc = `${SITE_URL}/annonce/${row.id}`;
      listingChunk.push(
        makeUrl(loc, {
          lastmod: isoDate(row.updated_at),
          changefreq: "daily",
          priority: 0.9,
        }),
      );

      if (
        Object.keys(listingsPrerender).length < PRERENDER_LISTING_LIMIT &&
        !listingsPrerender[row.id]
      ) {
        listingsPrerender[row.id] = {
          id: row.id,
          canonical: loc,
          title: row.title ? `${row.title} — AutoNex` : "Annonce — AutoNex",
          description: truncateText(
            [row.price_mga ? `${Number(row.price_mga).toLocaleString("fr-FR")} Ar` : "", row.ville || "Madagascar", row.description || ""].filter(Boolean).join(" — "),
            160,
          ),
          imageUrl: undefined, // filled later
          ville: row.ville,
          region: row.region,
          priceMga: row.price_mga,
          currency: "MGA",
          createdAt: row.created_at,
          transaction: row.transaction,
          listingType: row.type,
          year: row.year,
          make: row.make,
          model: row.model,
          mileageKm: row.mileage_km,
          fuel: row.fuel,
          bodyStyle: row.body_style,
          vehicleCondition: row.vehicle_condition,
          status: row.status,
        };
        listingPrerenderIds.push(row.id);
      }

      if (listingHtmlCount < LISTING_HTML_LIMIT) {
        listingHtmlCount += 1;
        await appendPublicFile(
          "sitemaps/listings-html-data.jsonl",
          `${JSON.stringify({
            id: row.id,
            canonical: loc,
            title: row.title ? `${row.title} — AutoNex` : "Annonce — AutoNex",
            description: truncateText(
              [
                row.price_mga ? `${Number(row.price_mga).toLocaleString("fr-FR")} Ar` : "",
                row.ville || row.region || "Madagascar",
                row.description || "",
              ]
                .filter(Boolean)
                .join(" — "),
              320,
            ),
            priceMga: row.price_mga,
            currency: "MGA",
            ville: row.ville,
            region: row.region,
            transaction: row.transaction,
            listingType: row.type,
            year: row.year,
            make: row.make,
            model: row.model,
            mileageKm: row.mileage_km,
            fuel: row.fuel,
            bodyStyle: row.body_style,
            vehicleCondition: row.vehicle_condition,
            status: row.status,
            updatedAt: row.updated_at,
          })}\n`,
        );
      }

      if (listingChunk.length >= MAX_URLS_PER_SITEMAP) {
        const rel = `sitemaps/listings-${listingChunkIndex}.xml`;
        await writePublicFile(rel, makeUrlset(listingChunk));
        listingSitemapRefs.push({ loc: `${SITE_URL}/${rel}`, lastmod: nowIso });
        listingChunk = [];
        listingChunkIndex += 1;
      }
    }
  }

  if (listingChunk.length > 0) {
    const rel = `sitemaps/listings-${listingChunkIndex}.xml`;
    await writePublicFile(rel, makeUrlset(listingChunk));
    listingSitemapRefs.push({ loc: `${SITE_URL}/${rel}`, lastmod: nowIso });
  }

  // --- Fill listing images for prerender set only ---
  if (listingPrerenderIds.length > 0) {
    const ids = listingPrerenderIds;
    const firstPhotoById = new Map();
    for (let i = 0; i < ids.length; i += 800) {
      const slice = ids.slice(i, i + 800);
      const { data, error } = await supabase
        .from("listing_photos")
        .select("listing_id,url,position")
        .in("listing_id", slice)
        .order("position", { ascending: true });
      if (error) throw error;
      for (const p of data || []) {
        const cur = firstPhotoById.get(p.listing_id);
        if (!cur || (p.position != null && p.position < cur.position)) {
          firstPhotoById.set(p.listing_id, p);
        }
      }
    }

    for (const id of listingPrerenderIds) {
      const p = firstPhotoById.get(id);
      if (!p?.url) continue;
      const url = p.url.startsWith("http") ? p.url : `${SITE_URL}${p.url}`;
      if (listingsPrerender[id]) listingsPrerender[id].imageUrl = url;
    }
  }

  // Persist prerender data for postbuild consumption
  await writePublicFile("sitemaps/listings-prerender-data.json", JSON.stringify(listingsPrerender, null, 2));
  await writePublicFile("sitemaps/listings-prerender-data-cache.json", JSON.stringify(listingsPrerender, null, 2));
  await writePublicFile("sitemaps/listings-html-data-cache.jsonl", await fs.readFile(path.join(publicDir, "sitemaps", "listings-html-data.jsonl"), "utf8"));

  // Include listing sitemap refs in index
  for (const r of listingSitemapRefs) sitemaps.push(r);

  // --- Agencies sitemaps (stream/chunk) ---
  let agencyChunk = [];
  let agencyChunkIndex = 1;
  let agencyCount = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("agencies")
      .select(["slug", "updated_at", "name", "bio", "logo_url", "city", "area"].join(","))
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!row?.slug) continue;
      agencyCount += 1;

      const slug = String(row.slug);
      const canonicalPath = canonicalAgencyPath(slug);
      const loc = `${SITE_URL}${canonicalPath}`;
      agencyChunk.push(
        makeUrl(loc, {
          lastmod: isoDate(row.updated_at),
          changefreq: "weekly",
          priority: 0.6,
        }),
      );

      if (Object.keys(agenciesPrerender).length < PRERENDER_AGENCY_LIMIT && !agenciesPrerender[slug]) {
        agenciesPrerender[slug] = {
          slug,
          canonical: loc,
          title: row.name ? `${row.name} — AutoNex` : "Concessionnaire — AutoNex",
          description: truncateText([row.city, row.area].filter(Boolean).join(", ") + " — " + (row.bio || ""), 160) || "Profil concessionnaire AutoNex.",
          imageUrl: row.logo_url
            ? row.logo_url.startsWith("http")
              ? row.logo_url
              : `${SITE_URL}${row.logo_url}`
            : undefined,
          city: row.city,
          area: row.area,
          name: row.name,
          bio: row.bio,
        };
        agencyPrerenderSlugs.push(slug);
      }

      if (agencyChunk.length >= MAX_URLS_PER_SITEMAP) {
        const rel = `sitemaps/agencies-${agencyChunkIndex}.xml`;
        await writePublicFile(rel, makeUrlset(agencyChunk));
        agencySitemapRefs.push({ loc: `${SITE_URL}/${rel}`, lastmod: nowIso });
        agencyChunk = [];
        agencyChunkIndex += 1;
      }
    }
  }

  if (agencyChunk.length > 0) {
    const rel = `sitemaps/agencies-${agencyChunkIndex}.xml`;
    await writePublicFile(rel, makeUrlset(agencyChunk));
    agencySitemapRefs.push({ loc: `${SITE_URL}/${rel}`, lastmod: nowIso });
  }

  await writePublicFile("sitemaps/agencies-prerender-data.json", JSON.stringify(agenciesPrerender, null, 2));
  await writePublicFile("sitemaps/agencies-prerender-data-cache.json", JSON.stringify(agenciesPrerender, null, 2));

  for (const r of agencySitemapRefs) sitemaps.push(r);

  // Write sitemap index
  await writePublicFile("sitemap.xml", makeSitemapIndex(sitemaps));

  const staticRoutes = ["/", "/recherche", "/agences", "/estimation", "/conseils"];
  const listingRoutes = listingPrerenderIds.map((id) => `/annonce/${id}`);
  const agencyRoutes = agencyPrerenderSlugs.map((slug) => canonicalAgencyPath(slug));

  const prerenderRoutes = Array.from(new Set([...staticRoutes, ...listingRoutes, ...agencyRoutes]));
  await writePublicFile("sitemaps/prerender-routes.json", JSON.stringify(prerenderRoutes, null, 2));

  console.log(
    `[generate-sitemaps] Wrote sitemap index. static=1 inventory sitemaps=${listingSitemapRefs.length + agencySitemapRefs.length} listings=${listingCount} agencies=${agencyCount} prerenderListings=${listingPrerenderIds.length} prerenderAgencies=${agencyPrerenderSlugs.length} listingHtml=${listingHtmlCount}`,
  );
}

main().catch((err) => {
  console.error("[generate-sitemaps] Failed", err);
  process.exitCode = 1;
});

