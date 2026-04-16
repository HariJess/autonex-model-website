import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SITE_URL = "https://autonex.mg";
const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s, max = 160) {
  const v = stripTags(s);
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1).trimEnd()}…`;
}

function ensureTag(html, tagName, attrs, content) {
  const headClose = html.indexOf("</head>");
  if (headClose === -1) return html;
  const tag = content == null
    ? `<${tagName}${attrs ? ` ${attrs}` : ""}>`
    : `<${tagName}${attrs ? ` ${attrs}` : ""}>${content}</${tagName}>`;
  return `${html.slice(0, headClose)}\n    ${tag}\n${html.slice(headClose)}`;
}

function ensureStaticSeoCss(html) {
  if (html.includes("/* autonex-seo-static */")) return html;
  return ensureTag(
    html,
    "style",
    "",
    `/* autonex-seo-static */\n.seo-static{padding:16px;max-width:1100px;margin:0 auto;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial;}\n.seo-static h1{font-size:24px;line-height:1.2;margin:0 0 8px;font-family:ui-serif,Georgia;}\n.seo-static .meta{color:rgba(255,255,255,.72);font-size:14px;margin:0 0 10px;}\n.seo-static .price{font-size:22px;font-weight:700;margin:0 0 10px;}\n.seo-static dl{display:grid;grid-template-columns:160px 1fr;gap:6px 12px;margin:12px 0 0;}\n.seo-static dt{color:rgba(255,255,255,.65)}\n.seo-static dd{margin:0}\n.seo-static .desc{margin-top:12px;color:rgba(255,255,255,.78);line-height:1.6;white-space:pre-wrap;}\nhtml.js .seo-static{display:none;}\n`,
  );
}

function upsertMeta(html, { title, description, canonical, ogImage, ogType = "article" }) {
  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Description
  if (/<meta\s+name=["']description["']/i.test(out)) {
    out = out.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}">`,
    );
  } else {
    out = ensureTag(out, "meta", `name="description" content="${escapeHtml(description)}"`, null);
  }

  // Canonical
  if (/<link\s+rel=["']canonical["']/i.test(out)) {
    out = out.replace(
      /<link\s+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    );
  } else {
    out = ensureTag(out, "link", `rel="canonical" href="${escapeHtml(canonical)}"`, null);
  }

  // OG basics
  const upsertOg = (property, value) => {
    if (new RegExp(`<meta\\s+property=["']${property}["']`, "i").test(out)) {
      out = out.replace(
        new RegExp(`<meta\\s+property=["']${property}["'][^>]*>`, "i"),
        `<meta property="${property}" content="${escapeHtml(value)}">`,
      );
    } else {
      out = ensureTag(out, "meta", `property="${property}" content="${escapeHtml(value)}"`, null);
    }
  };
  upsertOg("og:type", ogType);
  upsertOg("og:title", title);
  upsertOg("og:description", description);
  upsertOg("og:url", canonical);
  if (ogImage) upsertOg("og:image", ogImage);

  // Twitter basics
  const upsertTwitter = (name, value) => {
    if (new RegExp(`<meta\\s+name=["']${name}["']`, "i").test(out)) {
      out = out.replace(
        new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, "i"),
        `<meta name="${name}" content="${escapeHtml(value)}">`,
      );
    } else {
      out = ensureTag(out, "meta", `name="${name}" content="${escapeHtml(value)}"`, null);
    }
  };
  upsertTwitter("twitter:card", "summary_large_image");
  upsertTwitter("twitter:title", title);
  upsertTwitter("twitter:description", description);
  if (ogImage) upsertTwitter("twitter:image", ogImage);

  return out;
}

function ensureNoscript(html, snippet) {
  const marker = '<div id="root"></div>';
  if (html.includes(marker)) {
    return html.replace(marker, `${marker}\n  ${snippet}\n`);
  }
  // Fallback: put before </body>
  return html.replace(/<\/body>/i, `${snippet}\n</body>`);
}

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeRoute(route) {
  if (!route.startsWith("/")) return `/${route}`;
  return route;
}

function distPathForRoute(distDir, route) {
  const r = normalizeRoute(route);
  if (r === "/") return path.join(distDir, "index.html");
  const rel = r.replace(/^\/+/, "");
  return path.join(distDir, rel, "index.html");
}

function isListingRoute(route) {
  return /^\/annonce\/[0-9a-f-]{36}$/i.test(route);
}

function isAgencyRoute(route) {
  return /^\/agence\/[^/]+$/i.test(route);
}

function buildListingJsonLd(data, canonical) {
  const name = data.title?.replace(/\s*—\s*AutoNex$/i, "") || "Annonce AutoNex";
  const mileage =
    typeof data.mileageKm === "number" && data.mileageKm > 0
      ? {
          "@type": "QuantitativeValue",
          value: data.mileageKm,
          unitText: "km",
        }
      : undefined;

  const availability =
    data.status === "active" || data.status === "published" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: data.description,
    url: canonical,
    image: data.imageUrl ? [data.imageUrl] : undefined,
    brand: data.make ? { "@type": "Brand", name: data.make } : undefined,
    model: data.model || undefined,
    vehicleModelDate: data.year || undefined,
    mileageFromOdometer: mileage,
    category: data.listingType || undefined,
    address:
      data.ville || data.region
        ? {
            "@type": "PostalAddress",
            addressLocality: data.ville || undefined,
            addressRegion: data.region || undefined,
            addressCountry: "MG",
          }
        : undefined,
    offers: {
      "@type": "Offer",
      price: typeof data.priceMga === "number" ? data.priceMga : undefined,
      priceCurrency: data.currency || "MGA",
      availability,
      url: canonical,
    },
  };
}

