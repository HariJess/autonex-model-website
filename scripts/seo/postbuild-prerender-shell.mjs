import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

async function main() {
  const root = path.resolve(__dirname, "..", "..");
  const distDir = path.resolve(root, "dist");
  const publicDir = path.resolve(root, "public");

  const indexPath = path.join(distDir, "index.html");
  const baseHtml = await fs.readFile(indexPath, "utf8");

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

  console.log(`[postbuild-prerender-shell] Wrote ${written} prerendered HTML shells.`);
}

main().catch((err) => {
  console.error("[postbuild-prerender-shell] Failed", err);
  process.exitCode = 1;
});

