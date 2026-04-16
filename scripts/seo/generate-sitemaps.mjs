import fs from "node:fs/promises";
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
      const items = [
        `<loc>${escapeXml(loc)}</loc>`,
        lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : "",
      ].filter(Boolean);
      return `<sitemap>${items.join("")}</sitemap>`;
    }),
    `</sitemapindex>`,
    ``,
  ].join("\n");
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function writePublicFile(rel, content) {
  const root = path.resolve(__dirname, "..", "..");
  const outPath = path.resolve(root, "public", rel);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, content, "utf8");
  return outPath;
}

async function fetchListingsForSitemap(supabase) {
  const listings = [];
  let from = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from("listings")
      .select("id,updated_at,status")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (!row?.id) continue;
      listings.push({ id: row.id, updated_at: row.updated_at || undefined });
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return listings;
}

async function fetchAgenciesForSitemap(supabase) {
  const agencies = [];
  let from = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from("agencies")
      .select("slug,updated_at")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (!row?.slug) continue;
      agencies.push({ slug: row.slug, updated_at: row.updated_at || undefined });
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return agencies;
}

async function main() {
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
  if (!hasSupabase) {
    await writePublicFile("sitemap.xml", makeSitemapIndex(sitemaps));
    await writePublicFile(
      "sitemaps/prerender-routes.json",
      JSON.stringify(["/", "/recherche", "/agences", "/estimation", "/conseils"], null, 2),
    );
    console.warn(
      "[generate-sitemaps] Missing env (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). Generated static sitemap only.",
    );
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [listings, agencies] = await Promise.all([
    fetchListingsForSitemap(supabase),
    fetchAgenciesForSitemap(supabase),
  ]);

  const listingUrls = listings.map((l) =>
    makeUrl(`${SITE_URL}/annonce/${l.id}`, {
      lastmod: isoDate(l.updated_at),
      changefreq: "daily",
      priority: 0.9,
    }),
  );

  const listingChunks = chunk(listingUrls, MAX_URLS_PER_SITEMAP);
  for (let i = 0; i < listingChunks.length; i += 1) {
    const rel = `sitemaps/listings-${i + 1}.xml`;
    await writePublicFile(rel, makeUrlset(listingChunks[i]));
    sitemaps.push({ loc: `${SITE_URL}/${rel}`, lastmod: nowIso });
  }

  const agencyUrls = agencies.map((a) =>
    makeUrl(`${SITE_URL}/agence/${encodeURIComponent(a.slug)}`, {
      lastmod: isoDate(a.updated_at),
      changefreq: "weekly",
      priority: 0.6,
    }),
  );
  const agencyChunks = chunk(agencyUrls, MAX_URLS_PER_SITEMAP);
  for (let i = 0; i < agencyChunks.length; i += 1) {
    const rel = `sitemaps/agencies-${i + 1}.xml`;
    await writePublicFile(rel, makeUrlset(agencyChunks[i]));
    sitemaps.push({ loc: `${SITE_URL}/${rel}`, lastmod: nowIso });
  }

  await writePublicFile("sitemap.xml", makeSitemapIndex(sitemaps));

  const prerenderRoutes = [
    "/",
    "/recherche",
    "/agences",
    "/estimation",
    "/conseils",
    ...listings.slice(0, 150).map((l) => `/annonce/${l.id}`),
    ...agencies.slice(0, 50).map((a) => `/agence/${a.slug}`),
  ];
  await writePublicFile("sitemaps/prerender-routes.json", JSON.stringify(prerenderRoutes, null, 2));

  console.log(
    `[generate-sitemaps] Wrote sitemap index with ${sitemaps.length} sitemaps. listings=${listings.length} agencies=${agencies.length}`,
  );
}

main().catch((err) => {
  console.error("[generate-sitemaps] Failed", err);
  process.exitCode = 1;
});