function buildAgencyJsonLd(data, canonical) {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.name || "AutoNex",
    url: canonical,
  };
  if (data.imageUrl) org.logo = data.imageUrl;
  return org;
}

function insertStaticMain(html, mainHtml) {
  const marker = '<div id="root"></div>';
  if (html.includes(marker)) {
    return html.replace(marker, `${mainHtml}\n    ${marker}`);
  }
  return html.replace(/<body>/i, `<body>\n${mainHtml}\n`);
}

function formatPriceMga(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
  return `${value.toLocaleString("fr-FR")} Ar`;
}

function safeText(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function buildStaticListingMain(data) {
  const title = safeText(data.title || "Annonce — AutoNex");
  const price = formatPriceMga(data.priceMga);
  const location = safeText([data.ville, data.region].filter(Boolean).join(", ") || "Madagascar");
  const transaction = safeText(data.transaction || "");
  const listingType = safeText(data.listingType || "");
  const makeModel = safeText([data.make, data.model].filter(Boolean).join(" "));
  const year = data.year ? safeText(data.year) : "";
  const mileage = typeof data.mileageKm === "number" && data.mileageKm > 0 ? `${data.mileageKm.toLocaleString("fr-FR")} km` : "";
  const fuel = safeText(data.fuel || "");
  const bodyStyle = safeText(data.bodyStyle || "");
  const cond = safeText(data.vehicleCondition || "");
  const desc = safeText(data.description || "");

  const rows = [
    ["Localisation", location],
    listingType ? ["Type", listingType] : null,
    transaction ? ["Transaction", transaction] : null,
    makeModel ? ["Marque / Modèle", makeModel] : null,
    year ? ["Année", year] : null,
    mileage ? ["Kilométrage", mileage] : null,
    fuel ? ["Carburant", fuel] : null,
    bodyStyle ? ["Carrosserie", bodyStyle] : null,
    cond ? ["État", cond] : null,
  ].filter(Boolean);

  return `<main class="seo-static" data-autonex-seo="listing">
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml([listingType, transaction].filter(Boolean).join(" • "))}</p>
  ${price ? `<p class="price">${escapeHtml(price)}</p>` : ""}
  ${rows.length ? `<dl>${rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl>` : ""}
  ${desc ? `<div class="desc">${escapeHtml(desc)}</div>` : ""}
</main>`;
}

async function generateListingHtmlPages({ distDir, baseHtml, publicDir }) {
  const dataFile = path.join(publicDir, "sitemaps", "listings-html-data.jsonl");
  const cacheFile = path.join(publicDir, "sitemaps", "listings-html-data-cache.jsonl");
  const filePath = fssync.existsSync(dataFile) ? dataFile : cacheFile;
  if (!fssync.existsSync(filePath)) {
    // Fallback: generate from prerender JSON (smaller, but still improves HTML visibility for the available set).
    const jsonPath = path.join(publicDir, "sitemaps", "listings-prerender-data.json");
    const jsonCachePath = path.join(publicDir, "sitemaps", "listings-prerender-data-cache.json");
    const jsonData = await readJsonSafe(jsonPath, await readJsonSafe(jsonCachePath, {}));
    const ids = jsonData && typeof jsonData === "object" ? Object.keys(jsonData) : [];
    let written = 0;
    for (const id of ids) {
      const data = jsonData[id];
      if (!data?.id) continue;
      const route = `/annonce/${data.id}`;
      const canonical = `${SITE_URL}${route}`;

      let html = ensureStaticSeoCss(baseHtml);
      html = upsertMeta(html, {
        title: data.title || "Annonce — AutoNex",
        description: (data.description && truncate(data.description, 160)) || "Annonce automobile sur AutoNex.",
        canonical,
        ogImage: data.imageUrl,
        ogType: "product",
      });
      const jsonLd = buildListingJsonLd(data, canonical);
      html = ensureTag(html, "script", `type="application/ld+json"`, JSON.stringify(jsonLd));
      html = insertStaticMain(html, buildStaticListingMain(data));

      const outPath = distPathForRoute(distDir, route);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, html, "utf8");
      written += 1;
    }
    return { written, source: jsonPath };
  }

  const stream = fssync.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let written = 0;
  for await (const line of rl) {
    const raw = String(line || "").trim();
    if (!raw) continue;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!data?.id) continue;

    const route = `/annonce/${data.id}`;
    const canonical = `${SITE_URL}${route}`;

    let html = ensureStaticSeoCss(baseHtml);
    html = upsertMeta(html, {
      title: data.title || "Annonce — AutoNex",
      description: (data.description && truncate(data.description, 160)) || "Annonce automobile sur AutoNex.",
      canonical,
      ogImage: data.imageUrl,
      ogType: "product",
    });

    const jsonLd = buildListingJsonLd(data, canonical);
    html = ensureTag(html, "script", `type="application/ld+json"`, JSON.stringify(jsonLd));

    html = insertStaticMain(html, buildStaticListingMain(data));

    const outPath = distPathForRoute(distDir, route);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, html, "utf8");
    written += 1;
  }

  return { written, source: filePath };
}

