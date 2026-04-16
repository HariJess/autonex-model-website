import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..", "..");
const publicDir = path.resolve(root, "public");
const distDir = path.resolve(root, "dist");

const DEFAULT_SITE_URL = "https://autonex.mg";
const SITE_URL = String(process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict") || process.env.SEO_STRICT === "1" || process.env.CI === "true";

function ok(msg) {
  console.log(`✅ ${msg}`);
}
function warn(msg) {
  console.warn(`⚠️ ${msg}`);
}
function fail(msg) {
  console.error(`❌ ${msg}`);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

function extractAll(regex, text) {
  const out = [];
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = regex.exec(text))) out.push(m);
  return out;
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function countSitemapUrls(xml) {
  // very small parser, OK for verification
  return extractAll(/<url\b/gi, xml).length;
}

function parseSitemapIndex(xml) {
  const locs = extractAll(/<sitemap>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi, xml).map((m) => m[1].trim());
  return unique(locs);
}

function toLocalPublicPathFromLoc(loc) {
  if (!loc) return null;
  if (loc.startsWith(SITE_URL)) {
    const rel = loc.slice(SITE_URL.length).replace(/^\/+/, "");
    return path.resolve(root, "public", rel);
  }
  // allow relative (defensive)
  if (loc.startsWith("/")) return path.resolve(root, "public", loc.replace(/^\/+/, ""));
  return null;
}

async function listDistListingPages(limit = 50) {
  const annonceDir = path.resolve(distDir, "annonce");
  if (!fssync.existsSync(annonceDir)) return [];
  const ids = (await fs.readdir(annonceDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const pages = [];
  for (const id of ids) {
    const filePath = path.resolve(annonceDir, id, "index.html");
    if (fssync.existsSync(filePath)) pages.push({ id, filePath });
    if (pages.length >= limit) break;
  }
  return pages;
}

function verifyListingHtmlPage(html) {
  const checks = {
    canonical: /<link\s+rel=["']canonical["'][^>]*href=["'][^"']+["'][^>]*>/i.test(html),
    title: /<title>[^<]{3,}<\/title>/i.test(html),
    metaDescription: /<meta\s+name=["']description["'][^>]*content=["'][^"']{20,}["'][^>]*>/i.test(html),
    jsonLd: /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]{20,}<\/script>/i.test(html),
    seoStaticVisible: /<main\s+class=["'][^"']*\bseo-static\b[^"']*["'][^>]*>[\s\S]{40,}<\/main>/i.test(html),
  };
  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  return { ok: missing.length === 0, missing, checks };
}

async function main() {
  const requiredEnv = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
  const hasEnv = requiredEnv.every((k) => String(process.env[k] || "").trim().length > 0);

  console.log(`[seo:verify] mode=${strict ? "STRICT" : "WARN"} site=${SITE_URL}`);

  // --- sitemap.xml ---
  const sitemapIndexPath = path.resolve(publicDir, "sitemap.xml");
  if (!(await exists(sitemapIndexPath))) {
    fail("public/sitemap.xml is missing");
    process.exitCode = 1;
    return;
  }
  ok("public/sitemap.xml exists");

  const sitemapIndexXml = await readText(sitemapIndexPath);
  const sitemapLocs = parseSitemapIndex(sitemapIndexXml);
  if (sitemapLocs.length === 0) {
    fail("sitemap.xml is not a sitemapindex or contains 0 <sitemap> entries");
    process.exitCode = 1;
    return;
  }
  ok(`sitemap index contains ${sitemapLocs.length} sub-sitemaps`);

  // --- listing sitemaps expected when env is present in strict mode ---
  const listingSitemaps = sitemapLocs.filter((loc) => /\/sitemaps\/listings-\d+\.xml$/i.test(loc));
  const agencySitemaps = sitemapLocs.filter((loc) => /\/sitemaps\/agencies-\d+\.xml$/i.test(loc));

  if (strict && !hasEnv) {
    fail(`Missing required env for inventory SEO generation: ${requiredEnv.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  if (hasEnv) {
    if (listingSitemaps.length === 0) {
      (strict ? fail : warn)("No listings-*.xml sitemap present in sitemap index (env present)");
      if (strict) process.exitCode = 1;
    } else {
      ok(`Found ${listingSitemaps.length} listing sitemap(s) in index`);
    }
  } else {
    warn("Inventory env not present: skipping hard requirements for inventory sitemaps/html");
  }

  // Validate listing sitemap url count > 0 (sample first)
  if (listingSitemaps.length > 0) {
    const localPath = toLocalPublicPathFromLoc(listingSitemaps[0]);
    if (!localPath || !(await exists(localPath))) {
      (strict ? fail : warn)(`Listing sitemap file not found locally for ${listingSitemaps[0]}`);
      if (strict) process.exitCode = 1;
    } else {
      const xml = await readText(localPath);
      const urlCount = countSitemapUrls(xml);
      if (urlCount <= 0) {
        (strict ? fail : warn)(`Listing sitemap contains 0 <url>: ${path.relative(root, localPath)}`);
        if (strict) process.exitCode = 1;
      } else {
        ok(`Listing sitemap sample contains ${urlCount} <url> entries`);
      }
    }
  }

  // --- inventory artifacts (public) ---
  const artifacts = [
    "sitemaps/prerender-routes.json",
    "sitemaps/listings-prerender-data-cache.json",
    "sitemaps/listings-html-data-cache.jsonl",
  ];
  for (const rel of artifacts) {
    const p = path.resolve(publicDir, rel);
    const present = await exists(p);
    if (hasEnv && !present) {
      (strict ? fail : warn)(`Missing inventory artifact: public/${rel}`);
      if (strict) process.exitCode = 1;
    } else if (present) {
      ok(`public/${rel} exists`);
    } else {
      warn(`public/${rel} missing (ok in non-inventory builds)`);
    }
  }

  // --- dist listing HTML pages ---
  const pages = await listDistListingPages(10);
  if (hasEnv) {
    if (pages.length === 0) {
      (strict ? fail : warn)("No dist/annonce/<id>/index.html pages found (env present)");
      if (strict) process.exitCode = 1;
    } else {
      ok(`Found ${pages.length}+ listing HTML page(s) in dist (sampled)`);
    }
  }

  if (pages.length > 0) {
    const sample = pages[0];
    const html = await readText(sample.filePath);
    const result = verifyListingHtmlPage(html);
    if (!result.ok) {
      (strict ? fail : warn)(
        `Listing HTML sample failed checks (missing: ${result.missing.join(", ")}): ${path.relative(root, sample.filePath)}`,
      );
      if (strict) process.exitCode = 1;
    } else {
      ok(`Listing HTML sample passed checks: ${path.relative(root, sample.filePath)}`);
    }
  } else {
    warn("No listing HTML pages to sample (dist/annonce/*)");
  }

  // --- agencies (optional) ---
  if (hasEnv && agencySitemaps.length === 0) {
    warn("No agencies-*.xml sitemap present in sitemap index (env present). This is optional unless agencies SEO is required.");
  }

  if (process.exitCode && process.exitCode !== 0) {
    fail("SEO verification failed.");
    return;
  }

  ok("SEO verification passed.");
}

main().catch((err) => {
  fail(`Unexpected error: ${err?.message || String(err)}`);
  process.exitCode = 1;
});

