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
const envModeArg = process.argv.find((x) => x.startsWith("--env="));
const envModeRaw = (envModeArg ? envModeArg.split("=")[1] : process.env.SEO_VERIFY_ENV || "").toLowerCase().trim();

function resolveMode() {
  if (envModeRaw === "production" || envModeRaw === "prod") return "production";
  if (envModeRaw === "staging" || envModeRaw === "preview") return "staging";
  if (envModeRaw === "local" || envModeRaw === "dev") return "local";
  if (strict) return process.env.CI === "true" ? "production" : "staging";
  return "local";
}

const mode = resolveMode();

const DEFAULT_THRESHOLDS = {
  local: {
    minListingSitemapUrls: 1,
    minListingHtmlPages: 1,
    minHtmlVsSitemapRatio: 0.02,
    enforceInventoryCoverage: false,
  },
  staging: {
    minListingSitemapUrls: 50,
    minListingHtmlPages: 20,
    minHtmlVsSitemapRatio: 0.1,
    enforceInventoryCoverage: true,
  },
  production: {
    minListingSitemapUrls: 200,
    minListingHtmlPages: 100,
    minHtmlVsSitemapRatio: 0.2,
    enforceInventoryCoverage: true,
  },
};

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envFloat(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envBool(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return ["1", "true", "yes"].includes(raw.toLowerCase());
}

const modeDefaults = DEFAULT_THRESHOLDS[mode];
const thresholds = {
  minListingSitemapUrls: envInt("SEO_MIN_LISTING_SITEMAP_URLS", modeDefaults.minListingSitemapUrls),
  minListingHtmlPages: envInt("SEO_MIN_LISTING_HTML_PAGES", modeDefaults.minListingHtmlPages),
  minHtmlVsSitemapRatio: envFloat("SEO_MIN_HTML_VS_SITEMAP_RATIO", modeDefaults.minHtmlVsSitemapRatio),
  enforceInventoryCoverage: envBool("SEO_ENFORCE_INVENTORY_COVERAGE", modeDefaults.enforceInventoryCoverage),
};

function ok(msg) {
  console.log(`✅ ${msg}`);
}
function warn(msg) {
  console.warn(`⚠️ ${msg}`);
}
function fail(msg) {
  console.error(`❌ ${msg}`);
}

async function writeAuditReport(report) {
  const outPath = path.resolve(root, "artifacts", "seo-verify-report.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  return outPath;
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

async function listDistListingPages(limit = Infinity) {
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

  console.log(`[seo:verify] mode=${strict ? "STRICT" : "WARN"} env=${mode} site=${SITE_URL}`);
  console.log(
    `[seo:verify] thresholds: minListingSitemapUrls=${thresholds.minListingSitemapUrls}, minListingHtmlPages=${thresholds.minListingHtmlPages}, minHtmlVsSitemapRatio=${thresholds.minHtmlVsSitemapRatio}, enforceInventoryCoverage=${thresholds.enforceInventoryCoverage}`,
  );

  const issues = [];
  const addIssue = (level, code, message, details) => {
    issues.push({ level, code, message, details: details ?? null });
  };

  // --- sitemap.xml ---
  const sitemapIndexPath = path.resolve(publicDir, "sitemap.xml");
  if (!(await exists(sitemapIndexPath))) {
    fail("public/sitemap.xml is missing");
    addIssue("fail", "SITEMAP_INDEX_MISSING", "public/sitemap.xml is missing");
    process.exitCode = 1;
    const reportPath = await writeAuditReport({
      generatedAt: new Date().toISOString(),
      script: "scripts/seo/verify-seo.mjs",
      mode,
      strict,
      siteUrl: SITE_URL,
      thresholds,
      result: "fail",
      issues,
      metrics: {},
    });
    console.log(`[seo:verify] report=${path.relative(root, reportPath)}`);
    return;
  }
  ok("public/sitemap.xml exists");

  const sitemapIndexXml = await readText(sitemapIndexPath);
  const sitemapLocs = parseSitemapIndex(sitemapIndexXml);
  if (sitemapLocs.length === 0) {
    fail("sitemap.xml is not a sitemapindex or contains 0 <sitemap> entries");
    addIssue("fail", "SITEMAP_INDEX_EMPTY", "sitemap.xml is not a sitemapindex or contains 0 <sitemap> entries");
    process.exitCode = 1;
    const reportPath = await writeAuditReport({
      generatedAt: new Date().toISOString(),
      script: "scripts/seo/verify-seo.mjs",
      mode,
      strict,
      siteUrl: SITE_URL,
      thresholds,
      result: "fail",
      issues,
      metrics: {},
    });
    console.log(`[seo:verify] report=${path.relative(root, reportPath)}`);
    return;
  }
  ok(`sitemap index contains ${sitemapLocs.length} sub-sitemaps`);

  // --- inventory expectation policy ---
  const listingSitemaps = sitemapLocs.filter((loc) => /\/sitemaps\/listings-\d+\.xml$/i.test(loc));
  const agencySitemaps = sitemapLocs.filter((loc) => /\/sitemaps\/agencies-\d+\.xml$/i.test(loc));
  const inventoryExpected = hasEnv || thresholds.enforceInventoryCoverage;

  if (strict && thresholds.enforceInventoryCoverage && !hasEnv) {
    fail(`Missing required env for inventory SEO generation: ${requiredEnv.join(", ")}`);
    addIssue("fail", "REQUIRED_ENV_MISSING", `Missing required inventory SEO env vars: ${requiredEnv.join(", ")}`, {
      requiredEnv,
    });
    process.exitCode = 1;
    const reportPath = await writeAuditReport({
      generatedAt: new Date().toISOString(),
      script: "scripts/seo/verify-seo.mjs",
      mode,
      strict,
      siteUrl: SITE_URL,
      thresholds,
      result: "fail",
      issues,
      metrics: {
        sitemapSubSitemaps: sitemapLocs.length,
      },
    });
    console.log(`[seo:verify] report=${path.relative(root, reportPath)}`);
    return;
  }

  if (inventoryExpected) {
    if (listingSitemaps.length === 0) {
      (strict ? fail : warn)("No listings-*.xml sitemap present in sitemap index (inventory expected)");
      addIssue(
        strict ? "fail" : "warn",
        "LISTING_SITEMAP_MISSING",
        "No listings-*.xml sitemap present in sitemap index (inventory expected)",
      );
      if (strict) process.exitCode = 1;
    } else {
      ok(`Found ${listingSitemaps.length} listing sitemap(s) in index`);
    }
  } else {
    warn("Inventory not expected in this mode: coverage thresholds are informational only.");
    addIssue("warn", "INVENTORY_NOT_EXPECTED", "Inventory not expected in this mode: coverage thresholds are informational only.");
  }

  // Count listing sitemap URLs across all listing sitemaps.
  let totalListingUrls = 0;
  if (listingSitemaps.length > 0) {
    for (const loc of listingSitemaps) {
      const localPath = toLocalPublicPathFromLoc(loc);
      if (!localPath || !(await exists(localPath))) {
        (strict ? fail : warn)(`Listing sitemap file not found locally for ${loc}`);
        addIssue(strict ? "fail" : "warn", "LISTING_SITEMAP_FILE_MISSING", `Listing sitemap file not found locally for ${loc}`);
        if (strict) process.exitCode = 1;
        continue;
      }
      const xml = await readText(localPath);
      totalListingUrls += countSitemapUrls(xml);
    }
    ok(`Total listing sitemap URLs found: ${totalListingUrls}`);
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
    if (inventoryExpected && !present) {
      (strict ? fail : warn)(`Missing inventory artifact: public/${rel}`);
      addIssue(strict ? "fail" : "warn", "INVENTORY_ARTIFACT_MISSING", `Missing inventory artifact: public/${rel}`);
      if (strict) process.exitCode = 1;
    } else if (present) {
      ok(`public/${rel} exists`);
    } else {
      warn(`public/${rel} missing (ok in non-inventory builds)`);
    }
  }

  // --- dist listing HTML pages ---
  const pages = await listDistListingPages();
  const sampledPages = pages.slice(0, 10);
  if (inventoryExpected) {
    if (pages.length === 0) {
      (strict ? fail : warn)("No dist/annonce/<id>/index.html pages found (inventory expected)");
      addIssue(
        strict ? "fail" : "warn",
        "LISTING_HTML_MISSING",
        "No dist/annonce/<id>/index.html pages found (inventory expected)",
      );
      if (strict) process.exitCode = 1;
    } else {
      ok(`Found ${pages.length} listing HTML page(s) in dist`);
    }
  }

  if (sampledPages.length > 0) {
    const sample = sampledPages[0];
    const html = await readText(sample.filePath);
    const result = verifyListingHtmlPage(html);
    if (!result.ok) {
      (strict ? fail : warn)(
        `Listing HTML sample failed checks (missing: ${result.missing.join(", ")}): ${path.relative(root, sample.filePath)}`,
      );
      addIssue(
        strict ? "fail" : "warn",
        "LISTING_HTML_SAMPLE_FAILED",
        `Listing HTML sample failed checks: ${result.missing.join(", ")}`,
        { file: path.relative(root, sample.filePath), missing: result.missing },
      );
      if (strict) process.exitCode = 1;
    } else {
      ok(`Listing HTML sample passed checks: ${path.relative(root, sample.filePath)}`);
    }
  } else {
    warn("No listing HTML pages to sample (dist/annonce/*)");
    addIssue("warn", "LISTING_HTML_SAMPLE_SKIPPED", "No listing HTML pages to sample (dist/annonce/*)");
  }

  // --- threshold enforcement ---
  if (inventoryExpected) {
    if (totalListingUrls < thresholds.minListingSitemapUrls) {
      (strict ? fail : warn)(
        `Listing sitemap coverage too small: actual=${totalListingUrls}, expected>=${thresholds.minListingSitemapUrls}`,
      );
      addIssue(
        strict ? "fail" : "warn",
        "THRESHOLD_LISTING_SITEMAP_URLS",
        `Listing sitemap coverage too small: actual=${totalListingUrls}, expected>=${thresholds.minListingSitemapUrls}`,
      );
      if (strict) process.exitCode = 1;
    } else {
      ok(`Listing sitemap coverage threshold passed (${totalListingUrls} >= ${thresholds.minListingSitemapUrls})`);
    }

    if (pages.length < thresholds.minListingHtmlPages) {
      (strict ? fail : warn)(
        `Listing HTML coverage too small: actual=${pages.length}, expected>=${thresholds.minListingHtmlPages}`,
      );
      addIssue(
        strict ? "fail" : "warn",
        "THRESHOLD_LISTING_HTML_PAGES",
        `Listing HTML coverage too small: actual=${pages.length}, expected>=${thresholds.minListingHtmlPages}`,
      );
      if (strict) process.exitCode = 1;
    } else {
      ok(`Listing HTML coverage threshold passed (${pages.length} >= ${thresholds.minListingHtmlPages})`);
    }

    if (totalListingUrls > 0) {
      const ratio = pages.length / totalListingUrls;
      if (ratio < thresholds.minHtmlVsSitemapRatio) {
        (strict ? fail : warn)(
          `Listing HTML/sitemap ratio too low: actual=${ratio.toFixed(3)}, expected>=${thresholds.minHtmlVsSitemapRatio}`,
        );
        addIssue(
          strict ? "fail" : "warn",
          "THRESHOLD_HTML_SITEMAP_RATIO",
          `Listing HTML/sitemap ratio too low: actual=${ratio.toFixed(3)}, expected>=${thresholds.minHtmlVsSitemapRatio}`,
        );
        if (strict) process.exitCode = 1;
      } else {
        ok(
          `Listing HTML/sitemap ratio threshold passed (${ratio.toFixed(3)} >= ${thresholds.minHtmlVsSitemapRatio})`,
        );
      }
    } else {
      warn("Cannot compute HTML/sitemap ratio because listing sitemap URL count is 0.");
      addIssue("warn", "RATIO_SKIPPED_NO_SITEMAP_URLS", "Cannot compute HTML/sitemap ratio because listing sitemap URL count is 0.");
    }
  }

  // --- agencies (optional) ---
  if (inventoryExpected && agencySitemaps.length === 0) {
    warn("No agencies-*.xml sitemap present in sitemap index (inventory expected). Optional unless agencies SEO is required.");
    addIssue(
      "warn",
      "AGENCY_SITEMAP_MISSING",
      "No agencies-*.xml sitemap present in sitemap index (inventory expected). Optional unless agencies SEO is required.",
    );
  }

  const resultStatus = process.exitCode && process.exitCode !== 0 ? "fail" : issues.some((x) => x.level === "warn") ? "warn" : "pass";
  const reportPath = await writeAuditReport({
    generatedAt: new Date().toISOString(),
    script: "scripts/seo/verify-seo.mjs",
    mode,
    strict,
    siteUrl: SITE_URL,
    thresholds,
    result: resultStatus,
    requiredEnv,
    envPresence: requiredEnv.map((key) => ({ key, present: String(process.env[key] || "").trim().length > 0 })),
    metrics: {
      sitemapSubSitemaps: sitemapLocs.length,
      listingSitemaps: listingSitemaps.length,
      agencySitemaps: agencySitemaps.length,
      totalListingUrls,
      listingHtmlPages: pages.length,
      htmlVsSitemapRatio: totalListingUrls > 0 ? Number((pages.length / totalListingUrls).toFixed(6)) : null,
    },
    issues,
  });
  console.log(`[seo:verify] report=${path.relative(root, reportPath)}`);

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