async function main() {
  const root = path.resolve(__dirname, "..", "..");
  const distDir = path.resolve(root, "dist");
  const publicDir = path.resolve(root, "public");

  const indexPath = path.join(distDir, "index.html");
  const baseHtmlRaw = await fs.readFile(indexPath, "utf8");
  const baseHtml = ensureStaticSeoCss(baseHtmlRaw);

  const routesFile = path.join(publicDir, "sitemaps", "prerender-routes.json");
  const routes = await readJsonSafe(routesFile, ["/", "/recherche", "/agences", "/estimation", "/conseils"]);

  const listingDataPath = path.join(publicDir, "sitemaps", "listings-prerender-data.json");
  const listingCachePath = path.join(publicDir, "sitemaps", "listings-prerender-data-cache.json");
  const agenciesDataPath = path.join(publicDir, "sitemaps", "agencies-prerender-data.json");
  const agenciesCachePath = path.join(publicDir, "sitemaps", "agencies-prerender-data-cache.json");

  const listingData = await readJsonSafe(listingDataPath, await readJsonSafe(listingCachePath, {}));
  const agencyData = await readJsonSafe(agenciesDataPath, await readJsonSafe(agenciesCachePath, {}));

  let written = 0;
  for (const rawRoute of routes) {
    const route = normalizeRoute(String(rawRoute || ""));
    if (!route || route === "/") continue;

    const canonical = `${SITE_URL}${route}`;
    let html = baseHtml;

    if (isListingRoute(route)) {
      const id = route.split("/").pop();
      const data = id ? listingData?.[id] : null;
      if (data) {
        html = upsertMeta(html, {
          title: data.title || "Annonce — AutoNex",
          description: data.description || data.title || "Annonce automobile sur AutoNex.",
          canonical,
          ogImage: data.imageUrl,
          ogType: "product",
        });

        const jsonLd = buildListingJsonLd(data, canonical);
        html = ensureTag(html, "script", `type="application/ld+json"`, JSON.stringify(jsonLd));

        const priceText = typeof data.priceMga === "number" ? `${Number(data.priceMga).toLocaleString("fr-FR")} Ar` : "";
        const locationText = escapeHtml([data.ville, data.region].filter(Boolean).join(", ") || "Madagascar");
        const specs = escapeHtml([data.make, data.model].filter(Boolean).join(" ") || "");
        const yearText = data.year ? ` (${escapeHtml(String(data.year))})` : "";
        const mileageText = typeof data.mileageKm === "number" && data.mileageKm > 0 ? ` - ${escapeHtml(String(data.mileageKm))} km` : "";
        const snippet = `<noscript><article><h1>${escapeHtml(data.title || "Annonce — AutoNex")}</h1><p>${escapeHtml(
          [priceText, locationText].filter(Boolean).join(" — "),
        )}</p>${specs ? `<p>${specs}${yearText}${mileageText}</p>` : ""}</article></noscript>`;

        html = ensureNoscript(html, snippet);
      }
    } else if (isAgencyRoute(route)) {
      const slug = route.split("/").pop();
      const data = slug ? agencyData?.[slug] : null;
      if (data) {
        html = upsertMeta(html, {
          title: data.title || "Concessionnaire — AutoNex",
          description: data.description || data.title || "Profil concessionnaire à Madagascar sur AutoNex.",
          canonical,
          ogImage: data.imageUrl,
          ogType: "website",
        });

        const jsonLd = buildAgencyJsonLd(data, canonical);
        html = ensureTag(html, "script", `type="application/ld+json"`, JSON.stringify(jsonLd));

        const snippet = `<noscript><article><h1>${escapeHtml(data.title || "Concessionnaire — AutoNex")}</h1></article></noscript>`;
        html = ensureNoscript(html, snippet);
      }
    } else {
      // Static route shell: at least ensure canonical is stable.
      html = upsertMeta(html, {
        title: "AutoNex — la marketplace automobile de référence à Madagascar.",
        description: "AutoNex est la marketplace automobile de référence à Madagascar.",
        canonical,
        ogImage: undefined,
      });
    }

    const outPath = distPathForRoute(distDir, route);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, html, "utf8");
    written += 1;
  }

  const listingResult = await generateListingHtmlPages({ distDir, baseHtml, publicDir });
  console.log(
    `[postbuild-prerender-shell] Wrote ${written} prerendered HTML shells + ${listingResult.written} listing HTML pages from ${listingResult.source ?? "n/a"}.`,
  );
}

main().catch((err) => {
  console.error("[postbuild-prerender-shell] Failed", err);
  process.exitCode = 1;
});

